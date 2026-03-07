"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import * as React from "react";
import JournalCalendar from "./JournalCalendar";

type Deal = {
  dealId: number;
  orderId: number;
  positionId: number;
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
    entryPrice: number;
    closedVolume: number;
  };
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  duration: number;
  stopLoss: number;
  takeProfit: number;
};

type Position = {
  positionId: number;
  tradeData: {
    symbol: string;
    volume: number;
    tradeSide: number;
    openTimestamp: number;
  };
  price: number;
  swap: number;
  commission: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  floatingPnl?: number | null;
};

type Props = {
  deals: Deal[];
  positions: Position[];
  depositCurrency: string;
};

/** Calculate net PnL for a closed deal */
function calculateDealPnL(deal: Deal): number {
  if (!deal.closePositionDetail) return 0;
  const grossProfit = deal.closePositionDetail.grossProfit ?? 0;
  const swap = deal.closePositionDetail.swap ?? 0;
  const commission = deal.closePositionDetail.commission ?? 0;
  return grossProfit + swap + commission;
}

/** Group deals by date */
function groupDealsByDate(deals: Deal[]) {
  const map = new Map<string, Deal[]>();
  deals.forEach((deal) => {
    const date = new Date(deal.executionTimestamp);
    const key = date.toISOString().slice(0, 10);
    const arr = map.get(key) || [];
    arr.push(deal);
    map.set(key, arr);
  });
  return map;
}

/** Commission helper: prefer closePositionDetail.commission, fallback to deal.commission */
function getCommissionFee(deal: Deal): number {
  const raw =
    typeof deal?.closePositionDetail?.commission === "number"
      ? deal.closePositionDetail.commission
      : typeof deal?.commission === "number"
        ? deal.commission
        : 0;
  return Math.abs(raw);
}

