import { act, renderHook } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useColumn } from "@/hooks/column/useColumn";
import { createCard, updateCard } from "@/services/api";

vi.mock("@/services/api", () => ({
  createCard: vi.fn(),
  updateCard: vi.fn(),
}));

const mockedCreateCard = vi.mocked(createCard);
const mockedUpdateCard = vi.mocked(updateCard);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useColumn", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a card and clears the draft on success", async () => {
    mockedCreateCard.mockResolvedValue({
      id: "card-1",
      title: "Ship beta",
      content: "",
      order: 0,
      columnId: "column-1",
      boardId: "board-1",
      assigneeId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      isArchived: false,
      archivedAt: null,
      archivedManually: false,
    });
    mockedUpdateCard.mockResolvedValue({
      id: "card-1",
      title: "Ship beta",
      content: "",
      order: 0,
      columnId: "column-1",
      boardId: "board-1",
      assigneeId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      isArchived: false,
      archivedAt: null,
      archivedManually: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useColumn({
          columnId: "column-1",
          boardId: "board-1",
        }),
      { wrapper }
    );

    act(() => {
      result.current.setNewCardTitle("Ship beta");
    });

    await act(async () => {
      await result.current.handleCreateCard();
    });

    expect(mockedCreateCard).toHaveBeenCalledWith(
      "column-1",
      "Ship beta",
      "",
      false
    );
    expect(result.current.newCardTitle).toBe("");
  });

  it("restores the draft and shows a toast when card creation fails", async () => {
    mockedCreateCard.mockRejectedValue(new Error("create failed"));

    const onErrorToast = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useColumn({
          columnId: "column-1",
          boardId: "board-1",
          onErrorToast,
        }),
      { wrapper }
    );

    act(() => {
      result.current.setNewCardTitle("Fix drag bug");
    });

    await act(async () => {
      await result.current.handleCreateCard();
    });

    expect(mockedCreateCard).toHaveBeenCalledWith(
      "column-1",
      "Fix drag bug",
      "",
      false
    );
    expect(onErrorToast).toHaveBeenCalledWith("Failed to create card.");
    expect(result.current.newCardTitle).toBe("Fix drag bug");
  });
});
