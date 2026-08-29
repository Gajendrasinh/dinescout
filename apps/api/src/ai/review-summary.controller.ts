import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller({ path: 'restaurants/:restaurantId/ai-summary', version: '1' })
export class ReviewSummaryController {
  constructor(private readonly ai: AiService) {}

  @Get()
  @ApiOperation({ summary: 'AI-generated summary of a restaurant’s reviews (clearly labeled, grounded only in retrieved reviews)' })
  async getSummary(@Param('restaurantId') restaurantId: string) {
    return this.ai.getReviewSummary(restaurantId);
  }
}
