// Integrated Dashboard Mock Data
// Comprehensive data for build/deploy, backup, SAST, DAST, performance metrics

export interface BuildDeployStatus {
  buildId: string;
  projectName: string;
  environment: 'development' | 'staging' | 'production';
  status: 'building' | 'deploying' | 'success' | 'failed' | 'pending';
  progress: number;
  startTime: string;
  duration: string;
  branch: string;
  commit: string;
  buildNumber: number;
  artifacts: {
    size: string;
    url?: string;
  };
  logs?: string;
}

export interface BackupStatus {
  backupId: string;
  type: 'database' | 'files' | 'config' | 'full';
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  projectName: string;
  lastBackup: string;
  nextBackup: string;
  size: string;
  retention: string;
  location: string;
  success: boolean;
}

export interface SASTResult {
  scanId: string;
  projectName: string;
  status: 'scanning' | 'completed' | 'failed';
  timestamp: string;
  duration: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  codeQuality: {
    score: number;
    issues: number;
    coverage: number;
  };
  compliance: {
    passed: number;
    failed: number;
    total: number;
  };
}

export interface DASTResult {
  scanId: string;
  projectName: string;
  targetUrl: string;
  status: 'scanning' | 'completed' | 'failed';
  timestamp: string;
  duration: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  endpoints: {
    tested: number;
    vulnerable: number;
    secure: number;
  };
  performance: {
    avgResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
}

export interface PerformanceMetrics {
  timestamp: string;
  projectName: string;
  metrics: {
    availability: number;
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    throughput: {
      rps: number;
      rpm: number;
    };
    errorRate: number;
    cpu: number;
    memory: number;
    diskUsage: number;
  };
  sla: {
    target: number;
    current: number;
    status: 'met' | 'at-risk' | 'breached';
  };
}

export interface SecurityAlert {
  id: string;
  type: 'sast' | 'dast' | 'infrastructure' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  projectName: string;
  timestamp: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'false-positive';
  impact: string;
  recommendation: string;
}

export interface IntegratedDashboardData {
  builds: BuildDeployStatus[];
  backups: BackupStatus[];
  sastResults: SASTResult[];
  dastResults: DASTResult[];
  performanceMetrics: PerformanceMetrics[];
  securityAlerts: SecurityAlert[];
  summary: {
    totalProjects: number;
    activeBuilds: number;
    failedBuilds: number;
    securityIssues: number;
    backupStatus: 'healthy' | 'warning' | 'critical';
    overallHealth: number;
  };
}

// Mock Integrated Dashboard Data
export const mockIntegratedData: IntegratedDashboardData = {
  builds: [
    {
      buildId: 'build-k8s-001',
      projectName: 'K8s Control Platform',
      environment: 'production',
      status: 'success',
      progress: 100,
      startTime: '10분 전',
      duration: '4m 32s',
      branch: 'main',
      commit: 'a1b2c3d',
      buildNumber: 847,
      artifacts: {
        size: '1.4MB',
      },
    },
    {
      buildId: 'build-api-002',
      projectName: 'Microservice API Gateway',
      environment: 'staging',
      status: 'deploying',
      progress: 75,
      startTime: '5분 전',
      duration: '3m 18s',
      branch: 'develop',
      commit: 'x9y8z7w',
      buildNumber: 692,
      artifacts: {
        size: '892KB',
      },
    },
    {
      buildId: 'build-ml-003',
      projectName: 'ML Analytics Dashboard',
      environment: 'development',
      status: 'building',
      progress: 45,
      startTime: '2분 전',
      duration: '1m 54s',
      branch: 'feature/new-model',
      commit: 'p5q4r3s',
      buildNumber: 234,
      artifacts: {
        size: '계산 중...',
      },
    },
    {
      buildId: 'build-mobile-004',
      projectName: 'Mobile Application',
      environment: 'development',
      status: 'failed',
      progress: 0,
      startTime: '1시간 전',
      duration: '실패',
      branch: 'fix/typescript-errors',
      commit: 'f8g7h6j',
      buildNumber: 156,
      artifacts: {
        size: '0KB',
      },
      logs: 'TypeScript 컴파일 오류: 5개 파일에서 타입 불일치',
    },
  ],

  backups: [
    {
      backupId: 'backup-db-001',
      type: 'database',
      status: 'completed',
      projectName: 'K8s Control Platform',
      lastBackup: '2시간 전',
      nextBackup: '22시간 후',
      size: '2.3GB',
      retention: '30일',
      location: 's3://backups/k8s-control',
      success: true,
    },
    {
      backupId: 'backup-files-002',
      type: 'files',
      status: 'running',
      projectName: 'ML Analytics Dashboard',
      lastBackup: '진행 중',
      nextBackup: '23시간 후',
      size: '1.8GB',
      retention: '30일',
      location: 's3://backups/ml-analytics',
      success: true,
    },
    {
      backupId: 'backup-config-003',
      type: 'config',
      status: 'failed',
      projectName: 'Microservice API Gateway',
      lastBackup: '5시간 전',
      nextBackup: '19시간 후',
      size: '0KB',
      retention: '90일',
      location: 's3://backups/api-gateway',
      success: false,
    },
    {
      backupId: 'backup-full-004',
      type: 'full',
      status: 'scheduled',
      projectName: 'Legacy System Migration',
      lastBackup: '1주 전',
      nextBackup: '6일 후',
      size: '15.2GB',
      retention: '1년',
      location: 's3://backups/legacy-system',
      success: true,
    },
  ],

  sastResults: [
    {
      scanId: 'sast-k8s-001',
      projectName: 'K8s Control Platform',
      status: 'completed',
      timestamp: '1시간 전',
      duration: '8m 15s',
      vulnerabilities: {
        critical: 0,
        high: 2,
        medium: 5,
        low: 12,
        info: 8,
      },
      codeQuality: {
        score: 87,
        issues: 23,
        coverage: 94,
      },
      compliance: {
        passed: 45,
        failed: 3,
        total: 48,
      },
    },
    {
      scanId: 'sast-api-002',
      projectName: 'Microservice API Gateway',
      status: 'scanning',
      timestamp: '진행 중',
      duration: '4m 32s',
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      codeQuality: {
        score: 0,
        issues: 0,
        coverage: 0,
      },
      compliance: {
        passed: 0,
        failed: 0,
        total: 52,
      },
    },
    {
      scanId: 'sast-ml-003',
      projectName: 'ML Analytics Dashboard',
      status: 'completed',
      timestamp: '3시간 전',
      duration: '12m 45s',
      vulnerabilities: {
        critical: 1,
        high: 4,
        medium: 8,
        low: 15,
        info: 6,
      },
      codeQuality: {
        score: 79,
        issues: 34,
        coverage: 87,
      },
      compliance: {
        passed: 38,
        failed: 8,
        total: 46,
      },
    },
  ],

  dastResults: [
    {
      scanId: 'dast-k8s-001',
      projectName: 'K8s Control Platform',
      targetUrl: 'https://k8s-control.example.com',
      status: 'completed',
      timestamp: '2시간 전',
      duration: '45m 20s',
      vulnerabilities: {
        critical: 0,
        high: 1,
        medium: 3,
        low: 7,
        info: 5,
      },
      endpoints: {
        tested: 47,
        vulnerable: 11,
        secure: 36,
      },
      performance: {
        avgResponseTime: 145,
        slowestEndpoint: '/api/v1/clusters',
        fastestEndpoint: '/api/v1/health',
      },
    },
    {
      scanId: 'dast-api-002',
      projectName: 'Microservice API Gateway',
      targetUrl: 'https://api-gateway.example.com',
      status: 'completed',
      timestamp: '4시간 전',
      duration: '32m 10s',
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 2,
        low: 4,
        info: 8,
      },
      endpoints: {
        tested: 83,
        vulnerable: 6,
        secure: 77,
      },
      performance: {
        avgResponseTime: 98,
        slowestEndpoint: '/api/v2/analytics',
        fastestEndpoint: '/api/v1/status',
      },
    },
    {
      scanId: 'dast-ml-003',
      projectName: 'ML Analytics Dashboard',
      targetUrl: 'https://ml-dashboard.example.com',
      status: 'failed',
      timestamp: '1일 전',
      duration: '실패',
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      endpoints: {
        tested: 0,
        vulnerable: 0,
        secure: 0,
      },
      performance: {
        avgResponseTime: 0,
        slowestEndpoint: 'N/A',
        fastestEndpoint: 'N/A',
      },
    },
  ],

