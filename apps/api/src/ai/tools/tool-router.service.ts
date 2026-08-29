import { Injectable, Logger } from '@nestjs/common';
import { AiToolName } from '@dinescout/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { MenuService } from '../../menu/menu.service';
import { toMenuItem } from '../../menu/menu.presenter';
import { RestaurantsService } from '../../restaurants/restaurants.service';
import { ReviewsService } from '../../reviews/reviews.service';
import { isOpenAt } from '../../common/utils/geo';
import { ALLOWED_TOOL_NAMES } from './tool-definitions';

export interface ToolContext {
  userId?: string;
  lat?: number;
  lng?: number;
  /** The restaurant the user is currently looking at, if any — used as a
   *  fallback when the model omits restaurantId for a follow-up question. */
  restaurantId?: string;
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
}

const MAX_LIST_RESULTS = 10;

/**
 * The only bridge between the AI provider and the database. Every call is
 * checked against the tool whitelist, arguments are clamped to safe bounds
 * (result counts, string lengths), and results are the same presenter
 * output the REST API returns — so the model can never see more than, or
 * something different from, what a real API client would.
 */
@Injectable()
export class ToolRouterService {
  private readonly logger = new Logger(ToolRouterService.name);

  constructor(
    private readonly restaurants: RestaurantsService,
    private readonly menu: MenuService,
    private readonly reviews: ReviewsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    toolName: string,
    rawArgs: Record<string, unknown>,
    context: ToolContext,
  ): Promise<{ result: unknown; record: ToolCallRecord }> {
    if (!ALLOWED_TOOL_NAMES.has(toolName)) {
      this.logger.warn(`Rejected disallowed tool call: ${toolName}`);
      return {
        result: { error: 'Tool not allowed' },
        record: { tool: toolName, args: rawArgs, ok: false },
      };
    }

    try {
      const result = await this.dispatch(toolName as AiToolName, rawArgs, context);
      return { result, record: { tool: toolName, args: rawArgs, ok: true } };
    } catch (error) {
      this.logger.warn(`Tool ${toolName} failed: ${(error as Error).message}`);
      return {
        result: { error: 'Tool execution failed' },
        record: { tool: toolName, args: rawArgs, ok: false },
      };
    }
  }

  private async dispatch(
    toolName: AiToolName,
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    switch (toolName) {
      case AiToolName.SEARCH_RESTAURANTS: {
        const limit = clampLimit(args.limit, 5);
        const result = await this.restaurants.search(
          {
            page: 1,
            limit,
            skip: 0,
            search: asString(args.search),
            cuisine: asString(args.cuisine),
            dietary: asString(args.dietary),
            ratingMin: asNumber(args.ratingMin),
            price: asString(args.price),
            openNow: typeof args.openNow === 'boolean' ? args.openNow : undefined,
          },
          context.userId,
        );
        return result.data;
      }

      case AiToolName.FIND_NEARBY_RESTAURANTS: {
        const lat = asNumber(args.lat) ?? context.lat;
        const lng = asNumber(args.lng) ?? context.lng;
        if (lat === undefined || lng === undefined) {
          return { error: 'No location available' };
        }
        const result = await this.restaurants.search(
          {
            page: 1,
            limit: 5,
            skip: 0,
            lat,
            lng,
            radius: asNumber(args.radius) ?? 3,
            cuisine: asString(args.cuisine),
            dietary: asString(args.dietary),
          },
          context.userId,
        );
        return result.data;
      }

      case AiToolName.GET_RESTAURANT: {
        const restaurantId = asString(args.restaurantId) ?? context.restaurantId;
        if (!restaurantId) return { error: 'restaurantId is required' };
        return this.restaurants.findOne(restaurantId, context.userId);
      }

      case AiToolName.GET_MENU: {
        const restaurantId = asString(args.restaurantId) ?? context.restaurantId;
        if (!restaurantId) return { error: 'restaurantId is required' };
        return this.menu.getMenu(restaurantId);
      }

      case AiToolName.SEARCH_DISHES: {
        const query = asString(args.query);
        if (!query) return { error: 'query is required' };
        const limit = clampLimit(args.limit, 5);
        const rows = await this.prisma.menuItem.findMany({
          where: { name: { contains: query, mode: 'insensitive' }, isAvailable: true },
          take: limit,
          orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
        });
        return rows.map(toMenuItem);
      }

      case AiToolName.GET_REVIEWS: {
        const restaurantId = asString(args.restaurantId) ?? context.restaurantId;
        if (!restaurantId) return { error: 'restaurantId is required' };
        const limit = clampLimit(args.limit, 10, 30);
        const result = await this.reviews.list(restaurantId, {
          page: 1,
          limit,
          skip: 0,
          sort: 'most_relevant',
        });
        return result.data;
      }

      case AiToolName.GET_OPENING_HOURS: {
        const restaurantId = asString(args.restaurantId) ?? context.restaurantId;
        if (!restaurantId) return { error: 'restaurantId is required' };
        const hours = await this.prisma.restaurantHour.findMany({ where: { restaurantId } });
        return {
          hours: hours
            .slice()
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((h) => ({
              dayOfWeek: h.dayOfWeek,
              opensAt: h.opensAt,
              closesAt: h.closesAt,
              isClosed: h.isClosed,
            })),
          isOpenNow: isOpenAt(hours, new Date()),
        };
      }

      case AiToolName.GET_USER_PREFERENCES: {
        if (!context.userId) return { error: 'Not logged in' };
        return this.prisma.userPreferences.findUnique({ where: { userId: context.userId } });
      }

      default:
        return { error: 'Tool not implemented' };
    }
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clampLimit(value: unknown, fallback: number, max = MAX_LIST_RESULTS): number {
  const n = asNumber(value);
  if (!n) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}
