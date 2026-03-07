export type AccountDT = {
  id: string;
  userId: string;
  connectionId: string;
  platformAccountId: string;
  restTradingAccountId?: string | null;
  isLive: boolean;
  brokerName?: string | null;
  traderLogin?: string | null;
  connectedAt: string;
  lastSyncAt?: string | null;

  depositCurrency?: string | null;
  balance?: number | null;
  equity?: number | null;
  instrumentCategory?: string | null;
  positionMode?: string | null;
};
