"use client";

import { useListConnectionsQuery } from "@/store/platform/ctrader";

export const useConnections = () => {
  const {
    data = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useListConnectionsQuery(undefined, { pollingInterval: 5000 });

  return {
    data, // CTraderConnectionDT[]
    isLoading: isLoading || isFetching,
    isError,
    error,
    refetch,
  };
};
