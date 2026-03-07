// "use client"

// import * as React from "react"
// import { Box, Paper } from "@mui/material"
// import { alpha, useTheme } from "@mui/material/styles"

// type Variant = "brand" | "lime" | "aqua" | "blue"

// export default function BrandPanel({
//   children,
//   variant = "brand",
//   sx,
// }: {
//   children: React.ReactNode
//   variant?: Variant
//   sx?: object
// }) {
//   const t = useTheme()
//   const isDark = t.palette.mode === "dark"

//   // Accent colors for the pill/border. Brand pulls from theme.
//   const accents = {
//     brand: t.palette.primary.main, // your #7C87FF
//     blue: "#4CA6FF",
//     lime: "#C1FF72", // like the screenshot’s yellow/green
//     aqua: "#7CFFAF",
//   } as const

//   const accent = accents[variant]

//   // Subtle panel base using current theme backgrounds, so it works in light/dark.
//   // We tint with the accent to get that soft, saturated card feel.
//   const bgFrom = isDark ? t.palette.background.paper : "#FFFFFF"
//   const bgTo = isDark ? t.palette.background.default : "#F8F9FF"

//   return (
//     <Paper
//       sx={{
//         p: 2.5,
//         borderRadius: "6px", // ≈24px
//         // layered gradients: accent tint + base
//         background: `
//           linear-gradient(135deg, ${alpha(
//             accent,
//             isDark ? 0.22 : 0.18
//           )} 0%, ${alpha(accent, 0.06)} 100%),
//           linear-gradient(180deg, ${bgFrom}, ${bgTo})
//         `,
//         border: `1px solid ${alpha(accent, 0.35)}`,
//         boxShadow: isDark
//           ? "0 10px 24px rgba(0,0,0,.35)"
//           : "0 8px 20px rgba(16,24,40,.08)",
//         // allow extra sx overrides per-card
//         ...sx,
//       }}
//     >
//       {children}
//     </Paper>
//   )
// }

"use client"

import * as React from "react"
import { Paper } from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"

type Variant = "brand" | "soft"

export default function BrandPanel({
  children,
  variant = "brand",
  sx,
}: {
  children: React.ReactNode
  variant?: Variant
  sx?: object
}) {
  const t = useTheme()
  const isDark = t.palette.mode === "dark"
  const accent = t.palette.primary.main

  // stronger vs softer accent tint
  const tintTop = variant === "brand" ? 0.22 : 0.12
  const tintBottom = variant === "brand" ? 0.07 : 0.04

  const bgFrom = isDark ? t.palette.background.paper : "#FFFFFF"
  const bgTo = isDark ? t.palette.background.default : "#F8F9FF"

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: `6px`,
        background: `
          linear-gradient(135deg, ${alpha(accent, tintTop)} 0%, ${alpha(
          accent,
          tintBottom
        )} 100%),
          linear-gradient(180deg, ${bgFrom}, ${bgTo})
        `,
        border: `1px solid ${alpha(accent, isDark ? 0.35 : 0.25)}`,
        boxShadow: isDark
          ? "0 10px 24px rgba(0,0,0,.35)"
          : "0 8px 20px rgba(16,24,40,.08)",
        ...sx,
      }}
    >
      {children}
    </Paper>
  )
}
