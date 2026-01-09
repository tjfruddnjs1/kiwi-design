import React from 'react';
import { Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Restore } from '../../types';

interface RestoreListTableProps {
  restores: Restore[];
}

const RestoreListTable: React.FC<RestoreListTableProps> = ({ restores }) => {
  const columns = [
    {
      title: '복구 작업 이름',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div style={{ fontWeight: 500, color: '#262626' }}>{name}</div>
      ),
    },
    {
      title: '원본 백업',
      dataIndex: 'backup_name',
      key: 'backup_name',
      render: (backupName: string) => (
        <div style={{ fontSize: '12px', color: '#666' }}>
          <Tag
            color='default'
            style={{
              borderRadius: '4px',
              fontWeight: 400,
              border: '1px solid #d9d9d9',
            }}
          >
            {backupName}
          </Tag>
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          InProgress: {
            color: 'processing',
            icon: <LoadingOutlined />,
            text: '진행 중',
            bgColor: '#fafafa',
            borderColor: '#d9d9d9',
            textColor: '#595959',
          },
          Completed: {
            color: 'success',
            icon: <CheckCircleOutlined />,
            text: '완료됨',
            bgColor: '#f6ffed',
            borderColor: '#b7eb8f',
            textColor: '#52c41a',
          },
          Failed: {
            color: 'error',
            icon: <CloseCircleOutlined />,
            text: '실패',
            bgColor: '#fff2f0',
            borderColor: '#ffccc7',
            textColor: '#ff4d4f',
          },
          PartiallyFailed: {
            color: 'warning',
            icon: <CloseCircleOutlined />,
            text: '부분 실패',
            bgColor: '#fffbe6',
            borderColor: '#ffe58f',
            textColor: '#faad14',
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
      title: '시작 시간',
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
  ];

  return <Table columns={columns} dataSource={restores} rowKey='id' />;
};

export default RestoreListTable;
