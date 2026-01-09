/**
 * Mock Services Data
 * 서비스 및 파이프라인 데이터
 */

export interface MockPodStatus {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  age?: string;
  image?: string;
}

export interface MockService {
  id: number;
  name: string;
  description?: string;
  status: 'running' | 'stopped' | 'error' | 'pending' | 'deploying';
  domain: string;
  namespace: string;
  gitlab_url: string;
  gitlab_config?: string;
  gitlab_branch?: string; // Legacy field
  gitlab_access_token?: string; // Legacy field
  docker_compose_config: string;
  registry_config: string;
  infra_id: number;
  infra_name?: string;
  infraType: string;
  creator_id: number;
  creator_email?: string;
  is_deployed: boolean;
  hops: { String: string; Valid: boolean }; // Go sql.NullString format
  created_at: string;
  updated_at: string;
  user_role: string;
  podsStatus?: MockPodStatus[];
  runningPods?: number;
  totalPods?: number;
}

export interface MockPipeline {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  services_id?: number;
  users_by?: number;
  created_at: string;
  updated_at: string;
  error_message?: string;
  error_details?: string;
}

export interface MockPipelineLog {
  pipeline_id: number;
  stage: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  logs: string[];
  started_at?: string;
  completed_at?: string;
}

export const mockServices: MockService[] = [
  {
    id: 1,
    name: 'web-api',
    description: 'Main Web API Service',
    status: 'running',
    domain: 'api.kiwi.com',
    namespace: 'production',
    gitlab_url: 'https://gitlab.com/kiwi/web-api',
    gitlab_config: JSON.stringify({
      token: 'glpat-xxxxx',
      branch: 'main',
      username: 'developer',
    }),
    gitlab_branch: 'main',
    docker_compose_config: 'version: "3.8"\nservices:\n  api:\n    image: harbor.kiwi.com/web-api:latest',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infraType: 'kubernetes',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]), Valid: true },
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2026-01-09T08:00:00Z',
    user_role: 'admin',
    podsStatus: [
      { name: 'web-api-deployment-abc123-1', status: 'Running', ready: true, restarts: 0, age: '5d', image: 'harbor.kiwi.com/web-api:v1.2.3' },
      { name: 'web-api-deployment-abc123-2', status: 'Running', ready: true, restarts: 0, age: '5d', image: 'harbor.kiwi.com/web-api:v1.2.3' },
      { name: 'web-api-deployment-abc123-3', status: 'Running', ready: true, restarts: 1, age: '5d', image: 'harbor.kiwi.com/web-api:v1.2.3' },
    ],
    runningPods: 3,
    totalPods: 3,
  },
  {
    id: 2,
    name: 'auth-service',
    description: 'Authentication & Authorization Service',
    status: 'running',
    domain: 'auth.kiwi.com',
    namespace: 'production',
    gitlab_url: 'https://gitlab.com/kiwi/auth-service',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'main', username: 'developer' }),
    gitlab_branch: 'main',
    docker_compose_config: 'version: "3.8"\nservices:\n  auth:\n    image: harbor.kiwi.com/auth-service:latest',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infraType: 'kubernetes',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]), Valid: true },
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2026-01-08T14:00:00Z',
    user_role: 'admin',
    podsStatus: [
      { name: 'auth-service-deployment-def456-1', status: 'Running', ready: true, restarts: 0, age: '3d', image: 'harbor.kiwi.com/auth-service:v2.0.1' },
      { name: 'auth-service-deployment-def456-2', status: 'Running', ready: true, restarts: 0, age: '3d', image: 'harbor.kiwi.com/auth-service:v2.0.1' },
    ],
    runningPods: 2,
    totalPods: 2,
  },
  {
    id: 3,
    name: 'notification-worker',
    description: 'Background Notification Processing Service',
    status: 'running',
    domain: '',
    namespace: 'production',
    gitlab_url: 'https://gitlab.com/kiwi/notification-worker',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'main', username: 'developer' }),
    gitlab_branch: 'main',
    docker_compose_config: '',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infraType: 'kubernetes',
    creator_id: 2,
    creator_email: 'manager@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]), Valid: true },
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2026-01-07T10:00:00Z',
    user_role: 'member',
    podsStatus: [
      { name: 'notification-worker-job-ghi789-1', status: 'Running', ready: true, restarts: 2, age: '7d', image: 'harbor.kiwi.com/notification-worker:v1.0.5' },
    ],
    runningPods: 1,
    totalPods: 1,
  },
  {
    id: 4,
    name: 'frontend-app',
    description: 'React Frontend Application',
    status: 'deploying',
    domain: 'app.kiwi.com',
    namespace: 'production',
    gitlab_url: 'https://gitlab.com/kiwi/frontend-app',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'develop', username: 'developer' }),
    gitlab_branch: 'develop',
    docker_compose_config: '',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infraType: 'kubernetes',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]), Valid: true },
    created_at: '2024-07-01T00:00:00Z',
    updated_at: '2026-01-09T08:30:00Z',
    user_role: 'admin',
    podsStatus: [
      { name: 'frontend-app-deployment-jkl012-1', status: 'Running', ready: true, restarts: 0, age: '1h', image: 'harbor.kiwi.com/frontend-app:v3.1.0' },
      { name: 'frontend-app-deployment-jkl012-2', status: 'Pending', ready: false, restarts: 0, age: '5m', image: 'harbor.kiwi.com/frontend-app:v3.1.1' },
    ],
    runningPods: 1,
    totalPods: 2,
  },
  {
    id: 5,
    name: 'batch-processor',
    description: 'Scheduled Batch Processing Jobs',
    status: 'stopped',
    domain: '',
    namespace: 'staging',
    gitlab_url: 'https://gitlab.com/kiwi/batch-processor',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'staging', username: 'developer' }),
    gitlab_branch: 'staging',
    docker_compose_config: '',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infraType: 'kubernetes',
    creator_id: 2,
    creator_email: 'manager@kiwi.com',
    is_deployed: false,
    hops: { String: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]), Valid: true },
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
    user_role: 'member',
    podsStatus: [],
    runningPods: 0,
    totalPods: 0,
  },
  {
    id: 6,
    name: 'legacy-api',
    description: 'Legacy API (Docker Compose)',
    status: 'running',
    domain: 'legacy.kiwi.com',
    namespace: 'docker-development',
    gitlab_url: 'https://gitlab.com/kiwi/legacy-api',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'master', username: 'developer' }),
    gitlab_branch: 'master',
    docker_compose_config: 'version: "3.8"\nservices:\n  legacy:\n    image: harbor.kiwi.com/legacy-api:latest\n    ports:\n      - "8081:8080"',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 2,
    infra_name: 'docker-development',
    infraType: 'docker',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.2.50', port: 22, username: 'docker' }]), Valid: true },
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_role: 'admin',
  },
  {
    id: 7,
    name: 'data-analytics',
    description: 'Data Analytics Pipeline',
    status: 'error',
    domain: 'analytics.kiwi.com',
    namespace: 'production',
    gitlab_url: 'https://gitlab.com/kiwi/data-analytics',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'main', username: 'developer' }),
    gitlab_branch: 'main',
    docker_compose_config: '',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infraType: 'kubernetes',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]), Valid: true },
    created_at: '2024-11-01T00:00:00Z',
    updated_at: '2026-01-09T06:00:00Z',
    user_role: 'admin',
    podsStatus: [
      { name: 'data-analytics-deployment-mno345-1', status: 'Error', ready: false, restarts: 5, age: '2h', image: 'harbor.kiwi.com/data-analytics:v0.9.0' },
    ],
    runningPods: 0,
    totalPods: 1,
  },
  {
    id: 8,
    name: 'monitoring-agent',
    description: 'Podman-based Monitoring Agent Service',
    status: 'running',
    domain: '',
    namespace: 'podman-staging',
    gitlab_url: 'https://gitlab.com/kiwi/monitoring-agent',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'main', username: 'developer' }),
    gitlab_branch: 'main',
    docker_compose_config: 'version: "3.8"\nservices:\n  monitor:\n    image: harbor.kiwi.com/monitoring-agent:latest\n    ports:\n      - "9100:9100"',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 4,
    infra_name: 'podman-staging',
    infraType: 'podman',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.3.100', port: 22, username: 'podman' }]), Valid: true },
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2026-01-08T10:00:00Z',
    user_role: 'admin',
  },
  {
    id: 9,
    name: 'dev-test-app',
    description: 'Docker Development Test Application',
    status: 'error',
    domain: 'dev-test.kiwi.com',
    namespace: 'docker-development',
    gitlab_url: 'https://gitlab.com/kiwi/dev-test-app',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'develop', username: 'developer' }),
    gitlab_branch: 'develop',
    docker_compose_config: 'version: "3.8"\nservices:\n  app:\n    image: harbor.kiwi.com/dev-test-app:latest',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 2,
    infra_name: 'docker-development',
    infraType: 'docker',
    creator_id: 2,
    creator_email: 'manager@kiwi.com',
    is_deployed: true,
    hops: { String: JSON.stringify([{ host: '192.168.2.50', port: 22, username: 'docker' }]), Valid: true },
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2026-01-09T03:00:00Z',
    user_role: 'member',
  },
  {
    id: 10,
    name: 'backup-scheduler',
    description: 'Podman Backup Scheduler Service',
    status: 'stopped',
    domain: '',
    namespace: 'podman-staging',
    gitlab_url: 'https://gitlab.com/kiwi/backup-scheduler',
    gitlab_config: JSON.stringify({ token: 'glpat-xxxxx', branch: 'main', username: 'developer' }),
    gitlab_branch: 'main',
    docker_compose_config: 'version: "3.8"\nservices:\n  scheduler:\n    image: harbor.kiwi.com/backup-scheduler:latest',
    registry_config: JSON.stringify({ docker_registry: 'harbor.kiwi.com/kiwi' }),
    infra_id: 4,
    infra_name: 'podman-staging',
    infraType: 'podman',
    creator_id: 1,
    creator_email: 'owner@kiwi.com',
    is_deployed: false,
    hops: { String: JSON.stringify([{ host: '192.168.3.100', port: 22, username: 'podman' }]), Valid: true },
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2026-01-06T00:00:00Z',
    user_role: 'admin',
  },
];

