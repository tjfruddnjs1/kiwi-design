import { Infrastructure } from './infra';

// [추가] Multi-Hop SSH 인증 정보를 위한 공용 타입
export interface SshAuthHop {
  host: string;
  port: number;
  username: string;
  password?: string; // 향후 키 기반 인증을 위해 비밀번호는 옵셔널로 설정 가능
}

export interface MinIOConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  useExisting: boolean;
}

export interface VeleroConfig {
  namespace: string;
  backupStorageLocation: string;
}

export interface BackupJob {
  id: string;
  name: string;
  namespaces: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  schedule?: {
    frequency: string;
    retention: string;
  };
}

export interface BackupEnvironmentStatus {
  minioInstalled: boolean;
  veleroInstalled: boolean;
  lastBackupStatus?: string;
  availableNamespaces: string[];
}

export interface BackupConfig {
  name: string;
  namespace: string;
  infra: Infrastructure;
  schedule?: string;
  retention?: string;
}

export interface BackupStorage {
  id: number;
  infra_id: number;
  server_id?: number;
  type: 'minio' | 'velero';
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket_name?: string;
  status: 'installing' | 'active' | 'error';
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface BackupStorageWithInfra {
  id: number;
  infra_id: number;
  infra_name: string;
  infra_type: string;
  server_id?: number;
  type: 'minio' | 'velero';
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket_name?: string;
  status: 'installing' | 'active' | 'error';
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface Backup {
  id: number;
  name: string;
  infra_id: number;
  group_label?: string;
  namespace: string;
  schedule?: string;
  retention?: string;
  status:
    | 'creating'
    | 'completed'
    | 'failed'
    | 'InProgress'
    | 'Running'
    | 'Completed'
    | 'Failed'
    | 'PartiallyFailed';
  error?: string;
  size?: string;
  created_at: string;
  completed_at?: string;
}

export interface MinioInstallParams {
  infra_id: number;
  server_id: number;
  access_key?: string; // 이제 선택적입니다.
  secret_key?: string; // 이제 선택적입니다.
  port?: number;
  auth_data: SshAuthHop[];
  server_username?: string;
  server_password?: string;
}

export interface VeleroInstallParams {
  infra_id: number;
  minio_endpoint: string;
  access_key: string;
  secret_key: string;
  bucket: string;
  auth_data: SshAuthHop[];
  server_username?: string;
  server_password?: string;
  external_storage_id?: number; // 외부 저장소 ID (external_backup_storages)
  storage_id?: number; // deprecated - 기존 호환성을 위해 유지
}

export interface CreateBackupParams {
  name?: string; // 백업 이름을 옵셔널로 변경 (백엔드에서 자동 생성)
  infra_id: number;
  namespace: string | string[]; // 단일 또는 다중 네임스페이스 지원
  schedule?: string;
  retention?: string;
  server_username?: string;
  server_password?: string;
  hops?: SshAuthHop[]; // 다중 홉 SSH 정보
  auth_data?: SshAuthHop[]; // 선택적 속성
  selector?: string; // 라벨 셀렉터 (예: app=nginx)
  service_id?: number; // 서비스 ID (서비스 기반 백업 시)
}

export interface BackupInstallStatus {
  minio: {
    installed: boolean;
    endpoint?: string;
    status:
      | 'not_installed'
      | 'installing'
      | 'active'
      | 'failed'
      | 'error'
      | 'connected';
    error?: string;
    // 추가 필드들
    local_installation?: boolean;
    // 연결된 저장소 정보 (Velero를 통해 연결된 외부 저장소)
    connected_minio_info?: {
      id: number;
      endpoint: string;
      status: string;
      infra_id: number;
    };
  };
  velero: {
    installed: boolean;
    status: 'not_installed' | 'installing' | 'active' | 'failed' | 'error';
    error?: string;
    // 추가 필드들
    requires_kubernetes?: boolean;
    infra_type_supported?: boolean;
    // MinIO 연결 정보
    connected_minio_id?: number;
    connected_minio_info?: {
      id: number;
      endpoint: string;
      status: string;
      infra_id: number;
    };
  };
  // 요약 정보 추가
  summary?: {
    infra_name: string;
    infra_type: string;
    backup_ready: boolean;
    can_create_backup: boolean;
    has_external_storage: boolean;
  };
  // 외부 저장소 연결 정보
  external_storage?: {
    connected: boolean;
    connection_count: number;
    connected_storages?: Array<{
      id: number;
      infra_id: number;
      external_storage_id: number;
      is_default: boolean;
      storage_name?: string;
      storage_endpoint?: string;
    }>;
  };
  // 설치 시 사용 가능한 외부 저장소 개수
  available_external_storages?: number;
}

export interface CreateRestoreParams {
  infra_id: number;
  backup_name: string; // 복구의 원본이 될 백업의 이름
  backup_version: string;
  namespace_mappings?: { [key: string]: string }; // 선택적 네임스페이스 매핑
  auth_data: SshAuthHop[]; // [수정] 단일 인증 정보 대신 인증 배열 사용
}

// Restore 타입도 추가할 수 있습니다 (필요 시).
export interface Restore {
  id: number;
  name: string;
  status:
    | 'New'
    | 'InProgress'
    | 'Completed'
    | 'Failed'
    | 'PartiallyFailed'
    | 'Running';
  backup_name: string;
  created_at: string;
  completed_at: string | null;
}

export interface ActualBackup {
  name: string;
  status: string;
  createdAt: string;
  expires: string;
}

// 외부 백업 저장소 (조직 레벨, 인프라 독립적)
export interface ExternalBackupStorage {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
  type: 'minio' | 's3' | 'nfs';
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket: string;
  region?: string;
  use_ssl: boolean;
  status: 'active' | 'inactive' | 'error';
  last_connected_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  // SSH 터널링 설정 (내부 네트워크의 MinIO 접근용)
  ssh_enabled?: boolean;
  ssh_gateway_host?: string;
  ssh_gateway_port?: number;
  ssh_gateway_user?: string;
  ssh_gateway_password?: string;
  ssh_target_host?: string;
  ssh_target_port?: number;
  ssh_target_user?: string;
  ssh_target_password?: string;
}

// 인프라-외부저장소 매핑
export interface InfraBackupStorageMapping {
  id: number;
  infra_id: number;
  external_storage_id: number;
  bsl_name: string;
  is_default: boolean;
  created_at: string;
  // 조인된 정보
  storage_name?: string;
  storage_endpoint?: string;
  infra_name?: string;
}

// 외부 저장소 생성 파라미터
export interface CreateExternalStorageParams {
  name: string;
  description?: string;
  type?: 'minio' | 's3' | 'nfs';
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket?: string;
  region?: string;
  use_ssl?: boolean;
  // SSH 터널링 설정 (내부 네트워크의 MinIO 접근용)
  ssh_enabled?: boolean;
  ssh_gateway_host?: string;
  ssh_gateway_port?: number;
  ssh_gateway_user?: string;
  ssh_gateway_password?: string;
  ssh_target_host?: string;
  ssh_target_port?: number;
  ssh_target_user?: string;
  ssh_target_password?: string;
}

// 인프라-저장소 링크 파라미터
export interface LinkInfraToStorageParams {
  infra_id: number;
  external_storage_id: number;
  bsl_name?: string;
  is_default?: boolean;
}
