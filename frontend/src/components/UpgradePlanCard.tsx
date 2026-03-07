"use client";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = {
  label: string;
  variant?: "contained" | "outlined";
  onClick: () => void;
  subtitle?: string;
};

export default function UpgradePlanCard({
  label,
  variant = "contained",
  onClick,
  subtitle,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "6px",
        p: 1.5,
        border: `1px solid ${alpha(
          theme.palette.primary.main,
          isDark ? 0.35 : 0.22
        )}`,
        background: isDark
          ? `linear-gradient(135deg,
              ${alpha(theme.palette.primary.main, 0.22)} 0%,
              ${alpha(theme.palette.background.paper, 0.65)} 55%,
              ${alpha(theme.palette.background.paper, 0.9)} 100%)`
          : `linear-gradient(135deg,
              ${alpha(theme.palette.primary.main, 0.14)} 0%,
              ${alpha(theme.palette.background.paper, 0.9)} 60%,
              ${alpha(theme.palette.background.paper, 1)} 100%)`,
        boxShadow: isDark
          ? `0 14px 30px ${alpha("#000", 0.55)}`
          : `0 12px 26px ${alpha(theme.palette.primary.main, 0.18)}`,
        transition: "transform .15s ease, box-shadow .15s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: isDark
            ? `0 18px 40px ${alpha("#000", 0.6)}`
            : `0 16px 34px ${alpha(theme.palette.primary.main, 0.24)}`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "-40%",
          background: `radial-gradient(circle at 20% 0%,
            ${alpha(theme.palette.primary.main, isDark ? 0.18 : 0.16)} 0%,
            transparent 55%)`,
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: -60,
          right: -60,
          width: 140,
          height: 140,
          borderRadius: "6px",
          background: `radial-gradient(circle,
            ${alpha(theme.palette.primary.main, isDark ? 0.28 : 0.22)} 0%,
            transparent 60%)`,
          filter: "blur(10px)",
          pointerEvents: "none",
        },
      }}
    >
      <Stack spacing={1.25} sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Chip
            size="small"
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
            label="Pro"
            sx={{
              borderRadius: 9999,
              fontWeight: 700,
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.22 : 0.12),
              color: theme.palette.text.primary,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            }}
          />
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 9999,
              display: "grid",
              placeItems: "center",
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
            }}
          >
            <BoltRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
        </Stack>

        <Box>
          <Typography variant="subtitle1" fontWeight={900} lineHeight={1.15}>
            Unlock AI + Premium tools
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle ?? "Upgrade your plan to access advanced features."}
          </Typography>
        </Box>

        <Button
          variant={variant}
          fullWidth
          onClick={onClick}
          sx={{
            borderRadius: "6px",
            fontWeight: 900,
            py: 1.1,
            ...(variant === "contained"
              ? {
                  boxShadow: `0 10px 24px ${alpha(
                    theme.palette.primary.main,
                    isDark ? 0.28 : 0.22
                  )}`,
                }
              : {}),
          }}
        >
          {label}
        </Button>
      </Stack>
    </Box>
  );
}
