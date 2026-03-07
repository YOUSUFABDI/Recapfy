import { useGetCurrentBillingQuery } from "@/store/billing/billing";

export const useCurrentPlan = () => {
  const {
    data: currentPlan,
    isLoading,
    error,
    refetch,
  } = useGetCurrentBillingQuery(undefined, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 0,
  });

  return {
    currentPlan,
    isLoading,
    error,
    refetch,
  };
};
