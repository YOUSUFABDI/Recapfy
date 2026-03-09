import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { AuthenticatedRequest } from 'src/auth/interface/authReq.interface';
import { PrismaService } from 'src/prisma.service';

@Controller('billing')
export class BillingController {
  constructor(
    private stripeService: StripeService,
    private billingService: BillingService,
    private prisma: PrismaService,
  ) {}

  @Post('create-checkout')
  async createCheckout(@Req() req: any, @Body() body: any) {
    const { planCode, interval } = body;
    if (!planCode || !interval)
      throw new BadRequestException(
        'Missing planCode or interval (monthly/yearly)',
      );

    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await this.billingService.findUserByToken(token);
    if (!user) throw new BadRequestException('Unauthorized');

    const priceEnvKey = `PRICE_${planCode.toUpperCase()}_${interval.toUpperCase()}`;
    const priceId = process.env[priceEnvKey];
    if (!priceId) {
      throw new BadRequestException(
        `Price ID for ${planCode}/${interval} not set (env key ${priceEnvKey})`,
      );
    }

    if (!process.env.WEBAPP_URL)
      throw new InternalServerErrorException('WEBAPP_URL not set');

    const base = new URL(process.env.WEBAPP_URL);
    const successUrl = `${new URL('/billing/success', base)}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = new URL('/billing/cancel', base).toString();

    const session = await this.stripeService.createCheckoutSessionForPrice({
      priceId,
      mode: 'subscription',
      customerEmail: user.email,
      successUrl,
      cancelUrl,
      metadata: { userId: user.id, planCode, interval },
    });

    // Create a PENDING record using session.id. We'll later "merge" it into invoice.id.
    await this.billingService.createPendingPayment({
      userId: user.id,
      gatewayPaymentId: session.id,
      gateway: 'STRIPE',
      status: 'PENDING',
      amount: 0,
      currency: 'USD',
      rawPayload: { checkoutSession: session },
    });

    return { url: session.url };
  }

  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(@Req() req: any) {
    console.log('--- 🛡️ STRIPE WEBHOOK HIT ---');
    console.log('Headers:', JSON.stringify(req.headers['stripe-signature']));
    const sig = req.headers['stripe-signature'] as string;
    const raw = req.rawBody as Buffer;
    if (!raw || !sig)
      throw new BadRequestException('Missing webhook signature or body');

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructEvent(
        raw,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      ) as Stripe.Event;
      console.log('✅ Stripe Event Constructed:', event.type); // ADD THIS
    } catch (err) {
      console.error('❌ Stripe Signature Verification Failed:', err.message); // ADD THIS
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const full = await this.stripeService.retrieveCheckoutSession(
          session.id as string,
        );
        await this.billingService.handleCheckoutCompleted(full);
        break;
      }
      case 'invoice.paid': {
        await this.billingService.handleInvoicePaid(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        await this.billingService.handleInvoicePaymentFailed(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        await this.billingService.handleSubscriptionDeleted(event.data.object);
        break;
      }
      case 'customer.subscription.updated': {
        try {
          await this.billingService.syncSubscriptionFromStripe(
            event.data.object,
          );
        } catch {
          // best-effort
        }
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Req() req: any) {
    const userId = req.user.id;
    const sub = await this.billingService.getActivePlanForUser(userId);
    if (!sub) throw new BadRequestException('No active subscription to cancel');
    if (sub.cancelAtPeriodEnd) {
      return {
        status: 200,
        message: 'Your subscription is already scheduled to end.',
      };
    }
    if (!sub.stripeSubscriptionId)
      throw new BadRequestException(
        // 'Subscription missing stripeSubscriptionId',
        'Subscription is not linked to billing provider.',
      );

    try {
      await this.stripeService.cancelSubscription(
        sub.stripeSubscriptionId,
        true,
      );
      await this.billingService.markCancelledAtPeriodEnd(sub.id);

      return {
        status: 200,
        message:
          'Cancellation scheduled. You’ll keep access until the end of your current billing period.',
      };
    } catch (err: any) {
      const respMsg = err?.response?.message;
      const rawMsg = Array.isArray(respMsg)
        ? respMsg.join(' ')
        : String(respMsg ?? err?.message ?? '');
      let friendly =
        'We couldn’t cancel your subscription right now. Please try again, or contact support if it keeps happening.';
      if (
        rawMsg.toLowerCase().includes('managed by the subscription schedule')
      ) {
        friendly =
          'Your subscription has a change scheduled. We’ll update that schedule and cancel your subscription at the end of your billing period.';
      }
      throw new BadRequestException(friendly);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('current-plan')
  async getCurrentPlan(@Req() req: any) {
    return this.billingService.getActivePlanForUser(req.user.id);
  }

  @Get('plans')
  async getPlans() {
    return await this.billingService.getPlans();
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Unauthorized');

    const sub = await this.billingService.getActivePlanForUser(userId);
    const subscriptionRow =
      sub ?? (await this.billingService.findLatestSubscriptionForUser(userId));

    if (!subscriptionRow)
      throw new BadRequestException('No subscription found for user');

    if (!subscriptionRow.stripeSubscriptionId) {
      throw new BadRequestException(
        'Subscription is not linked to Stripe subscription. Contact support.',
      );
    }

    const stripeSub = (await this.stripeService.retrieveSubscription(
      subscriptionRow.stripeSubscriptionId,
    )) as any;

    const customerId = stripeSub?.customer;
    if (!customerId)
      throw new BadRequestException(
        'Could not find Stripe customer for subscription.',
      );

    const returnUrl = process.env.WEBAPP_URL
      ? `${process.env.WEBAPP_URL.replace(/\/$/, '')}/dashboard/settings#billing`
      : 'dashboard/settings#billing';

    const session = await this.stripeService.createBillingPortalSession({
      customerId: String(customerId),
      returnUrl,
    });

    if (!session?.url)
      throw new InternalServerErrorException(
        'Stripe portal did not return a URL.',
      );

    return { url: session.url };
  }

