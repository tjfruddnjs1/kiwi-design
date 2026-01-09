// AI 기반 DevOps 인텔리전스 플랫폼 목업 데이터

// 워크플로우 단계별 정의
export type WorkflowStage =
  | 'code'
  | 'security'
  | 'build'
  | 'test'
  | 'deploy'
  | 'operate';

// AI 인사이트 및 제안 시스템
export interface AIInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'alert' | 'optimization';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  category: WorkflowStage | 'infrastructure' | 'security' | 'cost';
  aiScore: number; // 0-100 AI 확신도
  estimatedImpact: string;
  suggestedActions: AIAction[];
  createdAt: string;
  isImplemented?: boolean;
  evidenceData?: {
    metrics: Record<string, number>;
    trends: string[];
    references: string[];
  };
}

export interface AIAction {
  id: string;
  title: string;
  description: string;
  type: 'automated' | 'manual' | 'guided';
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  automationAvailable: boolean;
  prerequisites?: string[];
}

// 사용자 워크플로우 중심 상태
export interface WorkflowStatus {
  stage: WorkflowStage;
  name: string;
  status: 'healthy' | 'attention' | 'critical' | 'inactive';
  progress: number; // 0-100
  metrics: {
    throughput: number;
    quality: number;
    efficiency: number;
    reliability: number;
  };
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  averageLeadTime: string;
  lastUpdate: string;
  aiPredictions: {
    nextBottleneck: string;
    efficiencyTrend: 'improving' | 'stable' | 'declining';
    qualityRisk: number; // 0-100
  };
  execution: {
    lastExecutionTime: string;
    elapsedTime: string;
    isExecuting: boolean;
    executionLogs: string[];
    canExecute: boolean;
  };
}

// 프로젝트 AI 인텔리전스
export interface ProjectAIStatus {
  projectId: string;
  healthScore: number;
  predictedSuccess: number; // 0-100
  riskFactors: string[];
  optimizationOpportunities: string[];
  nextMilestone: {
    name: string;
    date: string;
    confidence: number;
  };
  aiRecommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    effort: string;
  }[];
}

// 인프라 허브 데이터
export interface InfrastructureCluster {
  id: string;
  name: string;
  environment: 'production' | 'staging' | 'development';
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLoad: number;
    activeNodes: number;
    totalNodes: number;
    podsRunning: number;
    podsTotal: number;
  };
  aiOptimizations: {
    costSaving: number; // 월별 예상 절약액
    performanceGain: number; // 예상 성능 개선율
    suggestions: string[];
  };
  healthChecks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    lastCheck: string;
    details?: string;
  }[];
}

// 비용 분석 및 최적화
export interface CostOptimization {
  totalMonthlyCost: number;
  costTrend: 'increasing' | 'stable' | 'decreasing';
  savings: {
    potential: number;
    implemented: number;
  };
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    services: number;
  };
  recommendations: {
    title: string;
    description: string;
    potentialSaving: number;
    difficulty: 'easy' | 'medium' | 'hard';
    riskLevel: 'low' | 'medium' | 'high';
  }[];
}

// AI 어시스턴트 대화 데이터
export interface AIConversation {
  id: string;
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  context: string; // 현재 화면/상황
  actions?: AIAction[];
  followUpQuestions?: string[];
}

// Mock 데이터 생성

