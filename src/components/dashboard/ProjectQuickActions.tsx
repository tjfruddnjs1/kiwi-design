import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Typography,
  Row,
  Col,
  Badge,
  Tag,
  Tooltip,
  Progress,
  Modal,
} from 'antd';
import {
  RocketOutlined,
  BugOutlined,
  SafetyOutlined,
  BuildOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  FolderOpenOutlined,
  CheckSquareOutlined,
  SettingOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  QuickAction,
  getQuickActionsByProjectId,
  getProjectById,
} from '../../data/mockProjects';

const { Title, Text } = Typography;

interface ProjectQuickActionsProps {
  projectId: string;
}

interface ActionExecutionStatus {
  actionId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
  message: string;
  startTime?: Date;
}

const ProjectQuickActions: React.FC<ProjectQuickActionsProps> = ({
  projectId,
}) => {
  const [executionStatuses, setExecutionStatuses] = useState<
    Record<string, ActionExecutionStatus>
  >({});
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedActionLogs, setSelectedActionLogs] = useState<string>('');
  const [selectedActionName, setSelectedActionName] = useState<string>('');

  // Get project and actions data
  const project = useMemo(() => getProjectById(projectId), [projectId]);
  const quickActions = useMemo(
    () => getQuickActionsByProjectId(projectId),
    [projectId]
  );

  // Icon mapping
  const getActionIcon = useCallback(
    (iconName: string, status: QuickAction['status']) => {
      const iconProps = {
        style: { fontSize: '16px' },
        spin: status === 'running',
      };

      switch (iconName) {
        case 'rocket':
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <RocketOutlined {...iconProps} />
          );
        case 'bug':
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <BugOutlined {...iconProps} />
          );
        case 'shield':
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <SafetyOutlined {...iconProps} />
          );
        case 'build':
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <BuildOutlined {...iconProps} />
          );
        case 'wrench':
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <SettingOutlined {...iconProps} />
          );
        case 'file-text':
          return <FileTextOutlined {...iconProps} />;
        case 'check-circle':
          return <CheckCircleOutlined {...iconProps} />;
        case 'database':
          return <DatabaseOutlined {...iconProps} />;
        case 'activity':
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <LineChartOutlined {...iconProps} />
          );
        case 'package':
          return <AppstoreOutlined {...iconProps} />;
        case 'archive':
          return <FolderOpenOutlined {...iconProps} />;
        case 'check-square':
          return <CheckSquareOutlined {...iconProps} />;
        default:
          return status === 'running' ? (
            <LoadingOutlined {...iconProps} />
          ) : (
            <ThunderboltOutlined {...iconProps} />
          );
      }
    },
    []
  );

  // Category color mapping
  const getCategoryColor = useCallback((category: QuickAction['category']) => {
    switch (category) {
      case 'deployment':
        return '#1890ff';
      case 'testing':
        return '#52c41a';
      case 'security':
        return '#fa8c16';
      case 'build':
        return '#722ed1';
      case 'maintenance':
        return '#13c2c2';
      default:
        return '#d9d9d9';
    }
  }, []);

  // Status color mapping
  const getStatusColor = useCallback((status: QuickAction['status']) => {
    switch (status) {
      case 'running':
        return '#1890ff';
      case 'success':
        return '#52c41a';
      case 'error':
        return '#f5222d';
      case 'idle':
        return '#d9d9d9';
      default:
        return '#d9d9d9';
    }
  }, []);

  // Execute action with simulation
  const executeAction = useCallback(
    async (action: QuickAction) => {
      if (
        !action.isAvailable ||
        executionStatuses[action.id]?.status === 'running'
      ) {
        return;
      }

      // Set initial execution status
      setExecutionStatuses(prev => ({
        ...prev,
        [action.id]: {
          actionId: action.id,
          status: 'running',
          progress: 0,
          message: `${action.name} 실행 중...`,
          startTime: new Date(),
        },
      }));

      // Simulate execution with progress updates
      const updateInterval = setInterval(() => {
        setExecutionStatuses(prev => {
          const current = prev[action.id];
          if (
            current &&
            current.status === 'running' &&
            current.progress < 90
          ) {
            return {
              ...prev,
              [action.id]: {
                ...current,
                progress: current.progress + Math.random() * 15,
                message: `${action.name} 진행 중... ${Math.round(current.progress)}%`,
              },
            };
          }
          return prev;
        });
      }, 800);

      // Simulate completion after random time
      const executionTime = Math.random() * 3000 + 2000; // 2-5 seconds
      setTimeout(() => {
        clearInterval(updateInterval);

        const isSuccess = Math.random() > 0.2; // 80% success rate

        setExecutionStatuses(prev => ({
          ...prev,
          [action.id]: {
            actionId: action.id,
            status: isSuccess ? 'success' : 'error',
            progress: 100,
            message: isSuccess
              ? `${action.name} 완료: ${action.resultMessage || '성공'}`
              : `${action.name} 실패: 오류가 발생했습니다.`,
            startTime: prev[action.id]?.startTime,
          },
        }));

        // Reset status after 5 seconds
        setTimeout(() => {
          setExecutionStatuses(prev => {
            const { [action.id]: _removed, ...rest } = prev;
            return rest;
          });
        }, 5000);
      }, executionTime);
    },
    [executionStatuses]
  );

  // Show action logs
  const showActionLogs = useCallback((action: QuickAction) => {
    setSelectedActionName(action.name);
    setSelectedActionLogs(
      `[${new Date().toLocaleTimeString()}] ${action.name} 로그:\n\n` +
        `작업 ID: ${action.id}\n` +
        `카테고리: ${action.category}\n` +
        `예상 시간: ${action.estimatedTime}\n` +
        `마지막 실행: ${action.lastRun || '없음'}\n` +
        `상태: ${action.status}\n\n` +
        `[상세 로그]\n` +
        `- 작업 초기화 완료\n` +
        `- 환경 검증 통과\n` +
        `- ${action.description}\n` +
        `- 결과: ${action.resultMessage || '처리 중'}\n\n` +
        `실제 환경에서는 실시간 로그가 여기에 표시됩니다.`
    );
    setLogModalVisible(true);
  }, []);

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    const groups: Record<string, QuickAction[]> = {};
    quickActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    });
    return groups;
  }, [quickActions]);

  if (!project || quickActions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Text type='secondary'>사용 가능한 빠른 작업이 없습니다.</Text>
      </div>
    );
  }

  return (
    <div className='project-quick-actions'>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
          <ThunderboltOutlined /> 빠른 작업 실행
        </Title>
        <Text type='secondary'>
          {project.name}에서 자주 사용하는 작업들을 원클릭으로 실행하세요
        </Text>
      </div>

      {/* Actions by Category */}
      {Object.entries(actionsByCategory).map(([category, actions]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <Tag
              color={getCategoryColor(category as QuickAction['category'])}
              style={{ marginBottom: 8 }}
            >
              {category === 'deployment' && '배포'}
              {category === 'testing' && '테스팅'}
              {category === 'security' && '보안'}
              {category === 'build' && '빌드'}
              {category === 'maintenance' && '유지보수'}
            </Tag>
          </div>

          <Row gutter={[12, 12]}>
            {actions.map(action => {
              const executionStatus = executionStatuses[action.id];
              const currentStatus = executionStatus?.status || action.status;
              const isExecuting = executionStatus?.status === 'running';

              return (
                <Col xs={24} sm={12} lg={8} key={action.id}>
                  <Card
                    size='small'
                    hoverable={action.isAvailable && !isExecuting}
                    style={{
                      height: '140px',
                      opacity: action.isAvailable ? 1 : 0.6,
                      borderColor:
                        currentStatus !== 'idle'
                          ? getStatusColor(currentStatus)
                          : undefined,
                    }}
                    actions={[
                      <Tooltip
                        title={
                          !action.isAvailable
                            ? '현재 사용할 수 없습니다'
                            : action.description
                        }
                        key='execute'
                      >
                        <Button
                          type={
                            currentStatus === 'success'
                              ? 'primary'
                              : currentStatus === 'error'
                                ? 'danger'
                                : 'default'
                          }
                          size='small'
                          disabled={!action.isAvailable || isExecuting}
                          loading={isExecuting}
                          onClick={() => executeAction(action)}
                          icon={getActionIcon(action.icon, currentStatus)}
                          style={{ width: '80%' }}
                        >
                          {isExecuting
                            ? '실행 중'
                            : currentStatus === 'success'
                              ? '완료'
                              : currentStatus === 'error'
                                ? '실패'
                                : '실행'}
                        </Button>
                      </Tooltip>,
                      <Tooltip title='로그 보기' key='logs'>
                        <Button
                          type='text'
                          size='small'
                          icon={<FileTextOutlined />}
                          onClick={() => showActionLogs(action)}
                        />
                      </Tooltip>,
                    ]}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Title
                          level={5}
                          style={{ margin: 0, fontSize: '14px' }}
                        >
                          {action.name}
                        </Title>
                        <Badge
                          status={
                            currentStatus === 'success'
                              ? 'success'
                              : currentStatus === 'error'
                                ? 'error'
                                : currentStatus === 'running'
                                  ? 'processing'
                                  : 'default'
                          }
                        />
                      </div>
                    </div>

                    <Text
                      type='secondary'
                      style={{
                        fontSize: '11px',
                        display: 'block',
                        marginBottom: 8,
                      }}
                      ellipsis
                    >
                      {action.description}
                    </Text>

                    {/* Execution Progress */}
                    {isExecuting && (
                      <div style={{ marginBottom: 8 }}>
                        <Progress
                          percent={Math.round(executionStatus.progress)}
                          size='small'
                          status='active'
                          strokeColor={getCategoryColor(action.category)}
                        />
                        <Text style={{ fontSize: '10px', color: '#666' }}>
                          {executionStatus.message}
                        </Text>
                      </div>
                    )}

                    {/* Status Message */}
                    {!isExecuting && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '10px',
                        }}
                      >
                        <Text type='secondary'>
                          {action.lastRun && `마지막: ${action.lastRun}`}
                        </Text>
                        <Text type='secondary'>{action.estimatedTime}</Text>
                      </div>
                    )}

                    {/* Result Message */}
                    {executionStatus &&
                      executionStatus.status !== 'running' && (
                        <div style={{ marginTop: 4 }}>
                          <Text
                            style={{
                              fontSize: '10px',
                              color:
                                executionStatus.status === 'success'
                                  ? '#52c41a'
                                  : '#f5222d',
                            }}
                          >
                            {executionStatus.message}
                          </Text>
                        </div>
                      )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      ))}

      {/* Action Summary */}
      <Card size='small' style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Text
                strong
                style={{ display: 'block', fontSize: '18px', color: '#52c41a' }}
              >
                {quickActions.filter(a => a.isAvailable).length}
              </Text>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                사용 가능
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Text
                strong
                style={{ display: 'block', fontSize: '18px', color: '#1890ff' }}
              >
                {
                  Object.values(executionStatuses).filter(
                    s => s.status === 'running'
                  ).length
                }
              </Text>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                실행 중
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Text
                strong
                style={{ display: 'block', fontSize: '18px', color: '#fa8c16' }}
              >
                {quickActions.filter(a => a.status === 'success').length}
              </Text>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                최근 성공
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Text
                strong
                style={{ display: 'block', fontSize: '18px', color: '#f5222d' }}
              >
                {quickActions.filter(a => a.status === 'error').length}
              </Text>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                오류
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Log Modal */}
      <Modal
        title={`${selectedActionName} 로그`}
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={[
          <Button key='close' onClick={() => setLogModalVisible(false)}>
            닫기
          </Button>,
        ]}
        width={700}
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
            whiteSpace: 'pre-line',
          }}
        >
          {selectedActionLogs}
        </div>
      </Modal>
    </div>
  );
};

export default ProjectQuickActions;
