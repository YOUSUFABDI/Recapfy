"use client";

import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from "@/store/auth/auth";
import {
  ArrowBack,
  Email,
  LockReset,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { MuiOtpInput } from "mui-one-time-password-input";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const ResetPasswordView = () => {
  const router = useRouter();
  const theme = useTheme();

  // Stages: 'EMAIL' | 'OTP_AND_RESET'
  const [stage, setStage] = useState<"EMAIL" | "OTP_AND_RESET">("EMAIL");

  // Form State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // API Hooks
  const [forgotPassword, { isLoading: isSendingOtp, error: sendOtpError }] =
    useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResetting, error: resetError }] =
    useResetPasswordMutation();

  // Handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
      setStage("OTP_AND_RESET");
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await resetPassword({
        email,
        otp: Number(otp),
        newPassword,
      }).unwrap();
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const getErrorMessage = (error: any) => {
    if (!error) return null;
    return (
      (error as any).data?.error?.message ||
      (error as any).error ||
      "An unexpected error occurred"
    );
  };

  // OTP Validation helper for the specific input component
  const handleOtpChange = (newValue: string) => {
    // Only allow numbers if you want strict numeric, otherwise just setOtp(newValue)
    if (/^\d*$/.test(newValue)) {
      setOtp(newValue);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Paper elevation={0} sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box textAlign="center">
            <LockReset color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {stage === "EMAIL" ? "Forgot Password?" : "Reset Password"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stage === "EMAIL"
                ? "Enter your email address to receive a verification code."
                : `We've sent a code to ${email}`}
            </Typography>
          </Box>

          {/* Error Display */}
          {(sendOtpError || resetError) && (
            <Alert severity="error">
              {getErrorMessage(sendOtpError || resetError)}
            </Alert>
          )}

          {stage === "EMAIL" ? (
            // --- STEP 1: EMAIL FORM ---
            <form onSubmit={handleSendOtp}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? "Sending..." : "Send Reset Code"}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => router.push("/login")}
                >
                  Back to Login
                </Button>
              </Stack>
            </form>
          ) : (
            // --- STEP 2: OTP & NEW PASSWORD FORM ---
            <form onSubmit={handleResetSubmit}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ mb: 1, display: "block", color: "text.secondary" }}
                  >
                    Enter 6-digit Code
                  </Typography>
                  <MuiOtpInput
                    value={otp}
                    onChange={handleOtpChange}
                    length={6}
                    gap={1}
                    validateChar={(char) => !isNaN(Number(char))}
                    TextFieldsProps={{
                      placeholder: "-",
                      size: "medium",
                    }}
                    sx={{
                      // Custom styling to match your theme rounded corners
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "6px",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: theme.palette.divider,
                      },
                    }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  error={
                    newPassword !== confirmPassword && confirmPassword !== ""
                  }
                  helperText={
                    newPassword !== confirmPassword && confirmPassword !== ""
                      ? "Passwords do not match"
                      : ""
                  }
                />

                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </Button>

                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => setStage("EMAIL")}
                  fullWidth
                >
                  Change Email
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default ResetPasswordView;
