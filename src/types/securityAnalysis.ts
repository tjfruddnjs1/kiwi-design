// SCA (Software Composition Analysis) 관련 타입 정의

// SCA 스캔 파라미터 (Trivy API 기준)
export interface ScaScanParams {
  image_url: string;
  scan_type?: 'vuln' | 'config' | 'secret' | 'license';
  registry_username?: string;
  registry_password?: string;
  generate_sbom?: boolean; // SBOM 자동 생성 옵션
  license_analysis?: boolean; // SBOM 생성 시 라이선스 분석 포함 여부
}

//  빌드된 이미지 정보 (pipeline.ts의 BuiltImageInfo와 동일)
export interface BuiltImageInfo {
  image_url: string;
  build_date: string;
  registry?: string;
  image_tag?: string;
  pipeline_id?: number;
  build_step_id: number;
}

// Registry 설정 정보 (service.registry_config 파싱 결과)
export interface RegistryConfigInfo {
  registry_type?: 'harbor' | 'dockerhub';
  registry_url?: string;
  username?: string;
  password?: string;
  project_name?: string;
}

// SCA 파라미터 모달 Props
export interface ScaParamsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (params: ScaScanParams) => void;
  loading?: boolean;
  builtImages?: BuiltImageInfo[]; //  빌드된 이미지 목록
  registryConfig?: RegistryConfigInfo; //  서비스에 저장된 Registry 인증 정보
  defaultImageUrl?: string; //  기본 선택 이미지 URL (빌드 이미지 목록에서 스캔 시)
}

// DAST (Dynamic Application Security Testing) 관련 타입 정의

// DAST 스캔 파라미터 (ZAP API 문서 기준)
export interface DastScanParams {
  target_url: string;
  scan_type?: 'baseline' | 'full' | 'api';
  options?: {
    context?: string;
    policy?: string;
    alert_level?: string;
    timeout?: number;
  };
}

// DAST 파라미터 모달 Props
export interface DastParamsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (params: DastScanParams) => void;
  loading?: boolean;
}

export interface Vulnerability {
  name: string;
  version: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  cve?: string;
  fix_available: boolean;
  fixed_version?: string;
  references?: string[];
  cwe_ids?: string[];
  cvss?: {
    ghsa?: {
      V3Score: number;
      V3Vector: string;
    };
    redhat?: {
      V3Score: number;
      V3Vector: string;
    };
  };
}

export interface Dependency {
  name: string;
  version: string;
  type: 'dependencies' | 'devDependencies';
  description?: string;
}

export interface ScaResult {
  vulnerabilities: Vulnerability[] | TrivyVulnerability[];
  dependencies: Dependency[];
  summary: {
    total_vulnerabilities: number;
    total_dependencies: number;
    severity_breakdown?: {
      critical?: number;
      high: number;
      medium: number;
      low: number;
      info?: number;
    };
    scan_time: number;
  };
  execution_log?: ExecutionLog;
  sca_result?: string; // Trivy 원본 응답 데이터
}

export interface ScaApiResponse {
  success: boolean;
  data: {
    result: ScaResult | null;
    status: 'completed' | 'not_found' | 'failed';
    language: string;
    tool_name: string;
    execution_log: any;
    scan_date: string;
    kafka_status: string;
  };
}

// DAST (Dynamic Application Security Testing) 관련 타입 정의

export interface AlertInstance {
  method: string;
  otherinfo: string;
  uri: string;
}

export interface Alert {
  count: string;
  cweid: string;
  description: string;
  instances: AlertInstance[];
  name: string;
  pluginid: string;
  reference: string;
  riskcode: string;
  riskdesc: string;
  solution: string;
  wascid: string;
}

export interface DastResult {
  alerts?: Alert[];
  summary?: {
    total_alerts: number;
    high_alerts: number;
    medium_alerts: number;
    low_alerts: number;
    info_alerts: number;
    scan_time: number;
  };
  execution_log?: ExecutionLog;
}

export interface DastApiResponse {
  success: boolean;
  data: {
    result: DastResult | null;
    status: 'completed' | 'not_found' | 'failed';
    execution_log: any;
    scan_date: string;
    kafka_status: string;
  };
}

// 공통 타입 정의

export interface SecurityAnalysisState {
  // SCA 상태
  scaResults: Record<number, ScaResult | null>;
  scaLoading: Record<number, boolean>;
  scaLastUpdates: Record<number, string | null>;

  // DAST 상태
  dastResults: Record<number, DastResult | null>;
  dastLoading: Record<number, boolean>;
  dastLastUpdates: Record<number, string | null>;
}

export interface SecurityAnalysisActions {
  // SCA 액션
  setScaResult: (repoId: number, result: ScaResult | null) => void;
  setScaLoading: (repoId: number, loading: boolean) => void;
  setScaLastUpdate: (repoId: number, timestamp: string) => void;

  // DAST 액션
  setDastResult: (repoId: number, result: DastResult | null) => void;
  setDastLoading: (repoId: number, loading: boolean) => void;
  setDastLastUpdate: (repoId: number, timestamp: string) => void;

