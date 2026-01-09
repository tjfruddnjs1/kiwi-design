/**
 * Git Repository 상태 관리 스토어
 * GitManagement.tsx에서 추출된 핵심 데이터 상태
 */
import { create } from 'zustand';
import { PipelineStep } from '../lib/api/pipeline';

// =========================================
// 타입 정의
// =========================================

/** Git 저장소 정보 */
export interface GitRepository {
  id: number;
  name4kiwi?: string;
  name: string;
  gitlabUrl: string;
  gitlabBranch: string;
  lastCommit?: string;
  status?: 'active' | 'inactive';
  creatorId: number;
  hasRepository?: boolean;
  dockerRegistry?: string;
  group?: number;
  groupFullPath?: string;
  infraType?: string;
}

/** 서비스 정보 */
export interface ServiceInfo {
  id: number;
  name?: string;
  gitlab_url?: string;
  gitlab_branch?: string;
  gitlab_access_token?: string;
  gitlab_username?: string;
  gitlab_config?: string;
  registry_type?: 'harbor' | 'dockerhub';
  registry_url?: string;
  registry_username?: string;
  registry_password?: string;
  registry_project?: string;
  infra_id?: number;
  infra_name?: string;
  namespace?: string;
  status?: string;
}

/** 선택된 서비스 상세 정보 */
export interface SelectedServiceInfo {
  id: number;
  serviceName: string;
  serviceNamespace?: string;
  infraName?: string;
  infraId?: number;
  gitlabBranch?: string;
  gitlabUrl?: string;
  gitlabAccessToken?: string;
  gitlabUsername?: string;
  registryType?: 'harbor' | 'dockerhub';
  registryUrl?: string;
  registryUsername?: string;
  registryPassword?: string;
  registryProjectName?: string;
}

/** 인프라 아이템 */
export interface InfraItem {
  id: number;
  name: string;
  type: string;
  description?: string;
}

/** 브랜치 정보 */
export interface BranchInfo {
  name: string;
  default: boolean;
}

// =========================================
// 스토어 상태 타입
// =========================================

interface GitRepositoryState {
  // 핵심 데이터
  repositories: GitRepository[];
  services: ServiceInfo[];
  pipelineStatuses: Record<number, PipelineStep[]>;

  // 선택 상태
  currentRepo: GitRepository | null;
  selectedRepo: GitRepository | null;
  selectedServiceInfo: SelectedServiceInfo | null;

  // 페이지네이션
  currentPage: number;
  pageSize: number;
  serviceSearchText: string;

  // 로딩 상태
  isLoading: boolean;
  isPipelineLoading: boolean;

  // 인프라 데이터
  infrastructures: InfraItem[];
  infrastructuresLoading: boolean;

  // 브랜치 데이터
  branches: BranchInfo[];
  branchesLoading: boolean;
  registerBranches: BranchInfo[];
  registerBranchesLoading: boolean;

  // 액션
  setRepositories: (repos: GitRepository[]) => void;
  addRepository: (repo: GitRepository) => void;
  updateRepository: (id: number, updates: Partial<GitRepository>) => void;
  removeRepository: (id: number) => void;

  setServices: (services: ServiceInfo[]) => void;
  updateService: (id: number, updates: Partial<ServiceInfo>) => void;

  setPipelineStatuses: (statuses: Record<number, PipelineStep[]>) => void;
  updatePipelineStatus: (serviceId: number, steps: PipelineStep[]) => void;

  setCurrentRepo: (repo: GitRepository | null) => void;
  setSelectedRepo: (repo: GitRepository | null) => void;
  setSelectedServiceInfo: (info: SelectedServiceInfo | null) => void;
  updateSelectedServiceInfo: (updates: Partial<SelectedServiceInfo>) => void;

  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setServiceSearchText: (text: string) => void;

  setIsLoading: (loading: boolean) => void;
  setIsPipelineLoading: (loading: boolean) => void;

  setInfrastructures: (infras: InfraItem[]) => void;
  setInfrastructuresLoading: (loading: boolean) => void;

