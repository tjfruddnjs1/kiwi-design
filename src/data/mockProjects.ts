// Mock data for project-based dashboard
export interface HopInfo {
  host: string;
  username: string;
  port: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'maintenance' | 'archived';
  environment: 'development' | 'staging' | 'production';
  team: string;
  createdAt: string;
  lastDeployment: string;
  techStack: string[];
  healthScore: number;
  git: {
    repository: string;
    branch: string;
    lastCommit: string;
    commitHash: string;
    author: string;
  };
  serviceUrl: {
    production?: string;
    staging?: string;
    development?: string;
  };
  dataSource?: 'db' | 'mock'; //  [추가] 데이터 출처 필드
  dockerRegistry?: string; //  이 필드를 추가해주세요.
  infrastructure?: HopInfo[];
}

export interface PipelineStage {
  key: string;
  name: string;
  status: 'success' | 'running' | 'error' | 'pending' | 'failed' | 'inactive';
  duration: string | number;
  timestamp: string;
  logs?: string;
}

export interface ProjectPipeline {
  projectId: string;
  currentStage: string;
  stages: PipelineStage[];
  metrics: {
    successRate: number;
    avgDeployTime: string;
    deploysToday: number;
    totalDeploys: number;
  };
  lastRun: string;
}

export interface ProjectActivity {
  id: number;
  projectId: string;
  workflow: string;
  stage: string;
  message: string;
  time: string;
  status: 'success' | 'error' | 'warning' | 'critical';
  assignee: string;
}

// Infrastructure Metrics Interface
export interface ProjectInfrastructure {
  projectId: string;
  metrics: {
    cpu: {
      usage: number; // percentage
      cores: number;
      load: number;
    };
    memory: {
      usage: number; // percentage
      total: string; // e.g., "16GB"
      used: string; // e.g., "12.8GB"
    };
    gpu: {
      usage: number; // percentage
      model: string;
      memory: string;
    } | null;
  };
  backup: {
    lastBackup: string; // timestamp like "2시간 전"
    status: 'success' | 'running' | 'failed' | 'scheduled';
    nextScheduled: string;
    retentionDays: number;
    size: string;
  };
  storage: {
    used: number; // percentage
    total: string;
    available: string;
  };
  network: {
    inbound: string; // e.g., "125 MB/s"
    outbound: string; // e.g., "45 MB/s"
  };
}

// Security Vulnerability Interfaces
export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'code' | 'dependency' | 'configuration' | 'infrastructure';
  cwe?: string;
  status: 'open' | 'inProgress' | 'resolved' | 'ignored';
  foundAt: string;
  resolvedAt?: string;
  file?: string;
  line?: number;
  recommendation: string;
}

export interface SASTReport {
  projectId: string;
  scanDate: string;
  status: 'completed' | 'running' | 'failed';
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  vulnerabilities: SecurityVulnerability[];
  coveragePercentage: number;
  scanDuration: string;
}

export interface DASTReport {
  projectId: string;
  scanDate: string;
  status: 'completed' | 'running' | 'failed';
  targetUrl: string;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  vulnerabilities: SecurityVulnerability[];
  pagesTested: number;
  scanDuration: string;
}

export interface SecurityAlert {
  id: string;
  projectId: string;
  type: 'vulnerability' | 'compliance' | 'policy' | 'incident';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source: 'SAST' | 'DAST' | 'SCA' | 'Manual' | 'CI/CD';
  createdAt: string;
  updatedAt: string;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'inProgress';
  assignee?: string;
  tags: string[];
}

