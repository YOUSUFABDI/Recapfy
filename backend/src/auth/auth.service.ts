import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email.service';
import { PrismaService } from 'src/prisma.service';
import { ChangePassDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { generateOTP } from 'src/common/utils/generate-otp';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const email = this.normalizeEmailStrict(dto.email);

    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    let userId: string;

    if (existing) {
      // Case 1: User is already fully active
      if (existing.status === true) {
        throw new ConflictException('Email already registered');
      }

      // Case 2: User registered via Google (and hasn't set a password yet)
      if (existing.googleId && !existing.password) {
        throw new ConflictException('This email is registered with Google.');
      }

      // Case 3: User exists but status is FALSE (Pending Verification)
      // We allow them to "resign up" by updating their password and sending a new OTP.
      const hash = await bcrypt.hash(dto.password, 10);

      // Update the existing pending user
      const updatedUser = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hash, // Update password to the new one provided
          name: dto.name ?? existing.name, // Update name if provided
        },
      });

      userId = updatedUser.id;
    } else {
      // Case 4: Brand new user
      const hash = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          name: dto.name ?? null,
          email,
          password: hash,
          status: false, // User is inactive until OTP is verified
        },
      });

      userId = user.id;
    }

    try {
      // --- Common OTP Logic (Runs for both New and Pending users) ---

      // 1. Generate a 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expire in 10 mins

      // 2. Save OTP to database
      await this.prisma.oTP.create({
        data: {
          otp: otpCode,
          userId: userId, // Use the variable we set above
          status: 'unused',
          expiresAt,
        },
      });

      // 3. Send email
      await this.emailService.sendOTPEmail(email, otpCode);
      console.log(`OTP for ${email}: ${otpCode}`);

      return {
        message: 'OTP sent to email. Please verify to activate your account.',
        email,
      };
    } catch (error: any) {
      console.error('Signup Error:', error);
      throw new InternalServerErrorException('Signup failed');
    }
  }

  async verifyOtpAndRegister(verifyOtpDto: VerifyOtpDto) {
    const { email, code } = verifyOtpDto;
    const normalizedEmail = email.toLowerCase();

    const existOTP = await this.prisma.oTP.findFirst({
      where: {
        otp: Number(code),
        status: 'unused',
        user: { email: normalizedEmail },
      },
      include: { user: true },
    });

    if (!existOTP) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > existOTP.expiresAt)
      throw new UnauthorizedException('OTP expired');

    // Use a transaction to ensure both happen or neither happens
    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: existOTP.userId },
        data: { status: true },
      }),
      this.prisma.oTP.update({
        where: { id: existOTP.id },
        data: { status: 'used' },
      }),
    ]);

    return this.signToken(updatedUser.id, updatedUser.email);
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmailStrict(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.status) {
      throw new UnauthorizedException(
        'Please verify your email via OTP first.',
      );
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please log in with Google.',
      );
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.signToken(user.id, user.email);
  }

  async loginOrSignupWithGoogle(google: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  }) {
    if (!google.id) {
      throw new UnauthorizedException('Missing Google ID');
    }

    const googleEmail = this.normalizeEmailStrict(google.email);

    // ✅ 1. FIRST: find by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId: google.id },
    });

    if (user) {
      // FIX: Append the role to the token response
      const token = this.signToken(user.id, user.email);
      return { ...token, role: user.role };
    }

    // ✅ 2. No googleId match → check if a user exists with this email
    user = await this.prisma.user.findUnique({
      where: { email: googleEmail },
    });

    if (user) {
      if (user.googleId && user.googleId !== google.id) {
        throw new UnauthorizedException(
          'This email is already linked to another Google account.',
        );
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: google.id,
          status: true,
          name: user.name ?? google.name ?? null,
          avatarUrl: user.avatarUrl ?? google.avatar ?? null,
        },
      });

      // FIX: Append the role to the token response
      const token = this.signToken(user.id, user.email);
      return { ...token, role: user.role };
    }

    // ✅ 3. Truly new user
    user = await this.prisma.user.create({
      data: {
        email: googleEmail,
        googleId: google.id,
        status: true,
        password: null,
        name: google.name ?? null,
        avatarUrl: google.avatar ?? null,
        // Prisma usually defaults role to 'USER', but you can enforce it here if needed
      },
    });

    // FIX: Append the role to the token response
    const token = this.signToken(user.id, user.email);

    // We can use the user object directly from create,
    // but fetching fresh ensures we get database defaults (like Role)
    const freshUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    return {
      ...token,
      role: freshUser.role,
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { platformConnections: true },
    });
    if (!user) {
      throw new NotFoundException('user not found');
    }

    const { password, ...safe } = user as any;

    // return user;
    return {
      ...safe,
      hasPassword: !!user.password, // ✅ key for the frontend
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwt.verify(token);
      return decoded;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  async changePassword(body: ChangePassDto, userId: string) {
    const { currentPassword, newPassword } = body;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Case 1: Google-only / no local password yet
    if (!user.password) {
      if (!newPassword) {
        throw new BadRequestException('New password is required');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return 'Password set successfully.';
    }

    // Case 2: User already has a local password → require currentPassword
    if (!currentPassword) {
      throw new BadRequestException('Current password is required');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return 'Password changed successfully.';
  }

  async updateUser(userId: string, body: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const email = this.normalizeEmailStrict(body.email);

    if (email && email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists) {
        throw new ConflictException('Email already in use');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.fullName ?? undefined,
        email: email ?? undefined,
      },
    });

    return 'Updated!';
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      throw new NotFoundException('User with this email does not exist!');
    }

    const OTP = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // OTP expires in 15 minutes

    await this.prisma.oTP.create({
      data: {
        otp: OTP,
        expiresAt,
        status: 'PENDING',
        userId: user.id,
      },
    });

    await this.emailService.sendOTPEmail(email, OTP);

    return `OTP for password reset sent successfully to ${email}.`;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    const numericOtp = Number(otp);
    if (isNaN(numericOtp)) {
      throw new BadRequestException('OTP must be a valid number');
    }

    // 1. Find the OTP record
    // We keep 'user: { email }' here to ensure the OTP belongs to the specific email requested
    const otpRecord = await this.prisma.oTP.findFirst({
      where: {
        otp: numericOtp,
        user: { email },
        status: 'PENDING',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        // 'OTP does not exist, is invalid, or email does not match.',
        'OTP is invalid or expired.',
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired.');
    }

    // 2. Mark OTP as used
    await this.prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { status: 'USED' },
    });

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ FIX: Update the user using the ID found in the OTP record
    // This guarantees we are updating the correct user and avoids the "email undefined" error
    await this.prisma.user.update({
      where: { id: otpRecord.userId },
      data: { password: hashedPassword },
    });

    return 'Password reset successfully.';
  }

  private signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return { access_token: this.jwt.sign(payload), userId: userId };
  }

  private normalizeEmailStrict(email?: string | null) {
    if (!email) return null;
    return email.toLowerCase().trim();
  }
}
