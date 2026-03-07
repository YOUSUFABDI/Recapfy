"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material"
import { alpha } from "@mui/material/styles"
import * as React from "react"

type Props = {
  href: string
  icon: React.ReactNode
  label: string
  compact?: boolean
  onClick?: () => void // <-- so mobile drawer can close after nav
}

export default function NavItem({
  href,
  icon,
  label,
  compact,
  onClick,
}: Props) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <ListItemButton
      component={Link}
      href={href}
      selected={active}
      onClick={onClick}
      sx={(t) => ({
        borderRadius: "6px",
        px: 1,
        py: compact ? 0.75 : 1,
        color: active ? t.palette.primary.main : t.palette.text.primary,
        "&.Mui-selected": {
          bgcolor: alpha(
            t.palette.primary.main,
            t.palette.mode === "dark" ? 0.16 : 0.12
          ),
          "&:hover": {
            bgcolor: alpha(
              t.palette.primary.main,
              t.palette.mode === "dark" ? 0.22 : 0.16
            ),
          },
        },
      })}
    >
      <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{ fontWeight: active ? 800 : 600 }}
      />
    </ListItemButton>
  )
}
