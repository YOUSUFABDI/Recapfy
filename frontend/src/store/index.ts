"use client";

import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./auth/authSlice";
import { ctraderApi } from "./platform/ctrader";
import { authApi } from "./auth/auth";
import { billingApi } from "@/store/billing/billing";
import { adminApi } from "@/store/admin/admin";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [ctraderApi.reducerPath]: ctraderApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [billingApi.reducerPath]: billingApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(
      ctraderApi.middleware,
      authApi.middleware,
      billingApi.middleware,
      adminApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const selectAuthToken = (s: RootState) => s.auth.token;
