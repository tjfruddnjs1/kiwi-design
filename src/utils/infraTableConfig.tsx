import { Button, Space, Tag, Tooltip, Modal } from 'antd';
import {
  SettingOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { InfraItem } from '../types/infra';
import { getInfraTypeDisplayName } from './hopUtils';
import { NavigateFunction } from 'react-router-dom';
import { ColumnsType } from 'antd/es/table';

interface TableConfigProps {
  onShowSettings: (infra: InfraItem) => void;
  onShowPermissions: (infra: InfraItem) => void;
  onDeleteInfra: (infraId: number) => void | Promise<void>;
  navigate: NavigateFunction;
}

export const createInfraTableColumns = ({
  onShowSettings,
  onShowPermissions,
  onDeleteInfra,
}: TableConfigProps): ColumnsType<InfraItem> => [
  {
    title: '인프라 이름',
    dataIndex: 'name',
    key: 'name',
    render: (name: string, record: InfraItem) => (
      <Space>
        {record.type?.includes('external') ? (
          <GlobalOutlined style={{ color: '#1890ff' }} />
        ) : (
          <DatabaseOutlined style={{ color: '#52c41a' }} />
        )}
        <span style={{ fontWeight: 'bold' }}>{name}</span>
      </Space>
    ),
  },
  {
    title: '유형',
    dataIndex: 'type',
    key: 'type',
    render: (type: string) => (
      <Tag color={type?.includes('kubernetes') ? 'blue' : 'green'}>
        {getInfraTypeDisplayName(type)}
      </Tag>
    ),
  },
  {
    title: '정보',
    dataIndex: 'info',
    key: 'info',
    render: (info: string) => (
      <Tooltip title={info} placement='topLeft'>
        <div
          style={{
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {info}
        </div>
      </Tooltip>
    ),
  },
  {
    title: '역할',
    dataIndex: 'user_role', // API 응답 필드명인 'user_role'로 설정
    key: 'user_role',
    align: 'center',
    render: (role: string) => {
      if (!role) return <Tag>Unknown</Tag>;
      const roleText = role.charAt(0).toUpperCase() + role.slice(1);
      const color = role === 'admin' ? 'volcano' : 'green';
      return <Tag color={color}>{roleText}</Tag>;
    },
  },
  {
    title: '생성일',
    dataIndex: 'created_at', // 3. API 응답 필드명인 'created_at'으로 수정
    key: 'created_at', // key도 일관성 있게 수정
    align: 'center',
    render: (date: string) => {
      if (!date) return '-';
      // 날짜 형식을 'YYYY. MM. DD.'로 통일하여 가독성 향상
      return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    },
  },
  {
    title: '작업',
    key: 'actions',
    render: (_: unknown, record: InfraItem) => (
      <Space size='small'>
        <Tooltip title='인프라 설정'>
          <Button
            type='text'
            icon={<SettingOutlined />}
            onClick={() => onShowSettings(record)}
          />
        </Tooltip>

        <Tooltip title='권한 관리'>
          <Button
            type='text'
            icon={<UsergroupAddOutlined />}
            onClick={() => onShowPermissions(record)}
          />
        </Tooltip>
        <Tooltip title='인프라 삭제'>
          <Button
            type='text'
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '인프라 삭제',
                content: `"${record.name}" 인프라를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                okText: '삭제',
                okType: 'danger',
                cancelText: '취소',
                onOk: () => onDeleteInfra(record.id),
              });
            }}
          />
        </Tooltip>
      </Space>
    ),
  },
];
