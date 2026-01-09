import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Space,
  Tag,
  Button,
  Typography,
  Table,
  Descriptions,
  Alert,
  Divider,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  CloudServerOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  RocketOutlined,
  FileTextOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  ToolOutlined,
  NodeIndexOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { Service } from '../../../../../lib/api/types';
import type { PodInfo } from '../../../../../types/operate-modal';
import type { DockerSystemInfo } from '../../../../../lib/api/docker';
import { getDisplayInfraType } from '../../../../../utils/infraUtils';

const { Text, Title } = Typography;

interface OverviewTabProps {
  // 공통
  service?: Service | null;
  loading: boolean;
  onRefresh: () => void;

  // 인프라 타입 체크
  isContainerInfra: boolean;
  isDockerInfra: boolean;
  isPodmanInfra: boolean;

  // Docker/Podman 데이터
  containers?: Array<{
    id: string;
    name: string;
    status: string;
    image?: string;
  }>;
  loadingContainers?: boolean;
  dockerSystemInfo?: DockerSystemInfo | null;
  dockerImages?: any[];
  dockerVolumes?: any[];
  dockerNetworks?: any[];
  deployedImageInfo?: {
    deployed_image_tag?: string;
    deployed_image?: string;
    registry?: string;
    namespace?: string;
    deployed_at?: string;
    primary_deployed_image?: string;
    actual_deployed_images?: string[];
  } | null;

  // Kubernetes 데이터
  pods?: PodInfo[];
  deploymentStatus?: {
    replicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
    readyReplicas?: number;
    status?: string;
  };
  deploymentDetails?: any;
  ingressDomains?: string[];
  latestBuildImageTag?: string;
  resourceInfo?: {
    cpu_model: string;
    cpu_cores: string;
    cpu_usage: string;
    mem_total: string;
    mem_used: string;
    mem_free: string;
    mem_usage: string;
    disk_total: string;
    disk_used: string;
    disk_free: string;
    disk_usage: string;
    network_info: string;
    hostname: string;
    os_name: string;
    kernel: string;
  } | null;
  loadingResource?: boolean;
}

/**
 * 개요 탭 - Kubernetes, Docker, Podman 모두 지원
 */
