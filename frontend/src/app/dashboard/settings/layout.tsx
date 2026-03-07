"use client";

import Loading from "@/components/LoadingScreen";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { dashboardLinks } from "@/layouts/nav-config-dashboard";
import { mainDashboardLinks } from "@/layouts/nav-config-main-dashboard";
import RoleGuard from "@/sections/auth/guards/role-guard";
import { useUser } from "@/sections/auth/hooks/useUser";
import * as React from "react";

const SIDEBAR_WIDTH = 280;

export default function Dashboard({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const user = useUser();

  const linksToShow =
    user && user.role === "USER" ? dashboardLinks : mainDashboardLinks;
  const allowedRoles = ["USER", "ADMIN"] as const;

  return (
    <RoleGuard roles={allowedRoles} fallback="/unauthorized">
      <DashboardLayout
        links={linksToShow}
        width={SIDEBAR_WIDTH}
        openMobile={open}
        onOpenMobile={() => setOpen(true)}
        onCloseMobile={() => setOpen(false)}
      >
        {children}
      </DashboardLayout>
    </RoleGuard>
  );
}
