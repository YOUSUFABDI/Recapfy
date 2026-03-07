import { Decimal } from '@prisma/client/runtime/client';

export const VOLUME_UNITS_PER_LOT = 100_000;
export const DEBUG =
  String(process.env.DEBUG_EQUITY || '').toLowerCase() === 'true';

export type SymbolInfo = {
  name: string;
  digits?: number | null;
  /** Lot size in cents (from ProtoOASymbol). Volume in cents / lotSize = lots. */
  lotSize?: number | null;
};

interface MoneyDigitsObject {
  moneyDigits?: number;
  traderAccountInfo?: { moneyDigits?: number };
  accountInfo?: { moneyDigits?: number };
  [key: string]: any;
}

interface PositionObject {
  positionId?: any;
  stopLoss?: any;
  sl?: any;
  stopLossPrice?: any;
  slPrice?: any;
  stopLossLevel?: any;
  takeProfit?: any;
  tp?: any;
  takeProfitPrice?: any;
  tpPrice?: any;
  takeProfitLevel?: any;
  tradeData?: {
    stopLoss?: any;
    stopLossPrice?: any;
    takeProfit?: any;
    takeProfitPrice?: any;
  };
  [key: string]: any;
}

interface DealObject {
  positionId?: any;
  executionTimestamp?: any;
  createTimestamp?: any;
  stopLoss?: any;
  sl?: any;
  stopLossPrice?: any;
  slPrice?: any;
  stopLossLevel?: any;
  takeProfit?: any;
  tp?: any;
  takeProfitPrice?: any;
  tpPrice?: any;
  takeProfitLevel?: any;
  [key: string]: any;
}

export function toLotsDisplay(
  units: number | string | null | undefined,
  decimals = 3,
  lotSizeCents?: number | null,
): number | null {
  const n = firstFiniteNumber(units);
  if (n == null) return null;
  const lots =
    lotSizeCents != null && lotSizeCents > 0
      ? n / lotSizeCents
      : n / VOLUME_UNITS_PER_LOT;
  if (!Number.isFinite(lots)) return null;
  return Number(lots.toFixed(decimals));
}

/**
 * Convert volume in cents (cTrader API) to lots using symbol's lot size.
 * Proto: closedVolume and filledVolume are in cents; lotSize is in cents.
 * lots = volumeCents / lotSizeCents
 */
export function volumeCentsToLots(
  volumeCents: number | null | undefined,
  lotSizeCents: number | null | undefined,
  symbolName?: string | null,
): number | null {
  const v = firstFiniteNumber(volumeCents);
  let ls = firstFiniteNumber(lotSizeCents);
  if (ls == null || ls <= 0) {
    ls = inferLotSizeFromSymbol(symbolName);
  }
  if (v == null || ls == null || ls <= 0) return null;
  const lots = v / ls;
  return Number.isFinite(lots) ? lots : null;
}

/**
 * Fallback when lotSize is missing from API (e.g. light symbols).
 * Indices/CFDs: typically 1 lot = 1 contract, lotSize 100.
 * Forex: 1 lot = 100k units, lotSize 10_000_000.
 */
function inferLotSizeFromSymbol(symbolName?: string | null): number | null {
  if (!symbolName) return 10_000_000;
  const s = symbolName.toUpperCase();
  const isIndex =
    /^(US\s*30|US30|US\s*500|US500|UK\s*100|UK100|DAX|NAS|SPX|CAC|AUS\s*200)/i.test(
      s,
    ) || /INDEX|CFD|CRUDE|GOLD|SILVER/i.test(s);
  return isIndex ? 100 : 10_000_000;
}

export function toDecimal(
  n: number | string | null | undefined,
): Decimal | null {
  if (n == null) return null;
  if (typeof n === 'number') {
    if (!Number.isFinite(n)) return null;
    return new Decimal(n.toString());
  }
  const s = String(n).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nan')
    return null;
  return new Decimal(s);
}

export function fromDecimal(
  v: Decimal | number | string | null | undefined,
): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  try {
    return (v as Decimal).toNumber();
  } catch {
    return null;
  }
}

