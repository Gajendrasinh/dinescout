import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

export class QueryRestaurantsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Free-text search across name, cuisine, and dishes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Comma-separated cuisine slugs, e.g. indian,japanese' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ description: 'Comma-separated dietary slugs, e.g. vegan,halal' })
  @IsOptional()
  @IsString()
  dietary?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  ratingMin?: number;

  @ApiPropertyOptional({ enum: ['$', '$$', '$$$', '$$$$'] })
  @IsOptional()
  @IsIn(['$', '$$', '$$$', '$$$$'])
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers, requires lat/lng' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  openNow?: boolean;

  @ApiPropertyOptional({ enum: ['rating', 'distance', 'popularity', 'newest'] })
  @IsOptional()
  @IsIn(['rating', 'distance', 'popularity', 'newest'])
  sort?: 'rating' | 'distance' | 'popularity' | 'newest';
}