  // API 호출
  fetchScaResult: (repoId: number) => Promise<void>;
  fetchDastResult: (repoId: number) => Promise<void>;
  executeScaScan: (repoId: number, params: ScaScanParams) => Promise<void>;
  executeDastScan: (repoId: number, params: DastScanParams) => Promise<void>;
}

export interface ScaScanParams {
  image_url: string;
  scan_type?: 'vuln' | 'config' | 'secret' | 'license';
  registry_username?: string;
  registry_password?: string;
  generate_sbom?: boolean; // SBOM 자동 생성 옵션
  license_analysis?: boolean; // SBOM 생성 시 라이선스 분석 포함 여부
}

// Trivy 결과 타입 정의
export interface TrivyVulnerability {
  vulnerability_id: string;
  pkg_name: string;
  installed_version: string;
  fixed_version?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  references: string[];
  cvss?: {
    nvd?: {
      V3Score: number;
      V3Vector: string;
    };
  };
  cwe_ids?: string[];
  last_modified_date?: string;
  published_date?: string;
}

export interface TrivyResult {
  success: boolean;
  summary: {
    scan_id: string;
    image_name: string;
    scan_type: string;
    timestamp: string;
    total_vulnerabilities: number;
    scan_time: number;
    execution_logs: {
      trivy_scan: {
        command: string;
        duration: number;
        success: boolean;
        stderr: string | null;
        stdout_lines: number;
        registry_auth: boolean;
        log_messages: string[];
      };
    };
  };
  tool: string;
  service_id: string;
  image_name: string;
  scan_type: string;
  timestamp: string;
  result: {
    scan_result: {
      artifact_name: string;
      artifact_type: string;
      results: Array<{
        target: string;
        class: string;
        type: string;
        vulnerabilities: TrivyVulnerability[];
      }>;
    };
    trivy_version: string;
  };
  execution_logs: {
    trivy_scan: {
      command: string;
      duration: number;
      success: boolean;
      stderr: string | null;
      stdout_lines: number;
      registry_auth: boolean;
      log_messages: string[];
    };
  };
}

// API 응답 타입 정의
export interface SecurityApiResponseData {
  status: 'completed' | 'pending' | 'not_found' | 'failed';
  result?: ScaApiResult | DastApiResult;
  execution_log?: ExecutionLog;
  summary?: {
    scan_time?: number;
    [key: string]: unknown;
  };
}

// SCA API 결과 타입
export interface ScaApiResult {
  tool?: string;
  result?: {
    scan_result?: TrivyScanResult;
  };
  execution_logs?: ExecutionLog;
  summary?: {
    scan_time?: number;
    execution_logs?: ExecutionLog;
  };
}

// Trivy 스캔 결과 타입
export interface TrivyScanResult {
  results?: TrivyScanResultItem[];
  artifact_name?: string;
  artifact_type?: string;
}

export interface TrivyScanResultItem {
  target?: string;
  class?: string;
  type?: string;
  vulnerabilities?: TrivyVulnerabilityItem[];
}

export interface TrivyVulnerabilityItem {
  pkg_name: string;
  installed_version: string;
  severity: string;
  description: string;
  vulnerability_id: string;
  fixed_version?: string;
  references?: string[];
}

// DAST API 결과 타입
export interface DastApiResult {
  result?: ZapData;
  alerts?: Alert[];
  summary?: DastSummary;
  execution_log?: ExecutionLog;
}

export interface ZapData {
  results?: ZapResults;
  site?: ZapSite[];
  summary?: DastSummary;
}

export interface ZapResults {
  alerts?: Alert[];
  total_alerts?: number;
  high_alerts?: number;
  medium_alerts?: number;
  low_alerts?: number;
  info_alerts?: number;
  scan_time?: number;
}

export interface ZapSite {
  alerts?: Alert[];
}

export interface DastSummary {
  total_alerts?: number;
  high_alerts?: number;
  medium_alerts?: number;
  low_alerts?: number;
  info_alerts?: number;
  scan_time?: number;
}

export interface ExecutionLog {
  log_messages?: string[];
  total_duration?: number;
  zap_scan?: {
    log_messages?: string[];
  };
  full_execution_log?: {
    log_messages?: string[];
  };
  trivy_scan?: {
    log_messages?: string[];
  };
}

// 위험도/심각도 레벨 타입
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

// 색상 매핑
export const severityColors: Record<SeverityLevel, string> = {
  critical: '#ff4d4f',
  high: '#ff7875',
  medium: '#ffa940',
  low: '#52c41a',
  info: '#1890ff',
};

export const riskColors: Record<RiskLevel, string> = {
  critical: '#ff4d4f',
  high: '#ff7875',
  medium: '#ffa940',
  low: '#52c41a',
  info: '#1890ff',
};

// ==================== 취약점 카테고리 관련 타입 ====================

/**
 * 취약점 카테고리 ID
 * CWE 기반 10개 통합 카테고리 + SCA 전용 8개 카테고리
 */
