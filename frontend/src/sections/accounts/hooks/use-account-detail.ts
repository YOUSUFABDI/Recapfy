"use client";

import { useGetAccountDetailQuery } from "@/store/platform/ctrader";

export const useAccountDetail = (
  accountId: string,
  opts?: { connectionId?: string; source?: "db" | "api"; fromDays?: number },
) => {
  const {
    data: accountDetail,
    isLoading,
    error,
    refetch,
  } = useGetAccountDetailQuery(
    {
      identifier: accountId,
      connectionId: opts?.connectionId,
      source: opts?.source, // default: db (handled in API)
      fromDays: opts?.fromDays,
    },
    {
      // keep older data while fetching new (less flicker)
      refetchOnMountOrArgChange: true,
      pollingInterval: 0,
    },
  );

  return {
    accountDetail,
    isLoading,
    error,
    refetch,
  };
};
