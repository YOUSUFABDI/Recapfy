import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { DashboardStatsResponse } from './dto/dashboard-stats.dto';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { ChangeRoleDto } from './dto/change-role.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const whereClause = search
      ? {
          OR: [{ email: { contains: search } }, { name: { contains: search } }],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          hasAccess: true,
          status: true,
          googleId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              trades: true,
              subscriptions: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            trades: true,
            platformConnections: true,
          },
        },
        PlatformAccount: {
          select: {
            id: true,
            brokerName: true,
            traderLogin: true,
            balance: true,
            isLive: true,
          },
        },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            plan: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove sensitive data before returning
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async giveItForFree(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasAccess: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Toggle the value (true -> false, or false -> true)
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: { hasAccess: !user.hasAccess },
    });
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const now = new Date();
    const lastMonth = subMonths(now, 1);

    // 1. Basic Counts
    const totalUsers = await this.prisma.user.count();

    // 2. Calculate Growth (Users created this month vs last month)
    const usersLastMonth = await this.prisma.user.count({
      where: {
        createdAt: {
          lte: endOfMonth(lastMonth),
        },
      },
    });
    const usersGrowth =
      usersLastMonth === 0
        ? 100
        : ((totalUsers - usersLastMonth) / usersLastMonth) * 100;

    // 3. Active Subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    // 4. Total Revenue (Lifetime)
    const totalRevenueAgg = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'FINISHED' },
    });
    const totalRevenue = Number(totalRevenueAgg._sum.amount || 0);

    // 5. Calculate MRR (Estimate based on Active Subscriptions * Plan Price)
    // Note: In a real app, check if sub is yearly/monthly. Here we default to monthly price.
    const activeSubsWithPlan = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const mrr = activeSubsWithPlan.reduce((acc, sub) => {
      // Assuming monthly price for MRR calculation
      return acc + (Number(sub.plan.priceMonthly) || 0);
    }, 0);

    // 6. Recent Users
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // 7. Revenue Chart Data (Last 6 Months)
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthRevenue = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'FINISHED',
          createdAt: { gte: start, lte: end },
        },
      });

      revenueChart.push({
        name: format(date, 'MMM'), // "Jan", "Feb"
        revenue: Number(monthRevenue._sum.amount || 0),
      });
    }

    return {
      totalUsers,
      totalRevenue,
      activeSubscriptions,
      mrr,
      usersGrowth,
      recentUsers,
      revenueChart,
    };
  }

  async changeRole(id: string, role: ChangeRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        role: role.role,
      },
    });
  }
}
