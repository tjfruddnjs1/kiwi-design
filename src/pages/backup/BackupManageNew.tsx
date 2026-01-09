import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Card,
  Space,
  Select,
  message,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SafetyOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import './BackupManage.css';
import {
  Backup,
  Restore,
  BackupInstallStatus,
  BackupStorageWithInfra,
  CreateBackupParams,
  SshAuthHop,
  ExternalBackupStorage,
  InfraBackupStorageMapping,
} from '../../types/backup';
import { Hop } from '../../types/infra'; // ⭐️ Hop 타입 (ip, host, port, username, password 지원)
// Import our refactored components
import useBackupStatusManager from './BackupStatusManager';
import { useOrganization } from '../../context/OrganizationContext';
import useBackupDataManager, {
  InstallWizardFormData,
} from './BackupDataManager';
import useBackupAuthHandler from './BackupAuthHandler';
import BackupTabs from './BackupTabs';

// Import existing components that we'll keep
import {
  SetupWizardModal,
  BackupFormModal,
  DeleteBackupModal,
  RestoreFormModal,
  DockerBackupFormModal,
  DockerRestoreDetailModal,
  ExternalStorageFormModal,
  InfraLinkModal,
} from '../../components/backup';
import type { ExternalStorageFormValues } from '../../components/backup';
import { backupApi } from '../../lib/api/endpoints/backup';
import type { BackupFormData } from '../../components/backup/BackupFormModal';
import {
  getDockerBackups,
  getDockerRestores,
  DockerBackup,
  DockerRestore,
  deleteDockerBackup,
  restoreDockerBackup,
} from '../../lib/api/docker';
import { SshHop } from '../../lib/api/types';

const { Option } = Select;

