import React, { useMemo } from 'react';
import {
  Collapse,
  Table,
  Tag,
  Space,
  Button,
  Tooltip,
  Typography,
  Card,
  Badge,
  Statistic,
  Popconfirm,
} from 'antd';
import {
  CloudServerOutlined,
  AppstoreOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ContainerOutlined,
  DatabaseOutlined,
  FileOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { Backup, Restore } from '../../types/backup';
import { DockerBackup, DockerRestore } from '../../lib/api/docker';

const { Panel } = Collapse;
const { Text, Title } = Typography;

// K8s 백업 데이터
interface AllBackupData {
  backup: Backup;
  infraName: string;
  infraType: string;
  restores: Restore[];
  installStatus?: any;
}

// Docker 백업 데이터
interface DockerBackupData {
  backup: DockerBackup;
  infraName: string;
  infraType: string;
  restores: DockerRestore[];
}

// 네임스페이스 그룹 (K8s)
interface NamespaceGroup {
  namespace: string;
  backups: AllBackupData[];
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalRestores: number;
}

// 컨테이너 범위 그룹 (Docker/Podman)
interface ContainerScopeGroup {
  scopeKey: string; // 'full' 또는 정렬된 컨테이너 이름 조합
  scopeLabel: string; // 표시용 라벨
  isFullBackup: boolean;
  containers: string[];
  backups: DockerBackupData[];
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalRestores: number;
}

// 인프라 그룹 (통합)
interface InfraGroup {
  infraId: number;
  infraName: string;
  infraType: string;
  // K8s용
  namespaces: NamespaceGroup[];
  totalNamespaces: number;
  // Docker/Podman용
  containerScopes: ContainerScopeGroup[];
  totalScopes: number;
  // 공통
  totalBackups: number;
  installStatus?: any;
}

interface BackupHierarchyViewProps {
  // K8s 백업
  allBackups: AllBackupData[];
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
  onShowDetail: (backupGroup: any) => void;
  // Docker 백업
  dockerBackups?: DockerBackup[];
  dockerRestores?: DockerRestore[];
  onRestoreDocker?: (backup: DockerBackup) => void;
  onDeleteDocker?: (backup: DockerBackup) => void;
  onShowDockerRestoreDetail?: (
    backup: DockerBackup,
    restores: DockerRestore[]
  ) => void;
  // 공통
  getStatusColor: (status: string) => string;
  getInstallStatusDisplay: (installStatus: any) => {
    color: string;
    text: string;
  };
  // 선택된 인프라 정보
  selectedInfraName?: string;
  selectedInfraType?: string;
}

const BackupHierarchyView: React.FC<BackupHierarchyViewProps> = ({
  allBackups,
  onRestore,
  onDelete,
  onShowDetail,
  dockerBackups = [],
  dockerRestores = [],
  onRestoreDocker,
  onDeleteDocker,
  onShowDockerRestoreDetail,
  getStatusColor,
  getInstallStatusDisplay,
  selectedInfraName,
  selectedInfraType,
}) => {
  // 인프라 타입 헬퍼
  const isDockerInfra =
    selectedInfraType === 'docker' ||
    selectedInfraType === 'podman' ||
    selectedInfraType === 'external_docker' ||
    selectedInfraType === 'external_podman';

  // Docker 백업 → 컨테이너 범위로 그룹화
  const dockerGroups = useMemo((): ContainerScopeGroup[] => {
    if (!isDockerInfra || dockerBackups.length === 0) return [];

    const grouped = new Map<string, ContainerScopeGroup>();

    dockerBackups.forEach(backup => {
      // 컨테이너 범위 결정 - containers가 null/undefined일 수 있으므로 먼저 안전하게 처리
      const containers = backup.containers || [];
      const sortedContainers = [...containers].sort();

      // 전체 백업 여부는 containers 배열이 비어있을 때만 (backup_type은 무시)
      // 실제 데이터에서 backup_type은 항상 'full'이지만 containers에 선택된 컨테이너가 저장됨
      const isFullBackup = containers.length === 0;

      // 그룹 키 생성 - 컨테이너 목록 기준으로 그룹화
      const scopeKey = isFullBackup ? 'full' : sortedContainers.join(',');

      // 표시 라벨 생성
      let scopeLabel: string;
      if (isFullBackup) {
        scopeLabel = '전체 컨테이너';
      } else if (containers.length === 1) {
        scopeLabel = containers[0];
      } else if (containers.length <= 3) {
        scopeLabel = containers.join(', ');
      } else {
        scopeLabel = `${containers.slice(0, 2).join(', ')} 외 ${containers.length - 2}개`;
      }

      if (!grouped.has(scopeKey)) {
        grouped.set(scopeKey, {
          scopeKey,
          scopeLabel,
          isFullBackup,
          containers: sortedContainers,
          backups: [],
          totalBackups: 0,
          completedBackups: 0,
          failedBackups: 0,
          totalRestores: 0,
        });
      }

      // 해당 백업에 연결된 복구 이력 찾기
      const backupRestores = dockerRestores.filter(
        r => r.backup_id === backup.id
      );

      const group = grouped.get(scopeKey);
      group.backups.push({
        backup,
        infraName: selectedInfraName || '',
        infraType: selectedInfraType || '',
        restores: backupRestores,
      });
      group.totalBackups++;
      group.totalRestores += backupRestores.length;

      if (backup.status === 'completed') {
        group.completedBackups++;
      } else if (backup.status === 'failed') {
        group.failedBackups++;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      // 전체 컨테이너가 먼저
      if (a.isFullBackup) return -1;
      if (b.isFullBackup) return 1;
      // 그 다음 컨테이너 개수 순 (많은 것이 먼저)
      if (b.containers.length !== a.containers.length) {
        return b.containers.length - a.containers.length;
      }
      // 같은 개수면 이름순
      return a.scopeLabel.localeCompare(b.scopeLabel);
    });
  }, [
    dockerBackups,
    dockerRestores,
    isDockerInfra,
    selectedInfraName,
    selectedInfraType,
  ]);

  // K8s 백업 → 인프라 → 네임스페이스로 그룹화
  const infraGroups = useMemo(() => {
    if (isDockerInfra) return [];

    const grouped = new Map<number, InfraGroup>();

    allBackups.forEach(backupData => {
      const infraId = backupData.backup.infra_id;
      const namespace = backupData.backup.namespace;

      if (!grouped.has(infraId)) {
        grouped.set(infraId, {
          infraId,
          infraName: backupData.infraName,
          infraType: backupData.infraType,
          namespaces: [],
          totalBackups: 0,
          totalNamespaces: 0,
          containerScopes: [],
          totalScopes: 0,
          installStatus: backupData.installStatus,
        });
      }

      const infraGroup = grouped.get(infraId);

      // 네임스페이스 그룹 찾기 또는 생성
      let nsGroup = infraGroup.namespaces.find(
        ns => ns.namespace === namespace
      );
      if (!nsGroup) {
        nsGroup = {
          namespace,
          backups: [],
          totalBackups: 0,
          completedBackups: 0,
          failedBackups: 0,
          totalRestores: 0,
        };
        infraGroup.namespaces.push(nsGroup);
      }

      // 백업 추가
      nsGroup.backups.push(backupData);
      nsGroup.totalBackups++;
      nsGroup.totalRestores += backupData.restores.length;

      if (backupData.backup.status.toLowerCase() === 'completed') {
        nsGroup.completedBackups++;
      } else if (backupData.backup.status.toLowerCase() === 'failed') {
        nsGroup.failedBackups++;
      }

      infraGroup.totalBackups++;
    });

    // 네임스페이스 카운트 업데이트 및 정렬
    grouped.forEach(infraGroup => {
      infraGroup.totalNamespaces = infraGroup.namespaces.length;
      infraGroup.namespaces.sort((a, b) =>
        a.namespace.localeCompare(b.namespace)
      );
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.infraName.localeCompare(b.infraName)
    );
  }, [allBackups, isDockerInfra]);

  // 백업 테이블 컬럼
  const backupColumns = [
    {
      title: '백업 이름',
      dataIndex: ['backup', 'name'],
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '상태',
      dataIndex: ['backup', 'status'],
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusLabels: Record<string, string> = {
          creating: '생성 중',
          completed: '완료',
          failed: '실패',
          restoring: '복구 중',
          deleted: '삭제됨',
          'in-progress': '진행 중',
          partial: '부분 완료',
        };
        return (
          <Tag color={getStatusColor(status)}>
            {statusLabels[status?.toLowerCase()] || status}
          </Tag>
        );
      },
    },
    {
      title: '생성일',
      dataIndex: ['backup', 'created_at'],
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('ko-KR'),
    },
    {
      title: '만료일',
      dataIndex: ['backup', 'expires_at'],
      key: 'expires_at',
      width: 130,
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString('ko-KR') : '-',
    },
    {
      title: '복구 이력',
      dataIndex: 'restores',
      key: 'restores',
      width: 100,
      render: (restores: Restore[], record: AllBackupData) => (
        <div>
          {restores.length > 0 ? (
            <Button
              type='link'
              size='small'
              style={{ padding: 0, height: 'auto' }}
              onClick={() =>
                onShowDetail({
                  backupName: record.backup.name,
                  backups: [record],
                  totalRestores: restores.length,
                  lastRestoreDate:
                    restores.length > 0 ? restores[0].created_at : undefined,
                })
              }
            >
              <Tag color='green'>{restores.length}회</Tag>
            </Button>
          ) : (
            <Tag color='default'>0회</Tag>
          )}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: AllBackupData) => (
        <Space size='small'>
          <Tooltip title='복구'>
            <Button
              size='small'
              icon={<CloudDownloadOutlined />}
              onClick={() => onRestore(record.backup)}
              disabled={record.backup.status.toLowerCase() !== 'completed'}
            />
          </Tooltip>
          <Tooltip title='삭제'>
            <Button
              size='small'
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record.backup)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 네임스페이스 패널 헤더
  const renderNamespaceHeader = (nsGroup: NamespaceGroup) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <Space size='middle' style={{ flex: 1 }}>
        <AppstoreOutlined style={{ fontSize: 16, color: '#1890ff' }} />
        <Text strong style={{ fontSize: 15 }}>
          {nsGroup.namespace}
        </Text>
        <Badge
          count={nsGroup.totalBackups}
          style={{ backgroundColor: '#52c41a' }}
        />
      </Space>

      <Space size='large' onClick={e => e.stopPropagation()}>
        <Tooltip title='완료된 백업'>
          <Space size={4}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text type='secondary' style={{ fontSize: 13 }}>
              {nsGroup.completedBackups}
            </Text>
          </Space>
        </Tooltip>

        {nsGroup.failedBackups > 0 && (
          <Tooltip title='실패한 백업'>
            <Space size={4}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              <Text type='secondary' style={{ fontSize: 13 }}>
                {nsGroup.failedBackups}
              </Text>
            </Space>
          </Tooltip>
        )}

        <Tooltip title='총 복구 이력'>
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#1890ff' }} />
            <Text type='secondary' style={{ fontSize: 13 }}>
              {nsGroup.totalRestores}회
            </Text>
          </Space>
        </Tooltip>
      </Space>
    </div>
  );

  // Docker 백업 테이블 컬럼
  const dockerBackupColumns = [
    {
      title: '백업 이름',
      dataIndex: ['backup', 'name'],
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '백업 유형',
      dataIndex: ['backup', 'backup_type'],
      key: 'backup_type',
      width: 80,
      render: (type: string) => {
        const typeLabels: Record<
          string,
          { label: string; color: string; icon: React.ReactNode }
        > = {
          full: { label: '전체', color: 'blue', icon: <DatabaseOutlined /> },
          volume: { label: '볼륨', color: 'green', icon: <FolderOutlined /> },
          config: { label: '설정', color: 'orange', icon: <FileOutlined /> },
          compose: {
            label: 'Compose',
            color: 'purple',
            icon: <ContainerOutlined />,
          },
        };
        const typeInfo = typeLabels[type] || {
          label: type,
          color: 'default',
          icon: null,
        };
        return (
          <Tag color={typeInfo.color} icon={typeInfo.icon}>
            {typeInfo.label}
          </Tag>
        );
      },
    },
    {
      title: '상태',
      dataIndex: ['backup', 'status'],
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusColors: Record<string, string> = {
          creating: 'processing',
          completed: 'success',
          failed: 'error',
          restoring: 'warning',
          deleted: 'default',
        };
        const statusLabels: Record<string, string> = {
          creating: '생성 중',
          completed: '완료',
          failed: '실패',
          restoring: '복구 중',
          deleted: '삭제됨',
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {statusLabels[status] || status}
          </Tag>
        );
      },
    },
    {
      title: '크기',
      dataIndex: ['backup', 'size_bytes'],
      key: 'size_bytes',
      width: 100,
      render: (bytes: number) => {
        if (!bytes) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      },
    },
    {
      title: '생성일',
      dataIndex: ['backup', 'created_at'],
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('ko-KR'),
    },
    {
      title: '복구 이력',
      dataIndex: 'restores',
      key: 'restores',
      width: 100,
      render: (restores: DockerRestore[], record: DockerBackupData) => {
        const restoreCount = restores?.length || 0;
        // 최근 복구의 상태 확인
        const lastRestore = restores?.[0];
        const hasFailedRestore = restores?.some(r => r.status === 'failed');
        const hasInProgressRestore = restores?.some(
          r => r.status === 'in_progress' || r.status === 'pending'
        );

        let tagColor = 'default';
        if (restoreCount > 0) {
          if (hasInProgressRestore) {
            tagColor = 'processing';
          } else if (hasFailedRestore) {
            tagColor = 'warning';
          } else {
            tagColor = 'green';
          }
        }

        return (
          <div>
            {restoreCount > 0 ? (
              <Tooltip
                title={
                  lastRestore
                    ? `최근: ${new Date(lastRestore.created_at).toLocaleString('ko-KR')}`
                    : undefined
                }
              >
                <Button
                  type='link'
                  size='small'
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() =>
                    onShowDockerRestoreDetail?.(record.backup, restores)
                  }
                >
                  <Tag color={tagColor}>{restoreCount}회</Tag>
                </Button>
              </Tooltip>
            ) : (
              <Tag color='default'>0회</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: DockerBackupData) => (
        <Space size='small'>
          <Tooltip title='복구'>
            <Button
              size='small'
              icon={<CloudDownloadOutlined />}
              onClick={() => onRestoreDocker?.(record.backup)}
              disabled={record.backup.status !== 'completed'}
            />
          </Tooltip>
          <Tooltip title='삭제'>
            <Popconfirm
              title='백업을 삭제하시겠습니까?'
              description='이 작업은 되돌릴 수 없습니다.'
              onConfirm={() => onDeleteDocker?.(record.backup)}
              okText='삭제'
              cancelText='취소'
              okButtonProps={{ danger: true }}
            >
              <Button
                size='small'
                danger
                icon={<DeleteOutlined />}
                disabled={
                  record.backup.status === 'creating' ||
                  record.backup.status === 'restoring'
                }
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Docker 컨테이너 범위 패널 헤더
  const renderContainerScopeHeader = (group: ContainerScopeGroup) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <Space size='middle' style={{ flex: 1 }}>
        {group.isFullBackup ? (
          <DatabaseOutlined style={{ fontSize: 16, color: '#1890ff' }} />
        ) : (
          <ContainerOutlined style={{ fontSize: 16, color: '#13c2c2' }} />
        )}
        <div>
          <Text strong style={{ fontSize: 15 }}>
            {group.scopeLabel}
          </Text>
          {!group.isFullBackup && group.containers.length > 3 && (
            <div>
              <Tooltip title={group.containers.join(', ')}>
                <Text
                  type='secondary'
                  style={{ fontSize: 12, cursor: 'pointer' }}
                >
                  컨테이너 {group.containers.length}개
                </Text>
              </Tooltip>
            </div>
          )}
        </div>
        <Badge
          count={group.totalBackups}
          style={{ backgroundColor: '#52c41a' }}
        />
      </Space>

      <Space size='large' onClick={e => e.stopPropagation()}>
        <Tooltip title='완료된 백업'>
          <Space size={4}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text type='secondary' style={{ fontSize: 13 }}>
              {group.completedBackups}
            </Text>
          </Space>
        </Tooltip>

        {group.failedBackups > 0 && (
          <Tooltip title='실패한 백업'>
            <Space size={4}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              <Text type='secondary' style={{ fontSize: 13 }}>
                {group.failedBackups}
              </Text>
            </Space>
          </Tooltip>
        )}

        <Tooltip title='총 복구 이력'>
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#1890ff' }} />
            <Text type='secondary' style={{ fontSize: 13 }}>
              {group.totalRestores}회
            </Text>
          </Space>
        </Tooltip>
      </Space>
    </div>
  );

  // 인프라 패널 헤더
  const renderInfraHeader = (infraGroup: InfraGroup) => {
    const statusInfo = getInstallStatusDisplay(infraGroup.installStatus);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Space size='large' style={{ flex: 1 }}>
          <CloudServerOutlined style={{ fontSize: 18, color: '#1890ff' }} />
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {infraGroup.infraName}
            </Text>
            <div>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {infraGroup.infraType}
              </Text>
            </div>
          </div>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Space>

        <Space size='large' onClick={e => e.stopPropagation()}>
          <Statistic
            title={
              infraGroup.infraType.includes('docker') ||
              infraGroup.infraType.includes('podman')
                ? '프로젝트'
                : '네임스페이스'
            }
            value={infraGroup.totalNamespaces || infraGroup.totalScopes}
            valueStyle={{ fontSize: 16, color: '#1890ff' }}
          />
          <Statistic
            title='총 백업'
            value={infraGroup.totalBackups}
            valueStyle={{ fontSize: 16, color: '#52c41a' }}
          />
        </Space>
      </div>
    );
  };

  // 빈 상태 렌더링
  const hasNoBackups = isDockerInfra
    ? dockerGroups.length === 0
    : infraGroups.length === 0;

  if (hasNoBackups) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          {isDockerInfra ? (
            <ContainerOutlined
              style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }}
            />
          ) : (
            <CloudServerOutlined
              style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }}
            />
          )}
          <Title level={4} type='secondary'>
            백업이 없습니다
          </Title>
          <Text type='secondary'>새 백업을 생성하여 시작하세요.</Text>
        </div>
      </Card>
    );
  }

  // Docker/Podman 인프라 렌더링 - K8s와 일관된 UI 구조
  if (isDockerInfra) {
    // 총 백업 수 계산
    const totalBackups = dockerGroups.reduce(
      (sum, g) => sum + g.totalBackups,
      0
    );
    const totalCompleted = dockerGroups.reduce(
      (sum, g) => sum + g.completedBackups,
      0
    );

    return (
      <div style={{ marginTop: 16 }}>
        {/* 인프라 정보 헤더 - K8s 스타일과 동일 */}
        <Card
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #f0f2f5 100%)',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Space size='large'>
              <ContainerOutlined style={{ fontSize: 18, color: '#13c2c2' }} />
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  {selectedInfraName}
                </Text>
                <div>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {selectedInfraType === 'docker' ||
                    selectedInfraType === 'external_docker'
                      ? 'Docker'
                      : 'Podman'}
                  </Text>
                </div>
              </div>
            </Space>
            <Space size='large'>
              <Statistic
                title='컨테이너 그룹'
                value={dockerGroups.length}
                valueStyle={{ fontSize: 16, color: '#1890ff' }}
              />
              <Statistic
                title='총 백업'
                value={totalBackups}
                valueStyle={{ fontSize: 16, color: '#52c41a' }}
              />
              <Statistic
                title='완료'
                value={totalCompleted}
                valueStyle={{ fontSize: 16, color: '#52c41a' }}
              />
            </Space>
          </div>
        </Card>

        {/* 컨테이너 범위별 그룹 - K8s 네임스페이스 스타일과 동일 */}
        <Collapse
          defaultActiveKey={dockerGroups[0]?.scopeKey}
          expandIconPosition='end'
          bordered={false}
          className='namespace-collapse'
        >
          {dockerGroups.map(group => (
            <Panel
              key={group.scopeKey}
              header={renderContainerScopeHeader(group)}
              className='namespace-panel'
            >
              <Table
                columns={dockerBackupColumns}
                dataSource={group.backups}
                rowKey={record =>
                  `${record.backup.id}-${record.backup.created_at}`
                }
                pagination={false}
                size='small'
                bordered
              />
            </Panel>
          ))}
        </Collapse>
      </div>
    );
  }

  // K8s 인프라 렌더링
  return (
    <div style={{ marginTop: 16 }}>
      <Collapse
        defaultActiveKey={[infraGroups[0]?.infraId.toString()]}
        expandIconPosition='end'
        className='infra-collapse'
      >
        {infraGroups.map(infraGroup => (
          <Panel
            key={infraGroup.infraId.toString()}
            header={renderInfraHeader(infraGroup)}
            className='infra-panel'
          >
            <Collapse
              defaultActiveKey={infraGroup.namespaces[0]?.namespace}
              expandIconPosition='end'
              bordered={false}
              className='namespace-collapse'
            >
              {infraGroup.namespaces.map(nsGroup => (
                <Panel
                  key={nsGroup.namespace}
                  header={renderNamespaceHeader(nsGroup)}
                  className='namespace-panel'
                >
                  <Table
                    columns={backupColumns}
                    dataSource={nsGroup.backups}
                    rowKey={record =>
                      record.backup.name + record.backup.created_at
                    }
                    pagination={false}
                    size='small'
                    bordered
                  />
                </Panel>
              ))}
            </Collapse>
          </Panel>
        ))}
      </Collapse>

      <style>{`
        .infra-collapse .infra-panel {
          margin-bottom: 16px;
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          overflow: hidden;
        }

        .infra-collapse .infra-panel > .ant-collapse-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #f0f2f5 100%);
          border-bottom: 1px solid #d9d9d9;
        }

        .infra-collapse .infra-panel > .ant-collapse-header:hover {
          background: linear-gradient(135deg, #e8eef5 0%, #e3e6eb 100%);
        }

        .namespace-collapse {
          background: #fafafa;
        }

        .namespace-collapse .namespace-panel {
          margin-bottom: 8px;
          background: white;
          border: 1px solid #e8e8e8;
          border-radius: 4px;
        }

        .namespace-collapse .namespace-panel > .ant-collapse-header {
          padding: 12px 16px;
          background: white;
        }

        .namespace-collapse .namespace-panel > .ant-collapse-header:hover {
          background: #f5f5f5;
        }

        .namespace-collapse .ant-collapse-content {
          border-top: 1px solid #e8e8e8;
        }

        .ant-statistic-title {
          font-size: 12px;
          margin-bottom: 2px;
        }
      `}</style>
    </div>
  );
};

export default BackupHierarchyView;