export default function TradingJournal({
  deals,
  positions,
  depositCurrency,
}: Props) {
  console.log("deals", deals);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Mobiles + tablets use card layout for history
  const isCompactScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const dealsByDate = React.useMemo(() => groupDealsByDate(deals), [deals]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: depositCurrency || "USD",
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
      notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    }).format(value);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const selectedDateDeals = selectedDate
    ? dealsByDate.get(selectedDate) || []
    : [];

  // Sort deals by execution timestamp (newest first)
  const sortedDeals = [...deals].sort(
    (a, b) => b.executionTimestamp - a.executionTimestamp,
  );

  // Statistics
  const closedDeals = deals.filter((d) => d.closePositionDetail);
  const totalPnL = closedDeals.reduce((sum, d) => sum + calculateDealPnL(d), 0);
  const winningTrades = closedDeals.filter((d) => calculateDealPnL(d) > 0);
  const losingTrades = closedDeals.filter((d) => calculateDealPnL(d) < 0);

  const selectedDayPnL = selectedDateDeals.reduce(
    (sum, d) => sum + calculateDealPnL(d),
    0,
  );

  const selectedDateLabel =
    selectedDate &&
    new Date(selectedDate).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleCloseSelectedDateModal = () => {
    setSelectedDate(null);
  };

  const [activeTab, setActiveTab] = React.useState<"history" | "open">(
    "history",
  );

  return (
    <>
      {/* Selected Date Summary as BLUR MODAL */}
      <Dialog
        open={Boolean(selectedDate && selectedDateDeals.length > 0)}
        onClose={handleCloseSelectedDateModal}
        fullWidth
        maxWidth="sm"
        BackdropProps={{
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: alpha(
              theme.palette.background.default,
              isDark ? 0.85 : 0.75,
            ),
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: "6px",
            border: `1px solid ${alpha(
              theme.palette.primary.main,
              isDark ? 0.4 : 0.25,
            )}`,
            backgroundImage: `linear-gradient(135deg, ${alpha(
              theme.palette.background.paper,
              0.98,
            )}, ${alpha(theme.palette.primary.main, isDark ? 0.14 : 0.08)})`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ color: "text.secondary", textTransform: "uppercase" }}
            >
              Daily Summary
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: 16, sm: 18 } }}
            >
              {selectedDateLabel}
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseSelectedDateModal}
            size="small"
            sx={{
              ml: 1,
              borderRadius: "999px",
              border: `1px solid ${alpha(
                theme.palette.divider,
                isDark ? 0.6 : 0.4,
              )}`,
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 2.5 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${selectedDateDeals.length} Trades`}
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`P&L: ${formatCurrency(selectedDayPnL)}`}
                color={selectedDayPnL >= 0 ? "success" : "error"}
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            {/* Small list of trades for that day */}
            <Stack spacing={1.25} mt={1}>
              {selectedDateDeals.map((d) => {
                const pnl = calculateDealPnL(d);
                return (
                  <Box
                    key={d.dealId}
                    sx={{
                      borderRadius: "6px",
                      border: `1px solid ${alpha(
                        theme.palette.divider,
                        isDark ? 0.7 : 0.5,
                      )}`,
                      px: 1.5,
                      py: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                    }}
                  >
                    <Stack spacing={0.25}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, fontSize: 13 }}
                      >
                        {d.symbol}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        {d.tradeSide === 1 ? "BUY" : "SELL"} ·{" "}
                        {formatDate(d.entryTime)}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={formatCurrency(pnl)}
                      color={pnl >= 0 ? "success" : "error"}
                      sx={{ fontWeight: 700, fontSize: 11, height: 24 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* MAIN JOURNAL CONTENT */}
      <Stack
        spacing={3}
        sx={{
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {/* Calendar */}
        <JournalCalendar
          deals={deals}
          depositCurrency={depositCurrency}
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
        />

        {/* Overall Statistics */}
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
          <Card
            elevation={0}
            sx={{
              borderRadius: "6px",
              background: isDark
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(
                theme.palette.success.main,
                isDark ? 0.2 : 0.15,
              )}`,
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Total P&L
                </Typography>
                <Typography variant="h5" fontWeight={900} color="success.main">
                  {formatCurrency(totalPnL)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
          <Card
            elevation={0}
            sx={{
              borderRadius: "6px",
              background: isDark
                ? alpha(theme.palette.primary.main, 0.1)
                : alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(
                theme.palette.primary.main,
                isDark ? 0.2 : 0.15,
              )}`,
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Total Trades
                </Typography>
                <Typography variant="h5" fontWeight={900} color="primary.main">
                  {closedDeals.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
          <Card
            elevation={0}
            sx={{
              borderRadius: "6px",
              background: isDark
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(
                theme.palette.success.main,
                isDark ? 0.2 : 0.15,
              )}`,
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Winning Trades
                </Typography>
                <Typography variant="h5" fontWeight={900} color="success.main">
                  {winningTrades.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
          <Card
            elevation={0}
            sx={{
              borderRadius: "6px",
              background: isDark
                ? alpha(theme.palette.error.main, 0.1)
                : alpha(theme.palette.error.main, 0.05),
              border: `1px solid ${alpha(
                theme.palette.error.main,
                isDark ? 0.2 : 0.15,
              )}`,
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Losing Trades
                </Typography>
                <Typography variant="h5" fontWeight={900} color="error.main">
                  {losingTrades.length}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Trade History / Open Trades */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "6px",
            border: `1px solid ${alpha(
              theme.palette.primary.main,
              isDark ? 0.15 : 0.1,
            )}`,
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              pt: 2.5,
              pb: 0,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              aria-label="trading journal tabs"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab
                label="Trade History"
                value="history"
                sx={{ textTransform: "none", fontWeight: 600 }}
              />
              <Tab
                label="Open Trades"
                value="open"
                sx={{ textTransform: "none", fontWeight: 600 }}
              />
            </Tabs>
          </Box>

          {activeTab === "history" ? (
            isCompactScreen ? (
              // 📱 Mobiles + tablets (<= md): card layout, no horizontal scroll
              <Stack spacing={1.5} sx={{ p: 1.5 }}>
                {sortedDeals.map((deal, idx) => {
                  const pnl = calculateDealPnL(deal);
                  const isClosed = !!deal.closePositionDetail;

                  return (
                    <Card
                      key={deal.dealId}
                      elevation={0}
                      sx={{
                        borderRadius: "6px",
                        border: `1px solid ${alpha(
                          theme.palette.primary.main,
                          isDark ? 0.12 : 0.08,
                        )}`,
                      }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                #{idx + 1}
                              </Typography>
                              <Chip
                                label={deal.symbol}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip
                                label={deal.tradeSide === 1 ? "BUY" : "SELL"}
                                size="small"
                                color={
                                  deal.tradeSide === 1 ? "success" : "error"
                                }
                                sx={{ fontWeight: 700 }}
                              />
                            </Stack>
                            {isClosed ? (
                              <Chip
                                label={formatCurrency(pnl)}
                                size="small"
                                color={pnl >= 0 ? "success" : "error"}
                                icon={
                                  pnl >= 0 ? (
                                    <TrendingUpRoundedIcon
                                      sx={{ fontSize: 16 }}
                                    />
                                  ) : (
                                    <TrendingDownRoundedIcon
                                      sx={{ fontSize: 16 }}
                                    />
                                  )
                                }
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Open
                              </Typography>
                            )}
                          </Stack>

                          <Divider />

                          <Stack spacing={0.5}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Opened
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(deal.entryTime)}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              Closed
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(deal.exitTime)}
                            </Typography>
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={2}
                            flexWrap="wrap"
                            sx={{ mt: 1 }}
                          >
                            <Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Entry / Exit
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {deal.entryPrice} → {deal.exitPrice}
                              </Typography>
                            </Stack>

                            <Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Lots
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {deal.quantity}
                              </Typography>
                            </Stack>

                            <Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Commission
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(getCommissionFee(deal))}
                              </Typography>
                            </Stack>

                            <Stack>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Duration
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {deal.duration}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              // 💻 Desktop (md+): table WITH its own horizontal scrollbar
              <TableContainer
                sx={{
                  width: "100%",
                  maxWidth: "100%",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 960,
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>NO.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Symbol</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Opened</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Closed</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Entry P</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Exit P</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Lots
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Commission
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Duration
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        P&L
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDeals.map((deal, idx) => {
                      const pnl = calculateDealPnL(deal);
                      const isClosed = !!deal.closePositionDetail;

                      return (
                        <TableRow
                          key={deal.dealId}
                          sx={{
                            "&:hover": {
                              bgcolor: alpha(
                                theme.palette.primary.main,
                                isDark ? 0.05 : 0.02,
                              ),
                            },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2"># {idx + 1}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={deal.symbol}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={deal.tradeSide === 1 ? "BUY" : "SELL"}
                              size="small"
                              color={deal.tradeSide === 1 ? "success" : "error"}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(deal.entryTime)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(deal.exitTime)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {deal.entryPrice}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {deal.exitPrice}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {deal.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(getCommissionFee(deal))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {deal.duration}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {isClosed ? (
                              <Chip
                                label={formatCurrency(pnl)}
                                size="small"
                                color={pnl >= 0 ? "success" : "error"}
                                icon={
                                  pnl >= 0 ? (
                                    <TrendingUpRoundedIcon
                                      sx={{ fontSize: 14 }}
                                    />
                                  ) : (
                                    <TrendingDownRoundedIcon
                                      sx={{ fontSize: 14 }}
                                    />
                                  )
                                }
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Open
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : isCompactScreen ? (
            // 📱 Mobiles + tablets (<= md): card layout for open trades
            <Stack spacing={1.5} sx={{ p: 1.5 }}>
              {positions.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic" }}
                >
                  No open trades at the moment.
                </Typography>
              ) : (
                positions.map((pos, idx) => (
                  <Card
                    key={pos.positionId}
                    elevation={0}
                    sx={{
                      borderRadius: "6px",
                      border: `1px solid ${alpha(
                        theme.palette.primary.main,
                        isDark ? 0.12 : 0.08,
                      )}`,
                    }}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Stack spacing={1}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              #{idx + 1}
                            </Typography>
                            <Chip
                              label={pos.tradeData.symbol}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                            <Chip
                              label={
                                pos.tradeData.tradeSide === 1 ? "BUY" : "SELL"
                              }
                              size="small"
                              color={
                                pos.tradeData.tradeSide === 1
                                  ? "success"
                                  : "error"
                              }
                              sx={{ fontWeight: 700 }}
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(pos.tradeData.volume)}
                          </Typography>
                        </Stack>

                        <Divider />

                        <Stack
                          direction="row"
                          spacing={2}
                          flexWrap="wrap"
                          sx={{ mt: 1 }}
                        >
                          <Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Opened
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(pos.tradeData.openTimestamp)}
                            </Typography>
                          </Stack>

                          <Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Entry P
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {pos.price}
                            </Typography>
                          </Stack>

                          <Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Lots
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {(
                                pos.tradeData.volume / 10_000_000
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 3,
                              })}
                            </Typography>
                          </Stack>

                          <Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Commission
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(pos.commission)}
                            </Typography>
                          </Stack>
                          <Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              P/L
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={
                                typeof pos.floatingPnl === "number"
                                  ? pos.floatingPnl >= 0
                                    ? "success.main"
                                    : "error.main"
                                  : "text.secondary"
                              }
                            >
                              {typeof pos.floatingPnl === "number"
                                ? formatCurrency(pos.floatingPnl)
                                : "-"}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          ) : (
            // 💻 Desktop (md+): open trades table, matching history style
            <TableContainer
              sx={{
                width: "100%",
                maxWidth: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 960,
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>NO.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Symbol</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Opened</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Entry P</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Lots
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Commission
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Stop Loss
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Take Profit
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          No open trades at the moment.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    positions.map((pos, idx) => (
                      <TableRow
                        key={pos.positionId}
                        sx={{
                          "&:hover": {
                            bgcolor: alpha(
                              theme.palette.primary.main,
                              isDark ? 0.05 : 0.02,
                            ),
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2"># {idx + 1}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pos.tradeData.symbol}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              pos.tradeData.tradeSide === 1 ? "BUY" : "SELL"
                            }
                            size="small"
                            color={
                              pos.tradeData.tradeSide === 1
                                ? "success"
                                : "error"
                            }
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(pos.tradeData.openTimestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {pos.price}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {pos.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(pos.commission)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {pos.stopLoss ?? "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {pos.takeProfit ?? "-"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>
    </>
  );
}
