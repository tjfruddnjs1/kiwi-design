import { ServiceStatus } from './index';

// GitLab 설정 타입 정의
export interface GitLabConfig {
  token?: string; //  신규 필드 (권장)
  access_token?: string; //  레거시 필드 (하위 호환성)
  branch: string;
  username?: string;
}

// 서비스 데이터 타입 정의
export interface Service {
  id: number;
  name: string;
  description?: string; // 서비스 설명
  status: ServiceStatus;
  domain: string;
  namespace?: string;
  gitlab_url: string | null;
  gitlab_config?: string | null; // JSON string of GitLabConfig

  // Legacy fields (deprecated, use gitlab_config instead)
  gitlab_branch?: string | null;
  gitlab_access_token?: string | null;

  docker_compose_config: string | null;
  registry_config: string | null;
  infra_id?: number | null;
  infra_name?: string;
  infraType?: string | null; // 인프라 타입 정보 추가
  user_id?: number;
  created_at: string;
  updated_at: string;
  loadingStatus?: boolean; // 상태 조회 로딩 여부
  namespaceStatus?: string; // 네임스페이스 상태 (Active, Not Found 등)
  podsStatus?: Array<{
    name: string;
    status: string;
    ready: boolean;
    restarts: number;
  }>; // 파드 상태 목록
  runningPods?: number; // 실행 중인 파드 수
  totalPods?: number; // 전체 파드 수
  user_role?: 'admin' | 'member'; // user_role 추가
}

// 서비스 그룹 타입 정의
export interface ServiceGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// 쿠버네티스 상태 인터페이스
export interface KubernetesStatus {
  namespace: {
    name: string;
    status: string;
  };
  pods: {
    name: string;
    status: string;
    ready: boolean;
    restarts: number;
  }[];
}

// 서비스 운영 상태 인터페이스 (공통 타입 사용)
export interface ServiceOperationStatus {
  status: ServiceStatus;
  message?: string;
}

// 서비스 생성 요청 데이터
export interface CreateServiceRequest {
  name: string;
  status: string;
  domain: string;
  namespace?: string;
  gitlab_url?: string | null;
  gitlab_config?: string | null; // JSON string of GitLabConfig

  // Legacy fields (deprecated)
  gitlab_id?: string | null;
  gitlab_password?: string | null;
  gitlab_token?: string | null;
  gitlab_branch?: string | null;

  infra_id?: number | null;
  user_id?: number;
}

// 서비스 업데이트 요청 데이터
export interface UpdateServiceRequest {
  name?: string;
  status?: string;
  domain?: string;
  namespace?: string;
  gitlab_url?: string | null;
  gitlab_config?: string | null; // JSON string of GitLabConfig

  // Legacy fields (deprecated)
  gitlab_id?: string | null;
  gitlab_password?: string | null;
  gitlab_token?: string | null;
  gitlab_branch?: string | null;

  infra_id?: number | null;
  user_id?: number;
}

// 서비스 멤버 타입 정의
export interface ServiceMember {
  id: number;
  userId: number;
  serviceId: number;
  role: 'admin' | 'member' | 'viewer';
  userName?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// 서비스 상태 타입 재정의 (index.ts와 동일하게)
export type { ServiceStatus } from './index';

