/**
 * Mock Service API Handler
 */

import { mockBuildStatistics, mockPipelines, mockServices } from '../data/services';
import { createApiResponse } from '../utils/delay';

export const mockServiceApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'getServices': {
        const infraId = params?.infra_id as number | undefined;
        let services = [...mockServices];

        if (infraId) {
          services = services.filter((s) => s.infra_id === infraId);
        }

        return createApiResponse(services);
      }

      case 'getServiceById': {
        const serviceId = params?.id as number;
        const service = mockServices.find((s) => s.id === serviceId);

        if (service) {
          return createApiResponse(service);
        }

        return createApiResponse(null, false, '서비스를 찾을 수 없습니다.');
      }

      case 'status': {
        const serviceId = params?.service_id as number;
        const service = mockServices.find((s) => s.id === serviceId);

        if (service) {
          // Frontend expects just a string status value
          return createApiResponse(service.status);
        }

        return createApiResponse('pending');
      }

      case 'getServiceStatus': {
        const serviceId = params?.service_id as number;
        const service = mockServices.find((s) => s.id === serviceId);

        if (service) {
          return createApiResponse({
            id: service.id,
            name: service.name,
            status: service.status,
            podsStatus: service.podsStatus || [],
            runningPods: service.runningPods || 0,
            totalPods: service.totalPods || 0,
          });
        }

        return createApiResponse(null, false, '서비스를 찾을 수 없습니다.');
      }

      case 'create':
      case 'update':
      case 'delete': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 서비스를 수정할 수 없습니다.'
        );
      }

      case 'deploy':
      case 'deployService':
      case 'start':
      case 'stop':
      case 'restart': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 서비스를 제어할 수 없습니다.'
        );
      }

      case 'getServiceServers': {
        const serviceId = params?.service_id as number;
        const service = mockServices.find((s) => s.id === serviceId);

        if (service) {
          return createApiResponse({
            id: 1,
            infra_id: service.infra_id,
            server_name: 'server-01',
            hops: service.hops?.String || '[]',
            type: 'worker',
            join_command: '',
          });
        }

        return createApiResponse(null, false, '서버 정보를 찾을 수 없습니다.');
      }

      case 'updateServiceInfra':
      case 'updateServiceInfo':
      case 'updateServiceRegistryConfig':
      case 'updateServiceGitLabToken':
      case 'updateServiceGitLabConfig': {
        return createApiResponse(
          { success: true },
          true,
          'Demo 모드: 서비스 정보가 수정되었습니다 (실제로 수정되지 않음)'
        );
      }

      case 'logs': {
        return createApiResponse({
          logs: `[2026-01-09 08:30:00] INFO: Server started successfully
[2026-01-09 08:30:01] INFO: Connected to database
[2026-01-09 08:30:02] INFO: Health check endpoint ready
[2026-01-09 08:35:00] DEBUG: Processing request: GET /api/v1/users
[2026-01-09 08:35:00] INFO: Request completed: 200 OK
[2026-01-09 08:40:00] WARN: High memory usage detected: 78%
[2026-01-09 08:45:00] DEBUG: Cache hit for key: user:123
[2026-01-09 08:50:00] INFO: Scheduled job executed: cleanup-temp
--- Mock logs end ---`,
        });
      }

      case 'getBuildStatistics': {
        const serviceId = params?.service_id as number;
        return createApiResponse({
          ...mockBuildStatistics,
          service_id: serviceId,
        });
      }

      case 'getMembers': {
        return createApiResponse([
          { user_id: 1, user_email: 'owner@kiwi.com', role: 'admin' },
          { user_id: 2, user_email: 'manager@kiwi.com', role: 'member' },
        ]);
      }

      default:
        console.info(`[Mock Service API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },

  handleProject: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'list-my-gitlab-projects': {
        return createApiResponse([
          { id: 1, name: 'web-api', url: 'https://gitlab.com/kiwi/web-api', default_branch: 'main' },
          { id: 2, name: 'auth-service', url: 'https://gitlab.com/kiwi/auth-service', default_branch: 'main' },
          { id: 3, name: 'frontend-app', url: 'https://gitlab.com/kiwi/frontend-app', default_branch: 'develop' },
          { id: 4, name: 'notification-worker', url: 'https://gitlab.com/kiwi/notification-worker', default_branch: 'main' },
          { id: 5, name: 'data-analytics', url: 'https://gitlab.com/kiwi/data-analytics', default_branch: 'main' },
        ]);
      }

      case 'list-branches': {
        return createApiResponse([
          { name: 'main', default: true },
          { name: 'develop', default: false },
          { name: 'feature/new-feature', default: false },
          { name: 'hotfix/bug-fix', default: false },
        ]);
      }

      case 'list-commits': {
        return createApiResponse([
          { id: 'abc123', message: 'feat: Add new feature', author: 'developer', date: '2026-01-09T08:00:00Z' },
          { id: 'def456', message: 'fix: Bug fix', author: 'developer', date: '2026-01-08T15:00:00Z' },
          { id: 'ghi789', message: 'chore: Update dependencies', author: 'bot', date: '2026-01-07T10:00:00Z' },
        ]);
      }

      default:
        console.info(`[Mock Project API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },

  handlePipeline: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'list': {
        const serviceId = params?.service_id as number | undefined;
        let pipelines = [...mockPipelines];

        if (serviceId) {
          pipelines = pipelines.filter((p) => p.services_id === serviceId);
        }

        return createApiResponse({ data: pipelines });
      }

      case 'get': {
        const pipelineId = params?.pipeline_id as number;
        const pipeline = mockPipelines.find((p) => p.id === pipelineId);

        if (pipeline) {
          return createApiResponse({
            ...pipeline,
            steps: [
              { step_name: 'source', status: 'success', duration_seconds: 30 },
              { step_name: 'build', status: pipeline.status === 'running' ? 'running' : 'success', duration_seconds: 600 },
              { step_name: 'deploy', status: pipeline.status === 'running' ? 'pending' : pipeline.status, duration_seconds: 120 },
            ],
          });
        }

        return createApiResponse(null, false, '파이프라인을 찾을 수 없습니다.');
      }

      case 'execute':
      case 'cancel': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 파이프라인을 실행할 수 없습니다.'
        );
      }

      case 'getLatestByService': {
        const serviceId = params?.service_id as number;
        const pipeline = mockPipelines.find((p) => p.services_id === serviceId);
        return createApiResponse(pipeline || null);
      }

      case 'getBuildStatistics': {
        const serviceId = params?.service_id as number;
        const service = mockServices.find((s) => s.id === serviceId);

        // buildApi.getBuildStatistics expects response.data to be BuildStatistics directly
        return createApiResponse({
          ...mockBuildStatistics,
          service_id: serviceId,
          service_name: service?.name || 'unknown-service',
        });
      }

      default:
        console.info(`[Mock Pipeline API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};