import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import {
  getBoardById,
  getBoardColumns,
  createColumn,
  updateColumn,
  reorderColumns,
  reorderCards,
  restoreColumn,
  deleteColumnForever,
} from "@/services/api";
import type {
  ApiBoard,
  ApiColumn,
  ColumnOrderUpdate,
  EntityId,
  UpdateColumnRequestDto,
} from "@/types";
import { useAccessToken } from "@/hooks/auth/useAccessToken";
import { dedupeById } from "@/utils/collections";
import { createTempId } from "@/utils/entityId";

export function useBoard(boardId?: string) {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();
  const latestTitleMutRef = useRef(new Map<EntityId, number>());
  const tempColumnOrderRef = useRef<number>(-1);
  const pendingCreateColumnTitlesRef = useRef<Set<string>>(new Set());
  const boardKey = boardId ? String(boardId) : undefined;
  const columnsQueryKey = useMemo(
    () => (boardKey ? (["board", boardKey, "columns"] as const) : null),
    [boardKey]
  );
  const markColumnsOptimistic = (value: boolean) => {
    if (!columnsQueryKey) return;
    queryClient.setQueryDefaults(columnsQueryKey, {
      meta: { optimistic: value },
    });
  };

  const invalidateBoardColumns = useCallback(() => {
    if (!boardKey) return;
    queryClient.invalidateQueries({ queryKey: ["board", boardKey, "columns"] });
  }, [boardKey, queryClient]);

  const invalidateBoardColumnsAsync = useCallback(async () => {
    if (!boardKey) return;
    await queryClient.invalidateQueries({ queryKey: ["board", boardKey, "columns"] });
  }, [boardKey, queryClient]);

  const invalidateArchivedCards = useCallback(() => {
    if (!boardKey) return;
    queryClient.invalidateQueries({ queryKey: ["board", boardKey, "cards", "archived"] });
  }, [boardKey, queryClient]);

  const invalidateArchivedColumns = useCallback(() => {
    if (!boardKey) return;
    queryClient.invalidateQueries({ queryKey: ["board", boardKey, "columns", "archived"] });
  }, [boardKey, queryClient]);

  const invalidateColumnsOnly = useCallback(() => {
    invalidateBoardColumns();
  }, [invalidateBoardColumns]);

  const invalidateColumnsAndMetaAsync = useCallback(async () => {
    if (!boardKey) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["board", boardKey, "columns"] }),
      queryClient.invalidateQueries({ queryKey: ["board", boardKey, "meta"] }),
    ]);
  }, [boardKey, queryClient]);

  const invalidateColumnsAndArchive = useCallback(() => {
    invalidateBoardColumns();
    invalidateArchivedColumns();
    invalidateArchivedCards();
  }, [invalidateArchivedCards, invalidateArchivedColumns, invalidateBoardColumns]);

  const markColumnsAndArchiveStale = useCallback(() => {
    if (!boardKey) return;
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["board", boardKey, "columns"],
        refetchType: "none",
      }),
      queryClient.invalidateQueries({
        queryKey: ["board", boardKey, "columns", "archived"],
        refetchType: "none",
      }),
      queryClient.invalidateQueries({
        queryKey: ["board", boardKey, "cards", "archived"],
        refetchType: "none",
      }),
    ]).catch(() => {});
  }, [boardKey, queryClient]);

  const { data: board, isLoading: isBoardLoading, isError: isBoardError, error: boardError } = useQuery<ApiBoard>({
    queryKey: ["board", boardKey, "meta"],
    queryFn: ({ signal }) => getBoardById(boardKey!, { signal }),
    enabled: !!boardKey && Boolean(accessToken),
    staleTime: 1000 * 60 * 2,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 400 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });

  const boardArchivedAt =
    board?.archivedAt ??
    board?.archivetAt ??
    board?.ArchivedAt ??
    board?.ArchivetAt ??
    null;
  const isReadOnly = Boolean(board?.isArchived || boardArchivedAt != null);

  const {
    data: columns = [],
    isLoading: isColumnsLoading,
    isError: isColumnsError,
    error: columnsError,
  } = useQuery<ApiColumn[]>({
    queryKey: ["board", boardKey, "columns"],
    queryFn: async ({ signal }) => (await getBoardColumns(boardKey!, { signal })) ?? [],
    enabled: !!boardKey && Boolean(accessToken),
    staleTime: 1000 * 60 * 2,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 400 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });

  const orderedColumns = useMemo(
    () =>
      dedupeById(columns)
        .map((col) => ({
          ...col,
          id: String(col.id),
          cards: dedupeById(
            col.cards
            .filter((c) => !c.archivedAt && c.columnId === col.id)
            .sort((a, b) => a.order - b.order)
          )
            .map((c) => ({ ...c, id: String(c.id) })),
        }))
        .sort((a, b) => a.order - b.order),
    [columns]
  );

  const createColumnMut = useMutation({
    mutationFn: (title: string) => createColumn(boardKey!, title),
    onMutate: async (title) => {
      markColumnsOptimistic(true);
      if (!columnsQueryKey) return;
      const tempId = createTempId("column");
      const current = queryClient.getQueryData<ApiColumn[]>(columnsQueryKey);
      const maxOrder = current?.reduce((max, col) => Math.max(max, col.order ?? 0), -1) ?? -1;
      const tempOrder = Math.max(tempColumnOrderRef.current, maxOrder) + 1;
      tempColumnOrderRef.current = tempOrder;

      await queryClient.cancelQueries({ queryKey: columnsQueryKey });
      const previous = queryClient.getQueryData<ApiColumn[]>(columnsQueryKey);
      if (!previous)
        return {
          previous,
          tempId: null as EntityId | null,
          tempOrder: null as number | null,
        };
      const next: ApiColumn[] = [
        ...previous,
        {
          id: tempId,
          title: title.trim(),
          order: tempOrder,
          archivedAt: null,
          cards: [],
        },
      ];

      queryClient.setQueryData(columnsQueryKey, next);
      return { previous, tempId, tempOrder };
    },
    onError: (_err, _title, context) => {
      if (!columnsQueryKey) return;

      if (context?.tempId) {
        queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
          if (!old) return old;
          const next = old.filter((col) => col.id !== context.tempId);
          return next.length === old.length ? old : next;
        });
        return;
      }

      if (context?.previous) {
        queryClient.setQueryData(columnsQueryKey, context.previous);
      }
    },
    onSuccess: (column, _title, context) => {
      if (!columnsQueryKey) return;

      queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
        if (!old) return old;

        const resolved =
          context?.tempOrder != null ? { ...column, order: context.tempOrder } : column;

        if (!context?.tempId) {
          if (old.some((c) => c.id === resolved.id)) return old;
          return [...old, resolved];
        }

        const tempIndex = old.findIndex((c) => c.id === context.tempId);
        if (tempIndex === -1) {
          if (old.some((c) => c.id === resolved.id)) return old;
          return [...old, resolved];
        }

        const next = [...old];
        next[tempIndex] = resolved;
        return next;
      });
    },
    onSettled: () => {
      markColumnsOptimistic(false);
      invalidateColumnsOnly();
    },
  });

  const editColumnMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateColumnRequestDto }) =>
      updateColumn(id, data),
    onMutate: async (vars) => {
      markColumnsOptimistic(true);
      if (!columnsQueryKey) return;
      if (vars.data.title == null) return;

      await queryClient.cancelQueries({ queryKey: columnsQueryKey });
      const previous = queryClient.getQueryData<ApiColumn[]>(columnsQueryKey);
      if (!previous) return { previous };

      const requestId = Date.now();
      latestTitleMutRef.current.set(vars.id, requestId);

      const trimmedTitle = vars.data.title.trim();
      const next = previous.map((col) =>
        col.id === vars.id ? { ...col, title: trimmedTitle } : col
      );

      queryClient.setQueryData(columnsQueryKey, next);

      return {
        previous,
        columnId: vars.id,
        requestId,
        optimisticTitle: trimmedTitle,
      };
    },
    onError: (_err, _vars, context) => {
      if (!columnsQueryKey || !context?.previous) return;

      const latestId = context.columnId
        ? latestTitleMutRef.current.get(context.columnId)
        : undefined;
      if (latestId !== undefined && context.requestId !== latestId) return;

      const current = queryClient.getQueryData<ApiColumn[]>(columnsQueryKey);
      const currentTitle = current?.find((c) => c.id === context.columnId)?.title;
      if (currentTitle != null && context.optimisticTitle != null && currentTitle !== context.optimisticTitle) {
        return;
      }

      queryClient.setQueryData(columnsQueryKey, context.previous);
    },
    onSuccess: (_data, vars) => {
      const touchesArchive =
        vars.data &&
        Object.prototype.hasOwnProperty.call(vars.data, "isArchived");

      if (touchesArchive) {
        invalidateColumnsAndArchive();
      } else {
        invalidateColumnsOnly();
      }
    },
    onSettled: () => {
      markColumnsOptimistic(false);
    },
  });

  const reorderColumnsMut = useMutation({
    mutationFn: (columns: ColumnOrderUpdate[]) => reorderColumns(boardKey!, columns),
  });

  const reorderCardsMut = useMutation({
    mutationFn: (payload: {
      targetColumnId: EntityId;
      cards: { id: EntityId; order: number }[];
    }) =>
      reorderCards({
        targetColumnId: payload.targetColumnId,
        cards: payload.cards,
      }),
  });

  const restoreColumnMut = useMutation({
    mutationKey: ["restore", "column"],
    mutationFn: (id: string) => restoreColumn(id),
  });

  const removeFromArchivedColumnsCache = useCallback(
    (id: EntityId) => {
      if (!boardKey) return;
      queryClient.setQueryData<ApiColumn[]>(
        ["board", boardKey, "columns", "archived"],
        (old) => {
          if (!old) return old;
          const next = old.filter((col) => col.id !== id);
          return next.length === old.length ? old : next;
        }
      );
    },
    [boardKey, queryClient]
  );

  const addToActiveColumnsCache = useCallback(
    (column: ApiColumn) => {
      if (!columnsQueryKey) return;
      queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
        if (!old) return old;
        if (old.some((existing) => existing.id === column.id)) return old;
        return [...old, { ...column, archivedAt: null }];
      });
    },
    [columnsQueryKey, queryClient]
  );

  const applyRestoredColumnsResultToActiveCache = useCallback(
    (restoredColumnId: EntityId, resultColumns: ApiColumn[]) => {
      if (!columnsQueryKey) return;

      queryClient.setQueryData<ApiColumn[]>(columnsQueryKey, (old) => {
        if (!old) {
          return resultColumns.map((column) => ({ ...column, archivedAt: null }));
        }

        const existingById = new Map(old.map((column) => [column.id, column]));

        return resultColumns.map((resultColumn) => {
          const existingColumn = existingById.get(resultColumn.id);
          const activeResultColumn = { ...resultColumn, archivedAt: null };

          if (!existingColumn || resultColumn.id === restoredColumnId) {
            return activeResultColumn;
          }

          if (
            existingColumn.order === resultColumn.order &&
            (existingColumn.archivedAt ?? null) === null
          ) {
            return existingColumn;
          }

          return {
            ...existingColumn,
            order: resultColumn.order,
            archivedAt: null,
          };
        });
      });
    },
    [columnsQueryKey, queryClient]
  );

  const deleteColumnForeverMut = useMutation({
    mutationFn: (id: string) => deleteColumnForever(id),
    onSuccess: invalidateColumnsAndArchive,
  });

  const restoreColumnAndSync = useCallback(
    async (id: string) => {
      const archivedSnapshot = boardKey
        ? queryClient
            .getQueryData<ApiColumn[]>(["board", boardKey, "columns", "archived"])
            ?.find((col) => col.id === id)
        : undefined;
      const result = await restoreColumnMut.mutateAsync(id);
      const restoredFromResult = Array.isArray(result)
        ? result.find((col) => col.id === id)
        : undefined;

      if (restoredFromResult && Array.isArray(result)) {
        applyRestoredColumnsResultToActiveCache(id, result);
      } else if (archivedSnapshot) {
        addToActiveColumnsCache(archivedSnapshot);
      }

      removeFromArchivedColumnsCache(id);
      markColumnsAndArchiveStale();
      return result;
    },
    [
      addToActiveColumnsCache,
      applyRestoredColumnsResultToActiveCache,
      boardKey,
      markColumnsAndArchiveStale,
      queryClient,
      removeFromArchivedColumnsCache,
      restoreColumnMut,
    ]
  );

  const createColumnWithPendingGuard = useCallback(
    async (title: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return null;

      const pendingKey = trimmedTitle.toLocaleLowerCase();
      if (pendingCreateColumnTitlesRef.current.has(pendingKey)) return null;

      pendingCreateColumnTitlesRef.current.add(pendingKey);
      try {
        return await createColumnMut.mutateAsync(trimmedTitle);
      } finally {
        pendingCreateColumnTitlesRef.current.delete(pendingKey);
      }
    },
    [createColumnMut]
  );

  const editColumnAsync = useCallback(
    (id: string, data: UpdateColumnRequestDto) =>
      editColumnMut.mutateAsync({ id, data }),
    [editColumnMut]
  );

  const reorderColumnsAndRefresh = useCallback(
    async (columns: ColumnOrderUpdate[]) => {
      await reorderColumnsMut.mutateAsync(columns);
      await invalidateBoardColumnsAsync();
    },
    [invalidateBoardColumnsAsync, reorderColumnsMut]
  );

  const reorderCardsInColumnAndRefresh = useCallback(
    async (payload: {
      targetColumnId: EntityId;
      cards: { id: EntityId; order: number }[];
    }) => {
      await reorderCardsMut.mutateAsync(payload);
      await invalidateBoardColumnsAsync();
    },
    [invalidateBoardColumnsAsync, reorderCardsMut]
  );

  const refreshBoardData = useCallback(
    () => invalidateColumnsAndMetaAsync(),
    [invalidateColumnsAndMetaAsync]
  );

  return {
    board,
    isReadOnly,
    columns: orderedColumns,
    isLoading: isBoardLoading || isColumnsLoading,
    isError: isBoardError || isColumnsError,
    boardError,
    columnsError,
    createColumn: createColumnWithPendingGuard,
    editColumn: editColumnAsync,
    restoreColumn: restoreColumnAndSync,
    deleteColumnForever: deleteColumnForeverMut.mutateAsync,
    reorderColumn: reorderColumnsAndRefresh,
    reorderCardsInColumn: reorderCardsInColumnAndRefresh,
    refresh: refreshBoardData,
  };
}
