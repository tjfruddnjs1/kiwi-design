import React from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Alert,
  Empty,
  InputNumber,
  Form,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Tabs,
  Descriptions,
  Typography,
  Modal,
  Tooltip,
  Input,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  ControlOutlined,
  LineChartOutlined,
  PlusOutlined,
  DeleteOutlined,
  ClusterOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import type { PodInfo, HPAInfo } from '../../../../../types/operate-modal';
import type {
  K8sResource,
  MetricsServerStatus,
  MetricsServerDiagnostics,
} from '../../../../../lib/api/k8s-resources';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface K8sPodsTabProps {
  // Pod 데이터
  pods: PodInfo[];

  // Deployment 관리
  deployments: K8sResource[];
  selectedDeployment: string;
  deploymentStatus: {
    replicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
  };

  // Scaling 상태
  scalingReplicas: number;
  scalingLoading: boolean;

  // HPA 관리
  hpaData: HPAInfo | null;
  hpaList: HPAInfo[];
  loadingHPA: boolean;
  showHPAForm: boolean;

  // Metrics Server
  metricsServerStatus: MetricsServerStatus | null;
  metricsServerDiagnostics: MetricsServerDiagnostics | null;
  loadingMetricsStatus: boolean;
  installingMetrics: boolean;
  showDiagnostics: boolean;

  // 배포 이미지 정보
  deployedImageInfo: {
    deployed_image_tag?: string;
    deployed_image?: string;
    registry?: string;
    namespace?: string;
    deployed_at?: string;
    primary_deployed_image?: string;
    actual_deployed_images?: string[];
  } | null;

  // Callbacks
  onDeploymentChange: (deploymentName: string) => void;
  onScaleDeployment: () => void;
  onScaleToZero: () => void;
  onSetScalingReplicas: (replicas: number) => void;
  onCreateHPA: (values: any) => void;
  onDeleteHPA: (hpaName: string) => void;
  onSetShowHPAForm: (show: boolean) => void;
  onLoadHPA: () => void;
  onDeletePod: (podName: string) => void;
  onBulkDeletePendingPods: () => void;
  onCheckMetricsServerStatus: () => Promise<MetricsServerStatus | null>;
  onInstallMetricsServer: () => void;
  onCleanMetricsServerNode: () => void;
  onSetShowDiagnostics: (show: boolean) => void;
  onLoadPodDetails: (podName: string) => void;
}

/**
 * K8s Pod 관리 탭
 * Pod 목록 조회, HPA 관리, Metrics Server 관리 기능을 제공합니다.
 */
