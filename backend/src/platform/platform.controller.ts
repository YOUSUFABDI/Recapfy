import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CtraderService } from './ctrader.service';
import { AIReportService } from './ai-report.service';
import { AuthenticatedRequest } from 'src/auth/interface/authReq.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly ctraderService: CtraderService,
    private aIReportService: AIReportService,
  ) {}

  // ===== Connections =====

  /**
   * Start OAuth flow for a NEW connection.
   * Optionally take ?label=FTMO (saved on connection after callback).
   */
  @UseGuards(JwtAuthGuard)
  @Get('connect/ct')
  connect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('label') label?: string,
  ) {
    const ctx = { userId: req.user.id, label: label || null };
    res.cookie('ctr_oauth_ctx', JSON.stringify(ctx), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    });
    return res.redirect(this.ctraderService.getAuthorizationUrl());
  }

  /**
   * OAuth redirect target: creates a new CTraderConnection
   * and triggers initial sync for that connection.
   */
  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ) {
    // Always try to read/clear ctx cookie (even when user denies)
    const ctxStr = (req as any).cookies?.ctr_oauth_ctx as string | undefined;
    if (ctxStr) res.clearCookie('ctr_oauth_ctx');

    // ✅ User denied (or any OAuth error)
    if (error) {
      const reason = error === 'access_denied' ? 'denied' : 'oauth_error';

      const msg = encodeURIComponent(errorDescription ?? error);

      return res.redirect(
        `${process.env.WEBAPP_URL}/dashboard/connect?ctrader=${reason}&msg=${msg}`,
      );
    }

    // ✅ No code and no explicit error → treat as invalid callback
    if (!code) {
      return res.redirect(
        `${process.env.WEBAPP_URL}/dashboard/connect?ctrader=missing_code`,
      );
    }

    // ✅ Missing ctx cookie (expired / blocked / user opened callback URL)
    if (!ctxStr) {
      return res.redirect(
        `${process.env.WEBAPP_URL}/dashboard/connect?ctrader=missing_ctx`,
      );
    }

    let userId = '';
    let label: string | null = null;

    try {
      const parsed = JSON.parse(ctxStr);
      userId = parsed.userId;
      label = parsed.label || null;
    } catch {
      return res.redirect(
        `${process.env.WEBAPP_URL}/dashboard/connect?ctrader=bad_ctx`,
      );
    }

    try {
      await this.ctraderService.handleCallbackCreateConnection(code, userId, {
        label: label || undefined,
      });

      return res.redirect(`${process.env.WEBAPP_URL}/dashboard/accounts`);
    } catch (e) {
      // Optional: log e
      return res.redirect(
        `${process.env.WEBAPP_URL}/dashboard/connect?ctrader=failed`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('connections')
  async listConnections(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.ctraderService.listConnections(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('connections/:connectionId')
  async updateConnection(
    @Req() req: AuthenticatedRequest,
    @Param('connectionId') connectionId: string,
    @Body() body: { label?: string | null },
  ) {
    const userId = req.user.id;
    return this.ctraderService.updateConnection(userId, connectionId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('connections/:connectionId')
  async deleteConnection(
    @Req() req: AuthenticatedRequest,
    @Param('connectionId') connectionId: string,
    @Query('purgeAccounts') purgeAccounts?: string,
    @Query('purgeTrades') purgeTrades?: string,
  ) {
    const userId = req.user.id;
    const result = await this.ctraderService.deleteConnection(
      userId,
      connectionId,
      {
        purgeAccounts: String(purgeAccounts).toLowerCase() === 'true',
        purgeTrades: String(purgeTrades).toLowerCase() === 'true',
      },
    );
    return { ok: true, ...result };
  }

  // ===== Accounts =====

  /**
   * List accounts across ALL connections, or filter by connectionId (?connectionId=uuid).
   * Pass ?refresh=true to re-pull from Spotware for those connections before returning.
   */
  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  async listAccounts(
    @Req() req: AuthenticatedRequest,
    @Query('refresh') refresh?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const userId = req.user.id;
    const doRefresh = String(refresh).toLowerCase() === 'true';
    const accounts = await this.ctraderService.listAccounts(userId, {
      refresh: doRefresh,
      connectionId: connectionId || undefined,
    });
    return { items: accounts };
  }

  /**
   * Get account data by CTID/traderLogin (identifier), optionally scoping to connectionId for speed.
   * Use ?source=api to force live, otherwise db snapshot by default.
   * Use ?fromDays=30 to limit history.
   */
  @UseGuards(JwtAuthGuard)
  @Get('accounts/:identifier')
  async accountData(
    @Req() req: AuthenticatedRequest,
    @Param('identifier') identifier: string,
    @Query('fromDays') fromDays?: string,
    @Query('source') source?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const userId = req.user.id;
    const useDb = source !== 'api';
    const days = fromDays ? Number(fromDays) : undefined;

    const data = useDb
      ? await this.ctraderService.getAccountDataFromDb(
          userId,
          identifier,
          days,
          connectionId || undefined,
        )
      : await this.ctraderService.getAccountData(
          userId,
          identifier,
          days,
          connectionId || undefined,
        );

    return {
      account: data.account,
      counts: { deals: data.deals.length, positions: data.positions.length },
      deals: data.deals,
      positions: data.positions,
    };
  }

  // ===== Maintenance =====

  @UseGuards(JwtAuthGuard)
  @Post('refresh/:connectionId')
  async manualRefresh(
    @Req() req: AuthenticatedRequest,
    @Param('connectionId') connectionId: string,
  ) {
    const userId = req.user.id;
    const token = await this.ctraderService.forceRefreshAccessToken(
      userId,
      connectionId,
    );
    return { ok: !!token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounts/:identifier/ai-report')
  async accountAiReport(
    @Req() req: AuthenticatedRequest,
    @Param('identifier') identifier: string,
    @Query('fromDays') fromDays?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const userId = req.user.id;
    const days = fromDays ? Number(fromDays) : undefined;

    const report = await this.aIReportService.generateAccountAiReport(
      userId,
      identifier,
      days,
      connectionId,
    );

    return report;
  }
}
