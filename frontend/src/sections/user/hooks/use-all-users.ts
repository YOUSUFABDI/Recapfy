import { useGetUsersQuery } from "@/store/admin/admin";
import { useState } from "react";
import { useDebounce } from "use-debounce";

export const useAllUser = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  // Debounce search to prevent API spam while typing
  const [debouncedSearch] = useDebounce(search, 500);

  const { data, isLoading, isError, isFetching, refetch } = useGetUsersQuery({
    page,
    limit,
    search: debouncedSearch,
  });

  return {
    users: data?.payload.data.users || [],
    meta: data?.payload.data.meta,
    isLoading,
    isFetching,
    isError,
    page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    refetch,
  };
};
