"use client";

import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { motion } from "framer-motion";

import toast from "@/components/toast/toast";
import { API } from "@/store/api";
import { CONFIG } from "../../../global-config";
import Tag from "@/components/Tag";

// Simple animation presets
const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

// Hero background animations
const floatStar = keyframes`
  0% { transform: translate3d(0, 0, 0); opacity: 0.6; }
  50% { opacity: 1; }
  100% { transform: translate3d(0, -20px, 0); opacity: 0.7; }
`;

// Twinkling for stars – only opacity (no transform to avoid conflict)
const twinkle = keyframes`
  0% { opacity: 0.15; }
  50% { opacity: 1; }
  100% { opacity: 0.25; }
`;

// Slow drift to make stars gently move like a real sky
const starDrift = keyframes`
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(10px, -8px, 0); }
  100% { transform: translate3d(-6px, 10px, 0); }
`;

// Pre-defined star positions so no randomness / hydration issues
const STAR_POINTS: Array<[string, string, "left" | "right"]> = [
  ["6%", "8%", "left"],
  ["10%", "22%", "left"],
  ["14%", "36%", "left"],
  ["18%", "52%", "left"],
  ["22%", "68%", "left"],
  ["8%", "14%", "right"],
  ["12%", "30%", "right"],
  ["16%", "46%", "right"],
  ["20%", "62%", "right"],
  ["24%", "78%", "right"],

  ["30%", "10%", "left"],
  ["34%", "26%", "left"],
  ["38%", "40%", "left"],
  ["42%", "56%", "left"],
  ["46%", "70%", "left"],
  ["28%", "18%", "right"],
  ["32%", "34%", "right"],
  ["36%", "50%", "right"],
  ["40%", "66%", "right"],
  ["44%", "82%", "right"],

  ["52%", "12%", "left"],
  ["56%", "28%", "left"],
  ["60%", "44%", "left"],
  ["64%", "60%", "left"],
  ["68%", "76%", "left"],
  ["50%", "20%", "right"],
  ["54%", "36%", "right"],
  ["58%", "52%", "right"],
  ["62%", "68%", "right"],
  ["66%", "84%", "right"],

  ["72%", "14%", "left"],
  ["76%", "30%", "left"],
  ["80%", "46%", "left"],
  ["84%", "62%", "left"],
  ["88%", "78%", "left"],
  ["70%", "22%", "right"],
  ["74%", "38%", "right"],
  ["78%", "54%", "right"],
  ["82%", "70%", "right"],
  ["86%", "86%", "right"],
];

