import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewReportStatus, UserRole } from '@prisma/client';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { RequireAuthGuard } from '../../auth/guards/require-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminReviewsQueryDto } from '../dto/admin-reviews-query.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { UpdateReviewStatusDto } from '../dto/update-review-status.dto';
import { AdminReviewsService } from './admin-reviews.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard, RequireAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Controller({ path: 'admin/reviews', version: '1' })
export class AdminReviewsController {
  constructor(private readonly admin: AdminReviewsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Moderation queue — list reviews, optionally filtered by status' })
  async list(@Query() query: AdminReviewsQueryDto) {
    return this.admin.list(query, query.status);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin] Change a review\'s moderation status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.updateStatus(id, dto, user.id);
  }

  @Get('reports')
  @ApiOperation({ summary: '[Admin] List review reports' })
  async listReports(@Query('status') status?: ReviewReportStatus) {
    return this.admin.listReports(status);
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: '[Admin] Resolve or dismiss a review report' })
  async resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.resolveReport(id, dto, user.id);
  }
}
