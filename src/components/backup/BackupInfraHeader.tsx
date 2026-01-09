import React from 'react';
import { Button, Select, Space } from 'antd';
import { SettingOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { InfraItem, BackupInstallStatus } from '../../types';

const { Option } = Select;

interface BackupInfraHeaderProps {
  infrastructures: InfraItem[];
  selectedInfraId: string | undefined;
  installStatus: BackupInstallStatus | null;
  isAdmin: boolean;
  onInfraChange: (infraId: string) => void;
  onSetupClick: () => void;
  onBackupClick: () => void;
}

const BackupInfraHeader: React.FC<BackupInfraHeaderProps> = ({
  infrastructures,
  selectedInfraId,
  installStatus,
  isAdmin,
  onInfraChange,
  onSetupClick,
  onBackupClick,
}) => {
  return (
    <Space>
      <Select
        placeholder='인프라 선택'
        style={{ width: 200 }}
        onChange={onInfraChange}
        value={selectedInfraId || null}
      >
        {infrastructures
          .filter(
            infra =>
              infra.type === 'kubernetes' ||
              infra.type === 'external_kubernetes'
          )
          .map(infra => (
            <Option key={infra.id} value={infra.id}>
              {infra.name}
            </Option>
          ))}
      </Select>

      {installStatus?.summary?.can_create_backup ? (
        <Button
          type='primary'
          onClick={onBackupClick}
          disabled={!selectedInfraId || !isAdmin}
        >
          <CloudUploadOutlined /> 새 백업 생성
        </Button>
      ) : (
        <Button
          type='primary'
          onClick={onSetupClick}
          disabled={!selectedInfraId || !isAdmin}
        >
          <SettingOutlined /> 백업 환경 구축
        </Button>
      )}
    </Space>
  );
};

export default BackupInfraHeader;
