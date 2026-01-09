/**
 * SeveritySummaryCard - 통일된 심각도 요약 카드 컴포넌트
 *
 * SAST, SCA, DAST 모든 보안 분석 결과에서 동일한 스타일로
 * 심각도별 취약점 개수를 표시합니다.
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  Space,
  Tooltip,
} from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  BugOutlined,
} from '@ant-design/icons';
import {
  SeverityLevel,
  severityColors,
  severityLabels,
  severityOrder,
  cardStyles,
  statisticStyles,
  spacing,
  borderRadius,
  formatNumber,
} from './securityTheme';

const { Text } = Typography;

/**
 * 심각도별 아이콘 매핑
 */
const severityIcons: Record<SeverityLevel, React.ReactNode> = {
  critical: <ExclamationCircleOutlined />,
  high: <WarningOutlined />,
  medium: <WarningOutlined />,
  low: <InfoCircleOutlined />,
  info: <CheckCircleOutlined />,
};

/**
 * 심각도 통계 데이터 타입
 */
export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info?: number;
}

interface SeveritySummaryCardProps {
  /** 심각도별 취약점 개수 */
  counts: SeverityCounts;
  /** 전체 취약점 수 (자동 계산하지 않고 직접 지정할 경우) */
  total?: number;
  /** 표시할 심각도 레벨들 (기본값: critical, high, medium, low) */
  visibleLevels?: SeverityLevel[];
  /** 프로그레스 바 표시 여부 */
  showProgress?: boolean;
  /** 카드 크기 */
  size?: 'default' | 'small';
  /** Col span (기본값: 6) */
  colSpan?: number;
  /** 추가 스타일 */
  style?: React.CSSProperties;
}

/**
 * 개별 심각도 카드 컴포넌트
 */
interface SingleSeverityCardProps {
  severity: SeverityLevel;
  count: number;
  total: number;
  showProgress: boolean;
  size: 'default' | 'small';
}

const SingleSeverityCard: React.FC<SingleSeverityCardProps> = ({
  severity,
  count,
  total,
  showProgress,
  size,
}) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = severityColors[severity];
  const styles = cardStyles.severitySummary(severity);

  return (
    <Card size='small' style={styles} hoverable>
      <Space
        direction='vertical'
        size={size === 'small' ? 4 : 8}
        style={{ width: '100%' }}
      >
        <Space size={4}>
          <span
            style={{
              color: colors.primary,
              fontSize: size === 'small' ? 14 : 16,
            }}
          >
            {severityIcons[severity]}
          </span>
          <Text strong style={statisticStyles.severityTitle(severity)}>
            {severityLabels[severity]}
          </Text>
        </Space>

        <Statistic
          value={count}
          valueStyle={{
            ...statisticStyles.severityValue(severity),
            fontSize: size === 'small' ? 24 : 28,
          }}
          formatter={value => formatNumber(Number(value))}
        />

        {showProgress && total > 0 && (
          <Tooltip title={`전체 ${total}건 중 ${percentage}%`}>
            <Progress
              percent={percentage}
              size='small'
              strokeColor={colors.primary}
              trailColor={colors.light}
              showInfo={false}
              style={{ marginTop: 4 }}
            />
          </Tooltip>
        )}
      </Space>
    </Card>
  );
};

/**
 * 심각도 요약 카드 그리드 컴포넌트
 */
export const SeveritySummaryCard: React.FC<SeveritySummaryCardProps> = ({
  counts,
  total: propTotal,
  visibleLevels = ['critical', 'high', 'medium', 'low'],
  showProgress = false,
  size = 'default',
  colSpan = 6,
  style,
}) => {
  // 전체 개수 계산
  const calculatedTotal =
    counts.critical +
    counts.high +
    counts.medium +
    counts.low +
    (counts.info || 0);
  const total = propTotal ?? calculatedTotal;

  return (
    <Row gutter={[spacing.lg, spacing.lg]} style={style}>
      {visibleLevels.map(severity => {
        const count = severity === 'info' ? counts.info || 0 : counts[severity];
        return (
          <Col key={severity} span={colSpan}>
            <SingleSeverityCard
              severity={severity}
              count={count}
              total={total}
              showProgress={showProgress}
              size={size}
            />
          </Col>
        );
      })}
    </Row>
  );
};

/**
 * 전체 취약점 요약 헤더 컴포넌트
 * 총 취약점 수와 심각도 분포를 간략하게 표시
 */
interface VulnerabilitySummaryHeaderProps {
  counts: SeverityCounts;
  title?: string;
  showIcon?: boolean;
}

export const VulnerabilitySummaryHeader: React.FC<
  VulnerabilitySummaryHeaderProps
> = ({ counts, title = '취약점 요약', showIcon = true }) => {
  const total =
    counts.critical +
    counts.high +
    counts.medium +
    counts.low +
    (counts.info || 0);

  return (
    <Card
      size='small'
      style={{
        borderRadius: borderRadius.lg,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        marginBottom: spacing.lg,
      }}
    >
      <Row align='middle' justify='space-between'>
        <Col>
          <Space>
            {showIcon && (
              <BugOutlined style={{ fontSize: 24, color: '#fff' }} />
            )}
            <div>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                {title}
              </Text>
              <div>
                <Text
                  style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}
                >
                  {formatNumber(total)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 8 }}>
                  건
                </Text>
              </div>
            </div>
          </Space>
        </Col>

        <Col>
          <Space size={spacing.lg}>
            {severityOrder.slice(0, 4).map(severity => {
              const count = counts[severity as keyof SeverityCounts] || 0;
              if (count === 0) return null;
              return (
                <Tooltip key={severity} title={severityLabels[severity]}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: 14,
                        }}
                      >
                        {count > 99 ? '99+' : count}
                      </Text>
                    </div>
                    <Text
                      style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                    >
                      {severityLabels[severity]}
                    </Text>
                  </div>
                </Tooltip>
              );
            })}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default SeveritySummaryCard;