const OverviewTab: React.FC<OverviewTabProps> = ({
  service,
  loading,
  onRefresh,
  isContainerInfra,
  isDockerInfra,
  isPodmanInfra,
  containers = [],
  loadingContainers = false,
  dockerSystemInfo,
  dockerImages = [],
  dockerVolumes = [],
  dockerNetworks = [],
  deployedImageInfo,
  pods = [],
  deploymentStatus,
  deploymentDetails,
  ingressDomains = [],
  latestBuildImageTag,
  resourceInfo,
  loadingResource = false,
}) => {
  // Docker/Podman 인프라인 경우
  if (isContainerInfra) {
    const runtimeType = isDockerInfra ? 'Docker' : 'Podman';
    const runningContainers = containers.filter(c =>
      c.status?.toLowerCase().includes('up')
    ).length;
    const stoppedContainers = containers.filter(c => {
      const status = c.status?.toLowerCase() || '';
      return (
        status.includes('exited') ||
        status.includes('stopped') ||
        status.includes('created')
      );
    }).length;
    const pausedContainers = containers.filter(c =>
      c.status?.toLowerCase().includes('paused')
    ).length;

    return (
      <Spin spinning={loadingContainers}>
        <div style={{ padding: '16px 0' }}>
          {/* 서비스 상태 카드 */}
          <Card
            title={
              <Space>
                <DashboardOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  서비스 상태
                </span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title='서비스 이름'
                  value={service?.name || '-'}
                  prefix={<CloudServerOutlined />}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title='인프라 타입'
                  value={getDisplayInfraType(service?.infraType || '')}
                  prefix={<ApiOutlined />}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title='컨테이너 개수'
                  value={containers.length}
                  suffix='개'
                  prefix={
                    runningContainers === containers.length &&
                    containers.length > 0 ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )
                  }
                  valueStyle={{
                    fontSize: 16,
                    color:
                      runningContainers === containers.length &&
                      containers.length > 0
                        ? '#52c41a'
                        : '#faad14',
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title='상태'
                  value={
                    runningContainers > 0
                      ? 'Running'
                      : containers.length === 0
                        ? 'No Containers'
                        : 'Stopped'
                  }
                  prefix={
                    runningContainers > 0 ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )
                  }
                  valueStyle={{
                    fontSize: 16,
                    color: runningContainers > 0 ? '#52c41a' : '#faad14',
                  }}
                />
              </Col>
            </Row>

            {/* 배포된 이미지 버전 정보 */}
            {deployedImageInfo?.deployed_image_tag && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <div>
                    <Text
                      type='secondary'
                      style={{ display: 'block', marginBottom: 8 }}
                    >
                      배포된 이미지 버전:
                    </Text>
                    <Tag
                      color='blue'
                      icon={<RocketOutlined />}
                      style={{ fontSize: 14, padding: '4px 12px' }}
                    >
                      {deployedImageInfo.deployed_image_tag}
                    </Tag>
                  </div>
                </Col>
              </Row>
            )}
          </Card>

          {/* 컨테이너 상태 분포 */}
          <Card
            title={
              <Space>
                <DatabaseOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  컨테이너 상태
                </span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title='실행 중'
                  value={runningContainers}
                  suffix={`/ ${containers.length}`}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: 20 }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title='중지됨'
                  value={stoppedContainers}
                  suffix={`/ ${containers.length}`}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title='일시 중지'
                  value={pausedContainers}
                  suffix={`/ ${containers.length}`}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: 20 }}
                />
              </Col>
            </Row>
            {containers.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={Math.round(
                    (runningContainers / containers.length) * 100
                  )}
                  success={{
                    percent: Math.round(
                      (runningContainers / containers.length) * 100
                    ),
                  }}
                  strokeColor='#52c41a'
                />
              </div>
            )}
          </Card>

          {/* Docker 시스템 정보 */}
          {dockerSystemInfo && (
            <Card
              title={
                <Space>
                  <ToolOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {runtimeType} 시스템 정보
                  </span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title={`${isDockerInfra ? 'Docker' : 'Podman'} 버전`}
                    value={dockerSystemInfo.docker_version || '-'}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title='API 버전'
                    value={dockerSystemInfo.api_version || '-'}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title='전체 컨테이너'
                    value={dockerSystemInfo.containers?.total || 0}
                    suffix='개'
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title='전체 이미지'
                    value={dockerSystemInfo.images_total || 0}
                    suffix='개'
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
              </Row>

              {/* 디스크 사용량 정보 */}
              {dockerSystemInfo.disk_usage &&
                dockerSystemInfo.disk_usage.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>
                      디스크 사용량:
                    </Text>
                    <Table
                      dataSource={dockerSystemInfo.disk_usage}
                      columns={[
                        {
                          title: '타입',
                          dataIndex: 'type',
                          key: 'type',
                          render: (type: string) => (
                            <Tag
                              color={
                                type === 'Images'
                                  ? 'blue'
                                  : type === 'Containers'
                                    ? 'green'
                                    : type === 'Volumes'
                                      ? 'orange'
                                      : 'purple'
                              }
                            >
                              {type}
                            </Tag>
                          ),
                        },
                        {
                          title: '개수',
                          dataIndex: 'total_count',
                          key: 'total_count',
                        },
                        {
                          title: '전체 크기',
                          dataIndex: 'size',
                          key: 'size',
                        },
                        {
                          title: '회수 가능',
                          dataIndex: 'reclaimable',
                          key: 'reclaimable',
                        },
                      ]}
                      rowKey='type'
                      pagination={false}
                      size='small'
                    />
                  </div>
                )}
            </Card>
          )}

          {/* 리소스 현황 */}
          <Card
            title={
              <Space>
                <NodeIndexOutlined style={{ fontSize: 20, color: '#13c2c2' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  리소스 현황
                </span>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title='이미지'
                  value={dockerImages.length}
                  suffix='개'
                  prefix={<DatabaseOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title='볼륨'
                  value={dockerVolumes.length}
                  suffix='개'
                  prefix={<DatabaseOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title='네트워크'
                  value={dockerNetworks.length}
                  suffix='개'
                  prefix={<GlobalOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>
        </div>
      </Spin>
    );
  }

  // Podman 인프라인 경우
  if (isPodmanInfra) {
    return <></>;
  }

  // Kubernetes 인프라 개요 탭
  const totalPods = pods.length;
  const runningPods = pods.filter(p => p.status === 'Running').length;
  const pendingPods = pods.filter(p => p.status === 'Pending').length;
  const failedPods = pods.filter(
    p => p.status === 'Failed' || p.status === 'CrashLoopBackOff'
  ).length;

  // 배포된 이미지를 사용하는 Pod 개수
  const podsWithDeployedImage = deployedImageInfo?.deployed_image_tag
    ? pods.filter(p =>
        p.image?.includes(deployedImageInfo.deployed_image_tag || '')
      ).length
    : 0;

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '16px 0' }}>
        {/* 서비스 상태 카드 */}
        <Card
          title={
            <Space>
              <DashboardOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Title level={5} style={{ margin: 0 }}>
                서비스 상태
              </Title>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title='서비스 이름'
                value={service?.name || '-'}
                prefix={<CloudServerOutlined />}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title='네임스페이스'
                value={service?.namespace || 'default'}
                prefix={<ApiOutlined />}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title='Pod 개수'
                value={pods.length}
                suffix='개'
                prefix={
                  runningPods === totalPods && totalPods > 0 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <WarningOutlined style={{ color: '#faad14' }} />
                  )
                }
                valueStyle={{
                  fontSize: 16,
                  color:
                    runningPods === totalPods && totalPods > 0
                      ? '#52c41a'
                      : '#faad14',
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title='상태'
                value={
                  deploymentStatus?.availableReplicas &&
                  deploymentStatus.availableReplicas > 0
                    ? 'Running'
                    : deploymentStatus?.replicas === 0
                      ? 'Stopped'
                      : 'Starting'
                }
                prefix={
                  deploymentStatus?.availableReplicas &&
                  deploymentStatus.availableReplicas > 0 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <WarningOutlined style={{ color: '#faad14' }} />
                  )
                }
                valueStyle={{
                  fontSize: 16,
                  color:
                    deploymentStatus?.availableReplicas &&
                    deploymentStatus.availableReplicas > 0
                      ? '#52c41a'
                      : '#faad14',
                }}
              />
            </Col>
          </Row>
          {/* 도메인 및 이미지 버전 정보 */}
          {(ingressDomains.length > 0 ||
            deployedImageInfo?.deployed_image_tag) && (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {ingressDomains.length > 0 && (
                <Col
                  xs={24}
                  md={deployedImageInfo?.deployed_image_tag ? 12 : 24}
                >
                  <div>
                    <Text
                      type='secondary'
                      style={{ display: 'block', marginBottom: 8 }}
                    >
                      도메인:
                    </Text>
                    <Space wrap>
                      {ingressDomains.map((domain, index) => (
                        <Tag
                          key={index}
                          color='blue'
                          icon={<GlobalOutlined />}
                          style={{ fontSize: 14, padding: '4px 12px' }}
                        >
                          <a
                            href={`https://${domain}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{ color: 'inherit' }}
                          >
                            {domain}
                          </a>
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </Col>
              )}
              {deployedImageInfo?.deployed_image_tag && (
                <Col xs={24} md={ingressDomains.length > 0 ? 12 : 24}>
                  <div>
                    <Text
                      type='secondary'
                      style={{ display: 'block', marginBottom: 8 }}
                    >
                      배포된 이미지 버전:
                    </Text>
                    <Space>
                      <Tag
                        color='blue'
                        style={{ fontSize: 14, padding: '4px 12px' }}
                      >
                        {deployedImageInfo.deployed_image_tag}
                      </Tag>
                      {latestBuildImageTag &&
                        deployedImageInfo.deployed_image_tag ===
                          latestBuildImageTag && (
                          <Tag
                            color='success'
                            icon={<CheckCircleOutlined />}
                            style={{ fontSize: 13 }}
                          >
                            최신
                          </Tag>
                        )}
                    </Space>
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Card>

        {/* 배포된 이미지 상세 정보 - 최신이 아닐 때만 표시 */}
        {deployedImageInfo &&
          latestBuildImageTag &&
          deployedImageInfo.deployed_image_tag !== latestBuildImageTag && (
            <Card
              title={
                <Space>
                  <RocketOutlined style={{ fontSize: 20, color: '#faad14' }} />
                  <Title level={5} style={{ margin: 0 }}>
                    배포 업데이트 가능
                  </Title>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size='small' column={1}>
                <Descriptions.Item label='현재 배포된 이미지'>
                  <Tag color='blue' style={{ fontSize: 14 }}>
                    {deployedImageInfo.deployed_image_tag}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label='최신 빌드 이미지'>
                  <Tag color='green' style={{ fontSize: 14 }}>
                    {latestBuildImageTag}
                  </Tag>
                </Descriptions.Item>
                {deployedImageInfo.deployed_image && (
                  <Descriptions.Item label='이미지 경로'>
                    <Text code style={{ fontSize: 13 }}>
                      {deployedImageInfo.deployed_image}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
              <Alert
                message='새로운 빌드가 있습니다'
                description={
                  <div>
                    최신 빌드 이미지{' '}
                    <Tag color='green'>{latestBuildImageTag}</Tag>로 재배포를
                    고려해보세요.
                  </div>
                }
                type='info'
                showIcon
                style={{ marginTop: 12 }}
              />
            </Card>
          )}

        {/* 배포 상세 정보 */}
        {deploymentDetails && (
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <Title level={5} style={{ margin: 0 }}>
                  배포 상세 정보
                </Title>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size='small' column={1}>
              {deployedImageInfo?.primary_deployed_image && (
                <Descriptions.Item label='빌드된 이미지'>
                  <Text code copyable style={{ fontSize: 13 }}>
                    {deployedImageInfo.primary_deployed_image}
                  </Text>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, display: 'block', marginTop: 4 }}
                  >
                    Harbor에 Push된 이미지 경로
                  </Text>
                </Descriptions.Item>
              )}
              {deployedImageInfo?.actual_deployed_images &&
                deployedImageInfo.actual_deployed_images.length > 0 && (
                  <Descriptions.Item label='실제 사용 중인 이미지'>
                    <Space
                      direction='vertical'
                      size='small'
                      style={{ width: '100%' }}
                    >
                      {deployedImageInfo.actual_deployed_images.map(
                        (img, idx) => (
                          <Text
                            key={idx}
                            code
                            copyable
                            style={{ fontSize: 12, display: 'block' }}
                          >
                            {img}
                          </Text>
                        )
                      )}
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        현재 실행 중인 Pod들이 사용하는 이미지
                      </Text>
                    </Space>
                  </Descriptions.Item>
                )}
              {deployedImageInfo?.deployed_image && (
                <Descriptions.Item label='배포 이미지 경로 (예상)'>
                  <Text code copyable style={{ fontSize: 13 }}>
                    {deployedImageInfo.deployed_image}
                  </Text>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, display: 'block', marginTop: 4 }}
                  >
                    서비스 이름 기반 경로 (참고용)
                  </Text>
                </Descriptions.Item>
              )}
              {deployedImageInfo?.namespace && (
                <Descriptions.Item label='네임스페이스'>
                  <Tag color='blue'>{deployedImageInfo.namespace}</Tag>
                </Descriptions.Item>
              )}
              {deployedImageInfo?.deployed_at && (
                <Descriptions.Item label='배포 시각'>
                  {new Date(deployedImageInfo.deployed_at).toLocaleString(
                    'ko-KR'
                  )}
                </Descriptions.Item>
              )}
              {deploymentDetails.kubectl_apply && (
                <Descriptions.Item label='적용된 kubectl 명령'>
                  <Text
                    code
                    style={{
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      display: 'block',
                    }}
                  >
                    {deploymentDetails.kubectl_apply}
                  </Text>
                </Descriptions.Item>
              )}
              {deploymentDetails.kubectl_restart && (
                <Descriptions.Item label='재시작 명령'>
                  <Text
                    code
                    style={{
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      display: 'block',
                    }}
                  >
                    {deploymentDetails.kubectl_restart}
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {/* Pod 요약 */}
        <Card
          title={
            <Space>
              <BarChartOutlined style={{ fontSize: 20, color: '#52c41a' }} />
              <Title level={5} style={{ margin: 0 }}>
                Pod 상태 요약
              </Title>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title='전체'
                value={totalPods}
                suffix='개'
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title='실행 중'
                value={runningPods}
                suffix='개'
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title='대기 중'
                value={pendingPods}
                suffix='개'
                valueStyle={{ color: '#faad14' }}
                prefix={<SyncOutlined spin />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title='실패'
                value={failedPods}
                suffix='개'
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>

          <Divider />
          <div>
            <Text strong>가용률: </Text>
            <Progress
              percent={
                totalPods > 0 ? Math.round((runningPods / totalPods) * 100) : 0
              }
              status={runningPods === totalPods ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
          {/* 배포 이미지 버전 정보 */}
          {deployedImageInfo?.deployed_image_tag && totalPods > 0 && (
            <>
              <Divider />
              <div>
                <Text strong>이미지 버전: </Text>
                <Progress
                  percent={Math.round(
                    (podsWithDeployedImage / totalPods) * 100
                  )}
                  status={
                    podsWithDeployedImage === totalPods ? 'success' : 'active'
                  }
                  format={() => `${podsWithDeployedImage} / ${totalPods} Pod`}
                  strokeColor={{
                    '0%': '#faad14',
                    '100%': '#52c41a',
                  }}
                />
                {podsWithDeployedImage === totalPods ? (
                  <Text
                    type='success'
                    style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                  >
                    <CheckCircleOutlined /> 모든 Pod가 배포된 이미지(
                    {deployedImageInfo.deployed_image_tag})를 사용 중입니다.
                  </Text>
                ) : (
                  <Text
                    type='warning'
                    style={{ fontSize: 12, marginTop: 4, display: 'block' }}
                  >
                    <WarningOutlined /> {totalPods - podsWithDeployedImage}개
                    Pod가 이전 이미지를 사용 중입니다.
                  </Text>
                )}
              </div>
            </>
          )}
        </Card>

        {/* 리소스 정보 */}
        {resourceInfo && (
          <Card
            title={
              <Space>
                <CloudServerOutlined
                  style={{ fontSize: 20, color: '#722ed1' }}
                />
                <Title level={5} style={{ margin: 0 }}>
                  리소스 사용률
                </Title>
              </Space>
            }
            loading={loadingResource}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card type='inner' title='CPU'>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Text type='secondary'>모델: {resourceInfo.cpu_model}</Text>
                    <Text type='secondary'>
                      코어 수: {resourceInfo.cpu_cores}
                    </Text>
                    <Progress
                      percent={parseFloat(resourceInfo.cpu_usage) || 0}
                      status={
                        parseFloat(resourceInfo.cpu_usage) > 80
                          ? 'exception'
                          : 'normal'
                      }
                    />
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type='inner' title='메모리'>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Text type='secondary'>
                      {resourceInfo.mem_used}MB / {resourceInfo.mem_total}MB
                    </Text>
                    <Progress
                      percent={parseFloat(resourceInfo.mem_usage) || 0}
                      status={
                        parseFloat(resourceInfo.mem_usage) > 80
                          ? 'exception'
                          : 'normal'
                      }
                    />
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type='inner' title='디스크'>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Text type='secondary'>
                      {resourceInfo.disk_used} / {resourceInfo.disk_total}
                    </Text>
                    <Progress
                      percent={
                        parseFloat(
                          resourceInfo.disk_usage?.replace('%', '') || '0'
                        ) || 0
                      }
                      status={
                        parseFloat(
                          resourceInfo.disk_usage?.replace('%', '') || '0'
                        ) > 80
                          ? 'exception'
                          : 'normal'
                      }
                    />
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type='inner' title='시스템 정보'>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Text type='secondary'>
                      호스트: {resourceInfo.hostname}
                    </Text>
                    <Text type='secondary'>OS: {resourceInfo.os_name}</Text>
                    <Text type='secondary'>커널: {resourceInfo.kernel}</Text>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {/* 새로고침 버튼 */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button
            type='primary'
            icon={<SyncOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            새로고침
          </Button>
        </div>
      </div>
    </Spin>
  );
};

export default OverviewTab;
