"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import React, { useEffect, useState } from "react";

import PricingModal from "@/components/PricingModal";
import toast from "@/components/toast/toast";
import { API } from "@/store/api";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { CONFIG } from "../../../global-config";
import { useCurrentPlan } from "./hooks/use-current-plan";
import { usePaymentMethod } from "./hooks/use-payment-method";

/**
 * Helpers
 */
const fmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value?: string | number | null): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return fmt.format(new Date(ms));
  }
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) return fmt.format(new Date(parsed));
  return null;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function formatPaymentAmount(p: any) {
  const raw =
    p?.amount ?? p?.rawPayload?.amount_total ?? p?.rawPayload?.amount_subtotal;
  if (raw == null) return "—";

  if (typeof raw === "number") {
    if (raw > 1000) return `$${(raw / 100).toFixed(2)}`;
    return `$${raw}`;
  }

  if (typeof raw === "string") {
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      if (n >= 1000) return `$${(n / 100).toFixed(2)}`;
      return `$${n}`;
    }
    if (/[$€£]/.test(raw)) return raw;
    return `$${raw}`;
  }

  return String(raw);
}

function getInvoiceUrlFromRawPayload(raw: any): string | null {
  if (!raw) return null;
  const tryPaths = [
    raw.latest_invoice?.invoice_pdf,
    raw.subscription?.latest_invoice?.invoice_pdf,
    raw.hosted_invoice_url,
    raw.invoice_pdf,
    raw.payment_link,
    raw.latest_invoice?.hosted_invoice_url,
    raw.subscription?.latest_invoice?.hosted_invoice_url,
  ];
  for (const maybe of tryPaths) {
    if (typeof maybe === "string" && maybe.length) return maybe;
  }
  return null;
}

