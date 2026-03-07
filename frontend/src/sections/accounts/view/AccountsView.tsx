"use client";

import * as React from "react";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Stack,
  Button,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardView from "@/layouts/dashboard/DashboardView";
import AccountCard from "@/sections/accounts/AccountCard";
import { useAccounts } from "@/sections/accounts/hooks/use-accounts";
import type { AccountDT } from "@/types/account";

// ---------- Helpers ----------
const currencyFormatter = (
  amount: number | null | undefined,
  currency: string | null | undefined,
) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

type Platform = "all" | "cTrader" | "MT4" | "MT5";

// decide platform
const detectPlatform = (_a: AccountDT): "cTrader" => "cTrader";

// quick utility for the summary line
function getLastUpdated(accounts: AccountDT[]) {
  if (!accounts.length) return null;

  // Sort by the most recent activity to show the latest sync time
  const latest = accounts
    .map((a) => +new Date(a.lastSyncAt || a.connectedAt))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];

  if (!latest) return null;

  const d = new Date(latest);
  // Added seconds to the timestamp so you can visually verify updates
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

// Map API → Card props
function toCardProps(a: AccountDT) {
  const platform = detectPlatform(a);
  const balanceLabel = currencyFormatter(a.balance, a.depositCurrency);
  const subtitle = [
    a.brokerName || "Unknown",
    a.depositCurrency || "USD",
    a.instrumentCategory || "Multi",
    a.positionMode || "—",
  ].join(" • ");
  return {
    balanceLabel,
    subtitle,
    instrumentTag: "Forex",
    platform,
    status: "connected" as const,
    meta: {
      broker: a.brokerName || "Unknown",
      currency: a.depositCurrency ?? undefined,
      isLive: a.isLive,
      positionMode: a.positionMode ?? undefined,
      connectedAt: a.connectedAt ?? undefined,
      lastSyncAt: a.lastSyncAt ?? undefined,
    },
  };
}

// ---------- View ----------
export default function AccountsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") || "all") as
    | "all"
    | "connected"
    | "disconnected";

  // ✅ Live data hook
  const { data: accountsApi, isLoading, refetch } = useAccounts();

  const [platformFilter, setPlatformFilter] = useState<Platform>("all");

  const handlePlatformFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPlatform: Platform | null,
  ) => newPlatform && setPlatformFilter(newPlatform);

  const handleDashboard = (id?: string | number | bigint) => {
    router.push(`/dashboard/accounts/${id}`);
  };

  const handleJournal = (id?: string | number | bigint) => {
    if (id) {
      router.push(`/dashboard/accounts/${id}?tab=journal`);
    }
  };
  const handleAIReport = (id?: string | number | bigint) => {
    if (id) {
      router.push(`/dashboard/accounts/${id}?tab=ai-report`);
    }
  };

  const handleSync = (_id?: string) => {
    // Placeholder for manual sync logic
  };

  // Filter using live data
  const filteredAccounts = useMemo(() => {
    let out = [...(accountsApi || [])];
    if (platformFilter !== "all") {
      out = out.filter((a) => detectPlatform(a) === platformFilter);
    }
    if (activeTab === "connected") {
      out = out;
    } else if (activeTab === "disconnected") {
      out = [];
    }
    return out;
  }, [accountsApi, platformFilter, activeTab]);

  // Platforms present
  const platformsPresent = useMemo(() => {
    const set = new Set<Exclude<Platform, "all">>();
    filteredAccounts.forEach((a) => set.add(detectPlatform(a)));
    return Array.from(set);
  }, [filteredAccounts]);

  const count = filteredAccounts.length;
  const lastUpdated = getLastUpdated(filteredAccounts);

  return (
    <DashboardView sx={{ mb: 2 }}>
      {/* Title */}
      <Stack spacing={2.5} sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          Your Accounts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your connected trading accounts, view balances, and access
          journal analytics.
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              Accounts ({count})
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {count > 0
                ? lastUpdated
                  ? `${count} in sync • Last sync ${lastUpdated}`
                  : `${count} in sync`
                : "No accounts yet"}
            </Typography>
          </Box>

          <ToggleButtonGroup
            value={platformFilter}
            exclusive
            onChange={handlePlatformFilterChange}
            aria-label="platform filter"
            size="small"
            sx={{ borderRadius: "6px" }}
          >
            <ToggleButton
              sx={{ borderRadius: "6px" }}
              value="all"
              aria-label="all platforms"
            >
              All
            </ToggleButton>

            {/* Show only platforms that exist */}
            {(["cTrader", "MT4", "MT5"] as const)
              .filter((p) => p === "cTrader" || platformsPresent.includes(p))
              .map((p) => (
                <ToggleButton
                  sx={{ borderRadius: "6px" }}
                  key={p}
                  value={p}
                  aria-label={p.toLowerCase()}
                >
                  {p}
                </ToggleButton>
              ))}
          </ToggleButtonGroup>
        </Box>

        {/* Grid */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(2, 1fr)",
            },
            "& > *": { height: "100%" },
          }}
        >
          {filteredAccounts.map((a) => {
            const card = toCardProps(a);
            return (
              <Box key={a.id}>
                <AccountCard
                  {...card}
                  onDashboard={() => handleDashboard(a.platformAccountId)}
                  onJournal={() => handleJournal(a.platformAccountId)}
                  onAIReport={() => handleAIReport(a.platformAccountId)}
                  onDisconnect={() => handleSync(a.id)}
                />
              </Box>
            );
          })}

          {!isLoading && count === 0 && (
            <Box
              sx={{
                gridColumn: { xs: "1", md: "1 / -1" },
                p: 4,
                textAlign: "center",
                border: (t) => `1px dashed ${t.palette.divider}`,
                borderRadius: "6px",
              }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                No accounts found
              </Typography>
              <Button
                sx={{ borderRadius: "6px" }}
                variant="contained"
                onClick={() => router.push("/dashboard/connect")}
              >
                Connect Platform
              </Button>
            </Box>
          )}
        </Box>
      </Stack>
    </DashboardView>
  );
}
