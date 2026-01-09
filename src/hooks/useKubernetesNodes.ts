import { useState, useCallback } from 'react';
import { message } from 'antd';
import * as kubernetesApi from '../lib/api/kubernetes';
import { logger } from '../utils/logger';

interface Node {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  status: string;
  last_checked?: string;
  hops: string;
}

// 서버 정보 타입
interface ServerInfo {
  id: number;
  type: string;
  ip?: string;
  port?: number;
  server_name?: string;
  status?: string;
  last_checked?: string;
  hops: string;
}

export const useKubernetesNodes = (infraId: number) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 노드 목록 가져오기
  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await kubernetesApi.getServers(infraId);

      if (response && Array.isArray(response)) {
        setNodes(
          response.map((server: ServerInfo) => ({
            id: server.id.toString(),
            nodeType: server.type,
            ip: server.ip || '',
            port: server.port?.toString() || '22',
            server_name: server.server_name || '',
            status: server.status || 'inactive',
            last_checked: server.last_checked || '',
            hops: server.hops,
          }))
        );
      }
    } catch (error) {
      logger.error('노드 목록 가져오기 실패:', error as Error);
      messageApi.error('노드 목록을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [infraId, messageApi]);

  // 노드 추가
  const addNode = useCallback(async () => {
    try {
      // 노드 추가 API 호출 - 임시로 성공 응답 반환
      const response = { success: true };

      if (response.success) {
        messageApi.success('노드가 추가되었습니다.');
        await fetchNodes(); // 노드 목록 새로고침

        return { success: true };
      } else {
        throw new Error('노드 추가에 실패했습니다.');
      }
    } catch (error) {
      logger.error('노드 추가 실패:', error as Error);
      messageApi.error('노드 추가에 실패했습니다.');

      return { success: false, error };
    }
  }, [fetchNodes, messageApi]);

  // 노드 삭제
  const deleteNode = useCallback(
    async (
      node: Node,
      authData: {
        username: string;
        password: string;
        mainUsername?: string;
        mainPassword?: string;
      }
    ) => {
      try {
        if (node.nodeType === 'worker') {
          // 워커 노드 삭제
          const response = await kubernetesApi.deleteWorker({
            id: Number(node.id),
            infra_id: infraId,
            main_id: infraId,
            password: authData.password,
            main_password: authData.mainPassword || '',
            hops: JSON.parse(node.hops || '[]'),
            main_hops: JSON.parse(node.hops || '[]'),
          });

          if (response.success) {
            messageApi.success('워커 노드가 삭제되었습니다.');
            await fetchNodes();

            return { success: true };
          } else {
            throw new Error(response.error || '워커 노드 삭제에 실패했습니다.');
          }
        } else if (node.nodeType === 'master') {
          // 마스터 노드 삭제
          const response = await kubernetesApi.removeNode({
            id: Number(node.id),
            hops: JSON.parse(node.hops || '[]'),
            nodeName: node.server_name || '',
          });

          if (response.success) {
            messageApi.success('마스터 노드가 삭제되었습니다.');
            await fetchNodes();

            return { success: true };
          } else {
            throw new Error(
              response.error || '마스터 노드 삭제에 실패했습니다.'
            );
          }
        } else {
          throw new Error('지원되지 않는 노드 타입입니다.');
        }
      } catch (error) {
        logger.error('노드 삭제 실패:', error as Error);
        messageApi.error('노드 삭제에 실패했습니다.');

        return { success: false, error };
      }
    },
    [infraId, fetchNodes, messageApi]
  );

  // 노드 시작
  const startNode = useCallback(
    async (node: Node) => {
      try {
        const response = await kubernetesApi.startServer({
          id: Number(node.id),
          hops: JSON.parse(node.hops || '[]'),
        });

        if (response.success) {
          messageApi.success('노드가 시작되었습니다.');
          await fetchNodes();

          return { success: true };
        } else {
          throw new Error(response.error || '노드 시작에 실패했습니다.');
        }
      } catch (error) {
        logger.error('노드 시작 실패:', error as Error);
        messageApi.error('노드 시작에 실패했습니다.');

        return { success: false, error };
      }
    },
    [fetchNodes, messageApi]
  );

  // 노드 중지
  const stopNode = useCallback(
    async (node: Node) => {
      try {
        const response = await kubernetesApi.stopServer({
          id: Number(node.id),
          hops: JSON.parse(node.hops || '[]'),
        });

        if (response.success) {
          messageApi.success('노드가 중지되었습니다.');
          await fetchNodes();

          return { success: true };
        } else {
          throw new Error(response.error || '노드 중지에 실패했습니다.');
        }
      } catch (error) {
        logger.error('노드 중지 실패:', error as Error);
        messageApi.error('노드 중지에 실패했습니다.');

        return { success: false, error };
      }
    },
    [fetchNodes, messageApi]
  );

  // 노드 재시작
  const restartNode = useCallback(
    async (node: Node) => {
      try {
        const response = await kubernetesApi.restartServer({
          id: Number(node.id),
          hops: JSON.parse(node.hops || '[]'),
        });

        if (response.success) {
          messageApi.success('노드가 재시작되었습니다.');
          await fetchNodes();

          return { success: true };
        } else {
          throw new Error(response.error || '노드 재시작에 실패했습니다.');
        }
      } catch (error) {
        logger.error('노드 재시작 실패:', error as Error);
        messageApi.error('노드 재시작에 실패했습니다.');

        return { success: false, error };
      }
    },
    [fetchNodes, messageApi]
  );

  // 노드 상태 확인
  const checkNodeStatus = useCallback(
    async (node: Node) => {
      try {
        const response = await kubernetesApi.getNodeStatus({
          id: Number(node.id),
          infra_id: infraId,
          type: node.nodeType,
          hops: JSON.parse(node.hops || '[]'),
        });

        if (response && response.status) {
          messageApi.success('노드 상태를 확인했습니다.');
          await fetchNodes();

          return { success: true, status: response.status };
        } else {
          throw new Error('노드 상태 확인에 실패했습니다.');
        }
      } catch (error) {
        logger.error('노드 상태 확인 실패:', error as Error);
        messageApi.error('노드 상태 확인에 실패했습니다.');

        return { success: false, error };
      }
    },
    [infraId, fetchNodes, messageApi]
  );

  return {
    // 상태
    nodes,
    loading,
    messageApi,
    contextHolder,

    // 액션
    fetchNodes,
    addNode,
    deleteNode,
    startNode,
    stopNode,
    restartNode,
    checkNodeStatus,
  };
};