export interface ProjectSecuritySummary {
  projectId: string;
  lastUpdated: string;
  overallRiskScore: number; // 0-100
  securityScore: number; // 0-100
  sastReport?: SASTReport;
  dastReport?: DASTReport;
  activeAlerts: SecurityAlert[];
  resolvedAlertsLast30Days: number;
  complianceStatus: {
    gdpr: boolean;
    owasp: boolean;
    pci: boolean;
    iso27001: boolean;
  };
}

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: 'k8s-control',
    name: 'K8s Control Platform',
    description: 'Kubernetes 관리 플랫폼',
    status: 'active',
    environment: 'production',
    team: 'Platform Team',
    createdAt: '2024-01-15',
    lastDeployment: '2시간 전',
    techStack: ['React', 'TypeScript', 'Go', 'MariaDB', 'Docker'],
    healthScore: 95,
    git: {
      repository: 'https://github.com/platform-team/k8s-control.git',
      branch: 'main',
      lastCommit: 'feat: Add dashboard performance monitoring',
      commitHash: 'a1b2c3d4',
      author: 'platform-dev',
    },
    serviceUrl: {
      production: 'https://k8s-control.mipllab.com',
      staging: 'https://k8s-control-staging.mipllab.com',
      development: 'http://localhost:3000',
    },
    dataSource: 'mock', //  [추가]
  },
  {
    id: 'microservice-api',
    name: 'Microservice API Gateway',
    description: '마이크로서비스 API 게이트웨이',
    status: 'active',
    environment: 'production',
    team: 'Backend Team',
    createdAt: '2024-02-20',
    lastDeployment: '1시간 전',
    techStack: ['Node.js', 'Express', 'Redis', 'MongoDB'],
    healthScore: 88,
    git: {
      repository: 'https://github.com/backend-team/microservice-api.git',
      branch: 'develop',
      lastCommit: 'fix: API rate limiting implementation',
      commitHash: 'e5f6g7h8',
      author: 'backend-lead',
    },
    serviceUrl: {
      production: 'https://api.mipllab.com',
      staging: 'https://api-staging.mipllab.com',
      development: 'http://localhost:8080',
    },
    dataSource: 'mock', //  [추가]
  },
];

// Mock Pipeline Data for each project (Updated to include CI and Operations stages)
export const mockPipelines: Record<string, ProjectPipeline> = {
  'k8s-control': {
    projectId: 'k8s-control',
    currentStage: 'operations',
    lastRun: '2시간 전',
    stages: [
      {
        key: 'ci',
        name: 'CI',
        status: 'success',
        duration: '1m 20s',
        timestamp: '2시간 전',
      },
      {
        key: 'build',
        name: '빌드',
        status: 'success',
        duration: '1m 45s',
        timestamp: '2시간 전',
      },
      {
        key: 'security',
        name: '보안검사',
        status: 'success',
        duration: '2m 10s',
        timestamp: '2시간 전',
      },
      {
        key: 'test',
        name: 'QA 검증',
        status: 'success',
        duration: '3m 20s',
        timestamp: '2시간 전',
      },
      {
        key: 'deploy',
        name: '배포',
        status: 'success',
        duration: '4m 15s',
        timestamp: '2시간 전',
      },
      {
        key: 'operations',
        name: '운영검사',
        status: 'success',
        duration: '2m 30s',
        timestamp: '2시간 전',
      },
    ],
    metrics: {
      successRate: 96.5,
      avgDeployTime: '15m 20s',
      deploysToday: 3,
      totalDeploys: 847,
    },
  },
  'microservice-api': {
    projectId: 'microservice-api',
    currentStage: 'test',
    lastRun: '1시간 전',
    stages: [
      {
        key: 'ci',
        name: 'CI',
        status: 'success',
        duration: '1m 10s',
        timestamp: '1시간 전',
      },
      {
        key: 'build',
        name: '빌드',
        status: 'success',
        duration: '2m 30s',
        timestamp: '1시간 전',
      },
      {
        key: 'security',
        name: '보안검사',
        status: 'pending',
        duration: '예정',
        timestamp: '대기중',
      },
      {
        key: 'test',
        name: 'QA 검증',
        status: 'running',
        duration: '5m 12s',
        timestamp: '진행중',
      },
      {
        key: 'deploy',
        name: '배포',
        status: 'pending',
        duration: '예정',
        timestamp: '대기중',
      },
      {
        key: 'operations',
        name: '운영검사',
        status: 'pending',
        duration: '예정',
        timestamp: '대기중',
      },
    ],
    metrics: {
      successRate: 91.2,
      avgDeployTime: '17m 25s',
      deploysToday: 5,
      totalDeploys: 692,
    },
  },
};