export const mockPipelines: MockPipeline[] = [
  // Kubernetes Pipelines
  {
    id: 1,
    name: 'build-web-api-#156',
    status: 'success',
    started_at: '2026-01-09T07:30:00Z',
    completed_at: '2026-01-09T07:45:00Z',
    duration_seconds: 900,
    services_id: 1,
    users_by: 1,
    created_at: '2026-01-09T07:30:00Z',
    updated_at: '2026-01-09T07:45:00Z',
  },
  {
    id: 2,
    name: 'deploy-auth-service-#89',
    status: 'success',
    started_at: '2026-01-08T14:00:00Z',
    completed_at: '2026-01-08T14:10:00Z',
    duration_seconds: 600,
    services_id: 2,
    users_by: 1,
    created_at: '2026-01-08T14:00:00Z',
    updated_at: '2026-01-08T14:10:00Z',
  },
  {
    id: 3,
    name: 'build-frontend-app-#203',
    status: 'running',
    started_at: '2026-01-09T08:30:00Z',
    duration_seconds: 300,
    services_id: 4,
    users_by: 2,
    created_at: '2026-01-09T08:30:00Z',
    updated_at: '2026-01-09T08:35:00Z',
  },
  {
    id: 4,
    name: 'build-data-analytics-#45',
    status: 'failed',
    started_at: '2026-01-09T05:00:00Z',
    completed_at: '2026-01-09T05:15:00Z',
    duration_seconds: 900,
    services_id: 7,
    users_by: 1,
    created_at: '2026-01-09T05:00:00Z',
    updated_at: '2026-01-09T05:15:00Z',
    error_message: 'Build failed: OutOfMemory error during compilation',
    error_details: `[ERROR] Java heap space - java.lang.OutOfMemoryError
  at org.apache.spark.sql.catalyst.analysis.Analyzer$ResolveRelations$
  at org.apache.spark.sql.catalyst.plans.logical.AnalysisHelper.resolveOperatorsUpWithNewOutput

Caused by: Container killed by OOM Killer
Memory limit: 4GB
Peak usage: 4.2GB

Suggestion: Increase memory allocation in build config or optimize build process.`,
  },
  {
    id: 5,
    name: 'security-scan-web-api-#12',
    status: 'success',
    started_at: '2026-01-08T22:00:00Z',
    completed_at: '2026-01-08T22:30:00Z',
    duration_seconds: 1800,
    services_id: 1,
    users_by: 1,
    created_at: '2026-01-08T22:00:00Z',
    updated_at: '2026-01-08T22:30:00Z',
  },
  // Docker Pipelines
  {
    id: 6,
    name: 'build-legacy-api-#78',
    status: 'success',
    started_at: '2026-01-08T09:00:00Z',
    completed_at: '2026-01-08T09:15:00Z',
    duration_seconds: 900,
    services_id: 6,
    users_by: 1,
    created_at: '2026-01-08T09:00:00Z',
    updated_at: '2026-01-08T09:15:00Z',
  },
  {
    id: 7,
    name: 'build-dev-test-app-#23',
    status: 'failed',
    started_at: '2026-01-09T02:30:00Z',
    completed_at: '2026-01-09T02:45:00Z',
    duration_seconds: 900,
    services_id: 9,
    users_by: 2,
    created_at: '2026-01-09T02:30:00Z',
    updated_at: '2026-01-09T02:45:00Z',
    error_message: 'Docker build failed: npm install error',
    error_details: `Step 5/12 : RUN npm install
 ---> Running in 8a3c2b1d4e5f
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR!
npm ERR! While resolving: dev-test-app@1.0.0
npm ERR! Found: react@18.2.0
npm ERR! node_modules/react
npm ERR!   react@"^18.2.0" from the root project
npm ERR!
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^17.0.0" from react-router-dom@5.3.0
npm ERR! node_modules/react-router-dom
npm ERR!   react-router-dom@"^5.3.0" from the root project

Suggestion: Update react-router-dom to version 6.x or downgrade React to 17.x`,
  },
  // Podman Pipelines
  {
    id: 8,
    name: 'build-monitoring-agent-#34',
    status: 'success',
    started_at: '2026-01-08T11:00:00Z',
    completed_at: '2026-01-08T11:20:00Z',
    duration_seconds: 1200,
    services_id: 8,
    users_by: 1,
    created_at: '2026-01-08T11:00:00Z',
    updated_at: '2026-01-08T11:20:00Z',
  },
  {
    id: 9,
    name: 'build-backup-scheduler-#12',
    status: 'failed',
    started_at: '2026-01-07T15:00:00Z',
    completed_at: '2026-01-07T15:10:00Z',
    duration_seconds: 600,
    services_id: 10,
    users_by: 1,
    created_at: '2026-01-07T15:00:00Z',
    updated_at: '2026-01-07T15:10:00Z',
    error_message: 'Podman build failed: Registry authentication error',
    error_details: `Error: error authenticating creds for "harbor.kiwi.com": error pinging docker registry harbor.kiwi.com:
Get "https://harbor.kiwi.com/v2/": x509: certificate has expired or is not yet valid

time="2026-01-07T15:09:45Z" level=error msg="error authenticating"
Error: unable to push harbor.kiwi.com/backup-scheduler:v1.2.0

Suggestion: Renew Harbor registry SSL certificate or update CA certificates on build server.`,
  },
  {
    id: 10,
    name: 'deploy-monitoring-agent-#35',
    status: 'cancelled',
    started_at: '2026-01-08T12:00:00Z',
    completed_at: '2026-01-08T12:02:00Z',
    duration_seconds: 120,
    services_id: 8,
    users_by: 1,
    created_at: '2026-01-08T12:00:00Z',
    updated_at: '2026-01-08T12:02:00Z',
    error_message: 'Pipeline cancelled by user',
  },
];

