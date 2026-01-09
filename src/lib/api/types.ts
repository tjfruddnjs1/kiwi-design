// 통합 API 타입 정의
// 모든 API 관련 타입을 한 곳에서 관리하여 일관성과 유지보수성을 향상시킵니다

// ==================== 기본 타입 ====================

/**
 * 모든 엔티티의 기본 인터페이스
 */
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

/**
 * 표준 API 응답 인터페이스
 */
export interface StandardApiResponse<TData = unknown> {
  /** 성공 여부 */
  success: boolean;
  /** 응답 데이터 */
  data?: TData;
  /** 에러 메시지 */
  error?: string;
  /** 추가 정보 메시지 */
  message?: string;
  /** HTTP 상태 코드 */
  statusCode?: number;
}

/**
 * SSH 호프 정보 (표준화된 타입)
 */
export interface SshHop {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

/**
 * 기본 서버 정보
 */
export interface BaseServer {
  id: number;
  name: string;
  ip: string;
  port: number;
  status: string;
  type?: string;
  hops?: SshHop[];
  last_checked?: string;
  infra_id?: number;
  server_name?: string;
  join_command?: string;
  certificate_key?: string;
  ha?: string;
}

// ==================== 인증 관련 타입 ====================

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  permissions?: string[];
}

export interface User extends BaseEntity {
  email: string;
  name?: string;
  role?: 'Owner' | 'Manager' | 'Member'; // organization_members 테이블의 role 기준
  organization_id?: number | null;
  last_login?: string;
  gitlab_token?: string;
  permissions?: string[];
}

// ==================== 인프라 관련 타입 ====================

export interface GetInfraByIdResponse {
  infra: Infrastructure;
}

export interface Infrastructure extends BaseEntity {
  name: string;
  type:
    | 'kubernetes'
    | 'baremetal'
    | 'docker'
    | 'cloud'
    | 'external_kubernetes'
    | 'external_docker';
  info: string;
  servers?: BaseServer[];
}

export interface InfrastructureCreateRequest {
  name: string;
  type: string;
  info: string;
}

export interface InfrastructureUpdateRequest {
  name?: string;
  type?: string;
  info?: string;
}

export interface InfraPermission {
  user_id: number;
  user_email: string;
  role: 'admin' | 'member';
}

// ==================== 쿠버네티스 관련 타입 ====================

export interface KubernetesNode {
  id: string;
  nodeType: 'master' | 'worker' | 'ha';
  ip: string;
  port: string;
  server_name?: string;
  status: 'active' | 'inactive' | 'pending';
  last_checked?: string;
  hops: string; // JSON 문자열
}

export interface KubernetesPod {
  name: string;
  status: 'Running' | 'Pending' | 'Failed' | 'Unknown';
  ready: boolean;
  restarts: number;
  age?: string;
  image?: string;
  namespace?: string;
}

export interface KubernetesNamespace {
  name: string;
  status: 'Active' | 'Terminating';
  age?: string;
}

export interface KubernetesClusterInfo {
  totalNodes: number;
  readyNodes: number;
  totalPods: number;
  runningPods: number;
  totalNamespaces: number;
  cpu: string;
  memory: string;
  storage?: string;
}

export interface KubernetesDeployParams {
  id: number; // 서비스 ID
  hops: SshHop[];
  username_repo: string; // GitLab 사용자명
  password_repo: string; // GitLab 토큰
  docker_username: string; // Docker Registry 사용자명
  docker_password: string; // Docker Registry 비밀번호
}

export interface KubernetesCommandResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  commandResults?: KubernetesCommandResult[];
}

export interface GetNamespaceAndPodStatusResponse {
  success: boolean;
  namespace_exists: boolean;
  pods: KubernetesPod[]; // 이미 정의된 KubernetesPod 타입을 재사용합니다.
  error?: string;
}

// ==================== 서비스 관련 타입 ====================

export interface GitLabConfig {
  token?: string; //  신규 필드 (권장)
  access_token?: string; //  레거시 필드 (하위 호환성)
  branch: string;
  username?: string;
}

export interface Service extends BaseEntity {
  name: string;
  type: 'web' | 'api' | 'database' | 'cache' | 'other';
  status:
    | 'running'
    | 'stopped'
    | 'pending'
    | 'error'
    | 'deploying'
    | 'failed'
    | 'registered'
    | 'restarting'
    | 'stopping';
  namespace?: string;
  repository_url?: string;
  branch?: string;
  dockerfile_path?: string;
  infra_id?: number;
  description?: string;
  server_id?: number;
  hops?: string; // JSON 문자열
  is_deployed: boolean;

