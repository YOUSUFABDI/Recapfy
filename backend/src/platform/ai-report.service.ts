import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from 'src/prisma.service';
import { CtraderService } from './ctrader.service';
import { ConfigService } from '@nestjs/config';

const AI_REPORT_REFRESH_DAYS = 7;

@Injectable()
export class AIReportService {
  constructor(
    private prisma: PrismaService,
    private ctraderService: CtraderService,
    private readonly config: ConfigService,
  ) {}

  /** Build a compact stats summary + sample deals for the AI report */
  private buildAiReportSummaryFromDeals(deals: any[]) {
    const trades = deals.map((d) => {
      const gp =
        typeof d.closePositionDetail?.grossProfit === 'number'
          ? d.closePositionDetail.grossProfit
          : 0;
      const sw =
        typeof d.closePositionDetail?.swap === 'number'
          ? d.closePositionDetail.swap
          : 0;
      const cm =
        typeof d.closePositionDetail?.commission === 'number'
          ? d.closePositionDetail.commission
          : 0;
      const pnl = gp + sw + cm;

      const entryTime: Date | null =
        d.entryTime instanceof Date ? d.entryTime : null;
      const executionTimestampMs =
        typeof d.executionTimestampMs === 'number'
          ? d.executionTimestampMs
          : entryTime
            ? entryTime.getTime()
            : null;

      return {
        id: d.dealId ?? d.ticketId ?? null,
        symbol: d.symbol,
        direction: d.direction,
        executionTimestampMs,
        entryTime,
        exitTime: d.exitTime ?? null,
        pnl,
        grossProfit: gp,
        swap: sw,
        commission: cm,
        quantityLots: d.quantityLots ?? d.quantity ?? null,
      };
    });

    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const breakeven = trades.filter((t) => t.pnl === 0);

    const totalPnl = trades.reduce((acc, t) => acc + t.pnl, 0);
    const avgWin =
      wins.length > 0
        ? wins.reduce((acc, t) => acc + t.pnl, 0) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? losses.reduce((acc, t) => acc + t.pnl, 0) / losses.length
        : 0;

    const bestTrade = trades.reduce(
      (best, t) => (best == null || t.pnl > best.pnl ? t : best),
      null as any,
    );
    const worstTrade = trades.reduce(
      (worst, t) => (worst == null || t.pnl < worst.pnl ? t : worst),
      null as any,
    );

    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    return {
      totalTrades,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
      wins: wins.length,
      losses: losses.length,
      breakeven: breakeven.length,
      bestTrade,
      worstTrade,
      recentTrades: trades
        .filter((t) => typeof t.executionTimestampMs === 'number')
        .sort(
          (a, b) =>
            (b.executionTimestampMs ?? 0) - (a.executionTimestampMs ?? 0),
        )
        .slice(0, 40),
    };
  }

