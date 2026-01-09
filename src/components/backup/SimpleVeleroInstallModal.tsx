// SimpleVeleroInstallModal.tsx - 간소화된 Velero 설치 모달
// 백업 생성 모달에서 Velero 미설치 시 바로 설치할 수 있도록 간소화된 모달
// Gateway → Server 형태의 멀티 홉 SSH 지원
// 외부 저장소(external_backup_storages)를 선택하여 Velero와 연결

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Card,
  Typography,
  Spin,
  message,
  Tag,
  Select,
  Divider,
} from 'antd';
import {
  ToolOutlined,
  ClusterOutlined,
  LockOutlined,
  UserOutlined,
  CloudServerOutlined,
  ApiOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { InfraItem, Server, Hop } from '../../types/infra';
import { api } from '../../services/api';
import { backupApi } from '../../lib/api/endpoints/backup';
import { ExternalBackupStorage } from '../../lib/api/types';

const { Text, Title } = Typography;
const { Option } = Select;

interface SimpleVeleroInstallModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  selectedInfra: InfraItem | null;
  servers: Server[];
  onOpenMinioRegistration?: () => void; // MinIO 등록 모달 열기 콜백
}

// 파싱된 홉 정보
interface ParsedHop {
  host: string;
  port: number;
  username: string;
}

// 설치 상태 타입
type InstallStatus =
  | 'unknown'
  | 'not_installed'
  | 'installing'
  | 'active'
  | 'error';