  // Multi-service detection fields
  is_multi_service?: boolean;
  service_names?: string[];

  // GitLab configuration
  gitlab_url?: string | null;
  gitlab_config?: string | null; // JSON string of GitLabConfig

  // Legacy compatibility fields (deprecated, use gitlab_config instead)
  gitlab_branch?: string | null;
  gitlab_access_token?: string | null;

  domain?: string;
  docker_compose_config?: string | null;
  registry_config?: string | null;
  infra_name?: string;
  infraType?: string | null;
  user_id?: number;
  user_role?: 'admin' | 'member';

  // UI state fields
  loadingStatus?: boolean;
  namespaceStatus?: string;
  podsStatus?: Array<{
    name: string;
    status: string;
    ready: boolean;
    restarts: number;
  }>;
  runningPods?: number;
  totalPods?: number;
}

export interface ServiceFormValues {
  name: string;
  namespace?: string;
  infra_id: number;
  domain?: string;
  gitlab_url?: string;
  gitlab_config?: string | GitLabConfig; // JSON string or object
  description?: string;
  docker_compose_config?: Record<string, unknown>;
  registry_config?: Record<string, unknown>;

  // Legacy fields (deprecated)
  gitlab_branch?: string;
  gitlab_access_token?: string;
}

export interface ServiceCreateRequest {
  name: string;
  type: string;
  namespace?: string;
  repository_url?: string;
  branch?: string;
  dockerfile_path?: string;
  infra_id?: number;
  description?: string;
}

export interface ServiceUpdateRequest {
  name?: string;
  type?: string;
  namespace?: string;
  repository_url?: string;
  branch?: string;
  dockerfile_path?: string;
  description?: string;
}

export interface ServiceMember {
  id: number;
  user_id: number;
  email: string;
  role: 'admin' | 'member';
  name?: string;
}

export interface ServiceDomain {
  id: number;
  service_id: number;
  hostname: string;
  upstream_address: {
    String: string;
    Valid: boolean;
  };
  proxy_status: 'none' | 'applying' | 'active' | 'failed';
  proxy_status_message: {
    String: string;
    Valid: boolean;
  };
  created_at: string;
  updated_at: string;
}

// ==================== 백업 관련 타입 ====================

export interface BackupStorage extends BaseEntity {
  name: string;
  type: 'minio' | 's3' | 'gcs' | 'azure';
  endpoint: string;
  region?: string;
  access_key: string;
  secret_key: string;
  bucket_name: string;
  infra_id: number;
}

export interface BackupStorageWithInfra extends BackupStorage {
  infra_name: string;
  infra_type: string;
  status: 'installing' | 'active' | 'error';
  server_id?: number;
  error?: string;
}

export interface Backup extends BaseEntity {
  name: string;
  namespace: string;
  status: 'InProgress' | 'Completed' | 'Failed' | 'PartiallyFailed';
  schedule?: string;
  ttl?: string;
  storage_id: number;
  infra_id: number;
  size?: string;
  backup_time?: string;
}

export interface BackupCreateRequest {
  name: string;
  namespace: string;
  schedule?: string;
  ttl?: string;
  infra_id: number;
  auth_data: SshHop[];
}

export interface Restore extends BaseEntity {
  name: string;
  backup_name: string;
  namespace: string;
  status: 'InProgress' | 'Completed' | 'Failed';
  infra_id: number;
  restore_time?: string;
}

export interface RestoreCreateRequest {
  name: string;
  backup_name: string;
  namespace: string;
  infra_id: number;
  auth_data: SshHop[];
}

export interface ActualBackup {
  name: string;
  namespace: string;
  created: string;
  status: string;
  backup_name?: string;
}

export interface BackupInstallStatus {
  minio_installed: boolean;
  velero_installed: boolean;
  storage_configured: boolean;
  namespaces?: string[];
  // 확장된 응답 필드들
  velero?: {
    installed: boolean;
    status: string;
    version?: string;
    pods?: Array<{
      name: string;
      status: string;
      ready: boolean;
    }>;
  };
  minio?: {
    installed: boolean;
    status: string;
    endpoint?: string;
  };
  storage?: {
    configured: boolean;
    location_count: number;
    locations?: Array<{
      name: string;
      provider: string;
      bucket: string;
      status: string;
    }>;
  };
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
  summary?: {
    infra_name: string;
    infra_type: string;
    backup_ready: boolean;
    can_create_backup: boolean;
    has_external_storage: boolean;
  };
}

