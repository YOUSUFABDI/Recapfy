"use client"

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"
import { Box, Button } from "@mui/material"

type Props = { onSignOut?: () => void }

export default function SignOutButton({ onSignOut }: Props) {
  return (
    <Box sx={{ mt: "auto", pt: 2 }}>
      <Button
        fullWidth
        color="inherit"
        onClick={onSignOut}
        startIcon={<LogoutRoundedIcon />}
        sx={{
          justifyContent: "flex-start",
          gap: 1,
          borderRadius: "6px",
          px: 1,
          fontWeight: 700,
          color: (t) =>
            t.palette.mode === "dark" ? "grey.200" : "text.primary",
        }}
      >
        Sign Out
      </Button>
    </Box>
  )
}
