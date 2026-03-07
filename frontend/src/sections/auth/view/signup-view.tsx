"use client";

import GoogleIcon from "@/components/_shared/GoogleIcon";
import toast from "@/components/toast/toast";
import type { AppDispatch, RootState } from "@/store";
import { API } from "@/store/api";
import { signup } from "@/store/auth/authSlice";
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
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const SignupView = () => {
  const theme = useTheme();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const dispatch = useDispatch<AppDispatch>();
  const { status } = useSelector((s: RootState) => s.auth);
  const loading = status === "loading";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleGoogleSignup = () => {
    window.location.href = `${API}/auth/google`;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be 8 characters");
      return;
    }

    try {
      // 1. Dispatch signup
      const result = await dispatch(
        signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      ).unwrap();
      // console.log("result", result);

      // 2. Handle Success (2-step flow)
      toast.success(result.message || "OTP sent! Please verify your email.");

      // 3. Redirect to Verify Page with email
      const encodedEmail = encodeURIComponent(formData.email);
      router.push(`/verify?email=${encodedEmail}`);
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Signup failed");
    }
  };

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.primary.main;
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
                Create an account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign up to get started with your trading journey
              </Typography>
            </Box>

            {/* Google Signup Button */}
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleGoogleSignup}
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
              Sign up with Google
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

            {/* Registration Form */}
            <Box component="form" onSubmit={handleEmailSignup}>
              <Stack spacing={2.5}>
                <TextField
                  label="Full Name"
                  type="text"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleChange("name")}
                  disabled={loading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "6px",
                    },
                  }}
                />

                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={formData.email}
                  onChange={handleChange("email")}
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
                  value={formData.password}
                  onChange={handleChange("password")}
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

                <TextField
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  fullWidth
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? (
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
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </Stack>
            </Box>

            {/* Login Link */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 0.5,
                pt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Already have an account?
              </Typography>
              <Link
                component={NextLink}
                href="/login"
                underline="hover"
                sx={{
                  color: accent,
                  fontWeight: 700,
                  "&:hover": {
                    color: isDark ? alpha(accent, 0.8) : alpha(accent, 0.9),
                  },
                }}
              >
                Sign in
              </Link>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

export default SignupView;