export type VulnerabilityCategoryId =
  // SAST/DAST 통합 카테고리
  | 'INJ' // Injection (인젝션)
  | 'AUTH' // Authentication (인증)
  | 'SENS' // Sensitive Data (민감 데이터)
  | 'CRYPTO' // Cryptographic Issues (암호화)
  | 'CONFIG' // Security Misconfiguration (보안 설정)
  | 'VULN_DEP' // Vulnerable Components (취약 컴포넌트)
  | 'INPUT' // Input Validation (입력 검증)
  | 'NETWORK' // Network Security (네트워크 보안)
  | 'ACCESS' // Access Control (접근 제어)
  | 'OTHER' // Other (기타)
  // SCA 전용 카테고리 (심각도 기반)
  | 'CVE_CRITICAL' // Critical CVE (심각 CVE)
  | 'CVE_HIGH' // High Severity CVE (높음 CVE)
  | 'CVE_MEDIUM' // Medium Severity CVE (중간 CVE)
  | 'CVE_LOW' // Low Severity CVE (낮음 CVE)
  // SCA 보조 카테고리 (패키지 타입)
  | 'OS_PKG' // OS Package (OS 패키지)
  | 'LANG_PKG' // Language Package (언어 패키지)
  | 'FIXABLE' // Fixable (수정 가능)
  | 'NO_FIX'; // No Fix Available (수정 불가)

/**
 * 취약점 카테고리 정보
 */
export interface VulnerabilityCategory {
  category_id: VulnerabilityCategoryId;
  category_name: string;
  category_name_ko: string;
  description?: string;
}

/**
 * 체크리스트 항목 상태
 */
export type ChecklistItemStatus =
  | 'open'
  | 'resolved'
  | 'false_positive'
  | 'accepted_risk';

/**
 * 분석 소스 도구
 */
export type SourceTool = 'semgrep' | 'codeql' | 'trivy' | 'zap' | 'other';

/**
 * 취약점 체크리스트 항목
 */
export interface VulnerabilityChecklistItem {
  item_id: string;
  title: string;
  description?: string;
  severity: SeverityLevel;
  source_tool: SourceTool;
  status: ChecklistItemStatus;
  resolved_at?: string | null;
  resolved_by?: string | null;
  file_path?: string;
  line_number?: number;
  cwe_id?: string;
  cve_id?: string;
  reference_url?: string;
  recommendation?: string;
}

/**
 * 카테고리화된 취약점 그룹
 */
export interface CategorizedVulnerabilityGroup {
  category_id: VulnerabilityCategoryId;
  category_name: string;
  category_name_ko: string;
  checklist_items: VulnerabilityChecklistItem[];
  total_count: number;
  open_count: number;
  resolved_count: number;
}

/**
 * 카테고리화된 스캔 응답의 요약 정보
 */
export interface CategorizedScanSummary {
  total_vulnerabilities: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info?: number;
  };
  by_category: Partial<Record<VulnerabilityCategoryId, number>>;
  by_status: {
    open: number;
    resolved: number;
    false_positive?: number;
    accepted_risk?: number;
  };
}

/**
 * 카테고리화된 스캔 응답
 * GET /scan/vulnerabilities/categorized/<git_info_idx> 응답 타입
 */
export interface CategorizedScanResponse {
  scan_id: string;
  git_info_idx: number;
  timestamp: string;
  summary: CategorizedScanSummary;
  categories: CategorizedVulnerabilityGroup[];
}

/**
 * 취약점 해결 요청 파라미터
 * POST /scan/vulnerabilities/resolve 요청 타입
 */
export interface ResolveVulnerabilityParams {
  service_id: number;
  item_id: string;
  status: ChecklistItemStatus;
  resolved_by?: string;
  comment?: string;
}

/**
 * 취약점 해결 응답
 */
export interface ResolveVulnerabilityResponse {
  success: boolean;
  item_id: string;
  status: ChecklistItemStatus;
  resolved_at?: string;
  message?: string;
}

/**
 * 카테고리 목록 조회 응답
 * GET /scan/vulnerabilities/categories 응답 타입
 */
export interface VulnerabilityCategoriesResponse {
  categories: VulnerabilityCategory[];
}

/**
 * 미해결 취약점 조회 응답
 * GET /scan/vulnerabilities/pending/<git_info_idx> 응답 타입
 */
export interface PendingVulnerabilitiesResponse {
  scan_id: string;
  git_info_idx: number;
  timestamp: string;
  summary: {
    total_pending: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info?: number;
    };
    by_category: Partial<Record<VulnerabilityCategoryId, number>>;
  };
  categories: CategorizedVulnerabilityGroup[];
}

/**
 * 카테고리 정보 상수
 */
export const VULNERABILITY_CATEGORIES: Record<
  VulnerabilityCategoryId,
  VulnerabilityCategory
