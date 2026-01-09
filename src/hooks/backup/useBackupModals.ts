import { useState, useCallback } from 'react';
import { Backup } from '../../types/backup';

export interface UseBackupModalsReturn {
  // Modal states
  isSetupModalVisible: boolean;
  isBackupModalVisible: boolean;
  isDeleteModalVisible: boolean;
  isRestoreModalVisible: boolean;
  isNamespaceAuthModalVisible: boolean;

  // Selected items
  selectedBackup: Backup | null;

  // Modal control actions
  setIsSetupModalVisible: (visible: boolean) => void;
  setIsBackupModalVisible: (visible: boolean) => void;
  setIsDeleteModalVisible: (visible: boolean) => void;
  setIsRestoreModalVisible: (visible: boolean) => void;
  setIsNamespaceAuthModalVisible: (visible: boolean) => void;
  setSelectedBackup: (backup: Backup | null) => void;

  // Convenience methods
  showSetupModal: () => void;
  hideSetupModal: () => void;
  showBackupModal: () => void;
  hideBackupModal: () => void;
  showDeleteModal: (backup: Backup) => void;
  hideDeleteModal: () => void;
  showRestoreModal: (backup: Backup) => void;
  hideRestoreModal: () => void;
  showNamespaceAuthModal: () => void;
  hideNamespaceAuthModal: () => void;

  // Reset all modals
  resetModalState: () => void;
}

export const useBackupModals = (): UseBackupModalsReturn => {
  // Modal visibility states
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isNamespaceAuthModalVisible, setIsNamespaceAuthModalVisible] =
    useState(false);

  // Selected items
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  // Convenience methods
  const showSetupModal = useCallback(() => {
    setIsSetupModalVisible(true);
  }, []);

  const hideSetupModal = useCallback(() => {
    setIsSetupModalVisible(false);
  }, []);

  const showBackupModal = useCallback(() => {
    setIsBackupModalVisible(true);
  }, []);

  const hideBackupModal = useCallback(() => {
    setIsBackupModalVisible(false);
    setSelectedBackup(null);
  }, []);

  const showDeleteModal = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    setIsDeleteModalVisible(true);
  }, []);

  const hideDeleteModal = useCallback(() => {
    setIsDeleteModalVisible(false);
    setSelectedBackup(null);
  }, []);

  const showRestoreModal = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    setIsRestoreModalVisible(true);
  }, []);

  const hideRestoreModal = useCallback(() => {
    setIsRestoreModalVisible(false);
    setSelectedBackup(null);
  }, []);

  const showNamespaceAuthModal = useCallback(() => {
    setIsNamespaceAuthModalVisible(true);
  }, []);

  const hideNamespaceAuthModal = useCallback(() => {
    setIsNamespaceAuthModalVisible(false);
  }, []);

  // Reset all modal states
  const resetModalState = useCallback(() => {
    setIsSetupModalVisible(false);
    setIsBackupModalVisible(false);
    setIsDeleteModalVisible(false);
    setIsRestoreModalVisible(false);
    setIsNamespaceAuthModalVisible(false);
    setSelectedBackup(null);
  }, []);

  return {
    // Modal states
    isSetupModalVisible,
    isBackupModalVisible,
    isDeleteModalVisible,
    isRestoreModalVisible,
    isNamespaceAuthModalVisible,

    // Selected items
    selectedBackup,

    // Modal control actions
    setIsSetupModalVisible,
    setIsBackupModalVisible,
    setIsDeleteModalVisible,
    setIsRestoreModalVisible,
    setIsNamespaceAuthModalVisible,
    setSelectedBackup,

    // Convenience methods
    showSetupModal,
    hideSetupModal,
    showBackupModal,
    hideBackupModal,
    showDeleteModal,
    hideDeleteModal,
    showRestoreModal,
    hideRestoreModal,
    showNamespaceAuthModal,
    hideNamespaceAuthModal,

    // Reset all modals
    resetModalState,
  };
};