  setBranches: (branches: BranchInfo[]) => void;
  setBranchesLoading: (loading: boolean) => void;
  setRegisterBranches: (branches: BranchInfo[]) => void;
  setRegisterBranchesLoading: (loading: boolean) => void;

  // 초기화
  resetSelection: () => void;
  resetAll: () => void;
}

// =========================================
// 스토어 생성
// =========================================

export const useGitRepositoryStore = create<GitRepositoryState>()(
  (set, _get) => ({
    // 초기 상태
    repositories: [],
    services: [],
    pipelineStatuses: {},

    currentRepo: null,
    selectedRepo: null,
    selectedServiceInfo: null,

    currentPage: 1,
    pageSize: 10,
    serviceSearchText: '',

    isLoading: false,
    isPipelineLoading: true,

    infrastructures: [],
    infrastructuresLoading: false,

    branches: [],
    branchesLoading: false,
    registerBranches: [],
    registerBranchesLoading: false,

    // 저장소 액션
    setRepositories: repos => set({ repositories: repos }),

    addRepository: repo =>
      set(state => ({
        repositories: [...state.repositories, repo],
      })),

    updateRepository: (id, updates) =>
      set(state => ({
        repositories: state.repositories.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      })),

    removeRepository: id =>
      set(state => ({
        repositories: state.repositories.filter(r => r.id !== id),
      })),

    // 서비스 액션
    setServices: services => set({ services }),

    updateService: (id, updates) =>
      set(state => ({
        services: state.services.map(s =>
          s.id === id ? { ...s, ...updates } : s
        ),
      })),

    // 파이프라인 상태 액션
    setPipelineStatuses: statuses => set({ pipelineStatuses: statuses }),

    updatePipelineStatus: (serviceId, steps) =>
      set(state => ({
        pipelineStatuses: {
          ...state.pipelineStatuses,
          [serviceId]: steps,
        },
      })),

    // 선택 상태 액션
    setCurrentRepo: repo => set({ currentRepo: repo }),
    setSelectedRepo: repo => set({ selectedRepo: repo }),
    setSelectedServiceInfo: info => set({ selectedServiceInfo: info }),

    updateSelectedServiceInfo: updates =>
      set(state => ({
        selectedServiceInfo: state.selectedServiceInfo
          ? { ...state.selectedServiceInfo, ...updates }
          : null,
      })),

    // 페이지네이션 액션
    setCurrentPage: page => set({ currentPage: page }),
    setPageSize: size => set({ pageSize: size }),
    setServiceSearchText: text => set({ serviceSearchText: text }),

    // 로딩 상태 액션
    setIsLoading: loading => set({ isLoading: loading }),
    setIsPipelineLoading: loading => set({ isPipelineLoading: loading }),

    // 인프라 액션
    setInfrastructures: infras => set({ infrastructures: infras }),
    setInfrastructuresLoading: loading =>
      set({ infrastructuresLoading: loading }),

    // 브랜치 액션
    setBranches: branches => set({ branches }),
    setBranchesLoading: loading => set({ branchesLoading: loading }),
    setRegisterBranches: branches => set({ registerBranches: branches }),
    setRegisterBranchesLoading: loading =>
      set({ registerBranchesLoading: loading }),

    // 초기화 액션
    resetSelection: () =>
      set({
        currentRepo: null,
        selectedRepo: null,
        selectedServiceInfo: null,
      }),

    resetAll: () =>
      set({
        repositories: [],
        services: [],
        pipelineStatuses: {},
        currentRepo: null,
        selectedRepo: null,
        selectedServiceInfo: null,
        currentPage: 1,
        pageSize: 10,
        serviceSearchText: '',
        isLoading: false,
        isPipelineLoading: true,
        infrastructures: [],
        infrastructuresLoading: false,
        branches: [],
        branchesLoading: false,
        registerBranches: [],
        registerBranchesLoading: false,
      }),
  })
);

export default useGitRepositoryStore;
