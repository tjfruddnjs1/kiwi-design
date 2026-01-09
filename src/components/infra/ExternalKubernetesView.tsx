import React from 'react';
import {
  Table,
  Tag,
  Empty,
  Divider,
  Button,
  Space,
  Row,
  Col,
  Card,
  Statistic,
  Typography,
} from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useExternalKubernetes } from '../../hooks/useExternalKubernetes';
import { ExternalKubeAuthModal } from './modals';

const { Text } = Typography;

interface ServerResource {
  cpu: {
    cores: string;
    usage_percent: string;
    model: string;
  };
  memory: {
    total_mb: string;
    used_mb: string;
    usage_percent: string;
  };
  disk: {
    root_total: string;
    root_used: string;
    root_usage_percent: string;
  };
}

interface ExternalKubernetesViewProps {
  onAuthConfirm: (server: {
    ip: string;
    port: string;
    username: string;
    password: string;
  }) => Promise<void>;
}

const ExternalKubernetesView: React.FC<ExternalKubernetesViewProps> = ({
  onAuthConfirm,
}) => {
  const {
    externalServer,
    externalNodesInfo,
    serverResource,
    externalAuthModalVisible,
    showExternalAuthModal,
    hideExternalAuthModal,
    checkingLoading,
  } = useExternalKubernetes();

  const renderResourceCards = (resource: ServerResource) => (
    <div className='resource-cards' style={{ marginTop: '24px' }}>
      <Divider orientation='left'>
        <span style={{ fontSize: '16px', fontWeight: 600 }}>
          서버 리소스 정보
        </span>
      </Divider>
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Card
            size='small'
            title={
              <span style={{ fontSize: '15px', fontWeight: 600 }}>
                시스템 정보
              </span>
            }
            styles={{ body: { padding: '16px' } }}
            style={{ marginBottom: '16px' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      코어
                    </span>
                  }
                  value={resource.cpu.cores}
                  valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      사용량
                    </span>
                  }
                  value={resource.cpu.usage_percent}
                  suffix='%'
                  valueStyle={{
                    color:
                      parseInt(resource.cpu.usage_percent) > 80
                        ? '#cf1322'
                        : parseInt(resource.cpu.usage_percent) > 60
                          ? '#faad14'
                          : '#3f8600',
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                />
              </Col>
              <Col span={24} style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>모델</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {resource.cpu.model}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            size='small'
            title={
              <span style={{ fontSize: '15px', fontWeight: 600 }}>메모리</span>
            }
            styles={{ body: { padding: '16px' } }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      전체
                    </span>
                  }
                  value={`${Math.round(parseInt(resource.memory.total_mb) / 1024)} GB`}
                  valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      사용 중
                    </span>
                  }
                  value={`${Math.round((parseInt(resource.memory.used_mb) / 1024) * 10) / 10} GB`}
                  valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                />
              </Col>
              <Col span={24} style={{ marginTop: '8px' }}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      사용량
                    </span>
                  }
                  value={resource.memory.usage_percent}
                  suffix='%'
                  valueStyle={{
                    color:
                      parseInt(resource.memory.usage_percent) > 80
                        ? '#cf1322'
                        : parseInt(resource.memory.usage_percent) > 60
                          ? '#faad14'
                          : '#3f8600',
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            size='small'
            title={
              <span style={{ fontSize: '15px', fontWeight: 600 }}>디스크</span>
            }
            styles={{ body: { padding: '16px' } }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      전체
                    </span>
                  }
                  value={resource.disk.root_total}
                  valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      사용 중
                    </span>
                  }
                  value={resource.disk.root_used}
                  valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                />
              </Col>
              <Col span={24} style={{ marginTop: '8px' }}>
                <Statistic
                  title={
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      사용량
                    </span>
                  }
                  value={resource.disk.root_usage_percent}
                  suffix='%'
                  valueStyle={{
                    color:
                      parseInt(resource.disk.root_usage_percent) > 80
                        ? '#cf1322'
                        : parseInt(resource.disk.root_usage_percent) > 60
                          ? '#faad14'
                          : '#3f8600',
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <div className='infra-content-wrapper'>
      <div className='infra-stats-container'>
        <div className='node-stat-group'>
          <div className='node-stat-item'>
            <CloudServerOutlined className='node-stat-icon' />
            <div>
              <Text className='node-stat-label'>총 노드 수</Text>
              <Text className='node-stat-number'>
                {externalNodesInfo?.total || 0}개
              </Text>
            </div>
          </div>
          <div className='node-stat-item master-stat'>
            <ClusterOutlined
              className='node-stat-icon'
              style={{ color: '#52c41a' }}
            />
            <div>
              <Text className='node-stat-label'>마스터 노드</Text>
              <Text className='node-stat-number'>
                {externalNodesInfo?.master || 0}개
              </Text>
            </div>
          </div>
          <div className='node-stat-item worker-stat'>
            <CloudServerOutlined
              className='node-stat-icon'
              style={{ color: '#fa541c' }}
            />
            <div>
              <Text className='node-stat-label'>워커 노드</Text>
              <Text className='node-stat-number'>
                {externalNodesInfo?.worker || 0}개
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Divider orientation='left'>외부 쿠버네티스 클러스터</Divider>

      {externalNodesInfo ? (
        <>
          <Table
            columns={[
              { title: '노드명', dataIndex: 'name', key: 'name' },
              {
                title: '역할',
                dataIndex: 'role',
                key: 'role',
                render: (role: string) => (
                  <Tag color={role === 'master' ? 'green' : 'orange'}>
                    {role}
                  </Tag>
                ),
              },
              {
                title: '상태',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={status === 'Ready' ? 'success' : 'error'}>
                    {status}
                  </Tag>
                ),
              },
            ]}
            dataSource={externalNodesInfo.list}
            rowKey='name'
            pagination={false}
            size='small'
            className='infra-node-table'
          />

          {serverResource && renderResourceCards(serverResource)}
        </>
      ) : (
        <Empty description="클러스터 정보를 불러오려면 '연결' 버튼을 클릭하세요" />
      )}

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button
            type='primary'
            icon={<ApiOutlined />}
            onClick={showExternalAuthModal}
            size='middle'
            shape='round'
          >
            연결
          </Button>
        </Space>
      </div>

      <ExternalKubeAuthModal
        visible={externalAuthModalVisible}
        onClose={hideExternalAuthModal}
        onConfirm={onAuthConfirm}
        loading={checkingLoading}
        server={externalServer || { ip: '', port: '' }}
      />
    </div>
  );
};

export default ExternalKubernetesView;
