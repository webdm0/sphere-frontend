import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import {
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  leaveBoard,
  acceptInvite,
  declineInvite,
  archiveBoard,
  restoreBoard,
} from "@/services/api";
import type { ApiBoard, EntityId, UiBoardListItem } from "@/types";
import { useAccessToken } from "@/hooks/auth/useAccessToken";
import { createTempId } from "@/utils/entityId";

interface UseBoardsOptions {
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean | "always";
  refetchIntervalMs?: number | false;
}

export function useBoards(options: UseBoardsOptions = {}) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  const latestUpdateRef = useRef(new Map<EntityId, number>());
  const pendingCreateBoardTitlesRef = useRef<Set<string>>(new Set());
  const getBoardMetaKey = (id: EntityId) => ["board", id, "meta"] as const;
  const getBoardTitle = (id: EntityId) => {
    const activeTitle = queryClient
      .getQueryData<UiBoardListItem[]>(["boards"])
      ?.find((board) => board.id === id)?.title;
    if (activeTitle) return activeTitle;

    const archivedTitle = queryClient
      .getQueryData<UiBoardListItem[]>(["boards", "archived"])
      ?.find((board) => board.id === id)?.title;
    if (archivedTitle) return archivedTitle;

    return queryClient.getQueryData<ApiBoard>(getBoardMetaKey(id))?.title;
  };
  const setBoardArchivedMeta = (
    id: EntityId,
    archived: boolean,
    fallbackTitle?: string
  ) => {
    const archivedAt = archived ? new Date().toISOString() : null;
    queryClient.setQueryData<ApiBoard>(getBoardMetaKey(id), (old) => ({
      id,
      title: old?.title ?? fallbackTitle ?? "Untitled",
      ...old,
      isArchived: archived,
      archivedAt,
      archivetAt: archivedAt,
      ArchivedAt: archivedAt,
      ArchivetAt: archivedAt,
    }));
  };
  const {
    refetchOnWindowFocus = false,
    refetchOnMount = false,
    refetchIntervalMs = false,
  } = options;
  const markBoardsOptimistic = (value: boolean) => {
    queryClient.setQueryDefaults(["boards"], {
      meta: { optimistic: value },
    });
  };

  const { data: boards = [], isLoading } = useQuery<UiBoardListItem[]>({
    queryKey: ["boards"],
    queryFn: async ({ signal }) => (await getBoards({ signal })) ?? [],
    enabled: Boolean(accessToken),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchInterval: refetchIntervalMs,
    refetchIntervalInBackground: false,
  });

  const create = useMutation({
    mutationFn: createBoard,
    onMutate: async (params) => {
      markBoardsOptimistic(true);
      const tempId = createTempId("board");

      await queryClient.cancelQueries({ queryKey: ["boards"] });

      const tempBoard: UiBoardListItem = {
        id: tempId,
        title: params.title,
        isMine: true,
        isShared: false,
        isAccepted: true,
        ownerName: "You",
        clientId: tempId,
        isCreating: true,
      };

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) => {
        const list = old ? [...old] : [];
        list.push(tempBoard);
        return list;
      });

      return { tempId };
    },
    onSuccess: (result, _variables, context) => {
      if (!context?.tempId) return;
      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) => {
        const list = old ?? [];
        const tempIndex = list.findIndex(
          (board) => (board.clientId ?? board.id) === context.tempId
        );

        if (tempIndex === -1) {
          const exists = list.some((board) => board.id === result.id);
          if (exists) return list;
          return [
            ...list,
            {
              id: result.id,
              title: result.title,
              isMine: true,
              isShared: false,
              isAccepted: true,
              ownerName: "You",
              clientId: context.tempId,
              isCreating: false,
            },
          ];
        }

        const next = [...list];
        next[tempIndex] = {
          ...next[tempIndex],
          id: result.id,
          title: result.title,
          isCreating: false,
        };
        return next;
      });
    },
    onError: (_err, _vars, context) => {
      if (!context?.tempId) return;
      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.filter((board) => (board.clientId ?? board.id) !== context.tempId) ?? []
      );
    },
    onSettled: () => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, title }: { id: EntityId; title: string }) => updateBoard(id, title),
    onMutate: async ({ id, title }) => {
      markBoardsOptimistic(true);
      const requestId = Date.now();
      latestUpdateRef.current.set(id, requestId);

      const cancelBoardsPromise = queryClient.cancelQueries({ queryKey: ["boards"] });
      const cancelMetaPromise = queryClient.cancelQueries({
        queryKey: ["board", id, "meta"],
      });

      const previousBoards = queryClient.getQueryData<UiBoardListItem[]>(["boards"]);
      const previousMeta = queryClient.getQueryData<ApiBoard>(["board", id, "meta"]);

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.map((b) => (b.id === id ? { ...b, title } : b)) ?? []
      );

      queryClient.setQueryData<ApiBoard>(["board", id, "meta"], (old) =>
        old ? { ...old, title } : old
      );

      await Promise.all([cancelBoardsPromise, cancelMetaPromise]);

      return { previousBoards, previousMeta, boardId: id, requestId, optimisticTitle: title };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      const latest = context.boardId
        ? latestUpdateRef.current.get(context.boardId)
        : undefined;
      if (latest !== undefined && context.requestId !== latest) return;

      if (context.previousBoards) {
        queryClient.setQueryData(["boards"], context.previousBoards);
      }
      if (context.previousMeta) {
        queryClient.setQueryData(["board", context.boardId, "meta"], context.previousMeta);
      }
    },
    onSuccess: (data, vars, context) => {
      if (!context) return;
      const latest = context.boardId
        ? latestUpdateRef.current.get(context.boardId)
        : undefined;
      if (latest !== undefined && context.requestId !== latest) return;

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.map((b) => (b.id === data.id ? { ...b, title: data.title } : b)) ?? []
      );

      queryClient.setQueryData<ApiBoard>(["board", data.id, "meta"], (old) =>
        old ? { ...old, title: data.title } : data
      );
    },
    onSettled: (_data, _error, vars) => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board", vars.id, "meta"] });
    },
  });

  const archive = useMutation({
    mutationFn: (id: EntityId) => archiveBoard(id),
    onMutate: async (id) => {
      markBoardsOptimistic(true);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["boards"] }),
        queryClient.cancelQueries({ queryKey: getBoardMetaKey(id) }),
      ]);

      const previousBoards = queryClient.getQueryData<UiBoardListItem[]>(["boards"]);
      const previousMeta = queryClient.getQueryData<ApiBoard>(getBoardMetaKey(id));
      const fallbackTitle =
        previousBoards?.find((board) => board.id === id)?.title ?? previousMeta?.title;

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      );
      setBoardArchivedMeta(id, true, fallbackTitle);

      return { previousBoards, previousMeta };
    },
    onError: (_err, id, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(["boards"], context.previousBoards);
      }
      if (context?.previousMeta) {
        queryClient.setQueryData(getBoardMetaKey(id), context.previousMeta);
      } else {
        queryClient.removeQueries({ queryKey: getBoardMetaKey(id), exact: true });
      }
    },
    onSettled: (_data, _error, id) => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "archived"] });
      if (id !== undefined) {
        queryClient.invalidateQueries({ queryKey: getBoardMetaKey(id) });
      }
    },
  });

  const restore = useMutation({
    mutationFn: (id: EntityId) => restoreBoard(id),
    onSuccess: (_data, id) => {
      const fallbackTitle = getBoardTitle(id);
      setBoardArchivedMeta(id, false, fallbackTitle);
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "archived"] });
      if (id !== undefined) {
        queryClient.invalidateQueries({ queryKey: getBoardMetaKey(id) });
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: EntityId) => deleteBoard(id),
    onMutate: async (id) => {
      markBoardsOptimistic(true);
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previousBoards = queryClient.getQueryData<UiBoardListItem[]>(["boards"]);

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      );

      return { previousBoards };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(["boards"], context.previousBoards);
      }
    },
    onSettled: () => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["boards", "archived"] });
    },
  });

  const leave = useMutation({
    mutationFn: (id: EntityId) => leaveBoard(id),
    onMutate: async (id) => {
      markBoardsOptimistic(true);
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previousBoards = queryClient.getQueryData<UiBoardListItem[]>(["boards"]);

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      );

      return { previousBoards };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(["boards"], context.previousBoards);
      }
    },
    onSettled: () => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const accept = useMutation({
    mutationFn: (id: EntityId) => acceptInvite(id),
    onMutate: async () => {
      markBoardsOptimistic(true);
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previousBoards = queryClient.getQueryData<UiBoardListItem[]>(["boards"]);

      return { previousBoards };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(["boards"], context.previousBoards);
      }
    },
    onSettled: () => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const decline = useMutation({
    mutationFn: (id: EntityId) => declineInvite(id),
    onMutate: async (id) => {
      markBoardsOptimistic(true);
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previousBoards = queryClient.getQueryData<UiBoardListItem[]>(["boards"]);

      queryClient.setQueryData<UiBoardListItem[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      );

      return { previousBoards };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(["boards"], context.previousBoards);
      }
    },
    onSettled: () => {
      markBoardsOptimistic(false);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const createWithPendingGuard = async (params: {
    title: string;
    userIds: EntityId[];
  }) => {
    const trimmedTitle = params.title.trim();
    if (!trimmedTitle) return null;

    const pendingKey = trimmedTitle.toLocaleLowerCase();
    if (pendingCreateBoardTitlesRef.current.has(pendingKey)) return null;

    pendingCreateBoardTitlesRef.current.add(pendingKey);
    try {
      return await create.mutateAsync({
        ...params,
        title: trimmedTitle,
      });
    } finally {
      pendingCreateBoardTitlesRef.current.delete(pendingKey);
    }
  };

  return {
    boards,
    isLoading,
    create: createWithPendingGuard,
    update: update.mutateAsync,
    archive: archive.mutateAsync,
    restore: restore.mutateAsync,
    remove: remove.mutateAsync,
    leave: leave.mutateAsync,
    accept: accept.mutateAsync,
    decline: decline.mutateAsync,
  };
}
