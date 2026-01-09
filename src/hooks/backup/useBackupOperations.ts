import { useState, useCallback } from 'react';
import { message } from 'antd';
import { api } from '../../services/api';
import { BackupFormValues, RestoreFormValues } from '../../types';

export interface UseBackupOperationsReturn {
  // Loading states
  isCreatingBackup: boolean;
  isDeleting: boolean;
  isRestoring: boolean;
  pollingRestoreId: number | null;

  // Operations
  handleCreateBackup: (values: BackupFormValues) => Promise<void>;
  handleDeleteBackup: (backupId: number) => Promise<void>;
  handleRestoreBackup: (values: RestoreFormValues) => Promise<void>;
  startInstallation: () => Promise<void>;

  // Setters
  setPollingRestoreId: (id: number | null) => void;

  // Reset
  resetOperationsState: () => void;
}

export const useBackupOperations = (): UseBackupOperationsReturn => {
  // Loading states
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pollingRestoreId, setPollingRestoreId] = useState<number | null>(null);

  // Create backup
  const handleCreateBackup = useCallback(async (values: BackupFormValues) => {
    try {
      setIsCreatingBackup(true);

      const backupData = {
        infra_id: values.infraId || 0,
        name: values.name,
        namespace: values.namespace || '',
        schedule: values.schedule,
        retention:
          typeof values.retention === 'number'
            ? `${values.retention}d`
            : values.retention,
        server_username: values.serverUsername || '',
        server_password: values.serverPassword || '',
      } as const;

      await api.backup.createBackup(backupData as any);
      message.success('백업이 성공적으로 생성되었습니다.');
    } catch (error) {
      message.error('백업 생성에 실패했습니다.');
      throw error;
    } finally {
      setIsCreatingBackup(false);
    }
  }, []);

  // Delete backup
  const handleDeleteBackup = useCallback(async (_backupId: number) => {
    try {
      setIsDeleting(true);
      // 호출 시점에 필요한 값은 외부에서 주입되도록 변경 (infraId, hops는 상위에서 넘김)
      throw new Error(
        'handleDeleteBackup은 상위 레이어에서 infraId와 hops를 주입하는 형태로 호출해야 합니다.'
      );
      // message.success('백업이 성공적으로 삭제되었습니다.'); // Unreachable code removed
    } catch (error) {
      message.error('백업 삭제에 실패했습니다.');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Restore backup
  const handleRestoreBackup = useCallback(
    async (values: RestoreFormValues, infraId?: number) => {
      try {
        setIsRestoring(true);

        const restoreData = {
          infra_id: infraId || 0,
          backup_name: values.backupName,
          namespace_mappings: values.restoreToNamespace
            ? { [values.namespace]: values.restoreToNamespace }
            : undefined,
          auth_data: [],
        };

        const response = await api.backup.createRestore(restoreData as any);

        if (response.data?.data && (response.data.data as any).restore_id) {
          setPollingRestoreId((response.data.data as any).restore_id);
          message.success('복원이 시작되었습니다. 진행 상황을 모니터링합니다.');
        } else {
          message.success('복원이 성공적으로 완료되었습니다.');
        }
      } catch (error) {
        message.error('복원에 실패했습니다.');
        throw error;
      } finally {
        setIsRestoring(false);
      }
    },
    []
  );

  // Start installation
  const startInstallation = useCallback(async () => {
    try {
      message.info('설치가 시작되었습니다.');
      // Implementation would depend on the specific installation process
      // This is a placeholder for the actual installation logic
    } catch (error) {
      message.error('설치에 실패했습니다.');
      throw error;
    }
  }, []);

  // Reset operations state
  const resetOperationsState = useCallback(() => {
    setIsCreatingBackup(false);
    setIsDeleting(false);
    setIsRestoring(false);
    setPollingRestoreId(null);
  }, []);

  return {
    // Loading states
    isCreatingBackup,
    isDeleting,
    isRestoring,
    pollingRestoreId,

    // Operations
    handleCreateBackup,
    handleDeleteBackup,
    handleRestoreBackup,
    startInstallation,

    // Setters
    setPollingRestoreId,

    // Reset
    resetOperationsState,
  };
};
