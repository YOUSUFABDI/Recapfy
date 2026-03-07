"use client";

import { usePaymentMethod } from "@/sections/settings/hooks/use-payment-method";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

type PreviewLine = {
  description?: string;
  amount?: number; // cents (can be negative)
  currency?: string;
};

type Props = {
  open: boolean;

  // Stripe preview result: amountDue TODAY
  amountCents: number;
  currency: string;

  // "immediate" | "period_end" | string
  effectiveAt?: "immediate" | "period_end" | string;

  // Optional: for showing the actual date when effectiveAt is period_end
  effectiveAtDate?: string | null;

  previewLines?: PreviewLine[];

  // What user picked
  planTitle: string;
  planPriceCents: number;
  interval: "monthly" | "yearly";

  fromPlanName?: string | null;
  paymentMethodLabel?: string | null;

  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
};

function money(cents: number, currency: string) {
  const amt = (cents || 0) / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(amt);
}

function sumCredits(previewLines?: PreviewLine[]) {
  if (!Array.isArray(previewLines)) return 0;
  return previewLines.reduce((acc, l) => {
    const n = typeof l.amount === "number" ? l.amount : Number(l.amount ?? 0);
    if (n < 0) acc += n;
    return acc;
  }, 0);
}

function formatNiceDate(iso?: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(t));
}

export default function ConfirmProrationModal({
  open,
  amountCents,
  currency,
  effectiveAt,
  effectiveAtDate,
  previewLines,
  planTitle,
  planPriceCents,
  interval,
  fromPlanName,
  paymentMethodLabel,
  onConfirm,
  onCancel,
  isProcessing,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { paymentMethod } = usePaymentMethod();

  const label = paymentMethod
    ? `${paymentMethod.brand} •••• ${paymentMethod.last4}`
    : "No payment method on file";
  const expiry = paymentMethod
    ? `Expires ${String(paymentMethod.exp_month).padStart(2, "0")}/${String(
        paymentMethod.exp_year
      ).slice(-2)}`
    : "";

  // ✅ IMPORTANT: amountCents is the true Stripe “due today”
  const dueToday = Math.max(0, Number(amountCents ?? 0));

  // Credits for upgrades (proration invoice preview). Downgrades don’t charge/refund now.
  const creditCents = sumCredits(previewLines); // negative number (credit)
  const hasCredit = creditCents < 0;

  const billedLine = interval === "yearly" ? "Billed yearly" : "Billed monthly";

  const effectiveDateLabel =
    effectiveAt === "period_end" ? formatNiceDate(effectiveAtDate) : null;

  const startLine =
    effectiveAt === "period_end"
      ? `starting at your next renewal${
          effectiveDateLabel ? ` (${effectiveDateLabel})` : ""
        }`
      : "starting today";

  // ✅ total due today comes ONLY from Stripe preview result
  const totalDueToday = dueToday;

  const primaryText = totalDueToday > 0 ? "Pay now" : "Confirm";

  const pmLabel = paymentMethodLabel?.trim()
    ? paymentMethodLabel
    : "Saved payment method";

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "8px",
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${alpha(
            theme.palette.divider,
            isDark ? 0.35 : 0.6
          )}`,
          boxShadow: isDark
            ? "0 24px 70px rgba(0,0,0,0.65)"
            : "0 24px 70px rgba(0,0,0,0.18)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Typography component="span" variant="h6" fontWeight={900}>
          Confirm plan change
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 2.5 }}>
        <Stack spacing={2.25}>
          {/* Subscription */}
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="subtitle2" fontWeight={800}>
                {planTitle} subscription
              </Typography>

              <Typography
                variant="h4"
                fontWeight={900}
                sx={{ lineHeight: 1.05 }}
              >
                {money(planPriceCents, currency)}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {billedLine}, {startLine}
            </Typography>
          </Box>

          {/* Adjustment (only for immediate upgrades where Stripe preview includes credits) */}
          {effectiveAt !== "period_end" && hasCredit && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  sx={{ mb: 0.75 }}
                >
                  Adjustment
                </Typography>

                <Typography variant="body2" fontWeight={800}>
                  {money(creditCents, currency)}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.35 }}
              >
                Prorated credit for the remainder of your{" "}
                {fromPlanName || "current"} subscription
              </Typography>
            </Box>
          )}

          <Divider />

          {/* Total */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
              Total due today
            </Typography>

            <Typography variant="h5" fontWeight={900}>
              {money(totalDueToday, currency)}
            </Typography>
          </Box>

          <Divider />

          {/* Payment Method */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
              Payment Method
            </Typography>
            <Box>
              <Typography variant="body2">{label}</Typography>
              {/* <Typography variant="caption" color="text.secondary">
                {expiry}
              </Typography> */}
            </Box>
          </Box>

          {/* Helpful note for downgrades */}
          {effectiveAt === "period_end" && (
            <Typography variant="caption" color="text.secondary">
              You will keep your current plan benefits until your renewal date.
              No charge today.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1.25 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: 10, minWidth: 120 }}
        >
          Cancel
        </Button>

        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{ borderRadius: 10, minWidth: 140, fontWeight: 900 }}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : primaryText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