export interface MinioInstallParams {
  infra_id: number;
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket_name: string;
  auth_data: SshHop[];
}

export interface VeleroInstallParams {
  infra_id: number;
  minio_endpoint: string;
  access_key: string;
  secret_key: string;
  bucket: string;
  auth_data: SshHop[];
  external_storage_id?: number; // 외부 저장소 ID (external_backup_storages)
  storage_id?: number; // deprecated - 기존 호환성을 위해 유지
}

export interface CreateBackupParams {
  name: string;
  namespace: string;
  schedule?: string;
  ttl?: string;
  selector?: string; // 라벨 셀렉터 (예: app=nginx,tier=frontend)
  infra_id: number;
  auth_data: SshHop[];
}

export interface CreateRestoreParams {
  name: string;
  backup_name: string;
  namespace: string;
  infra_id: number;
  auth_data: SshHop[];
}

// ==================== 외부 백업 저장소 타입 ====================

/**
 * 외부 백업 저장소 (조직 레벨, 인프라 독립적)
 */
export interface ExternalBackupStorage extends BaseEntity {
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

/**
 * 인프라-외부저장소 매핑
 */
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

/**
 * 외부 저장소 생성 파라미터
 */
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

/**
 * 인프라-저장소 링크 파라미터
 */
export interface LinkInfraToStorageParams {
  infra_id: number;
  external_storage_id: number;
  bsl_name?: string;
  is_default?: boolean;
}

// ==================== Docker 관련 타입 ====================

export interface DockerContainer {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting';
  image: string;
  created: string;
  ports: string;
  size?: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  created: string;
  size: string;
}

// ==================== 프로젝트 관련 타입 ====================

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  default_branch: string;
  description?: string;
  web_url: string;
  last_activity_at: string;
}

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    message: string;
    author_name: string;
    created_at: string;
  };
  protected: boolean;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  created_at: string;
  committed_date: string;
}

// ==================== 공통 유틸리티 타입 ====================

/**
 * 생성용 타입 - ID와 타임스탬프 제외
 */
export type CreateInput<T extends BaseEntity> = Omit<
  T,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * 업데이트용 타입 - 부분 업데이트, ID와 타임스탬프 제외
 */
export type UpdateInput<T extends BaseEntity> = Partial<
  Omit<T, 'id' | 'created_at' | 'updated_at'>
>;

/**
 * 선택적 필드를 가진 타입
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * 페이지네이션된 응답
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * 로딩 상태
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
  success?: boolean;
}

/**
 * 비동기 작업 상태
 */
export interface AsyncOperationState extends LoadingState {
  progress?: number;
  message?: string;
}

// ==================== API 요청 옵션 ====================

export interface ApiRequestOptions {
  /** 커스텀 타임아웃 (ms) */
  timeout?: number;
  /** 에러 메시지 자동 표시 여부 */
  showErrorMessage?: boolean;
  /** 성공 메시지 자동 표시 여부 */
  showSuccessMessage?: boolean;
  /** 커스텀 성공 메시지 */
  successMessage?: string;
  /** 재시도 활성화 여부 */
  enableRetry?: boolean;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
}

// ==================== 레거시 호환성 타입들 ====================

// 기존 코드와의 호환성을 위한 타입 별칭들
export type { DockerContainer as ContainerInfo, KubernetesNamespace as NamespaceInfo, KubernetesPod as PodInfo, BaseServer as Server, SshHop as SshAuthHop };

// ==================== Export 모든 타입 ====================

// 편의를 위한 네임스페이스 export
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ApiTypes {
  export type AuthCredentials = import('./types').AuthCredentials;
  export type AuthResponse = import('./types').AuthResponse;
  export type User = import('./types').User;
  export type Infrastructure = import('./types').Infrastructure;
  export type Service = import('./types').Service;
  export type KubernetesNode = import('./types').KubernetesNode;
  export type KubernetesPod = import('./types').KubernetesPod;
  export type DockerContainer = import('./types').DockerContainer;
  export type BackupStorage = import('./types').BackupStorage;
  export type Backup = import('./types').Backup;
  export type GitLabProject = import('./types').GitLabProject;
  export type SshHop = import('./types').SshHop;
  export type StandardApiResponse<T> = import('./types').StandardApiResponse<T>;
}
