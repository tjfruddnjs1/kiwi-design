import { useEffect, useCallback } from 'react';
import { message } from 'antd';
import { getInfrastructures, getServers } from '../lib/api/infra';
import { useBackupData } from './backup/useBackupData';
import { useBackupOperations } from './backup/useBackupOperations';
import { useBackupModals } from './backup/useBackupModals';
import { useBackupConfig } from './backup/useBackupConfig';
import { Backup, SshAuthHop } from '../types/backup';
import { BackupFormValues, RestoreFormValues } from '../types';

interface UseBackupOptions {
  autoLoad?: boolean;
}

interface UseBackupReturn {
  // From useBackupData
  backups: ReturnType<typeof useBackupData>['backups'];
  restores: ReturnType<typeof useBackupData>['restores'];
  actualBackups: ReturnType<typeof useBackupData>['actualBackups'];
  infrastructures: ReturnType<typeof useBackupData>['infrastructures'];
  servers: ReturnType<typeof useBackupData>['servers'];
  selectedInfraId: ReturnType<typeof useBackupData>['selectedInfraId'];
  installStatus: ReturnType<typeof useBackupData>['installStatus'];
  minioStorages: ReturnType<typeof useBackupData>['minioStorages'];
  allMinioStorages: ReturnType<typeof useBackupData>['allMinioStorages'];
  namespaces: ReturnType<typeof useBackupData>['namespaces'];

  // Loading states
  isLoadingStatus: ReturnType<typeof useBackupData>['isLoadingStatus'];
  isLoadingActualBackups: ReturnType<
    typeof useBackupData
  >['isLoadingActualBackups'];
  isFetchingNamespaces: ReturnType<
    typeof useBackupData
  >['isFetchingNamespaces'];
  isCreatingBackup: ReturnType<typeof useBackupOperations>['isCreatingBackup'];
  isDeleting: ReturnType<typeof useBackupOperations>['isDeleting'];
  isRestoring: ReturnType<typeof useBackupOperations>['isRestoring'];

  // From useBackupModals
  isSetupModalVisible: ReturnType<
    typeof useBackupModals
  >['isSetupModalVisible'];
  isBackupModalVisible: ReturnType<
    typeof useBackupModals
  >['isBackupModalVisible'];
  isDeleteModalVisible: ReturnType<
    typeof useBackupModals
  >['isDeleteModalVisible'];
  isRestoreModalVisible: ReturnType<
    typeof useBackupModals
  >['isRestoreModalVisible'];
  isNamespaceAuthModalVisible: ReturnType<
    typeof useBackupModals
  >['isNamespaceAuthModalVisible'];
  selectedBackup: ReturnType<typeof useBackupModals>['selectedBackup'];

  // From useBackupConfig
  configData: ReturnType<typeof useBackupConfig>['configData'];
  currentStep: ReturnType<typeof useBackupConfig>['currentStep'];
  scheduleType: ReturnType<typeof useBackupConfig>['scheduleType'];
  minioMode: ReturnType<typeof useBackupConfig>['minioMode'];
  selectedMinioId: ReturnType<typeof useBackupConfig>['selectedMinioId'];
  restoreToDifferentNamespace: ReturnType<
    typeof useBackupConfig
  >['restoreToDifferentNamespace'];
  pollingRestoreId: ReturnType<typeof useBackupOperations>['pollingRestoreId'];

  // Combined actions
  loadBackups: (infraId: number) => Promise<void>;
  loadRestores: (infraId: number) => Promise<void>;
  loadActualBackups: (
    infraId: number,
    backupName?: string,
    namespace?: string,
    authHops?: SshAuthHop[]
  ) => Promise<void>;
  loadBackupStatus: (infraId: number) => Promise<void>;
  loadAllMinioStorages: () => Promise<void>;
  fetchNamespaces: (values: BackupFormValues) => Promise<void>;
  handleInfraChange: (infraId: string) => Promise<void>;
  handleCreateBackup: (values: BackupFormValues) => Promise<void>;
  handleDelete: (record: Backup) => void;
  handleConfirmDelete: () => Promise<void>;
  handleRestore: (record: Backup) => void;
  handleConfirmRestore: (values: RestoreFormValues) => Promise<void>;
  startInstallation: () => Promise<void>;

