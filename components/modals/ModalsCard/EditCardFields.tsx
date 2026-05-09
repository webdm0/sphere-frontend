"use client";

import { useMemo } from "react";
import type { ApiCard, BoardMemberDto, UpdateCardInput } from "@/types";
import GlassSelect from "@/components/common/GlassSelect";
import GlassDayPicker from "@/components/common/GlassDayPicker";
import styles from "./EditCardModal.module.css";

interface EditCardFieldsProps {
  card: ApiCard;
  members: BoardMemberDto[];
  isReadOnly: boolean;
  isArchiveToggleDisabled: boolean;
  onAutoSave: (changes: UpdateCardInput) => Promise<void> | void;
  onArchiveToggle: (nextArchived: boolean) => void;
}

export default function EditCardFields({
  card,
  members,
  isReadOnly,
  isArchiveToggleDisabled,
  onAutoSave,
  onArchiveToggle,
}: EditCardFieldsProps) {
  const archiveToggleId = `archive-toggle-${card.id}`;
  const assigneeOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...members
        .filter((m) => m.isAccepted)
        .map((m) => ({
          value: String(m.userId),
          label: m.username ?? m.email,
        })),
    ],
    [members]
  );

  return (
    <div className={styles.fieldsGrid}>
      <div className={styles.field}>
        <label>Assignee</label>
        <GlassSelect
          readOnly={isReadOnly}
          options={assigneeOptions}
          value={card.assigneeId ? String(card.assigneeId) : ""}
          onChange={(val) =>
            onAutoSave({
              assigneeId: val === "" ? null : String(val),
            })
          }
          placeholder="Select assignee"
        />
      </div>

      <div className={styles.field}>
        <label>Priority</label>
        <GlassSelect
          readOnly={isReadOnly}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ]}
          value={card.priority ?? "medium"}
          onChange={(val) =>
            onAutoSave({ priority: val as ApiCard["priority"] })
          }
        />
      </div>

      <div className={styles.field}>
        <GlassDayPicker
          readOnly={isReadOnly}
          label="Start date"
          value={card.startAt ?? null}
          onChange={(iso) => onAutoSave({ startAt: iso ?? null })}
          align="right"
        />
      </div>

      <div className={styles.field}>
        <GlassDayPicker
          readOnly={isReadOnly}
          label="Due date"
          value={card.dueAt ?? null}
          minDate={card.startAt ? new Date(card.startAt) : undefined}
          onChange={(iso) => onAutoSave({ dueAt: iso ?? null })}
          align="left"
        />
      </div>

      <div
        className={styles.archiveField}
        data-checked={card.isArchived ? "true" : "false"}
      >
        <span className={styles.archiveLabel}>Archive</span>
        <label className={styles.switch}>
          <input
            id={archiveToggleId}
            type="checkbox"
            aria-label="Archive"
            checked={!!card.isArchived}
            disabled={isArchiveToggleDisabled}
            onChange={(e) => onArchiveToggle(e.target.checked)}
          />
          <span className={styles.slider}></span>
        </label>
      </div>
    </div>
  );
}
