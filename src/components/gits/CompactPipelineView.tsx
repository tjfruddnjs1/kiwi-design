import React from 'react';
import { Progress, Spin, Typography, Tag, Button } from 'antd';
import {
  BarChartOutlined,
  SettingOutlined,
  RocketOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import type { PipelineStep } from '../../lib/api/pipeline';
import { formatDateTime } from '../../utils/dateHelpers';
import './CompactPipelineView.css';

const { Text } = Typography;

// 보안 분석 상태 타입
type SecurityState = 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';

// 보안 분석 Tag 컴포넌트 (SAST/SCA/DAST 공통)
interface SecurityAnalysisTagProps {
  state?: SecurityState;
  label: string;
}

const SecurityAnalysisTag: React.FC<SecurityAnalysisTagProps> = ({
  state,
  label,
}) => {
  const isInactive = !state || state === 'null' || state === 'idle';

  const getTagColor = (): string | undefined => {
    if (isInactive) return 'default';
    if (state === 'analyzing') return 'processing';
    if (state === 'completed') return 'success';
    if (state === 'failed') return 'error';
    return 'default';
  };

  return (
    <Tag
      color={getTagColor()}
      className={state === 'analyzing' ? 'ant-tag-processing' : ''}
      style={{
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 6,
        padding: '4px 10px',
        marginTop: 6,
        border: isInactive ? '1.5px dashed #bfbfbf' : 'none',
        boxShadow: isInactive
          ? '0 1px 3px rgba(0, 0, 0, 0.08)'
          : '0 2px 6px rgba(0, 0, 0, 0.1)',
        opacity: isInactive ? 0.85 : 1,
        backgroundColor: isInactive ? '#f5f5f5' : undefined,
        color: isInactive ? '#8c8c8c' : undefined,
      }}
    >
      {label}
    </Tag>
  );
};

// 단계별 시간 표시를 위한 헬퍼 함수
const getStageTimeDisplay = (
  displayKey: DisplayKey,
  sourceTime: string | undefined,
  stageData: PipelineStep | undefined
): string | null => {
  if (displayKey === 'source' && sourceTime) {
    return formatDateTime(sourceTime).short;
  }

  if ((displayKey === 'build' || displayKey === 'deploy') && stageData) {
    const timeStr = stageData.completed_at?.Valid
      ? stageData.completed_at.String
      : stageData.started_at?.Valid
        ? stageData.started_at.String
        : null;
    return timeStr ? formatDateTime(timeStr).short : null;
  }

  return null;
};

//  [수정] 4단계 파이프라인 구조로 변경 (SAST/SCA/DAST는 각 단계 내 탭으로 통합)
type WorkflowStage =
  | 'code'
  | 'security'
  | 'build'
  | 'test'
  | 'deploy'
  | 'operate';
type DisplayKey = 'source' | 'build' | 'deploy' | 'operate';

interface CompactPipelineViewProps {
  pipelineStatus: PipelineStep[] | null | undefined;
  isLoading: boolean;
  onStageClick: (displayKey: DisplayKey) => void;
  serviceId?: number; //  [추가] 파이프라인 단계가 없을 때 빌드 통계 폴백용
  //  [추가] 각 단계별 시간 정보 (파이프라인 박스 아래에 표시)
  sourceTime?: string; // 서비스 등록 시점 (소스 박스 아래)
  //  SAST 전용 외부 상태: 목록에서 모달을 닫아도 상태를 보여주기 위함
  sastState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  sastLastUpdate?: string | null;
  hideSastProgressWhenRunning?: boolean;
  //  SCA 전용 외부 상태: 목록에서 모달을 닫아도 상태를 보여주기 위함
  scaState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  scaLastUpdate?: string | null;
  //  DAST 전용 외부 상태: 목록에서 모달을 닫아도 상태를 보여주기 위함
  dastState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  dastLastUpdate?: string | null;
  //  [추가] DISABLE 조건 관련 props
  disabledStages?: Record<DisplayKey, { disabled: boolean; reason?: string }>;
}

//  [수정] 4단계 파이프라인으로 축소 (분석은 각 단계 내 탭으로 표시)
const DISPLAY_ORDER: DisplayKey[] = [
  'source', // SAST 탭 포함
  'build', // SCA 탭 포함
  'deploy',
  'operate', // DAST 탭 포함
];
const desiredToLegacyStage: Record<DisplayKey, WorkflowStage> = {
  source: 'code',
  build: 'build',
  deploy: 'deploy',
  operate: 'operate',
};
const desiredDisplayName: Record<DisplayKey, string> = {
  source: '소스',
  build: '빌드',
  deploy: '배포',
  operate: '운영',
};

const _desiredStageDescriptions: Record<DisplayKey, string> = {
  source: '소스 코드 관리 (SAST 분석 포함)',
  build: '애플리케이션 빌드 (SCA 분석 포함)',
  deploy: '애플리케이션 배포',
  operate: '운영 모니터링 (DAST 분석 포함)',
};
// 파이프라인 단계별 아이콘 (현재 UI에서는 아이콘 대신 진행률만 표시)
const _desiredStageIcons: Record<DisplayKey, React.ReactNode> = {
  source: <BarChartOutlined />,
  build: <SettingOutlined />,
  deploy: <RocketOutlined />,
  operate: <MonitorOutlined />,
};
const statusColors: Record<string, string> = {
  success: '#52c41a',
  running: '#1890ff',
  failed: '#ff4d4f',
  pending: '#d9d9d9',
  inactive: '#d9d9d9',
};

// 백엔드 상태 문자열을 표준화
const normalizeStatus = (
  status?: string
): 'success' | 'running' | 'failed' | 'pending' | 'inactive' => {
  if (!status) return 'inactive';
  const s = status.toLowerCase();
  if (
    s === 'success' ||
    s === 'succeeded' ||
    s === 'successed' ||
    s === 'completed' ||
    s === 'done'
  )
    return 'success';
  if (
    s === 'running' ||
    s === 'in_progress' ||
    s === 'processing' ||
    s === 'progress'
  )
    return 'running';
  if (s === 'failed' || s === 'error' || s === 'cancelled' || s === 'canceled')
    return 'failed';
  if (s === 'pending' || s === 'queued' || s === 'waiting') return 'pending';
  return 'inactive';
};

const computeProgress = (s: PipelineStep | undefined) => {
  if (!s) return { percent: 0, progressStatus: 'normal' as const };

  let progress = 0;
  if (s.progress_percentage.Valid) {
    progress = s.progress_percentage.Float64;
  } else if (normalizeStatus(s.status) === 'success') {
    progress = 100;
  }

  const ns = normalizeStatus(s.status);
  if (ns === 'success')
    return { percent: 100, progressStatus: 'success' as const };
  if (ns === 'failed')
    return { percent: progress, progressStatus: 'exception' as const };
  if (ns === 'running')
    return { percent: progress, progressStatus: 'active' as const };
  return { percent: progress, progressStatus: 'normal' as const };
};

//  formatDateTime은 utils/dateHelpers.ts에서 import

const CompactPipelineView: React.FC<CompactPipelineViewProps> = ({
  pipelineStatus,
  isLoading,
  onStageClick,
  serviceId: _serviceId,
  sourceTime,
  sastState,
  sastLastUpdate: _sastLastUpdate,
  hideSastProgressWhenRunning: _hideSastProgressWhenRunning,
  scaState,
  scaLastUpdate: _scaLastUpdate,
  dastState,
  dastLastUpdate: _dastLastUpdate,
  disabledStages = {} as Record<
    DisplayKey,
    { disabled: boolean; reason?: string }
  >,
}) => {
  //  [최적화] 폴백 API 호출 완전 제거 - 부모 컴포넌트에서 배치 API로 이미 상태를 가져옴
  // 파이프라인 데이터가 없으면 단순히 'inactive' 상태로 표시 (추가 API 호출 없음)

  if (isLoading) {
    return (
      <div className='pipeline-loading-container'>
        <Spin size='small' />
        <Text type='secondary' style={{ marginLeft: 8 }}>
          파이프라인 상태 로딩 중...
        </Text>
      </div>
    );
  }

  if (!pipelineStatus) {
    return (
      <div className='pipeline-loading-container'>
        <Text type='secondary'>파이프라인 정보가 없습니다.</Text>
      </div>
    );
  }

  // 백엔드 step_name을 프론트엔드 stage 키로 매핑
  const _backendToFrontendStage: Record<string, WorkflowStage> = {
    build: 'build',
    deploy: 'deploy',
    operate: 'operate',
    // 필요에 따라 다른 매핑 추가 (예: 'sast': 'security')
  };

  // 다양한 백엔드 키(case/alias)를 받아 표준 키로 정규화
  const normalizeStepName = (name: string | undefined): string => {
    if (!name) return '';
    const n = name.toLowerCase().trim();

    // 빌드 관련 패턴
    if (
      n === 'build' ||
      n === 'image build' ||
      n === 'docker-build' ||
      n === 'docker_build' ||
      (n.includes('build') && !n.includes('rebuild'))
    ) {
      return 'build';
    }

    // 배포 관련 패턴
    if (
      n === 'deploy' ||
      n === 'deployment' ||
      n === 'k8s-deploy' ||
      n === 'kubernetes' ||
      n === 'k8s_deploy' ||
      n === 'k8sdeploy' ||
      n.includes('deploy')
    ) {
      return 'deploy';
    }

    // 운영 관련 패턴
    if (
      n === 'operate' ||
      n === 'operation' ||
      n === 'monitor' ||
      n === 'monitoring' ||
      n === 'ops' ||
      n.includes('operat')
    ) {
      return 'operate';
    }

    return n;
  };

  // DB 데이터를 UI 템플릿에 매핑
  const getLatestStepByName = (name: string): PipelineStep | undefined => {
    //  [핵심 수정] pipelineStatus가 null이나 undefined인 경우 처리
    if (!pipelineStatus || !Array.isArray(pipelineStatus)) {
      return undefined;
    }

    const canonical = normalizeStepName(name);
    const candidates = pipelineStatus.filter(
      s => normalizeStepName(s.step_name) === canonical
    );

    if (candidates.length === 0) return undefined;
    //  [수정] 최신 항목 선택: running 상태 우선 > started_at > id 기준으로 정렬
    const sorted = [...candidates].sort((a, b) => {
      // 1. running 상태를 최우선으로 선택
      const aRunning = normalizeStatus(a.status) === 'running';
      const bRunning = normalizeStatus(b.status) === 'running';
      if (aRunning && !bRunning) return -1;
      if (!aRunning && bRunning) return 1;

      // 2. started_at으로 정렬 (최신 우선)
      const toTs = (s: { String: string; Valid: boolean }) =>
        s && s.Valid ? Date.parse(s.String) || 0 : 0;
      const aStart = toTs(a.started_at);
      const bStart = toTs(b.started_at);
      if (aStart !== bStart) return bStart - aStart;

      // 3. completed_at으로 정렬 (최신 우선)
      const aComp = toTs(a.completed_at);
      const bComp = toTs(b.completed_at);
      if (aComp !== bComp) return bComp - aComp;

      // 4. id로 정렬 (큰 값 우선)
      return (b.id || 0) - (a.id || 0);
    });
    return sorted[0];
  };

  return (
    <div className='compact-pipeline-container'>
      <div className='pipeline-flex-row'>
        {DISPLAY_ORDER.map(displayKey => {
          const _legacyStage = desiredToLegacyStage[displayKey];

          //  [추가] DISABLE 상태 체크
          const disabledInfo = disabledStages[displayKey] as
            | { disabled: boolean; reason?: string }
            | undefined;
          const isDisabled = disabledInfo?.disabled || false;
          const _disabledReason = disabledInfo?.reason;

          // displayKey에 따라 직접 매칭 (build, deploy, operate)
          let stageData: PipelineStep | undefined = undefined;

          if (
            displayKey === 'build' ||
            displayKey === 'deploy' ||
            displayKey === 'operate'
          ) {
            // displayKey를 직접 step_name으로 사용
            stageData = getLatestStepByName(displayKey);

            // 만약 못 찾았다면 pipelineStatus에서 직접 검색
            if (!stageData && pipelineStatus) {
              const directMatch = pipelineStatus.find(
                s => normalizeStepName(s.step_name) === displayKey
              );
              if (directMatch) {
                stageData = directMatch;
              }
            }

            //  operate 단계가 DB에 없는 경우, deploy 단계가 success이면 자동으로 활성화
            if (displayKey === 'operate' && !stageData) {
              const deployStep = getLatestStepByName('deploy');
              if (deployStep && deployStep.status === 'success') {
                // deploy가 성공했으면 operate를 가상으로 생성 (success 상태)
                stageData = {
                  ...deployStep,
                  step_name: 'operate',
                  status: 'success',
                };
              }
            }
          }

          // 기본 계산 (build/deploy 등)
          let { percent, progressStatus } = computeProgress(stageData);
          let statusType = normalizeStatus(stageData?.status);
          //  [수정] lastUpdate 계산 (stageData 기반) - Tooltip 제거로 현재 사용하지 않음
          let _lastUpdate = '';
          if (stageData?.completed_at?.Valid) {
            _lastUpdate = new Date(
              stageData.completed_at.String
            ).toLocaleTimeString();
          } else if (stageData?.started_at?.Valid) {
            _lastUpdate = new Date(
              stageData.started_at.String
            ).toLocaleTimeString();
          }

          //  [수정] 단순화된 데이터 체크 (stageData만 확인)
          const hasData = !!stageData;

          if (isDisabled && !hasData) {
            // 비활성화 상태이고 데이터도 없을 때만 inactive로 표시
            statusType = 'inactive';
            percent = 0;
            progressStatus = 'normal';
          }
          // hasData인 경우는 이미 위에서 처리됨

          //  [수정] 4단계 파이프라인 렌더링 로직 (간소화)
          let _iconNode: React.ReactNode = _desiredStageIcons[displayKey];
          const hideProgress = false;

          //  데이터가 있거나 비활성화가 아닐 때 상태를 적용
          if (!isDisabled || hasData) {
            // 1. 소스: GitLab 데이터가 있으면 초록색 (서비스 등록 시 보통 초록색)
            if (displayKey === 'source') {
              statusType = 'success';
              percent = 100;
              progressStatus = 'success';
            }

            // 2. 빌드: stageData 기반 - 완료→초록, 진행중→파란(Spin), 실패→빨강
            if (displayKey === 'build') {
              if (statusType === 'running') {
                _iconNode = <Spin size='small' />;
                progressStatus = 'active';
              } else if (statusType === 'success') {
                percent = 100;
                progressStatus = 'success';
              } else if (statusType === 'failed') {
                progressStatus = 'exception';
              } else {
                statusType = 'inactive';
                percent = 0;
              }
            }

            // 3. 배포: stageData 기반 - 완료→초록, 진행중→파간(Spin), 실패→빨강
            if (displayKey === 'deploy') {
              if (statusType === 'running') {
                _iconNode = <Spin size='small' />;
                progressStatus = 'active';
              } else if (statusType === 'success') {
                percent = 100;
                progressStatus = 'success';
              } else if (statusType === 'failed') {
                progressStatus = 'exception';
              } else {
                statusType = 'inactive';
                percent = 0;
              }
            }

            // 4. 운영: 배포된 시스템이 하나라도 있으면 초록색 (과거 배포 성공 이력 확인)
            if (displayKey === 'operate') {
              // pipelineStatus에서 deploy step 중 success인 것이 하나라도 있는지 확인
              const deploySteps = pipelineStatus.filter(
                step => step.step_name === 'deploy'
              );
              const hasSuccessfulDeploy = deploySteps.some(
                step => normalizeStatus(step.status) === 'success'
              );

              if (hasSuccessfulDeploy) {
                statusType = 'success';
                percent = 100;
                progressStatus = 'success';
              } else {
                statusType = 'inactive';
                percent = 0;
              }
            }
          }

          //  에러 메시지 표시 (failed 상태일 때) - Tooltip 제거로 현재 사용하지 않음
          const errorMessageRaw = stageData?.error_message;
          const _errorMessage = errorMessageRaw?.Valid
            ? errorMessageRaw.String
            : '';

          // 단계 상태 클래스 결정
          const stageStateClass =
            statusType === 'running'
              ? 'running'
              : statusType === 'success'
                ? 'completed'
                : statusType === 'failed'
                  ? 'failed'
                  : statusType === 'pending'
                    ? 'pending'
                    : 'inactive';

          return (
            <div
              key={displayKey}
              className={`pipeline-stage-col ${stageStateClass === 'completed' ? 'active' : ''}`}
            >
              <div
                className={`pipeline-stage-item ${stageStateClass} ${isDisabled && !hasData ? 'pipeline-stage-disabled' : ''}`}
                role='button'
                tabIndex={0}
                onClick={() => {
                  onStageClick(displayKey);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onStageClick(displayKey);
                  }
                }}
                style={{
                  cursor: 'pointer',
                }}
              >
                {/* 단계 이름과 날짜를 함께 표시 */}
                <div className='pipeline-stage-header'>
                  <Text
                    className='pipeline-stage-name'
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color:
                        isDisabled && !hasData
                          ? '#bfbfbf'
                          : statusColors[statusType] || '#262626',
                      display: 'block',
                      marginBottom: 2,
                    }}
                  >
                    {desiredDisplayName[displayKey]}
                  </Text>
                  {/* 날짜를 단계명 바로 아래에 표시 */}
                  {getStageTimeDisplay(displayKey, sourceTime, stageData) && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          isDisabled && !hasData
                            ? '#bfbfbf'
                            : statusColors[statusType] || '#262626',
                        display: 'block',
                      }}
                    >
                      {getStageTimeDisplay(displayKey, sourceTime, stageData)}
                    </Text>
                  )}
                </div>
                {/* Progress bar를 더 명확하게 */}
                {!hideProgress && (
                  <div style={{ width: '100%', marginBottom: 6 }}>
                    <Progress
                      percent={percent}
                      size='small'
                      status={progressStatus}
                      showInfo={true}
                      format={p => `${p}%`}
                      strokeWidth={6}
                      strokeColor={
                        isDisabled && !hasData
                          ? '#d9d9d9'
                          : statusColors[statusType] || '#d9d9d9'
                      }
                      style={{ marginBottom: 4 }}
                    />
                    {/* 상태 텍스트 표시 */}
                    <Text
                      className='pipeline-stage-status'
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusColors[statusType] || '#8c8c8c',
                        display: 'block',
                        marginTop: 2,
                      }}
                    >
                      {statusType === 'success'
                        ? '완료'
                        : statusType === 'running'
                          ? '진행중'
                          : statusType === 'failed'
                            ? '실패'
                            : statusType === 'pending'
                              ? '대기'
                              : '준비'}
                    </Text>
                  </div>
                )}

                {/*  각 단계별 분석 상태 인디케이터 - 항상 표시 */}
                {displayKey === 'source' && (
                  <SecurityAnalysisTag state={sastState} label='코드분석' />
                )}

                {displayKey === 'build' && (
                  <>
                    <SecurityAnalysisTag state={scaState} label='이미지분석' />
                    {/*  [신규] 빌드된 이미지 정보 표시 */}
                    {statusType === 'success' &&
                      stageData?.details_data?.built_images && (
                        <div
                          style={{
                            marginTop: 6,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                          }}
                        >
                          {(() => {
                            const images = stageData.details_data
                              .built_images as string[];
                            const displayCount = Math.min(images.length, 2);
                            return (
                              <>
                                {images
                                  .slice(0, displayCount)
                                  .map((img: string, idx: number) => (
                                    <Tag
                                      key={idx}
                                      color='blue'
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 500,
                                        padding: '2px 6px',
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {img.split('/').pop()?.split(':')[0] ||
                                        img}
                                    </Tag>
                                  ))}
                                {images.length > displayCount && (
                                  <Tag
                                    color='blue'
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 500,
                                      padding: '2px 6px',
                                    }}
                                  >
                                    +{images.length - displayCount}개
                                  </Tag>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                    {/*  [신규] 빌드 실패 시 에러 분석 표시 */}
                    {statusType === 'failed' &&
                      stageData?.details_data?.error_analysis && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '8px 12px',
                            backgroundColor: '#fff2e8',
                            border: '1px solid #ffbb96',
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#d4380d',
                              marginBottom: 4,
                            }}
                          >
                            {
                              (
                                stageData.details_data.error_analysis as {
                                  title: string;
                                }
                              ).title
                            }
                          </div>
                          <div style={{ color: '#8c8c8c', marginBottom: 6 }}>
                            {
                              (
                                stageData.details_data.error_analysis as {
                                  description: string;
                                }
                              ).description
                            }
                          </div>
                          {(
                            stageData.details_data.error_analysis as {
                              error_type: string;
                            }
                          ).error_type === 'env_file_missing' &&
                            (
                              stageData.details_data.error_analysis as {
                                is_fixable: boolean;
                              }
                            ).is_fixable && (
                              <Button
                                size='small'
                                type='primary'
                                danger
                                style={{ fontSize: 10, height: 24 }}
                                onClick={() => {
                                  // TODO: .env 파일 생성 모달 열기
                                }}
                              >
                                .env 파일 자동 생성
                              </Button>
                            )}
                        </div>
                      )}
                  </>
                )}

                {displayKey === 'operate' && (
                  <SecurityAnalysisTag state={dastState} label='도메인분석' />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompactPipelineView;
