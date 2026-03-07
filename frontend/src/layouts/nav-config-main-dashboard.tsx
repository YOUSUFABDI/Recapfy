import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded"; // 👈 New Import
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";

export type NavLink = { href: string; label: string; icon: React.ReactNode };

export const mainDashboardLinks: NavLink[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <DashboardRoundedIcon />,
  },
  {
    href: "/dashboard/user",
    label: "User",
    icon: <PeopleRoundedIcon />,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: <SettingsRoundedIcon />,
  },
];
