import { AiMessage as PrismaAiMessage, AiConversation as PrismaAiConversation, AiMessageRole } from '@prisma/client';
import { AiConversation, AiMessage, AiRichContent, AiRole } from '@dinescout/shared-types';

const ROLE_MAP: Record<AiMessageRole, AiRole> = {
  USER: AiRole.USER,
  ASSISTANT: AiRole.ASSISTANT,
  SYSTEM: AiRole.SYSTEM,
};

export function toAiMessage(row: PrismaAiMessage): AiMessage {
  return {
    id: row.id,
    role: ROLE_MAP[row.role],
    content: row.content,
    rich: (row.richContent as AiRichContent | null) ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAiConversation(
  row: PrismaAiConversation & { messages: PrismaAiMessage[] },
): AiConversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages.map(toAiMessage),
  };
}
