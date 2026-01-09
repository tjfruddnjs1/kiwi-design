import React from 'react';
import { Space, Tag } from 'antd';
import { BackupInstallStatus } from '../../types';

interface BackupStatusSectionProps {
  selectedInfraId: string | undefined;
  installStatus: BackupInstallStatus | null;
}

const BackupStatusSection: React.FC<BackupStatusSectionProps> = ({
  selectedInfraId,
  installStatus,
}) => {
  if (!selectedInfraId || !installStatus) {
    return null;
  }

  const getStorageStatus = () => {
    if (!installStatus.summary?.backup_ready) {
      return { color: 'default', text: '미연결' };
    }

    if (installStatus.minio.status === 'connected') {
      const minioInfo = installStatus.minio.connected_minio_info;

      if (minioInfo?.status === 'active') {
        return minioInfo.infra_id === Number(selectedInfraId)
          ? { color: 'success', text: '로컬 연결됨' }
          : { color: 'success', text: '외부 연결됨' };
      }

      return { color: 'processing', text: '연결 중' };
    }

    return installStatus.minio.local_installation
      ? { color: 'success', text: '로컬 설치됨' }
      : { color: 'success', text: '연결됨' };
  };

  const storageStatus = getStorageStatus();

  const veleroStatus = installStatus.velero.installed
    ? { color: 'success', text: '현재 인프라에 설치됨' }
    : { color: 'default', text: '현재 인프라에 미설치' };

  const backupReadyStatus = installStatus.summary?.can_create_backup
    ? { color: 'success', text: '가능' }
    : { color: 'error', text: '불가능' };

  return (
    <div>
      <Space>
        <span>저장소:</span>
        <Tag color={storageStatus.color}>{storageStatus.text}</Tag>

        <span>엔진:</span>
        <Tag color={veleroStatus.color}>{veleroStatus.text}</Tag>

        <span>백업 가능:</span>
        <Tag color={backupReadyStatus.color}>{backupReadyStatus.text}</Tag>
      </Space>
    </div>
  );
};

export default BackupStatusSection;
