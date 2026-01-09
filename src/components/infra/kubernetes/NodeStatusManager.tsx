import React from 'react';
import { Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ServerStatus } from '../../../types/server';
import { InfraItem } from '../../../types/infra';
import { SshHop as AuthHops } from '../../../lib/api/types';
import * as kubernetesApi from '../../../lib/api/kubernetes';
import { Node, NodeType } from './NodeOperationsManager';

interface NodeTypeStatus {
  [nodeId: string]: {
    [type: string]: {
      status: ServerStatus;
      lastChecked: string;
    };
  };
}

interface NodeStatusManagerProps {
  infra: InfraItem;
  nodes: Node[];
  activeTab: NodeType;
  onNodesUpdate: (updater: (nodes: Node[]) => Node[]) => void;
  onNodeTypeStatusUpdate: (statuses: NodeTypeStatus) => void;
}

export const useNodeStatusManager = ({
  infra,
  nodes,
  activeTab,
  onNodesUpdate,
  onNodeTypeStatusUpdate,
}: NodeStatusManagerProps) => {
  const [nodeTypeStatuses, setNodeTypeStatuses] =
    React.useState<NodeTypeStatus>({});
  const [checkingNodeId, setCheckingNodeId] = React.useState<string | null>(
    null
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
        );
      case 'stopped':
        return (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
        );
      case 'preparing':
        return (
          <ExclamationCircleOutlined
            style={{ color: '#faad14', fontSize: '14px' }}
          />
        );
      case 'error':
        return (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
        );
      case 'checking':
        return (
          <SyncOutlined spin style={{ color: '#1890ff', fontSize: '14px' }} />
        );
      default:
        return (
          <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: '14px' }} />
        );
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '실행 중';
      case 'stopped':
        return '중지됨';
      case 'preparing':
        return '준비 중';
      case 'error':
        return '오류';
      case 'checking':
        return '확인 중';
      default:
        return '알 수 없음';
    }
  };

  const renderStatusDisplay = (status: string) => {
    return (
      <Space>
        {getStatusIcon(status)}
        <span>{getStatusText(status)}</span>
      </Space>
    );
  };

  const checkNodeStatus = async (node: Node, authHops: AuthHops[]) => {
    if (checkingNodeId) return;

    setCheckingNodeId(node.id);

    try {
      const nodeTypes = node.nodeType.includes(',')
        ? node.nodeType.split(',').map(t => t.trim())
        : [node.nodeType];

      const statusResults: {
        [key: string]: { status: ServerStatus; lastChecked: string };
      } = {};
      let hasAnySuccess = false;
      let lastError: Error | null = null;

      for (const type of nodeTypes) {
        try {
          const response = await kubernetesApi.getNodeStatus({
            id: parseInt(node.id),
            infra_id: infra.id,
            type: type,
            hops: authHops,
          });

          let nodeStatus: ServerStatus;
          const serverStatus = response.status;

          if (!serverStatus.installed) {
            nodeStatus = 'preparing';
          } else if (serverStatus.running) {
            nodeStatus = 'running';
          } else {
            nodeStatus = 'stopped';
          }

          statusResults[type] = {
            status: nodeStatus,
            lastChecked: response.lastChecked,
          };
          hasAnySuccess = true;
        } catch (error) {
          lastError = error as Error;
        }
      }

      if (!hasAnySuccess) {
        throw (
          lastError ||
          new Error('모든 노드 타입에 대한 상태 조회가 실패했습니다.')
        );
      }

      // Update node type statuses
      const updatedNodeTypeStatuses = {
        ...nodeTypeStatuses,
        [node.id]: {
          ...nodeTypeStatuses[node.id],
          ...statusResults,
        },
      };

      setNodeTypeStatuses(updatedNodeTypeStatuses);
      onNodeTypeStatusUpdate(updatedNodeTypeStatuses);

      // Update nodes with status
      onNodesUpdate(prev =>
        prev.map(n => {
          if (n.id === node.id) {
            const hasActiveTabType = nodeTypes.includes(activeTab);

            if (hasActiveTabType && statusResults[activeTab]) {
              return {
                ...n,
                status: statusResults[activeTab].status,
                last_checked: statusResults[activeTab].lastChecked,
              };
            }

            const firstType = nodeTypes[0];

            if (firstType && statusResults[firstType]) {
              return {
                ...n,
                status: statusResults[firstType].status,
                last_checked: statusResults[firstType].lastChecked,
              };
            }
          }

          return n;
        })
      );
    } finally {
      setCheckingNodeId(null);
    }
  };

  const checkAllServersStatus = async (authHops: AuthHops[]) => {
    const statusPromises = nodes.map(async node => {
      try {
        await checkNodeStatus(node, authHops);

        return { nodeId: node.id, success: true };
      } catch (error) {
        return { nodeId: node.id, success: false, error };
      }
    });

    const results = await Promise.allSettled(statusPromises);
    const failedChecks = results.filter(
      (result, _index) =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && !result.value.success)
    );

    if (failedChecks.length > 0) {
      // Failed checks are tracked in the return value
    }

    return {
      total: nodes.length,
      failed: failedChecks.length,
      success: nodes.length - failedChecks.length,
    };
  };

  const isCertificateValid = (updatedAt: string | undefined): boolean => {
    if (!updatedAt) return false;

    try {
      const updateTime = new Date(updatedAt);
      const now = new Date();
      const diffHours =
        (now.getTime() - updateTime.getTime()) / (1000 * 60 * 60);

      // 인증서는 24시간 유효하다고 가정
      return diffHours < 24;
    } catch {
      // Date parsing failed - treat as invalid
      return false;
    }
  };

  const getNodeStatusForType = (nodeId: string, type: string) => {
    return nodeTypeStatuses[nodeId]?.[type];
  };

  const getLastCheckedTime = (node: Node): string => {
    const nodeStatuses = nodeTypeStatuses[node.id];

    if (!nodeStatuses) return node.last_checked || '';

    // 현재 활성 탭의 상태 우선
    if (nodeStatuses[activeTab]) {
      return nodeStatuses[activeTab].lastChecked;
    }

    // 그 외에는 가장 최근 체크된 것
    const latestStatus = Object.values(nodeStatuses).sort(
      (a, b) =>
        new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime()
    )[0];

    return latestStatus?.lastChecked || node.last_checked || '';
  };

  return {
    nodeTypeStatuses,
    checkingNodeId,
    getStatusIcon,
    getStatusText,
    renderStatusDisplay,
    checkNodeStatus,
    checkAllServersStatus,
    isCertificateValid,
    getNodeStatusForType,
    getLastCheckedTime,
  };
};

export default useNodeStatusManager;
