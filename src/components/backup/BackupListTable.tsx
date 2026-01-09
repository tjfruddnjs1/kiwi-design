import React from 'react';
import { Button, Space, Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Backup } from '../../types';

interface BackupListTableProps {
  backups: Backup[];
  isAdmin: boolean;
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
}

const BackupListTable: React.FC<BackupListTableProps> = ({
  backups,
  isAdmin,
  onRestore,
  onDelete,
}) => {
  const columns = [
    {
      title: '백업 이름',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div style={{ fontWeight: 500, color: '#262626' }}>{name}</div>
      ),
    },
    {
      title: '네임스페이스',
      dataIndex: 'namespace',
      key: 'namespace',
      render: (namespace: string) => (
        <Tag
          color='default'
          style={{
            borderRadius: '4px',
            fontWeight: 400,
            border: '1px solid #d9d9d9',
          }}
        >
          {namespace}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          creating: {
            color: 'processing',
            icon: <LoadingOutlined />,
            text: '생성 중',
            bgColor: '#fafafa',
            borderColor: '#d9d9d9',
            textColor: '#595959',
          },
          completed: {
            color: 'success',
            icon: <CheckCircleOutlined />,
            text: '완료됨',
            bgColor: '#f6ffed',
            borderColor: '#b7eb8f',
            textColor: '#52c41a',
          },
          failed: {
            color: 'error',
            icon: <CloseCircleOutlined />,
            text: '실패',
            bgColor: '#fff2f0',
            borderColor: '#ffccc7',
            textColor: '#ff4d4f',
          },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || {
          color: 'default',
          icon: <MinusCircleOutlined />,
          text: status,
          bgColor: '#f5f5f5',
          borderColor: '#d9d9d9',
          textColor: '#8c8c8c',
        };

        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: config.bgColor,
              border: `1px solid ${config.borderColor}`,
              fontSize: '12px',
              fontWeight: 400,
              color: config.textColor,
            }}
          >
            {config.icon}
            {config.text}
          </div>
        );
      },
    },
    {
      title: '생성 시간',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div style={{ fontSize: '12px', color: '#666' }}>
          {dayjs(date).format('YYYY-MM-DD')}
          <br />
          <span style={{ color: '#999' }}>
            {dayjs(date).format('HH:mm:ss')}
          </span>
        </div>
      ),
    },
    {
      title: '완료 시간',
      dataIndex: 'completed_at',
      key: 'completed_at',
      render: (date: string | null) => (
        <div style={{ fontSize: '12px', color: '#666' }}>
          {date ? (
            <>
              {dayjs(date).format('YYYY-MM-DD')}
              <br />
              <span style={{ color: '#999' }}>
                {dayjs(date).format('HH:mm:ss')}
              </span>
            </>
          ) : (
            <span style={{ color: '#ccc', fontStyle: 'italic' }}>-</span>
          )}
        </div>
      ),
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      render: (size: string | null) => (
        <div style={{ fontSize: '12px', color: '#666' }}>
          {size ? (
            <Tag
              color='default'
              style={{
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid #d9d9d9',
              }}
            >
              {size}
            </Tag>
          ) : (
            <span style={{ color: '#ccc', fontStyle: 'italic' }}>-</span>
          )}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Backup) => (
        <Space size='middle'>
          <Button
            type='default'
            size='middle'
            icon={<CloudDownloadOutlined />}
            onClick={() => onRestore(record)}
            disabled={record.status !== 'completed' || !isAdmin}
            style={{
              borderRadius: '4px',
              fontSize: '14px',
              height: '24px',
              padding: '0 8px',
              border: '1px solid #d9d9d9',
              color: '#595959',
              ...(record.status !== 'completed' && {
                opacity: 0.5,
                cursor: 'not-allowed',
              }),
            }}
          >
            복구
          </Button>
          <Button
            type='text'
            size='middle'
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}
            disabled={!isAdmin}
            style={{
              borderRadius: '4px',
              fontSize: '14px',
              height: '24px',
              padding: '0 8px',
              color: '#8c8c8c',
            }}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return <Table columns={columns} dataSource={backups} rowKey='id' />;
};

export default BackupListTable;
