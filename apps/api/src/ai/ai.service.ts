import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiMessageRole, Prisma } from '@prisma/client';
import {
  AiChatRequest,
  AiChatResponse,
  AiConversation,
  AiRichContent,
  AiRole,
  AiToolName,
  RestaurantSummary,
  MenuItem,
} from '@dinescout/shared-types';
import { RedisService } from '../cache/redis.service';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../database/prisma.service';
import { toAiConversation, toAiMessage } from './ai.presenter';
import { AI_PROVIDER, AiChatMessage, AiProvider } from './providers/ai-provider.interface';
import { DINESCOUT_SYSTEM_PROMPT } from './system-prompt';
import { TOOL_DEFINITIONS } from './tools/tool-definitions';
import { ToolRouterService } from './tools/tool-router.service';

const HISTORY_WINDOW = 12;
const CHAT_RATE_LIMIT_MAX = 20;
const CHAT_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

const RESTAURANT_TOOLS = new Set(['searchRestaurants', 'findNearbyRestaurants', 'getRestaurant']);
const MENU_TOOLS = new Set(['getMenu', 'searchDishes']);

const DEFAULT_SUGGESTED_PROMPTS = [
  'Something healthy',
  'Date night',
  'Under $20',
  'Vegetarian',
];
const RESTAURANT_SUGGESTED_PROMPTS = [
  'What should I order here?',
  'What do people like about this place?',
  'Is it open now?',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly toolRouter: ToolRouterService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async chat(
    dto: AiChatRequest,
    rateLimitKey: string,
    userId?: string,
  ): Promise<AiChatResponse> {
    await this.assertWithinRateLimit(rateLimitKey);

    const conversation = await this.resolveConversation(dto.conversationId, userId, dto.message);

    const priorMessages = await this.prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
    });
    const history: AiChatMessage[] = priorMessages
      .reverse()
      .map((m) => ({ role: mapRole(m.role), content: m.content }));

    await this.prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: AiMessageRole.USER, content: dto.message },
    });

    const toolResults: { name: string; result: unknown }[] = [];
    const executeTool = async (name: string, args: Record<string, unknown>) => {
      const { result } = await this.toolRouter.execute(name, args, {
        userId,
        lat: dto.context?.lat,
        lng: dto.context?.lng,
        restaurantId: dto.context?.restaurantId,
      });
      toolResults.push({ name, result });
      return result;
    };

    let text: string;
    let degraded = this.provider.degraded;

    try {
      const generated = await this.provider.generate({
        systemPrompt: DINESCOUT_SYSTEM_PROMPT,
        history,
        userMessage: dto.message,
        tools: TOOL_DEFINITIONS,
        executeTool,
        hints: {
          restaurantId: dto.context?.restaurantId,
          lat: dto.context?.lat,
          lng: dto.context?.lng,
        },
      });
      text = generated.text;
    } catch (error) {
      this.logger.error(`AI provider failed: ${(error as Error).message}`);
      text =
        "I'm having trouble reaching DineScout AI right now. Please try again in a moment, or browse restaurants directly using search and filters.";
      degraded = true;
    }

    const rich = buildRichContent(toolResults, Boolean(dto.context?.restaurantId));

    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.ASSISTANT,
        content: text,
        richContent: rich as unknown as Prisma.InputJsonValue,
        degraded,
        toolCalls: toolResults.map((t) => ({ tool: t.name })) as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      message: toAiMessage(assistantMessage),
      degraded,
    };
  }

  /**
   * AI-generated review summary. Strictly grounded: the provider is asked
   * to summarize whatever GET_REVIEWS returns, and the local fallback
   * provider only ever surfaces theme phrases it actually found in review
   * text. `degraded` tells the client whether this came from a real LLM.
   */
  async getReviewSummary(restaurantId: string): Promise<{ summary: string; degraded: boolean }> {
    const executeTool = (name: string, args: Record<string, unknown>) =>
      this.toolRouter.execute(name, args, { restaurantId }).then((r) => r.result);

    try {
      const generated = await this.provider.generate({
        systemPrompt: DINESCOUT_SYSTEM_PROMPT,
        history: [],
        userMessage:
          'Summarize what reviewers say about this restaurant. Only use the reviews returned by the getReviews tool. Group into things people frequently mention (👍) and things some reviews mention as a downside (⚠️). If there are no reviews, say so plainly.',
        tools: TOOL_DEFINITIONS.filter((t) => t.name === AiToolName.GET_REVIEWS),
        executeTool,
        hints: { restaurantId },
      });
      return { summary: generated.text, degraded: this.provider.degraded };
    } catch (error) {
      this.logger.error(`AI review summary failed: ${(error as Error).message}`);
      return {
        summary: 'AI review summary is temporarily unavailable. Please check the reviews below.',
        degraded: true,
      };
    }
  }

  async listConversations(userId: string): Promise<AiConversation[]> {
    const rows = await this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return rows.map(toAiConversation);
  }

  async getConversation(id: string, userId: string): Promise<AiConversation> {
    const row = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) {
      throw ApiException.notFound(ErrorCode.NOT_FOUND, 'Conversation not found');
    }
    return toAiConversation(row);
  }

  private async resolveConversation(conversationId: string | undefined, userId: string | undefined, firstMessage: string) {
    if (conversationId) {
      const existing = await this.prisma.aiConversation.findFirst({
        where: { id: conversationId, ...(userId ? { userId } : {}) },
      });
      if (existing) return existing;
    }
    return this.prisma.aiConversation.create({
      data: { userId, title: firstMessage.slice(0, 60) },
    });
  }

  private async assertWithinRateLimit(key: string): Promise<void> {
    const redisKey = `ratelimit:ai-chat:${key}`;
    const count = await this.redis.client.incr(redisKey);
    if (count === 1) {
      await this.redis.client.expire(redisKey, CHAT_RATE_LIMIT_WINDOW_SECONDS);
    }
    if (count > CHAT_RATE_LIMIT_MAX) {
      throw ApiException.tooManyRequests(
        ErrorCode.RATE_LIMITED,
        'Too many AI messages. Please wait a bit before trying again.',
      );
    }
  }
}

function mapRole(role: AiMessageRole): AiRole {
  switch (role) {
    case AiMessageRole.ASSISTANT:
      return AiRole.ASSISTANT;
    case AiMessageRole.SYSTEM:
      return AiRole.SYSTEM;
    default:
      return AiRole.USER;
  }
}

function buildRichContent(
  toolResults: { name: string; result: unknown }[],
  hasRestaurantContext: boolean,
): AiRichContent | undefined {
  const restaurants: RestaurantSummary[] = [];
  const menuItems: MenuItem[] = [];

  for (const { name, result } of toolResults) {
    if (!result || typeof result !== 'object') continue;
    if (RESTAURANT_TOOLS.has(name)) {
      if (Array.isArray(result)) restaurants.push(...(result as RestaurantSummary[]));
      else if ('id' in result) restaurants.push(result as RestaurantSummary);
    }
    if (MENU_TOOLS.has(name)) {
      if (Array.isArray(result)) menuItems.push(...(result as MenuItem[]));
      else if ('items' in result) menuItems.push(...((result as { items: MenuItem[] }).items));
    }
  }

  const suggestedPrompts = hasRestaurantContext
    ? RESTAURANT_SUGGESTED_PROMPTS
    : DEFAULT_SUGGESTED_PROMPTS;

  if (restaurants.length === 0 && menuItems.length === 0) {
    return { suggestedPrompts };
  }

  return {
    restaurants: restaurants.slice(0, 5),
    menuItems: menuItems.slice(0, 10),
    suggestedPrompts,
  };
}
