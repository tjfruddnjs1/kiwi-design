// UnifiedBackupListView.tsx - 통합 백업 목록 뷰 (K8s/Docker/Podman)
import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Tooltip,
  Typography,
  Badge,
  Input,
  Select,
  Drawer,
  Descriptions,
  Timeline,
  Empty,
  Popconfirm,
  Segmented,
  Flex,
  Divider,
} from 'antd';
import './UnifiedBackupListView.css';
import type { ColumnsType } from 'antd/es/table';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClusterOutlined,
  ContainerOutlined,
  SearchOutlined,
  EyeOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  FilterOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Backup, Restore } from '../../types/backup';
import { DockerBackup, DockerRestore } from '../../lib/api/docker';
import dayjs from 'dayjs';

const { Text } = Typography;

// 통합 백업 데이터 타입
export interface UnifiedBackupItem {
  id: number;
  name: string;
  runtime: 'kubernetes' | 'docker' | 'podman';
  infraId: number;
  infraName: string;
  infraType: string;
  namespace?: string;
  composeProject?: string;
  backupType?: 'full' | 'volume' | 'config' | 'compose';
  status: string;
  size?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  error?: string;
  restoreCount: number;
  restores: Array<Restore | DockerRestore>;
  installStatus?: unknown;
  originalBackup: Backup | DockerBackup;
  isDockerBackup: boolean;
  // 저장소 정보 (Docker/Podman 백업용)
  storageType?: 'local' | 'minio' | 'nfs' | 'velero';
  storageEndpoint?: string;
  storageBucket?: string;
}

interface UnifiedBackupListViewProps {
  k8sBackups: Array<{
    backup: Backup;
    infraName: string;
    infraType: string;
    restores: Restore[];
    installStatus?: unknown;
  }>;
  dockerBackups: DockerBackup[];
  dockerRestores: DockerRestore[];
  infrastructures: Array<{ id: number; name: string; type: string }>;
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
  onRestoreDocker?: (backup: DockerBackup) => void;
  onDeleteDocker?: (backup: DockerBackup) => void;
  getStatusColor: (status: string) => string;
  loading?: boolean;
}

type RuntimeFilter = 'all' | 'kubernetes' | 'docker' | 'podman';

