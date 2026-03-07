import { IsNotEmpty, IsNumber, MinLength } from 'class-validator';

export class ResetPasswordDto {
  email: string;

  @IsNotEmpty()
  @IsNumber()
  otp: number;

  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
