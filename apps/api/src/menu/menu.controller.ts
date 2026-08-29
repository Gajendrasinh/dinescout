import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller({ path: 'restaurants/:restaurantId/menu', version: '1' })
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get the full menu (categories + items) for a restaurant' })
  async getMenu(@Param('restaurantId') restaurantId: string) {
    return this.menu.getMenu(restaurantId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get menu categories for a restaurant' })
  async getCategories(@Param('restaurantId') restaurantId: string) {
    return this.menu.getCategories(restaurantId);
  }
}

@ApiTags('menu')
@Controller({ path: 'menu-items', version: '1' })
export class MenuItemsController {
  constructor(private readonly menu: MenuService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single menu item by id' })
  async getOne(@Param('id') id: string) {
    return this.menu.getMenuItem(id);
  }
}
