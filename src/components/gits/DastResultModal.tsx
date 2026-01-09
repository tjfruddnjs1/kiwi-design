import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Spin,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tabs,
} from 'antd';
import {
  GlobalOutlined,
  BugOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { gitApi } from '../../lib/api/gitRepository';
import type { DastResult, Alert } from '../../types/securityAnalysis';

const { Text } = Typography;
const { TabPane } = Tabs;

interface DastResultModalProps {
  visible: boolean;
  onClose: () => void;
  repoId: number;
  repoName?: string;
  onRefresh?: () => void;
  onStartScan?: (params: {
    target_url: string;
    scan_type: string;
    options?: unknown;
  }) => Promise<void> | void;
  onScanStateChange?: (
    state: 'idle' | 'analyzing' | 'completed' | 'failed'
  ) => void;
}

const DastResultModal: React.FC<DastResultModalProps> = ({
  visible,
  onClose,
  repoId,
  repoName = '저장소',
  onRefresh,
  onStartScan,
  onScanStateChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [dastResult, setDastResult] = useState<DastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('summary');

  // DAST 스캔 파라미터 (사용하지 않음 - 별도 모달에서 처리)

  const fetchDastResult = useCallback(async () => {
    if (!visible || !repoId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gitApi.getDastResult(repoId);

      // apiClient.post()는 이미 response.data를 반환하므로 직접 사용
      const data = response as any;

      if (data && data.status === 'completed' && data.result) {
        const result = data.result;

        // 실제 ZAP 결과 구조에 맞게 파싱

        if (
          result.result &&
          result.result.results &&
          result.result.results.alerts
        ) {
          // 새로운 ZAP 결과 구조: result.result.results.alerts
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

          setDastResult(dastResult);
        } else if (result.result && result.result.alerts) {
          // 기존 구조: result.result.alerts
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

          setDastResult(dastResult);
        } else {
          setDastResult(result);
        }
      } else if (data && data.status === 'pending') {
        setDastResult(null);
        setError(
          '도메인 분석이 아직 진행 중입니다. 잠시 후 새로고침 해주세요.'
        );
      } else if (data && data.status === 'not_found') {
        setDastResult(null);
        setError(
          '도메인 분석 결과를 찾을 수 없습니다. 스캔을 시작하여 주시기 바랍니다.'
        );
      } else {
        setDastResult(null);
        setError(
          '도메인 분석 결과를 찾을 수 없습니다. 스캔을 시작하여 주시기 바랍니다.'
        );
      }
    } catch (err: any) {
      setError(
        '도메인 분석 결과 조회 중 오류가 발생했습니다: ' +
          (err.message || '알 수 없는 오류')
      );
    } finally {
      setLoading(false);
    }
  }, [visible, repoId]);

  useEffect(() => {
    if (visible) {
      void fetchDastResult();
    }
  }, [visible, repoId, fetchDastResult]);

  // 스캔 완료 후 결과 새로고침
  useEffect(() => {
    if (visible && !isScanning && dastResult === null) {
      // 스캔이 완료되었는데 결과가 없으면 새로고침
      void fetchDastResult();
    }
  }, [visible, isScanning, dastResult, fetchDastResult]);

  // 스캔하기 버튼 클릭 핸들러
  const handleStartScan = useCallback(async () => {
    if (!onStartScan) {
      setError('스캔을 시작할 수 없습니다.');
      return;
    }

    // 저장된 DAST 파라미터 불러오기
    const dastParamsKey = `dast_params_${repoId}`;
    const savedParams = localStorage.getItem(dastParamsKey);

    if (!savedParams) {
      // 파라미터가 없으면 상위 컴포넌트에 알려서 파라미터 모달을 열도록 함
      await onStartScan({ target_url: '', scan_type: '' }); // 빈 파라미터로 호출하여 파라미터 모달을 열도록 함
      return;
    }

    let params: { target_url: string; scan_type: string; options?: unknown };
    try {
      params = JSON.parse(savedParams) as {
        target_url: string;
        scan_type: string;
        options?: unknown;
      };
    } catch (_error) {
      setError('저장된 도메인 분석 파라미터를 읽을 수 없습니다.');
      return;
    }

    // URL 유효성 검사
    if (!params.target_url || !params.target_url.trim()) {
      setError('대상 URL이 설정되지 않았습니다.');
      return;
    }

    try {
      new URL(params.target_url.trim());
    } catch {
      // Invalid URL format
      setError('올바른 URL 형식이 아닙니다. (예: https://example.com)');
      return;
    }

    setIsScanning(true);
    setError(null);

    //  스캔 시작 상태를 상위 컴포넌트에 알림
    onScanStateChange?.('analyzing');

    try {
      await onStartScan(params);

      // 스캔 완료 후 결과를 다시 가져오기
      await fetchDastResult();

      //  스캔 완료 상태를 상위 컴포넌트에 알림
      onScanStateChange?.('completed');
    } catch (error) {
      setError(
        '도메인 분석을 시작하는 중 오류가 발생했습니다: ' +
          (error instanceof Error ? error.message : '알 수 없는 오류')
      );

      //  스캔 실패 상태를 상위 컴포넌트에 알림
      onScanStateChange?.('failed');
    } finally {
      setIsScanning(false);
    }
  }, [onStartScan, onScanStateChange, fetchDastResult, repoId]);

  const getRiskColor = (riskCode: string) => {
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

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingRight: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
            }}
          >
            <GlobalOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {repoName} - 도메인 분석 결과
            </span>
            {dastResult?.summary && (
              <Tag
                color='blue'
                style={{ fontSize: '12px', padding: '2px 8px' }}
              >
                알림 {dastResult.summary.total_alerts}개
              </Tag>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Button
              size='small'
              onClick={onClose}
              style={{ marginRight: '4px' }}
            >
              닫기
            </Button>
            {onRefresh && (
              <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                size='small'
                disabled={isScanning}
                style={{ minWidth: '80px', height: '28px' }}
              >
                새로고침
              </Button>
            )}
            {onStartScan && (
              <Button
                type='primary'
                icon={
                  isScanning ? <Spin size='small' /> : <PlayCircleOutlined />
                }
                onClick={handleStartScan}
                size='small'
                disabled={isScanning}
                style={{ minWidth: '100px', height: '28px' }}
              >
                {isScanning ? '스캔 중...' : '분석 실행'}
              </Button>
            )}
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      closeIcon={false}
      footer={null}
      width={1400}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 180px)',
          overflow: 'auto',
          padding: '16px',
        },
      }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size='large' />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
            도메인 분석 결과를 불러오는 중입니다...
          </p>
        </div>
      ) : isScanning ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size='large' />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#1890ff' }}>
            도메인 분석이 진행 중입니다...
          </p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            잠시만 기다려주세요. 스캔이 완료되면 자동으로 결과가 표시됩니다.
          </p>
        </div>
      ) : error ? (
        <div
          style={{ textAlign: 'center', padding: '60px 0', color: '#ff4d4f' }}
        >
          <BugOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>{error}</p>
        </div>
      ) : !dastResult ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <SecurityScanOutlined
            style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}
          />
          <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
            도메인 분석 결과가 없습니다
          </p>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            스캔을 시작하여 보안 취약점을 분석해보세요
          </p>
        </div>
      ) : dastResult?.summary ? (
        <div>
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key)}
            style={{ marginBottom: 16 }}
          >
            <TabPane tab='요약' key='summary'>
              {/* 취약점 요약 */}
              <Card
                title='취약점 요약'
                size='small'
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Statistic
                      title='총 알림'
                      value={dastResult.summary.total_alerts}
                      valueStyle={{
                        color:
                          dastResult.summary.total_alerts > 0
                            ? '#ff4d4f'
                            : '#52c41a',
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='HIGH'
                      value={dastResult.summary.high_alerts}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='MEDIUM'
                      value={dastResult.summary.medium_alerts}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='LOW'
                      value={dastResult.summary.low_alerts}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
              </Card>

              {/* 주요 테스트 결과 */}
              <Card
                title='침투 테스트 결과'
                size='small'
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background:
                          dastResult.alerts.filter((a: Alert) =>
                            a.name.toLowerCase().includes('sql')
                          ).length > 0
                            ? '#fff1f0'
                            : '#f6ffed',
                        border: `1px solid ${
                          dastResult.alerts.filter((a: Alert) =>
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
                        {dastResult.alerts.filter((a: Alert) =>
                          a.name.toLowerCase().includes('sql')
                        ).length > 0
                          ? '발견됨'
                          : '안전'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {
                          dastResult.alerts.filter((a: Alert) =>
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
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name
                                .toLowerCase()
                                .includes('cross site scripting') ||
                              a.name.toLowerCase().includes('xss')
                          ).length > 0
                            ? '#fff1f0'
                            : '#f6ffed',
                        border: `1px solid ${
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name
                                .toLowerCase()
                                .includes('cross site scripting') ||
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
                        {dastResult.alerts.filter(
                          (a: Alert) =>
                            a.name
                              .toLowerCase()
                              .includes('cross site scripting') ||
                            a.name.toLowerCase().includes('xss')
                        ).length > 0
                          ? '발견됨'
                          : '안전'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name
                                .toLowerCase()
                                .includes('cross site scripting') ||
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
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name.toLowerCase().includes('auth') ||
                              a.name.toLowerCase().includes('session') ||
                              a.name.toLowerCase().includes('cookie')
                          ).length > 0
                            ? '#fff1f0'
                            : '#f6ffed',
                        border: `1px solid ${
                          dastResult.alerts.filter(
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
                        {dastResult.alerts.filter(
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
                          dastResult.alerts.filter(
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

              {/* 네트워크 정보 */}
              <Card
                title='네트워크 스캔 정보'
                size='small'
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#f0f5ff',
                        border: '1px solid #adc6ff',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#595959',
                          marginBottom: '8px',
                        }}
                      >
                        열린 포트
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                      >
                        {
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name.toLowerCase().includes('port') ||
                              a.name.toLowerCase().includes('server')
                          ).length
                        }
                        개 감지
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        서버 및 포트 정보 관련 알림
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#f0f5ff',
                        border: '1px solid #adc6ff',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#595959',
                          marginBottom: '8px',
                        }}
                      >
                        SSL/TLS 검사
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                      >
                        {
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name.toLowerCase().includes('ssl') ||
                              a.name.toLowerCase().includes('tls') ||
                              a.name.toLowerCase().includes('certificate')
                          ).length
                        }
                        개 이슈
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        인증서 및 암호화 관련
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: '#f0f5ff',
                        border: '1px solid #adc6ff',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#595959',
                          marginBottom: '8px',
                        }}
                      >
                        헤더 보안
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                      >
                        {
                          dastResult.alerts.filter(
                            (a: Alert) =>
                              a.name.toLowerCase().includes('header') ||
                              a.name
                                .toLowerCase()
                                .includes('content security policy') ||
                              a.name
                                .toLowerCase()
                                .includes('x-frame-options') ||
                              a.name.toLowerCase().includes('x-content-type')
                          ).length
                        }
                        개 권고사항
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        보안 헤더 설정 관련
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </TabPane>

            <TabPane tab='상세 결과' key='details'>
              <Card title='발견된 보안 알림 목록' size='small'>
                <div
                  style={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}
                >
                  {(dastResult.alerts || []).map(
                    (alert: Alert, index: number) => (
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
                    )
                  )}
                </div>
              </Card>
            </TabPane>

            <TabPane tab='실행 로그' key='logs'>
              <Card title='도메인 분석 실행 로그' size='small'>
                <div
                  style={{
                    maxHeight: '400px',
                    overflow: 'auto',
                    padding: '8px',
                    backgroundColor: '#1e1e1e',
                    borderRadius: '4px',
                    fontFamily:
                      'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: '#d4d4d4',
                  }}
                >
                  {dastResult.execution_log &&
                  (dastResult.execution_log as any)?.log_messages ? (
                    (dastResult.execution_log as any).log_messages.map(
                      (log: string, index: number) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: '4px',
                            fontSize: '12px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(24, 144, 255, 0.1)',
                            borderRadius: '3px',
                            borderLeft: '3px solid #1890ff',
                            color: '#d4d4d4',
                          }}
                        >
                          {log}
                        </div>
                      )
                    )
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 0',
                        color: '#888',
                      }}
                    >
                      <Text type='secondary' style={{ color: '#888' }}>
                        실행 로그 정보가 없습니다.
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </TabPane>
          </Tabs>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
          <p style={{ fontSize: '16px', margin: 0 }}>
            도메인 분석 결과가 없습니다.
          </p>
          <p
            style={{ fontSize: '14px', margin: '8px 0 24px 0', color: '#ccc' }}
          >
            분석을 시작해주세요.
          </p>
          {onStartScan && (
            <Button
              type='primary'
              icon={<PlayCircleOutlined />}
              onClick={handleStartScan}
              size='large'
              style={{ minWidth: '120px', height: '40px' }}
            >
              분석 시작하기
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
};

export default DastResultModal;
