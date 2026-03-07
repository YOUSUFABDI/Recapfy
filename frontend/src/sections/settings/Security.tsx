"use client";

import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { useForm } from "react-hook-form";
import { z as zod } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useUser } from "@/sections/auth/hooks/useUser";
import { useChangePasswordMutation } from "@/store/auth/auth";
import { fetchMe } from "@/store/auth/authSlice";
import { useDispatch } from "react-redux";
import toast from "@/components/toast/toast";

// =====================
// Validation Schema
// =====================
const ChangePasswordSchema = zod
  .object({
    currentPassword: zod.string().optional(),
    newPassword: zod.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: zod.string().min(8, "Confirm password is required"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: zod.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

type ChangePasswordFormValues = zod.infer<typeof ChangePasswordSchema>;

// Helper to extract a readable message from RTK Query error
const extractErrorMessage = (err: any): string => {
  // fetchBaseQuery error shape
  if (err?.data) {
    const data = err.data;
    if (typeof data === "string") return data;
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message) && typeof data.message[0] === "string") {
      return data.message[0];
    }
    if (typeof data.error === "string") return data.error;
  }
  // generic / network errors
  if (typeof err?.error === "string") return err.error;
  if (typeof err?.message === "string") return err.message;
  return "Failed to update password.";
};

// =====================
// Component
// =====================
const Security: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const dispatch = useDispatch<any>();

  const user = useUser() as any;
  const hasPassword: boolean = user?.hasPassword ?? false;

  // Show/hide states for password fields
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    // Capture what the UI *thought* before submitting
    const hadPasswordBefore = hasPassword;

    const payload: { currentPassword?: string; newPassword: string } = {
      newPassword: values.newPassword,
    };

    if (hadPasswordBefore) {
      payload.currentPassword = values.currentPassword;
    }

    try {
      // ✅ unwrap() makes RTK Query throw on non-2xx responses
      await changePassword(payload).unwrap();

      toast.success(
        hadPasswordBefore
          ? "Password updated successfully."
          : "Password set successfully. You can now log in with email and password."
      );

      // 🔁 Refetch /auth/me so Redux user (and hasPassword) update
      dispatch(fetchMe());

      reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Optionally reset visibility
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      const message = extractErrorMessage(err);

      // If backend says current password is wrong, show it on the field
      if (
        hadPasswordBefore &&
        typeof message === "string" &&
        message.toLowerCase().includes("current password is incorrect")
      ) {
        setError("currentPassword", {
          type: "server",
          message,
        });
      }

      toast.error(message);
    }
  };

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: "6px",
          border: `1px solid ${alpha(
            theme.palette.primary.main,
            isDark ? 0.24 : 0.16
          )}`,
          background: isDark
            ? alpha("#11121A", 0.98)
            : alpha(theme.palette.background.paper, 0.9),
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          mb={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.24 : 0.12
                ),
              }}
            >
              <LockRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {hasPassword ? "Change password" : "Set account password"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hasPassword
                  ? "Use a strong password to protect your trading data."
                  : "You signed in with Google. Set a password to also log in with email and password."}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Info banner for Google users without password */}
        {!hasPassword && (
          <Box mb={2}>
            <Alert
              severity="info"
              variant="outlined"
              sx={{
                borderRadius: "6px",
                borderColor: alpha(theme.palette.primary.main, 0.35),
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                "& .MuiAlert-icon": {
                  color: theme.palette.primary.main,
                },
              }}
            >
              This account doesn’t have a local password yet. Choose a strong
              password below to enable email + password login.
            </Alert>
          </Box>
        )}

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 0.5 }}
        >
          <Stack spacing={2}>
            {/* Current password (only for users with an existing password) */}
            {hasPassword && (
              <TextField
                fullWidth
                label="Current password"
                type={showCurrentPassword ? "text" : "password"}
                size="small"
                autoComplete="current-password"
                {...register("currentPassword")}
                error={!!errors.currentPassword}
                helperText={errors.currentPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        aria-label={
                          showCurrentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                      >
                        {showCurrentPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {/* New + confirm */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ width: "100%" }}
            >
              <TextField
                fullWidth
                label="New password"
                type={showNewPassword ? "text" : "password"}
                size="small"
                autoComplete="new-password"
                {...register("newPassword")}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={
                          showNewPassword
                            ? "Hide new password"
                            : "Show new password"
                        }
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm new password"
                type={showConfirmPassword ? "text" : "password"}
                size="small"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
              mt={0.5}
            >
              <Typography variant="caption" color="text.secondary">
                Use at least 8 characters. Avoid using the same password as your
                broker or email.
              </Typography>

              <Button
                variant="contained"
                size="small"
                type="submit"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading
                  ? hasPassword
                    ? "Updating..."
                    : "Setting..."
                  : hasPassword
                  ? "Update password"
                  : "Set password"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
};

export default Security;