  @Post('change-plan/preview')
  @UseGuards(JwtAuthGuard)
  async previewChangePlan(@Req() req: any, @Body() body: any) {
    const { planCode, interval } = body;
    if (!planCode || !interval) {
      throw new BadRequestException('Missing planCode or interval');
    }
    return this.billingService.previewPlanChangeForUser({
      userId: req.user.id,
      planCode,
      interval,
    });
  }

  @Post('change-plan/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmChangePlan(@Req() req: any, @Body() body: any) {
    const { planCode, interval, prorationDate } = body;
    if (!planCode || !interval) {
      throw new BadRequestException('Missing planCode or interval');
    }
    return this.billingService.confirmPlanChangeForUser({
      userId: req.user.id,
      planCode,
      interval,
      prorationDate,
    });
  }

  // Backward compatible route (your UI was calling this)
  @Post('change-plan')
  @UseGuards(JwtAuthGuard)
  async changePlan(@Req() req: any, @Body() body: any) {
    const { planCode, interval, prorationDate } = body;
    if (!planCode || !interval) {
      throw new BadRequestException('Missing planCode or interval');
    }
    return this.billingService.confirmPlanChangeForUser({
      userId: req.user.id,
      planCode,
      interval,
      prorationDate,
    });
  }

  @Post('change-plan/cancel-scheduled')
  @UseGuards(JwtAuthGuard)
  async cancelScheduledChange(@Req() req: any) {
    return this.billingService.cancelScheduledPlanChange(req.user.id);
  }

  @Get('payment-method')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethod(@Req() req: AuthenticatedRequest) {
    const user = await this.billingService.findUserByToken(
      req.headers.authorization?.replace('Bearer ', ''),
    );
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const paymentMethod = await this.stripeService.getPaymentMethod(user.email);

    return {
      last4: paymentMethod.last4,
      brand: paymentMethod.brand,
      exp_month: paymentMethod.exp_month,
      exp_year: paymentMethod.exp_year,
    };
  }
}
