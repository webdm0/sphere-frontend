import type { EntityId } from "@/types";

let tempCounter = 0;
const LEGACY_NUMERIC_ID_PATTERN = /^\d+$/;

export const createTempId = (scope: string): EntityId => {
  tempCounter += 1;
  return `temp:${scope}:${Date.now().toString(36)}:${tempCounter.toString(36)}`;
};

export const isTempId = (id: EntityId | null | undefined): boolean =>
  typeof id === "string" && id.startsWith("temp:");

export const isLegacyNumericEntityId = (value: unknown): boolean => {
  if (typeof value === "number") {
    return Number.isInteger(value) && Number.isFinite(value);
  }

  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return LEGACY_NUMERIC_ID_PATTERN.test(trimmed);
};
