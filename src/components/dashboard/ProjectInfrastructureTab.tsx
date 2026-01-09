import React, { memo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Statistic,
  Tag,
  Table,
  Badge,
  Typography,
  Space,
  Button,
  Tooltip,
  Alert,
} from 'antd';
import {
  CloudServerOutlined,
  DashboardOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  mockInfrastructureClusters,
  mockCostOptimization,
  type InfrastructureCluster,
} from '../../data/mockAIDevOpsData';

const { Title, Text } = Typography;

interface ProjectInfrastructureTabProps {
  selectedProjectId?: string | null;
}

const ProjectInfrastructureTab: React.FC<ProjectInfrastructureTabProps> = memo(
  ({ selectedProjectId }) => {
    const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

    // 환경별 상태 색상 매핑
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy':
          return 'success';
        case 'warning':
          return 'warning';
        case 'critical':
          return 'error';
        default:
          return 'default';
      }
    };

    // 환경별 색상 매핑
    const getEnvironmentColor = (environment: string) => {
      switch (environment) {
        case 'production':
          return 'red';
        case 'staging':
          return 'orange';
        case 'development':
          return 'blue';
        default:
          return 'default';
      }
    };

    // 클러스터 카드 컴포넌트
    const ClusterCard: React.FC<{ cluster: InfrastructureCluster }> = ({
      cluster,
    }) => (
      <Card
        hoverable
        onClick={() => setSelectedCluster(cluster.id)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedCluster(cluster.id);
          }
        }}
        role='button'
        tabIndex={0}
        style={{
          borderLeft: `4px solid ${cluster.status === 'healthy' ? '#52c41a' : cluster.status === 'warning' ? '#faad14' : '#ff4d4f'}`,
          backgroundColor: selectedCluster === cluster.id ? '#f6ffed' : 'white',
        }}
        actions={[
          <Tooltip key='monitor' title='모니터링'>
            <EyeOutlined />
          </Tooltip>,
          <Tooltip key='setting' title='설정'>
            <SettingOutlined />
          </Tooltip>,
          <Tooltip key='metrics' title='메트릭'>
            <BarChartOutlined />
          </Tooltip>,
        ]}
      >
        <Card.Meta
          avatar={
            <CloudServerOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          }
          title={
            <Space>
              <span>{cluster.name}</span>
              <Tag color={getEnvironmentColor(cluster.environment)}>
                {cluster.environment}
              </Tag>
              <Badge
                status={getStatusColor(cluster.status) as any}
                text={cluster.status}
              />
            </Space>
          }
          description={
            <div>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={6}>
                  <Statistic
                    title='CPU'
                    value={cluster.metrics.cpuUsage}
                    suffix='%'
                    valueStyle={{ fontSize: 14 }}
                  />
                  <Progress
                    percent={cluster.metrics.cpuUsage}
                    showInfo={false}
                    size='small'
                    strokeColor={
                      cluster.metrics.cpuUsage > 80 ? '#ff4d4f' : '#52c41a'
                    }
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title='Memory'
                    value={cluster.metrics.memoryUsage}
                    suffix='%'
                    valueStyle={{ fontSize: 14 }}
                  />
                  <Progress
                    percent={cluster.metrics.memoryUsage}
                    showInfo={false}
                    size='small'
                    strokeColor={
                      cluster.metrics.memoryUsage > 80 ? '#ff4d4f' : '#52c41a'
                    }
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title='Nodes'
                    value={cluster.metrics.activeNodes}
                    suffix={`/${cluster.metrics.totalNodes}`}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title='Pods'
                    value={cluster.metrics.podsRunning}
                    suffix={`/${cluster.metrics.podsTotal}`}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
              </Row>
              {cluster.status === 'warning' && (
                <Alert
                  message={`주의: ${cluster.healthChecks.find(check => check.status === 'warning')?.details || '리소스 부족'}`}
                  type='warning'
                  showIcon
                  style={{ marginTop: 12 }}
                  size='small'
                />
              )}
            </div>
          }
        />
      </Card>
    );

    // 헬스체크 테이블 컬럼
    const healthCheckColumns = [
      {
        title: '헬스체크',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Badge status={getStatusColor(status) as any} text={status} />
        ),
      },
      {
        title: '마지막 확인',
        dataIndex: 'lastCheck',
        key: 'lastCheck',
      },
      {
        title: '세부사항',
        dataIndex: 'details',
        key: 'details',
        render: (details: string) => details || '-',
      },
    ];

    // 선택된 클러스터 정보
    const selectedClusterData = mockInfrastructureClusters.find(
      cluster => cluster.id === selectedCluster
    );

    return (
      <div className='project-infrastructure-tab'>
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            <CloudServerOutlined /> 프로젝트 인프라
          </Title>
          <Text type='secondary'>
            {selectedProjectId
              ? `${selectedProjectId} 프로젝트`
              : '전체 프로젝트'}
            의 인프라 리소스 현황을 모니터링합니다
          </Text>
        </div>

        {/* 비용 최적화 요약 */}
        <Card style={{ marginBottom: 16 }} title='💰 비용 최적화 현황'>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title='월 총 비용'
                value={mockCostOptimization.totalMonthlyCost}
                prefix={<DollarOutlined />}
                suffix='USD'
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title='절약 가능'
                value={mockCostOptimization.savings.potential}
                prefix={<ThunderboltOutlined />}
                suffix='USD'
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title='구현된 절약'
                value={mockCostOptimization.savings.implemented}
                prefix={<CheckCircleOutlined />}
                suffix='USD'
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <div>
                <Text strong>비용 트렌드</Text>
                <br />
                <Tag
                  color={
                    mockCostOptimization.costTrend === 'increasing'
                      ? 'red'
                      : 'green'
                  }
                >
                  {mockCostOptimization.costTrend === 'increasing'
                    ? '증가'
                    : '감소'}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 클러스터 현황 */}
        <Card title='🖥️ 클러스터 현황' style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {mockInfrastructureClusters.map(cluster => (
              <Col xs={24} sm={12} lg={8} key={cluster.id}>
                <ClusterCard cluster={cluster} />
              </Col>
            ))}
          </Row>
        </Card>

        {/* 선택된 클러스터 상세 정보 */}
        {selectedClusterData && (
          <Row gutter={16}>
            <Col span={16}>
              <Card title={`🔍 ${selectedClusterData.name} 상세 정보`}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size='small' title='리소스 사용률' type='inner'>
                      <div style={{ marginBottom: 12 }}>
                        <Text>CPU 사용률</Text>
                        <Progress
                          percent={selectedClusterData.metrics.cpuUsage}
                          strokeColor={
                            selectedClusterData.metrics.cpuUsage > 80
                              ? '#ff4d4f'
                              : '#52c41a'
                          }
                        />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <Text>메모리 사용률</Text>
                        <Progress
                          percent={selectedClusterData.metrics.memoryUsage}
                          strokeColor={
                            selectedClusterData.metrics.memoryUsage > 80
                              ? '#ff4d4f'
                              : '#52c41a'
                          }
                        />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <Text>디스크 사용률</Text>
                        <Progress
                          percent={selectedClusterData.metrics.diskUsage}
                          strokeColor={
                            selectedClusterData.metrics.diskUsage > 80
                              ? '#ff4d4f'
                              : '#52c41a'
                          }
                        />
                      </div>
                      <div>
                        <Text>네트워크 로드</Text>
                        <Progress
                          percent={selectedClusterData.metrics.networkLoad}
                          strokeColor={
                            selectedClusterData.metrics.networkLoad > 80
                              ? '#ff4d4f'
                              : '#52c41a'
                          }
                        />
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size='small' title='AI 최적화 제안' type='inner'>
                      <Statistic
                        title='예상 월 절약액'
                        value={selectedClusterData.aiOptimizations.costSaving}
                        prefix={<DollarOutlined />}
                        suffix='USD'
                        valueStyle={{ color: '#52c41a', marginBottom: 12 }}
                      />
                      <Statistic
                        title='성능 개선율'
                        value={
                          selectedClusterData.aiOptimizations.performanceGain
                        }
                        suffix='%'
                        valueStyle={{ color: '#1890ff', marginBottom: 12 }}
                      />
                      <div>
                        <Text strong>제안사항:</Text>
                        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                          {selectedClusterData.aiOptimizations.suggestions.map(
                            (suggestion, index) => (
                              <li
                                key={index}
                                style={{ fontSize: '13px', marginBottom: 4 }}
                              >
                                {suggestion}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  size='small'
                  title='헬스체크 상태'
                  type='inner'
                  style={{ marginTop: 16 }}
                >
                  <Table
                    columns={healthCheckColumns}
                    dataSource={selectedClusterData.healthChecks}
                    pagination={false}
                    size='small'
                    rowKey='name'
                  />
                </Card>
              </Card>
            </Col>

            <Col span={8}>
              <Card title='⚡ 빠른 액션'>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <Button type='primary' icon={<DashboardOutlined />} block>
                    모니터링 대시보드
                  </Button>
                  <Button icon={<SettingOutlined />} block>
                    클러스터 설정
                  </Button>
                  <Button icon={<ThunderboltOutlined />} block>
                    스케일링 관리
                  </Button>
                  <Button icon={<BarChartOutlined />} block>
                    성능 분석
                  </Button>
                  <Button danger icon={<WarningOutlined />} block>
                    알림 관리
                  </Button>
                </Space>
              </Card>

              <Card title='📊 비용 분석' style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <Text>컴퓨팅</Text>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Progress
                      percent={
                        (mockCostOptimization.breakdown.compute /
                          mockCostOptimization.totalMonthlyCost) *
                        100
                      }
                      showInfo={false}
                      style={{ width: '70%' }}
                    />
                    <Text strong>
                      ${mockCostOptimization.breakdown.compute}
                    </Text>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text>스토리지</Text>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Progress
                      percent={
                        (mockCostOptimization.breakdown.storage /
                          mockCostOptimization.totalMonthlyCost) *
                        100
                      }
                      showInfo={false}
                      style={{ width: '70%' }}
                    />
                    <Text strong>
                      ${mockCostOptimization.breakdown.storage}
                    </Text>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text>네트워크</Text>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Progress
                      percent={
                        (mockCostOptimization.breakdown.network /
                          mockCostOptimization.totalMonthlyCost) *
                        100
                      }
                      showInfo={false}
                      style={{ width: '70%' }}
                    />
                    <Text strong>
                      ${mockCostOptimization.breakdown.network}
                    </Text>
                  </div>
                </div>
                <div>
                  <Text>서비스</Text>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Progress
                      percent={
                        (mockCostOptimization.breakdown.services /
                          mockCostOptimization.totalMonthlyCost) *
                        100
                      }
                      showInfo={false}
                      style={{ width: '70%' }}
                    />
                    <Text strong>
                      ${mockCostOptimization.breakdown.services}
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    );
  }
);

ProjectInfrastructureTab.displayName = 'ProjectInfrastructureTab';

export default ProjectInfrastructureTab;
