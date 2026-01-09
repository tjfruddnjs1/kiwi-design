import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
  notification,
} from 'antd';
import {
  RocketOutlined,
  RollbackOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { Service, SshHop } from '../../../../../lib/api/types';
import type { K8sResource } from '../../../../../lib/api/k8s-resources';
import {
  getRolloutHistory,
  rolloutUndo,
} from '../../../../../lib/api/k8s-resources';

const { Text } = Typography;
const { TextArea } = Input;

interface K8sDeploymentTabProps {
  service?: Service | null;
  infraId?: number;
  deployments: K8sResource[];
  selectedDeployment: string;
  onDeploymentChange: (deploymentName: string) => void;
  deploymentStatus?: {
    replicas?: number;
    availableReplicas?: number;
  };
  sshHops?: SshHop[];
}

/**
 * Kubernetes 배포 관리 탭
 * 배포 히스토리 및 롤백을 관리합니다.
 */
const K8sDeploymentTab: React.FC<K8sDeploymentTabProps> = ({
  service,
  infraId: _infraId,
  deployments,
  selectedDeployment,
  onDeploymentChange,
  deploymentStatus,
  sshHops,
}) => {
  // Rollout history state
  const [rolloutHistory, setRolloutHistory] = useState<string>('');
  const [loadingRollout, setLoadingRollout] = useState(false);

  // Load rollout history
  const loadRolloutHistory = async () => {
    if (!service?.id || !selectedDeployment) {
      message.warning('Deployment를 선택해주세요');
      return;
    }

    setLoadingRollout(true);
    try {
      //  [수정] SSH hops 정보 전달 (500 에러 방지)
      const hopsToUse =
        sshHops && sshHops.length > 0
          ? sshHops.map(h => ({
              host: h.host,
              port: h.port || 22,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const result = await getRolloutHistory({
        service_id: service.id,
        deployment_name: selectedDeployment,
        hops: hopsToUse,
      });

      setRolloutHistory(result.history || '배포 히스토리가 없습니다');
      message.success('배포 히스토리를 조회했습니다');
    } catch (error) {
      const err = error as Error;
      message.error(`배포 히스토리 조회 실패: ${err.message}`);
      setRolloutHistory('배포 히스토리 조회에 실패했습니다');
    } finally {
      setLoadingRollout(false);
    }
  };

  // Rollback deployment
  const handleRollback = async () => {
    if (!service?.id || !selectedDeployment) {
      message.error('Deployment를 선택해주세요');
      return;
    }

    setLoadingRollout(true);
    try {
      //  [수정] SSH hops 정보 전달 (500 에러 방지)
      const hopsToUse =
        sshHops && sshHops.length > 0
          ? sshHops.map(h => ({
              host: h.host,
              port: h.port || 22,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const result = await rolloutUndo({
        service_id: service.id,
        deployment_name: selectedDeployment,
        hops: hopsToUse,
      });

      notification.success({
        message: '롤백 완료',
        description: result.message || '이전 버전으로 롤백했습니다',
        duration: 5,
      });

      // Reload rollout history
      loadRolloutHistory();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '롤백 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingRollout(false);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='Deployment 배포 관리'
        description='배포 히스토리 조회 및 롤백을 관리할 수 있습니다.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Deployment 선택 */}
      {deployments.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Space direction='vertical' style={{ width: '100%' }}>
            <div>
              <Text strong>Deployment 선택: </Text>
              <Select
                style={{ width: 400 }}
                value={selectedDeployment}
                onChange={onDeploymentChange}
                placeholder='Deployment를 선택하세요'
              >
                {deployments.map(deployment => (
                  <Select.Option
                    key={deployment.metadata?.name}
                    value={deployment.metadata?.name}
                  >
                    {deployment.metadata?.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <Text type='secondary'>
                선택된 Deployment: <Tag color='blue'>{selectedDeployment}</Tag>
              </Text>
              <Text type='secondary' style={{ marginLeft: 16 }}>
                현재 Pod 개수:{' '}
                <Tag color='green'>{deploymentStatus?.replicas || 0}</Tag>
              </Text>
              <Text type='secondary' style={{ marginLeft: 16 }}>
                가용 Pod:{' '}
                <Tag color='cyan'>
                  {deploymentStatus?.availableReplicas || 0}
                </Tag>
              </Text>
            </div>
          </Space>
        </Card>
      )}

      {/* Rollout 히스토리 & 롤백 */}
      <Card
        title={
          <Space>
            <RocketOutlined style={{ color: '#52c41a' }} />
            <Text strong>배포 히스토리 & 롤백</Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={loadRolloutHistory}
              loading={loadingRollout}
            >
              히스토리 조회
            </Button>
            <Popconfirm
              title='최근 배포로 롤백하시겠습니까?'
              onConfirm={() => handleRollback()}
              okText='롤백'
              cancelText='취소'
            >
              <Button
                type='primary'
                danger
                icon={<RollbackOutlined />}
                loading={loadingRollout}
              >
                즉시 롤백
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <TextArea
          value={rolloutHistory}
          readOnly
          rows={10}
          placeholder='배포 히스토리가 여기에 표시됩니다...'
          style={{
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 12,
          }}
        />
      </Card>
    </div>
  );
};

export default K8sDeploymentTab;
