import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateBoardModal from "@/components/modals/ModalsBoard/CreateBoardModal";
import { useUserSearchDropdown } from "@/hooks/user/useUserSearchDropdown";

vi.mock("@/hooks/user/useUserSearchDropdown", () => ({
  useUserSearchDropdown: vi.fn(),
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

const mockedUseUserSearchDropdown = vi.mocked(useUserSearchDropdown);

describe("CreateBoardModal", () => {
  const setQuery = vi.fn();
  const closeDropdown = vi.fn();
  const onQueryChange = vi.fn();

  beforeEach(() => {
    mockedUseUserSearchDropdown.mockReturnValue({
      query: "",
      dropdownOpen: true,
      filteredUsers: [
        {
          id: "user-1",
          username: "alice",
          email: "alice@example.com",
        },
      ],
      setQuery,
      setDropdownOpen: vi.fn(),
      closeDropdown,
      onQueryChange,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits the board title and selected member ids", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { container } = render(
      <CreateBoardModal
        isOpen
        onClose={onClose}
        create={create}
      />
    );

    await user.type(screen.getByPlaceholderText("Board name"), "Project Alpha");
    await user.click(screen.getByRole("option", { name: "alice" }));

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        title: "Project Alpha",
        userIds: ["user-1"],
      });
    });

    expect(onClose).toHaveBeenCalled();
    expect(setQuery).toHaveBeenCalledWith("");
    expect(closeDropdown).toHaveBeenCalled();
  });

  it("does not submit when the board name is empty", () => {
    const create = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <CreateBoardModal
        isOpen
        onClose={onClose}
        create={create}
      />
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    expect(create).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("replaces collaboration input with a disabled demo field and submits private boards only", async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { container } = render(
      <CreateBoardModal
        isOpen
        isDemo
        onClose={onClose}
        create={create}
      />
    );

    const demoInput = within(container).getByPlaceholderText(
      "Invites disabled"
    );
    expect(demoInput).toBeDisabled();
    expect(
      within(container).queryByPlaceholderText("Add user by username")
    ).not.toBeInTheDocument();

    await user.type(
      within(container).getByPlaceholderText("Board name"),
      "Demo Board"
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        title: "Demo Board",
        userIds: [],
      });
    });

    expect(onClose).toHaveBeenCalled();
  });
});
