import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCreateColumn } from "@/hooks/board/useCreateColumn";

describe("useCreateColumn", () => {
  it("creates a column with a trimmed title and clears the draft on success", async () => {
    const createColumn = vi.fn().mockResolvedValue(undefined);
    const scrollToAddColumn = vi.fn();

    const { result } = renderHook(() =>
      useCreateColumn({
        isReadOnly: false,
        createColumn,
        scrollToAddColumn,
      })
    );

    act(() => {
      result.current.setIsCreating(true);
      result.current.setNewColumnTitle("  Backlog  ");
    });

    await act(async () => {
      await result.current.handleCreateColumn();
    });

    expect(createColumn).toHaveBeenCalledWith("Backlog");
    expect(result.current.newColumnTitle).toBe("");
    expect(result.current.isCreating).toBe(false);
  });

  it("restores the draft and shows a toast when column creation fails", async () => {
    const createColumn = vi.fn().mockRejectedValue(new Error("create failed"));
    const scrollToAddColumn = vi.fn();
    const onErrorToast = vi.fn();

    const { result } = renderHook(() =>
      useCreateColumn({
        isReadOnly: false,
        createColumn,
        scrollToAddColumn,
        onErrorToast,
      })
    );

    act(() => {
      result.current.setIsCreating(true);
      result.current.setNewColumnTitle("Ideas");
    });

    await act(async () => {
      await result.current.handleCreateColumn();
    });

    expect(createColumn).toHaveBeenCalledWith("Ideas");
    expect(onErrorToast).toHaveBeenCalledWith("Failed to create column.");
    expect(result.current.newColumnTitle).toBe("Ideas");
    expect(result.current.isCreating).toBe(true);
  });
});
