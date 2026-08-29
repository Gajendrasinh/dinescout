import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocalWordListProfanityFilter, PROFANITY_FILTER } from './providers/profanity-filter.provider';
import { HeuristicSpamDetector, SPAM_DETECTOR } from './providers/spam-detector.provider';
import { ReviewActionsController } from './review-actions.controller';
import { RestaurantReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AuthModule],
  controllers: [RestaurantReviewsController, ReviewActionsController],
  providers: [
    ReviewsService,
    { provide: PROFANITY_FILTER, useClass: LocalWordListProfanityFilter },
    { provide: SPAM_DETECTOR, useClass: HeuristicSpamDetector },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
