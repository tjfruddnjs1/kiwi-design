import { useState, useCallback } from 'react';
import { message } from 'antd';
import { api } from '../../services/api';
import {
  Backup,
  Restore,
  ActualBackup,
  BackupInstallStatus,
  BackupStorage,
  SshAuthHop,
} from '../../types/backup';
import { Server, InfraItem } from '../../types/infra';
import { BackupFormValues } from '../../types';

export interface UseBackupDataReturn {
  // State
  backups: Backup[];
  restores: Restore[];
  actualBackups: ActualBackup[];
  infrastructures: InfraItem[];
  servers: Server[];
  selectedInfraId: string | undefined;
  installStatus: BackupInstallStatus | null;
  minioStorages: BackupStorage[];
  allMinioStorages: BackupStorage[];
  namespaces: string[];

  // Loading states
  isLoadingStatus: boolean;
  isLoadingActualBackups: boolean;
  isFetchingNamespaces: boolean;

  // Setters
  setBackups: (backups: Backup[]) => void;
  setRestores: (restores: Restore[]) => void;
  setInfrastructures: (infrastructures: InfraItem[]) => void;
  setServers: (servers: Server[]) => void;
  setSelectedInfraId: (id: string | undefined) => void;
  setMinioStorages: (storages: BackupStorage[]) => void;

  // Actions
  loadBackups: (infraId: number) => Promise<void>;
  loadRestores: (infraId: number) => Promise<void>;
  loadActualBackups: (
    infraId: number,
    groupLabel?: string,
    backupName?: string,
    namespace?: string,
    authHops?: SshAuthHop[]
  ) => Promise<void>;
  loadBackupStatus: (infraId: number) => Promise<void>;
  loadAllMinioStorages: () => Promise<void>;
  fetchNamespaces: (values: BackupFormValues) => Promise<void>;
  resetDataState: () => void;
}

