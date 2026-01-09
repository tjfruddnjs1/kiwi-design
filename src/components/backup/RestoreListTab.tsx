import React from 'react';
import { Table, Tag, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Restore } from '../../types/backup';

interface RestoreListTabProps {
  restores: Restore[];
  pollingRestoreId: number | null;
}

const RestoreListTab: React.FC<RestoreListTabProps> = ({
  restores,
  pollingRestoreId,
}) => {
  const getStatusTag = (status: string, restoreId: number) => {
    const isPolling = pollingRestoreId === restoreId;

    switch (status) {
      case 'completed':
        return (
          <Tag icon={<CheckCircleOutlined />} color='success'>
            완료
          </Tag>
        );
      case 'failed':
        return (
          <Tag icon={<CloseCircleOutlined />} color='error'>
            실패
          </Tag>
        );
      case 'in_progress':
        return (
          <Tag icon={<LoadingOutlined />} color='processing'>
            {isPolling ? '진행 중 (모니터링)' : '진행 중'}
          </Tag>
        );
      case 'pending':
        return (
          <Tag icon={<LoadingOutlined />} color='default'>
            대기 중
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '복구명',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '원본 백업',
      dataIndex: 'backup_name',
      key: 'backup_name',
      ellipsis: true,
    },
    {
      title: '대상 네임스페이스',
      dataIndex: 'namespace',
      key: 'namespace',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Restore) =>
        getStatusTag(status, record.id),
    },
    {
      title: '시작 일시',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '완료 일시',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '소요 시간',
      key: 'duration',
      render: (_: unknown, record: Restore) => {
        if (!record.created_at) return '-';

        const start = dayjs(record.created_at);
        const end = record.completed_at ? dayjs(record.completed_at) : dayjs();
        const duration = end.diff(start, 'second');

        if (duration < 60) {
          return `${duration}초`;
        } else if (duration < 3600) {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;

          return `${minutes}분 ${seconds}초`;
        } else {
          const hours = Math.floor(duration / 3600);
          const minutes = Math.floor((duration % 3600) / 60);

          return `${hours}시간 ${minutes}분`;
        }
      },
    },
    {
      title: '메시지',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => message || '-',
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Space>
            <RollbackOutlined />
            <span>복구 이력</span>
          </Space>
        </div>
        <div>
          <Tag color='green'>{restores.length}개의 복구 이력</Tag>
          {pollingRestoreId && (
            <Tag color='processing'>ID {pollingRestoreId} 모니터링 중</Tag>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={restores}
        rowKey='id'
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        expandable={{
          expandedRowRender: (record: Restore) => (
            <div style={{ margin: 0 }}>
              <p>
                <strong>복구 ID:</strong> {record.id}
              </p>
              {/* 백업 ID 필드는 타입에 없으므로 표시하지 않음 */}
              {/* 타입에 없는 필드 접근 제거 */}
            </div>
          ),
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default RestoreListTab;
