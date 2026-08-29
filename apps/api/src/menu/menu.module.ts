import { Module } from '@nestjs/common';
import { MenuController, MenuItemsController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController, MenuItemsController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
