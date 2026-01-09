/**
 * Pipeline Types
 * 파이프라인 관련 타입 정의
 */

export type PipelineStepName = 'source' | 'build' | 'deploy' | 'operate';

export type PipelineStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';

// 분석 타입 정의 (각 단계의 하위 분석)
export type AnalysisType = 'sast' | 'sca' | 'dast';

// 분석 상태 정의
export type AnalysisStatus =
  | 'not_executed'
  | 'running'
  | 'failed'
  | 'completed';

// 분석 결과 인터페이스
export interface AnalysisResult {
  type: AnalysisType;
  status: AnalysisStatus;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  details?: Record<string, unknown>;
  error_message?: string;
}

export interface Pipeline {
  id: number;
  name: string;
  status: PipelineStatus;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  services_id?: number;
  users_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineDetail {
  id: number;
  pipeline_id: number;
  step_number: number;
  step_name: PipelineStepName;
  status: PipelineStatus;
  progress_percentage?: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  details_data: Record<string, unknown>;
  execution_logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  error_message?: string;
  // 각 단계별 분석 결과 (source: sast, build: sca, operate: dast)
  analysis?: AnalysisResult;
  created_at: string;
  updated_at: string;
}

export interface PipelineStepConfig {
  name: PipelineStepName;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  // 각 단계에서 수행할 수 있는 분석 타입 (선택적)
  analysisType?: AnalysisType;
  analysisDisplayName?: string;
}

export const PIPELINE_STEPS: Record<PipelineStepName, PipelineStepConfig> = {
  source: {
    name: 'source',
    displayName: '소스',
    icon: 'CodeOutlined',
    color: '#722ed1',
    description: 'Git 저장소에서 소스 코드 클론',
    analysisType: 'sast',
    analysisDisplayName: '정적 코드 분석(SAST)',
  },
  build: {
    name: 'build',
    displayName: '빌드',
    icon: 'BuildOutlined',
    color: '#1890ff',
    description: 'Docker 이미지 빌드 및 레지스트리 푸시',
    analysisType: 'sca',
    analysisDisplayName: '이미지 분석(SCA)',
  },
  deploy: {
    name: 'deploy',
    displayName: '배포',
    icon: 'RocketOutlined',
    color: '#52c41a',
    description: 'Kubernetes/Docker에 배포',
  },
  operate: {
    name: 'operate',
    displayName: '운영',
    icon: 'DashboardOutlined',
    color: '#f5222d',
    description: '서비스 상태 모니터링',
    analysisType: 'dast',
    analysisDisplayName: '도메인 분석(DAST)',
  },
};

// 분석 타입별 설정
export interface AnalysisConfig {
  type: AnalysisType;
  displayName: string;
  icon: string;
  color: string;
  description: string;
}

export const ANALYSIS_CONFIGS: Record<AnalysisType, AnalysisConfig> = {
  sast: {
    type: 'sast',
    displayName: '정적 코드 분석',
    icon: 'SecurityScanOutlined',
    color: '#fa8c16',
    description: '정적 애플리케이션 보안 테스트 (SAST)',
  },
  sca: {
    type: 'sca',
    displayName: '이미지 분석',
    icon: 'AuditOutlined',
    color: '#fa541c',
    description: '소프트웨어 구성 요소 분석 (SCA)',
  },
  dast: {
    type: 'dast',
    displayName: '도메인 분석',
    icon: 'BugOutlined',
    color: '#13c2c2',
    description: '동적 애플리케이션 보안 테스트 (DAST)',
  },
};

export interface PipelineReportData {
  pipeline: Pipeline;
  step: PipelineDetail;
  serviceName: string;
  serviceNamespace?: string;
  infraName?: string;
}

//  [신규] 빌드 에러 분석 결과 타입
export interface BuildErrorAnalysis {
  error_type: string; // 에러 타입 (예: npm_install_failed, dockerfile_syntax_error 등)
  title: string; // 에러 제목
  description: string; // 에러 상세 설명
  solutions: string[]; // 해결 방법들 (단계별)
  dockerfile_fix: string; // Dockerfile 수정 제안 (있는 경우)
  is_fixable: boolean; // 자동 수정 가능 여부
  related_docs: string[]; // 관련 문서 링크들
}
