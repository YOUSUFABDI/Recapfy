"use client";

import toast from "@/components/toast/toast";
import Logo from "@/layouts/dashboard/Logo";
import type { AppDispatch } from "@/store";
import { useVerifyOTPMutation } from "@/store/auth/auth";
import { fetchMe, setToken } from "@/store/auth/authSlice";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { MuiOtpInput } from "mui-one-time-password-input";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

const VerifyView = () => {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  // 1. Get Email from URL
  const emailParam = searchParams.get("email");
  const [userEmail, setUserEmail] = useState("");

  const [otp, setOtp] = useState("");

  // 2. Setup Mutation
  const [verifyOtp, { isLoading }] = useVerifyOTPMutation();

  useEffect(() => {
    if (emailParam) {
      setUserEmail(emailParam);
    } else {
      // Fallback if no email provided
      toast.error("No email found. Please login again.");
      router.push("/login");
    }
  }, [emailParam, router]);

  const handleChange = (newValue: string) => {
    setOtp(newValue);
  };

  const handleComplete = async (finalOtp: string) => {
    if (!userEmail) return;

    try {
      // 3. Call API to Verify OTP
      const response = await verifyOtp({
        email: userEmail,
        code: Number(finalOtp),
      }).unwrap();

      // Adjust this depending on exactly how your RTK Query response is structured
      // If your backend returns { access_token: "..." } directly:
      // const { access_token } = response;
      // If your backend wraps it in data:
      const access_token =
        response.payload?.data?.access_token || response.access_token;

      if (!access_token) {
        throw new Error("No access token received");
      }

      // 4. Update Redux State with Token
      dispatch(setToken(access_token));

      // 5. Fetch User Profile & Wait for it to finish
      // We use .unwrap() here to get the actual user object immediately
      const user = await dispatch(fetchMe()).unwrap();

      toast.success("Account verified successfully!");

      // 6. Conditional Redirect based on Role
      if (user.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/dashboard/connect");
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      const errMsg =
        error?.data?.message || error?.message || "Verification failed";
      toast.error(errMsg);
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
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 6 },
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1,
            }}
          >
            <Logo />
          </Box>

          <Box>
            <Typography variant="h4" gutterBottom fontWeight={700}>
              Verify your email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We&apos;ve sent a 6-digit code to <br />
              <Box
                component="span"
                sx={{ fontWeight: 600, color: "text.primary" }}
              >
                {userEmail}
              </Box>
            </Typography>
          </Box>

          <Box sx={{ width: "100%", maxWidth: 400, py: 2 }}>
            <MuiOtpInput
              value={otp}
              onChange={handleChange}
              length={6}
              onComplete={handleComplete}
              TextFieldsProps={{
                disabled: isLoading,
                size: "medium",
                placeholder: "-",
                sx: {
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    backgroundColor: theme.palette.background.default,
                    fontWeight: "bold",
                  },
                  gap: 1,
                },
              }}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={otp.length < 6 || isLoading}
            onClick={() => handleComplete(otp)}
            sx={{
              height: 56,
              fontSize: "1.05rem",
              borderRadius: "8px",
              fontWeight: 700,
              boxShadow: theme.shadows[4],
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Verify Account"
            )}
          </Button>

          <Link
            href="/login"
            variant="caption"
            sx={{ color: "text.secondary", mt: 2, textDecoration: "none" }}
          >
            ← Back to Login
          </Link>
        </Stack>
      </Paper>
    </Container>
  );
};

export default VerifyView;
