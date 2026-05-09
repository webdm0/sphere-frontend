import { describe, expect, it } from "vitest";
import { buildApiUrl, resolveServerApiOrigin } from "@/utils/apiUrl";

describe("apiUrl helpers", () => {
  it("builds absolute API URLs without duplicating slashes", () => {
    expect(buildApiUrl("https://api.example.com/", "/api/events/board-1")).toBe(
      "https://api.example.com/api/events/board-1"
    );
  });

  it("builds relative proxy URLs for same-origin requests", () => {
    expect(buildApiUrl("/backend", "/api/events/board-1")).toBe(
      "/backend/api/events/board-1"
    );
  });

  it("prefers BACKEND_URL when resolving the server-side API origin", () => {
    expect(
      resolveServerApiOrigin(
        "https://backend.example.com/",
        "https://public-api.example.com/"
      )
    ).toBe("https://backend.example.com");
  });

  it("falls back to an absolute public API URL when BACKEND_URL is missing", () => {
    expect(
      resolveServerApiOrigin(undefined, "https://public-api.example.com/")
    ).toBe("https://public-api.example.com");
  });

  it("returns null for relative public API paths without BACKEND_URL", () => {
    expect(resolveServerApiOrigin(undefined, "/backend")).toBeNull();
  });
});
