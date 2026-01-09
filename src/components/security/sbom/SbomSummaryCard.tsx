/**
 * SBOM Summary Card Component
 *
 * SBOM(Software Bill of Materials) 요약 정보를 표시하는 카드 컴포넌트
 * - 포맷 및 스펙 버전 정보
 * - 총 컴포넌트/의존성 수
 * - 라이선스 요약 (있는 경우)
 * - 생성 일시
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Typography,
  Space,
  Tooltip,
  Divider,
} from 'antd';
import {
  FileSearchOutlined,
  PartitionOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type {
  SbomResult,
  LicenseSummary,
} from '../../../types/securityAnalysis';
import {
  SBOM_TYPE_LABELS,
  LICENSE_CATEGORY_INFO,
  LICENSE_RISK_COLORS,
} from '../../../types/securityAnalysis';

const { Text, Title } = Typography;

interface SbomSummaryCardProps {
  sbom: SbomResult;
  loading?: boolean;
  onDownload?: () => void;
}

/**
 * 라이선스 요약 미니 차트 컴포넌트
 */
const LicenseMiniChart: React.FC<{ summary: LicenseSummary }> = ({
  summary,
}) => {
  const categories = Object.entries(summary.by_category)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (categories.length === 0) {
    return <Text type='secondary'>라이선스 정보 없음</Text>;
  }

  const total = categories.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Space direction='vertical' size={4} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 2,
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {categories.map(([category, count]) => {
          const info =
            LICENSE_CATEGORY_INFO[
              category as keyof typeof LICENSE_CATEGORY_INFO
            ];
          const widthPercent = (count / total) * 100;
          return (
            <Tooltip
              key={category}
              title={`${info?.labelKo || category}: ${count}`}
            >
              <div
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: info?.color || '#8c8c8c',
                  minWidth: 4,
                }}
              />
            </Tooltip>
          );
        })}
      </div>
      <Row gutter={[8, 4]}>
        {categories.slice(0, 4).map(([category, count]) => {
          const info =
            LICENSE_CATEGORY_INFO[
              category as keyof typeof LICENSE_CATEGORY_INFO
            ];
          return (
            <Col key={category}>
              <Tag color={info?.color || 'default'} style={{ margin: 0 }}>
                {info?.icon} {info?.labelKo || category}: {count}
              </Tag>
            </Col>
          );
        })}
      </Row>
    </Space>
  );
};

/**
 * 위험도 요약 표시 컴포넌트
 */
const RiskSummary: React.FC<{ summary: LicenseSummary }> = ({ summary }) => {
  const risks = Object.entries(summary.by_risk || {})
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (order[a as keyof typeof order] || 4) -
        (order[b as keyof typeof order] || 4)
      );
    });

  if (risks.length === 0) {
    return null;
  }

  return (
    <Space size={4}>
      {risks.map(([risk, count]) => (
        <Tag
          key={risk}
          color={
            LICENSE_RISK_COLORS[risk as keyof typeof LICENSE_RISK_COLORS] ||
            'default'
          }
          style={{ margin: 0 }}
        >
          {risk}: {count}
        </Tag>
      ))}
    </Space>
  );
};