const K8sPodsTab: React.FC<K8sPodsTabProps> = ({
  pods,
  deployments,
  selectedDeployment,
  deploymentStatus,
  scalingReplicas,
  scalingLoading,
  hpaData,
  hpaList,
  loadingHPA,
  showHPAForm,
  metricsServerStatus,
  metricsServerDiagnostics,
  loadingMetricsStatus,
  installingMetrics,
  showDiagnostics,
  deployedImageInfo: _deployedImageInfo,
  onDeploymentChange,
  onScaleDeployment,
  onScaleToZero,
  onSetScalingReplicas,
  onCreateHPA,
  onDeleteHPA,
  onSetShowHPAForm,
  onLoadHPA,
  onDeletePod,
  onBulkDeletePendingPods,
  onCheckMetricsServerStatus,
  onInstallMetricsServer,
  onCleanMetricsServerNode,
  onSetShowDiagnostics,
  onLoadPodDetails,
}) => {
  // Deployment가 HPA를 가지고 있는지 확인하는 헬퍼 함수
  const hasHPA = (deploymentName: string): boolean => {
    return hpaList.some((hpa: any) => hpa.targetDeployment === deploymentName);
  };

  // Pod 상태 색상
  const getPodStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running') return 'success';
    if (s === 'pending') return 'warning';
    if (s === 'failed' || s === 'error') return 'error';
    return 'default';
  };

  // Pod 상태 아이콘
  const getPodStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running')
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (s === 'pending')
      return <SyncOutlined spin style={{ color: '#faad14' }} />;
    if (s === 'failed' || s === 'error')
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    return <WarningOutlined style={{ color: '#d9d9d9' }} />;
  };

  // Pod 테이블 컬럼
  const podColumns = [
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      fixed: 'left' as const,
      render: (status: string, _record: PodInfo) => {
        const isError = [
          'ImagePullBackOff',
          'ErrImagePull',
          'CrashLoopBackOff',
          'Error',
          'Failed',
          'Pending',
        ].includes(status);

        return (
          <Space direction='vertical' size='small'>
            <Tag
              color={getPodStatusColor(status)}
              icon={getPodStatusIcon(status)}
            >
              {status}
            </Tag>
            {isError && (
              <Button
                type='link'
                size='small'
                danger={status !== 'Pending'}
                style={{
                  fontSize: 11,
                  padding: 0,
                  height: 'auto',
                  color: status === 'Pending' ? '#faad14' : '#ff4d4f',
                }}
                onClick={() => {
                  // Pod 에러 상태에 따른 해결 방법 모달 표시
                  Modal.info({
                    title: `${status} 문제 해결 방법`,
                    width: 600,
                    content: (
                      <div style={{ marginTop: 16 }}>
                        {status === 'ImagePullBackOff' ||
                        status === 'ErrImagePull' ? (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>
                                Harbor 레지스트리에서 이미지를 가져올 수 없음
                              </li>
                              <li>
                                이미지 이름/태그가 잘못되었거나 존재하지 않음
                              </li>
                              <li>Harbor 인증 정보가 올바르지 않음</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>Harbor에서 이미지 존재 여부 확인</li>
                              <li>서비스의 이미지 태그 확인 및 재배포</li>
                              <li>kubectl describe pod로 자세한 오류 확인</li>
                            </ul>
                          </>
                        ) : status === 'CrashLoopBackOff' ? (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>컨테이너가 시작 후 즉시 종료됨</li>
                              <li>애플리케이션 코드 오류 또는 설정 문제</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>Pod 로그를 확인하여 오류 원인 파악</li>
                              <li>환경 변수 및 ConfigMap 설정 확인</li>
                              <li>헬스체크 설정 확인</li>
                            </ul>
                          </>
                        ) : status === 'Pending' ? (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>노드에 충분한 리소스(CPU/메모리)가 없음</li>
                              <li>PVC를 사용할 수 없음</li>
                              <li>노드 선택자 조건이 맞지 않음</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>kubectl describe pod로 자세한 이벤트 확인</li>
                              <li>클러스터 리소스 사용량 확인</li>
                              <li>스토리지 클래스 및 PVC 상태 확인</li>
                            </ul>
                          </>
                        ) : (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>Pod 실행 중 예상치 못한 오류 발생</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>Pod 로그 및 이벤트 확인</li>
                              <li>kubectl describe pod로 상세 정보 확인</li>
                              <li>필요시 Pod 재시작 시도</li>
                            </ul>
                          </>
                        )}
                      </div>
                    ),
                  });
                }}
              >
                클릭하여 해결 방법 확인
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Pod 이름',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      render: (name: string) => (
        <Text strong style={{ fontSize: 13 }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'CPU',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      width: 90,
      align: 'center' as const,
      render: (cpuUsage: string | undefined) =>
        cpuUsage ? (
          <Tag color='blue' style={{ minWidth: 60 }}>
            {cpuUsage}
          </Tag>
        ) : (
          <Text type='secondary' style={{ fontSize: 12 }}>
            -
          </Text>
        ),
    },
    {
      title: '메모리',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      width: 100,
      align: 'center' as const,
      render: (memoryUsage: string | undefined) =>
        memoryUsage ? (
          <Tag color='cyan' style={{ minWidth: 70 }}>
            {memoryUsage}
          </Tag>
        ) : (
          <Text type='secondary' style={{ fontSize: 12 }}>
            -
          </Text>
        ),
    },
    {
      title: '이미지',
      dataIndex: 'image',
      key: 'image',
      ellipsis: false,
      render: (image: string) => {
        // 이미지가 없거나 <none>인 경우 처리
        const hasValidImage =
          image && image !== '<none>' && image.trim() !== '';

        if (!hasValidImage) {
          return (
            <Text type='secondary' style={{ fontSize: 12 }}>
              이미지 정보 없음
            </Text>
          );
        }

        return (
          <Tooltip title={image} placement='topLeft'>
            <Text style={{ fontSize: 12, wordBreak: 'break-all' }} code>
              {image}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 100,
      render: (_: any, record: PodInfo) => (
        <Popconfirm
          title='Pod를 삭제하시겠습니까?'
          description='Deployment가 자동으로 새 Pod를 생성합니다.'
          onConfirm={() => onDeletePod(record.name)}
          okText='삭제'
          cancelText='취소'
        >
          <Button size='small' danger icon={<DeleteOutlined />}>
            재시작
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='Pod 상태 모니터링'
        description='배포된 모든 Pod의 상태를 실시간으로 확인할 수 있습니다.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 수동 Pod 개수 조정 */}
      <Card
        title={
          <Space direction='vertical' size={0}>
            <Space>
              <ControlOutlined style={{ color: '#1890ff' }} />
              <Text strong>수동 Pod 개수 조정</Text>
            </Space>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              선택한 Deployment의 Pod 개수를 직접 조정합니다
            </Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {/* Deployment 선택 - Tabs 형태 */}
        {deployments.length > 0 ? (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              Deployment 선택:
            </Text>
            <Tabs
              activeKey={selectedDeployment}
              onChange={onDeploymentChange}
              items={deployments.map(deployment => ({
                key: deployment.metadata?.name || '',
                label: (
                  <Space>
                    <ClusterOutlined />
                    {deployment.metadata?.name}
                    {hasHPA(deployment.metadata?.name || '') && (
                      <Tag color='orange' style={{ marginLeft: 4 }}>
                        자동 조정 중
                      </Tag>
                    )}
                  </Space>
                ),
              }))}
            />

            {/* HPA 설정 시 경고 메시지 */}
            {hpaData && (
              <Alert
                message='현재 자동 스케일링(HPA)이 활성화되어 있습니다'
                description={
                  <div>
                    <strong>{hpaData.targetDeployment}</strong> Deployment는 CPU
                    사용률에 따라{' '}
                    <strong>
                      {hpaData.minReplicas}~{hpaData.maxReplicas}개
                    </strong>{' '}
                    Pod가 자동으로 조정됩니다.
                    <br />
                    수동 조정을 사용하려면 아래 HPA 카드에서 자동 스케일링을
                    먼저 제거해주세요.
                  </div>
                }
                type='warning'
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 현재 상태 표시 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size='small'>
                  <Statistic
                    title='현재 실행 중인 Pod 개수'
                    value={deploymentStatus?.availableReplicas || 0}
                    suffix={`/ ${deploymentStatus?.replicas || 0}`}
                    prefix={
                      deploymentStatus?.availableReplicas ===
                      deploymentStatus?.replicas ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <WarningOutlined style={{ color: '#faad14' }} />
                      )
                    }
                    valueStyle={{
                      color:
                        deploymentStatus?.availableReplicas ===
                        deploymentStatus?.replicas
                          ? '#52c41a'
                          : '#faad14',
                    }}
                  />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    {deploymentStatus?.availableReplicas ===
                    deploymentStatus?.replicas
                      ? '모든 Pod가 정상 실행 중입니다'
                      : `${(deploymentStatus?.replicas || 0) - (deploymentStatus?.availableReplicas || 0)}개 Pod가 시작 중입니다`}
                  </Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size='small'>
                  <Statistic
                    title='목표 Pod 개수 설정'
                    value={scalingReplicas}
                    prefix={<ControlOutlined />}
                  />
                  <InputNumber
                    min={0}
                    max={100}
                    value={scalingReplicas}
                    onChange={value => onSetScalingReplicas(value || 1)}
                    style={{ width: '100%', marginTop: 8 }}
                    disabled={!!hpaData}
                    addonAfter='개'
                  />
                </Card>
              </Col>
            </Row>

            {/* 액션 버튼 */}
            <Space>
              <Button
                type='primary'
                icon={<ControlOutlined />}
                onClick={onScaleDeployment}
                loading={scalingLoading}
                disabled={!!hpaData}
                size='large'
              >
                Pod 개수 적용
              </Button>
              <Popconfirm
                title='모든 Pod를 제거하시겠습니까?'
                description='Deployment는 유지되며 Pod 개수가 0으로 설정됩니다.'
                onConfirm={onScaleToZero}
                okText='제거'
                cancelText='취소'
                disabled={!!hpaData}
              >
                <Button
                  danger
                  loading={scalingLoading}
                  disabled={!!hpaData}
                  size='large'
                >
                  모든 Pod 제거 (0개로 설정)
                </Button>
              </Popconfirm>
            </Space>
          </div>
        ) : (
          <Empty description='배포된 Deployment가 없습니다' />
        )}
      </Card>

      {/* HPA 관리 */}
      <Card
        title={
          <Space direction='vertical' size={0}>
            <Space>
              <LineChartOutlined style={{ color: '#1890ff' }} />
              <Text strong>HPA (Horizontal Pod Autoscaler)</Text>
            </Space>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              선택한 Deployment에 대한 자동 스케일링 설정 (각 Deployment마다
              개별 적용)
            </Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={onLoadHPA}
              loading={loadingHPA}
            >
              새로고침
            </Button>
            {!showHPAForm && (
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => onSetShowHPAForm(true)}
              >
                HPA 생성
              </Button>
            )}
          </Space>
        }
      >
        {showHPAForm ? (
          <Form
            layout='vertical'
            onFinish={onCreateHPA}
            initialValues={{
              minReplicas: 1,
              maxReplicas: 10,
              targetCPU: 80,
            }}
          >
            <Alert
              message={
                selectedDeployment
                  ? `"${selectedDeployment}" Deployment에 대한 HPA를 생성합니다`
                  : 'Deployment를 먼저 선택하세요'
              }
              description={
                <div>
                  HPA는 선택한 Deployment의 Pod만 자동으로 스케일링합니다.
                  <br />
                  예) 최소 1, 최대 8 설정 시 → 해당 Deployment의 Pod가 1~8개
                  사이에서 자동 조정됩니다.
                </div>
              }
              type='info'
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label='최소 Pod 개수'
                  name='minReplicas'
                  rules={[{ required: true, message: '최소값을 입력하세요' }]}
                  tooltip='CPU 사용률이 낮을 때 유지할 최소 Pod 개수'
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter='개'
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label='최대 Pod 개수'
                  name='maxReplicas'
                  rules={[{ required: true, message: '최대값을 입력하세요' }]}
                  tooltip='CPU 사용률이 높을 때 확장할 수 있는 최대 Pod 개수'
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter='개'
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label='목표 CPU 사용률'
                  name='targetCPU'
                  rules={[
                    { required: true, message: 'CPU 사용률을 입력하세요' },
                  ]}
                  tooltip='이 사용률을 유지하도록 Pod 개수를 자동 조정합니다'
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter='%'
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' loading={loadingHPA}>
                  생성
                </Button>
                <Button onClick={() => onSetShowHPAForm(false)}>취소</Button>
              </Space>
            </Form.Item>
          </Form>
        ) : hpaData ? (
          <div>
            <Alert
              message='자동 스케일링이 활성화되어 있습니다'
              description={
                <div>
                  <strong>{hpaData.targetDeployment}</strong> Deployment의 Pod가
                  CPU 사용률에 따라{' '}
                  <strong>
                    {hpaData.minReplicas}~{hpaData.maxReplicas}개
                  </strong>{' '}
                  사이에서 자동으로 조정됩니다.
                  <br />
                  (다른 Deployment는 영향받지 않으며, 각각 별도의 HPA 설정이
                  필요합니다)
                </div>
              }
              type='success'
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size='small'>
              <Descriptions.Item label='HPA 이름' span={3}>
                {hpaData.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label='대상 Deployment' span={3}>
                <Tag color='blue'>{hpaData.targetDeployment || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label='최소 Pod 개수'>
                {hpaData.minReplicas || '-'}개
              </Descriptions.Item>
              <Descriptions.Item label='최대 Pod 개수'>
                {hpaData.maxReplicas || '-'}개
              </Descriptions.Item>
              <Descriptions.Item label='목표 CPU 사용률'>
                {hpaData.targetCPU || '-'}%
              </Descriptions.Item>
              <Descriptions.Item label='현재 실행 Pod 개수' span={3}>
                <Tag color='green'>{hpaData.currentReplicas || '-'}개</Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <Popconfirm
                title='HPA를 삭제하시겠습니까?'
                onConfirm={() => onDeleteHPA(hpaData.name)}
                okText='삭제'
                cancelText='취소'
              >
                <Button danger icon={<DeleteOutlined />} loading={loadingHPA}>
                  HPA 삭제
                </Button>
              </Popconfirm>
            </div>
          </div>
        ) : (
          <Empty description='HPA가 설정되지 않았습니다. 생성 버튼을 클릭하세요.' />
        )}
      </Card>

      {/* Metrics Server 상태 알림 */}
      {metricsServerStatus && (
        <Alert
          type={
            metricsServerStatus.ready
              ? 'success'
              : metricsServerStatus.installed
                ? 'warning'
                : 'info'
          }
          showIcon
          message={
            metricsServerStatus.ready
              ? 'Metrics Server 정상 동작 중'
              : metricsServerStatus.installed
                ? 'Metrics Server 준비 중'
                : 'Metrics Server 미설치'
          }
          description={
            <div>
              <div style={{ marginBottom: 12 }}>
                <strong>{metricsServerStatus.message}</strong>
              </div>

              {/* Pod 상태 정보 표시 */}
              {metricsServerStatus.installed &&
                metricsServerStatus.pod_name && (
                  <div
                    style={{ marginBottom: 12, fontSize: 12, color: '#666' }}
                  >
                    <div>
                      Pod: <code>{metricsServerStatus.pod_name}</code>
                    </div>
                    {metricsServerStatus.pod_status && (
                      <div>
                        상태:{' '}
                        <Tag
                          color={metricsServerStatus.ready ? 'green' : 'orange'}
                        >
                          {metricsServerStatus.pod_status}
                        </Tag>
                      </div>
                    )}
                  </div>
                )}

              {/* 정상 동작 중일 때 안내 메시지 */}
              {metricsServerStatus.ready && (
                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 13,
                    background: '#f6ffed',
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid #b7eb8f',
                  }}
                >
                   Pod CPU/메모리 사용량을 정상적으로 수집하고 있습니다.
                  <br />위 테이블에서 각 Pod의 리소스 사용 현황을 확인할 수
                  있습니다.
                </div>
              )}

              {/* 준비 중일 때 안내 메시지 */}
              {metricsServerStatus.installed && !metricsServerStatus.ready && (
                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 13,
                    background: '#fff9e6',
                    padding: '8px 12px',
                    borderRadius: 4,
                  }}
                >
                  💡 Metrics Server Pod가 시작되는 중입니다. 보통 1-2분이
                  소요되며, 자동으로 상태를 확인합니다.
                  <br />
                  문제가 지속되면 <strong>재설치</strong>를 시도하거나 아래{' '}
                  <strong>진단 정보</strong>를 확인하세요.
                </div>
              )}

              {/* 진단 정보 표시 (준비 중일 때만) */}
              {!metricsServerStatus.ready &&
                metricsServerDiagnostics &&
                showDiagnostics && (
                  <Card
                    size='small'
                    title='🔍 진단 정보'
                    style={{ marginBottom: 12, background: '#f5f5f5' }}
                    extra={
                      <Button
                        size='small'
                        type='link'
                        onClick={() => onSetShowDiagnostics(false)}
                      >
                        닫기
                      </Button>
                    }
                  >
                    {metricsServerDiagnostics.error_message && (
                      <Alert
                        type='error'
                        message={metricsServerDiagnostics.error_message}
                        style={{ marginBottom: 8 }}
                        showIcon
                      />
                    )}

                    {metricsServerDiagnostics.pod_events &&
                      metricsServerDiagnostics.pod_events.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <Text strong>Pod 이벤트:</Text>
                          <div
                            style={{
                              maxHeight: 150,
                              overflow: 'auto',
                              background: 'white',
                              padding: 8,
                              marginTop: 4,
                              fontSize: 12,
                              fontFamily: 'monospace',
                            }}
                          >
                            {metricsServerDiagnostics.pod_events.map(
                              (event, idx) => (
                                <div key={idx}>{event}</div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {metricsServerDiagnostics.pod_logs && (
                      <div>
                        <Text strong>Pod 로그 (최근 50줄):</Text>
                        <TextArea
                          value={metricsServerDiagnostics.pod_logs}
                          readOnly
                          rows={8}
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            fontFamily: 'monospace',
                            background: 'white',
                          }}
                        />
                      </div>
                    )}
                  </Card>
                )}

              {/* 진단 정보 보기 버튼 (준비 중일 때만) */}
              {!metricsServerStatus.ready &&
                metricsServerStatus.installed &&
                !showDiagnostics &&
                metricsServerDiagnostics && (
                  <Button
                    size='small'
                    type='link'
                    onClick={() => onSetShowDiagnostics(true)}
                    style={{ marginBottom: 8, paddingLeft: 0 }}
                  >
                    🔍 진단 정보 보기
                  </Button>
                )}

              <Space size='small'>
                {!metricsServerStatus.installed && (
                  <Button
                    type='primary'
                    size='small'
                    loading={installingMetrics}
                    onClick={onInstallMetricsServer}
                    icon={<CloudServerOutlined />}
                  >
                    Metrics Server 설치
                  </Button>
                )}
                {metricsServerStatus.installed && (
                  <>
                    <Button
                      size='small'
                      loading={loadingMetricsStatus}
                      onClick={onCheckMetricsServerStatus}
                      icon={<SyncOutlined />}
                    >
                      상태 새로고침
                    </Button>
                    <Popconfirm
                      title='Metrics Server 재설치'
                      description='기존 설치를 제거하고 다시 설치합니다. 계속하시겠습니까?'
                      onConfirm={onInstallMetricsServer}
                      okText='재설치'
                      cancelText='취소'
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size='small'
                        danger
                        loading={installingMetrics}
                        icon={<SyncOutlined />}
                      >
                        재설치
                      </Button>
                    </Popconfirm>

                    {/* 이미지 캐시 정리 버튼 (containerd 에러 발견 시) */}
                    {metricsServerDiagnostics?.pod_events?.some(
                      event =>
                        event.includes('blob not found') ||
                        event.includes('FailedCreatePodSandBox')
                    ) && (
                      <Popconfirm
                        title='이미지 캐시 정리'
                        description='노드의 손상된 컨테이너 이미지를 제거하고 재다운로드합니다. 계속하시겠습니까?'
                        onConfirm={onCleanMetricsServerNode}
                        okText='정리 시작'
                        cancelText='취소'
                        okButtonProps={{ type: 'primary' }}
                      >
                        <Button
                          size='small'
                          type='primary'
                          icon={<CloudServerOutlined />}
                        >
                          이미지 캐시 정리
                        </Button>
                      </Popconfirm>
                    )}
                  </>
                )}
              </Space>
            </div>
          }
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* Pod 테이블 */}
      {pods.length === 0 ? (
        <Empty description='Pod 정보가 없습니다. 개요 탭에서 데이터를 불러오세요.' />
      ) : (
        <>
          {/* Pending Pod 일괄 삭제 버튼 */}
          {pods.filter(pod => pod.status.toLowerCase() === 'pending').length >
            0 && (
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                <Text type='warning'>
                  Pending 상태의 Pod가{' '}
                  {
                    pods.filter(pod => pod.status.toLowerCase() === 'pending')
                      .length
                  }
                  개 있습니다.
                </Text>
              </Space>
              <Popconfirm
                title='모든 Pending Pod를 삭제하시겠습니까?'
                description={
                  <div style={{ maxWidth: 300 }}>
                    <p>
                      총{' '}
                      {
                        pods.filter(
                          pod => pod.status.toLowerCase() === 'pending'
                        ).length
                      }
                      개의 Pending Pod가 강제로 삭제됩니다.
                    </p>
                    <p style={{ marginBottom: 0 }}>
                      <strong>주의:</strong> 이 작업은 되돌릴 수 없으며,
                      Deployment가 설정되어 있다면 Pod가 자동으로 재생성됩니다.
                    </p>
                  </div>
                }
                onConfirm={onBulkDeletePendingPods}
                okText='모두 삭제'
                cancelText='취소'
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Pending Pod 일괄 삭제
                </Button>
              </Popconfirm>
            </div>
          )}

          <Table
            dataSource={pods}
            columns={podColumns}
            rowKey='name'
            pagination={{ pageSize: 10 }}
            size='small'
            scroll={{ x: 1000 }}
            expandable={{
              expandedRowRender: (record: PodInfo) => {
                // 문제 있는 Pod만 확장 가능
                const errorStatuses = [
                  'ImagePullBackOff',
                  'ErrImagePull',
                  'CrashLoopBackOff',
                  'Error',
                  'Failed',
                  'Pending',
                ];
                if (!errorStatuses.includes(record.status)) {
                  return null;
                }

                // 이벤트가 아직 로드되지 않았다면 로드
                if (!record.events) {
                  onLoadPodDetails(record.name);
                  return (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <Alert
                        message='Pod 이벤트 정보를 불러오는 중...'
                        type='info'
                        showIcon
                      />
                    </div>
                  );
                }

                // 에러 타입별 색상 및 제목 설정
                const getErrorStyle = (status: string) => {
                  switch (status) {
                    case 'ImagePullBackOff':
                    case 'ErrImagePull':
                      return {
                        bgColor: '#fff2e8',
                        borderColor: '#ff7a45',
                        iconColor: '#ff7a45',
                        title: '이미지 Pull 실패',
                      };
                    case 'CrashLoopBackOff':
                      return {
                        bgColor: '#fff1f0',
                        borderColor: '#ff4d4f',
                        iconColor: '#ff4d4f',
                        title: '컨테이너 반복 실패',
                      };
                    case 'Failed':
                    case 'Error':
                      return {
                        bgColor: '#fff1f0',
                        borderColor: '#ff4d4f',
                        iconColor: '#ff4d4f',
                        title: 'Pod 실패',
                      };
                    default: // Pending
                      return {
                        bgColor: '#fff9e6',
                        borderColor: '#faad14',
                        iconColor: '#faad14',
                        title: 'Pending 상태',
                      };
                  }
                };

                const errorStyle = getErrorStyle(record.status);

                // 에러 타입별 해결 방법
                const getSolutionGuide = (status: string) => {
                  switch (status) {
                    case 'ImagePullBackOff':
                    case 'ErrImagePull':
                      return (
                        <Alert
                          message='이미지 Pull 실패 해결 방법'
                          description={
                            <ul
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                paddingLeft: 20,
                              }}
                            >
                              <li>
                                <strong>이미지 경로 확인:</strong> 레지스트리
                                주소, 프로젝트/저장소 이름, 태그가 정확한지 확인
                              </li>
                              <li>
                                <strong>imagePullSecrets 확인:</strong> Private
                                Registry는 인증 정보(Secret) 필요
                              </li>
                              <li>
                                <strong>네트워크 확인:</strong> 노드에서
                                레지스트리 접근 가능 여부 확인
                              </li>
                              <li>
                                <strong>레지스트리 상태 확인:</strong> Harbor 등
                                레지스트리 서비스 정상 작동 확인
                              </li>
                            </ul>
                          }
                          type='error'
                          showIcon
                          style={{ marginTop: 12 }}
                        />
                      );
                    case 'CrashLoopBackOff':
                      return (
                        <Alert
                          message='컨테이너 반복 실패 해결 방법'
                          description={
                            <ul
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                paddingLeft: 20,
                              }}
                            >
                              <li>
                                <strong>로그 확인:</strong> Pod 로그를 확인하여
                                애플리케이션 오류 원인 파악
                              </li>
                              <li>
                                <strong>환경변수 확인:</strong> ConfigMap,
                                Secret 설정이 올바른지 확인
                              </li>
                              <li>
                                <strong>헬스체크 확인:</strong>{' '}
                                liveness/readiness probe 설정이 적절한지 확인
                              </li>
                              <li>
                                <strong>리소스 확인:</strong> 메모리
                                부족(OOMKilled)이 원인일 수 있음
                              </li>
                            </ul>
                          }
                          type='error'
                          showIcon
                          style={{ marginTop: 12 }}
                        />
                      );
                    case 'Pending':
                      return (
                        <Alert
                          message='Pending 상태 해결 방법'
                          description={
                            <ul
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                paddingLeft: 20,
                              }}
                            >
                              <li>
                                <strong>리소스 부족:</strong> 클러스터에 충분한
                                CPU/메모리/디스크가 있는지 확인
                              </li>
                              <li>
                                <strong>nodeSelector/affinity:</strong> Pod의
                                노드 선택 조건을 충족하는 노드가 있는지 확인
                              </li>
                              <li>
                                <strong>PVC 바인딩:</strong>{' '}
                                PersistentVolumeClaim이 바인딩되지 않았는지 확인
                              </li>
                              <li>
                                <strong>Taints/Tolerations:</strong> 노드의
                                taint를 Pod가 tolerate하는지 확인
                              </li>
                            </ul>
                          }
                          type='warning'
                          showIcon
                          style={{ marginTop: 12 }}
                        />
                      );
                    default:
                      return (
                        <Alert
                          message='일반적인 해결 방법'
                          description={
                            <ul
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                paddingLeft: 20,
                              }}
                            >
                              <li>
                                Pod 이벤트 및 로그를 확인하여 정확한 원인 파악
                              </li>
                              <li>
                                관련 리소스(Deployment, Service, ConfigMap 등)
                                설정 확인
                              </li>
                              <li>클러스터 상태 및 노드 상태 확인</li>
                            </ul>
                          }
                          type='info'
                          showIcon
                          style={{ marginTop: 12 }}
                        />
                      );
                  }
                };

                return (
                  <div
                    style={{
                      padding: '20px 24px',
                      backgroundColor: errorStyle.bgColor,
                      borderLeft: `4px solid ${errorStyle.borderColor}`,
                    }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Space
                          direction='vertical'
                          size='small'
                          style={{ width: '100%' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <WarningOutlined
                              style={{
                                color: errorStyle.iconColor,
                                fontSize: 18,
                              }}
                            />
                            <Title
                              level={5}
                              style={{ margin: 0, color: errorStyle.iconColor }}
                            >
                              {errorStyle.title} 원인 분석
                            </Title>
                          </div>
                          {getSolutionGuide(record.status)}
                        </Space>
                      </Col>

                      <Col span={24}>
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ fontSize: 14 }}>
                            🔍 이벤트 목록
                          </Text>
                          <Text
                            type='secondary'
                            style={{ fontSize: 12, marginLeft: 8 }}
                          >
                            ({record.events.length}개)
                          </Text>
                        </div>
                        {record.events && record.events.length > 0 ? (
                          <Space
                            direction='vertical'
                            size='small'
                            style={{ width: '100%' }}
                          >
                            {record.events.map((event, idx) => (
                              <Card
                                key={idx}
                                size='small'
                                style={{
                                  backgroundColor:
                                    event.type === 'Warning'
                                      ? '#fff2e8'
                                      : '#f6ffed',
                                  borderColor:
                                    event.type === 'Warning'
                                      ? '#ffbb96'
                                      : '#b7eb8f',
                                }}
                                bodyStyle={{ padding: '12px 16px' }}
                              >
                                <Space
                                  direction='vertical'
                                  size={4}
                                  style={{ width: '100%' }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    {event.type === 'Warning' ? (
                                      <WarningOutlined
                                        style={{
                                          color: '#ff7a45',
                                          fontSize: 16,
                                        }}
                                      />
                                    ) : (
                                      <CheckCircleOutlined
                                        style={{
                                          color: '#52c41a',
                                          fontSize: 16,
                                        }}
                                      />
                                    )}
                                    <Tag
                                      color={
                                        event.type === 'Warning'
                                          ? 'error'
                                          : 'success'
                                      }
                                    >
                                      {event.type}
                                    </Tag>
                                    <Text strong style={{ fontSize: 14 }}>
                                      {event.reason}
                                    </Text>
                                    {event.count > 1 && (
                                      <Tag color='orange'>
                                        발생 {event.count}회
                                      </Tag>
                                    )}
                                    <Text
                                      type='secondary'
                                      style={{
                                        fontSize: 12,
                                        marginLeft: 'auto',
                                      }}
                                    >
                                      {event.timestamp}
                                    </Text>
                                  </div>
                                  <Text
                                    style={{ fontSize: 13, paddingLeft: 24 }}
                                  >
                                    {event.message}
                                  </Text>
                                </Space>
                              </Card>
                            ))}
                          </Space>
                        ) : (
                          <Empty
                            description='이벤트 정보가 없습니다'
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        )}
                      </Col>

                      <Col span={24}>
                        <div
                          style={{
                            padding: '16px',
                            backgroundColor: '#fff',
                            borderRadius: 8,
                            border: '1px solid #d9d9d9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Space direction='vertical' size={0}>
                            <Text strong>Pod 강제 삭제</Text>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              문제가 지속되면 Pod를 삭제하여 재시작할 수
                              있습니다
                            </Text>
                          </Space>
                          <Popconfirm
                            title='Pending Pod를 강제 삭제하시겠습니까?'
                            description={
                              <div style={{ maxWidth: 300 }}>
                                <p>이 작업은 다음과 같은 결과를 초래합니다:</p>
                                <ul
                                  style={{ paddingLeft: 20, margin: '8px 0' }}
                                >
                                  <li>Pod가 즉시 종료됩니다</li>
                                  <li>Deployment가 새 Pod를 자동 생성합니다</li>
                                  <li>
                                    근본 원인이 해결되지 않으면 동일한 문제가
                                    반복됩니다
                                  </li>
                                </ul>
                              </div>
                            }
                            onConfirm={() => onDeletePod(record.name)}
                            okText='삭제'
                            cancelText='취소'
                            okButtonProps={{ danger: true }}
                            icon={
                              <WarningOutlined style={{ color: '#ff4d4f' }} />
                            }
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              size='large'
                            >
                              강제 삭제
                            </Button>
                          </Popconfirm>
                        </div>
                      </Col>
                    </Row>
                  </div>
                );
              },
              rowExpandable: (record: PodInfo) =>
                record.status.toLowerCase() === 'pending',
              expandIcon: ({ expanded, onExpand, record }) =>
                record.status.toLowerCase() === 'pending' ? (
                  <Button
                    size='small'
                    type={expanded ? 'default' : 'primary'}
                    ghost={!expanded}
                    icon={<WarningOutlined />}
                    onClick={e => onExpand(record, e)}
                    style={{
                      borderColor: '#faad14',
                      color: expanded ? '#595959' : '#faad14',
                    }}
                  >
                    {expanded ? '접기' : '원인 보기'}
                  </Button>
                ) : null,
              expandIconColumnIndex: 0,
            }}
            rowClassName={(record: PodInfo) =>
              record.status.toLowerCase() === 'pending' ? 'pod-pending-row' : ''
            }
          />
        </>
      )}
    </div>
  );
};

export default K8sPodsTab;
