"use client";

import DashboardView from "@/layouts/dashboard/DashboardView";
import { Box, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import * as React from "react";

import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import Billing from "../Billing";
import Profile from "../Profile";
import Security from "../Security";
import { CONFIG } from "../../../../global-config";
import { useUser } from "@/sections/auth/hooks/useUser";

type TabKey = "profile" | "security" | "billing";

const SETTINGS_TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Profile", icon: <PersonRoundedIcon /> },
  { key: "security", label: "Security", icon: <ShieldRoundedIcon /> },
  {
    key: "billing",
    label: "Payment",
    icon: <ReceiptLongRoundedIcon />,
  },
];

const isValidTab = (t: string | null): t is TabKey =>
  t === "profile" || t === "security" || t === "billing";

const SettingsView: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [tab, setTab] = React.useState<TabKey>("profile");
  const user = useUser();

  const filteredTabs = SETTINGS_TABS.filter((t) => {
    if (user?.role === "ADMIN" && t.key === "billing") {
      return false;
    }
    return true;
  });

  React.useEffect(() => {
    try {
      const url =
        typeof window !== "undefined" ? new URL(window.location.href) : null;
      const qp = url ? url.searchParams.get("tab") : null;
      const hash = url && url.hash ? url.hash.replace(/^#/, "") : null;

      const candidate = qp ?? hash ?? null;

      if (candidate && isValidTab(candidate)) {
        setTab(candidate);
        return;
      }
    } catch (err) {
      // ignore
    }
  }, []);

  return (
    <DashboardView sx={{ mb: 2 }}>
      {/* Page header */}
      <Stack spacing={0.75} mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your profile, security, and billing for {CONFIG.appName}.
        </Typography>
      </Stack>

      {/* Tabs + content */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "6px",
          border: `1px solid ${alpha(
            theme.palette.primary.main,
            isDark ? 0.35 : 0.15
          )}`,
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(145deg, #11121A 0%, #151728 100%)"
              : "linear-gradient(145deg, #FFFFFF 0%, #F4F5FF 100%)",
          overflow: "hidden",
        }}
      >
        {/* Tabs */}
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 0,
              "& .MuiTab-root": {
                minHeight: 0,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "6px",
                px: 1.75,
                py: 0.75,
                mr: 1,
                alignItems: "center",
                gap: 0.75,
              },
              "& .MuiTab-root.Mui-selected": {
                bgcolor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.18 : 0.12
                ),
              },
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            {filteredTabs.map((t) => (
              <Tab
                key={t.key}
                value={t.key}
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {t.icon}
                    <span>{t.label}</span>
                  </Stack>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Content */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {tab === "profile" && <Profile />}
          {tab === "security" && <Security />}
          {/* {tab === "billing" && <Billing />} */}
          {user?.role === "USER" && tab === "billing" && <Billing />}
        </Box>
      </Paper>
    </DashboardView>
  );
};

export default SettingsView;
