import React from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Spin,
  Typography,
  Row,
  Col,
  Tag,
  Progress,
  Statistic,
  Tabs,
} from 'antd';
import { SastResultData } from '../../types/sast';
import { WorkflowStage } from '../../components/dashboard/AIWorkflow-constants';
import DeployMetricsPanel from '../../components/dashboard/DeployMetricsPanelNew';

// SARIF 데이터 파싱 함수
function parseSarifData(sarifJson: string) {
  try {
    const sarif = JSON.parse(sarifJson);
    const results = sarif.runs?.[0]?.results || [];
    return results.map((result: any, index: number) => ({
      id: `issue-${index + 1}`,
      ruleId: result.ruleId || 'unknown',
      level: result.level || 'warning',
      message: result.message?.text || 'No message',
      locations: result.locations || [],
    }));
  } catch {
    // SARIF JSON parsing failed - return empty results
    return [];
  }
}

// WorkflowStatus 타입 정의 (파이프라인 상세 모달용)
export interface WorkflowStatus {
  stage: WorkflowStage;
  status: 'success' | 'running' | 'failed' | 'pending' | 'warning' | 'inactive';
  progress: number;
  metrics?: {
    throughput: number;
    quality: number;
    efficiency: number;
    reliability: number;
  };
  execution?: {
    executionLogs: string[];
  };
  issues?: any[];
  recommendations?: string[];
  name?: string;
  totalTasks?: number;
  completedTasks?: number;
  details_data?: string | Record<string, unknown>;
  error_message?: string;
  activeProjects?: number;
  blockedTasks?: number;
  lastUpdate?: any;
}

// CommitInfo 타입 정의
export interface CommitInfo {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  committed_date: string;
  created_at: string;
  web_url: string;
}

export interface DetailModalContentProps {
  selectedStage: WorkflowStage;
  selectedDisplayKey: string | null;
  pipelineLogs?: any[] | null;
  workflowStatuses: WorkflowStatus[];
  sastResultData?: SastResultData | null;
  sastModalView?: 'summary' | 'semgrep' | 'codeql' | 'logs' | null;
  onShowSastDetailView?: (
    view: 'summary' | 'semgrep' | 'codeql' | 'logs' | null
  ) => void;
  commits?: CommitInfo[];
  commitsLoading?: boolean;
}

