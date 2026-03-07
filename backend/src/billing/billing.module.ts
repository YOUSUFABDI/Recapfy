import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { SubscriptionGuard } from './guard/subscription.guard';
import { StripeService } from './stripe.service';

@Module({
  imports: [ConfigModule],
  controllers: [BillingController],
  providers: [StripeService, BillingService, PrismaService, SubscriptionGuard],
  exports: [StripeService, BillingService, SubscriptionGuard],
})
export class BillingModule {}