export const useBackupData = (): UseBackupDataReturn => {
  // Basic state
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restores, setRestores] = useState<Restore[]>([]);
  const [actualBackups, setActualBackups] = useState<ActualBackup[]>([]);
  const [infrastructures, setInfrastructures] = useState<InfraItem[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedInfraId, setSelectedInfraId] = useState<string | undefined>(
    undefined
  );
  const [installStatus, setInstallStatus] =
    useState<BackupInstallStatus | null>(null);
  const [minioStorages, setMinioStorages] = useState<BackupStorage[]>([]);
  const [allMinioStorages, setAllMinioStorages] = useState<BackupStorage[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);

  // Loading states
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingActualBackups, setIsLoadingActualBackups] = useState(false);
  const [isFetchingNamespaces, setIsFetchingNamespaces] = useState(false);

  // Load backups
  const loadBackups = useCallback(async (infraId: number) => {
    try {
      const response = await api.backup.listBackups(infraId);

      setBackups(response.data.data || []);
    } catch (_error) {
      message.error('백업 목록을 불러오는데 실패했습니다.');
    }
  }, []);

  // Load restores
  const loadRestores = useCallback(async (infraId: number) => {
    try {
      const response = await api.backup.listRestores(infraId);

      setRestores(response.data.data || []);
    } catch (_error) {
      message.error('복원 목록을 불러오는데 실패했습니다.');
    }
  }, []);

  // Load actual backups
  const loadActualBackups = useCallback(
    async (
      infraId: number,
      groupLabel: string = '',
      backupName: string = '',
      namespace: string = '',
      authHops: SshAuthHop[] = []
    ) => {
      try {
        setIsLoadingActualBackups(true);
        const response = await api.backup.listActualBackups(
          infraId,
          groupLabel,
          backupName,
          namespace,
          authHops
        );

        setActualBackups(response.data.data || []);
      } catch (_error) {
        message.error('실제 백업 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingActualBackups(false);
      }
    },
    []
  );

  // Load backup status
  const loadBackupStatus = useCallback(async (infraId: number) => {
    try {
      setIsLoadingStatus(true);
      const response = await api.backup.getInstallationStatus(infraId);
      const raw = response.data.data as any;

      if (raw) {
        setInstallStatus({
          minio: {
            installed: raw.minio_status === 'installed',
            status: raw.minio_status as
              | 'not_installed'
              | 'installing'
              | 'active'
              | 'failed'
              | 'error'
              | 'connected',
            error: (raw.minio_error as string) || undefined,
            endpoint: (raw.minio_endpoint as string) || undefined,
            local_installation:
              (raw.minio_local_installation as boolean) || undefined,
            connected_minio_info:
              typeof raw.connected_minio_info === 'object'
                ? (raw.connected_minio_info as {
                    id: number;
                    endpoint: string;
                    status: string;
                    infra_id: number;
                  })
                : undefined,
          },
          velero: {
            installed: raw.velero_status === 'installed',
            status: raw.velero_status as
              | 'not_installed'
              | 'installing'
              | 'active'
              | 'failed'
              | 'error',
            error: (raw.velero_error as string) || undefined,
            requires_kubernetes:
              (raw.velero_requires_kubernetes as boolean) || undefined,
            infra_type_supported:
              (raw.velero_infra_type_supported as boolean) || undefined,
            connected_minio_id: (raw.connected_minio_id as number) || undefined,
            connected_minio_info:
              typeof raw.connected_minio_info === 'object'
                ? (raw.connected_minio_info as {
                    id: number;
                    endpoint: string;
                    status: string;
                    infra_id: number;
                  })
                : undefined,
          },
          summary: {
            infra_name: '',
            infra_type: '',
            backup_ready: false,
            can_create_backup: false,
            has_external_storage: false,
          },
        });
      } else {
        setInstallStatus(null);
      }
    } catch (_error) {
      message.error('백업 상태를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Load all MinIO storages
  const loadAllMinioStorages = useCallback(async () => {
    try {
      const response = await api.backup.listAllMinioStorages();

      setAllMinioStorages(response.data.data || []);
    } catch (_error) {
      message.error('MinIO 저장소 목록을 불러오는데 실패했습니다.');
    }
  }, []);

  // Fetch namespaces
  const fetchNamespaces = useCallback(async (values: BackupFormValues) => {
    try {
      setIsFetchingNamespaces(true);
      const authData: SshAuthHop[] =
        values.serverUsername && values.serverPassword
          ? [
              {
                host: '', // Will be populated by backend based on infraId
                port: 22,
                username: values.serverUsername,
                password: values.serverPassword,
              },
            ]
          : [];

      const response = await api.backup.fetchNamespaces(
        values.infraId || 0,
        authData
      );

      setNamespaces(
        response.data && response.data.success && response.data.data
          ? response.data.data
          : []
      );
    } catch (_error) {
      message.error('네임스페이스 목록을 가져오는데 실패했습니다.');
      setNamespaces([]);
    } finally {
      setIsFetchingNamespaces(false);
    }
  }, []);

  // Reset data state
  const resetDataState = useCallback(() => {
    setBackups([]);
    setRestores([]);
    setActualBackups([]);
    setInstallStatus(null);
    setMinioStorages([]);
    setAllMinioStorages([]);
    setNamespaces([]);
  }, []);

  return {
    // State
    backups,
    restores,
    actualBackups,
    infrastructures,
    servers,
    selectedInfraId,
    installStatus,
    minioStorages,
    allMinioStorages,
    namespaces,

    // Loading states
    isLoadingStatus,
    isLoadingActualBackups,
    isFetchingNamespaces,

    // Setters
    setBackups,
    setRestores,
    setInfrastructures,
    setServers,
    setSelectedInfraId,
    setMinioStorages,

    // Actions
    loadBackups,
    loadRestores,
    loadActualBackups,
    loadBackupStatus,
    loadAllMinioStorages,
    fetchNamespaces,
    resetDataState,
  };
};
