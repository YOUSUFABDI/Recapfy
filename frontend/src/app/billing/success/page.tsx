"use client";

import toast from "@/components/toast/toast";
import { API } from "@/store/api";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BillingSuccessPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  // Common params providers may return (adjust if needed)
  const invoiceId =
    search.get("invoiceId") ||
    search.get("invoice_id") ||
    search.get("payment_id") ||
    search.get("id");
  // optionally provider-specific status param
  const status = search.get("status") || search.get("payment_status");

  useEffect(() => {
    // If there is an invoice/payment id, try to verify with backend
    const verify = async () => {
      if (!invoiceId) {
        setVerified(null);
        return;
      }

      setLoading(true);
      try {
        // Replace with your real verification endpoint if different
        // Example: GET /billing/verify?gatewayPaymentId=xxx
        const res = await fetch(
          `${API}/billing/verify?gatewayPaymentId=${encodeURIComponent(
            invoiceId
          )}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn("Verify returned error:", text);
          setVerified(false);
          toast.error?.(
            "Could not verify payment. If you were charged, contact support."
          );
          return;
        }

        const data = await res.json();
        // Expect backend to return something like { status: "FINISHED" } or { verified: true }
        const ok =
          data?.verified === true ||
          data?.status === "FINISHED" ||
          data?.status === "FINISHED";
        setVerified(Boolean(ok));
        if (ok) {
          toast?.success?.(
            "Payment verified — your subscription is now active!"
          );
        } else {
          toast?.info?.(
            "Payment received but not yet confirmed. It may take a few minutes."
          );
        }
      } catch (err) {
        console.error("Verify exception:", err);
        setVerified(false);
        toast.error?.(
          "Verification failed. Contact support if you were charged."
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [invoiceId]);

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
            <Box>
              <CheckCircleOutlineIcon
                sx={{ fontSize: 56, color: "success.main" }}
              />
            </Box>

            <Box>
              <Typography variant="h5" fontWeight={700}>
                Payment successful
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Thank you — we received your payment.
              </Typography>

              {invoiceId ? (
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                  Reference: <strong>{invoiceId}</strong>
                </Typography>
              ) : null}
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Button
                variant="contained"
                onClick={() => router.push("/dashboard/connect")}
              >
                Go to dashboard
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
