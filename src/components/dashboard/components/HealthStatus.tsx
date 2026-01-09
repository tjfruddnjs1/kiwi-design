import React, { useMemo } from 'react';
import {
  Card,
  Typography,
  Space,
  Badge,
  Row,
  Col,
  Progress,
  Tooltip,
} from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import { HealthStatusProps } from '../types/projectTypes';
import {
  getPipelineByProjectId,
  getSecuritySummaryByProjectId,
  mockPipelines,
  mockProjectSecuritySummaries,
} from '../../../data/mockProjects';

const { Text } = Typography;

const HealthStatus: React.FC<HealthStatusProps> = ({ project }) => {
  const pipeline =
    getPipelineByProjectId(project.id) || mockPipelines['k8s-control'];
  const securitySummary =
    getSecuritySummaryByProjectId(project.id) ||
    mockProjectSecuritySummaries['k8s-control'];

  const getHealthColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#1890ff';
    if (score >= 50) return '#fa8c16';
    return '#f5222d';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return '우수';
    if (score >= 70) return '양호';
    if (score >= 50) return '보통';
    return '주의';
  };

  // Calculate overall system health based on multiple factors
  const systemHealth = useMemo(() => {
    let healthScore = project.healthScore || 75;

    // Adjust based on pipeline status
    if (pipeline) {
      const failedStages = pipeline.stages.filter(
        stage => stage.status === 'error'
      ).length;
      if (failedStages > 0) {
        healthScore = Math.max(healthScore - failedStages * 15, 0);
      }
    }

    // Adjust based on security score
    if (securitySummary) {
      const securityPenalty = Math.max(
        (100 - securitySummary.securityScore) * 0.3,
        0
      );
      healthScore = Math.max(healthScore - securityPenalty, 0);
    }

    return Math.round(healthScore);
  }, [project.healthScore, pipeline, securitySummary]);

  return (
    <Card
      size='small'
      title={
        <Space>
          <HeartOutlined style={{ color: '#f5222d' }} />
          <Text strong>건강도</Text>
        </Space>
      }
      style={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      hoverable
    >
      <Space direction='vertical' size='small' style={{ width: '100%' }}>
        {/* Overall Health Score */}
        <div style={{ textAlign: 'center' }}>
          <Progress
            type='dashboard'
            percent={systemHealth}
            width={80}
            strokeColor={getHealthColor(systemHealth)}
            format={percent => (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: getHealthColor(systemHealth),
                  }}
                >
                  {percent}%
                </div>
                <div style={{ fontSize: '10px', color: '#999' }}>
                  {getHealthStatus(systemHealth)}
                </div>
              </div>
            )}
          />
        </div>

        {/* Health Metrics */}
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '10px', color: '#999' }}>서비스</Text>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: getHealthColor(project.healthScore),
                }}
              >
                {project.healthScore}%
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '10px', color: '#999' }}>
                파이프라인
              </Text>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: pipeline ? '#52c41a' : '#fa8c16',
                }}
              >
                {pipeline ? '정상' : '없음'}
              </div>
            </div>
          </Col>
        </Row>

        <Row gutter={[8, 8]}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '10px', color: '#999' }}>보안</Text>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: getHealthColor(securitySummary?.securityScore || 0),
                }}
              >
                {securitySummary?.securityScore || 0}%
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '10px', color: '#999' }}>가동률</Text>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#52c41a',
                }}
              >
                99.9%
              </div>
            </div>
          </Col>
        </Row>

        {/* Status Indicators */}
        <div style={{ marginTop: 8 }}>
          <Space size='small'>
            <Tooltip title='서비스 상태'>
              <Badge
                status={project.status === 'active' ? 'success' : 'warning'}
              />
            </Tooltip>
            <Tooltip title='배포 상태'>
              <Badge
                status={
                  pipeline?.stages.some(s => s.status === 'error')
                    ? 'error'
                    : 'success'
                }
              />
            </Tooltip>
            <Tooltip title='보안 상태'>
              <Badge
                status={
                  securitySummary?.activeAlerts.length ? 'warning' : 'success'
                }
              />
            </Tooltip>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default HealthStatus;
