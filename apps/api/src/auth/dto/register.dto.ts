import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'diner@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ngP@ssword!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain an uppercase letter, a lowercase letter, and a number',
  })
  password!: string;

  @ApiProperty({ example: 'Alex Tan' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;
}
