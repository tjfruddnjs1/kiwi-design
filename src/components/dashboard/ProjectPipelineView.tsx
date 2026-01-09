import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Steps,
  Tag,
  Typography,
  Statistic,
  Button,
  Space,
  Timeline,
  Badge,
  Modal,
  Tooltip,
  Alert,
} from 'antd';
import {
  BuildOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  getPipelineByProjectId,
  getActivitiesByProjectId,
  getProjectById,
} from '../../data/mockProjects';

const { Title, Text } = Typography;
const { Step } = Steps;

interface ProjectPipelineViewProps {
  projectId: string;
}

const ProjectPipelineView: React.FC<ProjectPipelineViewProps> = ({
  projectId,
}) => {
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  // Get project data
  const project = useMemo(() => getProjectById(projectId), [projectId]);
  const pipeline = useMemo(
    () => getPipelineByProjectId(projectId),
    [projectId]
  );
  const activities = useMemo(
    () => getActivitiesByProjectId(projectId),
    [projectId]
  );

  // Pipeline stage status mapping
  const getPipelineStageStatus = useCallback(
    (status: string): 'finish' | 'process' | 'error' | 'wait' => {
      switch (status) {
        case 'success':
          return 'finish';
        case 'running':
          return 'process';
        case 'error':
          return 'error';
        case 'pending':
          return 'wait';
        default:
          return 'wait';
      }
    },
    []
  );

  // Get stage icon
  const getStageIcon = useCallback((status: string) => {
    switch (status) {
      case 'running':
        return <LoadingOutlined />;
      case 'error':
        return <ExclamationCircleOutlined />;
      case 'success':
        return <CheckCircleOutlined />;
      default:
        return undefined;
    }
  }, []);

  // Get metrics color
  const getMetricColor = useCallback(
    (value: number, type: 'successRate' | 'deploys') => {
      if (type === 'successRate') {
        if (value >= 95) return '#52c41a';
        if (value >= 85) return '#1890ff';
        if (value >= 70) return '#fa8c16';
        return '#f5222d';
      }
      if (type === 'deploys') {
        if (value >= 10) return '#52c41a';
        if (value >= 5) return '#1890ff';
        if (value >= 1) return '#fa8c16';
        return '#d9d9d9';
      }
      return '#1890ff';
    },
    []
  );

  // Handle pipeline actions
  const handlePipelineAction = useCallback(
    (action: 'run' | 'stop' | 'restart') => {
      setIsRunning(action === 'run' || action === 'restart');
      // Simulate action completion
      setTimeout(() => {
        setIsRunning(false);
      }, 3000);
    },
    []
  );

  // Show stage logs
  const showStageLogs = useCallback((stageName: string) => {
    setSelectedStage(stageName);
    setLogModalVisible(true);
  }, []);

  if (!project || !pipeline) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type='secondary'>프로젝트 정보를 찾을 수 없습니다.</Text>
      </div>
    );
  }

  const currentStageIndex =
    pipeline.stages.findIndex(s => s.status === 'running') !== -1
      ? pipeline.stages.findIndex(s => s.status === 'running')
      : pipeline.stages.filter(s => s.status === 'success').length;

  const hasErrors = pipeline.stages.some(s => s.status === 'error');
  const isCompleted = pipeline.stages.every(s => s.status === 'success');

  return (
    <div className='pipeline-view-container'>
      {/* Project Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            <RocketOutlined /> {project.name} 파이프라인
          </Title>
          <Space>
            <Tag
              color={
                project.environment === 'production'
                  ? 'red'
                  : project.environment === 'staging'
                    ? 'orange'
                    : 'blue'
              }
            >
              {project.environment}
            </Tag>
            <Text type='secondary'>마지막 실행: {pipeline.lastRun}</Text>
          </Space>
        </div>

        {/* Status Alert */}
        {hasErrors && (
          <Alert
            message='파이프라인 오류 발생'
            description='파이프라인 실행 중 오류가 발생했습니다. 로그를 확인하여 문제를 해결해주세요.'
            type='error'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {isCompleted && (
          <Alert
            message='파이프라인 완료'
            description='모든 단계가 성공적으로 완료되었습니다.'
            type='success'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
      </div>

      <Row gutter={[16, 16]}>
        {/* Pipeline Steps */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <BuildOutlined />
                <span>파이프라인 단계</span>
                <Badge
                  status={
                    hasErrors ? 'error' : isCompleted ? 'success' : 'processing'
                  }
                  text={hasErrors ? '오류' : isCompleted ? '완료' : '실행 중'}
                />
              </Space>
            }
            extra={
              <Space>
                <Button
                  type='primary'
                  icon={<PlayCircleOutlined />}
                  size='small'
                  loading={isRunning}
                  onClick={() => handlePipelineAction('run')}
                >
                  실행
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  size='small'
                  onClick={() => handlePipelineAction('restart')}
                >
                  재시작
                </Button>
              </Space>
            }
          >
            <Steps
              current={currentStageIndex}
              direction='vertical'
              size='small'
              style={{ marginBottom: 24 }}
            >
              {pipeline.stages.map((stage, _index) => (
                <Step
                  key={stage.key}
                  title={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{stage.name}</span>
                      <Space size='small'>
                        {stage.logs && (
                          <Tooltip title='로그 보기'>
                            <Button
                              type='text'
                              size='small'
                              icon={<EyeOutlined />}
                              onClick={() => showStageLogs(stage.name)}
                            />
                          </Tooltip>
                        )}
                        <Tag
                          size='small'
                          color={
                            stage.status === 'success'
                              ? 'green'
                              : stage.status === 'running'
                                ? 'blue'
                                : stage.status === 'error'
                                  ? 'red'
                                  : 'default'
                          }
                        >
                          {stage.duration}
                        </Tag>
                      </Space>
                    </div>
                  }
                  status={getPipelineStageStatus(stage.status)}
                  description={
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {stage.timestamp}
                      {stage.logs && (
                        <div style={{ marginTop: 4, color: '#f5222d' }}>
                          <WarningOutlined /> {stage.logs}
                        </div>
                      )}
                    </div>
                  }
                  icon={getStageIcon(stage.status)}
                />
              ))}
            </Steps>
          </Card>
        </Col>

        {/* Pipeline Metrics */}
        <Col xs={24} lg={8}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card
                title={
                  <>
                    <InfoCircleOutlined /> 파이프라인 메트릭
                  </>
                }
                size='small'
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title='성공률'
                      value={pipeline.metrics.successRate}
                      suffix='%'
                      valueStyle={{
                        color: getMetricColor(
                          pipeline.metrics.successRate,
                          'successRate'
                        ),
                        fontSize: '18px',
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title='오늘 배포'
                      value={pipeline.metrics.deploysToday}
                      suffix='회'
                      valueStyle={{
                        color: getMetricColor(
                          pipeline.metrics.deploysToday,
                          'deploys'
                        ),
                        fontSize: '18px',
                      }}
                    />
                  </Col>
                </Row>

                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text strong style={{ fontSize: '12px' }}>
                      평균 배포 시간
                    </Text>
                    <Text strong style={{ fontSize: '12px' }}>
                      {pipeline.metrics.avgDeployTime}
                    </Text>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: '12px' }}>총 배포 횟수</Text>
                    <Text style={{ fontSize: '12px' }}>
                      {pipeline.metrics.totalDeploys.toLocaleString()}회
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Recent Activities */}
            <Col span={24}>
              <Card
                title={
                  <>
                    <ClockCircleOutlined /> 최근 활동
                  </>
                }
                size='small'
                extra={
                  <Button type='text' size='small'>
                    전체보기
                  </Button>
                }
              >
                {activities.length > 0 ? (
                  <Timeline
                    size='small'
                    items={activities.slice(0, 3).map(activity => ({
                      key: activity.id,
                      dot: (
                        <Badge
                          status={
                            activity.status === 'success'
                              ? 'success'
                              : activity.status === 'error'
                                ? 'error'
                                : activity.status === 'critical'
                                  ? 'error'
                                  : 'processing'
                          }
                        />
                      ),
                      children: (
                        <div>
                          <div style={{ marginBottom: 4 }}>
                            <Space size='small'>
                              <Tag size='small' color='blue'>
                                {activity.workflow}
                              </Tag>
                              <Tag size='small'>{activity.stage}</Tag>
                            </Space>
                          </div>
                          <Text style={{ fontSize: '12px' }}>
                            {activity.message}
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            <Text type='secondary' style={{ fontSize: '11px' }}>
                              {activity.time} • {activity.assignee}
                            </Text>
                          </div>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    최근 활동이 없습니다.
                  </Text>
                )}
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Log Modal */}
      <Modal
        title={`${selectedStage} 단계 로그`}
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={[
          <Button key='close' onClick={() => setLogModalVisible(false)}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        <div
          style={{
            backgroundColor: '#f6f6f6',
            padding: '16px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <Text>
            {pipeline.stages.find(s => s.name === selectedStage)?.logs ||
              `${selectedStage} 단계의 상세 로그를 여기에 표시합니다.\n실제 구현에서는 서버에서 실시간 로그를 가져와 표시합니다.`}
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectPipelineView;
