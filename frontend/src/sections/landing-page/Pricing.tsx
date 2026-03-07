"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";

import toast from "@/components/toast/toast";
import { API } from "@/store/api";
import { PlanDT } from "@/types/plan";
import { extractRtkErrorMessage } from "@/utils/error-message";
import { useplans } from "./hooks/use-plans";
import { useCurrentPlan } from "@/sections/settings/hooks/use-current-plan";

/* ---------------- animations ---------------- */

const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

/* ---------------- types ---------------- */

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

/* ---------------- helpers ---------------- */

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

function extractUrlFromResponse(data: any): string | null {
  return (
    data?.url ??
    data?.data?.url ??
    data?.payload?.url ??
    data?.payload?.data?.url ??
    data?.checkoutUrl ??
    data?.invoiceUrl ??
    null
  );
}

/* ---------------- component ---------------- */

const Pricing = () => {
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const { data, isLoading, error, isError } = useplans();
  // console.log(data);
  const { currentPlan } = useCurrentPlan();

  const currentPlanCode = useMemo(() => {
    const code =
      (currentPlan as any)?.plan?.code ??
      (currentPlan as any)?.plan?.id ??
      null;
    return code ? String(code).toUpperCase() : null;
  }, [currentPlan]);

  /* ---------- error handling ---------- */

  useEffect(() => {
    if (isError) {
      toast.error?.(extractRtkErrorMessage(error));
    }
  }, [isError, error]);

  /* ---------- normalize plans ---------- */

  const plans: Plan[] = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.map((p: PlanDT) => {
      const planCode = String(p.code ?? p.id).toUpperCase();
      const id = planCode.toLowerCase();

      const priceMonthlyNumber = p.priceMonthly;

      const isProLike =
        planCode === "PRO" ||
        p.name?.toLowerCase().includes("pro") ||
        priceMonthlyNumber > 30;

      return {
        id,
        planCode,
        title: p.name,
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

  /* ---------- checkout ---------- */

  const startCheckout = async (planCode: string) => {
    try {
      if (!API) {
        throw new Error("API base URL not configured.");
      }

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("auth:token")
          : null;
      if (!token) {
        toast.error?.("You need to be logged in to upgrade.");
        return;
      }

      setUpgradingPlan(planCode);

      const endpoint = `${API.replace(/\/$/, "")}/billing/create-checkout`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planCode, interval: "monthly" }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("create-checkout failed:", res.status, txt);
        throw new Error(
          txt || `Failed to start checkout (status ${res.status})`
        );
      }

      const data = await res.json();
      console.log("create-checkout response:", data);

      const paymentUrl = extractUrlFromResponse(data);

      if (!paymentUrl) {
        console.error("create-checkout response missing url:", data);
        throw new Error("No payment URL returned from server.");
      }

      window.location.href = paymentUrl;
    } catch (err: any) {
      console.error("startCheckout error:", err);
      const e = err instanceof Error ? err : new Error(String(err));
      toast.error?.(e.message || "Could not start checkout.");
      setUpgradingPlan(null);
    }
  };

  /* ---------- UI ---------- */

  return (
    <Box
      id="pricing"
      sx={{
        scrollMarginTop: { xs: 96, sm: 110 },
        px: { xs: 2.2, md: 3 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          py: { xs: 6, md: 9 },
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          {/* ---------- header ---------- */}
          <Stack spacing={1} alignItems="center" textAlign="center" mb={4}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(191,219,254,0.9)"
                    : "rgba(79,70,229,0.95)",
              }}
            >
              Pricing
            </Typography>

            <Typography variant="h5" fontWeight={700}>
              Everything you need to trade with confidence.
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 520 }}
            >
              Track your performance, understand your edge, and grow with
              confidence.
            </Typography>
          </Stack>

          {/* ---------- cards ---------- */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 3,
            }}
          >
            {isLoading
              ? Array.from({ length: 2 }).map((_, idx) => (
                  <Skeleton key={idx} height={280} />
                ))
              : plans.map((plan, idx) => {
                  const isPro = plan.highlight === true;
                  const isThisUpgrading = upgradingPlan === plan.planCode;
                  const isCurrent =
                    !!currentPlanCode &&
                    plan.planCode.toUpperCase() === currentPlanCode;

                  return (
                    <motion.div
                      key={plan.id}
                      variants={fadeInUp}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: "6px",
                          border: (theme) =>
                            isPro
                              ? `1px solid ${theme.palette.primary.main}99`
                              : `1px solid ${
                                  theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(15,23,42,0.06)"
                                }`,
                          background: (theme) =>
                            isPro
                              ? theme.palette.mode === "dark"
                                ? `
        radial-gradient(
          60% 50% at 10% 0%,
          rgba(124,135,255,0.25),
          transparent 60%
        ),
        radial-gradient(
          50% 40% at 90% 100%,
          rgba(124,135,255,0.18),
          transparent 60%
        ),
        linear-gradient(145deg, #0F1120, #181B33)
      `
                                : `
        radial-gradient(
          60% 50% at 10% 0%,
          rgba(124,135,255,0.22),
          transparent 60%
        ),
        radial-gradient(
          50% 40% at 90% 100%,
          rgba(124,135,255,0.18),
          transparent 60%
        ),
        linear-gradient(145deg, #FFFFFF, #EEF1FF)
      `
                              : undefined,

                          minHeight: plan.minHeight,
                        }}
                      >
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
                            variant={isPro ? "contained" : "outlined"}
                            fullWidth
                            disabled={isCurrent || isThisUpgrading}
                            onClick={() => startCheckout(plan.planCode)}
                          >
                            {/* {isThisUpgrading ? "Redirecting…" : plan.cta.label} */}
                            {isCurrent
                              ? "Current plan"
                              : isThisUpgrading
                              ? "Processing…"
                              : plan.cta.label}
                          </Button>
                        </Stack>
                      </Paper>
                    </motion.div>
                  );
                })}
          </Box>

          {!isLoading && plans.length === 0 && (
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No pricing plans available at the moment.
              </Typography>
            </Box>
          )}
        </motion.div>
      </Container>
    </Box>
  );
};

export default Pricing;