> = {
  INJ: {
    category_id: 'INJ',
    category_name: 'Injection',
    category_name_ko: '인젝션',
    description: 'SQL, Command, XSS 인젝션 취약점',
  },
  AUTH: {
    category_id: 'AUTH',
    category_name: 'Authentication',
    category_name_ko: '인증',
    description: '인증 및 세션 관리 취약점',
  },
  SENS: {
    category_id: 'SENS',
    category_name: 'Sensitive Data',
    category_name_ko: '민감 데이터',
    description: '민감 정보 노출 취약점',
  },
  CRYPTO: {
    category_id: 'CRYPTO',
    category_name: 'Cryptographic Issues',
    category_name_ko: '암호화',
    description: '암호화 관련 취약점',
  },
  CONFIG: {
    category_id: 'CONFIG',
    category_name: 'Security Misconfiguration',
    category_name_ko: '보안 설정',
    description: '보안 설정 오류',
  },
  VULN_DEP: {
    category_id: 'VULN_DEP',
    category_name: 'Vulnerable Components',
    category_name_ko: '취약 컴포넌트',
    description: '취약한 의존성/컴포넌트',
  },
  INPUT: {
    category_id: 'INPUT',
    category_name: 'Input Validation',
    category_name_ko: '입력 검증',
    description: '입력값 검증 취약점',
  },
  NETWORK: {
    category_id: 'NETWORK',
    category_name: 'Network Security',
    category_name_ko: '네트워크 보안',
    description: '네트워크 보안 취약점',
  },
  ACCESS: {
    category_id: 'ACCESS',
    category_name: 'Access Control',
    category_name_ko: '접근 제어',
    description: '접근 권한 관리 취약점',
  },
  OTHER: {
    category_id: 'OTHER',
    category_name: 'Other',
    category_name_ko: '기타',
    description: '기타 보안 이슈',
  },
  // SCA 전용 카테고리 (심각도 기반)
  CVE_CRITICAL: {
    category_id: 'CVE_CRITICAL',
    category_name: 'Critical CVEs',
    category_name_ko: '긴급 취약점',
    description:
      '즉시 조치가 필요한 심각한 보안 취약점입니다. 원격 코드 실행, 권한 상승 등 치명적인 공격에 악용될 수 있습니다.',
  },
  CVE_HIGH: {
    category_id: 'CVE_HIGH',
    category_name: 'High Severity CVEs',
    category_name_ko: '높은 위험 취약점',
    description:
      '빠른 시일 내 조치가 권장되는 취약점입니다. 데이터 유출이나 서비스 장애를 유발할 수 있습니다.',
  },
  CVE_MEDIUM: {
    category_id: 'CVE_MEDIUM',
    category_name: 'Medium Severity CVEs',
    category_name_ko: '보통 위험 취약점',
    description:
      '계획된 유지보수 시 조치를 권장합니다. 특정 조건에서 악용 가능한 취약점입니다.',
  },
  CVE_LOW: {
    category_id: 'CVE_LOW',
    category_name: 'Low Severity CVEs',
    category_name_ko: '낮은 위험 취약점',
    description:
      '즉각적인 위험은 낮으나, 보안 강화를 위해 점진적 업데이트를 권장합니다.',
  },
  // SCA 보조 카테고리 (패키지 타입)
  OS_PKG: {
    category_id: 'OS_PKG',
    category_name: 'OS Package Vulnerabilities',
    category_name_ko: 'OS 패키지',
    description: '운영체제 패키지 취약점 (Alpine, Debian, Ubuntu 등)',
  },
  LANG_PKG: {
    category_id: 'LANG_PKG',
    category_name: 'Language Package Vulnerabilities',
    category_name_ko: '언어 패키지',
    description: '프로그래밍 언어 의존성 취약점 (npm, pip, go modules 등)',
  },
  FIXABLE: {
    category_id: 'FIXABLE',
    category_name: 'Fixable Vulnerabilities',
    category_name_ko: '수정 가능',
    description: '패치/업데이트 버전이 있는 취약점',
  },
  NO_FIX: {
    category_id: 'NO_FIX',
    category_name: 'No Fix Available',
    category_name_ko: '수정 불가',
    description: '현재 패치가 없는 취약점',
  },
};

/**
 * 카테고리 색상 매핑
 */
export const categoryColors: Record<VulnerabilityCategoryId, string> = {
  // SAST/DAST 통합 카테고리
  INJ: '#ff4d4f', // 빨강 - 인젝션은 심각
  AUTH: '#ff7875', // 연한 빨강
  SENS: '#fa8c16', // 주황
  CRYPTO: '#faad14', // 노랑
  CONFIG: '#a0d911', // 라임
  VULN_DEP: '#52c41a', // 초록
  INPUT: '#13c2c2', // 청록
  NETWORK: '#1890ff', // 파랑
  ACCESS: '#722ed1', // 보라
  OTHER: '#8c8c8c', // 회색
  // SCA 전용 카테고리 (심각도 기반)
  CVE_CRITICAL: '#a8071a', // 진한 빨강 - Critical
  CVE_HIGH: '#cf1322', // 빨강 - High
  CVE_MEDIUM: '#d46b08', // 주황 - Medium
  CVE_LOW: '#096dd9', // 파랑 - Low
  // SCA 보조 카테고리
  OS_PKG: '#531dab', // 보라 - OS 패키지
  LANG_PKG: '#1d39c4', // 남색 - 언어 패키지
  FIXABLE: '#389e0d', // 초록 - 수정 가능
  NO_FIX: '#ad6800', // 갈색 - 수정 불가
};

/**
 * SCA 카테고리 상세 정보 (UX 개선용)
 * - CVSS 점수 범위, 우선순위, 권장 조치 기간, 아이콘 등
 */
export interface ScaCategoryInfo {
  id: string;
  label: string;
  cvssRange: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityLabel: string;
  actionTimeframe: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  guidance: string;
}

