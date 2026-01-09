import React, { useState, useEffect, useCallback } from 'react';
import {
  Spin,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Button,
  Tabs,
  Empty,
  Space,
  Alert as AntAlert,
  Tooltip,
  Descriptions,
  Collapse,
} from 'antd';
import {
  GlobalOutlined,
  BugOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CheckSquareOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { gitApi } from '../../lib/api/gitRepository';
import type { DastResult, Alert } from '../../types/securityAnalysis';
import {
  DAST_CATEGORY_INFO as _DAST_CATEGORY_INFO,
  DAST_RISK_SUMMARY,
} from '../../types/securityAnalysis';

// DAST_CATEGORY_INFO는 향후 카테고리별 상세 정보 표시에 사용됨
void _DAST_CATEGORY_INFO;
import { CategorizedVulnerabilityView } from '../security';
import ScanProgressOverlay from '../common/ScanProgressOverlay';
// 통일된 디자인 시스템 컴포넌트
import {
  SeveritySummaryCard,
  severityColors,
  cardStyles,
  spacing,
  borderRadius,
  parseSeverity,
  getSeverityTagColor,
  severityLabels,
  ScanningBanner,
  ScanningOverlayWrapper,
} from '../security/shared';

const { Text } = Typography;
const { TabPane } = Tabs;

interface DastResultContentProps {
  repoId?: number; // repo_id (선택적, serviceId가 없을 때 사용)
  serviceId?: number; // service_id (우선순위가 더 높음)
  repoName?: string;
  serviceName?: string; // 알림에 표시될 서비스명
  onStartScan?: () => Promise<void> | void;
  onScanStateChange?: (
    state: 'idle' | 'analyzing' | 'completed' | 'failed'
  ) => void;
  onClose?: () => void; // 백그라운드 실행 시 모달 닫기 콜백
  //  [추가] 외부에서 데이터를 주입받을 수 있도록 (dashboard/modal 버전 통합)
  dastResult?: DastResult | null;
  loading?: boolean;
  showTabs?: boolean; // 탭 표시 여부 (기본값: true)
}

/**
 * DAST 분석 결과 콘텐츠 (모달 없이 직접 렌더링용)
 * 운영 모달의 "도메인 검사" 탭에서 사용
 *
 *  두 가지 사용 방식 지원:
 * 1. 자체 데이터 로딩: repoId/serviceId만 전달 → 컴포넌트가 자체적으로 데이터 로딩
 * 2. 외부 데이터 주입: dastResult, loading 전달 → 외부에서 관리된 데이터 사용
 *
 * Note: serviceId가 제공되면 우선적으로 사용하고, 없으면 repoId를 사용합니다.
 */
const DastResultContent: React.FC<DastResultContentProps> = ({
  repoId,
  serviceId,
  repoName: _repoName = '저장소',
  serviceName,
  onStartScan,
  onScanStateChange,
  onClose,
  dastResult: externalDastResult, //  prop으로 받은 결과 (외부 관리)
  loading: externalLoading, //  prop으로 받은 로딩 상태
  showTabs = true, //  탭 표시 여부 (기본값: true)
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalDastResult, setInternalDastResult] =
    useState<DastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>('checklist');

  //  외부 prop 우선, 없으면 내부 state 사용
  const loading =
    externalLoading !== undefined ? externalLoading : internalLoading;
  const dastResult =
    externalDastResult !== undefined ? externalDastResult : internalDastResult;

  const fetchDastResult = useCallback(async () => {
    //  외부에서 데이터를 주입받는 경우에는 fetch하지 않음
    if (externalDastResult !== undefined) return;

    // serviceId가 있으면 우선 사용, 없으면 repoId 사용
    const idToUse = serviceId || repoId;
    if (!idToUse) return;

    setInternalLoading(true);
    setError(null);

    try {
      const response = await gitApi.getDastResult(idToUse);
      const data = response as any;

      if (data && data.status === 'completed' && data.result) {
        const result = data.result;

        if (
          result.result &&
          result.result.results &&
          result.result.results.alerts
        ) {
          // 새로운 ZAP 결과 구조
          const zapResults = result.result.results;
          const dastResult: DastResult = {
            alerts: zapResults.alerts || [],
            summary: {
              total_alerts: zapResults.total_alerts || 0,
              high_alerts: zapResults.high_alerts || 0,
              medium_alerts: zapResults.medium_alerts || 0,
              low_alerts: zapResults.low_alerts || 0,
              info_alerts: zapResults.info_alerts || 0,
              scan_time: result.result.summary?.scan_time || 0,
            },
            execution_log: result.execution_log || {
              log_messages: [],
              total_duration: 0,
            },
          };
          setInternalDastResult(dastResult);
        } else if (result.result && result.result.alerts) {
          // 기존 구조
          const dastResult: DastResult = {
            alerts: result.result.alerts || [],
            summary: {
              total_alerts: result.result.summary?.total_alerts || 0,
              high_alerts: result.result.summary?.high_alerts || 0,
              medium_alerts: result.result.summary?.medium_alerts || 0,
              low_alerts: result.result.summary?.low_alerts || 0,
              info_alerts: result.result.summary?.info_alerts || 0,
              scan_time: result.result.summary?.scan_time || 0,
            },
            execution_log: result.execution_log || {
              log_messages: [],
              total_duration: 0,
            },
          };
          setInternalDastResult(dastResult);
        } else {
          setInternalDastResult(result);
        }
      } else if (data && data.status === 'pending') {
        setInternalDastResult(null);
        setError('DAST 스캔이 아직 진행 중입니다. 잠시 후 새로고침 해주세요.');
      } else {
        setInternalDastResult(null);
        setError('도메인 검사 결과를 찾을 수 없습니다.');
      }
    } catch (err: any) {
      setError(
        '도메인 검사 결과 조회 중 오류가 발생했습니다: ' +
          (err.message || '알 수 없는 오류')
      );
    } finally {
      setInternalLoading(false);
    }
  }, [repoId, serviceId, externalDastResult]);

  useEffect(() => {
    const idToUse = serviceId || repoId;
    if (idToUse && externalDastResult === undefined) {
      void fetchDastResult();
    }
  }, [repoId, serviceId, fetchDastResult, externalDastResult]);

  const handleStartScan = useCallback(async () => {
    if (!onStartScan) return;

    setIsScanning(true);
    setScanStartTime(new Date());
    onScanStateChange?.('analyzing');

    try {
      await onStartScan();
      await fetchDastResult();
      onScanStateChange?.('completed');
    } catch (error) {
      setError(
        '도메인 검사 시작 중 오류가 발생했습니다: ' +
          (error instanceof Error ? error.message : '알 수 없는 오류')
      );
      onScanStateChange?.('failed');
    } finally {
      setIsScanning(false);
      setScanStartTime(null);
    }
  }, [onStartScan, onScanStateChange, fetchDastResult]);

  // 백그라운드 실행 핸들러 (모달 닫기)
  const handleRunInBackground = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const getRiskColor = (riskCode: string) => {
    switch (riskCode) {
      case '4':
      case '3':
        return 'red'; // Critical/High
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

  const getRiskText = (riskCode: string) => {
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

  // 로딩 중
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size='large' />
        <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
          도메인 검사 결과를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  // 스캔 중 (기존 결과가 없을 때만 오버레이 표시)
  if (isScanning && !dastResult) {
    return (
      <ScanProgressOverlay
        scanType='dast'
        visible={isScanning}
        onClose={handleRunInBackground}
        startTime={scanStartTime || undefined}
        serviceName={serviceName}
      />
    );
  }

  // 에러
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <BugOutlined
          style={{ fontSize: '48px', marginBottom: '16px', color: '#ff4d4f' }}
        />
        <p style={{ fontSize: '16px', margin: '0 0 24px 0', color: '#ff4d4f' }}>
          {error}
        </p>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDastResult}
            size='large'
          >
            새로고침
          </Button>
          {onStartScan && (
            <Button
              type='primary'
              icon={<PlayCircleOutlined />}
              onClick={handleStartScan}
              size='large'
            >
              새로 검사하기
            </Button>
          )}
        </Space>
      </div>
    );
  }

  // 결과 없음
  if (!dastResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <SecurityScanOutlined
          style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}
        />
        <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
          도메인 검사 결과가 없습니다
        </p>
        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 24px 0' }}>
          검사를 시작하여 웹 보안 취약점을 분석해보세요
        </p>
        {onStartScan && (
          <Button
            type='primary'
            icon={<PlayCircleOutlined />}
            onClick={handleStartScan}
            size='large'
          >
            검사 시작하기
          </Button>
        )}
      </div>
    );
  }

  // 결과 표시 - 침투 테스트 결과 카드
  const summaryContent = (
    <Card title='침투 테스트 결과' size='small' style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background:
                (dastResult.alerts || []).filter((a: Alert) =>
                  a.name.toLowerCase().includes('sql')
                ).length > 0
                  ? '#fff1f0'
                  : '#f6ffed',
              border: `1px solid ${
                (dastResult.alerts || []).filter((a: Alert) =>
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
              {(dastResult.alerts || []).filter((a: Alert) =>
                a.name.toLowerCase().includes('sql')
              ).length > 0
                ? '발견됨'
                : '안전'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {
                (dastResult.alerts || []).filter((a: Alert) =>
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
                (dastResult.alerts || []).filter(
                  (a: Alert) =>
                    a.name.toLowerCase().includes('cross site scripting') ||
                    a.name.toLowerCase().includes('xss')
                ).length > 0
                  ? '#fff1f0'
                  : '#f6ffed',
              border: `1px solid ${
                (dastResult.alerts || []).filter(
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
              {(dastResult.alerts || []).filter(
                (a: Alert) =>
                  a.name.toLowerCase().includes('cross site scripting') ||
                  a.name.toLowerCase().includes('xss')
              ).length > 0
                ? '발견됨'
                : '안전'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {
                (dastResult.alerts || []).filter(
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
                (dastResult.alerts || []).filter(
                  (a: Alert) =>
                    a.name.toLowerCase().includes('auth') ||
                    a.name.toLowerCase().includes('session') ||
                    a.name.toLowerCase().includes('cookie')
                ).length > 0
                  ? '#fff1f0'
                  : '#f6ffed',
              border: `1px solid ${
                (dastResult.alerts || []).filter(
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
              {(dastResult.alerts || []).filter(
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
                (dastResult.alerts || []).filter(
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
  );

  const detailsContent = (
    <Card title='발견된 보안 알림 목록' size='small'>
      {/* 간단한 요약 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #e2e8f0',
        }}
      >
        <Space>
          <BugOutlined style={{ color: '#64748b' }} />
          <Text strong>{(dastResult.alerts || []).length}건 발견</Text>
        </Space>
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
        <Space>
          <Tag color='red'>{dastResult.summary?.high_alerts || 0} High</Tag>
          <Tag color='orange'>
            {dastResult.summary?.medium_alerts || 0} Medium
          </Tag>
          <Tag color='blue'>
            {(dastResult.summary?.low_alerts || 0) +
              (dastResult.summary?.info_alerts || 0)}{' '}
            Low/Info
          </Tag>
        </Space>
      </div>

      <div
        style={{ maxHeight: '600px', overflow: 'auto', paddingRight: '8px' }}
      >
        {(dastResult.alerts || []).length === 0 ? (
          <AntAlert
            message='보안 취약점 없음'
            description='분석 결과 보안 취약점이 발견되지 않았습니다.'
            type='success'
            showIcon
            icon={<CheckCircleOutlined />}
            style={{
              marginBottom: spacing.lg,
              borderRadius: borderRadius.lg,
              border: '2px solid #b7eb8f',
            }}
          />
        ) : (
          (dastResult.alerts || []).map((alert: Alert, index: number) => {
            // DAST riskcode를 severity로 변환: 4,3=critical/high, 2=medium, 1,0=low
            const severityMap: Record<string, string> = {
              '4': 'critical',
              '3': 'high',
              '2': 'medium',
              '1': 'low',
              '0': 'info',
            };
            const severity = parseSeverity(
              severityMap[alert.riskcode] || 'low'
            );
            const colors = severityColors[severity];

            return (
              <Card
                key={index}
                size='small'
                style={cardStyles.vulnerabilityDetail(severity)}
                styles={{
                  header: cardStyles.vulnerabilityDetailHeader(severity),
                  body: { padding: spacing.lg },
                }}
                title={
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: spacing.sm,
                    }}
                  >
                    <Space size={spacing.sm}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: colors.primary,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        {index + 1}
                      </div>
                      <Tag
                        color={getSeverityTagColor(severity)}
                        style={{ margin: 0 }}
                      >
                        {severityLabels[severity]}
                      </Tag>
                      <Text strong style={{ fontSize: 14 }}>
                        {alert.name}
                      </Text>
                    </Space>
                    <Space size={4}>
                      <Tag color='volcano' style={{ margin: 0 }}>
                        CWE-{alert.cweid}
                      </Tag>
                    </Space>
                  </div>
                }
              >
                <Space
                  direction='vertical'
                  size={spacing.md}
                  style={{ width: '100%' }}
                >
                  {/* 설명 */}
                  {alert.description && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: '#595959',
                        display: 'block',
                        lineHeight: 1.6,
                      }}
                    >
                      {alert.description}
                    </Text>
                  )}

                  {/* 플러그인 정보 */}
                  <Descriptions size='small' column={2}>
                    <Descriptions.Item
                      label={
                        <Space>
                          <SecurityScanOutlined />
                          플러그인 ID
                        </Space>
                      }
                    >
                      <Text code>{alert.pluginid}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label='WASC'>
                      <Tag color='blue'>WASC-{alert.wascid}</Tag>
                    </Descriptions.Item>
                  </Descriptions>

                  {/* 해결 방법 */}
                  {alert.solution && (
                    <div
                      style={{
                        background: '#f6ffed',
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        border: '1px solid #b7eb8f',
                      }}
                    >
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        <CheckCircleOutlined style={{ marginRight: 4 }} /> 해결
                        방법:
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 13, lineHeight: 1.6 }}>
                          {alert.solution}
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* 발견된 위치 */}
                  {alert.instances && alert.instances.length > 0 && (
                    <Collapse
                      ghost
                      expandIcon={({ isActive }) => (
                        <RightOutlined
                          rotate={isActive ? 90 : 0}
                          style={{ fontSize: 10 }}
                        />
                      )}
                      items={[
                        {
                          key: '1',
                          label: (
                            <Space>
                              <EnvironmentOutlined />
                              <Text style={{ fontSize: 13 }}>
                                발견된 위치 ({alert.instances.length}건)
                              </Text>
                            </Space>
                          ),
                          children: (
                            <div
                              style={{ maxHeight: '150px', overflow: 'auto' }}
                            >
                              {alert.instances
                                .slice(0, 5)
                                .map((instance, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      marginBottom: 4,
                                      padding: '6px 8px',
                                      background: '#fff',
                                      borderRadius: borderRadius.sm,
                                      border: '1px solid #e8e8e8',
                                    }}
                                  >
                                    <Tag
                                      color='geekblue'
                                      style={{ margin: 0, fontSize: 11 }}
                                    >
                                      {instance.method}
                                    </Tag>
                                    <Text
                                      code
                                      style={{
                                        fontSize: 11,
                                        wordBreak: 'break-all',
                                      }}
                                    >
                                      {instance.uri}
                                    </Text>
                                  </div>
                                ))}
                              {alert.instances.length > 5 && (
                                <Text type='secondary' style={{ fontSize: 11 }}>
                                  + {alert.instances.length - 5}건 더 있음
                                </Text>
                              )}
                            </div>
                          ),
                        },
                      ]}
                    />
                  )}
                </Space>
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );

  const logsContent = (
    <Card title='도메인 검사 실행 로그' size='small'>
      <div
        style={{
          maxHeight: 400,
          overflowY: 'auto',
          backgroundColor: '#1e1e1e',
          padding: '16px',
          borderRadius: '4px',
          fontFamily:
            'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
          fontSize: '12px',
          lineHeight: 1.5,
          color: '#d4d4d4',
        }}
      >
        {dastResult.execution_log &&
        (dastResult.execution_log as any)?.log_messages &&
        (dastResult.execution_log as any).log_messages.length > 0 ? (
          <div>
            <Text
              strong
              style={{
                color: '#fa8c16',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              ZAP 스캔:
            </Text>
            {(dastResult.execution_log as any).log_messages.map(
              (log: string, index: number) => (
                <pre key={index} style={{ margin: 0, marginBottom: 4 }}>
                  {log}
                </pre>
              )
            )}
          </div>
        ) : (
          <div
            style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}
          >
            <Text type='secondary' style={{ color: '#888' }}>
              실행 로그 정보가 없습니다.
            </Text>
          </div>
        )}
      </div>
    </Card>
  );

  // 헤더 컴포넌트 (스캔 실행 버튼 포함)
  const headerContent = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <GlobalOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          도메인 검사 결과
        </span>
      </div>
      {onStartScan && (
        <Button
          type='primary'
          icon={<PlayCircleOutlined />}
          onClick={handleStartScan}
          disabled={isScanning}
          loading={isScanning}
          size='small'
          style={{ minWidth: '100px' }}
        >
          {isScanning ? '스캔 중...' : '스캔 실행'}
        </Button>
      )}
    </div>
  );

  // showTabs가 false면 summary만 표시
  if (!showTabs) {
    return (
      <div style={{ padding: '16px' }}>
        {headerContent}
        {summaryContent}
      </div>
    );
  }

  // DAST 정보 배너 (취약점 카테고리 분류 탭에서 표시)
  const dastInfoBanner = (
    <AntAlert
      type='info'
      showIcon
      icon={<InfoCircleOutlined />}
      style={{ marginBottom: 16, borderRadius: 8 }}
      message={
        <span style={{ fontWeight: 600 }}>
          웹 애플리케이션 취약점 분석 (DAST)
        </span>
      }
      description={
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 12, color: '#666' }}>
            OWASP(Open Web Application Security Project) 기반의 웹 보안 취약점
            분류입니다. ZAP 스캐너를 통해 발견된 취약점들이 위험도에 따라
            분류됩니다.
          </div>
          <Row gutter={[8, 8]}>
            {Object.values(DAST_RISK_SUMMARY).map(risk => (
              <Col xs={12} sm={4} key={risk.label}>
                <Tooltip title={risk.description} placement='top'>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#fff',
                      borderRadius: 6,
                      border: '1px solid #f0f0f0',
                      cursor: 'help',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ marginRight: 4 }}>{risk.icon}</span>
                    <span style={{ fontWeight: 500, color: risk.color }}>
                      {risk.label}
                    </span>
                  </div>
                </Tooltip>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
            <strong>주요 카테고리:</strong> 인젝션, XSS, 인증취약점, 접근통제,
            보안설정오류, CSRF, SSRF 등
          </div>
        </div>
      }
    />
  );

  // 분석 정보 탭 컨텐츠 (요약 + 실행 로그 통합)
  const analysisInfoContent = (
    <div>
      {/* 스캔 요약 정보 - 통일된 SeveritySummaryCard 사용 */}
      <Card
        title={
          <span>
            <SecurityScanOutlined style={{ marginRight: 8 }} />
            스캔 요약
          </span>
        }
        size='small'
        style={{ marginBottom: 16, borderRadius: 8 }}
      >
        <SeveritySummaryCard
          counts={{
            critical: 0, // DAST는 critical 없음
            high: dastResult.summary?.high_alerts || 0,
            medium: dastResult.summary?.medium_alerts || 0,
            low: dastResult.summary?.low_alerts || 0,
            info: dastResult.summary?.info_alerts || 0,
          }}
          visibleLevels={['high', 'medium', 'low', 'info']}
          showProgress={true}
          size='small'
        />
        {dastResult.summary?.scan_time && (
          <div
            style={{
              marginTop: 12,
              color: '#666',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            <SafetyOutlined style={{ marginRight: 6 }} />
            스캔 소요 시간: {dastResult.summary.scan_time}초
          </div>
        )}
      </Card>

      {/* 침투 테스트 결과 */}
      {summaryContent}

      {/* 실행 로그 */}
      {logsContent}
    </div>
  );

  // 탭 표시
  return (
    <div style={{ padding: '16px' }}>
      {headerContent}

      {/* 스캔 진행 중일 때 배너 표시 (기존 결과가 있는 경우) */}
      {isScanning && dastResult && (
        <ScanningBanner
          scanType='dast'
          startTime={scanStartTime || undefined}
          targetName={serviceName}
        />
      )}

      <ScanningOverlayWrapper isScanning={isScanning}>
        <Tabs
          activeKey={activeTab}
          onChange={key => setActiveTab(key)}
          style={{ marginBottom: 16 }}
        >
          {/* 취약점 카테고리 분류 (메인 탭) */}
          <TabPane
            tab={
              <span>
                <CheckSquareOutlined style={{ marginRight: 6 }} />
                취약점 카테고리 분류
              </span>
            }
            key='checklist'
          >
            {dastInfoBanner}
            <CategorizedVulnerabilityView
              repoId={serviceId || repoId || 0}
              onRefresh={() => fetchDastResult()}
              analysisType='dast'
            />
          </TabPane>

          {/* 취약점 상세 */}
          <TabPane
            tab={
              <span>
                <BugOutlined style={{ marginRight: 6 }} />
                취약점 상세
              </span>
            }
            key='details'
          >
            {detailsContent}
          </TabPane>

          {/* 분석 정보 */}
          <TabPane
            tab={
              <span>
                <SafetyOutlined style={{ marginRight: 6 }} />
                분석 정보
              </span>
            }
            key='info'
          >
            {analysisInfoContent}
          </TabPane>
        </Tabs>
      </ScanningOverlayWrapper>
    </div>
  );
};

export default DastResultContent;