// 워크플로우 상태 목업
export const mockWorkflowStatuses: WorkflowStatus[] = [
  {
    stage: 'code',
    name: '코드 작성',
    status: 'healthy',
    progress: 78,
    metrics: {
      throughput: 85,
      quality: 92,
      efficiency: 88,
      reliability: 94,
    },
    activeProjects: 4,
    totalTasks: 23,
    completedTasks: 18,
    blockedTasks: 1,
    averageLeadTime: '2.3일',
    lastUpdate: '5분 전',
    aiPredictions: {
      nextBottleneck: 'Code Review 단계',
      efficiencyTrend: 'improving',
      qualityRisk: 15,
    },
    execution: {
      lastExecutionTime: '2024-08-17 14:32:15',
      elapsedTime: '5분 32초',
      isExecuting: false,
      canExecute: true,
      executionLogs: [
        '[14:37:47] commit 1f3a9c2 (main) — feat: AI 워크플로우 파이프라인 7단계 표시 추가 (by lw)',
        '[14:30:12] commit a8c4e77 (main) — refactor: PipelineFlow 정렬 로직 분리 및 아이콘 색상 개선 (by lw)',
        '[14:18:05] commit 9b2d1e0 (feature/security) — feat(security): SAST/SCA/DAST 표시 키 매핑 추가 (by lw)',
        '[14:10:58] commit c4d9f11 (feature/security) — chore: 타입 정리 및 불필요한 아이콘 임포트 제거 (by lw)',
        '[13:59:30] commit 7de4a62 (feature/ui) — ui: 카드 머릿글 폰트 사이즈 14px로 상향 (by lw)',
        '[13:48:22] commit e2b1f90 (feature/ui) — ui: 퍼센트/라스트업데이트 텍스트 가독성 개선 (by lw)',
        '[13:36:41] commit 5a1f7c8 (feature/deploy) — feat(deploy): 배포 메트릭 상단 표시 이동 (by lw)',
        '[13:25:10] commit 0fae3b5 (feature/mock) — mock: mockAIDevOpsData 보강 — 로그/알림 샘플 추가 (by lw)',
        '[13:12:55] commit 3c7d9e4 (feature/sca) — feat(sca): 라이선스/취약 의존성/Outdated 패키지 기본 메트릭 (by lw)',
        '[13:02:11] commit 21b8c76 (feature/dast) — feat(dast): 인증 커버리지/엔드포인트 스캔 시간 계산 추가 (by lw)',
        '[12:50:33] commit 4f9a1b2 (feature/build) — fix(build): 빌드 성공률 계산 로직 보정 및 p95 표시 (by lw)',
        '[12:42:07] commit 8a6e0f1 (main) — chore: 린트 설정 정리 및 경고 해소 (by lw)',
      ],
    },
  },
  {
    stage: 'security',
    name: '취약점 분석',
    status: 'healthy',
    progress: 84,
    metrics: {
      throughput: 88,
      quality: 95,
      efficiency: 82,
      reliability: 96,
    },
    activeProjects: 4,
    totalTasks: 18,
    completedTasks: 15,
    blockedTasks: 0,
    averageLeadTime: '25분',
    lastUpdate: '3분 전',
    aiPredictions: {
      nextBottleneck: '정적 분석 스캔',
      efficiencyTrend: 'improving',
      qualityRisk: 8,
    },
    execution: {
      lastExecutionTime: '2024-08-17 14:38:00',
      elapsedTime: '25분 15초',
      isExecuting: false,
      canExecute: true,
      executionLogs: [
        '[14:38:00] 취약점 분석 단계 시작',
        '[14:38:01] SAST 스캔 초기화 중...',
        '[14:38:05] SonarQube 연결 확인됨',
        '[14:38:10] 정적 코드 분석 시작',
        '[14:45:22] 의존성 취약점 스캔 완료',
        '[14:52:30] OWASP 보안 규칙 검사',
        '[14:58:45] 보안 위험도 평가: LOW',
        '[15:02:10] 발견된 취약점: 0개 Critical, 1개 Medium',
        '[15:03:15] 취약점 분석 완료',
        '[15:03:15] 다음 단계: 빌드',
      ],
    },
  },
  {
    stage: 'build',
    name: '빌드',
    status: 'attention',
    progress: 65,
    metrics: {
      throughput: 72,
      quality: 88,
      efficiency: 65,
      reliability: 90,
    },
    activeProjects: 3,
    totalTasks: 8,
    completedTasks: 5,
    blockedTasks: 0,
    averageLeadTime: '12분',
    lastUpdate: '2분 전',
    aiPredictions: {
      nextBottleneck: '의존성 해결',
      efficiencyTrend: 'stable',
      qualityRisk: 25,
    },
    execution: {
      lastExecutionTime: '2024-08-17 15:05:30',
      elapsedTime: '12분 45초',
      isExecuting: true,
      canExecute: false,
      executionLogs: [
        '[15:05:30] 빌드 단계 시작',
        '[15:05:31] package.json 의존성 확인 중...',
        '[15:05:45] npm install 실행 중...',
        '[15:08:22] 일부 패키지 버전 충돌 감지',
        '[15:08:25] 의존성 해결 시도 중...',
        '[15:12:10] TypeScript 컴파일 시작',
        '[15:15:22] 빌드 진행 중... (65% 완료)',
        '[15:17:45] 최적화 단계 진행 중...',
        '[15:18:15] [현재 진행 중] 번들링 및 압축...',
      ],
    },
  },
  {
    stage: 'test',
    name: '테스트',
    status: 'critical',
    progress: 45,
    metrics: {
      throughput: 45,
      quality: 78,
      efficiency: 42,
      reliability: 85,
    },
    activeProjects: 2,
    totalTasks: 12,
    completedTasks: 5,
    blockedTasks: 3,
    averageLeadTime: '8.5시간',
    lastUpdate: '1분 전',
    aiPredictions: {
      nextBottleneck: 'E2E 테스트 환경',
      efficiencyTrend: 'declining',
      qualityRisk: 60,
    },
    execution: {
      lastExecutionTime: '2024-08-17 13:45:20',
      elapsedTime: '8시간 30분',
      isExecuting: false,
      canExecute: true,
      executionLogs: [
        '[13:45:20] QA 검증 단계 시작',
        '[13:45:30] 테스트 스위트 준비 및 병렬 실행 시작',
        '[13:55:10] 통과율 집계: 78% (78/100 통과)',
        '[13:55:15] 실패율 산출: 22% (22/100 실패)',
        '[14:10:30] p95 테스트 시간 계산: 540s',
        '[14:12:45] 재시도 전략 적용: flaky 테스트 재시도 1회',
        '[14:25:00] 재시도율 집계: 12%',
        '[14:30:15] 블로킹 테스트 확인: 3건 영향',
        '[14:40:00] QA 검증 결과 요약: 통과 78, 실패 22, 재시도율 12%',
        '[14:40:10] QA 검증 단계 종료 — 후속 조치 필요 항목 3건',
      ],
    },
  },
  {
    stage: 'deploy',
    name: '배포',
    status: 'healthy',
    progress: 92,
    metrics: {
      throughput: 95,
      quality: 98,
      efficiency: 92,
      reliability: 99,
    },
    activeProjects: 3,
    totalTasks: 6,
    completedTasks: 5,
    blockedTasks: 0,
    averageLeadTime: '15분',
    lastUpdate: '3분 전',
    aiPredictions: {
      nextBottleneck: '없음',
      efficiencyTrend: 'stable',
      qualityRisk: 5,
    },
    execution: {
      lastExecutionTime: '2024-08-17 09:15:00',
      elapsedTime: '15분 30초',
      isExecuting: false,
      canExecute: true,
      executionLogs: [
        '[09:15:00] 배포 단계 시작',
        '[09:15:05] Docker 이미지 빌드 시작',
        '[09:18:22] 이미지 빌드 완료: k8scontrol:v2.1.0',
        '[09:18:30] Harbor 레지스트리에 이미지 푸시',
        '[09:22:15] Kubernetes 배포 매니페스트 검증',
        '[09:23:00] Staging 환경 배포 시작',
        '[09:25:45] 헬스체크 통과',
        '[09:28:20] Production 환경 배포 시작',
        '[09:30:00] 롤링 업데이트 완료',
        '[09:30:30] 배포 완료 - 모든 서비스 정상',
      ],
    },
  },
  {
    stage: 'operate',
    name: '운영',
    status: 'healthy',
    progress: 88,
    metrics: {
      throughput: 90,
      quality: 95,
      efficiency: 88,
      reliability: 97,
    },
    activeProjects: 5,
    totalTasks: 15,
    completedTasks: 13,
    blockedTasks: 0,
    averageLeadTime: '2시간',
    lastUpdate: '1분 전',
    aiPredictions: {
      nextBottleneck: '모니터링 알림 처리',
      efficiencyTrend: 'improving',
      qualityRisk: 10,
    },
    execution: {
      lastExecutionTime: '2024-08-17 10:00:00',
      elapsedTime: '2시간 18분',
      isExecuting: false,
      canExecute: true,
      executionLogs: [
        '[10:00:00] 운영 모니터링 시작',
        '[10:00:05] 시스템 헬스체크 실행',
        '[10:05:15] CPU 사용률: 68%, 메모리: 72%',
        '[10:15:30] 로그 집계 및 분석 완료',
        '[10:30:45] 성능 메트릭 수집 중...',
        '[11:00:00] 알림 규칙 업데이트 완료',
        '[11:30:15] 백업 작업 실행됨',
        '[12:00:30] 모니터링 대시보드 업데이트',
        '[12:15:45] 시스템 최적화 완료',
        '[12:18:00] 운영 모니터링 정상 - 지속 실행 중',
      ],
    },
  },
];

