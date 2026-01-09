import React, { useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Badge,
  Alert,
  Collapse,
  Space,
  Typography,
  Divider,
  Tabs,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { PipelineLogEntry } from '../../lib/api/pipeline';
import {
  extractDeployMetrics,
  formatDeployMetrics,
  DeployMetrics,
} from '../../utils/deployMetrics';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

interface ValidationSteps {
  STEP_1_STATUS?: string;
  STEP_2_STATUS?: string;
  STEP_3_STATUS?: string;
  STEP_4_STATUS?: string;
  STEP_5_STATUS?: string;
  STEP_6_STATUS?: string;
  STEP_7_STATUS?: string;
  STEP_8_STATUS?: string;
}

interface DeploymentDetails {
  validation_steps?: ValidationSteps;
  validation_failed?: boolean;
  error_type?: string;
  error_stage?: string;
  error_message?: string;
}

interface DeployMetricsPanelProps {
  logs: PipelineLogEntry[];
  actualStatus?: 'success' | 'failed' | 'in_progress' | 'pending';
  deploymentDetails?: DeploymentDetails;
  //  [신규] 이전 배포 이력 (배포 진행 중일 때 표시)
  previousLogs?: PipelineLogEntry[];
  previousDeploymentDetails?: DeploymentDetails;
}

/**
 * 개선된 배포 메트릭 패널 - 직관적이고 간결한 UI/UX
 */
const DeployMetricsPanelNew: React.FC<DeployMetricsPanelProps> = ({
  logs,
  actualStatus,
  deploymentDetails,
  previousLogs,
}) => {
  const [activeTab, setActiveTab] = useState('current');

  const metrics = useMemo(() => {
    const extracted = extractDeployMetrics(logs);

    //  [수정] actualStatus가 있으면 항상 적용 (모든 상태에 대해)
    if (actualStatus) {
      // actualStatus를 우선적으로 사용
      extracted.status = actualStatus;

      // actualStatus가 'failed'이면 실패 단계 추가
      if (actualStatus === 'failed') {
        const hasFailedStepBefore = extracted.steps.some(
          s => s.status === 'failed'
        );
        if (!hasFailedStepBefore) {
          let timestamp = '';
          try {
            const lastLog = logs[logs.length - 1];
            if (lastLog?.timestamp) {
              const date = new Date(lastLog.timestamp);
              if (!isNaN(date.getTime())) {
                timestamp = date.toLocaleTimeString();
              }
            }
          } catch {
            // Ignore timestamp parsing errors
          }

          //  [수정] deploymentDetails에서 실제 에러 정보 가져오기
          const errorMessage =
            deploymentDetails?.error_message ||
            '배포 실패 (타임아웃 또는 에러 발생)';
          const errorStage = deploymentDetails?.error_stage || '배포 실행';

          extracted.steps.push({
            name: errorStage,
            status: 'failed',
            message: errorMessage,
            timestamp,
          });

          if (extracted.errors.length === 0) {
            //  [수정] deploymentDetails의 에러 정보 사용
            const detailedError = deploymentDetails?.error_message
              ? `${deploymentDetails.error_stage ? `[${deploymentDetails.error_stage}] ` : ''}${deploymentDetails.error_message}`
              : '배포 중 에러가 발생했습니다.';
            extracted.errors.push(detailedError);
          }
        }
      }
    }

    //  [수정] 중복 step 제거 (같은 이름과 상태를 가진 step은 하나만 표시)
    const uniqueSteps = extracted.steps.reduce(
      (acc, step) => {
        const existingIndex = acc.findIndex(
          s => s.name === step.name && s.status === step.status
        );
        if (existingIndex === -1) {
          acc.push(step);
        } else {
          // 기존 step의 message가 없고 새 step에 message가 있으면 업데이트
          if (!acc[existingIndex].message && step.message) {
            acc[existingIndex] = step;
          }
        }
        return acc;
      },
      [] as typeof extracted.steps
    );
    extracted.steps = uniqueSteps;

    //  [수정] 중복 에러 제거
    extracted.errors = [...new Set(extracted.errors)];

    //  [수정] 중복 경고 제거
    extracted.warnings = [...new Set(extracted.warnings)];

    return extracted;
  }, [
    logs,
    actualStatus,
    deploymentDetails?.error_message,
    deploymentDetails?.error_stage,
  ]);

  const formatted = useMemo(() => formatDeployMetrics(metrics), [metrics]);

  //  [신규] 이전 배포 metrics 계산
  const previousMetrics = useMemo(() => {
    if (!previousLogs || previousLogs.length === 0) return null;

    const extracted = extractDeployMetrics(previousLogs);
    // 이전 배포는 항상 완료된 상태 (success 또는 failed)
    if (extracted.status === 'in_progress') {
      extracted.status = 'success'; // 기본값으로 success 설정
    }

    //  [수정] 중복 step 제거
    const uniqueSteps = extracted.steps.reduce(
      (acc, step) => {
        const existingIndex = acc.findIndex(
          s => s.name === step.name && s.status === step.status
        );
        if (existingIndex === -1) {
          acc.push(step);
        } else {
          if (!acc[existingIndex].message && step.message) {
            acc[existingIndex] = step;
          }
        }
        return acc;
      },
      [] as typeof extracted.steps
    );
    extracted.steps = uniqueSteps;

    //  [수정] 중복 에러/경고 제거
    extracted.errors = [...new Set(extracted.errors)];
    extracted.warnings = [...new Set(extracted.warnings)];

    return extracted;
  }, [previousLogs]);

  const previousFormatted = useMemo(
    () => (previousMetrics ? formatDeployMetrics(previousMetrics) : null),
    [previousMetrics]
  );

  // 이전 배포 이력이 있는지 확인
  const hasPreviousDeployment = previousLogs && previousLogs.length > 0;

  // 상태별 색상 및 스타일 설정
  const getStatusConfig = (status: DeployMetrics['status']) => {
    switch (status) {
      case 'success':
        return {
          icon: (
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          ),
          title: '배포 성공',
          gradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          color: '#52c41a',
          bgColor: '#f6ffed',
          borderColor: '#b7eb8f',
        };
      case 'failed':
        return {
          icon: (
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          ),
          title: '배포 실패',
          gradient: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
          color: '#ff4d4f',
          bgColor: '#fff2f0',
          borderColor: '#ffccc7',
        };
      case 'in_progress':
        return {
          icon: (
            <SyncOutlined spin style={{ fontSize: 48, color: '#1890ff' }} />
          ),
          title: '배포 진행 중',
          gradient: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
          color: '#1890ff',
          bgColor: '#e6f7ff',
          borderColor: '#91d5ff',
        };
      default:
        return {
          icon: (
            <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          ),
          title: '배포 대기',
          gradient: 'linear-gradient(135deg, #d9d9d9 0%, #f0f0f0 100%)',
          color: '#8c8c8c',
          bgColor: '#fafafa',
          borderColor: '#d9d9d9',
        };
    }
  };

  const statusConfig = getStatusConfig(metrics.status);

  // 성공/실패 카운트
  const successCount = metrics.steps.filter(s => s.status === 'success').length;
  const totalSteps = metrics.steps.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((successCount / totalSteps) * 100) : 0;

  // 에러 해결 가이드
  const getErrorGuide = (errorType?: string) => {
    switch (errorType) {
      case 'ValidationFailed':
        return {
          title: '배포 검증 실패',
          tips: [
            '위의 검증 단계에서 실패한 항목을 확인하세요',
            '로그에서 상세 에러 메시지를 확인하세요',
            '리소스 부족이나 이미지 문제일 가능성이 높습니다',
          ],
        };
      case 'RolloutTimeout':
        return {
          title: 'Rollout 타임아웃',
          tips: [
            'Harbor Registry에 이미지가 정상적으로 Push되었는지 확인하세요',
            '노드의 CPU/메모리 리소스가 충분한지 확인하세요',
            '큰 이미지는 다운로드 시간이 오래 걸릴 수 있습니다',
          ],
        };
      case 'ImagePullBackOff':
      case 'PodError':
        return {
          title: '이미지 Pull 실패',
          tips: [
            'Harbor 프로젝트 경로가 올바른지 확인하세요',
            'imagePullSecrets 설정을 확인하세요',
            '노드에서 Harbor Registry 접근이 가능한지 네트워크를 확인하세요',
          ],
        };
      case 'NoRunningPods':
        return {
          title: 'Pod 실행 실패',
          tips: [
            'kubectl describe pod로 상세 에러를 확인하세요',
            'CPU/메모리 limits 설정이 적절한지 확인하세요',
            'readinessProbe, livenessProbe 설정을 확인하세요',
          ],
        };
      case 'CrashLoopBackOff':
        return {
          title: 'Pod 크래시',
          tips: [
            'kubectl logs로 애플리케이션 로그를 확인하세요',
            '필요한 환경 변수가 모두 설정되었는지 확인하세요',
            'DB, Redis 등 외부 서비스 연결을 확인하세요',
          ],
        };
      default:
        return null;
    }
  };

  const errorGuide = getErrorGuide(deploymentDetails?.error_type);

  //  [수정] "배포 로그 없음" Alert 제거 - 항상 상세한 배포 통계 패널 표시
  // deployStatus가 있으면 (배포 시도가 있었으면) 항상 배포 통계를 표시

  //  [신규] 배포 진행 중이고 이전 배포가 있을 때, 또는 이전 배포를 볼 수 있는 경우
  const showTabs =
    (metrics.status === 'in_progress' && hasPreviousDeployment) ||
    (metrics.status !== 'in_progress' && hasPreviousDeployment);

  // 현재 배포 내용 JSX
  const currentDeploymentContent = (
    <Space direction='vertical' size='large' style={{ width: '100%' }}>
      {/* 히어로 섹션 - 배포 상태 요약 */}
      <Card
        style={{
          background: statusConfig.gradient,
          border: 'none',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '32px 24px' }}
      >
        <Row gutter={[24, 24]} align='middle'>
          <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
            {statusConfig.icon}
          </Col>
          <Col xs={24} sm={18}>
            <Title level={2} style={{ color: '#fff', margin: '0 0 8px 0' }}>
              {statusConfig.title}
            </Title>
            <Paragraph
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 16,
                margin: 0,
              }}
            >
              {formatted.summary}
            </Paragraph>
          </Col>
        </Row>

        <Divider
          style={{ background: 'rgba(255,255,255,0.2)', margin: '24px 0' }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title={
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                  완료 단계
                </span>
              }
              value={successCount}
              suffix={`/ ${totalSteps}`}
              valueStyle={{ color: '#fff', fontSize: 24 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title={
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>성공률</span>
              }
              value={progressPercent}
              suffix='%'
              valueStyle={{ color: '#fff', fontSize: 24 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title={
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                  소요 시간
                </span>
              }
              value={metrics.duration || 0}
              suffix='초'
              valueStyle={{ color: '#fff', fontSize: 24 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title={
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>에러</span>
              }
              value={metrics.errors.length}
              suffix='개'
              valueStyle={{
                color:
                  metrics.errors.length > 0 ? '#fff' : 'rgba(255,255,255,0.65)',
                fontSize: 24,
              }}
            />
          </Col>
        </Row>

        {totalSteps > 0 && (
          <div style={{ marginTop: 24 }}>
            <Progress
              percent={progressPercent}
              strokeColor='#fff'
              trailColor='rgba(255,255,255,0.2)'
              showInfo={false}
              strokeWidth={8}
            />
          </div>
        )}
      </Card>

      {/* 에러 발생 시 해결 가이드 */}
      {metrics.status === 'failed' && errorGuide && (
        <Alert
          message={
            <Space>
              <WarningOutlined />
              <strong>{errorGuide.title}</strong>
            </Space>
          }
          description={
            <div>
              {deploymentDetails?.error_message && (
                <Paragraph style={{ margin: '8px 0' }}>
                  <Text strong>에러 메시지:</Text>{' '}
                  {deploymentDetails.error_message}
                </Paragraph>
              )}
              <Paragraph style={{ margin: '8px 0 4px 0' }}>
                <ThunderboltOutlined /> <Text strong>해결 방법:</Text>
              </Paragraph>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {errorGuide.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          }
          type='error'
          showIcon={false}
          style={{ borderRadius: 8 }}
        />
      )}

      {/* 상세 정보 그리드 */}
      <Row gutter={[16, 16]}>
        {/* 배포 정보 */}
        <Col xs={24} lg={24}>
          <Card
            title={
              <Space>
                <RocketOutlined />
                <span>배포 정보</span>
              </Space>
            }
            size='small'
            style={{ height: '100%', borderRadius: 8 }}
          >
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              {/*  [추가] 배포 상태 표시 */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type='secondary'>배포 상태</Text>
                <Badge
                  status={
                    metrics.status === 'success'
                      ? 'success'
                      : metrics.status === 'failed'
                        ? 'error'
                        : metrics.status === 'in_progress'
                          ? 'processing'
                          : 'default'
                  }
                  text={
                    <Text strong>
                      {metrics.status === 'success'
                        ? '성공'
                        : metrics.status === 'failed'
                          ? '실패'
                          : metrics.status === 'in_progress'
                            ? '진행 중'
                            : '대기'}
                    </Text>
                  }
                />
              </div>

              {/*  [추가] 실패 단계 표시 */}
              {metrics.status === 'failed' &&
                deploymentDetails?.error_stage && (
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text type='secondary'>실패 단계</Text>
                    <Text strong type='danger'>
                      {deploymentDetails.error_stage}
                    </Text>
                  </div>
                )}

              {/*  [추가] 서버 정보 표시 (서버 이름 우선, 없으면 ID) */}
              {((deploymentDetails as any)?.server_name ||
                (deploymentDetails as any)?.server_id) && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Text type='secondary'>배포 서버</Text>
                  <Text strong>
                    {(deploymentDetails as any)?.server_name ||
                      `Server #${(deploymentDetails as any).server_id}`}
                  </Text>
                </div>
              )}

              {metrics.namespace && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Text type='secondary'>Namespace</Text>
                  <Text strong>{metrics.namespace}</Text>
                </div>
              )}
              {/* 여러 이미지 표시 (images 배열 우선, 없으면 단일 이미지) */}
              {metrics.images && metrics.images.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <Text type='secondary'>
                    배포 이미지 ({metrics.images.length}개)
                  </Text>
                  {metrics.images.map((image, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingLeft: '8px',
                      }}
                    >
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        {idx + 1}.
                      </Text>
                      <Text
                        strong
                        style={{
                          fontSize: 11,
                          flex: 1,
                          marginLeft: '4px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {image.fullPath}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                metrics.imageName && (
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text type='secondary'>이미지</Text>
                    <Text strong style={{ fontSize: 12 }}>
                      {metrics.imageName}
                      {metrics.imageTag && `:${metrics.imageTag}`}
                    </Text>
                  </div>
                )
              )}
              {metrics.deployTime && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Text type='secondary'>배포 완료</Text>
                  <Text>{metrics.deployTime}</Text>
                </div>
              )}

              {/*  [추가] deploymentDetails가 비어있을 때 안내 메시지 */}
              {!metrics.namespace &&
                !metrics.images?.length &&
                !metrics.imageName &&
                !metrics.deployTime &&
                !(deploymentDetails as any)?.server_id && (
                  <Text type='secondary' italic style={{ fontSize: 12 }}>
                    상세 배포 정보가 기록되지 않았습니다.
                  </Text>
                )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 배포 단계 상세 (접을 수 있는 형태) */}
      {metrics.steps.length > 0 && (
        <Collapse
          defaultActiveKey={metrics.status === 'failed' ? ['steps'] : []}
          ghost
          expandIconPosition='end'
        >
          <Panel
            header={
              <Space>
                <CloudServerOutlined />
                <strong>배포 단계 상세</strong>
                <Badge
                  count={totalSteps}
                  style={{ backgroundColor: statusConfig.color }}
                />
              </Space>
            }
            key='steps'
          >
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              {metrics.steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background:
                      step.status === 'failed'
                        ? '#fff2f0'
                        : step.status === 'success'
                          ? '#f6ffed'
                          : '#fafafa',
                    borderRadius: 6,
                    border: `1px solid ${
                      step.status === 'failed'
                        ? '#ffccc7'
                        : step.status === 'success'
                          ? '#b7eb8f'
                          : '#d9d9d9'
                    }`,
                  }}
                >
                  <div style={{ marginRight: 12, fontSize: 18 }}>
                    {step.status === 'success' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : step.status === 'failed' ? (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    ) : step.status === 'in_progress' ? (
                      <SyncOutlined spin style={{ color: '#1890ff' }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>
                      <Text strong>{step.name}</Text>
                    </div>
                    {step.message && (
                      <div>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {step.message}
                        </Text>
                      </div>
                    )}
                  </div>
                  {step.timestamp && (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      {step.timestamp}
                    </Text>
                  )}
                </div>
              ))}
            </Space>
          </Panel>
        </Collapse>
      )}

      {/* 에러 및 경고 (접을 수 있는 형태) */}
      {(metrics.errors.length > 0 || metrics.warnings.length > 0) && (
        <Collapse
          defaultActiveKey={metrics.errors.length > 0 ? ['issues'] : []}
          ghost
          expandIconPosition='end'
        >
          <Panel
            header={
              <Space>
                <WarningOutlined
                  style={{
                    color: metrics.errors.length > 0 ? '#ff4d4f' : '#faad14',
                  }}
                />
                <strong>에러 및 경고</strong>
                {metrics.errors.length > 0 && (
                  <Badge
                    count={metrics.errors.length}
                    style={{ backgroundColor: '#ff4d4f' }}
                  />
                )}
                {metrics.warnings.length > 0 && (
                  <Badge
                    count={metrics.warnings.length}
                    style={{ backgroundColor: '#faad14' }}
                  />
                )}
              </Space>
            }
            key='issues'
          >
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              {metrics.errors.length > 0 && (
                <div>
                  <Text strong style={{ color: '#ff4d4f' }}>
                     에러 ({metrics.errors.length})
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {metrics.errors.map((error, idx) => (
                      <Alert
                        key={idx}
                        message={error}
                        type='error'
                        showIcon
                        style={{ marginBottom: 8, fontSize: 12 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {metrics.warnings.length > 0 && (
                <div>
                  <Text strong style={{ color: '#faad14' }}>
                    ⚠️ 경고 ({metrics.warnings.length})
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {metrics.warnings.map((warning, idx) => (
                      <Alert
                        key={idx}
                        message={warning.split('\n')[0]}
                        type='warning'
                        showIcon
                        style={{ marginBottom: 8, fontSize: 12 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Space>
          </Panel>
        </Collapse>
      )}
    </Space>
  );

  //  [신규] 이전 배포 내용 JSX
  const previousDeploymentContent =
    previousMetrics && previousFormatted ? (
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        {/* 이전 배포 히어로 섹션 */}
        <Card
          style={{
            background: getStatusConfig(previousMetrics.status).gradient,
            border: 'none',
            borderRadius: 12,
            overflow: 'hidden',
          }}
          bodyStyle={{ padding: '32px 24px' }}
        >
          <Row gutter={[24, 24]} align='middle'>
            <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
              {getStatusConfig(previousMetrics.status).icon}
            </Col>
            <Col xs={24} sm={18}>
              <Title level={2} style={{ color: '#fff', margin: '0 0 8px 0' }}>
                {getStatusConfig(previousMetrics.status).title}
              </Title>
              <Paragraph
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 16,
                  margin: 0,
                }}
              >
                {previousFormatted.summary}
              </Paragraph>
            </Col>
          </Row>

          <Divider
            style={{ background: 'rgba(255,255,255,0.2)', margin: '24px 0' }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title={
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                    완료 단계
                  </span>
                }
                value={
                  previousMetrics.steps.filter(s => s.status === 'success')
                    .length
                }
                suffix={`/ ${previousMetrics.steps.length}`}
                valueStyle={{ color: '#fff', fontSize: 24 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title={
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                    소요 시간
                  </span>
                }
                value={previousMetrics.duration || 0}
                suffix='초'
                valueStyle={{ color: '#fff', fontSize: 24 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title={
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>에러</span>
                }
                value={previousMetrics.errors.length}
                suffix='개'
                valueStyle={{
                  color:
                    previousMetrics.errors.length > 0
                      ? '#fff'
                      : 'rgba(255,255,255,0.65)',
                  fontSize: 24,
                }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title={
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>경고</span>
                }
                value={previousMetrics.warnings.length}
                suffix='개'
                valueStyle={{
                  color:
                    previousMetrics.warnings.length > 0
                      ? '#fff'
                      : 'rgba(255,255,255,0.65)',
                  fontSize: 24,
                }}
              />
            </Col>
          </Row>
        </Card>

        {/* 이전 배포 상세 정보 */}
        {previousMetrics.steps.length > 0 && (
          <Card
            title={
              <Space>
                <CloudServerOutlined />
                <span>배포 단계</span>
              </Space>
            }
            size='small'
            style={{ borderRadius: 8 }}
          >
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              {previousMetrics.steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background:
                      step.status === 'failed'
                        ? '#fff2f0'
                        : step.status === 'success'
                          ? '#f6ffed'
                          : '#fafafa',
                    borderRadius: 6,
                    border: `1px solid ${
                      step.status === 'failed'
                        ? '#ffccc7'
                        : step.status === 'success'
                          ? '#b7eb8f'
                          : '#d9d9d9'
                    }`,
                  }}
                >
                  <div style={{ marginRight: 12, fontSize: 18 }}>
                    {step.status === 'success' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : step.status === 'failed' ? (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div>
                      <Text strong>{step.name}</Text>
                    </div>
                    {step.message && (
                      <div>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {step.message}
                        </Text>
                      </div>
                    )}
                  </div>
                  {step.timestamp && (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      {step.timestamp}
                    </Text>
                  )}
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* 이전 배포 에러 및 경고 */}
        {(previousMetrics.errors.length > 0 ||
          previousMetrics.warnings.length > 0) && (
          <Card
            title={
              <Space>
                <WarningOutlined
                  style={{
                    color:
                      previousMetrics.errors.length > 0 ? '#ff4d4f' : '#faad14',
                  }}
                />
                <span>에러 및 경고</span>
              </Space>
            }
            size='small'
            style={{ borderRadius: 8 }}
          >
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              {previousMetrics.errors.length > 0 && (
                <div>
                  <Text strong style={{ color: '#ff4d4f' }}>
                     에러 ({previousMetrics.errors.length})
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {previousMetrics.errors.map((error, idx) => (
                      <Alert
                        key={idx}
                        message={error}
                        type='error'
                        showIcon
                        style={{ marginBottom: 8, fontSize: 12 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {previousMetrics.warnings.length > 0 && (
                <div>
                  <Text strong style={{ color: '#faad14' }}>
                    ⚠️ 경고 ({previousMetrics.warnings.length})
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    {previousMetrics.warnings.map((warning, idx) => (
                      <Alert
                        key={idx}
                        message={warning.split('\n')[0]}
                        type='warning'
                        showIcon
                        style={{ marginBottom: 8, fontSize: 12 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Space>
          </Card>
        )}
      </Space>
    ) : null;

  //  [신규] 메인 return - Tabs로 현재/이전 배포 구분
  if (showTabs) {
    return (
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type='card'
        items={[
          {
            key: 'current',
            label: (
              <Space>
                {metrics.status === 'in_progress' ? (
                  <SyncOutlined spin style={{ color: '#1890ff' }} />
                ) : metrics.status === 'success' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <span>
                  {metrics.status === 'in_progress'
                    ? '배포 진행 중'
                    : '최신 배포'}
                </span>
              </Space>
            ),
            children: (
              <div>
                {metrics.status === 'in_progress' && (
                  <Alert
                    message='배포 진행 중'
                    description="새로운 배포가 진행 중입니다. 이전 배포 이력은 '이전 배포' 탭에서 확인할 수 있습니다."
                    type='info'
                    showIcon
                    icon={<SyncOutlined spin />}
                    style={{ marginBottom: 16 }}
                  />
                )}
                {logs.length > 0 ? (
                  currentDeploymentContent
                ) : (
                  <Alert
                    message='배포 정보 로딩 중'
                    description='배포가 진행 중입니다. 잠시만 기다려주세요.'
                    type='info'
                    showIcon
                  />
                )}
              </div>
            ),
          },
          {
            key: 'previous',
            label: (
              <Space>
                <ClockCircleOutlined />
                <span>이전 배포</span>
              </Space>
            ),
            children: previousDeploymentContent || (
              <Alert
                message='이전 배포 정보 없음'
                description='이전 배포 기록이 없습니다.'
                type='info'
                showIcon
              />
            ),
          },
        ]}
      />
    );
  }

  //  [기존] Tabs가 필요없으면 현재 배포만 표시
  return currentDeploymentContent;
};

export default DeployMetricsPanelNew;