// Mock Activities per project
export const mockProjectActivities: Record<string, ProjectActivity[]> = {
  'k8s-control': [
    {
      id: 1,
      projectId: 'k8s-control',
      workflow: 'Development',
      stage: 'Code Review',
      message: 'PR #234 merged to main branch',
      time: '5분 전',
      status: 'success',
      assignee: 'Platform Team',
    },
    {
      id: 2,
      projectId: 'k8s-control',
      workflow: 'Operations',
      stage: 'Deployment',
      message: 'Production 환경 배포 완료',
      time: '2시간 전',
      status: 'success',
      assignee: 'DevOps Team',
    },
  ],
  'microservice-api': [
    {
      id: 3,
      projectId: 'microservice-api',
      workflow: 'Testing',
      stage: 'Integration Test',
      message: '통합 테스트 진행 중',
      time: '진행중',
      status: 'warning',
      assignee: 'Backend Team',
    },
    {
      id: 4,
      projectId: 'microservice-api',
      workflow: 'Development',
      stage: 'Feature Development',
      message: 'API 엔드포인트 추가 개발 완료',
      time: '3시간 전',
      status: 'success',
      assignee: 'Backend Team',
    },
  ],
};

// Quick Actions for each project
export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'deployment' | 'testing' | 'security' | 'build' | 'maintenance';
  estimatedTime: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastRun?: string;
  resultMessage?: string;
  isAvailable: boolean;
}

export interface ProjectQuickActions {
  projectId: string;
  actions: QuickAction[];
}

// Mock Quick Actions Data
export const mockQuickActions: Record<string, QuickAction[]> = {
  'k8s-control': [
    {
      id: 'deploy-prep',
      name: '배포 준비',
      description: 'CI/CD 파이프라인 검증 및 배포 환경 준비',
      icon: 'rocket',
      category: 'deployment',
      estimatedTime: '3-5분',
      status: 'idle',
      lastRun: '2시간 전',
      resultMessage: '배포 준비 완료',
      isAvailable: true,
    },
    {
      id: 'run-tests',
      name: '테스트 실행',
      description: '전체 테스트 스위트 실행 (단위, 통합, E2E)',
      icon: 'bug',
      category: 'testing',
      estimatedTime: '8-12분',
      status: 'idle',
      lastRun: '1시간 전',
      resultMessage: '테스트 통과: 247개',
      isAvailable: true,
    },
    {
      id: 'security-scan',
      name: '취약점 체크',
      description: 'SAST, DAST 및 의존성 취약점 스캔',
      icon: 'shield',
      category: 'security',
      estimatedTime: '5-8분',
      status: 'idle',
      lastRun: '30분 전',
      resultMessage: '취약점 2개 발견',
      isAvailable: true,
    },
    {
      id: 'build-project',
      name: '프로젝트 빌드',
      description: 'Production 빌드 생성 및 최적화',
      icon: 'build',
      category: 'build',
      estimatedTime: '2-4분',
      status: 'success',
      lastRun: '15분 전',
      resultMessage: '빌드 성공 (1.4MB)',
      isAvailable: true,
    },
    {
      id: 'view-logs',
      name: '로그 확인',
      description: 'Application 및 시스템 로그 조회',
      icon: 'file-text',
      category: 'maintenance',
      estimatedTime: '즉시',
      status: 'idle',
      isAvailable: true,
    },
  ],
  'microservice-api': [
    {
      id: 'deploy-prep',
      name: '배포 준비',
      description: 'API 게이트웨이 배포 준비 및 검증',
      icon: 'rocket',
      category: 'deployment',
      estimatedTime: '4-6분',
      status: 'idle',
      lastRun: '3시간 전',
      resultMessage: '배포 준비 완료',
      isAvailable: true,
    },
    {
      id: 'run-tests',
      name: '테스트 실행',
      description: 'API 테스트 및 부하 테스트 실행',
      icon: 'bug',
      category: 'testing',
      estimatedTime: '10-15분',
      status: 'running',
      lastRun: '진행중',
      resultMessage: '테스트 진행중...',
      isAvailable: false,
    },
    {
      id: 'security-scan',
      name: '취약점 체크',
      description: 'API 보안 스캔 및 인증 검증',
      icon: 'shield',
      category: 'security',
      estimatedTime: '6-10분',
      status: 'idle',
      lastRun: '2시간 전',
      resultMessage: '보안 이슈 없음',
      isAvailable: true,
    },
    {
      id: 'performance-test',
      name: '성능 테스트',
      description: '부하 테스트 및 응답시간 측정',
      icon: 'activity',
      category: 'testing',
      estimatedTime: '15-20분',
      status: 'idle',
      lastRun: '4시간 전',
      resultMessage: 'RPS: 2847, 응답시간: 145ms',
      isAvailable: true,
    },
  ],
};

