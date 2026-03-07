"use client";

import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { dashboardLinks } from "@/layouts/nav-config-dashboard";
import { mainDashboardLinks } from "@/layouts/nav-config-main-dashboard";
import RoleGuard from "@/sections/auth/guards/role-guard";
import { useUser } from "@/sections/auth/hooks/useUser";
import DashboardPageView from "@/sections/dashboard/view/dashboard-view";
import React, { JSX } from "react";

const SIDEBAR_WIDTH = 280;

export default function DashboardPage(): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const user = useUser();

  const linksToShow =
    user && user.role === "USER" ? dashboardLinks : mainDashboardLinks;

  return (
    <RoleGuard roles="ADMIN">
      <DashboardLayout
        links={linksToShow}
        width={SIDEBAR_WIDTH}
        openMobile={open}
        onOpenMobile={() => setOpen(true)}
        onCloseMobile={() => setOpen(false)}
      >
        <DashboardPageView />
      </DashboardLayout>
    </RoleGuard>
  );
}
