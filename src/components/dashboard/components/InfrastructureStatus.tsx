import React, { useCallback } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Progress,
  Tooltip,
} from 'antd';
import {
  CloudServerOutlined,
  DesktopOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { InfrastructureStatusProps } from '../types/projectTypes';
import {
  getInfrastructureByProjectId,
  mockInfrastructures,
} from '../../../data/mockProjects';

const { Text } = Typography;

const InfrastructureStatus: React.FC<InfrastructureStatusProps> = ({
  project,
  onViewDetails,
}) => {
  const infrastructure =
    getInfrastructureByProjectId(project.id) ||
    mockInfrastructures['k8s-control'];

  // 백업 후 경과 시간 계산 함수
  const getBackupElapsedTime = useCallback(
    (lastBackup: string, status: string) => {
      if (status === 'running') {
        return '백업 진행중';
      }
      if (status === 'failed') {
        return '백업 실패';
      }
      if (status === 'scheduled') {
        return '예약됨';
      }

      // timestamp를 기반으로 경과 시간 계산 (mockup)
      const timeMapping: Record<string, string> = {
        '2시간 전': '2시간 30분 경과',
        '1시간 전': '1시간 15분 경과',
        '6시간 전': '6시간 20분 경과',
        '4시간 전': '4시간 35분 경과',
        '30분 전': '35분 경과',
        '20분 전': '23분 경과',
        '10분 전': '12분 경과',
        '1일 전': '1일 2시간 경과',
        '1주 전': '7일 4시간 경과',
      };

      return timeMapping[lastBackup] || `${lastBackup} 이후`;
    },
    []
  );

  if (!infrastructure) {
    return (
      <Card
        size='small'
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#722ed1' }} />
            <Text strong>인프라</Text>
          </Space>
        }
        style={{
          height: '100%',
          cursor: onViewDetails ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        hoverable={!!onViewDetails}
        onClick={onViewDetails}
        onKeyDown={
          onViewDetails
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewDetails();
                }
              }
            : undefined
        }
        role={onViewDetails ? 'button' : undefined}
        tabIndex={onViewDetails ? 0 : undefined}
      >
        <Text type='secondary'>인프라 정보 없음</Text>
      </Card>
    );
  }

  const { metrics, backup } = infrastructure;
  const backupElapsedTime = getBackupElapsedTime(
    backup.lastBackup,
    backup.status
  );

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return '#f5222d';
    if (usage >= 70) return '#fa8c16';
    if (usage >= 50) return '#faad14';
    return '#52c41a';
  };

  const getBackupButtonColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#52c41a';
      case 'running':
        return '#1890ff';
      case 'failed':
        return '#f5222d';
      case 'scheduled':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  const getBackupIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckOutlined />;
      case 'running':
        return <LoadingOutlined />;
      case 'failed':
        return <CloseCircleOutlined />;
      case 'scheduled':
        return <ClockCircleOutlined />;
      default:
        return <PauseCircleOutlined />;
    }
  };

  return (
    <Card
      size='small'
      title={
        <Space>
          <CloudServerOutlined style={{ color: '#722ed1' }} />
          <Text strong>인프라</Text>
        </Space>
      }
      style={{
        height: '100%',
        cursor: onViewDetails ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      hoverable={!!onViewDetails}
      onClick={onViewDetails}
      onKeyDown={
        onViewDetails
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewDetails();
              }
            }
          : undefined
      }
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
    >
      <Space direction='vertical' size='small' style={{ width: '100%' }}>
        {/* CPU, RAM, GPU 사용률 */}
        <Row gutter={[4, 4]}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Tooltip
                title={`${metrics.cpu.cores}코어, 로드: ${metrics.cpu.load}`}
              >
                <div>
                  <DesktopOutlined
                    style={{
                      fontSize: '14px',
                      color: getUsageColor(metrics.cpu.usage),
                      marginBottom: 2,
                    }}
                  />
                  <div style={{ fontSize: '10px', color: '#999' }}>CPU</div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: getUsageColor(metrics.cpu.usage),
                    }}
                  >
                    {metrics.cpu.usage}%
                  </div>
                </div>
              </Tooltip>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Tooltip
                title={`${metrics.memory.used} / ${metrics.memory.total}`}
              >
                <div>
                  <DatabaseOutlined
                    style={{
                      fontSize: '14px',
                      color: getUsageColor(metrics.memory.usage),
                      marginBottom: 2,
                    }}
                  />
                  <div style={{ fontSize: '10px', color: '#999' }}>RAM</div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: getUsageColor(metrics.memory.usage),
                    }}
                  >
                    {metrics.memory.usage}%
                  </div>
                </div>
              </Tooltip>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              {metrics.gpu ? (
                <Tooltip title={`${metrics.gpu.model} (${metrics.gpu.memory})`}>
                  <div>
                    <ThunderboltOutlined
                      style={{
                        fontSize: '14px',
                        color: getUsageColor(metrics.gpu.usage),
                        marginBottom: 2,
                      }}
                    />
                    <div style={{ fontSize: '10px', color: '#999' }}>GPU</div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: getUsageColor(metrics.gpu.usage),
                      }}
                    >
                      {metrics.gpu.usage}%
                    </div>
                  </div>
                </Tooltip>
              ) : (
                <div>
                  <ThunderboltOutlined
                    style={{
                      fontSize: '14px',
                      color: '#d9d9d9',
                      marginBottom: 2,
                    }}
                  />
                  <div style={{ fontSize: '10px', color: '#999' }}>GPU</div>
                  <div style={{ fontSize: '12px', color: '#d9d9d9' }}>없음</div>
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Usage Progress Bars */}
        <div style={{ marginTop: 4 }}>
          <Progress
            percent={metrics.cpu.usage}
            size='small'
            strokeColor={getUsageColor(metrics.cpu.usage)}
            showInfo={false}
            style={{ marginBottom: 2 }}
          />
          <Progress
            percent={metrics.memory.usage}
            size='small'
            strokeColor={getUsageColor(metrics.memory.usage)}
            showInfo={false}
            style={{ marginBottom: 2 }}
          />
          {metrics.gpu && (
            <Progress
              percent={metrics.gpu.usage}
              size='small'
              strokeColor={getUsageColor(metrics.gpu.usage)}
              showInfo={false}
              style={{ marginBottom: 2 }}
            />
          )}
        </div>

        {/* Backup Button with Elapsed Time */}
        <div style={{ marginTop: 8 }}>
          <Tooltip
            title={
              <div>
                <div>
                  상태:{' '}
                  {backup.status === 'success'
                    ? '성공'
                    : backup.status === 'running'
                      ? '진행중'
                      : backup.status === 'failed'
                        ? '실패'
                        : '예약됨'}
                </div>
                <div>크기: {backup.size}</div>
                <div>다음 예정: {backup.nextScheduled}</div>
                <div>보관기간: {backup.retentionDays}일</div>
              </div>
            }
          >
            <Button
              size='small'
              style={{
                width: '100%',
                height: '32px',
                borderColor: getBackupButtonColor(backup.status),
                color: getBackupButtonColor(backup.status),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
              }}
              icon={getBackupIcon(backup.status)}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  lineHeight: '1.2',
                }}
              >
                백업
              </div>
              <div
                style={{
                  fontSize: '8px',
                  lineHeight: '1.1',
                  marginTop: '1px',
                  color: '#8c8c8c',
                }}
              >
                {backupElapsedTime}
              </div>
            </Button>
          </Tooltip>
        </div>
      </Space>
    </Card>
  );
};

export default InfrastructureStatus;
