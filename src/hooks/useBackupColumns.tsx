import { useMemo } from 'react';
import { Button, Space, Tag, Dropdown, MenuProps } from 'antd';
import {
  MoreOutlined,
  DeleteOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Backup } from '../types/backup';

interface UseBackupColumnsProps {
  onDelete: (record: Backup) => void;
  onRestore: (record: Backup) => void;
}

export const useBackupColumns = ({
  onDelete,
  onRestore,
}: UseBackupColumnsProps) => {
  return useMemo(
    () => [
      {
        title: '백업 이름',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <strong>{text}</strong>,
      },
      {
        title: '스케줄',
        dataIndex: 'schedule',
        key: 'schedule',
        render: (schedule: string) => <Tag color='blue'>{schedule}</Tag>,
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const statusConfig = {
            active: { color: 'green', text: '활성' },
            inactive: { color: 'red', text: '비활성' },
            running: { color: 'blue', text: '실행 중' },
            failed: { color: 'red', text: '실패' },
          };
          const config = statusConfig[status as keyof typeof statusConfig] || {
            color: 'default',
            text: status,
          };

          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: '생성일',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
      },
      {
        title: '작업',
        key: 'actions',
        width: 120,
        render: (_: unknown, record: Backup) => {
          const items: MenuProps['items'] = [
            {
              key: 'restore',
              label: '복구',
              icon: <RollbackOutlined />,
              onClick: () => onRestore(record),
            },
            {
              key: 'delete',
              label: '삭제',
              icon: <DeleteOutlined />,
              onClick: () => onDelete(record),
              danger: true,
            },
          ];

          return (
            <Space size='small'>
              <Dropdown menu={{ items }} trigger={['click']}>
                <Button
                  icon={<MoreOutlined />}
                  type='text'
                  size='small'
                  aria-label={`${record.name} 백업 작업`}
                />
              </Dropdown>
            </Space>
          );
        },
      },
    ],
    [onDelete, onRestore]
  );
};
