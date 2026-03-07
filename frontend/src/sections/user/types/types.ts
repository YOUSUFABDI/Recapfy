import { RawPayload } from "@/types/billing";
import { UserDT } from "@/types/user";

export interface UserCounts {
  trades: number;
  ctraderConnections: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  currency: string;
  maxPlatforms: number;
  maxAccounts: number;
  features: string[];
  aiCoach: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  gateway: string;
  gatewayPaymentId: string;
  amount: string;
  currency: string;
  status: string;
  rawPayload: RawPayload;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  pendingPlanCode: string | null;
  pendingPlanInterval: string | null;
  pendingChangeAt: string | null;
  stripeScheduleId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: Plan;
  payments: Payment[];
}

export interface UserListItem extends UserDT {
  _count: UserCounts;
}

export interface UserDetails extends UserDT {
  _count: UserCounts;
  CTraderAccount: any[];
  subscriptions: Subscription[];
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UsersResponse {
  statusCode: number;
  payload: {
    message: string;
    data: {
      users: UserListItem[];
      meta: Meta;
    };
  };
}

export interface SingleUserResponse {
  statusCode: number;
  payload: {
    message: string;
    data: UserDetails;
  };
}
