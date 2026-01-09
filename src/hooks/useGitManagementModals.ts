/**
 * GitManagement 페이지의 모달 상태를 관리하는 커스텀 훅
 * 18개 이상의 모달 상태를 그룹화하여 관리합니다.
 */
import { useState, useCallback } from 'react';
import type { GitRepository } from '../pages/gits/GitManagement';
import type { DisplayKey } from '../components/dashboard/AIWorkflow-constants';

// =========================================
// 타입 정의
// =========================================

/** GitLab 액션 모달 타입 */
export type GitlabActionType =
  | 'register'
  | 'create'
  | 'urlSetting'
  | 'createUser'
  | null;

/** 정보 모달 탭 타입 */
export type InfoModalTab = 'service' | 'gitlab' | 'registry' | null;

/** 보안 분석 타입 */
export type SecurityModalType = 'sast' | 'sca' | 'dast';

/** 커밋 모달 상태 */
export interface CommitModalState {
  isOpen: boolean;
  repo: GitRepository | null;
  activeTab: string;
}

/** 빌드 모달 상태 */
export interface BuildModalState {
  isOpen: boolean;
  activeTab: string;
}

/** 보안 분석 모달 상태 */
export interface SecurityModalState {
  isOpen: boolean;
  repoId: number | null;
  repoName: string;
  repoUrl: string;
  type: SecurityModalType;
}

/** DAST 파라미터 모달 상태 */
export interface DastParamsModalState {
  isOpen: boolean;
  repoId: number | null;
  repoName: string;
  repoUrl: string;
  serviceId: number | null;
}

/** GitLab 토큰 입력 모달 상태 (소스 클릭 시) */
export interface TokenInputModalState {
  isOpen: boolean;
  serviceId: number | null;
  serviceName: string;
  gitlabUrl: string;
}

/** 상세 모달 상태 */
export interface DetailModalState {
  isOpen: boolean;
  repo: GitRepository | null;
  displayKey: DisplayKey | null;
}

/** 대기 배포 모달 상태 */
export type PendingDeploymentModalState = {
  repo: GitRepository;
  displayKey: DisplayKey;
} | null;

/** 운영 모달 상태 */
export interface OperateModalState {
  isOpen: boolean;
  serviceId: number | null;
  serviceName: string;
  infraId: number | null;
}

// =========================================
// 훅 반환 타입
// =========================================
export interface UseGitManagementModalsReturn {
  // 기본 모달 상태
  createModal: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
  memberModal: {
    isOpen: boolean;
    repo: GitRepository | null;
    open: (repo: GitRepository) => void;
    close: () => void;
  };
  editModal: {
    isOpen: boolean;
    activeTab: InfoModalTab;
    repo: GitRepository | null;
    open: (repo: GitRepository, tab?: InfoModalTab) => void;
    close: () => void;
    setActiveTab: (tab: InfoModalTab) => void;
  };

  // GitLab 관련 모달
  gitlabAction: {
    type: GitlabActionType;
    open: (action: Exclude<GitlabActionType, null>) => void;
    close: () => void;
    goBackToCreate: () => void;
  };
  gitlabTokenModal: {
    isOpen: boolean;
    repoId: number | null;
    token: string;
    baseUrl: string;
    open: (repoId: number) => void;
    close: () => void;
    setToken: (token: string) => void;
    setBaseUrl: (url: string) => void;
  };
  tokenInputModal: TokenInputModalState & {
    open: (serviceId: number, serviceName: string, gitlabUrl: string) => void;
    close: () => void;
  };

  // 커밋 & 빌드 모달
  commitModal: CommitModalState & {
    open: (repo: GitRepository) => void;
    close: () => void;
    setActiveTab: (tab: string) => void;
  };
  buildModal: BuildModalState & {
    open: () => void;
    close: () => void;
    setActiveTab: (tab: string) => void;
  };

  // 보안 분석 모달
  securityModal: SecurityModalState & {
    open: (
      repoId: number,
      repoName: string,
      repoUrl: string,
      type: SecurityModalType
    ) => void;
    close: () => void;
    setType: (type: SecurityModalType) => void;
  };
  dastParamsModal: DastParamsModalState & {
    open: (
      repoId: number,
      repoName: string,
      repoUrl: string,
      serviceId: number | null
    ) => void;
    close: () => void;
  };
  dastModal: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };

  // 실행 모달
  executionModal: {
    isVisible: boolean;
    open: () => void;
    close: () => void;
  };
  buildExecutionModal: {
    isVisible: boolean;
    open: () => void;
    close: () => void;
  };

  // 상세 & 기타 모달
  detailModal: DetailModalState & {
    open: (repo: GitRepository, displayKey: DisplayKey) => void;
    close: () => void;
  };
  pendingDeploymentModal: {
    state: PendingDeploymentModalState;
    set: (state: PendingDeploymentModalState) => void;
    clear: () => void;
  };
  infraSelectorModal: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
  operateModal: OperateModalState & {
    open: (
      serviceId: number,
      serviceName: string,
      infraId: number | null
    ) => void;
    close: () => void;
  };
}

