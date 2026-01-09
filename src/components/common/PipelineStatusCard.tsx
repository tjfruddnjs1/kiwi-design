import React from 'react';
import { Steps, Tag, Typography, Space, Tooltip, Progress, Badge } from 'antd';
import {
  CheckCircleOutlined,
  LoadingOutlined,
  CodeOutlined,
  BuildOutlined,
  BugOutlined,
  SafetyOutlined,
  DeploymentUnitOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import { ProjectPipeline } from '../../data/mockProjects';

const { Text } = Typography;
const { Step } = Steps;

interface PipelineStatusCardProps {
  pipeline: ProjectPipeline;
  compact?: boolean;
}

const PipelineStatusCard: React.FC<PipelineStatusCardProps> = ({
  pipeline,
  compact = false,
}) => {
  // Get stage icon
  const getStageIcon = (stageKey: string) => {
    const iconMap = {
      ci: <CodeOutlined />,
      build: <BuildOutlined />,
      test: <BugOutlined />,
      security: <SafetyOutlined />,
      deploy: <DeploymentUnitOutlined />,
      operations: <MonitorOutlined />,
    };
    return iconMap[stageKey as keyof typeof iconMap] || <CheckCircleOutlined />;
  };

  // Get stage English name
  const getStageEnglishName = (stageKey: string) => {
    const nameMap = {
      ci: 'CI',
      build: 'Build',
      test: 'Test',
      security: 'Security',
      deploy: 'Deploy',
      operations: 'Monitor',
    };
    return nameMap[stageKey as keyof typeof nameMap] || stageKey;
  };

  // Get stage status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'running':
        return 'processing';
      case 'error':
        return 'error';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  // Calculate overall progress
  const completedStages = pipeline.stages.filter(
    stage => stage.status === 'success'
  ).length;
  const totalStages = pipeline.stages.length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  if (compact) {
    // Enhanced compact view with pipeline flow visualization
    return (
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Text strong style={{ fontSize: '12px', color: '#595959' }}>
            파이프라인 플로우:
          </Text>
          <Space size='small'>
            <Progress
              percent={progressPercent}
              size='small'
              style={{ width: 80 }}
              format={() => `${completedStages}/${totalStages}`}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
              {pipeline.lastRun}
            </Text>
          </Space>
        </div>

        {/* Enhanced Pipeline Flow Visualization */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            padding: '8px 0',
            overflowX: 'auto',
            minHeight: '32px',
          }}
        >
          {pipeline.stages.map((stage, index) => (
            <React.Fragment key={stage.key}>
              <Tooltip
                title={
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {stage.name}
                    </div>
                    <div>
                      상태:{' '}
                      {stage.status === 'success'
                        ? ' 완료'
                        : stage.status === 'running'
                          ? '🔄 실행중'
                          : stage.status === 'error'
                            ? ' 실패'
                            : '⏳ 대기중'}
                    </div>
                    {stage.duration !== '예정' && (
                      <div>소요시간: {stage.duration}</div>
                    )}
                    {stage.timestamp && <div>시간: {stage.timestamp}</div>}
                  </div>
                }
                placement='top'
              >
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 'fit-content',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform:
                      stage.status === 'running' ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {/* Stage Node */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor:
                        stage.status === 'success'
                          ? '#52c41a'
                          : stage.status === 'running'
                            ? '#1890ff'
                            : stage.status === 'error'
                              ? '#f5222d'
                              : '#d9d9d9',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: '2px solid',
                      borderColor:
                        stage.status === 'success'
                          ? '#389e0d'
                          : stage.status === 'running'
                            ? '#096dd9'
                            : stage.status === 'error'
                              ? '#cf1322'
                              : '#bfbfbf',
                      boxShadow:
                        stage.status === 'running'
                          ? '0 0 0 4px rgba(24, 144, 255, 0.2)'
                          : stage.status === 'success'
                            ? '0 0 0 4px rgba(82, 196, 26, 0.1)'
                            : 'none',
                      animation:
                        stage.status === 'running'
                          ? 'pipeline-pulse 2s infinite'
                          : 'none',
                    }}
                  >
                    {stage.status === 'running' ? (
                      <LoadingOutlined
                        spin
                        style={{ color: '#ffffff', fontSize: '12px' }}
                      />
                    ) : (
                      getStageIcon(stage.key)
                    )}
                  </div>

                  {/* Stage Label */}
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: '500',
                      marginTop: 2,
                      textAlign: 'center',
                      color:
                        stage.status === 'success'
                          ? '#389e0d'
                          : stage.status === 'running'
                            ? '#096dd9'
                            : stage.status === 'error'
                              ? '#cf1322'
                              : '#8c8c8c',
                      minWidth: '32px',
                      lineHeight: 1.2,
                    }}
                  >
                    {getStageEnglishName(stage.key)}
                  </div>
                </div>
              </Tooltip>

              {/* Flow Arrow */}
              {index < pipeline.stages.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '0 2px',
                    height: '28px',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '2px',
                      backgroundColor:
                        stage.status === 'success'
                          ? '#52c41a'
                          : stage.status === 'running'
                            ? '#1890ff'
                            : '#d9d9d9',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: '-2px',
                        top: '-2px',
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid',
                        borderTop: '3px solid transparent',
                        borderBottom: '3px solid transparent',
                        borderLeftColor:
                          stage.status === 'success'
                            ? '#52c41a'
                            : stage.status === 'running'
                              ? '#1890ff'
                              : '#d9d9d9',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Enhanced Status Summary */}
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Badge
            status={
              pipeline.stages.some(s => s.status === 'error')
                ? 'error'
                : pipeline.stages.some(s => s.status === 'running')
                  ? 'processing'
                  : pipeline.stages.every(s => s.status === 'success')
                    ? 'success'
                    : 'default'
            }
            text={
              <Text style={{ fontSize: '11px' }}>
                {pipeline.stages.some(s => s.status === 'error')
                  ? '파이프라인 오류'
                  : pipeline.stages.some(s => s.status === 'running')
                    ? '실행 중'
                    : pipeline.stages.every(s => s.status === 'success')
                      ? '모든 단계 완료'
                      : `${pipeline.currentStage} 단계 대기중`}
              </Text>
            }
          />
          <Space size='small'>
            <Tag color='blue' style={{ fontSize: '10px' }}>
              성공률 {pipeline.metrics.successRate}%
            </Tag>
            <Tag color='green' style={{ fontSize: '10px' }}>
              평균 {pipeline.metrics.avgDeployTime}
            </Tag>
          </Space>
        </div>

        {/* CSS Animation for running stages */}
        <style>{`
          @keyframes pipeline-pulse {
            0%, 100% {
              box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(24, 144, 255, 0.1);
            }
          }
        `}</style>
      </div>
    );
  }

  // Full view (not used in this implementation but kept for future use)
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space size='middle'>
          <Text strong>파이프라인 상태</Text>
          <Tag color='blue'>성공률 {pipeline.metrics.successRate}%</Tag>
          <Text type='secondary'>마지막 실행: {pipeline.lastRun}</Text>
        </Space>
      </div>

      <Steps
        current={pipeline.stages.findIndex(s => s.status === 'running')}
        size='small'
      >
        {pipeline.stages.map(stage => (
          <Step
            key={stage.key}
            title={stage.name}
            icon={getStageIcon(stage.key)}
            status={getStatusColor(stage.status) as any}
            description={stage.duration}
          />
        ))}
      </Steps>
    </div>
  );
};

export default PipelineStatusCard;
