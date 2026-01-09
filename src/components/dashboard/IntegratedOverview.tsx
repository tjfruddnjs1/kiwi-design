import React, { useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Tag,
  Badge,
  Alert,
  Space,
  Button,
  Modal,
  Tabs,
  Collapse,
} from 'antd';
import {
  DashboardOutlined,
  BuildOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  EyeOutlined,
  FileTextOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FlagOutlined,
  SecurityScanOutlined,
  MonitorOutlined,
  ToolOutlined,
  FireOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  PlayCircleOutlined,
  UserOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  mockIntegratedData,
  getActiveBuilds,
  getCriticalSecurityAlerts,
  getHighSecurityAlerts,
  getBackupIssues,
  BuildDeployStatus,
} from '../../data/mockIntegratedData';
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
const { Panel } = Collapse;

// Design System Constants
const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const COLORS = {
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#ff4d4f',
  info: '#1890ff',
  neutral: '#d9d9d9',
  primary: '#1890ff',
  secondary: '#8c8c8c',
};

const IntegratedOverview: React.FC = () => {
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedBuildLogs, setSelectedBuildLogs] = useState<string>('');
  const [selectedBuildName, setSelectedBuildName] = useState<string>('');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'overview',
    'workflow',
  ]);

  // Computed data
  const activeBuilds = useMemo(() => getActiveBuilds(), []);
  const criticalAlerts = useMemo(() => getCriticalSecurityAlerts(), []);
  const highAlerts = useMemo(() => getHighSecurityAlerts(), []);
  const backupIssues = useMemo(() => getBackupIssues(), []);

  // Daily Workflow data
  const priorityMatrix = useMemo(() => generatePriorityMatrix(), []);
  const todaySummary = useMemo(() => getTodayWorkflowSummary(), []);
  const actionRequiredTasks = useMemo(() => getActionRequiredTasks(), []);
  const criticalWorkflowAlerts = useMemo(
    () =>
      getCriticalAlerts().filter(alert => !dismissedAlerts.includes(alert.id)),
    [dismissedAlerts]
  );

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
      case 'healthy':
      case 'met':
        return COLORS.success;
      case 'building':
      case 'deploying':
      case 'running':
      case 'scanning':
        return COLORS.info;
      case 'warning':
      case 'at-risk':
        return COLORS.warning;
      case 'failed':
      case 'critical':
      case 'breached':
        return COLORS.error;
      default:
        return COLORS.neutral;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return COLORS.error;
      case 'high':
        return '#fa541c';
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.success;
      default:
        return COLORS.neutral;
    }
  };

  const getCategoryIcon = (category: WorkflowTask['category']) => {
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
  };

  const getHealthTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined style={{ color: COLORS.success }} />;
      case 'down':
        return <ArrowDownOutlined style={{ color: COLORS.error }} />;
      case 'stable':
        return <MinusOutlined style={{ color: COLORS.info }} />;
      default:
        return <MinusOutlined style={{ color: COLORS.neutral }} />;
    }
  };

  const handleTaskAction = (_taskId: string) => {
    // TODO: Implement actual task action logic
  };

  const handleAlertAction = (alert: WorkflowAlert) => {
    if (alert.actionButton) {
      // TODO: Implement actual alert action logic
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const showBuildLogs = (build: BuildDeployStatus) => {
    setSelectedBuildName(build.projectName);
    setSelectedBuildLogs(
      build.logs ||
        `[${new Date().toLocaleTimeString()}] ${build.projectName} 빌드 로그:\n\n` +
          `빌드 ID: ${build.buildId}\n` +
          `환경: ${build.environment}\n` +
          `브랜치: ${build.branch}\n` +
          `커밋: ${build.commit}\n` +
          `빌드 번호: ${build.buildNumber}\n` +
          `상태: ${build.status}\n` +
          `진행률: ${build.progress}%\n` +
          `소요 시간: ${build.duration}\n\n` +
          `[상세 로그]\n` +
          `- 의존성 설치 완료\n` +
          `- 코드 컴파일 진행 중...\n` +
          `- 테스트 실행 중...\n` +
          `- 아티팩트 생성 중...\n\n` +
          `실제 환경에서는 실시간 빌드 로그가 여기에 표시됩니다.`
    );
    setLogModalVisible(true);
  };

  // Section Components for better organization
  const OverviewSection = () => (
    <Card
      style={{
        marginBottom: SPACING.md,
        borderRadius: 12,
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ marginBottom: SPACING.md }}>
        <Title
          level={3}
          style={{ margin: 0, marginBottom: SPACING.xs, color: '#262626' }}
        >
          <DashboardOutlined
            style={{ marginRight: SPACING.xs, color: COLORS.primary }}
          />
          시스템 전체 현황
        </Title>
        <Paragraph type='secondary' style={{ margin: 0, fontSize: '14px' }}>
          인프라 전반의 핵심 지표와 상태를 한눈에 확인하세요
        </Paragraph>
      </div>

      <Row gutter={[SPACING.sm, SPACING.sm]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size='small'
            style={{
              textAlign: 'center',
              borderRadius: 8,
              border: `2px solid ${COLORS.success}20`,
              backgroundColor: `${COLORS.success}05`,
            }}
          >
            <TrophyOutlined
              style={{
                fontSize: '32px',
                color: COLORS.success,
                marginBottom: SPACING.xs,
                display: 'block',
              }}
            />
            <Statistic
              title='전체 시스템 건강도'
              value={mockIntegratedData.summary.overallHealth}
              suffix='%'
              valueStyle={{
                color: COLORS.success,
                fontSize: '24px',
                fontWeight: 600,
              }}
            />
            <Text type='secondary' style={{ fontSize: '12px' }}>
              매우 양호한 상태입니다
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size='small'
            style={{
              textAlign: 'center',
              borderRadius: 8,
              border: `2px solid ${getStatusColor(activeBuilds.length > 0 ? 'building' : 'success')}20`,
              backgroundColor: `${getStatusColor(activeBuilds.length > 0 ? 'building' : 'success')}05`,
            }}
          >
            <BuildOutlined
              style={{
                fontSize: '32px',
                color: getStatusColor(
                  activeBuilds.length > 0 ? 'building' : 'success'
                ),
                marginBottom: SPACING.xs,
                display: 'block',
              }}
            />
            <Statistic
              title='활성 빌드'
              value={activeBuilds.length}
              suffix={`/${mockIntegratedData.builds.length}`}
              valueStyle={{
                color: getStatusColor(
                  activeBuilds.length > 0 ? 'building' : 'success'
                ),
                fontSize: '24px',
                fontWeight: 600,
              }}
            />
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {activeBuilds.length > 0 ? '빌드 진행 중' : '모든 빌드 완료'}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size='small'
            style={{
              textAlign: 'center',
              borderRadius: 8,
              border: `2px solid ${getSeverityColor(criticalAlerts.length > 0 ? 'critical' : 'low')}20`,
              backgroundColor: `${getSeverityColor(criticalAlerts.length > 0 ? 'critical' : 'low')}05`,
            }}
          >
            <SafetyOutlined
              style={{
                fontSize: '32px',
                color: getSeverityColor(
                  criticalAlerts.length > 0 ? 'critical' : 'low'
                ),
                marginBottom: SPACING.xs,
                display: 'block',
              }}
            />
            <Statistic
              title='보안 이슈'
              value={criticalAlerts.length + highAlerts.length}
              suffix={`/${mockIntegratedData.securityAlerts.filter(a => a.status !== 'resolved').length}`}
              valueStyle={{
                color: getSeverityColor(
                  criticalAlerts.length > 0 ? 'critical' : 'low'
                ),
                fontSize: '24px',
                fontWeight: 600,
              }}
            />
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {criticalAlerts.length > 0 ? '주의 필요' : '보안 상태 양호'}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size='small'
            style={{
              textAlign: 'center',
              borderRadius: 8,
              border: `2px solid ${getStatusColor(backupIssues.length > 0 ? 'warning' : 'success')}20`,
              backgroundColor: `${getStatusColor(backupIssues.length > 0 ? 'warning' : 'success')}05`,
            }}
          >
            <DatabaseOutlined
              style={{
                fontSize: '32px',
                color: getStatusColor(
                  backupIssues.length > 0 ? 'warning' : 'success'
                ),
                marginBottom: SPACING.xs,
                display: 'block',
              }}
            />
            <Statistic
              title='백업 상태'
              value={mockIntegratedData.backups.filter(b => b.success).length}
              suffix={`/${mockIntegratedData.backups.length}`}
              valueStyle={{
                color: getStatusColor(
                  backupIssues.length > 0 ? 'warning' : 'success'
                ),
                fontSize: '24px',
                fontWeight: 600,
              }}
            />
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {backupIssues.length > 0 ? '일부 이슈 있음' : '모든 백업 정상'}
            </Text>
          </Card>
        </Col>
      </Row>
    </Card>
  );

  const CriticalAlertsSection = () => {
    if (criticalWorkflowAlerts.length === 0) return null;

    return (
      <Alert
        message={
          <Space>
            <FireOutlined style={{ color: COLORS.error }} />
            <Text strong style={{ color: COLORS.error }}>
              즉시 조치가 필요한 항목이 {criticalWorkflowAlerts.length}개
              있습니다
            </Text>
          </Space>
        }
        description={
          <div style={{ marginTop: SPACING.sm }}>
            {criticalWorkflowAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  marginBottom: SPACING.xs,
                  padding: SPACING.sm,
                  backgroundColor: 'rgba(255, 77, 79, 0.04)',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 77, 79, 0.15)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: '13px' }}>
                      {alert.title}
                    </Text>
                    <Text
                      type='secondary'
                      style={{ fontSize: '12px', display: 'block' }}
                    >
                      {alert.projectName}: {alert.message}
                    </Text>
                  </div>
                  <Space>
                    {alert.actionButton && (
                      <Button
                        type='primary'
                        danger
                        size='small'
                        onClick={() => handleAlertAction(alert)}
                        aria-label={`${alert.title} 문제 해결`}
                      >
                        {alert.actionButton.text}
                      </Button>
                    )}
                    {alert.dismissible && (
                      <Button
                        type='text'
                        size='small'
                        onClick={() => dismissAlert(alert.id)}
                        aria-label={`${alert.title} 알림 연기`}
                      >
                        나중에
                      </Button>
                    )}
                  </Space>
                </div>
              </div>
            ))}
          </div>
        }
        type='error'
        style={{
          marginBottom: SPACING.md,
          borderRadius: 8,
        }}
        showIcon
      />
    );
  };

  const WorkflowSection = () => (
    <Card
      style={{
        marginBottom: SPACING.md,
        borderRadius: 12,
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ marginBottom: SPACING.md }}>
        <Title
          level={3}
          style={{ margin: 0, marginBottom: SPACING.xs, color: '#262626' }}
        >
          <CalendarOutlined
            style={{ marginRight: SPACING.xs, color: COLORS.primary }}
          />
          오늘의 운영 현황
        </Title>
        <Paragraph type='secondary' style={{ margin: 0, fontSize: '14px' }}>
          {todaySummary.date} • 우선순위 기반 워크플로우 관리
        </Paragraph>
      </div>

      {/* System Health Cards */}
      <Row
        gutter={[SPACING.sm, SPACING.sm]}
        style={{ marginBottom: SPACING.md }}
      >
        <Col xs={24} lg={8}>
          <Card
            size='small'
            title='시스템 건강도'
            style={{
              textAlign: 'center',
              height: '180px',
              borderRadius: 8,
            }}
          >
            <TrophyOutlined
              style={{
                fontSize: '28px',
                color:
                  mockSystemHealth.overall.score >= 90
                    ? COLORS.success
                    : mockSystemHealth.overall.score >= 70
                      ? COLORS.info
                      : COLORS.warning,
                marginBottom: SPACING.sm,
                display: 'block',
              }}
            />
            <Statistic
              value={mockSystemHealth.overall.score}
              suffix='%'
              valueStyle={{
                color:
                  mockSystemHealth.overall.score >= 90
                    ? COLORS.success
                    : mockSystemHealth.overall.score >= 70
                      ? COLORS.info
                      : COLORS.warning,
                fontSize: '28px',
                fontWeight: 600,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            size='small'
            title='영역별 상태'
            style={{
              height: '180px',
              borderRadius: 8,
            }}
          >
            <Row gutter={[SPACING.sm, SPACING.sm]}>
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
                          marginBottom: SPACING.xs,
                        }}
                      >
                        {getCategoryIcon(key as WorkflowTask['category'])}
                        <Text strong style={{ fontSize: '11px' }}>
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
                        size={50}
                        percent={data.score}
                        strokeColor={
                          data.score >= 90
                            ? COLORS.success
                            : data.score >= 70
                              ? COLORS.info
                              : COLORS.warning
                        }
                        format={() => `${data.score}%`}
                      />
                      {data.issues > 0 && (
                        <Badge
                          count={data.issues}
                          size='small'
                          style={{
                            backgroundColor: COLORS.warning,
                            fontSize: '8px',
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

      {/* Today's Tasks and Performance */}
      <Row gutter={[SPACING.sm, SPACING.sm]}>
        <Col xs={24} lg={14}>
          <Card
            size='small'
            title={
              <Space>
                <FlagOutlined />
                <span>오늘 해야 할 일</span>
                <Badge
                  count={actionRequiredTasks.length}
                  style={{
                    backgroundColor:
                      actionRequiredTasks.length > 0
                        ? COLORS.error
                        : COLORS.success,
                  }}
                />
              </Space>
            }
            extra={
              <Button
                type='primary'
                icon={<EyeOutlined />}
                size='small'
                aria-label='모든 작업 보기'
              >
                전체보기
              </Button>
            }
            style={{
              height: '320px',
              borderRadius: 8,
            }}
          >
            <div style={{ height: '200px', overflowY: 'auto', padding: '4px' }}>
              {priorityMatrix.urgent_important.length > 0 && (
                <>
                  <div
                    style={{
                      marginBottom: SPACING.sm,
                      padding: SPACING.xs,
                      backgroundColor: `${COLORS.error}08`,
                      borderRadius: 6,
                      borderLeft: `4px solid ${COLORS.error}`,
                    }}
                  >
                    <Text
                      strong
                      style={{ color: COLORS.error, fontSize: '13px' }}
                    >
                      🔥 긴급 & 중요
                    </Text>
                  </div>
                  {priorityMatrix.urgent_important.slice(0, 3).map(task => (
                    <Card
                      key={task.id}
                      size='small'
                      style={{
                        marginBottom: SPACING.xs,
                        borderRadius: 6,
                        backgroundColor: task.actionRequired
                          ? `${COLORS.error}05`
                          : '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              marginBottom: 4,
                            }}
                          >
                            {getCategoryIcon(task.category)}
                            <Text strong style={{ fontSize: '12px' }}>
                              {task.title}
                            </Text>
                            {task.actionRequired && (
                              <Badge status='processing' text='조치필요' />
                            )}
                          </div>
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
                            <Text type='secondary' style={{ fontSize: '10px' }}>
                              <ClockCircleOutlined /> {task.estimatedTime}
                            </Text>
                          </div>
                        </div>
                        <Button
                          type={task.actionRequired ? 'primary' : 'default'}
                          size='small'
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleTaskAction(task.id)}
                          danger={task.priority === 'urgent'}
                          style={{ marginLeft: SPACING.xs }}
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
                  <div
                    style={{
                      marginTop: SPACING.sm,
                      marginBottom: SPACING.sm,
                      padding: SPACING.xs,
                      backgroundColor: `${COLORS.info}08`,
                      borderRadius: 6,
                      borderLeft: `4px solid ${COLORS.info}`,
                    }}
                  >
                    <Text
                      strong
                      style={{ color: COLORS.info, fontSize: '13px' }}
                    >
                      📋 중요 & 계획적
                    </Text>
                  </div>
                  {priorityMatrix.important_not_urgent.slice(0, 2).map(task => (
                    <Card
                      key={task.id}
                      size='small'
                      style={{
                        marginBottom: 6,
                        borderRadius: 6,
                        backgroundColor: '#fafafa',
                        opacity: 0.9,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text style={{ fontSize: '11px' }}>{task.title}</Text>
                          <Text
                            type='secondary'
                            style={{ fontSize: '9px', display: 'block' }}
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
          <Row gutter={[SPACING.sm, SPACING.sm]}>
            <Col span={24}>
              <Card
                size='small'
                title={
                  <Space>
                    <TrophyOutlined />
                    <span>오늘의 성과</span>
                  </Space>
                }
                style={{
                  marginBottom: SPACING.sm,
                  borderRadius: 8,
                }}
              >
                <Row gutter={[SPACING.xs, SPACING.sm]}>
                  <Col span={12}>
                    <Statistic
                      title='완료된 배포'
                      value={mockUserWorkflowStats.todayStats.deploysCompleted}
                      prefix={<RocketOutlined style={{ color: COLORS.info }} />}
                      valueStyle={{
                        color: COLORS.info,
                        fontSize: '18px',
                        fontWeight: 600,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title='해결된 이슈'
                      value={mockUserWorkflowStats.todayStats.issuesResolved}
                      prefix={
                        <CheckCircleOutlined
                          style={{ color: COLORS.success }}
                        />
                      }
                      valueStyle={{
                        color: COLORS.success,
                        fontSize: '18px',
                        fontWeight: 600,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title='보안 스캔'
                      value={mockUserWorkflowStats.todayStats.securityScansRun}
                      prefix={
                        <SecurityScanOutlined
                          style={{ color: COLORS.warning }}
                        />
                      }
                      valueStyle={{
                        color: COLORS.warning,
                        fontSize: '18px',
                        fontWeight: 600,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title='백업 성공'
                      value={mockUserWorkflowStats.todayStats.backupsSuccessful}
                      prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
                      valueStyle={{
                        color: '#722ed1',
                        fontSize: '18px',
                        fontWeight: 600,
                      }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={24}>
              <Card
                size='small'
                title={
                  <Space>
                    <CalendarOutlined />
                    <span>주간 목표</span>
                  </Space>
                }
                style={{ borderRadius: 8 }}
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
                        {
                          mockUserWorkflowStats.weeklyGoals.deployments
                            .completed
                        }
                        /{mockUserWorkflowStats.weeklyGoals.deployments.target}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round(
                        (mockUserWorkflowStats.weeklyGoals.deployments
                          .completed /
                          mockUserWorkflowStats.weeklyGoals.deployments
                            .target) *
                          100
                      )}
                      size='small'
                      strokeColor={COLORS.info}
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
                        {
                          mockUserWorkflowStats.weeklyGoals.securityIssues
                            .resolved
                        }
                        /
                        {
                          mockUserWorkflowStats.weeklyGoals.securityIssues
                            .target
                        }
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round(
                        (mockUserWorkflowStats.weeklyGoals.securityIssues
                          .resolved /
                          mockUserWorkflowStats.weeklyGoals.securityIssues
                            .target) *
                          100
                      )}
                      size='small'
                      strokeColor={COLORS.warning}
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
                        {mockUserWorkflowStats.weeklyGoals.systemUptime.current}
                        %
                      </Text>
                    </div>
                    <Progress
                      percent={
                        mockUserWorkflowStats.weeklyGoals.systemUptime.current
                      }
                      size='small'
                      strokeColor={COLORS.success}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );

  const DetailedSections = () => (
    <Collapse
      activeKey={expandedSections}
      onChange={setExpandedSections as any}
      style={{
        marginBottom: SPACING.md,
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        backgroundColor: 'white',
      }}
      expandIcon={({ isActive }) =>
        isActive ? <UpOutlined /> : <DownOutlined />
      }
    >
      <Panel
        header={
          <Space>
            <BuildOutlined style={{ color: COLORS.info }} />
            <Text strong>빌드/배포 파이프라인</Text>
            <Badge
              count={activeBuilds.length}
              style={{ backgroundColor: COLORS.info }}
            />
          </Space>
        }
        key='builds'
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {mockIntegratedData.builds.map(build => (
            <Card
              key={build.buildId}
              size='small'
              style={{
                marginBottom: SPACING.sm,
                borderRadius: 8,
                border: `1px solid ${getStatusColor(build.status)}30`,
                backgroundColor: `${getStatusColor(build.status)}05`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: SPACING.xs,
                }}
              >
                <div>
                  <Text strong style={{ fontSize: '14px' }}>
                    {build.projectName}
                  </Text>
                  <Tag
                    color={
                      build.environment === 'production'
                        ? 'red'
                        : build.environment === 'staging'
                          ? 'orange'
                          : 'blue'
                    }
                    size='small'
                    style={{ marginLeft: SPACING.xs }}
                  >
                    {build.environment}
                  </Tag>
                </div>
                <Space>
                  <Badge
                    status={
                      build.status === 'success'
                        ? 'success'
                        : build.status === 'failed'
                          ? 'error'
                          : build.status === 'building' ||
                              build.status === 'deploying'
                            ? 'processing'
                            : 'default'
                    }
                    text={
                      build.status === 'building'
                        ? '빌드 중'
                        : build.status === 'deploying'
                          ? '배포 중'
                          : build.status === 'success'
                            ? '성공'
                            : build.status === 'failed'
                              ? '실패'
                              : '대기'
                    }
                  />
                  <Button
                    type='text'
                    size='small'
                    icon={<FileTextOutlined />}
                    onClick={() => showBuildLogs(build)}
                    aria-label={`${build.projectName} 빌드 로그 보기`}
                  >
                    로그
                  </Button>
                </Space>
              </div>

              {(build.status === 'building' ||
                build.status === 'deploying') && (
                <Progress
                  percent={build.progress}
                  size='small'
                  status='active'
                  strokeColor={getStatusColor(build.status)}
                  style={{ marginBottom: SPACING.xs }}
                />
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: COLORS.secondary,
                }}
              >
                <Text type='secondary'>
                  #{build.buildNumber} • {build.branch}@{build.commit}
                </Text>
                <Text type='secondary'>
                  {build.duration} • {build.artifacts.size}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel
        header={
          <Space>
            <SafetyOutlined style={{ color: COLORS.warning }} />
            <Text strong>보안 스캔 & 알림</Text>
            <Badge
              count={criticalAlerts.length}
              style={{ backgroundColor: COLORS.error }}
            />
          </Space>
        }
        key='security'
      >
        <Tabs
          size='small'
          items={[
            {
              key: 'alerts',
              label: '보안 알림',
              children: (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {mockIntegratedData.securityAlerts
                    .filter(alert => alert.status !== 'resolved')
                    .map(alert => (
                      <Card
                        key={alert.id}
                        size='small'
                        style={{
                          marginBottom: SPACING.sm,
                          borderRadius: 8,
                          border: `1px solid ${getSeverityColor(alert.severity)}30`,
                          backgroundColor: `${getSeverityColor(alert.severity)}05`,
                        }}
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
                                gap: SPACING.xs,
                                marginBottom: 4,
                              }}
                            >
                              <Tag
                                color={getSeverityColor(alert.severity)}
                                size='small'
                              >
                                {alert.severity.toUpperCase()}
                              </Tag>
                              <Text strong style={{ fontSize: '13px' }}>
                                {alert.title}
                              </Text>
                            </div>
                            <Text
                              type='secondary'
                              style={{
                                fontSize: '12px',
                                display: 'block',
                                marginBottom: 4,
                              }}
                            >
                              {alert.description}
                            </Text>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Text
                                type='secondary'
                                style={{ fontSize: '11px' }}
                              >
                                {alert.projectName}
                              </Text>
                              <Text
                                type='secondary'
                                style={{ fontSize: '11px' }}
                              >
                                {alert.timestamp}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              ),
            },
            {
              key: 'sast',
              label: 'SAST (정적)',
              children: (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {mockIntegratedData.sastResults.map(result => (
                    <Card
                      key={result.scanId}
                      size='small'
                      style={{
                        marginBottom: SPACING.sm,
                        borderRadius: 8,
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: SPACING.xs,
                        }}
                      >
                        <Text strong style={{ fontSize: '13px' }}>
                          {result.projectName}
                        </Text>
                        <Badge
                          status={
                            result.status === 'completed'
                              ? 'success'
                              : result.status === 'scanning'
                                ? 'processing'
                                : 'error'
                          }
                          text={
                            result.status === 'completed'
                              ? '완료'
                              : result.status === 'scanning'
                                ? '스캔중'
                                : '실패'
                          }
                        />
                      </div>
                      {result.status === 'completed' && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              marginBottom: 4,
                            }}
                          >
                            <Text type='secondary'>
                              코드 품질: {result.codeQuality.score}점
                            </Text>
                            <Text type='secondary'>
                              커버리지: {result.codeQuality.coverage}%
                            </Text>
                          </div>
                          <Space wrap>
                            {result.vulnerabilities.critical > 0 && (
                              <Tag color='red' size='small'>
                                Critical: {result.vulnerabilities.critical}
                              </Tag>
                            )}
                            {result.vulnerabilities.high > 0 && (
                              <Tag color='orange' size='small'>
                                High: {result.vulnerabilities.high}
                              </Tag>
                            )}
                            {result.vulnerabilities.medium > 0 && (
                              <Tag color='gold' size='small'>
                                Medium: {result.vulnerabilities.medium}
                              </Tag>
                            )}
                          </Space>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'dast',
              label: 'DAST (동적)',
              children: (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {mockIntegratedData.dastResults.map(result => (
                    <Card
                      key={result.scanId}
                      size='small'
                      style={{
                        marginBottom: SPACING.sm,
                        borderRadius: 8,
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: SPACING.xs,
                        }}
                      >
                        <Text strong style={{ fontSize: '13px' }}>
                          {result.projectName}
                        </Text>
                        <Badge
                          status={
                            result.status === 'completed'
                              ? 'success'
                              : result.status === 'scanning'
                                ? 'processing'
                                : 'error'
                          }
                          text={
                            result.status === 'completed'
                              ? '완료'
                              : result.status === 'scanning'
                                ? '스캔중'
                                : '실패'
                          }
                        />
                      </div>
                      {result.status === 'completed' && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              marginBottom: 4,
                            }}
                          >
                            <Text type='secondary'>
                              엔드포인트: {result.endpoints.tested}
                            </Text>
                            <Text type='secondary'>
                              취약점: {result.endpoints.vulnerable}
                            </Text>
                          </div>
                          <Space wrap>
                            {result.vulnerabilities.critical > 0 && (
                              <Tag color='red' size='small'>
                                Critical: {result.vulnerabilities.critical}
                              </Tag>
                            )}
                            {result.vulnerabilities.high > 0 && (
                              <Tag color='orange' size='small'>
                                High: {result.vulnerabilities.high}
                              </Tag>
                            )}
                            {result.vulnerabilities.medium > 0 && (
                              <Tag color='gold' size='small'>
                                Medium: {result.vulnerabilities.medium}
                              </Tag>
                            )}
                          </Space>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Panel
        header={
          <Space>
            <DatabaseOutlined style={{ color: '#13c2c2' }} />
            <Text strong>백업 상태</Text>
            <Tag color={backupIssues.length > 0 ? 'orange' : 'green'}>
              {backupIssues.length > 0
                ? `${backupIssues.length}개 이슈`
                : '정상'}
            </Tag>
          </Space>
        }
        key='backup'
      >
        <Row gutter={[SPACING.sm, SPACING.sm]}>
          {mockIntegratedData.backups.map(backup => (
            <Col xs={24} sm={12} lg={6} key={backup.backupId}>
              <Card
                size='small'
                style={{
                  borderRadius: 8,
                  border: `2px solid ${getStatusColor(backup.status)}30`,
                  backgroundColor: backup.success
                    ? `${COLORS.success}05`
                    : `${COLORS.warning}05`,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <Badge
                    status={
                      backup.status === 'completed'
                        ? 'success'
                        : backup.status === 'running'
                          ? 'processing'
                          : backup.status === 'failed'
                            ? 'error'
                            : 'default'
                    }
                    text={
                      backup.status === 'completed'
                        ? '완료'
                        : backup.status === 'running'
                          ? '진행중'
                          : backup.status === 'failed'
                            ? '실패'
                            : '예약됨'
                    }
                    style={{ marginBottom: SPACING.xs }}
                  />
                  <Text
                    strong
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      marginBottom: 4,
                    }}
                  >
                    {backup.projectName}
                  </Text>
                  <Tag
                    color='blue'
                    size='small'
                    style={{ marginBottom: SPACING.xs }}
                  >
                    {backup.type.toUpperCase()}
                  </Tag>
                  <div style={{ fontSize: '11px', color: COLORS.secondary }}>
                    <div>크기: {backup.size}</div>
                    <div>마지막: {backup.lastBackup}</div>
                    <div>다음: {backup.nextBackup}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Panel>

      <Panel
        header={
          <Space>
            <LineChartOutlined style={{ color: COLORS.success }} />
            <Text strong>성능 메트릭</Text>
          </Space>
        }
        key='performance'
      >
        <Row gutter={[SPACING.sm, SPACING.sm]}>
          {mockIntegratedData.performanceMetrics.map(metric => (
            <Col
              xs={24}
              sm={12}
              lg={8}
              key={`${metric.projectName}-${metric.sla.status}`}
            >
              <Card
                size='small'
                style={{
                  borderRadius: 8,
                  border: `1px solid ${getStatusColor(metric.sla.status)}30`,
                  backgroundColor: `${getStatusColor(metric.sla.status)}05`,
                }}
              >
                <div style={{ marginBottom: SPACING.sm }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text strong style={{ fontSize: '13px' }}>
                      {metric.projectName}
                    </Text>
                    <Tag color={getStatusColor(metric.sla.status)} size='small'>
                      {metric.sla.status === 'met'
                        ? 'SLA 준수'
                        : metric.sla.status === 'at-risk'
                          ? 'SLA 위험'
                          : 'SLA 위반'}
                    </Tag>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      marginBottom: 4,
                    }}
                  >
                    <Text type='secondary'>
                      가용성: {metric.metrics.availability}%
                    </Text>
                    <Text type='secondary'>
                      응답시간: {metric.metrics.responseTime.avg}ms
                    </Text>
                  </div>
                  <Progress
                    percent={metric.metrics.availability}
                    size='small'
                    strokeColor={getStatusColor(metric.sla.status)}
                    showInfo={false}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Panel>
    </Collapse>
  );

  return (
    <div style={{ padding: `0 ${SPACING.sm}px` }}>
      {/* Page Header */}
      <div style={{ marginBottom: SPACING.lg }}>
        <Title
          level={2}
          style={{ margin: 0, marginBottom: SPACING.xs, color: '#262626' }}
        >
          <DashboardOutlined
            style={{ marginRight: SPACING.sm, color: COLORS.primary }}
          />
          통합 대시보드
        </Title>
        <Paragraph type='secondary' style={{ margin: 0, fontSize: '16px' }}>
          시스템 전반의 상태를 체계적으로 모니터링하고 관리하세요
        </Paragraph>
      </div>

      {/* Critical Alerts */}
      <CriticalAlertsSection />

      {/* Overview Cards */}
      <OverviewSection />

      {/* Workflow Section */}
      <WorkflowSection />

      {/* Detailed Sections (Collapsible) */}
      <DetailedSections />

      {/* Build Log Modal */}
      <Modal
        title={`${selectedBuildName} 빌드 로그`}
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
            padding: SPACING.sm,
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-line',
          }}
        >
          {selectedBuildLogs}
        </div>
      </Modal>
    </div>
  );
};

export default IntegratedOverview;