function extractUrlFromResponse(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (data.url && typeof data.url === "string") return data.url;
  if (data.data && typeof data.data === "object") {
    if (data.data.url && typeof data.data.url === "string")
      return data.data.url;
    if (data.data.checkoutUrl && typeof data.data.checkoutUrl === "string")
      return data.data.checkoutUrl;
  }
  if (data.payload) {
    const p = data.payload;
    if (p.url && typeof p.url === "string") return p.url;
    if (p.data && p.data.url && typeof p.data.url === "string")
      return p.data.url;
  }
  try {
    const str = JSON.stringify(data);
    const match = str.match(/https?:\/\/[^\s"']+/);
    if (match) return match[0];
  } catch {
    /* ignore */
  }
  return null;
}

function downloadInvoice(invoiceUrl: string) {
  const a = document.createElement("a");
  a.href = invoiceUrl;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function normalizeStatus(status?: string) {
  if (!status) return "Unknown";
  const s = String(status).toLowerCase();
  if (s === "paid" || s === "complete" || s === "finished" || s === "succeeded")
    return "Paid";
  if (s.includes("refund")) return "Refunded";
  if (s.includes("failed") || s.includes("error")) return "Failed";
  return status;
}

/**
 * ✅ FIX: invoice field can be an object. Make a safe label + id.
 */
function getInvoiceIdFromRawPayload(raw: any): string | null {
  if (!raw) return null;

  const inv = raw.invoice;
  if (typeof inv === "string" && inv.length) return inv;
  if (isObject(inv)) {
    if (typeof inv.id === "string" && inv.id.length) return inv.id;
    if (typeof inv.number === "string" && inv.number.length) return inv.number;
  }

  const li = raw.latest_invoice ?? raw.subscription?.latest_invoice;
  if (typeof li === "string" && li.length) return li;
  if (isObject(li)) {
    if (typeof li.id === "string" && li.id.length) return li.id;
    if (typeof li.number === "string" && li.number.length) return li.number;
  }

  return null;
}

function getInvoiceLabelFromRawPayload(
  raw: any,
  fallbackGateway?: string,
): string {
  if (!raw) return fallbackGateway ?? "—";

  const inv = raw.invoice;

  // invoice is string id
  if (typeof inv === "string") return inv;

  // invoice is object
  if (isObject(inv)) {
    // prefer human-friendly invoice number
    if (typeof inv.number === "string" && inv.number.length) return inv.number;
    if (typeof inv.id === "string" && inv.id.length) return inv.id;
    // last resort: never render full object
    return "Invoice";
  }

  const li = raw.latest_invoice ?? raw.subscription?.latest_invoice;
  if (typeof li === "string") return li;
  if (isObject(li)) {
    if (typeof li.number === "string" && li.number.length) return li.number;
    if (typeof li.id === "string" && li.id.length) return li.id;
    return "Invoice";
  }

  return fallbackGateway ?? "—";
}

/**
 * Billing component
 */
const Billing: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { currentPlan, isLoading, refetch } = useCurrentPlan() as any;
  const { paymentMethod } = usePaymentMethod();
  const [canceling, setCanceling] = useState(false);
  const [scheduledCancel, setScheduledCancel] = useState<boolean>(
    Boolean(currentPlan?.cancelAtPeriodEnd),
  );
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false);
  const [openPricingModal, setOpenPricingModal] = useState(false);

  const pendingCode = (currentPlan as any)?.pendingPlanCode ?? null;
  const pendingAt = (currentPlan as any)?.pendingChangeAt ?? null;
  const pendingInterval = (currentPlan as any)?.pendingPlanInterval ?? null;
  const pendingAtLabel = formatDate(pendingAt);
  const isPendingChange = Boolean(pendingCode && pendingAt);

  useEffect(() => {
    setScheduledCancel(Boolean(currentPlan?.cancelAtPeriodEnd));
  }, [currentPlan?.cancelAtPeriodEnd]);

  // If user has no plan -> show empty state CTA
  if (!currentPlan && !isLoading) {
    return (
      <>
        <Stack spacing={3}>
          <Stack spacing={0.75}>
            <Typography variant="subtitle2" color="text.secondary">
              Current plan
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              No active plan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You don't have an active subscription. Choose a plan to get
              started.
            </Typography>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: "6px",
              display: "flex",
              gap: 2,
              alignItems: "center",
              justifyContent: "space-between",
              borderColor: alpha(
                theme.palette.primary.main,
                isDark ? 0.4 : 0.2,
              ),
            }}
          >
            <Stack>
              <Typography variant="body1">
                Get started with {CONFIG.appName}{" "}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Choose a plan and start tracking your trades.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => setOpenPricingModal(true)}
              >
                Choose plan
              </Button>
            </Stack>
          </Paper>
        </Stack>

        <PricingModal
          open={openPricingModal}
          onClose={() => setOpenPricingModal(false)}
        />
      </>
    );
  }

  const firstPayment = currentPlan?.payments?.[0];
  let nextBillingDateStr: string | null = null;

  const stripePeriodEndCandidates = [
    firstPayment?.rawPayload?.subscription?.items?.data?.[0]
      ?.current_period_end,
    firstPayment?.rawPayload?.subscription?.current_period_end,
    firstPayment?.rawPayload?.latest_invoice?.period_end,
    firstPayment?.rawPayload?.subscription?.billing_cycle_anchor,
  ];

  for (const candidate of stripePeriodEndCandidates) {
    if (typeof candidate === "number") {
      nextBillingDateStr = formatDate(candidate);
      break;
    }
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
      nextBillingDateStr = formatDate(Number(candidate));
      break;
    }
  }
  if (!nextBillingDateStr) {
    nextBillingDateStr = formatDate(currentPlan?.currentPeriodEnd ?? null);
  }

  const getBillingInterval = (): "monthly" | "yearly" => {
    if (firstPayment?.rawPayload?.subscription) {
      const sub = firstPayment.rawPayload.subscription;
      const interval =
        sub.items?.data?.[0]?.price?.recurring?.interval ||
        sub.items?.data?.[0]?.plan?.interval ||
        sub.plan?.interval;

      if (interval === "year") return "yearly";
      if (interval === "month") return "monthly";
    }

    if (currentPlan?.currentPeriodStart && currentPlan?.currentPeriodEnd) {
      try {
        const start = new Date(currentPlan.currentPeriodStart);
        const end = new Date(currentPlan.currentPeriodEnd);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const daysDiff = Math.round(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysDiff >= 300) return "yearly";
        }
      } catch {
        // ignore
      }
    }

    return "monthly";
  };

  const billingInterval = getBillingInterval();

  const getDisplayPrice = (): { price: string; label: string } => {
    const plan = currentPlan?.plan;
    if (!plan) return { price: "0", label: "/month" };

    if (billingInterval === "yearly") {
      let yearlyPrice = "0";
      if (plan.priceYearly) yearlyPrice = String(plan.priceYearly);
      else if (plan.priceMonthly) {
        const monthlyNum =
          typeof plan.priceMonthly === "string"
            ? parseFloat(plan.priceMonthly)
            : Number(plan.priceMonthly);
        yearlyPrice = String(monthlyNum * 12);
      }
      return { price: yearlyPrice, label: "/year" };
    }

    const monthlyPrice =
      typeof plan.priceMonthly === "string"
        ? plan.priceMonthly
        : String(plan.priceMonthly ?? "0");

    return { price: monthlyPrice, label: "/month" };
  };

  const { price: displayPrice, label: displayLabel } = getDisplayPrice();

  const handleCancel = async () => {
    if (canceling) return;

    try {
      if (!API) throw new Error("API base not configured.");
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth:token")
          : null;
      if (!token) return toast.error?.("You must be logged in to cancel.");
      if (!currentPlan) return toast.error?.("No active plan to cancel.");
      if (!currentPlan?.stripeSubscriptionId)
        return toast.error?.("Subscription not linked to Stripe.");

      setCanceling(true);

      const endpoint = `${API.replace(/\/$/, "")}/billing/cancel`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.message ||
          data?.error?.message ||
          `Cancellation failed (status ${res.status})`;

        toast.error?.(typeof msg === "string" ? msg : JSON.stringify(msg));
        return; // ✅ stop here, no throw
      }

      setScheduledCancel(true);
      toast.success?.(
        "Cancellation scheduled. You will retain access until the end of the billing period.",
      );

      if (typeof refetch === "function") {
        try {
          await refetch();
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.error("cancel error:", err);

      let msg = err?.message ?? "Could not cancel subscription.";
      try {
        const parsed = JSON.parse(msg);
        msg =
          parsed?.message ||
          parsed?.error?.message ||
          parsed?.error?.details ||
          msg;
      } catch {
        const msg = err?.message || "Could not cancel subscription.";
        toast.error?.(msg);
      }
      // toast.error?.(msg);
    } finally {
      setCanceling(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      if (!API) throw new Error("API base not configured.");
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth:token")
          : null;
      if (!token)
        return toast.error?.("You must be logged in to update payment method.");

      setUpdatingPaymentMethod(true);

      const endpoint = `${API.replace(/\/$/, "")}/billing/portal`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const txt =
          data && (data.message || data.error)
            ? data.message || data.error
            : await res.text().catch(() => null);
        throw new Error(txt || `Portal creation failed (status ${res.status})`);
      }

      const url =
        extractUrlFromResponse(data) ??
        extractUrlFromResponse(data?.payload) ??
        extractUrlFromResponse(data?.data);

      if (!url) throw new Error("No portal URL returned from server.");

      window.open(url, "_blank", "noopener,noreferrer");

      if (typeof refetch === "function") {
        setTimeout(() => {
          refetch().catch(() => {});
        }, 1500);
      }
    } catch (err: any) {
      console.error("billing portal error:", err);
      toast.error?.(err?.message ?? "Could not open billing portal.");
    } finally {
      setUpdatingPaymentMethod(false);
    }
  };

  return (
    <>
      <Stack spacing={3}>
        {/* Summary */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack
            spacing={0.75}
            sx={{
              flex: "1 1 0",
              minWidth: 0,
              maxWidth: { xs: "100%", sm: 620 },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Current plan
            </Typography>

            <Stack direction="row" spacing={1.25} alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                {currentPlan?.plan?.name ?? "—"}
              </Typography>

              <Chip
                size="small"
                label={billingInterval === "yearly" ? "Yearly" : "Monthly"}
                sx={{
                  borderRadius: 999,
                  bgcolor: alpha(
                    theme.palette.primary.main,
                    isDark ? 0.24 : 0.12,
                  ),
                }}
              />
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
            >
              {currentPlan?.plan?.description ?? ""}
            </Typography>
          </Stack>

          <Box sx={{ flex: "0 0 auto", ml: { xs: 0, sm: 2 } }}>
            <Stack
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "flex-end" }}
            >
              <Typography variant="h6" fontWeight={700}>
                ${displayPrice}{" "}
                <Typography component="span" variant="body2">
                  {displayLabel}
                </Typography>
              </Typography>

              {!isPendingChange && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setOpenPricingModal(true)}
                  >
                    Change plan
                  </Button>
                </Stack>
              )}

              <Typography variant="caption" color="text.secondary">
                Next billing date · {nextBillingDateStr ?? "—"}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {isPendingChange && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: "6px",
              bgcolor: alpha(theme.palette.info.main, isDark ? 0.18 : 0.06),
              borderColor: alpha(theme.palette.info.main, isDark ? 0.35 : 0.25),
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2" fontWeight={800}>
                Downgrade scheduled
              </Typography>

              <Typography variant="caption" color="text.secondary">
                You will keep your current plan until{" "}
                <b>{pendingAtLabel ?? "your next renewal"}</b>. After that, your
                plan will switch to <b>{String(pendingCode).toUpperCase()}</b>
                {pendingInterval ? ` (${pendingInterval})` : ""}.
              </Typography>

              {/* Optional: add a cancel button if you want */}
              {/* <Button size="small" variant="outlined" onClick={...}>Cancel scheduled change</Button> */}
            </Stack>
          </Paper>
        )}

        <Divider />

        {/* Payment method */}
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            Payment method
          </Typography>

          {paymentMethod ? (
            (() => {
              const label = paymentMethod
                ? `${paymentMethod.brand} •••• ${paymentMethod.last4}`
                : "No payment method on file";
              const expiry = paymentMethod
                ? `Expires ${String(paymentMethod.exp_month).padStart(
                    2,
                    "0",
                  )}/${String(paymentMethod.exp_year).slice(-2)}`
                : "";

              return (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: alpha(
                      theme.palette.primary.main,
                      isDark ? 0.4 : 0.2,
                    ),
                  }}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {expiry}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleOpenBillingPortal}
                      disabled={updatingPaymentMethod}
                    >
                      {updatingPaymentMethod
                        ? "Opening portal…"
                        : "Update card"}
                    </Button>
                  </Stack>
                </Paper>
              );
            })()
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderColor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.4 : 0.2,
                ),
              }}
            >
              <Stack spacing={0.25}>
                <Typography variant="body2">No payment method</Typography>
                <Typography variant="caption" color="text.secondary">
                  Add a payment method to be billed automatically.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleOpenBillingPortal}
                  disabled={updatingPaymentMethod}
                >
                  {updatingPaymentMethod ? "Opening portal…" : "Add card"}
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>

        {/* Payment history */}
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            Payment history
          </Typography>

          <Paper
            variant="outlined"
            sx={{ borderRadius: "6px", overflow: "hidden" }}
          >
            <Box
              sx={{
                px: 1.75,
                py: 1.25,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.18 : 0.06,
                ),
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                DATE · INVOICE
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                AMOUNT · STATUS
              </Typography>
            </Box>

            <List disablePadding>
              {currentPlan?.payments?.map((p: any) => {
                const created = formatDate(
                  p?.createdAt ?? p?.rawPayload?.created,
                );
                const statusLabel = normalizeStatus(
                  p?.status ?? p?.rawPayload?.payment_status,
                );
                const invoiceUrl = getInvoiceUrlFromRawPayload(p?.rawPayload);

                // ✅ FIX: always a string
                const invoiceLabel = getInvoiceLabelFromRawPayload(
                  p?.rawPayload,
                  p?.gateway ?? "—",
                );

                return (
                  <React.Fragment key={p.id}>
                    <ListItem
                      sx={{
                        px: 1.75,
                        py: 1.25,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={500}>
                            {created ?? "—"}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {invoiceLabel}
                          </Typography>
                        }
                      />

                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Typography variant="body2">
                          {formatPaymentAmount(p)}
                        </Typography>

                        <Chip
                          label={statusLabel}
                          size="small"
                          sx={{
                            borderRadius: 999,
                            fontSize: 11,
                            ...(statusLabel === "Paid" && {
                              bgcolor: alpha("#16a34a", isDark ? 0.34 : 0.14),
                            }),
                            ...(statusLabel === "Refunded" && {
                              bgcolor: alpha(
                                theme.palette.info.main,
                                isDark ? 0.3 : 0.12,
                              ),
                            }),
                          }}
                        />

                        <IconButton
                          size="small"
                          aria-label="Download invoice"
                          onClick={() => {
                            if (invoiceUrl) {
                              downloadInvoice(invoiceUrl);
                              return;
                            }

                            const fallback =
                              p?.rawPayload?.hosted_invoice_url ||
                              p?.rawPayload?.latest_invoice
                                ?.hosted_invoice_url ||
                              p?.rawPayload?.subscription?.latest_invoice
                                ?.hosted_invoice_url;

                            if (fallback) {
                              downloadInvoice(fallback);
                              return;
                            }

                            // ✅ FIX: invoice might be object
                            const invoiceId = getInvoiceIdFromRawPayload(
                              p?.rawPayload,
                            );

                            if (invoiceId) {
                              window.open(
                                `https://dashboard.stripe.com/test/invoices/${invoiceId}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                              return;
                            }

                            alert("Invoice not available for download.");
                          }}
                        >
                          <DownloadRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </ListItem>

                    <Divider component="li" />
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        </Stack>

        {/* Cancel area */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          {scheduledCancel ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: alpha(
                  theme.palette.warning.main,
                  isDark ? 0.18 : 0.06,
                ),
                display: "flex",
                gap: 1,
                alignItems: "center",
                maxWidth: 520,
              }}
            >
              <Stack spacing={0} sx={{ mr: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  Cancellation scheduled
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your subscription will end on{" "}
                  {formatDate(currentPlan?.currentPeriodEnd ?? null) ?? "—"}.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <Button
              color="error"
              variant="outlined"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          )}
        </Box>
      </Stack>

      <PricingModal
        open={openPricingModal}
        onClose={() => setOpenPricingModal(false)}
        currentPlan={currentPlan}
        onPlanUpdated={refetch}
      />
    </>
  );
};

export default Billing;
