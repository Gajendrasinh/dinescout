import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './dashboard/admin-dashboard.service';
import { AdminMenuController } from './menu/admin-menu.controller';
import { AdminMenuService } from './menu/admin-menu.service';
import { AdminRestaurantsController } from './restaurants/admin-restaurants.controller';
import { AdminRestaurantsService } from './restaurants/admin-restaurants.service';
import { AdminReviewsController } from './reviews/admin-reviews.controller';
import { AdminReviewsService } from './reviews/admin-reviews.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminDashboardController,
    AdminRestaurantsController,
    AdminMenuController,
    AdminReviewsController,
    AdminUsersController,
  ],
  providers: [
    AdminDashboardService,
    AdminRestaurantsService,
    AdminMenuService,
    AdminReviewsService,
    AdminUsersService,
  ],
})
export class AdminModule {}
