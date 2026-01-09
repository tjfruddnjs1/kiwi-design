// 공통 타입들을 index.ts에서 import
import {
  ApiResponse,
  Server,
  HopInfo,
  PaginationParams,
  FilterParams,
  LoadingState,
  ModalState,
} from './index';

// 도커 컨테이너 정보 타입
export interface DockerContainer {
  name: string;
  status: string;
  image: string;
  created: string;
  ports: string;
}

// 공통 폼 데이터 타입
export interface FormData {
  [key: string]: string | number | boolean | string[] | Date | undefined;
}

// 로그인 폼 데이터
export interface LoginFormData {
  username?: string;
  email?: string;
  password: string;
}

// 회원가입 폼 데이터
export interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 서버 정보 타입 (InfraBaremetalSetting에서 사용)
export interface ServerInfo {
  status: string;
  ip: string;
  os: string;
  cpu: string;
  memory: string;
  disk: string;
  // 클라우드 서버 추가 필드
  port?: number;
  instance_type?: string;
  vcpu?: string;
  storage?: string;
  region?: string;
  availability_zone?: string;
  vpc?: string;
  subnet?: string;
}

// 테이블 렌더링 함수 타입
export interface TableRenderProps<T = Record<string, unknown>> {
  text: string | number;
  record: T;
  index: number;
}

// 에러 객체 타입
export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
}

// 로거 파라미터 타입
export interface LoggerParams {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

// 네임스페이스 조회 파라미터
export interface NamespaceQueryParams {
  infraId: number;
  serverUsername: string;
  serverPassword: string;
}

// Docker 컨테이너 로그 타입
export interface DockerContainerLog {
  timestamp: string;
  level: string;
  message: string;
}

// Docker 요청 데이터 타입
export interface DockerRequestData {
  name: string;
  image: string;
  ports?: Record<string, string>;
  volumes?: Record<string, string>;
  environment?: Record<string, string>;
  command?: string;
  logs?: DockerContainerLog[];
}

// Docker 컨테이너 제어 요청 타입
export interface DockerContainerControlRequest {
  server_id: number;
  container_id: string;
  action_type: 'start' | 'stop' | 'restart' | 'remove';
  username?: string;
  password?: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}

// Docker 컨테이너 제어 응답 타입
export interface DockerContainerControlResponse {
  message: string;
  logs?: Array<{ timestamp: string; level: string; message: string }>;
  container_id: string;
  action_type: string;
}

// Docker 인프라 가져오기 응답 타입
export interface DockerInfraImportResponse {
  infra_id: number;
  server_name: string;
  registered_services: string[];
  service_groups: Record<string, unknown> | null;
}

// 기존 타입들을 재export
export type {
  ApiResponse,
  Server,
  HopInfo,
  PaginationParams,
  FilterParams,
  LoadingState,
  ModalState,
};
