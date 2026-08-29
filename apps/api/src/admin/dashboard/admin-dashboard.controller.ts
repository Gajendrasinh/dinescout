import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../../auth/guards/require-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard, RequireAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(private readonly admin: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Dashboard summary stats' })
  async getStats() {
    return this.admin.getStats();
  }
}
