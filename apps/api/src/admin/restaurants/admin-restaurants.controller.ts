import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RestaurantStatus, UserRole } from '@prisma/client';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../../auth/guards/require-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminRestaurantsQueryDto } from '../dto/admin-restaurants-query.dto';
import { AdminRestaurantsService } from './admin-restaurants.service';
import { UpsertRestaurantDto } from '../dto/upsert-restaurant.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller({ path: 'admin/restaurants', version: '1' })
@UseGuards(OptionalAuthGuard, RequireAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRestaurantsController {
  constructor(private readonly admin: AdminRestaurantsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List all restaurants, including drafts/unpublished' })
  async list(@Query() query: AdminRestaurantsQueryDto) {
    return this.admin.list(query, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get one restaurant' })
  async getOne(@Param('id') id: string) {
    return this.admin.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Create a restaurant (starts as DRAFT)' })
  async create(@Body() dto: UpsertRestaurantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Update a restaurant' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpsertRestaurantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.update(id, dto, user.id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: '[Admin] Publish a restaurant' })
  async publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.setStatus(id, RestaurantStatus.PUBLISHED, user.id);
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: '[Admin] Unpublish a restaurant' })
  async unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.setStatus(id, RestaurantStatus.UNPUBLISHED, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Soft-delete a restaurant' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.admin.remove(id, user.id);
  }
}
