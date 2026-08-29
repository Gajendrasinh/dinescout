import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../auth/guards/require-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users/me', version: '1' })
@UseGuards(OptionalAuthGuard, RequireAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user’s profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getProfile(user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get the current user’s dietary/cuisine/price preferences' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update the current user’s preferences' })
  async updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.users.updatePreferences(user.id, dto);
  }
}
