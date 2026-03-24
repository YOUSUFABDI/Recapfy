import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans: Prisma.PlanCreateInput[] = [
    {
      code: 'BASIC',
      name: 'Basic',
      description:
        'Connect a single trading platform and track 1 account with an automated trading journal and deep performance analytics.',
      priceMonthly: 10,
      priceYearly: 120,
      currency: 'USD',
      maxPlatforms: 1,
      maxAccounts: 1,
      features: [
        'Automated trading journal',
        'Connect 1 trading platform',
        'Automated trading journal for unlimited accounts',
        'Deep performance analytics',
      ],
      aiCoach: false,
      isActive: true,
    },
    {
      code: 'PRO',
      name: 'Pro',
      description:
        'Connect unlimited trading platforms and track unlimited accounts — includes full automated journals, advanced analytics, and AI-generated reports.',
      priceMonthly: 20,
      priceYearly: 240,
      currency: 'USD',
      maxPlatforms: null,
      maxAccounts: null,
      features: [
        'Automated trading journal',
        'Connect unlimited trading platforms',
        'Automated trading journal for unlimited accounts',
        'Deep performance analytics',
        'AI-generated performance reports',
        'Access to all upcoming features',
      ],
      aiCoach: true,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        ...plan,
      },
      create: {
        ...plan,
      },
    });
  }

  console.log('✅ Plans seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
