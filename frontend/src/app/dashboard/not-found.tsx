// app/dashboard/not-found.tsx
"use client"

import { Box, Button, Stack, Typography } from "@mui/material"
import Link from "next/link"
import { Suspense } from "react"

function NotFoundContent() {
  return (
    <Box sx={{ py: 8, px: 3, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The page you’re looking for doesn’t exist.
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center">
        <Button component={Link} href="/dashboard" variant="contained">
          Go to Dashboard
        </Button>
        <Button component={Link} href="/" variant="outlined">
          Home
        </Button>
      </Stack>
    </Box>
  )
}

export default function NotFoundPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}>Loading…</Box>}>
      <NotFoundContent />
    </Suspense>
  )
}