export const SCA_CATEGORY_INFO: Record<string, ScaCategoryInfo> = {
  CVE_CRITICAL: {
    id: 'CVE_CRITICAL',
    label: '긴급',
    cvssRange: 'CVSS 9.0 - 10.0',
    priority: 'critical',
    priorityLabel: '최우선',
    actionTimeframe: '즉시 조치 (24시간 이내)',
    icon: '🔴',
    color: '#a8071a',
    bgColor: '#fff1f0',
    description: '시스템 전체에 심각한 영향을 미칠 수 있는 취약점',
    guidance:
      '• 원격 코드 실행(RCE) 가능성\n• 권한 상승 및 시스템 탈취 위험\n• 인증 없이 악용 가능한 경우 다수',
  },
  CVE_HIGH: {
    id: 'CVE_HIGH',
    label: '높음',
    cvssRange: 'CVSS 7.0 - 8.9',
    priority: 'high',
    priorityLabel: '우선',
    actionTimeframe: '1주일 이내 조치 권장',
    icon: '🟠',
    color: '#cf1322',
    bgColor: '#fff2e8',
    description: '주요 기능에 영향을 줄 수 있는 취약점',
    guidance:
      '• 민감 데이터 유출 가능성\n• 서비스 거부(DoS) 공격 위험\n• 제한된 조건에서 악용 가능',
  },
  CVE_MEDIUM: {
    id: 'CVE_MEDIUM',
    label: '보통',
    cvssRange: 'CVSS 4.0 - 6.9',
    priority: 'medium',
    priorityLabel: '일반',
    actionTimeframe: '1개월 이내 조치 권장',
    icon: '🟡',
    color: '#d46b08',
    bgColor: '#fffbe6',
    description: '제한된 상황에서 영향을 줄 수 있는 취약점',
    guidance:
      '• 특정 설정/환경에서만 악용 가능\n• 사용자 상호작용 필요\n• 정기 업데이트 시 함께 해결',
  },
  CVE_LOW: {
    id: 'CVE_LOW',
    label: '낮음',
    cvssRange: 'CVSS 0.1 - 3.9',
    priority: 'low',
    priorityLabel: '참고',
    actionTimeframe: '다음 정기 업데이트 시 조치',
    icon: '🟢',
    color: '#096dd9',
    bgColor: '#e6f7ff',
    description: '즉각적인 위험은 낮으나 개선이 권장되는 취약점',
    guidance:
      '• 악용 난이도 높음\n• 영향 범위 제한적\n• 보안 강화 차원에서 업데이트 권장',
  },
};

/**
 * DAST 카테고리 상세 정보 (UX 개선용)
 * - OWASP ZAP 기반 웹 애플리케이션 취약점 카테고리
 * - 백엔드 DAST_CATEGORIES와 동일한 구조
 */
export interface DastCategoryInfo {
  id: string;
  label: string;
  owaspCategory: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
  riskLabel: string;
  actionTimeframe: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  guidance: string;
  examples: string[];
}

