import { useGetDashboardQuery } from "@/store/admin/admin";
import { useTheme } from "@mui/material/styles";

export const useDashboard = () => {
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useGetDashboardQuery();

  // LOGIC FIX: Access payload.data
  // The API returns: { statusCode: 200, payload: { data: { ... } } }
  const stats = data?.payload?.data;

  return {
    stats, // Now this contains totalRevenue, mrr, etc.
    isLoading,
    isError: !!error,
    refetch,
    formatCurrency: (amount: number | undefined) => {
      // Safety check: if amount is missing, return $0
      if (amount === undefined || amount === null) return "$0";

      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount);
    },
    theme,
  };
};
