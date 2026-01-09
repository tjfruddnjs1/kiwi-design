// 공통 API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// Enhanced type exports
export * from './api';
export * from './table';
export * from './infra';
export * from './backup';
export * from './service';
export * from './project';
export * from './user';

// 공통 상태 타입
export type ServerStatus =
  | 'running'
  | 'stopped'
  | 'inactive'
  | 'active'
  | 'maintenance'
  | 'preparing'
  | '등록'
  | 'checking';
export type ServiceStatus =
  | 'running'
  | 'stopped'
  | 'error'
  | 'pending'
  | 'deploying'
  | 'failed'
  | 'registered'
  | 'restarting'
  | 'stopping';

// 공통 사용자 타입
export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// 공통 인증 상태 타입
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// 공통 로딩 상태 타입
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// 공통 페이지네이션 타입
export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

// 공통 필터 타입
export interface FilterState {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'ascend' | 'descend';
}

// 공통 모달 상태 타입
export interface ModalState {
  visible: boolean;
  loading: boolean;
  error: string | null;
  data?: unknown;
}

// 공통 액션 타입
export interface ActionState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

// 공통 호스트 정보 타입
export interface HopInfo {
  host: string;
  port: number;
}

// 공통 페이지네이션 파라미터 타입
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 공통 필터 파라미터 타입
export interface FilterParams {
  searchTerm?: string;
  statusFilter?: string;
  infraFilter?: string;
  sortBy?: string;
}

// Kubernetes 관련 타입들
export interface KubernetesNodeStatus {
  installed: boolean;
  running: boolean;
  isMaster?: boolean;
  isWorker?: boolean;
}

export interface KubernetesNodeResponse {
  status: KubernetesNodeStatus;
  lastChecked: string;
  message?: string;
}

export interface KubernetesLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface KubernetesPodInfo {
  name: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
}

export interface KubernetesNamespaceInfo {
  name: string;
  status: string;
  age: string;
}

export interface KubernetesResource {
  cpu: {
    cores: string;
    model: string;
    usage_percent: string;
  };
  disk: {
    root_free: string;
    root_total: string;
    root_usage_percent: string;
    root_used: string;
  };
  host_info: {
    hostname: string;
    kernel: string;
    os: string;
  };
  memory: {
    free_mb: string;
    total_mb: string;
    usage_percent: string;
    used_mb: string;
  };
  message: string;
  success: boolean;
}

export interface KubernetesResourceInfo {
  cpu: string;
  memory: string;
  pods: string;
}

export interface KubernetesClusterInfo {
  nodes: {
    master: number;
    worker: number;
    ha: number;
  };
  resources: KubernetesResourceInfo;
  status: string;
}

export interface KubernetesCommandResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
}

export interface KubernetesDetails {
  status?: string;
  message?: string;
  error?: string;
  data?: unknown;
}

// Backup 관련 타입들
export interface MinioConfig {
  id: number;
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
}

export interface VeleroConfig {
  version: string;
  namespace: string;
  serviceAccount: string;
  backupLocation: string;
  volumeSnapshotLocation: string;
}

export interface BackupConfig {
  schedule: string;
  retention: number;
  includeNamespaces: string[];
  excludeNamespaces: string[];
  includeResources: string[];
  excludeResources: string[];
}

export interface BackupFormValues {
  name: string;
  schedule: string;
  retention: number;
  includeNamespaces: string[];
  excludeNamespaces: string[];
  includeResources: string[];
  excludeResources: string[];
  minioConfig: MinioConfig;
  veleroConfig: VeleroConfig;
  namespace?: string;
  infraId?: number;
  serverUsername?: string;
  serverPassword?: string;
  scheduleType?: 'daily' | 'weekly' | 'monthly';
  time?: string | Date; // ISO 문자열 또는 Date 객체
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface RestoreFormValues {
  backupName: string;
  namespace: string;
  restoreToNamespace?: string;
  includeResources: string[];
  excludeResources: string[];
  serverUsername?: string;
  serverPassword?: string;
}
