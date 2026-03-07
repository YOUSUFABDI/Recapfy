"use client"

import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material"
import { alpha } from "@mui/material/styles"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"

type Props = {
  title: string
  description?: string
  onConnect?: () => void
  comingSoon?: boolean
  disabled?: boolean
}

export default function ConnectPlatformCard({
  title,
  description = "You can connect Demo or Live",
  onConnect,
  comingSoon,
  disabled,
}: Props) {
  return (
    <Paper
      sx={(t) => ({
        p: 2,
        borderRadius: "6px",
        background: `linear-gradient(135deg, ${alpha(
          t.palette.primary.main,
          0.45
        )} 0%, ${alpha(t.palette.primary.main, 0.8)} 100%)`,
        color: "primary.contrastText",
        position: "relative",
        // 👇 ensure the card stretches to its container height
        height: "100%",
        display: "flex",
      })}
    >
      {/* Make inner content take full height and push CTA to bottom */}
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "inherit" }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.95, color: "inherit" }}>
            {description}
          </Typography>
        </Box>

        {/* spacer to push the CTA to the bottom */}
        <Box sx={{ flex: 1 }} />

        <Box sx={{ alignSelf: "flex-end" }}>
          {comingSoon ? (
            <Chip
              label="Coming soon"
              size="small"
              sx={{
                bgcolor: "background.paper",
                color: "text.primary",
                fontWeight: 700,
                borderRadius: "6px",
              }}
            />
          ) : (
            <Button
              onClick={onConnect}
              variant="contained"
              size="small"
              disabled={disabled}
              startIcon={<LinkRoundedIcon fontSize="small" />}
              sx={{
                bgcolor: "background.paper",
                color: "text.primary",
                fontWeight: 700,
                "&:hover": { bgcolor: "background.default" },
                borderRadius: "6px",
              }}
            >
              Connect
            </Button>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}
