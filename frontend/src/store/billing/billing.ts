import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API } from "../api";
import { RootState } from "..";
import { loadToken } from "@/utils/load-token";
import { CurrentPlanDT } from "@/types/billing";
import { ApiResponse } from "@/types/api";
import { PlanDT } from "@/types/plan";
import { PaymentMethodDT } from "@/types/payment-method";

export const billingApi = createApi({
  reducerPath: "billingApi",
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
  tagTypes: ["billingApi"],
  endpoints: (builder) => ({
    getCurrentBilling: builder.query<CurrentPlanDT | null, void>({
      query: () => ({
        url: "/billing/current-plan",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<CurrentPlanDT>) => {
        return response?.payload?.data ?? null;
      },
      providesTags: ["billingApi"],
    }),
    getPlans: builder.query<PlanDT[], void>({
      query: () => ({
        url: "/billing/plans",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<PlanDT[]>) => {
        return response?.payload?.data ?? [];
      },
      providesTags: ["billingApi"],
    }),
    getPaymentMethod: builder.query<PaymentMethodDT | null, void>({
      query: () => ({
        url: "/billing/payment-method",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<PaymentMethodDT>) => {
        return response?.payload?.data ?? null;
      },
      providesTags: ["billingApi"],
    }),
  }),
});

export const {
  useGetCurrentBillingQuery,
  useGetPlansQuery,
  useGetPaymentMethodQuery,
} = billingApi;