const DetailModalContent: React.FC<DetailModalContentProps> = ({
  selectedStage,
  selectedDisplayKey: _selectedDisplayKey,
  pipelineLogs,
  commits: _commits,
  commitsLoading: _commitsLoading,
  workflowStatuses,
  sastResultData,
  sastModalView: _sastModalView,
  onShowSastDetailView: _onShowSastDetailView,
}) => {
  const _renderSastDetailView = (type: 'semgrep' | 'codeql') => {
    const detailData =
      type === 'semgrep' ? sastResultData?.semgrep : sastResultData?.codeql;
    if (!detailData || !detailData.results)
      return <Alert message='상세 데이터가 없습니다.' type='warning' />;

    const issues = parseSarifData(detailData.results.sarif_json);

    return (
      <div>
        <Button
          onClick={() => _onShowSastDetailView?.('summary')}
          style={{ marginBottom: 16 }}
        >
          뒤로 가기
        </Button>
        <p>
          <strong>총 발견된 이슈:</strong> {detailData.results.total_findings}개
        </p>
        <p>
          <strong>분석 도구:</strong> {type}
        </p>
        <h4>발견된 보안 이슈 목록</h4>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {issues.map((issue: any) => (
            <Card
              key={issue.id}
              size='small'
              style={{ marginBottom: 8 }}
              title={`이슈 #${issue.id}: ${issue.ruleId}`}
            >
              <div>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>메시지:</strong> {issue.message}
                </p>
                <Tag
                  color={
                    issue.level === 'error'
                      ? 'red'
                      : issue.level === 'warning'
                        ? 'orange'
                        : 'blue'
                  }
                >
                  {issue.level}
                </Tag>
                {issue.locations.map((location: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: 8,
                      borderRadius: 4,
                      marginTop: 4,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '12px' }}>
                      <strong>파일:</strong> {location.file}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px' }}>
                      <strong>위치:</strong> 라인 {location.startLine}-
                      {location.endLine}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <h4 style={{ marginTop: 16 }}>원본 SARIF 데이터</h4>
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: 12,
            borderRadius: 4,
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: 300,
          }}
        >
          {JSON.stringify(JSON.parse(detailData.results.sarif_json), null, 2)}
        </pre>
      </div>
    );
  };

  const _renderSastExecutionLogs = () => {
    const executionLogs = sastResultData?.executionLogs;
    if (!executionLogs) {
      return <Alert message='실행 로그가 없습니다.' type='warning' />;
    }

    const parseLogMessages = (logString: string) => {
      if (!logString) return [];
      try {
        const parsed = JSON.parse(logString);
        if (parsed.semgrep_analysis && parsed.semgrep_analysis.log_messages) {
          return parsed.semgrep_analysis.log_messages;
        }
        if (parsed.codeql_analysis && parsed.codeql_analysis.log_messages) {
          return parsed.codeql_analysis.log_messages;
        }
        if (
          parsed.full_execution_log &&
          parsed.full_execution_log.log_messages
        ) {
          return parsed.full_execution_log.log_messages;
        }
        if (parsed.log_messages) {
          return parsed.log_messages;
        }
        return [];
      } catch {
        // Log data parsing failed - return empty array
        return [];
      }
    };

    return (
      <div>
        <Button
          onClick={() => _onShowSastDetailView?.('summary')}
          style={{ marginBottom: 16 }}
        >
          뒤로 가기
        </Button>
        <Tabs
          defaultActiveKey='semgrep'
          items={[
            {
              key: 'semgrep',
              label: 'Semgrep 실행 로그',
              children: (
                <div
                  style={{
                    maxHeight: 400,
                    overflow: 'auto',
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  {parseLogMessages(executionLogs.semgrep || '{}').map(
                    (log: string, index: number) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: '4px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor:
                            index % 2 === 0 ? '#fafafa' : '#f0f0f0',
                          borderRadius: '3px',
                          borderLeft: '3px solid #52c41a',
                        }}
                      >
                        {log}
                      </div>
                    )
                  )}
                </div>
              ),
            },
            {
              key: 'codeql',
              label: 'CodeQL 실행 로그',
              children: (
                <div
                  style={{
                    maxHeight: 400,
                    overflow: 'auto',
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  {parseLogMessages(executionLogs.codeql || '{}').map(
                    (log: string, index: number) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: '4px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor:
                            index % 2 === 0 ? '#fafafa' : '#f0f0f0',
                          borderRadius: '3px',
                          borderLeft: '3px solid #1890ff',
                        }}
                      >
                        {log}
                      </div>
                    )
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  };

  const _renderSastSummaryCard = (type: 'semgrep' | 'codeql') => {
    const result =
      type === 'semgrep' ? sastResultData?.semgrep : sastResultData?.codeql;
    const title = type === 'semgrep' ? 'Semgrep 분석' : 'CodeQL 분석';

    return (
      <Card title={title} size='small' style={{ marginBottom: 16 }}>
        {sastResultData?.status === 'analyzing' ? (
          <Spin tip='분석 진행 중...' />
        ) : result ? (
          <div>
            {result.error ? (
              <Alert
                message={result.error}
                description={result.details}
                type='error'
                showIcon
              />
            ) : (
              <div>
                <p>
                  <strong>상태:</strong> <Tag color='green'>분석 완료</Tag>
                </p>
                {result.summary && (
                  <>
                    <p>
                      <strong>분석 시간:</strong> {result.summary.analysis_time}
                      s
                    </p>
                    <p>
                      <strong>Git URL:</strong> {result.summary.git_url}
                    </p>
                    <p>
                      <strong>스캔 ID:</strong> {result.summary.scan_id}
                    </p>
                    <p>
                      <strong>클론 시간:</strong> {result.summary.clone_time}s
                    </p>
                    <p>
                      <strong>설정:</strong> {result.summary.config}
                    </p>
                  </>
                )}
                {result.results && (
                  <p>
                    <strong>발견된 이슈:</strong>{' '}
                    <Button
                      type='link'
                      style={{ padding: 0 }}
                      onClick={() => _onShowSastDetailView?.(type)}
                    >
                      {result.results.total_findings}개
                    </Button>
                  </p>
                )}
                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Button
                      size='small'
                      onClick={() => _onShowSastDetailView?.(type)}
                    >
                      상세 결과
                    </Button>
                    <Button
                      size='small'
                      onClick={() => _onShowSastDetailView?.('logs')}
                    >
                      실행 로그
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>결과 없음</p>
        )}
      </Card>
    );
  };

  let stageData = workflowStatuses.find(s => s.stage === selectedStage);
  if (!stageData || !stageData.metrics || !stageData.execution) {
    stageData = {
      stage: selectedStage,
      status: 'inactive',
      progress: 0,
      metrics: { throughput: 0, quality: 0, efficiency: 0, reliability: 0 },
      execution: { executionLogs: [] },
    } as WorkflowStatus;
  }

  return (
    <Row gutter={[16, 16]}>
      {selectedStage !== 'code' && (
        <>
          {selectedStage === 'deploy' ? (
            <Col span={24}>
              {(() => {
                const deployStatus = workflowStatuses.find(
                  s => s.stage === 'deploy'
                );
                const hasDeployData = pipelineLogs && pipelineLogs.length > 0;
                const hasDeployStatus =
                  deployStatus && deployStatus.status !== 'inactive';

                let deploymentDetails;
                if (deployStatus) {
                  try {
                    if (deployStatus.details_data) {
                      if (
                        typeof deployStatus.details_data === 'object' &&
                        'String' in deployStatus.details_data
                      ) {
                        const nullableString = deployStatus.details_data as {
                          String: string;
                          Valid: boolean;
                        };
                        deploymentDetails =
                          nullableString.Valid && nullableString.String
                            ? JSON.parse(nullableString.String)
                            : {};
                      } else if (
                        typeof deployStatus.details_data === 'string'
                      ) {
                        deploymentDetails = JSON.parse(
                          deployStatus.details_data
                        );
                      } else {
                        deploymentDetails = deployStatus.details_data;
                      }
                    } else {
                      deploymentDetails = {};
                    }

                    if (deployStatus?.error_message) {
                      if (
                        typeof deployStatus.error_message === 'object' &&
                        deployStatus.error_message &&
                        'String' in deployStatus.error_message
                      ) {
                        const nullableString = deployStatus.error_message as {
                          String: string;
                          Valid: boolean;
                        };
                        if (nullableString.Valid && nullableString.String) {
                          deploymentDetails.error_message =
                            nullableString.String;
                        }
                      } else if (
                        typeof deployStatus.error_message === 'string'
                      ) {
                        deploymentDetails.error_message =
                          deployStatus.error_message;
                      }
                    }
                  } catch (e) {
                    console.error(
                      '[DetailModalContent] deploymentDetails 파싱 실패:',
                      e
                    );
                  }
                }

                if (hasDeployData || hasDeployStatus) {
                  const isDeploying = deployStatus?.status === 'running';

                  const mapStatusForPanel = (
                    status: string | undefined
                  ):
                    | 'success'
                    | 'failed'
                    | 'in_progress'
                    | 'pending'
                    | undefined => {
                    if (!status) return undefined;
                    if (status === 'running') return 'in_progress';
                    if (
                      status === 'success' ||
                      status === 'failed' ||
                      status === 'pending'
                    ) {
                      return status;
                    }
                    return undefined;
                  };

                  return (
                    <DeployMetricsPanel
                      logs={isDeploying ? [] : pipelineLogs || []}
                      actualStatus={mapStatusForPanel(deployStatus?.status)}
                      deploymentDetails={
                        isDeploying ? undefined : deploymentDetails
                      }
                      previousLogs={
                        isDeploying ? pipelineLogs || [] : undefined
                      }
                      previousDeploymentDetails={
                        isDeploying ? deploymentDetails : undefined
                      }
                    />
                  );
                } else {
                  return (
                    <Alert
                      message='배포 이력 없음'
                      description="아직 배포 이력이 없습니다. '배포 실행' 버튼을 클릭하여 배포를 시작하세요."
                      type='info'
                      showIcon
                    />
                  );
                }
              })()}
            </Col>
          ) : (
            <>
              <Col span={12}>
                <Card title='성능 메트릭' size='small'>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <div>
                      <Typography.Text>처리량</Typography.Text>
                      <Progress
                        percent={stageData.metrics.throughput}
                        size='small'
                      />
                    </div>
                    <div>
                      <Typography.Text>품질</Typography.Text>
                      <Progress
                        percent={stageData.metrics.quality}
                        size='small'
                        strokeColor='#52c41a'
                      />
                    </div>
                    <div>
                      <Typography.Text>효율성</Typography.Text>
                      <Progress
                        percent={stageData.metrics.efficiency}
                        size='small'
                        strokeColor='#1890ff'
                      />
                    </div>
                    <div>
                      <Typography.Text>신뢰성</Typography.Text>
                      <Progress
                        percent={stageData.metrics.reliability}
                        size='small'
                        strokeColor='#722ed1'
                      />
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title='작업 현황' size='small'>
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic
                        title='전체 작업'
                        value={stageData.totalTasks}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title='완료'
                        value={stageData.completedTasks}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title='진행 중'
                        value={stageData.activeProjects}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title='블록됨'
                        value={stageData.blockedTasks}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </>
          )}
        </>
      )}
    </Row>
  );
};

export default DetailModalContent;
