import React, { useState, useCallback, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Typography,
  Tabs,
  Space,
  Tag,
  Alert,
  Badge,
  List,
  Avatar,
  Progress,
  Switch,
  Select,
  Modal,
} from 'antd';
import {
  BuildOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  BulbOutlined,
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  UserOutlined,
  TeamOutlined,
  AlertOutlined,
  CodeOutlined,
  BugOutlined,
  RocketOutlined,
  MonitorOutlined,
  StopOutlined,
  SafetyOutlined,
  EyeOutlined,
  LoadingOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import ProjectPipelineView from './ProjectPipelineView';
import ProjectQuickActions from './ProjectQuickActions';
import {
  mockWorkflowStatuses,
  mockAIInsights,
  mockPriorityTasks,
  mockSystemHealthSummary,
  getCriticalAIInsights,
  getUrgentTasks,
  WorkflowStage,
  PriorityTask,
  AIInsight,
} from '../../data/mockAIDevOpsData';

const { Title, Text } = Typography;

interface EnhancedPipelineFlowProps {
  selectedProjectId: string | null;
  onSelectProject: () => void;
}

const EnhancedPipelineFlow: React.FC<EnhancedPipelineFlowProps> = ({
  selectedProjectId,
  onSelectProject,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>('pipeline-view');
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    WorkflowStage | 'all'
  >('all');
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedStageForLog, setSelectedStageForLog] =
    useState<WorkflowStage | null>(null);
  const [executingStages, setExecutingStages] = useState<Set<WorkflowStage>>(
    new Set()
  );

  // AI 인사이트 데이터
  const urgentTasks = useMemo(() => getUrgentTasks(), []);
  const criticalInsights = useMemo(() => getCriticalAIInsights(), []);

  // 워크플로우 단계별 아이콘 및 색상
  const stageIcons = {
    code: <CodeOutlined />,
    security: <SafetyOutlined />,
    build: <BuildOutlined />,
    test: <BugOutlined />,
    deploy: <RocketOutlined />,
    operate: <MonitorOutlined />,
  };

  const stageColors = {
    code: '#1890ff',
    security: '#ff7a45',
    build: '#52c41a',
    test: '#fa8c16',
    deploy: '#722ed1',
    operate: '#13c2c2',
  };

  const statusColors = {
    healthy: '#52c41a',
    attention: '#fa8c16',
    critical: '#f5222d',
    inactive: '#d9d9d9',
  };

  const priorityColors = {
    urgent: '#f5222d',
    high: '#fa541c',
    medium: '#1890ff',
    low: '#52c41a',
  };

  // 필터링된 작업들
  const filteredTasks = useMemo(() => {
    if (selectedWorkflow === 'all') return mockPriorityTasks;
    return mockPriorityTasks.filter(task => task.category === selectedWorkflow);
  }, [selectedWorkflow]);

  // 워크플로우 실행 핸들러
  const handleExecuteWorkflow = useCallback(
    (stage: WorkflowStage) => {
      if (executingStages.has(stage)) return;

      setExecutingStages(prev => new Set([...prev, stage]));

      // 실행 시뮬레이션 (3-5초)
      setTimeout(
        () => {
          setExecutingStages(prev => {
            const newSet = new Set(prev);
            newSet.delete(stage);
            return newSet;
          });
        },
        Math.random() * 2000 + 3000
      );
    },
    [executingStages]
  );

  // 로그 보기 핸들러
  const handleViewLogs = useCallback((stage: WorkflowStage) => {
    setSelectedStageForLog(stage);
    setLogModalVisible(true);
  }, []);

  const handleTaskAction = (_taskId: string) => {};

  const handleAIInsightAction = (_insightId: string) => {};

  if (!selectedProjectId) {
    return (
      <div
        className='no-project-selected'
        style={{ textAlign: 'center', padding: '48px 0' }}
      >
        <Text type='secondary'>
          프로젝트를 선택하면 파이프라인 상태와 AI 워크플로우를 확인할 수
          있습니다.
        </Text>
        <br />
        <Button
          type='primary'
          className='select-project-button'
          onClick={onSelectProject}
          style={{ marginTop: 16 }}
        >
          프로젝트 선택하기
        </Button>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'pipeline-view',
      label: (
        <Space>
          <BuildOutlined />
          파이프라인 상태
        </Space>
      ),
      children: <ProjectPipelineView projectId={selectedProjectId} />,
    },
    {
      key: 'quick-actions',
      label: (
        <Space>
          <ThunderboltOutlined />
          빠른 작업
        </Space>
      ),
      children: <ProjectQuickActions projectId={selectedProjectId} />,
    },
    {
      key: 'ai-workflow',
      label: (
        <Space>
          <RobotOutlined />
          AI 워크플로우
          <Tag color='purple' size='small'>
            SMART
          </Tag>
        </Space>
      ),
      children: (
        <div style={{ padding: '0' }}>
          {/* AI 긴급 알림 배너 */}
          {(urgentTasks.length > 0 || criticalInsights.length > 0) && (
            <Alert
              message={
                <Space>
                  <FireOutlined />
                  <Text strong>긴급 대응 필요</Text>
                </Space>
              }
              description={
                <div>
                  {urgentTasks.length > 0 && (
                    <Text>
                      긴급 작업 {urgentTasks.length}개가 대기 중입니다.{' '}
                    </Text>
                  )}
                  {criticalInsights.length > 0 && (
                    <Text>
                      Critical AI 인사이트 {criticalInsights.length}개가
                      있습니다.
                    </Text>
                  )}
                </div>
              }
              type='error'
              showIcon
              style={{ marginBottom: 24 }}
              action={
                <Button
                  type='primary'
                  danger
                  size='small'
                  onClick={() => setSelectedWorkflow('all')}
                >
                  즉시 확인
                </Button>
              }
            />
          )}

          {/* 시스템 전체 상태 요약 */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Title level={4} style={{ marginBottom: 16 }}>
                  <TrophyOutlined /> 오늘의 시스템 헬스 현황
                </Title>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color:
                            statusColors[
                              mockSystemHealthSummary.overall.status
                            ],
                        }}
                      >
                        {mockSystemHealthSummary.overall.score}
                      </div>
                      <Text type='secondary'>전체 건강도</Text>
                      <br />
                      <Tag
                        color={
                          mockSystemHealthSummary.overall.trend === 'improving'
                            ? 'green'
                            : 'orange'
                        }
                      >
                        {mockSystemHealthSummary.overall.trend === 'improving'
                          ? '↗ 개선중'
                          : '→ 안정'}
                      </Tag>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: '#1890ff',
                        }}
                      >
                        {mockSystemHealthSummary.activeAlerts.critical +
                          mockSystemHealthSummary.activeAlerts.high}
                      </div>
                      <Text type='secondary'>주의 알림</Text>
                      <br />
                      <Space size={4}>
                        <Badge
                          count={mockSystemHealthSummary.activeAlerts.critical}
                          style={{ backgroundColor: '#f5222d' }}
                        />
                        <Badge
                          count={mockSystemHealthSummary.activeAlerts.high}
                          style={{ backgroundColor: '#fa541c' }}
                        />
                      </Space>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: '#52c41a',
                        }}
                      >
                        {
                          urgentTasks.filter(t => t.status === 'completed')
                            .length
                        }
                      </div>
                      <Text type='secondary'>완료 작업</Text>
                      <br />
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        총 {urgentTasks.length}개 중
                      </Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: '#722ed1',
                        }}
                      >
                        {mockAIInsights.length}
                      </div>
                      <Text type='secondary'>AI 제안</Text>
                      <br />
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        실행 대기
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Col>
              <Col xs={24} lg={8}>
                <Title level={5} style={{ marginBottom: 12 }}>
                  최근 개선사항
                </Title>
                <List
                  size='small'
                  dataSource={mockSystemHealthSummary.recentImprovements}
                  renderItem={improvement => (
                    <List.Item>
                      <CheckCircleOutlined
                        style={{ color: '#52c41a', marginRight: 8 }}
                      />
                      <Text style={{ fontSize: 12 }}>{improvement}</Text>
                    </List.Item>
                  )}
                />
              </Col>
            </Row>
          </Card>

          {/* 워크플로우 단계별 상태 */}
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>워크플로우 단계별 현황</span>
                <Tag color='blue'>실시간</Tag>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Row gutter={[16, 16]}>
              {mockWorkflowStatuses.map(workflow => (
                <Col xs={24} sm={12} lg={8} xl={4} key={workflow.stage}>
                  <Card
                    hoverable
                    size='small'
                    className={`workflow-health-card ${workflow.status}`}
                    style={{
                      borderLeft: `4px solid ${stageColors[workflow.stage]}`,
                      background:
                        workflow.status === 'critical'
                          ? 'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 24,
                          color: stageColors[workflow.stage],
                          marginBottom: 8,
                        }}
                      >
                        {stageIcons[workflow.stage]}
                      </div>
                      <Text
                        strong
                        style={{ display: 'block', marginBottom: 4 }}
                      >
                        {workflow.name}
                      </Text>
                      <Progress
                        percent={workflow.progress}
                        size='small'
                        strokeColor={statusColors[workflow.status]}
                        style={{ marginBottom: 8 }}
                      />
                      <Space size={4} style={{ marginBottom: 8 }}>
                        <Tag size='small' color={statusColors[workflow.status]}>
                          {workflow.status === 'healthy'
                            ? '정상'
                            : workflow.status === 'attention'
                              ? '주의'
                              : workflow.status === 'critical'
                                ? '위험'
                                : '비활성'}
                        </Tag>
                        <Tag size='small'>
                          {workflow.completedTasks}/{workflow.totalTasks}
                        </Tag>
                      </Space>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        <div>처리량: {workflow.metrics.throughput}%</div>
                        <div>품질: {workflow.metrics.quality}%</div>
                        <div>리드타임: {workflow.averageLeadTime}</div>
                      </div>

                      {/* 최근 실행 경과시간 */}
                      <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <Space
                          size={4}
                          direction='vertical'
                          style={{ width: '100%' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              color: '#999',
                            }}
                          >
                            <HistoryOutlined style={{ marginRight: 4 }} />
                            최근 실행: {workflow.execution.elapsedTime}
                          </div>
                          {workflow.execution.isExecuting && (
                            <Tag color='processing' size='small'>
                              <LoadingOutlined /> 실행 중
                            </Tag>
                          )}
                        </Space>
                      </div>

                      {/* 실행 버튼과 로그 보기 버튼 */}
                      <Space
                        size={4}
                        style={{
                          marginTop: 8,
                          width: '100%',
                          justifyContent: 'center',
                        }}
                      >
                        <Button
                          type='primary'
                          size='small'
                          icon={
                            workflow.execution.isExecuting ||
                            executingStages.has(workflow.stage) ? (
                              <LoadingOutlined />
                            ) : (
                              <PlayCircleOutlined />
                            )
                          }
                          disabled={
                            !workflow.execution.canExecute ||
                            workflow.execution.isExecuting ||
                            executingStages.has(workflow.stage)
                          }
                          onClick={() => handleExecuteWorkflow(workflow.stage)}
                          style={{ fontSize: 10, height: 24, padding: '0 8px' }}
                        >
                          {workflow.execution.isExecuting ||
                          executingStages.has(workflow.stage)
                            ? '실행중'
                            : '실행'}
                        </Button>
                        <Button
                          size='small'
                          icon={<EyeOutlined />}
                          onClick={() => handleViewLogs(workflow.stage)}
                          style={{ fontSize: 10, height: 24, padding: '0 8px' }}
                        >
                          로그
                        </Button>
                      </Space>

                      {workflow.blockedTasks > 0 && (
                        <Tag color='red' size='small' style={{ marginTop: 4 }}>
                          블록 {workflow.blockedTasks}개
                        </Tag>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 메인 콘텐츠 영역 */}
          <Row gutter={[16, 16]}>
            {/* 우선순위 작업 목록 */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <ClockCircleOutlined />
                    <span>오늘의 우선순위 작업</span>
                    <Switch
                      size='small'
                      checked={selectedWorkflow !== 'all'}
                      onChange={checked =>
                        setSelectedWorkflow(checked ? 'code' : 'all')
                      }
                      checkedChildren='필터'
                      unCheckedChildren='전체'
                    />
                  </Space>
                }
                extra={
                  selectedWorkflow !== 'all' && (
                    <Select
                      value={selectedWorkflow}
                      onChange={setSelectedWorkflow}
                      size='small'
                      style={{ width: 120 }}
                    >
                      <Select.Option value='code'>코드</Select.Option>
                      <Select.Option value='security'>취약점분석</Select.Option>
                      <Select.Option value='build'>빌드</Select.Option>
                      <Select.Option value='test'>테스트</Select.Option>
                      <Select.Option value='deploy'>배포</Select.Option>
                      <Select.Option value='operate'>운영</Select.Option>
                    </Select>
                  )
                }
              >
                {/* 긴급 작업 섹션 */}
                {urgentTasks.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Title
                      level={5}
                      style={{ color: '#f5222d', marginBottom: 12 }}
                    >
                      <FireOutlined /> 긴급 처리 필요 ({urgentTasks.length})
                    </Title>
                    <List
                      dataSource={urgentTasks}
                      renderItem={(task: PriorityTask) => (
                        <List.Item
                          style={{
                            background:
                              'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)',
                            border: '1px solid #ffb3ba',
                            borderRadius: 8,
                            marginBottom: 8,
                            padding: 12,
                          }}
                          actions={[
                            <Button
                              key={`urgent-task-${task.id}`}
                              type='primary'
                              danger
                              size='small'
                              icon={<PlayCircleOutlined />}
                              onClick={() => handleTaskAction(task.id)}
                              disabled={task.status === 'in_progress'}
                            >
                              {task.status === 'in_progress'
                                ? '진행중'
                                : '시작'}
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                style={{
                                  background: priorityColors[task.priority],
                                  color: 'white',
                                }}
                                icon={
                                  stageIcons[
                                    task.category as WorkflowStage
                                  ] || <AlertOutlined />
                                }
                              />
                            }
                            title={
                              <Space>
                                <Text strong>{task.title}</Text>
                                <Tag color={priorityColors[task.priority]}>
                                  {task.priority.toUpperCase()}
                                </Tag>
                                {task.deadline && (
                                  <Tag color='volcano'>
                                    <ClockCircleOutlined /> {task.deadline}
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={
                              <div>
                                <Text>{task.description}</Text>
                                <div style={{ marginTop: 4 }}>
                                  <Space size={4}>
                                    <Tag size='small'>{task.assignee}</Tag>
                                    <Tag size='small'>
                                      ⏱ {task.estimatedTime}
                                    </Tag>
                                    {task.blockers &&
                                      task.blockers.length > 0 && (
                                        <Tag size='small' color='red'>
                                          <StopOutlined /> 블록{' '}
                                          {task.blockers.length}
                                        </Tag>
                                      )}
                                  </Space>
                                </div>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                )}

                {/* 일반 작업들 */}
                <div>
                  <Title level={5} style={{ marginBottom: 12 }}>
                    <TeamOutlined /> 진행중인 작업들
                  </Title>
                  <List
                    dataSource={filteredTasks.filter(
                      task => task.priority !== 'urgent'
                    )}
                    renderItem={(task: PriorityTask) => (
                      <List.Item
                        style={{
                          borderRadius: 8,
                          marginBottom: 8,
                          border: '1px solid #f0f0f0',
                          background: 'white',
                        }}
                        actions={[
                          <Button
                            key={`important-task-${task.id}`}
                            type={
                              task.status === 'pending' ? 'primary' : 'default'
                            }
                            size='small'
                            icon={
                              task.status === 'completed' ? (
                                <CheckCircleOutlined />
                              ) : (
                                <PlayCircleOutlined />
                              )
                            }
                            onClick={() => handleTaskAction(task.id)}
                            disabled={task.status === 'in_progress'}
                          >
                            {task.status === 'completed'
                              ? '완료'
                              : task.status === 'in_progress'
                                ? '진행중'
                                : '시작'}
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              style={{
                                background:
                                  task.status === 'completed'
                                    ? '#52c41a'
                                    : priorityColors[task.priority],
                                color: 'white',
                              }}
                              icon={
                                stageIcons[task.category as WorkflowStage] || (
                                  <AlertOutlined />
                                )
                              }
                            />
                          }
                          title={
                            <Space>
                              <Text strong={task.priority === 'high'}>
                                {task.title}
                              </Text>
                              <Tag
                                color={priorityColors[task.priority]}
                                size='small'
                              >
                                {task.priority}
                              </Tag>
                            </Space>
                          }
                          description={
                            <div>
                              <Text>{task.description}</Text>
                              <div style={{ marginTop: 4 }}>
                                <Space size={4}>
                                  <Tag size='small'>{task.assignee}</Tag>
                                  <Tag size='small'>
                                    ⏱ {task.estimatedTime}
                                  </Tag>
                                </Space>
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </Card>
            </Col>

            {/* AI 인사이트 및 추천 */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <RobotOutlined />
                    <span>AI 인텔리전스</span>
                    <Badge
                      count={criticalInsights.length}
                      style={{ backgroundColor: '#f5222d' }}
                    />
                  </Space>
                }
                extra={
                  <Switch
                    size='small'
                    checked={showAIRecommendations}
                    onChange={setShowAIRecommendations}
                    checkedChildren='ON'
                    unCheckedChildren='OFF'
                  />
                }
              >
                {showAIRecommendations && (
                  <div>
                    {/* Critical 인사이트 */}
                    {criticalInsights.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <Title
                          level={5}
                          style={{ color: '#f5222d', marginBottom: 12 }}
                        >
                          <FireOutlined /> 긴급 AI 분석
                        </Title>
                        {criticalInsights.map((insight: AIInsight) => (
                          <Card
                            key={insight.id}
                            size='small'
                            style={{
                              marginBottom: 8,
                              border: '1px solid #ff4d4f',
                              background:
                                'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)',
                            }}
                          >
                            <div style={{ marginBottom: 8 }}>
                              <Text strong style={{ color: '#f5222d' }}>
                                {insight.title}
                              </Text>
                              <div style={{ marginTop: 4 }}>
                                <Text style={{ fontSize: 12 }}>
                                  {insight.description}
                                </Text>
                              </div>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <Tag color='red' size='small'>
                                AI 확신도 {insight.aiScore}%
                              </Tag>
                              <Tag size='small'>
                                영향: {insight.estimatedImpact}
                              </Tag>
                            </div>
                            <Button
                              type='primary'
                              danger
                              size='small'
                              block
                              onClick={() => handleAIInsightAction(insight.id)}
                            >
                              AI 제안 실행
                            </Button>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* 일반 AI 인사이트 */}
                    <div>
                      <Title level={5} style={{ marginBottom: 12 }}>
                        <BulbOutlined /> AI 최적화 제안
                      </Title>
                      {mockAIInsights
                        .filter(insight => insight.severity !== 'critical')
                        .slice(0, 3)
                        .map((insight: AIInsight) => (
                          <Card
                            key={insight.id}
                            size='small'
                            hoverable
                            style={{ marginBottom: 8 }}
                          >
                            <div style={{ marginBottom: 8 }}>
                              <Space>
                                <Tag
                                  color={
                                    insight.type === 'optimization'
                                      ? 'green'
                                      : insight.type === 'prediction'
                                        ? 'blue'
                                        : 'orange'
                                  }
                                  size='small'
                                >
                                  {insight.type}
                                </Tag>
                                <Tag
                                  color={
                                    insight.severity === 'high'
                                      ? 'red'
                                      : insight.severity === 'medium'
                                        ? 'orange'
                                        : 'green'
                                  }
                                  size='small'
                                >
                                  {insight.severity}
                                </Tag>
                              </Space>
                            </div>
                            <Text
                              strong
                              style={{ display: 'block', marginBottom: 4 }}
                            >
                              {insight.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                display: 'block',
                                marginBottom: 8,
                              }}
                            >
                              {insight.description}
                            </Text>
                            <div style={{ marginBottom: 8 }}>
                              <Text style={{ fontSize: 11, color: '#666' }}>
                                예상 효과: {insight.estimatedImpact}
                              </Text>
                            </div>
                            <Button
                              type='primary'
                              size='small'
                              block
                              onClick={() => handleAIInsightAction(insight.id)}
                            >
                              세부사항 보기
                            </Button>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className='enhanced-pipeline-flow'>
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={tabItems}
        destroyInactiveTabPane={false}
        animated={{
          inkBar: true,
          tabPane: false,
        }}
      />

      {/* 워크플로우 로그 모달 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {selectedStageForLog &&
              mockWorkflowStatuses.find(w => w.stage === selectedStageForLog)
                ?.name}{' '}
            실행 로그
          </Space>
        }
        open={logModalVisible}
        onCancel={() => {
          setLogModalVisible(false);
          setSelectedStageForLog(null);
        }}
        footer={[
          <Button
            key='close'
            onClick={() => {
              setLogModalVisible(false);
              setSelectedStageForLog(null);
            }}
          >
            닫기
          </Button>,
        ]}
        width={800}
      >
        {selectedStageForLog && (
          <div>
            {/* 실행 정보 */}
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: '#f8f9fa',
                borderRadius: 4,
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>실행 시작:</Text>
                  <br />
                  <Text type='secondary'>
                    {
                      mockWorkflowStatuses.find(
                        w => w.stage === selectedStageForLog
                      )?.execution.lastExecutionTime
                    }
                  </Text>
                </Col>
                <Col span={8}>
                  <Text strong>경과 시간:</Text>
                  <br />
                  <Text type='secondary'>
                    {
                      mockWorkflowStatuses.find(
                        w => w.stage === selectedStageForLog
                      )?.execution.elapsedTime
                    }
                  </Text>
                </Col>
                <Col span={8}>
                  <Text strong>실행 상태:</Text>
                  <br />
                  <Tag
                    color={
                      mockWorkflowStatuses.find(
                        w => w.stage === selectedStageForLog
                      )?.execution.isExecuting
                        ? 'processing'
                        : 'success'
                    }
                  >
                    {mockWorkflowStatuses.find(
                      w => w.stage === selectedStageForLog
                    )?.execution.isExecuting
                      ? '실행 중'
                      : '완료'}
                  </Tag>
                </Col>
              </Row>
            </div>

            {/* 로그 내용 */}
            <div
              style={{
                backgroundColor: '#1f1f1f',
                color: '#ffffff',
                padding: '16px',
                borderRadius: '4px',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                fontSize: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #d9d9d9',
              }}
            >
              {mockWorkflowStatuses
                .find(w => w.stage === selectedStageForLog)
                ?.execution.executionLogs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: 4,
                      color: log.includes('[ERROR]')
                        ? '#ff6b6b'
                        : log.includes('[현재 진행 중]')
                          ? '#4ecdc4'
                          : log.includes('완료')
                            ? '#51cf66'
                            : '#ffffff',
                    }}
                  >
                    {log}
                  </div>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnhancedPipelineFlow;
