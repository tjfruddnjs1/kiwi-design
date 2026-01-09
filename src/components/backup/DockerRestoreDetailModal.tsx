// DockerRestoreDetailModal.tsx - Docker/Podman 복구 이력 상세 모달

import React from 'react';
import {
  Modal,
  Table,
  Tag,
  Typography,
  Space,
  Descriptions,
  Alert,
  Timeline,
  Empty,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  SettingOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { DockerBackup, DockerRestore } from '../../lib/api/docker';

const { Text, Title } = Typography;

interface DockerRestoreDetailModalProps {
  visible: boolean;
  backup: DockerBackup | null;
  restores: DockerRestore[];
  onClose: () => void;
}

const DockerRestoreDetailModal: React.FC<DockerRestoreDetailModalProps> = ({
  visible,
  backup,
  restores,
  onClose,
}) => {
  // 상태 색상 및 아이콘 매핑
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<
      string,
      { color: string; icon: React.ReactNode; text: string }
    > = {
      pending: {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '대기 중',
      },
      in_progress: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: '진행 중',
      },
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '완료',
      },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: '실패' },
    };
    return statusMap[status] || { color: 'default', icon: null, text: status };
  };

  // 복구 이력 테이블 컬럼
  const columns = [
    {
      title: '복구 ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <Text code>#{id}</Text>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const display = getStatusDisplay(status);
        return (
          <Tag color={display.color} icon={display.icon}>
            {display.text}
          </Tag>
        );
      },
    },
    {
      title: '복구 옵션',
      key: 'options',
      width: 140,
      render: (_: unknown, record: DockerRestore) => (
        <Space size={4}>
          {record.restore_volumes && (
            <Tooltip title='볼륨 복구'>
              <Tag icon={<FolderOutlined />} color='blue'>
                볼륨
              </Tag>
            </Tooltip>
          )}
          {record.restore_config && (
            <Tooltip title='설정 복구'>
              <Tag icon={<SettingOutlined />} color='orange'>
                설정
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '시작 시간',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('ko-KR'),
    },
    {
      title: '완료 시간',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 160,
      render: (date: string) =>
        date ? new Date(date).toLocaleString('ko-KR') : '-',
    },
    {
      title: '소요 시간',
      key: 'duration',
      width: 100,
      render: (_: unknown, record: DockerRestore) => {
        if (!record.completed_at) return '-';
        const start = new Date(record.created_at).getTime();
        const end = new Date(record.completed_at).getTime();
        const duration = Math.round((end - start) / 1000);
        // 음수 값이나 0 이하면 표시하지 않음 (시간대 문제 등)
        if (duration <= 0) return '-';
        if (duration < 60) return `${duration}초`;
        if (duration < 3600)
          return `${Math.floor(duration / 60)}분 ${duration % 60}초`;
        return `${Math.floor(duration / 3600)}시간 ${Math.floor((duration % 3600) / 60)}분`;
      },
    },
  ];

  // 에러 메시지가 있는 복구 건들
  const failedRestores = restores.filter(
    r => r.status === 'failed' && r.error_message
  );

  // 통계 계산
  const stats = {
    total: restores.length,
    completed: restores.filter(r => r.status === 'completed').length,
    failed: restores.filter(r => r.status === 'failed').length,
    inProgress: restores.filter(
      r => r.status === 'in_progress' || r.status === 'pending'
    ).length,
  };

  if (!backup) return null;

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          Docker 복구 이력
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {/* 백업 정보 */}
      <Descriptions bordered size='small' style={{ marginBottom: 16 }}>
        <Descriptions.Item label='백업 이름' span={2}>
          <Text strong>{backup.name}</Text>
        </Descriptions.Item>
        <Descriptions.Item label='백업 유형'>
          <Tag color='blue'>{backup.backup_type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label='Compose 프로젝트' span={2}>
          {backup.compose_project || '전체 인프라'}
        </Descriptions.Item>
        <Descriptions.Item label='백업 생성일'>
          {new Date(backup.created_at).toLocaleString('ko-KR')}
        </Descriptions.Item>
      </Descriptions>

      {/* 통계 */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginBottom: 16,
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: 8,
        }}
      >
        <div>
          <Text type='secondary'>총 복구</Text>
          <Title level={4} style={{ margin: 0 }}>
            {stats.total}회
          </Title>
        </div>
        <div>
          <Text type='secondary'>성공</Text>
          <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
            {stats.completed}
          </Title>
        </div>
        <div>
          <Text type='secondary'>실패</Text>
          <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
            {stats.failed}
          </Title>
        </div>
        {stats.inProgress > 0 && (
          <div>
            <Text type='secondary'>진행 중</Text>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              {stats.inProgress}
            </Title>
          </div>
        )}
      </div>

      {/* 실패한 복구 에러 메시지 */}
      {failedRestores.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            실패한 복구 상세:
          </Text>
          {failedRestores.map(restore => (
            <Alert
              key={restore.id}
              type='error'
              message={`복구 #${restore.id} 실패`}
              description={restore.error_message}
              style={{ marginBottom: 8 }}
              showIcon
            />
          ))}
        </div>
      )}

      {/* 복구 이력 테이블 */}
      {restores.length > 0 ? (
        <Table
          columns={columns}
          dataSource={restores}
          rowKey='id'
          pagination={
            restores.length > 10 ? { pageSize: 10, size: 'small' } : false
          }
          size='small'
          bordered
        />
      ) : (
        <Empty
          description='복구 이력이 없습니다'
          style={{ padding: '40px 0' }}
        />
      )}

      {/* 최근 복구 타임라인 (5개까지) */}
      {restores.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            최근 복구 타임라인:
          </Text>
          <Timeline
            items={restores.slice(0, 5).map(restore => {
              const display = getStatusDisplay(restore.status);
              return {
                color:
                  display.color === 'success'
                    ? 'green'
                    : display.color === 'error'
                      ? 'red'
                      : display.color === 'processing'
                        ? 'blue'
                        : 'gray',
                children: (
                  <div>
                    <Text strong>복구 #{restore.id}</Text>
                    <Text type='secondary' style={{ marginLeft: 8 }}>
                      {new Date(restore.created_at).toLocaleString('ko-KR')}
                    </Text>
                    <div>
                      <Tag color={display.color} style={{ fontSize: 11 }}>
                        {display.text}
                      </Tag>
                      {restore.restore_volumes && (
                        <Tag style={{ fontSize: 11 }}>볼륨</Tag>
                      )}
                      {restore.restore_config && (
                        <Tag style={{ fontSize: 11 }}>설정</Tag>
                      )}
                      {restore.target_compose_project && (
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          → {restore.target_compose_project}
                        </Text>
                      )}
                    </div>
                    {restore.status === 'failed' && restore.error_message && (
                      <Text type='danger' style={{ fontSize: 12 }}>
                        {restore.error_message}
                      </Text>
                    )}
                  </div>
                ),
              };
            })}
          />
        </div>
      )}
    </Modal>
  );
};

export default DockerRestoreDetailModal;
