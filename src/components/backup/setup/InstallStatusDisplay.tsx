import React from 'react';
import { Alert, Progress, List, Tag } from 'antd';
import {
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { BackupInstallStatus } from '../../../types/backup';

interface InstallStatusDisplayProps {
  installStatus: BackupInstallStatus | null;
}

const InstallStatusDisplay: React.FC<InstallStatusDisplayProps> = ({
  installStatus,
}) => {
  if (!installStatus) return null;

  const hasMinioError = installStatus.minio.error;
  const hasVeleroError = installStatus.velero.error;
  const isMinioInstalling = installStatus.minio.status === 'installing';
  const isVeleroInstalling = installStatus.velero.status === 'installing';
  const isInstalling = isMinioInstalling || isVeleroInstalling;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'installing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'failed':
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return 'success';
      case 'installing':
        return 'processing';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {(hasMinioError || hasVeleroError) && (
        <Alert
          message='설치 중 오류가 발생했습니다'
          description={hasMinioError || hasVeleroError}
          type='error'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isInstalling && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>백업 시스템 설치 진행중...</strong>
          </div>
          <Progress
            percent={
              isMinioInstalling && isVeleroInstalling
                ? 50
                : isMinioInstalling
                  ? 25
                  : 75
            }
            status='active'
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
      )}

      <List
        size='small'
        header={<div>설치 상태</div>}
        bordered
        dataSource={[
          {
            name: 'MinIO 저장소',
            status: installStatus.minio.status,
            message: installStatus.minio.error,
          },
          {
            name: 'Velero 백업 엔진',
            status: installStatus.velero.status,
            message: installStatus.velero.error,
          },
        ]}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              avatar={getStatusIcon(item.status)}
              title={
                <span style={{ fontSize: '14px' }}>
                  {item.name}
                  <Tag
                    color={getStatusColor(item.status)}
                    style={{ marginLeft: 8 }}
                  >
                    {item.status}
                  </Tag>
                </span>
              }
              description={
                item.message && (
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {item.message}
                  </span>
                )
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default InstallStatusDisplay;
