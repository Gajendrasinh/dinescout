import { Module } from '@nestjs/common';
import { CuisinesController } from './cuisines.controller';
import { CuisinesService } from './cuisines.service';
import { DietaryOptionsController } from './dietary-options.controller';

@Module({
  controllers: [CuisinesController, DietaryOptionsController],
  providers: [CuisinesService],
  exports: [CuisinesService],
})
export class CuisinesModule {}
