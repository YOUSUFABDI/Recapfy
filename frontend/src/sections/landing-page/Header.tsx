"use client";

import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import Logo from "@/layouts/dashboard/Logo";
import { useAuth } from "../auth/hooks/useAuth";
import { useUser } from "../auth/hooks/useUser";

const ThemeModeToggle = dynamic(() => import("@/components/ThemeModeToggle"), {
  ssr: false,
  loading: () => (
    <span style={{ display: "inline-block", width: 32, height: 32 }} />
  ),
});

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const Header = () => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const user = useUser();

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

  const scrollToSection = (id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavClick = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "fixed",
          top: 12,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Paper
            component={motion.div}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.45, ease: "easeOut" }}
            elevation={0}
            sx={{
              pointerEvents: "auto",
              width: { xs: "100%", sm: "auto" },
              mx: { xs: 1.5, sm: 0 },
              px: { xs: 1.6, md: 2.6 },
              py: hasScrolled ? 0.7 : 0.85,
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, rgba(6,8,20,0.96), rgba(15,23,42,0.96))"
                  : "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
              border: (theme) =>
                `1px solid ${
                  theme.palette.mode === "dark"
                    ? "rgba(148,163,255,0.75)"
                    : "rgba(148,163,255,0.45)"
                }`,
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? hasScrolled
                    ? "0 18px 45px rgba(0,0,0,0.95), 0 0 0 1px rgba(15,23,42,0.8)"
                    : "0 18px 45px rgba(0,0,0,0.85), 0 0 0 1px rgba(15,23,42,0.7)"
                  : hasScrolled
                    ? "0 20px 46px rgba(15,23,42,0.2)"
                    : "0 18px 40px rgba(15,23,42,0.16)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              transform: hasScrolled ? "translateY(0px)" : "translateY(4px)",
              transition:
                "transform 0.25s ease-out, box-shadow 0.25s ease-out, padding 0.25s ease-out, background 0.25s ease-out, border-color 0.25s ease-out",
            }}
          >
            {/* Left: Logo */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                minWidth: 0,
              }}
            >
              <Logo />
            </Box>

            {/* Center nav (desktop only) */}
            <Stack
              direction="row"
              spacing={3}
              alignItems="center"
              sx={{
                display: { xs: "none", md: "flex" },
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              <Button
                size="small"
                variant="text"
                onClick={() => scrollToSection("features")}
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(248,250,252,0.9)"
                      : "rgba(15,23,42,0.85)",
                  fontSize: 14,
                  textTransform: "none",
                }}
              >
                Features
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => scrollToSection("pricing")}
                sx={{
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(248,250,252,0.9)"
                      : "rgba(15,23,42,0.85)",
                  fontSize: 14,
                  textTransform: "none",
                }}
              >
                Pricing
              </Button>
            </Stack>

            {/* Right actions */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                flexShrink: 0,
              }}
            >
              {/* Desktop actions */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  display: { xs: "none", sm: "flex" },
                }}
              >
                {!isAuthenticated ? (
                  <Button
                    component={NextLink}
                    href="/signup"
                    size="small"
                    variant="contained"
                    sx={{
                      borderRadius: "6px",
                      px: 2.5,
                      py: 0.6,
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 14px 35px rgba(124,135,255,0.8)"
                          : "0 14px 28px rgba(15,23,42,0.18)",
                    }}
                  >
                    Get started
                  </Button>
                ) : (
                  <Button
                    component={NextLink}
                    href={
                      user?.role === "ADMIN"
                        ? "/dashboard"
                        : "dashboard/connect"
                    }
                    size="small"
                    variant="contained"
                    sx={{
                      borderRadius: "6px",
                      px: 2.5,
                      py: 0.6,
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 14px 35px rgba(124,135,255,0.8)"
                          : "0 14px 28px rgba(15,23,42,0.18)",
                    }}
                  >
                    Dashboard
                  </Button>
                )}
              </Stack>

              {/* Theme toggle always visible */}
              <ThemeModeToggle />

              {/* Mobile menu button */}
              <IconButton
                edge="end"
                onClick={() => setMobileOpen(true)}
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  ml: 0.5,
                }}
              >
                <MenuRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: (theme) => ({
            width: 260,
            borderRadius: "0",
            borderLeft: "none",
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(145deg, #020617, #020617)"
                : "linear-gradient(145deg, #FFFFFF, #EFF6FF)",
            border: (t) =>
              `1px solid ${
                t.palette.mode === "dark"
                  ? "rgba(148,163,255,0.6)"
                  : "rgba(129,140,248,0.4)"
              }`,
            boxShadow:
              "0 24px 80px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,0.4)",
          }),
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Drawer header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Logo />
            </Box>
            <IconButton onClick={() => setMobileOpen(false)}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          {/* Nav links */}
          <Stack spacing={1}>
            <Button
              variant="text"
              onClick={() => handleNavClick("features")}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontSize: 14,
              }}
            >
              Features
            </Button>
            <Button
              variant="text"
              onClick={() => handleNavClick("pricing")}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontSize: 14,
              }}
            >
              Pricing
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* CTA buttons */}
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            {!isAuthenticated ? (
              <Button
                component={NextLink}
                href="/signup"
                variant="contained"
                fullWidth
                sx={{
                  borderRadius: "6px",
                  fontWeight: 600,
                }}
                onClick={() => setMobileOpen(false)}
              >
                Get started
              </Button>
            ) : (
              <Button
                component={NextLink}
                href={
                  user?.role === "ADMIN" ? "/dashboard" : "dashboard/connect"
                }
                variant="contained"
                fullWidth
                sx={{
                  borderRadius: "6px",
                  fontWeight: 600,
                }}
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Button>
            )}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Typography
            variant="caption"
            sx={{
              mt: 2,
              color: "text.secondary",
            }}
          >
            Built for traders.
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
