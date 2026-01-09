import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Badge,
  Spin,
} from 'antd';
import {
  BuildOutlined,
  SyncOutlined,
  DeploymentUnitOutlined,
  MonitorOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { PipelineFlowProps } from '../types/projectTypes';
import type {
  PipelineStage,
  PipelineStep,
  PipelineMetrics,
} from '../../../data/mockProjects';
import {
  getPipelineByProjectId,
  mockPipelines,
} from '../../../data/mockProjects';
import PipelineStageDetailModal from './PipelineStageDetailModal';
import type { PipelineStepName } from '../../../types/pipeline';

const { Text } = Typography;

interface ExtendedPipelineFlowProps extends PipelineFlowProps {
  pipelineStatus?: PipelineStep[];
  pipelineMetrics?: PipelineMetrics;
  isLoading?: boolean;
}

// ... (파일 상단의 유틸리티 함수들은 기존과 동일하게 유지) ...
// ===== 유틸/프레젠테이션 분리 =====
//  [수정] SAST, SCA, DAST를 독립 단계에서 제거하고 4개 단계로 축소
const DESIRED_ORDER: Array<{ key: string; name: string }> = [
  { key: 'source', name: '소스' },
  { key: 'build', name: '빌드' },
  { key: 'deploy', name: '배포' },
  { key: 'operate', name: '운영' },
];

const normalizeStagesToDesiredOrder = (
  stages: PipelineStage[]
): PipelineStage[] => {
  const byKey: Record<string, PipelineStage | undefined> = {};
  for (const s of stages) {
    byKey[s.key] = s;
  }
  const pick = (
    legacyKey: string | string[] | undefined
  ): PipelineStage | undefined => {
    if (!legacyKey) return undefined;
    if (Array.isArray(legacyKey)) {
      for (const k of legacyKey) {
        if (byKey[k]) return byKey[k];
      }
      return undefined;
    }
    return byKey[legacyKey];
  };

  //  [수정] 매핑 업데이트 - SAST, SCA, DAST 제거
  const mapping: Record<string, string | string[] | undefined> = {
    source: 'ci',
    build: 'build',
    deploy: 'deploy',
    operate: 'operations',
  };

  return DESIRED_ORDER.map(({ key, name }) => {
    const src = pick(mapping[key]);
    if (src) {
      return { ...src, key };
    }
    return {
      key,
      name,
      status: 'pending',
      duration: '예정',
      timestamp: '대기중',
    } as PipelineStage;
  });
};

const _getElapsedTime = (
  timestamp: string,
  status: PipelineStage['status']
): string => {
  if (status === 'running') return '실행중';
  if (status === 'pending') return '대기';
  const map: Record<string, string> = {
    '2시간 전': '2시간 30분 경과',
    '1시간 전': '1시간 15분 경과',
    '6시간 전': '6시간 20분 경과',
    '4시간 전': '4시간 35분 경과',
    '30분 전': '35분 경과',
    '27분 전': '32분 경과',
    '20분 전': '23분 경과',
    '19분 전': '22분 경과',
    '10분 전': '12분 경과',
    '9분 전': '11분 경과',
    '7분 전': '9분 경과',
    '5분 전': '7분 경과',
    '1일 전': '1일 2시간 경과',
    '1주 전': '7일 4시간 경과',
    진행중: '실행중',
    대기중: '대기',
  };
  return map[timestamp] || `${timestamp} 이후`;
};

const formatRelativeTime = (timestamp: string): string => {
  if (!timestamp || timestamp === '진행중' || timestamp === '대기중')
    return timestamp;
  // 간단한 목업 데이터용 매핑
  const map: Record<string, string> = {
    '2시간 전': '2시간 30분 경과',
    '1시간 전': '1시간 15분 경과',
    '30분 전': '35분 경과',
    '10분 전': '12분 경과',
    '5분 전': '7분 경과',
    '1일 전': '1일 2시간 경과',
  };
  return map[timestamp] || `${timestamp} 이후`;
};

const formatAbsoluteTime = (timestamp: string | null): string => {
  if (!timestamp || timestamp === '-' || timestamp === 'N/A') return '-';
  try {
    const date = new Date(timestamp);
    const year = date.getFullYear().toString().slice(-2); // yy 형식
    const month = String(date.getMonth() + 1).padStart(2, '0'); // mm 형식
    const day = String(date.getDate()).padStart(2, '0'); // dd 형식
    const hours = String(date.getHours()).padStart(2, '0'); // HH 형식
    const minutes = String(date.getMinutes()).padStart(2, '0'); // MM 형식
    const seconds = String(date.getSeconds()).padStart(2, '0'); // SS 형식

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    // Date parsing failed - return original timestamp
    return timestamp;
  }
};

const _formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp || timestamp === '-' || timestamp === 'N/A') return '-';
  try {
    const date = new Date(timestamp);
    // YYYY.MM.DD HH:mm:ss 형식으로 변환
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    // Date parsing failed - return original timestamp
    return timestamp;
  }
};

