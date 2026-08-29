import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../auth/guards/require-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportReviewDto } from './dto/report-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller({ path: 'reviews', version: '1' })
@UseGuards(OptionalAuthGuard, RequireAuthGuard)
export class ReviewActionsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit your own review' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviews.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own review (or, for moderators, any review)' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.reviews.remove(id, {
      id: user.id,
      isModerator: user.role === UserRole.MODERATOR || user.role === UserRole.ADMIN,
    });
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Report a review for moderation' })
  async report(
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.reviews.report(id, user.id, dto);
  }
}
