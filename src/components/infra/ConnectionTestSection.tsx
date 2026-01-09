import React from 'react';
import { Button, Typography, Space } from 'antd';
import {
  ReloadOutlined,
  GlobalOutlined,
  PlusOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

interface ConnectionTestSectionProps {
  onRefresh: () => Promise<void>;
  onAddInfra: () => void;
  onImportInfra: () => void;
  loading?: boolean;
}

const ConnectionTestSection: React.FC<ConnectionTestSectionProps> = ({
  onRefresh,
  onAddInfra,
  onImportInfra,
  loading = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <Title level={3}>런타임 환경</Title>
      <Space>
        <Button
          type='primary'
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          새로고침
        </Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={onAddInfra}>
          환경 추가
        </Button>
        <Button icon={<GlobalOutlined />} onClick={onImportInfra}>
          외부 환경 가져오기
        </Button>
      </Space>
    </div>
  );
};

export default ConnectionTestSection;
