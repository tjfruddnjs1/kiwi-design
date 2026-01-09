import React from 'react';
import { Card, Statistic, Progress, Row, Col, Badge, Typography } from 'antd';
import {
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  RocketOutlined,
  SafetyOutlined,
  MonitorOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { SystemHealth } from '../../data/mockWorkflowData';

const { Text } = Typography;

interface SystemHealthCardProps {
  systemHealth: SystemHealth;
  showDetails?: boolean;
  className?: string;
  size?: 'small' | 'default' | 'large';
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({
  systemHealth,
  showDetails = true,
  className = '',
  size = 'default',
}) => {
  const getHealthColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#1890ff';
    if (score >= 50) return '#fa8c16';
    return '#f5222d';
  };

  const getHealthStatus = (status: SystemHealth['overall']['status']) => {
    switch (status) {
      case 'excellent':
        return { text: '매우 양호', color: '#52c41a' };
      case 'good':
        return { text: '양호', color: '#1890ff' };
      case 'warning':
        return { text: '주의', color: '#fa8c16' };
      case 'critical':
        return { text: '위험', color: '#f5222d' };
      default:
        return { text: '알 수 없음', color: '#d9d9d9' };
    }
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'declining':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />;
      case 'stable':
        return <MinusOutlined style={{ color: '#1890ff' }} />;
      default:
        return <MinusOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'deployment':
        return <RocketOutlined />;
      case 'security':
        return <SafetyOutlined />;
      case 'performance':
        return <MonitorOutlined />;
      case 'infrastructure':
        return <ToolOutlined />;
      default:
        return <MonitorOutlined />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'deployment':
        return '배포';
      case 'security':
        return '보안';
      case 'performance':
        return '성능';
      case 'infrastructure':
        return '인프라';
      default:
        return category;
    }
  };

  const healthStatus = getHealthStatus(systemHealth.overall.status);
  const isCompact = size === 'small';

  return (
    <div className={`system-health-container ${className}`}>
      {/* Overall Health */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={showDetails ? 8 : 24}>
          <Card
            className='workflow-health-card'
            style={{
              textAlign: 'center',
              height: isCompact ? '140px' : '160px',
              borderColor: getHealthColor(systemHealth.overall.score),
            }}
            styles={{
              body: {
                padding: isCompact ? '16px' : '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              },
            }}
          >
            <TrophyOutlined
              style={{
                fontSize: isCompact ? '28px' : '36px',
                color: getHealthColor(systemHealth.overall.score),
                marginBottom: isCompact ? 8 : 12,
              }}
            />
            <Statistic
              title='전체 시스템 건강도'
              value={systemHealth.overall.score}
              suffix='%'
              valueStyle={{
                color: getHealthColor(systemHealth.overall.score),
                fontSize: isCompact ? '20px' : '28px',
                fontWeight: 700,
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  color: healthStatus.color,
                  fontSize: isCompact ? '11px' : '12px',
                  fontWeight: 500,
                }}
              >
                {healthStatus.text}
              </Text>
              {getTrendIcon(systemHealth.overall.trend)}
            </div>
          </Card>
        </Col>

        {/* Category Details */}
        {showDetails && (
          <Col xs={24} lg={16}>
            <Card
              title='영역별 상태'
              className='workflow-health-card'
              style={{ height: isCompact ? '140px' : '160px' }}
              styles={{ body: { padding: isCompact ? '12px' : '16px' } }}
            >
              <Row gutter={[8, 8]}>
                {Object.entries(systemHealth.categories).map(([key, data]) => (
                  <Col xs={12} sm={6} key={key}>
                    <div
                      className={`health-category health-category-${key}`}
                      style={{
                        padding: isCompact ? '8px' : '12px',
                        height: isCompact ? '80px' : '100px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        {getCategoryIcon(key)}
                        <Text
                          strong
                          style={{ fontSize: isCompact ? '10px' : '11px' }}
                        >
                          {getCategoryName(key)}
                        </Text>
                        {getTrendIcon(
                          data.trend === 'up'
                            ? 'improving'
                            : data.trend === 'down'
                              ? 'declining'
                              : 'stable'
                        )}
                      </div>

                      <Progress
                        type='circle'
                        size={isCompact ? 45 : 55}
                        percent={data.score}
                        strokeColor={getHealthColor(data.score)}
                        format={() => `${data.score}%`}
                        strokeWidth={6}
                      />

                      {data.issues > 0 && (
                        <Badge
                          count={data.issues}
                          size='small'
                          style={{
                            backgroundColor: '#fa8c16',
                            fontSize: '9px',
                            marginTop: 2,
                          }}
                        />
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}
      </Row>

      {/* Critical Summary */}
      {showDetails &&
        (systemHealth.criticalItems > 0 || systemHealth.actionRequired > 0) && (
          <Row gutter={[16, 8]} style={{ marginTop: 16 }}>
            {systemHealth.criticalItems > 0 && (
              <Col xs={12}>
                <Card
                  size='small'
                  style={{
                    borderColor: '#ff4d4f',
                    backgroundColor: '#fff2f0',
                    textAlign: 'center',
                  }}
                >
                  <Statistic
                    title='중요 이슈'
                    value={systemHealth.criticalItems}
                    valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
                    suffix='개'
                  />
                </Card>
              </Col>
            )}

            {systemHealth.actionRequired > 0 && (
              <Col xs={12}>
                <Card
                  size='small'
                  style={{
                    borderColor: '#fa8c16',
                    backgroundColor: '#fff7e6',
                    textAlign: 'center',
                  }}
                >
                  <Statistic
                    title='조치 필요'
                    value={systemHealth.actionRequired}
                    valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
                    suffix='개'
                  />
                </Card>
              </Col>
            )}
          </Row>
        )}
    </div>
  );
};

export default SystemHealthCard;
