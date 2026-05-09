import { useCallback, useState } from "react";

export function useCardModal() {
  const [isEditOpen, setEditOpen] = useState(false);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);

  const openEdit = useCallback((byKeyboard = false) => {
    setOpenedByKeyboard(byKeyboard);
    setEditOpen(true);
  }, []);
  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setOpenedByKeyboard(false);
  }, []);
  const openDelete = useCallback(() => setDeleteOpen(true), []);
  const closeDelete = useCallback(() => setDeleteOpen(false), []);

  return {
    isEditOpen,
    openedByKeyboard,
    isDeleteOpen,
    openEdit,
    closeEdit,
    openDelete,
    closeDelete,
  };
}
