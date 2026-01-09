// Dashboard static data constants
export const securityMetrics = {
  vulnerabilities: {
    critical: 2,
    high: 5,
    medium: 12,
    low: 23,
    total: 42,
    trend: -5, // improvement
  },
  compliance: {
    score: 87,
    policies: { passed: 45, failed: 7, total: 52 },
    lastScan: '2시간 전',
  },
  incidents: {
    open: 3,
    resolved: 15,
    avgResolutionTime: '2h 15m',
  },
};

export const performanceMetrics = {
  availability: 99.97,
  responseTime: 145, // ms
  throughput: 2847, // req/min
  errorRate: 0.03, // %
  alerts: {
    critical: 0,
    warning: 2,
    info: 5,
  },
};

// Workflow-Based Activities
export const workflowActivities = [
  {
    id: 1,
    workflow: 'Development',
    stage: 'Code Review',
    message: 'PR #234 merged to main branch',
    time: '5분 전',
    status: 'success' as const,
    assignee: 'DevTeam',
  },
  {
    id: 2,
    workflow: 'Security',
    stage: 'Vulnerability Scan',
    message: '2개 Critical 취약점 발견 - 대응 필요',
    time: '15분 전',
    status: 'critical' as const,
    assignee: 'SecurityTeam',
  },
  {
    id: 3,
    workflow: 'Operations',
    stage: 'Backup',
    message: 'Database 백업 성공적으로 완료',
    time: '1시간 전',
    status: 'success' as const,
    assignee: 'OpsTeam',
  },
  {
    id: 4,
    workflow: 'Development',
    stage: 'Deployment',
    message: 'Production 환경 배포 완료',
    time: '2시간 전',
    status: 'success' as const,
    assignee: 'DevOpsTeam',
  },
];

export type WorkflowActivity = (typeof workflowActivities)[0];