// AI 인사이트 목업
export const mockAIInsights: AIInsight[] = [
  {
    id: 'insight-001',
    type: 'alert',
    severity: 'critical',
    title: '테스트 환경 병목 현상 감지',
    description:
      'E2E 테스트 실행 시간이 지난 주 대비 250% 증가했습니다. 테스트 인프라 확장이 필요합니다.',
    category: 'test',
    aiScore: 95,
    estimatedImpact: '일일 배포 횟수 40% 감소 예상',
    suggestedActions: [
      {
        id: 'action-001',
        title: '테스트 환경 스케일링',
        description: 'Kubernetes 테스트 클러스터 노드를 2개에서 4개로 확장',
        type: 'automated',
        estimatedTime: '5분',
        riskLevel: 'low',
        automationAvailable: true,
      },
      {
        id: 'action-002',
        title: '테스트 병렬화 최적화',
        description: '테스트 스위트를 병렬로 실행하도록 파이프라인 수정',
        type: 'manual',
        estimatedTime: '2시간',
        riskLevel: 'medium',
        automationAvailable: false,
        prerequisites: ['테스트 데이터베이스 분리'],
      },
    ],
    createdAt: '10분 전',
    evidenceData: {
      metrics: {
        avgTestTime: 485, // seconds
        testSuccessRate: 78,
        resourceUtilization: 95,
      },
      trends: ['테스트 시간 증가', '성공률 하락'],
      references: ['pipeline-logs', 'test-metrics'],
    },
  },
  {
    id: 'insight-002',
    type: 'optimization',
    severity: 'medium',
    title: '비용 최적화 기회 발견',
    description:
      '개발 환경 리소스가 업무 시간 외에도 과도하게 할당되어 있습니다.',
    category: 'infrastructure',
    aiScore: 88,
    estimatedImpact: '월 $1,200 절약 가능',
    suggestedActions: [
      {
        id: 'action-003',
        title: '스케줄링 기반 리소스 관리',
        description: '개발 환경을 업무 시간에만 자동으로 실행하도록 설정',
        type: 'guided',
        estimatedTime: '30분',
        riskLevel: 'low',
        automationAvailable: true,
      },
    ],
    createdAt: '1시간 전',
    evidenceData: {
      metrics: {
        unutilizedHours: 16, // per day
        potentialSaving: 1200, // USD per month
      },
      trends: ['리소스 사용률 낮음'],
      references: ['cost-analysis', 'usage-metrics'],
    },
  },
  {
    id: 'insight-003',
    type: 'prediction',
    severity: 'high',
    title: '보안 취약점 증가 예측',
    description:
      '현재 트렌드로 보면 다음 주까지 3개의 새로운 high-severity 취약점이 발견될 가능성이 높습니다.',
    category: 'security',
    aiScore: 82,
    estimatedImpact: '보안 위험도 30% 증가 예상',
    suggestedActions: [
      {
        id: 'action-004',
        title: '선제적 보안 스캔',
        description: '모든 프로젝트에 대해 강화된 보안 스캔 실행',
        type: 'automated',
        estimatedTime: '45분',
        riskLevel: 'low',
        automationAvailable: true,
      },
    ],
    createdAt: '30분 전',
  },
  {
    id: 'insight-004',
    type: 'recommendation',
    severity: 'medium',
    title: 'CI/CD 파이프라인 최적화',
    description:
      '빌드 캐싱을 활용하면 평균 빌드 시간을 40% 단축할 수 있습니다.',
    category: 'build',
    aiScore: 90,
    estimatedImpact: '개발 속도 35% 향상',
    suggestedActions: [
      {
        id: 'action-005',
        title: 'Docker 레이어 캐싱 활성화',
        description: 'CI/CD 파이프라인에 Docker 빌드 캐싱 추가',
        type: 'manual',
        estimatedTime: '1시간',
        riskLevel: 'low',
        automationAvailable: false,
      },
    ],
    createdAt: '2시간 전',
    isImplemented: false,
  },
];