export const DAST_CATEGORY_INFO: Record<string, DastCategoryInfo> = {
  SQL_INJECTION: {
    id: 'SQL_INJECTION',
    label: 'SQL 인젝션',
    owaspCategory: 'A03:2021 - Injection',
    riskLevel: 'critical',
    riskLabel: '긴급',
    actionTimeframe: '즉시 조치 (24시간 이내)',
    icon: '💉',
    color: '#a8071a',
    bgColor: '#fff1f0',
    description: '데이터베이스 쿼리 삽입 공격 취약점',
    guidance:
      '• Prepared Statement / Parameterized Query 사용 필수\n• 입력값 화이트리스트 검증\n• ORM 프레임워크 활용 권장',
    examples: [
      'SQL Injection',
      'Blind SQL Injection',
      'Time-based SQL Injection',
    ],
  },
  XSS: {
    id: 'XSS',
    label: '크로스 사이트 스크립팅',
    owaspCategory: 'A03:2021 - Injection (XSS)',
    riskLevel: 'high',
    riskLabel: '높음',
    actionTimeframe: '1주일 이내 조치 권장',
    icon: '🔥',
    color: '#cf1322',
    bgColor: '#fff2e8',
    description: '악성 스크립트가 사용자 브라우저에서 실행되는 취약점',
    guidance:
      '• 출력 시 HTML 인코딩 적용\n• Content-Security-Policy 헤더 설정\n• HttpOnly, Secure 쿠키 플래그 사용',
    examples: ['Reflected XSS', 'Stored XSS', 'DOM-based XSS'],
  },
  CSRF: {
    id: 'CSRF',
    label: '크로스 사이트 요청 위조',
    owaspCategory: 'A01:2021 - Broken Access Control',
    riskLevel: 'medium',
    riskLabel: '보통',
    actionTimeframe: '1개월 이내 조치 권장',
    icon: '🎭',
    color: '#d46b08',
    bgColor: '#fffbe6',
    description: '사용자 의도와 다른 요청 실행 취약점',
    guidance:
      '• CSRF 토큰 사용\n• SameSite 쿠키 속성 설정\n• Referer/Origin 헤더 검증',
    examples: ['Cross-Site Request Forgery', 'State Change without Token'],
  },
  PATH_TRAVERSAL: {
    id: 'PATH_TRAVERSAL',
    label: '경로 탐색',
    owaspCategory: 'A01:2021 - Broken Access Control',
    riskLevel: 'high',
    riskLabel: '높음',
    actionTimeframe: '1주일 이내 조치 권장',
    icon: '📂',
    color: '#cf1322',
    bgColor: '#fff2e8',
    description: '파일 시스템 경로 조작 취약점 (Directory Traversal, LFI)',
    guidance:
      '• 경로 정규화 및 검증\n• 화이트리스트 기반 파일 접근\n• 루트 디렉토리 제한',
    examples: [
      'Directory Traversal',
      'Local File Inclusion',
      'Path Manipulation',
    ],
  },
  INFO_DISCLOSURE: {
    id: 'INFO_DISCLOSURE',
    label: '정보 노출',
    owaspCategory: 'A01:2021 - Broken Access Control',
    riskLevel: 'low',
    riskLabel: '낮음',
    actionTimeframe: '다음 정기 업데이트 시 조치',
    icon: '👁️',
    color: '#096dd9',
    bgColor: '#e6f7ff',
    description: '민감 정보 노출 취약점 (에러 메시지, 버전 정보 등)',
    guidance:
      '• 에러 메시지 커스터마이징\n• 서버 배너 제거\n• 디버그 모드 비활성화',
    examples: [
      'Server Version Disclosure',
      'Stack Trace Exposure',
      'Error Message Leak',
    ],
  },
  SECURITY_HEADERS: {
    id: 'SECURITY_HEADERS',
    label: '보안 헤더 누락',
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    riskLevel: 'medium',
    riskLabel: '보통',
    actionTimeframe: '1개월 이내 조치 권장',
    icon: '📋',
    color: '#d46b08',
    bgColor: '#fffbe6',
    description: 'HTTP 보안 헤더 미설정 (CSP, X-Frame-Options, HSTS 등)',
    guidance:
      '• Content-Security-Policy 설정\n• X-Frame-Options: DENY 또는 SAMEORIGIN\n• Strict-Transport-Security 활성화',
    examples: [
      'Missing CSP',
      'Missing X-Frame-Options',
      'Missing HSTS',
      'Clickjacking',
    ],
  },
  SSL_TLS: {
    id: 'SSL_TLS',
    label: 'SSL/TLS 취약점',
    owaspCategory: 'A02:2021 - Cryptographic Failures',
    riskLevel: 'high',
    riskLabel: '높음',
    actionTimeframe: '1주일 이내 조치 권장',
    icon: '🔒',
    color: '#cf1322',
    bgColor: '#fff2e8',
    description: '암호화 통신 관련 취약점 (인증서, 프로토콜, 암호 스위트)',
    guidance:
      '• TLS 1.2 이상만 허용\n• 취약한 암호 스위트 비활성화\n• 유효한 인증서 사용',
    examples: [
      'Weak Cipher Suite',
      'Expired Certificate',
      'SSL/TLS Protocol Issues',
    ],
  },
  AUTH_SESSION: {
    id: 'AUTH_SESSION',
    label: '인증 및 세션',
    owaspCategory: 'A07:2021 - Identification and Authentication Failures',
    riskLevel: 'critical',
    riskLabel: '긴급',
    actionTimeframe: '즉시 조치 (24시간 이내)',
    icon: '🔑',
    color: '#a8071a',
    bgColor: '#fff1f0',
    description: '인증 및 세션 관리 취약점 (쿠키, 토큰, 세션 고정)',
    guidance:
      '• 강력한 비밀번호 정책\n• 세션 타임아웃 설정\n• Secure, HttpOnly 쿠키 플래그',
    examples: [
      'Session Fixation',
      'Weak Cookie Attributes',
      'Authentication Bypass',
    ],
  },
  INJECTION_OTHER: {
    id: 'INJECTION_OTHER',
    label: '기타 인젝션',
    owaspCategory: 'A03:2021 - Injection',
    riskLevel: 'critical',
    riskLabel: '긴급',
    actionTimeframe: '즉시 조치 (24시간 이내)',
    icon: '💉',
    color: '#a8071a',
    bgColor: '#fff1f0',
    description: '기타 인젝션 취약점 (Command, LDAP, XML, Template 등)',
    guidance:
      '• 모든 입력값 검증\n• 명령 실행 시 파라미터 분리\n• 템플릿 엔진 보안 설정',
    examples: [
      'OS Command Injection',
      'LDAP Injection',
      'XML Injection',
      'Template Injection',
    ],
  },
  SERVER_CONFIG: {
    id: 'SERVER_CONFIG',
    label: '서버 설정 오류',
    owaspCategory: 'A05:2021 - Security Misconfiguration',
    riskLevel: 'medium',
    riskLabel: '보통',
    actionTimeframe: '1개월 이내 조치 권장',
    icon: '⚙️',
    color: '#d46b08',
    bgColor: '#fffbe6',
    description: '서버 보안 설정 오류 (디렉토리 리스팅, 불필요한 메서드 등)',
    guidance:
      '• 디렉토리 리스팅 비활성화\n• 불필요한 HTTP 메서드 비활성화\n• 관리 페이지 접근 제한',
    examples: [
      'Directory Listing',
      'Unnecessary HTTP Methods',
      'Admin Panel Exposure',
    ],
  },
};

