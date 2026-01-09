// Enhanced mock data focused on user workflow and operational tasks

// Workflow-centric data structures
export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  category: 'deployment' | 'security' | 'maintenance' | 'monitoring';
  projectName: string;
  estimatedTime: string;
  assignee: string;
  dueDate: string;
  dependencies?: string[];
  actionRequired: boolean;
}

export interface WorkflowAlert {
  id: string;
  type: 'action_required' | 'information' | 'warning' | 'success';
  title: string;
  message: string;
  projectName: string;
  timestamp: string;
  actionButton?: {
    text: string;
    action: string;
  };
  dismissible: boolean;
}

export interface SystemHealth {
  overall: {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    trend: 'improving' | 'stable' | 'declining';
  };
  categories: {
    deployment: {
      score: number;
      issues: number;
      trend: 'up' | 'down' | 'stable';
    };
    security: {
      score: number;
      issues: number;
      trend: 'up' | 'down' | 'stable';
    };
    performance: {
      score: number;
      issues: number;
      trend: 'up' | 'down' | 'stable';
    };
    infrastructure: {
      score: number;
      issues: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  criticalItems: number;
  actionRequired: number;
}

export interface UserWorkflowStats {
  todayStats: {
    deploysCompleted: number;
    issuesResolved: number;
    securityScansRun: number;
    backupsSuccessful: number;
  };
  weeklyGoals: {
    deployments: { completed: number; target: number };
    securityIssues: { resolved: number; target: number };
    systemUptime: { current: number; target: number };
  };
  upcomingTasks: WorkflowTask[];
}

// Mock workflow data
export const mockWorkflowTasks: WorkflowTask[] = [
  {
    id: 'task-001',
    title: 'Critical Security Patch 배포',
    description: 'ML Analytics Dashboard의 SQL Injection 취약점 수정 배포',
    priority: 'urgent',
    status: 'pending',
    category: 'security',
    projectName: 'ML Analytics Dashboard',
    estimatedTime: '30분',
    assignee: 'Security Team',
    dueDate: '오늘 17:00',
    actionRequired: true,
  },
  {
    id: 'task-002',
    title: 'API Gateway 성능 최적화',
    description: 'SLA 위험 상태인 API Gateway 성능 개선',
    priority: 'high',
    status: 'in_progress',
    category: 'maintenance',
    projectName: 'Microservice API Gateway',
    estimatedTime: '2시간',
    assignee: 'Backend Team',
    dueDate: '내일 12:00',
    actionRequired: false,
  },
  {
    id: 'task-003',
    title: 'SSL 인증서 갱신',
    description: 'K8s Control Platform SSL 인증서 만료 대응',
    priority: 'high',
    status: 'pending',
    category: 'maintenance',
    projectName: 'K8s Control Platform',
    estimatedTime: '1시간',
    assignee: 'DevOps Team',
    dueDate: '3일 후',
    actionRequired: true,
  },
  {
    id: 'task-004',
    title: 'Mobile App 빌드 오류 수정',
    description: 'TypeScript 컴파일 오류 해결',
    priority: 'medium',
    status: 'blocked',
    category: 'deployment',
    projectName: 'Mobile Application',
    estimatedTime: '4시간',
    assignee: 'Mobile Team',
    dueDate: '내일 18:00',
    dependencies: ['dependency-update'],
    actionRequired: true,
  },
  {
    id: 'task-005',
    title: '주간 백업 검증',
    description: '모든 프로젝트 백업 상태 확인 및 무결성 검증',
    priority: 'medium',
    status: 'pending',
    category: 'maintenance',
    projectName: '전체 프로젝트',
    estimatedTime: '1.5시간',
    assignee: 'Operations Team',
    dueDate: '금요일',
    actionRequired: false,
  },
];

export const mockWorkflowAlerts: WorkflowAlert[] = [
  {
    id: 'alert-wf-001',
    type: 'action_required',
    title: '즉시 조치 필요',
    message:
      'ML Analytics Dashboard에서 Critical 보안 취약점이 발견되었습니다.',
    projectName: 'ML Analytics Dashboard',
    timestamp: '방금 전',
    actionButton: {
      text: '보안 패치 배포',
      action: 'deploy_security_patch',
    },
    dismissible: false,
  },
  {
    id: 'alert-wf-002',
    type: 'warning',
    title: 'SLA 위험',
    message: 'API Gateway의 가용성이 목표치 아래로 떨어졌습니다.',
    projectName: 'Microservice API Gateway',
    timestamp: '15분 전',
    actionButton: {
      text: '성능 분석',
      action: 'analyze_performance',
    },
    dismissible: true,
  },
  {
    id: 'alert-wf-003',
    type: 'information',
    title: '배포 완료',
    message: 'K8s Control Platform 배포가 성공적으로 완료되었습니다.',
    projectName: 'K8s Control Platform',
    timestamp: '2시간 전',
    dismissible: true,
  },
  {
    id: 'alert-wf-004',
    type: 'warning',
    title: '백업 실패',
    message: 'API Gateway 설정 백업이 실패했습니다.',
    projectName: 'Microservice API Gateway',
    timestamp: '5시간 전',
    actionButton: {
      text: '백업 재시도',
      action: 'retry_backup',
    },
    dismissible: true,
  },
];

export const mockSystemHealth: SystemHealth = {
  overall: {
    score: 87,
    status: 'good',
    trend: 'stable',
  },
  categories: {
    deployment: { score: 92, issues: 1, trend: 'up' },
    security: { score: 78, issues: 3, trend: 'down' },
    performance: { score: 85, issues: 2, trend: 'stable' },
    infrastructure: { score: 94, issues: 1, trend: 'up' },
  },
  criticalItems: 1,
  actionRequired: 3,
};

export const mockUserWorkflowStats: UserWorkflowStats = {
  todayStats: {
    deploysCompleted: 3,
    issuesResolved: 2,
    securityScansRun: 5,
    backupsSuccessful: 4,
  },
  weeklyGoals: {
    deployments: { completed: 12, target: 15 },
    securityIssues: { resolved: 8, target: 12 },
    systemUptime: { current: 99.7, target: 99.9 },
  },
  upcomingTasks: mockWorkflowTasks
    .filter(task => task.status !== 'completed')
    .slice(0, 5),
};

// Enhanced priority matrix for workflow optimization
export interface PriorityMatrix {
  urgent_important: WorkflowTask[];
  urgent_not_important: WorkflowTask[];
  important_not_urgent: WorkflowTask[];
  not_urgent_not_important: WorkflowTask[];
}

export const generatePriorityMatrix = (): PriorityMatrix => {
  const urgent = ['urgent', 'high'];
  const important = (task: WorkflowTask) =>
    task.category === 'security' ||
    task.actionRequired ||
    task.status === 'blocked';

  return {
    urgent_important: mockWorkflowTasks.filter(
      task => urgent.includes(task.priority) && important(task)
    ),
    urgent_not_important: mockWorkflowTasks.filter(
      task => urgent.includes(task.priority) && !important(task)
    ),
    important_not_urgent: mockWorkflowTasks.filter(
      task => !urgent.includes(task.priority) && important(task)
    ),
    not_urgent_not_important: mockWorkflowTasks.filter(
      task => !urgent.includes(task.priority) && !important(task)
    ),
  };
};

// Daily workflow summary
export interface DailyWorkflowSummary {
  date: string;
  focus_areas: string[];
  key_achievements: string[];
  pending_actions: WorkflowTask[];
  health_trends: {
    [key: string]: 'improving' | 'stable' | 'declining';
  };
  recommendations: string[];
}

export const getTodayWorkflowSummary = (): DailyWorkflowSummary => ({
  date: new Date().toLocaleDateString('ko-KR'),
  focus_areas: ['보안 취약점 해결', 'API 성능 최적화', '배포 안정성 향상'],
  key_achievements: [
    'K8s Control Platform 배포 성공',
    '4개 프로젝트 백업 완료',
    '2개 보안 이슈 해결',
  ],
  pending_actions: mockWorkflowTasks.filter(
    task => task.actionRequired && task.status !== 'completed'
  ),
  health_trends: {
    deployment: 'improving',
    security: 'declining',
    performance: 'stable',
    infrastructure: 'improving',
  },
  recommendations: [
    'ML Analytics Dashboard 보안 패치를 우선 배포하세요',
    'API Gateway 성능 모니터링을 강화하세요',
    'Mobile App 빌드 의존성 문제를 해결하세요',
  ],
});

// Helper functions for workflow data
export const getActionRequiredTasks = (): WorkflowTask[] => {
  return mockWorkflowTasks.filter(
    task => task.actionRequired && task.status !== 'completed'
  );
};

export const getTasksByPriority = (
  priority: WorkflowTask['priority']
): WorkflowTask[] => {
  return mockWorkflowTasks.filter(task => task.priority === priority);
};

export const getTasksByCategory = (
  category: WorkflowTask['category']
): WorkflowTask[] => {
  return mockWorkflowTasks.filter(task => task.category === category);
};

export const getCriticalAlerts = (): WorkflowAlert[] => {
  return mockWorkflowAlerts.filter(
    alert => !alert.dismissible || alert.type === 'action_required'
  );
};
