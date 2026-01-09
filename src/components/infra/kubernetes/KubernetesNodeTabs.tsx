// Kubernetes node tabs component

import React from 'react';
import { Tabs, Space, Button, Statistic, Card, Row, Col } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Node, NodeType } from './types';
import NodeStatusTable from './NodeStatusTable';

const { TabPane } = Tabs;

interface KubernetesNodeTabsProps {
  nodes: Node[];
  activeTab: NodeType;
  isAdmin: boolean;
  operationsInProgress: Set<string>;
  isCheckingAllServers: boolean;
  onTabChange: (key: NodeType) => void;
  onAddNode: () => void;
  onCheckAllServers: () => void;
  onStartBuild: (node: Node) => void;
  onRebuild: (node: Node) => void;
  onCheckStatus: (node: Node) => void;
  onStartServer: (node: Node) => void;
  onStopServer: (node: Node) => void;
  onRestartServer: (node: Node) => void;
  onRemoveNode: (nodeId: string) => void;
  onRenewCertificate: (node: Node) => void;
  onShowResourceModal: (node: Node) => void;
  isOperationAllowed: (nodeId: string, operation: string) => boolean;
}

const KubernetesNodeTabs: React.FC<KubernetesNodeTabsProps> = ({
  nodes,
  activeTab,
  isAdmin,
  operationsInProgress,
  isCheckingAllServers,
  onTabChange,
  onAddNode,
  onCheckAllServers,
  onStartBuild,
  onRebuild,
  onCheckStatus,
  onStartServer,
  onStopServer,
  onRestartServer,
  onRemoveNode,
  onRenewCertificate,
  onShowResourceModal,
  isOperationAllowed,
}) => {
  // 노드 타입별 통계 계산
  const getNodeStats = (nodeType: NodeType) => {
    const typeNodes = nodes.filter(n => n.nodeType === nodeType);
    const runningNodes = typeNodes.filter(n => n.status === 'running');
    const stoppedNodes = typeNodes.filter(n => n.status === 'stopped');
    const errorNodes = typeNodes.filter(n => n.status === 'error');
    const preparingNodes = typeNodes.filter(n => n.status === 'preparing');

    return {
      total: typeNodes.length,
      running: runningNodes.length,
      stopped: stoppedNodes.length,
      error: errorNodes.length,
      preparing: preparingNodes.length,
    };
  };

  const haStats = getNodeStats('ha');
  const masterStats = getNodeStats('master');
  const workerStats = getNodeStats('worker');

  const renderNodeStats = (
    nodeType: NodeType,
    stats: {
      total: number;
      running: number;
      stopped: number;
      error: number;
      preparing: number;
    }
  ) => {
    const getTypeInfo = () => {
      switch (nodeType) {
        case 'ha':
          return {
            name: 'HA 로드밸런서',
            icon: <CloudServerOutlined />,
            color: '#1890ff',
          };
        case 'master':
          return {
            name: '마스터 노드',
            icon: <ClusterOutlined />,
            color: '#52c41a',
          };
        case 'worker':
          return {
            name: '워커 노드',
            icon: <CloudServerOutlined />,
            color: '#fa541c',
          };
        default:
          return { name: '노드', icon: <CloudServerOutlined />, color: '#666' };
      }
    };

    const typeInfo = getTypeInfo();

    return (
      <Card size='small' style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title='전체'
              value={stats.total}
              prefix={typeInfo.icon}
              valueStyle={{ color: typeInfo.color }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title='실행중'
              value={stats.running}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title='중지됨'
              value={stats.stopped}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title='에러'
              value={stats.error}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='준비중'
              value={stats.preparing}
              valueStyle={{ color: '#fadb14' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  const tabBarExtraContent = (
    <Space>
      <Button
        icon={<ReloadOutlined />}
        loading={isCheckingAllServers}
        onClick={onCheckAllServers}
        disabled={nodes.length === 0}
      >
        전체 상태 확인
      </Button>
      {isAdmin && (
        <Button type='primary' icon={<PlusOutlined />} onClick={onAddNode}>
          노드 추가
        </Button>
      )}
    </Space>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={key => onTabChange(key)}
      tabBarExtraContent={tabBarExtraContent}
    >
      <TabPane tab={`HA 로드밸런서 (${haStats.total})`} key='ha'>
        {renderNodeStats('ha', haStats)}
        <NodeStatusTable
          nodes={nodes}
          nodeType='ha'
          isAdmin={isAdmin}
          operationsInProgress={operationsInProgress}
          onStartBuild={onStartBuild}
          onRebuild={onRebuild}
          onCheckStatus={onCheckStatus}
          onStartServer={onStartServer}
          onStopServer={onStopServer}
          onRestartServer={onRestartServer}
          onRemoveNode={onRemoveNode}
          onRenewCertificate={onRenewCertificate}
          onShowResourceModal={onShowResourceModal}
          isOperationAllowed={isOperationAllowed}
        />
      </TabPane>

      <TabPane tab={`마스터 노드 (${masterStats.total})`} key='master'>
        {renderNodeStats('master', masterStats)}
        <NodeStatusTable
          nodes={nodes}
          nodeType='master'
          isAdmin={isAdmin}
          operationsInProgress={operationsInProgress}
          onStartBuild={onStartBuild}
          onRebuild={onRebuild}
          onCheckStatus={onCheckStatus}
          onStartServer={onStartServer}
          onStopServer={onStopServer}
          onRestartServer={onRestartServer}
          onRemoveNode={onRemoveNode}
          onRenewCertificate={onRenewCertificate}
          onShowResourceModal={onShowResourceModal}
          isOperationAllowed={isOperationAllowed}
        />
      </TabPane>

      <TabPane tab={`워커 노드 (${workerStats.total})`} key='worker'>
        {renderNodeStats('worker', workerStats)}
        <NodeStatusTable
          nodes={nodes}
          nodeType='worker'
          isAdmin={isAdmin}
          operationsInProgress={operationsInProgress}
          onStartBuild={onStartBuild}
          onRebuild={onRebuild}
          onCheckStatus={onCheckStatus}
          onStartServer={onStartServer}
          onStopServer={onStopServer}
          onRestartServer={onRestartServer}
          onRemoveNode={onRemoveNode}
          onRenewCertificate={onRenewCertificate}
          onShowResourceModal={onShowResourceModal}
          isOperationAllowed={isOperationAllowed}
        />
      </TabPane>
    </Tabs>
  );
};

export default KubernetesNodeTabs;
