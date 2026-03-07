"use client";

import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { motion } from "framer-motion";
import { CONFIG } from "../../../global-config";
import { FeatureRowData } from "./types/feature-row";

// --- Animations ---
const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const cardFloat = keyframes`
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -10px, 0); }
  100% { transform: translate3d(0, 0, 0); }
`;

const cardGlow = keyframes`
  0% { box-shadow: 0 0 0px rgba(124,135,255,0.2), 0 0 0px rgba(56,189,248,0.15); }
  50% { box-shadow: 0 24px 55px rgba(124,135,255,0.55), 0 0 32px rgba(56,189,248,0.35); }
  100% { box-shadow: 0 0 0px rgba(124,135,255,0.2), 0 0 0px rgba(56,189,248,0.15); }
`;

// --- Data ---
const FEATURE_ROWS: FeatureRowData[] = [
  {
    label: "Always-on sync",
    title: "Your trading journal that stays synced automatically.",
    description: `Connect your cTrader platform once — ${CONFIG.appName} securely reads your account (read-only) via the cTrader API in near real-time. It mirrors the activity reported by the platform.`,
    bullets: [
      "Real-time, read-only sync of positions",
      "Organized, time-stamped journal",
    ],
    cta: "Connect your first account",
  },
  {
    label: "Advanced trade analytics",
    title: "Actionable insights for every trade.",
    description:
      "Turn raw trades into meaningful insights. Metrics like Total P&L, Win Rate, and Total Trades are displayed in clear cards and charts.",
    bullets: [
      "Review detailed performance for each trade",
      "Quick view of win rate and average return",
    ],
    cta: "Explore analytics",
  },
  {
    label: "AI Performance Reports",
    title: "Your personal trading analyst.",
    description:
      "The AI analyzes your recent history to generate a comprehensive snapshot of your trading behavior.",
    bullets: [
      "Automated breakdown of Strengths & Weaknesses",
      "Specific insights on risk management",
    ],
    cta: "Get your first AI report",
  },
  // {
  //   label: "Process & discipline",
  //   title: "Turn your trading habits into measurable results.",
  //   description: `Use ${CONFIG.appName} to categorize your trades, track adherence to your plan, and see how disciplined trading impacts your performance.`,
  //   bullets: [
  //     "Tag trades by mood, risk, or setup type",
  //     "Compare planned vs impulsive trades",
  //   ],
  //   cta: "Track your progress",
  // },
  {
    label: "Multi-account support",
    title: "Manage all your trading accounts in one place.",
    description: `Whether you have multiple live or demo accounts, ${CONFIG.appName} consolidates them so you can easily monitor performance without switching platforms.`,
    bullets: [
      "View all connected accounts in one dashboard",
      "Track performance across portfolios",
    ],
    cta: "View all accounts",
  },
];

// --- Components ---

const Features = () => {
  return (
    <Box
      id="features"
      sx={{
        scrollMarginTop: { xs: 96, sm: 110 },
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 6 },
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at 0% 0%, rgba(124,135,255,0.24), transparent 55%), radial-gradient(circle at 100% 100%, rgba(56,189,248,0.2), transparent 60%), linear-gradient(145deg, #050816, #070b18)"
            : "radial-gradient(circle at 0% 0%, rgba(124,135,255,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(56,189,248,0.16), transparent 60%), linear-gradient(145deg, #F9FAFF, #EEF2FF)",
      }}
    >
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
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
          <Stack
            spacing={1}
            alignItems="center"
            sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}
          >
            <Typography
              variant="overline"
              sx={{
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(191,219,254,0.9)"
                    : "rgba(79,70,229,0.95)",
              }}
            >
              Features
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                fontSize: { xs: "1.5rem", md: "1.9rem" },
              }}
            >
              {CONFIG.appName} turns your trading into an automated, structured
              process.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                maxWidth: 540,
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(226,232,255,0.78)"
                    : "rgba(30,64,175,0.9)",
              }}
            >
              Connect once. {CONFIG.appName} quietly journals every trade,
              delivers advanced data-driven analytics, and gives you an AI
              report so you stop guessing and start improving — faster.
            </Typography>
          </Stack>

          <Stack spacing={{ xs: 4, md: 5 }}>
            {FEATURE_ROWS.map((feature, index) => (
              <FeatureRow
                key={feature.title}
                feature={feature}
                flipped={index % 2 === 1}
                index={index}
              />
            ))}
          </Stack>
        </Container>
      </motion.div>
    </Box>
  );
};

