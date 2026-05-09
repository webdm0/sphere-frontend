"use client";

import { memo } from "react";
import styles from "@/components/columns/Column.module.css";

interface ColumnCardInputProps {
  value: string;
  isPending: boolean;
  isReadOnly: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
}

function ColumnCardInput({
  value,
  isPending,
  isReadOnly,
  onChange,
  onKeyDown,
  onSubmit,
}: ColumnCardInputProps) {
  const canSubmit = !isPending && !isReadOnly && value.trim().length > 0;

  return (
    <div className={styles.cardInputWrapper}>
      <input
        type="text"
        placeholder="Create card..."
        value={value}
        minLength={1}
        maxLength={80}
        enterKeyHint="done"
        onChange={(e) => {
          if (isReadOnly) return;
          onChange(e.target.value);
        }}
        onKeyDown={isPending || isReadOnly ? undefined : onKeyDown}
        readOnly={isPending || isReadOnly}
        disabled={isPending || isReadOnly}
        className={`${styles.cardInput} ${isPending ? styles.cardInputPending : ""}`}
      />
      <button
        type="button"
        aria-label="Create card"
        className={`${styles.cardInputAddBtn} focus-ring`}
        onPointerDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => onSubmit?.()}
        disabled={!canSubmit}
      >
        +
      </button>
    </div>
  );
}

export default memo(ColumnCardInput);
