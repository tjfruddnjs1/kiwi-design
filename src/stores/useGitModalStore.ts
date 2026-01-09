/**
 * Git 관련 모달 상태 관리 스토어
 * GitManagement.tsx에서 추출된 모달 관련 상태
 */
import { create } from 'zustand';
import type { SastResultData } from '../types/sast';
import type { DastResult } from '../types/securityAnalysis';

type OperateService = any; // 원래 코드에서 any 타입 사용

// =========================================
// 타입 정의
// =========================================

/** GitLab 액션 타입 */
export type GitLabActionType =
  | 'register'
  | 'create'
  | 'urlSetting'
  | 'createUser'
  | null;

/** 정보 모달 타입 */
export type InfoModalType = 'service' | 'gitlab' | 'registry' | null;

/** 보안 분석 타입 */
export type SecurityAnalysisType = 'sast' | 'sca' | 'dast' | 'sbom';

/** 인증 상태 */
export type AuthStatus = 'idle' | 'success' | 'failed';

/** SAST 모달 뷰 타입 */
export type SastModalView = 'summary' | 'semgrep' | 'codeql' | 'logs' | null;

// =========================================
// 스토어 상태 타입
// =========================================

interface GitModalState {
  // 기본 모달 상태
  isModalOpen: boolean;
  isMemberModalOpen: boolean;
  isEditModalOpen: boolean;
  activeInfoModal: InfoModalType;

  // 커밋/통계 모달
  commitModalOpen: boolean;
  commitModalActiveTab: string;
  buildModalOpen: boolean;
  buildModalActiveTab: string;

  // GitLab 토큰 모달
  gitlabTokenModalOpen: boolean;
  pendingRepoId: number | null;
  gitlabTokenInput: string;
  gitlabBaseUrlInput: string;

  // 토큰 입력 모달
  tokenInputModalOpen: boolean;
  tokenInputServiceId: number | null;
  tokenInputServiceName: string;
  tokenInputGitlabUrl: string;

  // 보안 분석 모달
  securityModalOpen: boolean;
  securityModalRepoId: number | null;
  securityModalRepoName: string;
  securityModalRepoUrl: string;
  securityModalType: SecurityAnalysisType;

  // DAST 파라미터 모달
  dastParamsModalOpen: boolean;
  dastParamsRepoId: number | null;
  dastParamsRepoName: string;
  dastParamsRepoUrl: string;
  dastParamsServiceId: number | null;

  // GitLab 액션 모달
  gitlabActionVisible: GitLabActionType;

  // 인프라 선택 모달
  selectedInfraModal: boolean;
  currentSelectedInfraName: string | undefined;

  // 대기 중인 배포 모달
  pendingDeploymentModalOpen: {
    visible: boolean;
    repo: unknown | null;
    displayKey: string | null;
  };

  // SAST 관련 상태
  modalSastData: SastResultData | null;
  sastModalView: SastModalView;
  isSastScanInProgress: boolean;

  // 운영 모달
  operateModalOpen: boolean;
  operateCurrentService: OperateService | null;
  operateServerHops: string;
  operateInfraId: number | undefined;

  // DAST 모달
  dastModalOpen: boolean;
  dastResult: DastResult | null;

  // 인증 상태
  gitlabAuthLoading: boolean;
  gitlabAuthStatus: AuthStatus;
  registryTestLoading: boolean;
  registryAuthStatus: AuthStatus;

  // 액션 - 기본 모달
  setIsModalOpen: (open: boolean) => void;
  setIsMemberModalOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setActiveInfoModal: (modal: InfoModalType) => void;

  // 액션 - 커밋/통계 모달
  setCommitModalOpen: (open: boolean) => void;
  setCommitModalActiveTab: (tab: string) => void;
  setBuildModalOpen: (open: boolean) => void;
  setBuildModalActiveTab: (tab: string) => void;

  // 액션 - GitLab 토큰 모달
  setGitlabTokenModalOpen: (open: boolean) => void;
  setPendingRepoId: (id: number | null) => void;
  setGitlabTokenInput: (token: string) => void;
  setGitlabBaseUrlInput: (url: string) => void;

