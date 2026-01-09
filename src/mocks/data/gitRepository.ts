/**
 * Mock Git Repository Data
 * 서비스 관리 페이지의 Git 저장소 데이터
 */

export interface MockGitRepository {
  id: number;
  name4kiwi?: string;
  name: string;
  gitlabUrl: string;
  gitlabBranch: string;
  lastCommit?: string;
  status?: 'active' | 'inactive';
  creatorId: number;
  hasRepository?: boolean;
  dockerRegistry?: string;
  group?: number;
  groupFullPath?: string;
  infraType?: string;
}

export const mockGitRepositories: MockGitRepository[] = [
  {
    id: 1,
    name4kiwi: 'web-api',
    name: 'web-api',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/web-api',
    gitlabBranch: 'main',
    lastCommit: 'feat: Add user authentication endpoint',
    status: 'active',
    creatorId: 1,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/web-api',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'kubernetes',
  },
  {
    id: 2,
    name4kiwi: 'auth-service',
    name: 'auth-service',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/auth-service',
    gitlabBranch: 'main',
    lastCommit: 'fix: JWT token expiration issue',
    status: 'active',
    creatorId: 1,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/auth-service',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'kubernetes',
  },
  {
    id: 3,
    name4kiwi: 'frontend-app',
    name: 'frontend-app',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/frontend-app',
    gitlabBranch: 'develop',
    lastCommit: 'chore: Update dependencies',
    status: 'active',
    creatorId: 2,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/frontend-app',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'kubernetes',
  },
  {
    id: 4,
    name4kiwi: 'notification-worker',
    name: 'notification-worker',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/notification-worker',
    gitlabBranch: 'main',
    lastCommit: 'feat: Add email template support',
    status: 'active',
    creatorId: 1,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/notification-worker',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'docker',
  },
  {
    id: 5,
    name4kiwi: 'data-analytics',
    name: 'data-analytics',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/data-analytics',
    gitlabBranch: 'main',
    lastCommit: 'refactor: Optimize query performance',
    status: 'active',
    creatorId: 2,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/data-analytics',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'kubernetes',
  },
  {
    id: 6,
    name4kiwi: 'monitoring-service',
    name: 'monitoring-service',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/monitoring-service',
    gitlabBranch: 'main',
    lastCommit: 'fix: Memory leak in metrics collector',
    status: 'active',
    creatorId: 1,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/monitoring-service',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'kubernetes',
  },
  {
    id: 7,
    name4kiwi: 'batch-processor',
    name: 'batch-processor',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/batch-processor',
    gitlabBranch: 'main',
    lastCommit: 'feat: Add scheduled job support',
    status: 'inactive',
    creatorId: 2,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/batch-processor',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'podman',
  },
  {
    id: 8,
    name4kiwi: 'api-gateway',
    name: 'api-gateway',
    gitlabUrl: 'https://gitlab.kiwi.com/kiwi/api-gateway',
    gitlabBranch: 'main',
    lastCommit: 'feat: Add rate limiting',
    status: 'active',
    creatorId: 1,
    hasRepository: true,
    dockerRegistry: 'harbor.kiwi.com/kiwi/api-gateway',
    group: 1,
    groupFullPath: 'kiwi',
    infraType: 'kubernetes',
  },
];
