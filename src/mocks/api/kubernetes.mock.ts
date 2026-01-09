/**
 * Mock Kubernetes API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockKubernetesPods,
  mockKubernetesDeployments,
  mockKubernetesServices,
  mockKubernetesIngresses,
  mockPodLogs,
  mockNodeStatus,
} from '../data/kubernetes';
import { mockClusterInfo, mockNamespaces, mockInfrastructures, mockServers } from '../data/infrastructure';

export const mockKubernetesApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      // ==================== Infrastructure Management ====================
      case 'getInfras': {
        // organization_id 필터링은 Demo 모드에서 무시하고 전체 인프라 반환
        // 프론트엔드가 payload?.success && Array.isArray(payload.data) 확인하므로 중첩 구조 반환
        return createApiResponse({ success: true, data: mockInfrastructures });
      }

      case 'getInfraStatusById': {
        const infraId = params?.id as number;
        const infra = mockInfrastructures.find((i) => i.id === infraId);
        return createApiResponse(infra?.status || 'unknown');
      }

      case 'createInfra':
      case 'updateInfra':
      case 'deleteInfra': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 인프라를 수정할 수 없습니다.'
        );
      }

      // ==================== Server Management ====================
      case 'getServers': {
        const infraId = params?.infra_id as number | undefined;
        let servers = [...mockServers];

        if (infraId) {
          servers = servers.filter((s) => s.infra_id === infraId);
        }

        // 프론트엔드가 response.data.success && response.data.data 체크하므로 중첩 구조 반환
        return createApiResponse({ success: true, data: servers });
      }

      case 'getServerById': {
        const serverId = params?.id as number;
        const server = mockServers.find((s) => Number(s.id) === serverId);
        return createApiResponse(server || null);
      }

      case 'getMasterNodeByInfraID': {
        const infraId = params?.infraId as number;
        const masterServer = mockServers.find(
          (s) => s.infra_id === infraId && s.type.includes('master')
        );
        return createApiResponse(masterServer || null);
      }

      case 'createServer':
      case 'updateServer':
      case 'deleteServer':
      case 'deleteWorker':
      case 'deleteMaster': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 서버를 수정할 수 없습니다.'
        );
      }

      case 'updateLastChecked': {
        return createApiResponse({ success: true });
      }

      // ==================== Node Management ====================
      case 'getNodeStatus': {
        return createApiResponse(mockNodeStatus);
      }

      case 'installLoadBalancer':
      case 'installFirstMaster':
      case 'joinMaster':
      case 'joinWorker':
      case 'removeNode': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 노드 관리를 수행할 수 없습니다.'
        );
      }

      // Server Control
      case 'startServer':
      case 'stopServer':
      case 'restartServer': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 서버를 제어할 수 없습니다.'
        );
      }

      // Cluster Info
      case 'calculateResources':
      case 'getClusterInfo': {
        return createApiResponse(mockClusterInfo);
      }

      case 'calculateNodes': {
        return createApiResponse(mockNodeStatus);
      }

      case 'getClusterStatus': {
        return createApiResponse({
          status: 'healthy',
          nodes: mockNodeStatus.length,
          readyNodes: mockNodeStatus.filter((n) => n.status === 'Ready').length,
          pods: mockKubernetesPods.length,
          runningPods: mockKubernetesPods.filter((p) => p.status === 'Running').length,
        });
      }

      // Namespace & Pod
      case 'getNamespaceAndPodStatus': {
        const namespace = params?.namespace as string | undefined;
        let pods = [...mockKubernetesPods];

        if (namespace) {
          pods = pods.filter((p) => p.namespace === namespace);
        }

        return createApiResponse({
          namespaces: mockNamespaces,
          pods: pods,
        });
      }

      case 'getAllNamespaces': {
        return createApiResponse(mockNamespaces);
      }

      case 'createNamespace':
      case 'deleteNamespace': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 네임스페이스를 관리할 수 없습니다.'
        );
      }

      case 'getPodLogs': {
        return createApiResponse({
          logs: mockPodLogs,
          pod_name: params?.pod_name || 'unknown-pod',
          namespace: params?.namespace || 'default',
        });
      }

      case 'restartPod':
      case 'deletePod': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 Pod를 제어할 수 없습니다.'
        );
      }

      case 'getPodDetails': {
        const podName = params?.pod_name as string;
        const pod = mockKubernetesPods.find((p) => p.name === podName);

        if (pod) {
          return createApiResponse({
            ...pod,
            containers: [
              {
                name: 'main',
                image: pod.image,
                status: pod.status,
                ready: pod.ready,
                restartCount: pod.restarts,
              },
            ],
            events: [
              { type: 'Normal', reason: 'Scheduled', message: 'Successfully scheduled', timestamp: '2026-01-09T08:00:00Z' },
              { type: 'Normal', reason: 'Pulled', message: 'Container image pulled', timestamp: '2026-01-09T08:00:05Z' },
              { type: 'Normal', reason: 'Started', message: 'Container started', timestamp: '2026-01-09T08:00:10Z' },
            ],
          });
        }

        return createApiResponse(null, false, 'Pod를 찾을 수 없습니다.');
      }

      // Deployment
      case 'deployKubernetes':
      case 'redeployKubernetes': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 배포를 수행할 수 없습니다.'
        );
      }

      case 'get-last-deployment-time': {
        return createApiResponse({
          last_deployment: '2026-01-09T07:45:00Z',
          deployed_by: 'owner@kiwi.com',
        });
      }

      case 'getDeploymentStatus': {
        const deploymentName = params?.deployment_name as string | undefined;
        const deployment = mockKubernetesDeployments.find((d) => d.name === deploymentName);

        if (deployment) {
          return createApiResponse(deployment);
        }

        return createApiResponse({
          name: deploymentName,
          status: 'unknown',
          replicas: 0,
          availableReplicas: 0,
        });
      }

      case 'rollbackDeployment': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 롤백을 수행할 수 없습니다.'
        );
      }

      // Services & Ingresses
      case 'getServices': {
        const namespace = params?.namespace as string | undefined;
        let services = [...mockKubernetesServices];

        if (namespace) {
          services = services.filter((s) => s.namespace === namespace);
        }

        return createApiResponse(services);
      }

      case 'getIngresses': {
        const namespace = params?.namespace as string | undefined;
        let ingresses = [...mockKubernetesIngresses];

        if (namespace) {
          ingresses = ingresses.filter((i) => i.namespace === namespace);
        }

        return createApiResponse(ingresses);
      }

      // Pods list
      case 'getPods': {
        const namespace = params?.namespace as string | undefined;
        let pods = [...mockKubernetesPods];

        if (namespace) {
          pods = pods.filter((p) => p.namespace === namespace);
        }

        return createApiResponse(pods);
      }

      // Deployments list
      case 'getDeployments': {
        const namespace = params?.namespace as string | undefined;
        let deployments = [...mockKubernetesDeployments];

        if (namespace) {
          deployments = deployments.filter((d) => d.namespace === namespace);
        }

        return createApiResponse(deployments);
      }

      // SSH Connection Test
      case 'testSSHConnection': {
        return createApiResponse({
          success: true,
          message: 'SSH 연결 테스트 성공 (Mock)',
        });
      }

      // External Kubernetes Test
      case 'testExternalKubernetes': {
        return createApiResponse({
          success: true,
          message: '외부 Kubernetes 연결 테스트 성공 (Mock)',
          version: 'v1.28.0',
        });
      }

      default:
        console.info(`[Mock Kubernetes API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};