export function ctraderDealStatusName(status: any): string {
  switch (Number(status)) {
    case 0:
      return 'Pending';
    case 1:
      return 'Rejected';
    case 2:
      return 'Filled';
    case 3:
      return 'Expired';
    case 4:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function formatDurationShort(
  msLike: bigint | number | null | undefined,
): string | null {
  if (msLike == null) return null;
  const ms = typeof msLike === 'bigint' ? Number(msLike) : Number(msLike);
  const totalSec = Math.max(0, Math.floor(ms / 1000));

  const hoursTotal = Math.trunc(totalSec / 3600);
  const minutes = Math.trunc((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hoursTotal > 0)
    return minutes > 0 ? `${hoursTotal}h ${minutes}m` : `${hoursTotal}h`;
  if (minutes > 0)
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return `${seconds}s`;
}

export function firstFiniteNumber(x: any): number | null {
  if (x == null) return null;

  if (typeof x === 'number' && Number.isFinite(x)) return x;

  if (typeof x === 'string') {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  if (x && typeof x === 'object') {
    const directKeys = [
      'value',
      'price',
      'level',
      'triggerPrice',
      'amount',
      'num',
      'val',
    ];
    for (const k of directKeys) {
      if ((x as any)[k] != null) {
        const cand = firstFiniteNumber((x as any)[k]);
        if (cand != null) return cand;
      }
    }
    for (const v of Object.values(x)) {
      const cand = firstFiniteNumber(v);
      if (cand != null) return cand;
    }
  }
  return null;
}

export function deepFindAnyFiniteNumber(
  node: any,
  visited = new WeakSet<object>(),
): number | null {
  if (!node || typeof node !== 'object') return null;
  if (visited.has(node as object)) return null;
  visited.add(node as object);

  for (const v of Object.values(node)) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') {
      const cand = deepFindAnyFiniteNumber(v, visited);
      if (cand != null) return cand;
    }
  }
  return null;
}

export function findFirstNumberByKeyRegex(
  node: any,
  keyRegex: RegExp,
  visited = new WeakSet<object>(),
): number | null {
  if (!node || typeof node !== 'object') return null;
  if (visited.has(node as object)) return null;
  visited.add(node as object);

  for (const [k, v] of Object.entries(node)) {
    if (keyRegex.test(k)) {
      const direct = firstFiniteNumber(v);
      if (direct != null) return direct;
      if (v && typeof v === 'object') {
        const priceLike = findFirstNumberByKeyRegex(
          v,
          /(price|level|trigger|entry|exit|value)$/i,
          visited,
        );
        if (priceLike != null) return priceLike;
        const anyNum = deepFindAnyFiniteNumber(v);
        if (anyNum != null) return anyNum;
      }
    }
  }

  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') {
      const n = findFirstNumberByKeyRegex(v, keyRegex, visited);
      if (n != null) return n;
    }
  }
  return null;
}

export function findAnyStopLoss(node: any): number | null {
  return (
    findFirstNumberByKeyRegex(
      node,
      /(stop.?loss|sl(_|$)|stopLoss(price|Level)?|slPrice|sl_level|stopLossLevel|stopLossTrigger|slTrigger)/i,
    ) ?? null
  );
}

export function findAnyTakeProfit(node: any): number | null {
  return (
    findFirstNumberByKeyRegex(
      node,
      /(take.?profit|tp(_|$)|takeProfit(price|Level)?|tpPrice|tp_level|takeProfitLevel|takeProfitTrigger)/i,
    ) ?? null
  );
}

export class HelperService {
  static isObj = (x: any): x is object => x && typeof x === 'object';

  static isMoneyDigitsObject(x: any): x is MoneyDigitsObject {
    return this.isObj(x);
  }

  static isPositionObject(x: any): x is PositionObject {
    return this.isObj(x);
  }

  static isDealObject(x: any): x is DealObject {
    return this.isObj(x);
  }

