import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../auth/guards/require-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller({ path: 'restaurants/:restaurantId/reviews', version: '1' })
export class RestaurantReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'List published reviews for a restaurant' })
  async list(@Param('restaurantId') restaurantId: string, @Query() query: QueryReviewsDto) {
    return this.reviews.list(restaurantId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get rating average, count, and distribution for a restaurant' })
  async summary(@Param('restaurantId') restaurantId: string) {
    return this.reviews.summary(restaurantId);
  }

  @Post()
  @UseGuards(OptionalAuthGuard, RequireAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a restaurant' })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviews.create(restaurantId, user.id, dto);
  }
}