// Helper functions
export const getProjectById = (projectId: string): Project | undefined => {
  return mockProjects.find(project => project.id === projectId);
};

export const getPipelineByProjectId = (
  projectId: string
): ProjectPipeline | undefined => {
  return mockPipelines[projectId];
};

export const getActivitiesByProjectId = (
  projectId: string
): ProjectActivity[] => {
  return mockProjectActivities[projectId] || [];
};

export const getQuickActionsByProjectId = (
  projectId: string
): QuickAction[] => {
  return mockQuickActions[projectId] || [];
};

export const getActiveProjects = (): Project[] => {
  return mockProjects.filter(project => project.status === 'active');
};

export const getProjectsByEnvironment = (
  environment: Project['environment']
): Project[] => {
  return mockProjects.filter(project => project.environment === environment);
};

// Mock Security Data
export const mockSecurityVulnerabilities: Record<
  string,
  SecurityVulnerability[]
> = {
  'k8s-control': [
    {
      id: 'vuln-001',
      title: 'SQL Injection in User Authentication',
      description: 'SQL injection vulnerability found in login endpoint',
      severity: 'critical',
      type: 'code',
      cwe: 'CWE-89',
      status: 'open',
      foundAt: '2024-01-15T10:30:00Z',
      file: 'auth/login.go',
      line: 45,
      recommendation:
        'Use parameterized queries instead of string concatenation',
    },
    {
      id: 'vuln-002',
      title: 'Outdated React Version',
      description: 'React version contains known security vulnerabilities',
      severity: 'high',
      type: 'dependency',
      cwe: 'CWE-1104',
      status: 'inProgress',
      foundAt: '2024-01-10T14:20:00Z',
      recommendation: 'Update React to latest stable version (18.2.0)',
    },
    {
      id: 'vuln-003',
      title: 'Hardcoded API Key',
      description: 'API key found hardcoded in source code',
      severity: 'medium',
      type: 'code',
      cwe: 'CWE-798',
      status: 'resolved',
      foundAt: '2024-01-08T09:15:00Z',
      resolvedAt: '2024-01-08T16:30:00Z',
      file: 'config/api.ts',
      line: 12,
      recommendation: 'Move sensitive data to environment variables',
    },
  ],
  'microservice-api': [
    {
      id: 'vuln-004',
      title: 'JWT Token Validation Bypass',
      description: 'JWT signature validation can be bypassed',
      severity: 'critical',
      type: 'code',
      cwe: 'CWE-347',
      status: 'open',
      foundAt: '2024-01-12T11:45:00Z',
      file: 'middleware/auth.js',
      line: 78,
      recommendation: 'Implement proper JWT signature verification',
    },
    {
      id: 'vuln-005',
      title: 'Express.js Vulnerable Version',
      description: 'Express.js version has known security issues',
      severity: 'high',
      type: 'dependency',
      status: 'open',
      foundAt: '2024-01-11T15:20:00Z',
      recommendation: 'Update Express.js to version 4.18.2 or higher',
    },
  ],
};

