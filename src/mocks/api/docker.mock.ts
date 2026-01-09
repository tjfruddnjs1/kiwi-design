/**
 * Mock Docker API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockDockerContainers,
  mockDockerImages,
  mockDockerVolumes,
  mockDockerNetworks,
  mockDockerServer,
  mockDockerSystemInfo,
  mockContainerStats,
} from '../data/docker';

export const mockDockerApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      // Server Management
      case 'getDockerServer': {
        return createApiResponse(mockDockerServer);
      }

      case 'createDockerServer':
      case 'updateDockerServer': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 Docker 서버를 수정할 수 없습니다.'
        );
      }

      case 'checkDockerServerStatus': {
        return createApiResponse({
          status: 'active',
          version: mockDockerSystemInfo.serverVersion,
          containers_running: mockDockerSystemInfo.containersRunning,
          last_checked: new Date().toISOString(),
        });
      }

      // Info
      case 'getDockerInfo': {
        return createApiResponse(mockDockerSystemInfo);
      }

      case 'getDockerSystemInfo': {
        return createApiResponse(mockDockerSystemInfo);
      }

      // Containers
      case 'getContainers': {
        const all = params?.all as boolean | undefined;
        let containers = [...mockDockerContainers];

        if (!all) {
          containers = containers.filter((c) => c.state === 'running');
        }

        return createApiResponse(containers);
      }

      case 'startContainer':
      case 'controlContainer':
      case 'removeContainer': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 컨테이너를 제어할 수 없습니다.'
        );
      }

      case 'getContainerStats': {
        const containerName = params?.container_name as string | undefined;

        if (containerName && mockContainerStats[containerName as keyof typeof mockContainerStats]) {
          return createApiResponse(mockContainerStats[containerName as keyof typeof mockContainerStats]);
        }

        return createApiResponse({
          cpu_percent: 0,
          memory_usage: '0MB',
          memory_limit: '0MB',
          memory_percent: 0,
          network_rx: '0B',
          network_tx: '0B',
        });
      }

      // Images
      case 'getDockerImages': {
        return createApiResponse(mockDockerImages);
      }

      // Volumes
      case 'getDockerVolumes': {
        return createApiResponse(mockDockerVolumes);
      }

      // Networks
      case 'getDockerNetworks': {
        return createApiResponse(mockDockerNetworks);
      }

      // Installation
      case 'installDocker':
      case 'uninstallDocker': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 Docker를 설치/제거할 수 없습니다.'
        );
      }

      // Compose
      case 'createContainer':
      case 'redeployCompose': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 Compose를 배포할 수 없습니다.'
        );
      }

      // Logs
      case 'getDockerLogs': {
        const containerName = params?.container_name as string | undefined;
        return createApiResponse({
          logs: `[Container: ${containerName || 'unknown'}]
2026-01-09T08:00:00.000Z [INFO] Container started
2026-01-09T08:00:01.000Z [INFO] Application initializing...
2026-01-09T08:00:02.000Z [INFO] Listening on port 8080
2026-01-09T08:30:00.000Z [DEBUG] Received request
2026-01-09T08:30:00.100Z [INFO] Request processed successfully
2026-01-09T08:45:00.000Z [WARN] Memory usage at 75%
--- Mock logs end ---`,
        });
      }

      // Commands
      case 'executeDockerCommand': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 Docker 명령을 실행할 수 없습니다.'
        );
      }

      // Cleanup
      case 'pruneDockerResources': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 리소스를 정리할 수 없습니다.'
        );
      }

      // Import
      case 'importDockerInfra': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 Docker 인프라를 가져올 수 없습니다.'
        );
      }

      default:
        console.info(`[Mock Docker API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};
