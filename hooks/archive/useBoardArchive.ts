import { useQuery } from "@tanstack/react-query";
import { getArchivedColumns, getArchivedCards } from "@/services/api";
import type { ApiArchivedCard, ApiColumn } from "@/types";
import { useAccessToken } from "@/hooks/auth/useAccessToken";

export function useBoardArchive(
  boardId: string | undefined,
  isOpen: boolean
) {
  const accessToken = useAccessToken();
  const boardKey = boardId ? String(boardId) : undefined;

  const columnsQuery = useQuery<ApiColumn[]>({
    queryKey: ["board", boardKey, "columns", "archived"],
    enabled: isOpen && !!boardKey && Boolean(accessToken),
    queryFn: async ({ signal }) =>
      (await getArchivedColumns(boardKey!, { signal })) ?? [],
    staleTime: 0,
  });

  const cardsQuery = useQuery<ApiArchivedCard[]>({
    queryKey: ["board", boardKey, "cards", "archived"],
    enabled: isOpen && !!boardKey && Boolean(accessToken),
    queryFn: async ({ signal }) =>
      (await getArchivedCards(boardKey!, { signal })) ?? [],
    staleTime: 0,
  });

  return {
    archivedColumns: columnsQuery.data ?? [],
    archivedCards: cardsQuery.data ?? [],

    isColumnsLoading: columnsQuery.isLoading,
    isCardsLoading: cardsQuery.isLoading,

    isAnyLoading: columnsQuery.isLoading || cardsQuery.isLoading,
  };
}
