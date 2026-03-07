import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/client';
import axios, { AxiosError } from 'axios';
import { Platform } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';
import { CTraderAccountDto } from './dto/ctrader-account.dto';
import { CTraderConnectionDto } from './dto/ctrader-connection.dto';
import {
  ctraderDealStatusName,
  DEBUG,
  formatDurationShort,
  fromDecimal,
  HelperService,
  SymbolInfo,
  toDecimal,
  toLotsDisplay,
  volumeCentsToLots,
  VOLUME_UNITS_PER_LOT,
} from './helper.service';
import { OpenApiJsonClient } from './openapi-json.client';

const PAYLOAD = {
  APPLICATION_AUTH_REQ: 2100,
  APPLICATION_AUTH_RES: 2101,
  ACCOUNT_AUTH_REQ: 2102,
  ACCOUNT_AUTH_RES: 2103,
  SYMBOLS_LIST_REQ: 2114,
  SYMBOLS_LIST_RES: 2115,
  RECONCILE_REQ: 2124,
  RECONCILE_RES: 2125,
  GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ: 2149,
  GET_ACCOUNTS_BY_ACCESS_TOKEN_RES: 2150,
  DEAL_LIST_REQ: 2133,
  DEAL_LIST_RES: 2134,
} as const;

const WS_ENDPOINT = {
  LIVE: 'wss://live.ctraderapi.com:5036',
  DEMO: 'wss://demo.ctraderapi.com:5036',
} as const;

type RestAccount = {
  restTradingAccountId: number | string;
  isLive: boolean;
  traderLogin?: string | null;
  brokerTitleShort?: string | null;
  depositCurrency?: string | null;
  balance?: number | null;
  equity?: number | null;
  moneyDigits?: number | null;
  traderAccountType?: string | null;
};

@Injectable()
export class CtraderService implements OnModuleInit {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private readonly httpTimeoutMs = 12_000;
  private readonly historyChunkDays = 60;
  private readonly maxWindows = 120;
  private readonly consecutiveEmptyBreak = 3;

  private readonly tokenRefreshSkewMs = Number(
    process.env.CTRADER_REFRESH_SKEW_MS ?? 5 * 60 * 1000,
  );

