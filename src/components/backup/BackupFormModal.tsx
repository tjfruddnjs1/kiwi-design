// BackupFormModal.tsx - 통합 백업 생성 모달 (모든 인프라 타입 지원)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Alert,
  Card,
  Col,
  Row,
  Radio,
  Tag,
  Divider,
  Spin,
} from 'antd';
import {
  CloudUploadOutlined,
  ReloadOutlined,
  ClusterOutlined,
  ContainerOutlined,
  WarningOutlined,
  ToolOutlined,
  CloudServerOutlined,
  LockOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { InfraItem } from '../../types/infra';
import { backupApi } from '../../lib/api/endpoints/backup';
import { getServers } from '../../lib/api/infra';
import { BackupStorageWithInfra } from '../../lib/api/types';
import { api } from '../../services/api';

const { Option } = Select;

interface BackupFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (formData: BackupFormData) => Promise<void>;
  loading: boolean;
  namespaces: string[];
  onRequestNamespaces: (infraId: number) => void;
  // SSH 인증 정보를 포함한 네임스페이스 조회 (마스터 노드 정보 없을 때 사용)
  onFetchNamespacesWithAuth?: (
    infraId: number,
    sshCredentials: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>
  ) => Promise<void>;
  selectedInfra?: InfraItem;
  infrastructures: InfraItem[];
  onRequestVeleroInstall?: (infraId: number) => void; // Velero 설치 요청 콜백
  onRefreshVeleroStatus?: () => void; // Velero 상태 새로고침 요청 콜백 (설치 완료 후)
}

// 통합 백업 폼 데이터
export interface BackupFormData {
  infraId: number;
  infraType: string;
  backupName: string;
  // K8s 전용
  namespace?: string;
  selector?: string;
  schedule?: string;
  retention?: string;
  // Docker/Podman 전용
  backupType?: 'full' | 'volume' | 'config' | 'compose';
  composeProject?: string;
  // 저장소 설정 (모든 타입 공통)
  storageType?: 'local' | 'minio';
  storageId?: number; // 인프라별 MinIO 저장소 ID
  externalStorageId?: number; // 외부 저장소 ID
  // SSH 인증 - hop별 정보 (마스터 노드 정보 없을 때 사용)
  sshCredentials?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}

// 외부 저장소 정보
interface ExternalStorageInfo {
  id: number;
  name: string;
  endpoint: string;
  bucket: string;
}

// 폼 값 타입 정의
interface BackupFormValues {
  backupName: string;
  namespace?: string;
  selector?: string;
  retention?: string;
  scheduleParts?: {
    minute?: number;
    hour?: number;
    dayOfMonth?: number;
    dayOfWeek?: number;
  };
  backupType?: 'full' | 'volume' | 'config' | 'compose';
  composeProject?: string;
  storageType?: 'local' | 'minio';
  storageId?: number;
  externalStorageId?: number;
  sshPasswords?: Record<number, string>;
}

