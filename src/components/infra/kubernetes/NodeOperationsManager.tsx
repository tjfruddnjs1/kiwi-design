import React from 'react';
import { message } from 'antd';
import { InfraItem } from '../../../types/infra';
import { ServerStatus } from '../../../types/server';
import { SshHop as AuthHops } from '../../../lib/api/types';
import * as kubernetesApi from '../../../lib/api/kubernetes';

export type NodeType = 'master' | 'worker' | 'ha';

export interface Node {
  id: string;
  nodeType: NodeType;
  ip: string;
  port: string;
  server_name?: string;
  join_command?: string;
  certificate_key?: string;
  last_checked?: string;
  status: ServerStatus;
  hops: string;
  updated_at?: string;
  ha?: string;
}

export interface OperationRequest {
  node: Node;
  purpose:
    | 'build'
    | 'checkStatus'
    | 'resource'
    | 'rebuild'
    | 'start'
    | 'stop'
    | 'restart'
    | 'ha_auth'
    | 'delete_worker_auth'
    | 'delete_master_auth';
  isRebuildMode?: boolean;
  isRenewalMode?: boolean;
  deletePayload?: {
    nodes: Array<{
      id: number;
      server_name: string;
      type: string;
    }>;
    mode?: string;
  };
}

export interface DeleteRequest {
  type: 'worker' | 'master';
  stage: 'target' | 'main' | 'ha' | 'done';
  targetNode: Node;
  targetAuth?: AuthHops[];
  mainAuth?: AuthHops[];
  haAuth?: AuthHops[];
}

export interface OperationHistory {
  id: string;
  type: string;
  node: string;
  timestamp: number;
  status: 'success' | 'failed' | 'in_progress';
}

interface NodeOperationsManagerProps {
  infra: InfraItem;
  nodes: Node[];
  onNodesUpdate: (updater: (nodes: Node[]) => Node[]) => void;
  onOperationStart: (nodeId: string, type: string) => void;
  onOperationEnd: (nodeId: string, type: string, success: boolean) => void;
}

export const useOperationsSafety = () => {
  const [operationsInProgress, setOperationsInProgress] = React.useState<
    Set<string>
  >(new Set());
  const [lastOperationTime, setLastOperationTime] = React.useState<{
    [key: string]: number;
  }>({});
  const [criticalOperationCount, setCriticalOperationCount] = React.useState(0);
  const [operationHistory, setOperationHistory] = React.useState<
    OperationHistory[]
  >([]);

  const isOperationAllowed = (
    nodeId: string,
    operationType: string
  ): boolean => {
    if (operationsInProgress.has(nodeId)) return false;

    const lastTime = lastOperationTime[nodeId];

    if (lastTime && Date.now() - lastTime < 5000) return false;

    if (
      ['delete', 'build', 'restart'].includes(operationType) &&
      criticalOperationCount >= 3
    ) {
      return false;
    }

    return true;
  };

  const startOperation = (nodeId: string, operationType: string) => {
    setOperationsInProgress(prev => new Set([...Array.from(prev), nodeId]));
    setLastOperationTime(prev => ({ ...prev, [nodeId]: Date.now() }));

    if (['delete', 'build', 'restart'].includes(operationType)) {
      setCriticalOperationCount(prev => prev + 1);
    }

    const operationId = `${nodeId}-${operationType}-${Date.now()}`;

    setOperationHistory(prev => [
      ...prev,
      {
        id: operationId,
        type: operationType,
        node: nodeId,
        timestamp: Date.now(),
        status: 'in_progress',
      },
    ]);

    return operationId;
  };

  const endOperation = (
    nodeId: string,
    operationType: string,
    operationId: string,
    success: boolean
  ) => {
    setOperationsInProgress(prev => {
      const newSet = new Set(prev);

      newSet.delete(nodeId);

      return newSet;
    });

    if (['delete', 'build', 'restart'].includes(operationType)) {
      setCriticalOperationCount(prev => Math.max(0, prev - 1));
    }

    setOperationHistory(prev =>
      prev.map(op =>
        op.id === operationId
          ? { ...op, status: success ? 'success' : 'failed' }
          : op
      )
    );
  };

  return {
    operationsInProgress,
    operationHistory,
    isOperationAllowed,
    startOperation,
    endOperation,
    criticalOperationCount,
  };
};

export const NodeOperationsManager: React.FC<NodeOperationsManagerProps> = ({
  infra: _infra,
  nodes: _nodes,
  onNodesUpdate,
  onOperationStart,
  onOperationEnd,
}) => {
  const [_messageApi] = message.useMessage();

  const { isOperationAllowed, startOperation, endOperation } =
    useOperationsSafety();

  // Removed unused handleNodeOperation - placeholder implementation
  const __handleNodeOperation = async (
    node: Node,
    operation: string,
    authHops: AuthHops[]
  ) => {
    if (!isOperationAllowed(node.id, operation)) {
      _messageApi.error('다른 작업이 진행 중이거나 대기 시간이 부족합니다.');

      return false;
    }

    const operationId = startOperation(node.id, operation);
    let success = false;

    try {
      onOperationStart(node.id, operation);

      switch (operation) {
        case 'build':
          await handleBuildNode(node, authHops);
          break;
        case 'delete':
          await handleDeleteNode(node, authHops);
          break;
        case 'restart':
          await handleRestartNode(node, authHops);
          break;
        case 'start':
          await handleStartNode(node, authHops);
          break;
        case 'stop':
          await handleStopNode(node, authHops);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      success = true;
      _messageApi.success(`${operation} 작업이 완료되었습니다.`);
    } catch (_err) {
      _messageApi.error(`${operation} 작업 중 오류가 발생했습니다.`);
    } finally {
      endOperation(node.id, operation, operationId, success);
      onOperationEnd(node.id, operation, success);
    }

    return success;
  };

  const handleBuildNode = async (_node: Node, _authHops: AuthHops[]) => {
    // Implementation will be moved from original component
    // This is a placeholder for now
  };

  const handleDeleteNode = async (_node: Node, _authHops: AuthHops[]) => {
    // Implementation will be moved from original component
  };

  const handleRestartNode = async (node: Node, _authHops: AuthHops[]) => {
    await kubernetesApi.restartServer({
      id: parseInt(node.id),
      hops: _authHops,
    });

    // Update node status
    onNodesUpdate(prev =>
      prev.map(n =>
        n.id === node.id ? { ...n, status: 'preparing' as ServerStatus } : n
      )
    );
  };

  const handleStartNode = async (node: Node, _authHops: AuthHops[]) => {
    await kubernetesApi.startServer({
      id: parseInt(node.id),
      hops: _authHops,
    });

    onNodesUpdate(prev =>
      prev.map(n =>
        n.id === node.id ? { ...n, status: 'running' as ServerStatus } : n
      )
    );
  };

  const handleStopNode = async (node: Node, _authHops: AuthHops[]) => {
    await kubernetesApi.stopServer({
      id: parseInt(node.id),
      hops: _authHops,
    });

    onNodesUpdate(prev =>
      prev.map(n =>
        n.id === node.id ? { ...n, status: 'stopped' as ServerStatus } : n
      )
    );
  };

  // Headless component: no UI rendering. Operations are triggered via props/handlers.
  return null;
};

export default NodeOperationsManager;
