import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Table,
  Tag,
  Modal,
  Spin,
  Typography,
  Select,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { InfraWithNodes, Infrastructure } from '../../types/infra';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useBackupAuthHandler } from '../../pages/backup/BackupAuthHandler';
import { SshAuthHop } from '../../types/backup';
import { awxApi, backupApi } from '../../lib/api';

interface InfraVeleroSettingProps {
  infra: InfraWithNodes;
}

export interface Environment {
  id?: number;
  infra_id?: number;
  type: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  bucket?: string;
  status: 'active' | 'installing' | 'failed' | 'inactive';
  connected_minio_id?: number;
  created_at?: string;
  updated_at?: string;
  // 추가 UI 표시용 필드들
  name?: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  namespace?: string;
  kubernetesClusterName?: string;
}

interface KubernetesInfra {
  id: number;
  name: string;
  type: string;
  info: string;
  created_at?: string;
  updated_at?: string;
}

interface VeleroInstallForm {
  environmentName: string;
  kubernetesInfraId: number;
  namespace: string;
}

interface MinioStorage {
  id?: number;
  infra_id?: number;
  server_id?: number;
  name?: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  bucket?: string;
  status?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
}

interface MinioConnectionForm {
  minioStorageId: number;
  bucketName: string;
}

const InfraVeleroSetting: React.FC<InfraVeleroSettingProps> = ({
  infra: _infra,
}) => {
  const [setupForm] = Form.useForm();
  const { user } = useAuth();

  // 상태 관리
  const [veleroEnvironments, setVeleroEnvironments] = useState<Environment[]>(
    []
  );
  const [kubernetesInfras, setKubernetesInfras] = useState<KubernetesInfra[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [k8sLoading, setK8sLoading] = useState(false);
  const [isInstallModalVisible, setIsInstallModalVisible] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  const [selectedClusterHops, setSelectedClusterHops] = useState<any[]>([]);

  const [infraServers, setInfraServers] = useState<Map<number, any[]>>(
    new Map()
  );
  const [deletingEnv, setDeletingEnv] = useState(false);
  const [isMinioConnectionModalVisible, setIsMinioConnectionModalVisible] =
    useState(false);
  const [minioConnectionForm] = Form.useForm();
  const [selectedVeleroEnv, setSelectedVeleroEnv] =
    useState<Environment | null>(null);
  const [minioStorages, setMinioStorages] = useState<MinioStorage[]>([]);
  const [minioLoading, setMinioLoading] = useState(false);

  // 특정 인프라(쿠버네티스 클러스터)의 마스터 노드 hops 정보를 가져오는 함수

  const getInfraMasterNodeHops = async (infraId: number): Promise<any[]> => {
    try {
      let servers = infraServers.get(infraId);

      if (!servers) {
        servers = await loadInfraServers(infraId);
      }

      const masterNode = servers.find((node: any) => {
        if (node.infra_id !== infraId) return false;

        const nodeType: string | undefined = node.type;
        return (
          nodeType === 'master' ||
          (typeof nodeType === 'string' && nodeType.includes('master'))
        );
      });

      if (!masterNode?.hops) return [];

      const parsedHops =
        typeof masterNode.hops === 'string'
          ? (JSON.parse(masterNode.hops) as any[])
          : (masterNode.hops as any[]);

      return Array.isArray(parsedHops) ? parsedHops : [parsedHops];
    } catch (_error) {
      return [];
    }
  };

  // 특정 인프라의 서버 정보를 로드하는 함수

  const loadInfraServers = async (infraId: number): Promise<any[]> => {
    const existingServers = infraServers.get(infraId);
    if (existingServers) {
      return existingServers;
    }

    try {
      const response = await api.infra.listServers(infraId);

      const serverList = (response.data?.data ?? []) as any[];
      setInfraServers(prev => new Map(prev).set(infraId, serverList));
      return serverList;
    } catch (_error) {
      return [];
    }
  };

  // Kubernetes 인프라 목록 로드
  const loadKubernetesInfras = useCallback(async () => {
    setK8sLoading(true);
    try {
      // 실제 API 호출 - 전체 인프라 목록에서 Kubernetes 타입만 필터링
      const response = await api.infra.list();
      const allInfras = (response.data?.data || []) as Infrastructure[];

      // 백업이 가능한 인프라만 필터링 (kubernetes 타입만)
      const filteredInfras = allInfras.filter(
        (infra: Infrastructure) =>
          infra.type === 'kubernetes' || infra.type === 'external_kubernetes'
      );

      // 각 인프라의 서버 정보도 함께 로드하여 마스터 노드 IP 확인
      const kubernetesInfras: KubernetesInfra[] = [];
      for (const infraItem of filteredInfras) {
        try {
          const serversResponse = await api.infra.listServers(infraItem.id);
          const servers = serversResponse.data?.data || [];

          // 마스터 노드 찾기

          const masterServer = servers.find(
            (server: any) =>
              server.type === 'master' ||
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              (server.type && server.type.includes('master'))
          );

          if (masterServer) {
            kubernetesInfras.push({
              id: infraItem.id,
              name: infraItem.name,
              type: infraItem.type,
              info: infraItem.info || 'unknown',
              created_at: infraItem.created_at || 'unknown',
              updated_at: infraItem.updated_at || 'unknown',
            });
          }
        } catch (_serverError) {
          // 서버 정보 로드 실패 시에도 기본 정보는 포함
          kubernetesInfras.push({
            id: infraItem.id,
            name: infraItem.name,
            type: infraItem.type,
            info: infraItem.info || 'unknown',
            created_at: infraItem.created_at || 'unknown',
            updated_at: infraItem.updated_at || 'unknown',
          });
        }
      }

      setKubernetesInfras(kubernetesInfras);
    } catch (_error) {
      message.error('Kubernetes 인프라 목록을 불러오는데 실패했습니다.');
      setKubernetesInfras([]);
    } finally {
      setK8sLoading(false);
    }
  }, []);

  // Velero 환경 목록 로드
  const loadVeleroEnvironments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await backupApi.getEnvironments('velero');
      setVeleroEnvironments(response.data);
    } catch (_error) {
      message.error('백업 환경 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // MinIO 저장소 목록 로드
  const loadMinioStorages = useCallback(async () => {
    setMinioLoading(true);
    try {
      const response = await backupApi.getEnvironments('minio');

      setMinioStorages(response.data as MinioStorage[]);
    } catch (_error) {
      message.error('MinIO 저장소 목록을 불러오는데 실패했습니다.');
    } finally {
      setMinioLoading(false);
    }
  }, []);

  // 새 Velero 설치
  const handleInstallVelero = async (values: VeleroInstallForm) => {
    setInstallLoading(true);
    try {
      // 선택된 Kubernetes 인프라 정보 찾기
      const selectedK8s = kubernetesInfras.find(
        k8s => k8s.id === values.kubernetesInfraId
      );

      if (!selectedK8s) {
        message.error('선택된 클러스터 정보를 찾을 수 없습니다.');
        return;
      }

      // 마스터 노드 hops 정보 가져오기 (사용자가 수정한 정보 사용)
      const masterHops =
        selectedClusterHops.length > 0
          ? selectedClusterHops
          : await getInfraMasterNodeHops(values.kubernetesInfraId);

      if (masterHops.length > 0) {
        // SSH 인증 모달 열기

        requestNamespaceAuth(masterHops, 'velero_install', values);
      } else {
        // SSH 인증이 필요 없는 경우 직접 설치
        await handleVeleroInstallAuthSuccess([], values);
      }
    } catch (_error) {
      message.error('Velero 설치 중 오류가 발생했습니다.');
      setInstallLoading(false);
    }
  };

  // Auth handler hook
  const { requestNamespaceAuth, AuthModal } = useBackupAuthHandler({
    onAuthSuccess: (
      authData: SshAuthHop[],
      purpose: string,
      formData?: unknown
    ) => {
      if (purpose === 'velero_install') {
        void handleVeleroInstallAuthSuccess(
          authData,
          formData as VeleroInstallForm
        );
      } else if (purpose === 'bucket-config') {
        void handleVeleroBucketConfigAuthSuccess(
          authData,
          formData as Environment
        );
      } else if (purpose === 'velero_uninstall') {
        void handleVeleroDeleteAuthSuccess(authData, formData as Environment);
      }
    },
    onAuthCancel: () => {
      setInstallLoading(false);
    },
  });

  // Velero 설치 인증 성공 후 처리
  const handleVeleroInstallAuthSuccess = async (
    authData: SshAuthHop[],
    values: VeleroInstallForm
  ) => {
    try {
      const selectedK8s = kubernetesInfras.find(
        k8s => k8s.id === values.kubernetesInfraId
      );

      // playbook 호출 전 사용자가 입력한 비밀번호와 authData 속 비밀번호를 비교
      if (selectedClusterHops.length > 0 && authData.length > 0) {
        const passwordMismatch = selectedClusterHops.some((userHop, index) => {
          const authHop = authData[index];
          if (!authHop || !userHop) return false;

          // 사용자가 입력한 비밀번호와 인증 데이터의 비밀번호가 다른 경우
          return (
            userHop.password &&
            authHop.password &&
            userHop.password !== authHop.password
          );
        });

        if (passwordMismatch) {
          message.error(
            '인증 실패: ssh 접속에 실패하였습니다. 다시 시도해 주세요.'
          );
          setInstallLoading(false);
          return; // playbook 호출 중단
        }
      }

      message.success(
        `${selectedK8s?.name || 'Kubernetes 클러스터'}에 Velero 설치가 시작되었습니다.`
      );
      setIsInstallModalVisible(false);
      setupForm.resetFields();
      setSelectedCluster(null);
      setSelectedClusterHops([]);

      void (await awxApi.runPlaybook({
        playbook_to_run: 'install_velero',
        hops: authData,
        awxTemplate: user?.awx_template || 0,
      }));
      // 결과 로그 출력

      // db 저장 api 호출 // -------------------------------------------------------------------------------------------
      const backupStorageData: Environment = {
        infra_id: values.kubernetesInfraId,
        name: values.environmentName,
        type: 'velero', // 현재는 velero 타입으로 고정
        access_key: '', // playbook에서 자동 생성된 MinIO 액세스 키를 나중에 업데이트할 수 있습니다.
        secret_key: '', // playbook에서 자동 생성된 MinIO 시크릿 키를 나중에 업데이트할 수 있습니다.
        status: 'active', // 초기 상태를 active로 설정
      };

      // 같은 infra_id의 velero 환경이 있다면 기존의 컬럼 업데이트
      const existingEnv = await backupApi.getMinIOByInfraId(
        values.kubernetesInfraId,
        'velero'
      );
      if (existingEnv && existingEnv.id) {
        await backupApi.updateBackupStorage({
          id: existingEnv.id,
          name: backupStorageData.name,
          access_key: backupStorageData.access_key,
          secret_key: backupStorageData.secret_key,
          status: backupStorageData.status,
        });
      } else if (backupStorageData.infra_id) {
        await backupApi.createBackupStorage({
          infra_id: backupStorageData.infra_id,
          name: backupStorageData.name || '',
          type: 'velero',
          access_key: backupStorageData.access_key,
          secret_key: backupStorageData.secret_key,
        });
      }

      // 목록 새로고침
      setTimeout(() => void loadVeleroEnvironments(), 2000);
    } catch (_error) {
      message.error('Velero 설치에 실패했습니다.');
    } finally {
      setInstallLoading(false);
    }
  };

  // Velero-MinIO 연결 모달 열기
  const handleVeleroMinioConnection = async (environment: Environment) => {
    try {
      setSelectedVeleroEnv(environment);
      setIsMinioConnectionModalVisible(true);

      // MinIO 저장소 목록 로드
      await loadMinioStorages();

      // 기존에 연결된 MinIO 정보가 있다면 폼에 설정
      if (environment.connected_minio_id && environment.bucket) {
        minioConnectionForm.setFieldsValue({
          minioStorageId: environment.connected_minio_id,
          bucketName: environment.bucket,
        });
      }
    } catch (_error) {
      message.error('MinIO 연결 설정을 불러오는데 실패했습니다.');
    }
  };

  // MinIO 연결 처리
  const handleMinioConnection = async (values: MinioConnectionForm) => {
    try {
      if (!selectedVeleroEnv) return;

      // 선택된 MinIO 저장소 정보 찾기
      const selectedMinioStorage = minioStorages.find(
        storage => storage.id === values.minioStorageId
      );
      if (!selectedMinioStorage) {
        message.error('선택된 MinIO 저장소를 찾을 수 없습니다.');
        return;
      }

      // 연결 정보를 Velero 환경에 추가
      const connectionData: Environment = {
        ...selectedVeleroEnv,
        endpoint: selectedMinioStorage.endpoint,
        bucket: values.bucketName,
        access_key: selectedMinioStorage.access_key,
        secret_key: selectedMinioStorage.secret_key,
        connected_minio_id: selectedMinioStorage.id,
      };

      const masterHops =
        selectedClusterHops.length > 0
          ? selectedClusterHops
          : await getInfraMasterNodeHops(selectedVeleroEnv.infra_id);

      if (masterHops.length > 0) {
        requestNamespaceAuth(masterHops, 'bucket-config', connectionData);
      } else {
        await handleVeleroBucketConfigAuthSuccess([], connectionData);
      }

      // 모달 닫기
      setIsMinioConnectionModalVisible(false);
      minioConnectionForm.resetFields();
      setSelectedVeleroEnv(null);
    } catch (_error) {
      message.error('MinIO 연결 중 오류가 발생했습니다.');
    }
  };

  const handleVeleroBucketConfigAuthSuccess = async (
    authData: SshAuthHop[],
    environment: Environment
  ) => {
    try {
      // playbook 호출 전 사용자가 입력한 비밀번호와 authData 속 비밀번호를 비교
      if (selectedClusterHops.length > 0 && authData.length > 0) {
        const passwordMismatch = selectedClusterHops.some((userHop, index) => {
          const authHop = authData[index];
          if (!authHop || !userHop) return false;

          // 사용자가 입력한 비밀번호와 인증 데이터의 비밀번호가 다른 경우
          return (
            userHop.password &&
            authHop.password &&
            userHop.password !== authHop.password
          );
        });

        if (passwordMismatch) {
          message.error(
            '인증 실패: ssh 접속에 실패하였습니다. 다시 시도해 주세요.'
          );
          return; // playbook 호출 중단
        }
      }

      const response = await awxApi.runPlaybook({
        playbook_to_run: 'configure_velero_storage',
        hops: authData,
        awxTemplate: user?.awx_template || 0,
        minio_endpoint: 'http://' + environment.endpoint,
        minio_bucket_name: environment.bucket,
      });

      if (response.success) {
        // 결과 로그 출력

        message.success('Velero 백업로케이션 연결이 완료되었습니다.');

        // db에서 환경 정보 업데이트
        const updatedEnv: Environment = {
          ...environment,
          endpoint: environment.endpoint,
          bucket: environment.bucket,
          connected_minio_id: environment.connected_minio_id,
        };

        await backupApi.updateBackupLocation(updatedEnv);

        setTimeout(() => void loadVeleroEnvironments(), 2000);
      } else {
        message.error('Velero 백업로케이션 연결에 실패했습니다.');
      }
    } catch (_error) {
      message.error('Velero 백업로케이션 연결에 실패했습니다.');
    }
  };

  // Velero 환경 삭제
  const handleDeleteEnvironment = async (environment: Environment) => {
    try {
      const masterHops =
        selectedClusterHops.length > 0
          ? selectedClusterHops
          : await getInfraMasterNodeHops(environment.infra_id);

      if (masterHops.length > 0) {
        requestNamespaceAuth(masterHops, 'velero_uninstall', environment);
      } else {
        await handleVeleroDeleteAuthSuccess([], environment);
      }
    } catch (_error) {
      message.error('Velero 환경 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleVeleroDeleteAuthSuccess = async (
    authData: SshAuthHop[],
    environment: Environment
  ) => {
    setDeletingEnv(true);
    try {
      // playbook 호출 전 사용자가 입력한 비밀번호와 authData 속 비밀번호를 비교
      if (selectedClusterHops.length > 0 && authData.length > 0) {
        const passwordMismatch = selectedClusterHops.some((userHop, index) => {
          const authHop = authData[index];
          if (!authHop || !userHop) return false;

          // 사용자가 입력한 비밀번호와 인증 데이터의 비밀번호가 다른 경우
          return (
            userHop.password &&
            authHop.password &&
            userHop.password !== authHop.password
          );
        });

        if (passwordMismatch) {
          message.error(
            '인증 실패: ssh 접속에 실패하였습니다. 다시 시도해 주세요.'
          );
          return; // playbook 호출 중단
        }
      }

      message.success(
        `${environment.name || `velero-env-${environment.id}`} 환경 삭제가 시작되었습니다.`
      );

      const response = await awxApi.runPlaybook({
        playbook_to_run: 'uninstall_velero',
        hops: authData,
        awxTemplate: user?.awx_template || 0,
      });

      if (response.success) {
        message.success('Velero 환경 삭제가 완료되었습니다.');

        // db에서 환경 정보 삭제
        await backupApi.deleteEnvironment(environment.id);

        setTimeout(() => void loadVeleroEnvironments(), 2000);
      } else {
        message.error('Velero 환경 삭제에 실패했습니다.');
      }

      setDeletingEnv(false);
    } catch (_error) {
      message.error('Velero 환경 삭제에 실패했습니다.');
      setDeletingEnv(false);
    }
  };

  // 모달이 열릴 때 Kubernetes 인프라 목록 로드
  useEffect(() => {
    if (isInstallModalVisible) {
      void loadKubernetesInfras();
    }
  }, [isInstallModalVisible, loadKubernetesInfras]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    void loadVeleroEnvironments();
  }, [loadVeleroEnvironments]);

  // Velero 환경 테이블 컬럼 정의
  const veleroEnvironmentColumns = [
    {
      title: '환경 이름',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
        </div>
      ),
    },
    {
      title: '클러스터',
      dataIndex: 'kubernetesClusterName',
      key: 'kubernetesClusterName',
      render: (text: string, record: Environment) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
            {record.kubernetesClusterName || `클러스터 ID: ${record.infra_id}`}
          </div>
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'success', text: '활성' },
          installing: { color: 'processing', text: '설치 중' },
          failed: { color: 'error', text: '실패' },
          inactive: { color: 'default', text: '비활성' },
        };
        const config =
          statusConfig[status as keyof typeof statusConfig] ||
          statusConfig.inactive;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '엔드포인트',
      key: 'endpoint',
      render: (_: unknown, record: Environment) => (
        <div>
          {record.endpoint && (
            <div style={{ fontSize: '13px' }}>{record.endpoint}</div>
          )}
        </div>
      ),
    },
    {
      title: '버킷',
      dataIndex: 'bucket',
      key: 'bucket',
      render: (bucket: string) => (
        <div>
          <div style={{ fontFamily: 'monospace', color: '#1890ff' }}>
            {bucket || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div style={{ fontSize: '13px' }}>
          {new Date(date).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ),
    },
    {
      title: '수정일',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => (
        <div style={{ fontSize: '13px' }}>
          {new Date(date).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: unknown, record: Environment) => (
        <Space>
          <Button
            size='small'
            icon={<LinkOutlined />}
            onClick={() => handleVeleroMinioConnection(record)}
            title='버킷 연결'
          />
          <Button
            size='small'
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (deletingEnv) return;

              Modal.confirm({
                title: 'Velero 환경 삭제',
                content: `${record.name || `velero-env-${record.id}`} 환경을 삭제하시겠습니까?`,
                onOk: () => handleDeleteEnvironment(record),
              });
            }}
            title={deletingEnv ? '삭제 중...' : '삭제'}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* 새 Velero 설치 버튼 */}
      <Card style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Velero 설치
            </Typography.Title>
            <Typography.Text type='secondary'>
              Kubernetes 클러스터에 Velero 백업 시스템을 설치할 수 있습니다.
            </Typography.Text>
          </div>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            loading={installLoading}
            disabled={installLoading}
            onClick={() => setIsInstallModalVisible(true)}
          >
            {installLoading ? 'Velero 설치 중...' : 'Velero 설치'}
          </Button>
        </div>
      </Card>

      {/* 기존 Velero 환경 목록 */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            Velero 환경 목록
          </Typography.Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void loadVeleroEnvironments()}
          >
            새로고침
          </Button>
        </div>
        <Table
          columns={veleroEnvironmentColumns}
          dataSource={veleroEnvironments}
          loading={loading}
          rowKey='id'
          size='small'
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Velero 설치 모달 */}
      <Modal
        title='Velero 설치'
        open={isInstallModalVisible}
        onCancel={() => {
          setIsInstallModalVisible(false);
          setupForm.resetFields();
          setSelectedCluster(null);
          setSelectedClusterHops([]);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Typography.Text type='secondary'>
            Kubernetes 클러스터에 Velero 백업 시스템을 설치합니다.
          </Typography.Text>
        </div>

        {installLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size='large' />
            <div style={{ marginTop: '16px' }}>
              <Typography.Text>Velero를 설치하고 있습니다...</Typography.Text>
            </div>
          </div>
        ) : (
          <Form
            form={setupForm}
            layout='vertical'
            onFinish={handleInstallVelero}
          >
            <Form.Item
              label='환경 이름'
              name='environmentName'
              rules={[{ required: true, message: '환경 이름을 입력해 주세요' }]}
            >
              <Input placeholder='예: production-velero' />
            </Form.Item>

            <Form.Item
              label='네임스페이스'
              name='namespace'
              initialValue='velero'
              rules={[
                { required: true, message: '네임스페이스를 입력해 주세요' },
              ]}
            >
              <Input placeholder='velero' />
            </Form.Item>

            <Form.Item
              label='Kubernetes 클러스터'
              name='kubernetesInfraId'
              rules={[
                {
                  required: true,
                  message: 'Kubernetes 클러스터를 선택해 주세요',
                },
              ]}
            >
              <Select
                placeholder='Velero를 설치할 Kubernetes 클러스터를 선택하세요'
                loading={k8sLoading}
                notFoundContent={
                  k8sLoading ? (
                    <Spin size='small' />
                  ) : (
                    '사용 가능한 Kubernetes 클러스터가 없습니다'
                  )
                }
                onChange={async (value: number) => {
                  setSelectedCluster(value);
                  try {
                    await loadInfraServers(value);
                    const hops = await getInfraMasterNodeHops(value);
                    setSelectedClusterHops(hops);
                  } catch (_error) {
                    setSelectedClusterHops([]);
                  }
                }}
              >
                {kubernetesInfras.map(k8s => (
                  <Select.Option key={k8s.id} value={k8s.id}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{k8s.name}</div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* SSH 연결 경로 표시 및 수정 */}
            {selectedCluster && selectedClusterHops.length > 0 && (
              <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                <Typography.Text
                  strong
                  style={{ display: 'block', marginBottom: '12px' }}
                >
                  SSH 연결 경로:
                </Typography.Text>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px',
                  }}
                >
                  {selectedClusterHops.map((hop: SshAuthHop, index: number) => (
                    <div
                      key={index}
                      style={{
                        marginBottom:
                          index < selectedClusterHops.length - 1 ? '16px' : '0',
                        padding: '12px',
                        backgroundColor: '#fff',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                      }}
                    >
                      <div
                        style={{
                          marginBottom: '8px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                      >
                        Hop {index + 1}{' '}
                        {index === selectedClusterHops.length - 1 &&
                          '(최종 목적지)'}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: 'block',
                              marginBottom: '4px',
                              fontSize: '12px',
                              color: '#666',
                            }}
                          >
                            호스트:
                          </span>
                          <Input
                            value={hop.host || ''}
                            onChange={e => {
                              const updatedHops = [
                                ...selectedClusterHops,
                              ] as SshAuthHop[];
                              updatedHops[index] = {
                                ...hop,
                                host: e.target.value,
                              };
                              setSelectedClusterHops(updatedHops);
                            }}
                            placeholder='IP 주소 또는 도메인'
                            size='small'
                          />
                        </div>

                        <div>
                          <span
                            style={{
                              display: 'block',
                              marginBottom: '4px',
                              fontSize: '12px',
                              color: '#666',
                            }}
                          >
                            포트:
                          </span>
                          <Input
                            value={hop.port || ''}
                            onChange={e => {
                              const updatedHops = [
                                ...selectedClusterHops,
                              ] as SshAuthHop[];
                              updatedHops[index] = {
                                ...hop,
                                port: parseInt(e.target.value, 10) || 22,
                              };
                              setSelectedClusterHops(updatedHops);
                            }}
                            placeholder='22'
                            size='small'
                            type='number'
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px',
                          marginTop: '12px',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: 'block',
                              marginBottom: '4px',
                              fontSize: '12px',
                              color: '#666',
                            }}
                          >
                            사용자명:
                          </span>
                          <Input
                            value={hop.username || ''}
                            onChange={e => {
                              const updatedHops = [
                                ...selectedClusterHops,
                              ] as SshAuthHop[];
                              updatedHops[index] = {
                                ...hop,
                                username: e.target.value,
                              };
                              setSelectedClusterHops(updatedHops);
                            }}
                            placeholder='root'
                            size='small'
                          />
                        </div>

                        <div>
                          <span
                            style={{
                              display: 'block',
                              marginBottom: '4px',
                              fontSize: '12px',
                              color: '#666',
                            }}
                          >
                            비밀번호:
                          </span>
                          <Input.Password
                            value={hop.password || ''}
                            onChange={e => {
                              const updatedHops = [
                                ...selectedClusterHops,
                              ] as SshAuthHop[];
                              updatedHops[index] = {
                                ...hop,
                                password: e.target.value,
                              };
                              setSelectedClusterHops(updatedHops);
                            }}
                            placeholder='비밀번호'
                            size='small'
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SSH 정보가 없는 경우 안내 메시지 */}
            {selectedCluster && selectedClusterHops.length === 0 && (
              <div
                style={{
                  marginTop: '24px',
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '6px',
                }}
              >
                <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
                  ⚠️ 선택된 클러스터에 SSH 접속 정보가 설정되지 않았습니다.
                </Typography.Text>
              </div>
            )}

            <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={() => {
                    setIsInstallModalVisible(false);
                    setupForm.resetFields();
                    setSelectedCluster(null);
                    setSelectedClusterHops([]);
                  }}
                >
                  취소
                </Button>
                <Button type='primary' htmlType='submit'>
                  설치 시작
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* MinIO 연결 모달 */}
      <Modal
        title='Velero-MinIO 연결 설정'
        open={isMinioConnectionModalVisible}
        onCancel={() => {
          setIsMinioConnectionModalVisible(false);
          minioConnectionForm.resetFields();
          setSelectedVeleroEnv(null);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Typography.Text type='secondary'>
            {selectedVeleroEnv?.name}에 연결할 MinIO 저장소와 버킷을 선택하세요.
          </Typography.Text>
        </div>

        <Form
          form={minioConnectionForm}
          layout='vertical'
          onFinish={handleMinioConnection}
        >
          <Form.Item
            label='MinIO 저장소'
            name='minioStorageId'
            rules={[
              { required: true, message: 'MinIO 저장소를 선택해 주세요' },
            ]}
          >
            <Select
              placeholder='연결할 MinIO 저장소를 선택하세요'
              loading={minioLoading}
              notFoundContent={
                minioLoading ? (
                  <Spin size='small' />
                ) : (
                  '사용 가능한 MinIO 저장소가 없습니다'
                )
              }
            >
              {minioStorages
                .filter(storage => storage.status === 'active')
                .map(storage => (
                  <Select.Option key={storage.id} value={storage.id}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>
                        {storage.name || `MinIO-${storage.id}`}
                      </span>{' '}
                      |&nbsp;
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {storage.endpoint}
                      </span>
                    </div>
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            label='버킷 이름'
            name='bucketName'
            rules={[
              { required: true, message: '버킷 이름을 입력해 주세요' },
              {
                pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                message: '버킷 이름은 소문자, 숫자, 하이픈만 사용 가능합니다',
              },
            ]}
          >
            <Input
              placeholder='예: velero-backup-bucket'
              onChange={e => {
                // 소문자로 자동 변환
                const value = e.target.value.toLowerCase();
                minioConnectionForm.setFieldsValue({ bucketName: value });
              }}
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsMinioConnectionModalVisible(false);
                  minioConnectionForm.resetFields();
                  setSelectedVeleroEnv(null);
                }}
              >
                취소
              </Button>
              <Button type='primary' htmlType='submit'>
                연결하기
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 인증 모달 */}
      <AuthModal />
    </div>
  );
};

export default InfraVeleroSetting;
