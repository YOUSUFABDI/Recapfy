import { useGetPlansQuery } from "@/store/billing/billing";

export const useplans = () => {
  const { data, isLoading, error, isError } = useGetPlansQuery();
  // console.log("data", data);

  return {
    data,
    isLoading,
    error,
    isError,
  };
};
