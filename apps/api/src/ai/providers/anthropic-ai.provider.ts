import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AppConfigService } from '../../config/app-config.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { ToolCallRecord } from '../tools/tool-router.service';
import { AiGenerateParams, AiGenerateResult, AiProvider } from './ai-provider.interface';

const MAX_TOOL_ROUNDTRIPS = 4;

/** Real DineScout AI, backed by the Anthropic Messages API. Only used when
 *  `AI_API_KEY` is configured — see LocalHeuristicAiProvider for the
 *  zero-credential fallback. */
@Injectable()
export class AnthropicAiProvider implements AiProvider {
  readonly degraded = false;
  private readonly logger = new Logger(AnthropicAiProvider.name);
  private readonly client: Anthropic;

  constructor(private readonly config: AppConfigService) {
    this.client = new Anthropic({ apiKey: config.aiApiKey });
  }

  async generate(params: AiGenerateParams): Promise<AiGenerateResult> {
    const toolCalls: ToolCallRecord[] = [];

    const messages: Anthropic.MessageParam[] = [
      ...params.history.map(
        (m): Anthropic.MessageParam => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }),
      ),
      { role: 'user', content: params.userMessage },
    ];

    const tools: Anthropic.Tool[] = params.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    for (let round = 0; round < MAX_TOOL_ROUNDTRIPS; round += 1) {
      const response = await this.withTimeout(
        this.client.messages.create({
          model: this.config.aiModel,
          max_tokens: this.config.aiMaxOutputTokens,
          system: params.systemPrompt,
          messages,
          tools,
        }),
      );

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n')
          .trim();
        return { text: text || "I don't have an answer for that right now.", toolCalls };
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const args = (block.input ?? {}) as Record<string, unknown>;
        const result = await params.executeTool(block.name, args);
        toolCalls.push({ tool: block.name, args, ok: true });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
      messages.push({ role: 'user', content: toolResultBlocks });
    }

    this.logger.warn('Exceeded max tool round-trips without a final answer');
    return {
      text: 'I looked into a few things but couldn\'t narrow it down — could you tell me a bit more about what you\'re after?',
      toolCalls,
    };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new ApiException(ErrorCode.AI_PROVIDER_ERROR, 'AI request timed out', 504)),
        this.config.aiRequestTimeoutMs,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
