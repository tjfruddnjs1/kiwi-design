// 공유 타입 정의 - 중복 제거 및 일관성 확보
// 이 파일은 프로젝트 전체에서 공통으로 사용되는 핵심 타입들을 정의합니다

// ==================== 쿠버네티스 관련 타입 ====================

/**
 * 파드 정보 인터페이스 (통합 버전)
 * 기존 6개 파일에 분산된 PodInfo 타입을 통합
 */
export interface PodInfo {
  /** 파드 이름 */
  name: string;
  /** 파드 상태 (Running, Pending, Failed 등) */
  status: string;
  /** 준비 상태 */
  ready: boolean;
  /** 재시작 횟수 */
  restarts: number;
  /** 컨테이너 이미지 (옵션) */
  image?: string;
  /** 생성 시간 (옵션) */
  created?: string;
  /** 포트 정보 (옵션) */
  ports?: string;
  /** 크기 정보 (옵션) */
  size?: string;
  /** 파드 ID (Docker의 경우) */
  id?: string;
}

/**
 * 쿠버네티스 파드 정보 (API 응답용)
 * 백엔드 API에서 받는 원시 데이터 형식
 */
export interface KubernetesPodInfo {
  name: string;
  status: string;
  /** 백엔드에서는 문자열로 전달됨 */
  ready: string;
  restarts: number;
  age: string;
}

/**
 * 네임스페이스 정보 인터페이스
 */
export interface NamespaceInfo {
  /** 네임스페이스 이름 */
  name: string;
  /** 네임스페이스 상태 */
  status: string;
  /** 생성 시간 (옵션) */
  age?: string;
}

/**
 * 쿠버네티스 리소스 정보
 */
export interface KubernetesResourceInfo {
  cpu: string;
  memory: string;
  pods: string;
}

// ==================== 서버 관련 타입 ====================

/**
 * 호스트 정보 인터페이스
 */
export interface HopInfo {
  /** 호스트 주소 */
  host: string;
  /** 포트 번호 */
  port: number;
  /** 사용자명 (옵션) */
  username?: string;
  /** 비밀번호 (옵션) */
  password?: string;
}

/**
 * 서버 정보 인터페이스 (통합 버전)
 */
export interface Server {
  /** 서버 ID */
  id: number;
  /** 인프라 ID */
  infra_id?: number;
  /** 서버 이름 */
  server_name?: string;
  /** 서버 타입 */
  type: string;
  /** 연결 정보 (JSON 문자열) */
  hops: string;
  /** 조인 명령어 (옵션) */
  join_command?: string;
  /** 인증서 키 (옵션) */
  certificate_key?: string;
  /** 고가용성 설정 (옵션) */
  ha?: string;
  /** 마지막 확인 시간 (옵션) */
  last_checked?: string;
}

// ==================== 도커 관련 타입 ====================

/**
 * 도커 컨테이너 정보
 */
export interface ContainerInfo {
  /** 컨테이너 ID */
  id: string;
  /** 컨테이너 이름 */
  name: string;
  /** 컨테이너 상태 */
  status: string;
  /** 이미지 이름 */
  image: string;
  /** 생성 시간 */
  created: string;
  /** 포트 매핑 */
  ports: string;
  /** 크기 정보 (옵션) */
  size?: string;
}

// ==================== 상태 관리 타입 ====================

/**
 * 서비스 운영 상태 인터페이스
 */
export interface ServiceOperationStatus {
  namespace: NamespaceInfo;
  pods: PodInfo[];
}

/**
 * 로딩 상태 인터페이스 (표준화)
 */
export interface LoadingState {
  /** 로딩 중 여부 */
  loading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 성공 여부 */
  success?: boolean;
}

/**
 * 비동기 작업 상태
 */
export interface AsyncOperationState extends LoadingState {
  /** 작업 진행률 (0-100) */
  progress?: number;
  /** 상태 메시지 */
  message?: string;
}

// ==================== API 응답 타입 ====================

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
  /** 추가 메시지 */
  message?: string;
  /** HTTP 상태 코드 */
  statusCode?: number;
}

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta {
  /** 현재 페이지 */
  currentPage: number;
  /** 페이지 크기 */
  pageSize: number;
  /** 전체 항목 수 */
  totalItems: number;
  /** 전체 페이지 수 */
  totalPages: number;
}

/**
 * 페이지네이션된 API 응답
 */
export interface PaginatedApiResponse<TData = unknown>
  extends StandardApiResponse<TData[]> {
  /** 페이지네이션 정보 */
  pagination: PaginationMeta;
}

// ==================== 유틸리티 타입 ====================

/**
 * ID를 가진 엔티티의 기본 인터페이스
 */
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

/**
 * 선택적 필드를 가진 타입 헬퍼
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 타임스탬프 필드를 제거한 타입 헬퍼 (생성용)
 */
export type CreateInput<T extends BaseEntity> = Omit<
  T,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * 업데이트용 타입 헬퍼 (부분 업데이트)
 */
export type UpdateInput<T extends BaseEntity> = Partial<
  Omit<T, 'id' | 'created_at' | 'updated_at'>
>;
