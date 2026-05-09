import { RestoreCardResponseDto } from "@/types";

export const buildRestoreToast = (
  response: RestoreCardResponseDto | undefined
) => {
  const context = response?.restoreContext;

  switch (context) {
    case "original":
      return undefined;
    case "original_archived":
      return {
        message: `Sent to first column (original archived).`,
        note: "Unarchive the old column if you need it there.",
      };
    case "original_deleted":
      return {
        message: `Original column missing — sent to first.`,
        note: "Move it where you need.",
      };
    case "no_columns":
      return {
        message: `No columns on this board.`,
        note: "Create one to place the card.",
      };
    default:
      return {
        message: `Card restored.`,
      };
  }
};
