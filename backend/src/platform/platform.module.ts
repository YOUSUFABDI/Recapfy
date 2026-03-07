import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { EmailService } from 'src/email.service';
import { CtraderService } from 'src/platform/ctrader.service';
import { AIReportService } from 'src/platform/ai-report.service';
import { PrismaService } from 'src/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { BillingService } from 'src/billing/billing.service';
import { StripeService } from 'src/billing/stripe.service';
import { SubscriptionGuard } from 'src/billing/guard/subscription.guard';

@Module({
  controllers: [PlatformController],
  providers: [
    EmailService,
    CtraderService,
    AIReportService,
    PrismaService,
    AuthService,
    JwtService,
    BillingService,
    StripeService,
    SubscriptionGuard,
  ],
})
export class PlatformModule {}