export const SbomSummaryCard: React.FC<SbomSummaryCardProps> = ({
  sbom,
  loading = false,
}) => {
  const { summary, license_summary, sbom_type, target_name, created_at } =
    sbom || {};

  // summary가 없으면 설명 표시
  if (!summary) {
    return (
      <Card size='small'>
        <Space direction='vertical' size={12} style={{ width: '100%' }}>
          <div>
            <FileSearchOutlined
              style={{ fontSize: 20, color: '#1890ff', marginRight: 8 }}
            />
            <Text strong style={{ fontSize: 16 }}>
              SBOM/라이선스 분석이란?
            </Text>
          </div>
          <div style={{ paddingLeft: 28 }}>
            <Space direction='vertical' size={8}>
              <div>
                <SafetyCertificateOutlined
                  style={{ color: '#52c41a', marginRight: 6 }}
                />
                <Text>
                  <Text strong>SBOM(Software Bill of Materials)</Text>은
                  소프트웨어 구성요소 목록입니다.
                </Text>
              </div>
              <Text type='secondary' style={{ fontSize: 12, display: 'block' }}>
                컨테이너 이미지나 소스코드에 포함된 모든 패키지, 라이브러리,
                의존성 정보를 CycloneDX 형식으로 제공합니다.
              </Text>
              <div style={{ marginTop: 8 }}>
                <InfoCircleOutlined
                  style={{ color: '#1890ff', marginRight: 6 }}
                />
                <Text>
                  <Text strong>라이선스 분석</Text>은 각 구성요소의 라이선스
                  정보와 위험도를 분석합니다.
                </Text>
              </div>
              <Text type='secondary' style={{ fontSize: 12, display: 'block' }}>
                SBOM 생성 옵션을 활성화하면, 취약점 분석과 함께 SBOM 및 라이선스
                정보가 자동으로 생성됩니다.
              </Text>
            </Space>
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <Card
      loading={loading}
      size='small'
      styles={{
        body: { padding: 16 },
      }}
    >
      {/* 헤더 */}
      <Row justify='space-between' align='middle' style={{ marginBottom: 16 }}>
        <Col>
          <Space size={8}>
            <FileSearchOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0 }}>
              SBOM 요약
            </Title>
            <Tag color='blue'>
              {summary.format || 'Unknown'} {summary.spec_version || '-'}
            </Tag>
            <Tag color={sbom_type === 'image' ? 'purple' : 'cyan'}>
              {sbom_type ? SBOM_TYPE_LABELS[sbom_type] : '-'}
            </Tag>
          </Space>
        </Col>
        <Col>
          <Tooltip title='생성 일시'>
            <Space size={4}>
              <ClockCircleOutlined />
              <Text type='secondary'>
                {created_at
                  ? new Date(created_at).toLocaleString('ko-KR')
                  : '-'}
              </Text>
            </Space>
          </Tooltip>
        </Col>
      </Row>

      {/* 타겟 정보 */}
      {target_name && (
        <div
          style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: 4,
          }}
        >
          <Text strong>대상: </Text>
          <Text code>{target_name}</Text>
        </div>
      )}

      {/* 통계 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Statistic
            title={
              <Space size={4}>
                <PartitionOutlined />
                <span>총 컴포넌트</span>
              </Space>
            }
            value={summary.total_components || 0}
            valueStyle={{ color: '#1890ff', fontSize: 28 }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title={
              <Space size={4}>
                <PartitionOutlined style={{ transform: 'rotate(90deg)' }} />
                <span>총 의존성</span>
              </Space>
            }
            value={summary.total_dependencies || 0}
            valueStyle={{ color: '#722ed1', fontSize: 28 }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title={
              <Space size={4}>
                <SafetyCertificateOutlined />
                <span>라이선스</span>
              </Space>
            }
            value={license_summary?.total_licenses || '-'}
            valueStyle={{ color: '#52c41a', fontSize: 28 }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title={
              <Space size={4}>
                <InfoCircleOutlined />
                <span>검토 필요</span>
              </Space>
            }
            value={license_summary?.needs_review || 0}
            valueStyle={{
              color:
                (license_summary?.needs_review || 0) > 0
                  ? '#faad14'
                  : '#52c41a',
              fontSize: 28,
            }}
          />
        </Col>
      </Row>

      {/* 라이선스 요약 */}
      {license_summary && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Row gutter={[16, 16]}>
            <Col span={16}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                라이선스 분포
              </Text>
              <LicenseMiniChart summary={license_summary} />
            </Col>
            <Col span={8}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                위험도 분포
              </Text>
              <RiskSummary summary={license_summary} />
            </Col>
          </Row>
        </>
      )}

      {/* UUID 정보 (있는 경우) */}
      {summary.sbom_uuid && (
        <div style={{ marginTop: 16 }}>
          <Text type='secondary' style={{ fontSize: 12 }}>
            SBOM UUID:{' '}
            <Text copyable style={{ fontSize: 12 }}>
              {summary.sbom_uuid}
            </Text>
          </Text>
        </div>
      )}
    </Card>
  );
};

export default SbomSummaryCard;