  // 액션 - 토큰 입력 모달
  setTokenInputModalOpen: (open: boolean) => void;
  setTokenInputServiceId: (id: number | null) => void;
  setTokenInputServiceName: (name: string) => void;
  setTokenInputGitlabUrl: (url: string) => void;
  openTokenInputModal: (
    serviceId: number,
    serviceName: string,
    gitlabUrl: string
  ) => void;
  closeTokenInputModal: () => void;

  // 액션 - 보안 분석 모달
  setSecurityModalOpen: (open: boolean) => void;
  setSecurityModalRepoId: (id: number | null) => void;
  setSecurityModalRepoName: (name: string) => void;
  setSecurityModalRepoUrl: (url: string) => void;
  setSecurityModalType: (type: SecurityAnalysisType) => void;
  openSecurityModal: (
    repoId: number,
    repoName: string,
    repoUrl: string,
    type: SecurityAnalysisType
  ) => void;
  closeSecurityModal: () => void;

  // 액션 - DAST 파라미터 모달
  setDastParamsModalOpen: (open: boolean) => void;
  setDastParamsRepoId: (id: number | null) => void;
  setDastParamsRepoName: (name: string) => void;
  setDastParamsRepoUrl: (url: string) => void;
  setDastParamsServiceId: (id: number | null) => void;
  openDastParamsModal: (
    repoId: number,
    repoName: string,
    repoUrl: string,
    serviceId: number | null
  ) => void;
  closeDastParamsModal: () => void;

  // 액션 - GitLab 액션 모달
  setGitlabActionVisible: (action: GitLabActionType) => void;

  // 액션 - 인프라 선택 모달
  setSelectedInfraModal: (open: boolean) => void;
  setCurrentSelectedInfraName: (name: string | undefined) => void;

  // 액션 - 대기 중인 배포 모달
  setPendingDeploymentModalOpen: (state: {
    visible: boolean;
    repo: unknown | null;
    displayKey: string | null;
  }) => void;

  // 액션 - SAST 관련
  setModalSastData: (data: SastResultData | null) => void;
  setSastModalView: (view: SastModalView) => void;
  setIsSastScanInProgress: (inProgress: boolean) => void;

  // 액션 - 운영 모달
  setOperateModalOpen: (open: boolean) => void;
  setOperateCurrentService: (service: OperateService | null) => void;
  setOperateServerHops: (hops: string) => void;
  setOperateInfraId: (id: number | undefined) => void;
  openOperateModal: (
    service: OperateService | null,
    serverHops: string,
    infraId: number | undefined
  ) => void;
  closeOperateModal: () => void;

  // 액션 - DAST 모달
  setDastModalOpen: (open: boolean) => void;
  setDastResult: (result: DastResult | null) => void;

  // 액션 - 인증 상태
  setGitlabAuthLoading: (loading: boolean) => void;
  setGitlabAuthStatus: (status: AuthStatus) => void;
  setRegistryTestLoading: (loading: boolean) => void;
  setRegistryAuthStatus: (status: AuthStatus) => void;
  resetAuthStatus: () => void;

  // 초기화
  resetAllModals: () => void;
}

// =========================================
// 스토어 생성
// =========================================

