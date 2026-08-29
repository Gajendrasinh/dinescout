import { ApiProperty } from '@nestjs/swagger';
import { ReviewReportStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ResolveReportDto {
  @ApiProperty({ enum: [ReviewReportStatus.ACTIONED, ReviewReportStatus.DISMISSED] })
  @IsEnum(ReviewReportStatus)
  status!: ReviewReportStatus;
}
