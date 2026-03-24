"use client";

import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import React, { useMemo, useState } from "react";
import { useGetAccountAiReportQuery } from "@/store/platform/ctrader";
import { useUser } from "../auth/hooks/useUser";
import { useAIReport } from "./hooks/use-ai-report";
import { extractRtkErrorMessage } from "@/utils/error-message";
import { useCurrentPlan } from "../settings/hooks/use-current-plan";
import PricingModal from "@/components/PricingModal";

const AI_NAME = "Recaper";

type Props = {
  identifier: string; // same value you pass to useAccountDetail
  traderName?: string | null;
};

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  items: { title: string; body: string }[];
}> = ({ title, icon, color, items }) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <Box
      sx={{
        flex: 1,
        borderRadius: "6px",
        p: 2,
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(color, 0.16)} 0%, ${alpha(
            color,
            0.06,
          )} 100%)`,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: () => alpha(color, 0.18),
          }}
        >
          {icon}
        </Box>
        <Typography variant="subtitle1" fontWeight={800}>
          {title}
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        {items.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              borderRadius: "6px",
              p: 1.5,
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="subtitle2" fontWeight={700}>
                {item.title}
              </Typography>
              <IconButton
                size="small"
                onClick={() =>
                  setOpenIndex((prev) => (prev === idx ? null : idx))
                }
              >
                <ExpandMoreRoundedIcon
                  sx={{
                    fontSize: 18,
                    transform:
                      openIndex === idx ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease-out",
                  }}
                />
              </IconButton>
            </Stack>
            <Collapse in={openIndex === idx}>
              <Typography
                variant="body2"
                sx={{ mt: 0.5 }}
                color="text.secondary"
              >
                {item.body}
              </Typography>
            </Collapse>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

// 🔢 Helper: format ISO → "Nov/16/2025 02:13 PM"
function formatReportDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const month = d.toLocaleString(undefined, { month: "short" }); // e.g. "Nov"
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = hours.toString().padStart(2, "0");

  // Example: "Nov/16/2025 02:13 PM"
  return `${month}/${day}/${year} ${hh}:${minutes} ${ampm}`;
}

const AIReport: React.FC<Props> = ({ identifier }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const user = useUser();
  const { currentPlan, isLoading: isPlanLoading } = useCurrentPlan();
  // console.log("currentPlan", currentPlan);
  const [pricingOpen, setPricingOpen] = useState(false);

  const isPro = currentPlan?.plan?.code === "PRO";
  const { report, isLoading, isError, refetch, error } = useAIReport(
    identifier,
    isPro,
  );
  // console.log("report", report);

  const firstName = useMemo(() => {
    const raw = (user?.name ?? "").trim();
    if (!raw) return "Trader";
    const hasComma = raw.includes(",");
    const cleaned = raw.replace(/[()"'’]+/g, "").replace(/,+/g, " ");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return "Trader";
    return hasComma ? parts[parts.length - 1] : parts[0];
  }, [user?.name]);

  if (isLoading) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!isPro) {
    return (
      <>
        <Box sx={{ p: 8, textAlign: "center" }}>
          <AutoAwesomeRoundedIcon sx={{ fontSize: 48, mb: 2, opacity: 0.2 }} />
          <Typography variant="h6" fontWeight={700}>
            AI Report is a Pro Feature
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upgrade to the Pro plan to unlock AI Report
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setPricingOpen(true)}
          >
            View Upgrade Options
          </Button>
        </Box>

        <PricingModal
          open={pricingOpen}
          onClose={() => setPricingOpen(false)}
          currentPlan={currentPlan ?? null}
          onPlanUpdated={async () => {
            // optional: refetch plan/report here if you want
          }}
        />
      </>
    );
  }

  if (isError || !report) {
    const message = extractRtkErrorMessage(error) ?? "Failed to load AI report";

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="error">
          {message}
        </Typography>
      </Box>
    );
  }

  // always arrays
  const strengths = report.strengths ?? [];
  const areasForImprovement = report.areasForImprovement ?? [];
  const actionableRecommendations = report.actionableRecommendations ?? [];

  const createdLabel = formatReportDateTime(report.createdAtIso);

  return (
    <>
      <Box sx={{ p: 2 }}>
        {/* ===== Top coach banner ===== */}
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "10px",
            p: { xs: 2, md: 2.5 },
            mb: 3,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2, md: 3 },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            background: isDark
              ? `linear-gradient(135deg,
          ${alpha(theme.palette.primary.main, 0.45)} 0%,
          ${alpha(theme.palette.primary.main, 0.22)} 45%,
          ${alpha(theme.palette.background.default, 0.9)} 100%)`
              : `linear-gradient(135deg,
            ${alpha(theme.palette.primary.main, 0.18)} 0%,
            ${alpha(theme.palette.primary.main, 0.08)} 40%,
            ${alpha(theme.palette.background.paper, 1)} 100%)`,
            border: `1px solid ${alpha(
              theme.palette.primary.main,
              isDark ? 0.5 : 0.3,
            )}`,
            boxShadow: isDark
              ? `0 18px 45px ${alpha(theme.palette.common.black, 0.7)}`
              : `0 14px 35px ${alpha(theme.palette.primary.main, 0.25)}`,
            "&::before": {
              content: '""',
              position: "absolute",
              inset: "-40%",
              background: `radial-gradient(circle at 0% 0%, ${alpha(
                theme.palette.common.white,
                isDark ? 0.06 : 0.28,
              )} 0, transparent 55%)`,
              pointerEvents: "none",
            },
          }}
        >
          {/* Left: avatar + greeting + copy */}
          <Stack spacing={2} sx={{ position: "relative", zIndex: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ flexWrap: "wrap" }}
            >
              {/* Avatar with gradient ring */}
              <Box
                sx={{
                  p: 0.3,
                  borderRadius: "999px",
                  background: `conic-gradient(
                  from 140deg,
                  ${alpha(theme.palette.primary.light, 0.9)},
                  ${alpha(theme.palette.secondary?.main || "#f97316", 0.9)},
                  ${alpha(theme.palette.primary.main, 0.9)}
                )`,
                }}
              >
                <Avatar
                  src="/ai-report.jpg"
                  alt="AI Coach"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: "999px",
                    border: `2px solid ${alpha(
                      theme.palette.background.paper,
                      0.9,
                    )}`,
                  }}
                />
              </Box>

              <Stack spacing={0.6}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 0.14,
                    textTransform: "uppercase",
                    opacity: isDark ? 0.9 : 0.75,
                  }}
                >
                  {AI_NAME}, your AI Report
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  Hi {firstName},
                </Typography>
                <Typography variant="h6" fontWeight={900} lineHeight={1.25}>
                  Here&apos;s your latest trading insights snapshot.
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 0.5, flexWrap: "wrap" }}
                >
                  <Chip
                    size="small"
                    icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                    label="AI-powered overview"
                    sx={{
                      borderRadius: "999px",
                      fontWeight: 600,
                      bgcolor: alpha(theme.palette.common.black, 0.06),
                      color: isDark ? "primary.contrastText" : "text.primary",
                    }}
                  />
                </Stack>
              </Stack>
            </Stack>

            <Typography
              variant="body2"
              sx={{
                maxWidth: 560,
                opacity: isDark ? 0.92 : 0.9,
              }}
            >
              This report summarizes how you&apos;ve traded recently, surfaces
              strengths you can double down on, and pinpoints a few areas where
              a small tweak could unlock a big improvement.
            </Typography>
          </Stack>

          {/* Right: meta info */}
          <Stack
            spacing={1.25}
            alignItems={{ xs: "flex-start", md: "flex-end" }}
            sx={{ position: "relative", zIndex: 1, minWidth: 220 }}
          >
            <Box
              sx={{
                borderRadius: "8px",
                px: 1.5,
                py: 1.25,
                bgcolor: alpha(
                  theme.palette.background.paper,
                  isDark ? 0.12 : 0.9,
                ),
                border: `1px solid ${alpha(
                  theme.palette.common.black,
                  isDark ? 0.4 : 0.05,
                )}`,
                backdropFilter: "blur(14px)",
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                minWidth: 0,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarTodayRoundedIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">
                  Created on{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    fontWeight={700}
                    sx={{ textDecoration: "underline" }}
                  >
                    {createdLabel}
                  </Typography>
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary">
                  Auto-updates every{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    fontWeight={700}
                  >
                    {report.autoUpdateFrequencyDays} days
                  </Typography>
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* Middle: strengths + areas */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          mb={2.5}
          alignItems="stretch"
        >
          <SectionCard
            title="Strengths"
            icon={<BoltRoundedIcon fontSize="small" />}
            color="#22c55e"
            items={strengths}
          />
          <SectionCard
            title="Areas for Improvement"
            icon={<WarningAmberRoundedIcon fontSize="small" />}
            color="#f97316"
            items={areasForImprovement}
          />
        </Stack>

        {/* Bottom: actionable recommendations */}
        <Box
          sx={{
            borderRadius: "6px",
            p: 2,
            background: () =>
              `linear-gradient(135deg, ${alpha("#f97316", 0.18)} 0%, ${alpha(
                "#f97316",
                0.08,
              )} 100%)`,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            mb={1.5}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: () => alpha("#f97316", 0.2),
                }}
              >
                <TipsAndUpdatesRoundedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" fontWeight={800}>
                Actionable Recommendations
              </Typography>
            </Stack>
            <Chip
              size="small"
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
              label="AI generated"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          <Stack spacing={1.25}>
            {actionableRecommendations.map((rec, idx) => (
              <Box
                key={idx}
                sx={{
                  borderRadius: "6px",
                  p: 1.5,
                  bgcolor: (theme) => theme.palette.background.paper,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {rec.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {rec.body}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </>
  );
};

export default AIReport;
