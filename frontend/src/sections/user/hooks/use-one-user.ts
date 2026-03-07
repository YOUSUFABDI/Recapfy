import { useGetUserByIdQuery } from "@/store/admin/admin";

export const useOneUser = (id: string) => {
  const { data, isLoading, isError, refetch } = useGetUserByIdQuery(id, {
    skip: !id, // Don't fetch if no ID is provided
  });

  return {
    user: data?.payload.data || null,
    isLoading,
    isError,
    refetch,
  };
};
