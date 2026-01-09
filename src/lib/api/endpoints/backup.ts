// 백업 관련 API 엔드포인트
// MinIO/Velero 설치, 백업/복구 생성 및 조회 기능을 제공합니다

import { Environment } from '@/components/infra/InfraVeleroSetting';
import { apiClient } from '../client';
import type {
    ActualBackup,
    ApiRequestOptions,
    Backup,
    BackupInstallStatus,
    BackupStorage,
    BackupStorageWithInfra,
    CreateBackupParams,
    CreateExternalStorageParams,
    CreateRestoreParams,
    ExternalBackupStorage,
    InfraBackupStorageMapping,
    LinkInfraToStorageParams,
    MinioInstallParams,
    Restore,
    SshHop,
    StandardApiResponse,
    VeleroInstallParams,
} from '../types';

/** 백업 스토리지 생성 데이터 타입 */
export interface BackupStorageCreateData {
  infra_id: number;
  name: string;
  type: 'minio' | 'velero';
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  bucket_name?: string;
  region?: string;
  auth_data?: SshHop[];
}

/** 백업 스토리지 업데이트 데이터 타입 */
export interface BackupStorageUpdateData {
  id: number;
  name?: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  bucket_name?: string;
  region?: string;
  status?: string;
}

/** 버킷 업데이트 데이터 타입 */
export interface BucketUpdateData {
  id: number;
  bucket_name: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
}