export const useGitModalStore = create<GitModalState>()(set => ({
  // 초기 상태
  isModalOpen: false,
  isMemberModalOpen: false,
  isEditModalOpen: false,
  activeInfoModal: null,

  commitModalOpen: false,
  commitModalActiveTab: 'statistics',
  buildModalOpen: false,
  buildModalActiveTab: 'statistics',

  gitlabTokenModalOpen: false,
  pendingRepoId: null,
  gitlabTokenInput: '',
  gitlabBaseUrlInput: '',

  tokenInputModalOpen: false,
  tokenInputServiceId: null,
  tokenInputServiceName: '',
  tokenInputGitlabUrl: '',

  securityModalOpen: false,
  securityModalRepoId: null,
  securityModalRepoName: '',
  securityModalRepoUrl: '',
  securityModalType: 'sast',

  dastParamsModalOpen: false,
  dastParamsRepoId: null,
  dastParamsRepoName: '',
  dastParamsRepoUrl: '',
  dastParamsServiceId: null,

  gitlabActionVisible: null,

  selectedInfraModal: false,
  currentSelectedInfraName: undefined,

  pendingDeploymentModalOpen: {
    visible: false,
    repo: null,
    displayKey: null,
  },

  modalSastData: null,
  sastModalView: null,
  isSastScanInProgress: false,

  operateModalOpen: false,
  operateCurrentService: null,
  operateServerHops: '',
  operateInfraId: undefined,

  dastModalOpen: false,
  dastResult: null,

  gitlabAuthLoading: false,
  gitlabAuthStatus: 'idle',
  registryTestLoading: false,
  registryAuthStatus: 'idle',

  // 기본 모달 액션
  setIsModalOpen: open => set({ isModalOpen: open }),
  setIsMemberModalOpen: open => set({ isMemberModalOpen: open }),
  setIsEditModalOpen: open => set({ isEditModalOpen: open }),
  setActiveInfoModal: modal => set({ activeInfoModal: modal }),

  // 커밋/통계 모달 액션
  setCommitModalOpen: open => set({ commitModalOpen: open }),
  setCommitModalActiveTab: tab => set({ commitModalActiveTab: tab }),
  setBuildModalOpen: open => set({ buildModalOpen: open }),
  setBuildModalActiveTab: tab => set({ buildModalActiveTab: tab }),

  // GitLab 토큰 모달 액션
  setGitlabTokenModalOpen: open => set({ gitlabTokenModalOpen: open }),
  setPendingRepoId: id => set({ pendingRepoId: id }),
  setGitlabTokenInput: token => set({ gitlabTokenInput: token }),
  setGitlabBaseUrlInput: url => set({ gitlabBaseUrlInput: url }),

  // 토큰 입력 모달 액션
  setTokenInputModalOpen: open => set({ tokenInputModalOpen: open }),
  setTokenInputServiceId: id => set({ tokenInputServiceId: id }),
  setTokenInputServiceName: name => set({ tokenInputServiceName: name }),
  setTokenInputGitlabUrl: url => set({ tokenInputGitlabUrl: url }),

  openTokenInputModal: (serviceId, serviceName, gitlabUrl) =>
    set({
      tokenInputModalOpen: true,
      tokenInputServiceId: serviceId,
      tokenInputServiceName: serviceName,
      tokenInputGitlabUrl: gitlabUrl,
    }),

  closeTokenInputModal: () =>
    set({
      tokenInputModalOpen: false,
      tokenInputServiceId: null,
      tokenInputServiceName: '',
      tokenInputGitlabUrl: '',
    }),

  // 보안 분석 모달 액션
  setSecurityModalOpen: open => set({ securityModalOpen: open }),
  setSecurityModalRepoId: id => set({ securityModalRepoId: id }),
  setSecurityModalRepoName: name => set({ securityModalRepoName: name }),
  setSecurityModalRepoUrl: url => set({ securityModalRepoUrl: url }),
  setSecurityModalType: type => set({ securityModalType: type }),

  openSecurityModal: (repoId, repoName, repoUrl, type) =>
    set({
      securityModalOpen: true,
      securityModalRepoId: repoId,
      securityModalRepoName: repoName,
      securityModalRepoUrl: repoUrl,
      securityModalType: type,
    }),

  closeSecurityModal: () =>
    set({
      securityModalOpen: false,
      securityModalRepoId: null,
      securityModalRepoName: '',
      securityModalRepoUrl: '',
    }),

  // DAST 파라미터 모달 액션
  setDastParamsModalOpen: open => set({ dastParamsModalOpen: open }),
  setDastParamsRepoId: id => set({ dastParamsRepoId: id }),
  setDastParamsRepoName: name => set({ dastParamsRepoName: name }),
  setDastParamsRepoUrl: url => set({ dastParamsRepoUrl: url }),
  setDastParamsServiceId: id => set({ dastParamsServiceId: id }),

  openDastParamsModal: (repoId, repoName, repoUrl, serviceId) =>
    set({
      dastParamsModalOpen: true,
      dastParamsRepoId: repoId,
      dastParamsRepoName: repoName,
      dastParamsRepoUrl: repoUrl,
      dastParamsServiceId: serviceId,
    }),

  closeDastParamsModal: () =>
    set({
      dastParamsModalOpen: false,
      dastParamsRepoId: null,
      dastParamsRepoName: '',
      dastParamsRepoUrl: '',
      dastParamsServiceId: null,
    }),

  // GitLab 액션 모달 액션
  setGitlabActionVisible: action => set({ gitlabActionVisible: action }),

  // 인프라 선택 모달 액션
  setSelectedInfraModal: open => set({ selectedInfraModal: open }),
  setCurrentSelectedInfraName: name => set({ currentSelectedInfraName: name }),

  // 대기 중인 배포 모달 액션
  setPendingDeploymentModalOpen: state =>
    set({ pendingDeploymentModalOpen: state }),

  // SAST 관련 액션
  setModalSastData: data => set({ modalSastData: data }),
  setSastModalView: view => set({ sastModalView: view }),
  setIsSastScanInProgress: inProgress =>
    set({ isSastScanInProgress: inProgress }),

  // 운영 모달 액션
  setOperateModalOpen: open => set({ operateModalOpen: open }),
  setOperateCurrentService: service => set({ operateCurrentService: service }),
  setOperateServerHops: hops => set({ operateServerHops: hops }),
  setOperateInfraId: id => set({ operateInfraId: id }),

  openOperateModal: (service, serverHops, infraId) =>
    set({
      operateModalOpen: true,
      operateCurrentService: service,
      operateServerHops: serverHops,
      operateInfraId: infraId,
    }),

  closeOperateModal: () =>
    set({
      operateModalOpen: false,
      operateCurrentService: null,
      operateServerHops: '',
      operateInfraId: undefined,
    }),

  // DAST 모달 액션
  setDastModalOpen: open => set({ dastModalOpen: open }),
  setDastResult: result => set({ dastResult: result }),

  // 인증 상태 액션
  setGitlabAuthLoading: loading => set({ gitlabAuthLoading: loading }),
  setGitlabAuthStatus: status => set({ gitlabAuthStatus: status }),
  setRegistryTestLoading: loading => set({ registryTestLoading: loading }),
  setRegistryAuthStatus: status => set({ registryAuthStatus: status }),

  resetAuthStatus: () =>
    set({
      gitlabAuthLoading: false,
      gitlabAuthStatus: 'idle',
      registryTestLoading: false,
      registryAuthStatus: 'idle',
    }),

  // 전체 모달 초기화
  resetAllModals: () =>
    set({
      isModalOpen: false,
      isMemberModalOpen: false,
      isEditModalOpen: false,
      activeInfoModal: null,
      commitModalOpen: false,
      commitModalActiveTab: 'statistics',
      buildModalOpen: false,
      buildModalActiveTab: 'statistics',
      gitlabTokenModalOpen: false,
      pendingRepoId: null,
      gitlabTokenInput: '',
      gitlabBaseUrlInput: '',
      tokenInputModalOpen: false,
      tokenInputServiceId: null,
      tokenInputServiceName: '',
      tokenInputGitlabUrl: '',
      securityModalOpen: false,
      securityModalRepoId: null,
      securityModalRepoName: '',
      securityModalRepoUrl: '',
      securityModalType: 'sast',
      dastParamsModalOpen: false,
      dastParamsRepoId: null,
      dastParamsRepoName: '',
      dastParamsRepoUrl: '',
      dastParamsServiceId: null,
      gitlabActionVisible: null,
      selectedInfraModal: false,
      currentSelectedInfraName: undefined,
      pendingDeploymentModalOpen: {
        visible: false,
        repo: null,
        displayKey: null,
      },
      modalSastData: null,
      sastModalView: null,
      isSastScanInProgress: false,
      operateModalOpen: false,
      operateCurrentService: null,
      operateServerHops: '',
      operateInfraId: undefined,
      dastModalOpen: false,
      dastResult: null,
      gitlabAuthLoading: false,
      gitlabAuthStatus: 'idle',
      registryTestLoading: false,
      registryAuthStatus: 'idle',
    }),
}));

export default useGitModalStore;
