"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchMe } from "@/store/auth/authSlice";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { token, user, status } = useSelector((s: RootState) => s.auth);

  const shouldFetchUser = token && !user && status !== "loading";

  useEffect(() => {
    if (shouldFetchUser) {
      dispatch(fetchMe());
    }
  }, [shouldFetchUser, dispatch]);

  const isAuthenticated = Boolean(token && user);

  // Treat "token + no user yet" as loading, so guard waits
  const loading = status === "loading" || (token && !user);

  return { isAuthenticated, loading, token, user };
}