  performanceMetrics: [
    {
      timestamp: '실시간',
      projectName: 'K8s Control Platform',
      metrics: {
        availability: 99.97,
        responseTime: {
          avg: 145,
          p95: 280,
          p99: 450,
        },
        throughput: {
          rps: 47.3,
          rpm: 2838,
        },
        errorRate: 0.03,
        cpu: 34,
        memory: 67,
        diskUsage: 45,
      },
      sla: {
        target: 99.9,
        current: 99.97,
        status: 'met',
      },
    },
    {
      timestamp: '실시간',
      projectName: 'Microservice API Gateway',
      metrics: {
        availability: 99.89,
        responseTime: {
          avg: 98,
          p95: 180,
          p99: 320,
        },
        throughput: {
          rps: 125.8,
          rpm: 7548,
        },
        errorRate: 0.08,
        cpu: 52,
        memory: 78,
        diskUsage: 38,
      },
      sla: {
        target: 99.9,
        current: 99.89,
        status: 'at-risk',
      },
    },
    {
      timestamp: '실시간',
      projectName: 'ML Analytics Dashboard',
      metrics: {
        availability: 98.45,
        responseTime: {
          avg: 340,
          p95: 680,
          p99: 1200,
        },
        throughput: {
          rps: 12.4,
          rpm: 744,
        },
        errorRate: 1.55,
        cpu: 89,
        memory: 94,
        diskUsage: 67,
      },
      sla: {
        target: 99.0,
        current: 98.45,
        status: 'breached',
      },
    },
  ],

