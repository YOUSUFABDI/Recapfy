"use client";

import toast from "@/components/toast/toast";
import DashboardView from "@/layouts/dashboard/DashboardView";
import { useAccounts } from "@/sections/accounts/hooks/use-accounts";
import { useUser } from "@/sections/auth/hooks/useUser";
import ConnectedPlatformCard from "@/sections/connect/ConnectedPlatformCard";
import QuickConnectCard from "@/sections/connect/QuickConnectCard";
import { useCurrentPlan } from "@/sections/settings/hooks/use-current-plan";
import { selectAuthToken } from "@/store";
import { API } from "@/store/api";
import {
  useDeleteConnectionMutation,
  useManualRefreshConnectionMutation,
  useRenameConnectionMutation,
} from "@/store/platform/ctrader";
import type { AccountDT } from "@/types/account";
import { EditRounded, PowerSettingsNewRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { CONFIG } from "../../../../global-config";
import { useConnections } from "../hooks/use-connections";

type RenameTarget = {
  id: string;
  currentLabel: string | null;
  title: string;
};

type AccountLabel =
  | string
  | {
      broker?: string;
      isLive?: boolean;
      login?: string;
      label?: string;
      onClick?: () => void;
      _key?: string;
    };

function accountToLabel(acc: AccountDT, onClick: () => void): AccountLabel {
  return {
    _key: String(acc.platformAccountId),
    broker: acc.brokerName ?? "Broker",
    isLive: acc.isLive,
    login: acc.traderLogin ?? String(acc.platformAccountId),
    label: `${acc.brokerName ?? "Broker"} · ${acc.isLive ? "Live" : "Demo"} · ${
      acc.traderLogin ?? acc.platformAccountId
    }`,
    onClick,
  };
}

// ===============================
// Disconnect Dialog State Type
// ===============================
type DisconnectTarget = {
  id: string;
  title: string;
  subtitle: string;
  accountCount: number;
  liveCount: number;
  demoCount: number;
};

export default function ConnectView() {
  const router = useRouter();
  const params = useSearchParams();

  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const token = useSelector(selectAuthToken);
  const user = useUser();
  // console.log("user", user);
  const { currentPlan } = useCurrentPlan();
  // console.log("currentPlan", currentPlan);
  const ranToastRef = useRef(false);

  // Fetch all connections
  const { data: connections = [], isLoading: isConnLoading } = useConnections();

  // Fetch all accounts (across connections) once; we’ll split client-side
  const { data: accounts = [], isLoading: isAccLoading } = useAccounts();

  const [deleteConnection] = useDeleteConnectionMutation();
  const [manualRefresh] = useManualRefreshConnectionMutation();
  const [renameConnection] = useRenameConnectionMutation();

  // New: state for disconnect dialog
  const [disconnectTarget, setDisconnectTarget] =
    useState<DisconnectTarget | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const byConn = useMemo(() => {
    const map = new Map<string, AccountDT[]>();
    for (const a of accounts) {
      if (!map.has(a.connectionId)) map.set(a.connectionId, []);
      map.get(a.connectionId)!.push(a);
    }
    // sort in each bucket: live first, then login
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return (a.traderLogin ?? "").localeCompare(b.traderLogin ?? "");
      });
    }
    return map;
  }, [accounts]);

  const startCTraderConnect = () => {
    const hasPlan = !!currentPlan?.plan;
    const hasManualAccess = !!user?.hasAccess;
    if (!hasPlan && !hasManualAccess) {
      toast.error(
        "Upgrade to a paid plan or contact support to access this feature.",
      );
      return;
    }
    if (!token) {
      router.push("/auth/login?next=/dashboard/connect");
      return;
    }

    // const isBasic = currentPlan && currentPlan.plan.code === "BASIC";
    // // If Basic plan AND they already have 1 (or more) connections, stop them.
    // if (isBasic && connections.length >= 1) {
    //   toast.error(
    //     "Basic plan is limited to 1 connection. Upgrade to Pro for unlimited connections."
    //   );
    //   return;
    // }
    if (hasPlan && !hasManualAccess) {
      const isBasic = currentPlan.plan.code === "BASIC";
      if (isBasic && connections.length >= 1) {
        toast.error(
          "Basic plan is limited to 1 connection. Upgrade to Pro for more.",
        );
        return;
      }
    }
    window.location.href = `${API}/platform/connect/ct?token=${token}`;
  };

  // 🔥 NEW: instead of window.confirm, open a beautiful dialog
  const handleDisconnectClick = (target: DisconnectTarget) => {
    setDisconnectTarget(target);
  };

  const handleCloseDisconnectDialog = () => {
    if (isDisconnecting) return;
    setDisconnectTarget(null);
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      setIsDisconnecting(true);
      await deleteConnection({
        connectionId: disconnectTarget.id,
        purgeAccounts: true,
        purgeTrades: true,
      }).unwrap();
      setDisconnectTarget(null);
    } catch (e) {
      console.error("disconnect err", e);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = async (connectionId: string) => {
    try {
      await manualRefresh({ connectionId }).unwrap();
    } catch (e) {
      console.error("refresh err", e);
    }
  };

  const openRenameDialog = (conn: any, title: string) => {
    setRenameTarget({ id: conn.id, currentLabel: conn.label ?? null, title });
    setRenameValue(conn.label ?? "");
  };

  const closeRenameDialog = () => {
    if (isRenaming) return;
    setRenameTarget(null);
  };

  const handleRename = async (connectionId: string, current: string | null) => {
    const next = window.prompt(
      "Rename this connection (leave empty to clear):",
      current ?? "",
    );
    if (next === null) return;
    try {
      await renameConnection({
        connectionId,
        label: next || null,
      }).unwrap();
      // polling will pick it up; no reload needed
    } catch (e) {
      console.error("rename err", e);
    }
  };

  const confirmRename = async () => {
    if (!renameTarget) return;

    const v = renameValue.trim();
    try {
      setIsRenaming(true);
      await renameConnection({
        connectionId: renameTarget.id,
        label: v ? v : null,
      }).unwrap();
      toast.success("Renamed successfully");
      setRenameTarget(null);
    } catch (e) {
      console.error("rename err", e);
      toast.error("Failed to rename");
    } finally {
      setIsRenaming(false);
    }
  };

  const firstName = useMemo(() => {
    const raw = (user?.name ?? "").trim();
    if (!raw) return "Trader"; // fallback
    // handle extra spaces & "Last, First" format
    const hasComma = raw.includes(",");
    const cleaned = raw.replace(/[()"'’]+/g, "").replace(/,+/g, " ");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return "Trader";
    return hasComma ? parts[parts.length - 1] : parts[0];
  }, [user?.name]);

  const loading = isConnLoading || isAccLoading;

  useEffect(() => {
    if (ranToastRef.current) return;

    const ctrader = params.get("ctrader");
    if (!ctrader) return;

    ranToastRef.current = true; // ✅ guard after we know there is a ctrader param

    const msg = params.get("msg");

    if (ctrader === "denied") {
      toast.info("Connection cancelled. You can try again anytime.");
    } else if (ctrader === "oauth_error") {
      toast.error(
        `cTrader OAuth error${msg ? `: ${decodeURIComponent(msg)}` : ""}`,
      );
    } else if (ctrader === "missing_code") {
      toast.error("cTrader callback missing authorization code.");
    } else if (ctrader === "missing_ctx") {
      toast.error("Connection session expired. Please try connecting again.");
    } else if (ctrader === "failed") {
      toast.error("Failed to connect cTrader. Please try again.");
    }

    router.replace("/dashboard/connect");
  }, [params, router]);

  return (
    <DashboardView sx={{ mb: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          mb: 1,
          borderBottom: (t) => `1px dashed ${t.palette.divider}`,
          py: "3px",
        }}
      >
        <Typography variant="subtitle2">Welcome, {firstName}!</Typography>
        {/* <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <CalendarTodayRounded />
          <NowStamp />
        </Box> */}
      </Box>

      {/* Quick connect */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 2,
          gridAutoRows: { xs: "auto", md: "1fr" },
          "& > *": { height: "100%" },
        }}
      >
        <Box>
          <QuickConnectCard
            logo="/CT_logo.png"
            title="Connect cTrader"
            description="Connect your cTrader Demo or Live account to auto-sync trades, orders, and positions for instant journaling and analytics."
            BtnText="Connect New cTrader Platform"
            onGoConnect={startCTraderConnect}
          />
        </Box>
        <Box>
          <QuickConnectCard
            logo="/MT4_logo.avif"
            title="Connect MT4"
            description="Connect your MT4 Demo or Live account to auto-sync trades, orders, and positions for instant journaling and analytics."
            BtnText="Connect New MT4 Platform"
            comingSoon
          />
        </Box>
        <Box>
          <QuickConnectCard
            logo="/MT5_logo.png"
            title="Connect MT5"
            description="Connect your MT5 Demo or Live account to auto-sync trades, orders, and positions for instant journaling and analytics."
            BtnText="Connect New MT5 Platform"
            comingSoon
          />
        </Box>
      </Box>

      {/* Connected Platforms — one card PER connection */}
      {connections.length > 0 && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ mb: "10px", flex: 1 }}
            >
              Connected Platforms
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gridAutoRows: { xs: "auto", md: "1fr" },
              "& > *": { height: "100%" },
            }}
          >
            {connections.map((conn) => {
              const accs = byConn.get(conn.id) ?? [];
              const liveCount = accs.filter((x) => x.isLive).length;
              const demoCount = accs.filter((x) => !x.isLive).length;

              const title = `cTrader — ${
                conn.label ?? conn.spotwareUsername ?? conn.id.slice(0, 8)
              }`;
              const subtitle =
                accs.length === 1
                  ? "1 account"
                  : `Accounts: ${accs.length} · ${liveCount} Live · ${demoCount} Demo`;

              const labels: AccountLabel[] = accs.map((a) =>
                accountToLabel(a, () =>
                  router.push(`/dashboard/accounts/${a.platformAccountId}`),
                ),
              );

              return (
                <Box key={conn.id} sx={{ position: "relative" }}>
                  {/* Action icons (optional) */}
                  <Box
                    sx={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
                  >
                    {/* <Tooltip title="Refresh connection (token & snapshot)">
                        <IconButton
                          size="small"
                          onClick={() => handleRefresh(conn.id)}
                          sx={{ bgcolor: "rgba(255,255,255,.18)" }}
                        >
                          <ReplayRounded fontSize="small" />
                        </IconButton>
                      </Tooltip> */}
                    <Tooltip title="Rename">
                      <IconButton
                        size="small"
                        onClick={() =>
                          // handleRename(conn.id, conn.label ?? null)
                          openRenameDialog(conn, title)
                        }
                        sx={{ ml: 0.5, bgcolor: "rgba(255,255,255,.18)" }}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <ConnectedPlatformCard
                    title={title}
                    subtitle={subtitle}
                    accounts={labels}
                    data={accs}
                    onDisconnectAll={() =>
                      handleDisconnectClick({
                        id: conn.id,
                        title,
                        subtitle,
                        accountCount: accs.length,
                        liveCount,
                        demoCount,
                      })
                    }
                  />
                </Box>
              );
            })}
          </Box>
        </Stack>
      )}

      {/* ================================
          Disconnect Confirmation Dialog
          ================================ */}
      <Dialog
        open={!!disconnectTarget}
        onClose={handleCloseDisconnectDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: (t) => ({
            borderRadius: "6px",
            overflow: "hidden",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
            background: `radial-gradient(circle at 0% 0%, ${alpha(
              t.palette.primary.main,
              0.28,
            )}, transparent 60%), ${t.palette.background.paper}`,
          }),
        }}
      >
        <Box
          sx={(t) => ({
            px: 2.5,
            pt: 2,
            pb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            background: `linear-gradient(135deg, ${alpha(
              t.palette.primary.main,
              0.25,
            )}, ${alpha(t.palette.primary.main, 0.6)})`,
            color: t.palette.common.white,
          })}
        >
          <Box
            sx={(t) => ({
              width: 36,
              height: 36,
              borderRadius: "999px",
              border: `1px solid ${alpha(t.palette.common.white, 0.4)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
            })}
          >
            <PowerSettingsNewRounded fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              noWrap
              title="Disconnect cTrader connection"
            >
              Disconnect this platform?
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, display: "block" }}
              noWrap
            >
              This will remove all accounts & trades synced via this connection.
            </Typography>
          </Box>
        </Box>

        {disconnectTarget && (
          <>
            <DialogContent sx={{ pt: 2, pb: 1.5 }}>
              <Stack spacing={1.75}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 0.5 }}
                  >
                    {disconnectTarget.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={(t) => ({ color: t.palette.text.secondary })}
                  >
                    {disconnectTarget.subtitle}
                  </Typography>
                </Box>

                <Box
                  sx={(t) => ({
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    p: 1.25,
                    borderRadius: "6px",
                    border: `1px solid ${alpha(t.palette.primary.main, 0.25)}`,
                    backgroundColor: alpha(t.palette.primary.main, 0.04),
                  })}
                >
                  <Chip
                    size="small"
                    label={`Accounts: ${disconnectTarget.accountCount}`}
                    sx={{ borderRadius: "999px" }}
                  />
                  <Chip
                    size="small"
                    label={`Live: ${disconnectTarget.liveCount}`}
                    color="success"
                    sx={{ borderRadius: "999px" }}
                  />
                  <Chip
                    size="small"
                    label={`Demo: ${disconnectTarget.demoCount}`}
                    color="info"
                    sx={{ borderRadius: "999px" }}
                  />
                </Box>

                <Box
                  sx={(t) => ({
                    mt: 0.5,
                    p: 1.25,
                    borderRadius: "6px",
                    backgroundColor: alpha(t.palette.error.main, 0.06),
                    border: `1px solid ${alpha(t.palette.error.main, 0.28)}`,
                  })}
                >
                  <Typography
                    variant="body2"
                    sx={(t) => ({
                      color: t.palette.error.main,
                      fontWeight: 600,
                    })}
                  >
                    This action is permanent.
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={(t) => ({ color: t.palette.text.secondary, mt: 0.25 })}
                  >
                    Once disconnected, all accounts, open positions, and history
                    synced from this connection will be removed from your{" "}
                    {CONFIG.appName} workspace. Your broker account itself is
                    not affected.
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>

            <Divider sx={{ opacity: 0.5 }} />

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button
                onClick={handleCloseDisconnectDialog}
                disabled={isDisconnecting}
                sx={{ borderRadius: "6px", px: 2.5 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                color="error"
                variant="contained"
                startIcon={
                  !isDisconnecting ? <PowerSettingsNewRounded /> : undefined
                }
                sx={{
                  borderRadius: "6px",
                  px: 2.5,
                  fontWeight: 700,
                  minWidth: 180,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                {isDisconnecting ? (
                  <>
                    <CircularProgress size={16} sx={{ color: "inherit" }} />
                    Disconnecting…
                  </>
                ) : (
                  "Disconnect & purge"
                )}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={!!renameTarget}
        onClose={closeRenameDialog}
        maxWidth="xs"
        fullWidth
        BackdropProps={{
          sx: {
            backdropFilter: "blur(10px)",
            backgroundColor: alpha("#000", 0.45),
          },
        }}
        PaperProps={{
          sx: (t) => ({
            borderRadius: "6px",
            overflow: "hidden",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
            background: `radial-gradient(circle at 0% 0%, ${alpha(
              t.palette.primary.main,
              0.22,
            )}, transparent 60%), ${t.palette.background.paper}`,
          }),
        }}
      >
        <Box
          sx={(t) => ({
            px: 2.5,
            pt: 2,
            pb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            background: `linear-gradient(135deg, ${alpha(
              t.palette.primary.main,
              0.25,
            )}, ${alpha(t.palette.primary.main, 0.6)})`,
            color: t.palette.common.white,
          })}
        >
          <Box
            sx={(t) => ({
              width: 36,
              height: 36,
              borderRadius: "999px",
              border: `1px solid ${alpha(t.palette.common.white, 0.4)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
            })}
          >
            <EditRounded fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              Rename connection
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, display: "block" }}
              noWrap
            >
              Set a friendly label (or leave empty to clear)
            </Typography>
          </Box>
        </Box>

        {renameTarget && (
          <>
            <DialogContent sx={{ pt: 2, pb: 1.5 }}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {renameTarget.title}
                </Typography>

                <TextField
                  autoFocus
                  fullWidth
                  label="Connection label"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="e.g. My Main cTrader"
                  disabled={isRenaming}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename();
                  }}
                />

                <Typography
                  variant="caption"
                  sx={(t) => ({ color: t.palette.text.secondary })}
                >
                  Tip: Use something like “Funded”, “Swing”, “Scalping”, etc.
                </Typography>
              </Stack>
            </DialogContent>

            <Divider sx={{ opacity: 0.5 }} />

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button
                onClick={closeRenameDialog}
                disabled={isRenaming}
                sx={{ borderRadius: "6px", px: 2.5 }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRename}
                disabled={isRenaming}
                variant="contained"
                startIcon={!isRenaming ? <EditRounded /> : undefined}
                sx={{
                  borderRadius: "6px",
                  px: 2.5,
                  fontWeight: 700,
                  minWidth: 150,
                }}
              >
                {isRenaming ? (
                  <>
                    <CircularProgress size={16} sx={{ color: "inherit" }} />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </DashboardView>
  );
}