  static toNum = (val: any): number | null => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    }
    if (val && typeof val === 'object') {
      const nested =
        this.toNum(
          (val as any).value ??
            (val as any).price ??
            (val as any).level ??
            (val as any).triggerPrice,
        ) ?? deepFindAnyFiniteNumber(val);
      if (nested != null) return nested;
    }
    return null;
  };

  static toBigIntMs(val: any): bigint | null {
    if (typeof val === 'bigint') return val;
    if (typeof val === 'number' && Number.isFinite(val))
      return BigInt(Math.floor(val));
    if (typeof val === 'string' && /^\d+$/.test(val)) return BigInt(val);
    return null;
  }

  static nearestMoneyDigits = (node: any): number | undefined => {
    if (!this.isObj(node)) return undefined;

    const obj = node as MoneyDigitsObject;

    if (typeof obj.moneyDigits === 'number') return obj.moneyDigits;
    if (typeof obj?.traderAccountInfo?.moneyDigits === 'number')
      return obj.traderAccountInfo.moneyDigits;
    if (typeof obj?.accountInfo?.moneyDigits === 'number')
      return obj.accountInfo.moneyDigits;

    for (const v of Object.values(obj)) {
      if (this.isObj(v)) {
        const md = this.nearestMoneyDigits(v);
        if (typeof md === 'number') return md;
      }
    }
    return undefined;
  };

  static scaleByMd(raw: number | null, md?: number): number | null {
    if (raw == null) return null;
    return md && md > 0 ? raw / Math.pow(10, md) : raw;
  }

  static scaleMaybeCents(raw: number | null, md?: number, key?: string) {
    if (raw == null) return null;
    if (key && /InCents$/i.test(key)) return raw / 100;
    return this.scaleByMd(raw, md);
  }

  static msDuration(start?: Date | null, end?: Date | null): bigint | null {
    if (!start || !end) return null;
    const d = Math.max(end.getTime() - start.getTime(), 0);
    return BigInt(d);
  }

  static scalePriceMaybe(
    raw: number | null,
    digits?: number | null,
    keyHint?: string,
  ): number | null {
    if (raw == null) return null;

    if (Math.abs(raw) < 1e5) return raw;

    if (digits && digits > 0) {
      const scaled = raw / Math.pow(10, digits);
      if (Math.abs(scaled) < 1e5) return scaled;
    }

    if (keyHint && /(price|pip|point|scaled|level|trigger)/i.test(keyHint)) {
      const scaled = raw / 1e5;
      if (Math.abs(scaled) < 1e5) return scaled;
    }

    return raw;
  }

  static extractSLTPFromPositionNode(p: any): {
    sl: number | null;
    tp: number | null;
  } {
    const position = p as PositionObject;

    const directSL =
      this.toNum(
        position?.stopLoss ??
          position?.sl ??
          position?.stopLossPrice ??
          position?.slPrice ??
          position?.stopLossLevel,
      ) ??
      this.toNum(
        position?.tradeData?.stopLoss ?? position?.tradeData?.stopLossPrice,
      ) ??
      findAnyStopLoss(position);

    const directTP =
      this.toNum(
        position?.takeProfit ??
          position?.tp ??
          position?.takeProfitPrice ??
          position?.tpPrice ??
          position?.takeProfitLevel,
      ) ??
      this.toNum(
        position?.tradeData?.takeProfit ?? position?.tradeData?.takeProfitPrice,
      ) ??
      findAnyTakeProfit(position);

    return { sl: directSL, tp: directTP };
  }

  static extractSLTPFromDealNode(d: any): {
    sl: number | null;
    tp: number | null;
  } {
    const deal = d as DealObject;

    const directSL =
      this.toNum(
        deal?.stopLoss ??
          deal?.sl ??
          deal?.stopLossPrice ??
          deal?.slPrice ??
          deal?.stopLossLevel,
      ) ?? findAnyStopLoss(deal);

    const directTP =
      this.toNum(
        deal?.takeProfit ??
          deal?.tp ??
          deal?.takeProfitPrice ??
          deal?.tpPrice ??
          deal?.takeProfitLevel,
      ) ?? findAnyTakeProfit(deal);

    return { sl: directSL, tp: directTP };
  }

  static buildProtectionMapFromReconcilePayload(
    payload: any,
  ): Record<string, { sl: number | null; tp: number | null }> {
    const out: Record<string, { sl: number | null; tp: number | null }> = {};

    const visit = (node: any) => {
      if (!this.isObj(node)) return;

      const obj = node as PositionObject;
      const pid = obj?.positionId != null ? String(obj.positionId) : null;

      if (pid) {
        const sl =
          this.toNum(
            obj?.stopLoss ??
              obj?.sl ??
              obj?.stopLossPrice ??
              obj?.slPrice ??
              obj?.stopLossLevel,
          ) ?? findAnyStopLoss(obj);
        const tp =
          this.toNum(
            obj?.takeProfit ??
              obj?.tp ??
              obj?.takeProfitPrice ??
              obj?.tpPrice ??
              obj?.takeProfitLevel,
          ) ?? findAnyTakeProfit(obj);

        if (sl != null || tp != null) {
          const cur = out[pid] || { sl: null, tp: null };
          if (sl != null) cur.sl = sl;
          if (tp != null) cur.tp = tp;
          out[pid] = cur;
        }
      }
      for (const v of Object.values(obj)) {
        if (Array.isArray(v)) for (const x of v) visit(x);
        else if (this.isObj(v)) visit(v);
      }
    };

    visit(payload);
    if (DEBUG) {
      const count = Object.keys(out).length;
      if (count)
        console.log(`[ProtectionMap] collected for ${count} positions`);
    }
    return out;
  }

  static buildProtectionMapFromAllDeals(
    allDeals: any[],
  ): Record<string, { sl: number | null; tp: number | null }> {
    const out: Record<string, { sl: number | null; tp: number | null }> = {};
    if (!Array.isArray(allDeals) || !allDeals.length) return out;

    const byPos: Record<
      string,
      { ts: bigint; sl: number | null; tp: number | null }
    > = {};

    for (const d of allDeals) {
      const deal = d as DealObject;
      const posId = deal?.positionId != null ? String(deal.positionId) : null;
      if (!posId) continue;

      const { sl, tp } = this.extractSLTPFromDealNode(deal);
      if (sl == null && tp == null) continue;

      const ts =
        this.toBigIntMs(deal?.executionTimestamp) ??
        this.toBigIntMs(deal?.createTimestamp) ??
        0n;

      const prev = byPos[posId];
      if (!prev || ts >= prev.ts) {
        byPos[posId] = {
          ts,
          sl: sl ?? prev?.sl ?? null,
          tp: tp ?? prev?.tp ?? null,
        };
      }
    }

    for (const [posId, v] of Object.entries(byPos)) {
      out[posId] = { sl: v.sl ?? null, tp: v.tp ?? null };
    }
    if (DEBUG) {
      const count = Object.keys(out).length;
      if (count)
        console.log(`[ProtectionMap/Deals] collected for ${count} positions`);
    }
    return out;
  }

  static findAllByKeyRegex(
    node: any,
    regex: RegExp,
    hits: Array<{ value: any; ctx: any; key: string }> = [],
  ) {
    if (!this.isObj(node)) return hits;
    for (const [k, v] of Object.entries(node)) {
      if (regex.test(k)) hits.push({ value: v, ctx: node, key: k });
      if (this.isObj(v)) this.findAllByKeyRegex(v, regex, hits);
    }
    return hits;
  }

  static sumPositionsFloatingPnl(positions: any[]): number | null {
    if (!Array.isArray(positions) || positions.length === 0) return 0;
    const keys = [
      'floatingProfitInCents',
      'unrealizedPnlInCents',
      'profitInCents',
      'floatingProfit',
      'floatingPnl',
      'unrealizedPnl',
      'profit',
    ];
    let total = 0;
    let found = false;
    for (const p of positions) {
      const md = this.nearestMoneyDigits(p);
      let val: number | null = null;
      let keyUsed: string | undefined;
      for (const k of keys) {
        if (p?.[k] != null) {
          val = this.scaleMaybeCents(this.toNum(p[k]), md, k);
          keyUsed = k;
          break;
        }
      }
      if (val == null) continue;
      const swap = this.scaleMaybeCents(this.toNum(p?.swap), md, 'swap') ?? 0;
      const com =
        this.scaleMaybeCents(this.toNum(p?.commission), md, 'commission') ?? 0;
      total += val + swap + com;
      found = true;
      if (DEBUG && keyUsed) console.log('[PnL key used]:', keyUsed, val);
    }
    return found ? total : null;
  }

  static toDirection(side: number): string {
    return side === 1 ? 'BUY' : side === 2 ? 'SELL' : 'UNKNOWN';
  }

  /**
   * For closed deals, the deal's tradeSide is the closing action (e.g. SELL to close a BUY).
   * To get the position's opening direction, invert: 1<->2.
   * Returns the inverted tradeSide (1->2, 2->1) or the original if not 1 or 2.
   */
  static invertTradeSideForCloseDeal(side: number): number {
    return side === 1 ? 2 : side === 2 ? 1 : side;
  }
}