const BackupFormModal: React.FC<BackupFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading: isSubmitting,
  namespaces,
  onRequestNamespaces,
  onFetchNamespacesWithAuth,
  selectedInfra: initialSelectedInfra,
  infrastructures,
  onRequestVeleroInstall,
  onRefreshVeleroStatus: _onRefreshVeleroStatus,
}) => {
  const [form] = Form.useForm();
  const [selectedInfraId, setSelectedInfraId] = useState<number | undefined>(
    initialSelectedInfra?.id
  );
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [isNameManuallySet, setIsNameManuallySet] = useState(false);
  const [scheduleFrequency, _setScheduleFrequency] = useState('daily');
  const [dockerBackupType, setDockerBackupType] = useState<
    'full' | 'volume' | 'config' | 'compose'
  >('full');

  // Velero 설치 상태 (K8s 인프라용)
  const [veleroInstalled, setVeleroInstalled] = useState<boolean | null>(null);
  const [isCheckingVelero, setIsCheckingVelero] = useState(false);
  // 외부 저장소 연결 상태 (K8s 인프라용)
  const [hasExternalStorage, setHasExternalStorage] = useState<boolean | null>(
    null
  );

  // Docker/Podman 저장소 관련 상태
  const [storageType, setStorageType] = useState<'local' | 'minio'>('minio'); // 기본값을 minio로 변경
  const [minioStorages, setMinioStorages] = useState<BackupStorageWithInfra[]>(
    []
  );
  const [externalStorages, setExternalStorages] = useState<
    ExternalStorageInfo[]
  >([]);
  const [loadingStorages, setLoadingStorages] = useState(false);

  // SSH hop 정보 (서버에서 가져온 호스트 정보)
  const [sshHops, setSshHops] = useState<
    Array<{ host: string; port: number; username?: string }>
  >([]);
  const [loadingHops, setLoadingHops] = useState(false);

  // K8s SSH 인증 fallback (마스터 노드 정보 없을 때)
  const [k8sSshFallbackMode, setK8sSshFallbackMode] = useState(false);
  const [k8sSshHops, setK8sSshHops] = useState<
    Array<{ host: string; port: number; username?: string }>
  >([{ host: '', port: 22, username: '' }]);
  const [fetchingNamespaces, setFetchingNamespaces] = useState(false);

  // 선택된 인프라 객체
  const selectedInfra = useMemo(() => {
    return infrastructures.find(i => i.id === selectedInfraId);
  }, [infrastructures, selectedInfraId]);

  // 인프라 타입 헬퍼
  const isKubernetesInfra = useMemo(() => {
    return (
      selectedInfra?.type === 'kubernetes' ||
      selectedInfra?.type === 'external_kubernetes'
    );
  }, [selectedInfra]);

  const isDockerInfra = useMemo(() => {
    return (
      selectedInfra?.type === 'docker' ||
      selectedInfra?.type === 'podman' ||
      selectedInfra?.type === 'external_docker' ||
      selectedInfra?.type === 'external_podman'
    );
  }, [selectedInfra]);

  // 전체 사용 가능한 저장소 수
  const _totalStorageCount = minioStorages.length + externalStorages.length;

  // 연결된 외부 저장소 로드 (선택된 인프라 기준)
  const loadConnectedStorages = useCallback(async (infraId: number) => {
    setLoadingStorages(true);
    try {
      // 선택된 인프라에 연결된 외부 저장소 매핑 조회
      const mappingResponse = await backupApi.getInfraStorageMappings(infraId);
      if (mappingResponse.data && mappingResponse.data.length > 0) {
        // 매핑된 저장소 정보를 externalStorages 형식으로 변환
        setExternalStorages(
          mappingResponse.data.map(mapping => ({
            id: mapping.external_storage_id,
            name:
              mapping.storage_name || `저장소 ${mapping.external_storage_id}`,
            endpoint: mapping.storage_endpoint || '',
            bucket: 'velero',
          }))
        );
      } else {
        setExternalStorages([]);
      }

      // 인프라별 MinIO 저장소 로드 (레거시 지원)
      const response = await backupApi.listAllMinioStorages();
      if (response.data) {
        setMinioStorages(response.data);
      }
    } catch {
      setExternalStorages([]);
    } finally {
      setLoadingStorages(false);
    }
  }, []);

  // SSH hop 정보 로드 (Docker/Podman용)
  const loadSshHops = useCallback(async (infraId: number) => {
    setLoadingHops(true);
    try {
      // 서버 정보에서 hops 가져오기
      const servers = await getServers(infraId);
      const server = servers?.find(
        (s: { infra_id?: number }) => s.infra_id === infraId
      );

      if (server?.hops) {
        const parsedHops =
          typeof server.hops === 'string'
            ? JSON.parse(server.hops)
            : server.hops;

        if (Array.isArray(parsedHops) && parsedHops.length > 0) {
          setSshHops(
            parsedHops.map(
              (hop: {
                host?: string;
                ip?: string;
                port?: number;
                username?: string;
              }) => ({
                host: hop.host || hop.ip || '',
                port: hop.port || 22,
                username: hop.username || '',
              })
            )
          );
        }
      }
    } catch {
      // SSH hops load failed - reset to empty
      setSshHops([]);
    } finally {
      setLoadingHops(false);
    }
  }, []);

  // Velero 설치 상태 및 백업 가능 여부 확인
  // 기존 backup.tsx와 동일하게 can_create_backup 값을 기준으로 판단
  const checkVeleroStatus = useCallback(async (infraId: number) => {
    setIsCheckingVelero(true);
    setVeleroInstalled(null);
    setHasExternalStorage(null);
    try {
      const response = await api.backup.getInstallationStatus(infraId);

      // API 응답 구조: response = { success, data: { data: { minio, velero, summary, external_storage } } }
      // 기존 backup.tsx 및 BackupDataManager와 동일한 패턴 사용
      const installStatus = response.data?.data;

      // 백업 가능 여부 (백엔드에서 모든 조건을 종합한 결과)
      const canCreateBackup =
        installStatus?.summary?.can_create_backup === true;

      // Velero 설치 상태 (개별 확인용)
      const veleroIsInstalled =
        installStatus?.velero?.installed === true ||
        installStatus?.velero?.status === 'active';

      // 외부 저장소 연결 상태 (백엔드에서 직접 확인)
      const externalStorageConnected =
        installStatus?.summary?.has_external_storage === true ||
        installStatus?.external_storage?.connected === true;

      // Velero 설치 상태 설정
      setVeleroInstalled(veleroIsInstalled);

      // 외부 저장소 연결 상태 설정: can_create_backup 또는 개별 필드 확인
      if (canCreateBackup || (veleroIsInstalled && externalStorageConnected)) {
        setHasExternalStorage(true);
      } else {
        setHasExternalStorage(false);
      }
    } catch (_error) {
      console.error('[BackupFormModal] Velero status check failed:', _error);
      setVeleroInstalled(false);
      setHasExternalStorage(false);
    } finally {
      setIsCheckingVelero(false);
    }
  }, []);

  // K8s 네임스페이스 가져오기 (SSH 인증 정보 포함)
  const handleFetchNamespacesWithAuth = useCallback(async () => {
    if (!selectedInfraId || !onFetchNamespacesWithAuth) return;

    // 폼에서 SSH 인증 정보 수집
    const values = form.getFieldsValue();
    const sshCredentials = k8sSshHops.map((hop, index) => ({
      host: values[`k8s_ssh_host_${index}`] || hop.host,
      port: values[`k8s_ssh_port_${index}`] || hop.port || 22,
      username: values[`k8s_ssh_username_${index}`] || '',
      password: values[`k8s_ssh_password_${index}`] || '',
    }));

    // 유효성 검사
    const isValid = sshCredentials.every(
      cred => cred.host && cred.username && cred.password
    );

    if (!isValid) {
      return; // 폼 유효성 검사에서 처리됨
    }

    setFetchingNamespaces(true);
    try {
      await onFetchNamespacesWithAuth(selectedInfraId, sshCredentials);
    } finally {
      setFetchingNamespaces(false);
    }
  }, [selectedInfraId, onFetchNamespacesWithAuth, form, k8sSshHops]);

  // K8s SSH hop 추가
  const addK8sSshHop = useCallback(() => {
    setK8sSshHops(prev => [...prev, { host: '', port: 22, username: '' }]);
  }, []);

  // K8s SSH hop 제거
  const removeK8sSshHop = useCallback((index: number) => {
    setK8sSshHops(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 모달이 닫힐 때 폼 상태를 초기화합니다.
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setSelectedInfraId(initialSelectedInfra?.id);
      setIsScheduleEnabled(false);
      setIsNameManuallySet(false);
      setDockerBackupType('full');
      setVeleroInstalled(null);
      setIsCheckingVelero(false);
      setHasExternalStorage(null); // 외부 저장소 연결 상태 초기화
      // Docker 관련 상태 초기화
      setStorageType('minio');
      setMinioStorages([]);
      setExternalStorages([]);
      setSshHops([]);
      // K8s SSH fallback 상태 초기화
      setK8sSshFallbackMode(false);
      setK8sSshHops([{ host: '', port: 22, username: '' }]);
      setFetchingNamespaces(false);
    }
  }, [visible, form, initialSelectedInfra]);

  // 모달이 열릴 때 초기 선택된 인프라의 연결된 저장소 로드
  useEffect(() => {
    if (visible && initialSelectedInfra) {
      // 연결된 외부 저장소 로드
      void loadConnectedStorages(initialSelectedInfra.id);

      const infraType = initialSelectedInfra.type;
      if (infraType === 'kubernetes' || infraType === 'external_kubernetes') {
        // K8s 인프라: Velero 설치 상태 확인
        void checkVeleroStatus(initialSelectedInfra.id);
        // 백업 이름 자동 생성
        const date = dayjs().format('YYYYMMDD-HHmmss');
        form.setFieldsValue({
          backupName: `${initialSelectedInfra.name}-${date}`,
        });
      } else if (
        infraType === 'docker' ||
        infraType === 'podman' ||
        infraType === 'external_docker' ||
        infraType === 'external_podman'
      ) {
        // Docker/Podman: SSH hops 로드
        void loadSshHops(initialSelectedInfra.id);
        const date = dayjs().format('YYYYMMDD-HHmmss');
        form.setFieldsValue({
          backupName: `${initialSelectedInfra.name}-${date}`,
        });
      }
    }
  }, [
    visible,
    initialSelectedInfra,
    checkVeleroStatus,
    loadSshHops,
    loadConnectedStorages,
    form,
  ]);

  // 인프라 선택 시
  const handleInfraChange = (infraId: number) => {
    setSelectedInfraId(infraId);
    form.setFieldsValue({ namespace: undefined });

    // 인프라 이름으로 백업 이름 자동 생성
    const infra = infrastructures.find(i => i.id === infraId);
    if (infra && !isNameManuallySet) {
      const date = dayjs().format('YYYYMMDD-HHmmss');
      form.setFieldsValue({ backupName: `${infra.name}-${date}` });
    }

    // K8s 인프라인 경우 Velero 설치 상태 확인
    if (
      infra &&
      (infra.type === 'kubernetes' || infra.type === 'external_kubernetes')
    ) {
      void checkVeleroStatus(infraId);
      setSshHops([]);
    } else if (
      infra &&
      (infra.type === 'docker' ||
        infra.type === 'podman' ||
        infra.type === 'external_docker' ||
        infra.type === 'external_podman')
    ) {
      // Docker/Podman은 Velero 불필요, SSH hops 로드
      setVeleroInstalled(null);
      setIsCheckingVelero(false);
      void loadSshHops(infraId);
      // 저장소 타입 기본값 설정
      form.setFieldsValue({ storageType: 'minio' });
    } else {
      setVeleroInstalled(null);
      setIsCheckingVelero(false);
      setSshHops([]);
    }
  };

  // 네임스페이스 선택 시 백업 이름을 자동으로 생성합니다.
  const handleNamespaceChange = (namespace: string) => {
    if (!isNameManuallySet && namespace) {
      const date = dayjs().format('YYYYMMDD');
      form.setFieldsValue({ backupName: `${namespace}-${date}` });
    }
  };

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values: BackupFormValues) => {
        if (!selectedInfraId || !selectedInfra) {
          return;
        }

        const formData: BackupFormData = {
          infraId: selectedInfraId,
          infraType: selectedInfra.type,
          backupName: values.backupName,
        };

        // K8s 전용 필드
        if (isKubernetesInfra) {
          formData.namespace = values.namespace;

          if (values.selector && values.selector.trim() !== '') {
            formData.selector = values.selector;
          }

          if (isScheduleEnabled) {
            const { minute, hour, dayOfMonth, dayOfWeek } =
              values.scheduleParts || {};
            let cron = '';
            switch (scheduleFrequency) {
              case 'daily':
                cron = `${minute || 0} ${hour || 2} * * *`;
                break;
              case 'weekly':
                cron = `${minute || 0} ${hour || 2} * * ${dayOfWeek || 1}`;
                break;
              case 'monthly':
                cron = `${minute || 0} ${hour || 2} ${dayOfMonth || 1} * *`;
                break;
            }
            formData.schedule = cron;
            formData.retention = values.retention;
          }

          // K8s 저장소 설정
          formData.storageType = values.k8sStorageType || storageType;

          // 저장소 ID 파싱 (ext-{id} 또는 infra-{id} 형식)
          if (formData.storageType === 'minio' && values.k8sStorageId) {
            const storageValue = String(values.k8sStorageId);
            if (storageValue.startsWith('ext-')) {
              formData.externalStorageId = parseInt(
                storageValue.replace('ext-', ''),
                10
              );
            } else if (storageValue.startsWith('infra-')) {
              formData.storageId = parseInt(
                storageValue.replace('infra-', ''),
                10
              );
            }
          }

          // K8s SSH 인증 정보 (fallback 모드일 때)
          if (k8sSshFallbackMode && k8sSshHops.length > 0) {
            formData.sshCredentials = k8sSshHops.map((_, index) => ({
              host: values[`k8s_ssh_host_${index}`] || '',
              port: parseInt(values[`k8s_ssh_port_${index}`], 10) || 22,
              username: values[`k8s_ssh_username_${index}`] || '',
              password: values[`k8s_ssh_password_${index}`] || '',
            }));
          }
        }

        // Docker/Podman 전용 필드
        if (isDockerInfra) {
          formData.backupType = values.backupType || dockerBackupType;
          if (values.composeProject) {
            formData.composeProject = values.composeProject;
          }

          // 저장소 설정
          formData.storageType = values.storageType || storageType;

          // 저장소 ID 파싱 (ext-{id} 또는 infra-{id} 형식)
          if (formData.storageType === 'minio' && values.storageId) {
            const storageValue = String(values.storageId);
            if (storageValue.startsWith('ext-')) {
              formData.externalStorageId = parseInt(
                storageValue.replace('ext-', ''),
                10
              );
            } else if (storageValue.startsWith('infra-')) {
              formData.storageId = parseInt(
                storageValue.replace('infra-', ''),
                10
              );
            }
          }

          // SSH 인증 정보 수집 (호스트, 포트 포함)
          if (sshHops.length > 0) {
            formData.sshCredentials = sshHops.map((hop, index) => ({
              host: hop.host,
              port: hop.port || 22,
              username: values[`ssh_username_${index}`] || hop.username || '',
              password: values[`ssh_password_${index}`] || '',
            }));
          }
        }

        void onSubmit(formData);
      })
      .catch(() => {
        // 폼 검증 실패 시 무시
      });
  };

  const _renderOptions = (max: number) =>
    Array.from({ length: max }, (_, i) => (
      <Option key={i} value={i}>
        {String(i).padStart(2, '0')}
      </Option>
    ));

  // 인프라 타입 라벨 및 아이콘
  const getInfraTypeInfo = (type: string) => {
    const info: Record<
      string,
      { label: string; color: string; icon: React.ReactNode }
    > = {
      kubernetes: { label: 'K8s', color: 'blue', icon: <ClusterOutlined /> },
      external_kubernetes: {
        label: 'K8s',
        color: 'geekblue',
        icon: <ClusterOutlined />,
      },
      docker: { label: 'Docker', color: 'cyan', icon: <ContainerOutlined /> },
      external_docker: {
        label: 'Docker',
        color: 'cyan',
        icon: <ContainerOutlined />,
      },
      podman: { label: 'Podman', color: 'purple', icon: <ContainerOutlined /> },
      external_podman: {
        label: 'Podman',
        color: 'purple',
        icon: <ContainerOutlined />,
      },
    };
    return info[type] || { label: type, color: 'default', icon: null };
  };

  // Docker 백업 타입 옵션
  const dockerBackupTypeOptions = [
    {
      value: 'full',
      label: '전체 백업',
      description: '볼륨 + 컨테이너 설정 + Compose 파일',
    },
    { value: 'volume', label: '볼륨만', description: '데이터 볼륨만 백업' },
    { value: 'config', label: '설정만', description: '컨테이너 설정만 백업' },
    {
      value: 'compose',
      label: 'Compose 파일만',
      description: 'docker-compose.yml 파일만 백업',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <CloudUploadOutlined />새 백업 생성
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={isSubmitting}
      width={650}
      okText='백업 생성'
      cancelText='취소'
      okButtonProps={{
        disabled:
          !selectedInfraId ||
          (isKubernetesInfra &&
            (isCheckingVelero || veleroInstalled === false)),
      }}
    >
      <div className='backup-form-modal'>
        <Form
          form={form}
          layout='vertical'
          initialValues={{ retention: '30d', backupType: 'full' }}
        >
          {/* 인프라 선택 */}
          <Form.Item
            name='infraId'
            label='백업할 인프라'
            rules={[{ required: true, message: '인프라를 선택해주세요' }]}
            initialValue={initialSelectedInfra?.id}
          >
            <Select
              placeholder='인프라를 선택하세요'
              size='large'
              onChange={handleInfraChange}
              value={selectedInfraId}
            >
              {infrastructures.map(infra => {
                const typeInfo = getInfraTypeInfo(infra.type);
                return (
                  <Option key={infra.id} value={infra.id}>
                    <Space>
                      {typeInfo.icon}
                      <span>{infra.name}</span>
                      <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                    </Space>
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          {/* 인프라 선택 후 표시되는 옵션들 */}
          {selectedInfra && (
            <>
              <Divider style={{ margin: '16px 0' }} />

              {/* 인프라 타입별 안내 메시지 */}
              <Alert
                message={
                  isKubernetesInfra
                    ? 'Kubernetes 백업 (Velero)'
                    : 'Docker/Podman 백업'
                }
                description={
                  isKubernetesInfra
                    ? '네임스페이스 기반으로 Velero를 통해 백업합니다.'
                    : '컨테이너 볼륨, 설정, Compose 파일을 백업합니다.'
                }
                type={isKubernetesInfra ? 'info' : 'success'}
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* 백업 이름 */}
              <Form.Item
                name='backupName'
                label='백업 이름'
                rules={[
                  { required: true, message: '백업 이름을 입력해주세요' },
                ]}
              >
                <Input
                  placeholder='예: my-app-20250821'
                  size='large'
                  onChange={() => setIsNameManuallySet(true)}
                />
              </Form.Item>

              {/* K8s 전용 옵션 */}
              {isKubernetesInfra && (
                <>
                  {/* Velero 설치 상태 확인 중 */}
                  {isCheckingVelero && (
                    <Alert
                      message={
                        <Space>
                          <Spin size='small' />
                          <span>Velero 설치 상태 확인 중...</span>
                        </Space>
                      }
                      type='info'
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {/* Velero 미설치 경고 */}
                  {!isCheckingVelero && veleroInstalled === false && (
                    <Alert
                      message={
                        <Space>
                          <WarningOutlined />
                          <span>Velero 설치 필요</span>
                          <Tag color='orange'>{selectedInfra?.name}</Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <p style={{ marginBottom: 8 }}>
                            Kubernetes 백업을 생성하려면 먼저 Velero를 설치해야
                            합니다.
                          </p>
                          <Space wrap>
                            {onRequestVeleroInstall && selectedInfraId && (
                              <Button
                                type='primary'
                                icon={<ToolOutlined />}
                                onClick={() => {
                                  const infraIdToInstall = selectedInfraId;
                                  onCancel(); // 백업 모달 닫기
                                  // 비동기로 Velero 설치 모달 열기 (모달 닫힘 후)
                                  setTimeout(() => {
                                    onRequestVeleroInstall(infraIdToInstall);
                                  }, 100);
                                }}
                              >
                                Velero 설치하기
                              </Button>
                            )}
                            <Button
                              icon={<ReloadOutlined />}
                              onClick={() =>
                                selectedInfraId &&
                                checkVeleroStatus(selectedInfraId)
                              }
                            >
                              상태 새로고침
                            </Button>
                          </Space>
                          <p
                            style={{
                              marginTop: 8,
                              marginBottom: 0,
                              fontSize: 12,
                              color: '#888',
                            }}
                          >
                            이미 설치되어 있다면 &quot;상태 새로고침&quot;
                            버튼을 클릭하세요.
                          </p>
                        </div>
                      }
                      type='warning'
                      showIcon={false}
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {/* Velero 설치됨 - 외부 저장소 연결 확인 */}
                  {!isCheckingVelero &&
                    veleroInstalled === true &&
                    hasExternalStorage === false && (
                      <Alert
                        message={
                          <Space>
                            <WarningOutlined />
                            <span>외부 저장소 연결 필요</span>
                            <Tag color='orange'>{selectedInfra?.name}</Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <p style={{ marginBottom: 8 }}>
                              이 인프라에 외부 저장소가 연결되지 않았습니다.
                              백업을 생성하려면 먼저 외부 저장소를 연결해주세요.
                            </p>
                            <p style={{ margin: 0, color: '#888' }}>
                              <strong>백업 관리</strong> →{' '}
                              <strong>인프라 연결</strong> 탭에서 이 인프라를
                              외부 저장소에 연결할 수 있습니다.
                            </p>
                            <Button
                              icon={<ReloadOutlined />}
                              onClick={() =>
                                selectedInfraId &&
                                checkVeleroStatus(selectedInfraId)
                              }
                              style={{ marginTop: 8 }}
                              size='small'
                            >
                              상태 새로고침
                            </Button>
                          </div>
                        }
                        type='warning'
                        showIcon={false}
                        style={{ marginBottom: 16 }}
                      />
                    )}

                  {/* Velero 설치됨 + 외부 저장소 연결됨 - 백업 폼 표시 */}
                  {!isCheckingVelero &&
                    veleroInstalled === true &&
                    hasExternalStorage === true && (
                      <>
                        {/* 연결된 외부 저장소 정보 표시 (고정) */}
                        {externalStorages.length > 0 && (
                          <Alert
                            message={
                              <Space>
                                <CloudServerOutlined
                                  style={{ color: '#1890ff' }}
                                />
                                <span>백업 저장소</span>
                              </Space>
                            }
                            description={
                              <Space>
                                <CloudServerOutlined
                                  style={{ color: '#1890ff' }}
                                />
                                <span>{externalStorages[0]?.name}</span>
                                <Tag color='blue'>
                                  {externalStorages[0]?.endpoint}
                                </Tag>
                              </Space>
                            }
                            type='info'
                            showIcon={false}
                            style={{ marginBottom: 16 }}
                          />
                        )}

                        {/* 네임스페이스 선택 */}
                        <Form.Item
                          name='namespace'
                          label={
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                              }}
                            >
                              <span>네임스페이스</span>
                              <Space>
                                {!k8sSshFallbackMode && (
                                  <Button
                                    type='link'
                                    size='small'
                                    onClick={() =>
                                      selectedInfraId &&
                                      onRequestNamespaces(selectedInfraId)
                                    }
                                    icon={<ReloadOutlined />}
                                  >
                                    가져오기
                                  </Button>
                                )}
                                <Button
                                  type='link'
                                  size='small'
                                  onClick={() =>
                                    setK8sSshFallbackMode(!k8sSshFallbackMode)
                                  }
                                >
                                  {k8sSshFallbackMode
                                    ? 'SSH 입력 취소'
                                    : '직접 SSH 입력'}
                                </Button>
                              </Space>
                            </div>
                          }
                          rules={[
                            {
                              required: true,
                              message: '백업할 네임스페이스를 선택해주세요',
                            },
                          ]}
                        >
                          <Select
                            placeholder={
                              namespaces.length > 0
                                ? '네임스페이스 선택'
                                : '먼저 네임스페이스를 가져오세요'
                            }
                            size='large'
                            onChange={handleNamespaceChange}
                          >
                            {(namespaces || []).map(ns => (
                              <Option key={ns} value={ns}>
                                {ns}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>

                        {/* SSH 인증 직접 입력 모드 (마스터 노드 정보 없을 때 사용) */}
                        {k8sSshFallbackMode && (
                          <Card
                            size='small'
                            title={
                              <Space>
                                <LockOutlined />
                                <span>마스터 노드 SSH 접속 정보</span>
                              </Space>
                            }
                            style={{ marginBottom: 16 }}
                          >
                            <Alert
                              message='마스터 노드 정보가 등록되지 않았습니다'
                              description='네임스페이스를 가져오려면 Kubernetes 마스터 노드의 SSH 접속 정보를 입력하세요.'
                              type='info'
                              showIcon
                              style={{ marginBottom: 16 }}
                            />

                            {k8sSshHops.map((hop, index) => (
                              <div
                                key={index}
                                style={{
                                  marginBottom:
                                    index < k8sSshHops.length - 1 ? 16 : 0,
                                }}
                              >
                                {k8sSshHops.length > 1 && (
                                  <div
                                    style={{
                                      marginBottom: 8,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <span style={{ fontWeight: 500 }}>
                                      {index === 0
                                        ? '게이트웨이'
                                        : index === k8sSshHops.length - 1
                                          ? '마스터 노드'
                                          : `중간 서버 ${index}`}
                                    </span>
                                    {k8sSshHops.length > 1 && (
                                      <Button
                                        type='text'
                                        size='small'
                                        danger
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => removeK8sSshHop(index)}
                                      />
                                    )}
                                  </div>
                                )}
                                <Row gutter={8}>
                                  <Col span={8}>
                                    <Form.Item
                                      name={`k8s_ssh_host_${index}`}
                                      rules={[
                                        {
                                          required: true,
                                          message: '호스트 필수',
                                        },
                                      ]}
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input placeholder='호스트 (예: 192.168.1.100)' />
                                    </Form.Item>
                                  </Col>
                                  <Col span={4}>
                                    <Form.Item
                                      name={`k8s_ssh_port_${index}`}
                                      initialValue={22}
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input type='number' placeholder='포트' />
                                    </Form.Item>
                                  </Col>
                                  <Col span={6}>
                                    <Form.Item
                                      name={`k8s_ssh_username_${index}`}
                                      rules={[
                                        {
                                          required: true,
                                          message: '사용자명 필수',
                                        },
                                      ]}
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input placeholder='사용자명' />
                                    </Form.Item>
                                  </Col>
                                  <Col span={6}>
                                    <Form.Item
                                      name={`k8s_ssh_password_${index}`}
                                      rules={[
                                        {
                                          required: true,
                                          message: '비밀번호 필수',
                                        },
                                      ]}
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input.Password placeholder='비밀번호' />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </div>
                            ))}

                            <Space style={{ marginTop: 8 }}>
                              <Button
                                type='dashed'
                                size='small'
                                icon={<PlusOutlined />}
                                onClick={addK8sSshHop}
                              >
                                SSH hop 추가 (다중 홉)
                              </Button>
                              {onFetchNamespacesWithAuth && (
                                <Button
                                  type='primary'
                                  size='small'
                                  icon={<ReloadOutlined />}
                                  loading={fetchingNamespaces}
                                  onClick={handleFetchNamespacesWithAuth}
                                >
                                  네임스페이스 가져오기
                                </Button>
                              )}
                            </Space>
                          </Card>
                        )}

                        {/* 라벨 셀렉터, 정기 백업 설정은 추후 고려 대상으로 제거 */}
                      </>
                    )}
                </>
              )}

              {/* Docker/Podman 전용 옵션 */}
              {isDockerInfra && (
                <>
                  {/* 연결된 외부 저장소 정보 표시 (고정) */}
                  {externalStorages.length > 0 && (
                    <Alert
                      message={
                        <Space>
                          <CloudServerOutlined style={{ color: '#1890ff' }} />
                          <span>백업 저장소</span>
                        </Space>
                      }
                      description={
                        <Space>
                          <CloudServerOutlined style={{ color: '#1890ff' }} />
                          <span>{externalStorages[0]?.name}</span>
                          <Tag color='blue'>
                            {externalStorages[0]?.endpoint}
                          </Tag>
                        </Space>
                      }
                      type='info'
                      showIcon={false}
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {/* 저장소가 없을 때 안내 */}
                  {!loadingStorages && externalStorages.length === 0 && (
                    <Alert
                      message='외부 저장소 연결 필요'
                      description={
                        <div>
                          <p style={{ marginBottom: 8 }}>
                            백업을 생성하려면 외부 저장소를 연결해주세요.
                          </p>
                          <p style={{ margin: 0, color: '#888' }}>
                            <strong>백업 관리</strong> →{' '}
                            <strong>인프라 연결</strong> 탭에서 연결할 수
                            있습니다.
                          </p>
                        </div>
                      }
                      type='warning'
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {/* 2단계: 백업 유형 선택 */}
                  <Form.Item
                    name='backupType'
                    label='백업 유형'
                    rules={[
                      { required: true, message: '백업 유형을 선택해주세요' },
                    ]}
                    initialValue='full'
                  >
                    <Radio.Group
                      value={dockerBackupType}
                      onChange={e => setDockerBackupType(e.target.value)}
                    >
                      <Space direction='vertical' style={{ width: '100%' }}>
                        {dockerBackupTypeOptions.map(option => (
                          <Radio key={option.value} value={option.value}>
                            <Space direction='vertical' size={0}>
                              <span style={{ fontWeight: 500 }}>
                                {option.label}
                              </span>
                              <span style={{ fontSize: 12, color: '#888' }}>
                                {option.description}
                              </span>
                            </Space>
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    name='composeProject'
                    label='Compose 프로젝트 (선택)'
                    tooltip='특정 Docker Compose 프로젝트만 백업하려면 프로젝트 이름을 입력하세요'
                  >
                    <Input
                      placeholder='예: my-app (비워두면 인프라 전체 백업)'
                      size='large'
                    />
                  </Form.Item>

                  {/* 3단계: SSH 인증 (마지막에 표시) */}
                  {sshHops.length > 0 && (
                    <Card
                      size='small'
                      title={
                        <Space>
                          <LockOutlined />
                          <span>서버 SSH 인증</span>
                          {loadingHops && <Spin size='small' />}
                        </Space>
                      }
                      style={{ marginTop: 16 }}
                    >
                      <Alert
                        message='백업 실행을 위해 서버 접속 정보를 입력하세요'
                        type='info'
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      {sshHops.map((hop, index) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: index < sshHops.length - 1 ? 16 : 0,
                          }}
                        >
                          {sshHops.length > 1 && (
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>
                              {index === 0
                                ? '게이트웨이'
                                : index === sshHops.length - 1
                                  ? '대상 서버'
                                  : `중간 서버 ${index}`}
                            </div>
                          )}
                          <Row gutter={8}>
                            <Col span={8}>
                              <Form.Item style={{ marginBottom: 0 }}>
                                <Input
                                  value={`${hop.host}:${hop.port}`}
                                  disabled
                                  prefix={
                                    <span style={{ color: '#888' }}>
                                      호스트
                                    </span>
                                  }
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name={`ssh_username_${index}`}
                                initialValue={hop.username}
                                rules={[
                                  { required: true, message: '사용자명 필수' },
                                ]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input placeholder='사용자명' />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                name={`ssh_password_${index}`}
                                rules={[
                                  { required: true, message: '비밀번호 필수' },
                                ]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input.Password placeholder='비밀번호' />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </Card>
                  )}

                  {/* SSH hops 로딩 중 */}
                  {loadingHops && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Spin tip='서버 정보 로딩 중...' />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Form>
      </div>
    </Modal>
  );
};

export default BackupFormModal;
