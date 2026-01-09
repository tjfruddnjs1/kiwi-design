import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  Row,
  Col,
  message,
  Table,
  Tag,
  Modal,
  Tooltip,
  Popconfirm,
  Form,
  Input,
  Select,
  Alert,
  Checkbox,
  Divider,
  Radio,
  Tabs,
  Badge,
  Empty,
  Progress,
  Statistic,
  Spin,
} from 'antd';
import {
  CloudUploadOutlined,
  ReloadOutlined,
  EyeOutlined,
  HistoryOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  ContainerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  FileZipOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  AppstoreOutlined,
  StopOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  SetupWizardModal,
  RestoreFormModal,
  SimpleVeleroInstallModal,
  MinioStorageFormModal,
  ExternalStorageFormModal,
  InfraLinkModal,
  DockerBackupFormModal,
} from '../../components/backup';
import type {
  MinioStorageFormValues,
  ExternalStorageFormValues,
} from '../../components/backup';
import { useCredsStore } from '../../stores/useCredsStore';
import { useOrganization } from '../../context/OrganizationContext';
import useBackupDataManager from './BackupDataManager';
import useBackupStatusManager from './BackupStatusManager';
import { InstallWizardFormData } from './BackupDataManager';
import {
  BackupStorageWithInfra,
  Backup,
  Restore,
  SshAuthHop,
  CreateBackupParams,
  ExternalBackupStorage,
  InfraBackupStorageMapping,
  LinkInfraToStorageParams,
} from '../../types/backup';
import { backupApi } from '../../lib/api/endpoints/backup';
import { InfraItem } from '../../types/infra';
import { api } from '../../services/api';
import { useBackupAuthHandler } from './BackupAuthHandler';
import dayjs from 'dayjs';
import { getStatusColor, StatusType } from '../../utils/statusHelpers';
import { formatDate } from '../../utils/dateHelpers';
import {
  createDockerBackup,
  getDockerBackups,
  getDockerRestores,
  restoreDockerBackup,
  type CreateDockerBackupParams,
  type DockerBackup,
  type DockerRestore,
} from '../../lib/api/docker';
import { getServerHops } from '../../lib/api/infra';
import UnifiedBackupListView from './UnifiedBackupListView';
import DockerRestoreDetailModal from '../../components/backup/DockerRestoreDetailModal';
import '../../styles/common-management.css';

const { Title, Text } = Typography;
const { Option, OptGroup } = Select;

interface AllBackupData {
  backup: Backup;
  infraName: string;
  infraType: string;
  restores: Restore[];
  installStatus?: any; // 백업 환경 구축 상태 추가
}

interface GroupedBackupData {
  backupName: string;
  backups: AllBackupData[];
  totalRestores: number;
  lastRestoreDate?: string;
}

// 외부 저장소 브라우저용 통합 백업 타입
interface UnifiedStorageBackup {
  id: number;
  name: string;
  infra_id: number;
  infra_name: string;
  infra_type: string;
  runtime_type: 'kubernetes' | 'docker' | 'podman';
  status: string;
  size_bytes?: number;
  size?: string;
  storage_type: 'minio' | 'velero';
  storage_endpoint: string;
  storage_bucket: string;
  created_at: string;
  completed_at?: string;
  // Docker 백업 전용 필드
  backup_type?: string;
  containers?: string[];
  compose_project?: string;
}

