"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API } from "../api";
import type { RootState } from "..";
import type { AccountDT } from "@/types/account";
import type { PlatformConnectionDT } from "@/types/platform-connection";
import { ApiEnvelope } from "@/types/api-envelope";
import { loadToken } from "@/utils/load-token";
import { AiReportResponse } from "@/types/ai-report";
import { ensureArray } from "@/utils/ensure-array";

export const ctraderApi = createApi({
  reducerPath: "ctraderApi",
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
  tagTypes: ["Connections", "Accounts", "AccountDetail"],
  endpoints: (builder) => ({
    // ------- Connections -------
    listConnections: builder.query<PlatformConnectionDT[], void>({
      query: () => ({ url: "/platform/connections", method: "GET" }),
      transformResponse: (resp: unknown) =>
        ensureArray<PlatformConnectionDT>(resp),
      providesTags: (res) =>
        Array.isArray(res)
          ? [
              ...res.map((c) => ({ type: "Connections" as const, id: c.id })),
              { type: "Connections" as const, id: "LIST" },
            ]
          : [{ type: "Connections" as const, id: "LIST" }],
    }),

    renameConnection: builder.mutation<
      PlatformConnectionDT,
      { connectionId: string; label: string | null }
    >({
      query: ({ connectionId, label }) => ({
        url: `/platform/connections/${connectionId}`,
        method: "PATCH",
        body: { label },
      }),
      invalidatesTags: (_r, _e, { connectionId }) => [
        { type: "Connections", id: connectionId },
        { type: "Connections", id: "LIST" },
      ],
    }),

    deleteConnection: builder.mutation<
      { ok: boolean; message?: string },
      { connectionId: string; purgeAccounts: boolean; purgeTrades: boolean }
    >({
      query: ({ connectionId, purgeAccounts, purgeTrades }) => ({
        url: `/platform/connections/${connectionId}`,
        method: "DELETE",
        params: { purgeAccounts, purgeTrades },
      }),
      invalidatesTags: (_r, _e, { connectionId }) => [
        { type: "Connections", id: connectionId },
        { type: "Connections", id: "LIST" },
        { type: "Accounts", id: "LIST" },
      ],
    }),

    manualRefreshConnection: builder.mutation<
      { ok: boolean },
      { connectionId: string }
    >({
      query: ({ connectionId }) => ({
        url: `/platform/refresh/${connectionId}`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { connectionId }) => [
        { type: "Connections", id: connectionId },
        { type: "Accounts", id: "LIST" },
      ],
    }),

    // ------- Accounts -------
    listCTraderAccounts: builder.query<
      AccountDT[],
      { connectionId?: string } | void
    >({
      query: (arg) => {
        const params =
          arg && (arg as any).connectionId
            ? { connectionId: (arg as any).connectionId }
            : undefined;
        return { url: "/platform/accounts", method: "GET", params };
      },
      transformResponse: (
        resp:
          | ApiEnvelope<{ items: AccountDT[] }>
          | { items: AccountDT[] }
          | unknown,
      ) => {
        // Try explicit shapes first, then fallback to generic extractor
        const anyResp = resp as any;
        const a =
          anyResp?.payload?.data?.items ??
          anyResp?.payload?.items ??
          anyResp?.items;
        if (Array.isArray(a)) return a as AccountDT[];
        return ensureArray<AccountDT>(resp);
      },
      providesTags: (res) =>
        Array.isArray(res)
          ? [
              ...res.map((a) => ({ type: "Accounts" as const, id: a.id })),
              { type: "Accounts" as const, id: "LIST" },
            ]
          : [{ type: "Accounts", id: "LIST" }],
    }),

    getAccountDetail: builder.query<
      {
        account: AccountDT;
        counts: { deals: number; positions: number };
        deals: any[];
        positions: any[];
      },
      {
        identifier: string;
        connectionId?: string;
        source?: "db" | "api";
        fromDays?: number;
      }
    >({
      query: ({ identifier, connectionId, source, fromDays }) => ({
        url: `/platform/accounts/${identifier}`,
        method: "GET",
        params: {
          ...(connectionId ? { connectionId } : {}),
          ...(source ? { source: source === "api" ? "api" : undefined } : {}),
          ...(fromDays ? { fromDays } : {}),
        },
      }),
      transformResponse: (resp: any) => resp?.payload?.data ?? resp, // support both envelope and raw
      providesTags: (_r, _e, { identifier }) => [
        { type: "AccountDetail", id: identifier },
      ],
    }),

    getAccountAiReport: builder.query<
      AiReportResponse,
      { identifier: string; fromDays?: number }
    >({
      query: ({ identifier, fromDays }) => ({
        url: `/platform/accounts/${identifier}/ai-report`,
        method: "GET",
        params: fromDays ? { fromDays } : undefined,
      }),
      // 🔥 unwrap the server envelope { statusCode, payload: { data }, error }
      transformResponse: (resp: any): AiReportResponse =>
        (resp?.payload?.data as AiReportResponse) ?? (resp as AiReportResponse),
      providesTags: (_result, _error, arg) => [
        { type: "AccountDetail", id: arg.identifier },
      ],
    }),
  }),
});

export const {
  useListConnectionsQuery,
  useRenameConnectionMutation,
  useDeleteConnectionMutation,
  useManualRefreshConnectionMutation,
  useListCTraderAccountsQuery,
  useGetAccountDetailQuery,
  useGetAccountAiReportQuery,
} = ctraderApi;
