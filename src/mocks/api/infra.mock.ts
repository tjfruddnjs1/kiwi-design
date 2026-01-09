/**
 * Mock Infrastructure API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockInfrastructures,
  mockServers,
  mockClusterInfo,
  mockNamespaces,
  mockServerResources,
} from '../data/infrastructure';

export const mockInfraApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'list': {
        // services/api.ts의 convertApiResponse가 추가 래핑하므로 flat 구조 반환
        // 최종: { data: { success, data: [...] } } -> response.data?.data = [...]
        return createApiResponse(mockInfrastructures);
      }

      case 'list-build-infras': {
        // 빌드 가능한 인프라만 반환 (kubernetes, docker, podman)
        const buildableInfras = mockInfrastructures.filter(
          (infra) => ['kubernetes', 'docker', 'podman'].includes(infra.type)
        );
        return createApiResponse(buildableInfras);
      }

      case 'getById': {
        const infraId = params?.infra_id as number;
        const infra = mockInfrastructures.find((i) => i.id === infraId);
        if (infra) {
          return createApiResponse(infra);
        }
        return createApiResponse(null, false, '인프라를 찾을 수 없습니다.');
      }

      case 'create': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 인프라를 생성할 수 없습니다.'
        );
      }

      case 'update': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 인프라를 수정할 수 없습니다.'
        );
      }

      case 'delete': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 인프라를 삭제할 수 없습니다.'
        );
      }

      case 'list-servers': {
        const infraId = params?.infra_id as number | undefined;
        if (infraId) {
          return createApiResponse(mockServers.filter((s) => s.infra_id === infraId));
        }
        return createApiResponse(mockServers);
      }

      case 'create-server':
      case 'update-server':
      case 'delete-server': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 서버를 수정할 수 없습니다.'
        );
      }

      case 'check-server-status': {
        const serverId = params?.server_id as string | undefined;
        const server = mockServers.find((s) => String(s.id) === String(serverId));
        return createApiResponse({
          server_id: serverId,
          status: server?.status || 'unknown',
          last_checked: new Date().toISOString(),
        });
      }

      case 'getInfraPermissions': {
        const infraId = params?.infra_id as number;
        return createApiResponse([
          { user_id: 1, user_email: 'owner@kiwi.com', role: 'admin' },
          { user_id: 2, user_email: 'manager@kiwi.com', role: 'member' },
        ]);
      }

      case 'setInfraPermission':
      case 'removeInfraPermission': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 권한을 수정할 수 없습니다.'
        );
      }

      case 'test-external-kubernetes':
      case 'test-external-docker': {
        return createApiResponse({
          success: true,
          message: '연결 테스트 성공 (Mock)',
          details: {
            version: '1.28.0',
            status: 'healthy',
          },
        });
      }

      case 'validationImportData': {
        return createApiResponse({
          valid: true,
          warnings: [],
          errors: [],
        });
      }

      case 'get-resource-usage': {
        return createApiResponse(mockServerResources);
      }

      case 'get-status-summary': {
        return createApiResponse({
          total_infras: mockInfrastructures.length,
          active_infras: mockInfrastructures.filter((i) => i.status === 'active').length,
          total_servers: mockServers.length,
          active_servers: mockServers.filter((s) => s.status === 'active').length,
        });
      }

      case 'get-cluster-info': {
        return createApiResponse(mockClusterInfo);
      }

      case 'get-namespaces': {
        return createApiResponse(mockNamespaces);
      }

      default:
        console.info(`[Mock Infra API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};