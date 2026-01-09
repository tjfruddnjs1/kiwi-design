/**
 * Git Management 관련 유틸리티 함수
 * GitManagement.tsx에서 추출된 순수 함수들
 */

import type { PipelineStep } from '../lib/api/pipeline';
import type { WorkflowStage } from '../components/dashboard/AIWorkflow-constants';

// 워크플로우 상태 타입 (WorkflowStatus와 호환)
export type WorkflowStatusValue =
  | 'inactive'
  | 'running'
  | 'success'
  | 'failed'
  | 'pending'
  | 'warning';

// 로컬 워크플로우 상태 타입
export interface LocalWorkflowStatus {
  stage: WorkflowStage;
  name: string;
  status: WorkflowStatusValue;
  progress: number;
  lastUpdate: string;
  execution?: { executionLogs: string[] };
  metrics?: {
    throughput: number;
    quality: number;
    efficiency: number;
    reliability: number;
  };
  error_message?: string;
  details_data?: string | Record<string, unknown>;
}

/**
 * 데이터베이스 상태 값을 워크플로우 상태로 정규화
 */
function normalizeStatus(dbStatus: string): WorkflowStatusValue {
  const normalizedMap: Record<string, WorkflowStatusValue> = {
    inactive: 'inactive',
    running: 'running',
    success: 'success',
    failed: 'failed',
    pending: 'pending',
    warning: 'warning',
    completed: 'success',
    error: 'failed',
    cancelled: 'failed',
    canceled: 'failed',
  };
  return normalizedMap[dbStatus?.toLowerCase()] || 'inactive';
}

// 워크플로우 템플릿
const WORKFLOW_TEMPLATE: LocalWorkflowStatus[] = [
  {
    stage: 'code',
    name: '소스',
    status: 'inactive',
    progress: 0,
    lastUpdate: '',
    execution: { executionLogs: [] },
  },
  {
    stage: 'security',
    name: '보안',
    status: 'inactive',
    progress: 0,
    lastUpdate: '',
    execution: { executionLogs: [] },
  },
  {
    stage: 'build',
    name: '빌드',
    status: 'inactive',
    progress: 0,
    lastUpdate: '',
    execution: { executionLogs: [] },
  },
  {
    stage: 'test',
    name: 'QA 검증',
    status: 'inactive',
    progress: 0,
    lastUpdate: '',
    execution: { executionLogs: [] },
  },
  {
    stage: 'deploy',
    name: '배포',
    status: 'inactive',
    progress: 0,
    lastUpdate: '',
    execution: { executionLogs: [] },
  },
  {
    stage: 'operate',
    name: '운영',
    status: 'inactive',
    progress: 0,
    lastUpdate: '',
    execution: { executionLogs: [] },
  },
];

// 백엔드-프론트엔드 스테이지 매핑
const BACKEND_TO_FRONTEND_STAGE: Record<string, WorkflowStage> = {
  build: 'build',
  deploy: 'deploy',
};

/**
 * DB에서 조회한 파이프라인 스텝을 워크플로우 형식으로 변환
 * @param dbSteps - 데이터베이스에서 조회한 파이프라인 스텝 배열
 * @returns 변환된 로컬 워크플로우 상태 배열
 */
export function transformDbStepsToWorkflow(
  dbSteps: PipelineStep[]
): LocalWorkflowStatus[] {
  const template = WORKFLOW_TEMPLATE.map(t => ({
    ...t,
    execution: { executionLogs: [] as string[] },
  }));

  // 같은 step_name이 여러 개 있으면 ID가 가장 큰 (최신) 것만 선택
  const latestSteps: Record<string, PipelineStep> = {};
  dbSteps.forEach(step => {
    if (
      !latestSteps[step.step_name] ||
      latestSteps[step.step_name].id < step.id
    ) {
      latestSteps[step.step_name] = step;
    }
  });
  const dbStepsMap = new Map(
    Object.values(latestSteps).map(s => [s.step_name, s])
  );

  return template.map(t => {
    const backendKey = Object.keys(BACKEND_TO_FRONTEND_STAGE).find(
      k => BACKEND_TO_FRONTEND_STAGE[k] === t.stage
    );
    const db = backendKey ? dbStepsMap.get(backendKey) : undefined;

    if (db) {
      let progress = 0;
      if (db.progress_percentage.Valid) {
        progress = db.progress_percentage.Float64;
      } else if (db.status === 'success') {
        progress = 100;
      }

      const lastUpdate = db.completed_at.Valid
        ? db.completed_at.String
        : db.started_at.Valid
          ? db.started_at.String
          : '';

      return {
        ...t,
        status: normalizeStatus(db.status),
        progress,
        lastUpdate,
        error_message: db.error_message?.Valid
          ? db.error_message.String
          : undefined,
        details_data: db.details_data,
      };
    }
    return t;
  });
}

/**
 * Git URL에서 base URL을 추출
 * @param gitUrl - Git 저장소 URL (HTTP/HTTPS 또는 SSH 형식)
 * @returns 추출된 base URL
 * @example
 * getBaseUrlFromGitUrl('https://gitlab.example.com/user/repo.git') // 'https://gitlab.example.com'
 * getBaseUrlFromGitUrl('git@gitlab.example.com:user/repo.git') // 'https://gitlab.example.com'
 */
export function getBaseUrlFromGitUrl(gitUrl: string): string {
  try {
    const u = new URL(gitUrl);
    const full = `${u.protocol}//${u.host}`;
    return full;
  } catch {
    // URL parsing failed - try handling SSH URL format (git@gitlab.mipllab.com:user/repo.git)
    if (gitUrl.startsWith('git@')) {
      const match = gitUrl.match(/git@([^:]+):/);
      if (match) {
        return `https://${match[1]}`;
      }
    }
    return gitUrl.replace(/\/+$/, '');
  }
}
