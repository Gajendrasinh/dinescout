import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CuisinesService } from './cuisines.service';

@ApiTags('dietary-options')
@Controller({ path: 'dietary-options', version: '1' })
export class DietaryOptionsController {
  constructor(private readonly cuisines: CuisinesService) {}

  @Get()
  @ApiOperation({ summary: 'List all dietary filter options' })
  async list() {
    return this.cuisines.listDietaryOptions();
  }
}
