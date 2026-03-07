"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useUpdateUserMutation } from "@/store/auth/auth";
import toast from "@/components/toast/toast";

import DevicesOtherRoundedIcon from "@mui/icons-material/DevicesOtherRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import { useForm } from "react-hook-form";
import { useUser } from "../auth/hooks/useUser";
import { fetchMe } from "@/store/auth/authSlice";
import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";

type ProfileFormValues = {
  fullName: string;
  email: string;
};

const Profile: React.FC = () => {
  const theme = useTheme();
  const user = useUser();
  const [updateUser] = useUpdateUserMutation();
  const dispatch = useDispatch<AppDispatch>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  // ========== Avatar modal state ==========
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Sync form values when user changes (e.g. after fetch or re-login)
  useEffect(() => {
    if (user) {
      reset({
        fullName: user.name ?? "",
        email: user.email ?? "",
      });
    }
  }, [user, reset]);

  // Initialise avatar preview when dialog opens
  useEffect(() => {
    if (avatarDialogOpen) {
      setAvatarPreview(user?.avatarUrl ?? null);
      setAvatarFile(null);
    }
  }, [avatarDialogOpen, user?.avatarUrl]);

  // Cleanup object URLs for selected file
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const firstName = useMemo(() => {
    const raw = (user?.name ?? "").trim();
    if (!raw) return "Trader"; // fallback
    // handle extra spaces & "Last, First" format
    const hasComma = raw.includes(",");
    const cleaned = raw.replace(/[()"'’]+/g, "").replace(/,+/g, " ");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return "Trader";
    return hasComma ? parts[parts.length - 1] : parts[0];
  }, [user?.name]);

  const joinedDateLabel = useMemo(() => {
    if (!user?.createdAt) return "Recently";

    const date =
      typeof user.createdAt === "string"
        ? new Date(user.createdAt)
        : new Date(user.createdAt);

    if (Number.isNaN(date.getTime())) return "Recently";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, [user?.createdAt]);

  const onSubmit = async (values: ProfileFormValues) => {
    // console.log("values", values);
    const profileData = {
      fullName: values.fullName,
      email: values.email,
    };
    try {
      await updateUser(profileData).unwrap();
      await dispatch(fetchMe()).unwrap();

      toast.success("Profile updated successfully");

      reset(values);
    } catch (err: any) {
      console.log(err);
      toast.error(err?.data?.error?.message || "Failed to update profile");
    }
  };

  const handleReset = () => {
    reset({
      fullName: user?.name ?? "",
      email: user?.email ?? "",
    });
  };

  // ========== Avatar handlers ==========

  const handleOpenAvatarDialog = () => {
    setAvatarDialogOpen(true);
  };

  const handleCloseAvatarDialog = () => {
    setAvatarDialogOpen(false);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);

    const url = URL.createObjectURL(file);
    // clean old blob if any
    setAvatarPreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return url;
    });
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) {
      // nothing selected, just close
      setAvatarDialogOpen(false);
      return;
    }

    // TODO: upload avatarFile to your backend (NestJS + Prisma, S3, etc.)
    console.log("Uploading avatar file:", avatarFile);

    // After successful upload, you’d typically:
    // - update user in your store (so main avatar updates)
    // - close dialog
    setAvatarDialogOpen(false);
  };

  return (
    <>
      <Stack spacing={3}>
        {/* Top row: avatar + quick info */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={user?.avatarUrl}
                sx={{
                  width: 72,
                  height: 72,
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                  bgcolor: "primary.main",
                }}
                imgProps={{
                  referrerPolicy: "no-referrer", // avoids some googleusercontent referrer blocks
                  crossOrigin: "anonymous", // helps when CSP allows it
                }}
              >
                {!user?.avatarUrl && user?.name?.charAt(0)}
              </Avatar>
              <IconButton
                size="small"
                aria-label="Change profile picture"
                onClick={handleOpenAvatarDialog}
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  "&:hover": {
                    bgcolor: theme.palette.primary.main,
                  },
                }}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" fontWeight={600}>
                {firstName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.name}
              </Typography>
              <Stack direction="row" spacing={1} mt={0.25}>
                {user?.platformConnections &&
                  user.platformConnections.length > 0 && (
                    <Chip
                      size="small"
                      label="cTrader connected"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: 11, borderRadius: 999 }}
                    />
                  )}
              </Stack>
            </Stack>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {/* Right small info */}
          <Stack
            direction={{ xs: "row", sm: "column" }}
            spacing={1.25}
            alignItems={{ xs: "flex-start", sm: "flex-end" }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <EmailRoundedIcon sx={{ fontSize: 18, opacity: 0.8 }} />
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <DevicesOtherRoundedIcon sx={{ fontSize: 18, opacity: 0.8 }} />
              <Typography variant="body2" color="text.secondary">
                Joined · {joinedDateLabel}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Profile form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ width: "100%" }}
            >
              <TextField
                fullWidth
                label="Full name"
                size="small"
                {...register("fullName", {
                  required: "Full name is required",
                  minLength: {
                    value: 2,
                    message: "Full name is too short",
                  },
                })}
                error={!!errors.fullName}
                helperText={errors.fullName?.message}
              />
              <TextField
                fullWidth
                label="Email"
                size="small"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
                    message: "Enter a valid email",
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Stack>

            <Stack
              direction="row"
              justifyContent="flex-end"
              spacing={1.5}
              mt={1}
            >
              <Button
                variant="outlined"
                size="small"
                type="button"
                onClick={handleReset}
                disabled={!isDirty || isSubmitting}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                size="small"
                type="submit"
                disableElevation
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {/* ========= Avatar Edit Dialog ========= */}
      <Dialog
        open={avatarDialogOpen}
        onClose={handleCloseAvatarDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(10px)",
              backgroundColor: alpha(
                theme.palette.mode === "dark" ? "#050510" : "#02020A",
                0.6,
              ),
            },
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: "6px",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
            background:
              theme.palette.mode === "dark"
                ? "radial-gradient(circle at 0% 0%, rgba(124,135,255,0.18), transparent 55%), #11121A"
                : "radial-gradient(circle at 0% 0%, rgba(124,135,255,0.16), transparent 55%), #FFFFFF",
            boxShadow:
              "0 18px 45px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          },
        }}
      >
        <DialogTitle
          component="div" // ✅ avoid h2 so we can safely put Typography (h6) inside
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Update profile photo
          </Typography>
          <IconButton
            size="small"
            onClick={handleCloseAvatarDialog}
            sx={{ ml: 1 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5 }}>
          <Stack spacing={2.5} alignItems="center">
            <Avatar
              src={avatarPreview ?? undefined}
              alt="Avatar preview"
              sx={{
                width: 96,
                height: 96,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.8)}`,
              }}
            >
              {firstName.charAt(0).toUpperCase()}
            </Avatar>

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ maxWidth: 280 }}
            >
              Choose a clear photo where your face is visible. This helps you
              recognize your trading workspace quickly.
            </Typography>

            <Button
              variant="outlined"
              size="small"
              component="label"
              startIcon={<PhotoCameraRoundedIcon />}
              sx={{
                borderRadius: 999,
                px: 2.5,
              }}
            >
              Upload new photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarFileChange}
              />
            </Button>

            {avatarFile && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ maxWidth: "100%", wordBreak: "break-all" }}
              >
                Selected: {avatarFile.name}
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={handleCloseAvatarDialog}
            size="small"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAvatarSave}
            size="small"
            variant="contained"
            disableElevation
            disabled={!avatarFile}
          >
            Save photo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Profile;
