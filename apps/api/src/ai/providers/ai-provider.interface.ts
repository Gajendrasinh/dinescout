import { AiRole } from '@dinescout/shared-types';
import { ToolDefinition } from '../tools/tool-definitions';
import { ToolCallRecord } from '../tools/tool-router.service';

export interface AiChatMessage {
  role: AiRole;
  content: string;
}

export interface AiGenerateParams {
  systemPrompt: string;
  /** Prior turns in this conversation (plain text only — no vendor-specific tool blocks). */
  history: AiChatMessage[];
  userMessage: string;
  tools: ToolDefinition[];
  /** Runs a whitelisted tool and returns its (already-safe) result. Providers
   *  call this as many times as they need before producing final text. */
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Hints for providers that can't do their own free-form tool-call
   *  planning (the local fallback) — real LLM providers ignore these and
   *  decide entirely from the conversation + tool descriptions. */
  hints: { restaurantId?: string; lat?: number; lng?: number };
}

export interface AiGenerateResult {
  text: string;
  toolCalls: ToolCallRecord[];
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/**
 * Abstraction over the LLM vendor. An implementation owns its own
 * tool-calling protocol internally (Claude's native tool_use loop, for
 * instance) but is only ever handed whitelisted tool results — never a
 * database handle — via `executeTool`.
 */
export interface AiProvider {
  /** True when this provider does not perform real LLM generation
   *  (e.g. no API key configured) — surfaced to the client as `degraded`. */
  readonly degraded: boolean;

  generate(params: AiGenerateParams): Promise<AiGenerateResult>;
}
