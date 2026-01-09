// 서버 상태 타입
export type ServerStatus =
  | 'running'
  | 'stopped'
  | 'error'
  | 'failed'
  | 'not_installed'
  | 'installing'
  | 'maintenance'
  | 'preparing'
  | 'inactive'
  | '등록'
  | 'checking'
  | '오프라인'
  | '점검중';

// 로그 엔트리 타입
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: Record<string, unknown>;
}

// API 응답 타입
export interface ApiResponse<T> {
  data?: {
    success?: boolean;
    message?: string;
    logs?: LogEntry[];
    [key: string]: unknown;
  } & T;
  success?: boolean;
  error?: string;
}

// 서버 타입 (여러 값 가능)
export type ServerType = 'master' | 'worker' | 'ha';

// 서버 데이터 타입 정의
export interface ServerItem {
  id: number;
  server_name?: string;
  name?: string;
  ip?: string;
  host?: string; // 호스트명 또는 IP
  port?: number;
  hops: string;
  join_command: string;
  certificate_key: string;
  type: string; // 쉼표로 구분된 여러 타입 값 (예: "master,ha")
  infra_id: number;
  ha: string; // 'Y' 또는 'N'
  created_at: string;
  updated_at: string;
  status?: ServerStatus; // 프론트엔드에서만 사용하는 런타임 상태
  last_checked?: string; // 마지막 상태 확인 시간
  stored_credentials?: boolean; // 저장된 인증 정보 여부
}

// 서버 타입 alias (기존 코드 호환성)
export type Server = ServerItem;

// 서버 생성/업데이트 입력 데이터
export interface ServerInput {
  server_name?: string;
  hops?: string;
  ip?: string;
  port?: number;
  join_command?: string;
  certificate_key?: string;
  type: string; // 쉼표로 구분된 여러 타입 값 (예: "master,ha")
  infra_id: number;
  ha?: string; // 'Y' 또는 'N'
  status?: ServerStatus; // 서버 상태
}

// DB에 저장되는 서버 타입 (status 필드 제외)
export type ServerDbItem = Omit<ServerItem, 'status'>;