  async generateAccountAiReport(
    userId: string,
    identifier: string,
    fromDays?: number,
    connectionId?: string,
  ) {
    // 1) Read key from ConfigService OR raw env as fallback
    const openaiApiKey =
      this.config.get<string>('OPENAI_API_KEY') ?? process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured on the server (.env).',
      );
    }

    // 2) First resolve the account row (cheap: no OpenAI, no heavy pipeline)
    const accRow = await this.ctraderService.findAccountByIdentifier(
      userId,
      identifier,
      connectionId,
    );
    if (!accRow) {
      throw new NotFoundException(
        'Account not found. Use CTID or traderLogin from /ctrader/accounts.',
      );
    }

    const now = new Date();
    const refreshMs = AI_REPORT_REFRESH_DAYS * 24 * 60 * 60 * 1000;
    // .... for test ....
    // const refreshMs = 5 * 60 * 1000;
    // .... for test ....

    // 3) Check if we already have a FRESH report in the DB
    const existing = await this.prisma.platformAiReport.findFirst({
      where: {
        userId,
        platformAccountId: accRow.id,
        identifier,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const ageMs = now.getTime() - existing.createdAt.getTime();
      const isFresh = ageMs < refreshMs;

      if (isFresh) {
        // ✅ Use DB-only data (NO OpenAI call)
        return {
          accountId: existing.platformAccountId,
          identifier: existing.identifier,
          createdAtIso: existing.createdAt.toISOString(),
          autoUpdateFrequencyDays: AI_REPORT_REFRESH_DAYS, // 🔒 force 7 in response
          strengths: (existing.strengths as any) ?? [],
          areasForImprovement: (existing.areasForImprovement as any) ?? [],
          actionableRecommendations:
            (existing.actionableRecommendations as any) ?? [],
        };
      }
    }

    // 4) No report or stale → pull account & trades snapshot from DB
    //    (this is the same pipeline your dashboard/journal uses)
    const { account, deals } = await this.ctraderService.getAccountDataFromDb(
      userId,
      identifier,
      fromDays,
      connectionId,
    );

    const summary = this.buildAiReportSummaryFromDeals(deals);

    const accountPayload = {
      brokerName: account.brokerName,
      isLive: account.isLive,
      traderLogin: account.traderLogin,
      depositCurrency: account.depositCurrency,
      balance: account.balance,
      equity: account.equity,
      instrumentCategory: account.instrumentCategory,
      positionMode: account.positionMode,
    };

    const systemPrompt = `
You are a professional trading performance coach.
The user is a forex/CFD trader. 
Given their account stats and recent trades, produce a concise, practical performance review.

Respond ONLY with JSON in this exact TypeScript shape:

{
  "createdAtIso": string,
  "autoUpdateFrequencyDays": number,
  "strengths": { "title": string, "body": string }[],
  "areasForImprovement": { "title": string, "body": string }[],
  "actionableRecommendations": { "title": string, "body": string }[]
}

- Use short, punchy titles (max ~8 words).
- Use friendly coach tone, but stay professional.
- Be specific and tie comments to the metrics when possible.
- Do NOT include any markdown or bullet characters, plain text only.
`;

    const userContent = {
      account: accountPayload,
      stats: summary,
    };

    try {
      // 5) Call OpenAI ONLY when needed (every 7+ days)
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(userContent) },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 25_000,
        },
      );

      const rawContent = resp.data?.choices?.[0]?.message?.content ?? '{}';

      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (e) {
        console.error('AI report JSON parse error:', rawContent);
        throw new InternalServerErrorException(
          'Failed to parse AI report response from OpenAI.',
        );
      }

      // 🔒 Always override with our own server-side values
      const strengths = Array.isArray(parsed?.strengths)
        ? parsed.strengths
        : [];
      const areasForImprovement = Array.isArray(parsed?.areasForImprovement)
        ? parsed.areasForImprovement
        : [];
      const actionableRecommendations = Array.isArray(
        parsed?.actionableRecommendations,
      )
        ? parsed.actionableRecommendations
        : [];

      // 6) Persist to DB (upsert by unique key)
      const saved = await this.prisma.platformAiReport.upsert({
        where: {
          userId_platformAccountId_identifier: {
            userId,
            platformAccountId: account.id,
            identifier,
          },
        },
        create: {
          userId,
          platformAccountId: account.id,
          identifier,
          autoUpdateFrequencyDays: AI_REPORT_REFRESH_DAYS,
          strengths,
          areasForImprovement,
          actionableRecommendations,
        },
        update: {
          // We treat createdAt as "last generated at" to keep it simple
          createdAt: now,
          autoUpdateFrequencyDays: AI_REPORT_REFRESH_DAYS,
          strengths,
          areasForImprovement,
          actionableRecommendations,
        },
      });

      return {
        accountId: saved.platformAccountId,
        identifier: saved.identifier,
        createdAtIso: saved.createdAt.toISOString(),
        autoUpdateFrequencyDays: AI_REPORT_REFRESH_DAYS, // ✅ always 7 for the client
        strengths: (saved.strengths as any) ?? [],
        areasForImprovement: (saved.areasForImprovement as any) ?? [],
        actionableRecommendations:
          (saved.actionableRecommendations as any) ?? [],
      };
    } catch (error) {
      const err = error as AxiosError;
      console.error('OpenAI AI report error:', err.response?.data || err);

      const openaiMsg =
        (err.response?.data as any)?.error?.message || err.message;

      throw new InternalServerErrorException(
        openaiMsg || 'Failed to generate AI report. Please try again later.',
      );
    }
  }
}
