import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Tabs,
  Typography,
  Empty,
  Table,
} from 'antd';
import {
  ExperimentOutlined,
  BugOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type {
  ScaResult,
  Vulnerability,
  TrivyVulnerability,
} from '../../../../types/securityAnalysis';

const { Text } = Typography;
const { TabPane } = Tabs;

// 타입 가드: Vulnerability 타입인지 확인
function isVulnerability(
  v: Vulnerability | TrivyVulnerability
): v is Vulnerability {
  return 'name' in v && 'version' in v && 'fix_available' in v;
}

// 정규화된 취약점 인터페이스
interface NormalizedVulnerability {
  key: string;
  cve: string;
  name: string;
  version: string;
  severity: string;
  description: string;
  fix_available: boolean;
  fixed_version?: string;
}

// 취약점을 정규화된 형태로 변환
function normalizeVulnerability(
  v: Vulnerability | TrivyVulnerability,
  index: number
): NormalizedVulnerability {
  if (isVulnerability(v)) {
    return {
      key: `vuln-${index}`,
      cve: v.cve || '',
      name: v.name,
      version: v.version,
      severity: v.severity.toLowerCase(),
      description: v.description,
      fix_available: v.fix_available,
      fixed_version: v.fixed_version,
    };
  } else {
    return {
      key: `vuln-${index}`,
      cve: v.vulnerability_id,
      name: v.pkg_name,
      version: v.installed_version,
      severity: v.severity.toLowerCase(),
      description: v.description,
      fix_available: !!v.fixed_version,
      fixed_version: v.fixed_version,
    };
  }
}

interface ScaResultContentProps {
  scaResult: ScaResult | null;
  loading?: boolean;
  showTabs?: boolean; //  [추가] 탭 표시 여부 (기본값: true)
}

/**
 * SCA 분석 결과 표시 컴포넌트
 * PipelineStageDetailModal의 SCA 탭 및 독립 모달에서 재사용
 */
const ScaResultContent: React.FC<ScaResultContentProps> = ({
  scaResult,
  loading: _loading = false,
  showTabs = true, //  [추가] 기본값은 true (탭 표시)
}) => {
  const [activeTab, setActiveTab] = useState<string>('summary');

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'red';
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'CVE',
      dataIndex: 'cve',
      key: 'cve',
      width: 150,
      render: (cve: string) => (
        <Text code style={{ fontSize: '11px' }}>
          {cve}
        </Text>
      ),
    },
    {
      title: '패키지',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '현재 버전',
      dataIndex: 'version',
      key: 'version',
      width: 120,
    },
    {
      title: '심각도',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity?.toUpperCase()}</Tag>
      ),
    },
    {
      title: '수정 가능',
      dataIndex: 'fix_available',
      key: 'fix_available',
      width: 100,
      align: 'center' as const,
      render: (fix: boolean, record: NormalizedVulnerability) => {
        if (fix && record.fixed_version) {
          return (
            <div>
              <CheckCircleOutlined
                style={{ color: '#52c41a', marginRight: 4 }}
              />
              <Text style={{ fontSize: '11px' }}>{record.fixed_version}</Text>
            </div>
          );
        }
        return <WarningOutlined style={{ color: '#faad14' }} />;
      },
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: desc }}>
          {desc}
        </Text>
      ),
    },
  ];

  if (
    !scaResult ||
    !scaResult.summary ||
    !scaResult.summary.severity_breakdown
  ) {
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
              스캔을 실행하여 이미지 취약점을 분석해보세요
            </Text>
          </div>
        }
      />
    );
  }

  // 안전한 접근을 위한 기본값
  const severityBreakdown = scaResult.summary.severity_breakdown || {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  // 취약점 데이터 정규화
  const normalizedVulnerabilities: NormalizedVulnerability[] =
    scaResult.vulnerabilities.map((v, index) =>
      normalizeVulnerability(v, index)
    );

  //  [추가] 요약 콘텐츠 렌더링 함수
  const renderSummaryContent = () => (
    <>
      {/* 취약점 요약 */}
      <Card title='취약점 요약' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic
              title='총 취약점'
              value={scaResult.summary.total_vulnerabilities}
              valueStyle={{
                color:
                  scaResult.summary.total_vulnerabilities > 0
                    ? '#ff4d4f'
                    : '#52c41a',
              }}
              prefix={<BugOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='HIGH'
              value={severityBreakdown.high}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='MEDIUM'
              value={severityBreakdown.medium}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='LOW'
              value={severityBreakdown.low}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 수정 가능 취약점 */}
      <Card title='수정 정보' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#52c41a',
                }}
              >
                {normalizedVulnerabilities.filter(v => v.fix_available).length}
              </div>
              <div
                style={{ fontSize: '14px', color: '#595959', marginTop: '8px' }}
              >
                <CheckCircleOutlined style={{ marginRight: '4px' }} />
                수정 가능한 취약점
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: '#fff1f0',
                border: '1px solid #ffa39e',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#ff4d4f',
                }}
              >
                {normalizedVulnerabilities.filter(v => !v.fix_available).length}
              </div>
              <div
                style={{ fontSize: '14px', color: '#595959', marginTop: '8px' }}
              >
                <WarningOutlined style={{ marginRight: '4px' }} />
                수정 불가능한 취약점
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 주요 취약점 (HIGH 이상) */}
      {normalizedVulnerabilities.filter(
        v => v.severity === 'high' || v.severity === 'critical'
      ).length > 0 && (
        <Card title='주요 취약점 (HIGH 이상)' size='small'>
          <Table
            dataSource={normalizedVulnerabilities
              .filter(v => v.severity === 'high' || v.severity === 'critical')
              .slice(0, 5)}
            columns={columns}
            size='small'
            pagination={false}
            scroll={{ x: 'max-content' }}
            rowKey='key'
          />
        </Card>
      )}
    </>
  );

  //  [수정] showTabs가 false면 요약만 표시
  if (!showTabs) {
    return <div>{renderSummaryContent()}</div>;
  }

  // showTabs가 true면 기존처럼 탭으로 표시
  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab}>
      {/* 요약 탭 */}
      <TabPane tab='요약' key='summary'>
        {renderSummaryContent()}
      </TabPane>

      {/* 상세 결과 탭 */}
      <TabPane tab='상세 결과' key='details'>
        <Card title='전체 취약점 목록' size='small'>
          <Table
            dataSource={normalizedVulnerabilities}
            columns={columns}
            size='small'
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: total => `총 ${total}개`,
            }}
            scroll={{ x: 'max-content', y: 400 }}
            rowKey='key'
          />
        </Card>
      </TabPane>

      {/* 패키지별 분석 탭 */}
      <TabPane tab='패키지별' key='packages'>
        <Card title='패키지별 취약점' size='small'>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {Array.from(
              new Set(normalizedVulnerabilities.map(v => v.name))
            ).map((packageName, index) => {
              const packageVulns = normalizedVulnerabilities.filter(
                v => v.name === packageName
              );
              const highestSeverity = packageVulns.reduce((prev, curr) => {
                const severityOrder = [
                  'critical',
                  'high',
                  'medium',
                  'low',
                  'info',
                ];
                const prevIndex = severityOrder.indexOf(
                  prev.severity.toLowerCase()
                );
                const currIndex = severityOrder.indexOf(
                  curr.severity.toLowerCase()
                );
                return currIndex < prevIndex ? curr : prev;
              });

              return (
                <Card
                  key={index}
                  size='small'
                  style={{ marginBottom: 8 }}
                  title={
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Text strong>{packageName}</Text>
                      <Tag color={getSeverityColor(highestSeverity.severity)}>
                        {packageVulns.length}개 취약점
                      </Tag>
                    </div>
                  }
                >
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                      <strong>현재 버전:</strong> {packageVulns[0].version}
                    </p>
                    {packageVulns.some(v => v.fix_available) && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                        <strong>수정 가능 버전:</strong>{' '}
                        {packageVulns.find(v => v.fix_available)?.fixed_version}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {packageVulns.map((v, idx) => (
                        <Tag key={idx} color={getSeverityColor(v.severity)}>
                          {v.cve}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      </TabPane>
    </Tabs>
  );
};

export default ScaResultContent;