// 프로젝트 AI 상태 목업
export const mockProjectAIStatuses: Record<string, ProjectAIStatus> = {
  'k8s-control': {
    projectId: 'k8s-control',
    healthScore: 95,
    predictedSuccess: 98,
    riskFactors: ['테스트 커버리지 미달'],
    optimizationOpportunities: [
      '자동화된 성능 테스트 추가',
      '모니터링 알림 최적화',
    ],
    nextMilestone: {
      name: 'v2.1.0 릴리스',
      date: '2024-01-25',
      confidence: 92,
    },
    aiRecommendations: [
      {
        priority: 'medium',
        action: '자동화된 백업 검증 구현',
        impact: '데이터 무결성 99.9% 보장',
        effort: '2일',
      },
    ],
  },
  'microservice-api': {
    projectId: 'microservice-api',
    healthScore: 88,
    predictedSuccess: 85,
    riskFactors: ['API 응답 시간 증가', '메모리 사용량 상승'],
    optimizationOpportunities: ['캐싱 전략 개선', 'DB 쿼리 최적화'],
    nextMilestone: {
      name: 'Performance 개선',
      date: '2024-01-20',
      confidence: 78,
    },
    aiRecommendations: [
      {
        priority: 'high',
        action: 'Redis 캐싱 레이어 추가',
        impact: '응답 시간 50% 단축',
        effort: '3일',
      },
    ],
  },
  'ml-analytics': {
    projectId: 'ml-analytics',
    healthScore: 92,
    predictedSuccess: 94,
    riskFactors: ['데이터 품질 변동'],
    optimizationOpportunities: [
      '모델 자동 재훈련',
      '데이터 파이프라인 모니터링',
    ],
    nextMilestone: {
      name: '모델 정확도 95% 달성',
      date: '2024-01-30',
      confidence: 89,
    },
    aiRecommendations: [
      {
        priority: 'medium',
        action: '데이터 드리프트 감지 시스템 구축',
        impact: '모델 성능 안정성 증대',
        effort: '1주',
      },
    ],
  },
};

