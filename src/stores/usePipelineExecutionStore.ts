/**
 * 파이프라인 실행 상태 관리 스토어
 * GitManagement.tsx에서 추출된 파이프라인 실행 관련 상태
 */
import { create } from 'zustand';
import type { DisplayKey } from '../components/dashboard/AIWorkflow-constants';
import type { GitRepository } from './useGitRepositoryStore';

// =========================================
// 타입 정의
// =========================================

/** 실행 중인 파이프라인 정보 */
export interface ExecutingPipeline {
  serviceId: number;
  serviceName: string;
  stepName: string;
  displayKey: DisplayKey;
}

/** 실행 대상 스테이지 정보 */
export interface StageToExecute {
  repo: GitRepository;
  displayKey: DisplayKey;
}

/** 사용 가능한 빌드 정보 */
export interface AvailableBuild {
  id: number;
  pipeline_id: number;
  image_tag: string;
  started_at: string;
  infra_name: string;
  docker_username?: string;
  docker_password?: string;
  registry_type?: string;
  registry_url?: string;
  registry_project?: string;
}

/** 서비스 빌드 버전 정보 */
export interface ServiceBuildVersion {
  service_name: string;
  image_tag: string;
  image_url: string;
  pipeline_id: number;
  started_at: string;
}

/** 선택된 스테이지 데이터 */
export interface SelectedStageData {
  repoName: string;
  displayName: string;
  serviceId: number;
  stage: string;
  infraId?: number;
  infraName?: string;
}

// =========================================
// 스토어 상태 타입
// =========================================

interface PipelineExecutionState {
  // 실행 상태
  executingStage: DisplayKey | null;
  executingPipeline: ExecutingPipeline | null;
  stageToExecute: StageToExecute | null;
  executionInitialValues: Record<string, unknown>;
  isInitialValuesLoading: boolean;

  // 모달 상태
  isExecutionModalVisible: boolean;
  isBuildModalVisible: boolean;
  isAutoDeployMode: boolean;

  // 빌드 관련
  buildCompletedFlag: number;
  availableBuilds: AvailableBuild[];
  serviceBuildVersions: Record<string, ServiceBuildVersion[]> | null;

  // 배포 관련
  deployServerId: number | null;
  deployInfraId: number | null;

  // 상세 모달
  isDetailModalOpen: boolean;
  selectedStageData: SelectedStageData | null;
  isModalContentLoading: boolean;
  modalPipelineLogs: unknown[] | null;

  // 액션
  setExecutingStage: (stage: DisplayKey | null) => void;
  setExecutingPipeline: (pipeline: ExecutingPipeline | null) => void;
  setStageToExecute: (stage: StageToExecute | null) => void;
  setExecutionInitialValues: (values: Record<string, unknown>) => void;
  setIsInitialValuesLoading: (loading: boolean) => void;

  setIsExecutionModalVisible: (visible: boolean) => void;
  setIsBuildModalVisible: (visible: boolean) => void;
  setIsAutoDeployMode: (mode: boolean) => void;

  setBuildCompletedFlag: (flag: number) => void;
  incrementBuildCompletedFlag: () => void;
  setAvailableBuilds: (builds: AvailableBuild[]) => void;
  setServiceBuildVersions: (
    versions: Record<string, ServiceBuildVersion[]> | null
  ) => void;

  setDeployServerId: (id: number | null) => void;
  setDeployInfraId: (id: number | null) => void;

  setIsDetailModalOpen: (open: boolean) => void;
  setSelectedStageData: (data: SelectedStageData | null) => void;
  setIsModalContentLoading: (loading: boolean) => void;
  setModalPipelineLogs: (logs: unknown[] | null) => void;

  // 실행 시작 헬퍼
  startExecution: (stage: DisplayKey, pipeline: ExecutingPipeline) => void;
  endExecution: () => void;

  // 초기화
  resetExecution: () => void;
  resetModals: () => void;
  resetAll: () => void;
}

// =========================================
// 스토어 생성
// =========================================

export const usePipelineExecutionStore = create<PipelineExecutionState>()(
  (set, get) => ({
    // 초기 상태
    executingStage: null,
    executingPipeline: null,
    stageToExecute: null,
    executionInitialValues: {},
    isInitialValuesLoading: false,

    isExecutionModalVisible: false,
    isBuildModalVisible: false,
    isAutoDeployMode: false,

    buildCompletedFlag: 0,
    availableBuilds: [],
    serviceBuildVersions: null,

    deployServerId: null,
    deployInfraId: null,

    isDetailModalOpen: false,
    selectedStageData: null,
    isModalContentLoading: false,
    modalPipelineLogs: null,

    // 실행 상태 액션
    setExecutingStage: stage => set({ executingStage: stage }),
    setExecutingPipeline: pipeline => set({ executingPipeline: pipeline }),
    setStageToExecute: stage => set({ stageToExecute: stage }),
    setExecutionInitialValues: values =>
      set({ executionInitialValues: values }),
    setIsInitialValuesLoading: loading =>
      set({ isInitialValuesLoading: loading }),

    // 모달 액션
    setIsExecutionModalVisible: visible =>
      set({ isExecutionModalVisible: visible }),
    setIsBuildModalVisible: visible => set({ isBuildModalVisible: visible }),
    setIsAutoDeployMode: mode => set({ isAutoDeployMode: mode }),

    // 빌드 액션
    setBuildCompletedFlag: flag => set({ buildCompletedFlag: flag }),
    incrementBuildCompletedFlag: () =>
      set(state => ({
        buildCompletedFlag: state.buildCompletedFlag + 1,
      })),
    setAvailableBuilds: builds => set({ availableBuilds: builds }),
    setServiceBuildVersions: versions =>
      set({ serviceBuildVersions: versions }),

    // 배포 액션
    setDeployServerId: id => set({ deployServerId: id }),
    setDeployInfraId: id => set({ deployInfraId: id }),

    // 상세 모달 액션
    setIsDetailModalOpen: open => set({ isDetailModalOpen: open }),
    setSelectedStageData: data => set({ selectedStageData: data }),
    setIsModalContentLoading: loading =>
      set({ isModalContentLoading: loading }),
    setModalPipelineLogs: logs => set({ modalPipelineLogs: logs }),

    // 실행 헬퍼
    startExecution: (stage, pipeline) =>
      set({
        executingStage: stage,
        executingPipeline: pipeline,
      }),

    endExecution: () =>
      set({
        executingStage: null,
        executingPipeline: null,
      }),

    // 초기화 액션
    resetExecution: () =>
      set({
        executingStage: null,
        executingPipeline: null,
        stageToExecute: null,
        executionInitialValues: {},
        isInitialValuesLoading: false,
      }),

    resetModals: () =>
      set({
        isExecutionModalVisible: false,
        isBuildModalVisible: false,
        isDetailModalOpen: false,
        selectedStageData: null,
        isModalContentLoading: false,
        modalPipelineLogs: null,
      }),

    resetAll: () =>
      set({
        executingStage: null,
        executingPipeline: null,
        stageToExecute: null,
        executionInitialValues: {},
        isInitialValuesLoading: false,
        isExecutionModalVisible: false,
        isBuildModalVisible: false,
        isAutoDeployMode: false,
        buildCompletedFlag: 0,
        availableBuilds: [],
        serviceBuildVersions: null,
        deployServerId: null,
        deployInfraId: null,
        isDetailModalOpen: false,
        selectedStageData: null,
        isModalContentLoading: false,
        modalPipelineLogs: null,
      }),
  })
);

export default usePipelineExecutionStore;
