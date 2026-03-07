"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded"; // 👈 NEW ICON
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

type Status = "connected" | "disconnected";
type Platform = "cTrader" | "MT4" | "MT5";

export type AccountCardProps = {
  /** e.g. "$10,000" already formatted */
  balanceLabel: string;
  /** subtle line under balance (e.g. “Spotware • Multi • Hedged”) */
  subtitle?: string;
  /** e.g. "Forex" */
  instrumentTag?: string;
  /** "cTrader" | "MT4" | "MT5" */
  platform?: Platform;
  /** connection status */
  status?: Status;
  /** Account meta */
  meta?: {
    currency?: string;
    broker?: string;
    isLive?: boolean;
    positionMode?: string;
    connectedAt?: string; // ISO string
    lastSyncAt?: string; // ISO string
  };
  /** actions */
  onDashboard?: () => void;
  onJournal?: () => void;
  onAIReport?: () => void;
  onDisconnect?: () => void;
  /** right button label (when shown) */
  rightButtonLabel?: string;
};

export default function AccountCard({
  balanceLabel,
  subtitle = "You can connect Demo or Live",
  instrumentTag = "Forex",
  platform,
  status = "connected",
  meta,
  onDashboard,
  onJournal,
  onAIReport,
  onDisconnect,
  rightButtonLabel = "Sync",
}: AccountCardProps) {
  const t = useTheme();
  const isDark = t.palette.mode === "dark";

  // Subtle, brand-aware background that works in light mode too
  const bgLight = `linear-gradient(135deg,
    ${alpha(t.palette.primary.main, 0.1)} 0%,
    ${alpha(t.palette.primary.main, 0.06)} 60%,
    ${alpha(t.palette.primary.main, 0.04)} 100%)`;

  const bgDark = `linear-gradient(135deg,
    ${alpha(t.palette.primary.main, 0.32)} 0%,
    ${alpha(t.palette.primary.main, 0.18)} 55%,
    ${alpha(t.palette.primary.main, 0.12)} 100%)`;

  const borderColor = alpha(
    isDark ? t.palette.primary.main : t.palette.primary.main,
    isDark ? 0.25 : 0.18
  );

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        p: 2,
        borderRadius: "6px",
        background: isDark ? bgDark : bgLight,
        color: isDark ? "primary.contrastText" : "text.primary",
        border: `1px solid ${borderColor}`,
        boxShadow: isDark
          ? "0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "0 10px 24px rgba(124,135,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
        "&::after": {
          content: '""',
          position: "absolute",
          right: -42,
          top: -42,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: alpha(t.palette.primary.main, isDark ? 0.22 : 0.12),
          filter: "blur(24px)",
          pointerEvents: "none",
        },
      }}
    >
      <Stack spacing={1.75}>
        {/* Header: Balance + Badges */}
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AccountBalanceWalletRoundedIcon sx={{ opacity: 0.9 }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, color: "inherit", lineHeight: 1.15 }}
              >
                {balanceLabel}
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{ opacity: isDark ? 0.95 : 0.85, mt: 0.5 }}
            >
              {subtitle}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {platform && (
              <Chip
                size="small"
                label={platform}
                icon={<RocketLaunchRoundedIcon />}
                sx={{
                  bgcolor: "background.paper",
                  color: "text.primary",
                  fontWeight: 800,
                  borderRadius: "6px",
                }}
              />
            )}
            {/* {instrumentTag && (
              <Chip
                size="small"
                label={instrumentTag}
                icon={<TimelineRoundedIcon />}
                sx={{
                  bgcolor: "background.paper",
                  color: "text.primary",
                  fontWeight: 800,
                  borderRadius: "6px",
                }}
              />
            )} */}

            {/* Live / Demo badge from meta.isLive */}
            {/* <Chip
              size="small"
              label={meta?.isLive ? "Live" : "Demo"}
              color={meta?.isLive ? "success" : "default"}
              icon={<ShieldRoundedIcon />}
              sx={{
                fontWeight: 800,
                borderRadius: "6px",
                ...(meta?.isLive
                  ? {}
                  : {
                      bgcolor: isDark
                        ? alpha("#fff", 0.12)
                        : alpha(t.palette.text.primary, 0.06),
                    }),
              }}
            /> */}
          </Stack>
        </Stack>

        {/* Meta row */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{
            "& .pill": {
              px: 1.25,
              py: 0.75,
              borderRadius: "6px",
              bgcolor: isDark
                ? alpha("#fff", 0.14)
                : alpha(t.palette.primary.main, 0.08),
              border: `1px solid ${
                isDark
                  ? alpha("#fff", 0.2)
                  : alpha(t.palette.primary.main, 0.16)
              }`,
              fontSize: 12,
              lineHeight: 1,
            },
          }}
        >
          {meta?.broker && <Box className="pill">Broker: {meta.broker}</Box>}
          {meta?.currency && (
            <Box className="pill">Currency: {meta.currency}</Box>
          )}
          {meta?.positionMode && (
            <Box className="pill">Mode: {meta.positionMode}</Box>
          )}
          {typeof meta?.isLive === "boolean" && (
            <Box className="pill">{meta.isLive ? "Live" : "Demo"}</Box>
          )}
        </Stack>

        <Divider
          sx={{
            borderColor: alpha(isDark ? "#fff" : t.palette.primary.main, 0.25),
            my: 0.5,
          }}
        />

        {/* Actions */}
        <Box
          sx={{
            width: "100%",
            maxWidth: "100%", // ✅ never exceed parent
            overflowX: "hidden", // ✅ extra safety against scroll
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr", // 📱 phones: stack vertically
              sm: "repeat(3, 1fr)", // 💻 from sm up: 3 in one row
            },
            columnGap: 1,
            rowGap: { xs: 1, sm: 0 },
          }}
        >
          <Button
            onClick={onDashboard}
            variant="contained"
            startIcon={<InsightsRoundedIcon sx={{ fontSize: 18 }} />}
            fullWidth
            sx={{
              borderRadius: "6px",
              fontWeight: 800,
              boxShadow: "none",
              justifyContent: "center",
              textTransform: "none",
            }}
          >
            Dashboard
          </Button>

          <Button
            onClick={onJournal}
            variant="contained"
            startIcon={<BarChartRoundedIcon sx={{ fontSize: 18 }} />}
            fullWidth
            sx={{
              borderRadius: "6px",
              fontWeight: 800,
              boxShadow: "none",
              justifyContent: "center",
              textTransform: "none",
            }}
          >
            Journal
          </Button>

          <Button
            onClick={onAIReport}
            variant="contained"
            startIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />}
            fullWidth
            sx={{
              borderRadius: "6px",
              fontWeight: 800,
              boxShadow: "none",
              justifyContent: "center",
              textTransform: "none",
            }}
          >
            AI Report
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
