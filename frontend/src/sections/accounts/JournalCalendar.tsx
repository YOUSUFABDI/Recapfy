"use client";

import * as React from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";

type Deal = {
  executionTimestamp: number; // ms epoch
  closePositionDetail?: {
    grossProfit?: number;
    swap?: number;
    commission?: number;
  };
};

type Props = {
  deals: Deal[];
  depositCurrency: string;
  onDateSelect?: (date: string | null) => void;
  selectedDate?: string | null;
};

/** Compute net PnL for a closed deal. */
function dealNet(deal: Deal) {
  const gp = deal.closePositionDetail?.grossProfit ?? 0;
  const sw = deal.closePositionDetail?.swap ?? 0;
  const cm = deal.closePositionDetail?.commission ?? 0;
  return gp + sw + cm;
}

/** Group deals by YYYY-MM-DD */
function groupDealsByDay(deals: Deal[]) {
  const map = new Map<string, Deal[]>();
  for (const d of deals) {
    const day = new Date(d.executionTimestamp);
    const key = day.toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return map;
}

const sameYM = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

function weeksInMonthGrid(d: Date) {
  const first = startOfMonth(d);
  const last = endOfMonth(d);
  const firstIndex = first.getDay(); // 0=Sun
  const totalDays = last.getDate();
  return Math.ceil((firstIndex + totalDays) / 7);
}

/** Return array of weeks covering the month.
 * Each week is { start: Date (Sunday), end: Date (Saturday) } and intersects the month.
 */
function getMonthWeeks(cursor: Date) {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);

  // start from the Sunday on/before the 1st of month
  const firstWeekStart = new Date(first);
  firstWeekStart.setDate(first.getDate() - first.getDay());

  const weeks: Array<{ start: Date; end: Date }> = [];
  let wkStart = new Date(firstWeekStart);

  while (wkStart <= last) {
    const wkEnd = new Date(wkStart);
    wkEnd.setDate(wkStart.getDate() + 6); // Saturday

    // include only weeks that intersect the month (they will by construction)
    weeks.push({ start: new Date(wkStart), end: new Date(wkEnd) });

    // next week
    wkStart = new Date(wkStart);
    wkStart.setDate(wkStart.getDate() + 7);
  }

  return weeks;
}

/** Format date to "Mon D" or "Mon D, YYYY" if different year */
function formatMonthDay(d: Date, compareYear?: number) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (compareYear !== undefined && d.getFullYear() !== compareYear) {
    (opts as any).year = "numeric";
  }
  return d.toLocaleDateString(undefined, opts);
}

