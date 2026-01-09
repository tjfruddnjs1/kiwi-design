/**
 * 파이프라인 상태 관리를 위한 커스텀 훅
 * 폴링, 상태 업데이트, 실행 추적을 관리합니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplayKey } from '../components/dashboard/AIWorkflow-constants';
import { pipelineApi, PipelineStep } from '../lib/api/pipeline';
import type { GitRepository } from '../pages/gits/GitManagement';

// =========================================
// 타입 정의
// =========================================

/** 실행 중인 파이프라인 정보 */
export interface ExecutingPipelineInfo {
  serviceId: number;
  serviceName: string;
  stepName: string; // 'source', 'build', 'deploy', etc.
  displayKey: DisplayKey;
}

/** 파이프라인 상태 훅 반환 타입 */
export interface UsePipelineStatusReturn {
  /** 서비스별 파이프라인 상태 */
  pipelineStatuses: Record<number, PipelineStep[]>;
  /** 파이프라인 로딩 상태 */
  isPipelineLoading: boolean;
  /** 현재 실행 중인 단계 */
  executingStage: DisplayKey | null;
  /** 현재 실행 중인 파이프라인 정보 */
  executingPipeline: ExecutingPipelineInfo | null;
  /** 빌드 완료 플래그 (카운터) */
  buildCompletedFlag: number;
  /** 파이프라인 상태 폴링 시작 */
  startPolling: () => void;
  /** 파이프라인 상태 폴링 중지 */
  stopPolling: () => void;
  /** 파이프라인 상태 강제 새로고침 */
  refreshStatus: (isInitialLoad?: boolean) => Promise<void>;
  /** 실행 중인 단계 설정 */
  setExecutingStage: (stage: DisplayKey | null) => void;
  /** 실행 중인 파이프라인 설정 */
  setExecutingPipeline: (pipeline: ExecutingPipelineInfo | null) => void;
  /** 파이프라인 상태 직접 업데이트 */
  setPipelineStatuses: React.Dispatch<
    React.SetStateAction<Record<number, PipelineStep[]>>
  >;
}

// =========================================
// 상태 정규화 유틸리티
// =========================================

/**
 * 파이프라인 상태를 정규화합니다.
 * 다양한 상태 문자열을 표준화된 상태로 변환합니다.
 */
export function normalizeStatusForPolling(
  status?: string
): 'success' | 'running' | 'failed' | 'pending' | 'inactive' {
  if (!status) return 'inactive';
  const s = status.toLowerCase();
  if (
    s === 'success' ||
    s === 'succeeded' ||
    s === 'successed' ||
    s === 'completed' ||
    s === 'done'
  ) {
    return 'success';
  }
  if (
    s === 'running' ||
    s === 'in_progress' ||
    s === 'processing' ||
    s === 'progress'
  ) {
    return 'running';
  }
  if (
    s === 'failed' ||
    s === 'error' ||
    s === 'cancelled' ||
    s === 'canceled'
  ) {
    return 'failed';
  }
  if (s === 'pending' || s === 'queued' || s === 'waiting') {
    return 'pending';
  }
  return 'inactive';
}

// =========================================
// 훅 구현
// =========================================

/**
 * 파이프라인 상태를 관리하는 커스텀 훅
 * @param repositories - 저장소(서비스) 목록
 * @param pollingInterval - 폴링 간격 (밀리초, 기본값: 5000)
 * @param gracePollCount - 폴링 중지 전 grace period 횟수 (기본값: 6)
 */