// =========================================
// 훅 구현
// =========================================
export function useGitManagementModals(): UseGitManagementModalsReturn {
  // ========== 기본 모달 상태 ==========
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalRepo, setMemberModalRepo] = useState<GitRepository | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalRepo, setEditModalRepo] = useState<GitRepository | null>(
    null
  );
  const [activeInfoTab, setActiveInfoTab] = useState<InfoModalTab>(null);

  // ========== GitLab 관련 모달 ==========
  const [gitlabActionType, setGitlabActionType] =
    useState<GitlabActionType>(null);
  const [gitlabTokenModalOpen, setGitlabTokenModalOpen] = useState(false);
  const [gitlabTokenRepoId, setGitlabTokenRepoId] = useState<number | null>(
    null
  );
  const [gitlabTokenInput, setGitlabTokenInput] = useState('');
  const [gitlabBaseUrlInput, setGitlabBaseUrlInput] = useState('');

  // 토큰 입력 모달 (소스 클릭 시)
  const [tokenInputModalOpen, setTokenInputModalOpen] = useState(false);
  const [tokenInputServiceId, setTokenInputServiceId] = useState<number | null>(
    null
  );
  const [tokenInputServiceName, setTokenInputServiceName] = useState('');
  const [tokenInputGitlabUrl, setTokenInputGitlabUrl] = useState('');

  // ========== 커밋 & 빌드 모달 ==========
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitModalRepo, setCommitModalRepo] = useState<GitRepository | null>(
    null
  );
  const [commitModalActiveTab, setCommitModalActiveTab] =
    useState('statistics');
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [buildModalActiveTab, setBuildModalActiveTab] = useState('statistics');

  // ========== 보안 분석 모달 ==========
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityModalRepoId, setSecurityModalRepoId] = useState<number | null>(
    null
  );
  const [securityModalRepoName, setSecurityModalRepoName] = useState('');
  const [securityModalRepoUrl, setSecurityModalRepoUrl] = useState('');
  const [securityModalType, setSecurityModalType] =
    useState<SecurityModalType>('sast');

  const [dastParamsModalOpen, setDastParamsModalOpen] = useState(false);
  const [dastParamsRepoId, setDastParamsRepoId] = useState<number | null>(null);
  const [dastParamsRepoName, setDastParamsRepoName] = useState('');
  const [dastParamsRepoUrl, setDastParamsRepoUrl] = useState('');
  const [dastParamsServiceId, setDastParamsServiceId] = useState<number | null>(
    null
  );

  const [dastModalOpen, setDastModalOpen] = useState(false);

  // ========== 실행 모달 ==========
  const [isExecutionModalVisible, setIsExecutionModalVisible] = useState(false);
  const [isBuildExecutionModalVisible, setIsBuildExecutionModalVisible] =
    useState(false);

  // ========== 상세 & 기타 모달 ==========
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalRepo, setDetailModalRepo] = useState<GitRepository | null>(
    null
  );
  const [detailModalDisplayKey, setDetailModalDisplayKey] =
    useState<DisplayKey | null>(null);

  const [pendingDeployment, setPendingDeployment] =
    useState<PendingDeploymentModalState>(null);
  const [infraSelectorModalOpen, setInfraSelectorModalOpen] = useState(false);

  const [operateModalOpen, setOperateModalOpen] = useState(false);
  const [operateModalServiceId, setOperateModalServiceId] = useState<
    number | null
  >(null);
  const [operateModalServiceName, setOperateModalServiceName] = useState('');
  const [operateModalInfraId, setOperateModalInfraId] = useState<number | null>(
    null
  );

  // ========== 콜백 함수 ==========

  // 기본 모달
  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);

  const openMemberModal = useCallback((repo: GitRepository) => {
    setMemberModalRepo(repo);
    setIsMemberModalOpen(true);
  }, []);
  const closeMemberModal = useCallback(() => {
    setIsMemberModalOpen(false);
    setMemberModalRepo(null);
  }, []);

  const openEditModal = useCallback(
    (repo: GitRepository, tab: InfoModalTab = null) => {
      setEditModalRepo(repo);
      setActiveInfoTab(tab);
      setIsEditModalOpen(true);
    },
    []
  );
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditModalRepo(null);
    setActiveInfoTab(null);
  }, []);

  // GitLab 액션 모달
  const openGitlabAction = useCallback(
    (action: Exclude<GitlabActionType, null>) => {
      closeCreateModal();
      setGitlabActionType(action);
    },
    [closeCreateModal]
  );
  const closeGitlabAction = useCallback(() => setGitlabActionType(null), []);
  const goBackToCreate = useCallback(() => {
    closeGitlabAction();
    setTimeout(() => openCreateModal(), 80);
  }, [closeGitlabAction, openCreateModal]);

  // GitLab 토큰 모달
  const openGitlabTokenModal = useCallback((repoId: number) => {
    setGitlabTokenRepoId(repoId);
    setGitlabTokenInput('');
    setGitlabBaseUrlInput('');
    setGitlabTokenModalOpen(true);
  }, []);
  const closeGitlabTokenModal = useCallback(() => {
    setGitlabTokenModalOpen(false);
    setGitlabTokenRepoId(null);
  }, []);

  // 토큰 입력 모달
  const openTokenInputModal = useCallback(
    (serviceId: number, serviceName: string, gitlabUrl: string) => {
      setTokenInputServiceId(serviceId);
      setTokenInputServiceName(serviceName);
      setTokenInputGitlabUrl(gitlabUrl);
      setTokenInputModalOpen(true);
    },
    []
  );
  const closeTokenInputModal = useCallback(() => {
    setTokenInputModalOpen(false);
    setTokenInputServiceId(null);
    setTokenInputServiceName('');
    setTokenInputGitlabUrl('');
  }, []);

  // 커밋 모달
  const openCommitModal = useCallback((repo: GitRepository) => {
    setCommitModalRepo(repo);
    setCommitModalActiveTab('statistics');
    setCommitModalOpen(true);
  }, []);
  const closeCommitModal = useCallback(() => {
    setCommitModalOpen(false);
    setCommitModalRepo(null);
  }, []);

  // 빌드 모달
  const openBuildModal = useCallback(() => {
    setBuildModalActiveTab('statistics');
    setBuildModalOpen(true);
  }, []);
  const closeBuildModal = useCallback(() => setBuildModalOpen(false), []);

  // 보안 분석 모달
  const openSecurityModal = useCallback(
    (
      repoId: number,
      repoName: string,
      repoUrl: string,
      type: SecurityModalType
    ) => {
      setSecurityModalRepoId(repoId);
      setSecurityModalRepoName(repoName);
      setSecurityModalRepoUrl(repoUrl);
      setSecurityModalType(type);
      setSecurityModalOpen(true);
    },
    []
  );
  const closeSecurityModal = useCallback(() => {
    setSecurityModalOpen(false);
    setSecurityModalRepoId(null);
    setSecurityModalRepoName('');
    setSecurityModalRepoUrl('');
  }, []);

  // DAST 파라미터 모달
  const openDastParamsModal = useCallback(
    (
      repoId: number,
      repoName: string,
      repoUrl: string,
      serviceId: number | null
    ) => {
      setDastParamsRepoId(repoId);
      setDastParamsRepoName(repoName);
      setDastParamsRepoUrl(repoUrl);
      setDastParamsServiceId(serviceId);
      setDastParamsModalOpen(true);
    },
    []
  );
  const closeDastParamsModal = useCallback(() => {
    setDastParamsModalOpen(false);
    setDastParamsRepoId(null);
    setDastParamsRepoName('');
    setDastParamsRepoUrl('');
    setDastParamsServiceId(null);
  }, []);

  // DAST 결과 모달
  const openDastModal = useCallback(() => setDastModalOpen(true), []);
  const closeDastModal = useCallback(() => setDastModalOpen(false), []);

  // 실행 모달
  const openExecutionModal = useCallback(
    () => setIsExecutionModalVisible(true),
    []
  );
  const closeExecutionModal = useCallback(
    () => setIsExecutionModalVisible(false),
    []
  );
  const openBuildExecutionModal = useCallback(
    () => setIsBuildExecutionModalVisible(true),
    []
  );
  const closeBuildExecutionModal = useCallback(
    () => setIsBuildExecutionModalVisible(false),
    []
  );

  // 상세 모달
  const openDetailModal = useCallback(
    (repo: GitRepository, displayKey: DisplayKey) => {
      setDetailModalRepo(repo);
      setDetailModalDisplayKey(displayKey);
      setIsDetailModalOpen(true);
    },
    []
  );
  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setDetailModalRepo(null);
    setDetailModalDisplayKey(null);
  }, []);

  // 인프라 선택 모달
  const openInfraSelectorModal = useCallback(
    () => setInfraSelectorModalOpen(true),
    []
  );
  const closeInfraSelectorModal = useCallback(
    () => setInfraSelectorModalOpen(false),
    []
  );

  // 운영 모달
  const openOperateModal = useCallback(
    (serviceId: number, serviceName: string, infraId: number | null) => {
      setOperateModalServiceId(serviceId);
      setOperateModalServiceName(serviceName);
      setOperateModalInfraId(infraId);
      setOperateModalOpen(true);
    },
    []
  );
  const closeOperateModal = useCallback(() => {
    setOperateModalOpen(false);
    setOperateModalServiceId(null);
    setOperateModalServiceName('');
    setOperateModalInfraId(null);
  }, []);

  // ========== 반환 객체 ==========
  return {
    createModal: {
      isOpen: isCreateModalOpen,
      open: openCreateModal,
      close: closeCreateModal,
    },
    memberModal: {
      isOpen: isMemberModalOpen,
      repo: memberModalRepo,
      open: openMemberModal,
      close: closeMemberModal,
    },
    editModal: {
      isOpen: isEditModalOpen,
      activeTab: activeInfoTab,
      repo: editModalRepo,
      open: openEditModal,
      close: closeEditModal,
      setActiveTab: setActiveInfoTab,
    },
    gitlabAction: {
      type: gitlabActionType,
      open: openGitlabAction,
      close: closeGitlabAction,
      goBackToCreate: goBackToCreate,
    },
    gitlabTokenModal: {
      isOpen: gitlabTokenModalOpen,
      repoId: gitlabTokenRepoId,
      token: gitlabTokenInput,
      baseUrl: gitlabBaseUrlInput,
      open: openGitlabTokenModal,
      close: closeGitlabTokenModal,
      setToken: setGitlabTokenInput,
      setBaseUrl: setGitlabBaseUrlInput,
    },
    tokenInputModal: {
      isOpen: tokenInputModalOpen,
      serviceId: tokenInputServiceId,
      serviceName: tokenInputServiceName,
      gitlabUrl: tokenInputGitlabUrl,
      open: openTokenInputModal,
      close: closeTokenInputModal,
    },
    commitModal: {
      isOpen: commitModalOpen,
      repo: commitModalRepo,
      activeTab: commitModalActiveTab,
      open: openCommitModal,
      close: closeCommitModal,
      setActiveTab: setCommitModalActiveTab,
    },
    buildModal: {
      isOpen: buildModalOpen,
      activeTab: buildModalActiveTab,
      open: openBuildModal,
      close: closeBuildModal,
      setActiveTab: setBuildModalActiveTab,
    },
    securityModal: {
      isOpen: securityModalOpen,
      repoId: securityModalRepoId,
      repoName: securityModalRepoName,
      repoUrl: securityModalRepoUrl,
      type: securityModalType,
      open: openSecurityModal,
      close: closeSecurityModal,
      setType: setSecurityModalType,
    },
    dastParamsModal: {
      isOpen: dastParamsModalOpen,
      repoId: dastParamsRepoId,
      repoName: dastParamsRepoName,
      repoUrl: dastParamsRepoUrl,
      serviceId: dastParamsServiceId,
      open: openDastParamsModal,
      close: closeDastParamsModal,
    },
    dastModal: {
      isOpen: dastModalOpen,
      open: openDastModal,
      close: closeDastModal,
    },
    executionModal: {
      isVisible: isExecutionModalVisible,
      open: openExecutionModal,
      close: closeExecutionModal,
    },
    buildExecutionModal: {
      isVisible: isBuildExecutionModalVisible,
      open: openBuildExecutionModal,
      close: closeBuildExecutionModal,
    },
    detailModal: {
      isOpen: isDetailModalOpen,
      repo: detailModalRepo,
      displayKey: detailModalDisplayKey,
      open: openDetailModal,
      close: closeDetailModal,
    },
    pendingDeploymentModal: {
      state: pendingDeployment,
      set: setPendingDeployment,
      clear: () => setPendingDeployment(null),
    },
    infraSelectorModal: {
      isOpen: infraSelectorModalOpen,
      open: openInfraSelectorModal,
      close: closeInfraSelectorModal,
    },
    operateModal: {
      isOpen: operateModalOpen,
      serviceId: operateModalServiceId,
      serviceName: operateModalServiceName,
      infraId: operateModalInfraId,
      open: openOperateModal,
      close: closeOperateModal,
    },
  };
}

export default useGitManagementModals;
