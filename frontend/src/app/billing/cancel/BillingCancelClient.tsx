"use client";

import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";

export default function BillingCancelClient() {
  const search = useSearchParams();
  const router = useRouter();

  const invoiceId =
    search.get("invoiceId") ||
    search.get("invoice_id") ||
    search.get("payment_id") ||
    search.get("id");

  const reason = search.get("reason") || search.get("status");

  return (
    <Box
      sx={{
        py: 8,
        px: 2,
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: "6px" }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <CancelOutlinedIcon sx={{ fontSize: 56, color: "warning.main" }} />

            <Box>
              <Typography variant="h5" fontWeight={700}>
                Payment canceled
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                You canceled the payment flow. No charge was made.
              </Typography>

              {invoiceId && (
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                  Reference: <strong>{invoiceId}</strong>
                </Typography>
              )}

              {reason && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    color: "text.secondary",
                  }}
                >
                  {reason}
                </Typography>
              )}
            </Box>

            <Button variant="contained" onClick={() => router.push("/")}>
              Try again
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
