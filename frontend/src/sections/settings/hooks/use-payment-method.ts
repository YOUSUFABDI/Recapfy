import { useGetPaymentMethodQuery } from "@/store/billing/billing";

export const usePaymentMethod = () => {
  const {
    data: paymentMethod,
    isLoading,
    error,
    refetch,
  } = useGetPaymentMethodQuery();

  return {
    paymentMethod,
  };
};
