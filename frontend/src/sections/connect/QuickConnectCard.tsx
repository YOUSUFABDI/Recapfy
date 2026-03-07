"use client";

import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { alpha, darken, lighten, useTheme } from "@mui/material/styles";
import BrandPanel from "../../components/_shared/BrandPanel";

type Props = {
  logo?: string;
  title?: string;
  description?: string;
  BtnText?: string;
  onGoConnect?: () => void;
  comingSoon?: boolean;
  disabled?: boolean;
};

export default function QuickConnectCard({
  logo,
  title,
  description,
  BtnText,
  onGoConnect,
  comingSoon,
}: Props) {
  const t = useTheme();
  const ACCENT = t.palette.primary.main;
  const BTN_TEXT = t.palette.getContrastText(ACCENT);
  const hover =
    t.palette.mode === "dark" ? lighten(ACCENT, 0.08) : darken(ACCENT, 0.06);

  return (
    <BrandPanel variant="brand" sx={{ height: "100%" }}>
      <Stack spacing={2} sx={{ height: "100%" }}>
        {/* icon pill */}
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: `6px`,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(ACCENT, 0.18),
            border: `1px solid ${alpha(ACCENT, 0.35)}`,
          }}
        >
          <Avatar src={logo} />
        </Box>

        <Typography variant="h5" fontWeight={800}>
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color:
              t.palette.mode === "dark"
                ? alpha(t.palette.common.white, 0.85)
                : t.palette.text.secondary,
          }}
        >
          {description}
        </Typography>

        {/* flex spacer to push divider + button to the bottom */}
        <Box sx={{ flex: 1 }} />

        <Box sx={{ mt: 0.5, borderTop: `1px solid ${alpha(ACCENT, 0.2)}` }} />

        {comingSoon ? (
          <Button
            variant="contained"
            onClick={onGoConnect}
            sx={{
              alignSelf: "start",
              mt: 1,
              fontWeight: 700,
              borderRadius: `6px`,
              bgcolor: ACCENT,
              color: BTN_TEXT,
              "&:hover": { bgcolor: hover },
              pointerEvents: "none",
            }}
          >
            {/* Connect New Platform */}
            Coming Soon
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onGoConnect}
            endIcon={<OpenInNewRoundedIcon />}
            sx={{
              alignSelf: "start",
              mt: 1,
              fontWeight: 700,
              borderRadius: `6px`,
              bgcolor: ACCENT,
              color: BTN_TEXT,
              "&:hover": { bgcolor: hover },
            }}
          >
            {BtnText}
          </Button>
        )}
      </Stack>
    </BrandPanel>
  );
}
