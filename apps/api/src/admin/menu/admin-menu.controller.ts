import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../../auth/guards/require-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpsertMenuCategoryDto } from '../dto/upsert-menu-category.dto';
import { UpsertMenuItemDto } from '../dto/upsert-menu-item.dto';
import { AdminMenuService } from './admin-menu.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard, RequireAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/restaurants/:restaurantId/menu', version: '1' })
export class AdminMenuController {
  constructor(private readonly admin: AdminMenuService) {}

  @Post('categories')
  @ApiOperation({ summary: '[Admin] Create a menu category' })
  async createCategory(@Param('restaurantId') restaurantId: string, @Body() dto: UpsertMenuCategoryDto) {
    return this.admin.createCategory(restaurantId, dto);
  }

  @Patch('categories/:categoryId')
  @ApiOperation({ summary: '[Admin] Update a menu category' })
  async updateCategory(@Param('categoryId') categoryId: string, @Body() dto: UpsertMenuCategoryDto) {
    return this.admin.updateCategory(categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Delete a menu category (and its items)' })
  async deleteCategory(@Param('categoryId') categoryId: string): Promise<void> {
    await this.admin.deleteCategory(categoryId);
  }

  @Post('items')
  @ApiOperation({ summary: '[Admin] Create a menu item' })
  async createItem(@Param('restaurantId') restaurantId: string, @Body() dto: UpsertMenuItemDto) {
    return this.admin.createItem(restaurantId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: '[Admin] Update a menu item' })
  async updateItem(@Param('itemId') itemId: string, @Body() dto: UpsertMenuItemDto) {
    return this.admin.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Delete a menu item' })
  async deleteItem(@Param('itemId') itemId: string): Promise<void> {
    await this.admin.deleteItem(itemId);
  }
}