// 인프라 클러스터 목업
export const mockInfrastructureClusters: InfrastructureCluster[] = [
  {
    id: 'prod-cluster-01',
    name: 'Production Cluster',
    environment: 'production',
    status: 'healthy',
    metrics: {
      cpuUsage: 68,
      memoryUsage: 72,
      diskUsage: 45,
      networkLoad: 34,
      activeNodes: 8,
      totalNodes: 8,
      podsRunning: 127,
      podsTotal: 130,
    },
    aiOptimizations: {
      costSaving: 2400, // USD per month
      performanceGain: 15,
      suggestions: [
        'Spot 인스턴스로 개발 환경 이전',
        'HPA 정책 최적화',
        '미사용 PV 정리',
      ],
    },
    healthChecks: [
      { name: '노드 상태', status: 'pass', lastCheck: '1분 전' },
      { name: 'etcd 백업', status: 'pass', lastCheck: '30분 전' },
      {
        name: '인증서 유효성',
        status: 'warning',
        lastCheck: '1시간 전',
        details: '3개월 후 만료',
      },
      { name: '네트워크 정책', status: 'pass', lastCheck: '5분 전' },
    ],
  },
  {
    id: 'staging-cluster-01',
    name: 'Staging Cluster',
    environment: 'staging',
    status: 'warning',
    metrics: {
      cpuUsage: 85,
      memoryUsage: 90,
      diskUsage: 67,
      networkLoad: 45,
      activeNodes: 3,
      totalNodes: 4,
      podsRunning: 45,
      podsTotal: 50,
    },
    aiOptimizations: {
      costSaving: 800,
      performanceGain: 25,
      suggestions: [
        '노드 스케일링 필요',
        '메모리 집약적 Pod 분산',
        '스토리지 정리',
      ],
    },
    healthChecks: [
      {
        name: '노드 상태',
        status: 'warning',
        lastCheck: '1분 전',
        details: '1개 노드 리소스 부족',
      },
      { name: 'etcd 백업', status: 'pass', lastCheck: '30분 전' },
      { name: '인증서 유효성', status: 'pass', lastCheck: '1시간 전' },
      { name: '네트워크 정책', status: 'pass', lastCheck: '5분 전' },
    ],
  },
  {
    id: 'dev-cluster-01',
    name: 'Development Cluster',
    environment: 'development',
    status: 'healthy',
    metrics: {
      cpuUsage: 25,
      memoryUsage: 35,
      diskUsage: 28,
      networkLoad: 15,
      activeNodes: 3,
      totalNodes: 3,
      podsRunning: 28,
      podsTotal: 30,
    },
    aiOptimizations: {
      costSaving: 1200,
      performanceGain: 10,
      suggestions: [
        '업무 시간 외 자동 스케일다운',
        '개발자별 네임스페이스 분리',
        '테스트 데이터 정리 자동화',
      ],
    },
    healthChecks: [
      { name: '노드 상태', status: 'pass', lastCheck: '1분 전' },
      { name: 'etcd 백업', status: 'pass', lastCheck: '30분 전' },
      { name: '인증서 유효성', status: 'pass', lastCheck: '1시간 전' },
      { name: '네트워크 정책', status: 'pass', lastCheck: '5분 전' },
    ],
  },
];