const BackupPage: React.FC = () => {
  // 기관 컨텍스트
  const { selectedOrgId, isLoading: orgLoading } = useOrganization();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<string>('backups');

  // Modal states
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isBackupFormModalVisible, setIsBackupFormModalVisible] =
    useState(false);
  // Docker/Podman 백업 모달 상태
  const [isDockerBackupModalVisible, setIsDockerBackupModalVisible] =
    useState(false);
  const [dockerSshHops, setDockerSshHops] = useState<SshAuthHop[]>([]);

  // Docker 복구 이력 상세 모달 상태
  const [showDockerRestoreDetail, setShowDockerRestoreDetail] = useState(false);
  const [selectedDockerBackupForDetail, setSelectedDockerBackupForDetail] =
    useState<DockerBackup | null>(null);
  const [selectedDockerRestoresForDetail, setSelectedDockerRestoresForDetail] =
    useState<DockerRestore[]>([]);

  // Docker/Podman 백업 및 복구 데이터 (별도 관리)
  const [dockerBackups, _setDockerBackups] = useState<DockerBackup[]>([]);
  const [dockerRestores, _setDockerRestores] = useState<DockerRestore[]>([]);

  // 복구 상세 확인 모달 상태
  const [showRestoreResultModal, setShowRestoreResultModal] = useState(false);
  const [selectedRestoreResult, setSelectedRestoreResult] = useState<{
    id: number;
    type: 'k8s' | 'docker';
    backupName: string;
    infraName: string;
    infraType: string;
    status: string;
    targetNamespace?: string;
    targetProject?: string;
    createdAt: string;
    completedAt?: string;
    errorMessage?: string;
    // Docker/Podman 복구 옵션
    restoreVolumes?: boolean;
    restoreConfig?: boolean;
    redeploy?: boolean;
    stopExisting?: boolean;
  } | null>(null);
  const [selectedBackupGroup, setSelectedBackupGroup] =
    useState<GroupedBackupData | null>(null);
  const [selectedInfraForSetup, _setSelectedInfraForSetup] =
    useState<InfraItem | null>(null);
  const [selectedBackupForRestore, setSelectedBackupForRestore] =
    useState<Backup | null>(null);
  const [selectedInfraForBackup, setSelectedInfraForBackup] =
    useState<InfraItem | null>(null);
  const [masterHopsForBackup, setMasterHopsForBackup] = useState<any[]>([]);
  const [masterHopsForRestore, setMasterHopsForRestore] = useState<any[]>([]);
  const [infraTypeForRestore, setInfraTypeForRestore] = useState<string>('');
  const [allMinioStorages, setAllMinioStorages] = useState<
    BackupStorageWithInfra[]
  >([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  // Docker/Podman 백업용 상태
  const [dockerBackupType, setDockerBackupType] = useState<
    'full' | 'volume' | 'config' | 'compose'
  >('full');

  // K8s 인프라��� Velero 설치 상태 (true: 설치됨, false: 미설치, null: 확인중/미확인)
  const [veleroInstalled, setVeleroInstalled] = useState<boolean | null>(null);
  const [isCheckingVelero, setIsCheckingVelero] = useState(false);
  // Docker/Podman 인프라용 외부 저장소 연결 상태 (true: 연결됨, false: 미연결, null: 확인중/미확인)
  const [hasDockerExternalStorage, setHasDockerExternalStorage] = useState<
    boolean | null
  >(null);
  const [isCheckingDockerStorage, setIsCheckingDockerStorage] = useState(false);
  // 간소화된 Velero 설치 모달 상태
  const [isSimpleVeleroModalVisible, setIsSimpleVeleroModalVisible] =
    useState(false);
  const [serversForVeleroInstall, setServersForVeleroInstall] = useState<any[]>(
    []
  );
  const [infraForVeleroInstall, setInfraForVeleroInstall] =
    useState<InfraItem | null>(null);

  // MinIO 저장소 직접 등록 모달 상태
  const [isMinioStorageModalVisible, setIsMinioStorageModalVisible] =
    useState(false);
  const [isRegisteringMinioStorage, setIsRegisteringMinioStorage] =
    useState(false);

  // 외부 저장소 관리 상태
  const [isExternalStorageModalVisible, setIsExternalStorageModalVisible] =
    useState(false);
  const [isRegisteringExternalStorage, setIsRegisteringExternalStorage] =
    useState(false);
  const [externalStorages, setExternalStorages] = useState<
    ExternalBackupStorage[]
  >([]);
  const [_isLoadingExternalStorages, _setIsLoadingExternalStorages] =
    useState(false);

  // 인프라 연결 모달 상태
  const [isInfraLinkModalVisible, setIsInfraLinkModalVisible] = useState(false);
  const [selectedStorageForLink, setSelectedStorageForLink] =
    useState<ExternalBackupStorage | null>(null);
  const [linkedInfras, setLinkedInfras] = useState<InfraBackupStorageMapping[]>(
    []
  );
  const [isLoadingLinkedInfras, setIsLoadingLinkedInfras] = useState(false);

  // 저장소 모니터링 상태
  const [isRefreshingStorages, setIsRefreshingStorages] = useState(false);
  const [lastStorageRefresh, setLastStorageRefresh] = useState<Date | null>(
    null
  );

  // Docker/Podman 인프라 중 외부 저장소 미연결 인프라 목록 (전역 경고용)
  const [dockerInfrasWithoutStorage, setDockerInfrasWithoutStorage] = useState<
    InfraItem[]
  >([]);
  const [isCheckingGlobalStorageStatus, setIsCheckingGlobalStorageStatus] =
    useState(false);

  // 백업 브라우저 런타임 필터
  const [browserRuntimeFilter, setBrowserRuntimeFilter] = useState<
    'all' | 'kubernetes' | 'docker' | 'podman'
  >('all');

  // SSH 인증 모달 상태
  const [_sshCredentialModalVisible, _setSshCredentialModalVisible] =
    useState(false);
  const [_pendingSshHops, _setPendingSshHops] = useState<
    Array<{ host: string; port: number; username?: string }>
  >([]);
  const [_sshCredentialRetry, _setSshCredentialRetry] = useState(false);
  const [_pendingSshAction, _setPendingSshAction] = useState<{
    type: 'backup' | 'restore' | 'delete' | 'dockerBackup';
    data?: any;
  } | null>(null);
  const { _upsertServerByHostPort } = useCredsStore();

  // 선택된 인프라 타입 헬퍼
  const isKubernetesInfra = useMemo(() => {
    return (
      selectedInfraForBackup?.type === 'kubernetes' ||
      selectedInfraForBackup?.type === 'external_kubernetes'
    );
  }, [selectedInfraForBackup]);

  const isDockerInfra = useMemo(() => {
    const type = selectedInfraForBackup?.type;
    return (
      type === 'docker' ||
      type === 'external_docker' ||
      type === 'podman' ||
      type === 'external_podman'
    );
  }, [selectedInfraForBackup]);

  const isPodmanInfra = useMemo(() => {
    const type = selectedInfraForBackup?.type;
    return type === 'podman' || type === 'external_podman';
  }, [selectedInfraForBackup]);

  // Backup data states
  const [allBackups, setAllBackups] = useState<AllBackupData[]>([]);
  const allBackupsRef = useRef<AllBackupData[]>(allBackups);
  // allBackups가 변경될 때 ref도 업데이트
  useEffect(() => {
    allBackupsRef.current = allBackups;
  }, [allBackups]);
  const [groupedBackups, setGroupedBackups] = useState<GroupedBackupData[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // 백업 생성 진행 상태 추적
  const [creatingBackupInfo, setCreatingBackupInfo] = useState<{
    name: string;
    infraId: number;
    infraName: string;
    status: 'pending' | 'inprogress' | 'completed' | 'failed';
    message: string;
  } | null>(null);

  // 서버 정보를 별도로 관리
  const [infraServers, setInfraServers] = useState<Map<number, any[]>>(
    new Map()
  );

  // 특정 인프라의 서버 정보를 로드하는 함수
  const loadInfraServers = async (infraId: number) => {
    // 이미 로드된 서버 정보가 있는지 확인
    const existingServers = infraServers.get(infraId);
    if (existingServers) {
      return existingServers;
    }

    try {
      const response = await api.infra.listServers(infraId);
      const serverList = (response.data?.data ?? []) as any[];
      setInfraServers(prev => new Map(prev).set(infraId, serverList));
      return serverList;
    } catch {
      return [];
    }
  };

  // 특정 인프라의 마스터 노드 hops 정보를 가져오는 함수
  // Docker/Podman 인프라의 경우 첫 번째 서버의 hops를 반환
  const getInfraMasterNodeHops = async (infraId: number): Promise<any[]> => {
    try {
      // 이미 로드된 서버 정보가 있는지 확인
      let servers = infraServers.get(infraId);

      if (!servers) {
        // 없으면 새로 로드
        servers = await loadInfraServers(infraId);
      }

      // 인프라 타입 확인
      const infra = infrastructures.find(i => i.id === infraId);
      const isDocker =
        infra?.type === 'docker' ||
        infra?.type === 'external_docker' ||
        infra?.type === 'podman' ||
        infra?.type === 'external_podman';

      let targetNode: any = null;

      if (isDocker) {
        // Docker/Podman 인프라의 경우 첫 번째 서버를 사용
        targetNode = servers.find((node: any) => node.infra_id === infraId);
      } else {
        // Kubernetes 인프라의 경우 master 노드를 찾음
        targetNode = servers.find((node: any) => {
          if (node.infra_id !== infraId) return false;
          const nodeType: string | undefined = node.type;
          return (
            nodeType === 'master' ||
            (typeof nodeType === 'string' && nodeType.includes('master'))
          );
        });
      }

      if (!targetNode?.hops) {
        return [];
      }

      const parsedHops =
        typeof targetNode.hops === 'string'
          ? (JSON.parse(targetNode.hops) as any[])
          : (targetNode.hops as any[]);

      return Array.isArray(parsedHops) ? parsedHops : [parsedHops];
    } catch (error) {
      console.error('[getInfraMasterNodeHops] 오류:', error);
      return [];
    }
  };

  // Data management hook
  const {
    infrastructures,
    servers,
    loadServers,
    _getMasterNodeHops,
    startBackupEnvironmentSetup,
    loadAllMinioStorages,
  } = useBackupDataManager({
    selectedInfraId: undefined, // 전체 인프라를 대상으로 하므로 undefined
    organizationId: selectedOrgId, // 기관별 필터링
    onBackupsUpdate: () => {},
    onRestoresUpdate: () => {},
    onInstallStatusUpdate: () => {},
    onMinioStoragesUpdate: setAllMinioStorages,
    onNamespacesUpdate: () => {},
  });

  // Status management hook
  const { startJobPolling, getRestoreStatusDisplay } = useBackupStatusManager({
    selectedInfraId: undefined,
    backups: [],
    restores: [],
    installStatus: null,
    onBackupsUpdate: () => {},
    onRestoresUpdate: () => {},
    onInstallStatusUpdate: () => {},
    loadBackups: async () => {},
    loadRestores: async () => {},
    loadBackupStatus: async () => {},
  });

  // MinIO 스토리지 목록 로드 + 외부 저장소 로드
  useEffect(() => {
    loadAllMinioStorages();
    setLastStorageRefresh(new Date());

    // 외부 저장소도 여기서 로드
    const loadExternal = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'list-external-storages',
            parameters: {},
          }),
        });
        const data = await response.json();
        if (data.success && data.data) {
          setExternalStorages(data.data);
        }
      } catch (error) {
        console.error('[loadExternal] 외부 저장소 로드 실패:', error);
      }
    };
    loadExternal();
  }, [loadAllMinioStorages]);

  // 저장소 새로고침 핸들러
  const handleRefreshStorages = async () => {
    setIsRefreshingStorages(true);
    try {
      await loadAllMinioStorages();
      await loadExternalStorages();
      setLastStorageRefresh(new Date());
      message.success('저장소 목록을 새로고침했습니다.');
    } catch {
      message.error('저장소 목록 새로고침 실패');
    } finally {
      setIsRefreshingStorages(false);
    }
  };

  // 외부 저장소 목록 로드
  const loadExternalStorages = useCallback(async () => {
    setIsLoadingExternalStorages(true);
    try {
      // 직접 fetch로 테스트
      const token = localStorage.getItem('authToken');
      const fetchResponse = await fetch('/api/v1/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'list-external-storages',
          parameters: {},
        }),
      });
      const response = await fetchResponse.json();
      if (response.success && response.data) {
        setExternalStorages(response.data);
      } else {
        console.warn(
          '[loadExternalStorages] 응답 실패 또는 데이터 없음:',
          response
        );
      }
    } catch (error) {
      console.error(
        '[loadExternalStorages] 외부 저장소 목록 로드 실패:',
        error
      );
    } finally {
      setIsLoadingExternalStorages(false);
    }
  }, []);

  // 외부 저장소 등록 핸들러
  const handleCreateExternalStorage = async (
    values: ExternalStorageFormValues
  ) => {
    setIsRegisteringExternalStorage(true);
    try {
      const response = await backupApi.createExternalStorage({
        name: values.name,
        description: values.description,
        type: values.type,
        endpoint: values.endpoint,
        access_key: values.accessKey,
        secret_key: values.secretKey,
        bucket: values.bucket,
        region: values.region,
        use_ssl: values.useSSL,
        // SSH 터널링 설정
        ssh_enabled: values.sshEnabled,
        ssh_gateway_host: values.sshGatewayHost,
        ssh_gateway_port: values.sshGatewayPort,
        ssh_gateway_user: values.sshGatewayUser,
        ssh_gateway_password: values.sshGatewayPassword,
        ssh_target_host: values.sshTargetHost,
        ssh_target_port: values.sshTargetPort,
        ssh_target_user: values.sshTargetUser,
        ssh_target_password: values.sshTargetPassword,
      });
      if (response.success) {
        setIsExternalStorageModalVisible(false);
        await loadExternalStorages();
        message.success('외부 저장소가 등록되었습니다.');
      } else {
        throw new Error(response.error || '저장소 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('외부 저장소 등록 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '저장소 등록에 실패했습니다.';
      message.error(errorMessage);
      throw error;
    } finally {
      setIsRegisteringExternalStorage(false);
    }
  };

  // 외부 저장소 삭제 핸들러
  const handleDeleteExternalStorage = async (storageId: number) => {
    try {
      const response = await backupApi.deleteExternalStorage(storageId);
      if (response.success) {
        await loadExternalStorages();
        message.success('외부 저장소가 삭제되었습니다.');
      } else {
        throw new Error(response.error || '저장소 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('외부 저장소 삭제 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '저장소 삭제에 실패했습니다.';
      message.error(errorMessage);
    }
  };

  // 인프라 연결 모달 열기 핸들러
  const handleOpenInfraLinkModal = async (storage: ExternalBackupStorage) => {
    setSelectedStorageForLink(storage);
    setIsInfraLinkModalVisible(true);
    // 해당 저장소에 연결된 인프라 목록 로드
    await loadLinkedInfras(storage.id);
  };

  // 연결된 인프라 목록 로드 ( 배치 API로 최적화)
  const loadLinkedInfras = useCallback(
    async (storageId: number) => {
      setIsLoadingLinkedInfras(true);
      try {
        // 배치 API로 모든 인프라의 저장소 매핑을 한 번에 조회
        const infraIds = infrastructures.map(infra => infra.id);
        if (infraIds.length === 0) {
          setLinkedInfras([]);
          return;
        }

        const response = await backupApi.getBatchInfraStorageMappings(infraIds);
        if (response.success && response.data) {
          // 모든 인프라의 매핑에서 해당 storageId와 연결된 것만 필터링
          const allMappings: InfraBackupStorageMapping[] = [];
          Object.values(response.data).forEach(mappings => {
            const infraMappings = mappings.filter(
              m => m.external_storage_id === storageId
            );
            allMappings.push(...infraMappings);
          });
          setLinkedInfras(allMappings);
        } else {
          setLinkedInfras([]);
        }
      } catch (error) {
        console.error('연결된 인프라 목록 로드 실패:', error);
      } finally {
        setIsLoadingLinkedInfras(false);
      }
    },
    [infrastructures]
  );

  // 인프라 연결 핸들러
  const handleLinkInfra = async (params: LinkInfraToStorageParams) => {
    try {
      const response = await backupApi.linkInfraToExternalStorage(params);
      if (response.success) {
        message.success('인프라가 저장소에 연결되었습니다.');
        // 연결된 인프라 목록 새로고침
        if (selectedStorageForLink) {
          await loadLinkedInfras(selectedStorageForLink.id);
        }
      } else {
        throw new Error(response.error || '인프라 연결에 실패했습니다.');
      }
    } catch (error) {
      console.error('인프라 연결 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '인프라 연결에 실패했습니다.';
      message.error(errorMessage);
      throw error;
    }
  };

  // 인프라 연결 해제 핸들러
  const handleUnlinkInfra = async (infraId: number, storageId: number) => {
    try {
      const response = await backupApi.unlinkInfraFromExternalStorage(
        infraId,
        storageId
      );
      if (response.success) {
        message.success('인프라 연결이 해제되었습니다.');
        // 연결된 인프라 목록 새로고침
        if (selectedStorageForLink) {
          await loadLinkedInfras(selectedStorageForLink.id);
        }
      } else {
        throw new Error(response.error || '인프라 연결 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('인프라 연결 해제 실패:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : '인프라 연결 해제에 실패했습니다.';
      message.error(errorMessage);
    }
  };

  // Docker/Podman 인프라의 외부 저장소 연결 상태 전역 확인 ( 배치 API로 최적화)
  useEffect(() => {
    const checkGlobalDockerStorageStatus = async () => {
      // Docker/Podman 인프라 필터링
      const dockerInfras = infrastructures.filter(
        infra =>
          infra.type === 'docker' ||
          infra.type === 'external_docker' ||
          infra.type === 'podman' ||
          infra.type === 'external_podman'
      );

      if (dockerInfras.length === 0) {
        setDockerInfrasWithoutStorage([]);
        return;
      }

      setIsCheckingGlobalStorageStatus(true);

      try {
        // 배치 API로 모든 Docker/Podman 인프라의 저장소 매핑을 한 번에 조회
        const dockerInfraIds = dockerInfras.map(infra => infra.id);
        const response =
          await backupApi.getBatchInfraStorageMappings(dockerInfraIds);

        const infrasWithoutStorage: InfraItem[] = [];
        if (response.success && response.data) {
          // 각 인프라별로 매핑이 있는지 확인
          for (const infra of dockerInfras) {
            const mappings = response.data[infra.id] || [];
            if (mappings.length === 0) {
              infrasWithoutStorage.push(infra);
            }
          }
        } else {
          // API 실패 시 모두 미연결로 간주
          infrasWithoutStorage.push(...dockerInfras);
        }

        setDockerInfrasWithoutStorage(infrasWithoutStorage);
      } catch (error) {
        console.error('[checkGlobalDockerStorageStatus] 오류:', error);
        // 오류 시 모든 Docker 인프라를 미연결로 표시
        setDockerInfrasWithoutStorage(dockerInfras);
      } finally {
        setIsCheckingGlobalStorageStatus(false);
      }
    };

    if (infrastructures.length > 0) {
      checkGlobalDockerStorageStatus();
    }
  }, [infrastructures]);

  // 백업 데이터를 그룹화하는 함수
  const groupBackupsByName = (
    backups: AllBackupData[]
  ): GroupedBackupData[] => {
    const grouped = new Map<string, GroupedBackupData>();

    backups.forEach(backupData => {
      const backupName = backupData.backup.name;

      if (!grouped.has(backupName)) {
        grouped.set(backupName, {
          backupName,
          backups: [],
          totalRestores: 0,
          lastRestoreDate: undefined,
        });
      }

      const group = grouped.get(backupName);
      group.backups.push(backupData);
      group.totalRestores += backupData.restores.length;

      // 가장 최근 복구 날짜 찾기
      const latestRestore = backupData.restores
        .filter(r => r.created_at)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

      if (
        latestRestore &&
        (!group.lastRestoreDate ||
          new Date(latestRestore.created_at) > new Date(group.lastRestoreDate))
      ) {
        group.lastRestoreDate = latestRestore.created_at;
      }
    });

    return Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.backups[0].backup.created_at).getTime() -
        new Date(a.backups[0].backup.created_at).getTime()
    );
  };

  // 전체 백업 및 복구 데이터 로드 ( 배치 API로 성능 최적화)
  const loadAllBackups = async () => {
    if (infrastructures.length === 0) return;

    setIsLoadingBackups(true);
    try {
      // K8s 인프라 필터링
      const k8sInfras = infrastructures.filter(
        infra =>
          infra.type === 'kubernetes' || infra.type === 'external_kubernetes'
      );

      // Docker/Podman 인프라 필터링
      const dockerInfras = infrastructures.filter(
        infra =>
          infra.type === 'docker' ||
          infra.type === 'external_docker' ||
          infra.type === 'podman' ||
          infra.type === 'external_podman'
      );

      //  K8s 인프라: 배치 API로 백업/복구 목록을 한 번에 조회
      const k8sInfraIds = k8sInfras.map(infra => infra.id);
      let k8sBackupsMap: Record<number, Backup[]> = {};
      let k8sRestoresMap: Record<number, Restore[]> = {};

      if (k8sInfraIds.length > 0) {
        // 배치 API로 모든 K8s 인프라의 백업/복구를 한 번에 조회 (기존 N*2번 → 2번)
        const [batchBackupsResponse, batchRestoresResponse] = await Promise.all(
          [
            backupApi.getBatchBackups(k8sInfraIds),
            backupApi.getBatchRestores(k8sInfraIds),
          ]
        );
        k8sBackupsMap =
          batchBackupsResponse.success && batchBackupsResponse.data
            ? batchBackupsResponse.data
            : {};
        k8sRestoresMap =
          batchRestoresResponse.success && batchRestoresResponse.data
            ? batchRestoresResponse.data
            : {};
      }

      // K8s 인프라별 서버 및 설치 상태 조회 (아직 배치 API 없음)
      const k8sPromises = k8sInfras.map(async infra => {
        try {
          const [serverResponse, installStatusResponse] = await Promise.all([
            api.infra.listServers(infra.id),
            api.backup.getInstallationStatus(infra.id),
          ]);

          const servers = serverResponse.data?.data || [];
          const installStatus = installStatusResponse.data?.data;
          const serverInfo = { infraId: infra.id, servers };

          // 배치 API 결과에서 해당 인프라의 백업/복구 가져오기
          const backups = k8sBackupsMap[infra.id] || [];
          const restores = k8sRestoresMap[infra.id] || [];

          if (backups.length > 0) {
            const backupsWithInfra = backups.map((backup: Backup) => ({
              backup,
              infraName: infra.name,
              infraType: infra.type,
              restores: restores.filter(
                (restore: Restore) => restore.backup_name === backup.name
              ),
              installStatus,
            }));
            return { backups: backupsWithInfra, serverInfo };
          }
          return { backups: [] as AllBackupData[], serverInfo };
        } catch (error) {
          console.error(
            `[loadAllBackups] K8s 인프라 ${infra.name} 정보 조회 실패:`,
            error
          );
          return {
            backups: [] as AllBackupData[],
            serverInfo: { infraId: infra.id, servers: [] },
          };
        }
      });

      // Docker/Podman 인프라 데이터를 병렬로 조회
      const dockerPromises = dockerInfras.map(async infra => {
        try {
          // Docker 백업, 복구, 서버 정보를 병렬로 조회
          const [dockerBackups, dockerRestores, serverResponse] =
            await Promise.all([
              getDockerBackups(infra.id),
              getDockerRestores(infra.id),
              api.infra.listServers(infra.id),
            ]);

          const servers = serverResponse.data?.data || [];
          const serverInfo = { infraId: infra.id, servers };

          if (dockerBackups && dockerBackups.length > 0) {
            const dockerBackupsWithInfra = dockerBackups.map(
              (dockerBackup: DockerBackup) => {
                const convertedBackup: Backup = {
                  id: dockerBackup.id,
                  name: dockerBackup.name,
                  infra_id: dockerBackup.infra_id,
                  namespace:
                    dockerBackup.compose_project || dockerBackup.backup_type,
                  status: dockerBackup.status as Backup['status'],
                  error: dockerBackup.error_message,
                  size: dockerBackup.size_bytes
                    ? `${Math.round(dockerBackup.size_bytes / 1024 / 1024)} MB`
                    : undefined,
                  created_at: dockerBackup.created_at,
                  completed_at: dockerBackup.completed_at,
                };

                const convertedRestores: Restore[] = dockerRestores
                  .filter((r: DockerRestore) => r.backup_id === dockerBackup.id)
                  .map(
                    (r: DockerRestore) =>
                      ({
                        id: r.id,
                        name: `restore-${r.id}`,
                        status:
                          r.status === 'in_progress'
                            ? 'InProgress'
                            : r.status === 'completed'
                              ? 'Completed'
                              : r.status === 'failed'
                                ? 'Failed'
                                : 'New',
                        backup_name: dockerBackup.name,
                        created_at: r.created_at,
                        completed_at: r.completed_at || null,
                      }) as Restore
                  );

                return {
                  backup: convertedBackup,
                  infraName: infra.name,
                  infraType: infra.type,
                  restores: convertedRestores,
                } as AllBackupData;
              }
            );
            return { backups: dockerBackupsWithInfra, serverInfo };
          }
          return { backups: [] as AllBackupData[], serverInfo };
        } catch (error) {
          console.error(
            `[loadAllBackups] Docker/Podman 인프라 ${infra.name} 백업 조회 실패:`,
            error
          );
          return {
            backups: [] as AllBackupData[],
            serverInfo: { infraId: infra.id, servers: [] },
          };
        }
      });

      // 모든 인프라의 데이터를 병렬로 가져오기
      const [k8sResults, dockerResults] = await Promise.all([
        Promise.all(k8sPromises),
        Promise.all(dockerPromises),
      ]);

      // 결과 합치기
      const allBackupData: AllBackupData[] = [];
      const newInfraServers = new Map<number, any[]>();

      for (const result of k8sResults) {
        allBackupData.push(...result.backups);
        newInfraServers.set(
          result.serverInfo.infraId,
          result.serverInfo.servers
        );
      }

      for (const result of dockerResults) {
        allBackupData.push(...result.backups);
        newInfraServers.set(
          result.serverInfo.infraId,
          result.serverInfo.servers
        );
      }

      // 서버 정보 일괄 업데이트
      setInfraServers(newInfraServers);
      setAllBackups(allBackupData);

      // 백업명으로 그룹화
      const grouped = groupBackupsByName(allBackupData);
      setGroupedBackups(grouped);

      message.success(
        `${allBackupData.length}개의 백업과 ${grouped.reduce((sum, g) => sum + g.totalRestores, 0)}개의 복구 이력을 불러왔습니다.`
      );
    } catch (error) {
      console.error('[loadAllBackups] 전체 백업 데이터 로드 실패:', error);
      message.error('백업 데이터를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // 컴포넌트 마운트 시 및 인프라 변경 시 백업 데이터 로드
  useEffect(() => {
    if (infrastructures.length > 0) {
      loadAllBackups();
    }
  }, [infrastructures]);

  // 백업 생성 진행 상태 폴링
  useEffect(() => {
    if (
      !creatingBackupInfo ||
      creatingBackupInfo.status === 'completed' ||
      creatingBackupInfo.status === 'failed'
    ) {
      return;
    }

    const pollBackupStatus = async () => {
      try {
        // 백업 목록에서 생성 중인 백업 찾기 (ref를 사용하여 최신 값 참조)
        const currentBackups = allBackupsRef.current;
        const createdBackup = currentBackups.find(
          b =>
            b.backup.name === creatingBackupInfo.name &&
            b.backup.infra_id === creatingBackupInfo.infraId
        );

        if (createdBackup) {
          const status = createdBackup.backup.status;

          if (status === 'Completed') {
            setCreatingBackupInfo(prev =>
              prev
                ? {
                    ...prev,
                    status: 'completed',
                    message: '백업이 성공적으로 완료되었습니다!',
                  }
                : null
            );
            message.success(
              `백업 "${creatingBackupInfo.name}"이(가) 성공적으로 완료되었습니다.`
            );
          } else if (
            status === 'Failed' ||
            status.toLowerCase() === 'partiallyfailed'
          ) {
            setCreatingBackupInfo(prev =>
              prev
                ? {
                    ...prev,
                    status: 'failed',
                    message: '백업이 실패했습니다.',
                  }
                : null
            );
            message.error(
              `백업 "${creatingBackupInfo.name}"이(가) 실패했습니다.`
            );
          } else if (status === 'InProgress' || status === 'Running') {
            setCreatingBackupInfo(prev =>
              prev
                ? {
                    ...prev,
                    status: 'inprogress',
                    message: '백업 진행 중... (리소스 수집 및 업로드 중)',
                  }
                : null
            );
          }
        }
      } catch (error) {
        console.error('[pollBackupStatus] 백업 상태 확인 실패:', error);
      }
    };

    // 즉시 한 번 실행
    pollBackupStatus();

    // 3초마다 폴링 (백업 생성 중에만 실행)
    const interval = setInterval(() => {
      void (async () => {
        await loadAllBackups();
        await pollBackupStatus();
      })();
    }, 3000);

    return () => clearInterval(interval);
  }, [creatingBackupInfo]); // allBackups를 제거하여 무한 루프 방지

  // 진행 중인 복구가 있을 때 자동으로 상태 업데이트
  useEffect(() => {
    // 진행 중인 복구가 있는지 확인
    const hasInProgressRestores = allBackups.some(backupData =>
      backupData.restores?.some(restore => {
        const status = restore.status?.toLowerCase() || '';
        return (
          status.includes('progress') ||
          status === 'pending' ||
          status === 'new' ||
          status === 'running'
        );
      })
    );

    if (!hasInProgressRestores) return;

    // 5초마다 데이터 새로고침
    const interval = setInterval(() => {
      void (async () => {
        try {
          await loadAllBackups();
        } catch (error) {
          console.error('[RestorePolling] 데이터 갱신 실패:', error);
        }
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, [allBackups, loadAllBackups]);

  // 전체 복구 이력 통합 (Kubernetes/Docker/Podman)
  const allRestoreHistory = useMemo(() => {
    const restoreList: Array<{
      id: number;
      runtimeType: 'kubernetes' | 'docker' | 'podman';
      backupName: string;
      infraName: string;
      status: string;
      target?: string;
      createdAt: string;
      completedAt?: string;
      // Docker/Podman 복구 옵션
      restoreVolumes?: boolean;
      restoreConfig?: boolean;
      redeploy?: boolean;
      stopExisting?: boolean;
      errorMessage?: string;
    }> = [];

    // 복구 이력 추가
    allBackups.forEach(backupData => {
      let runtimeType: 'kubernetes' | 'docker' | 'podman' = 'kubernetes';
      if (
        backupData.infraType === 'docker' ||
        backupData.infraType === 'external_docker'
      ) {
        runtimeType = 'docker';
      } else if (
        backupData.infraType === 'podman' ||
        backupData.infraType === 'external_podman'
      ) {
        runtimeType = 'podman';
      }

      backupData.restores.forEach(restore => {
        // Kubernetes: 백업의 네임스페이스 사용, Docker/Podman: 복원 대상 프로젝트 또는 전체 컨테이너
        const target =
          runtimeType === 'kubernetes'
            ? backupData.backup.namespace || '전체'
            : (restore as any).target_compose_project || '전체 컨테이너';

        // Docker/Podman 복구 옵션 추출
        const dockerRestore = restore as any;

        restoreList.push({
          id: restore.id,
          runtimeType,
          backupName: backupData.backup.name,
          infraName: backupData.infraName,
          status: restore.status,
          target,
          createdAt: restore.created_at,
          completedAt: restore.completed_at,
          // Docker/Podman 옵션
          restoreVolumes: dockerRestore.restore_volumes,
          restoreConfig: dockerRestore.restore_config,
          redeploy: dockerRestore.redeploy,
          stopExisting: dockerRestore.stop_existing,
          errorMessage: dockerRestore.error_message || (restore as any).error,
        });
      });
    });

    // 최신순 정렬
    restoreList.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return restoreList;
  }, [allBackups]);

  // 백업 통계 (런타임 환경 페이지와 동일한 UI 패턴)
  const backupStats = useMemo(() => {
    const stats = {
      total: allBackups.length,
      completed: 0,
      failed: 0,
      inProgress: 0,
      k8s: 0,
      docker: 0,
    };

    allBackups.forEach(backupData => {
      const normalizedStatus = (backupData.backup.status || '').toLowerCase();
      if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
        stats.completed++;
      } else if (normalizedStatus === 'failed' || normalizedStatus === 'fail') {
        stats.failed++;
      } else if (
        normalizedStatus.includes('progress') ||
        normalizedStatus === 'running' ||
        normalizedStatus === 'creating'
      ) {
        stats.inProgress++;
      }

      const infraType = backupData.infraType || '';
      if (infraType.includes('kubernetes')) {
        stats.k8s++;
      } else {
        stats.docker++;
      }
    });

    return stats;
  }, [allBackups]);

  // 복구 이력 통계
  const restoreStats = useMemo(() => {
    const stats = {
      total: allRestoreHistory.length,
      completed: 0,
      failed: 0,
      inProgress: 0,
      kubernetes: 0,
      docker: 0,
      podman: 0,
    };

    allRestoreHistory.forEach(restore => {
      const normalizedStatus = restore.status.toLowerCase();
      if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
        stats.completed++;
      } else if (
        normalizedStatus === 'failed' ||
        normalizedStatus === 'fail' ||
        normalizedStatus === 'partiallyfailed'
      ) {
        stats.failed++;
      } else if (
        normalizedStatus.includes('progress') ||
        normalizedStatus === 'in_progress' ||
        normalizedStatus === 'pending' ||
        normalizedStatus === 'new'
      ) {
        stats.inProgress++;
      }

      stats[restore.runtimeType]++;
    });

    return stats;
  }, [allRestoreHistory]);

  // 외부 저장소(MinIO)에 저장된 백업들 - K8s(Velero) + Docker/Podman(minio) 통합
  const minioStoredBackups = useMemo((): UnifiedStorageBackup[] => {
    const unifiedBackups: UnifiedStorageBackup[] = [];

    // 1. K8s 백업 추가 (외부 저장소 연결된 인프라의 백업만)
    // allMinioStorages에 있는 K8s 인프라들의 백업을 추가
    const k8sInfrasWithStorage = allMinioStorages.filter(
      s =>
        s.infra_type === 'kubernetes' || s.infra_type === 'external_kubernetes'
    );

    allBackups.forEach(backupData => {
      const storageMapping = k8sInfrasWithStorage.find(
        s => s.infra_id === backupData.backup.infra_id
      );
      if (storageMapping && backupData.backup.status === 'completed') {
        unifiedBackups.push({
          id: backupData.backup.id,
          name: backupData.backup.name,
          infra_id: backupData.backup.infra_id,
          infra_name: backupData.infraName,
          infra_type: backupData.infraType,
          runtime_type: 'kubernetes',
          status: backupData.backup.status,
          size: backupData.backup.size,
          storage_type: 'velero',
          storage_endpoint: storageMapping.endpoint,
          storage_bucket: storageMapping.bucket_name || 'velero',
          created_at: backupData.backup.created_at,
          completed_at: backupData.backup.completed_at,
        });
      }
    });

    // 2. Docker/Podman 백업 추가 (storage_type이 minio인 것)
    dockerBackups.forEach(backup => {
      if (backup.storage_type === 'minio') {
        const infra = infrastructures.find(i => i.id === backup.infra_id);
        const infraType = infra?.type || '';
        let runtimeType: 'kubernetes' | 'docker' | 'podman' = 'docker';
        if (infraType.includes('podman')) {
          runtimeType = 'podman';
        }

        unifiedBackups.push({
          id: backup.id,
          name: backup.name,
          infra_id: backup.infra_id,
          infra_name: infra?.name || `인프라 ${backup.infra_id}`,
          infra_type: infraType,
          runtime_type: runtimeType,
          status: backup.status,
          size_bytes: backup.size_bytes,
          storage_type: 'minio',
          storage_endpoint: backup.storage_endpoint || '',
          storage_bucket: backup.storage_bucket || 'backups',
          created_at: backup.created_at,
          completed_at: backup.completed_at,
          backup_type: backup.backup_type,
          containers: backup.containers,
          compose_project: backup.compose_project,
        });
      }
    });

    return unifiedBackups;
  }, [allBackups, dockerBackups, allMinioStorages, infrastructures]);

  // 런타임 필터가 적용된 백업 목록
  const filteredMinioBackups = useMemo(() => {
    if (browserRuntimeFilter === 'all') {
      return minioStoredBackups;
    }

    return minioStoredBackups.filter(backup => {
      switch (browserRuntimeFilter) {
        case 'kubernetes':
          return backup.runtime_type === 'kubernetes';
        case 'docker':
          return backup.runtime_type === 'docker';
        case 'podman':
          return backup.runtime_type === 'podman';
        default:
          return true;
      }
    });
  }, [minioStoredBackups, browserRuntimeFilter]);

  // 런타임별 백업 수 통계
  const runtimeStats = useMemo(() => {
    const stats = { kubernetes: 0, docker: 0, podman: 0 };
    minioStoredBackups.forEach(backup => {
      stats[backup.runtime_type]++;
    });
    return stats;
  }, [minioStoredBackups]);

  // MinIO 저장소별로 백업 그룹화 (런타임 필터 적용)
  const backupsByStorage = useMemo(() => {
    const grouped: Record<
      string,
      {
        endpoint: string;
        bucket: string;
        infraName?: string;
        backups: UnifiedStorageBackup[];
      }
    > = {};

    filteredMinioBackups.forEach(backup => {
      const key = `${backup.storage_endpoint || 'unknown'}::${backup.storage_bucket || 'default'}`;
      if (!grouped[key]) {
        grouped[key] = {
          endpoint: backup.storage_endpoint || 'unknown',
          bucket: backup.storage_bucket || 'default',
          infraName: backup.infra_name,
          backups: [],
        };
      }
      grouped[key].backups.push(backup);
    });

    // 각 그룹 내에서 최신순으로 정렬
    Object.values(grouped).forEach(group => {
      group.backups.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return grouped;
  }, [filteredMinioBackups]);

  // 저장소 사용량 경고 체크 (80% 이상 사용 시 경고)
  const storageWarnings = useMemo(() => {
    const warnings: Array<{
      storageName: string;
      endpoint: string;
      usagePercent: number;
      totalBytes: number;
    }> = [];
    const estimatedCapacity = 100 * 1024 * 1024 * 1024; // 100GB 기준

    allMinioStorages.forEach(storage => {
      const storageBackups = minioStoredBackups.filter(
        b => b.storage_endpoint === storage.endpoint
      );
      const totalBytes = storageBackups.reduce(
        (sum, b) => sum + (b.size_bytes || 0),
        0
      );
      const usagePercent = (totalBytes / estimatedCapacity) * 100;

      if (usagePercent > 80) {
        warnings.push({
          storageName: storage.infra_name,
          endpoint: storage.endpoint,
          usagePercent: Number(usagePercent.toFixed(1)),
          totalBytes,
        });
      }
    });

    return warnings;
  }, [allMinioStorages, minioStoredBackups]);

  // Docker 복구 이력 상세 보기 핸들러
  const handleShowDockerRestoreDetail = (
    backup: DockerBackup,
    restores: DockerRestore[]
  ) => {
    setSelectedDockerBackupForDetail(backup);
    setSelectedDockerRestoresForDetail(restores);
    setShowDockerRestoreDetail(true);
  };

  // 복구 상태 표시 헬퍼 (PartiallyFailed도 실패로 처리)
  const getRestoreStatusTagInfo = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
      return { color: 'success', icon: <CheckCircleOutlined />, text: '완료' };
    } else if (
      normalizedStatus === 'failed' ||
      normalizedStatus === 'fail' ||
      normalizedStatus === 'partiallyfailed'
    ) {
      return { color: 'error', icon: <CloseCircleOutlined />, text: '실패' };
    } else if (
      normalizedStatus.includes('progress') ||
      normalizedStatus === 'in_progress'
    ) {
      return {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: '진행 중',
      };
    } else if (normalizedStatus === 'pending' || normalizedStatus === 'new') {
      return {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '대기 중',
      };
    }
    return { color: 'default', icon: null, text: status };
  };

  // 백업 생성 모달 열기
  const handleCreateBackup = async () => {
    // 백업 가능한 인프라가 있는지 확인 (K8s, Docker, Podman 모두 포함)
    const backupableInfras = infrastructures.filter(
      infra =>
        infra.type === 'kubernetes' ||
        infra.type === 'external_kubernetes' ||
        infra.type === 'docker' ||
        infra.type === 'external_docker' ||
        infra.type === 'podman' ||
        infra.type === 'external_podman'
    );

    if (backupableInfras.length === 0) {
      message.error('백업이 가능한 인프라가 없습니다.');
      return;
    }

    // 모달 열기 전에 상태 초기화
    setSelectedInfraForBackup(null);
    setMasterHopsForBackup([]);
    setNamespaces([]);
    setIsScheduleEnabled(false);
    setScheduleFrequency('daily');
    setDockerBackupType('full');
    setVeleroInstalled(null);
    setIsCheckingVelero(false);

    // 백업 생성 모달 열기 (Velero 미설치 시 모달 내에서 설치 유도)
    setIsBackupFormModalVisible(true);
  };

  // Docker/Podman 인프라용 백업 모달 열기
  const handleOpenDockerBackupModal = async (infra: InfraItem) => {
    try {
      // 인프라의 서버 hops 가져오기
      const servers = await loadInfraServers(infra.id);
      if (servers.length === 0) {
        message.error('서버 정보를 찾을 수 없습니다.');
        return;
      }

      // 첫 번째 서버의 hops 사용
      const server = servers[0];
      let hops: SshAuthHop[] = [];

      if (server.hops) {
        hops =
          typeof server.hops === 'string'
            ? JSON.parse(server.hops)
            : server.hops;
      }

      // K8s 모달 닫고 Docker 모달 열기
      setIsBackupFormModalVisible(false);
      setSelectedInfraForBackup(infra);
      setDockerSshHops(hops);
      setIsDockerBackupModalVisible(true);
    } catch (error) {
      console.error('[backup.tsx] Docker 백업 모달 열기 실패:', error);
      message.error('백업 모달을 열 수 없습니다.');
    }
  };

  // 백업 생성 폼 제출 처리
  const handleBackupFormSubmit = async (values: any) => {
    if (!selectedInfraForBackup) return;

    // K8s 인프라인 경우 Velero 설치 여부 확인
    if (isKubernetesInfra && veleroInstalled !== true) {
      message.warning(
        'Kubernetes 백업을 생성하려면 먼저 Velero를 설치해야 합니다.'
      );
      return;
    }

    try {
      // 마스터 노드 hops 정보 가져오기
      const masterHops = await getInfraMasterNodeHops(
        selectedInfraForBackup.id
      );

      if (masterHops.length === 0) {
        message.error('백업할 인프라의 서버 정보를 찾을 수 없습니다.');
        return;
      }

      // Docker/Podman 인프라 백업 처리
      if (isDockerInfra) {
        // SSH 인증 후 Docker 백업 생성
        const dockerBackupParams = {
          name: values.backupName,
          infra_id: selectedInfraForBackup.id,
          backup_type: values.backupType || dockerBackupType,
          compose_project: values.composeProject,
        };
        requestNamespaceAuth(masterHops, 'dockerBackup', dockerBackupParams);
        return;
      }

      // K8s 인프라 백업 처리 (기존 로직)
      // 스케줄 데이터를 Cron 표현식으로 변환
      let schedule = undefined;
      let retention = undefined;

      if (values.enableSchedule && values.scheduleParts) {
        const { minute, hour, dayOfMonth, dayOfWeek } = values.scheduleParts;

        switch (scheduleFrequency) {
          case 'daily':
            schedule = `${minute} ${hour} * * *`;
            break;
          case 'weekly':
            schedule = `${minute} ${hour} * * ${dayOfWeek}`;
            break;
          case 'monthly':
            schedule = `${minute} ${hour} ${dayOfMonth} * *`;
            break;
        }

        retention = values.retention;
      }

      // SSH 인증 모달 열기
      const backupParams = {
        name: values.backupName,
        infra_id: selectedInfraForBackup.id,
        namespace: values.namespace,
        schedule: schedule,
        retention: retention,
      };
      requestNamespaceAuth(masterHops, 'backup', backupParams);
    } catch {
      message.error('인프라 정보를 로드할 수 없습니다.');
    }
  };

  // 백업 생성 인증 성공 후 처리
  const handleBackupAuthSuccess = async (
    authData: SshAuthHop[],
    formData: any
  ) => {
    if (!selectedInfraForBackup) return;

    try {
      setIsCreatingBackup(true);

      // 백엔드 create-backup API 호출 (Velero 직접 호출 + DB 저장 + 상태 모니터링 포함)
      const backupParams: CreateBackupParams = {
        name: formData.name,
        infra_id: selectedInfraForBackup.id,
        namespace: formData.namespace,
        schedule: formData.schedule,
        retention: formData.retention,
        auth_data: authData,
      };

      const response = await api.backup.createBackup(backupParams);

      if (response.data?.success) {
        // 백업 생성 진행 상태 추적 시작
        setCreatingBackupInfo({
          name: formData.name,
          infraId: selectedInfraForBackup.id,
          infraName: selectedInfraForBackup.name,
          status: 'pending',
          message: '백업 생성이 시작되었습니다...',
        });
        message.info('백업 생성이 시작되었습니다. 진행 상태를 모니터링합니다.');
      } else {
        throw new Error(response.data?.error || '백업 생성에 실패했습니다.');
      }

      setIsBackupFormModalVisible(false);
      setSelectedInfraForBackup(null);
      setMasterHopsForBackup([]);
      setNamespaces([]);
      void loadAllBackups();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '백업 생성에 실패했습니다.';
      message.error(errorMessage);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Docker/Podman 백업 인증 성공 후 처리
  const handleDockerBackupAuthSuccess = async (
    authData: SshAuthHop[],
    formData: {
      name: string;
      infra_id: number;
      backup_type: 'full' | 'volume' | 'config' | 'compose';
      compose_project?: string;
    }
  ) => {
    if (!selectedInfraForBackup) return;

    try {
      setIsCreatingBackup(true);

      const dockerBackupParams: CreateDockerBackupParams = {
        infra_id: formData.infra_id,
        hops: authData,
        name: formData.name,
        backup_type: formData.backup_type,
        trigger_type: 'manual',
        compose_project: formData.compose_project,
      };

      const result = await createDockerBackup(dockerBackupParams);

      message.success(`Docker 백업 "${result.name}"이(가) 생성되었습니다.`);
      setIsBackupFormModalVisible(false);
      setSelectedInfraForBackup(null);
      setDockerBackupType('full');
      void loadAllBackups();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Docker 백업 생성에 실패했습니다.';
      message.error(errorMessage);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // 인프라 선택 시 처리
  const handleInfraSelectForBackup = async (infraId: number) => {
    const selectedInfra = infrastructures.find(infra => infra.id === infraId);
    if (!selectedInfra) return;

    console.log('인프라 선택됨:', selectedInfra); // 디버깅용

    // K8s 인프라인 경우 Velero 설치 상태 확인
    const isK8s =
      selectedInfra.type === 'kubernetes' ||
      selectedInfra.type === 'external_kubernetes';
    const isDockerOrPodman =
      selectedInfra.type === 'docker' ||
      selectedInfra.type === 'podman' ||
      selectedInfra.type === 'external_docker' ||
      selectedInfra.type === 'external_podman';

    if (isDockerOrPodman) {
      // Docker/Podman 인프라: 전용 모달로 전환 (컨테이너 선택 기능 포함)
      await handleOpenDockerBackupModal(selectedInfra);
      return;
    }

    // K8s 인프라: 기존 로직 유지
    setSelectedInfraForBackup(selectedInfra);
    setVeleroInstalled(null); // 상태 초기화
    setHasDockerExternalStorage(null); // Docker 외부 저장소 상태 초기화

    if (isK8s) {
      setIsCheckingVelero(true);
      try {
        const installStatus = await api.backup.getInstallationStatus(
          selectedInfra.id
        );
        const canCreateBackup =
          installStatus.data?.data?.summary?.can_create_backup;
        setVeleroInstalled(canCreateBackup === true);
      } catch (error) {
        console.error(
          `[handleInfraSelectForBackup] Velero 상태 확인 실패:`,
          error
        );
        setVeleroInstalled(false);
      } finally {
        setIsCheckingVelero(false);
      }
    }
  };

  // 모달 닫기 시 상태 초기화
  const handleBackupModalClose = () => {
    setIsBackupFormModalVisible(false);
    setSelectedInfraForBackup(null);
    setMasterHopsForBackup([]);
    setNamespaces([]);
    setIsScheduleEnabled(false);
    setScheduleFrequency('daily');
    setDockerBackupType('full');
    setVeleroInstalled(null);
    setIsCheckingVelero(false);
    // Docker/Podman 외부 저장소 연결 상태 초기화
    setHasDockerExternalStorage(null);
    setIsCheckingDockerStorage(false);
  };

  // 네임스페이스 가져오기
  const handleFetchNamespaces = async () => {
    if (!selectedInfraForBackup) return;

    try {
      // 해당 인프라의 서버 정보 로드
      await loadInfraServers(selectedInfraForBackup.id);

      // 마스터 노드 hops 정보 가져오기
      const masterHops = await getInfraMasterNodeHops(
        selectedInfraForBackup.id
      );

      if (masterHops.length > 0) {
        // SSH 인증 모달 열기
        requestNamespaceAuth(masterHops, 'namespace');
      } else {
        message.error('백업할 인프라의 마스터 노드 정보를 찾을 수 없습니다.');
      }
    } catch {
      message.error('인프라 정보를 로드할 수 없습니다.');
    }
  };

  // 네임스페이스 인증 성공 후 처리
  const handleNamespaceAuthSuccess = async (authData: SshAuthHop[]) => {
    if (!selectedInfraForBackup) return;

    try {
      // 인증된 데이터로 네임스페이스 목록 가져오기
      const response = await api.backup.fetchNamespaces(
        selectedInfraForBackup.id,
        authData
      );
      const namespaceList = ((response.data?.data as any)?.namespaces ??
        []) as string[];

      // 시스템 네임스페이스 필터링 (사용자 정의 네임스페이스만 표시)
      const systemNamespaces = [
        'kube-system',
        'kube-public',
        'kube-node-lease',
        'ingress-nginx',
        'velero',
        'metallb-system',
        'cert-manager',
        'monitoring',
        'logging',
      ];

      const userNamespaces = namespaceList.filter(
        ns => !systemNamespaces.includes(ns)
      );

      setNamespaces(userNamespaces);

      // 마스터 노드 hops 정보 저장
      setMasterHopsForBackup(authData);

      message.success(
        `네임스페이스 목록을 가져왔습니다. (사용자 정의: ${userNamespaces.length}개)`
      );
    } catch {
      message.error('네임스페이스 목록을 가져올 수 없습니다.');
      setNamespaces([]);
    }
  };

  // 백업 대상 인프라 목록 가져오기 (K8s, Docker, Podman 모두 포함)
  // Velero 설치 여부와 관계없이 K8s 인프라도 목록에 표시
  const getBackupReadyInfras = async (): Promise<InfraItem[]> => {
    const readyInfras: InfraItem[] = [];

    for (const infra of infrastructures) {
      const type = infra.type;
      // K8s 인프라: Velero 설치 여부와 관계없이 목록에 포함
      if (type === 'kubernetes' || type === 'external_kubernetes') {
        readyInfras.push(infra);
      }
      // Docker/Podman 인프라: 별도 설치 없이 바로 백업 가능
      else if (
        type === 'docker' ||
        type === 'external_docker' ||
        type === 'podman' ||
        type === 'external_podman'
      ) {
        readyInfras.push(infra);
      } else {
      }
    }

    return readyInfras;
  };

  // 백업 환경이 구축된 인프라 목록 상태
  const [_backupReadyInfras, _setBackupReadyInfras] = useState<InfraItem[]>([]);

  // 백업 환경 상태 확인하여 백업 가능한 인프라 목록 업데이트
  useEffect(() => {
    const updateBackupReadyInfras = async () => {
      if (infrastructures.length > 0) {
        const readyInfras = await getBackupReadyInfras();
        setBackupReadyInfras(readyInfras);
      }
    };

    updateBackupReadyInfras();
  }, [infrastructures]);

  const handleSetupModalCancel = () => {
    setIsSetupModalVisible(false);
  };

  const handleSetupModalSubmit = () => {
    setIsSetupModalVisible(false);
    message.success('백업 환경 구축이 완료되었습니다.');
  };

  const handleStorageInfraChange = async (infraId: number) => {
    await loadServers(infraId);
  };

  const handleStartInstallation = async (formData: InstallWizardFormData) => {
    try {
      const jobId = await startBackupEnvironmentSetup(formData);
      if (jobId) {
        startJobPolling(jobId);
        setIsSetupModalVisible(false);
        message.success('백업 환경 구축 작업이 시작되었습니다.');
      }
    } catch {
      message.error('백업 환경 구축 시작에 실패했습니다.');
    }
  };

  // MinIO 저장소 직접 등록 핸들러
  const handleRegisterMinioStorage = async (values: MinioStorageFormValues) => {
    try {
      setIsRegisteringMinioStorage(true);

      // create-backup-storage API 호출
      const response = await api.backup.createBackupStorage({
        infra_id: values.infraId,
        name: values.name,
        type: 'minio',
        endpoint: values.endpoint,
        access_key: values.accessKey,
        secret_key: values.secretKey,
        bucket: values.bucket,
        status: 'active',
      });

      if (response.success) {
        // 저장소 목록 새로고침
        await loadAllMinioStorages();
        setIsMinioStorageModalVisible(false);
        message.success('MinIO 저장소가 등록되었습니다.');
      } else {
        throw new Error(response.error || '저장소 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('MinIO 저장소 등록 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '저장소 등록에 실패했습니다.';
      message.error(errorMessage);
      throw error;
    } finally {
      setIsRegisteringMinioStorage(false);
    }
  };

  // 상세 정보 모달 열기
  const _handleShowDetail = (backupGroup: GroupedBackupData) => {
    setSelectedBackupGroup(backupGroup);
    setIsDetailModalVisible(true);
  };

  // 백업 상태에 따른 태그 색상 (중앙화된 유틸리티 사용)
  const getBackupStatusColor = (status: string) => {
    return getStatusColor(status, StatusType.BACKUP);
  };

  // 백업 환경 구축 상태에 따른 태그 색상과 텍스트 (저장소 연결 관점)
  const _getInstallStatusDisplay = (installStatus: any) => {
    if (!installStatus) {
      return { color: 'default', text: '확인 불가' };
    }

    // 연결 중 상태 체크 (MinIO 또는 Velero가 설치 중인 경우)
    if (
      installStatus.minio?.status === 'installing' ||
      installStatus.velero?.status === 'installing'
    ) {
      return { color: 'processing', text: '연결 중...' };
    }

    if (installStatus.summary?.can_create_backup) {
      return { color: 'success', text: '연결됨' };
    }

    if (installStatus.minio?.installed && installStatus.velero?.installed) {
      return { color: 'processing', text: '설정 완료' };
    }

    if (installStatus.minio?.installed || installStatus.velero?.installed) {
      return { color: 'warning', text: '설정 필요' };
    }

    // 오류 상태 체크
    if (
      installStatus.minio?.status === 'error' ||
      installStatus.minio?.status === 'failed' ||
      installStatus.velero?.status === 'error' ||
      installStatus.velero?.status === 'failed'
    ) {
      return { color: 'error', text: '연결 오류' };
    }

    return { color: 'default', text: '미연결' };
  };

  // Auth handler hook
  const { requestNamespaceAuth, _requestSetupAuth, AuthModal } =
    useBackupAuthHandler({
      onAuthSuccess: (
        authData: SshAuthHop[],
        purpose: string,
        formData?: unknown
      ) => {
        if (purpose === 'namespace') {
          handleNamespaceAuthSuccess(authData);
        } else if (purpose === 'backup') {
          handleBackupAuthSuccess(authData, formData as any);
        } else if (purpose === 'dockerBackup') {
          void handleDockerBackupAuthSuccess(authData, formData as any);
        } else if (purpose === 'delete') {
          void handleDeleteAuthSuccess(authData, formData as Backup);
        }
        // 다른 purpose는 필요에 따라 처리
      },
      onAuthCancel: () => {
        // 인증 취소 시 처리
      },
    });

  // 백업 삭제 처리
  const handleDeleteBackup = async (backup: Backup) => {
    try {
      // 해당 인프라의 마스터 노드 정보 가져오기
      const masterHops = await getInfraMasterNodeHops(backup.infra_id);

      if (masterHops && masterHops.length > 0) {
        // SSH 인증이 필요한 경우 인증 요청

        requestNamespaceAuth(masterHops, 'delete', backup);
      } else {
        // SSH 인증이 필요 없는 경우 직접 삭제

        await api.backup.deleteBackup(backup.infra_id, backup.name, []);
        message.success('백업이 삭제되었습니다.');
        void loadAllBackups();
      }
    } catch {
      message.error('백업 삭제에 실패했습니다.');
    }
  };

  // 백업 삭제 인증 성공 후 처리
  const handleDeleteAuthSuccess = async (
    authData: SshAuthHop[],
    formData: Backup
  ) => {
    try {
      const backup = formData;
      // 백엔드 delete-backup API 호출 (Velero 삭제 + DB 삭제 포함)
      await api.backup.deleteBackup(backup.infra_id, backup.name, authData);

      message.success('백업이 삭제되었습니다.');
      void loadAllBackups();
    } catch {
      message.error('백업 삭제에 실패했습니다.');
    }
  };

  // 백업 복구 처리
  const handleRestoreBackup = async (backup: Backup) => {
    try {
      // 해당 인프라의 마스터 노드 정보 가져오기
      const masterHops = await getInfraMasterNodeHops(backup.infra_id);

      // 인프라 타입 확인
      const infra = infrastructures.find(i => i.id === backup.infra_id);
      const infraType = infra?.type || '';

      if (!masterHops || masterHops.length === 0) {
        message.error(
          '백업 복구를 위한 서버 정보를 찾을 수 없습니다. 인프라 설정을 확인해주세요.'
        );
        return;
      }

      // 복구 모달을 열기 위해 백업 정보와 hops 정보 저장
      setSelectedBackupForRestore(backup);
      setMasterHopsForRestore(masterHops);
      setInfraTypeForRestore(infraType);
      setIsRestoreModalVisible(true);
    } catch (error) {
      console.error('[handleRestoreBackup] 오류:', error);
      message.error('복구 작업 시작에 실패했습니다.');
    }
  };

  return (
    <div className='backup-management management-page'>
      {/* 페이지 헤더 */}
      <div className='page-header'>
        <div className='page-header-title'>
          <CloudUploadOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <h1>백업 관리</h1>
            <p className='page-header-description'>
              인프라 백업 생성, 복구 및 중앙 저장소를 관리합니다
            </p>
          </div>
        </div>
        <div className='page-header-actions'>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAllBackups}
            loading={isLoadingBackups}
          >
            새로고침
          </Button>
          <Button
            type='primary'
            icon={<CloudUploadOutlined />}
            onClick={handleCreateBackup}
          >
            새 백업 생성
          </Button>
        </div>
      </div>

      {/* 통계 카드 섹션 (서비스 관리 페이지와 동일한 UI 패턴) */}
      <Row gutter={16} className='stats-row'>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon green'>
                <CheckCircleOutlined />
              </div>
              <Statistic
                title='완료된 백업'
                value={backupStats.completed}
                suffix={`/ ${backupStats.total}`}
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon red'>
                <StopOutlined />
              </div>
              <Statistic title='실패한 백업' value={backupStats.failed} />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon blue'>
                <SyncOutlined spin={backupStats.inProgress > 0} />
              </div>
              <Statistic title='진행 중' value={backupStats.inProgress} />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon orange'>
                <HistoryOutlined />
              </div>
              <Statistic title='복구 이력' value={restoreStats.total} />
            </div>
          </div>
        </Col>
      </Row>

      {/* Docker/Podman 외부 저장소 미연결 경고 */}
      {dockerInfrasWithoutStorage.length > 0 &&
        !isCheckingGlobalStorageStatus && (
          <Alert
            message={
              <Space>
                <ContainerOutlined style={{ color: '#faad14' }} />
                <span>외부 저장소 연결 필요</span>
                <Tag color='warning'>
                  {dockerInfrasWithoutStorage.length}개 인프라
                </Tag>
              </Space>
            }
            description={
              <div>
                <p style={{ marginBottom: 8 }}>
                  다음 Docker/Podman 인프라에 외부 저장소가 연결되지 않아 백업이
                  불가능합니다:
                </p>
                <Space wrap style={{ marginBottom: 12 }}>
                  {dockerInfrasWithoutStorage.slice(0, 5).map(infra => (
                    <Tag
                      key={infra.id}
                      color={infra.type.includes('podman') ? 'orange' : 'green'}
                      icon={<ContainerOutlined />}
                    >
                      {infra.name}
                    </Tag>
                  ))}
                  {dockerInfrasWithoutStorage.length > 5 && (
                    <Tag>외 {dockerInfrasWithoutStorage.length - 5}개</Tag>
                  )}
                </Space>
                <div>
                  <Button
                    type='primary'
                    size='small'
                    icon={<LinkOutlined />}
                    onClick={() => setActiveTab('storage')}
                  >
                    외부 저장소 관리로 이동
                  </Button>
                </div>
              </div>
            }
            type='warning'
            showIcon={false}
            closable
            style={{ marginBottom: 16 }}
          />
        )}

      <div className='main-card'>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'backups',
              label: (
                <Space>
                  <DatabaseOutlined />
                  백업 목록
                  <Badge
                    count={allBackups.length}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                </Space>
              ),
              children: (
                <Card>
                  {/* 백업 생성 진행 상태 표시 */}
                  {creatingBackupInfo &&
                    creatingBackupInfo.status !== 'completed' &&
                    creatingBackupInfo.status !== 'failed' && (
                      <Alert
                        type='info'
                        showIcon
                        icon={<SyncOutlined spin />}
                        message={
                          <Space>
                            <Text strong>{creatingBackupInfo.infraName}</Text>
                            <Text>-</Text>
                            <Text>{creatingBackupInfo.name}</Text>
                          </Space>
                        }
                        description={
                          <Space direction='vertical' style={{ width: '100%' }}>
                            <Progress
                              percent={
                                creatingBackupInfo.status === 'pending'
                                  ? 30
                                  : creatingBackupInfo.status === 'inprogress'
                                    ? 60
                                    : 0
                              }
                              status='active'
                              strokeColor={{
                                '0%': '#108ee9',
                                '100%': '#87d068',
                              }}
                              format={() => creatingBackupInfo.message}
                            />
                            <Text type='secondary' style={{ fontSize: '12px' }}>
                              백업이 완료되면 자동으로 목록에 반영됩니다.
                              <Button
                                type='link'
                                size='small'
                                onClick={() => setCreatingBackupInfo(null)}
                                style={{ padding: 0, marginLeft: 8 }}
                              >
                                닫기
                              </Button>
                            </Text>
                          </Space>
                        }
                        style={{ marginBottom: 16 }}
                      />
                    )}

                  {/* 백업 완료 알림 */}
                  {creatingBackupInfo &&
                    creatingBackupInfo.status === 'completed' && (
                      <Alert
                        type='success'
                        showIcon
                        icon={<CheckCircleOutlined />}
                        message={
                          <Space>
                            <Text strong>{creatingBackupInfo.infraName}</Text>
                            <Text>-</Text>
                            <Text>{creatingBackupInfo.name}</Text>
                          </Space>
                        }
                        description={creatingBackupInfo.message}
                        closable
                        onClose={() => setCreatingBackupInfo(null)}
                        style={{ marginBottom: 16 }}
                      />
                    )}

                  {/* 백업 실패 알림 */}
                  {creatingBackupInfo &&
                    creatingBackupInfo.status === 'failed' && (
                      <Alert
                        type='error'
                        showIcon
                        icon={<CloseCircleOutlined />}
                        message={
                          <Space>
                            <Text strong>{creatingBackupInfo.infraName}</Text>
                            <Text>-</Text>
                            <Text>{creatingBackupInfo.name}</Text>
                          </Space>
                        }
                        description={creatingBackupInfo.message}
                        closable
                        onClose={() => setCreatingBackupInfo(null)}
                        style={{ marginBottom: 16 }}
                      />
                    )}

                  {/* 통합 백업 목록 뷰 (K8s/Docker/Podman) */}
                  <UnifiedBackupListView
                    k8sBackups={allBackups}
                    dockerBackups={dockerBackups}
                    dockerRestores={dockerRestores}
                    infrastructures={infrastructures}
                    onRestore={handleRestoreBackup}
                    onDelete={handleDeleteBackup}
                    getStatusColor={getBackupStatusColor}
                    loading={isLoadingBackups}
                  />
                </Card>
              ),
            },
            {
              key: 'restores',
              label: (
                <Space>
                  <HistoryOutlined />
                  복구 이력
                  <Badge
                    count={restoreStats.total}
                    style={{
                      backgroundColor:
                        restoreStats.failed > 0 ? '#ff4d4f' : '#52c41a',
                    }}
                  />
                </Space>
              ),
              children: (
                <Card>
                  {/* 복구 이력 통계 - 간소화된 인라인 태그 형태 */}
                  <div
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Tag
                      color='default'
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      <AppstoreOutlined /> 전체{' '}
                      <strong>{restoreStats.total}</strong>회
                    </Tag>
                    <Tag
                      color='success'
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      <CheckCircleOutlined /> 성공{' '}
                      <strong>{restoreStats.completed}</strong>
                    </Tag>
                    {restoreStats.failed > 0 && (
                      <Tag
                        color='error'
                        style={{ padding: '4px 12px', fontSize: 13 }}
                      >
                        <CloseCircleOutlined /> 실패{' '}
                        <strong>{restoreStats.failed}</strong>
                      </Tag>
                    )}
                    {restoreStats.inProgress > 0 && (
                      <Tag
                        color='processing'
                        style={{ padding: '4px 12px', fontSize: 13 }}
                      >
                        <SyncOutlined spin /> 진행 중{' '}
                        <strong>{restoreStats.inProgress}</strong>
                      </Tag>
                    )}
                    <span style={{ marginLeft: 8, color: '#999' }}>|</span>
                    <Tag
                      color='blue'
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      <ClusterOutlined /> K8s{' '}
                      <strong>{restoreStats.kubernetes}</strong>
                    </Tag>
                    <Tag
                      color='green'
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      <ContainerOutlined /> Docker{' '}
                      <strong>{restoreStats.docker}</strong>
                    </Tag>
                    <Tag
                      color='orange'
                      style={{ padding: '4px 12px', fontSize: 13 }}
                    >
                      <ContainerOutlined /> Podman{' '}
                      <strong>{restoreStats.podman}</strong>
                    </Tag>
                  </div>

                  {/* 복구 이력 테이블 - 간소화 */}
                  {allRestoreHistory.length > 0 ? (
                    <Table
                      dataSource={allRestoreHistory}
                      rowKey={record => `${record.runtimeType}-${record.id}`}
                      pagination={{
                        pageSize: 15,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} / ${total}개`,
                      }}
                      size='small'
                      columns={[
                        {
                          title: '유형',
                          dataIndex: 'runtimeType',
                          key: 'runtimeType',
                          width: 110,
                          render: (
                            type: 'kubernetes' | 'docker' | 'podman'
                          ) => {
                            const config = {
                              kubernetes: {
                                color: 'blue',
                                icon: <ClusterOutlined />,
                                label: 'Kubernetes',
                              },
                              docker: {
                                color: 'green',
                                icon: <ContainerOutlined />,
                                label: 'Docker',
                              },
                              podman: {
                                color: 'orange',
                                icon: <ContainerOutlined />,
                                label: 'Podman',
                              },
                            };
                            const c = config[type];
                            return (
                              <Tag color={c.color} icon={c.icon}>
                                {c.label}
                              </Tag>
                            );
                          },
                          filters: [
                            { text: 'Kubernetes', value: 'kubernetes' },
                            { text: 'Docker', value: 'docker' },
                            { text: 'Podman', value: 'podman' },
                          ],
                          onFilter: (value, record) =>
                            record.runtimeType === value,
                        },
                        {
                          title: '백업명',
                          dataIndex: 'backupName',
                          key: 'backupName',
                          ellipsis: true,
                          render: (name: string) => <Text strong>{name}</Text>,
                        },
                        {
                          title: '인프라',
                          dataIndex: 'infraName',
                          key: 'infraName',
                          width: 140,
                          ellipsis: true,
                        },
                        {
                          title: '복구 대상',
                          dataIndex: 'target',
                          key: 'target',
                          width: 120,
                          ellipsis: true,
                          render: (target?: string) => target || '-',
                        },
                        {
                          title: (
                            <Tooltip title='Docker/Podman 복구 시 적용된 옵션입니다. 볼륨: 데이터 볼륨 복원, 설정: 컨테이너 설정 복원, 재배포: 복원 후 서비스 재시작'>
                              옵션
                            </Tooltip>
                          ),
                          key: 'options',
                          width: 140,
                          render: (
                            _: unknown,
                            record: (typeof allRestoreHistory)[0]
                          ) => {
                            if (record.runtimeType === 'kubernetes') {
                              return <Text type='secondary'>-</Text>;
                            }
                            // Docker/Podman 복구 옵션 표시
                            const optionConfigs = [
                              {
                                key: 'restoreVolumes',
                                label: '볼륨',
                                tooltip: '볼륨 데이터 복원',
                              },
                              {
                                key: 'restoreConfig',
                                label: '설정',
                                tooltip: '컨테이너 설정 복원',
                              },
                              {
                                key: 'redeploy',
                                label: '재배포',
                                tooltip: '복원 후 서비스 재시작',
                              },
                            ];
                            const activeOptions = optionConfigs.filter(
                              opt =>
                                (record as Record<string, unknown>)[opt.key]
                            );
                            if (activeOptions.length === 0)
                              return <Text type='secondary'>-</Text>;
                            return (
                              <Space size={2} wrap>
                                {activeOptions.map((opt, idx) => (
                                  <Tooltip key={idx} title={opt.tooltip}>
                                    <Tag
                                      style={{
                                        fontSize: 11,
                                        padding: '0 4px',
                                        margin: 0,
                                        cursor: 'help',
                                      }}
                                    >
                                      {opt.label}
                                    </Tag>
                                  </Tooltip>
                                ))}
                              </Space>
                            );
                          },
                        },
                        {
                          title: '상태',
                          dataIndex: 'status',
                          key: 'status',
                          width: 100,
                          render: (
                            status: string,
                            record: (typeof allRestoreHistory)[0]
                          ) => {
                            const info = getRestoreStatusTagInfo(status);
                            return (
                              <Tooltip title={record.errorMessage || undefined}>
                                <Tag color={info.color} icon={info.icon}>
                                  {info.text}
                                </Tag>
                              </Tooltip>
                            );
                          },
                          filters: [
                            { text: '완료', value: 'completed' },
                            { text: '실패', value: 'failed' },
                            { text: '진행 중', value: 'progress' },
                          ],
                          onFilter: (value, record) =>
                            record.status
                              .toLowerCase()
                              .includes(value as string),
                        },
                        {
                          title: '시작 시간',
                          dataIndex: 'createdAt',
                          key: 'createdAt',
                          width: 150,
                          render: (
                            date: string,
                            record: (typeof allRestoreHistory)[0]
                          ) => {
                            const startTime = new Date(date).toLocaleString(
                              'ko-KR'
                            );
                            // 완료된 경우 소요 시간도 표시
                            if (record.completedAt) {
                              const start = new Date(date).getTime();
                              const end = new Date(
                                record.completedAt
                              ).getTime();
                              const duration = Math.round((end - start) / 1000);
                              if (duration > 0 && duration < 3600) {
                                const durationStr =
                                  duration < 60
                                    ? `${duration}초`
                                    : `${Math.floor(duration / 60)}분 ${duration % 60}초`;
                                return (
                                  <div>
                                    <Text>{startTime}</Text>
                                    <br />
                                    <Text
                                      type='secondary'
                                      style={{ fontSize: 11 }}
                                    >
                                      소요: {durationStr}
                                    </Text>
                                  </div>
                                );
                              }
                            }
                            return <Text>{startTime}</Text>;
                          },
                          sorter: (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                          defaultSortOrder: 'ascend',
                        },
                      ]}
                    />
                  ) : (
                    <Empty description='복구 이력이 없습니다' />
                  )}
                </Card>
              ),
            },
            {
              key: 'storage',
              label: (
                <Space>
                  <CloudServerOutlined />
                  외부 저장소
                  <Badge
                    count={externalStorages.length}
                    style={{ backgroundColor: '#722ed1' }}
                  />
                </Space>
              ),
              children: (
                <Card>
                  <Tabs
                    defaultActiveKey='storageList'
                    items={[
                      {
                        key: 'storageList',
                        label: (
                          <Space>
                            <DatabaseOutlined />
                            저장소 목록
                          </Space>
                        ),
                        children: (
                          <>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 16,
                              }}
                            >
                              <Alert
                                message='외부 백업 저장소 관리'
                                description={
                                  <div>
                                    <p>
                                      외부 MinIO/S3 저장소 서버를 등록하여
                                      백업을 중앙에서 관리할 수 있습니다.
                                    </p>
                                    <p style={{ marginTop: 8 }}>
                                      <strong>등록된 저장소: </strong>
                                      {externalStorages.length > 0
                                        ? `${externalStorages.length}개`
                                        : '없음'}
                                      {lastStorageRefresh && (
                                        <Text
                                          type='secondary'
                                          style={{
                                            marginLeft: 12,
                                            fontSize: 12,
                                          }}
                                        >
                                          (마지막 확인:{' '}
                                          {dayjs(lastStorageRefresh).format(
                                            'HH:mm:ss'
                                          )}
                                          )
                                        </Text>
                                      )}
                                    </p>
                                  </div>
                                }
                                type='info'
                                showIcon
                                style={{ flex: 1, marginRight: 16 }}
                              />
                              <Space>
                                <Button
                                  icon={
                                    <ReloadOutlined
                                      spin={isRefreshingStorages}
                                    />
                                  }
                                  onClick={handleRefreshStorages}
                                  loading={isRefreshingStorages}
                                >
                                  새로고침
                                </Button>
                                <Button
                                  type='primary'
                                  icon={<PlusOutlined />}
                                  onClick={() =>
                                    setIsExternalStorageModalVisible(true)
                                  }
                                >
                                  저장소 추가
                                </Button>
                              </Space>
                            </div>

                            {/* 저장소 사용량 경고 */}
                            {storageWarnings.length > 0 && (
                              <Alert
                                message='저장소 사용량 경고'
                                description={
                                  <div>
                                    {storageWarnings.map((warning, idx) => (
                                      <p key={idx} style={{ margin: '4px 0' }}>
                                        <strong>{warning.storageName}</strong> (
                                        {warning.endpoint}):{' '}
                                        {warning.usagePercent}% 사용 중
                                      </p>
                                    ))}
                                    <p style={{ marginTop: 8, color: '#666' }}>
                                      저장소 용량이 80%를 초과했습니다. 불필요한
                                      백업을 정리하거나 저장소 용량을
                                      확장해주세요.
                                    </p>
                                  </div>
                                }
                                type='warning'
                                showIcon
                                style={{ marginBottom: 16 }}
                                closable
                              />
                            )}

                            {/* 외부 저장소 서버 목록 */}
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
                                style={{ marginBottom: 24 }}
                                columns={[
                                  {
                                    title: '저장소 이름',
                                    dataIndex: 'name',
                                    key: 'name',
                                    render: (
                                      name: string,
                                      record: ExternalBackupStorage
                                    ) => (
                                      <Space>
                                        <CloudServerOutlined
                                          style={{ color: '#1890ff' }}
                                        />
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
                                        {
                                          color: string;
                                          text: string;
                                          icon: React.ReactNode;
                                        }
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
                                        <Tag
                                          color={statusInfo.color}
                                          icon={statusInfo.icon}
                                        >
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
                                    render: (date: string) =>
                                      dayjs(date).format('YYYY-MM-DD'),
                                  },
                                  {
                                    title: '작업',
                                    key: 'action',
                                    width: 120,
                                    render: (
                                      _: unknown,
                                      record: ExternalBackupStorage
                                    ) => (
                                      <Space>
                                        <Tooltip title='인프라 연결 관리'>
                                          <Button
                                            size='small'
                                            icon={<LinkOutlined />}
                                            onClick={() =>
                                              handleOpenInfraLinkModal(record)
                                            }
                                          />
                                        </Tooltip>
                                        <Popconfirm
                                          title='저장소 삭제'
                                          description='이 외부 저장소를 삭제하시겠습니까?'
                                          onConfirm={() =>
                                            handleDeleteExternalStorage(
                                              record.id
                                            )
                                          }
                                          okText='삭제'
                                          cancelText='취소'
                                        >
                                          <Button
                                            size='small'
                                            danger
                                            icon={<DeleteOutlined />}
                                          />
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
                                      상단의 &apos;저장소 추가&apos; 버튼을
                                      클릭하여 외부 저장소를 등록하세요
                                    </Text>
                                  </span>
                                }
                                style={{ padding: '24px 0' }}
                              >
                                <Button
                                  type='primary'
                                  icon={<PlusOutlined />}
                                  onClick={() =>
                                    setIsExternalStorageModalVisible(true)
                                  }
                                >
                                  첫 번째 저장소 등록하기
                                </Button>
                              </Empty>
                            )}
                          </>
                        ),
                      },
                      {
                        key: 'backupBrowser',
                        label: (
                          <Space>
                            <FolderOpenOutlined />
                            백업 브라우저
                            <Badge
                              count={minioStoredBackups.length}
                              style={{ backgroundColor: '#1890ff' }}
                            />
                          </Space>
                        ),
                        children: (
                          <>
                            <div style={{ marginBottom: 16 }}>
                              <Alert
                                message='MinIO 저장소 백업 브라우저'
                                description={
                                  <div>
                                    <p>
                                      중앙 저장소(MinIO)에 저장된 모든 백업
                                      파일을 확인할 수 있습니다.
                                    </p>
                                    <p style={{ marginTop: 8 }}>
                                      <strong>총 백업 수: </strong>
                                      {minioStoredBackups.length}개
                                      {browserRuntimeFilter !== 'all' && (
                                        <span
                                          style={{
                                            marginLeft: 8,
                                            color: '#1890ff',
                                          }}
                                        >
                                          (필터 적용:{' '}
                                          {filteredMinioBackups.length}개)
                                        </span>
                                      )}
                                      {Object.keys(backupsByStorage).length >
                                        0 && (
                                        <span style={{ marginLeft: 16 }}>
                                          <strong>저장소 수: </strong>
                                          {Object.keys(backupsByStorage).length}
                                          개
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                }
                                type='info'
                                showIcon
                                icon={<InfoCircleOutlined />}
                                style={{ marginBottom: 12 }}
                              />
                              {/* 런타임 필터 */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Text strong style={{ marginRight: 8 }}>
                                  런타임 필터:
                                </Text>
                                <Radio.Group
                                  value={browserRuntimeFilter}
                                  onChange={e =>
                                    setBrowserRuntimeFilter(e.target.value)
                                  }
                                  optionType='button'
                                  buttonStyle='solid'
                                  size='small'
                                >
                                  <Radio.Button value='all'>
                                    전체{' '}
                                    <Badge
                                      count={minioStoredBackups.length}
                                      style={{ marginLeft: 4 }}
                                      size='small'
                                    />
                                  </Radio.Button>
                                  <Radio.Button
                                    value='kubernetes'
                                    disabled={runtimeStats.kubernetes === 0}
                                  >
                                    <Space size={4}>
                                      <ClusterOutlined />
                                      K8s
                                      <Badge
                                        count={runtimeStats.kubernetes}
                                        style={{ marginLeft: 2 }}
                                        size='small'
                                      />
                                    </Space>
                                  </Radio.Button>
                                  <Radio.Button
                                    value='docker'
                                    disabled={runtimeStats.docker === 0}
                                  >
                                    <Space size={4}>
                                      <ContainerOutlined />
                                      Docker
                                      <Badge
                                        count={runtimeStats.docker}
                                        style={{ marginLeft: 2 }}
                                        size='small'
                                      />
                                    </Space>
                                  </Radio.Button>
                                  <Radio.Button
                                    value='podman'
                                    disabled={runtimeStats.podman === 0}
                                  >
                                    <Space size={4}>
                                      <ContainerOutlined />
                                      Podman
                                      <Badge
                                        count={runtimeStats.podman}
                                        style={{ marginLeft: 2 }}
                                        size='small'
                                      />
                                    </Space>
                                  </Radio.Button>
                                </Radio.Group>
                              </div>
                            </div>

                            {minioStoredBackups.length > 0 ? (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 16,
                                }}
                              >
                                {Object.entries(backupsByStorage).map(
                                  ([key, group]) => (
                                    <Card
                                      key={key}
                                      size='small'
                                      title={
                                        <Space>
                                          <CloudServerOutlined
                                            style={{ color: '#1890ff' }}
                                          />
                                          <span>
                                            {group.infraName ||
                                              '알 수 없는 인프라'}
                                          </span>
                                          <Tag color='green'>
                                            {group.endpoint}
                                          </Tag>
                                          <Tag color='blue'>{group.bucket}</Tag>
                                          <Badge
                                            count={group.backups.length}
                                            style={{
                                              backgroundColor: '#722ed1',
                                            }}
                                          />
                                        </Space>
                                      }
                                      style={{
                                        borderLeft: '3px solid #1890ff',
                                      }}
                                    >
                                      <Table
                                        dataSource={group.backups}
                                        rowKey='id'
                                        size='small'
                                        pagination={
                                          group.backups.length > 5
                                            ? { pageSize: 5, size: 'small' }
                                            : false
                                        }
                                        columns={[
                                          {
                                            title: '백업 이름',
                                            dataIndex: 'name',
                                            key: 'name',
                                            sorter: (
                                              a: UnifiedStorageBackup,
                                              b: UnifiedStorageBackup
                                            ) => a.name.localeCompare(b.name),
                                            render: (
                                              name: string,
                                              record: UnifiedStorageBackup
                                            ) => (
                                              <Space>
                                                <FileZipOutlined
                                                  style={{
                                                    color:
                                                      record.storage_type ===
                                                      'velero'
                                                        ? '#1890ff'
                                                        : '#faad14',
                                                  }}
                                                />
                                                <Text strong>{name}</Text>
                                              </Space>
                                            ),
                                          },
                                          {
                                            title: '런타임',
                                            dataIndex: 'runtime_type',
                                            key: 'runtime',
                                            width: 110,
                                            render: (
                                              _: string,
                                              record: UnifiedStorageBackup
                                            ) => {
                                              const runtimeLabels: Record<
                                                string,
                                                {
                                                  label: string;
                                                  color: string;
                                                  icon: React.ReactNode;
                                                }
                                              > = {
                                                kubernetes: {
                                                  label: 'K8s',
                                                  color: 'blue',
                                                  icon: <ClusterOutlined />,
                                                },
                                                docker: {
                                                  label: 'Docker',
                                                  color: 'green',
                                                  icon: <ContainerOutlined />,
                                                },
                                                podman: {
                                                  label: 'Podman',
                                                  color: 'orange',
                                                  icon: <ContainerOutlined />,
                                                },
                                              };
                                              const runtimeInfo = runtimeLabels[
                                                record.runtime_type
                                              ] || {
                                                label: record.runtime_type,
                                                color: 'default',
                                                icon: null,
                                              };
                                              return (
                                                <Tooltip
                                                  title={record.infra_name}
                                                >
                                                  <Tag
                                                    color={runtimeInfo.color}
                                                    icon={runtimeInfo.icon}
                                                  >
                                                    {runtimeInfo.label}
                                                  </Tag>
                                                </Tooltip>
                                              );
                                            },
                                          },
                                          {
                                            title: '유형',
                                            dataIndex: 'storage_type',
                                            key: 'backup_type',
                                            width: 90,
                                            render: (
                                              _: string,
                                              record: UnifiedStorageBackup
                                            ) => {
                                              if (
                                                record.storage_type === 'velero'
                                              ) {
                                                return (
                                                  <Tag color='geekblue'>
                                                    Velero
                                                  </Tag>
                                                );
                                              }
                                              const typeLabels: Record<
                                                string,
                                                { label: string; color: string }
                                              > = {
                                                full: {
                                                  label: '전체',
                                                  color: 'purple',
                                                },
                                                volume: {
                                                  label: '볼륨',
                                                  color: 'blue',
                                                },
                                                config: {
                                                  label: '설정',
                                                  color: 'orange',
                                                },
                                                compose: {
                                                  label: 'Compose',
                                                  color: 'cyan',
                                                },
                                              };
                                              const typeInfo = typeLabels[
                                                record.backup_type || 'full'
                                              ] || {
                                                label:
                                                  record.backup_type || '전체',
                                                color: 'default',
                                              };
                                              return (
                                                <Tag color={typeInfo.color}>
                                                  {typeInfo.label}
                                                </Tag>
                                              );
                                            },
                                          },
                                          {
                                            title: '크기',
                                            key: 'size',
                                            width: 100,
                                            sorter: (
                                              a: UnifiedStorageBackup,
                                              b: UnifiedStorageBackup
                                            ) =>
                                              (a.size_bytes || 0) -
                                              (b.size_bytes || 0),
                                            render: (
                                              _: unknown,
                                              record: UnifiedStorageBackup
                                            ) => {
                                              // K8s 백업은 size 문자열, Docker 백업은 size_bytes
                                              if (record.size)
                                                return record.size;
                                              const bytes = record.size_bytes;
                                              if (!bytes) return '-';
                                              if (bytes < 1024)
                                                return `${bytes} B`;
                                              if (bytes < 1024 * 1024)
                                                return `${(bytes / 1024).toFixed(1)} KB`;
                                              if (bytes < 1024 * 1024 * 1024)
                                                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                                              return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                                            },
                                          },
                                          {
                                            title: '상태',
                                            dataIndex: 'status',
                                            key: 'status',
                                            width: 100,
                                            render: (status: string) => {
                                              const statusInfo =
                                                getRestoreStatusTagInfo(status);
                                              return (
                                                <Tag
                                                  color={statusInfo.color}
                                                  icon={statusInfo.icon}
                                                >
                                                  {statusInfo.text}
                                                </Tag>
                                              );
                                            },
                                          },
                                          {
                                            title: '생성일',
                                            dataIndex: 'created_at',
                                            key: 'created_at',
                                            width: 150,
                                            sorter: (
                                              a: UnifiedStorageBackup,
                                              b: UnifiedStorageBackup
                                            ) =>
                                              new Date(a.created_at).getTime() -
                                              new Date(b.created_at).getTime(),
                                            defaultSortOrder: 'descend',
                                            render: (date: string) =>
                                              formatDate(date),
                                          },
                                          {
                                            title: '작업',
                                            key: 'actions',
                                            width: 120,
                                            render: (
                                              _: unknown,
                                              record: UnifiedStorageBackup
                                            ) => (
                                              <Space size='small'>
                                                <Tooltip title='상세 정보'>
                                                  <Button
                                                    type='text'
                                                    size='small'
                                                    icon={<EyeOutlined />}
                                                    onClick={() => {
                                                      if (
                                                        record.storage_type ===
                                                        'velero'
                                                      ) {
                                                        // K8s 백업 - 백업 목록 탭으로 이동
                                                        setActiveTab('backups');
                                                        message.info(
                                                          `K8s 백업 "${record.name}"의 상세 정보는 백업 목록에서 확인하세요.`
                                                        );
                                                      } else {
                                                        // Docker/Podman 백업 - 상세 모달
                                                        const dockerBackup =
                                                          dockerBackups.find(
                                                            b =>
                                                              b.id === record.id
                                                          );
                                                        if (dockerBackup) {
                                                          const restores =
                                                            dockerRestores.filter(
                                                              r =>
                                                                r.backup_id ===
                                                                record.id
                                                            );
                                                          handleShowDockerRestoreDetail(
                                                            dockerBackup,
                                                            restores
                                                          );
                                                        }
                                                      }
                                                    }}
                                                  />
                                                </Tooltip>
                                                <Tooltip title='복구'>
                                                  <Button
                                                    type='text'
                                                    size='small'
                                                    icon={
                                                      <CloudDownloadOutlined />
                                                    }
                                                    onClick={() => {
                                                      setActiveTab('backups');
                                                      message.info(
                                                        `백업 "${record.name}" 복구 기능은 백업 목록에서 이용해주세요.`
                                                      );
                                                    }}
                                                  />
                                                </Tooltip>
                                              </Space>
                                            ),
                                          },
                                        ]}
                                      />
                                    </Card>
                                  )
                                )}
                              </div>
                            ) : filteredMinioBackups.length === 0 &&
                              minioStoredBackups.length > 0 ? (
                              <Empty
                                image={
                                  <InfoCircleOutlined
                                    style={{ fontSize: 48, color: '#faad14' }}
                                  />
                                }
                                description={
                                  <div style={{ textAlign: 'center' }}>
                                    <Title
                                      level={5}
                                      style={{ color: '#666', marginBottom: 8 }}
                                    >
                                      선택한 필터에 해당하는 백업이 없습니다
                                    </Title>
                                    <Text
                                      type='secondary'
                                      style={{ fontSize: 13 }}
                                    >
                                      현재 필터:{' '}
                                      <Tag color='blue'>
                                        {browserRuntimeFilter}
                                      </Tag>
                                      <br />
                                      다른 런타임 필터를 선택하거나 전체를
                                      확인해보세요.
                                    </Text>
                                  </div>
                                }
                                style={{ padding: '30px 0' }}
                              >
                                <Button
                                  type='primary'
                                  onClick={() => setBrowserRuntimeFilter('all')}
                                >
                                  전체 백업 보기
                                </Button>
                              </Empty>
                            ) : (
                              <Empty
                                image={
                                  <FolderOpenOutlined
                                    style={{ fontSize: 64, color: '#d9d9d9' }}
                                  />
                                }
                                description={
                                  <div style={{ textAlign: 'center' }}>
                                    <Title
                                      level={5}
                                      style={{ color: '#666', marginBottom: 8 }}
                                    >
                                      MinIO에 저장된 백업이 없습니다
                                    </Title>
                                    <Text
                                      type='secondary'
                                      style={{ fontSize: 13 }}
                                    >
                                      백업 생성 시 저장소 유형을
                                      &quot;MinIO&quot;로 선택하면
                                      <br />이 페이지에서 통합 관리할 수
                                      있습니다.
                                    </Text>
                                  </div>
                                }
                                style={{ padding: '40px 0' }}
                              />
                            )}
                          </>
                        ),
                      },
                    ]}
                  />
                </Card>
              ),
            },
          ]}
        />
      </div>

      {/* 백업 환경 구축 모달 */}
      <SetupWizardModal
        visible={isSetupModalVisible}
        servers={servers || []}
        onCancel={handleSetupModalCancel}
        onSubmit={handleSetupModalSubmit}
        infrastructures={infrastructures}
        allMinioStorages={allMinioStorages}
        selectedInfraId={selectedInfraForSetup?.id.toString()}
        onStorageInfraChange={handleStorageInfraChange}
        onStartInstallation={handleStartInstallation}
      />

      {/* 간소화된 Velero 설치 모달 */}
      <SimpleVeleroInstallModal
        visible={isSimpleVeleroModalVisible}
        onCancel={() => {
          setIsSimpleVeleroModalVisible(false);
          setServersForVeleroInstall([]);
          setInfraForVeleroInstall(null);
        }}
        onSuccess={() => {
          // 설치 완료된 인프라 정보를 저장 (모달 닫기 전에)
          const installedInfra = infraForVeleroInstall;

          setIsSimpleVeleroModalVisible(false);
          setServersForVeleroInstall([]);
          setInfraForVeleroInstall(null);

          // 설치 상태 갱신을 위해 데이터 다시 로드
          loadAllBackups();

          // Velero 설치 완료 후 백업 모달 자동 재오픈
          if (installedInfra) {
            message.success(
              'Velero 설치가 완료되었습니다. 백업을 생성할 수 있습니다.'
            );
            // 약간의 딜레이 후 백업 모달 다시 열기 (상태 갱신 시간 확보)
            setTimeout(() => {
              setSelectedInfraForBackup(installedInfra);
              setVeleroInstalled(true); // 설치 완료 상태로 설정
              setIsBackupFormModalVisible(true);
            }, 500);
          }
        }}
        selectedInfra={infraForVeleroInstall}
        servers={serversForVeleroInstall}
        onOpenMinioRegistration={() => {
          // Velero 모달 닫고 MinIO 등록 모달 열기
          setIsSimpleVeleroModalVisible(false);
          setIsMinioStorageModalVisible(true);
        }}
      />

      {/* MinIO 저장소 직접 등록 모달 */}
      <MinioStorageFormModal
        visible={isMinioStorageModalVisible}
        onCancel={() => setIsMinioStorageModalVisible(false)}
        onSubmit={handleRegisterMinioStorage}
        loading={isRegisteringMinioStorage}
        infrastructures={infrastructures}
      />

      {/* 외부 저장소 등록 모달 */}
      <ExternalStorageFormModal
        visible={isExternalStorageModalVisible}
        onCancel={() => setIsExternalStorageModalVisible(false)}
        onSubmit={handleCreateExternalStorage}
        loading={isRegisteringExternalStorage}
      />

      {/* 인프라 연결 모달 */}
      <InfraLinkModal
        visible={isInfraLinkModalVisible}
        onCancel={() => {
          setIsInfraLinkModalVisible(false);
          setSelectedStorageForLink(null);
          setLinkedInfras([]);
        }}
        storage={selectedStorageForLink}
        infrastructures={infrastructures}
        linkedInfras={linkedInfras}
        onLink={handleLinkInfra}
        onUnlink={handleUnlinkInfra}
        loading={isLoadingLinkedInfras}
      />

      {/* 백업 복구 모달 */}
      <RestoreFormModal
        visible={isRestoreModalVisible}
        infraType={infraTypeForRestore}
        onCancel={() => {
          setIsRestoreModalVisible(false);
          setSelectedBackupForRestore(null);
          setMasterHopsForRestore([]);
          setInfraTypeForRestore('');
        }}
        onSubmit={async (formData: any) => {
          if (!selectedBackupForRestore) return;

          try {
            // Docker/Podman 인프라인지 확인
            const isDockerInfra =
              infraTypeForRestore === 'docker' ||
              infraTypeForRestore === 'external_docker' ||
              infraTypeForRestore === 'podman' ||
              infraTypeForRestore === 'external_podman';

            if (isDockerInfra) {
              // Docker/Podman 복구
              const dockerRestoreParams = {
                backup_id: selectedBackupForRestore.id,
                hops: formData.authData,
                restore_volumes: formData.restoreVolumes ?? true,
                restore_config: formData.restoreConfig ?? true,
                redeploy_compose: formData.redeployCompose ?? false,
                stop_existing: formData.stopExisting ?? false,
              };

              await restoreDockerBackup(dockerRestoreParams);
              message.success('Docker/Podman 복구 작업이 시작되었습니다.');
            } else {
              // K8s 복구
              const namespaceMappings =
                formData.isDifferentNamespace && formData.targetNamespace
                  ? { [formData.originalNamespace]: formData.targetNamespace }
                  : {
                      [formData.originalNamespace]: formData.originalNamespace,
                    };

              const restoreParams = {
                infra_id: selectedBackupForRestore.infra_id,
                backup_name: selectedBackupForRestore.name,
                backup_version: formData.backupVersion,
                namespace_mappings: namespaceMappings,
                auth_data: formData.authData,
              };

              await api.backup.createRestore(restoreParams);
              message.success('K8s 복구 작업이 시작되었습니다.');
            }

            setIsRestoreModalVisible(false);
            setSelectedBackupForRestore(null);
            setMasterHopsForRestore([]);
            setInfraTypeForRestore('');
            loadAllBackups();
          } catch (error: any) {
            console.error('복구 작업 실패:', error);
            // API 에러 메시지 추출
            const errorMessage =
              error?.response?.data?.error ||
              error?.response?.data?.message ||
              error?.message ||
              '복구 작업 시작에 실패했습니다.';
            message.error(errorMessage);
          }
        }}
        backup={selectedBackupForRestore}
        masterHops={masterHopsForRestore}
      />

      {/* 상세 정보 모달 */}
      <Modal
        title={
          <Space>
            <span>복구 이력</span>
            {selectedBackupGroup && (
              <Tag color='blue'>{selectedBackupGroup.backupName}</Tag>
            )}
          </Space>
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key='close' onClick={() => setIsDetailModalVisible(false)}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        {selectedBackupGroup && (
          <div>
            <Table
              dataSource={selectedBackupGroup.backups
                .flatMap(backupData =>
                  backupData.restores.map(restore => ({
                    ...restore,
                    infraName: backupData.infraName,
                    backupName: backupData.backup.name,
                  }))
                )
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )}
              rowKey={(
                record: { id: number | string },
                index: number | undefined
              ) => `${record.id}-${index}`}
              pagination={false}
              size='small'
              columns={[
                {
                  title: '백업명',
                  dataIndex: 'backupName',
                  key: 'backupName',
                  render: (text: string) => <Text strong>{text}</Text>,
                },
                {
                  title: '복구 대상',
                  dataIndex: 'namespace',
                  key: 'namespace',
                  render: (namespace: string, record: any) => {
                    // Docker/Podman인 경우 프로젝트명 또는 컨테이너로 표시
                    const infraType = record.infraType || '';
                    const isDocker =
                      infraType.includes('docker') ||
                      infraType.includes('podman');
                    if (isDocker) {
                      return (
                        record.targetProject || namespace || '전체 컨테이너'
                      );
                    }
                    return namespace || '-';
                  },
                },
                {
                  title: '상태',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => {
                    const statusInfo = getRestoreStatusDisplay(status);
                    return (
                      <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                    );
                  },
                },
                {
                  title: '복구 시작시간',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) =>
                    new Date(date).toLocaleString('ko-KR'),
                },
                {
                  title: '완료시간',
                  dataIndex: 'completed_at',
                  key: 'completed_at',
                  render: (date: string) =>
                    date ? new Date(date).toLocaleString('ko-KR') : '-',
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* 백업 생성 모달 */}
      <Modal
        title={
          <Space>
            <CloudUploadOutlined />새 백업 생성
          </Space>
        }
        open={isBackupFormModalVisible}
        onCancel={handleBackupModalClose}
        afterClose={handleBackupModalClose}
        footer={null}
        width={600}
      >
        <div className='backup-form-modal'>
          {/* Velero 상태 확인 중 로딩 표시 */}
          {isCheckingVelero && (
            <Alert
              message='Velero 설치 상태 확인 중...'
              type='info'
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          {/* K8s 인프라: Velero 미설치 경고 */}
          {selectedInfraForBackup &&
            isKubernetesInfra &&
            !isCheckingVelero &&
            veleroInstalled === false && (
              <Alert
                message={
                  <Space>
                    <ClusterOutlined />
                    <span>Velero 설치 필요</span>
                    <Tag color='blue'>{selectedInfraForBackup.name}</Tag>
                  </Space>
                }
                description={
                  <div>
                    <p style={{ marginBottom: 8 }}>
                      Kubernetes 백업을 생성하려면 먼저 Velero를 설치해야
                      합니다.
                    </p>
                    <Button
                      type='primary'
                      onClick={async () => {
                        if (selectedInfraForBackup) {
                          try {
                            // 인프라 정보 저장 (모달 닫기 전에)
                            setInfraForVeleroInstall(selectedInfraForBackup);
                            // 서버 정보 로드
                            const servers = await loadInfraServers(
                              selectedInfraForBackup.id
                            );

                            if (servers.length === 0) {
                              message.error('서버 정보를 찾을 수 없습니다.');
                              return;
                            }

                            // 마스터 서버 찾기 - 모든 필드 로깅
                            servers.forEach((s: any, idx: number) => {
                            });

                            // type 필드에 'master'가 포함되어 있는지 확인 (composite type 지원: 'master,ha', 'ha,master' 등)
                            const masterServer =
                              servers.find(
                                (s: any) =>
                                  s.node_type === 'master' ||
                                  s.nodeType === 'master' ||
                                  s.ha === 'master' ||
                                  s.type === 'master' ||
                                  (typeof s.type === 'string' &&
                                    s.type.includes('master'))
                              ) || servers[0];

                            if (masterServer) {
                              const serverId =
                                typeof masterServer.id === 'string'
                                  ? parseInt(masterServer.id, 10)
                                  : Number(masterServer.id);

                              // 마스터 서버의 hops 별도 조회
                              let hops: any[] = [];
                              try {
                                hops = await getServerHops(serverId);
                              } catch (hopsError) {
                                console.error(
                                  '[backup.tsx] getServerHops API failed:',
                                  hopsError
                                );
                              }

                              // API 결과가 비어있으면 서버의 기존 hops 사용 시도
                              if (hops.length === 0 && masterServer.hops) {
                                try {
                                  const existingHops =
                                    typeof masterServer.hops === 'string'
                                      ? JSON.parse(masterServer.hops)
                                      : masterServer.hops;
                                  if (
                                    Array.isArray(existingHops) &&
                                    existingHops.length > 0
                                  ) {
                                    hops = existingHops;
                                  }
                                } catch (parseError) {
                                  console.error(
                                    '[backup.tsx] Failed to parse existing hops:',
                                    parseError
                                  );
                                }
                              }

                              if (hops.length === 0) {
                                console.warn(
                                  '[backup.tsx] No hops found from API or server data'
                                );
                                message.warning(
                                  'SSH 접속 정보를 가져올 수 없습니다. 서버 설정을 확인해주세요.'
                                );
                              }

                              // hops 데이터를 서버에 추가
                              const serversWithHops = servers.map((s: any) => {
                                if (s.id === masterServer.id) {
                                  return { ...s, hops };
                                }
                                return s;
                              });

                              setServersForVeleroInstall(serversWithHops);
                            } else {
                              setServersForVeleroInstall(servers);
                            }

                            handleBackupModalClose();
                            // 간소화된 Velero 설치 모달 열기
                            setIsSimpleVeleroModalVisible(true);
                          } catch (error) {
                            console.error(
                              '[backup.tsx] Failed to load server hops:',
                              error
                            );
                            message.error(
                              '서버 정보를 불러오는데 실패했습니다.'
                            );
                          }
                        }
                      }}
                    >
                      Velero 설치하기
                    </Button>
                  </div>
                }
                type='warning'
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

          {/* K8s 인프라: Velero 설치됨 */}
          {selectedInfraForBackup &&
            isKubernetesInfra &&
            !isCheckingVelero &&
            veleroInstalled === true && (
              <Alert
                message={
                  <Space>
                    <ClusterOutlined />
                    <span>Kubernetes 백업 (Velero)</span>
                    <Tag color='blue'>{selectedInfraForBackup.name}</Tag>
                  </Space>
                }
                description='네임스페이스 기반으로 Velero를 통해 백업합니다.'
                type='info'
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

          {/* Docker/Podman 인프라: 외부 저장소 체크 중 */}
          {selectedInfraForBackup &&
            !isKubernetesInfra &&
            isCheckingDockerStorage && (
              <Alert
                message={
                  <Space>
                    <ContainerOutlined />
                    <span>{isPodmanInfra ? 'Podman 백업' : 'Docker 백업'}</span>
                    <Tag color={isPodmanInfra ? 'orange' : 'green'}>
                      {selectedInfraForBackup.type.includes('external')
                        ? '외부 환경'
                        : ''}{' '}
                      ({selectedInfraForBackup.name})
                    </Tag>
                  </Space>
                }
                description={
                  <Space>
                    <Spin size='small' />
                    <span>외부 저장소 연결 상태 확인 중...</span>
                  </Space>
                }
                type='info'
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

          {/* Docker/Podman 인프라: 외부 저장소 미연결 */}
          {selectedInfraForBackup &&
            !isKubernetesInfra &&
            !isCheckingDockerStorage &&
            hasDockerExternalStorage === false && (
              <Alert
                message={
                  <Space>
                    <ContainerOutlined />
                    <span>{isPodmanInfra ? 'Podman 백업' : 'Docker 백업'}</span>
                    <Tag color='red'>외부 저장소 미연결</Tag>
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      외부 저장소가 연결되지 않아 백업을 생성할 수 없습니다.
                      <br />
                      백업 관리 {'>'} 인프라 연결 메뉴에서 외부 저장소를 먼저
                      연결해주세요.
                    </div>
                    <Button
                      type='primary'
                      size='small'
                      icon={<LinkOutlined />}
                      onClick={() => {
                        handleBackupModalClose();
                        // 저장소 관리 탭으로 이동 (인프라 연결은 저장소 탭 내에서 관리)
                        setActiveTab('storage');
                      }}
                    >
                      인프라 연결하러 가기
                    </Button>
                  </div>
                }
                type='warning'
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

          {/* Docker/Podman 인프라: 외부 저장소 연결됨 */}
          {selectedInfraForBackup &&
            !isKubernetesInfra &&
            !isCheckingDockerStorage &&
            hasDockerExternalStorage === true && (
              <Alert
                message={
                  <Space>
                    <ContainerOutlined />
                    <span>{isPodmanInfra ? 'Podman 백업' : 'Docker 백업'}</span>
                    <Tag color={isPodmanInfra ? 'orange' : 'green'}>
                      {selectedInfraForBackup.type.includes('external')
                        ? '외부 환경'
                        : ''}{' '}
                      ({selectedInfraForBackup.name})
                    </Tag>
                  </Space>
                }
                description='컨테이너 볼륨, 설정, Compose 파일을 백업합니다.'
                type='success'
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

          <Form
            layout='vertical'
            initialValues={{ retention: '720h' }}
            onFinish={handleBackupFormSubmit}
            key={selectedInfraForBackup?.id || 'no-infra'} // 인프라 변경 시 폼 리셋
          >
            {/* 인프라 선택 - 선택되지 않았을 때만 표시 */}
            {!selectedInfraForBackup && (
              <>
                {/* 백업 유형 안내 */}
                <div style={{ marginBottom: 20 }}>
                  <Row gutter={[12, 12]}>
                    <Col span={8}>
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 8px',
                          background: '#f0f5ff',
                          borderRadius: 8,
                          border: '1px solid #d6e4ff',
                        }}
                      >
                        <ClusterOutlined
                          style={{
                            fontSize: 24,
                            color: '#1890ff',
                            marginBottom: 4,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#1890ff',
                          }}
                        >
                          Kubernetes
                        </div>
                        <div style={{ fontSize: 11, color: '#666' }}>
                          Velero 기반
                        </div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 8px',
                          background: '#f6ffed',
                          borderRadius: 8,
                          border: '1px solid #b7eb8f',
                        }}
                      >
                        <ContainerOutlined
                          style={{
                            fontSize: 24,
                            color: '#52c41a',
                            marginBottom: 4,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#52c41a',
                          }}
                        >
                          Docker
                        </div>
                        <div style={{ fontSize: 11, color: '#666' }}>
                          볼륨/설정
                        </div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 8px',
                          background: '#fff7e6',
                          borderRadius: 8,
                          border: '1px solid #ffd591',
                        }}
                      >
                        <ContainerOutlined
                          style={{
                            fontSize: 24,
                            color: '#fa8c16',
                            marginBottom: 4,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#fa8c16',
                          }}
                        >
                          Podman
                        </div>
                        <div style={{ fontSize: 11, color: '#666' }}>
                          볼륨/설정
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>

                <Form.Item
                  label='백업할 인프라'
                  name='infra_id'
                  rules={[{ required: true, message: '인프라를 선택해주세요' }]}
                >
                  <Select
                    placeholder='인프라를 선택하세요'
                    onChange={handleInfraSelectForBackup}
                    size='large'
                    showSearch
                    filterOption={(input, option) => {
                      // 인프라 이름으로 검색
                      const label = option?.label;
                      if (typeof label === 'string') {
                        return label
                          .toLowerCase()
                          .includes(input.toLowerCase());
                      }
                      return true;
                    }}
                  >
                    {/* 런타임별로 그룹핑하여 표시 */}
                    {infrastructures.filter(
                      i =>
                        i.type === 'kubernetes' ||
                        i.type === 'external_kubernetes'
                    ).length > 0 && (
                      <OptGroup
                        label={
                          <span>
                            <ClusterOutlined style={{ marginRight: 4 }} />
                            Kubernetes
                          </span>
                        }
                      >
                        {infrastructures
                          .filter(
                            i =>
                              i.type === 'kubernetes' ||
                              i.type === 'external_kubernetes'
                          )
                          .map(infra => (
                            <Option key={infra.id} value={infra.id}>
                              <Space>
                                <ClusterOutlined style={{ color: '#1890ff' }} />
                                <span>{infra.name}</span>
                                {infra.type === 'external_kubernetes' && (
                                  <Tag
                                    color='geekblue'
                                    style={{ marginLeft: 4 }}
                                  >
                                    외부
                                  </Tag>
                                )}
                              </Space>
                            </Option>
                          ))}
                      </OptGroup>
                    )}
                    {infrastructures.filter(
                      i => i.type === 'docker' || i.type === 'external_docker'
                    ).length > 0 && (
                      <OptGroup
                        label={
                          <span>
                            <ContainerOutlined style={{ marginRight: 4 }} />
                            Docker
                          </span>
                        }
                      >
                        {infrastructures
                          .filter(
                            i =>
                              i.type === 'docker' ||
                              i.type === 'external_docker'
                          )
                          .map(infra => (
                            <Option key={infra.id} value={infra.id}>
                              <Space>
                                <ContainerOutlined
                                  style={{ color: '#52c41a' }}
                                />
                                <span>{infra.name}</span>
                                {infra.type === 'external_docker' && (
                                  <Tag color='cyan' style={{ marginLeft: 4 }}>
                                    외부
                                  </Tag>
                                )}
                              </Space>
                            </Option>
                          ))}
                      </OptGroup>
                    )}
                    {infrastructures.filter(
                      i => i.type === 'podman' || i.type === 'external_podman'
                    ).length > 0 && (
                      <OptGroup
                        label={
                          <span>
                            <ContainerOutlined style={{ marginRight: 4 }} />
                            Podman
                          </span>
                        }
                      >
                        {infrastructures
                          .filter(
                            i =>
                              i.type === 'podman' ||
                              i.type === 'external_podman'
                          )
                          .map(infra => (
                            <Option key={infra.id} value={infra.id}>
                              <Space>
                                <ContainerOutlined
                                  style={{ color: '#fa8c16' }}
                                />
                                <span>{infra.name}</span>
                                {infra.type === 'external_podman' && (
                                  <Tag color='orange' style={{ marginLeft: 4 }}>
                                    외부
                                  </Tag>
                                )}
                              </Space>
                            </Option>
                          ))}
                      </OptGroup>
                    )}
                  </Select>
                </Form.Item>
              </>
            )}

            {/* 인프라 선택 후에만 표시되는 항목들 */}
            {/* K8s 인프라이고 Velero 미설치 시 폼 표시 안함 */}
            {/* Docker/Podman 인프라이고 외부 저장소 미연결 시 폼 표시 안함 */}
            {selectedInfraForBackup &&
              !(isKubernetesInfra && veleroInstalled === false) &&
              !isCheckingVelero &&
              !(isDockerInfra && hasDockerExternalStorage === false) &&
              !isCheckingDockerStorage && (
                <>
                  {/* 백업 이름 (공통) */}
                  <Form.Item
                    name='backupName'
                    label='백업 이름'
                    rules={[
                      { required: true, message: '백업 이름을 입력해주세요' },
                    ]}
                  >
                    <Input placeholder='예: my-app-20250821' size='large' />
                  </Form.Item>

                  {/* K8s 전용 옵션 - Velero 설치 시에만 표시 */}
                  {isKubernetesInfra && veleroInstalled === true && (
                    <>
                      <Form.Item
                        name='namespace'
                        label={
                          <Space
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>네임스페이스</span>
                            <Button
                              type='link'
                              size='small'
                              onClick={handleFetchNamespaces}
                              icon={<ReloadOutlined />}
                            >
                              가져오기
                            </Button>
                          </Space>
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
                        >
                          {namespaces.map(ns => (
                            <Option key={ns} value={ns}>
                              {ns}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      {/* '정기 백업 설정' 체크박스 */}
                      <Form.Item name='enableSchedule' valuePropName='checked'>
                        <Checkbox
                          checked={isScheduleEnabled}
                          onChange={e => setIsScheduleEnabled(e.target.checked)}
                        >
                          정기 백업 설정 (선택)
                        </Checkbox>
                      </Form.Item>

                      {/* 체크박스가 선택되었을 때만 아래 필드들이 나타납니다. */}
                      {isScheduleEnabled && (
                        <Card
                          size='small'
                          title='정기 백업 상세 설정'
                          style={{ background: '#fafafa' }}
                        >
                          <Row gutter={16}>
                            <Col span={24}>
                              <Form.Item label='백업 주기'>
                                <Select
                                  value={scheduleFrequency}
                                  onChange={setScheduleFrequency}
                                >
                                  <Option value='daily'>매일</Option>
                                  <Option value='weekly'>매주</Option>
                                  <Option value='monthly'>매월</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            {scheduleFrequency === 'weekly' && (
                              <Col span={24}>
                                <Form.Item
                                  name={['scheduleParts', 'dayOfWeek']}
                                  initialValue={1}
                                  label='요일'
                                >
                                  <Select>
                                    <Option value={1}>월요일</Option>
                                    <Option value={2}>화요일</Option>
                                    <Option value={3}>수요일</Option>
                                    <Option value={4}>목요일</Option>
                                    <Option value={5}>금요일</Option>
                                    <Option value={6}>토요일</Option>
                                    <Option value={0}>일요일</Option>
                                  </Select>
                                </Form.Item>
                              </Col>
                            )}
                            {scheduleFrequency === 'monthly' && (
                              <Col span={24}>
                                <Form.Item
                                  name={['scheduleParts', 'dayOfMonth']}
                                  initialValue={1}
                                  label='날짜'
                                >
                                  <Select>
                                    {Array.from({ length: 31 }, (_, i) => (
                                      <Option key={i + 1} value={i + 1}>
                                        {i + 1}일
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                            )}
                            <Col span={12}>
                              <Form.Item
                                name={['scheduleParts', 'hour']}
                                initialValue={2}
                                label='시간'
                              >
                                <Select>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <Option key={i} value={i}>
                                      {String(i).padStart(2, '0')}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name={['scheduleParts', 'minute']}
                                initialValue={0}
                                label='분'
                              >
                                <Select>
                                  {Array.from({ length: 60 }, (_, i) => (
                                    <Option key={i} value={i}>
                                      {String(i).padStart(2, '0')}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                          </Row>

                          <Form.Item
                            name='retention'
                            label='보관 기간'
                            rules={[
                              {
                                required: isScheduleEnabled,
                                message: '보관 기간을 선택해주세요',
                              },
                            ]}
                          >
                            <Select size='large' placeholder='보관 기간 선택'>
                              <Option value='168h'>7일</Option>
                              <Option value='720h'>30일</Option>
                              <Option value='2160h'>90일</Option>
                              <Option value='8760h'>1년</Option>
                            </Select>
                          </Form.Item>
                        </Card>
                      )}
                    </>
                  )}

                  {/* Docker/Podman 전용 옵션 */}
                  {isDockerInfra && (
                    <>
                      <Form.Item
                        name='backupType'
                        label='백업 유형'
                        rules={[
                          {
                            required: true,
                            message: '백업 유형을 선택해주세요',
                          },
                        ]}
                        initialValue='full'
                      >
                        <Radio.Group
                          value={dockerBackupType}
                          onChange={e => setDockerBackupType(e.target.value)}
                        >
                          <Space direction='vertical' style={{ width: '100%' }}>
                            <Radio value='full'>
                              <Space direction='vertical' size={0}>
                                <span style={{ fontWeight: 500 }}>
                                  전체 백업
                                </span>
                                <span style={{ fontSize: 12, color: '#888' }}>
                                  볼륨 + 컨테이너 설정 + Compose 파일
                                </span>
                              </Space>
                            </Radio>
                            <Radio value='volume'>
                              <Space direction='vertical' size={0}>
                                <span style={{ fontWeight: 500 }}>볼륨만</span>
                                <span style={{ fontSize: 12, color: '#888' }}>
                                  데이터 볼륨만 백업
                                </span>
                              </Space>
                            </Radio>
                            <Radio value='config'>
                              <Space direction='vertical' size={0}>
                                <span style={{ fontWeight: 500 }}>설정만</span>
                                <span style={{ fontSize: 12, color: '#888' }}>
                                  컨테이너 설정만 백업
                                </span>
                              </Space>
                            </Radio>
                            <Radio value='compose'>
                              <Space direction='vertical' size={0}>
                                <span style={{ fontWeight: 500 }}>
                                  Compose 파일만
                                </span>
                                <span style={{ fontSize: 12, color: '#888' }}>
                                  docker-compose.yml 파일만 백업
                                </span>
                              </Space>
                            </Radio>
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
                    </>
                  )}
                </>
              )}

            <Form.Item>
              <Space>
                <Button
                  type='primary'
                  htmlType='submit'
                  loading={isCreatingBackup}
                  disabled={
                    isCheckingVelero ||
                    (isKubernetesInfra && veleroInstalled === false)
                  }
                  size='large'
                >
                  백업 생성
                </Button>
                <Button onClick={handleBackupModalClose} size='large'>
                  취소
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* 인증 모달 */}
      <AuthModal />

      {/* Docker 복구 이력 상세 모달 */}
      <DockerRestoreDetailModal
        visible={showDockerRestoreDetail}
        backup={selectedDockerBackupForDetail}
        restores={selectedDockerRestoresForDetail}
        onClose={() => {
          setShowDockerRestoreDetail(false);
          setSelectedDockerBackupForDetail(null);
          setSelectedDockerRestoresForDetail([]);
        }}
      />

      {/* 복구 결과 상세 모달 */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            복구 결과 상세
            {selectedRestoreResult && (
              <Tag
                color={selectedRestoreResult.type === 'k8s' ? 'blue' : 'cyan'}
              >
                {selectedRestoreResult.type === 'k8s'
                  ? 'Kubernetes'
                  : 'Docker/Podman'}
              </Tag>
            )}
          </Space>
        }
        open={showRestoreResultModal}
        onCancel={() => {
          setShowRestoreResultModal(false);
          setSelectedRestoreResult(null);
        }}
        footer={[
          <Button
            key='close'
            onClick={() => {
              setShowRestoreResultModal(false);
              setSelectedRestoreResult(null);
            }}
          >
            닫기
          </Button>,
        ]}
        width={600}
      >
        {selectedRestoreResult && (
          <div>
            {/* 복구 상태 요약 */}
            <Alert
              message={
                selectedRestoreResult.status.toLowerCase() === 'completed'
                  ? '복구 성공'
                  : selectedRestoreResult.status.toLowerCase() === 'failed'
                    ? '복구 실패'
                    : selectedRestoreResult.status
                          .toLowerCase()
                          .includes('progress')
                      ? '복구 진행 중'
                      : '대기 중'
              }
              description={
                selectedRestoreResult.status.toLowerCase() === 'completed'
                  ? '백업 데이터가 성공적으로 복구되었습니다.'
                  : selectedRestoreResult.status.toLowerCase() === 'failed'
                    ? selectedRestoreResult.errorMessage ||
                      '복구 작업 중 오류가 발생했습니다.'
                    : '복구 작업이 진행 중입니다.'
              }
              type={
                selectedRestoreResult.status.toLowerCase() === 'completed'
                  ? 'success'
                  : selectedRestoreResult.status.toLowerCase() === 'failed'
                    ? 'error'
                    : 'info'
              }
              showIcon
              icon={
                selectedRestoreResult.status.toLowerCase() === 'completed' ? (
                  <CheckCircleOutlined />
                ) : selectedRestoreResult.status.toLowerCase() === 'failed' ? (
                  <CloseCircleOutlined />
                ) : (
                  <SyncOutlined spin />
                )
              }
              style={{ marginBottom: 24 }}
            />

            {/* 복구 정보 상세 */}
            <Card size='small' title='복구 정보'>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px 24px',
                }}
              >
                <div>
                  <Text type='secondary'>복구 ID</Text>
                  <div>
                    <Text strong>#{selectedRestoreResult.id}</Text>
                  </div>
                </div>
                <div>
                  <Text type='secondary'>복구 유형</Text>
                  <div>
                    <Tag
                      color={
                        selectedRestoreResult.type === 'k8s' ? 'blue' : 'cyan'
                      }
                    >
                      {selectedRestoreResult.type === 'k8s'
                        ? 'Kubernetes (Velero)'
                        : 'Docker/Podman'}
                    </Tag>
                  </div>
                </div>
                <div>
                  <Text type='secondary'>백업명</Text>
                  <div>
                    <Text strong>{selectedRestoreResult.backupName}</Text>
                  </div>
                </div>
                <div>
                  <Text type='secondary'>인프라</Text>
                  <div>
                    <Space>
                      {selectedRestoreResult.type === 'k8s' ? (
                        <ClusterOutlined />
                      ) : (
                        <ContainerOutlined />
                      )}
                      <Text>{selectedRestoreResult.infraName}</Text>
                    </Space>
                  </div>
                </div>
                <div>
                  <Text type='secondary'>복구 대상</Text>
                  <div>
                    <Text>
                      {selectedRestoreResult.type === 'k8s'
                        ? selectedRestoreResult.targetNamespace ||
                          '원본 네임스페이스'
                        : selectedRestoreResult.targetProject ||
                          '전체 컨테이너'}
                    </Text>
                  </div>
                </div>
                <div>
                  <Text type='secondary'>상태</Text>
                  <div>
                    {(() => {
                      const info = getRestoreStatusTagInfo(
                        selectedRestoreResult.status
                      );
                      return (
                        <Tag color={info.color} icon={info.icon}>
                          {info.text}
                        </Tag>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <Text type='secondary'>시작 시간</Text>
                  <div>
                    <Text>
                      {new Date(selectedRestoreResult.createdAt).toLocaleString(
                        'ko-KR'
                      )}
                    </Text>
                  </div>
                </div>
                <div>
                  <Text type='secondary'>완료 시간</Text>
                  <div>
                    <Text>
                      {selectedRestoreResult.completedAt
                        ? new Date(
                            selectedRestoreResult.completedAt
                          ).toLocaleString('ko-KR')
                        : '-'}
                    </Text>
                  </div>
                </div>
                {selectedRestoreResult.completedAt && (
                  <div>
                    <Text type='secondary'>소요 시간</Text>
                    <div>
                      <Text>
                        {(() => {
                          const start = new Date(
                            selectedRestoreResult.createdAt
                          ).getTime();
                          const end = new Date(
                            selectedRestoreResult.completedAt
                          ).getTime();
                          const duration = Math.round((end - start) / 1000);
                          // 음수 값이나 0 이하면 표시하지 않음 (시간대 문제 등)
                          if (duration <= 0) return '-';
                          if (duration < 60) return `${duration}초`;
                          if (duration < 3600)
                            return `${Math.floor(duration / 60)}분 ${duration % 60}초`;
                          return `${Math.floor(duration / 3600)}시간 ${Math.floor((duration % 3600) / 60)}분`;
                        })()}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Docker/Podman 복구 옵션 (Docker/Podman인 경우에만 표시) */}
            {selectedRestoreResult.type === 'docker' && (
              <Card size='small' title='복구 옵션' style={{ marginTop: 16 }}>
                <Space wrap size={8}>
                  <Tag
                    color={
                      selectedRestoreResult.restoreVolumes ? 'blue' : 'default'
                    }
                  >
                    {selectedRestoreResult.restoreVolumes ? '✓' : '✗'} 볼륨 복구
                  </Tag>
                  <Tag
                    color={
                      selectedRestoreResult.restoreConfig ? 'purple' : 'default'
                    }
                  >
                    {selectedRestoreResult.restoreConfig ? '✓' : '✗'} 설정 복구
                  </Tag>
                  <Tag
                    color={selectedRestoreResult.redeploy ? 'green' : 'default'}
                  >
                    {selectedRestoreResult.redeploy ? '✓' : '✗'} 서비스 재배포
                  </Tag>
                  <Tag
                    color={
                      selectedRestoreResult.stopExisting ? 'orange' : 'default'
                    }
                  >
                    {selectedRestoreResult.stopExisting ? '✓' : '✗'} 기존 서비스
                    중지
                  </Tag>
                </Space>
              </Card>
            )}

            {/* 오류 메시지 (실패 시) */}
            {selectedRestoreResult.status.toLowerCase() === 'failed' &&
              selectedRestoreResult.errorMessage && (
                <Card size='small' title='오류 상세' style={{ marginTop: 16 }}>
                  <Alert
                    message='오류 메시지'
                    description={
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          fontSize: 12,
                        }}
                      >
                        {selectedRestoreResult.errorMessage}
                      </pre>
                    }
                    type='error'
                    showIcon={false}
                  />
                </Card>
              )}

            {/* 복구 확인 안내 */}
            <Card
              size='small'
              title='복구 결과 확인 방법'
              style={{ marginTop: 16 }}
            >
              {selectedRestoreResult.type === 'k8s' ? (
                <div>
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    다음 명령어로 복구된 리소스를 확인할 수 있습니다:
                  </Text>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    {`# 네임스페이스 확인
kubectl get ns ${selectedRestoreResult.targetNamespace || '<namespace>'}

# Pod 상태 확인
kubectl get pods -n ${selectedRestoreResult.targetNamespace || '<namespace>'}

# 서비스 확인
kubectl get svc -n ${selectedRestoreResult.targetNamespace || '<namespace>'}`}
                  </pre>
                </div>
              ) : (
                <div>
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    다음 명령어로 복구된 컨테이너를 확인할 수 있습니다:
                  </Text>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    {`# 컨테이너 목록 확인
docker ps -a

# 볼륨 확인
docker volume ls

# Compose 프로젝트 확인
docker compose ls`}
                  </pre>
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* Docker/Podman 백업 생성 모달 (컨테이너 선택 기능 포함) */}
      <DockerBackupFormModal
        visible={isDockerBackupModalVisible}
        onCancel={() => {
          setIsDockerBackupModalVisible(false);
          setSelectedInfraForBackup(null);
          setDockerSshHops([]);
        }}
        onSuccess={() => {
          setIsDockerBackupModalVisible(false);
          setSelectedInfraForBackup(null);
          setDockerSshHops([]);
          // 백업 목록 새로고침
          void loadAllBackups();
        }}
        selectedInfra={selectedInfraForBackup || undefined}
        sshHops={dockerSshHops}
      />
    </div>
  );
};

export default BackupPage;
