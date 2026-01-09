import React from 'react';
import { Card, Space, Button, Tag, Statistic, Tooltip, Row, Col } from 'antd';
import {
  DeleteOutlined,
  SyncOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

interface DockerServerCardProps {
  server: {
    id: number;
    name: string;
    status: 'active' | 'inactive' | 'uninstalled';
    lastChecked?: string;
    containerCount?: number;
    imageCount?: number;
  };
  onStatusCheck: (serverId: number) => void;
  onInstall: (serverId: number) => void;
  onUninstall: (serverId: number) => void;
  onGetInfo: (serverId: number) => void;
  loading?: boolean;
}

const DockerServerCard: React.FC<DockerServerCardProps> = ({
  server,
  onStatusCheck,
  onInstall,
  onUninstall,
  onGetInfo: _onGetInfo,
  loading,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'uninstalled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'inactive':
        return '비활성';
      case 'uninstalled':
        return '미설치';
      default:
        return '알 수 없음';
    }
  };

  return (
    <Card
      size='small'
      title={
        <Space>
          <span>{server.name}</span>
          <Tag color={getStatusColor(server.status)}>
            {getStatusText(server.status)}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title='상태 확인'>
            <Button
              icon={<SyncOutlined />}
              onClick={() => onStatusCheck(server.id)}
              loading={loading}
              size='small'
              aria-label={`${server.name} 도커 상태 확인`}
            />
          </Tooltip>
          {server.status === 'uninstalled' ? (
            <Tooltip title='도커 설치'>
              <Button
                type='primary'
                icon={<DownloadOutlined />}
                onClick={() => onInstall(server.id)}
                loading={loading}
                size='small'
                aria-label={`${server.name}에 도커 설치`}
              />
            </Tooltip>
          ) : (
            <Tooltip title='도커 제거'>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onUninstall(server.id)}
                loading={loading}
                size='small'
                aria-label={`${server.name}에서 도커 제거`}
              />
            </Tooltip>
          )}
        </Space>
      }
    >
      {server.status === 'active' && (
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title='컨테이너'
              value={server.containerCount || 0}
              suffix='개'
            />
          </Col>
          <Col span={12}>
            <Statistic
              title='이미지'
              value={server.imageCount || 0}
              suffix='개'
            />
          </Col>
        </Row>
      )}

      {server.lastChecked && (
        <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
          마지막 확인: {new Date(server.lastChecked).toLocaleString('ko-KR')}
        </div>
      )}
    </Card>
  );
};

export default DockerServerCard;
