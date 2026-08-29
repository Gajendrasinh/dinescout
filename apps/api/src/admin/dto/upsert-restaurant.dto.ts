import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class RestaurantPhotoDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class RestaurantHourDto {
  @ApiProperty({ minimum: 0, maximum: 6 })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '11:00' })
  @IsString()
  opensAt!: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  closesAt!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class UpsertRestaurantDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(300)
  address!: string;

  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ enum: ['$', '$$', '$$$', '$$$$'] })
  @IsIn(['$', '$$', '$$$', '$$$$'])
  priceRange!: string;

  @ApiProperty({ type: [String], description: 'Cuisine slugs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cuisineSlugs!: string[];

  @ApiPropertyOptional({ type: [String], description: 'Dietary option slugs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietarySlugs?: string[];

  @ApiPropertyOptional({ type: [RestaurantPhotoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantPhotoDto)
  photos?: RestaurantPhotoDto[];

  @ApiPropertyOptional({ type: [RestaurantHourDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantHourDto)
  hours?: RestaurantHourDto[];
}
