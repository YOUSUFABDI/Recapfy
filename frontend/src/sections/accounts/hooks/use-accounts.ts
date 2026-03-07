// "use client"

// import { useListCTraderAccountsQuery } from "@/store/trade/ctrader"

// export const useAccounts = (opts?: { connectionId?: string }) => {
//   const {
//     data = [],
//     isLoading,
//     isFetching,
//     isError,
//     error,
//     refetch,
//   } = useListCTraderAccountsQuery(opts, { pollingInterval: 1000 })

//   return {
//     data,
//     isLoading: isLoading || isFetching,
//     isError,
//     error,
//     refetch,
//   }
// }

"use client";

import { useEffect } from "react";
import { useListCTraderAccountsQuery } from "@/store/platform/ctrader";

export const useAccounts = (opts?: { connectionId?: string }) => {
  const {
    data = [],
    isLoading, // True only on mount
    isFetching, // True every time we refetch (background)
    isError,
    error,
    refetch,
  } = useListCTraderAccountsQuery(opts);

  // ✅ FORCE UPDATE: Manually trigger a refetch every 1 second.
  // This bypasses potential polling configuration issues in Redux.
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  return {
    data,
    isLoading, // We purposely do NOT include '|| isFetching' here to prevent UI jumps
    isFetching,
    isError,
    error,
    refetch,
  };
};
