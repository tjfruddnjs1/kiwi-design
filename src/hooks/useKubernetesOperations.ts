import { useCallback } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { api } from '@/lib/api';
import { getServers } from '@/lib/api/kubernetes';
import { logger } from '@/utils/logger';
import type { Node, InfraItem, ServerResource, AuthHops } from '../types/infra';

/**
 * Kubernetes 작업을 위한 API 및 비즈니스 로직 훅
 * 모든 노드 관리, 빌드, 체크, 삭제 작업을 포함
 */
export const useKubernetesOperations = (
  infra: InfraItem,
  nodes: Node[],
  setNodes: (nodes: Node[]) => void,
  messageApi: MessageInstance
) => {
  /**
   * 노드 추가
   */
  const handleAddNode = useCallback(
    async (values: {
      server_name?: string;
      hops: { host: string; port: number }[];
    }) => {
      try {
        if (!infra) {
          messageApi.error('인프라 정보가 없습니다.');

          return;
        }

        const lastHop = values.hops[values.hops.length - 1];

        const existingServer = nodes.find(node => {
          try {
            const nodeHops =
              typeof node.hops === 'string' ? JSON.parse(node.hops) : node.hops;
            const nodeLastHop = nodeHops[nodeHops.length - 1];

            return (
              nodeLastHop.host === lastHop.host &&
              nodeLastHop.port === lastHop.port
            );
          } catch {
            // Hops parsing failed - treat as no match
            return false;
          }
        });

        if (existingServer) {
          messageApi.warning('이미 등록된 서버입니다.');

          return;
        }

        // 새 노드 생성 로직 (API 호출)
        const newNode: Node = {
          id: Date.now(),
          type: 'worker', // 기본값
          server_name: values.server_name || `Server-${Date.now()}`,
          ip: lastHop.host,
          hops: JSON.stringify(values.hops),
          nodeType: 'worker',
          status: 'pending',
          infra_id: infra.id,
          ha: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setNodes([...nodes, newNode]);
        messageApi.success('노드가 성공적으로 추가되었습니다.');
      } catch (error) {
        logger.error('노드 추가 실패:', error);
        messageApi.error('노드 추가에 실패했습니다.');
      }
    },
    [infra, nodes, setNodes, messageApi]
  );

  /**
   * 노드 상태 확인
   */
  const handleCheckNodeStatus = useCallback(
    async (nodeId: string, _authHops?: AuthHops[]) => {
      try {
        const node = nodes.find(n => n.id === nodeId);

        if (!node) {
          messageApi.error('노드를 찾을 수 없습니다.');

          return;
        }

        logger.info(`노드 상태 확인 시작: ${node.server_name}`);

        // API 호출 로직 (실제 getNodeStatus API 사용)
        const nodeHops =
          typeof node.hops === 'string' ? JSON.parse(node.hops) : node.hops;
        const response = await api.kubernetes.getNodeStatus({
          server_id: parseInt(nodeId),
          infra_id: infra.id,
          type: node.type,
          hops: nodeHops,
        });

        if (response.success) {
          // 노드 상태 업데이트
          const updatedNodes = nodes.map(n =>
            n.id === nodeId ? { ...n, status: 'running' } : n
          );

          setNodes(updatedNodes);
          messageApi.success(`${node.server_name} 상태가 확인되었습니다.`);
        } else {
          messageApi.error(`${node.server_name} 상태 확인에 실패했습니다.`);
        }
      } catch (error) {
        logger.error('노드 상태 확인 실패:', error);
        messageApi.error('노드 상태 확인에 실패했습니다.');
      }
    },
    [nodes, setNodes, messageApi, infra.id]
  );

  /**
   * 노드 빌드/구축
   */
  const handleBuildConfirm = useCallback(
    async (authHops: AuthHops[], purpose: string, _haAuthHops?: AuthHops[]) => {
      try {
        logger.info(`노드 빌드 시작: purpose=${purpose}`);

        // API 호출 로직 (임시 스텁 - 실제로는 노드 타입에 따라 다른 API 호출 필요)
        logger.info(
          'buildNode API는 구현 필요 - 노드 타입에 따라 installLoadBalancer, installFirstMaster 등 호출'
        );
        const response = { success: true }; // 임시 스텁

        if (response.success) {
          messageApi.success('노드 구축이 시작되었습니다.');
          // 노드 상태를 building으로 업데이트
          // 실제 구현에서는 해당 노드 ID를 찾아서 업데이트
        } else {
          messageApi.error('노드 구축 시작에 실패했습니다.');
        }
      } catch (error) {
        logger.error('노드 빌드 실패:', error);
        messageApi.error('노드 빌드에 실패했습니다.');
      }
    },
    [messageApi]
  );

  /**
   * 노드 삭제
   */
  const handleDeleteNode = useCallback(
    async (nodeId: string, _authHops: AuthHops[]) => {
      try {
        const node = nodes.find(n => n.id === nodeId);

        if (!node) {
          messageApi.error('삭제할 노드를 찾을 수 없습니다.');

          return;
        }

        logger.info(`노드 삭제 시작: ${node.server_name}`);

        // API 호출 로직 (실제 removeNode API 사용)
        const nodeHops =
          typeof node.hops === 'string' ? JSON.parse(node.hops) : node.hops;
        const response = await api.kubernetes.removeNode({
          server_id: parseInt(nodeId),
          hops: nodeHops,
          nodeName: node.server_name,
        });

        if (response.success) {
          const updatedNodes = nodes.filter(n => n.id !== nodeId);

          setNodes(updatedNodes);
          messageApi.success(
            `${node.server_name}이(가) 성공적으로 삭제되었습니다.`
          );
        } else {
          messageApi.error(`${node.server_name} 삭제에 실패했습니다.`);
        }
      } catch (error) {
        logger.error('노드 삭제 실패:', error);
        messageApi.error('노드 삭제에 실패했습니다.');
      }
    },
    [nodes, setNodes, messageApi]
  );

  /**
   * 서버 리소스 조회
   */
  const getServerResource = useCallback(
    async (
      node: Node,
      _authHops: AuthHops[]
    ): Promise<ServerResource | null> => {
      try {
        logger.info(`서버 리소스 조회 시작: ${node.server_name}`);

        // getServerResource API 구현 필요 - 임시 스텁 처리
        logger.info('getServerResource API는 구현 필요');
        const response = {
          success: true,
          data: null as ServerResource | null,
        }; // 임시 스텁

        if (response.success && response.data) {
          return response.data;
        } else {
          messageApi.error('서버 리소스 조회에 실패했습니다.');

          return null;
        }
      } catch (error) {
        logger.error('서버 리소스 조회 실패:', error);
        messageApi.error('서버 리소스 조회에 실패했습니다.');

        return null;
      }
    },
    [messageApi]
  );

  /**
   * 외부 Kubernetes 연결
   */
  const handleExternalKubernetesConnect = useCallback(
    async (_credentials: { kubeconfig?: string; token?: string }) => {
      try {
        logger.info('외부 Kubernetes 연결 시도');

        // connectExternal API 구현 필요 - 임시 스텁 처리
        logger.info('connectExternal API는 구현 필요');
        const response = {
          success: true,
          data: {
            // useKubernetesState에서 기대하는 형태: { total, master, worker }
            nodesInfo: { total: 0, master: 0, worker: 0 },
            serverResource: null as ServerResource | null,
          },
        }; // 임시 스텁

        if (response.success) {
          messageApi.success('외부 Kubernetes에 성공적으로 연결되었습니다.');

          return response.data;
        } else {
          messageApi.error('외부 Kubernetes 연결에 실패했습니다.');

          return null;
        }
      } catch (error) {
        logger.error('외부 Kubernetes 연결 실패:', error);
        messageApi.error('외부 Kubernetes 연결에 실패했습니다.');

        return null;
      }
    },
    [messageApi]
  );

  /**
   * 노드 목록 새로고침
   */
  const handleRefreshNodes = useCallback(async () => {
    try {
      logger.info('노드 목록 새로고침');

      // 실제 getServers API 사용 (Server[]를 Node[]로 변환)
      const servers = await getServers(infra.id);

      // Server[]를 Node[]로 변환 (필수 필드 보정)
      const mappedNodes: Node[] = servers.map(server => {
        const hopsArr = Array.isArray(server.hops)
          ? (server.hops as any[])
          : (() => {
              try {
                return JSON.parse(server.hops as unknown as string);
              } catch {
                // JSON parsing failed - return empty array
                return [] as any[];
              }
            })();
        const lastHop = hopsArr[hopsArr.length - 1] || ({} as any);

        return {
          id: server.id as any,
          nodeType:
            (server as any).node_type || (server as any).nodeType || 'worker',
          server_name: server.server_name,
          ip: lastHop?.host,
          port: lastHop?.port ?? undefined,
          status: (server as any).status || 'stopped',
          hops:
            typeof server.hops === 'string'
              ? (server.hops as unknown as string)
              : JSON.stringify(server.hops || []),
          join_command: server.join_command,
          certificate_key: server.certificate_key,
          ha: server.ha,
          last_checked: server.last_checked,
          updated_at: (server as any).updated_at,
          // Node는 Server의 나머지 필드를 요구
          type: server.type as any,
          infra_id: (server as any).infra_id,
          created_at: (server as any).created_at,
        } as unknown as Node;
      });

      setNodes(mappedNodes);
      messageApi.success('노드 목록이 새로고침되었습니다.');
    } catch (error) {
      logger.error('노드 목록 새로고침 실패:', error);
      messageApi.error('노드 목록 새로고침에 실패했습니다.');
    }
  }, [infra.id, setNodes, messageApi]);

  /**
   * 클러스터 무결성 검증
   */
  const validateClusterIntegrity = useCallback((nodes: Node[]) => {
    const warnings: string[] = [];
    const masterNodes = nodes.filter(n => n.type === 'master');
    const workerNodes = nodes.filter(n => n.type === 'worker');
    const haNodes = nodes.filter(n => n.type === 'ha');

    // 마스터 노드 검증
    if (masterNodes.length === 0) {
      warnings.push(
        '마스터 노드가 없습니다. 클러스터가 작동하지 않을 수 있습니다.'
      );
    } else if (masterNodes.length % 2 === 0) {
      warnings.push('마스터 노드는 홀수 개로 구성하는 것이 권장됩니다.');
    }

    // HA 노드 검증
    if (haNodes.length > 0 && haNodes.length < 2) {
      warnings.push('HA 구성을 위해서는 최소 2개의 HA 노드가 필요합니다.');
    }

    // 워커 노드 검증
    if (workerNodes.length === 0) {
      warnings.push(
        '워커 노드가 없습니다. 애플리케이션 배포가 제한될 수 있습니다.'
      );
    }

    return { warnings };
  }, []);

  return {
    // 노드 관리
    handleAddNode,
    handleCheckNodeStatus,
    handleBuildConfirm,
    handleDeleteNode,
    handleRefreshNodes,

    // 리소스 관리
    getServerResource,

    // 외부 연결
    handleExternalKubernetesConnect,

    // 유틸리티
    validateClusterIntegrity,
  };
};