// Pipeline Logs (detailed build logs)
export const mockPipelineLogs: MockPipelineLog[] = [
  {
    pipeline_id: 4,
    stage: 'checkout',
    status: 'success',
    logs: [
      '[INFO] Cloning repository from https://gitlab.com/kiwi/data-analytics',
      '[INFO] Branch: main',
      '[INFO] Commit: abc123def456',
      '[INFO] Checkout completed successfully',
    ],
    started_at: '2026-01-09T05:00:00Z',
    completed_at: '2026-01-09T05:01:00Z',
  },
  {
    pipeline_id: 4,
    stage: 'build',
    status: 'failed',
    logs: [
      '[INFO] Starting build process...',
      '[INFO] Building Docker image: harbor.kiwi.com/data-analytics:v0.9.0',
      '[INFO] Step 1/8: FROM openjdk:17-slim',
      '[INFO] Step 2/8: COPY . /app',
      '[INFO] Step 3/8: WORKDIR /app',
      '[INFO] Step 4/8: RUN ./gradlew build',
      '[ERROR] Java heap space - java.lang.OutOfMemoryError',
      '[ERROR] Build failed due to insufficient memory',
    ],
    started_at: '2026-01-09T05:01:00Z',
    completed_at: '2026-01-09T05:15:00Z',
  },
  {
    pipeline_id: 7,
    stage: 'checkout',
    status: 'success',
    logs: [
      '[INFO] Cloning repository from https://gitlab.com/kiwi/dev-test-app',
      '[INFO] Branch: develop',
      '[INFO] Commit: 789xyz123abc',
      '[INFO] Checkout completed successfully',
    ],
    started_at: '2026-01-09T02:30:00Z',
    completed_at: '2026-01-09T02:31:00Z',
  },
  {
    pipeline_id: 7,
    stage: 'build',
    status: 'failed',
    logs: [
      '[INFO] Starting Docker build...',
      '[INFO] Step 1/12: FROM node:18-alpine',
      '[INFO] Step 2/12: WORKDIR /app',
      '[INFO] Step 3/12: COPY package*.json ./',
      '[INFO] Step 4/12: RUN npm install',
      '[ERROR] npm ERR! code ERESOLVE',
      '[ERROR] npm ERR! unable to resolve dependency tree',
      '[ERROR] peer react@"^17.0.0" from react-router-dom@5.3.0',
      '[ERROR] Build failed: npm install error',
    ],
    started_at: '2026-01-09T02:31:00Z',
    completed_at: '2026-01-09T02:45:00Z',
  },
  {
    pipeline_id: 9,
    stage: 'checkout',
    status: 'success',
    logs: [
      '[INFO] Cloning repository from https://gitlab.com/kiwi/backup-scheduler',
      '[INFO] Branch: main',
      '[INFO] Commit: def456ghi789',
      '[INFO] Checkout completed successfully',
    ],
    started_at: '2026-01-07T15:00:00Z',
    completed_at: '2026-01-07T15:01:00Z',
  },
  {
    pipeline_id: 9,
    stage: 'build',
    status: 'success',
    logs: [
      '[INFO] Starting Podman build...',
      '[INFO] Building image: harbor.kiwi.com/backup-scheduler:v1.2.0',
      '[INFO] Build completed successfully',
    ],
    started_at: '2026-01-07T15:01:00Z',
    completed_at: '2026-01-07T15:08:00Z',
  },
  {
    pipeline_id: 9,
    stage: 'push',
    status: 'failed',
    logs: [
      '[INFO] Pushing image to registry...',
      '[ERROR] x509: certificate has expired or is not yet valid',
      '[ERROR] unable to push harbor.kiwi.com/backup-scheduler:v1.2.0',
      '[ERROR] Registry authentication failed',
    ],
    started_at: '2026-01-07T15:08:00Z',
    completed_at: '2026-01-07T15:10:00Z',
  },
];

