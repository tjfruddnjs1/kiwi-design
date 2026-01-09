// Custom hook for managing Kubernetes infrastructure state

import { useState } from 'react';
import { message } from 'antd';
import {
  Node,
  NodeType,
  AuthRequest,
  DeleteRequest,
  ExternalNodesInfo,
  HACredentials,
  PendingMasterBuild,
  ServerCredential,
  NodeTypeStatus,
  ExternalServer,
} from './types';
import { AuthHops } from '../../../lib/api';

export const useKubernetesState = (initialNodes: Node[] = []) => {
  // Core state
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [activeTab, setActiveTab] = useState<NodeType>('ha');
  const [messageApi, contextHolder] = message.useMessage();

  // Modal states
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false);
  const [isHACredentialsModalVisible, setIsHACredentialsModalVisible] =
    useState(false);
  const [externalAuthModalVisible, setExternalAuthModalVisible] =
    useState(false);

  // Operation states
  const [buildingNode, setBuildingNode] = useState<Node | null>(null);
  const [checkingNode, setCheckingNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [checkingLoading, setCheckingLoading] = useState(false);
  const [checkingNodeId, setCheckingNodeId] = useState<string | null>(null);
  const [isRebuildMode, setIsRebuildMode] = useState(false);
  const [isCheckingAllServers, setIsCheckingAllServers] = useState(false);
  const [isMainMasterCreating, setIsMainMasterCreating] = useState(false);

  // Operation tracking
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(
    new Set()
  );
  const [pendingOperations, setPendingOperations] = useState<{
    [nodeId: string]: string;
  }>({});
  const [lastOperationTime, setLastOperationTime] = useState<{
    [nodeId: string]: number;
  }>({});

  // Authentication and credentials
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
  const [haAuthHops, setHaAuthHops] = useState<AuthHops[] | null>(null);
  const [haCredentials, setHaCredentials] = useState<HACredentials | null>(
    null
  );
  const [serverCredentials, setServerCredentials] = useState<
    ServerCredential[]
  >([]);

  // Complex operation states
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(
    null
  );
  const [pendingMasterBuild, setPendingMasterBuild] =
    useState<PendingMasterBuild | null>(null);

  // External Kubernetes states
  const [externalServer, setExternalServer] = useState<ExternalServer | null>(
    null
  );
  const [externalNodesInfo, setExternalNodesInfo] =
    useState<ExternalNodesInfo | null>(null);

  // Status tracking
  const [nodeTypeStatuses, setNodeTypeStatuses] = useState<NodeTypeStatus>({});

  // Operation helpers
  const startOperation = (nodeId: string, operationType: string) => {
    setOperationsInProgress(prev => new Set([...Array.from(prev), nodeId]));
    setPendingOperations(prev => ({ ...prev, [nodeId]: operationType }));
    setLastOperationTime(prev => ({ ...prev, [nodeId]: Date.now() }));
  };

  const endOperation = (nodeId: string) => {
    setOperationsInProgress(prev => {
      const newSet = new Set(prev);

      newSet.delete(nodeId);

      return newSet;
    });
    setPendingOperations(prev => {
      const { [nodeId]: __, ...rest } = prev;

      return rest;
    });
  };

  const isOperationAllowed = (
    nodeId: string,
    _operationType: string
  ): boolean => {
    const lastTime = lastOperationTime[nodeId];
    const now = Date.now();
    const timeDiff = now - (lastTime || 0);

    // 최소 3초 간격으로 작업 허용
    if (timeDiff < 3000) {
      messageApi.warning(
        `작업 간격이 너무 짧습니다. ${Math.ceil((3000 - timeDiff) / 1000)}초 후 다시 시도해주세요.`
      );

      return false;
    }

    if (operationsInProgress.has(nodeId)) {
      const currentOp = pendingOperations[nodeId];

      messageApi.warning(
        `${currentOp} 작업이 진행 중입니다. 작업이 완료된 후 다시 시도해주세요.`
      );

      return false;
    }

    return true;
  };

  const updateNodeStatus = (
    nodeId: string,
    status: string,
    lastChecked?: string
  ) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              status: status.status || status,
              last_checked: lastChecked || new Date().toISOString(),
            }
          : node
      )
    );
  };

  const addNode = (newNode: Node) => {
    setNodes(prev => [...prev, newNode]);
  };

  const removeNodeById = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
  };

  const updateNode = (nodeId: string, updates: Partial<Node>) => {
    setNodes(prev =>
      prev.map(node => (node.id === nodeId ? { ...node, ...updates } : node))
    );
  };

  // Reset functions
  const resetAuthStates = () => {
    setAuthRequest(null);
    setHaAuthHops(null);
    setDeleteRequest(null);
    setPendingMasterBuild(null);
  };

  const resetModalStates = () => {
    setIsAddNodeModalVisible(false);
    setIsHACredentialsModalVisible(false);
    setExternalAuthModalVisible(false);
    setBuildingNode(null);
    setCheckingNode(null);
    setSelectedNode(null);
  };

  return {
    // State
    nodes,
    activeTab,
    messageApi,
    contextHolder,

    // Modal states
    isAddNodeModalVisible,
    isHACredentialsModalVisible,
    externalAuthModalVisible,

    // Operation states
    buildingNode,
    checkingNode,
    selectedNode,
    buildingLoading,
    checkingLoading,
    checkingNodeId,
    isRebuildMode,
    isCheckingAllServers,
    isMainMasterCreating,
    operationsInProgress,
    pendingOperations,
    lastOperationTime,

    // Authentication and credentials
    authRequest,
    haAuthHops,
    haCredentials,
    serverCredentials,

    // Complex operation states
    deleteRequest,
    pendingMasterBuild,

    // External Kubernetes
    externalServer,
    externalNodesInfo,

    // Status tracking
    nodeTypeStatuses,

    // Setters
    setNodes,
    setActiveTab,
    setIsAddNodeModalVisible,
    setIsHACredentialsModalVisible,
    setExternalAuthModalVisible,
    setBuildingNode,
    setCheckingNode,
    setSelectedNode,
    setBuildingLoading,
    setCheckingLoading,
    setCheckingNodeId,
    setIsRebuildMode,
    setIsCheckingAllServers,
    setIsMainMasterCreating,
    setOperationsInProgress,
    setPendingOperations,
    setLastOperationTime,
    setAuthRequest,
    setHaAuthHops,
    setHaCredentials,
    setServerCredentials,
    setDeleteRequest,
    setPendingMasterBuild,
    setExternalServer,
    setExternalNodesInfo,
    setNodeTypeStatuses,

    // Helpers
    startOperation,
    endOperation,
    isOperationAllowed,
    updateNodeStatus,
    addNode,
    removeNodeById,
    updateNode,
    resetAuthStates,
    resetModalStates,
  };
};
