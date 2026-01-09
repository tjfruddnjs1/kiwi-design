import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Typography,
  Space,
  Descriptions,
  Empty,
  Tabs,
  Divider,
  Badge,
  Input,
  Tooltip,
  Alert,
  Button,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  CodeOutlined,
  FileTextOutlined,
  CloudServerOutlined,
  BranchesOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type {
  BuildStatistics as BuildStatsType,
  PipelineLogEntry,
} from '../../types/build';
import type { BuildErrorAnalysis } from '../../types/pipeline';
import {
  formatDateTimeSimple,
  formatRelativeTime,
} from '../../utils/dateHelpers';
import EnvFileCreationModal from './EnvFileCreationModal';

const { Text, Title } = Typography;
const { Search } = Input;

//  Docker 이미지 URL 검증 함수
const isValidDockerImageURL = (imageURL: string): boolean => {
  // 1. 공백이 있으면 로그 라인
  if (imageURL.includes(' ')) return false;

  // 2. 빌드 로그 메시지 패턴 필터링
  const logPatterns = [
    '[',
    'successfully ',
    'fetch ',
    'COMMIT ',
    'Resolving ',
    'Trying ',
    'Getting ',
    'Copying ',
    'Writing ',
    'Storing ',
  ];
  if (logPatterns.some(pattern => imageURL.startsWith(pattern))) return false;

  // 3. 파일 경로 패턴 필터링
  if (
    imageURL.startsWith('dist/') ||
    imageURL.startsWith('src/') ||
    imageURL.startsWith('assets/')
  )
    return false;

  // 4. 슬래시 2개 이상, 콜론 정확히 1개
  const slashCount = (imageURL.match(/\//g) || []).length;
  const colonCount = (imageURL.match(/:/g) || []).length;
  if (slashCount < 2 || colonCount !== 1) return false;

  // 5. registry/project/service:tag 형식 확인
  const parts = imageURL.split('/');
  if (parts.length < 3) return false;

  // 6. 서비스:태그 형식 확인
  const lastPart = parts[parts.length - 1];
  const serviceAndTag = lastPart.split(':');
  if (serviceAndTag.length !== 2 || !serviceAndTag[0] || !serviceAndTag[1])
    return false;

  return true;
};

interface BuildStatisticsProps {
  statistics: BuildStatsType;
  buildEnvironment?: {
    gitlab_url: string;
    gitlab_branch: string;
    docker_compose_files: string[];
    docker_registry: string;
    registry_url?: string;
    project_name?: string;
    build_tool: string;
    infra_type?: string;
    build_infra_name?: string;
    build_infra_type?: string;
  } | null;
  loading?: boolean;
  onBuildClick?: () => void;
  serviceId?: number; //  [신규] .env 파일 생성을 위한 serviceId
}

const BuildStatistics: React.FC<BuildStatisticsProps> = ({
  statistics,
  buildEnvironment,
  serviceId,
}) => {
  const [logSearchText, setLogSearchText] = useState('');
  const [envModalVisible, setEnvModalVisible] = useState<boolean>(false);
  const [selectedErrorAnalysis, setSelectedErrorAnalysis] =
    useState<BuildErrorAnalysis | null>(null);

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0초';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  //  formatDateTimeSimple, formatRelativeTime은 utils/dateHelpers.ts에서 import
  // 아래 formatDateTime은 formatDateTimeSimple의 별칭으로 사용
  const formatDateTime = formatDateTimeSimple;

  const getStatusConfig = (status: string) => {
    const statusConfig: Record<
      string,
      {
        color: string;
        icon: React.ReactNode;
        text: string;
        badgeStatus: 'success' | 'error' | 'processing' | 'default' | 'warning';
      }
    > = {
      success: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '성공',
        badgeStatus: 'success',
      },
      failed: {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: '실패',
        badgeStatus: 'error',
      },
      running: {
        color: 'processing',
        icon: <ClockCircleOutlined />,
        text: '실행 중',
        badgeStatus: 'processing',
      },
      pending: {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '대기',
        badgeStatus: 'default',
      },
      cancelled: {
        color: 'warning',
        icon: <CloseCircleOutlined />,
        text: '취소됨',
        badgeStatus: 'warning',
      },
    };

    return statusConfig[status] || statusConfig.pending;
  };

  const getStatusTag = (status: string) => {
    const config = getStatusConfig(status);
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // details_data 파싱
  const parseBuildDetails = (detailsData: any) => {
    if (!detailsData) return null;
    try {
      let parsed;
      if (typeof detailsData === 'string') {
        parsed = JSON.parse(detailsData);
      } else if (detailsData.Valid && detailsData.String) {
        parsed = JSON.parse(detailsData.String);
      } else {
        parsed = detailsData;
      }
      return parsed;
    } catch (e) {
      console.error('[BuildStatistics] Failed to parse build details:', e);
      return null;
    }
  };

  // execution_logs 파싱
  const parseExecutionLogs = (
    executionLogs: { String: string; Valid: boolean } | null
  ): PipelineLogEntry[] => {
    if (!executionLogs?.Valid || !executionLogs.String) return [];
    if (executionLogs.String === 'null' || executionLogs.String === '[]')
      return [];
    try {
      const parsed = JSON.parse(executionLogs.String);
      if (Array.isArray(parsed)) return parsed as PipelineLogEntry[];
      return [];
    } catch (e) {
      console.error('[BuildStatistics] Failed to parse execution_logs:', e);
      return [];
    }
  };

  const latestBuildDetails = statistics.latest_build?.details_data
    ? parseBuildDetails(statistics.latest_build.details_data)
    : null;

  // 에러 가이드 표시 조건 확인 (필요시 주석 해제하여 디버깅)
  // if (statistics.latest_build) {
  //   console.log('[BuildStatistics] Latest Build Status:', statistics.latest_build.status);
  //   console.log('[BuildStatistics] Latest Build Details:', latestBuildDetails);
  //   console.log('[BuildStatistics] Error Analysis:', latestBuildDetails?.error_analysis);
  // }

  // 로그 필터링
  const filterLogs = (logs: PipelineLogEntry[], searchText: string) => {
    if (!searchText.trim()) return logs;
    const lowerSearch = searchText.toLowerCase();
    return logs.filter(
      log =>
        log.command?.toLowerCase().includes(lowerSearch) ||
        log.output?.toLowerCase().includes(lowerSearch) ||
        log.error?.toLowerCase().includes(lowerSearch)
    );
  };

  // 로그 렌더링
  const renderLogs = (logs: PipelineLogEntry[], buildId: number) => {
    const filteredLogs = filterLogs(logs, logSearchText);

    if (logs.length === 0) {
      return (
        <Empty
          description='빌드 로그가 없습니다.'
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (filteredLogs.length === 0) {
      return (
        <Empty
          description={`"${logSearchText}"에 대한 검색 결과가 없습니다.`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div
        style={{
          maxHeight: '450px',
          overflowY: 'auto',
          backgroundColor: '#1e1e1e',
          padding: '16px',
          borderRadius: '8px',
          fontFamily:
            'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
      >
        {filteredLogs.map((log, index) => (
          <div
            key={`${buildId}-${index}`}
            style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor:
                log.exit_code !== 0
                  ? 'rgba(255, 77, 79, 0.08)'
                  : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '6px',
              borderLeft: `3px solid ${log.exit_code !== 0 ? '#ff4d4f' : log.error ? '#faad14' : '#52c41a'}`,
              transition: 'all 0.2s',
            }}
          >
            {/* 타임스탬프 */}
            <div style={{ marginBottom: '6px' }}>
              <Text
                type='secondary'
                style={{
                  fontSize: '11px',
                  color: '#888',
                  fontFamily: 'inherit',
                }}
              >
                [{log.timestamp || 'N/A'}]
              </Text>
            </div>

            {/* 명령어 */}
            {log.command && (
              <div style={{ marginBottom: '6px' }}>
                <Text
                  strong
                  style={{
                    color: '#4dabf7',
                    fontFamily: 'inherit',
                  }}
                >
                  $ {log.command}
                </Text>
              </div>
            )}

            {/* 출력 */}
            {log.output && (
              <div
                style={{
                  marginBottom: log.error ? '6px' : '0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#d4d4d4',
                  fontFamily: 'inherit',
                }}
              >
                {log.output}
              </div>
            )}

            {/* 에러 */}
            {log.error && (
              <div
                style={{
                  marginTop: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#f85149',
                  fontFamily: 'inherit',
                }}
              >
                <Text strong style={{ color: '#f85149' }}>
                  ERROR:
                </Text>{' '}
                {log.error}
              </div>
            )}

            {/* Exit Code */}
            {log.exit_code !== undefined && log.exit_code !== 0 && (
              <div style={{ marginTop: '6px' }}>
                <Tag
                  color={log.exit_code === 0 ? 'success' : 'error'}
                  style={{ margin: 0 }}
                >
                  Exit Code: {log.exit_code}
                </Tag>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 성공률에 따른 색상
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return '#52c41a';
    if (rate >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const latestBuild = statistics.latest_build;
  const latestStatus = latestBuild ? getStatusConfig(latestBuild.status) : null;

  //  [신규] 에러 가이드 표시 컴포넌트
  const ErrorGuideDisplay: React.FC<{ errorAnalysis: BuildErrorAnalysis }> = ({
    errorAnalysis,
  }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <div style={{ marginTop: 16 }}>
        <Alert
          message={
            <Space>
              <CloseCircleOutlined />
              <Text strong>{errorAnalysis.title}</Text>
            </Space>
          }
          description={
            <div>
              <Text>{errorAnalysis.description}</Text>

              {/*  [신규] .env 파일 자동 생성 버튼 - 에러 타입별 맞춤 UI */}
              {errorAnalysis.error_type === 'env_file_missing' &&
                errorAnalysis.is_fixable && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: '12px 16px',
                      backgroundColor: '#fff7e6',
                      border: '1px solid #ffd591',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ color: '#d46b08', fontSize: 13 }}>
                        💡 자동 해결 가능
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          .env 파일을 자동으로 생성하고 Git에 커밋할 수 있습니다
                        </Text>
                      </div>
                    </div>
                    <Button
                      type='primary'
                      size='middle'
                      onClick={() => {
                        //  .env 파일 생성 모달 열기
                        setSelectedErrorAnalysis(errorAnalysis);
                        setEnvModalVisible(true);
                      }}
                      style={{
                        backgroundColor: '#fa8c16',
                        borderColor: '#fa8c16',
                        fontWeight: 600,
                      }}
                    >
                      .env 파일 자동 생성
                    </Button>
                  </div>
                )}

              <div style={{ marginTop: 12 }}>
                <Button
                  type='link'
                  size='small'
                  icon={<QuestionCircleOutlined />}
                  onClick={() => setExpanded(!expanded)}
                  style={{ padding: 0 }}
                >
                  {expanded ? '가이드 접기' : '해결 가이드 보기'}
                </Button>
              </div>
            </div>
          }
          type='error'
          showIcon={false}
        />

        {expanded && (
          <div style={{ marginTop: 12 }}>
            {/* 해결 방법 */}
            {errorAnalysis.solutions && errorAnalysis.solutions.length > 0 && (
              <Card
                title='💡 해결 방법'
                size='small'
                style={{ marginBottom: 12 }}
              >
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  {errorAnalysis.solutions.map((solution, index) => (
                    <li key={index} style={{ marginBottom: 8 }}>
                      <Text>{solution}</Text>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Dockerfile 수정 제안 */}
            {errorAnalysis.dockerfile_fix &&
              errorAnalysis.dockerfile_fix.trim() !== '' && (
                <Card
                  title='📝 Dockerfile 수정 제안'
                  size='small'
                  style={{ marginBottom: 12 }}
                >
                  <pre
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      overflow: 'auto',
                      margin: 0,
                      fontSize: 12,
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      maxHeight: '300px',
                    }}
                  >
                    {errorAnalysis.dockerfile_fix}
                  </pre>
                </Card>
              )}

            {/* 관련 문서 링크 */}
            {errorAnalysis.related_docs &&
              errorAnalysis.related_docs.length > 0 && (
                <Card title='📚 관련 문서' size='small'>
                  <Space direction='vertical' size='small'>
                    {errorAnalysis.related_docs.map((doc, index) => (
                      <a
                        key={index}
                        href={doc}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {doc}
                      </a>
                    ))}
                  </Space>
                </Card>
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* 🎯 핵심 메트릭 - 강조 표시 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* 최근 빌드 상태 - 크게 표시 */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              background: latestStatus
                ? `linear-gradient(135deg, ${latestStatus.color === 'success' ? '#f6ffed' : latestStatus.color === 'error' ? '#fff1f0' : '#e6f7ff'} 0%, #ffffff 100%)`
                : '#ffffff',
              borderColor: latestStatus
                ? latestStatus.color === 'success'
                  ? '#b7eb8f'
                  : latestStatus.color === 'error'
                    ? '#ffccc7'
                    : '#91d5ff'
                : '#d9d9d9',
              height: '100%',
            }}
          >
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text type='secondary' style={{ fontSize: '14px' }}>
                  <HistoryOutlined style={{ marginRight: '8px' }} />
                  최근 빌드
                </Text>
                {latestStatus && <Badge status={latestStatus.badgeStatus} />}
              </div>
              {latestBuild ? (
                <>
                  <div>
                    <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
                      {getStatusTag(latestBuild.status)}
                    </Title>
                    <Text type='secondary' style={{ fontSize: '13px' }}>
                      {formatRelativeTime(latestBuild.started_at)}
                    </Text>
                  </div>
                  {latestBuild.duration_seconds?.Int64 !== undefined && (
                    <Statistic
                      title='소요 시간'
                      value={formatDuration(latestBuild.duration_seconds.Int64)}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ fontSize: '18px' }}
                    />
                  )}
                  {latestBuild.pipeline_id && (
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      파이프라인 #{latestBuild.pipeline_id}
                    </Text>
                  )}
                </>
              ) : (
                <Empty
                  description='빌드 이력이 없습니다.'
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Space>
          </Card>
        </Col>

        {/* 성공률 - 강조 표시 */}
        <Col xs={24} lg={8}>
          <Card style={{ height: '100%' }}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <Text type='secondary' style={{ fontSize: '14px' }}>
                <RocketOutlined style={{ marginRight: '8px' }} />
                빌드 성공률
              </Text>
              <div style={{ textAlign: 'center' }}>
                <Title
                  level={1}
                  style={{
                    margin: 0,
                    color: getSuccessRateColor(statistics.success_rate),
                  }}
                >
                  {statistics.success_rate.toFixed(1)}%
                </Title>
                <Progress
                  percent={Number(statistics.success_rate.toFixed(1))}
                  strokeColor={getSuccessRateColor(statistics.success_rate)}
                  showInfo={false}
                  strokeWidth={12}
                  style={{ marginTop: '16px' }}
                />
              </div>
              <Row gutter={16} style={{ marginTop: '8px' }}>
                <Col span={12} style={{ textAlign: 'center' }}>
                  <Statistic
                    value={statistics.successful_builds}
                    suffix={`/ ${statistics.total_builds}`}
                    prefix={
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    }
                    valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                  />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    성공
                  </Text>
                </Col>
                <Col span={12} style={{ textAlign: 'center' }}>
                  <Statistic
                    value={statistics.failed_builds}
                    suffix={`/ ${statistics.total_builds}`}
                    prefix={
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    }
                    valueStyle={{ fontSize: '16px', color: '#ff4d4f' }}
                  />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    실패
                  </Text>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* 평균 빌드 시간 */}
        <Col xs={24} lg={8}>
          <Card style={{ height: '100%' }}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <Text type='secondary' style={{ fontSize: '14px' }}>
                <ClockCircleOutlined style={{ marginRight: '8px' }} />
                평균 빌드 시간
              </Text>
              <div style={{ textAlign: 'center' }}>
                <Title level={1} style={{ margin: 0, color: '#1890ff' }}>
                  {formatDuration(Math.round(statistics.average_build_time))}
                </Title>
              </div>
              {latestBuild?.build_infra_name?.Valid && (
                <div style={{ marginTop: '16px' }}>
                  <Divider style={{ margin: '12px 0' }} />
                  <Space>
                    <CloudServerOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{latestBuild.build_infra_name.String}</Text>
                    {latestBuild.build_infra_type?.Valid && (
                      <Tag color='blue'>
                        {latestBuild.build_infra_type.String}
                      </Tag>
                    )}
                  </Space>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 📦 빌드 환경 정보 */}
      {buildEnvironment && (
        <Card
          title={
            <Space>
              <EnvironmentOutlined />
              <span>빌드 환경 설정</span>
            </Space>
          }
          size='small'
          style={{ marginBottom: '16px' }}
        >
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size='small'>
            <Descriptions.Item
              label={
                <Space size={4}>
                  <BranchesOutlined />
                  <span>Git 브랜치</span>
                </Space>
              }
            >
              <Tag color='blue'>{buildEnvironment.gitlab_branch}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label='레지스트리'>
              <Text copyable={{ text: buildEnvironment.registry_url }}>
                {buildEnvironment.docker_registry}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label='프로젝트'>
              <Tag color='green'>{buildEnvironment.project_name}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label='빌드 도구'>
              <Tag color='purple'>{buildEnvironment.build_tool}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label='인프라 타입'>
              <Tag>{buildEnvironment.infra_type}</Tag>
            </Descriptions.Item>
            {buildEnvironment.docker_compose_files.length > 0 && (
              <Descriptions.Item label='Compose 파일'>
                <Space size={4} wrap>
                  {buildEnvironment.docker_compose_files.map((file, idx) => (
                    <Tag key={idx} icon={<CodeOutlined />}>
                      {file}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 📋 최근 빌드 상세 정보 */}
      {latestBuild && (
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>최근 빌드 상세 정보</span>
            </Space>
          }
          size='small'
          style={{ marginBottom: '16px' }}
        >
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size='small'>
            <Descriptions.Item label='시작 시간'>
              {formatDateTime(latestBuild.started_at)}
            </Descriptions.Item>
            {latestBuild.completed_at?.String && (
              <Descriptions.Item label='완료 시간'>
                {formatDateTime(latestBuild.completed_at.String)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label='실행자'>
              {latestBuild.triggered_by}
            </Descriptions.Item>
            {/* 빌드된 이미지 */}
            {latestBuildDetails &&
              latestBuildDetails.built_images &&
              Array.isArray(latestBuildDetails.built_images) &&
              latestBuildDetails.built_images.length > 0 && (
                <Descriptions.Item label='빌드된 이미지' span={3}>
                  <Space
                    direction='vertical'
                    size='small'
                    style={{ width: '100%' }}
                  >
                    {latestBuildDetails.built_images
                      .filter((image: string) => isValidDockerImageURL(image))
                      .map((image: string, idx: number) => (
                        <Text
                          key={idx}
                          code
                          copyable={{ text: image }}
                          style={{ display: 'block', fontSize: '12px' }}
                        >
                          {image}
                        </Text>
                      ))}
                    {latestBuildDetails.image_tag && (
                      <Tag color='blue'>
                        태그: {latestBuildDetails.image_tag as string}
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>
              )}
            {latestBuildDetails &&
              !latestBuildDetails.built_images &&
              latestBuildDetails.imageName && (
                <Descriptions.Item label='빌드된 이미지' span={2}>
                  <Space>
                    <Text code>{latestBuildDetails.imageName as string}</Text>
                    {latestBuildDetails.imageTag && (
                      <Tag color='blue'>
                        {latestBuildDetails.imageTag as string}
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>
              )}
            {latestBuildDetails && latestBuildDetails.registry && (
              <Descriptions.Item label='레지스트리'>
                <Text
                  copyable={{ text: latestBuildDetails.registry as string }}
                >
                  {latestBuildDetails.registry as string}
                </Text>
              </Descriptions.Item>
            )}
            {latestBuild.error_message?.String && (
              <Descriptions.Item label='에러 메시지' span={3}>
                <Text type='danger' style={{ fontSize: '12px' }}>
                  {latestBuild.error_message.String}
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/*  [신규] 빌드 실패 시 에러 가이드 표시 - 최근 빌드 상세 정보 아래 배치 */}
      {latestBuild?.status === 'failed' &&
        latestBuildDetails?.error_analysis &&
        typeof latestBuildDetails.error_analysis === 'object' && (
          <ErrorGuideDisplay
            errorAnalysis={
              latestBuildDetails.error_analysis as BuildErrorAnalysis
            }
          />
        )}

      {/* 📝 빌드 로그 */}
      {statistics.recent_builds && statistics.recent_builds.length > 0 && (
        <Card
          title={
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <FileTextOutlined />
                <span>빌드 로그</span>
                <Tag color='blue'>{statistics.recent_builds.length}개</Tag>
              </Space>
            </Space>
          }
          extra={
            <Search
              placeholder='로그 검색...'
              allowClear
              size='small'
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
              onChange={e => setLogSearchText(e.target.value)}
            />
          }
          style={{ marginBottom: '16px' }}
        >
          <Tabs
            defaultActiveKey='0'
            items={statistics.recent_builds.map((build, index) => {
              const buildLogs = build.execution_logs
                ? parseExecutionLogs(build.execution_logs)
                : [];
              const config = getStatusConfig(build.status);

              return {
                key: String(index),
                label: (
                  <Tooltip
                    title={`파이프라인 #${build.pipeline_id} - ${formatDateTime(build.started_at)}`}
                  >
                    <Space size={4}>
                      <Badge status={config.badgeStatus} />
                      <span>#{build.pipeline_id}</span>
                      {buildLogs.length > 0 && (
                        <Tag
                          color='blue'
                          style={{ fontSize: '11px', marginLeft: '4px' }}
                        >
                          {buildLogs.length}
                        </Tag>
                      )}
                    </Space>
                  </Tooltip>
                ),
                children: (
                  <div>
                    <Space style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
                      {getStatusTag(build.status)}
                      <Text type='secondary' style={{ fontSize: '12px' }}>
                        {formatDateTime(build.started_at)}
                      </Text>
                      {build.duration_seconds?.Int64 !== undefined && (
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          소요: {formatDuration(build.duration_seconds.Int64)}
                        </Text>
                      )}
                      {build.triggered_by && (
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          실행자: {build.triggered_by}
                        </Text>
                      )}
                    </Space>
                    {renderLogs(buildLogs, build.id)}
                  </div>
                ),
              };
            })}
          />
        </Card>
      )}

      {/*  [신규] .env 파일 생성 모달 */}
      {serviceId && selectedErrorAnalysis && (
        <EnvFileCreationModal
          visible={envModalVisible}
          onClose={() => {
            setEnvModalVisible(false);
            setSelectedErrorAnalysis(null);
          }}
          serviceId={serviceId}
          missingVars={(() => {
            //  errorAnalysis.solutions에서 누락된 환경 변수 추출
            // 예: "누락된 환경 변수: REGISTRY_URL, DB_PASSWORD"
            const varLine = selectedErrorAnalysis.solutions?.find(s =>
              s.includes('누락된 환경 변수:')
            );
            if (varLine) {
              const vars = varLine
                .replace('누락된 환경 변수:', '')
                .trim()
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);
              return vars;
            }
            return [];
          })()}
          errorAnalysis={{
            error_type: selectedErrorAnalysis.error_type,
            title: selectedErrorAnalysis.title,
            description: selectedErrorAnalysis.description,
          }}
        />
      )}
    </div>
  );
};

export default BuildStatistics;
