import React from 'react';
import { Button, Card, Empty, Tag } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  DesktopOutlined,
  ContainerOutlined,
  CloudOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { InfraStatus, InfraWithNodes } from '../../types/infra';

interface ServerListSectionProps {
  infraData: InfraWithNodes[];
  selectedInfraId: number | null;
  onInfraSelect: (id: number) => void;
  onShowSettings: (infra: InfraWithNodes) => void;
  onAddInfra: () => void;
}

const ServerListSection: React.FC<ServerListSectionProps> = ({
  infraData,
  selectedInfraId,
  onInfraSelect,
  onAddInfra,
}) => {
  // 인프라 타입 아이콘
  const getInfraTypeIcon = (type: string): React.ReactNode => {
    const iconMap: { [key: string]: React.ReactNode } = {
      kubernetes: <ClusterOutlined style={{ color: '#1890ff' }} />,
      baremetal: <DesktopOutlined style={{ color: '#52c41a' }} />,
      docker: <ContainerOutlined style={{ color: '#722ed1' }} />,
      cloud: <CloudOutlined style={{ color: '#fa8c16' }} />,
    };

    return iconMap[type] || <CloudServerOutlined />;
  };

  // 상태에 따른 태그 색상
  type ServerStatus = 'active' | 'inactive' | 'uninstalled' | 'unknown';
  const getStatusColor = (status: ServerStatus) => {
    const colorMap: Record<ServerStatus, string> = {
      active: 'green',
      inactive: 'orange',
      uninstalled: 'red',
      unknown: 'gray',
    };
    return colorMap[status] || 'default';
  };

  const getStatusText = (status: InfraStatus) => {
    const textMap: Record<InfraStatus, string> = {
      active: '활성',
      inactive: '비활성',
      uninstalled: '미설치',
      unknown: '알 수 없음',
    };
    return textMap[status] || '알 수 없음';
  };

  const cardTitle = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>목록</span>
      <Button type='primary' icon={<PlusOutlined />} onClick={onAddInfra}>
        환경 추가
      </Button>
    </div>
  );

  return (
    <Card title={cardTitle} size='small'>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {infraData.length === 0 ? (
          <Empty description='등록된 런타임 환경이 없습니다.' />
        ) : (
          infraData.map(infra => (
            <Card
              key={infra.id}
              size='small'
              style={{
                marginBottom: '8px',
                cursor: 'pointer',
                border:
                  selectedInfraId === infra.id
                    ? '2px solid #1890ff'
                    : '1px solid #d9d9d9',
              }}
              onClick={() => onInfraSelect(infra.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onInfraSelect(infra.id);
                }
              }}
              role='button'
              tabIndex={0}
            >
              <div style={{ padding: '4px 0' }}>
                {/* 헤더: 아이콘, 이름, 상태 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {getInfraTypeIcon(infra.type)}
                    <div style={{ marginLeft: '8px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                        {infra.name}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      {infra.type}
                    </span>
                    <Tag color={getStatusColor(infra.status)}>
                      {getStatusText(infra.status)}
                    </Tag>
                  </div>
                </div>

                {/* 간단한 정보 */}
                <div style={{ fontSize: '11px', color: '#666' }}>
                  {infra.info && `${infra.info} •`} Admin •{' '}
                  {infra.created_at &&
                    new Date(infra.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Card>
  );
};

export default ServerListSection;