  // Modal control
  setSetupModalVisible: (visible: boolean) => void;
  setBackupModalVisible: (visible: boolean) => void;
  setDeleteModalVisible: (visible: boolean) => void;
  setRestoreModalVisible: (visible: boolean) => void;
  setNamespaceAuthModalVisible: (visible: boolean) => void;
  setSelectedBackup: (backup: Backup | null) => void;
  setCurrentStep: (step: number) => void;
  setScheduleType: (type: 'daily' | 'weekly' | 'monthly') => void;
  setMinioMode: (mode: 'existing' | 'new') => void;
  setSelectedMinioId: (id: number | null) => void;
  setRestoreToDifferentNamespace: (value: boolean) => void;

  // Utility functions
  convertScheduleToExpression: (values: BackupFormValues) => string;
  resetAll: () => void;
}

export const useBackup = (options: UseBackupOptions = {}): UseBackupReturn => {
  const { autoLoad = true } = options;

  // Use the separated hooks
  const dataHook = useBackupData();
  const operationsHook = useBackupOperations();
  const modalsHook = useBackupModals();
  const configHook = useBackupConfig();

  // Handle infrastructure change
  const handleInfraChange = useCallback(
    async (infraId: string) => {
      if (!infraId) return;

      dataHook.setSelectedInfraId(infraId);
      const infraIdNum = parseInt(infraId);

      try {
        const servers = await getServers(infraIdNum);

        dataHook.setServers(servers || []);

        // Load all backup-related data
        await Promise.all([
          dataHook.loadBackups(infraIdNum),
          dataHook.loadRestores(infraIdNum),
          dataHook.loadBackupStatus(infraIdNum),
        ]);
      } catch (_error) {
        message.error('인프라 정보를 불러오는데 실패했습니다.');
      }
    },
    [dataHook]
  );

  // Initialize data on mount
  useEffect(() => {
    if (autoLoad) {
      const initializeData = async () => {
        try {
          const infraResponse = await getInfrastructures();

          dataHook.setInfrastructures(infraResponse || []);

          if (infraResponse && infraResponse.length > 0) {
            const firstInfra = infraResponse[0];

            if (firstInfra) {
              await handleInfraChange(firstInfra.id.toString());
            }
          }
        } catch (_error) {
          message.error('초기 데이터를 불러오는데 실패했습니다.');
        }
      };

      initializeData();
    }
  }, [autoLoad, handleInfraChange, dataHook]);

  // Enhanced backup creation with modal handling
  const handleCreateBackup = useCallback(
    async (values: BackupFormValues) => {
      try {
        await operationsHook.handleCreateBackup(values);
        modalsHook.hideBackupModal();
        if (dataHook.selectedInfraId) {
          await dataHook.loadBackups(parseInt(dataHook.selectedInfraId));
        }
      } catch (_error) {
        // Error already handled in operationsHook
      }
    },
    [operationsHook, modalsHook, dataHook]
  );

  // Handle delete with modal
  const handleDelete = useCallback(
    (record: Backup) => {
      modalsHook.showDeleteModal(record);
    },
    [modalsHook]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!modalsHook.selectedBackup) return;

    try {
      await operationsHook.handleDeleteBackup(modalsHook.selectedBackup.id);
      modalsHook.hideDeleteModal();
      if (dataHook.selectedInfraId) {
        await dataHook.loadBackups(parseInt(dataHook.selectedInfraId));
      }
    } catch (_error) {
      // Error already handled in operationsHook
    }
  }, [operationsHook, modalsHook, dataHook]);

  // Handle restore with modal
  const handleRestore = useCallback(
    (record: Backup) => {
      modalsHook.showRestoreModal(record);
    },
    [modalsHook]
  );

  const handleConfirmRestore = useCallback(
    async (values: RestoreFormValues) => {
      try {
        await operationsHook.handleRestoreBackup(values);
        modalsHook.hideRestoreModal();
        if (dataHook.selectedInfraId) {
          await dataHook.loadRestores(parseInt(dataHook.selectedInfraId));
        }
      } catch (_error) {
        // Error already handled in operationsHook
      }
    },
    [operationsHook, modalsHook, dataHook]
  );

  // Reset all state
  const resetAll = useCallback(() => {
    dataHook.resetDataState();
    operationsHook.resetOperationsState();
    modalsHook.resetModalState();
    configHook.resetConfigState();
  }, [dataHook, operationsHook, modalsHook, configHook]);

  return {
    // Data state
    backups: dataHook.backups,
    restores: dataHook.restores,
    actualBackups: dataHook.actualBackups,
    infrastructures: dataHook.infrastructures,
    servers: dataHook.servers,
    selectedInfraId: dataHook.selectedInfraId,
    installStatus: dataHook.installStatus,
    minioStorages: dataHook.minioStorages,
    allMinioStorages: dataHook.allMinioStorages,
    namespaces: dataHook.namespaces,

    // Loading states
    isLoadingStatus: dataHook.isLoadingStatus,
    isLoadingActualBackups: dataHook.isLoadingActualBackups,
    isFetchingNamespaces: dataHook.isFetchingNamespaces,
    isCreatingBackup: operationsHook.isCreatingBackup,
    isDeleting: operationsHook.isDeleting,
    isRestoring: operationsHook.isRestoring,

    // Modal states
    isSetupModalVisible: modalsHook.isSetupModalVisible,
    isBackupModalVisible: modalsHook.isBackupModalVisible,
    isDeleteModalVisible: modalsHook.isDeleteModalVisible,
    isRestoreModalVisible: modalsHook.isRestoreModalVisible,
    isNamespaceAuthModalVisible: modalsHook.isNamespaceAuthModalVisible,
    selectedBackup: modalsHook.selectedBackup,

    // Config state
    configData: configHook.configData,
    currentStep: configHook.currentStep,
    scheduleType: configHook.scheduleType,
    minioMode: configHook.minioMode,
    selectedMinioId: configHook.selectedMinioId,
    restoreToDifferentNamespace: configHook.restoreToDifferentNamespace,
    pollingRestoreId: operationsHook.pollingRestoreId,

    // Actions
    loadBackups: dataHook.loadBackups,
    loadRestores: dataHook.loadRestores,
    loadActualBackups: dataHook.loadActualBackups,
    loadBackupStatus: dataHook.loadBackupStatus,
    loadAllMinioStorages: dataHook.loadAllMinioStorages,
    fetchNamespaces: dataHook.fetchNamespaces,
    handleInfraChange,
    handleCreateBackup,
    handleDelete,
    handleConfirmDelete,
    handleRestore,
    handleConfirmRestore,
    startInstallation: operationsHook.startInstallation,

    // Modal control
    setSetupModalVisible: modalsHook.setIsSetupModalVisible,
    setBackupModalVisible: modalsHook.setIsBackupModalVisible,
    setDeleteModalVisible: modalsHook.setIsDeleteModalVisible,
    setRestoreModalVisible: modalsHook.setIsRestoreModalVisible,
    setNamespaceAuthModalVisible: modalsHook.setIsNamespaceAuthModalVisible,
    setSelectedBackup: modalsHook.setSelectedBackup,
    setCurrentStep: configHook.setCurrentStep,
    setScheduleType: configHook.setScheduleType,
    setMinioMode: configHook.setMinioMode,
    setSelectedMinioId: configHook.setSelectedMinioId,
    setRestoreToDifferentNamespace: configHook.setRestoreToDifferentNamespace,

    // Utilities
    convertScheduleToExpression: configHook.convertScheduleToExpression,
    resetAll,
  };
};
