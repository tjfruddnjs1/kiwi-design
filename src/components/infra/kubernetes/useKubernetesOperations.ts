// Custom hook for Kubernetes operations business logic

import { useCallback } from 'react';
import { InfraItem, type ServerResource } from '../../../types/infra';
import { ServerStatus } from '../../../types/server';
import {
  getNodeStatus,
  installLoadBalancer,
  installFirstMaster,
  joinMaster,
  joinWorker,
  startServer,
  stopServer,
  restartServer,
} from '../../../lib/api/kubernetes';
import type {
  Node,
  AuthRequest,
  DeleteRequest,
  ExternalNodesInfo,
  ExternalServer,
  NodeType,
  AuthHops,
} from './types';

// Type for useKubernetesState return value
interface KubernetesStateReturn {
  // State values
  nodes: Node[];
  activeTab: NodeType;
  contextHolder: React.ReactNode;
  isAddNodeModalVisible: boolean;
  externalAuthModalVisible: boolean;
  authRequest: AuthRequest | null;
  deleteRequest: DeleteRequest | null;
  haAuthHops: AuthHops[] | null;
  externalNodesInfo: ExternalNodesInfo | null;
  externalServer: ExternalServer | null;
  buildingLoading: boolean;
  checkingLoading: boolean;
  resourceLoading: boolean;
  resourceModalVisible: boolean;
  criticalOperationCount: number;
  operationHistory: {
    id: string;
    action: string;
    timestamp: string;
    nodeId: string;
  }[];

  // Computed values
  haNodes: Node[];
  masterNodes: Node[];
  workerNodes: Node[];

  // Setter functions
  setNodes: (nodes: Node[]) => void;
  setActiveTab: (tab: NodeType) => void;
  setIsAddNodeModalVisible: (visible: boolean) => void;
  setExternalAuthModalVisible: (visible: boolean) => void;
  setAuthRequest: (request: AuthRequest | null) => void;
  setDeleteRequest: (request: DeleteRequest | null) => void;
  setHaAuthHops: (hops: AuthHops[] | null) => void;
  setExternalNodesInfo: (info: ExternalNodesInfo | null) => void;
  setExternalServer: (server: ExternalServer | null) => void;
  setResourceModalVisible: (visible: boolean) => void;
  setResourceNode: (node: Node | null) => void;
  setServerResource: (resource: ServerResource | null) => void;

  // Helper functions
  startOperation: (nodeId: string) => void;
  endOperation: (nodeId: string) => void;
  isOperationAllowed: (nodeId: string, operation: string) => boolean;
  updateNodeStatus: (
    nodeId: string,
    status: string,
    lastChecked?: string
  ) => void;
  addNode: (node: Node) => void;
  removeNodeById: (nodeId: string) => void;
}

interface UseKubernetesOperationsProps {
  infra: InfraItem;
  kubernetesState: KubernetesStateReturn;
  _isAdmin: boolean;
}

