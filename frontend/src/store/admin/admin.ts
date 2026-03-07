import { loadToken } from "@/utils/load-token";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "..";
import { API } from "../api";
import { SingleUserResponse, UsersResponse } from "@/sections/user/types/types";

export interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  mrr: number;
  usersGrowth: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string; // JSON returns dates as strings
  }>;
  revenueChart: Array<{
    name: string;
    revenue: number;
  }>;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  payload: {
    data: T;
  };
}

export const adminApi = createApi({
  reducerPath: "adminApi",
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
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    getUsers: builder.query<
      UsersResponse,
      { page: number; limit: number; search?: string }
    >({
      query: (params) => ({
        url: "/admin/users",
        method: "GET",
        params: {
          page: params.page,
          limit: params.limit,
          search: params.search || undefined, // remove empty string
        },
      }),
      providesTags: ["Users"],
    }),

    getUserById: builder.query<SingleUserResponse, string>({
      query: (id) => `/admin/users/${id}`,
      providesTags: (result, error, id) => [{ type: "Users", id }],
    }),
    toggleUserAccess: builder.mutation<void, { userId: string }>({
      query: ({ userId }) => ({
        url: `/admin/give-it-for-free/${userId}`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "Users", id: userId },
      ],
    }),
    getDashboard: builder.query<ApiResponse<DashboardStats>, void>({
      query: () => "/admin/dashboard",
      // Refetch every 5 minutes automatically
      // pollingInterval: 300000,
    }),
    changeUserRole: builder.mutation<
      void,
      { userId: string; role: "USER" | "ADMIN" }
    >({
      query: ({ userId, role }) => ({
        url: `/admin/change-role/${userId}`, // Assumes route is /change-role/:id
        method: "PATCH",
        body: { role }, // Matches ChangeRoleDto structure
      }),
      // Invalidate tags to auto-refresh the UI after update
      invalidatesTags: (result, error, { userId }) => [
        { type: "Users", id: userId },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useToggleUserAccessMutation,
  useGetDashboardQuery,
  useChangeUserRoleMutation,
} = adminApi;