// 비용 최적화 목업
export const mockCostOptimization: CostOptimization = {
  totalMonthlyCost: 8750,
  costTrend: 'increasing',
  savings: {
    potential: 2100,
    implemented: 650,
  },
  breakdown: {
    compute: 5250, // 60%
    storage: 1750, // 20%
    network: 875, // 10%
    services: 875, // 10%
  },
  recommendations: [
    {
      title: '개발 환경 스케줄링',
      description: '업무 시간 외 개발 환경 자동 중지로 컴퓨팅 비용 절감',
      potentialSaving: 1200,
      difficulty: 'easy',
      riskLevel: 'low',
    },
    {
      title: 'Spot 인스턴스 활용',
      description: '비프로덕션 워크로드를 Spot 인스턴스로 이전',
      potentialSaving: 650,
      difficulty: 'medium',
      riskLevel: 'medium',
    },
    {
      title: '스토리지 최적화',
      description: '미사용 볼륨 정리 및 스토리지 클래스 최적화',
      potentialSaving: 250,
      difficulty: 'easy',
      riskLevel: 'low',
    },
  ],
};

// AI 어시스턴트 대화 목업
export const mockAIConversations: AIConversation[] = [
  {
    id: 'conv-001',
    timestamp: '5분 전',
    userMessage: '테스트 실패율이 왜 이렇게 높아졌나요?',
    aiResponse:
      '지난 3일간 테스트 환경의 리소스 부족으로 인해 테스트 실행 시간이 증가했고, 이로 인해 타임아웃 오류가 빈발하고 있습니다. 테스트 환경 스케일링을 권장합니다.',
    context: 'workflow-test',
    actions: [
      {
        id: 'action-scale-test',
        title: '테스트 환경 확장',
        description: '테스트 클러스터 노드를 즉시 확장',
        type: 'automated',
        estimatedTime: '5분',
        riskLevel: 'low',
        automationAvailable: true,
      },
    ],
    followUpQuestions: [
      '테스트 자동화 전략을 개선하려면?',
      '테스트 병렬화는 어떻게 구현하나요?',
    ],
  },
  {
    id: 'conv-002',
    timestamp: '15분 전',
    userMessage: '이번 주 배포 성공률은 어때요?',
    aiResponse:
      '이번 주 배포 성공률은 94.2%로 지난 주 대비 2.1% 향상되었습니다. 주요 개선 요인은 자동화된 테스트 커버리지 증가와 단계별 배포 검증 강화입니다.',
    context: 'dashboard-overview',
    followUpQuestions: [
      '배포 롤백이 필요한 경우는?',
      '배포 성공률을 더 높이려면?',
    ],
  },
  {
    id: 'conv-003',
    timestamp: '30분 전',
    userMessage: '보안 스캔에서 발견된 취약점을 어떻게 처리해야 하나요?',
    aiResponse:
      '현재 2개의 Critical 취약점이 발견되었습니다. 둘 다 의존성 관련 문제로, 패키지 업데이트로 해결 가능합니다. 자동 패치 적용을 실행하시겠습니까?',
    context: 'security-scan',
    actions: [
      {
        id: 'action-auto-patch',
        title: '자동 패치 적용',
        description: '취약점 패치를 자동으로 적용하고 테스트 실행',
        type: 'automated',
        estimatedTime: '15분',
        riskLevel: 'medium',
        automationAvailable: true,
        prerequisites: ['백업 생성', '테스트 환경 검증'],
      },
    ],
  },
];

// 오늘의 우선순위 작업 목업
export interface PriorityTask {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: WorkflowStage | 'infrastructure' | 'security';
  assignee: string;
  estimatedTime: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  aiInsightId?: string; // 연관된 AI 인사이트
  blockers?: string[];
  dependencies?: string[];
}