export function usePipelineStatus(
  repositories: GitRepository[],
  pollingInterval: number = 5000,
  gracePollCount: number = 6
): UsePipelineStatusReturn {
  // 파이프라인 상태 저장
  const [pipelineStatuses, setPipelineStatuses] = useState<
    Record<number, PipelineStep[]>
  >({});
  const [isPipelineLoading, setIsPipelineLoading] = useState<boolean>(true);

  // 실행 중인 파이프라인 추적
  const [executingStage, setExecutingStage] = useState<DisplayKey | null>(null);
  const [executingPipeline, setExecutingPipeline] =
    useState<ExecutingPipelineInfo | null>(null);

  // 빌드 완료 플래그 (useEffect 트리거용)
  const [buildCompletedFlag, setBuildCompletedFlag] = useState<number>(0);

  // 폴링 타이머 및 grace period 카운터
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gracePollCountRef = useRef<number>(0);

  // 폴링 중지
  const stopPolling = useCallback((): void => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
      setExecutingStage(null);
    }
  }, []);

  // 파이프라인 상태 조회 ( 배치 API 사용으로 최적화)
  const fetchPipelineStatuses = useCallback(
    async (isInitialLoad: boolean = false): Promise<void> => {
      if (repositories.length === 0) {
        setIsPipelineLoading(false);
        return;
      }

      if (isInitialLoad) {
        setIsPipelineLoading(true);
      }

      try {
        //  배치 API: 모든 서비스의 상태를 한 번의 API 호출로 가져옴
        const serviceIds = repositories
          .map(repo => repo.id)
          .filter((id): id is number => id !== undefined && id !== null);

        if (serviceIds.length === 0) {
          setIsPipelineLoading(false);
          return;
        }

        // 배치 API 호출 (N번 → 1번으로 최적화)
        const batchResults =
          await pipelineApi.getBatchPipelineStatus(serviceIds);

        let isStillRunning = false;
        let executingPipelineCompleted = false;

        // 함수형 업데이트로 항상 최신 상태를 참조
        setPipelineStatuses(prevStatuses => {
          const newStatuses: Record<number, PipelineStep[]> = {
            ...prevStatuses,
          };

          repositories.forEach(repo => {
            const steps = batchResults[repo.id];
            if (steps && steps.length > 0) {
              // 상태 변경 감지 로깅
              const prevSteps = prevStatuses[repo.id];
              if (prevSteps && prevSteps.length > 0) {
                steps.forEach(newStep => {
                  const oldStep = prevSteps.find(
                    s => s.step_name === newStep.step_name
                  );
                  if (oldStep && oldStep.status !== newStep.status) {
                  }
                });
              }

              newStatuses[repo.id] = steps;

              // 실행 중 상태 확인
              if (
                steps.some(
                  step => normalizeStatusForPolling(step.status) === 'running'
                )
              ) {
                isStillRunning = true;
              }

              // 실행 중인 특정 파이프라인의 완료 감지
              if (
                executingPipeline &&
                repo.id === executingPipeline.serviceId
              ) {
                const targetStep = steps.find(
                  step => step.step_name === executingPipeline.stepName
                );

                if (targetStep && targetStep.status !== 'running') {
                  executingPipelineCompleted = true;
                }
              }
            }
          });

          return newStatuses;
        });

        // 실행 중인 파이프라인이 완료되면 추적 정보 초기화
        if (executingPipelineCompleted && executingPipeline) {
          setExecutingPipeline(null);
          setExecutingStage(null);

          // 빌드 완료 플래그 설정
          if (executingPipeline.stepName === 'build') {
            setBuildCompletedFlag(prev => prev + 1);
          }
        }

        // 폴링 중지 로직: grace period 적용
        if (isStillRunning) {
          gracePollCountRef.current = 0;
        } else if (pollingTimerRef.current) {
          gracePollCountRef.current += 1;

          if (gracePollCountRef.current >= gracePollCount) {
            stopPolling();
            gracePollCountRef.current = 0;
          }
        }
      } catch {
        // Polling failed - stop to prevent endless retries
        stopPolling();
      } finally {
        if (isInitialLoad) {
          setIsPipelineLoading(false);
        }
      }
    },
    [repositories, stopPolling, executingPipeline, gracePollCount]
  );

  // 폴링 시작
  const startPolling = useCallback((): void => {
    stopPolling(); // 기존 폴링이 있다면 중지
    gracePollCountRef.current = 0;
    void fetchPipelineStatuses();
    pollingTimerRef.current = setInterval(() => {
      void fetchPipelineStatuses();
    }, pollingInterval);
  }, [fetchPipelineStatuses, stopPolling, pollingInterval]);

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    pipelineStatuses,
    isPipelineLoading,
    executingStage,
    executingPipeline,
    buildCompletedFlag,
    startPolling,
    stopPolling,
    refreshStatus: fetchPipelineStatuses,
    setExecutingStage,
    setExecutingPipeline,
    setPipelineStatuses,
  };
}

export default usePipelineStatus;
