import { describe, expect, it } from "vitest";
import { createTempId, isLegacyNumericEntityId, isTempId } from "@/utils/entityId";

describe("entityId utils", () => {
  it("creates temp ids with the expected prefix", () => {
    const id = createTempId("board");

    expect(id).toMatch(/^temp:board:/);
    expect(isTempId(id)).toBe(true);
  });

  it("recognizes only legacy numeric ids", () => {
    expect(isLegacyNumericEntityId(42)).toBe(true);
    expect(isLegacyNumericEntityId("42")).toBe(true);
    expect(isLegacyNumericEntityId(" 42 ")).toBe(true);

    expect(isLegacyNumericEntityId("board-42")).toBe(false);
    expect(isLegacyNumericEntityId("")).toBe(false);
    expect(isLegacyNumericEntityId(null)).toBe(false);
  });
});
