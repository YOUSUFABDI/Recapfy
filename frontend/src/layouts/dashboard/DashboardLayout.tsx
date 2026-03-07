"use client";

import SignOutButton from "@/components/SignOutButton";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import * as React from "react";
import { NavLink } from "../nav-config-dashboard";
import Logo from "./Logo";
import NavSection from "./NavSection";
import UserInfoCard from "./UserInfoCard";
import { useLogout } from "@/sections/auth/hooks/useLogout";
import { useUser } from "@/sections/auth/hooks/useUser";
import dynamic from "next/dynamic";
import PricingModal from "@/components/PricingModal";
import { useCurrentPlan } from "@/sections/settings/hooks/use-current-plan";
import UpgradePlanCard from "@/components/UpgradePlanCard";

const ThemeModeToggle = dynamic(() => import("@/components/ThemeModeToggle"), {
  ssr: false,
  loading: () => (
    <span style={{ display: "inline-block", width: 32, height: 32 }} />
  ),
});

type Props = {
  links?: NavLink[];
  onEditProfile?: () => void;
  width?: number;
  /** Mobile/Tablet drawer state, controlled by parent */
  openMobile?: boolean;
  onOpenMobile?: () => void;
  onCloseMobile?: () => void;
  /** Dashboard page content */
  children: React.ReactNode;
};

export default function DashboardLayout({
  links,
  onEditProfile,
  width = 280,
  openMobile = false,
  onOpenMobile,
  onCloseMobile,
  children,
}: Props) {
  const theme = useTheme();
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 4 });
  const user = useUser();
  const { currentPlan } = useCurrentPlan();
  const [pricingOpen, setPricingOpen] = React.useState(false);

  const planCode = String((currentPlan as any)?.plan?.code ?? "").toUpperCase();
  const isBasic = planCode === "BASIC";
  const isPro = planCode === "PRO";
  const showUpgradeButton =
    !isPro && !user?.hasAccess && user?.role !== "ADMIN";
  const upgradeLabel = isBasic
    ? "Upgrade to Pro"
    : "Get started with paid plan";

  const glassBg = alpha(
    theme.palette.background.paper,
    theme.palette.mode === "dark" ? 0.4 : 0.7,
  );

  const sidebarContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        px: 2,
        py: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo />
        <ThemeModeToggle />
      </Box>

      <UserInfoCard user={user} onEdit={onEditProfile} />
      <Divider />
      <Stack spacing={1} sx={{ flex: 1 }}>
        <NavSection links={links} onAnyNavClick={onCloseMobile} />
      </Stack>

      {showUpgradeButton && (
        <UpgradePlanCard
          label={upgradeLabel}
          variant={isBasic ? "contained" : "outlined"}
          onClick={() => setPricingOpen(true)}
          subtitle={
            isBasic
              ? "Move to Pro to unlock AI Report + more."
              : "Pick a paid plan to unlock premium features."
          }
        />
      )}

      <SignOutButton onSignOut={useLogout()} />
    </Box>
  );

  return (
    <>
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        {/* Desktop permanent sidebar */}
        <Box
          component="aside"
          sx={{
            display: { xs: "none", lg: "block" },
            width,
            flexShrink: 0,
            height: "100dvh",
            position: "sticky",
            top: 0,
            borderRight: (t) => `1px dashed ${t.palette.divider}`,
            bgcolor: (t) => t.palette.background.paper,
          }}
        >
          {sidebarContent}
        </Box>

        {/* Mobile/Tablet drawer */}
        <Drawer
          open={!!openMobile}
          onClose={onCloseMobile}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              borderRadius: "1px",
              width,
              borderRight: (t) => `1px dashed ${t.palette.divider}`,
              paddingBottom: "env(safe-area-inset-bottom)",
              // bgcolor: (t) => t.palette.background.paper,
            },
          }}
        >
          {sidebarContent}
        </Drawer>

        {/* Right column: sticky AppBar on mobile/tablet + Main */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <AppBar
            position="sticky" // stays at top while scrolling (not fixed)
            color="transparent"
            elevation={scrolled ? 1 : 0}
            sx={{
              borderRadius: "1px",
              display: { xs: "block", lg: "none" }, // hide on desktop
              backgroundColor: glassBg,
              width: "100%",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              transition:
                "background-color .2s ease, box-shadow .2s ease, border-color .2s ease",
            }}
          >
            <Toolbar sx={{ gap: 1 }}>
              <IconButton
                edge="start"
                onClick={onOpenMobile}
                aria-label="Open sidebar"
              >
                <MenuRoundedIcon />
              </IconButton>
              {/* Add optional mobile title/actions here */}
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flex: 1,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>

      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        currentPlan={currentPlan ?? null}
        onPlanUpdated={async () => {
          // optional: you can refresh plan data if your hook supports refetch
          // or just rely on normal app refresh behavior
        }}
      />
    </>
  );
}
