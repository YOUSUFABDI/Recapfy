export interface DashboardStatsResponse {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  mrr: number; // Monthly Recurring Revenue estimate
  usersGrowth: number; // % growth from last month
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  }>;
  revenueChart: Array<{
    name: string; // e.g. "Jan"
    revenue: number;
  }>;
}