  securityAlerts: [
    {
      id: 'alert-001',
      type: 'sast',
      severity: 'critical',
      title: 'SQL Injection 취약점 발견',
      description:
        'ML Analytics Dashboard에서 사용자 입력 검증 누락으로 인한 SQL Injection 가능성',
      projectName: 'ML Analytics Dashboard',
      timestamp: '3시간 전',
      status: 'new',
      impact: '데이터베이스 정보 유출 위험',
      recommendation: '입력 검증 및 매개변수화된 쿼리 사용',
    },
    {
      id: 'alert-002',
      type: 'dast',
      severity: 'high',
      title: 'XSS 취약점 발견',
      description: 'K8s Control Platform에서 Cross-Site Scripting 가능성',
      projectName: 'K8s Control Platform',
      timestamp: '2시간 전',
      status: 'acknowledged',
      impact: '사용자 세션 탈취 위험',
      recommendation: '사용자 입력 이스케이프 처리 강화',
    },
    {
      id: 'alert-003',
      type: 'dependency',
      severity: 'high',
      title: '취약한 의존성 발견',
      description: 'lodash 4.17.15 버전에 프로토타입 오염 취약점',
      projectName: 'Microservice API Gateway',
      timestamp: '1시간 전',
      status: 'new',
      impact: '애플리케이션 로직 조작 가능',
      recommendation: 'lodash 4.17.21 이상으로 업데이트',
    },
    {
      id: 'alert-004',
      type: 'infrastructure',
      severity: 'medium',
      title: 'SSL 인증서 만료 임박',
      description: 'K8s Control Platform SSL 인증서가 7일 내 만료',
      projectName: 'K8s Control Platform',
      timestamp: '6시간 전',
      status: 'acknowledged',
      impact: 'HTTPS 연결 중단 위험',
      recommendation: 'SSL 인증서 갱신 필요',
    },
    {
      id: 'alert-005',
      type: 'sast',
      severity: 'medium',
      title: '하드코딩된 시크릿 발견',
      description: 'API 키가 소스코드에 하드코딩되어 있음',
      projectName: 'Mobile Application',
      timestamp: '12시간 전',
      status: 'resolved',
      impact: 'API 키 노출 위험',
      recommendation: '환경 변수 사용으로 변경 완료',
    },
  ],

  summary: {
    totalProjects: 5,
    activeBuilds: 2,
    failedBuilds: 1,
    securityIssues: 4,
    backupStatus: 'warning',
    overallHealth: 87,
  },
};

// Helper functions
export const getActiveBuilds = (): BuildDeployStatus[] => {
  return mockIntegratedData.builds.filter(
    build => build.status === 'building' || build.status === 'deploying'
  );
};

export const getFailedBuilds = (): BuildDeployStatus[] => {
  return mockIntegratedData.builds.filter(build => build.status === 'failed');
};

export const getSuccessfulBuilds = (): BuildDeployStatus[] => {
  return mockIntegratedData.builds.filter(build => build.status === 'success');
};

export const getCriticalSecurityAlerts = (): SecurityAlert[] => {
  return mockIntegratedData.securityAlerts.filter(
    alert => alert.severity === 'critical' && alert.status !== 'resolved'
  );
};

export const getHighSecurityAlerts = (): SecurityAlert[] => {
  return mockIntegratedData.securityAlerts.filter(
    alert => alert.severity === 'high' && alert.status !== 'resolved'
  );
};

export const getBackupIssues = (): BackupStatus[] => {
  return mockIntegratedData.backups.filter(backup => !backup.success);
};

export const getPerformanceIssues = (): PerformanceMetrics[] => {
  return mockIntegratedData.performanceMetrics.filter(
    metric =>
      metric.sla.status === 'breached' || metric.sla.status === 'at-risk'
  );
};

export const getTotalVulnerabilities = (): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} => {
  const sastTotal = mockIntegratedData.sastResults.reduce(
    (acc, result) => ({
      critical: acc.critical + result.vulnerabilities.critical,
      high: acc.high + result.vulnerabilities.high,
      medium: acc.medium + result.vulnerabilities.medium,
      low: acc.low + result.vulnerabilities.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  const dastTotal = mockIntegratedData.dastResults.reduce(
    (acc, result) => ({
      critical: acc.critical + result.vulnerabilities.critical,
      high: acc.high + result.vulnerabilities.high,
      medium: acc.medium + result.vulnerabilities.medium,
      low: acc.low + result.vulnerabilities.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  return {
    critical: sastTotal.critical + dastTotal.critical,
    high: sastTotal.high + dastTotal.high,
    medium: sastTotal.medium + dastTotal.medium,
    low: sastTotal.low + dastTotal.low,
  };
};
