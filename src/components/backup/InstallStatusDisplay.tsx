// InstallStatusDisplay.tsx - 외부 저장소 기반으로 정리됨

import React from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Alert,
  Space,
  Spin,
  Table,
  Empty,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloudServerOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  BackupInstallStatus,
  ExternalBackupStorage,
  InfraBackupStorageMapping,
} from '../../types/backup';
import { InfraItem } from '../../types/infra';

interface InstallStatusDisplayProps {
  selectedInfraId?: string;
  selectedInfra?: InfraItem;
  infrastructures?: InfraItem[];
  installStatus: BackupInstallStatus | null;
  isLoadingStatus: boolean;
  externalStorages?: ExternalBackupStorage[];
  selectedInfraStorageMappings?: InfraBackupStorageMapping[];
  onRefresh?: () => void;
}

export const InstallStatusDisplay: React.FC<InstallStatusDisplayProps> = ({
  selectedInfra,
  installStatus,
  isLoadingStatus,
  externalStorages = [],
  selectedInfraStorageMappings = [],
  onRefresh,
}) => {
  if (!selectedInfra) {
    return <Alert message='상단에서 인프라를 선택해주세요.' type='info' />;
  }

  if (isLoadingStatus && !installStatus) {
    return <Spin tip='설치 상태를 불러오는 중...' />;
  }

  // 인프라 타입 확인
  const isDockerInfra =
    selectedInfra?.type === 'docker' ||
    selectedInfra?.type === 'podman' ||
    selectedInfra?.type === 'external_docker' ||
    selectedInfra?.type === 'external_podman';
  const isKubernetesInfra =
    selectedInfra?.type === 'kubernetes' ||
    selectedInfra?.type === 'external_kubernetes';

  // 연결된 외부 저장소 정보 조회
  const linkedExternalStorages = selectedInfraStorageMappings
    .map(mapping => {
      const storage = externalStorages.find(
        s => s.id === mapping.external_storage_id
      );
      return {
        ...mapping,
        storage,
      };
    })
    .filter(item => item.storage);

  // 외부 저장소 연결 여부
  const hasExternalStorageConnection = linkedExternalStorages.length > 0;

  // Velero 상태 (K8s 인프라용)
  const hasVeleroActive = installStatus?.velero?.status === 'active';

  // 백업 가능 여부 계산
  // - K8s: 외부 저장소 연결 + Velero 활성
  // - Docker/Podman: 항상 가능 (로컬 저장소 기본 지원)
  const canCreateBackup = isDockerInfra
    ? true
    : hasExternalStorageConnection && hasVeleroActive;

  // 외부 저장소 연결 테이블 컬럼
  const externalStorageColumns = [
    {
      title: '저장소 이름',
      dataIndex: ['storage', 'name'],
      key: 'name',
      render: (name: string, record: (typeof linkedExternalStorages)[0]) => (
        <Space>
          <CloudServerOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Tag color={record.storage?.type === 'minio' ? 'purple' : 'orange'}>
            {record.storage?.type?.toUpperCase()}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Endpoint',
      dataIndex: ['storage', 'endpoint'],
      key: 'endpoint',
      render: (endpoint: string) => <Tag color='green'>{endpoint}</Tag>,
    },
    {
      title: 'BSL 이름',
      dataIndex: 'bsl_name',
      key: 'bsl_name',
      render: (bslName: string) => <Tag color='cyan'>{bslName}</Tag>,
    },
    {
      title: '기본',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 60,
      render: (isDefault: boolean) =>
        isDefault ? <Tag color='success'>기본</Tag> : '-',
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>백업 시스템 상태: {selectedInfra.name}</h2>
        <Button
          icon={<SyncOutlined />}
          onClick={onRefresh}
          loading={isLoadingStatus}
        >
          상태 새로고침
        </Button>
      </div>

      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        {/* 외부 저장소 연결 섹션 */}
        <Card
          title={
            <Space>
              <LinkOutlined style={{ color: '#1890ff' }} />
              연결된 외부 저장소
              {hasExternalStorageConnection && (
                <Tag color='success'>
                  {linkedExternalStorages.length}개 연결됨
                </Tag>
              )}
            </Space>
          }
        >
          {linkedExternalStorages.length > 0 ? (
            <Table
              columns={externalStorageColumns}
              dataSource={linkedExternalStorages}
              rowKey='id'
              pagination={false}
              size='small'
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  연결된 외부 저장소가 없습니다.
                  <br />
                  <span style={{ color: '#999', fontSize: 12 }}>
                    &apos;저장소 관리&apos; 탭에서 외부 저장소를 추가하고
                    연결하세요.
                  </span>
                </span>
              }
            />
          )}
        </Card>

        {/* K8s 인프라: Velero 상태 */}
        {isKubernetesInfra && (
          <Card title='🚀 백업 엔진 (Velero)'>
            <Descriptions bordered column={1} size='small'>
              <Descriptions.Item label='상태'>
                <Tag color={hasVeleroActive ? 'green' : 'red'}>
                  {hasVeleroActive ? '활성' : '비활성'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='연결된 저장소'>
                {hasExternalStorageConnection
                  ? linkedExternalStorages[0]?.storage?.endpoint
                  : '외부 저장소 연결 필요'}
              </Descriptions.Item>
              <Descriptions.Item label='설치된 인프라'>
                {selectedInfra.name}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Docker/Podman 인프라: 저장소 상태 */}
        {isDockerInfra && (
          <Card title='📦 백업 저장소'>
            <Descriptions bordered column={1} size='small'>
              <Descriptions.Item label='저장 위치'>
                <Space>
                  <Tag color='blue'>로컬 저장소</Tag>
                  {hasExternalStorageConnection && (
                    <Tag color='purple'>
                      외부 저장소 ({linkedExternalStorages.length}개)
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label='상태'>
                <Tag color='success'>사용 가능</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 상태 요약 */}
        {canCreateBackup ? (
          <Alert
            message='백업 시스템이 준비되었습니다.'
            description={
              <>
                이제 <strong>{selectedInfra.name}</strong> 인프라에 대한 신규
                백업 생성이 가능합니다.
                <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
                  {isDockerInfra ? (
                    <>
                      <li>저장 방식: 로컬 저장소 (기본)</li>
                      {hasExternalStorageConnection && (
                        <li>
                          외부 저장소:{' '}
                          <strong>
                            {linkedExternalStorages
                              .map(s => s.storage?.name)
                              .join(', ')}
                          </strong>
                          에 연결됨
                        </li>
                      )}
                    </>
                  ) : (
                    <>
                      <li>
                        백업 엔진: <strong>{selectedInfra.name}</strong>에
                        설치됨
                      </li>
                      <li>
                        백업 저장소:{' '}
                        <strong>
                          {linkedExternalStorages[0]?.storage?.name}
                        </strong>{' '}
                        외부 저장소에 연결됨
                      </li>
                    </>
                  )}
                </ul>
              </>
            }
            type='success'
            showIcon
            icon={<CheckCircleOutlined />}
          />
        ) : (
          <Alert
            message='백업 시스템 준비 미완료'
            description={
              isKubernetesInfra
                ? "백업을 생성하려면 외부 저장소 연결과 Velero 엔진이 모두 '활성' 상태여야 합니다."
                : '백업을 생성하려면 저장소 연결이 필요합니다.'
            }
            type='warning'
            showIcon
            icon={<WarningOutlined />}
          />
        )}
      </Space>
    </div>
  );
};

export default InstallStatusDisplay;
