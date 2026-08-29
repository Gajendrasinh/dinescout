import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../../auth/guards/require-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AdminUsersService } from './admin-users.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard, RequireAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private readonly admin: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List users' })
  async list(@Query() pagination: PaginationDto) {
    return this.admin.list(pagination);
  }
}
