"use client"

import { Suspense } from "react"
import { Box, CircularProgress, Typography } from "@mui/material"
import AccountsView from "@/sections/accounts/view/AccountsView"

function AccountsLoadingFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Loading accounts...
      </Typography>
    </Box>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsLoadingFallback />}>
      <AccountsView />
    </Suspense>
  )
}