  private refreshInFlight = new Map<string, Promise<string | null>>();
  private accountSyncInFlight = new Map<string, Promise<void>>();
  private tradeSyncInFlight = new Map<string, Promise<void>>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.clientId = this.config.get<string>('CTRADER_CLIENT_ID')!;
    this.clientSecret = this.config.get<string>('CTRADER_CLIENT_SECRET')!;
    this.redirectUri = this.config.get<string>('CTRADER_REDIRECT_URI')!;
  }

  async onModuleInit() {
    setTimeout(
      () => this.sweepAndRefreshExpiringTokens().catch(() => {}),
      5_000,
    );
  }

  getAuthorizationUrl(): string {
    const url = new URL(
      'https://id.ctrader.com/my/settings/openapi/grantingaccess/',
    );
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', 'accounts');
    url.searchParams.set('product', 'web');
    return url.toString();
  }

  async handleCallbackCreateConnection(
    code: string,
    userId: string,
    opts?: { label?: string },
  ): Promise<void> {
    const u = new URL('https://openapi.ctrader.com/apps/token');
    u.searchParams.set('grant_type', 'authorization_code');
    u.searchParams.set('code', code);
    u.searchParams.set('redirect_uri', this.redirectUri);
    u.searchParams.set('client_id', this.clientId);
    u.searchParams.set('client_secret', this.clientSecret);

    const resp = await axios.get(u.toString(), {
      headers: { Accept: 'application/json' },
      timeout: this.httpTimeoutMs,
      validateStatus: () => true,
    });

    if (resp.status !== 200 || resp.data?.error) {
      throw new InternalServerErrorException('token exchange failed');
    }

    const { accessToken, refreshToken, expiresIn } = resp.data ?? {};
    if (!accessToken || !refreshToken) {
      throw new InternalServerErrorException('missing tokens');
    }

    const profile = await this.tryFetchSpotwareProfile(accessToken);
    const expiresAt = new Date(Date.now() + Number(expiresIn ?? 0) * 1000);

    if (profile?.id) {
      const existing = await this.prisma.platformConnection.findFirst({
        where: {
          userId,
          spotwareUserId: profile.id,
          platform: Platform.CTRADER,
        },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.platformConnection.update({
          where: { id: existing.id },
          data: {
            platform: Platform.CTRADER,
            accessToken,
            refreshToken,
            expiresAt,
            label: opts?.label ?? undefined,
            spotwareUserId: profile.id,
            spotwareUsername: profile.username ?? undefined,
          },
        });
        await this.syncUserAccountsAndTradesForConnection(userId, existing.id);
        return;
      }

      const connection = await this.prisma.platformConnection.create({
        data: {
          userId,
          platform: Platform.CTRADER,
          label: opts?.label ?? null,
          accessToken,
          refreshToken,
          expiresAt,
          spotwareUserId: profile.id,
          spotwareUsername: profile.username ?? null,
        },
      });

      this.syncUserAccountsAndTradesForConnection(userId, connection.id).catch(
        () => {},
      );
      return;
    }

    const restAccounts = await this.fetchAccountsViaConnectRest(accessToken);
    const ctidSet = new Set(
      restAccounts
        .map((a) => {
          try {
            return BigInt(a.restTradingAccountId as any);
          } catch {
            return null;
          }
        })
        .filter((x): x is bigint => x !== null),
    );

    if (ctidSet.size > 0) {
      const anyExistingAccount = await this.prisma.platformAccount.findFirst({
        where: { userId, platformAccountId: { in: Array.from(ctidSet) } },
        select: { connectionId: true },
      });

      if (anyExistingAccount?.connectionId) {
        await this.prisma.platformConnection.update({
          where: {
            id: anyExistingAccount.connectionId,
            platform: Platform.CTRADER,
          },
          data: {
            platform: Platform.CTRADER,
            accessToken,
            refreshToken,
            expiresAt,
            label: opts?.label ?? undefined,
          },
        });
        await this.syncUserAccountsAndTradesForConnection(
          userId,
          anyExistingAccount.connectionId,
        );
        return;
      }
    }

    const connection = await this.prisma.platformConnection.create({
      data: {
        userId,
        platform: Platform.CTRADER,
        label: opts?.label ?? null,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });
    this.syncUserAccountsAndTradesForConnection(userId, connection.id).catch(
      () => {},
    );
  }

  async tryFetchSpotwareProfile(
    accessToken: string,
  ): Promise<{ id: string; username: string | null } | null> {
    const urls = [
      `https://api.spotware.com/connect/users/current?access_token=${encodeURIComponent(accessToken)}`,
      `https://api.spotware.com/connect/v1/users/current?access_token=${encodeURIComponent(accessToken)}`,
      `https://api.spotware.com/connect/users/current?oauth_token=${encodeURIComponent(accessToken)}`,
      `https://api.spotware.com/connect/v1/users/current?oauth_token=${encodeURIComponent(accessToken)}`,
    ];
    for (const url of urls) {
      try {
        const resp = await axios.get(url, {
          headers: { Accept: 'application/json' },
          timeout: this.httpTimeoutMs,
          validateStatus: () => true,
        });
        if (resp.status !== 200) continue;

        const data = resp.data?.data ?? resp.data ?? {};
        const id = data.id ?? data.userId ?? data.user_id ?? null;
        const username = data.username ?? data.login ?? data.name ?? null;
        if (id)
          return {
            id: String(id),
            username: username ? String(username) : null,
          };
      } catch {
        continue;
      }
    }
    return null;
  }

  async listConnections(userId: string) {
    const rows = await this.prisma.platformConnection.findMany({
      where: { userId, platform: Platform.CTRADER },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        spotwareUserId: true,
        spotwareUsername: true,
        createdAt: true,
        updatedAt: true,
        accounts: { select: { id: true } },
      },
    });
    return rows.map((r) => ({
      ...CTraderConnectionDto.fromPrisma(r),
      accountsCount: r.accounts.length,
    }));
  }

  async updateConnection(
    userId: string,
    connectionId: string,
    body: { label?: string | null },
  ) {
    const owner = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId, platform: Platform.CTRADER },
      select: { userId: true },
    });
    if (!owner || owner.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.platformConnection.update({
      where: { id: connectionId, platform: Platform.CTRADER },
      data: { label: body.label ?? null },
      select: {
        id: true,
        label: true,
        spotwareUserId: true,
        spotwareUsername: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return CTraderConnectionDto.fromPrisma(updated);
  }

  async deleteConnection(
    userId: string,
    connectionId: string,
    opts?: { purgeAccounts?: boolean; purgeTrades?: boolean },
  ) {
    const owner = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId, platform: Platform.CTRADER },
      select: { userId: true },
    });
    if (!owner || owner.userId !== userId) throw new ForbiddenException();

    const { purgeAccounts = false, purgeTrades = false } = opts ?? {};

    let purgedTrades = 0;
    if (purgeTrades) {
      const accounts = await this.prisma.platformAccount.findMany({
        where: { userId, connectionId },
        select: { id: true },
      });
      const accountIds = accounts.map((a) => a.id);
      if (accountIds.length) {
        const res = await this.prisma.trade.deleteMany({
          where: { userId, platformAccountId: { in: accountIds } },
        });
        purgedTrades = res.count;
      }
    }

    let purgedAccounts = 0;
    if (purgeAccounts) {
      const res = await this.prisma.platformAccount.deleteMany({
        where: { userId, connectionId },
      });
      purgedAccounts = res.count;
    } else {
      await this.prisma.platformAccount.updateMany({
        where: { userId, connectionId },
        data: { brokerName: '[DISCONNECTED]' },
      });
    }

    await this.prisma.platformConnection.delete({
      where: { id: connectionId, platform: Platform.CTRADER },
    });

    return {
      message: 'Disconnected cTrader connection',
      purged: { accounts: purgedAccounts, trades: purgedTrades },
    };
  }

  async forceRefreshAccessToken(
    userId: string,
    connectionId: string,
  ): Promise<string | null> {
    return this.refreshAccessToken(userId, connectionId, true);
  }

  private async ensureFreshAccessToken(
    userId: string,
    connectionId: string,
  ): Promise<string | null> {
    const conn = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId, platform: Platform.CTRADER },
      select: {
        userId: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });
    if (!conn || conn.userId !== userId) return null;

    const now = Date.now();
    const expMs = conn.expiresAt?.getTime() ?? 0;
    const needsRefresh = !expMs || now + this.tokenRefreshSkewMs >= expMs;
    if (!needsRefresh) return conn.accessToken;

    return this.refreshAccessToken(userId, connectionId);
  }

  private async refreshAccessToken(
    userId: string,
    connectionId: string,
    force = false,
  ): Promise<string | null> {
    const existing = this.refreshInFlight.get(connectionId);
    if (existing && !force) return existing;

    const job = (async (): Promise<string | null> => {
      try {
        const conn = await this.prisma.platformConnection.findUnique({
          where: { id: connectionId, platform: Platform.CTRADER },
        });
        if (!conn || conn.userId !== userId) return null;

        const rtk = conn.refreshToken;
        if (!rtk) return null;

        const u = new URL('https://openapi.ctrader.com/apps/token');
        u.searchParams.set('grant_type', 'refresh_token');
        u.searchParams.set('refresh_token', rtk);
        u.searchParams.set('client_id', this.clientId);
        u.searchParams.set('client_secret', this.clientSecret);

        const resp = await axios.get(u.toString(), {
          headers: { Accept: 'application/json' },
          timeout: this.httpTimeoutMs,
          validateStatus: () => true,
        });

        if (resp.status !== 200 || resp.data?.error) {
          await this.prisma.platformConnection.delete({
            where: { id: connectionId, platform: Platform.CTRADER },
          });
          return null;
        }

        const { accessToken, refreshToken, expiresIn } = resp.data ?? {};
        if (!accessToken) {
          await this.prisma.platformConnection.delete({
            where: { id: connectionId, platform: Platform.CTRADER },
          });
          return null;
        }

        await this.prisma.platformConnection.update({
          where: { id: connectionId, platform: Platform.CTRADER },
          data: {
            accessToken,
            refreshToken: refreshToken ?? rtk,
            expiresAt: new Date(Date.now() + Number(expiresIn ?? 0) * 1000),
          },
        });

        return accessToken;
      } finally {
        this.refreshInFlight.delete(connectionId);
      }
    })();

    this.refreshInFlight.set(connectionId, job);
    return job;
  }

  private isAuthError(err: any): boolean {
    const ax = err as AxiosError;
    if (ax?.response?.status === 401 || ax?.response?.status === 403)
      return true;
    const msg = String(err?.message || err || '');
    if (/auth/i.test(msg) && /(invalid|expired|unauthorized|token)/i.test(msg))
      return true;
    if (/(401|403)/.test(msg)) return true;
    return false;
  }

  private async withRefreshRetry<T>(
    userId: string,
    connectionId: string,
    fn: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    let token = await this.ensureFreshAccessToken(userId, connectionId);
    if (!token)
      throw new InternalServerErrorException(
        'Not connected to cTrader (connection).',
      );

    try {
      return await fn(token);
    } catch (err) {
      if (this.isAuthError(err)) {
        const refreshed = await this.refreshAccessToken(userId, connectionId);
        if (!refreshed) {
          throw new InternalServerErrorException(
            'cTrader session expired. Please reconnect.',
          );
        }
        return await fn(refreshed);
      }
      throw err;
    }
  }

  async listAccounts(
    userId: string,
    opts?: { refresh?: boolean; connectionId?: string },
  ) {
    const { refresh = false, connectionId } = opts ?? {};

    const whereConn = {
      userId,
      ...(connectionId ? { id: connectionId, platform: Platform.CTRADER } : {}),
    };
    const connections = await this.prisma.platformConnection.findMany({
      where: whereConn,
      select: { id: true },
    });
    if (!connections.length)
      throw new InternalServerErrorException('No cTrader connections.');

    if (refresh) {
      await Promise.all(
        connections.map(async (c) => {
          await this.withRefreshRetry(userId, c.id, async (tk) => {
            const restAccounts = await this.fetchAccountsViaConnectRest(tk);
            for (const a of restAccounts) {
              const rest = BigInt(a.restTradingAccountId);
              await this.prisma.platformAccount.upsert({
                where: {
                  connectionId_platformAccountId: {
                    connectionId: c.id,
                    platformAccountId: rest,
                  },
                },
                create: {
                  userId,
                  connectionId: c.id,
                  platformAccountId: rest,
                  restTradingAccountId: rest,
                  isLive: !!a.isLive,
                  brokerName: a.brokerTitleShort ?? null,
                  traderLogin: a.traderLogin ?? null,
                  depositCurrency: a.depositCurrency ?? null,
                  balance: typeof a.balance === 'number' ? a.balance : null,
                  equity: typeof a.equity === 'number' ? a.equity : null,
                  instrumentCategory: 'Multi',
                  positionMode: a.traderAccountType ?? null,
                  lastSyncAt: new Date(),
                },
                update: {
                  restTradingAccountId: rest,
                  isLive: !!a.isLive,
                  brokerName: a.brokerTitleShort ?? null,
                  traderLogin: a.traderLogin ?? null,
                  depositCurrency: a.depositCurrency ?? null,
                  balance: typeof a.balance === 'number' ? a.balance : null,
                  equity: typeof a.equity === 'number' ? a.equity : null,
                  positionMode: a.traderAccountType ?? null,
                  lastSyncAt: new Date(),
                },
              });
            }
            return null;
          });
        }),
      );
    }

    const rows = await this.prisma.platformAccount.findMany({
      where: { userId, ...(connectionId ? { connectionId } : {}) },
      orderBy: [{ isLive: 'desc' }, { connectedAt: 'desc' }],
      select: {
        id: true,
        connectionId: true,
        platformAccountId: true,
        restTradingAccountId: true,
        isLive: true,
        brokerName: true,
        traderLogin: true,
        connectedAt: true,
        lastSyncAt: true,
        depositCurrency: true,
        balance: true,
        equity: true,
        instrumentCategory: true,
        positionMode: true,
      },
    });

    const base = rows.map(CTraderAccountDto.fromPrisma);

    const enriched = await Promise.all(
      base.map(async (dto) => {
        try {
          const acc = rows.find((r) => r.id === dto.id)!;
          const snap = await this.withRefreshRetry(
            userId,
            acc.connectionId,
            async (tk) => {
              return this.wsFetchAccountSnapshot(
                tk,
                acc.isLive,
                Number(acc.platformAccountId.toString()),
                typeof dto.balance === 'number' ? dto.balance : null,
              );
            },
          );

          if (typeof snap.balance === 'number') dto.balance = snap.balance;
          if (typeof snap.equity === 'number') {
            dto.equity = snap.equity;
          } else if (
            typeof dto.balance === 'number' &&
            typeof snap.floatingPnl === 'number'
          ) {
            dto.equity = dto.balance + snap.floatingPnl;
          } else if (typeof dto.balance === 'number') {
            dto.equity = dto.balance;
          }
          if (snap.depositCurrency) dto.depositCurrency = snap.depositCurrency;
          if (snap.instrumentCategory)
            dto.instrumentCategory = snap.instrumentCategory;
          if (snap.positionMode) dto.positionMode = snap.positionMode;
        } catch (e) {
          if (DEBUG) console.log('[WS enrich error]', String(e));
          if (dto.equity == null && typeof dto.balance === 'number') {
            dto.equity = dto.balance;
          }
        }

        await this.prisma.platformAccount.update({
          where: { id: dto.id },
          data: {
            depositCurrency: dto.depositCurrency ?? null,
            balance: typeof dto.balance === 'number' ? dto.balance : null,
            equity: typeof dto.equity === 'number' ? dto.equity : null,
            instrumentCategory: dto.instrumentCategory ?? 'Multi',
            positionMode: dto.positionMode ?? null,
            lastSyncAt: new Date(),
          },
        });

        return dto;
      }),
    );

    return enriched;
  }

  async findAccountByIdentifier(
    userId: string,
    identifier: string,
    connectionId?: string,
  ) {
    try {
      const asBig = BigInt(identifier);
      const byCtid = await this.prisma.platformAccount.findFirst({
        where: {
          userId,
          platformAccountId: asBig,
          ...(connectionId ? { connectionId } : {}),
        },
        select: {
          id: true,
          connectionId: true,
          platformAccountId: true,
          isLive: true,
          restTradingAccountId: true,
          traderLogin: true,
        },
      });
      if (byCtid) return byCtid;
    } catch {}

    return this.prisma.platformAccount.findFirst({
      where: {
        userId,
        traderLogin: identifier,
        ...(connectionId ? { connectionId } : {}),
      },
      select: {
        id: true,
        connectionId: true,
        platformAccountId: true,
        isLive: true,
        restTradingAccountId: true,
        traderLogin: true,
      },
    });
  }

  async getAccountData(
    userId: string,
    identifier: string,
    fromDays?: number,
    connectionId?: string,
  ): Promise<{ account: CTraderAccountDto; deals: any[]; positions: any[] }> {
    const accRow = await this.findAccountByIdentifier(
      userId,
      identifier,
      connectionId,
    );
    if (!accRow) {
      throw new NotFoundException(
        'Account not found. Use CTID or traderLogin from /ctrader/accounts.',
      );
    }

    const account = await this.prisma.platformAccount.findUnique({
      where: { id: accRow.id },
      select: {
        id: true,
        connectionId: true,
        platformAccountId: true,
        restTradingAccountId: true,
        isLive: true,
        brokerName: true,
        traderLogin: true,
        connectedAt: true,
        lastSyncAt: true,
        depositCurrency: true,
        balance: true,
        equity: true,
        instrumentCategory: true,
        positionMode: true,
      },
    });
    if (!account)
      throw new NotFoundException('Account not found after refresh.');
    const accountDto = CTraderAccountDto.fromPrisma(account);

    const wsUrl = account.isLive ? WS_ENDPOINT.LIVE : WS_ENDPOINT.DEMO;

    const result = await this.withRefreshRetry(
      userId,
      account.connectionId,
      async (tk) => {
        const client = new OpenApiJsonClient(wsUrl);
        await client.connect();

        let positions: any[] = [];
        let deals: any[] = [];
        let reconcilePayload: any = null;

        try {
          await client.send(
            {
              clientMsgId: OpenApiJsonClient.nextId(),
              payloadType: PAYLOAD.APPLICATION_AUTH_REQ,
              payload: {
                clientId: this.clientId,
                clientSecret: this.clientSecret,
              },
            },
            [PAYLOAD.APPLICATION_AUTH_RES],
            15_000,
          );

          await client.send(
            {
              clientMsgId: OpenApiJsonClient.nextId(),
              payloadType: PAYLOAD.ACCOUNT_AUTH_REQ,
              payload: {
                ctidTraderAccountId: Number(
                  account.platformAccountId.toString(),
                ),
                accessToken: tk,
              },
            },
            [PAYLOAD.ACCOUNT_AUTH_RES],
            15_000,
          );

          const positionsRes: any = await client.send(
            {
              clientMsgId: OpenApiJsonClient.nextId(),
              payloadType: PAYLOAD.RECONCILE_REQ,
              payload: {
                ctidTraderAccountId: Number(
                  account.platformAccountId.toString(),
                ),
              },
            },
            [PAYLOAD.RECONCILE_RES],
            20_000,
          );
          reconcilePayload = positionsRes?.payload ?? {};
          positions =
            reconcilePayload?.positionList ?? reconcilePayload?.position ?? [];

          const nowMs = Date.now();
          if (Number.isFinite(fromDays as any)) {
            const days = Math.max(1, Number(fromDays));
            const fromMs = nowMs - days * 24 * 3600 * 1000;
            deals = await this.wsFetchDealsChunked(
              client,
              Number(account.platformAccountId.toString()),
              fromMs,
              nowMs,
            );
          } else {
            let toMs = nowMs;
            let tried = 0,
              emptyInRow = 0;
            const wnd = this.historyChunkDays * 24 * 3600 * 1000;
            while (tried < this.maxWindows) {
              const fromMs = toMs - wnd;
              const res: any = await client.send(
                {
                  clientMsgId: OpenApiJsonClient.nextId(),
                  payloadType: PAYLOAD.DEAL_LIST_REQ,
                  payload: {
                    ctidTraderAccountId: Number(
                      account.platformAccountId.toString(),
                    ),
                    fromTimestamp: fromMs,
                    toTimestamp: toMs,
                  },
                },
                [PAYLOAD.DEAL_LIST_RES],
                25_000,
              );
              const chunk: any[] = Array.isArray(res?.payload?.deal)
                ? res.payload.deal
                : (res?.payload?.deals ?? []);
              if (chunk.length) {
                emptyInRow = 0;
                deals.unshift(...chunk);
              } else {
                emptyInRow += 1;
                if (emptyInRow >= this.consecutiveEmptyBreak) break;
              }
              tried += 1;
              toMs = fromMs;
            }
          }

          const symbolsById = await this.fetchSymbolsInfoMap(
            client,
            Number(account.platformAccountId.toString()),
          );

          const nameOf = (id?: number | null) =>
            id != null ? (symbolsById[id]?.name ?? null) : null;

          if (Object.keys(symbolsById).length) {
            deals = deals.map((d) => ({
              ...d,
              symbol:
                typeof d?.symbolId === 'number' ? nameOf(d.symbolId) : null,
            }));
            positions = positions.map((p) => ({
              ...p,
              tradeData: {
                ...p.tradeData,
                symbol:
                  typeof p?.tradeData?.symbolId === 'number'
                    ? nameOf(p.tradeData.symbolId)
                    : null,
              },
            }));
          }

          const closedDeals = deals.filter((d) => d?.closePositionDetail);

          const protectionByPosFromReconcile =
            HelperService.buildProtectionMapFromReconcilePayload(
              reconcilePayload,
            );

          const protectionByPosFromDeals =
            HelperService.buildProtectionMapFromAllDeals(deals);

          await this.persistOpenPositionsToTrades(
            userId,
            account.id,
            String(account.platformAccountId),
            positions,
            symbolsById,
            protectionByPosFromReconcile,
          );

          await this.persistClosedDealsToTrades(
            userId,
            account.id,
            String(account.platformAccountId),
            deals,
            closedDeals,
            symbolsById,
            protectionByPosFromReconcile,
            protectionByPosFromDeals,
          );

          await this.reconcileStaleOpenShadows(
            userId,
            account.id,
            String(account.platformAccountId),
            positions,
            closedDeals,
          );

          return { account: accountDto, deals: closedDeals, positions };
        } finally {
          client.close();
        }
      },
    );

    return result;
  }

  async getAccountDataFromDb(
    userId: string,
    identifier: string,
    fromDays?: number,
    connectionId?: string,
  ): Promise<{ account: CTraderAccountDto; deals: any[]; positions: any[] }> {
    const accRow = await this.findAccountByIdentifier(
      userId,
      identifier,
      connectionId,
    );
    if (!accRow) {
      throw new NotFoundException(
        'Account not found. Use CTID or traderLogin from /ctrader/accounts.',
      );
    }

    const account = await this.prisma.platformAccount.findUnique({
      where: { id: accRow.id },
      select: {
        id: true,
        connectionId: true,
        platformAccountId: true,
        restTradingAccountId: true,
        isLive: true,
        brokerName: true,
        traderLogin: true,
        connectedAt: true,
        lastSyncAt: true,
        depositCurrency: true,
        balance: true,
        equity: true,
        instrumentCategory: true,
        positionMode: true,
      },
    });
    if (!account) throw new NotFoundException('Account not found.');

    const accountDto = CTraderAccountDto.fromPrisma(account);

    const dateFilter: any = {};
    if (Number.isFinite(fromDays) && fromDays! > 0) {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - fromDays!);
      const fromTimestamp = BigInt(fromDate.getTime());
      dateFilter.OR = [
        { executionTimestampMs: { gte: fromTimestamp } },
        { exitTime: { gte: fromDate } },
        { entryTime: { gte: fromDate } },
      ];
    }

    const closedTrades = await this.prisma.trade.findMany({
      where: {
        userId,
        platform: 'cTrader',
        status: 'Filled',
        platformAccountId: account.id,
        exitTime: { not: null },
        ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
      },
      orderBy: { executionTimestampMs: 'desc' },
    });

    const deals = closedTrades.map((t) => {
      const entry = t.entryTime ?? null;
      const exit = t.exitTime ?? null;
      const durationMs =
        t.durationMs != null
          ? Number(t.durationMs)
          : entry && exit
            ? Math.max(exit.getTime() - entry.getTime(), 0)
            : null;

      const rawUnits = t.quantity ?? null;
      const lots = t.quantityLots ?? toLotsDisplay(rawUnits, 3) ?? null;

      const durationLabel = t.durationLabel ?? formatDurationShort(durationMs);

      const deal: any = {
        dealId: Number(t.ticketId.split(':').pop() || t.ticketId),
        orderId: t.orderId ? Number(t.orderId) : null,
        positionId: t.positionId ? Number(t.positionId) : null,
        volume: rawUnits,
        filledVolume: rawUnits,
        symbolId: t.symbolId ?? null,
        createTimestamp: t.createTimestampMs
          ? Number(t.createTimestampMs)
          : null,
        executionTimestamp: t.executionTimestampMs
          ? Number(t.executionTimestampMs)
          : (t.exitTime?.getTime() ?? null),
        utcLastUpdateTimestamp: t.utcLastUpdateTimestampMs
          ? Number(t.utcLastUpdateTimestampMs)
          : null,
        executionPrice: t.executionPrice ?? t.exitPrice ?? null,
        tradeSide: t.tradeSide ?? (t.direction === 'BUY' ? 1 : 2),
        dealStatus: t.dealStatus ?? 2,
        marginRate: t.marginRate ?? null,
        commission: t.commission ?? null,
        baseToUsdConversionRate: t.baseToUsdRate ?? null,
        moneyDigits: t.moneyDigits ?? null,
        comment: t.comment ?? '',
        symbol: t.symbol,
        entryTime: t.entryTime,
        exitTime: t.exitTime,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        quantity: lots,
        quantityLots: lots,
        duration: durationLabel,
        durationMs,
        stopLoss: fromDecimal(t.stopLoss),
        takeProfit: fromDecimal(t.takeProfit),
      };
      if (
        t.cpd_grossProfit != null ||
        t.cpd_swap != null ||
        t.cpd_commission != null
      ) {
        deal.closePositionDetail = {
          entryPrice: t.cpd_entryPrice ?? t.entryPrice ?? null,
          grossProfit: t.cpd_grossProfit ?? null,
          swap: t.cpd_swap ?? null,
          commission: t.cpd_commission ?? null,
          balance: t.cpd_balance ?? null,
          quoteToDepositConversionRate: t.cpd_quoteToDepositRate ?? null,
          closedVolume: t.cpd_closedVolume ?? t.quantity ?? null,
          balanceVersion: t.cpd_balanceVersion ?? null,
          moneyDigits: t.moneyDigits ?? null,
          pnlConversionFee: t.cpd_pnlConversionFee ?? null,
        };
      }
      return deal;
    });

    const openTrades = await this.prisma.trade.findMany({
      where: {
        userId,
        platform: 'cTrader',
        status: 'OPEN',
        platformAccountId: account.id,
      },
      orderBy: { entryTime: 'desc' },
    });

    const positions = openTrades.map((t) => {
      const rawUnits = t.td_volume ?? t.quantity ?? null;
      const lots = t.quantityLots ?? toLotsDisplay(rawUnits, 3) ?? null;
      return {
        positionId: t.positionId ? Number(t.positionId) : null,
        tradeData: {
          symbolId: t.td_symbolId ?? t.symbolId ?? null,
          volume: rawUnits,
          volumeLots: lots,
          tradeSide:
            t.td_tradeSide ?? t.tradeSide ?? (t.direction === 'BUY' ? 1 : 2),
          openTimestamp: t.td_openTimestampMs
            ? Number(t.td_openTimestampMs)
            : (t.entryTime?.getTime() ?? null),
          guaranteedStopLoss: t.guaranteedStopLoss ?? false,
          comment: t.td_comment ?? t.comment ?? '',
          measurementUnits: t.td_measurementUnits ?? null,
          symbol: t.symbol,
        },
        positionStatus: t.positionStatus ?? 1,
        swap: t.positionSwap ?? null,
        price: t.positionPrice ?? t.entryPrice ?? null,
        stopLoss: fromDecimal(t.stopLoss),
        takeProfit: fromDecimal(t.takeProfit),
        utcLastUpdateTimestamp: t.positionUtcLastUpdateMs
          ? Number(t.positionUtcLastUpdateMs)
          : null,
        commission: t.positionCommission ?? null,
        marginRate: t.positionMarginRate ?? t.marginRate ?? null,
        mirroringCommission: t.mirroringCommission ?? null,
        guaranteedStopLoss: t.guaranteedStopLoss ?? false,
        usedMargin: t.usedMargin ?? null,
        stopLossTriggerMethod: t.stopLossTriggerMethod ?? null,
        moneyDigits: t.positionMoneyDigits ?? t.moneyDigits ?? null,
        trailingStopLoss: t.trailingStopLoss ?? false,
        entryTime: t.entryTime,
        exitTime: t.exitTime,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        quantity: lots,
        quantityLots: lots,
      };
    });

    return { account: accountDto, deals, positions };
  }

  private async persistOpenPositionsToTrades(
    userId: string,
    platformAccountId: string,
    ctidTraderAccountId: string,
    positions: any[],
    symbolsById: Record<number, SymbolInfo>,
    protectionByPos?: Record<string, { sl: number | null; tp: number | null }>,
  ) {
    if (!Array.isArray(positions) || !positions.length) return;

    const toDirection = (side: number) => HelperService.toDirection(side);

    for (const p of positions) {
      const posId = p?.positionId ? String(p.positionId) : undefined;
      if (!posId) continue;

      const td = p?.tradeData ?? {};
      const symbolId: number | null =
        typeof td?.symbolId === 'number' ? td.symbolId : null;
      const info = symbolId != null ? symbolsById?.[symbolId] : undefined;
      const symbolName =
        info?.name ?? (symbolId != null ? String(symbolId) : 'UNKNOWN');
      const priceDigits = info?.digits ?? null;

      const openTimestampMs =
        HelperService.toBigIntMs(td?.openTimestamp) ??
        HelperService.toBigIntMs(td?.openTimestampMs);

      const volumeCents = HelperService.toNum(td?.volume);
      const lotSizeCents = info?.lotSize ?? null;
      const quantityLots =
        volumeCents != null
          ? volumeCentsToLots(volumeCents, lotSizeCents, symbolName)
          : null;
      const quantityUnits = volumeCents != null ? volumeCents / 100 : null;

      const entryPriceRaw = HelperService.toNum(p?.price);
      const entryPrice = HelperService.scalePriceMaybe(
        entryPriceRaw,
        priceDigits,
        'position.price',
      );

      let { sl, tp } = HelperService.extractSLTPFromPositionNode(p);
      if ((sl == null || tp == null) && protectionByPos && posId) {
        const prot = protectionByPos[posId];
        if (prot) {
          if (sl == null) sl = prot.sl;
          if (tp == null) tp = prot.tp;
        }
      }
      const stopLossNum = HelperService.scalePriceMaybe(
        HelperService.toNum(sl),
        priceDigits,
        'SL',
      );
      const takeProfitNum = HelperService.scalePriceMaybe(
        HelperService.toNum(tp),
        priceDigits,
        'TP',
      );

      const md = HelperService.nearestMoneyDigits(p);

      const usedMargin = HelperService.scaleByMd(
        HelperService.toNum(p?.usedMargin),
        md,
      );
      const positionCommission = HelperService.scaleByMd(
        HelperService.toNum(p?.commission),
        md,
      );
      const positionSwap = HelperService.scaleByMd(
        HelperService.toNum(p?.swap),
        md,
      );
      const marginRate = HelperService.toNum(p?.marginRate);

      const ticketId = `pos:${posId}`;

      await this.prisma.trade.upsert({
        where: { userId_ticketId: { userId, ticketId } },
        create: {
          userId,
          platformAccountId,
          platform: 'cTrader',
          status: 'OPEN',
          symbol: symbolName,
          symbolId: symbolId ?? null,
          direction: toDirection(Number(td?.tradeSide)),
          quantity: quantityUnits ?? null,
          quantityLots: quantityLots ?? null,
          entryTime: openTimestampMs ? new Date(Number(openTimestampMs)) : null,
          exitTime: null,
          entryPrice: entryPrice ?? null,
          exitPrice: null,
          result: null,
          durationMs: null,
          durationLabel: null,
          ticketId,
          positionId: posId,
          orderId: null,
          positionStatus:
            typeof p?.positionStatus === 'number' ? p.positionStatus : null,
          positionSwap,
          positionPrice: entryPrice ?? null,
          stopLoss: toDecimal(stopLossNum),
          takeProfit: toDecimal(takeProfitNum),
          positionUtcLastUpdateMs:
            HelperService.toBigIntMs(p?.utcLastUpdateTimestamp) ?? null,
          positionCommission,
          positionMarginRate: marginRate ?? null,
          mirroringCommission: HelperService.scaleByMd(
            HelperService.toNum(p?.mirroringCommission),
            md,
          ),
          guaranteedStopLoss:
            typeof p?.guaranteedStopLoss === 'boolean'
              ? p.guaranteedStopLoss
              : null,
          usedMargin: usedMargin ?? null,
          stopLossTriggerMethod:
            typeof p?.stopLossTriggerMethod === 'number'
              ? p.stopLossTriggerMethod
              : null,
          positionMoneyDigits:
            typeof p?.moneyDigits === 'number' ? p.moneyDigits : (md ?? null),
          trailingStopLoss:
            typeof p?.trailingStopLoss === 'boolean'
              ? p.trailingStopLoss
              : null,
          td_symbolId: symbolId ?? null,
          td_volume: quantityUnits ?? null,
          td_tradeSide: typeof td?.tradeSide === 'number' ? td.tradeSide : null,
          td_openTimestampMs: openTimestampMs ?? null,
          td_comment: typeof td?.comment === 'string' ? td.comment : null,
          td_measurementUnits:
            typeof td?.measurementUnits === 'string'
              ? td.measurementUnits
              : null,
          rawPosition: p,
          rawDeal: null,
          notes: `OPEN ctid:${ctidTraderAccountId} pos:${posId}`,
          tags: [],
        },
        update: {
          platformAccountId,
          status: 'OPEN',
          symbol: symbolName,
          symbolId: symbolId ?? null,
          direction: toDirection(Number(td?.tradeSide)),
          quantity: quantityUnits ?? null,
          quantityLots: quantityLots ?? null,
          entryTime: openTimestampMs ? new Date(Number(openTimestampMs)) : null,
          entryPrice: entryPrice ?? null,
          positionStatus:
            typeof p?.positionStatus === 'number' ? p.positionStatus : null,
          positionSwap,
          positionPrice: entryPrice ?? null,
          stopLoss: toDecimal(stopLossNum),
          takeProfit: toDecimal(takeProfitNum),
          positionUtcLastUpdateMs:
            HelperService.toBigIntMs(p?.utcLastUpdateTimestamp) ?? null,
          positionCommission,
          positionMarginRate: marginRate ?? null,
          mirroringCommission: HelperService.scaleByMd(
            HelperService.toNum(p?.mirroringCommission),
            md,
          ),
          guaranteedStopLoss:
            typeof p?.guaranteedStopLoss === 'boolean'
              ? p.guaranteedStopLoss
              : null,
          usedMargin: usedMargin ?? null,
          stopLossTriggerMethod:
            typeof p?.stopLossTriggerMethod === 'number'
              ? p.stopLossTriggerMethod
              : null,
          positionMoneyDigits:
            typeof p?.moneyDigits === 'number' ? p.moneyDigits : (md ?? null),
          trailingStopLoss:
            typeof p?.trailingStopLoss === 'boolean'
              ? p.trailingStopLoss
              : null,
          td_symbolId: symbolId ?? null,
          td_volume: quantityUnits ?? null,
          td_tradeSide: typeof td?.tradeSide === 'number' ? td.tradeSide : null,
          td_openTimestampMs: openTimestampMs ?? null,
          td_comment: typeof td?.comment === 'string' ? td.comment : null,
          td_measurementUnits:
            typeof td?.measurementUnits === 'string'
              ? td.measurementUnits
              : null,
          rawPosition: p,
          notes: `OPEN ctid:${ctidTraderAccountId} pos:${posId}`,
        },
      });
    }
  }

  private async persistClosedDealsToTrades(
    userId: string,
    platformAccountId: string,
    ctidTraderAccountId: string,
    allDeals: any[],
    closedDeals: any[],
    symbolsById: Record<number, SymbolInfo>,
    protectionByPosFromReconcile?: Record<
      string,
      { sl: number | null; tp: number | null }
    >,
    protectionByPosFromDeals?: Record<
      string,
      { sl: number | null; tp: number | null }
    >,
  ) {
    if (!Array.isArray(closedDeals) || closedDeals.length === 0) return;

    const firstOpenByPos: Record<string, bigint> = {};
    const openingTradeSideByPos: Record<string, number> = {};
    for (const d of allDeals ?? []) {
      const posId = d?.positionId != null ? String(d.positionId) : null;
      if (!posId) continue;
      const candidateTs =
        HelperService.toBigIntMs(d?.tradeData?.openTimestamp) ??
        HelperService.toBigIntMs(d?.createTimestamp) ??
        HelperService.toBigIntMs(d?.executionTimestamp);
      if (candidateTs == null) continue;
      // Earliest deal per position is the opening; only use its tradeSide if it's not a close deal
      if (
        firstOpenByPos[posId] == null ||
        candidateTs < firstOpenByPos[posId]
      ) {
        firstOpenByPos[posId] = candidateTs;
        if (!d?.closePositionDetail && typeof d?.tradeSide === 'number') {
          openingTradeSideByPos[posId] = d.tradeSide;
        }
      }
    }

    const toDirection = (side: number) => HelperService.toDirection(side);

    /** For closed deals: use opening direction. Closing deal's tradeSide is the closing action (opposite of position). */
    const getPositionDirection = (d: any): number => {
      const posId = d?.positionId ? String(d.positionId) : null;
      if (posId && typeof openingTradeSideByPos[posId] === 'number') {
        return openingTradeSideByPos[posId];
      }
      const closeDealSide = Number(d?.tradeSide);
      if (closeDealSide === 1 || closeDealSide === 2) {
        return HelperService.invertTradeSideForCloseDeal(closeDealSide);
      }
      return closeDealSide;
    };

    for (const d of closedDeals) {
      const dealId = d?.dealId != null ? String(d.dealId) : undefined;
      if (!dealId) continue;

      const positionDirection = getPositionDirection(d);

      const symbolId: number | null = Number.isFinite(d?.symbolId)
        ? Number(d.symbolId)
        : null;
      const info = symbolId != null ? symbolsById?.[symbolId] : undefined;
      const symbolName =
        info?.name ?? (symbolId != null ? String(symbolId) : 'UNKNOWN');
      const priceDigits = info?.digits ?? null;

      const moneyDigits =
        typeof d?.moneyDigits === 'number'
          ? d.moneyDigits
          : typeof d?.closePositionDetail?.moneyDigits === 'number'
            ? d.closePositionDetail.moneyDigits
            : undefined;

      const scaleMoney = (n: number | null, key?: string) => {
        if (n == null) return null;
        if (key && /InCents$/i.test(key)) return n / 100;
        return moneyDigits && moneyDigits > 0
          ? n / Math.pow(10, moneyDigits)
          : n;
      };

      const exitTimeMs =
        HelperService.toBigIntMs(d?.executionTimestamp) ??
        HelperService.toBigIntMs(d?.createTimestamp);

      const cpd = d.closePositionDetail;
      const exitPrice = HelperService.scalePriceMaybe(
        HelperService.toNum(d?.executionPrice),
        priceDigits,
        'deal.exitPrice',
      );
      const entryPrice = HelperService.scalePriceMaybe(
        HelperService.toNum(cpd?.entryPrice),
        priceDigits,
        'deal.entryPrice',
      );

      const grossProfitRaw = HelperService.toNum(cpd?.grossProfit);
      const commissionRaw = HelperService.toNum(cpd?.commission) ?? 0;
      const swapRaw = HelperService.toNum(cpd?.swap) ?? 0;

      const baseToUsdRate = HelperService.toNum(d?.baseToUsdConversionRate);
      const quoteToDepositRate = HelperService.toNum(
        cpd?.quoteToDepositConversionRate,
      );
      const pnlConversionFee = HelperService.toNum(cpd?.pnlConversionFee);
      const marginRate = HelperService.toNum(d?.marginRate);
      const volumeCents =
        HelperService.toNum(cpd?.closedVolume) ??
        HelperService.toNum(d?.filledVolume) ??
        null;
      const lotSizeCents = info?.lotSize ?? null;
      const qtyLots =
        volumeCents != null
          ? volumeCentsToLots(volumeCents, lotSizeCents, symbolName)
          : null;
      const qtyUnits = volumeCents != null ? volumeCents / 100 : null;

      const result =
        (scaleMoney(grossProfitRaw) ?? 0) +
        (scaleMoney(commissionRaw) ?? 0) +
        (scaleMoney(swapRaw) ?? 0);

      const posId = d?.positionId ? String(d.positionId) : null;

      const dealSLTP = HelperService.extractSLTPFromDealNode(d);

      let derivedEntry: Date | null = null;
      let shadow: {
        id: string;
        entryTime: Date | null;
        stopLoss: Decimal | number | string | null;
        takeProfit: Decimal | number | string | null;
      } | null = null;

      if (posId) {
        shadow = await this.prisma.trade.findFirst({
          where: {
            userId,
            platform: 'cTrader',
            platformAccountId,
            status: 'OPEN',
            ticketId: `pos:${posId}`,
          },
          select: {
            id: true,
            entryTime: true,
            stopLoss: true,
            takeProfit: true,
          },
        });
        if (shadow?.entryTime) derivedEntry = shadow.entryTime;
      }

      if (!derivedEntry && posId && firstOpenByPos[posId]) {
        derivedEntry = new Date(Number(firstOpenByPos[posId]));
      }
      if (!derivedEntry && d?.tradeData?.openTimestamp) {
        const ms = HelperService.toBigIntMs(d.tradeData.openTimestamp);
        if (ms) derivedEntry = new Date(Number(ms));
      }
      const derivedExit = exitTimeMs ? new Date(Number(exitTimeMs)) : null;

      let stopLossNum =
        HelperService.scalePriceMaybe(
          HelperService.toNum(dealSLTP.sl),
          priceDigits,
          'deal.SL',
        ) ??
        fromDecimal(shadow?.stopLoss) ??
        null;

      let takeProfitNum =
        HelperService.scalePriceMaybe(
          HelperService.toNum(dealSLTP.tp),
          priceDigits,
          'deal.TP',
        ) ??
        fromDecimal(shadow?.takeProfit) ??
        null;

      if (
        posId &&
        (stopLossNum == null || takeProfitNum == null) &&
        protectionByPosFromReconcile
      ) {
        const prot = protectionByPosFromReconcile[posId];
        if (prot) {
          if (stopLossNum == null)
            stopLossNum = HelperService.scalePriceMaybe(
              HelperService.toNum(prot.sl),
              priceDigits,
              'prot.SL',
            );
          if (takeProfitNum == null)
            takeProfitNum = HelperService.scalePriceMaybe(
              HelperService.toNum(prot.tp),
              priceDigits,
              'prot.TP',
            );
        }
      }

      if (
        posId &&
        (stopLossNum == null || takeProfitNum == null) &&
        protectionByPosFromDeals
      ) {
        const prot = protectionByPosFromDeals[posId];
        if (prot) {
          if (stopLossNum == null)
            stopLossNum = HelperService.scalePriceMaybe(
              HelperService.toNum(prot.sl),
              priceDigits,
              'protDeals.SL',
            );
          if (takeProfitNum == null)
            takeProfitNum = HelperService.scalePriceMaybe(
              HelperService.toNum(prot.tp),
              priceDigits,
              'protDeals.TP',
            );
        }
      }

      const statusName = ctraderDealStatusName(d?.dealStatus);
      const duration = HelperService.msDuration(derivedEntry, derivedExit);
      const durationLabel = formatDurationShort(duration);

      await this.prisma.trade.upsert({
        where: { userId_ticketId: { userId, ticketId: dealId } },
        create: {
          userId,
          platformAccountId,
          platform: 'cTrader',
          status: statusName,
          symbol: symbolName,
          symbolId: symbolId ?? null,
          direction: toDirection(positionDirection),
          quantity: qtyUnits ?? null,
          quantityLots: qtyLots ?? null,
          entryTime: derivedEntry ?? null,
          exitTime: derivedExit ?? null,
          entryPrice: entryPrice ?? (derivedEntry ? null : (exitPrice ?? null)),
          exitPrice: exitPrice ?? (derivedExit ? null : (entryPrice ?? null)),
          result: result ?? null,
          durationMs: duration,
          durationLabel,
          ticketId: dealId,
          positionId: posId ?? null,
          orderId: d?.orderId ? String(d.orderId) : null,
          dealStatus: typeof d?.dealStatus === 'number' ? d.dealStatus : null,
          tradeSide:
            typeof positionDirection === 'number' ? positionDirection : null,
          createTimestampMs: HelperService.toBigIntMs(d?.createTimestamp),
          executionTimestampMs: HelperService.toBigIntMs(d?.executionTimestamp),
          utcLastUpdateTimestampMs: HelperService.toBigIntMs(
            d?.utcLastUpdateTimestamp,
          ),
          executionPrice: exitPrice ?? null,
          marginRate: marginRate ?? null,
          commission: scaleMoney(commissionRaw) ?? null,
          baseToUsdRate: baseToUsdRate ?? null,
          moneyDigits:
            typeof d?.moneyDigits === 'number'
              ? d.moneyDigits
              : (moneyDigits ?? null),
          comment: typeof d?.comment === 'string' ? d.comment : null,
          cpd_entryPrice: entryPrice ?? null,
          cpd_grossProfit: scaleMoney(grossProfitRaw) ?? null,
          cpd_swap: scaleMoney(swapRaw) ?? null,
          cpd_commission: scaleMoney(commissionRaw) ?? null,
          cpd_balance: scaleMoney(HelperService.toNum(cpd?.balance)) ?? null,
          cpd_quoteToDepositRate: quoteToDepositRate ?? null,
          cpd_closedVolume: HelperService.toNum(cpd?.closedVolume) ?? null,
          cpd_balanceVersion:
            typeof cpd?.balanceVersion === 'number' ? cpd.balanceVersion : null,
          cpd_pnlConversionFee: scaleMoney(pnlConversionFee ?? null) ?? null,
          positionStatus: 2,
          positionPrice: exitPrice ?? null,
          stopLoss: toDecimal(stopLossNum),
          takeProfit: toDecimal(takeProfitNum),
          quoteToDepositRate: quoteToDepositRate ?? null,
          rawDeal: d,
          rawPosition: null,
          notes: `CLOSED ctid:${ctidTraderAccountId} pos:${posId ?? '-'} ord:${d?.orderId ?? '-'}`,
          tags: [],
        },
        update: {
          platformAccountId,
          status: statusName,
          symbol: symbolName,
          symbolId: symbolId ?? null,
          direction: toDirection(positionDirection),
          quantity: qtyUnits ?? null,
          quantityLots: qtyLots ?? null,
          entryTime: derivedEntry ?? null,
          exitTime: derivedExit ?? null,
          entryPrice: entryPrice ?? (derivedEntry ? null : (exitPrice ?? null)),
          exitPrice: exitPrice ?? (derivedExit ? null : (entryPrice ?? null)),
          result: result ?? null,
          durationMs: duration,
          durationLabel,
          positionId: posId ?? null,
          orderId: d?.orderId ? String(d.orderId) : null,
          dealStatus: typeof d?.dealStatus === 'number' ? d.dealStatus : null,
          tradeSide:
            typeof positionDirection === 'number' ? positionDirection : null,
          createTimestampMs: HelperService.toBigIntMs(d?.createTimestamp),
          executionTimestampMs: HelperService.toBigIntMs(d?.executionTimestamp),
          utcLastUpdateTimestampMs: HelperService.toBigIntMs(
            d?.utcLastUpdateTimestamp,
          ),
          executionPrice: exitPrice ?? null,
          marginRate: marginRate ?? null,
          commission: scaleMoney(commissionRaw) ?? null,
          baseToUsdRate: baseToUsdRate ?? null,
          moneyDigits:
            typeof d?.moneyDigits === 'number'
              ? d.moneyDigits
              : (moneyDigits ?? null),
          comment: typeof d?.comment === 'string' ? d.comment : null,
          cpd_entryPrice: entryPrice ?? null,
          cpd_grossProfit: scaleMoney(grossProfitRaw) ?? null,
          cpd_swap: scaleMoney(swapRaw) ?? null,
          cpd_commission: scaleMoney(commissionRaw) ?? null,
          cpd_balance: scaleMoney(HelperService.toNum(cpd?.balance)) ?? null,
          cpd_quoteToDepositRate: quoteToDepositRate ?? null,
          cpd_closedVolume: HelperService.toNum(cpd?.closedVolume) ?? null,
          cpd_balanceVersion:
            typeof cpd?.balanceVersion === 'number' ? cpd.balanceVersion : null,
          cpd_pnlConversionFee: scaleMoney(pnlConversionFee ?? null) ?? null,
          positionStatus: 2,
          positionPrice: exitPrice ?? null,
          stopLoss: toDecimal(stopLossNum),
          takeProfit: toDecimal(takeProfitNum),
          quoteToDepositRate: quoteToDepositRate ?? null,
          rawDeal: d,
          notes: `CLOSED ctid:${ctidTraderAccountId} pos:${posId ?? '-'} ord:${d?.orderId ?? '-'}`,
        },
      });

      if (posId && shadow?.id) {
        await this.prisma.trade.deleteMany({
          where: {
            id: shadow.id,
            userId,
            platformAccountId,
            ticketId: `pos:${posId}`,
            status: 'OPEN',
          },
        });
      } else if (posId) {
        await this.prisma.trade.deleteMany({
          where: {
            userId,
            platformAccountId,
            platform: 'cTrader',
            ticketId: `pos:${posId}`,
            status: 'OPEN',
          },
        });
      }
    }
  }

  private async reconcileStaleOpenShadows(
    userId: string,
    platformAccountId: string,
    _ctidTraderAccountId: string,
    livePositions: any[],
    allDeals: any[],
  ) {
    const liveIds = new Set<string>(
      (livePositions ?? [])
        .map((p: any) => (p?.positionId != null ? String(p.positionId) : null))
        .filter(Boolean) as string[],
    );

    const staleOpen = await this.prisma.trade.findMany({
      where: {
        userId,
        platform: 'cTrader',
        status: 'OPEN',
        ticketId: { startsWith: 'pos:' },
        platformAccountId,
      },
      select: {
        id: true,
        ticketId: true,
        positionId: true,
        entryTime: true,
        stopLoss: true,
        takeProfit: true,
      },
    });

    if (!staleOpen.length) return;

    const lastCloseByPos = new Map<
      string,
      { exitTimeMs: bigint | null; exitPrice: number | null }
    >();
    for (const d of allDeals) {
      if (!d?.closePositionDetail || d?.positionId == null) continue;
      const pid = String(d.positionId);
      const exitTimeMs =
        HelperService.toBigIntMs(d?.executionTimestamp) ??
        HelperService.toBigIntMs(d?.createTimestamp);
      const exitPrice = HelperService.toNum(d?.executionPrice);
      const prev = lastCloseByPos.get(pid);
      if (!prev || (exitTimeMs ?? 0n) > (prev.exitTimeMs ?? 0n)) {
        lastCloseByPos.set(pid, { exitTimeMs, exitPrice });
      }
    }

    for (const row of staleOpen) {
      const posId = row.positionId;
      if (!posId) continue;
      if (liveIds.has(posId)) continue;

      const close = lastCloseByPos.get(posId);
      if (close) {
        await this.prisma.trade.deleteMany({
          where: {
            id: row.id,
            userId,
            platformAccountId,
            ticketId: `pos:${posId}`,
            status: 'OPEN',
          },
        });
      } else {
        const exitTime = new Date();
        const duration = row.entryTime
          ? HelperService.msDuration(row.entryTime, exitTime)
          : null;
        const durationLabel = formatDurationShort(duration);
        await this.prisma.trade.updateMany({
          where: {
            id: row.id,
            userId,
            platformAccountId,
            ticketId: `pos:${posId}`,
            status: 'OPEN',
          },
          data: {
            status: 'Filled',
            exitTime,
            durationMs: duration,
            durationLabel,
            notes: 'AUTO-CLOSE shadow (no live pos, no deal found)',
            rawPosition: null,
          },
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sweepAndRefreshExpiringTokens() {
    const threshold = new Date(Date.now() + this.tokenRefreshSkewMs);
    const batchSize = 200;
    let cursor: string | null = null;

    for (;;) {
      const conns = await this.prisma.platformConnection.findMany({
        where: { expiresAt: { lte: threshold }, platform: Platform.CTRADER },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, userId: true },
      });
      if (!conns.length) break;

      await Promise.all(
        conns.map((c) =>
          this.refreshAccessToken(c.userId, c.id).catch((e) => {
            if (DEBUG) console.log('[auto-refresh error]', c.id, String(e));
          }),
        ),
      );

      if (conns.length < batchSize) break;
      cursor = conns[conns.length - 1].id;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async backgroundSyncAccounts() {
    if (DEBUG) console.log('[Background] Starting account sync');
    const batchSize = 100;
    let cursor: string | null = null;

    for (;;) {
      const users = await this.prisma.user.findMany({
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true },
      });
      if (!users.length) break;

      await Promise.all(
        users.map((u) =>
          this.syncUserAccounts(u.id).catch((e) => {
            if (DEBUG) console.log('[Account sync error]', u.id, String(e));
          }),
        ),
      );

      if (users.length < batchSize) break;
      cursor = users[users.length - 1].id;
    }

    if (DEBUG) console.log('[Background] Account sync completed');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async backgroundSyncTrades() {
    if (DEBUG) console.log('[Background] Starting trade sync');
    const batchSize = 30;

    const accounts = await this.prisma.platformAccount.findMany({
      where: {
        connection: {},
      },
      select: {
        id: true,
        userId: true,
        connectionId: true,
        platformAccountId: true,
        traderLogin: true,
        lastSyncAt: true,
      },
      orderBy: { lastSyncAt: 'asc' },
      take: batchSize,
    });

    if (!accounts.length) {
      if (DEBUG) console.log('[Background] No accounts to sync');
      return;
    }

    await Promise.all(
      accounts.map((acc) =>
        this.syncAccountTrades(
          acc.userId,
          acc.connectionId,
          acc.traderLogin ?? acc.platformAccountId.toString(),
        ).catch((e) => {
          if (DEBUG) console.log('[Trade sync error]', acc.id, String(e));
        }),
      ),
    );

    if (DEBUG) console.log('[Background] Trade sync completed');
  }

  async syncUserAccounts(userId: string): Promise<void> {
    const existing = this.accountSyncInFlight.get(userId);
    if (existing) return existing;

    const job = (async (): Promise<void> => {
      try {
        const connections = await this.prisma.platformConnection.findMany({
          where: { userId, platform: Platform.CTRADER },
          select: { id: true },
        });
        await Promise.all(
          connections.map((c) =>
            this.withRefreshRetry(userId, c.id, async (tk) => {
              const restAccounts = await this.fetchAccountsViaConnectRest(tk);
              for (const a of restAccounts) {
                const rest = BigInt(a.restTradingAccountId);
                await this.prisma.platformAccount.upsert({
                  where: {
                    connectionId_platformAccountId: {
                      connectionId: c.id,
                      platformAccountId: rest,
                    },
                  },
                  create: {
                    userId,
                    connectionId: c.id,
                    platformAccountId: rest,
                    restTradingAccountId: rest,
                    isLive: !!a.isLive,
                    brokerName: a.brokerTitleShort ?? null,
                    traderLogin: a.traderLogin ?? null,
                    depositCurrency: a.depositCurrency ?? null,
                    balance: typeof a.balance === 'number' ? a.balance : null,
                    equity: typeof a.equity === 'number' ? a.equity : null,
                    instrumentCategory: 'Multi',
                    positionMode: a.traderAccountType ?? null,
                    lastSyncAt: new Date(),
                  },
                  update: {
                    restTradingAccountId: rest,
                    isLive: !!a.isLive,
                    brokerName: a.brokerTitleShort ?? null,
                    traderLogin: a.traderLogin ?? null,
                    depositCurrency: a.depositCurrency ?? null,
                    balance: typeof a.balance === 'number' ? a.balance : null,
                    equity: typeof a.equity === 'number' ? a.equity : null,
                    positionMode: a.traderAccountType ?? null,
                    lastSyncAt: new Date(),
                  },
                });
              }
              return null;
            }),
          ),
        );
      } finally {
        this.accountSyncInFlight.delete(userId);
      }
    })();

    this.accountSyncInFlight.set(userId, job);
    return job;
  }

  async syncAccountTrades(
    userId: string,
    connectionId: string,
    accountIdentifier: string,
  ): Promise<void> {
    const key = `${connectionId}:${accountIdentifier}`;
    const existing = this.tradeSyncInFlight.get(key);
    if (existing) return existing;

    const job = (async (): Promise<void> => {
      try {
        await this.getAccountData(
          userId,
          accountIdentifier,
          undefined,
          connectionId,
        );
        await this.prisma.platformAccount.updateMany({
          where: {
            userId,
            connectionId,
            OR: [
              { traderLogin: accountIdentifier },
              {
                platformAccountId: (() => {
                  try {
                    return BigInt(accountIdentifier);
                  } catch {
                    return undefined;
                  }
                })(),
              },
            ],
          },
          data: { lastSyncAt: new Date() },
        });
      } finally {
        this.tradeSyncInFlight.delete(key);
      }
    })();

    this.tradeSyncInFlight.set(key, job);
    return job;
  }

  async syncUserAccountsAndTradesForConnection(
    userId: string,
    connectionId: string,
  ): Promise<void> {
    await this.withRefreshRetry(userId, connectionId, async () => {
      await this.syncUserAccounts(userId);
      const accounts = await this.prisma.platformAccount.findMany({
        where: { userId, connectionId },
        select: { platformAccountId: true, traderLogin: true },
      });
      await Promise.all(
        accounts.map((a) =>
          this.syncAccountTrades(
            userId,
            connectionId,
            a.traderLogin ?? a.platformAccountId.toString(),
          ),
        ),
      );
      return null;
    });
  }

  private async wsFetchDealsChunked(
    client: OpenApiJsonClient,
    ctidTraderAccountId: number,
    fromMs: number,
    toMs: number,
  ): Promise<any[]> {
    const out: any[] = [];
    let start = fromMs;
    while (start < toMs) {
      const end = Math.min(
        toMs,
        start + this.historyChunkDays * 24 * 3600 * 1000,
      );
      const res: any = await client.send(
        {
          clientMsgId: OpenApiJsonClient.nextId(),
          payloadType: PAYLOAD.DEAL_LIST_REQ,
          payload: {
            ctidTraderAccountId,
            fromTimestamp: start,
            toTimestamp: end,
          },
        },
        [PAYLOAD.DEAL_LIST_RES],
        25_000,
      );
      const chunk: any[] = Array.isArray(res?.payload?.deal)
        ? res.payload.deal
        : (res?.payload?.deals ?? []);
      if (chunk.length) out.push(...chunk);
      start = end + 1;
    }
    return out;
  }

  private async fetchSymbolsInfoMap(
    client: OpenApiJsonClient,
    ctidTraderAccountId: number,
  ): Promise<Record<number, SymbolInfo>> {
    const res: any = await client.send(
      {
        clientMsgId: OpenApiJsonClient.nextId(),
        payloadType: PAYLOAD.SYMBOLS_LIST_REQ,
        payload: { ctidTraderAccountId },
      },
      [PAYLOAD.SYMBOLS_LIST_RES],
      20_000,
    );
    const list: any[] =
      res?.payload?.symbols ??
      res?.payload?.symbolList ??
      res?.payload?.symbol ??
      res?.payload?.data ??
      [];
    const map: Record<number, SymbolInfo> = {};
    for (const s of list) {
      const id = Number(
        s?.symbolId ?? s?.id ?? s?.symbolID ?? s?.symbol_id ?? NaN,
      );
      const name = (s?.symbolName ??
        s?.name ??
        s?.displayName ??
        s?.symbol ??
        s?.ticker ??
        null) as string | null;

      const digits = Number.isFinite(s?.digits)
        ? Number(s.digits)
        : Number.isFinite(s?.pipPosition)
          ? Number(s.pipPosition)
          : Number.isFinite(s?.priceScale)
            ? Number(s.priceScale)
            : undefined;

      const lotSize = Number.isFinite(s?.lotSize ?? s?.lot_size)
        ? Number(s.lotSize ?? s.lot_size)
        : null;

      if (Number.isFinite(id) && name) {
        map[id] = { name, digits: digits ?? null, lotSize: lotSize ?? null };
      }
    }
    return map;
  }

  private async fetchAccountsViaConnectRest(
    accessToken: string,
  ): Promise<RestAccount[]> {
    const urls = [
      `https://api.spotware.com/connect/tradingaccounts?oauth_token=${encodeURIComponent(accessToken)}`,
      `https://api.spotware.com/connect/tradingaccounts?access_token=${encodeURIComponent(accessToken)}`,
    ];

    const toNum = (val: any): number | null => {
      if (typeof val === 'number' && Number.isFinite(val)) return val;
      if (typeof val === 'string') {
        const n = Number(val);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };

    for (const url of urls) {
      const resp = await axios.get(url, {
        headers: { Accept: 'application/json' },
        timeout: this.httpTimeoutMs,
        validateStatus: () => true,
      });

      if (resp.status === 401 || resp.status === 403) {
        const err: any = new Error('REST auth error 401/403');
        (err as any).responseStatus = resp.status;
        throw err;
      }

      if (resp.status !== 200) {
        if (DEBUG)
          console.log('[Spotware][REST] status', resp.status, resp.data);
        continue;
      }

      const raw = Array.isArray(resp.data) ? resp.data : resp.data?.data;
      if (!Array.isArray(raw)) continue;

      const mapped: RestAccount[] = raw.map((a: any) => {
        const md = typeof a?.moneyDigits === 'number' ? a.moneyDigits : null;

        const balanceRaw =
          toNum(a?.balance) ??
          (a?.balanceInCents != null ? toNum(a.balanceInCents)! / 100 : null);

        const equityRaw =
          toNum(a?.equity) ??
          (a?.equityInCents != null ? toNum(a.equityInCents)! / 100 : null);

        const scale = (n: number | null) =>
          n != null && md != null ? n / Math.pow(10, md) : n;

        return {
          restTradingAccountId: a.accountId,
          isLive: !!a.live,
          traderLogin: a.accountNumber ? String(a.accountNumber) : null,
          brokerTitleShort: a.brokerTitle ?? a.brokerName ?? null,
          depositCurrency: a.depositCurrency ?? null,
          balance: scale(balanceRaw),
          equity: scale(equityRaw),
          moneyDigits: md ?? undefined,
          traderAccountType: a.traderAccountType ?? null,
        };
      });

      return mapped;
    }

    return [];
  }

  private async wsFetchAccountSnapshot(
    accessToken: string,
    isLive: boolean,
    ctidTraderAccountId: number,
    defaultBalance: number | null,
  ): Promise<{
    balance?: number | null;
    equity?: number | null;
    depositCurrency?: string | null;
    instrumentCategory?: string | null;
    positionMode?: string | null;
    floatingPnl?: number | null;
  }> {
    const wsUrl = isLive ? WS_ENDPOINT.LIVE : WS_ENDPOINT.DEMO;
    const client = new OpenApiJsonClient(wsUrl);
    await client.connect();

    try {
      await client.send(
        {
          clientMsgId: OpenApiJsonClient.nextId(),
          payloadType: PAYLOAD.APPLICATION_AUTH_REQ,
          payload: { clientId: this.clientId, clientSecret: this.clientSecret },
        },
        [PAYLOAD.APPLICATION_AUTH_RES],
        15_000,
      );

      const sumRes: any = await client.send(
        {
          clientMsgId: OpenApiJsonClient.nextId(),
          payloadType: PAYLOAD.GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ,
          payload: { accessToken },
        },
        [PAYLOAD.GET_ACCOUNTS_BY_ACCESS_TOKEN_RES],
        15_000,
      );

      const list =
        sumRes?.payload?.traderAccount ??
        sumRes?.payload?.traderAccountList ??
        sumRes?.payload?.accounts ??
        sumRes?.payload?.data ??
        [];
      const item =
        Array.isArray(list) &&
        list.find(
          (x: any) =>
            Number(
              x?.ctidTraderAccountId ??
                x?.traderAccountId ??
                x?.accountId ??
                x?.ctid,
            ) === Number(ctidTraderAccountId),
        );

      const pickDigits = (node: any): number | undefined =>
        typeof node?.moneyDigits === 'number'
          ? node.moneyDigits
          : HelperService.nearestMoneyDigits(node);

      const quick = (() => {
        if (!item) return null;
        const info =
          item.traderAccountInfo ?? item.accountInfo ?? item.info ?? item;
        const md = pickDigits(info);

        const scale = (n: number | null, key?: string) =>
          HelperService.scaleMaybeCents(n, md, key);

        const bal =
          scale(HelperService.toNum(info?.balance)) ??
          scale(HelperService.toNum(info?.balanceInCents), 'balanceInCents') ??
          scale(HelperService.toNum(item?.balance)) ??
          scale(HelperService.toNum(item?.balanceInCents), 'balanceInCents') ??
          null;

        const eq =
          scale(HelperService.toNum(info?.equity)) ??
          scale(HelperService.toNum(info?.equityInCents), 'equityInCents') ??
          scale(HelperService.toNum(item?.equity)) ??
          scale(HelperService.toNum(item?.equityInCents), 'equityInCents') ??
          null;

        return {
          balance: bal,
          equity: eq,
          depositCurrency:
            info?.depositCurrency ?? item?.depositCurrency ?? null,
          instrumentCategory: 'Multi',
          positionMode:
            info?.positionMode ??
            info?.traderAccountType ??
            item?.positionMode ??
            item?.traderAccountType ??
            null,
        };
      })();

      if (quick && quick.balance != null && quick.equity != null) {
        return { ...quick, floatingPnl: null };
      }

      await client.send(
        {
          clientMsgId: OpenApiJsonClient.nextId(),
          payloadType: PAYLOAD.ACCOUNT_AUTH_REQ,
          payload: { ctidTraderAccountId, accessToken },
        },
        [PAYLOAD.ACCOUNT_AUTH_RES],
        15_000,
      );

      const reconRes: any = await client.send(
        {
          clientMsgId: OpenApiJsonClient.nextId(),
          payloadType: PAYLOAD.RECONCILE_REQ,
          payload: { ctidTraderAccountId },
        },
        [PAYLOAD.RECONCILE_RES],
        20_000,
      );

      const payload = reconRes?.payload ?? {};
      const posList: any[] =
        payload?.positionList ?? payload?.position ?? ([] as any[]);
      const mdPayload = HelperService.nearestMoneyDigits(payload);

      const balanceHits = HelperService.findAllByKeyRegex(
        payload,
        /(^|_)(cashBalance|balance)$/i,
      );
      const equityHits = [
        ...HelperService.findAllByKeyRegex(
          payload,
          /(total|account)?_?equity$/i,
        ),
        ...HelperService.findAllByKeyRegex(
          payload,
          /(equityInCents|totalEquityInCents)/i,
        ),
      ];

      const pick = (
        hits: Array<{ value: any; ctx: any; key: string }>,
        mag?: number | null,
      ) => {
        for (const h of hits) {
          const raw = HelperService.toNum(h.value);
          const scaled = HelperService.scaleByMd(
            raw,
            HelperService.nearestMoneyDigits(h.ctx) ?? mdPayload,
          );
          for (const v of [scaled, raw]) {
            if (typeof v === 'number' && Number.isFinite(v)) {
              if (mag == null) return v;
              const ratio = Math.abs(v) / (Math.abs(mag) || 1);
              if (ratio < 100 && ratio > 0.01) return v;
            }
          }
        }
        return null;
      };

      const balance =
        pick(balanceHits, null) ??
        (typeof defaultBalance === 'number' ? defaultBalance : null);
      const floatingPnl = HelperService.sumPositionsFloatingPnl(posList);

      let equity = pick(equityHits, balance);
      if (equity == null && typeof balance === 'number') {
        if (typeof floatingPnl === 'number') {
          equity = balance + floatingPnl;
        } else {
          const flHit =
            HelperService.findAllByKeyRegex(
              payload,
              /(floating|unrealized|openPositionsPnl|floatingPnl)/i,
            )[0] || null;
          if (flHit?.value != null) {
            const floating = HelperService.scaleByMd(
              HelperService.toNum(flHit.value),
              HelperService.nearestMoneyDigits(flHit.ctx) ?? mdPayload,
            );
            if (floating != null && Number.isFinite(floating)) {
              equity = balance + floating;
            }
          } else {
            equity = balance;
          }
        }
      }

      const depCurHit =
        HelperService.findAllByKeyRegex(payload, /depositCurrency/i)[0] ?? null;
      const depositCurrency =
        depCurHit && typeof depCurHit.value === 'string'
          ? depCurHit.value
          : null;

      let positionMode: string | null =
        (HelperService.findAllByKeyRegex(payload, /positionMode/i)[0]?.value as
          | string
          | undefined) ??
        (HelperService.findAllByKeyRegex(payload, /traderAccountType/i)[0]
          ?.value as string | undefined) ??
        null;

      return {
        balance: typeof balance === 'number' ? balance : null,
        equity: typeof equity === 'number' ? equity : null,
        depositCurrency,
        instrumentCategory: 'Multi',
        positionMode,
        floatingPnl: floatingPnl ?? null,
      };
    } finally {
      client.close();
    }
  }
}
