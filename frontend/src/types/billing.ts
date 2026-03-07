export type CurrentPlanDT = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  plan: Plan;
  payments: Payment[];
  stripeSubscriptionId: string;

  pendingPlanCode: string;
  pendingPlanInterval: string;
  pendingChangeAt: string;
};

export type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priceMonthly: string;
  priceYearly?: string | null;
  currency: string;
  maxPlatforms?: number | null;
  maxAccounts?: number | null;
  aiCoach?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  userId: string;
  subscriptionId: string;
  gateway: string;
  gatewayPaymentId: string;
  amount: string;
  currency: string;
  status: string;
  rawPayload?: RawPayload;
  createdAt: string;
  updatedAt: string;
};

export type RawPayload = {
  id?: string | null;
  url?: string | null;
  mode?: string | null;
  locale?: string | null;
  object?: string | null;
  status?: string | null;
  consent?: unknown | null;
  created?: number | null;
  invoice?: string | null;
  ui_mode?: string | null;
  currency?: string | null;
  customer?: string | null;
  livemode?: boolean | null;
  metadata?: Record<string, string | null> | null;
  discounts?: any[] | null;
  cancel_url?: string | null;
  expires_at?: number | null;
  custom_text?: {
    submit?: string | null;
    after_submit?: string | null;
    shipping_address?: string | null;
    terms_of_service_acceptance?: string | null;
  } | null;
  permissions?: unknown | null;
  submit_type?: string | null;
  success_url?: string | null;
  amount_total?: number | null;
  payment_link?: string | null;
  setup_intent?: string | null;
  subscription?: StripeSubscription | null;
  automatic_tax?: {
    status?: string | null;
    enabled?: boolean | null;
    provider?: string | null;
    liability?: string | null;
    disabled_reason?: string | null;
  } | null;
  client_secret?: string | null;
  customer_email?: string | null;
  payment_intent?: string | null;
  payment_status?: string | null;
  amount_subtotal?: number | null;
  adaptive_pricing?: { enabled?: boolean } | null;
  customer_details?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: {
      city?: string | null;
      line1?: string | null;
      line2?: string | null;
      state?: string | null;
      country?: string | null;
      postal_code?: string | null;
    } | null;
    tax_ids?: any[] | null;
    tax_exempt?: string | null;
    business_name?: string | null;
    individual_name?: string | null;
  } | null;
  invoice_creation?: unknown | null;
  shipping_options?: any[] | null;
  branding_settings?: {
    icon?: string | null;
    logo?: string | null;
    font_family?: string | null;
    border_style?: string | null;
    button_color?: string | null;
    display_name?: string | null;
    background_color?: string | null;
  } | null;
  customer_creation?: string | null;
  consent_collection?: unknown | null;
  client_reference_id?: string | null;
  currency_conversion?: unknown | null;
  payment_method_types?: string[] | null;
  collected_information?: {
    business_name?: string | null;
    individual_name?: string | null;
    shipping_details?: unknown | null;
  } | null;
  payment_method_options?: {
    card?: { request_three_d_secure?: string | null } | null;
    [key: string]: any;
  } | null;
  phone_number_collection?: { enabled?: boolean } | null;
  payment_method_collection?: string | null;
  billing_address_collection?: unknown | null;
  shipping_address_collection?: unknown | null;
  saved_payment_method_options?: {
    payment_method_save?: string | null;
    payment_method_remove?: string | null;
    allow_redisplay_filters?: string[] | null;
  } | null;
  payment_method_configuration_details?: unknown | null;
  [key: string]: any;
};

export type StripeSubscription = {
  id?: string;
  plan?: StripePlanObject | null;
  items?: {
    url?: string;
    data?: StripeSubscriptionItem[];
    object?: string;
    has_more?: boolean;
    total_count?: number;
  } | null;
  object?: string | null;
  status?: string | null;
  created?: number | null;
  currency?: string | null;
  customer?: string | null;
  ended_at?: number | null;
  livemode?: boolean | null;
  metadata?: Record<string, any> | null;
  quantity?: number | null;
  cancel_at?: number | null;
  canceled_at?: number | null;
  start_date?: number | null;
  billing_mode?: any | null;
  latest_invoice?: StripeInvoice | null;
  default_payment_method?: string | null;
  payment_settings?: any | null;
  collection_method?: string | null;
  cancel_at_period_end?: boolean | null;
  cancellation_details?: {
    reason?: string | null;
    comment?: string | null;
    feedback?: string | null;
  } | null;
  [key: string]: any;
};

export type StripePlanObject = {
  id?: string;
  meter?: any | null;
  active?: boolean;
  amount?: number | null;
  object?: string | null;
  created?: number | null;
  product?: string | null;
  currency?: string | null;
  interval?: string | null;
  livemode?: boolean | null;
  metadata?: Record<string, any> | null;
  nickname?: string | null;
  tiers_mode?: any | null;
  usage_type?: string | null;
  amount_decimal?: string | null;
  billing_scheme?: string | null;
  interval_count?: number | null;
  trial_period_days?: number | null;
  [key: string]: any;
};

export type StripeSubscriptionItem = {
  id?: string;
  plan?: StripePlanObject | null;
  price?: {
    id?: string;
    type?: string | null;
    active?: boolean;
    object?: string | null;
    created?: number | null;
    product?: string | null;
    currency?: string | null;
    livemode?: boolean | null;
    metadata?: Record<string, any> | null;
    recurring?: {
      meter?: any | null;
      interval?: string | null;
      usage_type?: string | null;
      interval_count?: number | null;
      trial_period_days?: number | null;
    } | null;
    unit_amount?: number | null;
    unit_amount_decimal?: string | null;
    [key: string]: any;
  } | null;
  object?: string | null;
  created?: number | null;
  metadata?: Record<string, any> | null;
  quantity?: number | null;
  discounts?: any[] | null;
  tax_rates?: any[] | null;
  subscription?: string | null;
  billing_thresholds?: any | null;
  current_period_end?: number | null;
  current_period_start?: number | null;
  [key: string]: any;
};

export type StripeInvoice = {
  id?: string;
  lines?: {
    url?: string;
    data?: Array<{
      id?: string;
      taxes?: any[] | null;
      amount?: number | null;
      object?: string | null;
      parent?: any | null;
      period?: { start?: number | null; end?: number | null } | null;
      invoice?: string | null;
      pricing?: any | null;
      currency?: string | null;
      livemode?: boolean | null;
      metadata?: Record<string, any> | null;
      quantity?: number | null;
      discounts?: any[] | null;
      description?: string | null;
    }>;
    object?: string;
    has_more?: boolean;
    total_count?: number;
  } | null;
  total?: number | null;
  status?: string | null;
  created?: number | null;
  currency?: string | null;
  customer?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  invoice_pdf?: string | null;
  customer_email?: string | null;
  hosted_invoice_url?: string | null;
  [key: string]: any;
};
