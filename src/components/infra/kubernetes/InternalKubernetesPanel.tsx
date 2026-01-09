import React from 'react';
import {
  Button,
  Typography,
  Space,
  Divider,
  Alert,
  List,
  type TableColumnsType,
} from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
// import KubernetesNodeTabs from './KubernetesNodeTabs'; // Unused import
import type { Node, NodeType } from './types';

const { Text } = Typography;

// 작업 히스토리 인터페이스
interface OperationRecord {
  id: string;
  type: string;
  node: Node;
  timestamp: string;
  status: 'success' | 'failed' | 'in_progress';
  message: string;
}

// 클러스터 무결성 검증 결과
interface ClusterIntegrityCheck {
  warnings: string[];
}

interface InternalKubernetesPanelProps {
  // 노드 데이터
  nodes: Node[];
  haNodes: Node[];
  masterNodes: Node[];
  workerNodes: Node[];

  // UI 상태
  activeTab: NodeType;
  setActiveTab: (tab: NodeType) => void;

  // 작업 상태
  criticalOperationCount: number;
  operationHistory: OperationRecord[];

  // 이벤트 핸들러
  onSettingsClick: () => void;
  validateClusterIntegrity: (nodes: Node[]) => ClusterIntegrityCheck;

  // 노드 테이블 컬럼 설정
  nodeColumns: TableColumnsType<Node>;
}

/**
 * 내부 Kubernetes 클러스터 관리 패널
 * 클러스터 상태, 노드 관리, 작업 히스토리를 포함
 */
const InternalKubernetesPanel: React.FC<InternalKubernetesPanelProps> = ({
  nodes,
  haNodes,
  masterNodes,
  workerNodes,
  _activeTab,
  _setActiveTab,
  criticalOperationCount,
  operationHistory,
  onSettingsClick,
  validateClusterIntegrity,
  _nodeColumns,
}) => {
  // 클러스터 상태 검증
  const integrityCheck = validateClusterIntegrity(nodes);

  return (
    <div className='infra-content-wrapper'>
      {/* 클러스터 상태 경고 표시 */}
      {integrityCheck.warnings.length > 0 && (
        <Alert
          message='클러스터 상태 경고'
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {integrityCheck.warnings.map(warning => (
                <li key={`warning-${warning}`}>{warning}</li>
              ))}
            </ul>
          }
          type='warning'
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 진행 중인 작업 표시 */}
      {criticalOperationCount > 0 && (
        <Alert
          message={`${criticalOperationCount}개의 중요 작업이 진행 중입니다`}
          description='동시에 너무 많은 작업을 수행하면 시스템이 불안정해질 수 있습니다.'
          type='info'
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 클러스터 통계 */}
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
            <ClusterOutlined
              className='node-stat-icon'
              style={{ color: '#52c41a' }}
            />
            <div>
              <Text className='node-stat-label'>HA 노드</Text>
              <Text className='node-stat-number'>{haNodes.length}개</Text>
            </div>
          </div>

          <div className='node-stat-item master-stat'>
            <ClusterOutlined
              className='node-stat-icon'
              style={{ color: '#1890ff' }}
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

      <Divider orientation='left'>노드 목록</Divider>

      {/* 노드 탭 컴포넌트 - 임시로 간소화된 버전 사용 */}
      <div style={{ marginTop: '16px' }}>
        <h4>노드 관리 (개발 중)</h4>
        <p>실제 KubernetesNodeTabs 컴포넌트 통합 예정</p>
      </div>

      {/* 설정 버튼 */}
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button
            type='primary'
            icon={<SettingOutlined />}
            onClick={onSettingsClick}
            size='middle'
            shape='round'
          >
            설정
          </Button>
        </Space>
      </div>

      {/* 최근 작업 히스토리 표시 (최근 5개만) */}
      {operationHistory.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Divider orientation='left'>최근 작업 히스토리</Divider>
          <List
            size='small'
            dataSource={operationHistory.slice(-5).reverse()}
            renderItem={operation => {
              const statusColor =
                operation.status === 'success'
                  ? '#52c41a'
                  : operation.status === 'failed'
                    ? '#ff4d4f'
                    : '#1890ff';

              const statusText =
                operation.status === 'success'
                  ? '성공'
                  : operation.status === 'failed'
                    ? '실패'
                    : '진행중';

              return (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        <strong>{operation.node.server_name}</strong> -{' '}
                        {operation.message}
                      </span>
                      <span style={{ color: statusColor, fontWeight: 500 }}>
                        {statusText}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '4px',
                      }}
                    >
                      {new Date(operation.timestamp).toLocaleString()}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InternalKubernetesPanel;
