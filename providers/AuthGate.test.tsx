import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthGate from "@/providers/AuthGate";
import { useAuthBootstrap } from "@/hooks/auth/useAuthBootstrap";

vi.mock("@/hooks/auth/useAuthBootstrap", () => ({
  useAuthBootstrap: vi.fn(),
}));

const mockedUseAuthBootstrap = vi.mocked(useAuthBootstrap);

describe("AuthGate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders children on public routes without an access token", () => {
    mockedUseAuthBootstrap.mockReturnValue({
      accessToken: null,
      isPublic: true,
    });

    render(
      <AuthGate>
        <div>public content</div>
      </AuthGate>
    );

    expect(screen.getByText("public content")).toBeInTheDocument();
  });

  it("hides protected content until an access token exists", () => {
    mockedUseAuthBootstrap.mockReturnValue({
      accessToken: null,
      isPublic: false,
    });

    const { container } = render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders protected content when an access token is available", () => {
    mockedUseAuthBootstrap.mockReturnValue({
      accessToken: "token",
      isPublic: false,
    });

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
