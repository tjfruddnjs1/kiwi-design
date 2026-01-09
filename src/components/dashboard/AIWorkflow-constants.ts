//  [수정] 4단계 파이프라인 구조로 변경 (SAST/SCA/DAST는 각 단계 내 탭으로 통합)
// AIWorkflowDashboard에서 사용하는 타입과 상수들을 별도 파일로 분리하여 재사용성을 높입니다.

export type WorkflowStage =
  | 'code'
  | 'security'
  | 'build'
  | 'test'
  | 'deploy'
  | 'operate';
export type DisplayKey = 'source' | 'build' | 'deploy' | 'operate';

export const DISPLAY_ORDER: DisplayKey[] = [
  'source', // SAST 탭 포함
  'build', // SCA 탭 포함
  'deploy',
  'operate', // DAST 탭 포함
];

export const desiredToLegacyStage: Record<DisplayKey, WorkflowStage> = {
  source: 'code',
  build: 'build',
  deploy: 'deploy',
  operate: 'operate',
};

export const desiredDisplayName: Record<DisplayKey, string> = {
  source: '소스',
  build: '빌드',
  deploy: '배포',
  operate: '운영',
};
