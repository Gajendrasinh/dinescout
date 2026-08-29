import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../auth/guards/require-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('ai')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message to DineScout AI (works anonymously)' })
  async chat(
    @Body() dto: ChatRequestDto,
    @Req() req: Request,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const rateLimitKey = user?.id ?? req.ip ?? 'anonymous';
    return this.ai.chat(dto, rateLimitKey, user?.id);
  }

  @Get('conversations')
  @UseGuards(OptionalAuthGuard, RequireAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List your AI conversations' })
  async listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.ai.listConversations(user.id);
  }

  @Get('conversations/:id')
  @UseGuards(OptionalAuthGuard, RequireAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one AI conversation with full message history' })
  async getConversation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ai.getConversation(id, user.id);
  }
}