const UnifiedBackupListView: React.FC<UnifiedBackupListViewProps> = ({
  k8sBackups,
  dockerBackups,
  dockerRestores,
  infrastructures,
  onRestore,
  onDelete,
  onRestoreDocker,
  onDeleteDocker,
  _getStatusColor,
  loading = false,
}) => {
  // 필터 상태
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [infraFilter, setInfraFilter] = useState<number | null>(null);

  // 상세 정보 Drawer 상태
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedBackupItem | null>(
    null
  );

  // K8s와 Docker 백업을 통합
  const unifiedBackups = useMemo((): UnifiedBackupItem[] => {
    const items: UnifiedBackupItem[] = [];

    // K8s 백업 변환
    k8sBackups.forEach(
      ({ backup, infraName, infraType, restores, installStatus }) => {
        let runtime: 'kubernetes' | 'docker' | 'podman' = 'kubernetes';
        if (infraType.includes('docker')) runtime = 'docker';
        if (infraType.includes('podman')) runtime = 'podman';

        items.push({
          id: backup.id,
          name: backup.name,
          runtime,
          infraId: backup.infra_id,
          infraName,
          infraType,
          namespace: backup.namespace,
          status: backup.status,
          size: backup.size,
          createdAt: backup.created_at,
          completedAt: backup.completed_at,
          error: backup.error,
          restoreCount: restores.length,
          restores,
          installStatus,
          originalBackup: backup,
          isDockerBackup: false,
        });
      }
    );

    // Docker/Podman 백업 변환
    dockerBackups.forEach(backup => {
      const infra = infrastructures.find(i => i.id === backup.infra_id);
      if (!infra) return;

      const runtime: 'docker' | 'podman' = infra.type.includes('podman')
        ? 'podman'
        : 'docker';
      const backupRestores = dockerRestores.filter(
        r => r.backup_id === backup.id
      );

      items.push({
        id: backup.id,
        name: backup.name,
        runtime,
        infraId: backup.infra_id,
        infraName: infra.name,
        infraType: infra.type,
        composeProject: backup.compose_project,
        backupType: backup.backup_type,
        status: backup.status,
        size: backup.size_bytes ? formatBytes(backup.size_bytes) : undefined,
        createdAt: backup.created_at,
        completedAt: backup.completed_at,
        error: backup.error_message,
        restoreCount: backupRestores.length,
        restores: backupRestores,
        originalBackup: backup,
        isDockerBackup: true,
        // 저장소 정보 추가
        storageType: backup.storage_type,
        storageEndpoint: backup.storage_endpoint,
        storageBucket: backup.storage_bucket,
      });
    });

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [k8sBackups, dockerBackups, dockerRestores, infrastructures]);

  // 필터링된 백업 목록
  const filteredBackups = useMemo(() => {
    return unifiedBackups.filter(item => {
      if (runtimeFilter !== 'all' && item.runtime !== runtimeFilter)
        return false;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(searchLower);
        const matchesInfra = item.infraName.toLowerCase().includes(searchLower);
        const matchesNamespace = item.namespace
          ?.toLowerCase()
          .includes(searchLower);
        const matchesProject = item.composeProject
          ?.toLowerCase()
          .includes(searchLower);
        if (
          !matchesName &&
          !matchesInfra &&
          !matchesNamespace &&
          !matchesProject
        )
          return false;
      }
      if (statusFilter && item.status.toLowerCase() !== statusFilter)
        return false;
      if (infraFilter && item.infraId !== infraFilter) return false;
      return true;
    });
  }, [unifiedBackups, runtimeFilter, searchText, statusFilter, infraFilter]);

  // 통계 (PartiallyFailed도 실패로 카운트)
  const stats = useMemo(() => {
    return {
      total: unifiedBackups.length,
      kubernetes: unifiedBackups.filter(b => b.runtime === 'kubernetes').length,
      docker: unifiedBackups.filter(b => b.runtime === 'docker').length,
      podman: unifiedBackups.filter(b => b.runtime === 'podman').length,
      completed: unifiedBackups.filter(
        b => b.status.toLowerCase() === 'completed'
      ).length,
      failed: unifiedBackups.filter(b => {
        const s = b.status.toLowerCase();
        return s === 'failed' || s === 'partiallyfailed';
      }).length,
    };
  }, [unifiedBackups]);

  // 런타임 필터 옵션 (반응형: 모바일에서는 아이콘+숫자만 표시)
  const runtimeOptions = [
    {
      label: (
        <Tooltip title='전체'>
          <span className='runtime-tab-label'>
            <AppstoreOutlined />
            <span className='runtime-tab-text'>전체</span>
            <Badge
              count={stats.total}
              showZero
              style={{ marginLeft: 4, backgroundColor: '#1890ff' }}
            />
          </span>
        </Tooltip>
      ),
      value: 'all',
    },
    {
      label: (
        <Tooltip title='Kubernetes'>
          <span className='runtime-tab-label'>
            <ClusterOutlined />
            <span className='runtime-tab-text'>K8s</span>
            <Badge
              count={stats.kubernetes}
              showZero
              style={{ marginLeft: 4, backgroundColor: '#1890ff' }}
            />
          </span>
        </Tooltip>
      ),
      value: 'kubernetes',
    },
    {
      label: (
        <Tooltip title='Docker'>
          <span className='runtime-tab-label'>
            <ContainerOutlined />
            <span className='runtime-tab-text'>Docker</span>
            <Badge
              count={stats.docker}
              showZero
              style={{ marginLeft: 4, backgroundColor: '#52c41a' }}
            />
          </span>
        </Tooltip>
      ),
      value: 'docker',
    },
    {
      label: (
        <Tooltip title='Podman'>
          <span className='runtime-tab-label'>
            <ContainerOutlined />
            <span className='runtime-tab-text'>Podman</span>
            <Badge
              count={stats.podman}
              showZero
              style={{ marginLeft: 4, backgroundColor: '#fa8c16' }}
            />
          </span>
        </Tooltip>
      ),
      value: 'podman',
    },
  ];

  // 인프라 목록 (중복 제거)
  const infraOptions = useMemo(() => {
    const uniqueInfras = new Map<number, string>();
    unifiedBackups.forEach(b => uniqueInfras.set(b.infraId, b.infraName));
    return Array.from(uniqueInfras.entries()).map(([id, name]) => ({
      value: id,
      label: name,
    }));
  }, [unifiedBackups]);

  // 크기 데이터가 있는지 확인 (하나라도 있으면 true)
  const hasSizeData = useMemo(() => {
    return unifiedBackups.some(b => b.size && b.size !== '-');
  }, [unifiedBackups]);

  // 테이블 컬럼 (크기 컬럼은 데이터가 있을 때만 표시)
  const columns: ColumnsType<UnifiedBackupItem> = [
    {
      title: '인프라',
      key: 'infraWithRuntime',
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip
            title={
              record.runtime === 'kubernetes'
                ? 'Kubernetes'
                : record.runtime === 'docker'
                  ? 'Docker'
                  : 'Podman'
            }
          >
            <Tag
              color={getRuntimeColor(record.runtime)}
              style={{ margin: 0, padding: '0 6px' }}
            >
              {record.runtime === 'kubernetes' ? (
                <ClusterOutlined />
              ) : (
                <ContainerOutlined />
              )}
            </Tag>
          </Tooltip>
          <Text strong ellipsis style={{ maxWidth: 130 }}>
            {record.infraName}
          </Text>
        </div>
      ),
    },
    {
      title: '백업 이름',
      key: 'name',
      ellipsis: true,
      render: (_, record) => (
        <div>
          <Text strong style={{ display: 'block' }}>
            {record.name}
          </Text>
          {record.namespace && (
            <Text type='secondary' style={{ fontSize: 12 }}>
              <DatabaseOutlined style={{ marginRight: 4 }} />
              {record.namespace}
            </Text>
          )}
          {record.composeProject && (
            <Text type='secondary' style={{ fontSize: 12 }}>
              <ContainerOutlined style={{ marginRight: 4 }} />
              {record.composeProject}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag
          color={getStatusTagColor(status)}
          icon={getStatusIcon(status)}
          style={{ margin: 0 }}
        >
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    // 크기 컬럼 (데이터가 있을 때만 표시)
    ...(hasSizeData
      ? [
          {
            title: '크기',
            dataIndex: 'size',
            key: 'size',
            width: 80,
            render: (size: string | undefined) => (
              <Text type='secondary'>{size || '-'}</Text>
            ),
          },
        ]
      : []),
    // 저장소 컬럼 (Docker/Podman 백업에서만 표시)
    {
      title: '저장소',
      key: 'storage',
      width: 100,
      render: (_: unknown, record: UnifiedBackupItem) => {
        if (!record.isDockerBackup) {
          return <Tag color='purple'>Velero</Tag>;
        }
        if (record.storageType === 'minio') {
          return (
            <Tooltip title={record.storageEndpoint || '외부 저장소'}>
              <Tag color='blue'>MinIO</Tag>
            </Tooltip>
          );
        }
        if (record.storageType === 'local') {
          return <Tag color='default'>로컬</Tag>;
        }
        return <Tag color='default'>-</Tag>;
      },
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => (
        <Text type='secondary'>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
    {
      title: '복구',
      key: 'restores',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Badge
          count={record.restoreCount}
          style={{
            backgroundColor: record.restoreCount > 0 ? '#52c41a' : '#d9d9d9',
          }}
          showZero
        />
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title='상세'>
            <Button
              size='small'
              type='text'
              icon={<EyeOutlined />}
              onClick={() => handleShowDetail(record)}
            />
          </Tooltip>
          <Tooltip title='복구'>
            <Button
              size='small'
              type='text'
              icon={<CloudDownloadOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleRestore(record)}
              disabled={record.status.toLowerCase() !== 'completed'}
            />
          </Tooltip>
          <Popconfirm
            title='백업 삭제'
            description='정말 삭제하시겠습니까?'
            onConfirm={() => handleDelete(record)}
            okText='삭제'
            cancelText='취소'
            okButtonProps={{ danger: true }}
          >
            <Tooltip title='삭제'>
              <Button
                size='small'
                type='text'
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 이벤트 핸들러
  const handleShowDetail = (item: UnifiedBackupItem) => {
    setSelectedItem(item);
    setDetailDrawerVisible(true);
  };

  const handleRestore = (item: UnifiedBackupItem) => {
    if (item.isDockerBackup && onRestoreDocker) {
      onRestoreDocker(item.originalBackup as DockerBackup);
    } else {
      onRestore(item.originalBackup as Backup);
    }
  };

  const handleDelete = (item: UnifiedBackupItem) => {
    if (item.isDockerBackup && onDeleteDocker) {
      onDeleteDocker(item.originalBackup as DockerBackup);
    } else {
      onDelete(item.originalBackup as Backup);
    }
  };

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter(null);
    setInfraFilter(null);
  };

  // 상세 정보 Drawer
  const renderDetailDrawer = () => {
    if (!selectedItem) return null;

    return (
      <Drawer
        title={
          <Space>
            <EyeOutlined />
            백업 상세 정보
          </Space>
        }
        placement='right'
        width={480}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        extra={
          <Button
            type='primary'
            icon={<CloudDownloadOutlined />}
            onClick={() => {
              handleRestore(selectedItem);
              setDetailDrawerVisible(false);
            }}
            disabled={selectedItem.status.toLowerCase() !== 'completed'}
          >
            복구
          </Button>
        }
      >
        <Descriptions
          column={1}
          bordered
          size='small'
          labelStyle={{ width: 100 }}
        >
          <Descriptions.Item label='백업 이름'>
            <Text strong>{selectedItem.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label='런타임'>
            <Tag color={getRuntimeColor(selectedItem.runtime)}>
              {selectedItem.runtime === 'kubernetes'
                ? 'Kubernetes'
                : selectedItem.runtime}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label='인프라'>
            {selectedItem.infraName}
          </Descriptions.Item>
          {selectedItem.namespace && (
            <Descriptions.Item label='네임스페이스'>
              {selectedItem.namespace}
            </Descriptions.Item>
          )}
          {selectedItem.composeProject && (
            <Descriptions.Item label='프로젝트'>
              {selectedItem.composeProject}
            </Descriptions.Item>
          )}
          <Descriptions.Item label='상태'>
            <Tag
              color={getStatusTagColor(selectedItem.status)}
              icon={getStatusIcon(selectedItem.status)}
            >
              {getStatusLabel(selectedItem.status)}
            </Tag>
          </Descriptions.Item>
          {selectedItem.size && (
            <Descriptions.Item label='크기'>
              {selectedItem.size}
            </Descriptions.Item>
          )}
          {/* 저장소 정보 */}
          <Descriptions.Item label='저장소'>
            {selectedItem.isDockerBackup ? (
              selectedItem.storageType === 'minio' ? (
                <Space direction='vertical' size={2}>
                  <Tag color='blue'>MinIO (외부 저장소)</Tag>
                  {selectedItem.storageEndpoint && (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      {selectedItem.storageEndpoint}
                    </Text>
                  )}
                  {selectedItem.storageBucket && (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      버킷: {selectedItem.storageBucket}
                    </Text>
                  )}
                </Space>
              ) : selectedItem.storageType === 'local' ? (
                <Tag color='default'>로컬 서버</Tag>
              ) : (
                <Tag color='default'>-</Tag>
              )
            ) : (
              <Tag color='purple'>Velero (K8s 백업)</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label='생성일'>
            {dayjs(selectedItem.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {selectedItem.completedAt && (
            <Descriptions.Item label='완료일'>
              {dayjs(selectedItem.completedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
          {selectedItem.error && (
            <Descriptions.Item label='오류'>
              <Text type='danger'>{selectedItem.error}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation='left' style={{ marginTop: 24 }}>
          <Space>
            <HistoryOutlined />
            복구 이력 ({selectedItem.restoreCount})
          </Space>
        </Divider>

        {selectedItem.restores.length > 0 ? (
          <Timeline
            items={selectedItem.restores.map((restore, idx) => {
              const isDockerRestore = 'restore_volumes' in restore;
              const dockerRestore = restore as DockerRestore;

              return {
                key: idx,
                color: getRestoreTimelineColor(restore.status),
                children: (
                  <div>
                    <Text strong>
                      {(restore as Restore).name || `복구 #${idx + 1}`}
                    </Text>
                    <br />
                    <Tag
                      color={getStatusTagColor(restore.status)}
                      style={{ fontSize: 12 }}
                    >
                      {getStatusLabel(restore.status)}
                    </Tag>
                    {/* Docker/Podman 복구 옵션 표시 */}
                    {isDockerRestore && (
                      <div style={{ marginTop: 4 }}>
                        <Space size={4} wrap>
                          {dockerRestore.restore_volumes && (
                            <Tag
                              color='blue'
                              style={{ fontSize: 11, margin: 0 }}
                            >
                              볼륨
                            </Tag>
                          )}
                          {dockerRestore.restore_config && (
                            <Tag
                              color='purple'
                              style={{ fontSize: 11, margin: 0 }}
                            >
                              설정
                            </Tag>
                          )}
                          {dockerRestore.redeploy && (
                            <Tag
                              color='green'
                              style={{ fontSize: 11, margin: 0 }}
                            >
                              재배포
                            </Tag>
                          )}
                          {dockerRestore.stop_existing && (
                            <Tag
                              color='orange'
                              style={{ fontSize: 11, margin: 0 }}
                            >
                              기존 중지
                            </Tag>
                          )}
                        </Space>
                      </div>
                    )}
                    <br />
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {dayjs(restore.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                    {/* 완료 시 소요 시간 표시 */}
                    {restore.completed_at && (
                      <Text
                        type='secondary'
                        style={{ fontSize: 11, marginLeft: 8 }}
                      >
                        (
                        {formatDuration(
                          restore.created_at,
                          restore.completed_at
                        )}
                        )
                      </Text>
                    )}
                    {/* 오류 메시지 표시 */}
                    {restore.status.toLowerCase() === 'failed' && (
                      <div style={{ marginTop: 4 }}>
                        <Text type='danger' style={{ fontSize: 11 }}>
                          {(restore as DockerRestore).error_message ||
                            '오류 발생'}
                        </Text>
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        ) : (
          <Empty
            description='복구 이력이 없습니다'
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Drawer>
    );
  };

  const hasActiveFilters = searchText || statusFilter || infraFilter;

  return (
    <div className='unified-backup-list'>
      {/* 런타임 필터 탭 */}
      <Flex justify='space-between' align='center' style={{ marginBottom: 16 }}>
        <Segmented
          options={runtimeOptions}
          value={runtimeFilter}
          onChange={value => setRuntimeFilter(value as RuntimeFilter)}
          size='middle'
        />
        <Space>
          <Text type='secondary'>
            완료{' '}
            <Text strong style={{ color: '#52c41a' }}>
              {stats.completed}
            </Text>
            {stats.failed > 0 && (
              <>
                {' '}
                / 실패{' '}
                <Text strong style={{ color: '#ff4d4f' }}>
                  {stats.failed}
                </Text>
              </>
            )}
          </Text>
        </Space>
      </Flex>

      {/* 검색 및 필터 */}
      <Flex gap={8} wrap='wrap' style={{ marginBottom: 16 }}>
        <Input
          placeholder='이름, 인프라, 네임스페이스 검색'
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Select
          placeholder='상태'
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 120 }}
          options={[
            { value: 'completed', label: '완료' },
            { value: 'creating', label: '생성 중' },
            { value: 'inprogress', label: '진행 중' },
            { value: 'failed', label: '실패' },
          ]}
        />
        <Select
          placeholder='인프라'
          value={infraFilter}
          onChange={setInfraFilter}
          allowClear
          style={{ width: 160 }}
          options={infraOptions}
          showSearch
          optionFilterProp='label'
        />
        {hasActiveFilters && (
          <Button icon={<FilterOutlined />} onClick={handleClearFilters}>
            필터 초기화
          </Button>
        )}
      </Flex>

      {/* 백업 테이블 */}
      <Table
        columns={columns}
        dataSource={filteredBackups}
        rowKey={record => `${record.isDockerBackup ? 'd' : 'k'}-${record.id}`}
        size='small'
        loading={loading}
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '30', '50'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}개`,
        }}
        scroll={{ x: 900 }}
        locale={{
          emptyText: (
            <Empty
              description='백업이 없습니다'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      {/* 상세 정보 Drawer */}
      {renderDetailDrawer()}
    </div>
  );
};

// 유틸리티 함수들
function formatBytes(bytes: number): string {
  if (bytes === 0) return '-'; // 0은 알 수 없음으로 표시
  if (bytes < 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getRuntimeColor(runtime: string): string {
  const colors: Record<string, string> = {
    kubernetes: 'blue',
    docker: 'green',
    podman: 'orange',
  };
  return colors[runtime] || 'default';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    creating: '생성 중',
    inprogress: '진행 중',
    running: '진행 중',
    completed: '완료',
    failed: '실패',
    new: '대기',
    partiallyfailed: '실패', // PartiallyFailed도 실패로 표시
  };
  return labels[status.toLowerCase()] || status;
}

function getStatusTagColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'completed') return 'success';
  if (statusLower === 'failed' || statusLower === 'partiallyfailed')
    return 'error';
  if (['creating', 'inprogress', 'running'].includes(statusLower))
    return 'processing';
  return 'default';
}

function getStatusIcon(status: string): React.ReactNode {
  const statusLower = status.toLowerCase();
  if (['creating', 'inprogress', 'running'].includes(statusLower))
    return <SyncOutlined spin />;
  if (statusLower === 'completed') return <CheckCircleOutlined />;
  if (statusLower === 'failed' || statusLower === 'partiallyfailed')
    return <CloseCircleOutlined />;
  return null;
}

function getRestoreTimelineColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'completed') return 'green';
  if (statusLower === 'failed' || statusLower === 'partiallyfailed')
    return 'red';
  if (['inprogress', 'running', 'new'].includes(statusLower)) return 'blue';
  return 'gray';
}

function formatDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const duration = Math.round((end - start) / 1000);

  if (duration <= 0) return '-';
  if (duration < 60) return `${duration}초`;
  if (duration < 3600)
    return `${Math.floor(duration / 60)}분 ${duration % 60}초`;
  return `${Math.floor(duration / 3600)}시간 ${Math.floor((duration % 3600) / 60)}분`;
}

export default UnifiedBackupListView;
