/**
 * SCA Result Content Component
 * SCA(의존성 분석) 결과를 표시하는 컴포넌트
 */

import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Empty, Typography } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
// Note: Space was previously imported but is not used in this file
import type { ScaResult, Vulnerability } from '../../../types/securityAnalysis';
import { getSeverityColor } from '../../../utils/securityHelpers';

const { Text } = Typography;

export interface ScaResultContentProps {
  result: ScaResult | null;
  loading?: boolean;
}

export const ScaResultContent: React.FC<ScaResultContentProps> = ({
  result,
  loading: _loading = false,
}) => {
  // 취약점 통계 계산
  const stats = useMemo(() => {
    if (!result?.summary) return null;

    const { severity_breakdown } = result.summary;
    return {
      total: result.summary.total_vulnerabilities || 0,
      high: severity_breakdown.high || 0,
      medium: severity_breakdown.medium || 0,
      low: severity_breakdown.low || 0,
      info: severity_breakdown.info || 0,
    };
  }, [result]);

  // 데이터 없음
  if (!result || !stats) {
    return (
      <Empty
        image={
          <ExperimentOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />
        }
        description={
          <div>
            <Text style={{ color: '#8c8c8c', fontSize: 14 }}>
              SCA 분석 결과가 없습니다
            </Text>
            <br />
            <Text type='secondary' style={{ fontSize: 12 }}>
              스캔을 실행하여 의존성 취약점을 분석해보세요
            </Text>
          </div>
        }
      />
    );
  }

  return (
    <div>
      {/* 요약 카드 */}
      <Card title='취약점 요약' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title='총 취약점'
              value={stats.total}
              valueStyle={{
                color: stats.total > 0 ? '#ff4d4f' : '#52c41a',
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='HIGH'
              value={stats.high}
              valueStyle={{ color: getSeverityColor('high') }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='MEDIUM'
              value={stats.medium}
              valueStyle={{ color: getSeverityColor('medium') }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='LOW'
              value={stats.low}
              valueStyle={{ color: getSeverityColor('low') }}
            />
          </Col>
        </Row>
      </Card>

      {/* 취약점 목록 */}
      <Card title='발견된 취약점 목록' size='small'>
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {result.vulnerabilities && result.vulnerabilities.length > 0 ? (
            result.vulnerabilities.map((vuln: Vulnerability, index: number) => (
              <Card
                key={index}
                size='small'
                style={{ marginBottom: 8 }}
                title={`취약점 #${index + 1}: ${vuln.cve || vuln.name}`}
              >
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>패키지:</strong> {vuln.name} ({vuln.version})
                  </p>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={getSeverityColor(vuln.severity)}>
                      {vuln.severity.toUpperCase()}
                    </Tag>
                    {vuln.cve && <Tag color='purple'>{vuln.cve}</Tag>}
                  </div>

                  {vuln.description && (
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        marginTop: 4,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        <strong>설명:</strong> {vuln.description}
                      </p>
                    </div>
                  )}

                  {vuln.fixed_version && (
                    <div
                      style={{
                        backgroundColor: '#f6ffed',
                        padding: 8,
                        borderRadius: 4,
                        marginTop: 4,
                        border: '1px solid #b7eb8f',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        <strong>수정 버전:</strong> {vuln.fixed_version}
                      </p>
                    </div>
                  )}

                  {vuln.references && vuln.references.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text strong style={{ fontSize: '12px' }}>
                        참고 링크:
                      </Text>
                      {vuln.references.slice(0, 3).map((ref, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '11px',
                            color: '#1890ff',
                            marginTop: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#f0f8ff',
                            borderRadius: '3px',
                          }}
                        >
                          <a
                            href={ref}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{ color: '#1890ff' }}
                          >
                            {ref}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#666',
              }}
            >
              <ExperimentOutlined
                style={{ fontSize: '48px', marginBottom: '16px' }}
              />
              <p>발견된 취약점이 없습니다.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ScaResultContent;
