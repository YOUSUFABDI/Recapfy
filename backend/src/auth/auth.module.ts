import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy'; // add
import { GoogleAuthGuard } from './guards/google.guard';
import { EmailService } from 'src/email.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        // signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN') },
        signOptions: { expiresIn: '2y' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    EmailService,
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
    PrismaService,
  ],
})
export class AuthModule {}
