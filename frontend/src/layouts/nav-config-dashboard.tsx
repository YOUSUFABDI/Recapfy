import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";

export type NavLink = { href: string; label: string; icon: React.ReactNode };

export const dashboardLinks: NavLink[] = [
  {
    href: "/dashboard/connect",
    label: "Connect Platform",
    icon: <LinkRoundedIcon />,
  },
  {
    href: "/dashboard/accounts",
    label: "Accounts",
    icon: <InsightsRoundedIcon />,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: <SettingsRoundedIcon />,
  },
];
