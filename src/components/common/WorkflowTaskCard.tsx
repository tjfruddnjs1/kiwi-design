import React from 'react';
import { Card, Button, Tag, Badge, Space, Typography } from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  ToolOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import { WorkflowTask } from '../../data/mockWorkflowData';

const { Text } = Typography;

interface WorkflowTaskCardProps {
  task: WorkflowTask;
  onExecute?: (taskId: string) => void;
  className?: string;
  size?: 'small' | 'default' | 'large';
  showFullDetails?: boolean;
}

export const WorkflowTaskCard: React.FC<WorkflowTaskCardProps> = ({
  task,
  onExecute,
  className = '',
  size = 'default',
  showFullDetails = true,
}) => {
  const getCategoryIcon = (category: WorkflowTask['category']) => {
    switch (category) {
      case 'deployment':
        return <RocketOutlined />;
      case 'security':
        return <SafetyOutlined />;
      case 'maintenance':
        return <ToolOutlined />;
      case 'monitoring':
        return <MonitorOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getPriorityColor = (priority: WorkflowTask['priority']) => {
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
  };

  const getStatusBadge = (status: WorkflowTask['status']) => {
    switch (status) {
      case 'completed':
        return <Badge status='success' text='완료' />;
      case 'in_progress':
        return <Badge status='processing' text='진행중' />;
      case 'blocked':
        return <Badge status='error' text='차단됨' />;
      case 'pending':
        return <Badge status='default' text='대기' />;
      default:
        return <Badge status='default' text='알 수 없음' />;
    }
  };

  const cardSize = size === 'small' ? 'small' : 'default';
  const isCompact = size === 'small';

  return (
    <Card
      size={cardSize}
      className={`workflow-task-card ${task.priority} ${task.actionRequired ? 'action-required' : ''} ${className}`}
      style={{
        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
        backgroundColor: task.actionRequired ? '#fff2f0' : undefined,
        marginBottom: isCompact ? 8 : 12,
      }}
      bodyStyle={{
        padding: isCompact ? '8px 12px' : '12px 16px',
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
          {/* Task Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: isCompact ? 2 : 4,
            }}
          >
            {getCategoryIcon(task.category)}
            <Text strong style={{ fontSize: isCompact ? '12px' : '13px' }}>
              {task.title}
            </Text>
            {task.actionRequired && (
              <Badge status='processing' text='조치필요' />
            )}
            {!isCompact && getStatusBadge(task.status)}
          </div>

          {/* Task Description */}
          {showFullDetails && (
            <Text
              type='secondary'
              style={{
                fontSize: '11px',
                display: 'block',
                marginBottom: isCompact ? 2 : 4,
                lineHeight: 1.4,
              }}
            >
              {task.description}
            </Text>
          )}

          {/* Task Meta Information */}
          <div className='task-meta'>
            <Space size='small' wrap>
              <Tag color='blue'>{task.projectName}</Tag>
              {showFullDetails && (
                <>
                  <div className='task-assignee'>
                    <UserOutlined />
                    <span>{task.assignee}</span>
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <ClockCircleOutlined />
                    <span>{task.estimatedTime}</span>
                  </div>
                </>
              )}
            </Space>

            {showFullDetails && (
              <Space size='small'>
                <Text type='secondary' style={{ fontSize: '10px' }}>
                  📅 {task.dueDate}
                </Text>
                <Tag
                  color={getPriorityColor(task.priority)}
                  style={{ margin: 0, fontSize: '9px' }}
                >
                  {task.priority.toUpperCase()}
                </Tag>
              </Space>
            )}
          </div>

          {/* Dependencies */}
          {showFullDetails &&
            task.dependencies &&
            task.dependencies.length > 0 && (
              <div style={{ marginTop: 8, fontSize: '10px' }}>
                <Text type='secondary'>의존성: </Text>
                {task.dependencies.map(dep => (
                  <Tag key={dep} style={{ fontSize: '9px', margin: '0 2px' }}>
                    {dep}
                  </Tag>
                ))}
              </div>
            )}
        </div>

        {/* Action Button */}
        <Button
          type={task.actionRequired ? 'primary' : 'default'}
          size='small'
          icon={<PlayCircleOutlined />}
          onClick={() => onExecute?.(task.id)}
          danger={task.priority === 'urgent'}
          disabled={task.status === 'completed' || task.status === 'blocked'}
        >
          {task.status === 'completed'
            ? '완료'
            : task.status === 'blocked'
              ? '차단'
              : task.status === 'in_progress'
                ? '진행중'
                : '시작'}
        </Button>
      </div>
    </Card>
  );
};

export default WorkflowTaskCard;
