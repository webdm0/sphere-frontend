import { useState } from 'react';
import type { EntityId } from "@/types";

export function useBoardModals() {
  const [selected, setSelected] = useState<{ id: EntityId; title: string } | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "leave">(null);

  const clear = () => {
    setSelected(null);
    setEditOpen(false);
    setCreateOpen(false);
    setOpenedByKeyboard(false);
    setConfirmAction(null);
  };

  return {
    selected,
    select: setSelected,
    clear,

    isCreateOpen,
    openedByKeyboard,
    openCreate: (byKeyboard = false) => {
      setOpenedByKeyboard(byKeyboard);
      setCreateOpen(true);
    },
    closeCreate: () => {
      setCreateOpen(false);
      setOpenedByKeyboard(false);
    },

    isEditOpen,
    openEdit: () => setEditOpen(true),
    closeEdit: () => setEditOpen(false),

    confirmAction,
    setConfirmAction,
  };
}
