import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CuisinesService } from './cuisines.service';

@ApiTags('cuisines')
@Controller({ path: 'cuisines', version: '1' })
export class CuisinesController {
  constructor(private readonly cuisines: CuisinesService) {}

  @Get()
  @ApiOperation({ summary: 'List all cuisines (for filter chips/carousel)' })
  async list() {
    return this.cuisines.listCuisines();
  }
}
