import React, { useMemo } from 'react';
import { Card, Table, Button, Space, Alert, Select, Tabs, Tag } from 'antd';
import {
  SafetyOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  SettingOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Backup, Restore, ActualBackup } from '../../types/backup';
import { InfraItem } from '../../types/infra';
import { useBackupColumns } from '../../hooks/useBackupColumns';
import './BackupList.css';

const { TabPane } = Tabs;
const { Option } = Select;

interface BackupListProps {
  // 데이터
  backups: Backup[];
  restores: Restore[];
  actualBackups: ActualBackup[];
  infrastructures: InfraItem[];
  selectedInfraId: string | undefined;

  // 로딩 상태
  isLoadingActualBackups: boolean;

  // 액션 함수들
  onInfraChange: (infraId: string) => void;
  onCreateBackup: () => void;
  onDelete: (record: Backup) => void;
  onRestore: (record: Backup) => void;
  onSetup: () => void;
}

const BackupList: React.FC<BackupListProps> = ({
  backups,
  restores,
  actualBackups,
  infrastructures,
  selectedInfraId,
  isLoadingActualBackups,
  onInfraChange,
  onCreateBackup,
  onDelete,
  onRestore,
  onSetup,
}) => {
  // 선택된 인프라 정보
  const selectedInfra = useMemo(
    () => infrastructures.find(infra => infra.id === Number(selectedInfraId)),
    [infrastructures, selectedInfraId]
  );

  // 백업 테이블 컬럼 정의
  const backupColumns = useBackupColumns({ onDelete, onRestore });

  // 복구 이력 테이블 컬럼 정의
  const restoreColumns = useMemo(
    () => [
      {
        title: '복구 이름',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <strong>{text}</strong>,
      },
      {
        title: '백업 이름',
        dataIndex: 'backup_name',
        key: 'backup_name',
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const statusConfig = {
            completed: { color: 'green', text: '완료' },
            in_progress: { color: 'blue', text: '진행 중' },
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
        title: '복구일',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
    ],
    []
  );

  // 실제 백업 테이블 컬럼 정의
  const actualBackupColumns = useMemo(
    () => [
      {
        title: '백업 이름',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <strong>{text}</strong>,
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const statusConfig = {
            completed: { color: 'green', text: '완료' },
            in_progress: { color: 'blue', text: '진행 중' },
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
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '만료일',
        dataIndex: 'expires',
        key: 'expires',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
    ],
    []
  );

  return (
    <div className='backup-list'>
      <Card
        title='백업 관리'
        extra={
          <Space>
            <Select
              value={selectedInfraId || null}
              onChange={onInfraChange}
              placeholder='인프라 선택'
              style={{ width: 200 }}
            >
              {infrastructures.map(infra => (
                <Option key={infra.id} value={infra.id.toString()}>
                  {infra.name}
                </Option>
              ))}
            </Select>
            <Button
              type='primary'
              icon={<CloudUploadOutlined />}
              onClick={onCreateBackup}
            >
              백업 생성
            </Button>
            <Button icon={<SettingOutlined />} onClick={onSetup}>
              설정
            </Button>
          </Space>
        }
      >
        {selectedInfra && (
          <Alert
            message={`선택된 인프라: ${selectedInfra.name}`}
            description={`역할: ${selectedInfra.user_role}`}
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Tabs defaultActiveKey='backups'>
          <TabPane
            tab={
              <span>
                <SafetyOutlined />
                백업 목록 ({backups.length})
              </span>
            }
            key='backups'
          >
            <Table
              columns={backupColumns}
              dataSource={backups}
              rowKey='id'
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} / ${total}개`,
              }}
              loading={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                복구 이력 ({restores.length})
              </span>
            }
            key='restores'
          >
            <Table
              columns={restoreColumns}
              dataSource={restores}
              rowKey='id'
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} / ${total}개`,
              }}
              loading={false}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <CloudDownloadOutlined />
                실제 백업 ({actualBackups.length})
              </span>
            }
            key='actualBackups'
          >
            <Table
              columns={actualBackupColumns}
              dataSource={actualBackups}
              rowKey='name'
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} / ${total}개`,
              }}
              loading={isLoadingActualBackups}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default BackupList;
