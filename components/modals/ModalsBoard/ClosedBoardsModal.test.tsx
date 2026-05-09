import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClosedBoardsModal from "@/components/modals/ModalsBoard/ClosedBoardsModal";
import { useClosedBoardsState } from "@/hooks/board/useClosedBoardsState";

vi.mock("@/hooks/board/useClosedBoardsState", () => ({
  useClosedBoardsState: vi.fn(),
}));

vi.mock("@/components/ui/PortalTooltip", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/ui/useBodyScrollLock", () => ({
  useBodyScrollLock: vi.fn(),
}));

vi.mock("@/hooks/ui/useEscapeClose", () => ({
  useEscapeClose: vi.fn(),
}));

vi.mock("@/hooks/ui/useFocusTrap", () => ({
  useFocusTrap: vi.fn(),
}));

const mockedUseClosedBoardsState = vi.mocked(useClosedBoardsState);

describe("ClosedBoardsModal", () => {
  const defaultBoard = {
    id: "board-1",
    title: "Closed roadmap",
    isMine: true,
    isShared: false,
    isAccepted: true,
    ownerName: "",
    archivedAt: null,
  };

  beforeEach(() => {
    mockedUseClosedBoardsState.mockReturnValue({
      restoringIds: new Set(),
      setRestoringIds: vi.fn(),
      deletingIds: new Set(),
      setDeletingIds: vi.fn(),
      archivedBoardIds: new Set(["board-1"]),
      archivedBoardKey: "board-1",
      confirmPopover: null,
      confirmVisible: false,
      confirmPopoverRef: { current: null },
      openConfirmPopover: vi.fn(),
      closeConfirmPopover: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("shows an inline error when restore fails", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockRejectedValue(new Error("restore failed"));

    render(
      <ClosedBoardsModal
        isOpen
        onClose={vi.fn()}
        boards={[defaultBoard]}
        pendingBoards={[]}
        isLoading={false}
        onRestore={onRestore}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Restore board" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to restore board."
      );
    });
  });

  it("renders closed boards incrementally", () => {
    const boards = Array.from({ length: 6 }, (_, index) => ({
      ...defaultBoard,
      id: `board-${index + 1}`,
      title: `Closed board ${index + 1}`,
    }));

    render(
      <ClosedBoardsModal
        isOpen
        onClose={vi.fn()}
        boards={boards}
        pendingBoards={[]}
        isLoading={false}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Closed board 5")).toBeInTheDocument();
    expect(screen.queryByText("Closed board 6")).not.toBeInTheDocument();
  });

  it("clears the restore error after the modal closes", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockRejectedValue(new Error("restore failed"));

    const { rerender } = render(
      <ClosedBoardsModal
        isOpen
        onClose={vi.fn()}
        boards={[defaultBoard]}
        pendingBoards={[]}
        isLoading={false}
        onRestore={onRestore}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Restore board" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to restore board."
      );
    });

    rerender(
      <ClosedBoardsModal
        isOpen={false}
        onClose={vi.fn()}
        boards={[defaultBoard]}
        pendingBoards={[]}
        isLoading={false}
        onRestore={onRestore}
        onDelete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
