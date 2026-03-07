"use client";

import toast from "@/components/toast/toast";
import { useplans } from "@/sections/landing-page/hooks/use-plans";
import { API } from "@/store/api";
import { extractRtkErrorMessage } from "@/utils/error-message";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import ConfirmProrationModal from "./ConfirmProrationModal";
import { CurrentPlanDT } from "@/types/billing";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  currentPlan?: CurrentPlanDT | null;
  onPlanUpdated?: () => Promise<void> | void;
};

type CTAType =
  | { type: "link"; href: string; label?: string }
  | { type: "action"; onClickName: string; label?: string };

type Plan = {
  id: string;
  planCode: string;
  title: string;
  description: string;
  priceMonthlyNumber: number;
  currency: string;
  features: string[];
  highlight?: boolean;
  chipLabel?: string | null;
  cta: CTAType;
  minHeight?: number;
};

type PreviewLine = {
  description?: string;
  amount?: number; // cents
  currency?: string;
};

type PreviewData = {
  action?: "upgrade" | "downgrade" | "lateral" | "none" | string;
  amountDue?: number; // cents
  currency?: string;
  effectiveAt?: "immediate" | "period_end" | string;
  currentPeriodEnd?: string; // ISO
  message?: string;
  prorationDate?: number;
  previewLines?: PreviewLine[];
};

function Bullet({ text }: { text: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "primary.main",
          flexShrink: 0,
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  );
}

function extractInvoiceUrl(data: any): string | null {
  return (
    data?.invoiceUrl ??
    data?.data?.invoiceUrl ??
    data?.payload?.invoiceUrl ??
    data?.payload?.data?.invoiceUrl ??
    data?.url ??
    data?.data?.url ??
    data?.payload?.url ??
    data?.payload?.data?.url ??
    null
  );
}

function normalizePreviewResponse(json: any): PreviewData {
  const p =
    json?.payload?.data ?? json?.payload ?? json?.data ?? json?.result ?? json;

  const d = p?.data ?? p;

  return {
    action: d?.action,
    amountDue:
      typeof d?.amountDue === "number"
        ? d.amountDue
        : Number(d?.amountDue ?? 0),
    currency: d?.currency ?? "USD",
    effectiveAt: d?.effectiveAt,
    currentPeriodEnd: d?.currentPeriodEnd,
    message: d?.message,
    prorationDate:
      typeof d?.prorationDate === "number" ? d.prorationDate : undefined,
    previewLines: Array.isArray(d?.previewLines) ? d.previewLines : undefined,
  };
}

function getSimplePaymentMethodLabel(
  currentPlan?: CurrentPlanDT | null
): string | null {
  const raw = (currentPlan as any)?.payments?.[0]?.rawPayload ?? null;
  if (!raw) return null;

  const paymentIntent =
    raw.payment_intent && typeof raw.payment_intent === "object"
      ? raw.payment_intent
      : null;

  const card =
    raw.latest_invoice?.payment_method_details?.card ??
    paymentIntent?.payment_method_details?.card ??
    raw.payment_method_details?.card ??
    null;

  let cardFromCharge: any = null;
  try {
    const charges = raw.latest_invoice?.charges?.data;
    if (Array.isArray(charges) && charges.length > 0) {
      cardFromCharge = charges[0]?.payment_method_details?.card ?? null;
    }
  } catch {
    /* ignore */
  }

  const c = card ?? cardFromCharge;
  if (!c) return null;

  const brand = String(c.brand ?? c.network ?? "CARD").toUpperCase();
  const last4 = c.last4 ?? c["last_4"] ?? null;

  if (last4) return `${brand} *${last4}`;
  return brand;
}

