import React from 'react';
import { Typography } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  ApiOutlined,
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

interface NodeStatsDisplayProps {
  nodes: Node[];
  haNodes: Node[];
  masterNodes: Node[];
  workerNodes: Node[];
}

const NodeStatsDisplay: React.FC<NodeStatsDisplayProps> = ({
  nodes,
  haNodes,
  masterNodes,
  workerNodes,
}) => {
  return (
    <div className='infra-stats-container'>
      <div className='node-stat-group'>
        <div className='node-stat-item'>
          <CloudServerOutlined className='node-stat-icon' />
          <div>
            <Text className='node-stat-label'>총 노드 수</Text>
            <Text className='node-stat-number'>{nodes.length}개</Text>
          </div>
        </div>
        <div className='node-stat-item ha-stat'>
          <ApiOutlined
            className='node-stat-icon'
            style={{ color: '#1677ff' }}
          />
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
};

export default NodeStatsDisplay;
