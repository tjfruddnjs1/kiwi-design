import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Tag } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface Node {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  status: string;
}

interface InfraKubernetesOverviewProps {
  nodes: Node[];
  loading: boolean;
}

const InfraKubernetesOverview: React.FC<InfraKubernetesOverviewProps> = ({
  nodes,
  loading,
}) => {
  const getNodeTypeCount = (type: string) => {
    return nodes.filter(node => node.nodeType === type).length;
  };

  const getStatusCount = (status: string) => {
    return nodes.filter(node => node.status === status).length;
  };

  const masterNodes = getNodeTypeCount('master');
  const workerNodes = getNodeTypeCount('worker');
  const haNodes = getNodeTypeCount('ha');
  const runningNodes = getStatusCount('running');
  const totalNodes = nodes.length;

  return (
    <Card title='클러스터 개요' loading={loading}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title='전체 노드'
            value={totalNodes}
            prefix={<CloudServerOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title='마스터 노드'
            value={masterNodes}
            prefix={<ClusterOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title='워커 노드'
            value={workerNodes}
            prefix={<CloudServerOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title='HA 노드'
            value={haNodes}
            prefix={<ApiOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Space direction='vertical' size='small'>
          <Text strong>클러스터 상태:</Text>
          <Space>
            <Tag color={runningNodes === totalNodes ? 'green' : 'orange'}>
              {runningNodes === totalNodes ? (
                <CheckCircleOutlined />
              ) : (
                <CloseCircleOutlined />
              )}
              {runningNodes}/{totalNodes} 노드 실행 중
            </Tag>
            {runningNodes === totalNodes && totalNodes > 0 && (
              <Tag color='green'>클러스터 정상</Tag>
            )}
            {runningNodes < totalNodes && (
              <Tag color='orange'>일부 노드 문제</Tag>
            )}
          </Space>
        </Space>
      </div>
    </Card>
  );
};

export default InfraKubernetesOverview;