export const mockPriorityTasks: PriorityTask[] = [
  {
    id: 'task-001',
    title: '테스트 환경 긴급 복구',
    description: 'E2E 테스트 실행 시간 250% 증가 문제 해결',
    priority: 'urgent',
    category: 'test',
    assignee: 'DevOps Team',
    estimatedTime: '2시간',
    deadline: '오늘 17:00',
    status: 'in_progress',
    aiInsightId: 'insight-001',
    blockers: ['리소스 승인 대기'],
  },
  {
    id: 'task-002',
    title: 'Critical 보안 취약점 패치',
    description: '2개의 Critical 보안 취약점 즉시 패치 필요',
    priority: 'urgent',
    category: 'security',
    assignee: 'Security Team',
    estimatedTime: '30분',
    deadline: '오늘 15:00',
    status: 'pending',
  },
  {
    id: 'task-003',
    title: 'API 성능 최적화',
    description: 'Microservice API 응답시간 개선 작업',
    priority: 'high',
    category: 'operate',
    assignee: 'Backend Team',
    estimatedTime: '1일',
    deadline: '내일',
    status: 'pending',
    dependencies: ['성능 테스트 환경 준비'],
  },
  {
    id: 'task-004',
    title: 'ML 모델 정확도 검증',
    description: '새 데이터셋으로 모델 성능 재검증',
    priority: 'high',
    category: 'test',
    assignee: 'Data Team',
    estimatedTime: '4시간',
    status: 'pending',
  },
  {
    id: 'task-005',
    title: 'Docker 빌드 캐싱 구현',
    description: 'CI/CD 파이프라인에 빌드 캐싱 추가',
    priority: 'medium',
    category: 'build',
    assignee: 'Platform Team',
    estimatedTime: '1시간',
    status: 'completed',
  },
];

// 파이프라인 알람 타입과 목업 데이터
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus =
  | 'new'
  | 'acknowledged'
  | 'investigating'
  | 'mitigated'
  | 'resolved'
  | 'dismissed';

export interface PipelineAlert {
  id: string;
  projectId: string;
  stage: WorkflowStage;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  summary: string;
  source: 'ci' | 'scanner' | 'monitor' | 'policy';
  ruleId?: string;
  errorCode?: string;
  environment?: 'production' | 'staging' | 'development';
  affected: {
    service?: string;
    branch?: string;
    commit?: string;
    version?: string;
  };
  createdAt: string;
  updatedAt: string;
  dedupKey: string;
  occurrences: number;
  metrics?: Record<string, number>;
  links?: { label: string; url: string }[];
  suggestedActions?: {
    id: string;
    label: string;
    kind: 'retry' | 'rollback' | 'rerun-tests' | 'open-issue' | 'open-logs';
  }[];
  assignee?: string;
  acknowledgedBy?: string;
  notes?: string;
}

