"use client";

import { Box, Typography, Link } from "@mui/material";

import { CONFIG } from "../../../global-config";

const Footer = () => {
  const supportEmail = CONFIG.supportEmail ?? "support@guulsync.com";

  return (
    <Box
      component="footer"
      sx={{
        pt: 3,
        pb: 4,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        © {new Date().getFullYear()} {CONFIG.appName}.
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Built for traders.
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Support:{" "}
          <Link
            href={`mailto:${supportEmail}`}
            underline="hover"
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
            {supportEmail}
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;
