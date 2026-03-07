"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Stack,
} from "@mui/material";
import GppBadRoundedIcon from "@mui/icons-material/GppBadRounded"; // Or LockIcon

export default function UnauthorizedPage() {
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Paper
          elevation={0} // Using the custom shadow from your theme.ts automatically
          sx={{
            p: { xs: 3, sm: 5 },
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            // We add a slight backdrop blur to make it pop against your gradient background
            backdropFilter: "blur(20px)",
            backgroundColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(17, 18, 26, 0.7)"
                : "rgba(255, 255, 255, 0.8)",
          }}
        >
          {/* Icon Area */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "error.light", // Light red background
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
              opacity: 0.2, // Subtle background circle
              position: "absolute",
            }}
          />
          <GppBadRoundedIcon
            sx={{ fontSize: 48, color: "error.main", mb: 3, zIndex: 1 }}
          />

          {/* Typography */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "3rem", sm: "4rem" },
              color: "error.main",
              mb: 1,
              lineHeight: 1,
            }}
          >
            403
          </Typography>

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Access Denied
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: "400px" }}
          >
            You do not have permission to access this dashboard. Please contact
            your administrator if you believe this is a mistake.
          </Typography>

          {/* Actions */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              color="primary"
            >
              Go to Home
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