export const mockSASTReports: Record<string, SASTReport> = {
  'k8s-control': {
    projectId: 'k8s-control',
    scanDate: '2024-01-15T10:00:00Z',
    status: 'completed',
    totalIssues: 12,
    criticalCount: 1,
    highCount: 2,
    mediumCount: 4,
    lowCount: 5,
    vulnerabilities: mockSecurityVulnerabilities['k8s-control'],
    coveragePercentage: 95.2,
    scanDuration: '4m 32s',
  },
  'microservice-api': {
    projectId: 'microservice-api',
    scanDate: '2024-01-14T16:30:00Z',
    status: 'completed',
    totalIssues: 8,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 3,
    lowCount: 3,
    vulnerabilities: mockSecurityVulnerabilities['microservice-api'],
    coveragePercentage: 88.7,
    scanDuration: '3m 15s',
  },
};

export const mockDASTReports: Record<string, DASTReport> = {
  'k8s-control': {
    projectId: 'k8s-control',
    scanDate: '2024-01-15T08:00:00Z',
    status: 'completed',
    targetUrl: 'https://k8s-control.dev.mipllab.com',
    totalIssues: 6,
    criticalCount: 0,
    highCount: 1,
    mediumCount: 2,
    lowCount: 3,
    vulnerabilities: [
      {
        id: 'dast-001',
        title: 'Missing Content Security Policy',
        description: 'Content Security Policy header not implemented',
        severity: 'medium',
        type: 'configuration',
        status: 'open',
        foundAt: '2024-01-15T08:15:00Z',
        recommendation: 'Implement CSP header to prevent XSS attacks',
      },
    ],
    pagesTested: 28,
    scanDuration: '12m 45s',
  },
  'microservice-api': {
    projectId: 'microservice-api',
    scanDate: '2024-01-14T12:00:00Z',
    status: 'completed',
    targetUrl: 'https://api.dev.mipllab.com',
    totalIssues: 4,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 2,
    lowCount: 2,
    vulnerabilities: [],
    pagesTested: 15,
    scanDuration: '8m 20s',
  },
};

export const mockSecurityAlerts: Record<string, SecurityAlert[]> = {
  'k8s-control': [
    {
      id: 'alert-001',
      projectId: 'k8s-control',
      type: 'vulnerability',
      severity: 'critical',
      title: 'Critical SQL Injection Detected',
      description:
        'SQL injection vulnerability detected in authentication module',
      source: 'SAST',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      status: 'new',
      assignee: 'Platform Team',
      tags: ['security', 'sql-injection', 'auth'],
    },
    {
      id: 'alert-002',
      projectId: 'k8s-control',
      type: 'compliance',
      severity: 'high',
      title: 'OWASP Top 10 Violation',
      description: 'Application violates OWASP Top 10 security standards',
      source: 'DAST',
      createdAt: '2024-01-14T16:00:00Z',
      updatedAt: '2024-01-15T09:00:00Z',
      status: 'acknowledged',
      assignee: 'Security Team',
      tags: ['compliance', 'owasp', 'security'],
    },
  ],
  'microservice-api': [
    {
      id: 'alert-003',
      projectId: 'microservice-api',
      type: 'vulnerability',
      severity: 'critical',
      title: 'JWT Bypass Vulnerability',
      description: 'JWT token validation can be bypassed in API gateway',
      source: 'SAST',
      createdAt: '2024-01-12T11:45:00Z',
      updatedAt: '2024-01-12T11:45:00Z',
      status: 'inProgress',
      assignee: 'Backend Team',
      tags: ['jwt', 'authentication', 'api'],
    },
  ],
};

