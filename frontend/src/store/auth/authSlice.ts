"use client";

import { UserDT } from "@/types/user";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { API } from "../api";

type AuthState = {
  token: string | null;
  user: UserDT | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

function getApiUrl(path: string) {
  return `${API}${path}`;
}

function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("auth:token");
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem("auth:token", token);
    else localStorage.removeItem("auth:token");
  } catch {}
}

function saveUserId(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) localStorage.setItem("auth:userId", userId);
    else localStorage.removeItem("auth:userId");
  } catch {}
}

export const login = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    const res = await fetch(getApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) return rejectWithValue(json?.error?.message || "Login failed");
    const data = json?.payload?.data || json;
    return data as { access_token: string; userId: string };
  }
);

export const signup = createAsyncThunk(
  "auth/signup",
  async (
    {
      name,
      email,
      password,
    }: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    const res = await fetch(getApiUrl("/auth/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok)
      return rejectWithValue(json?.error?.message || "Signup failed");
    // console.log("json", json);
    return json?.payload?.data;
  }
);

export const fetchMe = createAsyncThunk(
  "auth/me",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const token = state.auth.token || loadToken();
    if (!token) return rejectWithValue("No token");
    const res = await fetch(getApiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok)
      return rejectWithValue(json?.error?.message || "Failed to load user");
    const data = json?.payload?.data || json;
    return data as UserDT;
  }
);

const initialState: AuthState = {
  token: typeof window !== "undefined" ? loadToken() : null,
  user: null,
  status: "idle",
  error: null,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      saveToken(null);
      saveUserId(null);
    },
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
      saveToken(action.payload);
      if (!action.payload) saveUserId(null);
    },
    resetStatus(state) {
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(
        login.fulfilled,
        (s, a: PayloadAction<{ access_token: string }>) => {
          s.status = "succeeded";
          s.token = a.payload.access_token;
          saveToken(s.token);
        }
      )
      .addCase(login.rejected, (s, a: any) => {
        s.status = "failed";
        s.error = a.payload || "Login failed";
      });

    b.addCase(signup.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(
        signup.fulfilled,
        (s, a: PayloadAction<{ access_token: string }>) => {
          s.status = "succeeded";
          s.token = a.payload.access_token;
          saveToken(s.token);
        }
      )
      .addCase(signup.rejected, (s, a: any) => {
        s.status = "failed";
        s.error = a.payload || "Signup failed";
      });

    b.addCase(fetchMe.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchMe.fulfilled, (s, a: PayloadAction<UserDT>) => {
        s.status = "succeeded";
        s.user = a.payload;
      })
      .addCase(fetchMe.rejected, (s, a: any) => {
        s.status = "failed";
        s.error = a.payload || "Failed to load user";
        s.token = null;
        s.user = null;
        saveToken(null);
        saveUserId(null);
      });
  },
});

export const { logout, setToken, resetStatus } = slice.actions;
export const authReducer = slice.reducer;
