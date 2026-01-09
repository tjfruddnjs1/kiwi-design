import React from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Divider,
  Empty,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ServerResource } from '../../../types';

const { Text } = Typography;

// Reusable resource card component
interface ResourceCardProps {
  title: string;
  data: Array<{
    label: string;
    value: string | number;
    suffix?: string;
    color?: string;
  }>;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, data }) => (
  <Card
    size='small'
    title={<span style={{ fontSize: '15px', fontWeight: 600 }}>{title}</span>}
    styles={{ body: { padding: '16px' } }}
  >
    <Row gutter={[16, 16]}>
      {data.map(({ label, value, suffix, color }) => (
        <Col span={12} key={label}>
          <Statistic
            title={
              <span style={{ fontSize: '14px', color: '#666' }}>{label}</span>
            }
            value={value}
            suffix={suffix}
            valueStyle={{
              fontSize: '16px',
              fontWeight: 500,
              ...(color && { color }),
            }}
          />
        </Col>
      ))}
    </Row>
  </Card>
);

// Helper function to get usage color
const getUsageColor = (usage: number): string => {
  if (usage > 80) return '#cf1322';
  if (usage > 60) return '#faad14';

  return '#3f8600';
};

// 인터페이스 정의
interface ExternalNodesInfo {
  total: number;
  master: number;
  worker: number;
  list?: Array<{
    name: string;
    role: string;
    status: string;
  }>;
}

interface ExternalKubernetesPanelProps {
  externalNodesInfo: ExternalNodesInfo | null;
  serverResource: ServerResource | null;
  onConnect: () => void;
  loading?: boolean;
}

/**
 * 외부 Kubernetes 클러스터 관리 패널
 * 외부 Kubernetes 연결, 노드 정보 표시, 서버 리소스 모니터링
 */
const ExternalKubernetesPanel: React.FC<ExternalKubernetesPanelProps> = ({
  externalNodesInfo,
  serverResource,
  onConnect,
  loading = false,
}) => {
  return (
    <div className='infra-content-wrapper'>
      {/* 클러스터 통계 */}
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

      {/* 노드 정보 테이블 */}
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
            dataSource={externalNodesInfo.list || []}
            rowKey='name'
            pagination={false}
            size='small'
            className='infra-node-table'
          />

          {/* 서버 리소스 정보 */}
          {serverResource && (
            <div className='resource-cards' style={{ marginTop: '24px' }}>
              <Divider orientation='left'>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>
                  서버 리소스 정보
                </span>
              </Divider>

              <Row gutter={[24, 24]}>
                {/* 시스템 정보 카드 */}
                <Col span={24}>
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
                    <Row gutter={[32, 16]}>
                      <Col span={8}>
                        <Statistic
                          title={
                            <span style={{ fontSize: '14px', color: '#666' }}>
                              호스트명
                            </span>
                          }
                          value={serverResource.system?.hostname || '-'}
                          valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={
                            <span style={{ fontSize: '14px', color: '#666' }}>
                              운영체제
                            </span>
                          }
                          value={serverResource.system?.os || '-'}
                          valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={
                            <span style={{ fontSize: '14px', color: '#666' }}>
                              커널
                            </span>
                          }
                          value={serverResource.system?.kernel || '-'}
                          valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>

                <Col span={8}>
                  <ResourceCard
                    title='CPU'
                    data={[
                      {
                        label: '코어 수',
                        value: serverResource.cpu?.cores || 0,
                      },
                      {
                        label: '사용률',
                        value: parseInt(serverResource.cpu?.usage) || 0,
                        suffix: '%',
                        color: getUsageColor(
                          parseInt(serverResource.cpu?.usage) || 0
                        ),
                      },
                    ]}
                  />
                </Col>

                <Col span={8}>
                  <ResourceCard
                    title='메모리'
                    data={[
                      {
                        label: '총 용량',
                        value: serverResource.memory?.total || '-',
                      },
                      {
                        label: '사용률',
                        value: serverResource.memory?.usagePercent || 0,
                        suffix: '%',
                        color: getUsageColor(
                          serverResource.memory?.usagePercent || 0
                        ),
                      },
                    ]}
                  />
                </Col>

                <Col span={8}>
                  <ResourceCard
                    title='디스크'
                    data={[
                      {
                        label: '총 용량',
                        value: serverResource.disk?.total || '-',
                      },
                      {
                        label: '사용률',
                        value: serverResource.disk?.usagePercent || 0,
                        suffix: '%',
                        color: getUsageColor(
                          serverResource.disk?.usagePercent || 0
                        ),
                      },
                    ]}
                  />
                </Col>
              </Row>
            </div>
          )}
        </>
      ) : (
        <Empty description="클러스터 정보를 불러오려면 '연결' 버튼을 클릭하세요" />
      )}

      {/* 연결 버튼 */}
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button
            type='primary'
            icon={<ApiOutlined />}
            onClick={onConnect}
            loading={loading}
            size='middle'
            shape='round'
          >
            연결
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ExternalKubernetesPanel;