const parseDurationToKorean = (
  duration: number | string | null | undefined
): string => {
  if (
    duration === null ||
    duration === undefined ||
    duration === '예정' ||
    duration === '실패' ||
    duration === '-'
  )
    return '-';

  let totalSeconds: number;

  try {
    if (typeof duration === 'string') {
      const minutesMatch = duration.match(/(\d+)m/);
      const secondsMatch = duration.match(/(\d+)s/);
      const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
      const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

      // NaN 체크를 더 안전하게
      if (isNaN(minutes) || isNaN(seconds)) return '-';

      totalSeconds = minutes * 60 + seconds;
    } else {
      // 숫자 타입인 경우에도 안전하게 처리
      if (typeof duration !== 'number' || isNaN(duration)) return '-';
      totalSeconds = duration;
    }

    // 최종 결과값 검증
    if (isNaN(totalSeconds) || totalSeconds < 0) return '-';
    if (totalSeconds === 0) return '즉시';

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (minutes > 0) parts.push(`${minutes}분`);
    if (seconds > 0) parts.push(`${seconds}초`);

    return parts.join(' ');
  } catch (_error) {
    // 에러 발생 시 콘솔에 로그를 남기지 않고 '-' 반환
    return '-';
  }
};

//  [수정] StageCard 내부에 표시될 상세 정보를 구성하는 함수
const getStageCardDetails = (stage: PipelineStage, isMock: boolean) => {
  const timeFormatter = isMock ? formatRelativeTime : formatAbsoluteTime;

  if (stage.status === 'running') {
    return [
      { label: '시작', value: timeFormatter(stage.timestamp) },
      { label: '경과', value: parseDurationToKorean(stage.duration) },
    ];
  }
  if (stage.status === 'pending' || stage.status === 'inactive') {
    return [
      { label: '상태', value: '대기' },
      { label: '시간', value: '-' },
    ];
  }
  // success / failed / error - 완료 시간을 날짜와 시간으로 분리
  if (
    stage.status === 'success' &&
    stage.timestamp &&
    stage.timestamp !== '-' &&
    stage.timestamp !== 'N/A'
  ) {
    try {
      const date = new Date(stage.timestamp);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      // 각 값이 유효한지 확인
      if (
        isNaN(parseInt(year)) ||
        isNaN(parseInt(month)) ||
        isNaN(parseInt(day)) ||
        isNaN(parseInt(hours)) ||
        isNaN(parseInt(minutes)) ||
        isNaN(parseInt(seconds))
      ) {
        throw new Error('Invalid date components');
      }

      return [
        {
          label: '완료',
          value: `${year}-${month}-${day}`,
          subValue: `${hours}:${minutes}:${seconds}`,
          hasSubValue: true,
        },
        { label: '소요', value: parseDurationToKorean(stage.duration) },
      ];
    } catch (_error) {
      // 에러 발생 시 콘솔에 로그를 남기지 않고 기본 형식으로 반환
      return [
        { label: '완료', value: timeFormatter(stage.timestamp) },
        { label: '소요', value: parseDurationToKorean(stage.duration) },
      ];
    }
  }

  return [
    { label: '완료', value: timeFormatter(stage.timestamp) },
    { label: '소요', value: parseDurationToKorean(stage.duration) },
  ];
};

