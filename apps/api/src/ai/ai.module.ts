import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { MenuModule } from '../menu/menu.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AnthropicAiProvider } from './providers/anthropic-ai.provider';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { LocalHeuristicAiProvider } from './providers/local-heuristic-ai.provider';
import { ReviewSummaryController } from './review-summary.controller';
import { ToolRouterService } from './tools/tool-router.service';

@Module({
  imports: [AppConfigModule, AuthModule, RestaurantsModule, MenuModule, ReviewsModule],
  controllers: [AiController, ReviewSummaryController],
  providers: [
    AiService,
    ToolRouterService,
    AnthropicAiProvider,
    LocalHeuristicAiProvider,
    {
      provide: AI_PROVIDER,
      inject: [AppConfigService, AnthropicAiProvider, LocalHeuristicAiProvider],
      useFactory: (
        config: AppConfigService,
        anthropic: AnthropicAiProvider,
        local: LocalHeuristicAiProvider,
      ) => (config.aiProvider === 'anthropic' && config.aiApiKey ? anthropic : local),
    },
  ],
})
export class AiModule {}
