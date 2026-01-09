// DockerBackupFormModal.tsx - Docker/Podman 백업 생성 모달

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Form,
  Input,
  Space,
  Alert,
  Select,
  message,
  Spin,
  Tag,
  Button,
  Checkbox,
  Tooltip,
  Card,
} from 'antd';
import {
  CloudUploadOutlined,
  CloudServerOutlined,
  WarningOutlined,
  LinkOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ContainerOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { InfraItem } from '../../types/infra';
import { SshHop } from '../../lib/api/types';
import { createDockerBackup } from '../../lib/api/docker';
import { backupApi } from '../../lib/api/endpoints/backup';
import { api } from '../../services/api';
import SshCredentialModal from '../services/SshCredentialModal';
import { useCredsStore } from '../../stores/useCredsStore';

interface DockerBackupFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  loading?: boolean;
  selectedInfra?: InfraItem;
  sshHops: SshHop[];
}

// 연결된 외부 저장소 정보 타입
interface ConnectedStorageInfo {
  id: number;
  name: string;
  endpoint: string;
  bucket: string;
  type: string;
}

// 컨테이너 정보 타입
interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  size: string;
  created: string;
}

// 백업 범위 타입
type BackupScope = 'all' | 'selected';

const DockerBackupFormModal: React.FC<DockerBackupFormModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  loading: externalLoading,
  selectedInfra,
  sshHops,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'volume' | 'config'>(
    'full'
  );

  // 외부 저장소 연결 상태 (infra_backup_storage_mappings)
  const [hasExternalStorageConnection, setHasExternalStorageConnection] =
    useState<boolean | null>(null);
  const [checkingStorageConnection, setCheckingStorageConnection] =
    useState(false);
  const [connectedStorageInfo, setConnectedStorageInfo] =
    useState<ConnectedStorageInfo | null>(null);

  // 컨테이너 관련 상태
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [backupScope, setBackupScope] = useState<BackupScope>('all');

  // SSH 인증 관련 상태
  const [showSshCredentialModal, setShowSshCredentialModal] = useState(false);
  const [authenticatedHops, setAuthenticatedHops] = useState<SshHop[]>([]);
  const { serverlist } = useCredsStore();

  // 클로저 문제 방지용 ref - 항상 최신 selectedInfra 값을 유지
  // 중요: undefined로 덮어쓰지 않음 (부모 컴포넌트에서 prop이 undefined로 변경될 수 있음)
  const selectedInfraRef = useRef<InfraItem | undefined>(selectedInfra);
  useEffect(() => {
    if (selectedInfra) {
      selectedInfraRef.current = selectedInfra;
    }
    // else: 기존 값 유지 (undefined로 덮어쓰지 않음)
  }, [selectedInfra]);

  // 외부 저장소 연결 상태 확인 (infra_backup_storage_mappings 테이블 직접 조회)
  const checkExternalStorageConnection = useCallback(async () => {
    if (!selectedInfra) return;

    setCheckingStorageConnection(true);
    setConnectedStorageInfo(null);
    try {
      // getInfraStorageMappings API로 직접 매핑 테이블 조회
      const response = await backupApi.getInfraStorageMappings(
        selectedInfra.id
      );
      const mappings = response.data || [];

      // 매핑이 하나라도 있으면 연결됨
      const isConnected = mappings.length > 0;
      setHasExternalStorageConnection(isConnected);

      // 연결된 저장소 정보 추출 (첫 번째 매핑 사용)
      if (isConnected && mappings[0]) {
        const mapping = mappings[0];
        setConnectedStorageInfo({
          id: mapping.external_storage_id || 0,
          name: mapping.storage_name || '외부 저장소',
          endpoint: mapping.storage_endpoint || '',
          bucket: 'velero', // 매핑에는 bucket 정보 없음
          type: 'minio', // 매핑에는 type 정보 없음
        });
      }

    } catch (error) {
      console.error(
        '[DockerBackupFormModal] 외부 저장소 연결 상태 확인 실패:',
        error
      );
      setHasExternalStorageConnection(false);
    } finally {
      setCheckingStorageConnection(false);
    }
  }, [selectedInfra]);

  // localStorage에서 저장된 SSH 인증 정보로 hops 보강
  const getHopsWithSavedCredentials = useCallback(() => {
    if (!sshHops || sshHops.length === 0) return [];

    return sshHops.map((hop, _idx) => {
      // 이미 password가 있으면 그대로 사용
      if (hop.password && hop.password.length > 0) {
        return hop;
      }

      // localStorage에서 저장된 credential 찾기
      const savedCred = serverlist.find(
        s =>
          s.host === hop.host &&
          (s.port === hop.port || (!s.port && hop.port === 22)) &&
          s.userId === hop.username &&
          selectedInfra?.id !== undefined &&
          s.infraId === selectedInfra.id
      );

      if (savedCred?.password) {
        return { ...hop, password: savedCred.password };
      }

      return hop;
    });
  }, [sshHops, serverlist, selectedInfra]);

  // SSH 인증 정보가 완전한지 확인 (localStorage 포함)
  const hasCompleteCredentials = useCallback(() => {
    const hopsWithCreds = getHopsWithSavedCredentials();
    if (hopsWithCreds.length === 0) return false;
    return hopsWithCreds.every(hop => hop.password && hop.password.length > 0);
  }, [getHopsWithSavedCredentials]);

  // 컨테이너 목록 조회 (인증된 hops 사용)
  // 클로저 문제 방지를 위해 파라미터로 infra와 hops를 직접 받음
  // 참고: handleSshCredentialComplete에서 호출하므로 먼저 정의해야 함
  const fetchContainers = useCallback(
    async (infra?: InfraItem, hops?: SshHop[]) => {
      // 파라미터가 전달되지 않으면 ref 또는 현재 상태값 사용 (클로저 문제 방지)
      const targetInfra = infra || selectedInfraRef.current || selectedInfra;
      const targetHops =
        hops ||
        (authenticatedHops.length > 0
          ? authenticatedHops
          : getHopsWithSavedCredentials());

      if (!targetInfra) {
        return;
      }

      const hopsToUse = targetHops;

      if (hopsToUse.length === 0 || !hopsToUse.every(h => h.password)) {
        setContainers([]);
        return;
      }

      setLoadingContainers(true);

      try {
        const runtimeType =
          targetInfra.type === 'podman' ||
          targetInfra.type === 'external_podman'
            ? 'podman'
            : 'docker';

        const response = await api.docker.request<{
          containers: Array<Record<string, unknown>>;
        }>('getContainers', {
          hops: hopsToUse,
          runtimeType,
        });

        // 상세 응답 구조 로깅

        // API 응답에서 에러 확인
        const responseData = response.data;
        if (responseData && !responseData.success) {
          console.error(
            '[DockerBackupFormModal] API 응답 실패:',
            responseData.error || responseData.message
          );
          message.error(
            responseData.error ||
              responseData.message ||
              '컨테이너 목록 조회에 실패했습니다.'
          );
          setContainers([]);
          setLoadingContainers(false);
          return;
        }

        // API 응답 구조에 맞게 컨테이너 목록 추출
        const safeString = (val: unknown): string => {
          if (typeof val === 'string') return val;
          if (typeof val === 'number' || typeof val === 'boolean')
            return String(val);
          return '';
        };

        let containerData: Array<Record<string, unknown>> = [];

        // 다양한 응답 구조 지원 (응답 구조별로 로깅)
        // api.ts의 convertApiResponse가 { data: StandardApiResponse<T> }로 감싸므로
        // response = { data: { success, data: { containers: [...] } } }
        // responseData는 위에서 이미 선언됨 (에러 체크용)

        if (responseData?.data && typeof responseData.data === 'object') {
          const innerData = responseData.data as Record<string, unknown>;

          if (Array.isArray(innerData.containers)) {
            containerData = innerData.containers;
          }
        }

        // Fallback: responseData가 직접 containers를 포함하는 경우
        if (
          containerData.length === 0 &&
          responseData &&
          typeof responseData === 'object'
        ) {
          const directData = responseData as Record<string, unknown>;
          if (Array.isArray(directData.containers)) {
            containerData = directData.containers;
          }
        }

        // Fallback: response가 직접 배열인 경우
        if (containerData.length === 0 && Array.isArray(response)) {
          containerData = response;
        }

        if (containerData.length > 0) {
          const containerList: ContainerInfo[] = containerData.map(
            (c: Record<string, unknown>) => ({
              id: safeString(c.id || c.Id || c.ID),
              name: safeString(c.name || c.Name || c.Names),
              image: safeString(c.image || c.Image),
              status: safeString(c.status || c.Status || c.State),
              ports: safeString(c.ports || c.Ports),
              size: safeString(c.size || c.Size),
              created: safeString(c.created || c.Created),
            })
          );
          setContainers(containerList);
        } else {
          console.warn('[DockerBackupFormModal] 컨테이너 데이터 없음');
          setContainers([]);
        }
      } catch (error) {
        console.error(
          '[DockerBackupFormModal] 컨테이너 목록 조회 실패:',
          error
        );
        message.error(
          '컨테이너 목록 조회에 실패했습니다. SSH 인증 정보를 확인해주세요.'
        );
        setContainers([]);
      } finally {
        setLoadingContainers(false);
      }
    },
    [selectedInfra, authenticatedHops, getHopsWithSavedCredentials]
  );

  // "선택한 컨테이너만" 선택 시 처리
  const handleSelectContainerScope = useCallback(() => {
    if (hasCompleteCredentials()) {
      // 이미 인증 정보가 있으면 바로 컨테이너 조회
      const hopsWithCreds = getHopsWithSavedCredentials();
      setAuthenticatedHops(hopsWithCreds);
      setBackupScope('selected');
    } else {
      // 인증 정보가 없으면 SSH 인증 모달 표시
      setShowSshCredentialModal(true);
    }
  }, [hasCompleteCredentials, getHopsWithSavedCredentials]);

  // SSH 인증 완료 핸들러
  const handleSshCredentialComplete = useCallback(
    (hopsWithPassword: SshHop[]) => {
      // ref를 사용하여 항상 최신 selectedInfra 값을 가져옴
      const currentInfra = selectedInfraRef.current;

      setAuthenticatedHops(hopsWithPassword);
      setBackupScope('selected');
      setShowSshCredentialModal(false);

      // ref에서 가져온 currentInfra를 사용하여 fetchContainers 호출
      if (currentInfra) {
        void fetchContainers(currentInfra, hopsWithPassword);
      } else {
        console.error(
          '[DockerBackupFormModal] currentInfra가 없습니다 (ref에서도 undefined)'
        );
      }
    },
    [fetchContainers]
  );

  // 모달이 열릴 때 기본값 설정 및 외부 저장소 연결 상태 확인
  useEffect(() => {
    if (visible && selectedInfra) {
      const defaultName = `${selectedInfra.name}-${dayjs().format('YYYYMMDD-HHmmss')}`;
      form.setFieldsValue({
        backupName: defaultName,
        backupType: 'full',
      });
      void checkExternalStorageConnection();
      // 컨테이너 목록은 "선택한 컨테이너만" 선택 시 조회
    }
  }, [visible, selectedInfra, form, checkExternalStorageConnection]);

  // "선택한 컨테이너만" 선택 시 컨테이너 목록 조회
  useEffect(() => {
    if (visible && backupScope === 'selected' && authenticatedHops.length > 0) {
      void fetchContainers();
    }
  }, [visible, backupScope, authenticatedHops, fetchContainers]);

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setBackupType('full');
      setHasExternalStorageConnection(null);
      setConnectedStorageInfo(null);
      setContainers([]);
      setSelectedContainers([]);
      setBackupScope('all');
      setAuthenticatedHops([]);
      setShowSshCredentialModal(false);
      // ref도 초기화 (다음 모달 오픈 시 새로운 값으로 설정되도록)
      selectedInfraRef.current = undefined;
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // ref를 사용하여 항상 최신 selectedInfra 값을 가져옴 (closure 문제 방지)
      const currentInfra = selectedInfraRef.current;

      if (!currentInfra) {
        message.error('인프라가 선택되지 않았습니다.');
        console.error(
          '[DockerBackupFormModal] handleSubmit - currentInfra undefined',
          {
            refValue: selectedInfraRef.current?.id,
            propValue: selectedInfra?.id,
          }
        );
        return;
      }

      if (!sshHops || sshHops.length === 0) {
        message.error('SSH 연결 정보가 없습니다. 인프라 설정을 확인하세요.');
        return;
      }

      // 외부 저장소 연결 필수 체크
      if (!hasExternalStorageConnection) {
        message.error(
          '외부 저장소가 연결되지 않았습니다. 먼저 저장소를 연결해주세요.'
        );
        return;
      }

      // 선택된 컨테이너가 없는데 '선택한 컨테이너만' 백업을 시도하면 에러
      if (backupScope === 'selected' && selectedContainers.length === 0) {
        message.error('백업할 컨테이너를 하나 이상 선택해주세요.');
        return;
      }

      setIsSubmitting(true);

      // SSH 인증 정보 포함된 hops 가져오기 (authenticatedHops 또는 localStorage에서)
      const hopsWithCredentials =
        authenticatedHops.length > 0
          ? authenticatedHops
          : getHopsWithSavedCredentials();

      // SSH 인증 정보 검증
      if (
        !hopsWithCredentials.every(h => h.password && h.password.length > 0)
      ) {
        message.error(
          'SSH 인증 정보가 완전하지 않습니다. SSH 접속 정보를 다시 입력해주세요.'
        );
        setIsSubmitting(false);
        setShowSshCredentialModal(true);
        return;
      }

      // Backend 중계 방식: storage_type은 항상 minio (Backend가 연결된 저장소를 자동으로 사용)
      const result = await createDockerBackup({
        infra_id: currentInfra.id,
        hops: hopsWithCredentials, // 인증 정보가 포함된 hops 사용
        name: values.backupName,
        backup_type: values.backupType,
        trigger_type: 'manual',
        // 선택한 컨테이너만 백업하는 경우 containers 파라미터 전달
        containers: backupScope === 'selected' ? selectedContainers : undefined,
        // Backend 중계 방식: storage_type만 전달, 저장소는 자동 선택됨
        storage_type: 'minio',
      });

      const scopeLabel =
        backupScope === 'selected'
          ? ` (${selectedContainers.length}개 컨테이너)`
          : ' (전체)';
      const storageLabel = connectedStorageInfo
        ? ` → ${connectedStorageInfo.name}`
        : ' (외부 저장소)';
      message.success(
        `백업이 시작되었습니다: ${result.name}${scopeLabel}${storageLabel}`
      );
      onSuccess();
      onCancel();
    } catch (error) {
      message.error(
        `백업 생성 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const backupTypeOptions = [
    {
      value: 'full',
      label: '전체 백업',
      description: '볼륨 + 컨테이너 설정',
      icon: <AppstoreAddOutlined />,
    },
    {
      value: 'volume',
      label: '볼륨만',
      description: '데이터 볼륨만 백업',
      icon: <DatabaseOutlined />,
    },
    {
      value: 'config',
      label: '설정만',
      description: '컨테이너 설정만 백업',
      icon: <FileTextOutlined />,
    },
  ];

  // 백업 폼 표시 여부: 외부 저장소 연결 확인 완료 + 연결됨
  const canShowBackupForm = hasExternalStorageConnection === true;

  return (
    <Modal
      title={
        <Space>
          <CloudUploadOutlined />
          Docker/Podman 백업 생성
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={isSubmitting || externalLoading}
      width={650}
      okText='백업 시작'
      cancelText='취소'
      okButtonProps={{
        disabled: !canShowBackupForm || checkingStorageConnection,
      }}
    >
      <div className='docker-backup-form-modal'>
        {selectedInfra && (
          <Alert
            message={`백업 대상: ${selectedInfra.name} (${selectedInfra.type === 'podman' ? 'Podman' : 'Docker'})`}
            type='info'
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 외부 저장소 연결 상태 확인 중 */}
        {checkingStorageConnection && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip='외부 저장소 연결 상태 확인 중...' />
          </div>
        )}

        {/* 외부 저장소 미연결 경고 */}
        {!checkingStorageConnection &&
          hasExternalStorageConnection === false && (
            <Alert
              message={
                <Space>
                  <WarningOutlined />
                  <span>외부 저장소 연결 필요</span>
                </Space>
              }
              description={
                <div>
                  <p style={{ marginBottom: 12 }}>
                    이 인프라에 외부 저장소가 연결되지 않았습니다. 백업을
                    생성하려면 먼저 외부 저장소를 연결해야 합니다.
                  </p>
                  <p style={{ marginBottom: 16, color: '#666' }}>
                    <strong>연결 방법:</strong> 백업 관리 &gt; 인프라 연결
                    탭에서 이 인프라를 외부 저장소와 연결하세요.
                  </p>
                  <Space>
                    <Button
                      type='primary'
                      icon={<LinkOutlined />}
                      onClick={() => {
                        onCancel();
                        // 백업 관리 페이지의 인프라 연결 탭으로 이동
                        window.location.href = '/backup?tab=infra-link';
                      }}
                    >
                      인프라 연결하러 가기
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={checkExternalStorageConnection}
                    >
                      상태 새로고침
                    </Button>
                  </Space>
                </div>
              }
              type='warning'
              showIcon={false}
              style={{ marginBottom: 24 }}
            />
          )}

        {/* 백업 폼 - 외부 저장소 연결된 경우에만 표시 */}
        {canShowBackupForm && (
          <Form
            form={form}
            layout='vertical'
            initialValues={{ backupType: 'full' }}
          >
            {/* 백업 이름 */}
            <Form.Item
              name='backupName'
              label='백업 이름'
              rules={[{ required: true, message: '백업 이름을 입력해주세요' }]}
            >
              <Input placeholder='예: my-service-20251212' />
            </Form.Item>

            {/* 백업 유형 드롭다운 */}
            <Form.Item
              name='backupType'
              label='백업 유형'
              rules={[{ required: true, message: '백업 유형을 선택해주세요' }]}
            >
              <Select
                value={backupType}
                onChange={value => setBackupType(value)}
                options={backupTypeOptions.map(option => ({
                  value: option.value,
                  label: (
                    <Space>
                      {option.icon}
                      <span>{option.label}</span>
                      <span style={{ color: '#888', fontSize: 12 }}>
                        - {option.description}
                      </span>
                    </Space>
                  ),
                }))}
              />
            </Form.Item>

            {/* 백업 범위 선택 */}
            <Form.Item
              label={
                <Space>
                  <span>백업 범위</span>
                  <Tooltip title='전체 인프라를 백업하거나, 특정 컨테이너만 선택하여 백업할 수 있습니다.'>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              }
            >
              <Select
                value={backupScope}
                onChange={value => {
                  if (value === 'selected') {
                    handleSelectContainerScope();
                  } else {
                    setBackupScope('all');
                    setSelectedContainers([]);
                  }
                }}
                options={[
                  {
                    value: 'all',
                    label: (
                      <Space>
                        <AppstoreOutlined />
                        <span>전체 인프라 백업</span>
                      </Space>
                    ),
                  },
                  {
                    value: 'selected',
                    label: (
                      <Space>
                        <ContainerOutlined />
                        <span>선택한 컨테이너만 백업</span>
                      </Space>
                    ),
                  },
                ]}
              />
            </Form.Item>

            {/* 컨테이너 선택 UI - '선택한 컨테이너만' 선택 시 표시 */}
            {backupScope === 'selected' && (
              <Form.Item label='컨테이너 선택'>
                {loadingContainers ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Spin size='small' />
                    <span style={{ marginLeft: 8, color: '#888' }}>
                      컨테이너 목록 조회 중...
                    </span>
                  </div>
                ) : containers.length === 0 ? (
                  <Alert
                    message='컨테이너를 찾을 수 없습니다'
                    description='실행 중인 컨테이너가 없거나 조회에 실패했습니다.'
                    type='warning'
                    showIcon
                  />
                ) : (
                  <div
                    style={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    <Checkbox.Group
                      value={selectedContainers}
                      onChange={checkedValues =>
                        setSelectedContainers(checkedValues)
                      }
                      style={{ width: '100%' }}
                    >
                      <Space direction='vertical' style={{ width: '100%' }}>
                        {containers.map(container => (
                          <Checkbox
                            key={container.name}
                            value={container.name}
                            style={{ width: '100%' }}
                          >
                            <Space size={4}>
                              <Tag
                                color={
                                  container.status.includes('Up')
                                    ? 'green'
                                    : 'default'
                                }
                              >
                                {container.status.includes('Up')
                                  ? 'Running'
                                  : 'Stopped'}
                              </Tag>
                              <strong>{container.name}</strong>
                              <span style={{ color: '#888', fontSize: 12 }}>
                                ({container.image})
                              </span>
                            </Space>
                          </Checkbox>
                        ))}
                      </Space>
                    </Checkbox.Group>
                    {selectedContainers.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid #f0f0f0',
                        }}
                      >
                        <Tag color='blue'>
                          {selectedContainers.length}개 선택됨
                        </Tag>
                      </div>
                    )}
                  </div>
                )}
              </Form.Item>
            )}
          </Form>
        )}

        {/* 연결된 저장소 정보 표시 - 간소화된 카드 형태 */}
        {canShowBackupForm && connectedStorageInfo && (
          <Card
            size='small'
            style={{
              marginTop: 16,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
            }}
          >
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>백업 저장소 연결됨</span>
              <Tag color='blue' icon={<CloudServerOutlined />}>
                {connectedStorageInfo.name}
              </Tag>
              <Tag color='cyan'>{connectedStorageInfo.endpoint}</Tag>
            </Space>
          </Card>
        )}
      </div>

      {/* SSH 인증 정보 입력 모달 */}
      <SshCredentialModal
        visible={showSshCredentialModal}
        onClose={() => setShowSshCredentialModal(false)}
        onComplete={handleSshCredentialComplete}
        hops={sshHops}
        infraId={selectedInfra?.id}
        serviceName={selectedInfra?.name}
      />
    </Modal>
  );
};

export default DockerBackupFormModal;
