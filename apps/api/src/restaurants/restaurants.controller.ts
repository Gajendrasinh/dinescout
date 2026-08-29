import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@Controller({ path: 'restaurants', version: '1' })
@UseGuards(OptionalAuthGuard)
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Search/browse restaurants with filters and pagination' })
  async search(@Query() query: QueryRestaurantsDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.restaurants.search(query, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant details by id or slug' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.restaurants.findOne(id, user?.id);
  }
}
