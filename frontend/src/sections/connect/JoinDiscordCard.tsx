"use client"

import { Box, Button, Stack, Typography, SvgIcon } from "@mui/material"
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded"
import { alpha, useTheme } from "@mui/material/styles"
import BrandPanel from "../../components/_shared/BrandPanel"

function DiscordIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M20.317 4.369A19.791 19.791 0 0 0 16.558 3c-.2.35-.43.82-.59 1.197a18.27 18.27 0 0 0-7.936 0A8.82 8.82 0 0 0 7.44 3 19.86 19.86 0 0 0 3.68 4.37C1.536 7.43.89 10.39 1.095 13.31a19.88 19.88 0 0 0 6.073 3.08c.47-.66.89-1.37 1.25-2.12a11.62 11.62 0 0 1-1.97-.94c.17-.13.34-.27.5-.41 3.81 1.78 7.93 1.78 11.7 0 .17.14.34.28.5.41-.63.37-1.29.68-1.97.94.36.74.78 1.45 1.26 2.12a19.83 19.83 0 0 0 6.06-3.08c.25-3.5-.59-6.44-2.14-8.94ZM9.68 12.43c-.91 0-1.65-.83-1.65-1.85 0-1.02.74-1.85 1.65-1.85.92 0 1.66.83 1.66 1.85 0 1.02-.74 1.85-1.66 1.85Zm4.64 0c-.91 0-1.65-.83-1.65-1.85 0-1.02.74-1.85 1.65-1.85.92 0 1.66.83 1.66 1.85 0 1.02-.74 1.85-1.66 1.85Z" />
    </SvgIcon>
  )
}

export default function JoinDiscordCard() {
  const t = useTheme()
  const ACCENT = t.palette.primary.main

  return (
    <BrandPanel variant="soft" sx={{ height: "100%" }}>
      <Stack spacing={2} sx={{ height: "100%" }}>
        {/* icon pill */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `6px`,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(ACCENT, 0.18),
            border: `1px solid ${alpha(ACCENT, 0.35)}`,
          }}
        >
          <DiscordIcon sx={{ fontSize: 22, color: ACCENT }} />
        </Box>

        <Typography variant="h5" fontWeight={800}>
          Join Our Discord
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color:
              t.palette.mode === "dark"
                ? alpha(t.palette.common.white, 0.85)
                : t.palette.text.secondary,
          }}
        >
          Connect with a community of 15,000 traders who share their knowledge
          daily.
        </Typography>

        {/* flex spacer to push button down */}
        <Box sx={{ flex: 1 }} />

        <Box sx={{ mt: 0.5, borderTop: `1px solid ${alpha(ACCENT, 0.2)}` }} />

        <Button
          variant="outlined"
          endIcon={<OpenInNewRoundedIcon />}
          sx={{
            alignSelf: "start",
            mt: 1,
            fontWeight: 700,
            borderRadius: `6px`,
            borderColor: alpha(ACCENT, 0.5),
            color:
              t.palette.mode === "dark"
                ? t.palette.common.white
                : t.palette.text.primary,
            px: 2.5,
            "&:hover": {
              borderColor: ACCENT,
              backgroundColor: alpha(ACCENT, 0.08),
            },
          }}
          href="https://discord.com/invite/your-server"
          target="_blank"
        >
          Join Community
        </Button>
      </Stack>
    </BrandPanel>
  )
}
