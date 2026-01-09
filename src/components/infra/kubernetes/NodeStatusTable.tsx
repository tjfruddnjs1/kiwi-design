// Node status table component

import React from 'react';
import { Table, Tag, Space, Typography, Tooltip } from 'antd';
import { Node, NodeType } from './types';
import { Hop } from '../../../types/infra';
import {
  NodeStatusDisplay,
  formatLastChecked,
  getCertificateStatus,
} from './NodeStatusUtils';
import NodeOperationsPanel from './NodeOperationsPanel';

const { Text } = Typography;

interface NodeStatusTableProps {
  nodes: Node[];
  nodeType: NodeType;
  isAdmin: boolean;
  operationsInProgress: Set<string>;
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

const NodeStatusTable: React.FC<NodeStatusTableProps> = ({
  nodes,
  nodeType,
  isAdmin,
  operationsInProgress,
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
  const getNodeTypeDisplayName = (type: NodeType) => {
    switch (type) {
      case 'ha':
        return 'HA';
      case 'master':
        return '마스터';
      case 'worker':
        return '워커';
      default:
        return type;
    }
  };

  const renderHopsInfo = (hopsStr: string) => {
    try {
      const hops = JSON.parse(hopsStr);

      if (!Array.isArray(hops) || hops.length === 0) {
        return <Text type='secondary'>직접 연결</Text>;
      }

      return (
        <Tooltip
          title={
            <div>
              <div>홉 경로:</div>
              {hops.map((hop: Hop, index: number) => (
                <div key={`hop-${hop.username}-${hop.host}-${hop.port}`}>
                  {index + 1}. {hop.username}@{hop.host}:{hop.port}
                </div>
              ))}
            </div>
          }
          placement='topLeft'
        >
          <Space size={4} wrap>
            {hops.map((hop: Hop, index: number) => (
              <React.Fragment
                key={`hop-tag-${hop.username}-${hop.host}-${hop.port}`}
              >
                <Tag
                  color='blue'
                  style={{
                    fontSize: '11px',
                    padding: '1px 4px',
                    lineHeight: '16px',
                    margin: '1px',
                  }}
                >
                  {hop.host}:{hop.port}
                </Tag>
                {index < hops.length - 1 && (
                  <span style={{ fontSize: '10px', color: '#999' }}>→</span>
                )}
              </React.Fragment>
            ))}
          </Space>
        </Tooltip>
      );
    } catch {
      return <Text type='secondary'>홉 정보 오류</Text>;
    }
  };

  const columns = [
    {
      title: '서버명/IP',
      key: 'server',
      render: (node: Node) => (
        <div>
          <Text strong>{node.server_name || node.ip}</Text>
          {node.server_name && (
            <div>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {node.ip}:{node.port}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '노드 타입',
      dataIndex: 'nodeType',
      key: 'nodeType',
      render: (type: NodeType) => (
        <Tag
          color={
            type === 'master' ? 'green' : type === 'worker' ? 'orange' : 'blue'
          }
        >
          {getNodeTypeDisplayName(type)}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <NodeStatusDisplay status={status} />,
    },
    {
      title: '마지막 확인',
      dataIndex: 'last_checked',
      key: 'last_checked',
      render: (lastChecked: string) => (
        <Text style={{ fontSize: '12px' }}>
          {formatLastChecked(lastChecked)}
        </Text>
      ),
    },
    {
      title: 'SSH 홉',
      dataIndex: 'hops',
      key: 'hops',
      render: renderHopsInfo,
    },
  ];

  // 마스터 노드인 경우 인증서 상태 컬럼 추가
  if (nodeType === 'master') {
    columns.splice(3, 0, {
      title: '인증서',
      key: 'certificate',
      render: (node: Node) => {
        const certStatus = getCertificateStatus(node.updated_at);

        return (
          <Space>
            {certStatus.icon}
            <Text
              style={{
                color: certStatus.color === 'success' ? '#52c41a' : '#ff4d4f',
              }}
            >
              {certStatus.text}
            </Text>
          </Space>
        );
      },
    });
  }

  // 작업 컬럼 추가
  columns.push({
    title: '작업',
    key: 'actions',
    render: (node: Node) => (
      <NodeOperationsPanel
        node={node}
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
        isOperationAllowed={isOperationAllowed}
      />
    ),
  });

  const filteredNodes = nodes.filter(node => node.nodeType === nodeType);

  return (
    <Table
      columns={columns}
      dataSource={filteredNodes}
      rowKey='id'
      pagination={false}
      size='middle'
      bordered
      scroll={{ x: 1000 }}
      locale={{
        emptyText: `${getNodeTypeDisplayName(nodeType)} 노드가 없습니다.`,
      }}
      onRow={node => ({
        onDoubleClick: () => {
          if (node.status === 'running') {
            onShowResourceModal(node);
          }
        },
      })}
    />
  );
};

export default NodeStatusTable;
