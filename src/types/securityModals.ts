/**
 * Security Modals - 공통 타입 정의
 * SAST, SCA, DAST 모달에서 공통으로 사용하는 타입들
 */

// ============================================================================
// 공통 스캔 상태 타입
// ============================================================================

export type ScanState = 'idle' | 'analyzing' | 'completed' | 'failed';

export type SecurityAnalysisType = 'sast' | 'sca' | 'dast' | 'sbom';

// ============================================================================
// 공통 모달 Props
// ============================================================================

/**
 * 모든 보안 분석 모달의 기본 Props
 */
export interface BaseSecurityModalProps {
  visible: boolean;
  onClose: () => void;
  repoId: number;
  repoName?: string;
  repoUrl?: string;
}

/**
 * 스캔 실행 기능이 있는 모달의 Props
 */
export interface ScanCapableModalProps extends BaseSecurityModalProps {
  onScanStateChange?: (type: SecurityAnalysisType, state: ScanState) => void;
}

/**
 * 파라미터 입력 모달의 공통 Props
 */
export interface BaseParamsModalProps<T> {
  visible: boolean;
  onClose: () => void;
  onConfirm: (params: T) => void;
  loading?: boolean;
}

/**
 * 결과 표시 모달의 공통 Props
 */
export interface BaseResultModalProps extends ScanCapableModalProps {
  onStartScan?: () => Promise<void> | void;
  onRefresh?: () => void;
}

// ============================================================================
// 공통 UI 상태
// ============================================================================

/**
 * 모달 로딩 상태
 */
export interface ModalLoadingState {
  loading: boolean;
  isScanning: boolean;
  error: string | null;
}

/**
 * 빈 상태 Props
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  onAction?: () => void;
  actionText?: string;
  actionLoading?: boolean;
}

/**
 * 로딩 상태 Props
 */
export interface LoadingStateProps {
  message: string;
  tip?: string;
}

/**
 * 에러 상태 Props
 */
export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

// ============================================================================
// 공통 데이터 구조
// ============================================================================

/**
 * 심각도 레벨
 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * 심각도별 통계
 */
export interface SeverityBreakdown {
  critical?: number;
  high: number;
  medium: number;
  low: number;
  info?: number;
}

/**
 * 공통 요약 정보
 */
export interface BaseSummary {
  total_findings?: number;
  total_vulnerabilities?: number;
  total_alerts?: number;
  severity_breakdown: SeverityBreakdown;
  scan_time?: number;
}

/**
 * 실행 로그 구조
 */
export interface ExecutionLog {
  log_messages?: string[];
  full_execution_log?: {
    log_messages: string[];
  };
  total_duration?: number;
  timestamp?: string;
}

// ============================================================================
// 취약점/알림 공통 인터페이스
// ============================================================================

/**
 * 기본 취약점 정보
 */
export interface BaseVulnerability {
  id?: string | number;
  name: string;
  severity: SeverityLevel;
  description: string;
}

/**
 * 코드 위치 정보
 */
export interface CodeLocation {
  file: string;
  startLine?: number;
  endLine?: number;
  snippet?: string;
}

// ============================================================================
// 스캔 파라미터 공통 인터페이스
// ============================================================================

/**
 * Git 관련 파라미터
 */
export interface GitParams {
  git_url: string;
  branch?: string;
  git_token?: string;
}

/**
 * Registry 관련 파라미터
 */
export interface RegistryParams {
  registry_username?: string;
  registry_password?: string;
}

/**
 * 스캔 옵션
 */
export interface ScanOptions {
  timeout?: number;
  parallel?: boolean;
  [key: string]: any;
}

// ============================================================================
// 결과 표시 관련
// ============================================================================

/**
 * 탭 구성
 */
export interface TabConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * 통계 카드 Props
 */
export interface StatCardProps {
  title: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
  severity?: SeverityLevel;
}

/**
 * 취약점 목록 Props
 */
export interface VulnerabilityListProps<T> {
  vulnerabilities: T[];
  loading?: boolean;
  maxHeight?: string | number;
  onItemClick?: (item: T) => void;
}

/**
 * 로그 표시 Props
 */
export interface LogViewerProps {
  logs: ExecutionLog | string[] | string;
  title?: string;
  maxHeight?: string | number;
}

// ============================================================================
// 상태 헬퍼
// ============================================================================

/**
 * 심각도 색상 매핑
 */
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: '#a8071a',
  high: '#cf1322',
  medium: '#fa8c16',
  low: '#1890ff',
  info: '#52c41a',
};

/**
 * 스캔 상태 색상 매핑
 */
export const SCAN_STATE_COLORS: Record<ScanState, string> = {
  idle: '#8c8c8c',
  analyzing: '#1890ff',
  completed: '#52c41a',
  failed: '#cf1322',
};

/**
 * 분석 타입 표시명
 */
export const ANALYSIS_TYPE_LABELS: Record<SecurityAnalysisType, string> = {
  sast: 'SAST (정적 분석)',
  sca: 'SCA (의존성 분석)',
  dast: 'DAST (동적 분석)',
  sbom: 'SBOM (구성요소 분석)',
};

/**
 * 분석 타입 아이콘 키
 */
export const ANALYSIS_TYPE_ICONS: Record<SecurityAnalysisType, string> = {
  sast: 'SafetyOutlined',
  sca: 'ExperimentOutlined',
  dast: 'SecurityScanOutlined',
  sbom: 'FileSearchOutlined',
};
