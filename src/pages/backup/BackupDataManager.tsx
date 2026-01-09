import React from 'react';
import { message } from 'antd';
import { api } from '../../services/api';
import {
  Backup,
  Restore,
  BackupInstallStatus,
  BackupStorageWithInfra,
  CreateBackupParams,
  SshAuthHop,
  MinioInstallParams,
  VeleroInstallParams,
  BackupStorage,
} from '../../types/backup';
import { InfraItem, Server, Hop } from '../../types/infra';
import { logger } from '../../utils/logger';

interface InstallParams {
  mode: 'minio' | 'velero';
  formData: InstallWizardFormData;
  minioAuthData?: SshAuthHop[];
  veleroAuthData?: SshAuthHop[];
  minioStorage?: BackupStorage;
}

export interface InstallWizardFormData {
  minioMode: 'new' | 'existing';
  storageInfra?: number;
  storageServer?: number;
  veleroNamespace?: string;
  k8sInfra?: number;
}

export interface BackupSetupParams {
  k8s_infra_id: number;
  storage_infra_id: number;
  storage_server_id: number;
  minio_mode: 'new' | 'existing';
  auth_data?: SshAuthHop[];
  [key: string]: unknown;
}

interface BackupDataManagerProps {
  selectedInfraId?: string;
  organizationId?: number | null;
  onBackupsUpdate: (backups: Backup[]) => void;
  onRestoresUpdate: (restores: Restore[]) => void;
  onInstallStatusUpdate: (status: BackupInstallStatus | null) => void;
  onMinioStoragesUpdate: (storages: BackupStorageWithInfra[]) => void;
  onNamespacesUpdate: (namespaces: string[]) => void;
}

