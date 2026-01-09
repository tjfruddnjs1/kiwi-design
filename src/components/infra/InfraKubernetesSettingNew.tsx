import React, { useState } from 'react';
import { Typography, Tabs, Divider, Alert, message } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { InfraItem } from '../../types/infra';
import { AuthHops } from '../../lib/api';
import {
  AddNodeModal,
  ExternalKubeAuthModal,
  ServerResourceModal,
  ServerResource,
} from './modals';

// Import our refactored components
import {
  Node,
  NodeType,
  OperationRequest,
  useOperationsSafety,
  NodeOperationsManager,
} from './kubernetes/NodeOperationsManager';
import useNodeStatusManager from './kubernetes/NodeStatusManager';
import useInfraAuthHandler from './kubernetes/InfraAuthHandler';
import NodeTableView from './kubernetes/NodeTableView';
import ExternalKubernetesView from './kubernetes/ExternalKubernetesView';

const { Text } = Typography;
const { TabPane } = Tabs;

// Utility functions
const validateClusterIntegrity = (nodeList: Node[]) => {
  const warnings: string[] = [];
  const masterNodes = nodeList.filter(n => n.nodeType.includes('master'));
  const runningMasters = masterNodes.filter(n => n.status === 'running');

  if (masterNodes.length === 0) {
    warnings.push('마스터 노드가 없습니다.');
  } else if (runningMasters.length === 0) {
    warnings.push('실행 중인 마스터 노드가 없습니다.');
  }

  return { warnings };
};

const getFilteredNodesByType = (nodes: Node[], nodeType: NodeType): Node[] => {
  return nodes.filter(node => {
    if (nodeType === 'ha') {
      return node.nodeType.includes('ha') || node.nodeType.includes('HA');
    }

    return node.nodeType.includes(nodeType);
  });
};

// External Kubernetes Section Component
interface ExternalKubernetesSectionProps {
  contextHolder: React.ReactNode;
  infra: InfraItem & { nodes?: Node[] };
  externalNodesInfo: any;
  externalAuthModalVisible: boolean;
  externalServer: { ip: string; port: string } | null;
  onConnectExternal: () => void;
  onShowSettings: () => void;
  onAuthCancel: () => void;
  onAuthConfirm: (username: string, password: string) => void;
}

const ExternalKubernetesSection: React.FC<ExternalKubernetesSectionProps> = ({
  contextHolder,
  infra,
  externalNodesInfo,
  externalAuthModalVisible,
  externalServer,
  onConnectExternal,
  onShowSettings,
  onAuthCancel,
  onAuthConfirm,
}) => (
  <>
    {contextHolder}
    <ExternalKubernetesView
      infra={infra}
      externalNodesInfo={externalNodesInfo}
      onConnectExternal={onConnectExternal}
      onShowSettings={onShowSettings}
    />
    <ExternalKubeAuthModal
      visible={externalAuthModalVisible}
      onCancel={onAuthCancel}
      onConfirm={onAuthConfirm}
      loading={false}
      server={externalServer || { ip: '', port: '' }}
    />
  </>
);

// Node Stats Section Component
interface NodeStatsSectionProps {
  nodes: Node[];
  haNodes: Node[];
  masterNodes: Node[];
  workerNodes: Node[];
}

const NodeStatsSection: React.FC<NodeStatsSectionProps> = ({
  nodes,
  haNodes,
  masterNodes,
  workerNodes,
}) => (
  <div className='cluster-stats'>
    <div className='node-stat-group'>
      <div className='node-stat-item'>
        <CloudServerOutlined className='node-stat-icon' />
        <div>
          <Text className='node-stat-label'>총 노드 수</Text>
          <Text className='node-stat-number'>{nodes.length}개</Text>
        </div>
      </div>
      <div className='node-stat-item ha-stat'>
        <ApiOutlined className='node-stat-icon' style={{ color: '#1677ff' }} />
        <div>
          <Text className='node-stat-label'>HA 노드</Text>
          <Text className='node-stat-number'>{haNodes.length}개</Text>
        </div>
      </div>
      <div className='node-stat-item master-stat'>
        <ClusterOutlined
          className='node-stat-icon'
          style={{ color: '#52c41a' }}
        />
        <div>
          <Text className='node-stat-label'>마스터 노드</Text>
          <Text className='node-stat-number'>{masterNodes.length}개</Text>
        </div>
      </div>
      <div className='node-stat-item worker-stat'>
        <CloudServerOutlined
          className='node-stat-icon'
          style={{ color: '#fa541c' }}
        />
        <div>
          <Text className='node-stat-label'>워커 노드</Text>
          <Text className='node-stat-number'>{workerNodes.length}개</Text>
        </div>
      </div>
    </div>
  </div>
);

