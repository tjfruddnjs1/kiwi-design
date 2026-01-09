import React, { useState, useCallback, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Typography,
  List,
  Button,
  Space,
  Tag,
  Badge,
  Alert,
  Avatar,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  ToolOutlined,
  TrophyOutlined,
  FireOutlined,
  BellOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  UserOutlined,
  CalendarOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import {
  mockSystemHealth,
  mockUserWorkflowStats,
  generatePriorityMatrix,
  getTodayWorkflowSummary,
  getActionRequiredTasks,
  getCriticalAlerts,
  WorkflowTask,
  WorkflowAlert,
} from '../../data/mockWorkflowData';

const { Title, Text, Paragraph } = Typography;

interface WorkflowDashboardProps {
  className?: string;
}

const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({ className }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Computed data using workflow-focused logic
  const priorityMatrix = useMemo(() => generatePriorityMatrix(), []);
  const todaySummary = useMemo(() => getTodayWorkflowSummary(), []);
  const actionRequiredTasks = useMemo(() => getActionRequiredTasks(), []);
  const criticalAlerts = useMemo(
    () =>
      getCriticalAlerts().filter(alert => !dismissedAlerts.includes(alert.id)),
    [dismissedAlerts]
  );

  // Helper functions for workflow-centric display
  const getPriorityColor = useCallback((priority: WorkflowTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return '#ff4d4f';
      case 'high':
        return '#fa8c16';
      case 'medium':
        return '#1890ff';
      case 'low':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  }, []);

  const getCategoryIcon = useCallback((category: WorkflowTask['category']) => {
    switch (category) {
      case 'deployment':
        return <RocketOutlined />;
      case 'security':
        return <SecurityScanOutlined />;
      case 'maintenance':
        return <ToolOutlined />;
      case 'monitoring':
        return <MonitorOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  }, []);

  const getHealthTrendIcon = useCallback((trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'down':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      case 'stable':
        return <MinusOutlined style={{ color: '#1890ff' }} />;
      default:
        return <MinusOutlined style={{ color: '#d9d9d9' }} />;
    }
  }, []);

  const handleTaskAction = useCallback((_taskId: string) => {
    // 실제 환경에서는 API 호출
  }, []);

  const handleAlertAction = useCallback((alert: WorkflowAlert) => {
    if (alert.actionButton) {
      if (process.env.NODE_ENV === 'development') {
        // 개발 환경에서는 로깅만 수행
      }
      // 실제 환경에서는 액션 실행
    }
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  }, []);

  return (
    <div className={`workflow-dashboard ${className || ''}`}>
      {/* Today's Focus Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <CalendarOutlined /> 오늘의 운영 현황
        </Title>
        <Paragraph type='secondary'>
          {todaySummary.date} • 우선순위 기반 워크플로우 관리
        </Paragraph>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card
              style={{
                borderColor: '#ff4d4f',
                borderWidth: 2,
                backgroundColor: '#fff2f0',
              }}
              styles={{ body: { padding: '16px 24px' } }}
            >
              <Space direction='vertical' style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FireOutlined
                    style={{ color: '#ff4d4f', fontSize: '18px' }}
                  />
                  <Text strong style={{ color: '#ff4d4f', fontSize: '16px' }}>
                    즉시 조치가 필요한 항목이 있습니다
                  </Text>
                  <Badge
                    count={criticalAlerts.length}
                    style={{ backgroundColor: '#ff4d4f' }}
                  />
                </div>

                {criticalAlerts.map(alert => (
                  <Alert
                    key={alert.id}
                    type='error'
                    message={alert.title}
                    description={`${alert.projectName}: ${alert.message}`}
                    showIcon
                    style={{ marginBottom: 8 }}
                    action={
                      <Space>
                        {alert.actionButton && (
                          <Button
                            type='primary'
                            danger
                            size='small'
                            onClick={() => handleAlertAction(alert)}
                          >
                            {alert.actionButton.text}
                          </Button>
                        )}
                        {alert.dismissible && (
                          <Button
                            type='text'
                            size='small'
                            onClick={() => dismissAlert(alert.id)}
                          >
                            나중에
                          </Button>
                        )}
                      </Space>
                    }
                  />
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* System Health Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={6}>
          <Card
            style={{ textAlign: 'center', height: '180px' }}
            styles={{
              body: {
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              },
            }}
          >
            <TrophyOutlined
              style={{
                fontSize: '36px',
                color:
                  mockSystemHealth.overall.score >= 90
                    ? '#52c41a'
                    : mockSystemHealth.overall.score >= 70
                      ? '#1890ff'
                      : '#fa8c16',
                marginBottom: 12,
              }}
            />
            <Statistic
              title='전체 시스템 건강도'
              value={mockSystemHealth.overall.score}
              suffix='%'
              valueStyle={{
                color:
                  mockSystemHealth.overall.score >= 90
                    ? '#52c41a'
                    : mockSystemHealth.overall.score >= 70
                      ? '#1890ff'
                      : '#fa8c16',
                fontSize: '28px',
              }}
            />
            <Text type='secondary' style={{ fontSize: '12px', marginTop: 8 }}>
              {mockSystemHealth.overall.status === 'excellent'
                ? '매우 양호'
                : mockSystemHealth.overall.status === 'good'
                  ? '양호'
                  : mockSystemHealth.overall.status === 'warning'
                    ? '주의'
                    : '위험'}
            </Text>
          </Card>
        </Col>

        <Col xs={24} lg={18}>
          <Card title='영역별 상태' style={{ height: '180px' }}>
            <Row gutter={[16, 16]}>
              {Object.entries(mockSystemHealth.categories).map(
                ([key, data]) => (
                  <Col xs={12} sm={6} key={key}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          marginBottom: 8,
                        }}
                      >
                        {getCategoryIcon(key as WorkflowTask['category'])}
                        <Text strong style={{ fontSize: '12px' }}>
                          {key === 'deployment'
                            ? '배포'
                            : key === 'security'
                              ? '보안'
                              : key === 'performance'
                                ? '성능'
                                : '인프라'}
                        </Text>
                        {getHealthTrendIcon(data.trend)}
                      </div>
                      <Progress
                        type='circle'
                        size={60}
                        percent={data.score}
                        strokeColor={
                          data.score >= 90
                            ? '#52c41a'
                            : data.score >= 70
                              ? '#1890ff'
                              : '#fa8c16'
                        }
                        format={() => `${data.score}%`}
                      />
                      {data.issues > 0 && (
                        <Badge
                          count={data.issues}
                          size='small'
                          style={{
                            backgroundColor: '#fa8c16',
                            fontSize: '10px',
                          }}
                        />
                      )}
                    </div>
                  </Col>
                )
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Today's Workflow */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FlagOutlined />
                <span>오늘 해야 할 일</span>
                <Badge
                  count={actionRequiredTasks.length}
                  style={{
                    backgroundColor:
                      actionRequiredTasks.length > 0 ? '#ff4d4f' : '#52c41a',
                  }}
                />
              </Space>
            }
            extra={
              <Button
                type='primary'
                icon={<EyeOutlined />}
                size='small'
                aria-label='전체 작업 목록 보기'
              >
                전체보기
              </Button>
            }
          >
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {priorityMatrix.urgent_important.length > 0 && (
                <>
                  <Title
                    level={5}
                    style={{ color: '#ff4d4f', marginBottom: 12 }}
                  >
                    🔥 긴급 & 중요
                  </Title>
                  {priorityMatrix.urgent_important.map(task => (
                    <Card
                      key={task.id}
                      size='small'
                      style={{
                        marginBottom: 12,
                        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                        backgroundColor: task.actionRequired
                          ? '#fff2f0'
                          : undefined,
                      }}
                      styles={{ body: { padding: '12px 16px' } }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            {getCategoryIcon(task.category)}
                            <Text strong style={{ fontSize: '13px' }}>
                              {task.title}
                            </Text>
                            {task.actionRequired && (
                              <Badge status='processing' text='조치필요' />
                            )}
                          </div>
                          <Text
                            type='secondary'
                            style={{
                              fontSize: '11px',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            {task.description}
                          </Text>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Space size='small'>
                              <Tag size='small'>{task.projectName}</Tag>
                              <Text
                                type='secondary'
                                style={{ fontSize: '10px' }}
                              >
                                <UserOutlined /> {task.assignee}
                              </Text>
                            </Space>
                            <Space size='small'>
                              <Text
                                type='secondary'
                                style={{ fontSize: '10px' }}
                              >
                                <ClockCircleOutlined /> {task.estimatedTime}
                              </Text>
                              <Text
                                type='secondary'
                                style={{ fontSize: '10px' }}
                              >
                                📅 {task.dueDate}
                              </Text>
                            </Space>
                          </div>
                        </div>
                        <Button
                          type={task.actionRequired ? 'primary' : 'default'}
                          size='small'
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleTaskAction(task.id)}
                          danger={task.priority === 'urgent'}
                          aria-label={`${task.title} 작업 시작`}
                        >
                          시작
                        </Button>
                      </div>
                    </Card>
                  ))}
                </>
              )}

              {priorityMatrix.important_not_urgent.length > 0 && (
                <>
                  <Title
                    level={5}
                    style={{
                      color: '#1890ff',
                      marginTop: 16,
                      marginBottom: 12,
                    }}
                  >
                    📋 중요 & 계획적
                  </Title>
                  {priorityMatrix.important_not_urgent.slice(0, 3).map(task => (
                    <Card
                      key={task.id}
                      size='small'
                      style={{
                        marginBottom: 8,
                        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                        opacity: 0.8,
                      }}
                      styles={{ body: { padding: '8px 12px' } }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text style={{ fontSize: '12px' }}>{task.title}</Text>
                          <Text
                            type='secondary'
                            style={{ fontSize: '10px', display: 'block' }}
                          >
                            {task.projectName} • {task.dueDate}
                          </Text>
                        </div>
                        <Button
                          size='small'
                          type='text'
                          onClick={() => handleTaskAction(task.id)}
                          aria-label={`${task.title} 작업 예약`}
                        >
                          예약
                        </Button>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>오늘의 성과</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[8, 16]}>
              <Col span={12}>
                <Statistic
                  title='완료된 배포'
                  value={mockUserWorkflowStats.todayStats.deploysCompleted}
                  prefix={<RocketOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title='해결된 이슈'
                  value={mockUserWorkflowStats.todayStats.issuesResolved}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title='보안 스캔'
                  value={mockUserWorkflowStats.todayStats.securityScansRun}
                  prefix={<SecurityScanOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title='백업 성공'
                  value={mockUserWorkflowStats.todayStats.backupsSuccessful}
                  prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>

          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>주간 목표</span>
              </Space>
            }
          >
            <Space direction='vertical' style={{ width: '100%' }}>
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: '12px' }}>배포 완료</Text>
                  <Text style={{ fontSize: '12px' }}>
                    {mockUserWorkflowStats.weeklyGoals.deployments.completed}/
                    {mockUserWorkflowStats.weeklyGoals.deployments.target}
                  </Text>
                </div>
                <Progress
                  percent={Math.round(
                    (mockUserWorkflowStats.weeklyGoals.deployments.completed /
                      mockUserWorkflowStats.weeklyGoals.deployments.target) *
                      100
                  )}
                  size='small'
                  strokeColor='#1890ff'
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: '12px' }}>보안 이슈 해결</Text>
                  <Text style={{ fontSize: '12px' }}>
                    {mockUserWorkflowStats.weeklyGoals.securityIssues.resolved}/
                    {mockUserWorkflowStats.weeklyGoals.securityIssues.target}
                  </Text>
                </div>
                <Progress
                  percent={Math.round(
                    (mockUserWorkflowStats.weeklyGoals.securityIssues.resolved /
                      mockUserWorkflowStats.weeklyGoals.securityIssues.target) *
                      100
                  )}
                  size='small'
                  strokeColor='#fa8c16'
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: '12px' }}>시스템 가용성</Text>
                  <Text style={{ fontSize: '12px' }}>
                    {mockUserWorkflowStats.weeklyGoals.systemUptime.current}%
                  </Text>
                </div>
                <Progress
                  percent={
                    mockUserWorkflowStats.weeklyGoals.systemUptime.current
                  }
                  size='small'
                  strokeColor='#52c41a'
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Recommendations */}
      <Row>
        <Col span={24}>
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>오늘의 권장사항</span>
              </Space>
            }
          >
            <List
              dataSource={todaySummary.recommendations}
              renderItem={(recommendation, index) => (
                <List.Item>
                  <Space>
                    <Avatar size='small' style={{ backgroundColor: '#1890ff' }}>
                      {index + 1}
                    </Avatar>
                    <Text>{recommendation}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkflowDashboard;