const SimpleVeleroInstallModal: React.FC<SimpleVeleroInstallModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  selectedInfra,
  servers,
  onOpenMinioRegistration,
}) => {
  const [form] = Form.useForm();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string>('');

  // 설치 상태 확인 관련 상태
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<InstallStatus>('unknown');
  const [_veleroStatus, setVeleroStatus] = useState<InstallStatus>('unknown');

  // 외부 저장소 관련 상태 (external_backup_storages 테이블)
  const [externalStorages, setExternalStorages] = useState<
    ExternalBackupStorage[]
  >([]);
  const [loadingStorages, setLoadingStorages] = useState(false);
  const [selectedStorageId, setSelectedStorageId] = useState<number | null>(
    null
  );
  const [connectedStorageId, setConnectedStorageId] = useState<number | null>(
    null
  );

  // 마스터 서버 찾기
  const masterServer = useMemo(() => {
    if (servers.length === 0) {
      return null;
    }

    // type 필드에 'master'가 포함되어 있는지 확인 (composite type 지원: 'master,ha', 'ha,master' 등)
    const master = servers.find(
      s =>
        s.node_type === 'master' ||
        s.nodeType === 'master' ||
        s.ha === 'master' ||
        s.type === 'master' ||
        (typeof s.type === 'string' && s.type.includes('master'))
    );
    return master || servers[0];
  }, [servers]);

  // 서버의 hops 파싱
  const parsedHops = useMemo((): ParsedHop[] => {

    if (!masterServer) {
      return [];
    }

    try {
      let hops: Hop[] = [];

      if (typeof masterServer.hops === 'string') {
        const hopsString = masterServer.hops || '[]';
        hops = JSON.parse(hopsString);
      } else if (Array.isArray(masterServer.hops)) {
        hops = masterServer.hops;
      } else {
        hops = [];
      }

      const result = hops.map(hop => ({
        host: hop.host || hop.ip || '',
        port: hop.port || 22,
        username: hop.username || '',
      }));

      return result;
    } catch (e) {
      console.error('[SimpleVeleroInstallModal] Failed to parse hops:', e);
      return [];
    }
  }, [masterServer]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setInstallProgress('');
      setIsInstalling(false);
      setSelectedStorageId(null);
    }
  }, [visible, form]);

  // 외부 저장소 목록 로드 (external_backup_storages 테이블에서)
  const loadExternalStorages = async () => {
    setLoadingStorages(true);
    try {
      const response = await backupApi.listExternalStorages();
      if (response.data) {
        // 활성 상태인 저장소만 필터링
        const activeStorages = response.data.filter(s => s.status === 'active');
        setExternalStorages(activeStorages);
      }
    } catch (error) {
      console.error(
        '[SimpleVeleroInstallModal] Failed to load external storages:',
        error
      );
    } finally {
      setLoadingStorages(false);
    }
  };

  // 모달 열릴 때 설치 상태 확인 및 저장소 목록 로드
  useEffect(() => {
    const checkInstallationStatus = async () => {
      if (!visible || !selectedInfra) return;

      setIsCheckingStatus(true);
      setCurrentStatus('unknown');
      setVeleroStatus('unknown');
      setConnectedStorageId(null);

      // 외부 저장소 목록 로드
      await loadExternalStorages();

      try {
        const response = await api.backup.checkInstallation(selectedInfra.id);

        const installStatus = response.data?.data;
        if (installStatus) {
          // Velero 상태 확인
          const velero = installStatus.velero;
          if (velero?.status === 'installing') {
            setVeleroStatus('installing');
            setCurrentStatus('installing');
          } else if (velero?.installed) {
            setVeleroStatus('active');
            setCurrentStatus('active');
            // 연결된 MinIO 저장소 ID 저장
            if (velero?.connected_minio_id) {
              setConnectedStorageId(velero.connected_minio_id);
            }
          } else if (
            velero?.status === 'error' ||
            velero?.status === 'failed'
          ) {
            setVeleroStatus('error');
            setCurrentStatus('error');
          } else {
            setVeleroStatus('not_installed');
            setCurrentStatus('not_installed');
          }
        } else {
          setCurrentStatus('not_installed');
          setVeleroStatus('not_installed');
        }
      } catch (_error) {
        setCurrentStatus('not_installed');
        setVeleroStatus('not_installed');
      } finally {
        setIsCheckingStatus(false);
      }
    };

    void checkInstallationStatus();
  }, [visible, selectedInfra]);

  const handleInstall = async () => {
    try {
      const values = await form.validateFields();

      if (!selectedInfra) {
        message.error('인프라 정보가 없습니다.');
        return;
      }

      if (!masterServer) {
        message.error('마스터 서버 정보가 없습니다.');
        return;
      }

      if (parsedHops.length === 0) {
        message.error('SSH 접속 정보가 없습니다.');
        return;
      }

      // 외부 저장소 선택 확인
      if (!selectedStorageId) {
        message.error('연결할 외부 저장소를 선택해주세요.');
        return;
      }

      // 선택된 외부 저장소 정보 가져오기
      const selectedStorage = externalStorages.find(
        s => s.id === selectedStorageId
      );
      if (!selectedStorage) {
        message.error('선택한 저장소 정보를 찾을 수 없습니다.');
        return;
      }

      setIsInstalling(true);
      setInstallProgress('Velero 설치 준비 중...');

      // SSH hop 정보 구성 (각 홉에 사용자 입력값 사용)
      const sshHops = parsedHops.map((hop, index) => ({
        host: hop.host,
        port: hop.port,
        username: values[`username_${index}`] || hop.username || '',
        password: values[`password_${index}`] || '',
      }));

      // endpoint에 http:// 프로토콜이 없으면 추가하는 헬퍼 함수
      const ensureHttpPrefix = (endpoint: string): string => {
        if (!endpoint) return '';
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
          return endpoint;
        }
        // use_ssl 설정에 따라 https 또는 http 사용
        return selectedStorage.use_ssl
          ? `https://${endpoint}`
          : `http://${endpoint}`;
      };

      // Velero 설치 (선택된 외부 저장소 연결)
      setInstallProgress('Velero 백업 엔진 설치 중...');

      const minioEndpoint = ensureHttpPrefix(selectedStorage.endpoint);

      const veleroResponse = await api.backup.installVelero({
        infra_id: selectedInfra.id,
        minio_endpoint: minioEndpoint,
        access_key: selectedStorage.access_key,
        secret_key: selectedStorage.secret_key,
        bucket: selectedStorage.bucket || 'velero',
        auth_data: sshHops,
        external_storage_id: selectedStorageId, // 외부 저장소 ID 전달
      });

      // 응답 검증: success 필드가 true이거나, data에 유효한 id와 status가 있으면 성공
      const responseData = veleroResponse.data?.data;
      const isSuccess =
        veleroResponse.data?.success ||
        (responseData?.id &&
          (responseData?.status === 'installing' ||
            responseData?.status === 'active'));

      if (!isSuccess) {
        throw new Error(
          veleroResponse.data?.error || 'Velero 설치에 실패했습니다.'
        );
      }

      setInstallProgress('설치 요청 완료!');
      message.success({
        content: (
          <span>
            Velero 설치가 시작되었습니다. 완료까지 2-5분이 소요될 수 있습니다.
            <br />
            <strong>설정 상태</strong> 탭에서 진행 상황을 확인하세요.
          </span>
        ),
        duration: 6,
      });

      // 약간의 딜레이 후 성공 콜백
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error('[SimpleVeleroInstallModal] Install failed:', error);
      message.error(
        `설치 실패: ${error instanceof Error ? error.message : String(error)}`
      );
      setInstallProgress('');
    } finally {
      setIsInstalling(false);
    }
  };

  const isExternalInfra = selectedInfra?.type === 'external_kubernetes';

  // 홉 레이블 생성
  const getHopLabel = (index: number, totalHops: number): string => {
    if (totalHops === 1) return '서버';
    if (index === 0) return 'Gateway';
    if (index === totalHops - 1) return '대상 서버';
    return `중간 서버 ${index}`;
  };

  return (
    <Modal
      title={
        <Space>
          <ToolOutlined />
          Velero 빠른 설치
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={550}
      footer={null}
      maskClosable={!isInstalling}
      closable={!isInstalling}
    >
      <div style={{ padding: '8px 0' }}>
        {/* 선택된 인프라 정보 */}
        <Card size='small' style={{ marginBottom: 16, background: '#f5f5f5' }}>
          <Space direction='vertical' size={4}>
            <Space>
              <ClusterOutlined />
              <Text strong>설치 대상:</Text>
              <Text>{selectedInfra?.name}</Text>
              <Tag color={isExternalInfra ? 'geekblue' : 'blue'}>
                {isExternalInfra ? '외부 K8s' : 'K8s'}
              </Tag>
            </Space>
            {masterServer && (
              <Space>
                <CloudServerOutlined />
                <Text type='secondary'>
                  마스터 노드: {masterServer.server_name}
                </Text>
              </Space>
            )}
          </Space>
        </Card>

        {/* 설치 상태 표시 */}
        {isCheckingStatus ? (
          <Alert
            message={
              <Space>
                <Spin size='small' />
                <span>설치 상태 확인 중...</span>
              </Space>
            }
            type='info'
            style={{ marginBottom: 16 }}
          />
        ) : currentStatus === 'active' ? (
          <Alert
            message='Velero 설치 완료'
            description={
              <div>
                <p>Velero가 이미 설치되어 있습니다.</p>
                <Space style={{ marginTop: 8 }}>
                  <Tag color='success'>Velero: 활성</Tag>
                  {connectedStorageId && (
                    <Tag color='blue'>
                      연결된 저장소:{' '}
                      {externalStorages.find(s => s.id === connectedStorageId)
                        ?.name || `ID: ${connectedStorageId}`}
                    </Tag>
                  )}
                </Space>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  아래 <strong>&quot;백업 생성하기&quot;</strong> 버튼을
                  클릭하여 백업을 생성하세요.
                </p>
              </div>
            }
            type='success'
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : currentStatus === 'installing' ? (
          <Alert
            message='설치 진행 중'
            description={
              <div>
                <p>
                  현재 Velero 설치가 진행 중입니다. 완료까지 2-5분이 소요될 수
                  있습니다.
                </p>
                <Space style={{ marginTop: 8 }}>
                  <Tag color='processing'>Velero: 설치 중...</Tag>
                </Space>
                <p style={{ marginTop: 8, marginBottom: 0, color: '#faad14' }}>
                  <strong>주의:</strong> 설치 완료 전까지 재설치하지 마세요.
                </p>
              </div>
            }
            type='warning'
            showIcon
            icon={<Spin size='small' />}
            style={{ marginBottom: 16 }}
          />
        ) : currentStatus === 'error' ? (
          <Alert
            message='설치 오류'
            description={
              <div>
                <p>이전 Velero 설치에서 오류가 발생했습니다.</p>
                <Space style={{ marginTop: 8 }}>
                  <Tag color='error'>Velero: 오류</Tag>
                </Space>
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  재설치를 시도하여 문제를 해결할 수 있습니다.
                </p>
              </div>
            }
            type='error'
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            message='Velero 백업 엔진 설치'
            description={
              <div>
                <p>
                  <strong>Velero</strong>는 Kubernetes 클러스터의 백업/복구를
                  담당하는 엔진입니다.
                </p>
                <p style={{ marginTop: 8 }}>
                  설치하려면 먼저 <strong>외부 저장소를 선택</strong>하고, SSH
                  비밀번호를 입력하세요.
                </p>
                <p style={{ marginBottom: 0, color: '#666' }}>
                  외부 저장소가 없다면 먼저{' '}
                  <strong>백업 관리 &gt; 외부 저장소</strong> 탭에서 등록하세요.
                </p>
              </div>
            }
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 외부 저장소 선택 - 미설치 또는 오류 상태일 때만 표시 */}
        {(currentStatus === 'not_installed' || currentStatus === 'error') &&
          !isCheckingStatus && (
            <div style={{ marginBottom: 16 }}>
              <Divider orientation='left' plain>
                <Space>
                  <DatabaseOutlined />
                  외부 저장소 선택
                </Space>
              </Divider>

              {loadingStorages ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Spin size='small' />
                  <Text type='secondary' style={{ marginLeft: 8 }}>
                    저장소 목록 로딩 중...
                  </Text>
                </div>
              ) : externalStorages.length === 0 ? (
                <Alert
                  message='등록된 외부 저장소가 없습니다'
                  description={
                    <div>
                      <p>
                        Velero를 설치하려면 먼저 외부 저장소(MinIO/S3)를
                        등록해야 합니다.
                      </p>
                      {onOpenMinioRegistration ? (
                        <Button
                          type='primary'
                          size='small'
                          icon={<CloudServerOutlined />}
                          onClick={() => {
                            onCancel();
                            onOpenMinioRegistration();
                          }}
                          style={{ marginTop: 8 }}
                        >
                          외부 저장소 등록하기
                        </Button>
                      ) : (
                        <p style={{ marginTop: 8, marginBottom: 0 }}>
                          <strong>백업 관리 &gt; 외부 저장소</strong> 탭에서
                          저장소를 먼저 등록하세요.
                        </p>
                      )}
                    </div>
                  }
                  type='warning'
                  showIcon
                />
              ) : (
                <Select
                  placeholder='연결할 외부 저장소를 선택하세요'
                  style={{ width: '100%' }}
                  size='large'
                  value={selectedStorageId}
                  onChange={value => setSelectedStorageId(value)}
                  disabled={isInstalling}
                  showSearch
                  optionFilterProp='label'
                >
                  {externalStorages.map(storage => (
                    <Option
                      key={storage.id}
                      value={storage.id}
                      label={storage.name}
                    >
                      <Space>
                        <CloudServerOutlined />
                        <span>{storage.name}</span>
                        <Tag color='green'>{storage.endpoint}</Tag>
                        <Tag color='blue'>{storage.type}</Tag>
                      </Space>
                    </Option>
                  ))}
                </Select>
              )}

              {selectedStorageId && (
                <Alert
                  message={
                    <Space>
                      <span>선택된 저장소:</span>
                      <Tag color='blue'>
                        {
                          externalStorages.find(s => s.id === selectedStorageId)
                            ?.name
                        }
                      </Tag>
                      <Tag color='green'>
                        {
                          externalStorages.find(s => s.id === selectedStorageId)
                            ?.endpoint
                        }
                      </Tag>
                    </Space>
                  }
                  type='success'
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
          )}

        {/* SSH 접속 정보 폼 - 이미 설치된 경우 숨김 */}
        {currentStatus !== 'active' && !isCheckingStatus && (
          <Form form={form} layout='vertical'>
            <Title level={5} style={{ marginBottom: 16 }}>
              <LockOutlined /> SSH 접속 정보
            </Title>

            {parsedHops.length === 0 ? (
              <Alert
                message='SSH 접속 정보 없음'
                description='서버에 등록된 SSH 접속 정보가 없습니다. 서버 설정을 확인해주세요.'
                type='warning'
                showIcon
              />
            ) : (
              parsedHops.map((hop, index) => (
                <Card
                  key={index}
                  size='small'
                  style={{
                    marginBottom: 12,
                    background:
                      index === parsedHops.length - 1 ? '#f6ffed' : '#fafafa',
                  }}
                  title={
                    <Space>
                      <ApiOutlined />
                      <span>{getHopLabel(index, parsedHops.length)}</span>
                      {index === parsedHops.length - 1 && (
                        <Tag color='green' style={{ marginLeft: 8 }}>
                          최종 대상
                        </Tag>
                      )}
                    </Space>
                  }
                >
                  {/* 호스트:포트 (읽기 전용) */}
                  <Space style={{ marginBottom: 12, width: '100%' }}>
                    <Text type='secondary'>접속 주소:</Text>
                    <Tag color='blue' style={{ fontSize: 13 }}>
                      {hop.host}:{hop.port}
                    </Tag>
                  </Space>

                  {/* 사용자명 (입력 가능) */}
                  <Form.Item
                    name={`username_${index}`}
                    label='사용자명'
                    rules={[
                      { required: true, message: '사용자명을 입력해주세요' },
                    ]}
                    initialValue={hop.username}
                    style={{ marginBottom: 8 }}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder='예: root, tomcat'
                      disabled={isInstalling}
                    />
                  </Form.Item>

                  {/* 비밀번호 (입력 필요) */}
                  <Form.Item
                    name={`password_${index}`}
                    label='비밀번호'
                    rules={[
                      { required: true, message: '비밀번호를 입력해주세요' },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder='SSH 비밀번호'
                      disabled={isInstalling}
                    />
                  </Form.Item>
                </Card>
              ))
            )}

            {parsedHops.length > 1 && (
              <Alert
                message={
                  <Space>
                    <ApiOutlined />
                    <span>
                      연결 경로: {parsedHops.map(h => `${h.host}`).join(' → ')}
                    </span>
                  </Space>
                }
                type='info'
                style={{ marginTop: 8 }}
              />
            )}
          </Form>
        )}

        {/* 설치 진행 상태 */}
        {isInstalling && (
          <Alert
            message={
              <Space>
                <Spin size='small' />
                <span>{installProgress}</span>
              </Space>
            }
            type='warning'
            style={{ marginTop: 16 }}
          />
        )}

        {/* 버튼 영역 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 16,
          }}
        >
          <Button
            onClick={() => {
              // Velero가 이미 설치된 상태면 onSuccess 호출 (백업 모달 재오픈)
              if (currentStatus === 'active') {
                onSuccess();
              } else {
                onCancel();
              }
            }}
            disabled={isInstalling}
            type={currentStatus === 'active' ? 'primary' : 'default'}
          >
            {currentStatus === 'active' ? '백업 생성하기' : '취소'}
          </Button>
          {currentStatus !== 'active' && (
            <Button
              type='primary'
              icon={<ToolOutlined />}
              onClick={handleInstall}
              loading={isInstalling}
              disabled={
                isCheckingStatus ||
                currentStatus === 'installing' ||
                parsedHops.length === 0 ||
                !selectedStorageId ||
                externalStorages.length === 0
              }
            >
              {currentStatus === 'installing'
                ? '설치 진행 중...'
                : currentStatus === 'error'
                  ? '재설치'
                  : 'Velero 설치'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SimpleVeleroInstallModal;
