import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  favoriteCuisines?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  dietaryPreferences?: string[];

  @ApiPropertyOptional({ enum: ['$', '$$', '$$$', '$$$$'] })
  @IsOptional()
  @IsIn(['$', '$$', '$$$', '$$$$'])
  pricePreference?: string;

  @ApiPropertyOptional({ minimum: 0.5, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  preferredDistanceKm?: number;
}
