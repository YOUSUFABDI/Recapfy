import GoogleIcon from "@/components/_shared/GoogleIcon";
import toast from "@/components/toast/toast";
import type { AppDispatch, RootState } from "@/store";
import { API } from "@/store/api";
import { fetchMe, login, resetStatus } from "@/store/auth/authSlice";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../hooks/useAuth";

export const LoginView = () => {
  const theme = useTheme();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const { status, user } = useSelector((s: RootState) => s.auth);
  const loading = status === "loading";
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { isAuthenticated } = useAuth();

  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.primary.main;

  const getRedirectPath = (userRole: string | undefined) => {
    if (returnTo && returnTo.startsWith("/")) {
      // if a standard USER tries to go to the Admin Dashboard, force them to connect
      if (userRole === "USER" && returnTo === "/dashboard") {
        return "/dashboard/connect";
      }
      return returnTo;
    }

    if (userRole === "ADMIN") {
      return "/dashboard";
    }
    return "/dashboard/connect";
  };

  const handleGoogleLogin = () => {
    const stateParam = returnTo && returnTo.startsWith("/") ? returnTo : "";

    window.location.href = `${API}/auth/google?state=${encodeURIComponent(
      stateParam,
    )}`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      const loginPromise = dispatch(login({ email, password })).unwrap();

      await toast.promise(loginPromise, {
        loading: "Signing you in…",
        success: "Welcome back 👋",
        error: (err) => (typeof err === "string" ? err : "Login failed"),
      });

      const userData = await dispatch(fetchMe()).unwrap();
      const targetPath = getRedirectPath(userData.role);
      console.log("targetPath", targetPath);
      router.push(targetPath);
    } catch {}
  };

  useEffect(() => {
    dispatch(resetStatus());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const targetPath = getRedirectPath(user.role);
      router.replace(targetPath);
    }
  }, [isAuthenticated, returnTo, router, user]);

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        py: 4,
      }}
    >
      {/* Main Content */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
        <Paper
          sx={{
            p: 4,
            width: "100%",
            borderRadius: "6px",
            background: `
            linear-gradient(135deg, ${alpha(
              accent,
              isDark ? 0.15 : 0.1,
            )} 0%, ${alpha(accent, isDark ? 0.05 : 0.03)} 100%),
            ${theme.palette.background.paper}
          `,
            border: `1px solid ${alpha(accent, isDark ? 0.25 : 0.15)}`,
            boxShadow: isDark
              ? "0 10px 24px rgba(0,0,0,.35)"
              : "0 8px 20px rgba(16,24,40,.08)",
          }}
        >
          <Stack spacing={3}>
            {/* Title */}
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to your account to continue
              </Typography>
            </Box>

            {/* Google Login Button */}
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleGoogleLogin}
              disabled={loading}
              startIcon={<GoogleIcon sx={{ fontSize: 20 }} />}
              sx={{
                borderRadius: "6px",
                py: 1.5,
                borderColor: alpha(accent, 0.3),
                color: "text.primary",
                fontWeight: 600,
                "&:hover": {
                  borderColor: accent,
                  bgcolor: alpha(accent, 0.08),
                },
              }}
            >
              Continue with Google
            </Button>

            {/* Divider */}
            <Divider
              sx={{
                color: "text.secondary",
                "&::before, &::after": {
                  borderColor: alpha(accent, 0.2),
                },
              }}
            >
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            {/* Email/Password Form */}
            <Box component="form" onSubmit={handleEmailLogin}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "6px",
                    },
                  }}
                />

                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "6px",
                    },
                  }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Link
                    component="a"
                    href="/reset-password"
                    underline="hover"
                    sx={{
                      color: accent,
                      fontWeight: 600,
                      fontSize: 14,
                      "&:hover": {
                        color: isDark ? alpha(accent, 0.8) : alpha(accent, 0.9),
                      },
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    borderRadius: "6px",
                    py: 1.5,
                    fontWeight: 700,
                    bgcolor: accent,
                    "&:hover": {
                      bgcolor: isDark
                        ? alpha(accent, 0.9)
                        : alpha(accent, 0.95),
                    },
                  }}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </Stack>
            </Box>

            {/* Sign Up Link */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 0.5,
                pt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Don&apos;t have an account?
              </Typography>
              <Link
                component={NextLink}
                href="/signup"
                underline="hover"
                sx={{
                  color: accent,
                  fontWeight: 700,
                  "&:hover": {
                    color: isDark ? alpha(accent, 0.8) : alpha(accent, 0.9),
                  },
                }}
              >
                Sign up
              </Link>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};
