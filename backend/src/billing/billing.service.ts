import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma.service';
import { StripeService } from './stripe.service';
import { Prisma } from 'src/generated/prisma/client';

type BillingInterval = 'monthly' | 'yearly';
type PlanChangeAction = 'upgrade' | 'downgrade' | 'lateral';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  // ---------------------------------------------------------------------------
  // ✅ JSON helpers (FIX: Stripe objects -> Prisma Json)
  // ---------------------------------------------------------------------------

  /**
   * Stripe objects are not valid Prisma Json input types.
   * This converts anything into a plain JSON-serializable structure.
   */
  private toPlainJson(value: any): any {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      try {
        if (typeof value?.toJSON === 'function') return value.toJSON();
      } catch {
        // ignore
      }
      return null;
    }
  }

  private asPrismaJson(value: any): Prisma.InputJsonValue {
    return this.toPlainJson(value) as Prisma.InputJsonValue;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async clearPendingPlanChange(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        pendingPlanCode: null,
        pendingPlanInterval: null,
        pendingChangeAt: null,
        stripeScheduleId: null,
      } as any,
    });
  }

  private getPriceIdFromEnv(planCode: string, interval: BillingInterval) {
    const envKey = `PRICE_${String(planCode).toUpperCase()}_${String(interval).toUpperCase()}`;
    const priceId = process.env[envKey];
    if (!priceId) {
      throw new BadRequestException(
        `Price ID for ${planCode}/${interval} not set (env key ${envKey})`,
      );
    }
    return priceId;
  }

  private mapStripeStatusToLocal(
    status: string,
  ): 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED' {
    const map: Record<string, any> = {
      active: 'ACTIVE',
      trialing: 'ACTIVE',
      past_due: 'PAST_DUE',
      unpaid: 'PAST_DUE',
      incomplete: 'PAST_DUE',
      incomplete_expired: 'EXPIRED',
      canceled: 'EXPIRED',
    };
    return map[String(status).toLowerCase()] ?? 'ACTIVE';
  }

  private annualizedUnitAmount(price: Stripe.Price | null | undefined) {
    const unit = Number(price?.unit_amount ?? 0);
    const recurring = price?.recurring;
    if (!recurring) return unit;

    const interval = recurring.interval;
    const count = Math.max(1, Number(recurring.interval_count ?? 1));
    if (interval === 'month') return Math.round((unit * 12) / count);
    if (interval === 'year') return Math.round(unit / count);
    return unit;
  }

  private resolvePlanCodeFromStripePriceId(stripePriceId: string | null) {
    if (!stripePriceId) return null;
    const envKey = Object.keys(process.env).find(
      (k) => k.startsWith('PRICE_') && process.env[k] === stripePriceId,
    );
    if (!envKey) return null;
    const parts = envKey.split('_'); // PRICE_<PLAN>_<INTERVAL>
    return parts.length >= 2 ? parts[1] : null;
  }

  private async expireOtherSubs(userId: string, keepId: string) {
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        id: { not: keepId },
        status: { in: ['ACTIVE', 'PAST_DUE'] },
      },
      data: { status: 'EXPIRED' },
    });
  }

  private invoiceCentsForDb(invoice: Stripe.Invoice): number {
    const anyInv = invoice as any;
    const status = String(anyInv.status ?? '').toLowerCase();

    if (status === 'paid') {
      const paid = Number(anyInv.amount_paid ?? 0);
      if (paid > 0) return paid;
    }

    const due = Number(anyInv.amount_due ?? 0);
    const remaining = Number(anyInv.amount_remaining ?? 0);
    const total = Number(anyInv.total ?? 0);

    return Math.max(due, remaining, total, 0);
  }

  private computeDueNowFromPreviewInvoice(invoice: any): number {
    const lines = invoice?.lines?.data;
    if (!Array.isArray(lines)) {
      const v = invoice?.amount_due ?? invoice?.total ?? 0;
      return typeof v === 'number' ? Math.max(0, v) : 0;
    }

    let sum = 0;
    let sawProration = false;

    for (const line of lines) {
      const amount =
        typeof line?.amount === 'number'
          ? line.amount
          : typeof line?.amount_excluding_tax === 'number'
            ? line.amount_excluding_tax
            : 0;

      const isProration =
        line?.proration === true ||
        line?.subscription_item_details?.proration === true ||
        line?.parent?.subscription_item_details?.proration === true;

      if (isProration) {
        sawProration = true;
        sum += amount;
      }
    }

    if (!sawProration) {
      const v = invoice?.amount_due ?? invoice?.total ?? 0;
      return typeof v === 'number' ? Math.max(0, v) : 0;
    }

    return Math.max(0, sum);
  }

  private extractPeriodFromInvoice(
    invoice: any,
  ): { startMs: number; endMs: number } | null {
    const lines = invoice?.lines?.data;
    if (!Array.isArray(lines) || lines.length === 0) return null;

    let start: number | null = null;
    let end: number | null = null;

    for (const ln of lines) {
      const s = ln?.period?.start;
      const e = ln?.period?.end;
      if (typeof s === 'number')
        start = start === null ? s : Math.min(start, s);
      if (typeof e === 'number') end = end === null ? e : Math.max(end, e);
    }

    if (start === null || end === null) return null;
    return { startMs: start * 1000, endMs: end * 1000 };
  }

  private async upsertInvoicePayment(args: {
    userId: string;
    subscriptionId?: string | null;
    invoice: Stripe.Invoice;
    status: 'PENDING' | 'FINISHED' | 'FAILED';
    rawPayload?: any;
  }) {
    const { userId, subscriptionId, invoice, status, rawPayload } = args;
    const cents = this.invoiceCentsForDb(invoice);
    const amountDollars = cents / 100;

    await this.prisma.payment.upsert({
      where: { gatewayPaymentId: String(invoice.id) },
      create: {
        userId,
        subscriptionId: subscriptionId ?? null,
        gateway: 'STRIPE',
        gatewayPaymentId: String(invoice.id),
        amount: new Prisma.Decimal(amountDollars),
        currency: String((invoice as any).currency ?? 'usd').toUpperCase(),
        status,
        rawPayload: this.asPrismaJson(rawPayload ?? invoice),
      },
      update: {
        subscriptionId: subscriptionId ?? undefined,
        status,
        amount: new Prisma.Decimal(amountDollars),
        currency: String((invoice as any).currency ?? 'usd').toUpperCase(),
        rawPayload: this.asPrismaJson(rawPayload ?? invoice),
      },
    });
  }

  private async resolveChangeAction(args: {
    stripeSub: Stripe.Subscription;
    newPriceId: string;
  }): Promise<{
    action: PlanChangeAction;
    currentPrice: Stripe.Price;
    newPrice: Stripe.Price;
  }> {
    const stripeSubAny = args.stripeSub as any;
    const currentPrice = stripeSubAny.items?.data?.[0]?.price as Stripe.Price;
    if (!currentPrice)
      throw new BadRequestException('Subscription has no price item');

    const newPrice = await this.stripeService.retrievePrice(args.newPriceId);

    const currentAnnual = this.annualizedUnitAmount(currentPrice);
    const newAnnual = this.annualizedUnitAmount(newPrice);

    if (newAnnual > currentAnnual)
      return { action: 'upgrade', currentPrice, newPrice };
    if (newAnnual < currentAnnual)
      return { action: 'downgrade', currentPrice, newPrice };
    return { action: 'lateral', currentPrice, newPrice };
  }

  private async ensureLocalSubscriptionFromInvoice(args: {
    userId: string;
    stripeSubId: string;
    invoice: any;
  }): Promise<{ localSubId: string } | null> {
    const { userId, stripeSubId, invoice } = args;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubId },
      select: { id: true },
    });
    if (existing) return { localSubId: existing.id };

    const period = this.extractPeriodFromInvoice(invoice);
    if (!period) {
      this.logger.error(
        `ensureLocalSubscriptionFromInvoice: invoice ${invoice?.id} missing line period`,
      );
      return null;
    }

    const priceId =
      invoice?.lines?.data?.[0]?.price?.id ??
      invoice?.lines?.data?.[0]?.plan?.id ??
      null;

    const planCode = this.resolvePlanCodeFromStripePriceId(
      priceId ? String(priceId) : null,
    );
    if (!planCode) {
      this.logger.error(
        `ensureLocalSubscriptionFromInvoice: could not resolve planCode from priceId ${priceId} (invoice ${invoice?.id})`,
      );
      return null;
    }

    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });
    if (!plan) {
      this.logger.error(
        `ensureLocalSubscriptionFromInvoice: plan ${planCode} not found`,
      );
      return null;
    }

    const created = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        stripeSubscriptionId: stripeSubId,
        currentPeriodStart: new Date(period.startMs),
        currentPeriodEnd: new Date(period.endMs),
        cancelAtPeriodEnd: false,
      },
      select: { id: true },
    });

    return { localSubId: created.id };
  }

  private async applyStripePeriodIfPresent(localSubId: string, stripeSub: any) {
    const cps =
      typeof stripeSub?.current_period_start === 'number'
        ? stripeSub.current_period_start
        : null;
    const cpe =
      typeof stripeSub?.current_period_end === 'number'
        ? stripeSub.current_period_end
        : null;

    const data: any = {
      cancelAtPeriodEnd: Boolean(stripeSub?.cancel_at_period_end),
      status: this.mapStripeStatusToLocal(
        String(stripeSub?.status ?? 'active'),
      ),
    };
    if (cps) data.currentPeriodStart = new Date(cps * 1000);
    if (cpe) data.currentPeriodEnd = new Date(cpe * 1000);

    await this.prisma.subscription.update({
      where: { id: localSubId },
      data,
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async getActivePlanForUser(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
  }

  async getPlans() {
    return this.prisma.plan.findMany({ orderBy: { priceMonthly: 'asc' } });
  }

  async markCancelledAtPeriodEnd(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async findLatestSubscriptionForUser(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Plan change workflow
  // ---------------------------------------------------------------------------

  async previewPlanChangeForUser(data: {
    userId: string;
    planCode: string;
    interval: BillingInterval;
  }) {
    const { userId, interval } = data;
    const planCode = String(data.planCode).toUpperCase();

    const sub = await this.getActivePlanForUser(userId);
    if (!sub?.stripeSubscriptionId)
      throw new BadRequestException('No active subscription found');

    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const newPriceId = this.getPriceIdFromEnv(planCode, interval);
    const stripeSub = await this.stripeService.retrieveSubscription(
      sub.stripeSubscriptionId,
    );

    const { action, currentPrice, newPrice } = await this.resolveChangeAction({
      stripeSub,
      newPriceId,
    });

    if (String(currentPrice.id) === String(newPrice.id)) {
      return {
        action: 'lateral',
        message: 'You are already on this billing price.',
        amountDue: 0,
        currency: String(currentPrice.currency ?? 'usd').toUpperCase(),
        effectiveAt: null,
      };
    }

    const stripeAny = stripeSub as any;
    const cpe =
      typeof stripeAny?.current_period_end === 'number'
        ? stripeAny.current_period_end
        : null;
    const currentPeriodEndISO = cpe ? new Date(cpe * 1000).toISOString() : null;

    if (action === 'downgrade') {
      return {
        action,
        message:
          'Downgrades are scheduled at the end of your current billing period (no refund; you keep access until then).',
        amountDue: 0,
        currency: String(currentPrice.currency ?? 'usd').toUpperCase(),

        // ✅ frontend expects this literal for correct UI text
        effectiveAt: 'period_end',

        // ✅ give the actual date for display
        currentPeriodEnd: currentPeriodEndISO ?? undefined,
      };
    }

    const prorationDate = Math.floor(Date.now() / 1000);
    const preview =
      await this.stripeService.previewUpcomingInvoiceForPriceChange({
        subscriptionId: sub.stripeSubscriptionId,
        newPriceId,
        prorationDate,
      });

    const amountDue = this.computeDueNowFromPreviewInvoice(preview as any);
    const currency = String(
      (preview as any)?.currency ?? currentPrice.currency ?? 'usd',
    ).toUpperCase();

    return {
      action: amountDue > 0 ? 'upgrade' : 'lateral',
      message:
        amountDue > 0
          ? 'This change will take effect immediately. Stripe will charge the prorated difference now.'
          : 'This change will take effect immediately with no additional charge right now.',
      amountDue,
      currency,
      effectiveAt: 'immediate',
      prorationDate,
      previewLines: (preview as any)?.lines?.data ?? [],
    };
  }

  async confirmPlanChangeForUser(data: {
    userId: string;
    planCode: string;
    interval: BillingInterval;
    prorationDate?: number;
  }) {
    const { userId, interval } = data;
    const planCode = String(data.planCode).toUpperCase();

    const sub = await this.getActivePlanForUser(userId);
    if (!sub?.stripeSubscriptionId)
      throw new BadRequestException('No active subscription found');

    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });
    if (!plan) throw new BadRequestException('Plan not found');

    const newPriceId = this.getPriceIdFromEnv(planCode, interval);

    const stripeSub = await this.stripeService.retrieveSubscription(
      sub.stripeSubscriptionId,
    );

    const { action, currentPrice, newPrice } = await this.resolveChangeAction({
      stripeSub,
      newPriceId,
    });

    if (String(currentPrice.id) === String(newPrice.id)) {
      throw new BadRequestException('You are already on this plan/interval');
    }

    const stripeAny = stripeSub as any;

    // ---------------- Downgrade: schedule at period end ----------------
    if (action === 'downgrade') {
      const stripeAny = stripeSub as any;

      const stripePeriodEnd =
        typeof stripeAny?.current_period_end === 'number'
          ? stripeAny.current_period_end
          : typeof stripeAny?.current_period_end === 'string' &&
              /^\d+$/.test(stripeAny.current_period_end)
            ? Number(stripeAny.current_period_end)
            : null;

      const dbPeriodEnd =
        sub.currentPeriodEnd instanceof Date
          ? Math.floor(sub.currentPeriodEnd.getTime() / 1000)
          : null;

      const schedule = await this.stripeService.schedulePriceChangeAtPeriodEnd({
        subscriptionId: sub.stripeSubscriptionId,
        newPriceId,
        currentPeriodEnd: stripePeriodEnd ?? dbPeriodEnd ?? undefined,
      });

      const effectiveAtIso =
        (stripePeriodEnd ?? dbPeriodEnd)
          ? new Date(
              ((stripePeriodEnd ?? dbPeriodEnd) as number) * 1000,
            ).toISOString()
          : (sub.currentPeriodEnd?.toISOString?.() ?? null);

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          pendingPlanCode: planCode,
          pendingPlanInterval: interval,
          pendingChangeAt: effectiveAtIso ? new Date(effectiveAtIso) : null,
          stripeScheduleId: String((schedule as any).id),
        } as any,
      });

      return {
        scheduled: true,
        requiresPayment: false,
        action: 'downgrade',
        scheduleId: String((schedule as any).id),
        effectiveAt: effectiveAtIso,
        message:
          'Downgrade scheduled. You will keep your current plan until the end of the billing period.',
      };
    }

    // ---------------- Upgrade/Lateral: apply now ----------------

    // Release schedule if it exists
    try {
      const sid =
        typeof stripeAny?.schedule === 'string'
          ? stripeAny.schedule
          : stripeAny?.schedule?.id;
      if (sid)
        await this.stripeService.releaseSubscriptionSchedule(String(sid));
    } catch {
      // best-effort
    }

    const updatedSub = await this.stripeService.updateSubscriptionPriceNow({
      subscriptionId: sub.stripeSubscriptionId,
      newPriceId,
      prorationDate: data.prorationDate,
    });

    // Resolve latest invoice
    const updatedAny: any = updatedSub as any;
    let invoice: Stripe.Invoice | null = null;
    const li = updatedAny?.latest_invoice;

    if (li && typeof li === 'object') invoice = li as Stripe.Invoice;
    if (li && typeof li === 'string') {
      invoice = await this.stripeService.finalizeInvoice(String(li));
    }
    if (invoice?.id) {
      invoice = await this.stripeService.finalizeInvoice(String(invoice.id));
    }

    if (!invoice) {
      await this.expireOtherSubs(userId, sub.id);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          planId: plan.id,
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
        },
      });
      await this.clearPendingPlanChange(sub.id).catch(() => {});
      await this.applyStripePeriodIfPresent(sub.id, updatedSub as any).catch(
        () => {},
      );
      return {
        scheduled: false,
        requiresPayment: false,
        action: 'upgrade',
        message: 'Plan updated successfully 🎉',
      };
    }

    const invAny: any = invoice as any;
    const invStatus = String(invAny?.status ?? '').toLowerCase();
    const amountCents = this.invoiceCentsForDb(invoice);

    const pi = invAny?.payment_intent;
    const piStatus =
      pi && typeof pi === 'object' ? String(pi.status ?? '') : '';
    const needsAction =
      piStatus === 'requires_action' ||
      piStatus === 'requires_payment_method' ||
      piStatus === 'requires_confirmation';

    const paid = invStatus === 'paid' || amountCents === 0;

    // If paid automatically => apply immediately
    if (paid && !needsAction) {
      await this.expireOtherSubs(userId, sub.id);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          planId: plan.id,
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
        },
      });
      await this.clearPendingPlanChange(sub.id).catch(() => {});
      await this.applyStripePeriodIfPresent(sub.id, updatedSub as any).catch(
        () => {},
      );

      await this.upsertInvoicePayment({
        userId,
        subscriptionId: sub.id,
        invoice,
        status: 'FINISHED',
        rawPayload: this.asPrismaJson({
          subscription: this.toPlainJson(updatedSub),
          invoice: this.toPlainJson(invoice),
        }),
      });

      return {
        scheduled: false,
        requiresPayment: false,
        action: 'upgrade',
        amountCharged: amountCents,
        currency: String(
          invAny?.currency ?? (newPrice as any)?.currency ?? 'usd',
        ).toUpperCase(),
        message: 'Plan updated successfully 🎉',
      };
    }

    // Payment required (3DS / failed / needs action)
    await this.upsertInvoicePayment({
      userId,
      subscriptionId: sub.id,
      invoice,
      status: 'PENDING',
      rawPayload: this.asPrismaJson({
        subscription: this.toPlainJson(updatedSub),
        invoice: this.toPlainJson(invoice),
      }),
    });

    return {
      scheduled: false,
      requiresPayment: true,
      action: 'upgrade',
      invoiceUrl: invAny?.hosted_invoice_url || invAny?.invoice_pdf,
      amountDue: amountCents,
      currency: String(
        invAny?.currency ?? (newPrice as any)?.currency ?? 'usd',
      ).toUpperCase(),
      message:
        'Additional payment is required to complete this plan change. You will be redirected to Stripe.',
    };
  }

  async cancelScheduledPlanChange(userId: string) {
    const sub = await this.getActivePlanForUser(userId);
    if (!sub?.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    const stripeSub = await this.stripeService.retrieveSubscription(
      sub.stripeSubscriptionId,
    );
    const stripeAny = stripeSub as any;
    const sid =
      typeof stripeAny?.schedule === 'string'
        ? stripeAny.schedule
        : stripeAny?.schedule?.id;

    if (!sid) {
      throw new BadRequestException('No scheduled plan change found');
    }

    await this.stripeService.releaseSubscriptionSchedule(String(sid));
    await this.clearPendingPlanChange(sub.id).catch(() => {});
    return { status: 200, message: 'Scheduled plan change cancelled.' };
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  async handleInvoicePaid(invoice: any) {
    const invoiceId = String(invoice?.id ?? '');
    const stripeSubId =
      typeof invoice?.subscription === 'string'
        ? invoice.subscription
        : invoice?.subscription?.id
          ? String(invoice.subscription.id)
          : null;

    const existingPay = await this.prisma.payment
      .findUnique({
        where: { gatewayPaymentId: invoiceId },
        select: { userId: true, subscriptionId: true },
      })
      .catch(() => null);

    let userId: string | undefined = invoice?.metadata?.userId
      ? String(invoice.metadata.userId)
      : undefined;

    let localSubId: string | undefined =
      existingPay?.subscriptionId ?? undefined;

    if (!userId && stripeSubId) {
      const existingSub = await this.prisma.subscription.findUnique({
        where: { stripeSubscriptionId: String(stripeSubId) },
        select: { id: true, userId: true },
      });
      if (existingSub) {
        userId = existingSub.userId;
        localSubId = existingSub.id;
      }
    }

    let stripeSub: Stripe.Subscription | null = null;
    if (!userId && stripeSubId) {
      try {
        stripeSub = await this.stripeService.retrieveSubscription(
          String(stripeSubId),
        );
        const metaUid = (stripeSub as any)?.metadata?.userId;
        if (metaUid) userId = String(metaUid);
      } catch {}
    }

    if (!userId && stripeSubId) {
      try {
        const sessions =
          await this.stripeService.listCheckoutSessionsBySubscription(
            String(stripeSubId),
          );
        const s0 = sessions?.[0] as any;
        const mUid = s0?.metadata?.userId ?? s0?.client_reference_id;
        if (mUid) userId = String(mUid);
      } catch {}
    }

    if (!userId && existingPay?.userId) userId = existingPay.userId;

    if (!userId) {
      this.logger.error(
        `handleInvoicePaid skipped: Could not resolve User ID for invoice ${invoiceId}`,
      );
      return;
    }

    let fullInvoice: Stripe.Invoice | null = null;
    try {
      fullInvoice = await this.stripeService.retrieveInvoice(invoiceId);
    } catch {
      fullInvoice = null;
    }

    if (!localSubId && stripeSubId && fullInvoice) {
      const ensured = await this.ensureLocalSubscriptionFromInvoice({
        userId,
        stripeSubId: String(stripeSubId),
        invoice: fullInvoice as any,
      });
      if (ensured) localSubId = ensured.localSubId;
    }

    if (stripeSubId) {
      try {
        stripeSub =
          stripeSub ??
          (await this.stripeService.retrieveSubscription(String(stripeSubId)));

        const priceId = (stripeSub as any)?.items?.data?.[0]?.price?.id ?? null;
        const planCode = this.resolvePlanCodeFromStripePriceId(
          priceId ? String(priceId) : null,
        );

        if (planCode && localSubId) {
          const plan = await this.prisma.plan.findUnique({
            where: { code: planCode },
          });
          if (plan) {
            await this.expireOtherSubs(userId, localSubId);
            await this.prisma.subscription.update({
              where: { id: localSubId },
              data: {
                planId: plan.id,
                status: 'ACTIVE',
                cancelAtPeriodEnd: false,
              },
            });
            await this.applyStripePeriodIfPresent(
              localSubId,
              stripeSub as any,
            ).catch(() => {});
            await this.clearPendingPlanChange(localSubId).catch(() => {});
          }
        }
      } catch {}
    }

    const invForDb = (fullInvoice ?? invoice) as any;

    await this.prisma.payment.upsert({
      where: { gatewayPaymentId: invoiceId },
      create: {
        userId,
        subscriptionId: localSubId ?? null,
        gateway: 'STRIPE',
        gatewayPaymentId: invoiceId,
        status: 'FINISHED',
        amount: new Prisma.Decimal(this.invoiceCentsForDb(invForDb) / 100),
        currency: String(invForDb.currency || 'usd').toUpperCase(),
        rawPayload: this.asPrismaJson(invForDb),
      },
      update: {
        subscriptionId: localSubId ?? undefined,
        status: 'FINISHED',
        amount: new Prisma.Decimal(this.invoiceCentsForDb(invForDb) / 100),
        currency: String(invForDb.currency || 'usd').toUpperCase(),
        rawPayload: this.asPrismaJson(invForDb),
      },
    });
  }

  async handleCheckoutCompleted(session: any) {
    const userId = session?.metadata?.userId || session?.client_reference_id;
    const planCode = session?.metadata?.planCode
      ? String(session.metadata.planCode).toUpperCase()
      : null;

    if (!userId || !planCode) return;

    const stripeSubId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!stripeSubId) return;

    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });
    if (!plan) return;

    const invoiceId =
      typeof session?.invoice === 'string'
        ? session.invoice
        : session?.invoice?.id
          ? String(session.invoice.id)
          : session?.subscription?.latest_invoice?.id
            ? String(session.subscription.latest_invoice.id)
            : typeof session?.subscription?.latest_invoice === 'string'
              ? String(session.subscription.latest_invoice)
              : undefined;

    let periodStartMs = Date.now();
    let periodEndMs = Date.now() + 30 * 24 * 60 * 60 * 1000;

    let invoiceObj: Stripe.Invoice | null = null;
    if (invoiceId) {
      try {
        invoiceObj = await this.stripeService.retrieveInvoice(
          String(invoiceId),
        );
        const period = this.extractPeriodFromInvoice(invoiceObj as any);
        if (period) {
          periodStartMs = period.startMs;
          periodEndMs = period.endMs;
        }
      } catch {
        invoiceObj = null;
      }
    }

    const localSub = await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: String(stripeSubId) },
      create: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        stripeSubscriptionId: String(stripeSubId),
        currentPeriodStart: new Date(periodStartMs),
        currentPeriodEnd: new Date(periodEndMs),
        cancelAtPeriodEnd: false,
      },
      update: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(periodStartMs),
        currentPeriodEnd: new Date(periodEndMs),
        cancelAtPeriodEnd: false,
      },
    });

    await this.expireOtherSubs(userId, localSub.id);

    const sessionId = String(session.id);
    const amountCents =
      typeof session.amount_total === 'number' ? session.amount_total : 0;
    const currency = String(session.currency || 'usd').toUpperCase();

    const safeRawPayload = this.asPrismaJson({
      checkoutSession: this.toPlainJson(session),
      invoice: invoiceObj
        ? this.toPlainJson(invoiceObj)
        : invoiceId
          ? { id: String(invoiceId) }
          : null,
      note: 'merged_session_into_invoice',
    });

    if (invoiceId) {
      try {
        await this.prisma.payment.update({
          where: { gatewayPaymentId: sessionId },
          data: {
            gatewayPaymentId: String(invoiceId),
            subscriptionId: localSub.id,
            status: 'FINISHED',
            amount: new Prisma.Decimal(amountCents / 100),
            currency,
            rawPayload: safeRawPayload,
          } as any,
        });
      } catch {
        await this.prisma.payment
          .upsert({
            where: { gatewayPaymentId: String(invoiceId) },
            create: {
              userId,
              subscriptionId: localSub.id,
              gateway: 'STRIPE',
              gatewayPaymentId: String(invoiceId),
              status: 'FINISHED',
              amount: new Prisma.Decimal(amountCents / 100),
              currency,
              rawPayload: safeRawPayload,
            },
            update: {
              subscriptionId: localSub.id,
              status: 'FINISHED',
              amount: new Prisma.Decimal(amountCents / 100),
              currency,
              rawPayload: safeRawPayload,
            } as any,
          })
          .catch(() => {});

        await this.prisma.payment
          .delete({ where: { gatewayPaymentId: sessionId } })
          .catch(() => {});
      }

      return;
    }

    await this.prisma.payment
      .upsert({
        where: { gatewayPaymentId: sessionId },
        create: {
          userId,
          subscriptionId: localSub.id,
          gateway: 'STRIPE',
          gatewayPaymentId: sessionId,
          status: 'FINISHED',
          amount: new Prisma.Decimal(amountCents / 100),
          currency,
          rawPayload: this.asPrismaJson({
            checkoutSession: this.toPlainJson(session),
            note: 'no_invoice_id',
          }),
        },
        update: {
          subscriptionId: localSub.id,
          status: 'FINISHED',
          amount: new Prisma.Decimal(amountCents / 100),
          currency,
          rawPayload: this.asPrismaJson({
            checkoutSession: this.toPlainJson(session),
            note: 'no_invoice_id',
          }),
        } as any,
      })
      .catch(() => {});
  }

  async handleInvoicePaymentFailed(invoice: any) {
    const stripeSubId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!stripeSubId) return;

    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: String(stripeSubId) },
    });
    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    });

    const amountDollars = (invoice.amount_due ?? 0) / 100;
    await this.prisma.payment.upsert({
      where: { gatewayPaymentId: String(invoice.id) },
      create: {
        userId: sub.userId,
        subscriptionId: sub.id,
        gateway: 'STRIPE',
        gatewayPaymentId: String(invoice.id),
        amount: new Prisma.Decimal(amountDollars),
        currency: String(invoice.currency || 'usd').toUpperCase(),
        status: 'FAILED',
        rawPayload: this.asPrismaJson(invoice),
      },
      update: {
        status: 'FAILED',
        rawPayload: this.asPrismaJson(invoice),
        amount: new Prisma.Decimal(amountDollars),
      },
    });
  }

  async handleSubscriptionDeleted(stripeSub: any) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: String(stripeSub.id) },
      data: { status: 'EXPIRED' },
    });
  }

  async syncSubscriptionFromStripe(stripeSub: any) {
    try {
      const stripeId = String(stripeSub?.id ?? stripeSub);
      const sub = await this.prisma.subscription.findUnique({
        where: { stripeSubscriptionId: stripeId },
      });
      if (!sub) return;

      const data: any = {
        status: this.mapStripeStatusToLocal(String(stripeSub.status)),
        cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
      };

      if (typeof stripeSub?.current_period_start === 'number') {
        data.currentPeriodStart = new Date(
          stripeSub.current_period_start * 1000,
        );
      }
      if (typeof stripeSub?.current_period_end === 'number') {
        data.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
      }

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data,
      });
    } catch (e: any) {
      this.logger.error(`Sync failed: ${e?.message ?? String(e)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Auth helper
  // ---------------------------------------------------------------------------

  async findUserByToken(token: string) {
    if (!token) return null;
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      return this.prisma.user.findUnique({
        where: { id: payload.sub || payload.userId },
      });
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async createPendingPayment(data: {
    userId: string;
    gatewayPaymentId: string;
    gateway?: 'STRIPE';
    status?: 'PENDING';
    amount?: number; // cents
    currency?: string;
    rawPayload?: any;
  }) {
    const {
      userId,
      gatewayPaymentId,
      status = 'PENDING',
      amount = 0,
      currency = 'USD',
      rawPayload = null,
    } = data;

    const amountDecimal = new Prisma.Decimal(amount / 100);

    return this.prisma.payment.upsert({
      where: { gatewayPaymentId },
      create: {
        userId,
        gateway: 'STRIPE',
        gatewayPaymentId,
        amount: amountDecimal,
        currency,
        status,
        rawPayload: this.asPrismaJson(rawPayload),
      },
      update: {
        userId,
        amount: amountDecimal,
        currency,
        status,
        rawPayload: this.asPrismaJson(rawPayload),
      } as any,
    });
  }
}
