import React from 'react';
import { Divider, ColumnProps } from 'antd';
import { ServerStatus } from '../../types/server';
import ClusterStatusAlerts from './ClusterStatusAlerts';
import NodeStatsDisplay from './NodeStatsDisplay';
import NodeTablesSection from './NodeTablesSection';

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

interface ClusterIntegrityCheck {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
}

interface InternalKubernetesViewProps {
  nodes: Node[];
  haNodes: Node[];
  masterNodes: Node[];
  workerNodes: Node[];
  nodeColumns: ColumnProps<Node>[];
  activeTab: string;
  criticalOperationCount: number;
  onTabChange: (key: string) => void;
  validateClusterIntegrity: (nodes: Node[]) => ClusterIntegrityCheck;
}

const InternalKubernetesView: React.FC<InternalKubernetesViewProps> = ({
  nodes,
  haNodes,
  masterNodes,
  workerNodes,
  nodeColumns,
  activeTab,
  criticalOperationCount,
  onTabChange,
  validateClusterIntegrity,
}) => {
  return (
    <div className='infra-content-wrapper'>
      <ClusterStatusAlerts
        nodes={nodes}
        criticalOperationCount={criticalOperationCount}
        validateClusterIntegrity={validateClusterIntegrity}
      />

      <NodeStatsDisplay
        nodes={nodes}
        haNodes={haNodes}
        masterNodes={masterNodes}
        workerNodes={workerNodes}
      />

      <Divider orientation='left'>노드 목록</Divider>

      <NodeTablesSection
        haNodes={haNodes}
        masterNodes={masterNodes}
        workerNodes={workerNodes}
        nodeColumns={nodeColumns}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  );
};

export default InternalKubernetesView;
