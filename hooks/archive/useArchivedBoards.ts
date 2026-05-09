import { useQuery } from "@tanstack/react-query";
import { getArchivedBoards } from "@/services/api";
import type { ApiBoardListItem } from "@/types";
import { useAccessToken } from "@/hooks/auth/useAccessToken";

export function useArchivedBoards(
  isOpen: boolean
) {
  const accessToken = useAccessToken();

  const boardsQuery = useQuery<ApiBoardListItem[]>({
    queryKey: ["boards", "archived"],
    enabled: isOpen && Boolean(accessToken),
    queryFn: async ({ signal }) => (await getArchivedBoards({ signal })) ?? [],
    staleTime: 0,
  });

  return {
    archivedBoards: boardsQuery.data ?? [],

    isBoardsLoading: boardsQuery.isLoading,

    isAnyLoading: boardsQuery.isLoading,
  };
}
