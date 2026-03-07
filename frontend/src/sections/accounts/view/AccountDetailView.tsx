"use client";

import toast from "@/components/toast/toast";
import DashboardView from "@/layouts/dashboard/DashboardView";
import { useManualRefreshConnectionMutation } from "@/store/platform/ctrader";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import AccountDashboard from "../AccountDashboard";
import { useAccountDetail } from "../hooks/use-account-detail";
import TradingJournal from "../TradingJournal";
import AIReport from "../AIReport";
import Loading from "@/components/LoadingScreen";

type Props = { accountId: string };

// Add a type for tab values including AI report
type TabValue = 0 | 1 | 2;

export default function AccountDetailView({ accountId }: Props) {
  const t = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = React.useState<TabValue>(() => {
    const param = searchParams.get("tab");
    if (param === "journal") return 1;
    if (param === "ai" || param === "ai-report") return 2;
    return 0;
  });

  const { accountDetail, isLoading, error, refetch } =
    useAccountDetail(accountId);

  const [manualRefresh, { isLoading: isRefreshing }] =
    useManualRefreshConnectionMutation();

  const handleSync = async () => {
    try {
      // refresh the *connection* (refresh token + nudge background sync)
      const connectionId = accountDetail?.account?.connectionId;
      if (connectionId) {
        await manualRefresh({ connectionId }).unwrap();
      }
      // force a refetch after a short delay to let backend update
      setTimeout(() => refetch(), 800);
      toast.success("Sync triggered");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to sync account");
    }
  };

  if (isLoading) {
    return (
      <DashboardView>
        <Loading />
      </DashboardView>
    );
  }

  if (error || !accountDetail) {
    return (
      <DashboardView>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6" color="error" gutterBottom>
            Failed to load account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error
              ? "Account not found or error occurred"
              : "No data available"}
          </Typography>
          <Button variant="outlined" onClick={() => router.back()}>
            Go Back
          </Button>
        </Paper>
      </DashboardView>
    );
  }

  // Normalize possibly-null numeric fields for UI & strict child props
  const a = accountDetail.account;
  const safeCurrency = a.depositCurrency || "USD";
  const safeBalance = typeof a.balance === "number" ? a.balance : 0;
  const safeEquity = typeof a.equity === "number" ? a.equity : safeBalance;

  const isDark = t.palette.mode === "dark";

  const bg = isDark
    ? `linear-gradient(135deg,
        ${alpha(t.palette.primary.main, 0.28)} 0%,
        ${alpha(t.palette.primary.main, 0.16)} 55%,
        ${alpha(t.palette.primary.main, 0.12)} 100%)`
    : `linear-gradient(135deg,
        ${alpha(t.palette.primary.main, 0.1)} 0%,
        ${alpha(t.palette.primary.main, 0.06)} 60%,
        ${alpha(t.palette.primary.main, 0.04)} 100%)`;

  const border = `1px solid ${alpha(
    t.palette.primary.main,
    isDark ? 0.25 : 0.18,
  )}`;

  const normalizedDetail = {
    ...accountDetail,
    account: {
      ...a,
      balance: safeBalance,
      equity: safeEquity,
      depositCurrency: safeCurrency,
    },
  };

  return (
    <DashboardView>
      <Stack spacing={2}>
        {/* Top bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              aria-label="Go back"
              onClick={() => router.back()}
              sx={{
                border: (th) => `1px solid ${th.palette.divider}`,
                borderRadius: "6px",
              }}
            >
              <ArrowBackRoundedIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={900}>
              Account: {a.platformAccountId}
            </Typography>
          </Stack>

          {/* Optional sync button commented out */}
        </Box>

        {/* Hero summary */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "6px",
            background: bg,
            border,
            color: isDark ? "primary.contrastText" : "text.primary",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <WalletRoundedIcon sx={{ fontSize: 28 }} />
                <Typography variant="h5" fontWeight={900}>
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: safeCurrency,
                  }).format(safeBalance)}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{ opacity: isDark ? 0.95 : 0.85, ml: 4 }}
              >
                Equity{" "}
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: safeCurrency,
                }).format(safeEquity)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                icon={<LanguageRoundedIcon />}
                label={a.brokerName || "Unknown"}
                sx={{
                  fontWeight: 800,
                  bgcolor: "background.paper",
                  color: "text.primary",
                  borderRadius: "6px",
                }}
              />
              <Chip
                size="small"
                icon={<QueryStatsRoundedIcon />}
                label={`${a.instrumentCategory || "N/A"} • ${
                  a.positionMode || "N/A"
                }`}
                sx={{
                  fontWeight: 800,
                  bgcolor: "background.paper",
                  color: "text.primary",
                  borderRadius: "6px",
                }}
              />
              <Chip
                size="small"
                icon={<ShieldRoundedIcon />}
                label={a.isLive ? "Live" : "Demo"}
                color={a.isLive ? "success" : "default"}
                sx={{
                  fontWeight: 800,
                  borderRadius: "6px",
                  ...(a.isLive
                    ? {}
                    : {
                        bgcolor: isDark
                          ? alpha("#fff", 0.12)
                          : alpha(t.palette.text.primary, 0.06),
                      }),
                }}
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Tabs */}
        <Paper elevation={0} sx={{ p: 1, borderRadius: "6px" }}>
          <Tabs
            value={tab}
            onChange={(_, v: TabValue) => setTab(v)}
            aria-label="account tabs"
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            sx={{
              "& .MuiTab-root": {
                fontWeight: 600,
                textTransform: "none",
                minHeight: 48,
              },
            }}
          >
            <Tab label="Dashboard" />
            <Tab label="Trading Journal" />
            <Tab label="AI Report" />
          </Tabs>

          <Divider sx={{ mb: 2, mt: 1 }} />

          <Box hidden={tab !== 0} role="tabpanel" aria-label="Dashboard">
            <AccountDashboard accountDetail={normalizedDetail as any} />
          </Box>

          <Box hidden={tab !== 1} role="tabpanel" aria-label="Trading Journal">
            <TradingJournal
              deals={accountDetail.deals}
              positions={accountDetail.positions}
              depositCurrency={safeCurrency}
            />
          </Box>

          <Box hidden={tab !== 2} role="tabpanel" aria-label="AI Report">
            {/* identifier is the same value you used for the page param */}
            <AIReport identifier={accountId} traderName={a.traderLogin} />
          </Box>
        </Paper>
      </Stack>
    </DashboardView>
  );
}