export default function JournalCalendar({
  deals,
  depositCurrency,
  onDateSelect,
  selectedDate,
}: Props) {
  const t = useTheme();
  const isDark = t.palette.mode === "dark";

  const [cursor, setCursor] = React.useState(() => {
    if (deals?.length) {
      const latest = deals
        .map((d) => d.executionTimestamp)
        .sort((a, b) => b - a)[0];
      return new Date(latest);
    }
    return new Date();
  });

  const byDay = React.useMemo(() => groupDealsByDay(deals || []), [deals]);

  const firstOfMonth = startOfMonth(cursor);
  const totalWeeks = weeksInMonthGrid(cursor);
  const leadingBlanks = firstOfMonth.getDay();
  const totalCells = totalWeeks * 7;

  const monthTitle = cursor.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Build grid cells
  const daysArray: Array<{
    date: Date | null;
    key: string;
    pnl: number;
    trades: number;
    winRate: number | null;
  }> = [];

  let monthPnL = 0;
  let tradingDays = 0;

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(firstOfMonth);
    cellDate.setDate(1 - leadingBlanks + i);
    const inMonth = sameYM(cellDate, cursor);
    const key = cellDate.toISOString().slice(0, 10);
    const dayDeals = inMonth ? byDay.get(key) ?? [] : [];
    const pnl = dayDeals.reduce((s, d) => s + dealNet(d), 0);
    const trades = dayDeals.length;
    const wins = dayDeals.filter((d) => dealNet(d) > 0).length;
    const winRate = trades ? (wins / trades) * 100 : null;

    if (inMonth && trades) {
      tradingDays++;
      monthPnL += pnl;
    }

    daysArray.push({
      date: inMonth ? cellDate : null,
      key: `${key}-${i}`,
      pnl,
      trades,
      winRate,
    });
  }

  const nfMoney = (v: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: depositCurrency || "USD",
      maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
      notation: Math.abs(v) >= 10000 ? "compact" : "standard",
    }).format(v);

  const monthPnLChipColor =
    monthPnL > 0 ? "success" : monthPnL < 0 ? "error" : "default";

  const headerCell = {
    py: 0.75,
    textAlign: "center" as const,
    color: "text.secondary",
    fontSize: 12,
  };

  const TILE_HEIGHT = 90;

  const tileBase = {
    border: (th: any) => `1px solid ${th.palette.divider}`,
    borderRadius: "6px",
    p: 1,
    height: TILE_HEIGHT, // fixed height so all cells align
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    overflow: "hidden",
    transition: "transform .12s ease, box-shadow .12s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow:
        t.palette.mode === "dark"
          ? "0 8px 18px rgba(0,0,0,0.35)"
          : "0 10px 18px rgba(124,135,255,0.12)",
    },
  };

  const positiveBg = alpha(t.palette.success.main, 0.12);
  const neutralBg = alpha(t.palette.text.primary, 0.03);
  const todayKey = new Date().toISOString().slice(0, 10);

  // --- Weekly summaries: realistic calendar weeks that intersect the month ---
  const monthWeeks = React.useMemo(() => getMonthWeeks(cursor), [cursor]);

  // Helper to compute weekly aggregates from daysArray given week start/end
  function aggregateWeek(start: Date, end: Date) {
    // For each day in daysArray, if it's a date and within [start, end] AND in this month, include
    let wPnL = 0;
    let wTrades = 0;
    let daysWithTrades = 0;

    for (const d of daysArray) {
      if (!d.date) continue;
      const dt = d.date;
      // compare only by date (ignore time)
      const dtKey = dt.toISOString().slice(0, 10);
      const sKey = start.toISOString().slice(0, 10);
      const eKey = end.toISOString().slice(0, 10);
      if (dtKey >= sKey && dtKey <= eKey) {
        wPnL += d.pnl;
        wTrades += d.trades;
        if (d.trades > 0) daysWithTrades++;
      }
    }

    return { wPnL, wTrades, daysWithTrades };
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: "6px",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden", // calendar itself will not push horizontally
      }}
    >
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        {/* Left: month switcher */}
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            onClick={() =>
              setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
            size="small"
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mx: 1 }}>
            {monthTitle}
          </Typography>
          <IconButton
            onClick={() => setCursor(new Date())}
            size="small"
            sx={{ ml: 0.5 }}
          >
            <TodayRoundedIcon />
          </IconButton>
          <IconButton
            onClick={() =>
              setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
            size="small"
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        </Stack>

        {/* Right: monthly stats chips */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: { xs: 0.5, sm: 0 } }}
        >
          <Chip
            color={monthPnLChipColor as any}
            label={`Monthly stats: ${nfMoney(monthPnL)}`}
            size="small"
            sx={{ fontWeight: 700, maxWidth: "100%" }}
          />
          <Chip
            label={`${tradingDays} ${tradingDays === 1 ? "day" : "days"}`}
            size="small"
          />
        </Stack>
      </Stack>

      {/* Grid + right rail */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 3fr) minmax(0, 1.3fr)",
          },
          gap: 2,
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        {/* Calendar grid */}
        <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
          {/* Weekday header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 1,
              mb: 1,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Box key={d} sx={headerCell}>
                {d}
              </Box>
            ))}
          </Box>

          {/* Days grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 1,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            {daysArray.map((cell) => {
              const cellDateKey = cell.date
                ? cell.date.toISOString().slice(0, 10)
                : null;
              const isToday = cellDateKey === todayKey;
              const isSelected = cellDateKey === selectedDate;
              const isPositive = cell.pnl > 0;
              const hasTrades = cell.date && cell.trades > 0;

              let bg = "transparent";
              if (cell.date) {
                if (isSelected) {
                  bg = alpha(t.palette.primary.main, isDark ? 0.3 : 0.2);
                } else if (hasTrades) {
                  bg = isPositive ? positiveBg : neutralBg;
                } else {
                  bg = alpha(t.palette.text.primary, 0.02);
                }
              }

              const handleClick = () => {
                if (cell.date && onDateSelect) {
                  const dateKey = cell.date.toISOString().slice(0, 10);
                  if (selectedDate === dateKey) {
                    onDateSelect(null);
                  } else {
                    onDateSelect(dateKey);
                  }
                }
              };

              return (
                <Box key={cell.key} sx={{ position: "relative" }}>
                  <Box
                    onClick={handleClick}
                    sx={{
                      ...tileBase,
                      bgcolor: bg,
                      opacity: cell.date ? 1 : 0.4,
                      outline: isToday
                        ? `2px solid ${alpha(t.palette.primary.main, 0.9)}`
                        : isSelected
                        ? `2px solid ${t.palette.primary.main}`
                        : undefined,
                      outlineOffset: isToday || isSelected ? -2 : undefined,
                      cursor: cell.date ? "pointer" : "default",
                      "&:hover": cell.date
                        ? {
                            transform: "translateY(-2px)",
                            boxShadow:
                              t.palette.mode === "dark"
                                ? "0 8px 18px rgba(0,0,0,0.35)"
                                : "0 10px 18px rgba(124,135,255,0.15)",
                          }
                        : {},
                    }}
                  >
                    {/* Day number */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ alignSelf: "flex-end", fontSize: 11 }}
                    >
                      {cell.date ? cell.date.getDate() : ""}
                    </Typography>

                    {/* Content */}
                    {cell.date && cell.trades > 0 ? (
                      <Stack spacing={0.25}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 800,
                            color: isPositive ? "success.main" : undefined,
                            fontSize: { xs: 11, sm: 12 },
                            lineHeight: 1.2,
                            whiteSpace: "normal", // ✅ allow wrapping (no "$14..." cutoff)
                          }}
                        >
                          {nfMoney(cell.pnl)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: 10,
                            whiteSpace: "normal",
                          }}
                        >
                          {cell.trades} {cell.trades === 1 ? "trade" : "trades"}
                        </Typography>
                        {/* {cell.winRate !== null && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontSize: 10,
                              whiteSpace: "normal",
                            }}
                          >
                            {cell.winRate.toFixed(0)}%
                          </Typography>
                        )} */}
                      </Stack>
                    ) : (
                      <Box sx={{ flex: 1 }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Weekly summaries (right rail) */}
        <Stack spacing={1} sx={{ width: "100%", maxWidth: "100%" }}>
          {monthWeeks.map((wk, i) => {
            const { wPnL, wTrades, daysWithTrades } = aggregateWeek(
              wk.start,
              wk.end
            );

            // label like "Nov 30 — Dec 6" (and show year on ranges crossing years)
            const startLabel = formatMonthDay(wk.start, cursor.getFullYear());
            const endLabel = formatMonthDay(wk.end, cursor.getFullYear());

            return (
              <Paper
                key={`${wk.start.toISOString()}-${i}`}
                variant="outlined"
                sx={{ p: 1.25, borderRadius: "6px" }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mb: 0.5 }}
                >
                  <Typography variant="subtitle2" fontWeight={800}>
                    Week {i + 1} • {startLabel} — {endLabel}
                  </Typography>
                  <Tooltip title={`${wTrades} trades • ${daysWithTrades} days`}>
                    <Chip
                      size="small"
                      label={nfMoney(wPnL)}
                      color={
                        wPnL > 0 ? "success" : wPnL < 0 ? "error" : "default"
                      }
                      sx={{ fontWeight: 700 }}
                    />
                  </Tooltip>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {daysWithTrades} {daysWithTrades === 1 ? "day" : "days"}
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    </Paper>
  );
}
