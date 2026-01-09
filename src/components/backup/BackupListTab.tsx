import React from 'react';
import { Table, Space, Button, Tag, Modal } from 'antd';
import {
  DeleteOutlined,
  CloudDownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Backup } from '../../types/backup';
import { logger } from '../../utils/logger';

interface BackupListTabProps {
  backups: Backup[];
  isCreatingBackup: boolean;
  selectedInfraId: string | undefined;
  onCreateBackup: () => void;
  onDeleteBackup: (backup: Backup) => void;
  onRestoreBackup: (backup: Backup) => void;
}

const BackupListTab: React.FC<BackupListTabProps> = ({
  backups,
  isCreatingBackup,
  selectedInfraId,
  onCreateBackup,
  onDeleteBackup,
  onRestoreBackup,
}) => {
  const getStatusTag = (status: string) => {
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
      case 'creating':
        return (
          <Tag icon={<LoadingOutlined />} color='processing'>
            생성 중
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
      title: '백업 이름',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '네임스페이스',
      dataIndex: 'namespace',
      key: 'namespace',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '생성 일시',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '완료 일시',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      render: (size: string) => size || '-',
    },
    {
      title: '작업',
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      render: (_: unknown, record: Backup) => (
        <Space>
          <Button
            type='link'
            icon={<CloudDownloadOutlined />}
            onClick={() => onRestoreBackup(record)}
            disabled={record.status !== 'completed'}
            title='복구'
          />
          <Button
            type='link'
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteBackup(record)}
            title='삭제'
          />
        </Space>
      ),
    },
  ];

  const handleCreateBackup = () => {
    if (!selectedInfraId) {
      Modal.warning({
        title: '인프라 선택 필요',
        content: '백업을 생성하기 전에 인프라를 선택해주세요.',
      });

      return;
    }

    logger.info('백업 생성 버튼 클릭');
    onCreateBackup();
  };

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
          <Button
            type='primary'
            onClick={handleCreateBackup}
            loading={isCreatingBackup}
            disabled={!selectedInfraId || isCreatingBackup}
            icon={<CloudDownloadOutlined />}
          >
            백업 생성
          </Button>
        </div>
        <div>
          <Tag color='blue'>{backups.length}개의 백업</Tag>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={backups}
        rowKey='id'
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
    </div>
  );
};

export default BackupListTab;
