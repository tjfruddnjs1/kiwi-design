import React from 'react';
import { Card, Space, Button, Typography, Alert } from 'antd';
import {
  ClusterOutlined,
  ApiOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface InfraKubernetesActionsProps {
  onInstallLoadBalancer: () => void;
  onInstallFirstMaster: () => void;
  onRenewCertificates: () => void;
  onCheckClusterStatus: () => void;
  loading: boolean;
  hasLoadBalancer: boolean;
  hasMaster: boolean;
}

const InfraKubernetesActions: React.FC<InfraKubernetesActionsProps> = ({
  onInstallLoadBalancer,
  onInstallFirstMaster,
  onRenewCertificates,
  onCheckClusterStatus,
  loading,
  hasLoadBalancer,
  hasMaster,
}) => {
  return (
    <Card title='클러스터 액션'>
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        {/* 클러스터 상태 확인 */}
        <div>
          <Title level={5}>클러스터 상태</Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={onCheckClusterStatus}
            loading={loading}
          >
            클러스터 상태 확인
          </Button>
        </div>

        {/* 로드밸런서 설치 */}
        <div>
          <Title level={5}>로드밸런서</Title>
          {hasLoadBalancer === false ? (
            <div>
              <Alert
                message='로드밸런서 미설치'
                description='HA 클러스터를 위해 로드밸런서를 설치해야 합니다.'
                type='warning'
                showIcon
                style={{ marginBottom: 8 }}
              />
              <Button
                type='primary'
                icon={<ApiOutlined />}
                onClick={onInstallLoadBalancer}
                loading={loading}
              >
                로드밸런서 설치
              </Button>
            </div>
          ) : (
            <Alert
              message='로드밸런서 설치됨'
              description='HA 클러스터를 위한 로드밸런서가 설치되어 있습니다.'
              type='success'
              showIcon
            />
          )}
        </div>

        {/* 첫 번째 마스터 설치 */}
        <div>
          <Title level={5}>첫 번째 마스터</Title>
          {hasMaster === false ? (
            <div>
              <Alert
                message='마스터 노드 미설치'
                description='클러스터의 첫 번째 마스터 노드를 설치해야 합니다.'
                type='warning'
                showIcon
                style={{ marginBottom: 8 }}
              />
              <Button
                type='primary'
                icon={<ClusterOutlined />}
                onClick={onInstallFirstMaster}
                loading={loading}
              >
                첫 번째 마스터 설치
              </Button>
            </div>
          ) : (
            <Alert
              message='마스터 노드 설치됨'
              description='클러스터의 첫 번째 마스터 노드가 설치되어 있습니다.'
              type='success'
              showIcon
            />
          )}
        </div>

        {/* 인증서 갱신 */}
        <div>
          <Title level={5}>인증서 관리</Title>
          <Text type='secondary'>
            클러스터 인증서를 갱신하여 보안을 강화합니다.
          </Text>
          <div style={{ marginTop: 8 }}>
            <Button
              icon={<ToolOutlined />}
              onClick={onRenewCertificates}
              loading={loading}
            >
              인증서 갱신
            </Button>
          </div>
        </div>

        {/* 클러스터 정보 */}
        <div>
          <Title level={5}>클러스터 정보</Title>
          <Space direction='vertical' size='small'>
            <Text>
              <ClusterOutlined /> Kubernetes 클러스터
            </Text>
            <Text type='secondary'>
              클러스터 관리를 위한 다양한 액션을 수행할 수 있습니다.
            </Text>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default InfraKubernetesActions;
