import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryReviewsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['most_relevant', 'newest', 'highest_rated', 'lowest_rated'],
    default: 'most_relevant',
  })
  @IsOptional()
  @IsIn(['most_relevant', 'newest', 'highest_rated', 'lowest_rated'])
  sort: 'most_relevant' | 'newest' | 'highest_rated' | 'lowest_rated' = 'most_relevant';
}
