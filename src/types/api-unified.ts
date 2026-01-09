// 통합 API 타입 정의
// 모든 API 호출에서 사용되는 표준 타입들을 정의합니다

import { StandardApiResponse } from '../lib/api/types';

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
 * SSH 호프 정보 (표준화된 타입)
 */
export interface SshHop {
  host: string;
  port: number;
  username: string;
  password: string;
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
}

// ==================== 인프라 관련 타입 ====================

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

// ==================== 서비스 관련 타입 ====================

export interface Service extends BaseEntity {
  name: string;
  type: 'web' | 'api' | 'database' | 'cache' | 'other';
  status: 'running' | 'stopped' | 'pending' | 'error';
  namespace?: string;
  repository_url?: string;
  branch?: string;
  dockerfile_path?: string;
  infra_id?: number;
  description?: string;
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

// ==================== 사용자 관련 타입 ====================

export interface User extends BaseEntity {
  email: string;
  name?: string;
  role: 'admin' | 'user';
  last_login?: string;
  gitlab_token?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  permissions: string[];
}

export interface InfraPermission {
  user_id: number;
  user_email: string;
  role: 'admin' | 'member';
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

// ==================== API 액션 타입 ====================

/**
 * 통합 API 액션 인터페이스
 * 백엔드의 action-based API 구조에 맞춤
 */
export interface ApiActionRequest<TParams = Record<string, unknown>> {
  action: string;
  parameters: TParams;
}

/**
 * 타입 안전한 API 액션 함수 타입
 */
export type ApiActionFunction<TParams, TResponse> = (
  params: TParams
) => Promise<StandardApiResponse<TResponse>>;

// ==================== 유틸리티 타입 ====================

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
 * 정렬 옵션
 */
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 필터 옵션
 */
export interface FilterOption {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'startsWith'
    | 'endsWith';
  value: unknown;
}

/**
 * 검색 쿼리
 */
export interface SearchQuery {
  page?: number;
  pageSize?: number;
  sort?: SortOption[];
  filters?: FilterOption[];
  search?: string;
}