export const mockPipelineAlerts: PipelineAlert[] = [
  {
    id: 'alert-001',
    projectId: 'k8s-control',
    stage: 'deploy',
    severity: 'critical',
    status: 'new',
    title: '배포 실패 — production web v2.1.0',
    summary: '헬스체크 불통 (readiness timeout). 롤백 권장',
    source: 'ci',
    errorCode: 'READINESS_TIMEOUT',
    environment: 'production',
    affected: { service: 'web', branch: 'main', version: 'v2.1.0' },
    createdAt: '5분 전',
    updatedAt: '2분 전',
    dedupKey: 'k8s-control|deploy|READINESS_TIMEOUT|production',
    occurrences: 3,
    links: [
      { label: '파이프라인', url: '#' },
      { label: '배포 로그', url: '#' },
    ],
    suggestedActions: [
      { id: 'retry-deploy', label: '배포 재시도', kind: 'retry' },
      { id: 'rollback', label: '롤백', kind: 'rollback' },
      { id: 'open-logs', label: '로그 보기', kind: 'open-logs' },
    ],
  },
  {
    id: 'alert-002',
    projectId: 'microservice-api',
    stage: 'test',
    severity: 'high',
    status: 'new',
    title: '테스트 플래키 급증 — 실패율 32% (E2E)',
    summary: '타임아웃 증가, 자원 포화 징후. 리트라이/분산 권장',
    source: 'ci',
    errorCode: 'E2E_TIMEOUT',
    environment: 'staging',
    affected: { service: 'gateway', branch: 'develop' },
    createdAt: '12분 전',
    updatedAt: '10분 전',
    dedupKey: 'microservice-api|test|E2E_TIMEOUT|staging',
    occurrences: 5,
    links: [{ label: '테스트 로그', url: '#' }],
    suggestedActions: [
      { id: 'rerun-tests', label: '테스트 재실행', kind: 'rerun-tests' },
      { id: 'open-logs', label: '로그 보기', kind: 'open-logs' },
    ],
  },
  {
    id: 'alert-003',
    projectId: 'ml-analytics',
    stage: 'security',
    severity: 'critical',
    status: 'acknowledged',
    title: 'SAST Critical 2건 발견',
    summary: '의존성 취약점. 패치 업데이트 필요',
    source: 'scanner',
    ruleId: 'SAST-CRIT-DEP-001',
    affected: { service: 'api', branch: 'feature/model-optimization' },
    createdAt: '1시간 전',
    updatedAt: '55분 전',
    dedupKey: 'ml-analytics|security|SAST-CRIT-DEP-001',
    occurrences: 2,
    links: [{ label: '스캔 리포트', url: '#' }],
    suggestedActions: [
      { id: 'open-issue', label: '이슈 생성', kind: 'open-issue' },
    ],
  },
  {
    id: 'alert-004',
    projectId: 'k8s-control',
    stage: 'operate',
    severity: 'high',
    status: 'new',
    title: '오류율 급증 — web',
    summary: '5xx 7.2%, p95 1200ms. 영향 범위 높음',
    source: 'monitor',
    affected: { service: 'web', branch: 'main' },
    createdAt: '8분 전',
    updatedAt: '3분 전',
    dedupKey: 'k8s-control|operate|HTTP_5XX_SURGE',
    occurrences: 4,
    links: [{ label: 'APM 대시보드', url: '#' }],
    suggestedActions: [
      { id: 'open-logs', label: '로그 보기', kind: 'open-logs' },
    ],
  },
];

export const getPipelineAlertsByProject = (
  projectId?: string | null
): PipelineAlert[] => {
  if (!projectId) return mockPipelineAlerts;
  return mockPipelineAlerts.filter(a => a.projectId === projectId);
};

// 시스템 헬스 요약
export interface SystemHealthSummary {
  overall: {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'attention' | 'critical';
    trend: 'improving' | 'stable' | 'declining';
  };
  categories: {
    deployment: { score: number; status: string; issues: number };
    security: { score: number; status: string; issues: number };
    performance: { score: number; status: string; issues: number };
    infrastructure: { score: number; status: string; issues: number };
  };
  activeAlerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentImprovements: string[];
}

export const mockSystemHealthSummary: SystemHealthSummary = {
  overall: {
    score: 87,
    status: 'good',
    trend: 'improving',
  },
  categories: {
    deployment: { score: 94, status: 'excellent', issues: 0 },
    security: { score: 75, status: 'attention', issues: 2 },
    performance: { score: 82, status: 'good', issues: 1 },
    infrastructure: { score: 91, status: 'excellent', issues: 0 },
  },
  activeAlerts: {
    critical: 1,
    high: 2,
    medium: 5,
    low: 8,
  },
  recentImprovements: [
    '배포 성공률 2.1% 향상',
    '평균 빌드 시간 15% 단축',
    '인프라 비용 7% 절감',
  ],
};

// Helper 함수들
export const getWorkflowStatusByStage = (
  stage: WorkflowStage
): WorkflowStatus | undefined => {
  return mockWorkflowStatuses.find(status => status.stage === stage);
};

export const getAIInsightsByCategory = (category: string): AIInsight[] => {
  return mockAIInsights.filter(insight => insight.category === category);
};

export const getCriticalAIInsights = (): AIInsight[] => {
  return mockAIInsights.filter(insight => insight.severity === 'critical');
};

export const getUrgentTasks = (): PriorityTask[] => {
  return mockPriorityTasks.filter(
    task => task.priority === 'urgent' && task.status !== 'completed'
  );
};

export const getTasksByCategory = (category: string): PriorityTask[] => {
  return mockPriorityTasks.filter(task => task.category === category);
};

export const getTotalMonthlyCostSaving = (): number => {
  return mockCostOptimization.savings.potential;
};

export const getInfrastructureByEnvironment = (
  environment: string
): InfrastructureCluster[] => {
  return mockInfrastructureClusters.filter(
    cluster => cluster.environment === environment
  );
};