/**
 * DAST 위험도별 요약 정보
 */
export const DAST_RISK_SUMMARY: Record<
  string,
  { label: string; description: string; icon: string; color: string }
> = {
  critical: {
    label: '긴급',
    description: '즉시 조치가 필요한 심각한 취약점',
    icon: '🔴',
    color: '#a8071a',
  },
  high: {
    label: '높음',
    description: '빠른 시일 내 조치가 필요한 취약점',
    icon: '🟠',
    color: '#cf1322',
  },
  medium: {
    label: '보통',
    description: '계획된 일정 내 조치가 필요한 취약점',
    icon: '🟡',
    color: '#d46b08',
  },
  low: {
    label: '낮음',
    description: '권장 사항 수준의 개선점',
    icon: '🟢',
    color: '#096dd9',
  },
  info: {
    label: '정보',
    description: '참고용 정보성 항목',
    icon: '🔵',
    color: '#1890ff',
  },
};

/**
 * 소스 도구 라벨 매핑
 */
export const sourceToolLabels: Record<SourceTool, string> = {
  semgrep: 'Semgrep (SAST)',
  codeql: 'CodeQL (SAST)',
  trivy: 'Trivy (SCA)',
  zap: 'ZAP (DAST)',
  other: 'Other',
};

/**
 * 체크리스트 상태 라벨 매핑
 */
export const checklistStatusLabels: Record<ChecklistItemStatus, string> = {
  open: '미해결',
  resolved: '해결됨',
  false_positive: '오탐',
  accepted_risk: '위험 수용',
};

// ==================== SBOM (Software Bill of Materials) 관련 타입 ====================

/**
 * SBOM 컴포넌트 타입
 */
export type SbomComponentType =
  | 'library'
  | 'framework'
  | 'application'
  | 'container'
  | 'operating-system'
  | 'device'
  | 'file';

/**
 * SBOM 컴포넌트
 */
export interface SbomComponent {
  name: string;
  version: string;
  purl: string; // Package URL (예: pkg:npm/lodash@4.17.21)
  type: SbomComponentType;
  licenses: string[];
  supplier?: string;
  author?: string;
  description?: string;
  hashes?: Array<{
    alg: string;
    content: string;
  }>;
  externalReferences?: Array<{
    type: string;
    url: string;
  }>;
}

/**
 * SBOM 의존성
 */
export interface SbomDependency {
  ref: string; // Component reference (purl)
  dependsOn: string[]; // Dependencies (purl list)
}

/**
 * SBOM 요약 정보
 */
export interface SbomSummary {
  format: 'CycloneDX';
  spec_version: string; // 예: "1.5"
  total_components: number;
  total_dependencies: number;
  sbom_uuid?: string;
  serial_number?: string;
  timestamp?: string;
}

/**
 * SBOM 생성 결과
 */
export interface SbomResult {
  sbom_id: number;
  service_id: number;
  sbom_type: 'image' | 'source';
  target_name: string;
  summary: SbomSummary;
  components?: SbomComponent[];
  dependencies?: SbomDependency[];
  license_summary?: LicenseSummary;
  created_at: string;
  kafka_status?: 'pending' | 'sent' | 'failed';
}

/**
 * 이미지 SBOM 생성 요청 파라미터
 */
export interface GenerateImageSbomParams {
  image_url: string;
  repo_id?: number;
  license_analysis?: boolean;
  registry_username?: string;
  registry_password?: string;
}

/**
 * 소스코드 SBOM 생성 요청 파라미터
 */
export interface GenerateSourceSbomParams {
  git_url: string;
  git_token?: string;
  branch?: string;
  repo_id?: number;
  license_analysis?: boolean;
}

/**
 * SBOM 목록 조회 응답
 */
export interface SbomListResponse {
  sboms: SbomResult[];
  total: number;
}

// ==================== 라이선스 분석 관련 타입 ====================

/**
 * 라이선스 카테고리
 * - permissive: MIT, Apache-2.0, BSD-* 등 자유로운 사용 가능
 * - weak_copyleft: LGPL-*, MPL-2.0 등 수정 시 공개 필요
 * - strong_copyleft: GPL-*, AGPL-* 등 전체 소스 공개 필요
 * - proprietary: Commercial 등 상업적 라이선스 필요
 * - unknown: 미확인 라이선스
 */
export type LicenseCategory =
  | 'permissive'
  | 'weak_copyleft'
  | 'strong_copyleft'
  | 'proprietary'
  | 'unknown';

/**
 * 라이선스 위험도
 */
export type LicenseRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 라이선스 검토 상태
 */
export type LicenseStatus = 'open' | 'reviewed' | 'approved' | 'rejected';

/**
 * 라이선스 분석 항목
 */
export interface LicenseAnalysisItem {
  id?: number;
  sbom_id: number;
  component_name: string;
  component_version: string;
  purl: string;
  license_id: string;
  license_name?: string;
  license_category: LicenseCategory;
  risk_level: LicenseRiskLevel;
  status: LicenseStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  comment?: string;
}

