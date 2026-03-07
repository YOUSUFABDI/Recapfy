import { loadToken } from "@/utils/load-token";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "..";
import { API } from "../api";
import {
  ForgotPasswordPasswordReqDT,
  ResetPasswordPasswordReqDT,
  VerifyOTPReqDT,
} from "@/sections/auth/types/types";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API,
    prepareHeaders: (headers, { getState }) => {
      const token =
        (getState() as RootState).auth.token || loadToken() || undefined;
      if (token) headers.set("authorization", `Bearer ${token}`);
      headers.set("content-type", "application/json");
      return headers;
    },
    credentials: "include",
  }),
  tagTypes: ["authApi"],
  endpoints: (builder) => ({
    changePassword: builder.mutation<
      any,
      { currentPassword?: string; newPassword: string }
    >({
      query: ({ currentPassword, newPassword }) => ({
        url: "/auth/change-password",
        method: "POST",
        body: { currentPassword, newPassword },
      }),
    }),
    updateUser: builder.mutation<any, { fullName?: string; email?: string }>({
      query: (body) => ({
        url: "/auth/update-user",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["authApi"],
    }),
    verifyOTP: builder.mutation<any, VerifyOTPReqDT>({
      query: (body) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["authApi"],
    }),
    forgotPassword: builder.mutation<any, ForgotPasswordPasswordReqDT>({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["authApi"],
    }),
    resetPassword: builder.mutation<any, ResetPasswordPasswordReqDT>({
      query: (data) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useChangePasswordMutation,
  useUpdateUserMutation,
  useVerifyOTPMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
