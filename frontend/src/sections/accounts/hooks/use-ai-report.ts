import { useGetAccountAiReportQuery } from "@/store/platform/ctrader";

export const useAIReport = (identifier: string, isPro: boolean) => {
  // console.log("isPro", isPro);
  const {
    data: report,
    isLoading,
    isError,
    refetch,
    error,
  } = useGetAccountAiReportQuery({ identifier }, { skip: !isPro });

  return { report, isLoading, isError, refetch, error };
};