// Build Statistics
export const mockBuildStatistics = {
  service_id: 1,
  service_name: 'web-api',
  total_builds: 156,
  successful_builds: 148,
  failed_builds: 8,
  success_rate: 94.87,
  average_build_time: 850,
  latest_build: {
    id: 156,
    status: 'success',
    started_at: '2026-01-09T07:30:00Z',
    duration_seconds: 900,
  },
  docker_images: [
    { tag: 'v1.2.3', created: '2026-01-09T07:45:00Z', size: '245MB' },
    { tag: 'v1.2.2', created: '2026-01-08T10:00:00Z', size: '243MB' },
    { tag: 'v1.2.1', created: '2026-01-07T15:00:00Z', size: '242MB' },
  ],
  build_environment: {
    gitlab_url: 'https://gitlab.com/kiwi/web-api',
    gitlab_branch: 'main',
    docker_compose_files: ['docker-compose.yml', 'docker-compose.prod.yml'],
    docker_registry: 'harbor.kiwi.com',
    build_tool: 'docker-compose',
    infra_type: 'kubernetes',
    build_infra_name: 'docker-development',
    build_infra_type: 'docker',
  },
  recent_builds: [
    { id: 156, status: 'success', started_at: '2026-01-09T07:30:00Z', duration_seconds: 900 },
    { id: 155, status: 'success', started_at: '2026-01-08T10:00:00Z', duration_seconds: 870 },
    { id: 154, status: 'failed', started_at: '2026-01-07T15:00:00Z', duration_seconds: 450 },
    { id: 153, status: 'success', started_at: '2026-01-06T09:00:00Z', duration_seconds: 920 },
    { id: 152, status: 'success', started_at: '2026-01-05T14:00:00Z', duration_seconds: 880 },
  ],
};