export default Features;

function FeatureRow({
  feature,
  flipped,
  index,
}: {
  feature: FeatureRowData;
  flipped: boolean;
  index: number;
}) {
  return (
    <Stack
      direction={{
        xs: "column",
        md: flipped ? "row-reverse" : "row",
      }}
      spacing={{ xs: 2.5, md: 4 }}
      alignItems="center"
      justifyContent="space-between"
    >
      {/* Visual card */}
      <Box
        sx={{
          flexBasis: { xs: "100%", md: "45%" },
          display: "flex",
          justifyContent: flipped ? "flex-end" : "flex-start",
          width: "100%",
        }}
      >
        <FeatureVisual index={index} />
      </Box>

      {/* Text content */}
      <Box
        sx={{
          flexBasis: { xs: "100%", md: "55%" },
          textAlign: { xs: "left", md: "left" },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            display: "block",
            mb: 0.6,
            color: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(191,219,254,0.92)"
                : "rgba(59,130,246,0.95)",
          }}
        >
          {feature.label}
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            mb: 0.8,
            fontSize: { xs: "1.02rem", md: "1.15rem" },
          }}
        >
          {feature.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 1.3,
            color: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(226,232,255,0.8)"
                : "rgba(30,64,175,0.95)",
          }}
        >
          {feature.description}
        </Typography>
        <Stack spacing={0.6} sx={{ mb: 1.6 }}>
          {feature.bullets.map((b) => (
            <Stack
              key={b}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ width: "100%" }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #4F46E5, #22D3EE)",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(226,232,255,0.8)"
                      : "rgba(30,64,175,0.9)",
                  lineHeight: 1.25,
                  display: "block",
                }}
              >
                {b}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------
// CUSTOM VISUALS PER FEATURE
// ----------------------------------------------------------------------

