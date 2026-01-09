import { useState } from 'react';
import { message } from 'antd';
import type {
  Node,
  NodeType,
  AuthHops,
  ServerResource,
  InfraItem,
} from '../types';

// 인터페이스 정의
interface ExternalServer {
  ip: string;
  port: string;
}

interface ExternalNodesInfo {
  total: number;
  master: number;
  worker: number;
}

interface NodeTypeStatuses {
  ha: { total: number; healthy: number };
  master: { total: number; healthy: number };
  worker: { total: number; healthy: number };
  loadbalancer: { total: number; healthy: number };
  registry: { total: number; healthy: number };
}

interface ServerCredentials {
  [nodeId: string]: {
    username: string;
    password: string;
  };
}

interface AuthRequest {
  node: Node;
  operation: string;
  purpose: string;
}

interface HACredentials {
  username: string;
  password: string;
}

interface PendingMasterBuild {
  hopsData: any;
  username: string;
  password: string;
}

interface DeleteRequest {
  node: Node;
  stage: string;
}

interface OperationRecord {
  id: string;
  type: string;
  node: Node;
  timestamp: string;
  status: 'success' | 'failed' | 'in_progress';
  message: string;
}

/**
 * Kubernetes 관리를 위한 상태 관리 훅
 * InfraKubernetesSetting 컴포넌트의 모든 상태를 중앙화
 */
export const useKubernetesState = (infra: InfraItem) => {
  // 기본 상태
  const [nodes, setNodes] = useState<Node[]>(infra.nodes || []);
  const [activeTab, setActiveTab] = useState<NodeType>('ha');
  const [messageApi, contextHolder] = message.useMessage();

  // 모달 상태
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false);
  const [isHACredentialsModalVisible, setIsHACredentialsModalVisible] =
    useState(false);
  const [externalAuthModalVisible, setExternalAuthModalVisible] =
    useState(false);

  // 작업 상태
  const [buildingNode, setBuildingNode] = useState<Node | null>(null);
  const [checkingNode, setCheckingNode] = useState<Node | null>(null);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [checkingLoading, setCheckingLoading] = useState(false);
  const [checkingNodeId, setCheckingNodeId] = useState<string | null>(null);
  const [isRebuildMode, setIsRebuildMode] = useState(false);
  const [isCheckingAllServers, setIsCheckingAllServers] = useState(false);
  const [isMainMasterCreating, setIsMainMasterCreating] = useState(false);

  // 인증 관련 상태
  const [haCredentials, setHaCredentials] = useState<HACredentials | null>(
    null
  );
  const [pendingMasterBuild, setPendingMasterBuild] =
    useState<PendingMasterBuild | null>(null);
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
  const [haAuthHops, setHaAuthHops] = useState<AuthHops[] | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(
    null
  );
  const [serverCredentials, setServerCredentials] = useState<ServerCredentials>(
    {}
  );

  // 외부 쿠버네티스 관련 상태
  const [externalServer, setExternalServer] = useState<ExternalServer>({
    ip: '',
    port: '',
  });
  const [externalNodesInfo, setExternalNodesInfo] =
    useState<ExternalNodesInfo | null>(null);
  const [nodeTypeStatuses, setNodeTypeStatuses] = useState<NodeTypeStatuses>({
    ha: { total: 0, healthy: 0 },
    master: { total: 0, healthy: 0 },
    worker: { total: 0, healthy: 0 },
    loadbalancer: { total: 0, healthy: 0 },
    registry: { total: 0, healthy: 0 },
  });

  // 노드 선택 및 리소스 관련 상태
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [resourceNode, setResourceNode] = useState<Node | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [serverResource, setServerResource] = useState<ServerResource | null>(
    null
  );

  // 작업 추적 관련 상태
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(
    new Set()
  );
  const [lastOperationTime, setLastOperationTime] = useState<{
    [nodeId: string]: number;
  }>({});
  const [criticalOperationCount, setCriticalOperationCount] = useState(0);
  const [operationHistory, setOperationHistory] = useState<OperationRecord[]>(
    []
  );

  // 파생된 상태 (computed values)
  const haNodes = nodes.filter(node => node.type === 'ha');
  const masterNodes = nodes.filter(node => node.type === 'master');
  const workerNodes = nodes.filter(node => node.type === 'worker');
  const loadBalancerNodes = nodes.filter(node => node.type === 'loadbalancer');
  const registryNodes = nodes.filter(node => node.type === 'registry');

  const isAdmin = infra.user_role === 'admin';

  return {
    // 기본 상태
    nodes,
    setNodes,
    activeTab,
    setActiveTab,
    messageApi,
    contextHolder,

    // 모달 상태
    isAddNodeModalVisible,
    setIsAddNodeModalVisible,
    isHACredentialsModalVisible,
    setIsHACredentialsModalVisible,
    externalAuthModalVisible,
    setExternalAuthModalVisible,

    // 작업 상태
    buildingNode,
    setBuildingNode,
    checkingNode,
    setCheckingNode,
    buildingLoading,
    setBuildingLoading,
    checkingLoading,
    setCheckingLoading,
    checkingNodeId,
    setCheckingNodeId,
    isRebuildMode,
    setIsRebuildMode,
    isCheckingAllServers,
    setIsCheckingAllServers,
    isMainMasterCreating,
    setIsMainMasterCreating,

    // 인증 관련 상태
    haCredentials,
    setHaCredentials,
    pendingMasterBuild,
    setPendingMasterBuild,
    authRequest,
    setAuthRequest,
    haAuthHops,
    setHaAuthHops,
    deleteRequest,
    setDeleteRequest,
    serverCredentials,
    setServerCredentials,

    // 외부 쿠버네티스 관련 상태
    externalServer,
    setExternalServer,
    externalNodesInfo,
    setExternalNodesInfo,
    nodeTypeStatuses,
    setNodeTypeStatuses,

    // 노드 선택 및 리소스 관련 상태
    selectedNode,
    setSelectedNode,
    resourceModalVisible,
    setResourceModalVisible,
    resourceNode,
    setResourceNode,
    resourceLoading,
    setResourceLoading,
    serverResource,
    setServerResource,

    // 작업 추적 관련 상태
    operationsInProgress,
    setOperationsInProgress,
    lastOperationTime,
    setLastOperationTime,
    criticalOperationCount,
    setCriticalOperationCount,
    operationHistory,
    setOperationHistory,

    // 파생된 상태
    haNodes,
    masterNodes,
    workerNodes,
    loadBalancerNodes,
    registryNodes,
    isAdmin,
  };
};
