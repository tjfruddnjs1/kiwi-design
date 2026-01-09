import React from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Progress,
  Divider,
  Tooltip,
} from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined as ClockIcon,
  CheckOutlined,
  HistoryOutlined,
  BellOutlined,
  BugOutlined,
  AuditOutlined,
  FileProtectOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { SecurityVulnerabilitiesProps } from '../types/projectTypes';
import type { SASTReport, DASTReport } from '../../../data/mockProjects';
import {
  getSecuritySummaryByProjectId,
  mockProjectSecuritySummaries,
} from '../../../data/mockProjects';

const { Text } = Typography;

const SecurityVulnerabilities: React.FC<SecurityVulnerabilitiesProps> = ({
  project,
  onViewDetails,
}) => {
  const securitySummary =
    getSecuritySummaryByProjectId(project.id) ||
    mockProjectSecuritySummaries['k8s-control'];

  if (!securitySummary) {
    return (
      <Card
        size='small'
        title={
          <Space>
            <SafetyOutlined style={{ color: '#faad14' }} />
            <Text strong>보안 취약점</Text>
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
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <SafetyOutlined
            style={{ fontSize: '24px', color: '#d9d9d9', marginBottom: 8 }}
          />
          <div>
            <Text type='secondary' style={{ fontSize: '11px' }}>
              보안 정보 없음
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#1890ff';
    if (score >= 50) return '#fa8c16';
    return '#f5222d';
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return '#f5222d';
    if (score >= 40) return '#fa8c16';
    return '#52c41a';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return '높음';
    if (score >= 40) return '보통';
    return '낮음';
  };

  const getScanStatusIcon = (
    scanType: 'SAST' | 'DAST',
    report: SASTReport | DASTReport | null
  ) => {
    if (!report) return <ClockIcon style={{ color: '#d9d9d9' }} />;

    switch (report.status) {
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      default:
        return <ClockIcon style={{ color: '#fa8c16' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#f5222d';
      case 'high':
        return '#fa541c';
      case 'medium':
        return '#fa8c16';
      case 'low':
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#f5222d';
      case 'acknowledged':
        return '#fa8c16';
      case 'investigating':
        return '#1890ff';
      case 'inProgress':
        return '#722ed1';
      case 'resolved':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vulnerability':
        return <BugOutlined />;
      case 'compliance':
        return <AuditOutlined />;
      case 'policy':
        return <FileProtectOutlined />;
      case 'incident':
        return <ExclamationCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const criticalAlerts = securitySummary.activeAlerts.filter(
    alert => alert.severity === 'critical'
  ).length;
  const highAlerts = securitySummary.activeAlerts.filter(
    alert => alert.severity === 'high'
  ).length;
  const mediumAlerts = securitySummary.activeAlerts.filter(
    alert => alert.severity === 'medium'
  ).length;
  const lowAlerts = securitySummary.activeAlerts.filter(
    alert => alert.severity === 'low'
  ).length;

  const complianceCount = Object.values(
    securitySummary.complianceStatus
  ).filter(Boolean).length;
  const complianceTotal = Object.keys(securitySummary.complianceStatus).length;

  return (
    <Card
      size='small'
      title={
        <Space>
          <SafetyOutlined style={{ color: '#faad14' }} />
          <Text strong>보안 취약점</Text>
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
        {/* Security Score and Risk Level */}
        <Row gutter={[8, 4]}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={securitySummary.securityScore}
                width={40}
                strokeColor={getSecurityScoreColor(
                  securitySummary.securityScore
                )}
                format={percent => (
                  <div style={{ fontSize: '8px', fontWeight: 'bold' }}>
                    {percent}
                  </div>
                )}
              />
              <div style={{ fontSize: '9px', color: '#8c8c8c', marginTop: 2 }}>
                보안점수
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: getRiskColor(securitySummary.overallRiskScore),
                  marginBottom: 2,
                }}
              >
                {getRiskLevel(securitySummary.overallRiskScore)}
              </div>
              <div style={{ fontSize: '9px', color: '#8c8c8c' }}>
                위험도 ({securitySummary.overallRiskScore})
              </div>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '6px 0' }} />

        {/* Vulnerability Distribution */}
        <div>
          <Text
            style={{ fontSize: '10px', color: '#595959', fontWeight: '600' }}
          >
            취약점 분포:
          </Text>
          <div style={{ marginTop: 4 }}>
            <Row gutter={[4, 2]}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: criticalAlerts > 0 ? '#f5222d' : '#52c41a',
                    }}
                  >
                    {criticalAlerts}
                  </div>
                  <div style={{ fontSize: '8px', color: '#8c8c8c' }}>
                    Critical
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: highAlerts > 0 ? '#fa541c' : '#52c41a',
                    }}
                  >
                    {highAlerts}
                  </div>
                  <div style={{ fontSize: '8px', color: '#8c8c8c' }}>High</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: mediumAlerts > 0 ? '#fa8c16' : '#52c41a',
                    }}
                  >
                    {mediumAlerts}
                  </div>
                  <div style={{ fontSize: '8px', color: '#8c8c8c' }}>
                    Medium
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: lowAlerts > 0 ? '#1890ff' : '#52c41a',
                    }}
                  >
                    {lowAlerts}
                  </div>
                  <div style={{ fontSize: '8px', color: '#8c8c8c' }}>Low</div>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* Scan Status */}
        <div>
          <Text
            style={{ fontSize: '10px', color: '#595959', fontWeight: '600' }}
          >
            스캔 상태:
          </Text>
          <div style={{ marginTop: 4 }}>
            <Row gutter={[8, 4]}>
              <Col span={12}>
                <Space size='small'>
                  {getScanStatusIcon('SAST', securitySummary.sastReport)}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '600' }}>
                      SAST
                    </div>
                    <div style={{ fontSize: '8px', color: '#8c8c8c' }}>
                      {securitySummary.sastReport?.totalIssues || 0}개 이슈
                    </div>
                  </div>
                </Space>
              </Col>
              <Col span={12}>
                <Space size='small'>
                  {getScanStatusIcon('DAST', securitySummary.dastReport)}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '600' }}>
                      DAST
                    </div>
                    <div style={{ fontSize: '8px', color: '#8c8c8c' }}>
                      {securitySummary.dastReport?.totalIssues || 0}개 이슈
                    </div>
                  </div>
                </Space>
              </Col>
            </Row>
          </div>
        </div>

        {/* Compliance Status */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Text
              style={{ fontSize: '10px', color: '#595959', fontWeight: '600' }}
            >
              규정 준수:
            </Text>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 'bold',
                color:
                  complianceCount === complianceTotal
                    ? '#52c41a'
                    : complianceCount >= complianceTotal * 0.7
                      ? '#1890ff'
                      : '#fa8c16',
              }}
            >
              {complianceCount}/{complianceTotal}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Tooltip
              title={
                securitySummary.complianceStatus.owasp
                  ? 'OWASP 준수'
                  : 'OWASP 미준수'
              }
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: securitySummary.complianceStatus.owasp
                    ? '#52c41a'
                    : '#f5f5f5',
                  border: `1px solid ${securitySummary.complianceStatus.owasp ? '#52c41a' : '#d9d9d9'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {securitySummary.complianceStatus.owasp && (
                  <CheckOutlined style={{ fontSize: '8px', color: 'white' }} />
                )}
              </div>
            </Tooltip>
            <Tooltip
              title={
                securitySummary.complianceStatus.gdpr
                  ? 'GDPR 준수'
                  : 'GDPR 미준수'
              }
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: securitySummary.complianceStatus.gdpr
                    ? '#722ed1'
                    : '#f5f5f5',
                  border: `1px solid ${securitySummary.complianceStatus.gdpr ? '#722ed1' : '#d9d9d9'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {securitySummary.complianceStatus.gdpr && (
                  <CheckOutlined style={{ fontSize: '8px', color: 'white' }} />
                )}
              </div>
            </Tooltip>
            <Tooltip
              title={
                securitySummary.complianceStatus.pci ? 'PCI 준수' : 'PCI 미준수'
              }
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: securitySummary.complianceStatus.pci
                    ? '#13c2c2'
                    : '#f5f5f5',
                  border: `1px solid ${securitySummary.complianceStatus.pci ? '#13c2c2' : '#d9d9d9'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {securitySummary.complianceStatus.pci && (
                  <CheckOutlined style={{ fontSize: '8px', color: 'white' }} />
                )}
              </div>
            </Tooltip>
            <Tooltip
              title={
                securitySummary.complianceStatus.iso27001
                  ? 'ISO27001 준수'
                  : 'ISO27001 미준수'
              }
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: securitySummary.complianceStatus.iso27001
                    ? '#faad14'
                    : '#f5f5f5',
                  border: `1px solid ${securitySummary.complianceStatus.iso27001 ? '#faad14' : '#d9d9d9'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {securitySummary.complianceStatus.iso27001 && (
                  <CheckOutlined style={{ fontSize: '8px', color: 'white' }} />
                )}
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Last Activity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <HistoryOutlined style={{ fontSize: '10px', color: '#8c8c8c' }} />
            <Text style={{ fontSize: '9px', color: '#8c8c8c' }}>
              최근 스캔:{' '}
              {securitySummary.lastUpdated
                ? new Date(securitySummary.lastUpdated).toLocaleDateString()
                : '정보 없음'}
            </Text>
          </div>
          {securitySummary.resolvedAlertsLast30Days > 0 && (
            <div style={{ marginTop: 2 }}>
              <Text style={{ fontSize: '9px', color: '#52c41a' }}>
                📊 지난 30일 해결: {securitySummary.resolvedAlertsLast30Days}건
              </Text>
            </div>
          )}
        </div>

        {/* Security Alerts Section */}
        {securitySummary.activeAlerts &&
          securitySummary.activeAlerts.length > 0 && (
            <div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BellOutlined
                    style={{ fontSize: '10px', color: '#fa541c' }}
                  />
                  <Text
                    style={{
                      fontSize: '10px',
                      color: '#595959',
                      fontWeight: '600',
                    }}
                  >
                    보안 알림 ({securitySummary.activeAlerts.length}건)
                  </Text>
                </div>
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  {securitySummary.activeAlerts.slice(0, 3).map(alert => (
                    <div
                      key={alert.id}
                      style={{
                        padding: '6px 8px',
                        border: `1px solid ${getSeverityColor(alert.severity)}30`,
                        borderRadius: '4px',
                        backgroundColor: `${getSeverityColor(alert.severity)}08`,
                        borderLeft: `3px solid ${getSeverityColor(alert.severity)}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '2px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {React.cloneElement(getTypeIcon(alert.type), {
                            style: {
                              fontSize: '10px',
                              color: getSeverityColor(alert.severity),
                            },
                          })}
                          <Text
                            style={{
                              fontSize: '9px',
                              fontWeight: '600',
                              color: getSeverityColor(alert.severity),
                            }}
                          >
                            {alert.severity.toUpperCase()}
                          </Text>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: getStatusColor(alert.status),
                            }}
                          />
                          <Text style={{ fontSize: '8px', color: '#8c8c8c' }}>
                            {alert.status}
                          </Text>
                        </div>
                      </div>
                      <div style={{ marginBottom: '2px' }}>
                        <Text
                          style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            color: '#262626',
                          }}
                        >
                          {alert.title}
                        </Text>
                      </div>
                      <div style={{ marginBottom: '3px' }}>
                        <Text
                          style={{
                            fontSize: '8px',
                            color: '#8c8c8c',
                            lineHeight: '1.3',
                          }}
                        >
                          {alert.description.length > 60
                            ? `${alert.description.substring(0, 60)}...`
                            : alert.description}
                        </Text>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 2 }}>
                          <Tag
                            size='small'
                            style={{
                              fontSize: '7px',
                              margin: 0,
                              padding: '0 4px',
                            }}
                          >
                            {alert.source}
                          </Tag>
                          {alert.assignee && (
                            <Tag
                              color='blue'
                              size='small'
                              style={{
                                fontSize: '7px',
                                margin: 0,
                                padding: '0 4px',
                              }}
                            >
                              {alert.assignee}
                            </Tag>
                          )}
                        </div>
                        <Text style={{ fontSize: '7px', color: '#bfbfbf' }}>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                  ))}
                  {securitySummary.activeAlerts.length > 3 && (
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                      <Text style={{ fontSize: '8px', color: '#8c8c8c' }}>
                        +{securitySummary.activeAlerts.length - 3}개 더 있음
                      </Text>
                    </div>
                  )}
                </Space>
              </div>
            </div>
          )}
      </Space>
    </Card>
  );
};

export default SecurityVulnerabilities;
