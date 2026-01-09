/**
 * License Risk Summary Component
 *
 * 라이선스 위험도 요약을 표시하는 컴포넌트
 * - 카테고리별 라이선스 분포
 * - 위험도별 분포
 * - 검토 필요 항목 통계
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Typography,
  Space,
  Tooltip,
  Alert,
} from 'antd';
import {
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type {
  LicenseSummary,
  LicenseCategory,
  LicenseRiskLevel,
} from '../../../types/securityAnalysis';
import {
  LICENSE_CATEGORY_INFO,
  LICENSE_RISK_COLORS,
  LICENSE_RISK_LABELS,
} from '../../../types/securityAnalysis';

const { Text, Title } = Typography;

interface LicenseRiskSummaryProps {
  summary: LicenseSummary;
  loading?: boolean;
  compact?: boolean;
}

/**
 * 위험도 아이콘 반환
 */
const getRiskIcon = (risk: LicenseRiskLevel) => {
  switch (risk) {
    case 'critical':
      return (
        <ExclamationCircleOutlined
          style={{ color: LICENSE_RISK_COLORS.critical }}
        />
      );
    case 'high':
      return <WarningOutlined style={{ color: LICENSE_RISK_COLORS.high }} />;
    case 'medium':
      return (
        <QuestionCircleOutlined style={{ color: LICENSE_RISK_COLORS.medium }} />
      );
    case 'low':
      return <CheckCircleOutlined style={{ color: LICENSE_RISK_COLORS.low }} />;
    default:
      return null;
  }
};

/**
 * 카테고리별 도넛 차트 컴포넌트
 */
