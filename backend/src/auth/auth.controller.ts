import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request, Response } from 'express';
import { AuthenticatedRequest } from './interface/authReq.interface';
import { ChangePassDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GoogleProfile } from './google.strategy';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('/verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return await this.authService.verifyOtpAndRegister(verifyOtpDto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = await this.authService.getUserById((req as any).user.id);
    if (!user) return null;
    const { password, ...safe } = user as any;
    return safe;
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const googleProfile = req.user as GoogleProfile;

    // 1. Get token AND user data (including role)
    const authData: any = await this.authService.loginOrSignupWithGoogle({
      id: googleProfile.id,
      name: googleProfile.name,
      email: googleProfile.email,
      avatar: googleProfile.avatar,
    });

    const frontend = process.env.WEBAPP_URL;
    const state = (req.query.state as string) || '';

    // 2. Determine the path
    let targetPath: string;

    // Priority 1: If there is a valid return path in state
    if (state && state.startsWith('/') && state !== '/dashboard/connect') {
      targetPath = state;

      // Security check: Standard USERS cannot jump into Admin dashboard via URL state
      if (authData.role === 'USER' && state === '/dashboard') {
        targetPath = '/dashboard/connect';
      }
    }
    // Priority 2: Default logic based strictly on Role if state is empty/default
    else {
      targetPath =
        authData.role === 'ADMIN' ? '/dashboard' : '/dashboard/connect';
    }

    // 3. Redirect with credentials
    const redirectUrl = new URL(frontend);
    redirectUrl.pathname = targetPath;
    redirectUrl.searchParams.set('token', authData.access_token);
    redirectUrl.searchParams.set('userId', authData.userId);

    return res.redirect(redirectUrl.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Post('/change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChangePassDto,
  ) {
    return this.authService.changePassword(body, req.user.id);
  }

  @Patch('/update-user')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateUserDto,
  ) {
    return await this.authService.updateUser(req.user.id, body);
  }

  @Post('/forgot-password')
  async forgotPassword(@Body() { email }: { email: string }) {
    return await this.authService.forgotPassword(email);
  }

  @Post('/reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }
}
