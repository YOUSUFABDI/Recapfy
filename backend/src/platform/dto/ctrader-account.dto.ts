export class CTraderAccountDto {
  id!: string;
  connectionId!: string;
  platformAccountId!: string;
  restTradingAccountId?: string | null;
  isLive!: boolean;
  brokerName?: string | null;
  traderLogin?: string | null;
  connectedAt!: string;
  lastSyncAt?: string | null;

  depositCurrency?: string | null;
  balance?: number | null;
  equity?: number | null;
  instrumentCategory?: string | null;
  positionMode?: string | null;

  static fromPrisma(row: {
    id: string;
    connectionId: string;
    platformAccountId: bigint;
    restTradingAccountId: bigint | null;
    isLive: boolean;
    brokerName: string | null;
    traderLogin: string | null;
    connectedAt: Date;
    lastSyncAt: Date | null;

    depositCurrency?: string | null;
    balance?: number | null;
    equity?: number | null;
    instrumentCategory?: string | null;
    positionMode?: string | null;
  }): CTraderAccountDto {
    return {
      id: row.id,
      connectionId: row.connectionId,
      platformAccountId: row.platformAccountId.toString(),
      restTradingAccountId: row.restTradingAccountId
        ? row.restTradingAccountId.toString()
        : null,
      isLive: row.isLive,
      brokerName: row.brokerName ?? null,
      traderLogin: row.traderLogin ?? null,
      connectedAt: row.connectedAt.toISOString(),
      lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,

      depositCurrency: row.depositCurrency ?? null,
      balance: typeof row.balance === 'number' ? row.balance : null,
      equity: typeof row.equity === 'number' ? row.equity : null,
      instrumentCategory: row.instrumentCategory ?? null,
      positionMode: row.positionMode ?? null,
    };
  }
}