const CategoryDonut: React.FC<{ summary: LicenseSummary }> = ({ summary }) => {
  const total =
    summary.total_licenses ||
    Object.values(summary.by_category).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return <Text type='secondary'>라이선스 정보 없음</Text>;
  }

  const categories = Object.entries(summary.by_category)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 진행 바 형태로 표시 */}
      <div style={{ marginBottom: 16 }}>
        {categories.map(([category, count]) => {
          const info = LICENSE_CATEGORY_INFO[category as LicenseCategory];
          const percent = Math.round((count / total) * 100);
          return (
            <div key={category} style={{ marginBottom: 12 }}>
              <Row
                justify='space-between'
                align='middle'
                style={{ marginBottom: 4 }}
              >
                <Col>
                  <Space size={8}>
                    <Text style={{ fontSize: 16 }}>{info?.icon}</Text>
                    <Text strong>{info?.labelKo || category}</Text>
                  </Space>
                </Col>
                <Col>
                  <Text type='secondary'>
                    {count}개 ({percent}%)
                  </Text>
                </Col>
              </Row>
              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={info?.color || '#8c8c8c'}
                trailColor='#f0f0f0'
                size='small'
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 위험도 요약 표시
 */
const RiskBreakdown: React.FC<{ summary: LicenseSummary }> = ({ summary }) => {
  const risks = (['critical', 'high', 'medium', 'low'] as LicenseRiskLevel[])
    .map(risk => ({
      risk,
      count: summary.by_risk?.[risk] || 0,
      label: LICENSE_RISK_LABELS[risk],
      color: LICENSE_RISK_COLORS[risk],
    }))
    .filter(r => r.count > 0 || r.risk === 'critical' || r.risk === 'high');

  return (
    <Row gutter={[16, 16]}>
      {risks.map(({ risk, count, label, color }) => (
        <Col span={12} key={risk}>
          <Card size='small' style={{ borderLeft: `3px solid ${color}` }}>
            <Statistic
              title={
                <Space size={4}>
                  {getRiskIcon(risk)}
                  <span>{label} 위험</span>
                </Space>
              }
              value={count}
              valueStyle={{ color, fontSize: 24 }}
              suffix='개'
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export const LicenseRiskSummary: React.FC<LicenseRiskSummaryProps> = ({
  summary,
  loading = false,
  compact = false,
}) => {
  const total =
    summary.total_licenses ||
    Object.values(summary.by_category).reduce((a, b) => a + b, 0);
  const needsReview = summary.needs_review || 0;

  // 위험도 높은 라이선스 수 계산
  const highRiskCount =
    (summary.by_risk?.critical || 0) + (summary.by_risk?.high || 0);
  const hasHighRisk = highRiskCount > 0;

  if (compact) {
    // 컴팩트 모드 - 간단한 요약만 표시
    return (
      <Card loading={loading} size='small'>
        <Row gutter={16} align='middle'>
          <Col>
            <Statistic
              title='총 라이선스'
              value={total}
              prefix={<SafetyCertificateOutlined />}
            />
          </Col>
          {hasHighRisk && (
            <Col>
              <Statistic
                title='위험 라이선스'
                value={highRiskCount}
                valueStyle={{ color: LICENSE_RISK_COLORS.critical }}
                prefix={<WarningOutlined />}
              />
            </Col>
          )}
          {needsReview > 0 && (
            <Col>
              <Statistic
                title='검토 필요'
                value={needsReview}
                valueStyle={{ color: '#faad14' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
          )}
        </Row>
      </Card>
    );
  }

  return (
    <Card loading={loading} size='small'>
      {/* 경고 알림 */}
      {hasHighRisk && (
        <Alert
          message='주의 필요'
          description={`${highRiskCount}개의 라이선스가 높은 위험도로 분류되었습니다. 검토가 필요합니다.`}
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 헤더 */}
      <Row justify='space-between' align='middle' style={{ marginBottom: 16 }}>
        <Col>
          <Space size={8}>
            <SafetyCertificateOutlined
              style={{ fontSize: 20, color: '#1890ff' }}
            />
            <Title level={5} style={{ margin: 0 }}>
              라이선스 분석 요약
            </Title>
          </Space>
        </Col>
        <Col>
          <Space size={12}>
            <Statistic
              title='총 라이선스'
              value={total}
              valueStyle={{ fontSize: 16 }}
            />
            {needsReview > 0 && (
              <Tag color='warning' icon={<ExclamationCircleOutlined />}>
                {needsReview}개 검토 필요
              </Tag>
            )}
          </Space>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* 카테고리별 분포 */}
        <Col xs={24} lg={14}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            카테고리별 분포
          </Text>
          <CategoryDonut summary={summary} />

          {/* 카테고리 범례 */}
          <div
            style={{
              marginTop: 16,
              padding: '12px',
              background: '#fafafa',
              borderRadius: 4,
            }}
          >
            <Row gutter={[8, 8]}>
              {Object.entries(LICENSE_CATEGORY_INFO).map(([key, info]) => (
                <Col key={key} xs={12} sm={8}>
                  <Tooltip title={info.description}>
                    <Tag
                      style={{
                        backgroundColor: info.bgColor,
                        borderColor: info.color,
                        color: info.color,
                        cursor: 'help',
                      }}
                    >
                      {info.icon} {info.labelKo}
                    </Tag>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </div>
        </Col>

        {/* 위험도별 요약 */}
        <Col xs={24} lg={10}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            위험도별 현황
          </Text>
          <RiskBreakdown summary={summary} />

          {/* 위험도 설명 */}
          <div style={{ marginTop: 16 }}>
            <Alert
              message='위험도 기준'
              description={
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  <li>
                    <Text style={{ color: LICENSE_RISK_COLORS.critical }}>
                      심각
                    </Text>
                    : 상업용/독점 라이선스, 비용 발생 가능
                  </li>
                  <li>
                    <Text style={{ color: LICENSE_RISK_COLORS.high }}>
                      높음
                    </Text>
                    : 강한 카피레프트, 소스 공개 필요
                  </li>
                  <li>
                    <Text style={{ color: LICENSE_RISK_COLORS.medium }}>
                      보통
                    </Text>
                    : 약한 카피레프트/미확인
                  </li>
                  <li>
                    <Text style={{ color: LICENSE_RISK_COLORS.low }}>낮음</Text>
                    : 허용적 라이선스
                  </li>
                </ul>
              }
              type='info'
              showIcon
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default LicenseRiskSummary;
