"use client";

import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  Paper,
  Stack,
  Typography,
  Chip,
  LinearProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";

type Deal = {
  dealId: number;
  executionTimestamp: number;
  symbol: string;
  tradeSide: number; // 1 = buy, 2 = sell
  executionPrice: number;
  volume: number;
  commission: number;
  closePositionDetail?: {
    grossProfit: number;
    swap: number;
    commission: number;
  };
};

type Position = {
  positionId: number;
  tradeData: {
    symbol: string;
    volume: number;
    tradeSide: number;
  };
  price: number;
  swap: number;
  commission: number;
};

type AccountDetail = {
  account: {
    balance: number;
    equity: number;
    depositCurrency: string;
  };
  deals: Deal[];
  positions: Position[];
  counts: { deals: number; positions: number };
};

type Props = {
  accountDetail: AccountDetail;
};

/** Calculate net PnL for a closed deal - CORRECT calculation */
function calculateDealPnL(deal: Deal): number {
  if (!deal.closePositionDetail) return 0;
  // Net PnL = Gross Profit + Swap + Commission (commission is usually negative, so we add it)
  const grossProfit = deal.closePositionDetail.grossProfit ?? 0;
  const swap = deal.closePositionDetail.swap ?? 0;
  const commission = deal.closePositionDetail.commission ?? 0;
  // Commission is typically negative, so adding it is correct
  return grossProfit + swap + commission;
}

