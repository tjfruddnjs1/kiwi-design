import React from 'react';
import { Card, Table, Button, Space, Tag, Typography, Tooltip } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  ApiOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  PoweroffOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface Node {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  status: string;
  last_checked?: string;
}

interface InfraKubernetesNodesProps {
  nodes: Node[];
  loading: boolean;
  onAddNode: (nodeType: 'master' | 'worker' | 'ha') => void;
  onDeleteNode: (node: Node) => void;
  onStartNode: (node: Node) => void;
  onStopNode: (node: Node) => void;
  onRestartNode: (node: Node) => void;
  onCheckStatus: (node: Node) => void;
}

const InfraKubernetesNodes: React.FC<InfraKubernetesNodesProps> = ({
  nodes,
  loading,
  onAddNode,
  onDeleteNode,
  onStartNode,
  onStopNode,
  onRestartNode,
  onCheckStatus,
}) => {
  const getNodeTypeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'master':
        return <ClusterOutlined />;
      case 'worker':
        return <CloudServerOutlined />;
      case 'ha':
        return <ApiOutlined />;
      default:
        return <CloudServerOutlined />;
    }
  };

  const getNodeTypeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'master':
        return 'green';
      case 'worker':
        return 'blue';
      case 'ha':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'green';
      case 'stopped':
        return 'red';
      case 'inactive':
        return 'gray';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '노드 타입',
      dataIndex: 'nodeType',
      key: 'nodeType',
      render: (nodeType: string) => (
        <Tag
          color={getNodeTypeColor(nodeType)}
          icon={getNodeTypeIcon(nodeType)}
        >
          {nodeType.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '서버 이름',
      dataIndex: 'server_name',
      key: 'server_name',
      render: (serverName: string, record: Node) => (
        <Text strong>{serverName || record.ip}</Text>
      ),
    },
    {
      title: 'IP 주소',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string) => <Text code>{ip}</Text>,
    },
    {
      title: '포트',
      dataIndex: 'port',
      key: 'port',
      render: (port: string) => <Text>{port}</Text>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '마지막 확인',
      dataIndex: 'last_checked',
      key: 'last_checked',
      render: (lastChecked: string) => (
        <Text type='secondary' style={{ fontSize: '12px' }}>
          {lastChecked ? new Date(lastChecked).toLocaleString('ko-KR') : '-'}
        </Text>
      ),
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: unknown, record: Node) => (
        <Space size='small'>
          <Tooltip title='상태 확인'>
            <Button
              size='small'
              icon={<ReloadOutlined />}
              onClick={() => onCheckStatus(record)}
            />
          </Tooltip>

          {record.status === 'stopped' && (
            <Tooltip title='시작'>
              <Button
                size='small'
                icon={<PlayCircleOutlined />}
                onClick={() => onStartNode(record)}
              />
            </Tooltip>
          )}

          {record.status === 'running' && (
            <Tooltip title='중지'>
              <Button
                size='small'
                icon={<PoweroffOutlined />}
                onClick={() => onStopNode(record)}
              />
            </Tooltip>
          )}

          <Tooltip title='재시작'>
            <Button
              size='small'
              icon={<ReloadOutlined />}
              onClick={() => onRestartNode(record)}
            />
          </Tooltip>

          <Tooltip title='삭제'>
            <Button
              size='small'
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteNode(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title='노드 관리'
      extra={
        <Space>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => onAddNode('master')}
          >
            마스터 추가
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => onAddNode('worker')}>
            워커 추가
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => onAddNode('ha')}>
            HA 추가
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={nodes.map((node, index) => ({ ...node, key: index }))}
        loading={loading}
        pagination={false}
        size='small'
        scroll={{ x: true }}
      />
    </Card>
  );
};

export default InfraKubernetesNodes;
