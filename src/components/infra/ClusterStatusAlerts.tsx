import React from 'react';
import { Alert } from 'antd';

interface Node {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  status: string;
}

interface ClusterIntegrityCheck {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
}

interface ClusterStatusAlertsProps {
  nodes: Node[];
  criticalOperationCount: number;
  validateClusterIntegrity: (nodes: Node[]) => ClusterIntegrityCheck;
}

const ClusterStatusAlerts: React.FC<ClusterStatusAlertsProps> = ({
  nodes,
  criticalOperationCount,
  validateClusterIntegrity,
}) => {
  const integrityCheck = validateClusterIntegrity(nodes);

  return (
    <>
      {/* 클러스터 상태 경고 표시 */}
      {integrityCheck.warnings.length > 0 && (
        <Alert
          message='클러스터 상태 경고'
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {integrityCheck.warnings.map(warning => (
                <li key={warning}>{warning}</li>
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
    </>
  );
};

export default ClusterStatusAlerts;
