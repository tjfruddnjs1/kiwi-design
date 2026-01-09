import { Form, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import {
    Backup,
    BackupInstallStatus,
    BackupStorageWithInfra,
    CreateBackupParams,
    MinioInstallParams,
    Restore,
    VeleroInstallParams,
} from '../types/backup';
import { Hop, InfraItem, Server } from '../types/infra';
import { logger } from '../utils/logger';

// Type definitions

interface AuthFormValues {
  [key: string]: string;
}

export interface BackupManagementState {
  backups: Backup[];
  restores: Restore[];
  pollingRestoreId: number | null;
  infrastructures: InfraItem[];
  servers: Server[];
  selectedInfraId: string | undefined;
  isSetupModalVisible: boolean;
  isBackupModalVisible: boolean;
  isDeleteModalVisible: boolean;
  selectedBackup: Backup | null;
  isCreatingBackup: boolean;
  isDeleting: boolean;
  currentStep: number;
  scheduleType: 'daily' | 'weekly' | 'monthly';
  installStatus: BackupInstallStatus | null;
  isLoadingStatus: boolean;
  configData: {
    minio: MinioInstallParams | BackupStorageWithInfra | null;
    velero: VeleroInstallParams | null;
    backup: CreateBackupParams | null;
  };
  allMinioStorages: BackupStorageWithInfra[];
  minioMode: 'existing' | 'new';
  namespaces: string[];
  isFetchingNamespaces: boolean;
  isNamespaceAuthModalVisible: boolean;
  isRestoreModalVisible: boolean;
  isRestoring: boolean;
  restoreToDifferentNamespace: boolean;
  currentAuthHops: Hop[];
  setupHops: Hop[];
}

export interface BackupManagementActions {
  // State setters
  setSelectedInfraId: (id: string | undefined) => void;
  setIsSetupModalVisible: (visible: boolean) => void;
  setIsBackupModalVisible: (visible: boolean) => void;
  setIsDeleteModalVisible: (visible: boolean) => void;
  setSelectedBackup: (backup: Backup | null) => void;
  setCurrentStep: (step: number) => void;
  setScheduleType: (type: 'daily' | 'weekly' | 'monthly') => void;
  setMinioMode: (mode: 'existing' | 'new') => void;
  setIsNamespaceAuthModalVisible: (visible: boolean) => void;
  setIsRestoreModalVisible: (visible: boolean) => void;
  setRestoreToDifferentNamespace: (restore: boolean) => void;

  // Business logic functions
  handleK8sInfraChange: (k8sInfraId: string) => Promise<void>;
  formatAuthData: (
    formValues: AuthFormValues,
    hops: Hop[]
  ) => Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  getMasterNodeHops: (infraId: number) => Promise<Hop[]>;
  loadBackups: (infraId: number) => Promise<void>;
  loadInfrastructures: () => Promise<void>;
  getServers: (infraId: number) => Promise<Server[]>;
  handleInfraChange: (infraId: string) => Promise<void>;
  handleBackupModalOpen: () => void;
  handleDeleteBackup: (backup: Backup) => void;
  checkInstallStatus: (infraId: number) => Promise<void>;

  // Forms
  setupForm: ReturnType<typeof Form.useForm>[0];
  backupForm: ReturnType<typeof Form.useForm>[0];
  deleteForm: ReturnType<typeof Form.useForm>[0];
  namespaceAuthForm: ReturnType<typeof Form.useForm>[0];
  restoreForm: ReturnType<typeof Form.useForm>[0];

  // Computed values
  selectedInfra: InfraItem | undefined;
  isAdmin: boolean;
}

export const useBackupManagement = (): BackupManagementState &
  BackupManagementActions => {
  // State management
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restores, setRestores] = useState<Restore[]>([]);
  const [pollingRestoreId, _setPollingRestoreId] = useState<number | null>(
    null
  );
  const [infrastructures, setInfrastructures] = useState<InfraItem[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedInfraId, setSelectedInfraId] = useState<string | undefined>(
    undefined
  );
  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [isCreatingBackup, _setIsCreatingBackup] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scheduleType, setScheduleType] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [installStatus, setInstallStatus] =
    useState<BackupInstallStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [configData, _setConfigData] = useState<{
    minio: MinioInstallParams | BackupStorageWithInfra | null;
    velero: VeleroInstallParams | null;
    backup: CreateBackupParams | null;
  }>({
    minio: null,
    velero: null,
    backup: null,
  });
  const [allMinioStorages, _setAllMinioStorages] = useState<
    BackupStorageWithInfra[]
  >([]);
  const [minioMode, setMinioMode] = useState<'existing' | 'new'>('new');
  const [namespaces, _setNamespaces] = useState<string[]>([]);
  const [isFetchingNamespaces, _setIsFetchingNamespaces] = useState(false);
  const [isNamespaceAuthModalVisible, setIsNamespaceAuthModalVisible] =
    useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [isRestoring, _setIsRestoring] = useState(false);
  const [restoreToDifferentNamespace, setRestoreToDifferentNamespace] =
    useState(false);
  const [currentAuthHops, setCurrentAuthHops] = useState<Hop[]>([]);
  const [setupHops, _setSetupHops] = useState<Hop[]>([]);

  // Forms
  const [setupForm] = Form.useForm();
  const [backupForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const [namespaceAuthForm] = Form.useForm();
  const [restoreForm] = Form.useForm();

  // Computed values
  const selectedInfra = infrastructures.find(
    infra => infra.id === Number(selectedInfraId)
  );
  const isAdmin = selectedInfra?.user_role === 'admin';

  // Helper functions
  const getMasterNodeHops = async (infraId: number): Promise<Hop[]> => {
    try {
      const serverList = await getServers(infraId);
      const masterNode = serverList.find(
        s =>
          s.type?.includes('master') || s.type?.includes('external_kubernetes')
      );

      if (!masterNode || !masterNode.hops) {
        message.error('백업 작업을 수행할 마스터 노드를 찾을 수 없습니다.');

        return [];
      }

      // hops가 이미 배열이면 그대로 반환, 문자열이면 파싱
      return typeof masterNode.hops === 'string'
        ? JSON.parse(masterNode.hops)
        : masterNode.hops;
    } catch (error) {
      logger.error('마스터 노드 정보 조회 실패:', error);
      message.error('마스터 노드 정보를 가져오는 데 실패했습니다.');

      return [];
    }
  };

  const handleK8sInfraChange = useCallback(
    async (k8sInfraId: string) => {
      if (k8sInfraId) {
        const masterHops = await getMasterNodeHops(Number(k8sInfraId));

        setCurrentAuthHops(masterHops);
      } else {
        setCurrentAuthHops([]);
      }
    },
    [getMasterNodeHops]
  );

  const formatAuthData = (
    formValues: AuthFormValues,
    hops: Hop[]
  ): Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }> => {
    return hops.map((hop, index) => ({
      host: hop.host ?? hop.ip ?? '',
      port: hop.port ?? 22,
      username: formValues[`ssh_username_${index}`],
      password: formValues[`ssh_password_${index}`],
    }));
  };

  // Data loading functions
  const loadBackups = useCallback(async (infraId: number) => {
    try {
      logger.info(`📋 백업 목록 로드 시작 - 인프라 ID: ${infraId}`);
      const response = await api.backup.listBackups(infraId);

      if (response.data.data) {
        setBackups(response.data.data);
        logger.info(` 백업 목록 로드 완료 - ${response.data.data.length}개`);
      } else {
        setBackups([]);
        logger.warn('백업 데이터가 없습니다.');
      }
    } catch (error) {
      logger.error('백업 목록 로드 실패:', error);
      message.error('백업 목록을 가져오는 데 실패했습니다.');
      setBackups([]);
    }
  }, []);

  const loadInfrastructures = useCallback(async () => {
    try {
      const response = await api.infra.list();

      if (response.data?.data) {
        setInfrastructures(response.data.data);
      } else {
        setInfrastructures([]);
      }
    } catch (error) {
      logger.error('인프라 목록 로드 실패:', error);
      message.error('인프라 목록을 가져오는 데 실패했습니다.');
    }
  }, []);

  const getServers = async (infraId: number): Promise<Server[]> => {
    try {
      const response = await api.infra.listServers(infraId);
      const serverList = response.data || response;

      if (Array.isArray(serverList)) {
        setServers(serverList);

        return serverList;
      } else {
        logger.error(
          '잘못된 서버 목록 응답 형식',
          new Error(JSON.stringify(serverList))
        );
        setServers([]);

        return [];
      }
    } catch (error) {
      logger.error('서버 목록 조회 실패:', error);
      message.error('서버 목록을 가져오는 데 실패했습니다.');
      setServers([]);

      return [];
    }
  };

  const handleInfraChange = useCallback(
    async (infraId: string) => {
      setSelectedInfraId(infraId);
      if (infraId) {
        await Promise.all([
          loadBackups(Number(infraId)),
          checkInstallStatus(Number(infraId)),
          getServers(Number(infraId)),
        ]);
      } else {
        setBackups([]);
        setRestores([]);
        setInstallStatus(null);
        setServers([]);
      }
    },
    [loadBackups]
  );

  const handleBackupModalOpen = () => {
    setIsBackupModalVisible(true);
    backupForm.resetFields();
  };

  const handleDeleteBackup = (backup: Backup) => {
    setSelectedBackup(backup);
    setIsDeleteModalVisible(true);
  };

  const checkInstallStatus = async (infraId: number) => {
    try {
      setIsLoadingStatus(true);
      const response = await api.backup.checkInstallation(infraId);

      if (response.data?.data) {
        setInstallStatus(response.data.data);
      }
    } catch (error) {
      logger.error('설치 상태 확인 실패:', error);
      message.error('백업 환경 상태 확인에 실패했습니다.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    loadInfrastructures();
  }, [loadInfrastructures]);

  return {
    // State
    backups,
    restores,
    pollingRestoreId,
    infrastructures,
    servers,
    selectedInfraId,
    isSetupModalVisible,
    isBackupModalVisible,
    isDeleteModalVisible,
    selectedBackup,
    isCreatingBackup,
    isDeleting,
    currentStep,
    scheduleType,
    installStatus,
    isLoadingStatus,
    configData,
    allMinioStorages,
    minioMode,
    namespaces,
    isFetchingNamespaces,
    isNamespaceAuthModalVisible,
    isRestoreModalVisible,
    isRestoring,
    restoreToDifferentNamespace,
    currentAuthHops,
    setupHops,

    // Actions
    setSelectedInfraId,
    setIsSetupModalVisible,
    setIsBackupModalVisible,
    setIsDeleteModalVisible,
    setSelectedBackup,
    setCurrentStep,
    setScheduleType,
    setMinioMode,
    setIsNamespaceAuthModalVisible,
    setIsRestoreModalVisible,
    setRestoreToDifferentNamespace,

    // Functions
    handleK8sInfraChange,
    formatAuthData,
    getMasterNodeHops,
    loadBackups,
    loadInfrastructures,
    getServers,
    handleInfraChange,
    handleBackupModalOpen,
    handleDeleteBackup,
    checkInstallStatus,

    // Forms
    setupForm,
    backupForm,
    deleteForm,
    namespaceAuthForm,
    restoreForm,

    // Computed
    selectedInfra,
    isAdmin,
  };
};

export default useBackupManagement;
