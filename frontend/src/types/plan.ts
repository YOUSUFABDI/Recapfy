export type PlanDT = {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  maxPlatforms: number;
  maxAccounts: number;
  features: string[];
  aiCoach: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