export default function PricingModal({
  open,
  onClose,
  title = "Choose plan",
  currentPlan = null,
  onPlanUpdated,
}: Props) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("md"));

  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Track the processing state

  const [confirmData, setConfirmData] = useState<{
    amountCents: number;
    currency: string;
    planCode: string;
    interval: "monthly" | "yearly";
    prorationDate?: number;

    // extra for the simplified UI
    planTitle: string;
    planPriceCents: number;
    effectiveAt?: string;
    previewLines?: PreviewLine[];
    fromPlanName?: string | null;
    paymentMethodLabel?: string | null;

    effectiveAtDate?: string | null;
  } | null>(null);

  const { data, isLoading, isError, error } = useplans();

  useEffect(() => {
    if (isError) toast.error?.(extractRtkErrorMessage(error));
  }, [isError, error]);

  const plans: Plan[] = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((p: any) => {
      const planCode = String(p.code ?? p.id).toUpperCase();
      const id = planCode.toLowerCase();
      const priceMonthlyNumber = Number(p.priceMonthly);

      const isProLike =
        planCode === "PRO" ||
        p.name?.toLowerCase().includes("pro") ||
        priceMonthlyNumber > 15;

      return {
        id,
        planCode,
        title: p.name ?? planCode,
        description: p.description ?? "",
        priceMonthlyNumber,
        currency: p.currency ?? "USD",
        features: p.features ?? [],
        highlight: isProLike,
        chipLabel: isProLike ? "Most popular" : null,
        cta: {
          type: "action",
          onClickName: isProLike ? "upgradeToPro" : "upgradeToBasic",
          label: isProLike ? "Upgrade to Pro" : "Choose Basic",
        },
        minHeight: isProLike ? 280 : 260,
      };
    });
  }, [data]);

  const currentPlanCode: string | null = useMemo(() => {
    if (!currentPlan) return null;
    return (
      (currentPlan as any)?.plan?.code ?? (currentPlan as any)?.plan?.id ?? null
    );
  }, [currentPlan]);

  const applyPlanChange = async (args: {
    token: string;
    planCode: string;
    interval: "monthly" | "yearly";
    prorationDate?: number;
  }) => {
    const res = await fetch(`${API}/billing/change-plan/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.token}`,
      },
      body: JSON.stringify({
        planCode: args.planCode,
        interval: args.interval,
        prorationDate: args.prorationDate,
      }),
    });

    const json = await res.json();
    // console.log("json", json);
    if (!res.ok) throw new Error(json.error.message ?? "Plan change failed");

    if (json.scheduled) {
      toast.success(json.message ?? "Plan change scheduled.");
      if (onPlanUpdated) await onPlanUpdated();
      onClose();
      return;
    }

    if (json.requiresPayment) {
      const url = extractInvoiceUrl(json);
      if (!url) throw new Error("Stripe did not return an invoice URL");
      window.location.assign(url);
      return;
    }

    toast.success(json.message ?? "Plan updated successfully 🎉");

    if (onPlanUpdated) await onPlanUpdated();
    onClose();
  };

  const startCheckout = async (planCode: string) => {
    try {
      if (currentPlanCode && planCode === currentPlanCode) {
        toast.info?.("You are already on this plan.");
        return;
      }

      const token = localStorage.getItem("auth:token");
      if (!token) {
        toast.error?.("You need to be logged in.");
        return;
      }

      setUpgradingPlan(planCode);

      const interval: "monthly" | "yearly" = "monthly";

      // Selected plan info (for display)
      const selectedPlan = plans.find((p) => p.planCode === planCode) ?? null;

      const planTitle = selectedPlan?.title ?? planCode;
      const planPriceCents = Math.round(
        (selectedPlan?.priceMonthlyNumber ?? 0) * 100
      );

      const paymentMethodLabel = getSimplePaymentMethodLabel(currentPlan);
      const fromPlanName = (currentPlan as any)?.plan?.name ?? null;

      // If user already has a subscription -> preview then confirm modal
      if ((currentPlan as any)?.stripeSubscriptionId) {
        const previewRes = await fetch(`${API}/billing/change-plan/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planCode, interval }),
        });

        const previewJson = await previewRes.json();
        // console.log("previewJson", previewJson);
        if (!previewRes.ok)
          throw new Error(previewJson.message ?? "Plan change preview failed");

        const preview = normalizePreviewResponse(previewJson);

        const amountDue = Number(preview.amountDue ?? 0) || 0;
        const currency = String(
          preview.currency ?? selectedPlan?.currency ?? "USD"
        );
        const prorationDate =
          typeof preview.prorationDate === "number"
            ? preview.prorationDate
            : undefined;

        setConfirmData({
          amountCents: amountDue,
          currency,
          planCode,
          interval,
          prorationDate,

          planTitle,
          planPriceCents,
          effectiveAt: preview.effectiveAt,
          previewLines: preview.previewLines,
          fromPlanName,
          paymentMethodLabel,

          effectiveAtDate: preview.currentPeriodEnd ?? null,
        });

        return;
      }

      // No subscription yet -> create checkout (initial purchase)
      const res = await fetch(
        `${API.replace(/\/$/, "")}/billing/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planCode, interval }),
        }
      );

      const json = await res.json();
      const checkoutUrl = extractInvoiceUrl(json);
      if (!checkoutUrl) throw new Error("No Stripe checkout URL returned");

      window.location.href = checkoutUrl;
    } catch (e: any) {
      console.error(e);
      toast.error?.(e.message ?? "Failed to start checkout");
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        fullScreen={isSm}
        PaperProps={{
          sx: {
            borderRadius: isSm ? 0 : "10px",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box fontWeight={700}>{title}</Box>
          <IconButton onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Container maxWidth="md">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                gap: 3,
              }}
            >
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} height={260} />
                  ))
                : plans.map((plan) => {
                    const isCurrent =
                      currentPlanCode && plan.planCode === currentPlanCode;
                    const isUpgrading = upgradingPlan === plan.planCode;

                    return (
                      <Paper key={plan.id} sx={{ p: 3 }}>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography fontWeight={700}>
                              {plan.title}
                            </Typography>
                            {plan.chipLabel && (
                              <Chip
                                label={plan.chipLabel}
                                color="primary"
                                size="small"
                              />
                            )}
                          </Stack>

                          <Typography color="text.secondary">
                            {plan.description}
                          </Typography>

                          <Typography variant="h4" fontWeight={800}>
                            ${plan.priceMonthlyNumber}
                            <Typography
                              component="span"
                              variant="subtitle2"
                              color="text.secondary"
                            >
                              {" "}
                              / month
                            </Typography>
                          </Typography>

                          <Stack spacing={1}>
                            {plan.features.map((f) => (
                              <Bullet key={f} text={f} />
                            ))}
                          </Stack>

                          <Button
                            variant={plan.highlight ? "contained" : "outlined"}
                            fullWidth
                            disabled={isCurrent || isUpgrading}
                            onClick={() => startCheckout(plan.planCode)}
                          >
                            {isCurrent
                              ? "Current plan"
                              : isUpgrading
                              ? "Processing..."
                              : plan.cta.label}
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })}
            </Box>
          </Container>
        </DialogContent>
      </Dialog>

      <ConfirmProrationModal
        open={!!confirmData}
        amountCents={confirmData?.amountCents ?? 0}
        currency={confirmData?.currency ?? "USD"}
        effectiveAt={confirmData?.effectiveAt}
        effectiveAtDate={confirmData?.effectiveAtDate ?? null}
        previewLines={confirmData?.previewLines}
        planTitle={confirmData?.planTitle ?? "Plan"}
        planPriceCents={confirmData?.planPriceCents ?? 0}
        interval={confirmData?.interval ?? "monthly"}
        fromPlanName={confirmData?.fromPlanName ?? null}
        paymentMethodLabel={confirmData?.paymentMethodLabel ?? null}
        isProcessing={isProcessing} // Add the isProcessing state
        onCancel={() => setConfirmData(null)}
        onConfirm={async () => {
          try {
            const token = localStorage.getItem("auth:token");
            if (!token) throw new Error("Not logged in");
            if (!confirmData) return;

            setIsProcessing(true); // Set isProcessing to true when starting the API request

            await applyPlanChange({
              token,
              planCode: confirmData.planCode,
              interval: confirmData.interval,
              prorationDate: confirmData.prorationDate,
            });

            setConfirmData(null);
          } catch (e: any) {
            console.error(e);
            toast.error?.(e.message ?? "Failed to change plan");
            setConfirmData(null);
          } finally {
            setIsProcessing(false); // Set isProcessing to false after the API call is complete
          }
        }}
      />
    </>
  );
}
