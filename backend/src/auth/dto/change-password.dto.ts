import { IsString, MinLength, IsOptional } from 'class-validator';

export class ChangePassDto {
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}