const Hero = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Respect reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Memoize star markup so it doesn't rerender needlessly
  const stars = useMemo(
    () =>
      STAR_POINTS.map(([top, offset, side], index) => {
        const size = index % 4 === 0 ? 3 : 2;
        const twinkleDuration = 2.4 + (index % 5) * 0.4;
        const driftDuration = 16 + (index % 6) * 2;
        const delay = index * 0.25;

        return (
          <Box
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            sx={(theme) => ({
              position: "absolute",
              top,
              ...(side === "right" ? { right: offset } : { left: offset }),
              width: size,
              height: size,
              borderRadius: "50%",
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.98)"
                  : "rgba(99,102,241,0.95)",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 0 12px rgba(255,255,255,0.9)"
                  : "0 0 14px rgba(129,140,248,0.9)",
              animation: prefersReducedMotion
                ? "none"
                : `${twinkle} ${twinkleDuration}s ease-in-out infinite alternate, ${starDrift} ${driftDuration}s ease-in-out infinite alternate`,
              animationDelay: prefersReducedMotion
                ? "0s"
                : `${delay}s, ${delay * 0.6}s`,
            })}
          />
        );
      }),
    [prefersReducedMotion]
  );

  // Scroll listener to animate header state
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return;
      setHasScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleUpgradeToPro = async () => {
    const token = localStorage.getItem("auth:token");

    if (!token) {
      toast.error?.("You need to be logged in to upgrade.");
      return;
    }

    try {
      setIsUpgrading(true);

      const res = await fetch(`${API}/billing/pro/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Upgrade error:", text);
        throw new Error("Failed to start checkout. Please try again.");
      }

      const data = await res.json();
      console.log("Checkout response:", data);

      const paymentUrl =
        data?.url ??
        data?.data?.url ??
        data?.payload?.url ??
        data?.payload?.data?.url;

      if (!paymentUrl) {
        console.error("Checkout response without url:", data);
        throw new Error("No payment URL returned from server.");
      }

      window.location.href = paymentUrl;
    } catch (err: any) {
      console.error(err);
      toast.error?.(err.message || "Could not start upgrade.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <motion.div id="hero" style={{ perspective: 1000 }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "#050816" : "#F5F7FF",
          color: (theme) =>
            theme.palette.mode === "dark"
              ? theme.palette.common.white
              : theme.palette.text.primary,
          px: { xs: 2.5, md: 0 },
          py: { xs: 6, md: 8 },
        }}
      >
        {/* Soft galaxy noise / grid overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: (theme) =>
              theme.palette.mode === "dark"
                ? "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.07), transparent 60%), radial-gradient(circle at 100% 0%, rgba(124,135,255,0.18), transparent 60%), radial-gradient(circle at 50% 120%, rgba(124,135,255,0.4), transparent 65%)"
                : "radial-gradient(circle at 0% 0%, rgba(15,23,42,0.05), transparent 60%), radial-gradient(circle at 100% 0%, rgba(124,135,255,0.18), transparent 60%), radial-gradient(circle at 50% 120%, rgba(148,163,255,0.2), transparent 65%)",
            opacity: 0.85,
            zIndex: 1,
          }}
        />

        {/* Stars */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 1,
            zIndex: 2,
          }}
        >
          {stars}

          {/* Floating soft orbs */}
          <Box
            sx={{
              position: "absolute",
              top: "55%",
              left: "12%",
              width: 130,
              height: 130,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(124,135,255,0.75), transparent 70%)",
              filter: "blur(16px)",
              animation: prefersReducedMotion
                ? "none"
                : `${floatStar} 8s ease-in-out infinite alternate`,
              mixBlendMode: "screen",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "6%",
              right: "-6%",
              width: 190,
              height: 190,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(124,135,255,0.6), transparent 70%)",
              filter: "blur(22px)",
              animation: prefersReducedMotion
                ? "none"
                : `${floatStar} 10s ease-in-out infinite alternate`,
              animationDelay: "1.3s",
              mixBlendMode: "screen",
            }}
          />

          {/* Vertical glowing bar */}
          <Box
            sx={{
              position: "absolute",
              top: "10%",
              left: "50%",
              width: 2,
              height: "60%",
              transform: "translateX(-50%)",
              background:
                "linear-gradient(to bottom, transparent, rgba(124,135,255,0.95), transparent)",
              opacity: 0.9,
              filter: "blur(1px)",
            }}
          />
        </Box>

        {/* Hero content */}
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 3 }}>
          <motion.div
            variants={prefersReducedMotion ? undefined : fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Stack spacing={2} alignItems="center">
              {/* <Chip
                label="cTrader live · MT4 & MT5 coming soon"
                size="small"
                sx={{
                  borderRadius: 999,
                  fontWeight: 500,
                  px: 1.8,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(124,135,255,0.22)"
                      : "rgba(124,135,255,0.12)",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(231,233,255,0.96)"
                      : theme.palette.text.primary,
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
                  backdropFilter: "blur(6px)",
                }}
              /> */}

              <Typography
                variant="h3"
                component="h1"
                fontWeight={800}
                sx={{
                  mt: 1,
                  letterSpacing: -0.5,
                  fontSize: { xs: "2.1rem", md: "2.8rem" },
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "#F7F7FF"
                      : theme.palette.text.primary,
                  textAlign: "center",
                }}
              >
                Automatic trade journal + AI report
                <br />
                Connect cTrader — sync every account, trade — no uploads, no
                spreadsheets.
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  maxWidth: 640,
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(226,229,255,0.82)"
                      : "rgba(15,23,42,0.78)",
                  mt: 1,
                  textAlign: "center",
                }}
              >
                {CONFIG.appName} gives you daily analytics and AI-written
                reports that highlight what’s increasing your edge, where you’re
                losing performance, and concrete steps to improve.
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="center"
                sx={{ mt: 2 }}
              >
                <Button
                  component={NextLink}
                  href="/signup"
                  size="large"
                  variant="contained"
                  sx={{
                    borderRadius: "6px",
                    px: 4,
                    py: 1,
                    fontWeight: 700,
                    boxShadow: (theme) =>
                      theme.palette.mode === "dark"
                        ? "0 20px 45px rgba(124,135,255,0.9)"
                        : "0 20px 45px rgba(15,23,42,0.18)",
                  }}
                >
                  Get start now
                </Button>
                {/* <Button
                  size="large"
                  variant="outlined"
                  onClick={handleUpgradeToPro}
                  disabled={isUpgrading}
                  sx={{
                    borderRadius: "6px",
                    borderColor: "rgba(124,135,255,0.7)",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "#E5E7FF"
                        : theme.palette.primary.main,
                    "&:hover": {
                      borderColor: "#7C87FF",
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(124,135,255,0.16)"
                          : "rgba(124,135,255,0.08)",
                    },
                  }}
                >
                  {isUpgrading
                    ? "Redirecting…"
                    : "Upgrade to Pro — 14-day trial"}
                </Button> */}
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ mt: 3 }}
              >
                <Tag text="Automated trading journal" />
                <Tag text="Deep analytics" />
                <Tag text="AI report" />
                <Tag text="Secure & private" />
              </Stack>

              <Box
                sx={{
                  mt: 2,
                  color: "text.secondary",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Trusted by independent traders — bank-grade security, no manual
                uploads.
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>
    </motion.div>
  );
};

export default Hero;