export const mockProjectSecuritySummaries: Record<
  string,
  ProjectSecuritySummary
> = {
  'k8s-control': {
    projectId: 'k8s-control',
    lastUpdated: '2024-01-15T10:30:00Z',
    overallRiskScore: 75,
    securityScore: 68,
    sastReport: mockSASTReports['k8s-control'],
    dastReport: mockDASTReports['k8s-control'],
    activeAlerts: mockSecurityAlerts['k8s-control'],
    resolvedAlertsLast30Days: 8,
    complianceStatus: {
      gdpr: true,
      owasp: false,
      pci: true,
      iso27001: false,
    },
  },
  'microservice-api': {
    projectId: 'microservice-api',
    lastUpdated: '2024-01-14T16:30:00Z',
    overallRiskScore: 82,
    securityScore: 65,
    sastReport: mockSASTReports['microservice-api'],
    dastReport: mockDASTReports['microservice-api'],
    activeAlerts: mockSecurityAlerts['microservice-api'],
    resolvedAlertsLast30Days: 5,
    complianceStatus: {
      gdpr: true,
      owasp: true,
      pci: false,
      iso27001: false,
    },
  },
};

// Security helper functions
export const getSecuritySummaryByProjectId = (
  projectId: string
): ProjectSecuritySummary | undefined => {
  return mockProjectSecuritySummaries[projectId];
};

export const getSASTReportByProjectId = (
  projectId: string
): SASTReport | undefined => {
  return mockSASTReports[projectId];
};

export const getDASTReportByProjectId = (
  projectId: string
): DASTReport | undefined => {
  return mockDASTReports[projectId];
};

export const getSecurityAlertsByProjectId = (
  projectId: string
): SecurityAlert[] => {
  return mockSecurityAlerts[projectId] || [];
};

export const getVulnerabilitiesByProjectId = (
  projectId: string
): SecurityVulnerability[] => {
  return mockSecurityVulnerabilities[projectId] || [];
};

// Infrastructure Mock Data
export const mockInfrastructures: Record<string, ProjectInfrastructure> = {
  'k8s-control': {
    projectId: 'k8s-control',
    metrics: {
      cpu: {
        usage: 68.5,
        cores: 8,
        load: 2.4,
      },
      memory: {
        usage: 72.3,
        total: '32GB',
        used: '23.1GB',
      },
      gpu: {
        usage: 45.2,
        model: 'NVIDIA RTX 4090',
        memory: '24GB',
      },
    },
    backup: {
      lastBackup: '2시간 전',
      status: 'success',
      nextScheduled: '내일 02:00',
      retentionDays: 30,
      size: '2.4GB',
    },
    storage: {
      used: 65.8,
      total: '1TB',
      available: '342GB',
    },
    network: {
      inbound: '125 MB/s',
      outbound: '89 MB/s',
    },
  },
  'microservice-api': {
    projectId: 'microservice-api',
    metrics: {
      cpu: {
        usage: 42.1,
        cores: 16,
        load: 1.8,
      },
      memory: {
        usage: 58.7,
        total: '64GB',
        used: '37.6GB',
      },
      gpu: null,
    },
    backup: {
      lastBackup: '1시간 전',
      status: 'success',
      nextScheduled: '오늘 23:00',
      retentionDays: 14,
      size: '1.8GB',
    },
    storage: {
      used: 48.3,
      total: '2TB',
      available: '1.03TB',
    },
    network: {
      inbound: '89 MB/s',
      outbound: '124 MB/s',
    },
  },
};

// Helper function to get infrastructure data by project ID
export const getInfrastructureByProjectId = (
  projectId: string
): ProjectInfrastructure | undefined => {
  return mockInfrastructures[projectId];
};
