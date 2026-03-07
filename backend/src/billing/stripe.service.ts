// stripe.service.ts
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY in env');

    const cfg: Stripe.StripeConfig = {};
    if (process.env.STRIPE_API_VERSION) {
      (cfg as any).apiVersion = process.env.STRIPE_API_VERSION as any;
    }
    this.stripe = new Stripe(key, cfg);
  }

  async createCheckoutSessionForPrice(params: {
    priceId: string;
    mode?: 'subscription' | 'payment';
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    try {
      return await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: params.mode ?? 'subscription',
        line_items: [{ price: params.priceId, quantity: 1 }],
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        client_reference_id: params.metadata?.userId,
        metadata: params.metadata,
        subscription_data: { metadata: params.metadata },
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe error: ${err?.message ?? String(err)}`,
      );
    }
  }

  constructEvent(payload: Buffer, sig: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, sig, secret);
  }

  async retrieveCheckoutSession(sessionId: string) {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: [
          'payment_intent',
          'subscription',
          'subscription.schedule',
          'subscription.latest_invoice',
          'subscription.latest_invoice.payment_intent',
          'subscription.items.data.price',
        ],
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe retrieve checkout session error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async retrieveSubscription(id: string): Promise<Stripe.Subscription> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(id, {
        expand: [
          'latest_invoice',
          'latest_invoice.payment_intent',
          'items.data.price',
          'schedule',
        ],
      });
      return sub as unknown as Stripe.Subscription;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe retrieve subscription error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async retrieveSubscriptionSchedule(
    id: string,
  ): Promise<Stripe.SubscriptionSchedule> {
    try {
      return await this.stripe.subscriptionSchedules.retrieve(id, {
        expand: ['phases.items.price'],
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe retrieve schedule error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async retrievePrice(id: string): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.retrieve(id, {
        expand: ['product'],
      });
      return price as unknown as Stripe.Price;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe retrieve price error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['lines.data.price', 'payment_intent', 'subscription'],
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe retrieve invoice error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async listCheckoutSessionsBySubscription(subscriptionId: string) {
    try {
      const res = await this.stripe.checkout.sessions.list({
        subscription: subscriptionId,
        limit: 5,
      });
      return res?.data ?? [];
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe list checkout sessions error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    try {
      if (atPeriodEnd) {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
      return await (this.stripe.subscriptions as any).del(subscriptionId);
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe cancel error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async finalizeInvoice(invoiceId: string) {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['payment_intent', 'lines.data.price', 'subscription'],
      });
      if (invoice.status === 'draft') {
        return await this.stripe.invoices.finalizeInvoice(invoiceId, {
          expand: ['payment_intent', 'lines.data.price', 'subscription'],
        });
      }
      return invoice;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe finalize invoice error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async createBillingPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }) {
    try {
      return await this.stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe portal error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async previewUpcomingInvoiceForPriceChange(params: {
    subscriptionId: string;
    newPriceId: string;
    prorationDate?: number;
  }) {
    try {
      const sub: any = await this.retrieveSubscription(params.subscriptionId);
      const item = sub.items?.data?.[0];
      if (!item) throw new Error('Subscription has no items');

      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      if (!customerId) throw new Error('Subscription missing customer');

      const prorationDate =
        params.prorationDate ?? Math.floor(Date.now() / 1000);

      const payload: any = {
        customer: String(customerId),
        subscription: params.subscriptionId,
        subscription_details: {
          items: [
            {
              id: String(item.id),
              price: params.newPriceId,
              quantity: item.quantity ?? 1,
            },
          ],
          proration_behavior: 'create_prorations',
          proration_date: prorationDate,
        },
        expand: ['lines.data.price', 'payment_intent'],
      };

      const stripeAny: any = this.stripe as any;

      if (stripeAny?.invoices?.createPreview) {
        return await stripeAny.invoices.createPreview(payload);
      }
      if (stripeAny?.invoices?.create_preview) {
        return await stripeAny.invoices.create_preview(payload);
      }
      if (typeof stripeAny?.rawRequest === 'function') {
        const res = await stripeAny.rawRequest(
          'post',
          '/v1/invoices/create_preview',
          payload,
        );
        return res?.data ?? res;
      }

      throw new Error(
        'Stripe SDK too old: missing invoices.createPreview (or rawRequest). Please upgrade `stripe`.',
      );
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe upcoming invoice preview error: ${err?.message ?? String(err)}`,
      );
    }
  }

  async updateSubscriptionPriceNow(params: {
    subscriptionId: string;
    newPriceId: string;
    prorationDate?: number;
  }): Promise<Stripe.Subscription> {
    try {
      const current: any = await this.retrieveSubscription(
        params.subscriptionId,
      );
      const item = current.items?.data?.[0];
      if (!item) throw new Error('Subscription has no items to update');

      const updated = await this.stripe.subscriptions.update(
        params.subscriptionId,
        {
          items: [{ id: item.id, price: params.newPriceId }],
          proration_behavior: 'always_invoice',
          proration_date: params.prorationDate,
          payment_behavior: 'pending_if_incomplete',
          expand: [
            'latest_invoice',
            'latest_invoice.payment_intent',
            'items.data.price',
            'schedule',
          ],
        },
      );

      return updated as unknown as Stripe.Subscription;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe update subscription error: ${err?.message ?? String(err)}`,
      );
    }
  }

  private parseUnixSeconds(v: any): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
    return null;
  }

  /**
   * ✅ FINAL FIX:
   * Stripe requires at least one phase with start_date.
   * But you can't change the current phase start_date.
   *
   * So we INCLUDE start_date for phase 0, using the EXACT existing start_date:
   * schedule.current_phase.start_date (best), else phases[0].start_date, else sub.current_period_start.
   */
  async schedulePriceChangeAtPeriodEnd(params: {
    subscriptionId: string;
    newPriceId: string;
    currentPeriodEnd?: number; // optional fallback from DB
  }): Promise<Stripe.SubscriptionSchedule> {
    try {
      const sub: any = await this.retrieveSubscription(params.subscriptionId);
      const item = sub.items?.data?.[0];
      if (!item) throw new BadRequestException('Subscription has no items');

      const currentPriceId: string = String(item.price?.id);
      const qty: number = item.quantity ?? 1;

      // 1) Find existing schedule or create one
      let scheduleId: string | undefined;
      const scheduleAny = sub.schedule;
      if (typeof scheduleAny === 'string') scheduleId = scheduleAny;
      if (scheduleAny?.id) scheduleId = String(scheduleAny.id);

      if (!scheduleId) {
        const created = await this.stripe.subscriptionSchedules.create({
          from_subscription: params.subscriptionId,
        });
        scheduleId = created.id;
      }

      // 2) Load schedule
      const schedule: any = await this.retrieveSubscriptionSchedule(scheduleId);
      const phases: any[] = Array.isArray(schedule?.phases)
        ? schedule.phases
        : [];
      if (phases.length === 0) {
        throw new BadRequestException('Subscription schedule has no phases');
      }

      // 3) Determine period end
      const scheduleEnd = this.parseUnixSeconds(
        schedule?.current_phase?.end_date,
      );
      const subEnd = this.parseUnixSeconds(sub?.current_period_end);
      const fallbackEnd = this.parseUnixSeconds(params.currentPeriodEnd);
      const periodEnd = scheduleEnd ?? subEnd ?? fallbackEnd;

      const now = Math.floor(Date.now() / 1000);
      if (!periodEnd || periodEnd <= now) {
        throw new BadRequestException(
          'Cannot schedule downgrade. Subscription period end is missing or the subscription is expired.',
        );
      }

      // 4) Determine the EXACT current phase start_date to reuse (do not change it)
      const scheduleCurrentStart = this.parseUnixSeconds(
        schedule?.current_phase?.start_date,
      );
      const phase0Start = this.parseUnixSeconds(phases[0]?.start_date);
      const subStart = this.parseUnixSeconds(sub?.current_period_start);

      const currentStart = scheduleCurrentStart ?? phase0Start ?? subStart;
      if (!currentStart) {
        throw new BadRequestException(
          'Cannot schedule downgrade: missing current phase start_date to anchor schedule phases.',
        );
      }

      // 5) Build phases payload (includes start_date anchor!)
      const currentPhasePayload: any = {
        start_date: currentStart, // ✅ anchor + "unchanged" start_date
        end_date: periodEnd,
        items: [{ price: currentPriceId, quantity: qty }],
      };

      const futurePhasePayload: any = {
        start_date: periodEnd,
        items: [{ price: params.newPriceId, quantity: qty }],
      };

      // 6) Update schedule
      const updated = await this.stripe.subscriptionSchedules.update(
        scheduleId,
        {
          end_behavior: 'release',
          phases: [currentPhasePayload, futurePhasePayload],
        },
      );

      return updated as unknown as Stripe.SubscriptionSchedule;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;

      const msg = err?.message ?? String(err);
      if (String(msg).toLowerCase().includes('cannot schedule downgrade')) {
        throw new BadRequestException(msg);
      }

      throw new InternalServerErrorException(
        `Stripe schedule downgrade error: ${msg}`,
      );
    }
  }

  async releaseSubscriptionSchedule(scheduleId: string) {
    try {
      return await this.stripe.subscriptionSchedules.release(scheduleId);
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Stripe release schedule error: ${err?.message ?? String(err)}`,
      );
    }
  }

  /**
   * Retrieve the user's payment method details (only non-sensitive data like last4, brand).
   */
  async getPaymentMethod(email: string): Promise<any> {
    console.log('email', email);
    try {
      // Find the Stripe customer by email
      const customers = await this.stripe.customers.list({
        email: email,
        limit: 1, // Only return one customer (assuming email is unique)
      });

      // If no customer is found, throw an error
      if (customers.data.length === 0) {
        throw new BadRequestException(
          'Stripe customer not found for this email',
        );
      }

      const customer = customers.data[0]; // We assume the first customer is the correct one

      // List all payment methods associated with the customer
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card', // Only list card payment methods
      });

      // If no payment methods exist for the customer, throw an error
      if (paymentMethods.data.length === 0) {
        throw new BadRequestException(
          'No payment methods found for this customer',
        );
      }

      // Assume the first payment method is the default one
      const paymentMethod = paymentMethods.data[0];

      return {
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
      };
    } catch (error) {
      // Catch Stripe errors and throw custom error messages
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Stripe error: ${error.message}`,
        );
      }
      // Throw the original error if not a Stripe error
      throw error;
    }
  }
}