export const backupApi = {
  // 통합 요청 함수 (기존 호환성 유지)
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.backup<TResponse>(action, parameters, options);
  },

  // 설치 관련
  installMinio: (
    params: MinioInstallParams
  ): Promise<StandardApiResponse<BackupStorage>> => {
    return apiClient.backup<BackupStorage>('install-minio', params, {
      showSuccessMessage: true,
      successMessage: 'MinIO 설치가 시작되었습니다.',
    });
  },

  installVelero: (
    params: VeleroInstallParams
  ): Promise<StandardApiResponse<BackupStorage>> => {
    return apiClient.backup<BackupStorage>('install-velero', params, {
      showSuccessMessage: true,
      successMessage: 'Velero 설치가 시작되었습니다.',
    });
  },

  checkInstallation: (
    infraId: number
  ): Promise<StandardApiResponse<BackupInstallStatus>> => {
    return apiClient.backup<BackupInstallStatus>('check-installation', {
      infra_id: infraId,
    });
  },

  getInstallationStatus: (
    infraId: number
  ): Promise<StandardApiResponse<BackupInstallStatus>> => {
    // check-installation 액션 사용 (외부 저장소 연결 정보를 올바르게 확인)
    return apiClient.backup<BackupInstallStatus>('check-installation', {
      infra_id: infraId,
    });
  },

  // 백업
  create: (
    params: CreateBackupParams
  ): Promise<StandardApiResponse<Backup>> => {
    return apiClient.backup<Backup>('create-backup', params, {
      showSuccessMessage: true,
      successMessage: '백업이 성공적으로 생성되었습니다.',
    });
  },

  list: (infraId: number): Promise<StandardApiResponse<Backup[]>> => {
    return apiClient.backup<Backup[]>('list-backups', { infra_id: infraId });
  },

  delete: (
    infraId: number,
    name: string,
    authData: SshHop[]
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.backup<void>('delete-backup', {
      infra_id: infraId,
      name,
      auth_data: authData,
    });
  },

  listActualBackups: (
    infraId: number,
    backupName: string,
    namespace: string,
    authData: SshHop[]
  ): Promise<StandardApiResponse<ActualBackup[]>> => {
    return apiClient.backup<ActualBackup[]>('list-actual-backups', {
      infra_id: infraId,
      backup_name: backupName,
      namespace,
      auth_data: authData,
    });
  },

  fetchNamespaces: (
    infraId: number,
    authData: SshHop[]
  ): Promise<StandardApiResponse<string[]>> => {
    return apiClient.backup<string[]>('fetch-namespaces', {
      infra_id: infraId,
      auth_data: authData,
    });
  },

  // 복구
  createRestore: (
    params: CreateRestoreParams
  ): Promise<StandardApiResponse<Restore>> => {
    return apiClient.backup<Restore>('create-restore', params, {
      showSuccessMessage: true,
      successMessage: '복원이 시작되었습니다.',
    });
  },

  listRestores: (infraId: number): Promise<StandardApiResponse<Restore[]>> => {
    return apiClient.backup<Restore[]>('list-restores', { infra_id: infraId });
  },

  deleteRestore: (
    infraId: number,
    name: string,
    authData: SshHop[]
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.backup<void>('delete-restore', {
      infra_id: infraId,
      name,
      auth_data: authData,
    });
  },

  // 저장소
  listMinioStorages: (
    infraId: number
  ): Promise<StandardApiResponse<BackupStorage[]>> => {
    return apiClient.backup<BackupStorage[]>('list-minio-storages', {
      infra_id: infraId,
    });
  },

  listAllMinioStorages: (): Promise<
    StandardApiResponse<BackupStorageWithInfra[]>
  > => {
    return apiClient.backup<BackupStorageWithInfra[]>(
      'list-all-minio-storages',
      {}
    );
  },

  // 2025 09 26 기존 방식에서 playbook 방식으로 변환하면서 db 저장 로직 구분

  getEnvironments: (
    type: 'minio' | 'velero'
  ): Promise<StandardApiResponse<Environment[]>> => {
    return apiClient.backup<Environment[]>('get-environments', { type });
  },

  createBackupStorage: (backupStorageData: BackupStorageCreateData) => {
    return apiClient.backup<BackupStorage>(
      'create-backup-storage',
      backupStorageData,
      {
        showSuccessMessage: true,
        successMessage: '백업 스토리지 생성이 시작되었습니다.',
      }
    );
  },

  getVeleroByInfraId: (infraId: number): Promise<Environment | null> => {
    return apiClient
      .backup<Environment>('get-velero-by-infra-id', {
        infra_id: infraId,
      })
      .then(response => response.data);
  },

  getMinIOByInfraId: (
    infraId: number,
    endpoint: string
  ): Promise<Environment | null> => {
    return apiClient
      .backup<Environment>('get-minio-by-infra-id', {
        infra_id: infraId,
        endpoint: endpoint,
      })
      .then(response => response.data);
  },

  updateBackupStorage: (backupStorageData: BackupStorageUpdateData) => {
    return apiClient.backup<BackupStorage>(
      'update-backup-storage',
      backupStorageData,
      {
        showSuccessMessage: true,
        successMessage: '백업 스토리지 업데이트가 완료되었습니다.',
      }
    );
  },

  deleteEnvironment: (id: number) => {
    return apiClient.backup<void>(
      'delete-environment',
      { id },
      {
        showSuccessMessage: true,
        successMessage: '백업 환경이 삭제되었습니다.',
      }
    );
  },

  updateBucket: (backupStorageData: BucketUpdateData) => {
    return apiClient.backup<BackupStorage>('update-bucket', backupStorageData, {
      showSuccessMessage: true,
      successMessage: '버킷 정보가 업데이트되었습니다.',
    });
  },

  updateBackupLocation: (backupLocationData: Environment) => {
    return apiClient.backup<BackupStorage>(
      'update-backup-location',
      backupLocationData,
      {
        showSuccessMessage: true,
        successMessage: '백업 로케이션 정보가 업데이트되었습니다.',
      }
    );
  },

  // ============ 외부 백업 저장소 API ============

  // 외부 저장소 목록 조회
  listExternalStorages: (): Promise<
    StandardApiResponse<ExternalBackupStorage[]>
  > => {
    return apiClient.backup<ExternalBackupStorage[]>(
      'list-external-storages',
      {}
    );
  },

  // 외부 저장소 생성
  createExternalStorage: (
    params: CreateExternalStorageParams
  ): Promise<StandardApiResponse<ExternalBackupStorage>> => {
    return apiClient.backup<ExternalBackupStorage>(
      'create-external-storage',
      params,
      {
        showSuccessMessage: true,
        successMessage: '외부 저장소가 등록되었습니다.',
      }
    );
  },

  // 외부 저장소 상세 조회
  getExternalStorage: (
    id: number
  ): Promise<StandardApiResponse<ExternalBackupStorage>> => {
    return apiClient.backup<ExternalBackupStorage>('get-external-storage', {
      id,
    });
  },

  // 외부 저장소 수정
  updateExternalStorage: (
    id: number,
    params: Partial<CreateExternalStorageParams>
  ): Promise<StandardApiResponse<ExternalBackupStorage>> => {
    return apiClient.backup<ExternalBackupStorage>(
      'update-external-storage',
      { id, ...params },
      {
        showSuccessMessage: true,
        successMessage: '외부 저장소가 수정되었습니다.',
      }
    );
  },

  // 외부 저장소 삭제
  deleteExternalStorage: (id: number): Promise<StandardApiResponse<void>> => {
    return apiClient.backup<void>(
      'delete-external-storage',
      { id },
      {
        showSuccessMessage: true,
        successMessage: '외부 저장소가 삭제되었습니다.',
      }
    );
  },

  // 외부 저장소 연결 테스트
  testExternalStorageConnection: (params: {
    endpoint: string;
    access_key: string;
    secret_key: string;
    bucket: string;
    use_ssl?: boolean;
    // SSH 터널링 설정
    ssh_enabled?: boolean;
    ssh_gateway_host?: string;
    ssh_gateway_port?: number;
    ssh_gateway_user?: string;
    ssh_gateway_password?: string;
    ssh_target_host?: string;
    ssh_target_port?: number;
    ssh_target_user?: string;
    ssh_target_password?: string;
  }): Promise<
    StandardApiResponse<{ connected: boolean; message?: string }>
  > => {
    return apiClient.backup<{ connected: boolean; message?: string }>(
      'test-external-storage-connection',
      params
    );
  },

  // 외부 저장소의 백업 목록 조회
  listExternalStorageBackups: (
    storageId: number
  ): Promise<StandardApiResponse<Backup[]>> => {
    return apiClient.backup<Backup[]>('list-external-storage-backups', {
      storage_id: storageId,
    });
  },

  // 인프라-외부저장소 연결
  linkInfraToExternalStorage: (
    params: LinkInfraToStorageParams
  ): Promise<StandardApiResponse<InfraBackupStorageMapping>> => {
    return apiClient.backup<InfraBackupStorageMapping>(
      'link-infra-to-external-storage',
      params,
      {
        showSuccessMessage: true,
        successMessage: '인프라가 외부 저장소에 연결되었습니다.',
      }
    );
  },

  // 인프라-외부저장소 연결 해제
  unlinkInfraFromExternalStorage: (
    infraId: number,
    storageId: number
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.backup<void>(
      'unlink-infra-from-external-storage',
      {
        infra_id: infraId,
        external_storage_id: storageId,
      },
      {
        showSuccessMessage: true,
        successMessage: '인프라와 외부 저장소 연결이 해제되었습니다.',
      }
    );
  },

  // 인프라의 저장소 매핑 조회
  getInfraStorageMappings: (
    infraId: number
  ): Promise<StandardApiResponse<InfraBackupStorageMapping[]>> => {
    return apiClient.backup<InfraBackupStorageMapping[]>(
      'get-infra-storage-mappings',
      { infra_id: infraId }
    );
  },

  //  [최적화] 여러 인프라의 저장소 매핑을 한 번에 조회 (배치 API)
  // N번의 개별 API 호출을 1번으로 줄여 성능을 대폭 개선합니다.
  getBatchInfraStorageMappings: (
    infraIds: number[]
  ): Promise<
    StandardApiResponse<Record<number, InfraBackupStorageMapping[]>>
  > => {
    return apiClient.backup<Record<number, InfraBackupStorageMapping[]>>(
      'get-batch-infra-storage-mappings',
      { infra_ids: infraIds }
    );
  },

  //  [최적화] 여러 인프라의 백업 목록을 한 번에 조회 (배치 API)
  getBatchBackups: (
    infraIds: number[]
  ): Promise<StandardApiResponse<Record<number, Backup[]>>> => {
    return apiClient.backup<Record<number, Backup[]>>('get-batch-backups', {
      infra_ids: infraIds,
    });
  },

  //  [최적화] 여러 인프라의 복구 목록을 한 번에 조회 (배치 API)
  getBatchRestores: (
    infraIds: number[]
  ): Promise<StandardApiResponse<Record<number, Restore[]>>> => {
    return apiClient.backup<Record<number, Restore[]>>('get-batch-restores', {
      infra_ids: infraIds,
    });
  },
} as const;

export default backupApi;