export default function AccountDashboard({ accountDetail }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { deals, positions, account } = accountDetail;

  // Calculate statistics
  const closedDeals = deals.filter((d) => d.closePositionDetail);
  const totalPnL = closedDeals.reduce((sum, d) => sum + calculateDealPnL(d), 0);
  const winningTrades = closedDeals.filter((d) => calculateDealPnL(d) > 0);
  const losingTrades = closedDeals.filter((d) => calculateDealPnL(d) < 0);
  const winRate =
    closedDeals.length > 0
      ? (winningTrades.length / closedDeals.length) * 100
      : 0;

  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, d) => sum + calculateDealPnL(d), 0) /
        winningTrades.length
      : 0;

  const avgLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((sum, d) => sum + calculateDealPnL(d), 0) /
        losingTrades.length
      : 0;

  const profitFactor =
    avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

  // Calculate total volume traded
  const totalVolume = deals.reduce((sum, d) => sum + (d.volume || 0), 0);

  // Calculate total commission paid (only count once per deal, prefer closePositionDetail)
  const totalCommission = deals.reduce((sum, d) => {
    if (
      d.closePositionDetail?.commission !== null &&
      d.closePositionDetail?.commission !== undefined
    ) {
      return sum + Math.abs(d.closePositionDetail.commission);
    }
    return sum + Math.abs(d.commission || 0);
  }, 0);

  // Calculate open positions PnL (unrealized)
  const openPositionsPnL = positions.reduce((sum, pos) => {
    // Simplified: using current price vs entry price
    // In reality, you'd need current market price
    return sum + (pos.swap || 0) + (pos.commission || 0);
  }, 0);

  // Group deals by symbol
  const dealsBySymbol = new Map<string, { count: number; pnl: number }>();
  closedDeals.forEach((deal) => {
    const symbol = deal.symbol || "Unknown";
    const existing = dealsBySymbol.get(symbol) || { count: 0, pnl: 0 };
    dealsBySymbol.set(symbol, {
      count: existing.count + 1,
      pnl: existing.pnl + calculateDealPnL(deal),
    });
  });

  // Get top 5 symbols by PnL
  const topSymbols = Array.from(dealsBySymbol.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 5);

  // Calculate daily PnL for last 30 days
  const dailyPnL = new Map<string, number>();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  closedDeals
    .filter((d) => d.executionTimestamp >= thirtyDaysAgo)
    .forEach((deal) => {
      const date = new Date(deal.executionTimestamp);
      const key = date.toISOString().slice(0, 10);
      dailyPnL.set(key, (dailyPnL.get(key) || 0) + calculateDealPnL(deal));
    });

  const currency = account.depositCurrency || "USD";
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
      notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    }).format(value);

  const StatCard = ({
    title,
    value,
    icon,
    color = "primary",
    trend,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: "primary" | "success" | "error" | "warning";
    trend?: { value: number; label: string };
  }) => {
    const colorMap = {
      primary: theme.palette.primary.main,
      success: theme.palette.success.main,
      error: theme.palette.error.main,
      warning: theme.palette.warning.main,
    };

    return (
      <Card
        elevation={0}
        sx={{
          height: "100%",
          background: isDark
            ? `linear-gradient(135deg, ${alpha(
                colorMap[color],
                0.15
              )} 0%, ${alpha(colorMap[color], 0.05)} 100%)`
            : `linear-gradient(135deg, ${alpha(
                colorMap[color],
                0.08
              )} 0%, ${alpha(colorMap[color], 0.03)} 100%)`,
          border: `1px solid ${alpha(colorMap[color], isDark ? 0.2 : 0.15)}`,
          borderRadius: "6px",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: `0 8px 24px ${alpha(colorMap[color], 0.2)}`,
          },
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: "6px",
                  bgcolor: alpha(colorMap[color], isDark ? 0.2 : 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </Box>
              {trend && (
                <Chip
                  size="small"
                  label={trend.label}
                  color={trend.value >= 0 ? "success" : "error"}
                  icon={
                    trend.value >= 0 ? (
                      <TrendingUpRoundedIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <TrendingDownRoundedIcon sx={{ fontSize: 16 }} />
                    )
                  }
                  sx={{ height: 24, fontSize: "0.7rem" }}
                />
              )}
            </Stack>
            <Typography variant="h4" fontWeight={900} color={colorMap[color]}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Stack spacing={3}>
      {/* Key Metrics Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <StatCard
          title="Total P&L"
          value={formatCurrency(totalPnL)}
          icon={
            <AttachMoneyRoundedIcon
              sx={{ color: theme.palette.primary.main }}
            />
          }
          color={totalPnL >= 0 ? "success" : "error"}
        />
        <StatCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          icon={
            <ShowChartRoundedIcon sx={{ color: theme.palette.success.main }} />
          }
          color="success"
          trend={{
            value: winRate - 50,
            label: `${winRate >= 50 ? "+" : ""}${(winRate - 50).toFixed(1)}%`,
          }}
        />
        <StatCard
          title="Profit Factor"
          value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
          icon={
            <BarChartRoundedIcon sx={{ color: theme.palette.warning.main }} />
          }
          color="warning"
        />
        <StatCard
          title="Total Trades"
          value={closedDeals.length}
          icon={
            <AssessmentRoundedIcon sx={{ color: theme.palette.primary.main }} />
          }
          color="primary"
        />
      </Box>

      {/* Secondary Metrics */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        <Box>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "6px",
              border: `1px solid ${alpha(
                theme.palette.primary.main,
                isDark ? 0.15 : 0.1
              )}`,
              background: isDark
                ? alpha(theme.palette.primary.main, 0.05)
                : alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <Stack spacing={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                Trade Statistics
              </Typography>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    Winning Trades
                  </Typography>
                  <Chip
                    label={winningTrades.length}
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    Losing Trades
                  </Typography>
                  <Chip
                    label={losingTrades.length}
                    color="error"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    Avg Win
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="success.main"
                  >
                    {formatCurrency(avgWin)}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    Avg Loss
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="error.main"
                  >
                    {formatCurrency(avgLoss)}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Box>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "6px",
              border: `1px solid ${alpha(
                theme.palette.primary.main,
                isDark ? 0.15 : 0.1
              )}`,
              background: isDark
                ? alpha(theme.palette.primary.main, 0.05)
                : alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <Stack spacing={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                Account Metrics
              </Typography>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    Open Positions
                  </Typography>
                  <Chip
                    label={positions.length}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    Total Commission
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.secondary"
                  >
                    {formatCurrency(totalCommission)}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Box>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "6px",
              border: `1px solid ${alpha(
                theme.palette.primary.main,
                isDark ? 0.15 : 0.1
              )}`,
              background: isDark
                ? alpha(theme.palette.primary.main, 0.05)
                : alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <Stack spacing={2}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                Top Performing Symbols
              </Typography>
              <Stack spacing={1}>
                {topSymbols.length > 0 ? (
                  topSymbols.map(([symbol, data]) => (
                    <Stack
                      key={symbol}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 0.5 }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {symbol}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {data.count} trades
                        </Typography>
                        <Chip
                          label={formatCurrency(data.pnl)}
                          size="small"
                          color={data.pnl >= 0 ? "success" : "error"}
                          sx={{ fontWeight: 700, height: 22 }}
                        />
                      </Stack>
                    </Stack>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 1 }}
                  >
                    No closed trades yet
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Performance Visualization */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "6px",
          border: `1px solid ${alpha(
            theme.palette.primary.main,
            isDark ? 0.15 : 0.1
          )}`,
          background: isDark
            ? alpha(theme.palette.primary.main, 0.05)
            : alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>
            Performance Overview
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Win Rate Progress
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {winRate.toFixed(1)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={winRate}
                sx={{
                  height: 8,
                  borderRadius: "6px",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "& .MuiLinearProgress-bar": {
                    bgcolor:
                      winRate >= 50
                        ? theme.palette.success.main
                        : theme.palette.error.main,
                    borderRadius: "6px",
                  },
                }}
              />
            </Box>
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Profit Factor
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min((profitFactor / 3) * 100, 100)}
                sx={{
                  height: 8,
                  borderRadius: "6px",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "& .MuiLinearProgress-bar": {
                    bgcolor:
                      profitFactor >= 1.5
                        ? theme.palette.success.main
                        : profitFactor >= 1
                        ? theme.palette.warning.main
                        : theme.palette.error.main,
                    borderRadius: "6px",
                  },
                }}
              />
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
