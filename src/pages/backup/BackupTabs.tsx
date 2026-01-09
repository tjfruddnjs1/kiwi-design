import React from 'react';
import {
  Tabs,
  Table,
  Tag,
  Space,
  Typography,
  Descriptions,
  Spin,
  Button,
  Badge,
  Divider,
  Empty,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  HistoryOutlined,
  RollbackOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  LinkOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ColumnsType } from 'antd/es/table';
import {
  Backup,
  Restore,
  BackupInstallStatus,
  ExternalBackupStorage,
  InfraBackupStorageMapping,
} from '../../types/backup';
import { InfraItem } from '../../types/infra';
import { InstallStatusDisplay } from '../../components/backup';
import { DockerBackup, DockerRestore } from '../../lib/api/docker';
import BackupHierarchyView from './BackupHierarchyView';

const { TabPane } = Tabs;
const { Text } = Typography;

interface BackupTabsProps {
  selectedInfraId?: string;
  selectedInfra?: InfraItem;
  backups: Backup[];
  restores: Restore[];
  installStatus: BackupInstallStatus | null;
  isLoadingStatus: boolean;
  pollingRestoreId?: number | null;
  getBackupStatusDisplay: (status: string) => { color: string; text: string };
  getRestoreStatusDisplay: (status: string) => { color: string; text: string };
  onDeleteBackup: (backup: Backup) => void;
  onRestoreBackup: (backup: Backup) => void;
  onRefreshStatus: (infraId: number) => void;
  infrastructures: InfraItem[];
  // Docker 백업 관련 props
  dockerBackups?: DockerBackup[];
  dockerRestores?: DockerRestore[];
  onDeleteDockerBackup?: (backup: DockerBackup) => void;
  onRestoreDockerBackup?: (backup: DockerBackup) => void;
  onShowDockerRestoreDetail?: (
    backup: DockerBackup,
    restores: DockerRestore[]
  ) => void;
  // 외부 저장소 관련 props
  externalStorages?: ExternalBackupStorage[];
  selectedInfraStorageMappings?: InfraBackupStorageMapping[];
  onOpenExternalStorageModal?: () => void;
  onDeleteExternalStorage?: (storageId: number) => void;
  onOpenInfraLinkModal?: (storage: ExternalBackupStorage) => void;
  onRefreshExternalStorages?: () => void;
}

