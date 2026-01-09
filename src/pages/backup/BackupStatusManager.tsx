import React, { useCallback, useMemo } from 'react';
import { Backup, Restore } from '../../types/backup';

interface BackupStatusManagerProps {
  selectedInfraId?: string;
  backups: Backup[];
  restores: Restore[];
  // 아래 props는 interface 호환성을 위해 유지하지만 사용하지 않음
  installStatus?: unknown;
  onBackupsUpdate?: (backups: Backup[]) => void;
  onRestoresUpdate?: (restores: Restore[]) => void;
  onInstallStatusUpdate?: (status: unknown) => void;
  loadBackups?: (infraId: number) => Promise<void>;
  loadRestores?: (infraId: number) => Promise<void>;
  loadBackupStatus?: (infraId: number) => Promise<void>;
}

/**
 * 백업 상태 관리 훅 - 폴링 제거 버전
 * 모든 자동 폴링을 제거하고 수동 새로고침만 지원합니다.
 */
export const useBackupStatusManager = ({
  backups,
  restores,
}: BackupStatusManagerProps) => {
  // Get backup status color and text
  const getBackupStatusDisplay = useCallback((status: string) => {
    switch (status) {
      case 'InProgress':
      case 'Running':
        return { color: 'processing', text: '진행중' };
      case 'Completed':
        return { color: 'success', text: '완료' };
      case 'Failed':
        return { color: 'error', text: '실패' };
      case 'PartiallyFailed':
        return { color: 'warning', text: '부분 실패' };
      case 'New':
        return { color: 'default', text: '대기' };
      default:
        return { color: 'default', text: status };
    }
  }, []);

  // Get restore status display
  const getRestoreStatusDisplay = useCallback((status: string) => {
    switch (status) {
      case 'InProgress':
      case 'Running':
        return { color: 'processing', text: '복구중' };
      case 'Completed':
        return { color: 'success', text: '복구완료' };
      case 'Failed':
        return { color: 'error', text: '복구실패' };
      case 'PartiallyFailed':
        return { color: 'warning', text: '부분 복구' };
      case 'New':
        return { color: 'default', text: '대기' };
      default:
        return { color: 'default', text: status };
    }
  }, []);

  // Check if any operations are in progress (정보 제공용, 폴링 트리거 X)
  const hasOperationsInProgress = useMemo(() => {
    const inProgressBackup = backups.some(
      b => b.status === 'InProgress' || b.status === 'Running'
    );
    const inProgressRestore = restores.some(
      r => r.status === 'InProgress' || r.status === 'Running'
    );
    return inProgressBackup || inProgressRestore;
  }, [backups, restores]);

  // Get setup progress information (빈 구현 - 하위 호환성 유지)
  const getSetupProgress = useCallback(() => {
    return { description: '' };
  }, []);

  // 하위 호환성을 위한 빈 함수들
  const startJobPolling = useCallback((_jobId: number) => {
    // 폴링 제거됨 - no-op
  }, []);

  const startBackupCreatingPolling = useCallback(
    (_backupName: string, _infraId: number) => {
      // 폴링 제거됨 - no-op
    },
    []
  );

  const stopBackupCreatingPolling = useCallback(() => {
    // 폴링 제거됨 - no-op
  }, []);

  return {
    // 폴링 상태 - 항상 null/false (폴링 제거됨)
    pollingBackupId: null,
    pollingRestoreId: null,
    pollingJobId: null,
    jobStatus: null,
    isSetupPolling: false,

    // 백업 생성 상태 - 항상 기본값 (폴링 제거됨)
    isBackupCreating: false,
    creatingBackupName: null,
    backupProgress: null,

    // 상태 정보
    hasOperationsInProgress,

    // 함수들 (하위 호환성)
    startJobPolling,
    startBackupCreatingPolling,
    stopBackupCreatingPolling,

    // 헬퍼 함수
    getBackupStatusDisplay,
    getRestoreStatusDisplay,
    getSetupProgress,
  };
};

export default useBackupStatusManager;
