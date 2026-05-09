import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useArchiveModalState } from "@/hooks/archive/useArchiveModalState";

describe("useArchiveModalState", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a toast and clears pending restore state when column restore fails", async () => {
    const column = {
      id: "column-1",
      title: "Backlog",
      order: 0,
      boardId: "board-1",
      cards: [],
      isArchived: true,
      archivedAt: "2026-01-01T00:00:00.000Z",
      archivedManually: true,
    };
    const restoreColumn = vi.fn().mockRejectedValue(new Error("restore failed"));

    const { result } = renderHook(() =>
      useArchiveModalState({
        isOpen: true,
        archivedColumns: [column],
        archivedCards: [],
        pendingArchivedColumns: [],
        pendingArchivedCards: [],
        isBoardReadOnly: false,
        restoreCard: vi.fn(),
        removeCardForever: vi.fn(),
        restoreColumn,
        deleteColumnForever: vi.fn(),
        openEdit: vi.fn(),
        closeEdit: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleRestoreColumn(column);
    });

    expect(restoreColumn).toHaveBeenCalledWith(column.id);

    await waitFor(() => {
      expect(result.current.toasts).toEqual([
        expect.objectContaining({
          message: `Couldn't restore "${column.title}"`,
        }),
      ]);
    });

    expect(result.current.restoringColumnIds.has(column.id)).toBe(false);
  });
});
