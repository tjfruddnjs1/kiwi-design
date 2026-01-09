import type { Project } from './mockProjects';
// 기존 목업 데이터를 기본 템플릿으로 사용하기 위해 import 합니다.
import {
  mockWorkflowStatuses,
  mockAIInsights,
  mockSystemHealthSummary,
  getPipelineAlertsByProject,
} from './mockAIDevOpsData';

/**
 * 간단한 해시 함수: 문자열(프로젝트 ID)을 기반으로 일관된 랜덤 숫자를 생성합니다.
 * @param str - 입력 문자열 (예: '129', '131')
 * @returns 32비트 정수 해시값
 */
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 32비트 정수로 변환
  }
  return Math.abs(hash);
};

/**
 * 선택된 프로젝트 객체를 기반으로 동적인 대시보드 목업 데이터를 생성합니다.
 * @param project - 현재 선택된 프로젝트 객체
 * @returns 대시보드 표시에 필요한 모든 데이터가 포함된 객체
 */
export const generateDashboardData = (project: Project) => {
  // 프로젝트 ID를 시드(seed)로 사용하여 매번 동일한 프로젝트에 대해 동일한 값을 생성합니다.
  const seed = hashCode(project.id);

  // 1. 워크플로우 상태 생성
  const workflowStatuses = mockWorkflowStatuses.map((status, index) => {
    const progress = ((seed * (index + 1)) % 80) + 20; // 20-99% 사이의 진행률
    const isHealthy = (seed + index) % 3 === 0; // 33% 확률로 healthy
    const isInactive = project.status !== 'active' && index > 2; // 비활성 프로젝트는 일부 단계 비활성화

    let currentStatus: 'healthy' | 'attention' | 'critical' | 'inactive' =
      'attention';
    if (isInactive) {
      currentStatus = 'inactive';
    } else if (isHealthy) {
      currentStatus = 'healthy';
    } else if (progress < 50) {
      currentStatus = 'critical';
    }

    return {
      ...status,
      progress: isInactive ? 0 : progress,
      status: currentStatus,
    };
  });

  // 2. 시스템 상태 요약 생성
  const systemHealth = {
    ...mockSystemHealthSummary,
    overall: {
      score: (seed % 40) + 60, // 60-99점 사이의 점수
      trend: ['improving', 'stable', 'declining'][seed % 3],
    },
    activeAlerts: {
      critical: seed % 3,
      high: (seed % 5) + 1,
      medium: (seed % 10) + 2,
      low: (seed % 15) + 5,
    },
  };

  // 3. 파이프라인 알람 생성
  // 실제로는 project.id에 맞는 알람을 API로 가져와야 하지만, 지금은 목업으로 대체합니다.
  const allAlerts = getPipelineAlertsByProject(null); // 모든 알람을 가져온 후
  const numAlerts = (seed % 4) + 1; // 1-4개의 알람만 표시
  const selectedAlerts = allAlerts.slice(0, numAlerts).map(alert => ({
    ...alert,
    // 실제 프로젝트의 환경 정보를 알람에 반영
    environment: project.environment,
  }));

  // 4. AI 인사이트 생성
  const insights = mockAIInsights.map((insight, index) => ({
    ...insight,
    aiScore: ((seed * (index + 5)) % 30) + 70, // 70-99% 사이의 확신도
  }));

  return {
    workflowStatuses,
    systemHealth,
    alerts: selectedAlerts,
    insights,
  };
};