const BackupManage: React.FC = () => {
  // 기관 컨텍스트
  const { selectedOrgId } = useOrganization();

  // Core state
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restores, setRestores] = useState<Restore[]>([]);
  const [installStatus, setInstallStatus] =
    useState<BackupInstallStatus | null>(null);
  const [allMinioStorages, setAllMinioStorages] = useState<
    BackupStorageWithInfra[]
  >([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedInfraId, setSelectedInfraId] = useState<string | undefined>(
    undefined
  );

  // Modal states
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [masterHopsForRestore, setMasterHopsForRestore] = useState<Hop[]>([]);

  // Operation states
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDockerBackupModalVisible, setIsDockerBackupModalVisible] =
    useState(false);
  const [dockerBackups, setDockerBackups] = useState<DockerBackup[]>([]);
  const [dockerRestores, setDockerRestores] = useState<DockerRestore[]>([]);
  const [dockerSshHops, setDockerSshHops] = useState<SshHop[]>([]);

  // Docker 복구 상세 모달 상태
  const [isDockerRestoreDetailVisible, setIsDockerRestoreDetailVisible] =
    useState(false);
  const [selectedDockerBackupForDetail, setSelectedDockerBackupForDetail] =
    useState<DockerBackup | null>(null);
  const [selectedDockerRestoresForDetail, setSelectedDockerRestoresForDetail] =
    useState<DockerRestore[]>([]);

  // 외부 저장소 관리 상태
  const [externalStorages, setExternalStorages] = useState<
    ExternalBackupStorage[]
  >([]);
  const [isExternalStorageModalVisible, setIsExternalStorageModalVisible] =
    useState(false);
  const [isRegisteringExternalStorage, setIsRegisteringExternalStorage] =
    useState(false);
  const [isInfraLinkModalVisible, setIsInfraLinkModalVisible] = useState(false);
  const [selectedStorageForLink, setSelectedStorageForLink] =
    useState<ExternalBackupStorage | null>(null);
  const [linkedInfras, setLinkedInfras] = useState<InfraBackupStorageMapping[]>(
    []
  );
  const [isLoadingLinkedInfras, setIsLoadingLinkedInfras] = useState(false);
  // 선택된 인프라의 외부 저장소 연결 정보
  const [selectedInfraStorageMappings, setSelectedInfraStorageMappings] =
    useState<InfraBackupStorageMapping[]>([]);

  // Docker 백업 로드 (수동 호출 전용)
  const loadDockerBackups = useCallback(async (infraId: number) => {
    try {
      const dockerBackupList = await getDockerBackups(infraId);
      setDockerBackups(dockerBackupList);
    } catch {
      // Docker backup load failed - silently ignore
    }
  }, []);

  // Docker 복구 이력 로드
  const loadDockerRestores = useCallback(async (infraId: number) => {
    try {
      const dockerRestoreList = await getDockerRestores(infraId);
      setDockerRestores(dockerRestoreList);
    } catch {
      // Docker restore history load failed - silently ignore
    }
  }, []);

  // 외부 저장소 목록 로드
  const loadExternalStorages = useCallback(async () => {
    try {
      const response = await backupApi.listExternalStorages();
      if (response.success && response.data) {
        setExternalStorages(response.data);
      }
    } catch (error) {
      console.error('외부 저장소 목록 로드 실패:', error);
    }
  }, []);

  // 선택된 인프라의 저장소 매핑 로드
  const loadSelectedInfraStorageMappings = useCallback(
    async (infraId: number) => {
      try {
        const response = await backupApi.getInfraStorageMappings(infraId);
        if (response.success && response.data) {
          setSelectedInfraStorageMappings(response.data);
        } else {
          setSelectedInfraStorageMappings([]);
        }
      } catch (error) {
        console.error('인프라 저장소 매핑 로드 실패:', error);
        setSelectedInfraStorageMappings([]);
      }
    },
    []
  );

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
        use_ssl: values.useSSL ?? true,
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
      message.error(
        `저장소 등록 실패: ${error instanceof Error ? error.message : String(error)}`
      );
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
      message.error(
        `저장소 삭제 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // 인프라 연결 모달 열기
  const handleOpenInfraLinkModal = async (storage: ExternalBackupStorage) => {
    setSelectedStorageForLink(storage);
    setIsInfraLinkModalVisible(true);
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
            m => m.external_storage_id === storage.id
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
  };

  // 인프라-저장소 연결 핸들러 (InfraLinkModal의 onLink prop에 맞게 수정)
  const handleLinkInfra = async (params: {
    infra_id: number;
    external_storage_id: number;
    bsl_name?: string;
    is_default?: boolean;
  }) => {
    try {
      const response = await backupApi.linkInfraToExternalStorage({
        infra_id: params.infra_id,
        external_storage_id: params.external_storage_id,
        bsl_name: params.bsl_name,
        is_default: params.is_default,
      });
      if (response.success) {
        message.success('인프라가 저장소에 연결되었습니다.');
        // 연결 목록 새로고침
        if (selectedStorageForLink) {
          await handleOpenInfraLinkModal(selectedStorageForLink);
        }
      }
    } catch (error) {
      message.error(
        `인프라 연결 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // 인프라-저장소 연결 해제 핸들러 (InfraLinkModal의 onUnlink prop에 맞게 수정)
  const handleUnlinkInfra = async (infraId: number, storageId: number) => {
    try {
      const response = await backupApi.unlinkInfraFromExternalStorage(
        infraId,
        storageId
      );
      if (response.success) {
        message.success('인프라 연결이 해제되었습니다.');
        setLinkedInfras(prev => prev.filter(m => m.infra_id !== infraId));
      }
    } catch (error) {
      message.error(
        `연결 해제 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Data management hook
  const {
    isLoading,
    isLoadingStatus,
    infrastructures,
    selectedInfra,
    servers,
    loadServers,
    loadBackups,
    loadRestores,
    loadBackupStatus,
    getMasterNodeHops,
    fetchNamespaces,
    createBackup,
    deleteBackup,
    restoreBackup,
    installBackupSystem,
    startBackupEnvironmentSetup, // 👈 새로 추가
  } = useBackupDataManager({
    selectedInfraId,
    organizationId: selectedOrgId, // 기관별 필터링
    onBackupsUpdate: setBackups,
    onRestoresUpdate: setRestores,
    onInstallStatusUpdate: setInstallStatus,
    onMinioStoragesUpdate: setAllMinioStorages,
    onNamespacesUpdate: setNamespaces,
  });

  // 인프라 타입 헬퍼
  const isKubernetesInfra =
    selectedInfra?.type === 'kubernetes' ||
    selectedInfra?.type === 'external_kubernetes';
  const isDockerInfra =
    selectedInfra?.type === 'docker' ||
    selectedInfra?.type === 'external_docker' ||
    selectedInfra?.type === 'podman' ||
    selectedInfra?.type === 'external_podman';

  // Status management hook
  const {
    pollingBackupId: _pollingBackupId,
    pollingRestoreId,
    isSetupPolling: _isSetupPolling,
    getBackupStatusDisplay,
    getRestoreStatusDisplay,
    jobStatus: _jobStatus,
    startJobPolling,
  } = useBackupStatusManager({
    selectedInfraId,
    backups,
    restores,
    installStatus,
    onBackupsUpdate: setBackups,
    onRestoresUpdate: setRestores,
    onInstallStatusUpdate: setInstallStatus,
    loadBackups,
    loadRestores,
    loadBackupStatus,
  });

  // Authentication handler
  const { requestNamespaceAuth, requestSetupAuth, AuthModal } =
    useBackupAuthHandler({
      onAuthSuccess: handleAuthSuccess,
      onAuthCancel: handleAuthCancel,
    });

  // Event handlers
  function handleAuthSuccess(authData: any[], purpose: string, formData?: any) {
    switch (purpose) {
      case 'namespace':
        handleNamespaceAuthSuccess(authData);
        break;
      case 'setup':
        handleSetupAuthSuccess(authData, formData);
        break;
      case 'backup':
        handleBackupAuthSuccess(authData, formData);
        break;
      case 'delete':
        handleDeleteAuthSuccess(authData, formData);
        break;
    }
  }

  function handleAuthCancel() {
    message.info('인증이 취소되었습니다.');
  }

  const handleInfraChange = async (infraId: string) => {
    setSelectedInfraId(infraId);

    //  선택한 인프라를 localStorage에 저장 (다음 방문 시 자동 선택용)
    if (infraId) {
      localStorage.setItem('backup_last_selected_infra', infraId);
    }

    if (infraId) {
      const numericInfraId = Number(infraId);

      // Reset dependent states
      setNamespaces([]);
      setSelectedBackup(null);
      setDockerBackups([]);
      setDockerSshHops([]);
      setSelectedInfraStorageMappings([]);

      // 선택된 인프라 정보 확인
      const infra = infrastructures.find(i => i.id === numericInfraId);

      // 서버 목록 및 저장소 매핑 로드
      await loadServers(numericInfraId);
      await loadSelectedInfraStorageMappings(numericInfraId);

      // 인프라 타입에 따라 데이터 로드
      if (
        infra?.type === 'docker' ||
        infra?.type === 'podman' ||
        infra?.type === 'external_docker' ||
        infra?.type === 'external_podman'
      ) {
        // Docker/Podman 인프라: Docker 백업 및 복구 이력 로드
        await Promise.all([
          loadDockerBackups(numericInfraId),
          loadDockerRestores(numericInfraId),
        ]);
      } else {
        // Kubernetes 인프라: 백업, 복구, 상태 로드
        await Promise.all([
          loadBackups(numericInfraId),
          loadRestores(numericInfraId),
          loadBackupStatus(numericInfraId),
        ]);
      }
    }
  };

  //  마지막 사용 인프라 자동 선택 (페이지 로드 시 1회만)
  const autoSelectDoneRef = useRef<boolean>(false);
  useEffect(() => {
    if (autoSelectDoneRef.current) return;
    if (infrastructures.length > 0 && !selectedInfraId) {
      autoSelectDoneRef.current = true;

      // localStorage에서 마지막 선택한 인프라 확인
      const lastSelectedInfra = localStorage.getItem(
        'backup_last_selected_infra'
      );

      // 마지막 선택한 인프라가 현재 목록에 존재하는지 확인
      const targetInfra = lastSelectedInfra
        ? infrastructures.find(i => String(i.id) === lastSelectedInfra)
        : null;

      // 존재하면 해당 인프라, 없으면 첫 번째 인프라 선택
      const targetInfraId = targetInfra
        ? String(targetInfra.id)
        : String(infrastructures[0].id);

      void handleInfraChange(targetInfraId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infrastructures]);

  // 외부 저장소 목록 로드 (컴포넌트 마운트 시)
  useEffect(() => {
    loadExternalStorages();
  }, [loadExternalStorages]);

  // Docker 인프라의 SSH hops 가져오기
  const getDockerSshHops = React.useCallback(async (): Promise<SshHop[]> => {
    if (!selectedInfraId || !isDockerInfra) return [];

    try {
      // 서버 목록에서 첫 번째 서버의 hops 사용
      const server = servers.find(s => s.infra_id === Number(selectedInfraId));
      if (!server?.hops) return [];

      const parsedHops =
        typeof server.hops === 'string' ? JSON.parse(server.hops) : server.hops;
      return parsedHops || [];
    } catch {
      // Hops parsing failed - return empty array
      return [];
    }
  }, [selectedInfraId, isDockerInfra, servers]);

  // Docker 백업 모달 열기 (현재 미사용, 향후 사용을 위해 유지)
  const _handleDockerBackupModalOpen = async () => {
    if (!selectedInfraId) return;

    const hops = await getDockerSshHops();
    setDockerSshHops(hops);
    setIsDockerBackupModalVisible(true);
  };

  // Docker 백업/복구 작업 성공 후 새로고침
  const handleDockerBackupSuccess = async () => {
    if (selectedInfraId) {
      await Promise.all([
        loadDockerBackups(Number(selectedInfraId)),
        loadDockerRestores(Number(selectedInfraId)),
      ]);
    }
  };

  // Docker 백업 삭제
  const handleDeleteDockerBackup = async (backup: DockerBackup) => {
    try {
      const hops = await getDockerSshHops();
      await deleteDockerBackup(backup.id, hops, true);
      message.success('백업이 삭제되었습니다.');
      await handleDockerBackupSuccess();
    } catch (error) {
      message.error(
        `백업 삭제 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Docker 백업 복구 - RestoreFormModal을 통해 컨테이너 선택 옵션 제공
  const handleRestoreDockerBackup = async (dockerBackup: DockerBackup) => {
    if (!selectedInfraId) return;

    try {
      // DockerBackup을 Backup 타입으로 변환 (RestoreFormModal 호환용)
      const backupForModal: Backup = {
        id: dockerBackup.id,
        name: dockerBackup.name,
        infra_id: dockerBackup.infra_id,
        namespace: dockerBackup.compose_project || '',
        status:
          dockerBackup.status === 'completed'
            ? 'Completed'
            : dockerBackup.status === 'failed'
              ? 'Failed'
              : dockerBackup.status === 'creating'
                ? 'InProgress'
                : 'Completed',
        error: dockerBackup.error_message,
        size: dockerBackup.size_bytes
          ? `${(dockerBackup.size_bytes / 1024 / 1024).toFixed(2)} MB`
          : undefined,
        created_at: dockerBackup.created_at,
        completed_at: dockerBackup.completed_at,
      };

      // SSH 인증 정보를 masterHops 형태로 변환
      const hops = await getDockerSshHops();
      const masterHops: Hop[] = hops.map(hop => ({
        ip: hop.host,
        host: hop.host,
        port: hop.port,
        username: hop.username,
        password: hop.password,
      }));

      // 선택된 백업 및 masterHops 설정 후 모달 열기
      setSelectedBackup(backupForModal);
      setMasterHopsForRestore(masterHops);
      setIsRestoreModalVisible(true);
    } catch (error) {
      message.error(
        `복구 준비 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Docker 복구 상세 보기
  const handleShowDockerRestoreDetail = (
    backup: DockerBackup,
    restores: DockerRestore[]
  ) => {
    setSelectedDockerBackupForDetail(backup);
    setSelectedDockerRestoresForDetail(restores);
    setIsDockerRestoreDetailVisible(true);
  };

  const handleSetupModalOpen = async () => {
    if (!selectedInfraId) return;

    const masterHops = await getMasterNodeHops(Number(selectedInfraId));

    if (masterHops.length > 0) {
      requestSetupAuth(masterHops, 'setup');
    } else {
      setIsSetupModalVisible(true);
    }
  };

  const handleBackupModalOpen = async () => {
    // 인프라 타입에 따라 적절한 모달 열기
    const infraType = selectedInfra?.type;

    if (
      infraType === 'docker' ||
      infraType === 'external_docker' ||
      infraType === 'podman' ||
      infraType === 'external_podman'
    ) {
      // Docker/Podman 인프라: DockerBackupFormModal 열기
      if (!selectedInfraId) {
        console.warn('[BackupManageNew] selectedInfraId is not set');
        message.warning('인프라를 먼저 선택해주세요.');
        return;
      }
      try {
        const hops = await getDockerSshHops();
        setDockerSshHops(hops);
        setIsDockerBackupModalVisible(true);
      } catch (error) {
        console.error(
          '[BackupManageNew] Failed to get Docker SSH hops:',
          error
        );
        message.error('SSH 연결 정보를 가져오는데 실패했습니다.');
      }
    } else {
      // K8s 인프라: BackupFormModal 열기
      setIsBackupModalVisible(true);
    }
  };

  // Velero 설치 요청 핸들러 (BackupFormModal에서 호출)
  const handleRequestVeleroInstall = async (infraId: number) => {
    try {
      // 선택된 인프라를 설정하고 SetupWizardModal 열기
      setSelectedInfraId(String(infraId));
      await loadServers(infraId);
    } catch (error) {
      console.error('[BackupManageNew] loadServers failed:', error);
      // 서버 로드 실패해도 모달은 열기
    }
    setIsSetupModalVisible(true);
  };

  const handleDeleteBackup = async (backup: Backup) => {
    if (!selectedInfraId) return;

    setSelectedBackup(backup);
    const masterHops = await getMasterNodeHops(Number(selectedInfraId));

    if (masterHops.length > 0) {
      requestSetupAuth(masterHops, 'delete', backup);
    } else {
      setIsDeleteModalVisible(true);
    }
  };

  const handleRestoreBackup = async (backup: Backup) => {
    if (!selectedInfraId) return;

    // 1. 사용자가 클릭한 백업 정보를 state에 저장합니다.
    setSelectedBackup(backup);

    // 2. 해당 인프라의 마스터 노드 접속 정보(host, port)를 가져옵니다.
    const masterHops = await getMasterNodeHops(Number(selectedInfraId));

    // 3. 가져온 접속 정보를 RestoreFormModal에 전달하기 위해 state에 저장합니다.
    setMasterHopsForRestore(masterHops);

    // 4. 인증 절차 없이, 바로 새로운 복구 모달을 엽니다.
    //    (인증은 이제 모달 안에서 사용자가 직접 입력하여 처리합니다.)
    setIsRestoreModalVisible(true);
  };

  // 네임스페이스 가져오기 (infraId 파라미터 지원)
  const handleRequestNamespaces = async (infraId?: number) => {
    const targetInfraId =
      infraId || (selectedInfraId ? Number(selectedInfraId) : null);

    if (!targetInfraId) {
      message.error('먼저 인프라를 선택해주세요.');
      return;
    }

    // 1. 서버 목록을 아직 로드하지 않았다면 로드합니다.
    if (servers.length === 0) {
      await loadServers(targetInfraId);
    }

    // 2. 마스터 노드 정보를 가져옵니다.
    const masterHops = await getMasterNodeHops(targetInfraId);

    // 3. hops 정보가 있으면 인증을 요청합니다.
    if (masterHops.length > 0) {
      requestNamespaceAuth(masterHops, 'namespace');
    } else {
      // 마스터 노드 정보가 없으면 사용자에게 직접 SSH 입력을 안내
      message.info(
        '마스터 노드 정보가 없습니다. "직접 SSH 입력" 버튼을 클릭하여 SSH 접속 정보를 입력하세요.'
      );
    }
  };

  // SSH 인증 정보를 포함한 네임스페이스 가져오기 (BackupFormModal의 fallback 모드에서 사용)
  const handleFetchNamespacesWithAuth = async (
    infraId: number,
    sshCredentials: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>
  ) => {
    try {
      // SSH 인증 데이터를 SshAuthHop 형식으로 변환
      const authData: SshAuthHop[] = sshCredentials.map(cred => ({
        host: cred.host,
        port: cred.port,
        username: cred.username,
        password: cred.password,
      }));

      await fetchNamespaces(infraId, authData);
      message.success('네임스페이스 목록을 가져왔습니다.');
    } catch (error) {
      message.error(
        `네임스페이스 조회 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Auth success handlers
  async function handleNamespaceAuthSuccess(authData: unknown[]) {
    if (!selectedInfraId) return;

    try {
      await fetchNamespaces(Number(selectedInfraId), authData as SshAuthHop[]);
      setIsBackupModalVisible(true);
    } catch (_error) {
      message.error('네임스페이스 목록을 가져올 수 없습니다.');
    }
  }

  async function handleSetupAuthSuccess(
    authData: SshAuthHop[],
    formData: InstallWizardFormData
  ) {
    if (!formData.storageInfra || !formData.storageServer) {
      return;
    }

    try {
      const minioServer = servers.find(s => s.id === formData.storageServer);
      const minioHops: Hop[] = minioServer
        ? typeof minioServer.hops === 'string'
          ? JSON.parse(minioServer.hops)
          : minioServer.hops || []
        : [];

      const createAuthData = (
        hops: Hop[],
        namePrefix: string
      ): SshAuthHop[] => {
        return hops.map((hop, index) => ({
          host: hop.host,
          port: hop.port,
          username: (formData as Record<string, any>)[
            `${namePrefix}_ssh_username_${index}`
          ] as string,
          password: (formData as Record<string, any>)[
            `${namePrefix}_ssh_password_${index}`
          ] as string,
        }));
      };
      const minioAuthData = createAuthData(minioHops, 'minio');

      //  installBackupSystem 함수를 'minio' 모드로 호출합니다.
      await installBackupSystem({
        mode: 'minio', // ⭐️ 'minio' 모드를 명시
        formData: formData,
        minioAuthData: minioAuthData,
      });

      setIsSetupModalVisible(false);
      message.info(
        'MinIO 설치가 시작되었습니다. 완료되면 Velero 설치가 자동으로 시작됩니다.'
      );
    } catch (_error) {
      // Error handling done in installBackupSystem
    }
  }

  async function handleBackupAuthSuccess(
    authData: SshAuthHop[],
    formData: CreateBackupParams
  ) {
    try {
      setIsCreatingBackup(true);
      // 인증 데이터(authData)를 formData에 추가하여 createBackup 호출
      await createBackup({ ...formData, auth_data: authData });
      setIsBackupModalVisible(false);
    } catch (_error) {
      message.error('백업 생성에 실패했습니다.');
    } finally {
      setIsCreatingBackup(false);
    }
  }

  async function handleDeleteAuthSuccess(authData: unknown[], backup: Backup) {
    try {
      setIsDeleting(true);
      await deleteBackup(backup, authData as SshAuthHop[]);
      setIsDeleteModalVisible(false);
    } catch (_error) {
      message.error('백업 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }

  // 통계 계산 - 인프라 타입에 따라 다른 데이터 사용
  const totalBackupCount = isDockerInfra
    ? dockerBackups.length
    : backups.length;
  const successfulBackups = isDockerInfra
    ? dockerBackups.filter(b => b.status === 'completed').length
    : backups.filter(b => b.status === 'Completed').length;
  const successfulRestores = isDockerInfra
    ? dockerRestores.filter(r => r.status === 'completed').length
    : restores.filter(r => r.status === 'Completed').length;

  return (
    <div className='backup-manage management-page'>
      {/* 페이지 헤더 */}
      <div className='page-header'>
        <div className='page-header-title'>
          <SafetyOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <div>
            <h1>백업 관리</h1>
            <div className='page-header-description'>
              인프라 백업 및 복원을 관리합니다
            </div>
          </div>
        </div>
        <div className='page-header-actions'>
          <Select
            placeholder='인프라 선택'
            style={{ width: 250 }}
            onChange={handleInfraChange}
            value={selectedInfraId || null}
          >
            {infrastructures.map(infra => {
              const typeLabelMap: Record<string, string> = {
                kubernetes: '[K8s]',
                external_kubernetes: '[K8s]',
                docker: '[Docker]',
                external_docker: '[Docker]',
                podman: '[Podman]',
                external_podman: '[Podman]',
              };
              const typeLabel = typeLabelMap[infra.type] || `[${infra.type}]`;
              return (
                <Option key={infra.id} value={String(infra.id)}>
                  {typeLabel} {infra.name}
                </Option>
              );
            })}
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              if (selectedInfraId) {
                loadBackups(Number(selectedInfraId));
                loadRestores(Number(selectedInfraId));
                loadBackupStatus(Number(selectedInfraId));
              }
            }}
            loading={isLoading}
          >
            새로고침
          </Button>
          {/* 새 백업 생성 버튼 - 모든 인프라 타입 지원 */}
          <Button
            type='primary'
            onClick={handleBackupModalOpen}
            disabled={!selectedInfraId}
          >
            <CloudUploadOutlined /> 새 백업 생성
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <Row gutter={16} className='stats-row'>
        <Col xs={24} sm={8}>
          <div className='stat-card'>
            <Space align='start'>
              <div className='stat-card-icon blue'>
                <DatabaseOutlined />
              </div>
              <Statistic
                title='전체 백업'
                value={totalBackupCount}
                suffix='개'
              />
            </Space>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className='stat-card'>
            <Space align='start'>
              <div className='stat-card-icon green'>
                <CheckCircleOutlined />
              </div>
              <Statistic
                title='성공한 백업'
                value={successfulBackups}
                suffix={`/ ${totalBackupCount}`}
              />
            </Space>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className='stat-card'>
            <Space align='start'>
              <div className='stat-card-icon orange'>
                <SafetyOutlined />
              </div>
              <Statistic
                title='복원 완료'
                value={successfulRestores}
                suffix='건'
              />
            </Space>
          </div>
        </Col>
      </Row>

      <Card className='main-card'>
        <BackupTabs
          selectedInfraId={selectedInfraId}
          selectedInfra={selectedInfra}
          backups={backups}
          restores={restores}
          installStatus={installStatus}
          isLoadingStatus={isLoadingStatus}
          pollingRestoreId={pollingRestoreId}
          getBackupStatusDisplay={getBackupStatusDisplay}
          getRestoreStatusDisplay={getRestoreStatusDisplay}
          onDeleteBackup={handleDeleteBackup}
          onRestoreBackup={handleRestoreBackup}
          onRefreshStatus={loadBackupStatus}
          infrastructures={infrastructures}
          // Docker 백업 관련 props
          dockerBackups={dockerBackups}
          dockerRestores={dockerRestores}
          onDeleteDockerBackup={handleDeleteDockerBackup}
          onRestoreDockerBackup={handleRestoreDockerBackup}
          onShowDockerRestoreDetail={handleShowDockerRestoreDetail}
          // 외부 저장소 관련 props
          externalStorages={externalStorages}
          selectedInfraStorageMappings={selectedInfraStorageMappings}
          onOpenExternalStorageModal={() =>
            setIsExternalStorageModalVisible(true)
          }
          onDeleteExternalStorage={handleDeleteExternalStorage}
          onOpenInfraLinkModal={handleOpenInfraLinkModal}
          onRefreshExternalStorages={loadExternalStorages}
        />
      </Card>

      {/* Modals */}
      <AuthModal />

      <SetupWizardModal
        visible={isSetupModalVisible}
        servers={servers}
        onCancel={() => setIsSetupModalVisible(false)}
        onSubmit={() => {
          setIsSetupModalVisible(false);
          if (selectedInfraId) {
            loadBackupStatus(Number(selectedInfraId));
          }
        }}
        infrastructures={infrastructures} //  전체 인프라 목록 전달
        allMinioStorages={allMinioStorages}
        selectedInfraId={selectedInfraId}
        onStorageInfraChange={infraId => {
          loadServers(infraId);
        }}
        onStartInstallation={async (formData: InstallWizardFormData) => {

          try {
            const jobId = await startBackupEnvironmentSetup(formData);

            if (jobId) {
              // 성공적으로 작업이 시작되면, Job 폴링을 시작합니다.
              startJobPolling(jobId);
              setIsSetupModalVisible(false);
            }
          } catch (_error) {
            // Error handling done in startBackupEnvironmentSetup
          }
        }}
      />

      <BackupFormModal
        visible={isBackupModalVisible}
        onCancel={() => setIsBackupModalVisible(false)}
        onSubmit={async (formData: BackupFormData) => {
          try {
            setIsCreatingBackup(true);

            // K8s 백업
            if (
              formData.infraType === 'kubernetes' ||
              formData.infraType === 'external_kubernetes'
            ) {
              const masterHops = await getMasterNodeHops(formData.infraId);

              // 백업 요청 데이터 기본 구성
              const backupParams = {
                infra_id: formData.infraId,
                name: formData.backupName,
                namespace: formData.namespace || '', // 백엔드는 string을 기대
                selector: formData.selector,
                schedule: formData.schedule,
                retention: formData.retention,
                // 저장소 설정 추가
                storage_type: formData.storageType,
                storage_id: formData.storageId,
                external_storage_id: formData.externalStorageId,
              };

              if (masterHops.length > 0) {
                // 서버에 마스터 노드 정보가 있는 경우 - 인증 모달 사용
                requestNamespaceAuth(masterHops, 'backup', backupParams);
              } else if (
                formData.sshCredentials &&
                formData.sshCredentials.length > 0
              ) {
                // 폼에서 직접 SSH 인증 정보를 입력한 경우
                await createBackup({
                  ...backupParams,
                  auth_data: formData.sshCredentials.map(cred => ({
                    host: cred.host,
                    port: cred.port,
                    username: cred.username,
                    password: cred.password,
                  })),
                });
                message.success('K8s 백업이 시작되었습니다.');
                setIsBackupModalVisible(false);
              } else {
                // 인증 없이 백업 생성 시도
                await createBackup(backupParams);
                message.success('K8s 백업이 시작되었습니다.');
                setIsBackupModalVisible(false);
              }
            }
            // Docker/Podman 백업
            else if (
              formData.infraType === 'docker' ||
              formData.infraType === 'podman' ||
              formData.infraType === 'external_docker' ||
              formData.infraType === 'external_podman'
            ) {
              const { createDockerBackup } = await import(
                '../../lib/api/docker'
              );

              // 폼에서 전달된 SSH 인증 정보 사용 (호스트/포트 포함)
              const sshHops: SshHop[] = (formData.sshCredentials || []).map(
                cred => ({
                  host: cred.host,
                  port: cred.port || 22,
                  username: cred.username,
                  password: cred.password,
                })
              );

              // 백업 생성 요청
              await createDockerBackup({
                infra_id: formData.infraId,
                hops: sshHops,
                name: formData.backupName,
                backup_type: formData.backupType || 'full',
                trigger_type: 'manual',
                compose_project: formData.composeProject,
                // 저장소 설정
                storage_type: formData.storageType || 'local',
                storage_id: formData.storageId,
                external_storage_id: formData.externalStorageId,
              });

              const storageLabel =
                formData.storageType === 'minio' ? ' (중앙 저장소)' : ' (로컬)';
              message.success(`Docker 백업이 시작되었습니다${storageLabel}`);
              setIsBackupModalVisible(false);

              // Docker 백업 목록 갱신
              await loadDockerBackups(formData.infraId);
            }

            // 백업 목록 갱신
            if (selectedInfraId) {
              loadBackups(Number(selectedInfraId));
            }
          } catch (error) {
            message.error(
              `백업 생성 실패: ${error instanceof Error ? error.message : String(error)}`
            );
          } finally {
            setIsCreatingBackup(false);
          }
        }}
        loading={isCreatingBackup}
        namespaces={namespaces}
        onRequestNamespaces={handleRequestNamespaces}
        onFetchNamespacesWithAuth={handleFetchNamespacesWithAuth}
        selectedInfra={selectedInfra}
        infrastructures={infrastructures}
        onRequestVeleroInstall={handleRequestVeleroInstall}
      />

      <DeleteBackupModal
        visible={isDeleteModalVisible}
        onCancel={() => {
          setIsDeleteModalVisible(false);
          setSelectedBackup(null);
        }}
        onConfirm={async (formData: unknown) => {
          if (!selectedBackup || !selectedInfraId) return;

          const masterHops = await getMasterNodeHops(Number(selectedInfraId));

          if (masterHops.length > 0) {
            requestSetupAuth(masterHops, 'delete', {
              ...(formData as object),
              backup: selectedBackup,
            });
          } else {
            try {
              setIsDeleting(true);
              await deleteBackup(selectedBackup, []);
              setIsDeleteModalVisible(false);
            } catch (_error) {
              message.error('백업 삭제에 실패했습니다.');
            } finally {
              setIsDeleting(false);
            }
          }
        }}
        loading={isDeleting}
        backup={selectedBackup}
        selectedBackup={selectedBackup}
        isDeleting={isDeleting}
      />

      <RestoreFormModal
        visible={isRestoreModalVisible}
        onCancel={() => {
          setIsRestoreModalVisible(false);
          setSelectedBackup(null);
        }}
        onSubmit={async values => {
          if (!selectedBackup || !selectedInfraId) return;

          const infraType = selectedInfra?.type || '';
          const isDockerInfra =
            infraType === 'docker' ||
            infraType === 'external_docker' ||
            infraType === 'podman' ||
            infraType === 'external_podman';

          try {
            setIsRestoring(true);

            if (isDockerInfra) {
              // Docker/Podman 복구
              const hops: SshHop[] = values.authData.map(auth => ({
                host: auth.host,
                port: auth.port,
                username: auth.username,
                password: auth.password,
              }));

              await restoreDockerBackup({
                backup_id: selectedBackup.id,
                hops,
                restore_volumes: values.restoreVolumes ?? true,
                restore_config: values.restoreConfig ?? true,
                redeploy_compose: values.redeployCompose ?? false,
                stop_existing: values.stopExisting ?? false,
                // 선택적 컨테이너 복구
                containers: values.containers,
              });

              const scopeLabel =
                values.restoreScope === 'selected' && values.containers
                  ? ` (${values.containers.length}개 컨테이너)`
                  : ' (전체)';
              message.success(`복구 작업이 시작되었습니다.${scopeLabel}`);
            } else {
              // K8s 복구
              const namespaceMappings = {
                [values.originalNamespace]: values.targetNamespace,
              };

              await restoreBackup({
                infra_id: Number(selectedInfraId),
                backup_name: selectedBackup.name,
                backup_version: values.backupVersion,
                namespace_mappings: namespaceMappings,
                auth_data: values.authData,
              });

              message.success('복구 작업이 시작되었습니다.');
            }

            setIsRestoreModalVisible(false);
            setSelectedBackup(null);
            // Docker 백업 목록 새로고침
            if (isDockerInfra) {
              setTimeout(() => void handleDockerBackupSuccess(), 2000);
            }
          } catch (error) {
            message.error(
              `복구 요청에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`
            );
          } finally {
            setIsRestoring(false);
          }
        }}
        loading={isRestoring}
        backup={selectedBackup}
        masterHops={masterHopsForRestore}
        infraType={selectedInfra?.type}
      />

      {/* Docker/Podman 백업 모달 */}
      <DockerBackupFormModal
        visible={isDockerBackupModalVisible}
        onCancel={() => setIsDockerBackupModalVisible(false)}
        onSuccess={handleDockerBackupSuccess}
        loading={isCreatingBackup}
        selectedInfra={selectedInfra}
        sshHops={dockerSshHops}
      />

      {/* Docker 복구 상세 모달 */}
      <DockerRestoreDetailModal
        visible={isDockerRestoreDetailVisible}
        backup={selectedDockerBackupForDetail}
        restores={selectedDockerRestoresForDetail}
        onClose={() => {
          setIsDockerRestoreDetailVisible(false);
          setSelectedDockerBackupForDetail(null);
          setSelectedDockerRestoresForDetail([]);
        }}
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
        storage={selectedStorageForLink}
        linkedInfras={linkedInfras}
        infrastructures={infrastructures}
        loading={isLoadingLinkedInfras}
        onCancel={() => {
          setIsInfraLinkModalVisible(false);
          setSelectedStorageForLink(null);
          setLinkedInfras([]);
        }}
        onLink={handleLinkInfra}
        onUnlink={handleUnlinkInfra}
      />
    </div>
  );
};

export default BackupManage;
