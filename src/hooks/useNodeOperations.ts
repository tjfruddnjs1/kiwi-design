import { useState, useCallback } from 'react';
import { message } from 'antd';
import { ServerStatus } from '../types/server';

interface Node {
  id: string;
  nodeType: string;
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

export const useNodeOperations = (initialNodes: Node[] = []) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(
    new Set()
  );
  const [criticalOperationCount, setCriticalOperationCount] = useState(0);
  const [checkingNodeId, setCheckingNodeId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // Operation tracking
  const isOperationAllowed = useCallback(
    (nodeId: string, operationType: string): boolean => {
      const currentOps = Array.from(operationsInProgress);
      const nodeOps = currentOps.filter(op => op.startsWith(nodeId));

      // Prevent multiple operations on same node
      if (nodeOps.length > 0) {
        messageApi.warning('해당 노드에서 이미 작업이 진행 중입니다.');

        return false;
      }

      // Limit concurrent critical operations
      const criticalOps = ['build', 'rebuild', 'remove', 'start', 'stop'];

      if (criticalOps.includes(operationType) && criticalOperationCount >= 3) {
        messageApi.warning('동시에 진행할 수 있는 중요 작업은 최대 3개입니다.');

        return false;
      }

      return true;
    },
    [operationsInProgress, criticalOperationCount, messageApi]
  );

  const startOperation = useCallback(
    (nodeId: string, operationType: string): string | null => {
      if (!isOperationAllowed(nodeId, operationType)) {
        return null;
      }

      const operationId = `${nodeId}-${operationType}-${Date.now()}`;

      setOperationsInProgress(prev => {
        const next = new Set(prev);
        next.add(operationId);
        return next;
      });

      const criticalOps = ['build', 'rebuild', 'remove', 'start', 'stop'];

      if (criticalOps.includes(operationType)) {
        setCriticalOperationCount(prev => prev + 1);
      }

      return operationId;
    },
    [isOperationAllowed]
  );

  const endOperation = useCallback(
    (operationId: string, operationType: string) => {
      setOperationsInProgress(prev => {
        const newSet = new Set(prev);

        newSet.delete(operationId);

        return newSet;
      });

      const criticalOps = ['build', 'rebuild', 'remove', 'start', 'stop'];

      if (criticalOps.includes(operationType)) {
        setCriticalOperationCount(prev => Math.max(0, prev - 1));
      }
    },
    []
  );

  // Node management
  const updateNode = useCallback((nodeId: string, updates: Partial<Node>) => {
    setNodes(prev =>
      prev.map(node => (node.id === nodeId ? { ...node, ...updates } : node))
    );
  }, []);

  const addNode = useCallback((newNode: Node) => {
    setNodes(prev => [...prev, newNode]);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
  }, []);

  // Node filtering helpers
  const haNodes = nodes.filter(node => node.nodeType === 'ha');
  const masterNodes = nodes.filter(node => node.nodeType === 'master');
  const workerNodes = nodes.filter(node => node.nodeType === 'worker');

  return {
    // State
    nodes,
    operationsInProgress,
    criticalOperationCount,
    checkingNodeId,
    contextHolder,

    // Node collections
    haNodes,
    masterNodes,
    workerNodes,

    // Operations
    isOperationAllowed,
    startOperation,
    endOperation,
    updateNode,
    addNode,
    removeNode,
    setNodes,
    setCheckingNodeId,

    // Utils
    messageApi,
  };
};
