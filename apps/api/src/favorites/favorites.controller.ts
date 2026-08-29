import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../auth/guards/require-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller({ path: 'favorites', version: '1' })
@UseGuards(OptionalAuthGuard, RequireAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user’s favorited restaurants' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.favorites.list(user.id);
  }

  @Post(':restaurantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Favorite a restaurant' })
  async add(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.favorites.add(user.id, restaurantId);
  }

  @Delete(':restaurantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfavorite a restaurant' })
  async remove(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.favorites.remove(user.id, restaurantId);
  }
}
