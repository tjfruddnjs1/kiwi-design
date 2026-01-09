/**
 * DAST Result Content Component
 * DAST(동적 분석) 결과를 표시하는 컴포넌트
 */

import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Empty, Typography } from 'antd';
import { SecurityScanOutlined } from '@ant-design/icons';
import type { DastResult, Alert } from '../../../types/securityAnalysis';
import { getSeverityColor } from '../../../utils/securityHelpers';

const { Text } = Typography;

export interface DastResultContentProps {
  result: DastResult | null;
  loading?: boolean;
}

/**
 * 리스크 코드를 색상으로 변환
 */
const getRiskColor = (riskCode: string): string => {
  switch (riskCode) {
    case '4':
      return 'red'; // Critical
    case '3':
      return 'red'; // High
    case '2':
      return 'orange'; // Medium
    case '1':
      return 'blue'; // Low
    case '0':
      return 'green'; // Info
    default:
      return 'default';
  }
};

/**
 * 리스크 코드를 텍스트로 변환
 */
const getRiskText = (riskCode: string): string => {
  switch (riskCode) {
    case '4':
      return 'Critical';
    case '3':
      return 'High';
    case '2':
      return 'Medium';
    case '1':
      return 'Low';
    case '0':
      return 'Info';
    default:
      return 'Unknown';
  }
};

export const DastResultContent: React.FC<DastResultContentProps> = ({
  result,
  loading: _loading = false,
}) => {
  // 통계 계산
  const stats = useMemo(() => {
    if (!result?.summary) return null;

    return {
      total: result.summary.total_alerts || 0,
      high: result.summary.high_alerts || 0,
      medium: result.summary.medium_alerts || 0,
      low: result.summary.low_alerts || 0,
      info: result.summary.info_alerts || 0,
    };
  }, [result]);

  // 알림 목록
  const alerts = useMemo(() => {
    return result?.alerts || [];
  }, [result]);

  // 데이터 없음
  if (!result || !stats) {
    return (
      <Empty
        image={
          <SecurityScanOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />
        }
        description={
          <div>
            <Text style={{ color: '#8c8c8c', fontSize: 14 }}>
              DAST 분석 결과가 없습니다
            </Text>
            <br />
            <Text type='secondary' style={{ fontSize: 12 }}>
              스캔을 실행하여 웹 애플리케이션 취약점을 분석해보세요
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
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic
              title='총 알림'
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

      {/* 주요 테스트 결과 */}
      <Card title='침투 테스트 결과' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background:
                  alerts.filter((a: Alert) =>
                    a.name.toLowerCase().includes('sql')
                  ).length > 0
                    ? '#fff1f0'
                    : '#f6ffed',
                border: `1px solid ${
                  alerts.filter((a: Alert) =>
                    a.name.toLowerCase().includes('sql')
                  ).length > 0
                    ? '#ffa39e'
                    : '#b7eb8f'
                }`,
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#595959',
                  marginBottom: '8px',
                }}
              >
                SQL Injection
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
              >
                {alerts.filter((a: Alert) =>
                  a.name.toLowerCase().includes('sql')
                ).length > 0
                  ? '발견됨'
                  : '안전'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {
                  alerts.filter((a: Alert) =>
                    a.name.toLowerCase().includes('sql')
                  ).length
                }
                개 알림
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background:
                  alerts.filter(
                    (a: Alert) =>
                      a.name.toLowerCase().includes('cross site scripting') ||
                      a.name.toLowerCase().includes('xss')
                  ).length > 0
                    ? '#fff1f0'
                    : '#f6ffed',
                border: `1px solid ${
                  alerts.filter(
                    (a: Alert) =>
                      a.name.toLowerCase().includes('cross site scripting') ||
                      a.name.toLowerCase().includes('xss')
                  ).length > 0
                    ? '#ffa39e'
                    : '#b7eb8f'
                }`,
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#595959',
                  marginBottom: '8px',
                }}
              >
                XSS (Cross-Site Scripting)
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
              >
                {alerts.filter(
                  (a: Alert) =>
                    a.name.toLowerCase().includes('cross site scripting') ||
                    a.name.toLowerCase().includes('xss')
                ).length > 0
                  ? '발견됨'
                  : '안전'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {
                  alerts.filter(
                    (a: Alert) =>
                      a.name.toLowerCase().includes('cross site scripting') ||
                      a.name.toLowerCase().includes('xss')
                  ).length
                }
                개 알림
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background:
                  alerts.filter(
                    (a: Alert) =>
                      a.name.toLowerCase().includes('auth') ||
                      a.name.toLowerCase().includes('session') ||
                      a.name.toLowerCase().includes('cookie')
                  ).length > 0
                    ? '#fff1f0'
                    : '#f6ffed',
                border: `1px solid ${
                  alerts.filter(
                    (a: Alert) =>
                      a.name.toLowerCase().includes('auth') ||
                      a.name.toLowerCase().includes('session') ||
                      a.name.toLowerCase().includes('cookie')
                  ).length > 0
                    ? '#ffa39e'
                    : '#b7eb8f'
                }`,
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#595959',
                  marginBottom: '8px',
                }}
              >
                인증/세션 보안
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
              >
                {alerts.filter(
                  (a: Alert) =>
                    a.name.toLowerCase().includes('auth') ||
                    a.name.toLowerCase().includes('session') ||
                    a.name.toLowerCase().includes('cookie')
                ).length > 0
                  ? '취약점 발견'
                  : '안전'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {
                  alerts.filter(
                    (a: Alert) =>
                      a.name.toLowerCase().includes('auth') ||
                      a.name.toLowerCase().includes('session') ||
                      a.name.toLowerCase().includes('cookie')
                  ).length
                }
                개 알림
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 보안 알림 목록 */}
      <Card title='발견된 보안 알림 목록' size='small'>
        <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
          {alerts.length > 0 ? (
            alerts.map((alert: Alert, index: number) => (
              <Card
                key={index}
                size='small'
                style={{ marginBottom: 8 }}
                title={`알림 #${index + 1}: ${alert.name}`}
              >
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>플러그인 ID:</strong> {alert.pluginid}
                  </p>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={getRiskColor(alert.riskcode)}>
                      {getRiskText(alert.riskcode)}
                    </Tag>
                    <Tag color='purple'>CWE-{alert.cweid}</Tag>
                    <Tag color='blue'>WASC-{alert.wascid}</Tag>
                  </div>

                  {alert.description && (
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        marginTop: 4,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        <strong>설명:</strong> {alert.description}
                      </p>
                    </div>
                  )}

                  {alert.solution && (
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
                        <strong>해결 방법:</strong> {alert.solution}
                      </p>
                    </div>
                  )}

                  {alert.instances && alert.instances.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text strong style={{ fontSize: '12px' }}>
                        발견된 위치:
                      </Text>
                      {alert.instances.map((instance, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '11px',
                            color: '#666',
                            marginTop: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#fafafa',
                            borderRadius: '3px',
                          }}
                        >
                          {instance.method} {instance.uri}
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
              <SecurityScanOutlined
                style={{ fontSize: '48px', marginBottom: '16px' }}
              />
              <p>발견된 보안 알림이 없습니다.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DastResultContent;
