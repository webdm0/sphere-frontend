import { useState } from 'react';

export function useModals() {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  return {
    isCreateModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    openCreateModal: () => setCreateModalOpen(true),
    closeCreateModal: () => setCreateModalOpen(false),
    openEditModal: () => setEditModalOpen(true),
    closeEditModal: () => setEditModalOpen(false),
    openDeleteModal: () => setDeleteModalOpen(true),
    closeDeleteModal: () => setDeleteModalOpen(false),
  };
}
