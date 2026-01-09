import { useState } from 'react';
import { message } from 'antd';
import { Backup } from '../types/backup';
import { backupApi } from '../lib/api';
import { logger } from '../utils/logger';

export const useBackupOperations = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBackup = async (
    backup: Backup,
    username: string,
    password: string
  ) => {
    try {
      setIsDeleting(true);

      const response = await backupApi.deleteBackup(
        backup.infra_id,
        backup.name,
        username,
        password
      );

      if (response.data?.success) {
        message.success('백업이 삭제되었습니다.');

        return true;
      } else {
        throw new Error(response.data?.message || '삭제 실패');
      }
    } catch (error) {
      logger.error('백업 삭제 실패', undefined, {
        backupName: backup.name,
        infraId: backup.infra_id,
        error: error instanceof Error ? error.message : String(error),
      });

      message.error('백업 삭제에 실패했습니다.');

      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    handleDeleteBackup,
  };
};