const getStatusBadgeColor = (
  status: PipelineStage['status']
): 'success' | 'processing' | 'error' | 'default' => {
  switch (status) {
    case 'success':
      return 'success';
    case 'running':
      return 'processing';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

//  [수정] SAST, SCA, DAST 제거 및 4개 단계로 축소
const getStageConfig = (stageKey: string, status: PipelineStage['status']) => {
  const base: Record<
    string,
    {
      icon: React.ReactElement;
      name: string;
      description: string;
      baseColor: string;
    }
  > = {
    source: {
      icon: <SyncOutlined />,
      name: '소스',
      description: '소스코드',
      baseColor: '#722ed1',
    },
    build: {
      icon: <BuildOutlined />,
      name: '빌드',
      description: '이미지 빌드',
      baseColor: '#1890ff',
    },
    deploy: {
      icon: <DeploymentUnitOutlined />,
      name: '배포',
      description: '운영배포',
      baseColor: '#52c41a',
    },
    operate: {
      icon: <MonitorOutlined />,
      name: '운영',
      description: '상태확인',
      baseColor: '#f5222d',
    },
  };
  const fallback = {
    icon: <ClockCircleOutlined />,
    name: stageKey,
    description: '알수없음',
    baseColor: '#d9d9d9',
  };
  const cfg = base[stageKey] || fallback;

  let statusColor = cfg.baseColor;
  let statusIcon = cfg.icon;
  switch (status) {
    case 'success':
      statusColor = '#52c41a';
      statusIcon = React.cloneElement(statusIcon, {
        style: { color: statusColor },
      });
      break;
    case 'running':
      statusColor = '#1890ff';
      statusIcon = <LoadingOutlined style={{ color: statusColor }} />;
      break;
    case 'error':
    case 'failed': //  'failed' 상태 추가
      statusColor = '#f5222d';
      statusIcon = <ExclamationCircleOutlined style={{ color: statusColor }} />;
      break;
    case 'pending':
    case 'inactive': //  'inactive' 상태 추가
      statusColor = '#d9d9d9';
      statusIcon = React.cloneElement(cfg.icon, {
        style: { color: statusColor },
      });
      break;
    default:
      statusIcon = React.cloneElement(cfg.icon, {
        style: { color: statusColor },
      });
  }
  return { ...cfg, statusColor, statusIcon };
};

const StageCard: React.FC<{
  stage: PipelineStage;
  isMock: boolean;
  onClick: (stage: PipelineStage) => void;
}> = ({ stage, isMock, onClick }) => {
  const cfg = getStageConfig(stage.key, stage.status);
  const detailRows = getStageCardDetails(stage, isMock);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '10px',
        borderRadius: '8px',
        border: `1px solid ${cfg.statusColor}30`,
        backgroundColor: `${cfg.statusColor}08`,
        cursor: 'pointer',
        position: 'relative',
        minHeight: '110px',
        justifyContent: 'center',
        width: '100%',
      }}
      className='pipeline-stage-card'
      data-status={stage.status}
      role='button'
      tabIndex={0}
      onClick={() => onClick(stage)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(stage);
        }
      }}
    >
      <Badge
        status={getStatusBadgeColor(stage.status)}
        style={{
          position: 'absolute',
          top: '3px',
          right: '3px',
          fontSize: '6px',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {detailRows.map(row => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#595959',
              fontWeight: 600,
            }}
          >
            <Text
              style={{
                color: '#8c8c8c',
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
            >
              {row.label}
            </Text>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.value}
              </Text>
              {row.hasSubValue && row.subValue && (
                <Text
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    color: '#8c8c8c',
                    marginTop: '1px',
                  }}
                >
                  {row.subValue}
                </Text>
              )}
            </div>
          </div>
        ))}
        {(stage.status === 'failed' || stage.status === 'error') && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Text
              style={{
                color: '#8c8c8c',
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
            >
              결과
            </Text>
            <Text
              style={{
                color: '#f5222d',
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              실패
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

const PipelineFlow: React.FC<ExtendedPipelineFlowProps> = ({
  project,
  pipelineStatus,
  pipelineMetrics,
  isLoading,
  onStageClick,
}) => {
  const isMockData = project.dataSource !== 'db';

  //  [추가] 모달 상태 관리
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(
    null
  );

  //  [핵심 수정] 데이터 소스에 따라 pipeline 데이터를 동적으로 생성합니다.
  const pipeline = React.useMemo(() => {
    if (project.dataSource === 'db') {
      // DB 데이터의 경우, API로 받은 pipelineStatus를 UI 모델로 변환합니다.
      const dbStepsMap = new Map(
        (pipelineStatus || []).map(step => [step.step_name, step])
      );

      const stages: PipelineStage[] = DESIRED_ORDER.map(({ key, name }) => {
        // 프론트엔드 key('build')를 백엔드 step_name('build')으로 변환 (현재는 이름이 같음)
        const dbStep = dbStepsMap.get(key);
        if (dbStep) {
          return {
            key,
            name,
            status: dbStep.status,
            duration: dbStep.duration_seconds?.Valid
              ? dbStep.duration_seconds.Int64
              : 0,
            timestamp:
              dbStep.completed_at?.String || dbStep.started_at?.String || 'N/A',
          };
        }
        // DB에 없는 단계는 'inactive' 상태로 표시
        return { key, name, status: 'inactive', duration: '-', timestamp: '-' };
      });

      const metrics = {
        successRate: pipelineMetrics?.success_rate || 0,
        deploysToday: pipelineMetrics?.deploys_today || 0,
        totalDeploys: pipelineMetrics?.total_deploys || 0,
      };
      const lastRun = pipelineMetrics?.last_run?.Valid
        ? formatAbsoluteTime(pipelineMetrics.last_run.String)
        : '-';

      return {
        projectId: project.id,
        currentStage: '',
        lastRun: lastRun,
        stages,
        metrics: metrics,
      };
    }
    // 목업 데이터의 경우, 기존 로직을 그대로 사용합니다.
    return getPipelineByProjectId(project.id) || mockPipelines['k8s-control'];
  }, [project, pipelineStatus, pipelineMetrics]);

  //  [수정] 단계 클릭 핸들러 - 모달 오픈
  const handleStageClick = (stage: PipelineStage) => {
    setSelectedStage(stage);
    setModalVisible(true);
    if (onStageClick) {
      onStageClick(stage);
    }
  };

  //  [추가] 모달 닫기 핸들러
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedStage(null);
  };

  const normalizedStages = normalizeStagesToDesiredOrder(pipeline.stages);

  return (
    <Card
      size='small'
      title={
        <Space>
          {project.dataSource === 'db' ? (
            <DatabaseOutlined style={{ color: '#52c41a' }} />
          ) : (
            <BuildOutlined style={{ color: '#52c41a' }} />
          )}
          <Text strong>파이프라인 플로우</Text>
        </Space>
      }
      style={{ height: '100%', cursor: 'pointer', transition: 'all 0.2s ease' }}
      hoverable
    >
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Spin />
        </div>
      ) : (
        <Space direction='vertical' size='small' style={{ width: '100%' }}>
          {/*  [핵심 수정] isMockData && 조건을 제거하여 항상 통계 섹션을 표시합니다. */}
          <>
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Statistic
                  title='성공률'
                  value={pipeline.metrics.successRate}
                  precision={1}
                  suffix='%'
                  valueStyle={{ fontSize: '14px', color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title='오늘 배포'
                  value={pipeline.metrics.deploysToday}
                  suffix='회'
                  valueStyle={{ fontSize: '14px', color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title='배포수'
                  value={pipeline.metrics.totalDeploys}
                  suffix='회'
                  valueStyle={{ fontSize: '14px', color: '#595959' }}
                />
              </Col>
            </Row>
            <div>
              <Text style={{ fontSize: '12px' }}>
                마지막 실행: {pipeline.lastRun}
              </Text>
            </div>
          </>

          <div
            className='pipeline-stage-grid'
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {normalizedStages.map((stage, idx) => {
              const cfg = getStageConfig(stage.key, stage.status);
              return (
                <div
                  key={stage.key}
                  className='pipeline-outer-card'
                  style={{
                    flex: '0 1 calc(33.333% - 6px)',
                    minWidth: 0,
                    background: '#ffffff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    padding: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >
                        {cfg.statusIcon}
                      </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <Text
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: cfg.statusColor,
                        }}
                      >
                        {cfg.name}
                      </Text>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#595959',
                        backgroundColor: '#ffffff',
                        border: '1px solid #f0f0f0',
                        borderRadius: '10px',
                        padding: '0 6px',
                        lineHeight: '16px',
                      }}
                    >
                      {idx + 1}
                    </div>
                  </div>
                  <div style={{ marginBottom: 4, textAlign: 'center' }}>
                    <Text style={{ fontSize: '10px', color: '#8c8c8c' }}>
                      {cfg.description}
                    </Text>
                  </div>
                  <StageCard
                    stage={stage}
                    isMock={isMockData}
                    onClick={handleStageClick}
                  />
                  {isMockData && (
                    <div style={{ marginTop: 4, textAlign: 'right' }}>
                      <Text
                        style={{
                          fontSize: '10px',
                          color:
                            stage.status === 'running'
                              ? '#1890ff'
                              : stage.status === 'pending'
                                ? '#d9d9d9'
                                : '#595959',
                        }}
                      >
                        {formatRelativeTime(stage.timestamp)}
                      </Text>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Space>
      )}

      {/*  [추가] 파이프라인 단계 상세 모달 */}
      {selectedStage && (
        <PipelineStageDetailModal
          visible={modalVisible}
          onClose={handleModalClose}
          stepName={selectedStage.key as PipelineStepName}
          stepData={{
            status: selectedStage.status,
            started_at: selectedStage.timestamp,
            duration_seconds:
              typeof selectedStage.duration === 'number'
                ? selectedStage.duration
                : undefined,
            // TODO: 백엔드 API에서 분석 데이터를 받아와 전달
            // analysis: selectedStage.analysis,
          }}
          isLoading={false}
        />
      )}
    </Card>
  );
};

export default PipelineFlow;