function FeatureVisual({ index }: { index: number }) {
  const isDarkModeBg = (theme: any) => theme.palette.mode === "dark";

  // Shared inner content logic
  const renderInnerContent = () => {
    switch (index) {
      // 0: Always-on Sync (Keep existing style)
      case 0:
        return (
          <>
            <VisualHeader dotColor="#22C55E" text="cTrader ID: 4921 · Synced" />
            <Stack spacing={0.8}>
              <MiniRow label="Status" value="Active" valueColor="#4ADE80" />
              <MiniRow
                label="Latest Sync"
                value="Just now"
                valueColor="#E5E7EB"
              />
            </Stack>
            <VisualFooter />
          </>
        );

      // 1: Advanced Trade Analytics (Charts/Bars)
      case 1:
        return (
          <>
            <VisualHeader dotColor="#8B5CF6" text="Portfolio Performance" />
            {/* Simple Bar Chart Visualization */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                height: 50,
                px: 1,
                mb: 1,
              }}
            >
              {[30, 50, 25, 60, 45, 80].map((h, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 14,
                    height: `${h}%`,
                    borderRadius: "2px",
                    background:
                      i === 5
                        ? "linear-gradient(to top, #3B82F6, #60A5FA)"
                        : "rgba(99, 102, 241, 0.3)",
                  }}
                />
              ))}
            </Box>
            <VisualFooter />
          </>
        );

      // 2: AI Performance Reports (Strengths/Weaknesses)
      case 2:
        return (
          <>
            <VisualHeader dotColor="#F472B6" text="AI Analysis · Weekly" />
            <Stack spacing={1} sx={{ mt: 0.5 }}>
              <Box
                sx={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  borderRadius: 1.5,
                  p: 0.8,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box sx={{ fontSize: 10 }}>✨</Box>
                <Typography
                  sx={{ fontSize: 10, color: "#4ADE80", fontWeight: 600 }}
                >
                  Strength: High Win Rate
                </Typography>
              </Box>
              <Box
                sx={{
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.2)",
                  borderRadius: 1.5,
                  p: 0.8,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box sx={{ fontSize: 10 }}>⚠️</Box>
                <Typography
                  sx={{ fontSize: 10, color: "#FB7185", fontWeight: 600 }}
                >
                  Fix: Stop Revenge Trading
                </Typography>
              </Box>
            </Stack>
          </>
        );

      // 3: Process & Discipline (Tags)
      case 3:
        return (
          // <>
          //   <VisualHeader dotColor="#F59E0B" text="Trade Journal Tags" />
          //   <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 1 }}>
          //     <TagPill label="#A+ Setup" color="#22C55E" />
          //     <TagPill label="#FOMO" color="#EF4444" />
          //     <TagPill label="#Trend" color="#3B82F6" />
          //     <TagPill label="#Impulsive" color="#F97316" />
          //   </Box>
          //   <VisualFooter />
          // </>
          <>
            <VisualHeader dotColor="#0EA5E9" text="Connected Accounts" />
            <Stack spacing={0.8}>
              <MiniRow
                label="FTMO Challenge"
                value="$100k"
                valueColor="#E5E7EB"
              />
              <MiniRow
                label="Personal Live"
                value="$5.2k"
                valueColor="#E5E7EB"
              />
              <MiniRow label="Demo Test" value="$10k" valueColor="#94A3B8" />
            </Stack>
          </>
        );

      // 4: Multi-account (List of accounts)
      case 4:
        return (
          <>
            <VisualHeader dotColor="#0EA5E9" text="Connected Accounts" />
            <Stack spacing={0.8}>
              <MiniRow
                label="FTMO Challenge"
                value="$100k"
                valueColor="#E5E7EB"
              />
              <MiniRow
                label="Personal Live"
                value="$5.2k"
                valueColor="#E5E7EB"
              />
              <MiniRow label="Demo Test" value="$10k" valueColor="#94A3B8" />
            </Stack>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Paper
      sx={(theme) => ({
        width: 220,
        height: 160,
        borderRadius: "6px",
        p: 1.8,
        background: isDarkModeBg(theme)
          ? "linear-gradient(145deg, #020617, #0f172a)"
          : "linear-gradient(145deg, #e0f2fe, #e5e7eb)",
        border: "1px solid rgba(148,163,255,0.55)",
        position: "relative",
        overflow: "hidden",
        animation: `${cardFloat} 7s ease-in-out infinite, ${cardGlow} 9s ease-in-out infinite`,
      })}
    >
      {/* Soft glow circle in background */}
      <Box
        sx={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            index % 2 === 0
              ? "radial-gradient(circle, rgba(56,189,248,0.75), transparent 65%)"
              : "radial-gradient(circle, rgba(129,140,248,0.85), transparent 65%)",
          filter: "blur(2px)",
        }}
      />

      {/* Main Inner Card */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          position: "relative",
          height: "100%",
          borderRadius: "6px",
          p: 1.4,
          background: isDarkModeBg(theme)
            ? "linear-gradient(145deg, #020617, #020617)"
            : "linear-gradient(145deg, #FFFFFF, #EFF6FF)",
          border: "1px solid rgba(148,163,255,0.6)",
          display: "flex",
          flexDirection: "column",
        })}
      >
        {renderInnerContent()}
      </Paper>
    </Paper>
  );
}

// --- Helper Small Components for Visuals ---

function VisualHeader({ dotColor, text }: { dotColor: string; text: string }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "flex-start",
        borderRadius: 999,
        px: 0.8,
        py: 0.3,
        mb: "auto", // pushes content down
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.9))",
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          mr: 0.6,
          background: dotColor,
        }}
      />
      <Typography variant="caption" sx={{ fontSize: 9, color: "#E5E7EB" }}>
        {text}
      </Typography>
    </Box>
  );
}

function MiniRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        px: 1,
        py: 0.6,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, color: "#CBD5F5" }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          color: valueColor,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// function TagPill({ label, color }: { label: string; color: string }) {
//   return (
//     <Box
//       sx={{
//         px: 0.8,
//         py: 0.2,
//         borderRadius: 1,
//         background: `${color}22`, // low opacity bg
//         border: `1px solid ${color}44`,
//       }}
//     >
//       <Typography sx={{ fontSize: 9, color: color, fontWeight: 600 }}>
//         {label}
//       </Typography>
//     </Box>
//   );
// }

function VisualFooter() {
  return (
    <Box
      sx={{
        mt: "auto",
        borderRadius: 999,
        height: 6,
        width: "100%",
        background:
          "linear-gradient(90deg, rgba(56,189,248,0.4), rgba(129,140,248,0.9))",
      }}
    />
  );
}
