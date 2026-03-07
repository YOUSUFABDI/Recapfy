"use client";

import { Box, useTheme } from "@mui/material";
import Link from "next/link";

export default function Logo() {
  const theme = useTheme();
  return (
    <Box component={Link} href="/" sx={{ textDecoration: "none" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <img
          src={
            theme.palette.mode === "dark" ? "/dark-logo.png" : "/light-logo.png"
          }
          alt="logo"
          style={{ objectFit: "contain", width: "150px", height: "50px" }}
        />
      </Box>
    </Box>
  );
}