// Modal management helper
const createModalHandlers = (
  setIsAddNodeModalVisible: React.Dispatch<React.SetStateAction<boolean>>,
  setResourceModalVisible: React.Dispatch<React.SetStateAction<boolean>>,
  setResourceNode: React.Dispatch<React.SetStateAction<Node | null>>,
  setServerResource: React.Dispatch<React.SetStateAction<ServerResource | null>>
) => ({
  handleAddNode: () => setIsAddNodeModalVisible(true),
  handleViewResource: (node: Node) => {
    setResourceNode(node);
    setResourceModalVisible(true);
  },
  handleResourceModalClose: () => {
    setResourceModalVisible(false);
    setResourceNode(null);
    setServerResource(null);
  },
});

interface InfraKubernetesSettingProps {
  infra: InfraItem & { nodes?: Node[] };
  showSettingsModal?: (infra: InfraItem) => void;
  _showSettingsModal?: (infra: InfraItem) => void;
  isExternal?: boolean;
}

const InfraKubernetesSetting: React.FC<InfraKubernetesSettingProps> = ({
  infra,
  _showSettingsModal,
  isExternal = false,
}) => {
  const isAdmin = infra.user_role === 'admin';

  // Core state
  const [nodes, setNodes] = useState<Node[]>(infra.nodes || []);
  const [activeTab, setActiveTab] = useState<NodeType>('ha');
  const [, contextHolder] = message.useMessage();

  // Modal states
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false);
  const [externalAuthModalVisible, setExternalAuthModalVisible] =
    useState(false);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);

  // External Kubernetes states
  const [externalServer] = useState<{
    ip: string;
    port: string;
  } | null>(null);
  const [externalNodesInfo] = useState<{
    total: number;
    master: number;
    worker: number;
    list: Node[];
  } | null>(null);

  // Resource states
  const [resourceNode, setResourceNode] = useState<Node | null>(null);
  const [resourceLoading] = useState(false);
  const [serverResource, setServerResource] = useState<ServerResource | null>(
    null
  );

  // Operation safety hook
  const { criticalOperationCount } = useOperationsSafety();

  // Node status management
  const {
    checkingNodeId,
    renderStatusDisplay,
    checkNodeStatus,
    isCertificateValid,
    getLastCheckedTime,
  } = useNodeStatusManager({
    infra,
    nodes,
    activeTab,
    onNodesUpdate: setNodes,
    onNodeTypeStatusUpdate: () => {}, // Can be used for additional handling
  });

  // Authentication handler
  const {
    requestNodeAuth,
    createAuthHopsFromCredentials,
    AuthModalComponent,
    HACredentialsModalComponent,
  } = useInfraAuthHandler({
    onAuthSuccess: handleAuthSuccess,
    onAuthCancel: handleAuthCancel,
  });

  // Computed values
  const haNodes = getFilteredNodesByType(nodes, 'ha');
  const masterNodes = getFilteredNodesByType(nodes, 'master');
  const workerNodes = getFilteredNodesByType(nodes, 'worker');

  // Modal handlers
  const modalHandlers = createModalHandlers(
    setIsAddNodeModalVisible,
    setResourceModalVisible,
    setResourceNode,
    setServerResource
  );

  // Event handlers
  function handleAuthSuccess(
    _authHops: AuthHops[],
    _request: OperationRequest
  ) {
    // Handle successful authentication
  }

  function handleAuthCancel() {
    // Handle auth cancellation
  }

  const handleCheckStatus = (node: Node) => {
    const storedAuth = createAuthHopsFromCredentials(node);

    if (storedAuth) {
      checkNodeStatus(node, storedAuth).catch(_error => {
        requestNodeAuth({ node, purpose: 'checkStatus' });
      });
    } else {
      requestNodeAuth({ node, purpose: 'checkStatus' });
    }
  };

  const handleBuild = (node: Node) => {
    const storedAuth = createAuthHopsFromCredentials(node);

    if (storedAuth) {
      // Proceed with build
    } else {
      requestNodeAuth({ node, purpose: 'build' });
    }
  };

  const handleRebuild = (node: Node) => {
    const storedAuth = createAuthHopsFromCredentials(node);

    if (storedAuth) {
      // Proceed with rebuild
    } else {
      requestNodeAuth({ node, purpose: 'rebuild', isRebuildMode: true });
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);

    if (node) {
      // Handle node removal

      setNodes(prev => prev.filter(n => n.id !== nodeId));
    }
  };

  // Resource loading handled via modalHandlers.handleViewResource

  const handleOperationStart = (_nodeId: string, _type: string) => {};

  const handleOperationEnd = (
    _nodeId: string,
    _type: string,
    _success: boolean
  ) => {};

  // Render external Kubernetes UI
  if (isExternal) {
    return (
      <ExternalKubernetesSection
        contextHolder={contextHolder}
        infra={infra}
        externalNodesInfo={externalNodesInfo}
        externalAuthModalVisible={externalAuthModalVisible}
        externalServer={externalServer}
        onConnectExternal={() => setExternalAuthModalVisible(true)}
        onShowSettings={() => _showSettingsModal?.(infra)}
        onAuthCancel={() => setExternalAuthModalVisible(false)}
        onAuthConfirm={(_username, _password) => {
          setExternalAuthModalVisible(false);
        }}
      />
    );
  }

  // Render internal Kubernetes management UI
  return (
    <>
      {contextHolder}
      <div className='infra-content-wrapper'>
        {/* Cluster integrity warnings */}
        {(() => {
          const integrityCheck = validateClusterIntegrity(nodes);

          if (integrityCheck.warnings.length > 0) {
            return (
              <Alert
                message='클러스터 상태 경고'
                description={
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {integrityCheck.warnings.map(warning => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                }
                type='warning'
                showIcon
                style={{ marginBottom: '16px' }}
              />
            );
          }

          return null;
        })()}

        {/* Operations in progress alert */}
        {criticalOperationCount > 0 && (
          <Alert
            message={`${criticalOperationCount}개의 중요 작업이 진행 중입니다`}
            description='동시에 너무 많은 작업을 수행하면 시스템이 불안정해질 수 있습니다.'
            type='info'
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Node statistics */}
        <div className='infra-stats-container'>
          <NodeStatsSection
            nodes={nodes}
            haNodes={haNodes}
            masterNodes={masterNodes}
            workerNodes={workerNodes}
          />
        </div>

        <Divider orientation='left'>노드 목록</Divider>

        {/* Node management tabs */}
        <Tabs
          defaultActiveKey='ha'
          style={{ marginBottom: 16 }}
          onChange={key => setActiveTab(key)}
          activeKey={activeTab}
        >
          <TabPane tab='HA 노드' key='ha'>
            <NodeTableView
              infra={infra}
              nodes={nodes}
              activeTab={activeTab}
              isAdmin={isAdmin}
              checkingNodeId={checkingNodeId}
              onAddNode={modalHandlers.handleAddNode}
              onCheckStatus={handleCheckStatus}
              onRebuild={handleRebuild}
              onBuild={handleBuild}
              onRemoveNode={handleRemoveNode}
              onViewResource={modalHandlers.handleViewResource}
              renderStatusDisplay={renderStatusDisplay}
              getLastCheckedTime={getLastCheckedTime}
              isCertificateValid={isCertificateValid}
            />
          </TabPane>

          <TabPane tab='마스터 노드' key='master'>
            <NodeTableView
              infra={infra}
              nodes={nodes}
              activeTab={activeTab}
              isAdmin={isAdmin}
              checkingNodeId={checkingNodeId}
              onAddNode={modalHandlers.handleAddNode}
              onCheckStatus={handleCheckStatus}
              onRebuild={handleRebuild}
              onBuild={handleBuild}
              onRemoveNode={handleRemoveNode}
              onViewResource={modalHandlers.handleViewResource}
              renderStatusDisplay={renderStatusDisplay}
              getLastCheckedTime={getLastCheckedTime}
              isCertificateValid={isCertificateValid}
            />
          </TabPane>

          <TabPane tab='워커 노드' key='worker'>
            <NodeTableView
              infra={infra}
              nodes={nodes}
              activeTab={activeTab}
              isAdmin={isAdmin}
              checkingNodeId={checkingNodeId}
              onAddNode={modalHandlers.handleAddNode}
              onCheckStatus={handleCheckStatus}
              onRebuild={handleRebuild}
              onBuild={handleBuild}
              onRemoveNode={handleRemoveNode}
              onViewResource={modalHandlers.handleViewResource}
              renderStatusDisplay={renderStatusDisplay}
              getLastCheckedTime={getLastCheckedTime}
              isCertificateValid={isCertificateValid}
            />
          </TabPane>
        </Tabs>

        {/* Node Operations Manager */}
        <NodeOperationsManager
          infra={infra}
          nodes={nodes}
          onNodesUpdate={setNodes}
          onOperationStart={handleOperationStart}
          onOperationEnd={handleOperationEnd}
        />
      </div>

      {/* Modals */}
      <AuthModalComponent />
      <HACredentialsModalComponent />

      <AddNodeModal
        visible={isAddNodeModalVisible}
        onCancel={() => setIsAddNodeModalVisible(false)}
        onConfirm={_nodeData => {
          // Add node logic

          setIsAddNodeModalVisible(false);
        }}
        initialNodeType={'worker'}
        loading={false}
      />

      <ServerResourceModal
        visible={resourceModalVisible}
        onCancel={modalHandlers.handleResourceModalClose}
        resource={serverResource}
        loading={resourceLoading}
        serverName={resourceNode?.server_name || resourceNode?.ip || ''}
      />
    </>
  );
};

export default InfraKubernetesSetting;