/**
 * 라이선스 요약 통계
 */
export interface LicenseSummary {
  by_category: Record<LicenseCategory, number>;
  by_risk: Record<LicenseRiskLevel, number>;
  total_licenses?: number;
  needs_review?: number;
}

/**
 * 라이선스 분석 결과
 */
export interface LicenseAnalysisResult {
  sbom_id: number;
  service_id: number;
  target_name?: string;
  licenses: LicenseAnalysisItem[];
  summary: LicenseSummary;
  analyzed_at?: string;
}

/**
 * 라이선스 상태 업데이트 요청
 */
export interface ResolveLicenseParams {
  sbom_id: number;
  component_name: string;
  purl?: string;
  status: LicenseStatus;
  comment?: string;
  reviewed_by?: string;
}

/**
 * 라이선스 리포트 요청 파라미터
 */
export interface LicenseReportParams {
  sbom_id: number;
  format?: 'json' | 'pdf' | 'csv';
  include_components?: boolean;
}

// ==================== SBOM/라이선스 UI 상수 ====================

/**
 * 라이선스 카테고리 정보
 */
export interface LicenseCategoryInfo {
  id: LicenseCategory;
  label: string;
  labelKo: string;
  description: string;
  riskLevel: LicenseRiskLevel;
  icon: string;
  color: string;
  bgColor: string;
  examples: string[];
}

export const LICENSE_CATEGORY_INFO: Record<
  LicenseCategory,
  LicenseCategoryInfo
> = {
  permissive: {
    id: 'permissive',
    label: 'Permissive',
    labelKo: '허용적',
    description: '자유로운 사용, 수정, 배포가 가능한 라이선스입니다.',
    riskLevel: 'low',
    icon: '',
    color: '#52c41a',
    bgColor: '#f6ffed',
    examples: [
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'Unlicense',
    ],
  },
  weak_copyleft: {
    id: 'weak_copyleft',
    label: 'Weak Copyleft',
    labelKo: '약한 카피레프트',
    description: '라이브러리 수정 시 해당 부분의 소스 공개가 필요합니다.',
    riskLevel: 'medium',
    icon: '⚠️',
    color: '#faad14',
    bgColor: '#fffbe6',
    examples: ['LGPL-2.1', 'LGPL-3.0', 'MPL-2.0', 'EPL-1.0', 'EPL-2.0'],
  },
  strong_copyleft: {
    id: 'strong_copyleft',
    label: 'Strong Copyleft',
    labelKo: '강한 카피레프트',
    description: '사용 시 전체 프로젝트의 소스 코드 공개가 필요할 수 있습니다.',
    riskLevel: 'high',
    icon: '🔴',
    color: '#ff4d4f',
    bgColor: '#fff1f0',
    examples: ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'],
  },
  proprietary: {
    id: 'proprietary',
    label: 'Proprietary',
    labelKo: '상업용',
    description: '상업적 라이선스가 필요하며, 비용이 발생할 수 있습니다.',
    riskLevel: 'critical',
    icon: '💰',
    color: '#722ed1',
    bgColor: '#f9f0ff',
    examples: ['Commercial', 'Proprietary', 'Enterprise'],
  },
  unknown: {
    id: 'unknown',
    label: 'Unknown',
    labelKo: '미확인',
    description: '라이선스를 확인할 수 없습니다. 수동 검토가 필요합니다.',
    riskLevel: 'medium',
    icon: '❓',
    color: '#8c8c8c',
    bgColor: '#fafafa',
    examples: [],
  },
};

/**
 * 라이선스 위험도 색상 매핑
 */
export const LICENSE_RISK_COLORS: Record<LicenseRiskLevel, string> = {
  low: '#52c41a', // 초록 - 허용적 라이선스
  medium: '#faad14', // 노랑 - 약한 카피레프트/미확인
  high: '#ff4d4f', // 빨강 - 강한 카피레프트
  critical: '#722ed1', // 보라 - 상업용
};

/**
 * 라이선스 위험도 라벨
 */
export const LICENSE_RISK_LABELS: Record<LicenseRiskLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '심각',
};

/**
 * 라이선스 상태 라벨
 */
export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  open: '미검토',
  reviewed: '검토됨',
  approved: '승인됨',
  rejected: '거부됨',
};

/**
 * 라이선스 상태 색상
 */
export const LICENSE_STATUS_COLORS: Record<LicenseStatus, string> = {
  open: '#8c8c8c', // 회색
  reviewed: '#1890ff', // 파랑
  approved: '#52c41a', // 초록
  rejected: '#ff4d4f', // 빨강
};

/**
 * SBOM 타입 라벨
 */
export const SBOM_TYPE_LABELS: Record<'image' | 'source', string> = {
  image: '컨테이너 이미지',
  source: '소스코드',
};

/**
 * SBOM 컴포넌트 타입 라벨
 */
export const SBOM_COMPONENT_TYPE_LABELS: Record<SbomComponentType, string> = {
  library: '라이브러리',
  framework: '프레임워크',
  application: '애플리케이션',
  container: '컨테이너',
  'operating-system': '운영체제',
  device: '장치',
  file: '파일',
};