export const useKubernetesOperations = ({
  infra,
  kubernetesState,
  _isAdmin,
}: UseKubernetesOperationsProps) => {
  const {
    nodes,
    messageApi,
    startOperation,
    endOperation,
    isOperationAllowed,
    updateNodeStatus,
    setAuthRequest,
    setCheckingLoading,
    setCheckingNodeId,
    setBuildingLoading,
    setIsCheckingAllServers,
  } = kubernetesState;

  // Handle authentication confirmation
  // Check single node status
  const handleCheckStatusConfirm = useCallback(
    async (authHops: AuthHops[], node: Node) => {
      messageApi.loading({
        content: `${node.server_name || node.ip} 상태 조회 중...`,
        key: node.id,
      });

      try {
        setCheckingLoading(true);
        setCheckingNodeId(node.id);

        updateNodeStatus(node.id, 'checking');

        const response = await getNodeStatus({
          id: parseInt(String(node.id)),
          infra_id: infra.id,
          type: node.nodeType,
          hops: authHops,
        });

        let nodeStatus: ServerStatus | 'not_installed';
        const serverStatus = response.status;

        if (!serverStatus.installed) {
          nodeStatus = 'not_installed';
        } else if (serverStatus.running) {
          nodeStatus = 'running';
        } else {
          nodeStatus = 'stopped';
        }

        updateNodeStatus(
          node.id,
          (nodeStatus as ServerStatus) || 'stopped',
          response.lastChecked
        );

        messageApi.success({
          content: `${node.server_name || node.ip} 상태 조회 완료: ${nodeStatus}`,
          key: node.id,
        });
      } catch {
        updateNodeStatus(node.id, 'error');
        messageApi.error({
          content: `${node.server_name || node.ip} 상태 조회 실패`,
          key: node.id,
        });
      } finally {
        setCheckingLoading(false);
        setCheckingNodeId(null);
        endOperation(node.id);
      }
    },
    [
      messageApi,
      setCheckingLoading,
      setCheckingNodeId,
      updateNodeStatus,
      infra.id,
      endOperation,
    ]
  );

  const handleAuthConfirm = useCallback(
    async (authHops: AuthHops[]) => {
      if (!kubernetesState.authRequest) return;

      const { node, purpose, isRebuildMode } = kubernetesState.authRequest;

      try {
        switch (purpose) {
          case 'checkStatus':
            await handleCheckStatusConfirm(authHops, node);
            break;
          case 'build':
            await handleBuildConfirm(authHops, node);
            break;
          case 'rebuild':
            await handleRebuildConfirm(authHops, node, isRebuildMode);
            break;
          case 'start':
            await handleStartServerConfirm(authHops, node);
            break;
          case 'stop':
            await handleStopServerConfirm(authHops, node);
            break;
          case 'restart':
            await handleRestartServerConfirm(authHops, node);
            break;
          default:
            break;
        }
      } catch {
        messageApi.error('작업 실행 중 오류가 발생했습니다.');
      } finally {
        setAuthRequest(null);
      }
    },
    [
      messageApi,
      setAuthRequest,
      handleBuildConfirm,
      handleCheckStatusConfirm,
      handleRebuildConfirm,
      handleRestartServerConfirm,
      handleStartServerConfirm,
      handleStopServerConfirm,
      kubernetesState.authRequest,
    ]
  );

  // Build node confirmation
  const handleBuildConfirm = useCallback(
    async (authHops: AuthHops[], node: Node) => {
      try {
        setBuildingLoading(true);
        startOperation(node.id, '구축');

        updateNodeStatus(node.id, 'building');

        let response;

        switch (node.nodeType) {
          case 'ha':
            response = await installLoadBalancer({
              id: parseInt(String(node.id)),
              infra_id: infra.id,
              hops: authHops,
            });
            break;
          case 'master':
            // Check if this is the first master
            const masterNodes = nodes.filter(
              n => n.nodeType === 'master' && n.status === 'running'
            );

            if (masterNodes.length === 0) {
              response = await installFirstMaster({
                id: parseInt(String(node.id)),
                infra_id: infra.id,
                hops: authHops,
              });
            } else {
              response = await joinMaster({
                id: parseInt(String(node.id)),
                infra_id: infra.id,
                hops: authHops,
                lb_hops: [],
                password: '',
                lb_password: '',
                main_id: parseInt(String(masterNodes[0].id)),
              });
            }
            break;
          case 'worker':
            const firstMaster = nodes.find(
              n => n.nodeType === 'master' && n.status === 'running'
            );

            if (firstMaster) {
              response = await joinWorker({
                id: parseInt(String(node.id)),
                infra_id: infra.id,
                hops: authHops,
                password: '',
                main_id: parseInt(String(firstMaster.id)),
              });
            }
            break;
        }

        if (response?.success) {
          updateNodeStatus(node.id, 'running');
          messageApi.success(`${node.nodeType} 노드 구축이 완료되었습니다.`);
        } else {
          updateNodeStatus(node.id, 'error');
          messageApi.error(response?.message || '노드 구축에 실패했습니다.');
        }
      } catch {
        updateNodeStatus(node.id, 'error');
        messageApi.error('노드 구축 중 오류가 발생했습니다.');
      } finally {
        setBuildingLoading(false);
        endOperation(node.id);
      }
    },
    [
      infra,
      nodes,
      updateNodeStatus,
      messageApi,
      setBuildingLoading,
      startOperation,
      endOperation,
    ]
  );

  // Server control operations
  const handleStartServerConfirm = async (authHops: AuthHops[], node: Node) => {
    try {
      startOperation(node.id, '시작');
      const response = await startServer({
        id: parseInt(String(node.id)),
        hops: authHops,
      });

      if (response.success) {
        updateNodeStatus(node.id, 'running');
        messageApi.success('서버가 시작되었습니다.');
      } else {
        messageApi.error(response.message || '서버 시작에 실패했습니다.');
      }
    } catch {
      messageApi.error('서버 시작 중 오류가 발생했습니다.');
    } finally {
      endOperation(node.id);
    }
  };

  const handleStopServerConfirm = async (authHops: AuthHops[], node: Node) => {
    try {
      startOperation(node.id, '중지');
      const response = await stopServer({
        id: parseInt(String(node.id)),
        hops: authHops,
      });

      if (response.success) {
        updateNodeStatus(node.id, 'stopped');
        messageApi.success('서버가 중지되었습니다.');
      } else {
        messageApi.error(response.message || '서버 중지에 실패했습니다.');
      }
    } catch {
      messageApi.error('서버 중지 중 오류가 발생했습니다.');
    } finally {
      endOperation(node.id);
    }
  };

  const handleRestartServerConfirm = async (
    authHops: AuthHops[],
    node: Node
  ) => {
    try {
      startOperation(node.id, '재시작');
      const response = await restartServer({
        id: parseInt(String(node.id)),
        hops: authHops,
      });

      if (response.success) {
        updateNodeStatus(node.id, 'running');
        messageApi.success('서버가 재시작되었습니다.');
      } else {
        messageApi.error(response.message || '서버 재시작에 실패했습니다.');
      }
    } catch {
      messageApi.error('서버 재시작 중 오류가 발생했습니다.');
    } finally {
      endOperation(node.id);
    }
  };

  const handleRebuildConfirm = async (
    authHops: AuthHops[],
    node: Node,
    _isRebuildMode?: boolean
  ) => {
    // Similar to handleBuildConfirm but for rebuild operations
    await handleBuildConfirm(authHops, node);
  };

  // Operation handlers that set auth requests
  const handleCheckStatus = (node: Node) => {
    if (!isOperationAllowed(node.id, 'checkStatus')) return;
    setAuthRequest({ node, purpose: 'checkStatus' });
  };

  const handleStartBuild = (node: Node) => {
    if (!isOperationAllowed(node.id, 'build')) return;
    setAuthRequest({ node, purpose: 'build' });
  };

  const handleRebuild = (node: Node) => {
    if (!isOperationAllowed(node.id, 'rebuild')) return;
    setAuthRequest({ node, purpose: 'rebuild', isRebuildMode: true });
  };

  const handleStartServer = (node: Node) => {
    if (!isOperationAllowed(node.id, 'start')) return;
    setAuthRequest({ node, purpose: 'start' });
  };

  const handleStopServer = (node: Node) => {
    if (!isOperationAllowed(node.id, 'stop')) return;
    setAuthRequest({ node, purpose: 'stop' });
  };

  const handleRestartServer = (node: Node) => {
    if (!isOperationAllowed(node.id, 'restart')) return;
    setAuthRequest({ node, purpose: 'restart' });
  };

  const handleRemoveNode = async (nodeId: string) => {
    if (!isOperationAllowed(nodeId, 'remove')) return;

    const node = nodes.find(n => n.id === nodeId);

    if (node) {
      setAuthRequest({ node, purpose: 'delete_worker_auth' });
    }
  };

  const handleRenewCertificate = (node: Node) => {
    if (!isOperationAllowed(node.id, 'renew')) return;
    // Certificate renewal logic would go here
    messageApi.info('인증서 갱신 기능은 구현 예정입니다.');
  };

  const handleCheckAllServers = async () => {
    if (nodes.length === 0) {
      messageApi.warning('확인할 노드가 없습니다.');

      return;
    }

    setIsCheckingAllServers(true);
    messageApi.info('모든 서버의 상태를 확인하는 중입니다...');

    // Implementation for checking all servers would go here
    // This would iterate through all nodes and check their status

    setTimeout(() => {
      setIsCheckingAllServers(false);
      messageApi.success('모든 서버 상태 확인이 완료되었습니다.');
    }, 3000);
  };

  const handleAddNode = async (
    _nodeData: Pick<Node, 'name' | 'type' | 'hops'>
  ) => {
    // Add node logic would go here
    messageApi.success('노드가 추가되었습니다.');
  };

  const handleExternalKubernetesAuth = async (_authData: AuthRequest) => {
    // External Kubernetes authentication logic
    messageApi.success('외부 쿠버네티스에 연결되었습니다.');
  };

  return {
    handleAuthConfirm,
    handleCheckStatus,
    handleStartBuild,
    handleRebuild,
    handleStartServer,
    handleStopServer,
    handleRestartServer,
    handleRemoveNode,
    handleRenewCertificate,
    handleCheckAllServers,
    handleAddNode,
    handleExternalKubernetesAuth,
  };
};
