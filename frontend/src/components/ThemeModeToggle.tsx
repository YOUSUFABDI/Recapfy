"use client"

import * as React from "react"
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material"
import LaptopRounded from "@mui/icons-material/LaptopRounded"
import LightModeRounded from "@mui/icons-material/LightModeRounded"
import DarkModeRounded from "@mui/icons-material/DarkModeRounded"
import CheckRounded from "@mui/icons-material/CheckRounded"
import { useThemeMode } from "@/context/theme-mode-provider"
import { useMounted } from "@/hooks/useMounted"
import { alpha } from "@mui/material/styles"

type ModeSetting = "system" | "light" | "dark"

const OPTIONS: Array<{
  key: ModeSetting
  label: string
  Icon: React.ElementType
}> = [
  { key: "system", label: "System", Icon: LaptopRounded },
  { key: "light", label: "Light", Icon: LightModeRounded },
  { key: "dark", label: "Dark", Icon: DarkModeRounded },
]

export default function ThemeModeMenuButton() {
  const mounted = useMounted()
  const { setting, setSetting, mode } = useThemeMode()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  // ✅ On server (not mounted), show a neutral, stable icon to avoid SSR/CSR diff
  const ButtonIcon = !mounted
    ? LaptopRounded
    : mode === "dark"
    ? DarkModeRounded
    : mode === "light"
    ? LightModeRounded
    : LaptopRounded

  return (
    <>
      <Tooltip
        title={`Theme${
          setting === "system" && mounted ? ` (now ${mode})` : ""
        }`}
      >
        <IconButton
          aria-label="Theme"
          aria-haspopup="menu"
          aria-controls={open ? "theme-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="small"
          sx={(t) => ({
            // border + radius
            border: `1px solid ${alpha(t.palette.divider, 0.9)}`,
            borderRadius: "6px", // <- change to your preferred radius (px) or t.shape.borderRadius
            // background + hover
            bgcolor: t.palette.background.paper,
            "&:hover": {
              bgcolor: t.palette.action.hover,
              borderColor: alpha(t.palette.text.primary, 0.25),
            },
            // focus ring for a11y
            "&:focus-visible": {
              outline: `2px solid ${alpha(t.palette.primary.main, 0.5)}`,
              outlineOffset: 2,
            },
            // keep size tight
            width: 32,
            height: 32,
          })}
        >
          <ButtonIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        MenuListProps={{ dense: true }}
        PaperProps={{ sx: { borderRadius: "6px" } }}
      >
        {OPTIONS.map(({ key, label, Icon }) => {
          const selected = key === setting
          const secondary =
            key === "system" && mounted ? `Follows OS (now ${mode})` : undefined
          return (
            <MenuItem
              key={key}
              selected={selected}
              onClick={() => {
                setSetting(key)
                setAnchorEl(null)
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} secondary={secondary} />
              {selected ? <CheckRounded fontSize="small" /> : null}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