export const useBackupDataManager = ({
  selectedInfraId,
  organizationId,
  onBackupsUpdate,
  onRestoresUpdate,
  onInstallStatusUpdate,
  onMinioStoragesUpdate,
  onNamespacesUpdate,
}: BackupDataManagerProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [infrastructures, setInfrastructures] = React.useState<InfraItem[]>([]);
  const [servers, setServers] = React.useState<Server[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = React.useState(false);

  //  데이터 로딩 추적 (중복 호출 방지)
  const lastLoadedServersInfraIdRef = React.useRef<number | null>(null);
  const isServersLoadingRef = React.useRef<boolean>(false);
  const initialLoadDoneRef = React.useRef<boolean>(false);

  // Load infrastructures and servers (기관별 필터링 지원)
  const loadInfrastructures = React.useCallback(async () => {
    try {
      const infraResponse = await api.infra.list(organizationId);
      // API Infrastructure 타입과 InfraItem 타입은 구조가 호환됨
      const infraList = (infraResponse.data?.data ??
        []) as unknown as InfraItem[];

      setInfrastructures(infraList);
      // 초기 로드에서는 서버 리스트는 선택된 인프라에 따라 별도로 가져옵니다
      setServers([]);
    } catch (error) {
      logger.error(
        'Failed to load infrastructures:',
        error instanceof Error ? error : new Error(String(error))
      );
      message.error('인프라 목록을 불러올 수 없습니다.');
    }
  }, [organizationId]);

  const loadServers = React.useCallback(async (infraId: number) => {
    //  중복 호출 방지
    if (isServersLoadingRef.current) {
      return;
    }
    if (lastLoadedServersInfraIdRef.current === infraId && servers.length > 0) {
      return; // 이미 같은 인프라의 서버 목록이 로드됨
    }

    try {
      isServersLoadingRef.current = true;
      const serverResponse = await api.infra.listServers(infraId);
      const serverList = (serverResponse.data?.data ?? []) as unknown as Server[];
      setServers(serverList);
      lastLoadedServersInfraIdRef.current = infraId;
    } catch (error) {
      logger.error(
        `Failed to load servers for infra ${infraId}:`,
        error instanceof Error ? error : new Error(String(error))
      );
      message.error('서버 목록을 불러오는 데 실패했습니다.');
      setServers([]);
    } finally {
      isServersLoadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // servers.length는 ref로 체크하므로 의존성에서 제외

  // Load backups for selected infrastructure (수동 호출 전용)
  const loadBackups = React.useCallback(
    async (infraId: number) => {
      try {
        setIsLoading(true);
        const response = await api.backup.listBackups(infraId);
        const backups: Backup[] = response.data?.data ?? [];
        onBackupsUpdate(backups);
      } catch (error) {
        logger.error(
          'Failed to load backups:',
          error instanceof Error ? error : new Error(String(error))
        );
        message.error('백업 목록을 불러올 수 없습니다.');
        onBackupsUpdate([]);
      } finally {
        setIsLoading(false);
      }
    },
    [onBackupsUpdate]
  );

  // Load restores for selected infrastructure (수동 호출 전용)
  const loadRestores = React.useCallback(
    async (infraId: number) => {
      try {
        const response = await api.backup.listRestores(infraId);
        const restores: Restore[] = response.data?.data ?? [];
        onRestoresUpdate(restores);
      } catch (error) {
        logger.error(
          'Failed to load restores:',
          error instanceof Error ? error : new Error(String(error))
        );
        message.error('복구 이력을 불러올 수 없습니다.');
        onRestoresUpdate([]);
      }
    },
    [onRestoresUpdate]
  );

  // Load backup status for infrastructure (수동 호출 전용)
  const loadBackupStatus = React.useCallback(
    async (infraId: number) => {
      try {
        setIsLoadingStatus(true);
        const response = await api.backup.getInstallationStatus(infraId);

        if (response.data?.data?.summary) {
          onInstallStatusUpdate(response.data.data);
        } else {
          logger.warn('Failed to get a valid backup status:', response);
          onInstallStatusUpdate(null);
        }
      } catch (error) {
        logger.error(
          'Failed to load backup status:',
          error instanceof Error ? error : new Error(String(error))
        );
        onInstallStatusUpdate(null);
      } finally {
        setIsLoadingStatus(false);
      }
    },
    [onInstallStatusUpdate]
  );

  // Load all MinIO storages
  const loadAllMinioStorages = React.useCallback(async () => {
    try {
      const response = await api.backup.listAllMinioStorages();
      const storages: BackupStorageWithInfra[] = response.data?.data ?? [];

      onMinioStoragesUpdate(storages);
    } catch (error) {
      logger.error(
        'Failed to load MinIO storages:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [onMinioStoragesUpdate]);

  // Get master node hops for infrastructure
  const getMasterNodeHops = React.useCallback(
    async (infraId: number): Promise<Hop[]> => {
      try {
        const masterNode = servers.find((node: Server) => {
          // 서버의 infra_id가 일치하고, 타입이 'master'인지 확인합니다.
          if (node.infra_id !== infraId) return false;
          const nodeType: string | undefined = node.type; // 'type' 필드를 사용
          return (
            nodeType === 'master' ||
            (typeof nodeType === 'string' && nodeType.includes('master'))
          );
        });

        if (!masterNode?.hops) return [];

        const parsedHops =
          typeof masterNode.hops === 'string'
            ? (JSON.parse(masterNode.hops) as Hop[])
            : masterNode.hops;

        return Array.isArray(parsedHops) ? parsedHops : [parsedHops];
      } catch (error) {
        logger.error(
          'Failed to get master node hops:',
          error instanceof Error ? error : new Error(String(error))
        );

        return [];
      }
    },
    [servers]
  );

  // Fetch namespaces for kubernetes cluster
  const fetchNamespaces = React.useCallback(
    async (infraId: number, authData: SshAuthHop[]) => {
      try {
        const response = await api.backup.fetchNamespaces(infraId, authData);
        const responseData = response.data?.data as { namespaces?: string[] } | undefined;
        const namespaceList = responseData?.namespaces ?? [];
        onNamespacesUpdate(namespaceList);

        return namespaceList;
      } catch (error) {
        logger.error(
          'Failed to fetch namespaces:',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },
    [onNamespacesUpdate]
  );

  // Create backup
  const createBackup = React.useCallback(
    async (params: CreateBackupParams) => {
      try {
        const finalParams = {
          ...params,
          infra_id: Number(selectedInfraId), // 👈 selectedInfraId 추가
        };

        if (finalParams.hops) {
          finalParams.auth_data = finalParams.hops;
          delete finalParams.hops; // 기존 hops 키는 삭제합니다.
        }

        const response = await api.backup.createBackup(finalParams);

        if (response.data?.data?.id) {
          message.success(
            '백업 생성이 시작되었습니다. 완료되면 목록에 표시됩니다.'
          );

          // 백업 목록을 즉시 새로고침하여 'InProgress' 상태의 새 백업을 가져옵니다.
          if (selectedInfraId) {
            await loadBackups(Number(selectedInfraId));
          }

          return response.data.data; // 성공 데이터를 반환합니다.
        }

        throw new Error(response.data?.error || '백업 생성에 실패했습니다.');
      } catch (error) {
        logger.error(
          'Failed to create backup:',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },
    [selectedInfraId, loadBackups]
  );

  // Delete backup
  const deleteBackup = React.useCallback(
    async (backup: Backup, authData: SshAuthHop[]) => {
      try {
        const response = await api.backup.deleteBackup(
          backup.infra_id,
          backup.name,
          authData
        );

        if (response.data?.success) {
          message.success('백업이 삭제되었습니다.');

          if (selectedInfraId) {
            await loadBackups(Number(selectedInfraId));
          }

          return response.data?.data;
        }

        throw new Error(response.data?.error || '백업 삭제에 실패했습니다.');
      } catch (error) {
        logger.error(
          'Failed to delete backup:',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },
    [selectedInfraId, loadBackups]
  );

  // Restore backup
  const restoreBackup = React.useCallback(
    async (params: {
      infra_id: number;
      backup_name: string;
      backup_version: string;
      namespace?: string;
      namespace_mappings?: Record<string, string>;
      auth_data: SshAuthHop[];
    }) => {
      try {
        const response = await api.backup.createRestore({
          infra_id: params.infra_id,
          backup_name: params.backup_name, // 원본 백업 이름
          backup_version: params.backup_version, // 실제 복구 버전
          namespace_mappings:
            params.namespace_mappings ||
            (params.namespace
              ? { [params.namespace]: params.namespace }
              : undefined),
          auth_data: params.auth_data,
        });

        if (response.data?.success) {
          message.success('복구가 시작되었습니다.');

          if (selectedInfraId) {
            await loadRestores(Number(selectedInfraId));
          }

          return response.data?.data;
        }

        throw new Error(response.data?.error || '복구에 실패했습니다.');
      } catch (error) {
        logger.error(
          'Failed to restore backup:',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },
    [selectedInfraId, loadRestores]
  );

  const installBackupSystem = React.useCallback(
    async (params: InstallParams) => {
      const { mode, formData, minioAuthData, veleroAuthData, minioStorage } =
        params;

      try {
        if (mode === 'minio') {
          // --- MinIO 설치 로직 ---
          if (!minioAuthData || minioAuthData.length === 0) {
            throw new Error('MinIO 서버 인증 정보가 없습니다.');
          }
          message.loading({
            content: 'MinIO 설치를 요청하는 중...',
            key: 'install',
          });

          const minioParams: MinioInstallParams = {
            infra_id: formData.storageInfra,
            server_id: formData.storageServer,
            auth_data: minioAuthData,
          };
          const minioResponse = await api.backup.installMinio(minioParams);

          if (!minioResponse.data.data) {
            throw new Error(
              minioResponse.data.error || 'MinIO 설치 요청에 실패했습니다.'
            );
          }
          return minioResponse.data.data;
        } else if (mode === 'velero') {
          // --- Velero 설치 로직 ---
          if (!veleroAuthData || veleroAuthData.length === 0) {
            throw new Error('Velero 서버 인증 정보가 없습니다.');
          }
          if (!minioStorage) {
            throw new Error('Velero 설치에 필요한 MinIO 정보가 없습니다.');
          }
          message.loading({
            content: 'Velero 설치를 시작합니다...',
            key: 'install-velero',
          });

          const veleroParams: VeleroInstallParams = {
            infra_id: Number(formData.k8sInfra),
            minio_endpoint: minioStorage.endpoint,
            access_key: minioStorage.access_key,
            secret_key: minioStorage.secret_key,
            bucket: `velero-bucket-${formData.k8sInfra}`,
            auth_data: veleroAuthData,
          };
          const veleroResponse = await api.backup.installVelero(veleroParams);

          if (!veleroResponse.data.data) {
            throw new Error(
              veleroResponse.data.error || 'Velero 설치 요청에 실패했습니다.'
            );
          }
          message.success({
            content: 'Velero 설치 요청이 성공적으로 완료되었습니다.',
            key: 'install-velero',
            duration: 2,
          });
          return veleroResponse.data.data;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';
        message.error({
          content: `환경 구축 실패: ${errorMessage}`,
          key: 'install',
          duration: 5,
        });
        throw error;
      }
    },
    []
  );

  const installMinio = React.useCallback(
    async (formData: InstallWizardFormData, minioAuthData: SshAuthHop[]) => {
      try {
        if (!minioAuthData || minioAuthData.length === 0) {
          throw new Error('MinIO 서버 인증 정보가 없습니다.');
        }
        message.loading({
          content: 'MinIO 설치를 요청하는 중...',
          key: 'install',
        });

        const minioParams: MinioInstallParams = {
          infra_id: formData.storageInfra,
          server_id: formData.storageServer,
          auth_data: minioAuthData,
        };
        const minioResponse = await api.backup.installMinio(minioParams);

        if (!minioResponse.data.data) {
          throw new Error(
            minioResponse.data.error || 'MinIO 설치 요청에 실패했습니다.'
          );
        }
        return minioResponse.data.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';
        message.error({
          content: `MinIO 설치 요청 실패: ${errorMessage}`,
          key: 'install',
          duration: 5,
        });
        throw error;
      }
    },
    []
  );

  //  2. Velero 설치 함수 (나중에 상태 탭에서 호출될 수 있음)
  const installVelero = React.useCallback(
    async (
      // 필요한 파라미터를 직접 받도록 수정
      k8sInfraId: number,
      veleroAuthData: SshAuthHop[],
      minioStorage: BackupStorage // 설치 완료된 MinIO 정보
    ) => {
      try {
        message.loading({
          content: 'Velero 설치를 시작합니다...',
          key: 'install-velero',
        });

        const veleroParams: VeleroInstallParams = {
          infra_id: k8sInfraId,
          minio_endpoint: minioStorage.endpoint,
          access_key: minioStorage.access_key,
          secret_key: minioStorage.secret_key,
          bucket: `velero-bucket-${k8sInfraId}`,
          auth_data: veleroAuthData,
        };
        const veleroResponse = await api.backup.installVelero(veleroParams);

        if (!veleroResponse.data.data) {
          throw new Error(
            veleroResponse.data.error || 'Velero 설치 요청에 실패했습니다.'
          );
        }
        message.success({
          content: 'Velero 설치 요청이 성공적으로 완료되었습니다.',
          key: 'install-velero',
          duration: 2,
        });
        return veleroResponse.data.data;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';
        message.error({
          content: `Velero 설치 요청 실패: ${errorMessage}`,
          key: 'install',
          duration: 5,
        });
        throw error;
      }
    },
    []
  );

  const startBackupEnvironmentSetup = React.useCallback(
    async (params: BackupSetupParams) => {
      try {
        message.loading({
          content: '백업 환경 구축 요청을 보내는 중...',
          key: 'setup',
        });
        const response = await api.backup.startFullSetup(params);

        if (response.data?.data?.job_id) {
          message.success({
            content: '백업 환경 구축 작업이 시작되었습니다.',
            key: 'setup',
            duration: 3,
          });
          return response.data.data.job_id;
        }

        throw new Error(
          response.data?.error || '설치 작업 시작에 실패했습니다.'
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';
        message.error({
          content: `요청 실패: ${errorMessage}`,
          key: 'setup',
          duration: 5,
        });
        throw error;
      }
    },
    []
  );

  // Initialize data on mount (인프라 목록과 MinIO 저장소만 로드)
  React.useEffect(() => {
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    void loadInfrastructures();
    void loadAllMinioStorages();
  }, [loadInfrastructures, loadAllMinioStorages]);

  //  인프라 변경 시 자동 로딩 제거됨
  // 데이터 로딩은 handleInfraChange에서 수동으로 처리합니다.

  return {
    // State
    isLoading,
    isLoadingStatus,
    infrastructures,
    servers,

    // Actions
    loadBackups,
    loadServers,
    loadRestores,
    loadBackupStatus,
    loadAllMinioStorages,
    getMasterNodeHops,
    fetchNamespaces,
    createBackup,
    deleteBackup,
    restoreBackup,
    installBackupSystem,
    installMinio, //  수정한 함수들을 반환
    installVelero,
    startBackupEnvironmentSetup,

    // Computed
    selectedInfra: infrastructures.find(
      infra => infra.id === Number(selectedInfraId)
    ),
    isAdmin:
      infrastructures.find(infra => infra.id === Number(selectedInfraId))
        ?.user_role === 'admin',
  };
};

export default useBackupDataManager;