export const BackupTabs: React.FC<BackupTabsProps> = ({
  selectedInfraId,
  selectedInfra,
  backups,
  restores,
  installStatus,
  isLoadingStatus,
  pollingRestoreId,
  getBackupStatusDisplay,
  getRestoreStatusDisplay,
  onDeleteBackup,
  onRestoreBackup,
  onRefreshStatus,
  infrastructures,
  dockerBackups = [],
  dockerRestores = [],
  onDeleteDockerBackup,
  onRestoreDockerBackup,
  onShowDockerRestoreDetail,
  externalStorages = [],
  selectedInfraStorageMappings = [],
  onOpenExternalStorageModal,
  onDeleteExternalStorage,
  onOpenInfraLinkModal,
  onRefreshExternalStorages,
}) => {
  // 인프라 타입 헬퍼
  const isKubernetesInfra =
    selectedInfra?.type === 'kubernetes' ||
    selectedInfra?.type === 'external_kubernetes';
  const isDockerInfra =
    selectedInfra?.type === 'docker' ||
    selectedInfra?.type === 'podman' ||
    selectedInfra?.type === 'external_docker' ||
    selectedInfra?.type === 'external_podman';

  // 상태 색상 헬퍼
  const getStatusColor = (status: string): string => {
    const statusInfo = getBackupStatusDisplay(status.toLowerCase());
    return statusInfo.color;
  };

  // 설치 상태 표시 헬퍼 (저장소 연결 관점)
  const getInstallStatusDisplay = (
    installStatusData: BackupInstallStatus | null | undefined
  ) => {
    if (!installStatusData) {
      return { color: 'default', text: '확인 불가' };
    }
    if (installStatusData.summary?.can_create_backup) {
      return { color: 'success', text: '연결됨' };
    }
    if (installStatusData.velero?.installed) {
      return { color: 'warning', text: '설정 필요' };
    }
    return { color: 'default', text: '미연결' };
  };

  // K8s 백업 데이터를 HierarchyView에 맞게 변환
  const allBackupsData = backups.map(backup => ({
    backup,
    infraName: selectedInfra?.name || '',
    infraType: selectedInfra?.type || '',
    restores: restores.filter(r => r.backup_name === backup.name),
    installStatus,
  }));

  // Define K8s restore table columns
  const restoreColumns: ColumnsType<Restore> = [
    {
      title: '백업명',
      dataIndex: 'backup_name',
      key: 'backup_name',
      width: 200,
      render: (name: string) => (
        <Text strong style={{ fontSize: '14px' }}>
          {name}
        </Text>
      ),
    },
    {
      title: '복구 대상',
      dataIndex: 'restore_namespaces',
      key: 'restore_namespaces',
      width: 150,
      render: (namespaces: string[]) => (
        <Space wrap size={4}>
          {namespaces?.map((ns: string) => (
            <Tag key={ns} color='green' style={{ fontSize: '12px' }}>
              {ns}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: Restore) => {
        const statusInfo = getRestoreStatusDisplay(status);
        const isPolling = pollingRestoreId === record.id;

        return (
          <Tag color={statusInfo.color}>
            {isPolling ? '업데이트 중...' : statusInfo.text}
          </Tag>
        );
      },
    },
    {
      title: '복구 시작시간',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '복구 완료시간',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 140,
      render: (date: string) => {
        return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-';
      },
    },
  ];

  // backup_id로 백업명 조회 헬퍼
  const getBackupNameById = (backupId: number): string => {
    const backup = dockerBackups.find(b => b.id === backupId);
    return backup?.name || `백업 #${backupId}`;
  };

  // Define Docker restore table columns
  const dockerRestoreColumns: ColumnsType<DockerRestore> = [
    {
      title: '백업명',
      dataIndex: 'backup_id',
      key: 'backup_name',
      width: 200,
      render: (backupId: number) => (
        <Text strong style={{ fontSize: '14px' }}>
          {getBackupNameById(backupId)}
        </Text>
      ),
    },
    {
      title: '복구 옵션',
      key: 'restore_options',
      width: 150,
      render: (_: unknown, record: DockerRestore) => (
        <Space wrap size={4}>
          {record.restore_volumes && <Tag color='blue'>볼륨</Tag>}
          {record.restore_config && <Tag color='cyan'>설정</Tag>}
          {record.redeploy && <Tag color='purple'>재배포</Tag>}
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          completed: { color: 'success', text: '완료' },
          failed: { color: 'error', text: '실패' },
          in_progress: { color: 'processing', text: '진행중' },
          pending: { color: 'warning', text: '대기중' },
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '오류 메시지',
      dataIndex: 'error_message',
      key: 'error_message',
      width: 200,
      render: (error: string) =>
        error ? (
          <Text type='danger' style={{ fontSize: '12px' }}>
            {error}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: '복구 시작시간',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '복구 완료시간',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 150,
      render: (date: string) => {
        return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-';
      },
    },
  ];

  // Render empty state
  const renderEmptyState = (type: 'backup' | 'restore') => (
    <div className='empty-status'>
      <div className='status-message'>
        <InfoCircleOutlined
          style={{
            fontSize: '24px',
            color: '#1890ff',
            marginBottom: '16px',
          }}
        />
        <h3>인프라를 선택해주세요</h3>
        <p>
          상단에서 인프라를 선택하면 해당 인프라의{' '}
          {type === 'backup' ? '백업' : '복구'} 목록을 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );

  // 백업 계층 구조 렌더링
  const renderBackupHierarchy = () => {
    if (!selectedInfraId) {
      return renderEmptyState('backup');
    }

    return (
      <BackupHierarchyView
        allBackups={allBackupsData}
        dockerBackups={dockerBackups}
        dockerRestores={dockerRestores}
        onRestore={onRestoreBackup}
        onDelete={onDeleteBackup}
        onRestoreDocker={onRestoreDockerBackup}
        onDeleteDocker={onDeleteDockerBackup}
        onShowDetail={() => {}}
        onShowDockerRestoreDetail={onShowDockerRestoreDetail}
        getStatusColor={getStatusColor}
        getInstallStatusDisplay={getInstallStatusDisplay}
        selectedInfraName={selectedInfra?.name}
        selectedInfraType={selectedInfra?.type}
      />
    );
  };

  return (
    <Tabs defaultActiveKey='1'>
      <TabPane
        tab={
          <span>
            <HistoryOutlined /> 백업 목록
          </span>
        }
        key='1'
      >
        {/* K8s 인프라일 때 상태 표시 (Docker와 동일한 형식) */}
        {selectedInfraId && isKubernetesInfra && (
          <div className='backup-header' style={{ marginBottom: '16px' }}>
            <Descriptions bordered size='small' column={4}>
              <Descriptions.Item label='인프라 타입'>
                <Tag color='blue'>K8s</Tag>
              </Descriptions.Item>
              <Descriptions.Item label='백업 현황'>
                <Space>
                  <Tooltip title='전체 백업'>
                    <Tag color='blue'>{backups.length}개</Tag>
                  </Tooltip>
                  <Tooltip title='완료'>
                    <Tag color='success' icon={<CheckCircleOutlined />}>
                      {
                        backups.filter(
                          b => b.status?.toLowerCase() === 'completed'
                        ).length
                      }
                    </Tag>
                  </Tooltip>
                  {backups.filter(b => b.status?.toLowerCase() === 'failed')
                    .length > 0 && (
                    <Tooltip title='실패'>
                      <Tag color='error' icon={<CloseCircleOutlined />}>
                        {
                          backups.filter(
                            b => b.status?.toLowerCase() === 'failed'
                          ).length
                        }
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label='복구 이력'>
                <Space>
                  <Tooltip title='전체 복구'>
                    <Tag color='cyan'>{restores.length}건</Tag>
                  </Tooltip>
                  {restores.filter(r => r.status?.toLowerCase() === 'completed')
                    .length > 0 && (
                    <Tooltip title='성공'>
                      <Tag color='success'>
                        {
                          restores.filter(
                            r => r.status?.toLowerCase() === 'completed'
                          ).length
                        }
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label='백업 가능 여부'>
                <Tag
                  color={
                    installStatus?.summary?.can_create_backup ||
                    installStatus?.summary?.has_external_storage ||
                    installStatus?.external_storage?.connected
                      ? 'success'
                      : 'warning'
                  }
                >
                  {installStatus?.summary?.can_create_backup ||
                  installStatus?.summary?.has_external_storage ||
                  installStatus?.external_storage?.connected
                    ? '가능'
                    : '설정 필요'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {/* Docker 인프라일 때 상태 표시 */}
        {selectedInfraId && isDockerInfra && (
          <div className='backup-header' style={{ marginBottom: '16px' }}>
            <Descriptions bordered size='small' column={4}>
              <Descriptions.Item label='인프라 타입'>
                <Tag color='blue'>
                  {selectedInfra?.type === 'podman' ||
                  selectedInfra?.type === 'external_podman'
                    ? 'Podman'
                    : 'Docker'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='백업 현황'>
                <Space>
                  <Tooltip title='전체 백업'>
                    <Tag color='blue'>{dockerBackups.length}개</Tag>
                  </Tooltip>
                  <Tooltip title='완료'>
                    <Tag color='success' icon={<CheckCircleOutlined />}>
                      {
                        dockerBackups.filter(b => b.status === 'completed')
                          .length
                      }
                    </Tag>
                  </Tooltip>
                  {dockerBackups.filter(b => b.status === 'failed').length >
                    0 && (
                    <Tooltip title='실패'>
                      <Tag color='error' icon={<CloseCircleOutlined />}>
                        {
                          dockerBackups.filter(b => b.status === 'failed')
                            .length
                        }
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label='복구 이력'>
                <Space>
                  <Tooltip title='전체 복구'>
                    <Tag color='cyan'>{dockerRestores.length}건</Tag>
                  </Tooltip>
                  {dockerRestores.filter(r => r.status === 'completed').length >
                    0 && (
                    <Tooltip title='성공'>
                      <Tag color='success'>
                        {
                          dockerRestores.filter(r => r.status === 'completed')
                            .length
                        }
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label='백업 가능 여부'>
                <Tag color='success'>가능</Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {renderBackupHierarchy()}
      </TabPane>

      <TabPane
        tab={
          <span>
            <RollbackOutlined /> 복구 이력{' '}
            {isDockerInfra &&
              dockerRestores.length > 0 &&
              `(${dockerRestores.length})`}
            {isKubernetesInfra && restores.length > 0 && `(${restores.length})`}
          </span>
        }
        key='2'
      >
        {!selectedInfraId ? (
          renderEmptyState('restore')
        ) : isDockerInfra ? (
          // Docker/Podman 인프라: Docker 복구 이력 표시
          <Table
            columns={dockerRestoreColumns}
            dataSource={dockerRestores}
            rowKey='id'
            pagination={{ pageSize: 10 }}
            size='small'
            locale={{ emptyText: 'Docker 복구 이력이 없습니다.' }}
          />
        ) : (
          // K8s 인프라: K8s 복구 이력 표시
          <Table
            columns={restoreColumns}
            dataSource={restores}
            rowKey='id'
            pagination={{ pageSize: 10 }}
            size='small'
            locale={{ emptyText: 'Kubernetes 복구 이력이 없습니다.' }}
          />
        )}
      </TabPane>

      <TabPane
        tab={
          <span>
            <SettingOutlined /> 설정 상태
          </span>
        }
        key='3'
      >
        <InstallStatusDisplay
          selectedInfraId={selectedInfraId}
          selectedInfra={selectedInfra} // 👈 selectedInfra 객체 전달
          infrastructures={infrastructures} // 👈 여기서 전달합니다.
          installStatus={installStatus}
          isLoadingStatus={isLoadingStatus}
          externalStorages={externalStorages}
          selectedInfraStorageMappings={selectedInfraStorageMappings}
          onRefresh={
            selectedInfraId
              ? () => onRefreshStatus(Number(selectedInfraId))
              : undefined
          }
        />
      </TabPane>

      <TabPane
        tab={
          <span>
            <CloudServerOutlined /> 저장소 관리
            {externalStorages.length > 0 && (
              <Badge
                count={externalStorages.length}
                style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
              />
            )}
          </span>
        }
        key='4'
      >
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text type='secondary'>
            외부 저장소를 등록하고 인프라에 연결하여 백업 데이터를 저장할 수
            있습니다.
          </Text>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefreshExternalStorages}
            >
              새로고침
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={onOpenExternalStorageModal}
            >
              저장소 추가
            </Button>
          </Space>
        </div>

        <Divider orientation='left'>
          <Space>
            <CloudServerOutlined />
            외부 저장소 서버
            <Badge
              count={externalStorages.length}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Space>
        </Divider>

        {externalStorages.length > 0 ? (
          <Table
            dataSource={externalStorages}
            rowKey='id'
            pagination={false}
            size='small'
            columns={[
              {
                title: '저장소 이름',
                dataIndex: 'name',
                key: 'name',
                render: (name: string, record: ExternalBackupStorage) => (
                  <Space>
                    <CloudServerOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{name}</Text>
                    <Tag
                      color={
                        record.type === 'minio'
                          ? 'purple'
                          : record.type === 's3'
                            ? 'orange'
                            : 'default'
                      }
                    >
                      {record.type.toUpperCase()}
                    </Tag>
                  </Space>
                ),
              },
              {
                title: 'Endpoint',
                dataIndex: 'endpoint',
                key: 'endpoint',
                render: (endpoint: string) => (
                  <Tag color='green'>{endpoint}</Tag>
                ),
              },
              {
                title: 'Bucket',
                dataIndex: 'bucket',
                key: 'bucket',
              },
              {
                title: '상태',
                dataIndex: 'status',
                key: 'status',
                width: 80,
                render: (status: string) => {
                  const statusMap: Record<
                    string,
                    { color: string; text: string; icon: React.ReactNode }
                  > = {
                    active: {
                      color: 'success',
                      text: '활성',
                      icon: <CheckCircleOutlined />,
                    },
                    inactive: {
                      color: 'default',
                      text: '비활성',
                      icon: <StopOutlined />,
                    },
                    error: {
                      color: 'error',
                      text: '오류',
                      icon: <CloseCircleOutlined />,
                    },
                  };
                  const statusInfo = statusMap[status] || {
                    color: 'default',
                    text: status,
                    icon: null,
                  };
                  return (
                    <Tag color={statusInfo.color} icon={statusInfo.icon}>
                      {statusInfo.text}
                    </Tag>
                  );
                },
              },
              {
                title: '등록일',
                dataIndex: 'created_at',
                key: 'created_at',
                width: 120,
                render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
              },
              {
                title: '작업',
                key: 'action',
                width: 120,
                render: (_: unknown, record: ExternalBackupStorage) => (
                  <Space>
                    <Tooltip title='인프라 연결 관리'>
                      <Button
                        size='small'
                        icon={<LinkOutlined />}
                        onClick={() => onOpenInfraLinkModal?.(record)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title='저장소 삭제'
                      description='이 외부 저장소를 삭제하시겠습니까?'
                      onConfirm={() => onDeleteExternalStorage?.(record.id)}
                      okText='삭제'
                      cancelText='취소'
                    >
                      <Button size='small' danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Empty
            description={
              <span>
                등록된 외부 저장소가 없습니다
                <br />
                <Text type='secondary'>
                  상단의 &apos;저장소 추가&apos; 버튼을 클릭하여 외부 저장소를
                  등록하세요
                </Text>
              </span>
            }
            style={{ padding: '24px 0' }}
          >
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={onOpenExternalStorageModal}
            >
              첫 번째 저장소 등록하기
            </Button>
          </Empty>
        )}
      </TabPane>
    </Tabs>
  );
};

export default BackupTabs;
