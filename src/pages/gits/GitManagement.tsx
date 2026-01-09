import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gitApi } from '../../lib/api/gitRepository';
import './GitManagement.css';
// apiClient는 utils/securityAnalysisUtils.ts에서 사용
import {
  BarChartOutlined,
  CloudServerOutlined,
  CloudUploadOutlined,
  ClusterOutlined,
  ContainerOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  GithubOutlined,
  LeftOutlined,
  LinkOutlined,
  MonitorOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  desiredDisplayName,
  desiredToLegacyStage,
  DisplayKey,
} from '../../components/dashboard/AIWorkflow-constants'; //  상수/타입 import 추가
import BuildExecutionModal from '../../components/dashboard/BuildExecutionModal'; //  빌드 실행 모달 import 추가
import ExecutionModal from '../../components/dashboard/ExecutionModal'; //  실행 모달 import 추가
import CompactPipelineView from '../../components/gits/CompactPipelineView'; //  신규 컴포넌트 import
import { useAuth } from '../../context/AuthContext';
import { infraApi } from '../../lib/api'; //  infraApi import 추가
import { pipelineApi, PipelineStep } from '../../lib/api/pipeline'; //  파이프라인 API 및 타입 import
import { getRepositoryBranches } from '../../lib/api/repository'; //  브랜치 조회 API import
import { serviceApi } from '../../lib/api/service'; //  serviceApi import 추가
import { useCredsStore } from '../../stores/useCredsStore';
import { SastResultData } from '../../types/sast';
import InfraSelectorModal from './infraSelectorModal'; //  인프라 선택 모달 import
import MemberModal from './MemberModal';
// 통일된 보안 분석 모달 import
import BuildWizardContent from '../../components/gits/BuildWizardContent'; //  빌드 환경 생성 탭 컨텐츠
import DastParamsModal from '../../components/gits/DastParamsModal';
import DastResultModal from '../../components/gits/DastResultModal'; //  DAST 전용 모달 추가
import SecurityResultModal from '../../components/gits/SecurityResultModal';
import { userApi } from '../../lib/api/endpoints/user';
import type { DastScanParams } from '../../types/securityAnalysis';
//  저장소 통계 관련 import
import { RepositoryStatistics } from '../../components/gits/RepositoryStatistics';
//  빌드 통계 관련 import
import BuildStatistics from '../../components/builds/BuildStatistics';
//  인프라 관련 import
import { getInfrastructures } from '../../lib/api/infra';
import type { InfraItem } from '../../types/infra';
import GitLabTokenInputModal from './GitLabTokenInputModal'; //  GitLab 토큰 입력 모달 import
//  운영 모달 import
import ImprovedOperateModal from '../../components/services/ImprovedOperateModal';
import organizationApi, {
  GitUrlDTO,
} from '../../lib/api/endpoints/organization';
//  [추가] 보안 분석 타입 import
import type {
  DastApiResponse,
  DastResult,
  ScaApiResponse,
  ScaResult,
} from '../../types/securityAnalysis';
//  [추가] SBOM 컴포넌트 import
//  [추가] 인프라 타입 유틸리티 함수 import
import { getDisplayInfraType, getInfraTypeColor } from '../../utils/infraUtils';
//  [추가] 탭에 직접 렌더링하기 위한 콘텐츠 컴포넌트 import
import SastResultContent from '../../components/gits/SastResultContent';
import ScaResultsContent from '../../components/gits/ScaResultsContent';
//  [추가] useSecurityScan 훅 import
import { useSecurityScan } from '../../hooks/useSecurityScan';
//  [추가] 리팩토링된 커스텀 훅들 import
import DetailModalContent from '../../components/gits/DetailModalContent';
import { EmptyState } from '../../components/security/shared/EmptyState';
import { useBuildServerInfo } from '../../hooks/useBuildServerInfo';
import { normalizeStatusForPolling } from '../../hooks/usePipelineStatus';
import { useStatistics } from '../../hooks/useStatistics';
//  [추가] 리팩토링된 유틸리티 함수 import
import {
  getBaseUrlFromGitUrl,
  transformDbStepsToWorkflow,
} from '../../utils/gitManagement';
import {
  codeqlAnalysis,
  parseSastErrorMessage,
  semgrepAnalysis,
  type SastSingleResult,
} from '../../utils/securityAnalysisUtils';
//  Zustand 스토어 import
import { useGitModalStore } from '../../stores/useGitModalStore';
//  [추가] 보안 검사 경고 모달 import
import SecurityCheckWarningModal, {
  checkScaCriticalVulnerabilities,
  type CriticalVulnerabilitySummary,
  type SecurityCheckCategory,
  type SecurityCheckStage,
  type SecurityWarningType,
} from '../../components/common/SecurityCheckWarningModal';

const { Option } = Select;

// Git 관련 타입
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
  dockerRegistry?: string; //  dockerRegistry 필드 추가
  group?: number;
  groupFullPath?: string;
  infraType?: string; // 인프라 타입 (kubernetes, docker 등)
}

export interface GitlabUser {
  gitlabUrl: string;
  groupID: number;
  userAuth: number;
  username: string;
  name: string;
  email: string;
  password: string;
}

// 컬럼 내부 타입
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

//  [추가] 서비스 정보를 가져오기 위한 타입
export interface ServiceInfo {
  id: number;
  name: string;
  gitlab_url: string; //  gitlab_url 필드 추가
  gitlab_access_token?: string; //  gitlab_access_token 필드 추가 (DB에서 조회)
  gitlab_config?: string; //  gitlab_config JSON 문자열 (token, branch, username 포함)
  hops?: { String: string; Valid: boolean }; //  Hops 정보 추가
  registry_config?: string; //  Docker Registry 설정 추가
  is_deployed: boolean; //  배포 상태 추가
  infraType?: string; //  인프라 타입 추가 (docker, kubernetes 등)
  infra_id?: number; //  인프라 ID 추가
  created_at?: string;
}

export interface GroupInfo {
  id: number;
  name: string;
  fullPath: string;
}

//  [리팩토링] loadBuildServerInfoForDeploy 함수는 useBuildServerInfo 훅으로 대체됨
// 해당 기능은 frontend/src/hooks/useBuildServerInfo.ts 에서 제공됩니다.

// DetailModalContent와 WorkflowStatus는 별도 파일에서 import됨

const GitManagement: React.FC = () => {
  //  [리팩토링] Zustand 스토어에서 모달 상태 가져오기
  const {
    // GitLab 토큰 모달
    gitlabTokenModalOpen,
    setGitlabTokenModalOpen,
    pendingRepoId,
    setPendingRepoId,
    gitlabTokenInput,
    setGitlabTokenInput,
    gitlabBaseUrlInput,
    setGitlabBaseUrlInput,
    // 커밋 모달
    commitModalOpen,
    setCommitModalOpen,
    commitModalActiveTab,
    setCommitModalActiveTab,
    // 빌드 모달
    buildModalOpen,
    setBuildModalOpen,
    buildModalActiveTab,
    setBuildModalActiveTab,
    // 토큰 입력 모달
    tokenInputModalOpen,
    setTokenInputModalOpen,
    tokenInputServiceId,
    setTokenInputServiceId,
    tokenInputServiceName,
    setTokenInputServiceName,
    tokenInputGitlabUrl,
    setTokenInputGitlabUrl,
    openTokenInputModal,
    closeTokenInputModal,
    // 보안 분석 모달
    securityModalOpen,
    setSecurityModalOpen,
    securityModalRepoId,
    setSecurityModalRepoId,
    securityModalRepoName,
    setSecurityModalRepoName,
    securityModalRepoUrl,
    setSecurityModalRepoUrl,
    securityModalType,
    setSecurityModalType,
    openSecurityModal,
    closeSecurityModal,
    // DAST 파라미터 모달
    dastParamsModalOpen,
    setDastParamsModalOpen,
    dastParamsRepoId,
    setDastParamsRepoId,
    dastParamsRepoName,
    setDastParamsRepoName,
    dastParamsRepoUrl,
    setDastParamsRepoUrl,
    dastParamsServiceId,
    setDastParamsServiceId,
    openDastParamsModal,
    closeDastParamsModal,
    // 기본 모달
    isModalOpen,
    setIsModalOpen,
    isMemberModalOpen,
    setIsMemberModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    activeInfoModal,
    setActiveInfoModal,
    // 인프라 선택 모달
    selectedInfraModal,
    setSelectedInfraModal,
    currentSelectedInfraName,
    setCurrentSelectedInfraName,
    // SAST 관련
    modalSastData,
    setModalSastData,
    sastModalView,
    setSastModalView,
    isSastScanInProgress,
    setIsSastScanInProgress,
    // 운영 모달
    operateModalOpen,
    setOperateModalOpen,
    operateCurrentService,
    setOperateCurrentService,
    operateServerHops,
    setOperateServerHops,
    operateInfraId,
    setOperateInfraId,
    openOperateModal,
    closeOperateModal,
    // DAST 모달
    dastModalOpen,
    setDastModalOpen,
    dastResult,
    setDastResult,
    // 인증 상태
    gitlabAuthLoading,
    setGitlabAuthLoading,
    gitlabAuthStatus,
    setGitlabAuthStatus,
    registryTestLoading,
    setRegistryTestLoading,
    registryAuthStatus,
    setRegistryAuthStatus,
    resetAuthStatus,
  } = useGitModalStore();

  const [repositories, setRepositories] = useState<GitRepository[]>([]);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 서비스 검색 상태
  const [serviceSearchText, setServiceSearchText] = useState('');

  // 사용자 정보 상태 추가
  // const [userGitlabURL, setUserGitlabURL] = useState<string>(); //  미사용
  //  파이프라인 상태 저장
  const [pipelineStatuses, setPipelineStatuses] = useState<
    Record<number, PipelineStep[]>
  >({});
  const [isPipelineLoading, setIsPipelineLoading] = useState<boolean>(true);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [nextAction, setNextAction] = useState<{
    repo: GitRepository;
    displayKey: DisplayKey;
  } | null>(null);

  // useCredsStore에서 보안 분석 상태 관리
  //  sourceRepository를 구독하여 상태 변경 시 자동 리렌더링 트리거
  const {
    sourceRepository,
    updateSecurityState,
    updateSecurityLastUpdate,
  } = useCredsStore();

  //  [핵심 수정] sourceRepository 기반으로 보안 상태를 계산하여 반응성 확보
  // getSecurityState는 get()을 사용해서 구독을 생성하지 않으므로,
  // useMemo로 sourceRepository 의존성을 명시하여 상태 변경 시 리렌더링 보장
  const getSecurityStateReactive = useCallback(
    (
      baseUrl: string,
      type: 'sast' | 'sca' | 'dast',
      serviceId?: number
    ): 'null' | 'idle' | 'analyzing' | 'completed' | 'failed' => {
      // sourceRepository에서 직접 찾아서 반응성 유지
      let item = sourceRepository.find(
        x =>
          x.baseUrl === baseUrl &&
          (serviceId !== undefined
            ? x.serviceId === serviceId
            : x.serviceId === undefined)
      );

      // Fallback: serviceId로 매칭 실패 시 기존 데이터 사용
      if (!item && serviceId !== undefined) {
        item = sourceRepository.find(
          x => x.baseUrl === baseUrl && x.serviceId === undefined
        );
      }

      if (!item) return 'null';
      const stateKey = `${type}State` as keyof typeof item;
      return (item[stateKey] as 'null' | 'idle' | 'analyzing' | 'completed' | 'failed') || 'null';
    },
    [sourceRepository]
  );

  const getSecurityLastUpdateReactive = useCallback(
    (
      baseUrl: string,
      type: 'sast' | 'sca' | 'dast',
      serviceId?: number
    ): string | null => {
      let item = sourceRepository.find(
        x =>
          x.baseUrl === baseUrl &&
          (serviceId !== undefined
            ? x.serviceId === serviceId
            : x.serviceId === undefined)
      );

      if (!item && serviceId !== undefined) {
        item = sourceRepository.find(
          x => x.baseUrl === baseUrl && x.serviceId === undefined
        );
      }

      if (!item) return null;
      const updateKey = `${type}LastUpdate` as keyof typeof item;
      return (item[updateKey] as string | undefined) || null;
    },
    [sourceRepository]
  );

  //  [리팩토링] 빌드 서버 정보 훅 사용
  const {
    loadServerInfo: loadBuildServerInfo,
    isLoading: _isBuildServerLoading,
    error: _buildServerError,
  } = useBuildServerInfo();

  //  커밋 내역 상태 관리 (단순화) - 저장소 통계 모달로 대체되어 현재 미사용
  // const [commits, setCommits] = useState<CommitInfo[]>([]);
  // const [commitsLoading, setCommitsLoading] = useState<boolean>(false);
  // const [totalCommits, setTotalCommits] = useState<number>(0);

  //  [리팩토링] GitLab 토큰, 커밋, 토큰 입력 모달 → useGitModalStore로 이동

  //  현재 선택된 저장소 (로컬 상태 유지)
  const [currentRepo, setCurrentRepo] = useState<GitRepository | null>(null);

  //  [리팩토링] 통계 관련 훅 사용
  const {
    repositoryStats,
    repositoryStatsLoading: statsLoading,
    setRepositoryStats,
    fetchRepositoryStatistics,
    buildStats,
    buildEnvironment,
    buildStatsLoading,
    setBuildStats,
    setBuildEnvironment,
    fetchBuildStatistics,
  } = useStatistics();
  //  [리팩토링] 빌드, 보안 분석, DAST, 기본 모달 → useGitModalStore로 이동

  //  선택된 저장소 (로컬 상태 유지)
  const [selectedRepo, setSelectedRepo] = useState<GitRepository | null>(null);
  const { user } = useAuth();
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null); //  폴링 타이머 ref 추가
  const sastPollingTimerRef = useRef<NodeJS.Timeout | null>(null); //  SAST 모달 전용 폴링 타이머
  const gracePollCountRef = useRef<number>(0); //  파이프라인 완료 후 UI 업데이트 보장을 위한 grace period 폴링 카운터
  //  현재 진행 중인 SAST 요청이 어떤 서비스를 위한 것인지 추적 (경쟁 상태 방지)
  const activeSastRequestRepoIdRef = useRef<number | null>(null);
  //  [추가] 보안 분석 데이터 로드 여부 추적 (중복 호출 방지)
  const securityDataLoadedRef = useRef<boolean>(false);

  //  SAST 폴링 강제 중지 (전역에서 호출 가능)
  const stopSastPollingGlobal = useCallback((): void => {
    if (sastPollingTimerRef.current) {
      clearInterval(sastPollingTimerRef.current);
      sastPollingTimerRef.current = null;
    }
  }, []);

  //  [추가] 파이프라인 실행 관련 상태
  const [executingStage, setExecutingStage] = useState<DisplayKey | null>(null);
  //  [추가] 실행 중인 특정 파이프라인 추적 (서비스 ID + 단계명)
  const [executingPipeline, setExecutingPipeline] = useState<{
    serviceId: number;
    serviceName: string;
    stepName: string; // 'source', 'build', 'deploy', etc.
    displayKey: DisplayKey;
  } | null>(null);
  //  [추가] 빌드 완료 플래그 (useEffect 트리거용)
  const [buildCompletedFlag, setBuildCompletedFlag] = useState<number>(0);
  const [isExecutionModalVisible, setIsExecutionModalVisible] = useState(false);
  const [isBuildModalVisible, setIsBuildModalVisible] = useState(false); // 빌드 전용 모달
  const [isAutoDeployMode, setIsAutoDeployMode] = useState(false); //  [신규] 빌드 + 배포 모드 (서비스 목록에서 버튼 클릭 시 true)
  const [stageToExecute, setStageToExecute] = useState<{
    repo: GitRepository;
    displayKey: DisplayKey;
  } | null>(null);
  const [executionInitialValues, setExecutionInitialValues] = useState<
    Record<string, unknown>
  >({});
  const [isInitialValuesLoading, setIsInitialValuesLoading] = useState(false);
  //  [추가] 배포 시 사용할 빌드 서버 정보 (setter만 사용)
  const [_deployServerId, setDeployServerId] = useState<number | null>(null);
  const [_deployInfraId, setDeployInfraId] = useState<number | null>(null);
  //  [추가] 배포 시 선택 가능한 빌드 목록 (기존 번들 방식)
  const [availableBuilds, setAvailableBuilds] = useState<
    Array<{
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
    }>
  >([]);

  //  [신규] 서비스별 빌드 버전 목록 (멀티-서비스 프로젝트용)
  const [serviceBuildVersions, setServiceBuildVersions] = useState<Record<
    string,
    Array<{
      service_name: string;
      image_tag: string;
      image_url: string;
      pipeline_id: number;
      started_at: string;
    }>
  > | null>(null);

  //  [추가] 파이프라인 리포트 모달 상태
  const [selectedServiceInfo, setSelectedServiceInfo] = useState<{
    id: number;
    serviceName: string;
    serviceNamespace?: string;
    infraName?: string;
    infraId?: number; //  인프라 ID 추가
    gitlabBranch?: string;
    gitlabUrl?: string;
    gitlabAccessToken?: string; //  GitLab Access Token 추가
    gitlabUsername?: string; //  GitLab 사용자명
    //  Registry 인증 정보 추가
    registryType?: 'harbor' | 'dockerhub';
    registryUrl?: string;
    registryUsername?: string;
    registryPassword?: string;
    registryProjectName?: string;
  } | null>(null);

  //  인프라 목록 state
  const [infrastructures, setInfrastructures] = useState<InfraItem[]>([]);
  const [infrastructuresLoading, setInfrastructuresLoading] =
    useState<boolean>(false);

  //  [신규] 보안 검사 경고 모달 state
  const [securityWarningModalVisible, setSecurityWarningModalVisible] =
    useState(false);
  const [securityWarningConfig, setSecurityWarningConfig] = useState<{
    stage: SecurityCheckStage;
    category: SecurityCheckCategory;
    warningType: SecurityWarningType;
    vulnerabilitySummary?: CriticalVulnerabilitySummary;
    serviceName: string;
    onContinue: () => void;
  } | null>(null);
  const [securityCheckLoading, setSecurityCheckLoading] = useState(false);

  //  브랜치 목록 state
  const [branches, setBranches] = useState<
    Array<{ name: string; default: boolean }>
  >([]);
  const [branchesLoading, setBranchesLoading] = useState<boolean>(false);
  //  [리팩토링] 인증 상태 → useGitModalStore로 이동

  const openCreateModal = () => setIsModalOpen(true);
  const closeCreateModal = () => {
    setIsModalOpen(false);
  };
  // const openCreateUserModal = () => setCreateUserModalOpen(true); //  미사용
  // const closeCreateUserModal = () => { //  미사용
  //   setCreateUserModalOpen(false);
  // }

  // GitLab register/create small modal states
  const [gitlabActionVisible, setGitlabActionVisible] = useState<
    null | 'register' | 'create' | 'urlSetting' | 'createUser'
  >(null);
  const [projectName, setProjectName] = useState(''); // kiwi DB에 저장되는 서비스의 이름
  const [gitlabProjectName, setGitlabProjectName] = useState(''); // 실제 gitlab에서 사용하는 프로젝트의 이름
  const [gitlabProjectPath, setGitlabProjectPath] = useState('');
  const [gitlabProjectBranch, setGitlabProjectBranch] = useState('main');
  //  프로젝트 등록용 브랜치 목록 state
  const [registerBranches, setRegisterBranches] = useState<
    Array<{ name: string; default: boolean }>
  >([]);
  const [registerBranchesLoading, setRegisterBranchesLoading] =
    useState<boolean>(false);
  const openGitlabAction = (
    action: 'register' | 'create' | 'urlSetting' | 'createUser'
  ) => {
    // 부모 서비스 등록/생성 모달 자동 닫기
    closeCreateModal();
    //  모달 열 때 상태 초기화 (이전 값 제거)
    setProjectName('');
    setGitlabProjectName('');
    setGitlabProjectPath('');
    setGitlabProjectBranch('main');
    setSelectedGitUrl(null);
    setGitlabURL('');
    setGroups([]);
    setSelectedGroup(null);
    setGitlabUsername('');
    setGitlabName('');
    setGitlabEmail('');
    setGitlabPassword('');
    setRegisterBranches([]);
    setRegisterBranchesLoading(false);
    setGitlabUserAuth(null);
    setGitlabActionVisible(action);
  };
  const goBackToCreateModal = () => {
    // 작은 모달에서 부모 모달로 돌아갑니다
    closeGitlabAction();
    // 약간의 지연을 주어 모달 전환이 자연스럽게 느껴지도록 함
    setTimeout(() => openCreateModal(), 80);
  };
  const closeGitlabAction = () => {
    setGitlabActionVisible(null);
    setProjectName('');
    setGitlabProjectName('');
    setGitlabProjectPath('');
    setGitlabProjectBranch('main');
    setSelectedGitUrl(null);
    setGitlabURL('');
    setGroups([]);
    setSelectedGroup(null);
    setGitlabUsername('');
    setGitlabName('');
    setGitlabEmail('');
    setGitlabPassword('');
    //  브랜치 목록 초기화
    setRegisterBranches([]);
    setRegisterBranchesLoading(false);
    setGitlabUserAuth(null);
  };

  const handleGitlabRegister = async () => {
    // 생성 입력값 검증
    if (
      !selectedGitUrl ||
      !projectName ||
      !gitlabProjectPath ||
      !gitlabProjectBranch
    ) {
      message.warning('프로젝트 이름, Git URL, 브랜치를 모두 입력해주세요.');
      return;
    }

    try {
      const newRepo: GitRepository = {
        id: 0,
        name4kiwi: projectName,
        name: projectName,
        gitlabUrl: selectedGitUrl + '/' + gitlabProjectPath,
        gitlabBranch: gitlabProjectBranch,
        lastCommit: new Date().toLocaleString(),
        status: 'active',
        creatorId: user ? user.id : 0,
        hasRepository: true,
      };

      const addResult = await gitApi.add(newRepo);
      const actualRepoId =
        typeof addResult.data === 'object' &&
        addResult.data !== null &&
        'id' in addResult.data
          ? (addResult.data as { id: number }).id
          : newRepo.id;
      const updatedRepo = { ...newRepo, id: actualRepoId };
      setRepositories(prev => [...prev, updatedRepo]);

      message.success('GitLab 프로젝트가 생성되어 새 서비스로 추가되었습니다.');
      closeGitlabAction();
      closeCreateModal();

      // SAST 분석 트리거 (선택적)
      //  프로젝트 등록 시 자동 SAST 실행 비활성화 (Git clone 실패 방지)
      // await sastAnalysis(actualRepoId, updatedRepo);
    } catch (_err) {
      message.error(
        `프로젝트 생성 실패: ${_err instanceof Error ? _err.message : String(_err)}`
      );
    }
  };

  const handleGitlabCreate = async () => {
    if (!projectName || !gitlabProjectName) {
      message.warning('새 프로젝트 이름을 입력해주세요.');
      return;
    }
    if (!selectedGitUrl) {
      message.warning('Git URL을 선택해주세요.');
      return;
    }

    try {
      const newRepo: GitRepository = {
        id: 0,
        name4kiwi: projectName,
        name: gitlabProjectName,
        gitlabUrl: selectedGitUrl,
        gitlabBranch: 'main',
        creatorId: user ? user.id : 0,
        hasRepository: false,
        group: selectedGroup,
        groupFullPath: selectedGroupName,
      };

      const addResult = await gitApi.add(newRepo);
      const updatedRepo =
        typeof addResult.data === 'object' && addResult.data !== null
          ? { ...newRepo, ...addResult.data }
          : newRepo;
      setRepositories(prev => [...prev, updatedRepo]);

      message.success('GitLab 프로젝트가 생성되어 새 서비스로 추가되었습니다.');
      closeGitlabAction();
      closeCreateModal();
    } catch (_err) {
      message.error(
        `프로젝트 생성 실패: ${_err instanceof Error ? _err.message : String(_err)}`
      );
    }
  };

  const handleGitlabUserCreate = async () => {
    if (!selectedGitUrl || !selectedGroup) {
      message.warning('그룹을 선택해주세요.');
      return;
    }
    if (!gitlabUserAuth) {
      message.warning('부여할 권한을 선택해주세요.');
      return;
    }
    if (!gitlabUsername || !gitlabName || !gitlabEmail || !gitlabPassword) {
      message.warning('생성할 계정 정보를 모두 입력해주세요.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gitlabEmail)) {
      message.warning('이메일 형식이 올바르지 않습니다.');
      return;
    }
    if (gitlabPassword.length < 8) {
      message.warning('비밀번호는 8글자 이상으로 입력해주세요.');
      return;
    }

    try {
      const newUser: GitlabUser = {
        gitlabUrl: selectedGitUrl,
        groupID: selectedGroup,
        userAuth: gitlabUserAuth,
        username: gitlabUsername,
        name: gitlabName,
        email: gitlabEmail,
        password: gitlabPassword,
      };

      const response = await gitApi.createUser(newUser);
      if (response.success) {
        message.success('Gitlab 계정이 생성되었습니다.');
      }
      closeGitlabAction();
      closeCreateModal();
    } catch (_err) {
      console.error(
        `Gitlab 계정 생성 실패: ${_err instanceof Error ? _err.message : String(_err)}`
      );
    }
  };

  const openEditModal = async (repo: GitRepository) => {
    //  API로 최신 서비스 정보 조회 (DB에서 gitlab_config 포함)
    let service: ServiceInfo | undefined;
    try {
      const freshService = await serviceApi.getServices();
      //  repo.id는 이미 service ID이므로 직접 매칭
      service = freshService?.find((s: ServiceInfo) => s.id === repo.id);
    } catch (error) {
      console.error(
        '[GitManagement] 서비스 정보 조회 실패, 캐시된 정보 사용:',
        error
      );
      //  repo.id는 이미 service ID이므로 직접 매칭
      service = services.find(s => s.id === repo.id);
    }

    //  인프라 목록이 비어있거나 적으면 다시 로드 (항상 최신 상태 유지)
    if (infrastructures.length === 0) {
      setInfrastructuresLoading(true);
      try {
        const infras = await getInfrastructures();
        setInfrastructures(infras);
        if (infras.length === 0) {
          message.warning(
            '등록된 인프라가 없습니다. 먼저 인프라를 등록해주세요.'
          );
        }
      } catch (error) {
        console.error('[GitManagement] 인프라 목록 로드 실패:', error);
        message.error(
          '인프라 목록을 불러오는데 실패했습니다. 콘솔을 확인해주세요.'
        );
      } finally {
        setInfrastructuresLoading(false);
      }
    }

    //  GitLab Config 정보 파싱 (token, branch, username)
    let gitlabAccessToken = '';
    let gitlabBranch = repo.gitlabBranch;
    let gitlabUsername = '';

    //  [우선순위 1] gitlab_config JSON에서 토큰 추출
    if (service?.gitlab_config) {
      try {
        const gitlabConfig = JSON.parse(service.gitlab_config);
        //  token 또는 access_token 중 하나를 사용 (하위 호환성)
        const token = gitlabConfig.token || gitlabConfig.access_token;
        gitlabAccessToken = token || '';
        gitlabBranch = gitlabConfig.branch || gitlabBranch;
        gitlabUsername = gitlabConfig.username || '';
      } catch (e) {
        console.warn('[GitManagement] GitLab config 파싱 실패:', e);
      }
    }

    //  [우선순위 2] 하위 호환성: gitlab_access_token 필드 확인
    if (!gitlabAccessToken && service?.gitlab_access_token) {
      gitlabAccessToken = service.gitlab_access_token;
    }

    //  Registry 정보 파싱
    let registryType: 'harbor' | 'dockerhub' = 'harbor';
    let registryUrl = '';
    let registryUsername = '';
    let registryPassword = '';
    let registryProjectName = '';

    if (service?.registry_config) {
      try {
        const registryConfig = JSON.parse(service.registry_config);
        registryType =
          registryConfig.registry_type === 'dockerhub' ? 'dockerhub' : 'harbor';
        registryUrl = registryConfig.registry_url || '';
        registryUsername = registryConfig.username || '';
        registryPassword = registryConfig.password || '';
        registryProjectName = registryConfig.project_name || '';
      } catch (e) {
        console.warn('[GitManagement] Registry config 파싱 실패:', e);
      }
    }

    setSelectedServiceInfo({
      id: repo.id,
      serviceName: repo.name,
      gitlabUrl: repo.gitlabUrl,
      gitlabBranch: gitlabBranch,
      gitlabAccessToken: gitlabAccessToken,
      gitlabUsername: gitlabUsername, //  GitLab Username 추가
      infraId: service?.infra_id, //  인프라 ID 추가
      //  Registry 정보 추가
      registryType,
      registryUrl,
      registryUsername,
      registryPassword,
      registryProjectName,
    });

    //  인증 정보가 이미 있으면 인증 상태를 success로 설정
    if (gitlabAccessToken && gitlabUsername) {
      setGitlabAuthStatus('success');
    } else {
      setGitlabAuthStatus('idle');
    }

    if (registryUrl && registryUsername && registryPassword) {
      setRegistryAuthStatus('success');
    } else {
      setRegistryAuthStatus('idle');
    }

    //  브랜치 목록 가져오기
    if (gitlabAccessToken) {
      setBranchesLoading(true);
      try {
        const branchList = await getRepositoryBranches(
          repo.id,
          gitlabAccessToken
        );
        setBranches(
          branchList.map(b => ({ name: b.name, default: b.default }))
        );
      } catch (error) {
        console.error('[GitManagement] 브랜치 목록 로드 실패:', error);
        // 브랜치 로드 실패 시에도 모달은 열리도록 함 (수동 입력 가능)
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    } else {
      setBranches([]);
    }

    setIsEditModalOpen(true);
  };
  const saveServiceSetting = async () => {
    //  인증 상태 확인 (경고만 표시, 저장은 계속 진행)
    const hasGitLabAuthIssue = gitlabAuthStatus !== 'success';
    const hasRegistryAuthIssue = registryAuthStatus !== 'success';

    if (hasGitLabAuthIssue && hasRegistryAuthIssue) {
      message.warning(
        'GitLab 저장소 및 Container Registry 인증이 완료되지 않았습니다. 나중에 인증을 완료해주세요.'
      );
    } else if (hasGitLabAuthIssue) {
      message.warning(
        'GitLab 저장소 인증이 완료되지 않았습니다. 나중에 인증을 완료해주세요.'
      );
    } else if (hasRegistryAuthIssue) {
      message.warning(
        'Container Registry 인증이 완료되지 않았습니다. 나중에 인증을 완료해주세요.'
      );
    }

    try {
      //  서비스 기본 정보 업데이트
      const response = await serviceApi.updateServiceInfo(selectedServiceInfo);

      //  GitLab 설정을 JSON으로 저장 (branch, token, username)
      if (
        selectedServiceInfo?.gitlabBranch ||
        selectedServiceInfo?.gitlabAccessToken
      ) {
        await serviceApi.updateServiceGitLabConfig(selectedServiceInfo.id, {
          branch: selectedServiceInfo.gitlabBranch,
          access_token: selectedServiceInfo.gitlabAccessToken,
          username: selectedServiceInfo.gitlabUsername,
        });
      }

      //  Registry 정보가 있으면 업데이트
      if (
        selectedServiceInfo?.registryUrl ||
        selectedServiceInfo?.registryUsername
      ) {
        const { updateServiceRegistryConfig } = await import(
          '../../lib/api/service'
        );
        await updateServiceRegistryConfig(
          selectedServiceInfo.id,
          selectedServiceInfo.registryUrl || '',
          selectedServiceInfo.registryType || 'harbor',
          selectedServiceInfo.registryProjectName,
          selectedServiceInfo.registryUsername,
          selectedServiceInfo.registryPassword
        );
      }

      setRepositories(prevRepositories =>
        prevRepositories.map(repositorie =>
          repositorie.id === response.id
            ? { ...repositorie, ...response }
            : repositorie
        )
      );

      //  services 배열도 업데이트하여 최신 상태 유지
      const updatedServices = await serviceApi.getServices();
      setServices(updatedServices || []);

      //  저장 성공 메시지 (인증 상태 반영)
      if (hasGitLabAuthIssue || hasRegistryAuthIssue) {
        message.success(
          '서비스 정보가 저장되었습니다. 인증을 완료하면 모든 기능을 사용할 수 있습니다.'
        );
      } else {
        message.success('서비스 정보가 수정되었습니다.');
      }

      //  모달 닫기 전 인증 상태 초기화
      setGitlabAuthStatus('idle');
      setRegistryAuthStatus('idle');
      setIsEditModalOpen(false);
    } catch (error) {
      message.error('서비스 정보 수정에 실패했습니다.');
      console.error('서비스 정보 수정 실패:', error);
    }
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    //  모달 닫을 때 인증 상태 초기화
    setGitlabAuthStatus('idle');
    setRegistryAuthStatus('idle');
  };
  const handleEditChange = (
    field: string,
    value: string | number | undefined
  ) => {
    setSelectedServiceInfo(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  //  서비스 수정 모달용 브랜치 목록 불러오기 함수
  const loadServiceBranches = async () => {
    if (
      !selectedServiceInfo?.gitlabUrl ||
      !selectedServiceInfo?.gitlabAccessToken
    ) {
      message.warning('GitLab URL과 Access Token을 먼저 입력해주세요.');
      return;
    }

    try {
      setBranchesLoading(true);

      // GitLab URL에서 프로젝트 경로 추출
      const gitUrl = selectedServiceInfo.gitlabUrl;
      const parsedURL = new URL(gitUrl);
      const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;

      // URL에서 프로젝트 경로 추출 (예: /group/project.git -> group/project)
      const projectPath = parsedURL.pathname
        .replace(/^\//, '')
        .replace(/\.git$/, '');

      const encodedPath = encodeURIComponent(projectPath);
      const apiURL = `${baseURL}/api/v4/projects/${encodedPath}/repository/branches?per_page=100`;

      // GitLab API 직접 호출
      const response = await fetch(apiURL, {
        headers: {
          'PRIVATE-TOKEN': selectedServiceInfo.gitlabAccessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`GitLab API 호출 실패 (Status: ${response.status})`);
      }

      const branchList = (await response.json()) as Array<{
        name: string;
        default?: boolean;
      }>;
      setBranches(
        branchList.map(b => ({ name: b.name, default: b.default || false }))
      );
      message.success(`브랜치 ${branchList.length}개를 로드했습니다.`);
    } catch (error) {
      console.error('[loadServiceBranches] 브랜치 목록 로드 실패:', error);
      message.error(
        '브랜치 목록을 가져오는데 실패했습니다. GitLab URL과 Access Token을 확인해주세요.'
      );
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  const openMemberModal = (repo: GitRepository) => {
    setSelectedRepo(repo);
    setIsMemberModalOpen(true);
  };
  const closeMemberModal = () => {
    setIsMemberModalOpen(false);
    setSelectedRepo(null);
  };

  //  [수정] 모달 컨텐츠를 상태로 관리하는 대신, 데이터와 뷰 상태를 직접 관리합니다.
  interface SelectedStageData {
    repoName: string;
    displayName: string;
    lastUpdateTime: string;
  }
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStageData, setSelectedStageData] =
    useState<SelectedStageData | null>(null);
  const [selectedRepoForModal, setSelectedRepoForModal] =
    useState<GitRepository | null>(null);
  const [selectedDisplayKeyForModal, setSelectedDisplayKeyForModal] =
    useState<DisplayKey | null>(null);
  //  [리팩토링] selectedInfraModal, currentSelectedInfraName → useGitModalStore로 이동
  const [selectedProjectForInfra, setSelectedProjectForInfra] =
    useState<GitRepository | null>(null);

  //  [신규] 배포 실행 후 모달 자동 오픈 대기 상태 (fresh data가 로드되면 모달 오픈)
  const [pendingDeploymentModalOpen, setPendingDeploymentModalOpen] = useState<{
    repo: GitRepository;
    displayKey: DisplayKey;
  } | null>(null);

  const [isModalContentLoading, setIsModalContentLoading] = useState(false);
  const [modalPipelineLogs, setModalPipelineLogs] = useState<any[] | null>(
    null
  );
  //  [리팩토링] modalSastData, sastModalView, isSastScanInProgress → useGitModalStore로 이동

  //  transformDbStepsToWorkflow, LocalWorkflowStatus는 utils/gitManagement.ts에서 import

  // 실행 시 필요한 명세 타입
  interface PipelineCredentials {
    username_repo: string;
    password_repo: string;
    docker_username: string;
    docker_password: string;
  }
  interface ExecutionSubmitValues {
    hops?: Array<{ password?: string }>;
    credentials?: PipelineCredentials;
    selectedImageTag?: string; //  [신규] 배포 시 선택된 빌드 이미지 태그
  }

  //  [리팩토링] 운영 모달, DAST 모달 → useGitModalStore로 이동

  // SAST 결과 조회 함수 (상단 배치: 선언 이전 참조 에러 방지)
  const getSastResult = useCallback(
    async (repoId: number): Promise<SastResultData | null> => {
      try {
        const response = await gitApi.getSastResult(repoId);
        const data = response?.data as {
          semgrep_command_log: string;
          codeql_command_log: string;
          status: string;
          result?: any;
          last_update?: string;
          semgrep?: any;
          codeql?: any;
          trivy_command_log?: string;
          error?: string;
        };
        if (!data) return null;

        if (typeof data.result === 'string') {
          try {
            const parsed = JSON.parse(data.result) as Record<string, any>;
            return { ...(parsed || {}), status: data.status } as SastResultData;
          } catch {
            // JSON parsing failed - return status only
            return { status: data.status } as SastResultData;
          }
        }
        if (
          data.semgrep !== undefined ||
          data.codeql !== undefined ||
          data.status !== undefined
        ) {
          // 서비스 URL로 baseUrl 찾기
          const repo = repositories.find(r => r.id === repoId);
          if (repo) {
            updateSecurityState(
              repo.gitlabUrl,
              'sast',
              (data.status as
                | 'null'
                | 'idle'
                | 'analyzing'
                | 'completed'
                | 'failed') || 'idle',
              repo.id //  serviceId 추가
            );
            if (data.last_update) {
              try {
                const iso = new Date(String(data.last_update)).toISOString();
                updateSecurityLastUpdate(repo.gitlabUrl, 'sast', iso, repo.id);
              } catch {
                // Date parsing failed - use raw string value
                updateSecurityLastUpdate(
                  repo.gitlabUrl,
                  'sast',
                  String(data.last_update)
                );
              }
            }
          }

          // 실행 로그 정보 추가
          const resultWithLogs = {
            ...data,
            executionLogs: {
              semgrep: data.semgrep_command_log || '',
              codeql: data.codeql_command_log || '',
              trivy: data.trivy_command_log || '',
            },
          } as SastResultData;

          return resultWithLogs;
        }
        if (data.result && typeof data.result === 'object') {
          return {
            ...(data.result as Record<string, any>),
            status: data.status,
          } as SastResultData;
        }
        return null;
      } catch (_err: unknown) {
        return null;
      }
    },
    [updateSecurityState, updateSecurityLastUpdate, repositories]
  );

  //  [수정] fetchFn을 useCallback으로 메모이제이션하여 무한 루프 방지
  const sastTabFetchFn = useCallback(async () => {
    if (!currentRepo?.id) return null;
    return await getSastResult(currentRepo.id);
  }, [currentRepo?.id, getSastResult]);

  //  [추가] useSecurityScan 훅 사용 (SAST 탭용)
  const {
    loading: _sastTabLoading,
    result: _sastTabResult,
    error: _sastTabError,
    isScanning: _sastTabScanning,
    scanState: _sastScanState,
    fetchResult: fetchSastTabResult,
    startScan: _startSastTabScan,
    completeScan: _completeSastTabScan,
    failScan: _failSastTabScan,
  } = useSecurityScan<SastResultData>({
    analysisType: 'sast',
    repoId: currentRepo?.id || 0,
    fetchFn: sastTabFetchFn,
    visible: false, // 탭이므로 자동 fetch 비활성화
    autoFetch: false,
  });

  //  [추가] SCA 결과 조회 함수
  const _getScaResultFunc = useCallback(
    async (repoId: number): Promise<ScaResult | null> => {
      try {
        const response = await gitApi.getScaResult(repoId);
        const apiData = response?.data as ScaApiResponse['data'];

        if (!apiData || !apiData.result) {
          return null;
        }

        // 저장소 정보로 상태 업데이트
        const repo = repositories.find(r => r.id === repoId);
        if (repo && apiData.status) {
          const statusMap: Record<
            string,
            'null' | 'idle' | 'analyzing' | 'completed' | 'failed'
          > = {
            completed: 'completed',
            failed: 'failed',
            not_found: 'idle',
          };
          const state = statusMap[apiData.status] || 'idle';
          updateSecurityState(repo.gitlabUrl, 'sca', state, repo.id);

          if (apiData.scan_date) {
            updateSecurityLastUpdate(
              repo.gitlabUrl,
              'sca',
              apiData.scan_date,
              repo.id
            );
          }
        }

        return apiData.result;
      } catch (_err: unknown) {
        return null;
      }
    },
    [updateSecurityState, updateSecurityLastUpdate, repositories]
  );

  //  [추가] DAST 결과 조회 함수
  const _getDastResultFunc = useCallback(
    async (repoId: number): Promise<DastResult | null> => {
      try {
        const response = await gitApi.getDastResult(repoId);
        const apiData = response?.data as DastApiResponse['data'];

        if (!apiData || !apiData.result) {
          return null;
        }

        // 저장소 정보로 상태 업데이트
        const repo = repositories.find(r => r.id === repoId);
        if (repo && apiData.status) {
          const statusMap: Record<
            string,
            'null' | 'idle' | 'analyzing' | 'completed' | 'failed'
          > = {
            completed: 'completed',
            failed: 'failed',
            not_found: 'idle',
          };
          const state = statusMap[apiData.status] || 'idle';
          updateSecurityState(repo.gitlabUrl, 'dast', state, repo.id);

          if (apiData.scan_date) {
            updateSecurityLastUpdate(
              repo.gitlabUrl,
              'dast',
              apiData.scan_date,
              repo.id
            );
          }
        }

        return apiData.result;
      } catch (_err: unknown) {
        return null;
      }
    },
    [updateSecurityState, updateSecurityLastUpdate, repositories]
  );

  //  getBaseUrlFromGitUrl은 utils/gitManagement.ts에서 import

  //  [추가] 스토어에서 자격증명 체크하는 함수
  const checkCredentialsInStore = useCallback(() => {
    try {
      // 직접 import한 스토어 사용
      const store = useCredsStore.getState();

      return {
        hasGitlab: !!(
          store.sourceRepository && store.sourceRepository.length > 0
        ),
        hasDocker: !!(store.imageRegistry && store.imageRegistry.length > 0),
        hasHops: !!(store.serverlist && store.serverlist.length > 0),
        sourceRepository: store.sourceRepository || [],
        dockerRegistry: store.imageRegistry || [],
        hops: store.serverlist || [],
      };
    } catch (_error) {
      return {
        hasGitlab: false,
        hasDocker: false,
        hasHops: false,
        sourceRepository: [],
        dockerRegistry: [],
        hops: [],
      };
    }
  }, []);

  //  [수정] 특정 Git 서비스에 대한 GitLab 토큰을 찾는 함수
  // 우선순위: 1) DB (services 테이블), 2) localStorage (하위 호환성)
  const findGitLabTokenForRepo = useCallback(
    (gitUrl: string) => {
      try {
        //  [1순위] DB에서 조회 (services 테이블의 gitlab_config)
        const serviceInDb = services.find(s => s.gitlab_url === gitUrl);

        //  gitlab_config JSON에서 access_token 추출
        let tokenFromDb = '';
        if (serviceInDb?.gitlab_config) {
          try {
            const gitlabConfig = JSON.parse(serviceInDb.gitlab_config);
            tokenFromDb = gitlabConfig.access_token || gitlabConfig.token || '';
          } catch (e) {
            console.error('Failed to parse gitlab_config:', e);
          }
        }

        //  하위 호환성: gitlab_access_token 필드도 확인
        if (!tokenFromDb && serviceInDb?.gitlab_access_token) {
          tokenFromDb = serviceInDb.gitlab_access_token;
        }

        if (tokenFromDb) {
          return {
            found: true,
            token: tokenFromDb,
            baseUrl: gitUrl,
            userId: 'DB', // DB에서 조회했음을 표시
            source: 'db' as const,
          };
        }

        //  [2순위] localStorage에서 조회 (하위 호환성)
        const store = useCredsStore.getState();
        // baseUrl 필드에 전체 Git URL이 저장되어 있으므로 직접 매칭
        const exactMatch = store.sourceRepository?.find(
          (repo: any) => repo.baseUrl === gitUrl
        );

        // 정확한 매칭이 없으면 baseUrl로 매칭 시도 (하위 호환성)
        const baseUrlMatch = !exactMatch
          ? (() => {
              const baseUrl = getBaseUrlFromGitUrl(gitUrl);
              const match = store.sourceRepository?.find(
                (repo: any) => repo.baseUrl === baseUrl
              );
              return match;
            })()
          : null;

        const finalToken = exactMatch || baseUrlMatch;

        if (finalToken) {
          return {
            found: true,
            token: finalToken.token || '',
            baseUrl: finalToken.baseUrl || getBaseUrlFromGitUrl(gitUrl),
            userId: finalToken.userId || 'root',
            source: 'localStorage' as const,
          };
        }

        //  토큰을 찾지 못함
        return {
          found: false,
          token: '',
          baseUrl: getBaseUrlFromGitUrl(gitUrl),
          userId: 'root',
          source: 'none' as const,
        };
      } catch (_error) {
        return {
          found: false,
          token: '',
          baseUrl: getBaseUrlFromGitUrl(gitUrl),
          userId: 'root',
          source: 'error' as const,
        };
      }
    },
    [services, getBaseUrlFromGitUrl]
  );

  //  [추가] 단계별 실행 가능 여부 판단 함수
  const isStageRunnable = useCallback(
    (
      repo: GitRepository,
      displayKey: DisplayKey,
      _currentServices: ServiceInfo[] = services
    ): { runnable: boolean; disabled: boolean; reason?: string } => {
      // 1. 소스 (Source) - 해당 프로젝트의 GitLab URL에 맞는 자격증명 필요
      if (displayKey === 'source') {
        const tokenInfo = findGitLabTokenForRepo(repo.gitlabUrl);
        if (!tokenInfo.found) {
          return {
            runnable: false,
            disabled: true,
            reason:
              '이 프로젝트의 GitLab 자격증명이 없습니다. 설정에서 토큰을 등록하세요.',
          };
        }
        return { runnable: true, disabled: false };
      }

      //  [수정] SCA/DAST는 더 이상 별도 단계가 아니므로 주석 처리
      // 2. SCA - 항상 실행 가능 (파라미터 모달로 처리)
      /* DISABLED - SCA/DAST 별도 단계 제거됨
      if (false && displayKey === ('sca' as never)) {
        const scaSecure = getSecurityState(repo.gitlabUrl, 'sca', repo.id);

        if (scaSecure === 'null' || scaSecure === 'idle') {
          return {
            runnable: false,
            disabled: true,
            reason: '현재 SCA 분석이 진행 중입니다.',
          };
        }
        return { runnable: true, disabled: false };
      }
      */

      // 3. DAST - 미구현으로 비활성화
      /* DISABLED - DAST 별도 단계 제거됨
      if (false && displayKey === ('dast' as never)) {
        return {
          runnable: true,
          disabled: false,
          reason: 'DAST 스캔을 시작할 수 있습니다.',
        };
      }
      */

      //  4. 서비스 연동 체크 (repo.id는 이미 service ID)
      const serviceId = repo.id;
      if (!serviceId) {
        return {
          runnable: false,
          disabled: true,
          reason:
            '이 저장소와 연결된 서비스가 없습니다. 저장소를 다시 등록하면 자동으로 서비스가 생성됩니다.',
        };
      }

      // 5. 스토어에서 자격증명 체크
      const credentials = checkCredentialsInStore();

      //  [수정] SAST는 더 이상 별도 단계가 아니므로 주석 처리
      // 6. SAST - 해당 프로젝트의 GitLab URL에 맞는 자격증명 필요
      /* DISABLED - SAST 별도 단계 제거됨
      if (false && displayKey === ('sast' as never)) {
        const tokenInfo = findGitLabTokenForRepo(repo.gitlabUrl);
        if (!tokenInfo.found) {
          return {
            runnable: false,
            disabled: true,
            reason:
              '이 프로젝트의 GitLab 자격증명이 없습니다. 설정에서 토큰을 등록하세요.',
          };
        }
        // Docker Registry는 SAST에서도 선택사항으로 처리
      }
      */

      // 6. BUILD/DEPLOY/OPERATE - hops, 해당 프로젝트의 GitLab 자격증명 필요
      if (['build', 'deploy', 'operate'].includes(displayKey)) {
        //  [수정] 서비스별 인프라 ID 확인
        const service = _currentServices.find(s => s.id === serviceId);
        const infraId = service?.infra_id;

        //  [수정] 인프라가 설정되어 있지 않으면 비활성화
        if (!infraId) {
          return {
            runnable: false,
            disabled: true,
            reason:
              '인프라가 설정되지 않았습니다. 서비스 설정에서 인프라를 먼저 등록하세요.',
          };
        }

        //  [수정] 해당 인프라의 서버 정보가 localStorage에 있는지 확인
        // 1순위: infraId가 매칭되는 서버
        // 2순위: infraId가 없는 서버 (레거시 데이터)
        const hasInfraServer = credentials.hops.some(
          server => server.infraId === infraId || !server.infraId
        );

        //  [수정] 서버 정보가 없으면 경고 메시지와 함께 활성화 (실행 시 입력받을 수 있음)
        // 완전히 비활성화하지 않고, 사용자가 실행 시 입력할 수 있도록 함
        if (!hasInfraServer && !credentials.hasHops) {
          console.warn(
            `[isStageRunnable] 인프라 ${infraId}의 서버 정보가 없습니다. 실행 시 입력받을 수 있습니다.`
          );
          //  서버 정보가 없어도 활성화 (ExecutionModal에서 입력받음)
          // return {
          //   runnable: true,
          //   disabled: false,
          //   reason: '서버 연결 정보를 입력해야 합니다.',
          // };
        }

        const tokenInfo = findGitLabTokenForRepo(repo.gitlabUrl);
        if (!tokenInfo.found) {
          return {
            runnable: false,
            disabled: true,
            reason:
              '이 프로젝트의 GitLab 자격증명이 없습니다. 설정에서 토큰을 등록하세요.',
          };
        }
        // Docker Registry는 선택사항으로 처리 (실제 빌드에서 필요하지 않을 수 있음)
      }

      return { runnable: true, disabled: false };
    },
    [checkCredentialsInStore, findGitLabTokenForRepo, services]
  );

  //  인프라 정보 조회 헬퍼 함수
  const getInfrastructureInfo = useCallback(
    (
      infraId?: number
    ): { name: string; type: string; color: string } | null => {
      if (!infraId) return null;
      const infra = infrastructures.find(i => i.id === infraId);
      if (!infra) return null;

      //  인프라 타입 표시용으로 변환 (external_ 제거)
      const displayType = getDisplayInfraType(infra.type);
      const color = getInfraTypeColor(infra.type);

      return {
        name: infra.name,
        type: displayType, //  사용자에게는 external_ 없이 표시
        color: color,
      };
    },
    [infrastructures]
  );

  //  fetchRepositoryStatistics, fetchBuildStatistics는 useStatistics 훅에서 제공

  const handleGitlabTokenSubmit = useCallback(async () => {
    if (!gitlabTokenInput.trim()) {
      message.warning('GitLab 토큰을 입력해주세요.');
      return;
    }

    if (!gitlabBaseUrlInput.trim()) {
      message.warning('GitLab Base URL을 입력해주세요.');
      return;
    }

    try {
      // 스토어에 토큰 저장
      const store = useCredsStore.getState();
      const baseUrl = gitlabBaseUrlInput.trim();

      const newToken = {
        baseUrl,
        token: gitlabTokenInput.trim(),
        userId: 'root', // 기본 사용자 ID
      };

      // upsertSourceRepository 사용
      store.upsertSourceRepository(newToken);

      message.success('GitLab 토큰이 저장되었습니다.');
      setGitlabTokenModalOpen(false);
      setGitlabTokenInput('');
      setGitlabBaseUrlInput('');

      // 대기 중인 저장소가 있으면 통계 조회 재시도
      if (pendingRepoId) {
        const repo = repositories.find(r => r.id === pendingRepoId);
        if (repo) {
          fetchRepositoryStatistics(
            repo.id,
            repo.gitlabUrl,
            findGitLabTokenForRepo
          ).catch((_error: Error) => {
            // 통계 조회 실패 시 조용히 무시
          });
        }
        setPendingRepoId(null);
      }
    } catch (_error) {
      message.error('GitLab 토큰 저장 중 오류가 발생했습니다.');
    }
  }, [
    gitlabTokenInput,
    gitlabBaseUrlInput,
    pendingRepoId,
    fetchRepositoryStatistics,
    repositories,
    findGitLabTokenForRepo,
  ]);

  //  DAST 파라미터 확인 핸들러
  const handleDastParamsConfirm = useCallback(
    async (params: DastScanParams) => {
      setDastParamsModalOpen(false);

      if (!dastParamsRepoId || !dastParamsRepoUrl) {
        message.error('저장소 정보가 없습니다.');
        return;
      }

      try {
        // 스캔 시작 상태로 업데이트
        updateSecurityState(
          dastParamsRepoUrl,
          'dast',
          'analyzing',
          dastParamsRepoId
        );

        // DAST 스캔 실행
        await gitApi.dastScanWeb({
          repo_id: dastParamsRepoId,
          target_url: params.target_url,
          scan_type: params.scan_type || 'baseline',
          options: params.options,
        });

        // 스캔 완료 후 상태 업데이트
        updateSecurityState(
          dastParamsRepoUrl,
          'dast',
          'completed',
          dastParamsRepoId
        );
        updateSecurityLastUpdate(
          dastParamsRepoUrl,
          'dast',
          new Date().toISOString(),
          dastParamsRepoId
        );

        // 결과 모달 자동으로 열기
        setSecurityModalRepoId(dastParamsRepoId);
        setSecurityModalRepoName(dastParamsRepoName);
        setSecurityModalRepoUrl(dastParamsRepoUrl);
        setSecurityModalType('dast');
        setSecurityModalOpen(true);
      } catch (_error) {
        updateSecurityState(
          dastParamsRepoUrl,
          'dast',
          'failed',
          dastParamsRepoId
        );
        message.error('DAST 스캔 실행 중 오류가 발생했습니다.');
      }
    },
    [
      dastParamsRepoId,
      dastParamsRepoName,
      dastParamsRepoUrl,
      updateSecurityState,
      updateSecurityLastUpdate,
    ]
  );

  const handleStageClick = async (
    repo: GitRepository,
    displayKey: DisplayKey
  ): Promise<void> => {
    //  [수정] 모든 단계에서 services 배열이 비어있으면 먼저 로드
    let currentServices = services;
    if (currentServices.length === 0) {
      try {
        const servicesRes = await serviceApi.getServices();
        currentServices = servicesRes || [];
        setServices(currentServices);
      } catch (_error) {
        message.error('서비스 목록을 불러오는 중 오류가 발생했습니다.');
        return;
      }
    }

    //  [공통] 다른 단계(operate, source 등)를 위한 serviceId 찾기
    //  [수정] repo.id를 우선적으로 사용 (같은 GitLab URL을 가진 서비스 구분)
    let serviceId = currentServices.find(s => s.id === repo.id)?.id;

    if (!serviceId) {
      serviceId = currentServices.find(
        s => s.gitlab_url === repo.gitlabUrl
      )?.id;
    }

    if (!serviceId) {
      const autoCreatedService = currentServices.find(
        s =>
          s.name === repo.name ||
          s.gitlab_url === repo.gitlabUrl ||
          (s.name &&
            repo.name &&
            s.name.toLowerCase() === repo.name.toLowerCase())
      );
      serviceId = autoCreatedService?.id;
    }

    //  [수정] 빌드 단계는 services 로드 후 serviceId 찾기
    if (displayKey === 'build') {
      //  services 배열이 비어있으면 먼저 로드
      let currentServices = services;
      if (currentServices.length === 0) {
        try {
          const servicesRes = await serviceApi.getServices();
          currentServices = servicesRes || [];
          setServices(currentServices);
        } catch (_error) {
          message.error('서비스 목록을 불러오는 중 오류가 발생했습니다.');
          return;
        }
      }

      // 서비스 ID 찾기 (우선순위: repo.id 직접 매칭 > gitlab_url > name)
      let serviceId = currentServices.find(s => s.id === repo.id)?.id;

      if (!serviceId) {
        serviceId = currentServices.find(
          s => s.gitlab_url === repo.gitlabUrl
        )?.id;
      }

      if (!serviceId) {
        const autoCreatedService = currentServices.find(
          s =>
            s.name === repo.name ||
            s.gitlab_url === repo.gitlabUrl ||
            (s.name &&
              repo.name &&
              s.name.toLowerCase() === repo.name.toLowerCase())
        );
        serviceId = autoCreatedService?.id;
      }

      if (serviceId) {
        setCurrentRepo(repo);
        setBuildModalOpen(true);

        // 항상 pipeline_details 테이블에서 빌드 통계 조회
        // pipeline_details 테이블에 실제 데이터가 있는지 확인하기 위해 직접 조회
        fetchBuildStatistics(serviceId).catch(() => {
          // 에러 발생 시 빈 통계로 설정
          setBuildStats({
            service_id: serviceId,
            service_name: repo.name,
            total_builds: 0,
            successful_builds: 0,
            failed_builds: 0,
            success_rate: 0,
            average_build_time: 0,
            recent_builds: [],
            docker_images: [],
            build_environment: {
              gitlab_url: '',
              gitlab_branch: '',
              docker_compose_files: [],
              docker_registry: '',
              build_tool: 'podman-compose',
            },
          });
        });

        //  [제거] SCA 결과는 ScaResultsModal에서 로딩하므로 불필요
      } else {
        // serviceId가 없으면 빌드 실행 모달 열기
        setStageToExecute({ repo, displayKey: 'build' });
        setIsBuildModalVisible(true);
      }
      return;
    }

    //  [복구] 운영 단계 클릭 시 운영 모달 표시 (기존 기능 유지)
    if (displayKey === 'operate' && serviceId) {
      const service = currentServices.find(s => s.id === serviceId);
      if (service) {
        setOperateCurrentService(service);
        //  [수정] 서비스의 infra_id를 기반으로 배포 대상 인프라의 SSH 접속 정보 가져오기
        try {
          const { getServers } = await import('../../lib/api/infra');

          // 서비스의 infra_id 사용 (배포 대상 인프라)
          const serviceInfraId = (service as any).infra_id;

          if (serviceInfraId) {
            // 해당 인프라의 서버 목록 조회
            const servers = await getServers(serviceInfraId);

            if (servers && servers.length > 0) {
              // 첫 번째 서버의 hops 사용 (일반적으로 마스터 노드)
              const server = servers[0];

              if (server.hops) {
                setOperateServerHops(
                  typeof server.hops === 'string'
                    ? server.hops
                    : JSON.stringify(server.hops)
                );
              }

              // infra_id 저장
              setOperateInfraId(serviceInfraId);

            }
          }
        } catch (error) {
          console.error('[GitManagement] 인프라 SSH 정보 로드 실패:', error);
          // 에러가 발생해도 모달은 열기
        }

        //  operate modal용 DAST 결과 로드
        try {
          const result = await gitApi.getDastResult(repo.id);
          setDastResult(result.data as DastResult);
        } catch (_error) {
          setDastResult(null);
        }

        setOperateModalOpen(true);
        return;
      }
    }

    //  [수정] source 단계 클릭 시 커밋 모달 열기 (DB 우선 확인)
    if (displayKey === 'source') {
      setCurrentRepo(repo);

      //  DB 또는 localStorage에서 GitLab 토큰 확인 (DB 우선)
      const tokenInfo = findGitLabTokenForRepo(repo.gitlabUrl);
      if (tokenInfo.found) {
        setCommitModalOpen(true);

        //  저장소 통계 조회
        fetchRepositoryStatistics(
          repo.id,
          repo.gitlabUrl,
          findGitLabTokenForRepo
        ).catch((_error: Error) => {
          // 통계 조회 실패 시 조용히 무시
        });
      } else {
        //  토큰이 없으면 토큰 입력 모달 표시
        // serviceId 찾기
        const service = currentServices.find(
          s => s.gitlab_url === repo.gitlabUrl
        );
        if (service) {
          setTokenInputServiceId(service.id);
          setTokenInputServiceName(service.name);
          setTokenInputGitlabUrl(repo.gitlabUrl);
          setTokenInputModalOpen(true);
        } else {
          message.warning(
            'GitLab 토큰이 없습니다. 서비스 등록 시 GitLab Access Token을 입력해주세요.'
          );
        }
      }

      return;
    }

    //  [수정] 4단계 파이프라인 구조: SAST/SCA/DAST는 각 단계 내 탭으로 표시되므로 별도 처리 불필요
    // 각 단계(source, build, operate)를 클릭하면 해당 모달이 열리고, 그 안에서 분석 탭을 표시

    try {
      // build, deploy 단계 처리
      if (['build', 'deploy'].includes(displayKey)) {
        //  services 배열이 비어있으면 먼저 로드
        let currentServices = services;
        if (currentServices.length === 0) {
          try {
            const servicesRes = await serviceApi.getServices();
            currentServices = servicesRes || [];
            setServices(currentServices);
          } catch (_error) {
            message.error('서비스 목록을 불러오는 중 오류가 발생했습니다.');
            return;
          }
        }

        // 서비스 ID 찾기 (우선순위: repo.id 직접 매칭 > gitlab_url > name)
        //  repo.id와 service.id가 동일하므로 우선적으로 ID로 매칭
        let serviceId = currentServices.find(s => s.id === repo.id)?.id;

        if (!serviceId) {
          // ID로 찾지 못하면 gitlab_url로 매칭
          serviceId = currentServices.find(
            s => s.gitlab_url === repo.gitlabUrl
          )?.id;
        }

        if (!serviceId) {
          // 자동 생성된 서비스 찾기 (name 기반)
          const autoCreatedService = currentServices.find(
            s =>
              s.name === repo.name ||
              s.gitlab_url === repo.gitlabUrl ||
              (s.name &&
                repo.name &&
                s.name.toLowerCase() === repo.name.toLowerCase())
          );
          serviceId = autoCreatedService?.id;
        }

        if (!serviceId) {
          message.error(
            '연결된 서비스를 찾을 수 없습니다. 서비스를 다시 등록해주세요.'
          );
          return;
        }

        //  자격증명 체크 후 없으면 바로 ExecutionModal 열기
        const credentials = checkCredentialsInStore();
        if (!credentials.hasHops || !credentials.hasGitlab) {
          // 자격증명이 없으면 바로 실행 모달을 열어서 입력받도록 함
          setStageToExecute({ repo, displayKey });
          setIsInitialValuesLoading(true);

          try {
            let targetHops: any[] = [];
            let buildServerId: number | null = null;
            let buildInfraId: number | null = null;

            // 배포 단계인 경우 빌드 실행 시 사용한 서버 정보를 조회
            let registryUsername = '';
            let registryPassword = '';
            let registryUrl = '';

            if (displayKey === 'deploy') {
              //  useBuildServerInfo 훅의 loadServerInfo 사용
              const deployServerInfo = await loadBuildServerInfo(serviceId);

              if (deployServerInfo) {
                targetHops = deployServerInfo.hops;
                buildServerId = deployServerInfo.serverId;
                buildInfraId = deployServerInfo.infraId;

                //  Container Registry 인증 정보도 함께 저장
                registryUrl = deployServerInfo.registryUrl || '';
                registryUsername = deployServerInfo.registryUsername || '';
                registryPassword = deployServerInfo.registryPassword || '';

                // 배포 시 사용할 빌드 서버 정보 저장
                setDeployServerId(buildServerId);
                setDeployInfraId(buildInfraId);
              } else {
                // 빌드 서버 정보를 찾지 못한 경우 사용자에게 알림
                message.warning(
                  '배포하기 전에 먼저 빌드를 성공적으로 완료해주세요.'
                );
                setIsInitialValuesLoading(false);
                return;
              }

              //  [수정] 서비스별 빌드 버전 조회 시도 (멀티-서비스 프로젝트용)
              try {
                const { buildApi } = await import('../../lib/api/build');
                const serviceBuildVersionsData =
                  await buildApi.getServiceBuildVersions(serviceId);

                // 서비스별 빌드 버전이 있으면 우선 사용
                if (
                  serviceBuildVersionsData &&
                  Object.keys(serviceBuildVersionsData).length > 0
                ) {
                  setServiceBuildVersions(serviceBuildVersionsData);
                } else {
                }
              } catch (error) {
                // 서비스별 빌드 버전 조회 실패 시 기존 방식 사용
                console.error(
                  '[GitManagement]  서비스별 빌드 버전 조회 실패, 기존 번들 방식 사용:',
                  error
                );
              }

              //  [기존] 번들 방식 빌드 목록 조회 (하위 호환성 유지)
              try {
                const buildStats = deployServerInfo.buildStats;
                if (
                  buildStats?.recent_builds &&
                  buildStats.recent_builds.length > 0
                ) {
                  // 성공한 빌드만 필터링하고 image_tag 추출
                  const availableBuilds = buildStats.recent_builds
                    .filter((build: any) => build.status === 'success')
                    .map((build: any) => {
                      //  [수정] 백엔드에서 이미 파싱된 값 우선 사용, details_data는 폴백
                      let dockerUsername = '';
                      let dockerPassword = '';
                      let imageTag = build.image_tag || ''; // 백엔드에서 파싱된 값 우선
                      let registryType = '';
                      let registryUrl = build.registry || ''; // 백엔드에서 파싱된 값 우선
                      let registryProject = '';
                      let builtImages: string[] = build.built_images || []; // 백엔드에서 파싱된 값 우선

                      // details_data에서 추가 정보 추출 (백엔드에서 파싱되지 않은 필드들)
                      if (build.details_data) {
                        try {
                          const details =
                            typeof build.details_data === 'string'
                              ? JSON.parse(build.details_data)
                              : build.details_data.Valid &&
                                  build.details_data.String
                                ? JSON.parse(build.details_data.String)
                                : build.details_data;
                          // 백엔드 값이 없을 때만 details_data에서 가져오기
                          imageTag = imageTag || details.image_tag || '';
                          dockerUsername = details.docker_username || '';
                          dockerPassword = details.docker_password || '';
                          registryType = details.registry_type || '';
                          registryUrl =
                            registryUrl || details.registry_url || '';
                          registryProject = details.registry_project || '';
                          if (builtImages.length === 0) {
                            builtImages = details.built_images || [];
                          }
                        } catch (_e) {
                          // JSON 파싱 실패 - 기본값 유지
                        }
                      }
                      return {
                        id: build.id,
                        pipeline_id: build.pipeline_id,
                        image_tag: imageTag,
                        started_at: build.started_at,
                        infra_name:
                          build.build_infra_name?.String ||
                          build.build_infra_name ||
                          'N/A',
                        docker_username: dockerUsername,
                        docker_password: dockerPassword,
                        registry_type: registryType,
                        registry_url: registryUrl,
                        registry_project: registryProject,
                        built_images: builtImages,
                      };
                    })
                    .filter(
                      (build: any) =>
                        build.image_tag ||
                        (build.built_images && build.built_images.length > 0)
                    ) // image_tag 또는 built_images가 있는 빌드만
                    .sort((a: any, b: any) => {
                      // 최신 빌드가 먼저 오도록 started_at 기준 내림차순 정렬
                      return (
                        new Date(b.started_at).getTime() -
                        new Date(a.started_at).getTime()
                      );
                    });

                  if (availableBuilds.length > 0) {
                    // 빌드 목록을 상태에 저장 (ExecutionModal에서 사용)
                    setAvailableBuilds(availableBuilds);
                  }
                } else {
                  // 빌드 데이터 없음 - 추가 처리 불필요
                }
              } catch (_error) {
                // 빌드 목록 조회 실패해도 배포는 계속 진행 (최신 빌드 자동 선택)
              }
            } else {
              // 빌드 단계나 다른 단계인 경우 서비스 인프라 사용
              const serverInfo = await serviceApi.getServiceServers(serviceId);
              targetHops = JSON.parse(serverInfo.hops || '[]');
            }

            //  저장된 자격증명 읽어오기 (initialHops 설정 전에 먼저 읽기)
            const { useCredsStore } = await import(
              '../../stores/useCredsStore'
            );
            const store = useCredsStore.getState();
            const { sourceRepository, serverlist } = store;
            const savedGitCred = sourceRepository.find(
              r =>
                repo.gitlabUrl.includes(r.baseUrl) ||
                r.baseUrl.includes(repo.gitlabUrl)
            );

            //  [수정] initialHops 생성 시 creds-store에서 username도 가져오기 (보안정책: DB에 username 저장 안함)
            const initialHops = targetHops.map((hop: any) => {
              const serverCred = serverlist.find(
                (s: any) =>
                  s.host?.toLowerCase() === hop.host?.toLowerCase() &&
                  (s.port || 22) === (hop.port || 22)
              );
              return {
                ...hop,
                //  username은 creds-store에서 가져오기
                username: serverCred?.userId || hop.username || '',
                password: '',
              };
            });

            const fullInitialValues = {
              serviceId: serviceId, //  ExecutionModal이 서비스 정보를 조회할 수 있도록 serviceId 추가
              infraType: repo.infraType, //  infraType 직접 전달
              gitUrl: repo.gitlabUrl,
              //  배포 단계일 때는 빌드에서 사용한 registry URL 사용, 없으면 repo의 dockerRegistry 폴백
              dockerRegistry:
                displayKey === 'deploy'
                  ? registryUrl || repo.dockerRegistry || ''
                  : repo.dockerRegistry || '',
              hops: initialHops,
              //  배포 시 사용할 서버 ID 저장 (deploy 단계에서만)
              deployServerId:
                displayKey === 'deploy' ? buildServerId : undefined,
              deployInfraId: displayKey === 'deploy' ? buildInfraId : undefined,
              //  Container Registry 인증 정보 저장 (deploy 단계에서만)
              //  저장된 Git credential도 초기값으로 설정
              credentials:
                displayKey === 'deploy'
                  ? {
                      username_repo: savedGitCred?.userId || '',
                      password_repo: savedGitCred?.token || '',
                      docker_username: registryUsername,
                      docker_password: registryPassword,
                    }
                  : undefined,
            };
            setExecutionInitialValues(fullInitialValues);
            setIsExecutionModalVisible(true); // 자격증명 입력 모달 열기
          } catch (_error) {
            // if(error.apiError.includes('인프라') && error.apiError.includes('서비스') && error.apiError.includes('없')) {
            // 알람창으로 서비스 인프라 등록 안내
            // [수정된 로직] alert 대신, "다음 액션"을 기억하고 모달을 엽니다.
            message.info(
              '이 프로젝트에 연결된 인프라가 없습니다. 배포할 인프라를 선택해주세요.'
            );

            //  현재 서비스의 인프라 이름 조회 (변경 확인 메시지용)
            try {
              const service = currentServices.find(s => s.id === serviceId);
              if (service && service.infra_id) {
                const infraResponse = await infraApi.getById(service.infra_id);
                if (infraResponse.success && infraResponse.data) {
                  setCurrentSelectedInfraName(infraResponse.data.name);
                }
              } else {
                setCurrentSelectedInfraName(undefined);
              }
            } catch (_e) {
              setCurrentSelectedInfraName(undefined);
            }

            setNextAction({ repo, displayKey }); // <-- 인프라 선택 후 실행할 작업을 기억시킴
            setSelectedProjectForInfra(repo); // <-- 어떤 프로젝트인지 기억시킴
            setSelectedInfraModal(true); // <-- 인프라 선택 모달을 엽니다.
            // window.alert("서비스 인프라가 등록되어 있지 않습니다.\n[인프라 서비스 설정]에서 인프라를 먼저 등록해주시기 바랍니다.");
            // }
            message.error('서버 정보를 가져오는 데 실패했습니다.');
          } finally {
            setIsInitialValuesLoading(false);
          }
          return;
        }

        //  [수정] 자격증명이 있을 때: 배포 단계는 배포 이력 체크 후 분기
        if (displayKey === 'deploy') {
          const service = currentServices.find(s => s.id === serviceId);

          //  [신규] 배포 이력 확인 (파이프라인 상태에서 deploy 단계가 있는지 확인)
          const hasDeployHistory = pipelineStatuses[serviceId]?.some(
            step => step.step_name === 'deploy'
          );

          // 첫 배포 (배포 이력 없음): ExecutionModal 열기
          if (!hasDeployHistory && !service?.is_deployed) {
            // 자격증명이 있어도 첫 배포는 설정을 입력받아야 하므로 ExecutionModal 열기
            setStageToExecute({ repo, displayKey });
            setIsInitialValuesLoading(true);

            try {
              //  useBuildServerInfo 훅의 loadServerInfo 사용
              const deployServerInfo = await loadBuildServerInfo(serviceId);

              if (!deployServerInfo) {
                message.warning(
                  '배포하기 전에 먼저 빌드를 성공적으로 완료해주세요.'
                );
                setIsInitialValuesLoading(false);
                return;
              }

              const targetHops = deployServerInfo.hops;
              const registryUrl = deployServerInfo.registryUrl || '';
              const registryUsername = deployServerInfo.registryUsername || '';
              const registryPassword = deployServerInfo.registryPassword || '';

              setDeployServerId(deployServerInfo.serverId);
              setDeployInfraId(deployServerInfo.infraId);

              //  [신규] 서비스별 빌드 버전 조회 시도 (멀티-서비스 프로젝트용)
              try {
                const { buildApi } = await import('../../lib/api/build');
                const serviceBuildVersionsData =
                  await buildApi.getServiceBuildVersions(serviceId);

                if (
                  serviceBuildVersionsData &&
                  Object.keys(serviceBuildVersionsData).length > 0
                ) {
                  setServiceBuildVersions(serviceBuildVersionsData);
                } else {
                }
              } catch (error) {
                console.error(
                  '[GitManagement]  서비스별 빌드 버전 조회 실패 (첫 배포), 기존 번들 방식 사용:',
                  error
                );
              }

              //  [수정] 이미 조회한 buildStats 재사용 (중복 API 호출 방지)
              // 빌드 목록 조회
              try {
                const buildStats = deployServerInfo.buildStats;
                if (
                  buildStats?.recent_builds &&
                  buildStats.recent_builds.length > 0
                ) {
                  const availableBuilds = buildStats.recent_builds
                    .filter((build: any) => build.status === 'success')
                    .map((build: any) => {
                      //  [수정] 백엔드에서 이미 파싱된 값 우선 사용, details_data는 폴백
                      let dockerUsername = '';
                      let dockerPassword = '';
                      let imageTag = build.image_tag || ''; // 백엔드에서 파싱된 값 우선
                      let registryType = '';
                      let registryUrl = build.registry || ''; // 백엔드에서 파싱된 값 우선
                      let registryProject = '';
                      let builtImages: string[] = build.built_images || []; // 백엔드에서 파싱된 값 우선

                      // details_data에서 추가 정보 추출 (백엔드에서 파싱되지 않은 필드들)
                      if (build.details_data) {
                        try {
                          const details =
                            typeof build.details_data === 'string'
                              ? JSON.parse(build.details_data)
                              : build.details_data.Valid &&
                                  build.details_data.String
                                ? JSON.parse(build.details_data.String)
                                : build.details_data;
                          // 백엔드 값이 없을 때만 details_data에서 가져오기
                          imageTag = imageTag || details.image_tag || '';
                          dockerUsername = details.docker_username || '';
                          dockerPassword = details.docker_password || '';
                          registryType = details.registry_type || '';
                          registryUrl =
                            registryUrl || details.registry_url || '';
                          registryProject = details.registry_project || '';
                          if (builtImages.length === 0) {
                            builtImages = details.built_images || [];
                          }
                        } catch (_e) {
                          // JSON 파싱 실패 - 기본값 유지
                        }
                      }
                      return {
                        id: build.id,
                        pipeline_id: build.pipeline_id,
                        image_tag: imageTag,
                        started_at: build.started_at,
                        infra_name:
                          build.build_infra_name?.String ||
                          build.build_infra_name ||
                          'N/A',
                        docker_username: dockerUsername,
                        docker_password: dockerPassword,
                        registry_type: registryType,
                        registry_url: registryUrl,
                        registry_project: registryProject,
                        built_images: builtImages,
                      };
                    })
                    .filter(
                      (build: any) =>
                        build.image_tag ||
                        (build.built_images && build.built_images.length > 0)
                    );

                  if (availableBuilds.length > 0) {
                    setAvailableBuilds(availableBuilds);
                  }
                }
              } catch (_error) {
                // 빌드 목록 조회 실패 시 무시
              }

              // 저장된 자격증명 읽어오기 (initialHops 설정 전에 먼저 읽기)
              const { useCredsStore } = await import(
                '../../stores/useCredsStore'
              );
              const store = useCredsStore.getState();
              const { sourceRepository, serverlist } = store;
              const savedGitCred = sourceRepository.find(
                r =>
                  repo.gitlabUrl.includes(r.baseUrl) ||
                  r.baseUrl.includes(repo.gitlabUrl)
              );

              //  [수정] initialHops 생성 시 creds-store에서 username도 가져오기 (보안정책: DB에 username 저장 안함)
              const initialHops = targetHops.map((hop: any) => {
                const serverCred = serverlist.find(
                  (s: any) =>
                    s.host?.toLowerCase() === hop.host?.toLowerCase() &&
                    (s.port || 22) === (hop.port || 22)
                );
                return {
                  ...hop,
                  //  username은 creds-store에서 가져오기
                  username: serverCred?.userId || hop.username || '',
                  password: '',
                };
              });

              const fullInitialValues = {
                serviceId: serviceId, //  ExecutionModal이 서비스 정보를 조회할 수 있도록 serviceId 추가
                infraType: repo.infraType, //  infraType 직접 전달
                gitUrl: repo.gitlabUrl,
                dockerRegistry: registryUrl || repo.dockerRegistry || '',
                hops: initialHops,
                deployServerId: deployServerInfo.serverId,
                deployInfraId: deployServerInfo.infraId,
                credentials: {
                  username_repo: savedGitCred?.userId || '',
                  password_repo: savedGitCred?.token || '',
                  docker_username: registryUsername,
                  docker_password: registryPassword,
                },
              };

              setExecutionInitialValues(fullInitialValues);
              setIsExecutionModalVisible(true);
            } catch (_error) {
              message.error('서버 정보를 가져오는 데 실패했습니다.');
            } finally {
              setIsInitialValuesLoading(false);
            }
            return;
          }
        }

        //  빌드 단계 또는 재배포 (is_deployed === true): 상세 정보 모달 열기
        setIsModalContentLoading(true);
        const logs = await pipelineApi.getLatestStepDetails(
          serviceId,
          displayKey
        );
        setModalPipelineLogs(logs);

        // 빌드/배포 모달 열기
        setIsDetailModalOpen(true);
        setSelectedRepoForModal(repo);
        setSelectedDisplayKeyForModal(displayKey);
        setSastModalView('summary');
        setModalSastData(null);
        setIsModalContentLoading(false);
        return;
      }
    } catch (_error) {
      message.error('상세 정보를 불러오는 데 실패했습니다.');
      setIsDetailModalOpen(false); // 오류 발생 시 모달 닫기
    } finally {
      setIsModalContentLoading(false);
    }
  };

  const _runSastScan = async ({
    gitUrl,
    accessToken,
    config,
  }: {
    gitUrl: string;
    accessToken: string;
    config: string;
  }): Promise<{
    semgrepResult: SastSingleResult;
    codeqlResult: SastSingleResult;
  }> => {
    const params = new Map<string, string>([
      ['gitUrl', gitUrl],
      ['authType', 'token'],
      ['accessToken', accessToken],
      ['config', config],
    ]);
    const semgrepResult = await semgrepAnalysis(params);
    const codeqlResult = await codeqlAnalysis(params);
    return { semgrepResult, codeqlResult };
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedStageData(null);
    setSelectedRepoForModal(null);
    setSelectedDisplayKeyForModal(null);
    setModalSastData(null);
    setModalPipelineLogs(null);
    // 모달 종료 시 진행 중인 SAST 요청 컨텍스트 초기화
    activeSastRequestRepoIdRef.current = null;
  };

  //  [추가] 폴링을 중지하는 함수
  const stopPolling = useCallback((): void => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
      setExecutingStage(null); // 폴링 중지 시 실행 상태도 초기화
    }
  }, []);

  //  [수정] fetchPipelineStatuses 함수를 useCallback으로 감싸고 폴링 로직을 추가합니다.
  //  [최적화] 배치 API 사용으로 N번 → 1번 API 호출로 개선
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
        //  [최적화] 배치 API: 모든 서비스 상태를 한 번의 호출로 가져옴
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
        let _executingPipelineSuccess = false;

        //  [핵심 수정] 함수형 업데이트로 항상 최신 상태를 참조
        setPipelineStatuses(prevStatuses => {
          const newStatuses: Record<number, PipelineStep[]> = {
            ...prevStatuses,
          };

          repositories.forEach(repo => {
            const steps = batchResults[repo.id];
            if (steps && steps.length > 0) {
              //  [디버그] 상태 변경 감지 로깅
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

              //  normalizeStatusForPolling은 usePipelineStatus 훅에서 import
              // 정확한 실행 중 상태 확인
              if (
                steps.some(
                  step => normalizeStatusForPolling(step.status) === 'running'
                )
              ) {
                isStillRunning = true;
              }

              //  [추가] 실행 중인 특정 파이프라인의 완료 감지
              if (
                executingPipeline &&
                repo.id === executingPipeline.serviceId
              ) {
                const targetStep = steps.find(
                  step => step.step_name === executingPipeline.stepName
                );

                if (targetStep && targetStep.status !== 'running') {
                  executingPipelineCompleted = true;
                  _executingPipelineSuccess = targetStep.status === 'success';
                }
              }
            }
            //  API가 실패했거나 데이터가 없어도 기존 상태는 유지됨
          });

          return newStatuses;
        });

        //  [수정] 실행 중인 특정 파이프라인이 완료되면 추적 정보 초기화 (알림 제거)
        if (executingPipelineCompleted && executingPipeline) {
          // 완료된 파이프라인 추적 정보 초기화
          setExecutingPipeline(null);
          setExecutingStage(null);
          setStageToExecute(null);

          //  [신규] 빌드 완료 플래그 설정 (별도 useEffect에서 처리)
          if (executingPipeline.stepName === 'build') {
            setBuildCompletedFlag(prev => prev + 1); // 카운터 증가로 useEffect 트리거
          }
        }

        //  [수정] 폴링 중지 로직: grace period 추가로 UI 업데이트 보장
        if (isStillRunning) {
          // 파이프라인이 실행 중이면 grace counter 리셋
          gracePollCountRef.current = 0;
        } else if (pollingTimerRef.current) {
          // 실행 중인 파이프라인이 없으면 grace period 카운터 증가
          gracePollCountRef.current += 1;

          //  [확장] grace period를 6회 폴링 (30초)로 증가하여 완료 상태가 확실히 UI에 반영되도록 보장
          if (gracePollCountRef.current >= 6) {
            stopPolling();
            gracePollCountRef.current = 0; // 카운터 리셋
          }
        }
      } catch (_error: unknown) {
        stopPolling(); // 에러 발생 시에도 폴링 중지
      } finally {
        if (isInitialLoad) {
          setIsPipelineLoading(false);
        }
      }
    },
    [repositories, stopPolling, executingPipeline]
  );

  //  [추가] 폴링을 시작하는 함수
  const startPolling = useCallback((): void => {
    stopPolling(); // 기존 폴링이 있다면 중지
    gracePollCountRef.current = 0; //  grace counter 리셋
    void fetchPipelineStatuses(); // 즉시 한 번 실행
    pollingTimerRef.current = setInterval(() => {
      void fetchPipelineStatuses();
    }, 5000); // 5초 간격
  }, [fetchPipelineStatuses, stopPolling]);

  //  [추가] 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  //  DetailModalContent props 디버깅 (제거됨 - 새로운 커밋 모달 사용)

  //  SAST 모달 전용 폴링 (모달이 열려 있고 SAST 상태가 analyzing일 때만 동작)
  useEffect(() => {
    const stopSastPolling = () => {
      if (sastPollingTimerRef.current) {
        clearInterval(sastPollingTimerRef.current);
        sastPollingTimerRef.current = null;
      }
    };

    //  [수정] SAST는 더 이상 별도 단계가 아니므로 항상 false
    /* DISABLED - SAST 폴링 로직 제거됨
    if (
      false &&
      isDetailModalOpen &&
      selectedDisplayKeyForModal === ('sast' as never) &&
      modalSastData?.status === 'analyzing' &&
      selectedRepoForModal
    ) {
      // 기존 폴링이 있다면 정리 후 재시작
      if (sastPollingTimerRef.current) {
        clearInterval(sastPollingTimerRef.current);
      }
      // getSastResult는 아래에서 선언되므로, setInterval 콜백 안에서 지연 참조되도록 래핑
      sastPollingTimerRef.current = setInterval(() => {
        void (async () => {
          try {
            // 폴링 중에도 경쟁상태 방지: 현재 활성 요청 서비스 확인
            activeSastRequestRepoIdRef.current = selectedRepoForModal.id;
            const latest = await getSastResult(selectedRepoForModal.id);
            if (
              latest &&
              activeSastRequestRepoIdRef.current === selectedRepoForModal.id
            ) {
              setModalSastData(latest);
              if (latest.status && latest.status !== 'analyzing') {
                // 완료 또는 실패 등 analyzing이 끝났으면 폴링 중단
                stopSastPolling();
                // 목록용 상태도 동기화
                updateSecurityState(
                  selectedRepoForModal.gitlabUrl,
                  'sast',
                  latest.status === 'completed' ? 'completed' : 'failed'
                , selectedRepoForModal.id);
              }
            }
          } catch {
            // Error occurred - stop polling to prevent excessive retries
            stopSastPolling();
            if (selectedRepoForModal) {
              updateSecurityState(
                selectedRepoForModal.gitlabUrl,
                'sast',
                'failed'
              , selectedRepoForModal.id);
            }
          }
        })();
      }, 3000);
    } else {
      // 조건이 충족되지 않으면 즉시 폴링 중단
      stopSastPolling();
    }
    */
    // SAST 폴링 로직이 제거되어 항상 폴링 중단
    stopSastPolling();

    // 의존성 변화 또는 언마운트 시 정리
    return () => {
      stopSastPolling();
    };
    //  [수정] getSastResult는 SAST 폴링 코드가 주석 처리되어 더 이상 사용되지 않으므로 의존성에서 제거
  }, [
    isDetailModalOpen,
    selectedDisplayKeyForModal,
    modalSastData?.status,
    selectedRepoForModal,
    services,
  ]);

  //  [신규] 배포 실행 후 fresh data가 로드되면 자동으로 상세 모달 열기
  useEffect(() => {

    if (!pendingDeploymentModalOpen) return;

    const { repo, displayKey } = pendingDeploymentModalOpen;
    const serviceSteps = pipelineStatuses[repo.id];

    if (!serviceSteps || serviceSteps.length === 0) {
      // 아직 데이터가 로드되지 않음, 다음 폴링 대기
      return;
    }

    // deploy 단계의 상태 확인
    const deployStep = serviceSteps.find(step => step.step_name === 'deploy');

    if (deployStep) {
      //  Fresh deployment data가 확인됨 - 모달 열기 (모든 상태 포함: running, pending, failed, success)

      //  modalPipelineLogs는 선택적 - workflowStatuses에서 데이터를 가져옴
      // 하지만 더 나은 디버깅을 위해 null로 초기화
      setModalPipelineLogs(null);
      setSelectedRepoForModal(repo);
      setSelectedDisplayKeyForModal(displayKey);
      setIsDetailModalOpen(true);
      setPendingDeploymentModalOpen(null); // 대기 상태 초기화
    } else {
      // deployStep이 아직 생성되지 않은 경우, 다음 폴링 대기
    }
  }, [pendingDeploymentModalOpen, pipelineStatuses]);

  //  [수정] 파이프라인 실행 로직을 AIWorkflowDashboard.tsx와 유사하게 구현합니다.
  const handleExecuteStage = useCallback(
    async (repo: GitRepository, displayKey: DisplayKey) => {
      closeDetailModal(); // 상세 모달 먼저 닫기

      //  services 배열이 비어있으면 먼저 로드
      let currentServices = services;
      if (currentServices.length === 0) {
        try {
          const servicesRes = await serviceApi.getServices();
          currentServices = servicesRes || [];
          setServices(currentServices);
        } catch (_error) {
          message.error('서비스 목록을 불러오는 중 오류가 발생했습니다.');
          return;
        }
      }

      // 서비스 ID 찾기 (우선순위: repo.id 직접 매칭 > gitlab_url > name)
      //  repo.id와 service.id가 동일하므로 우선적으로 ID로 매칭
      let serviceId = currentServices.find(s => s.id === repo.id)?.id;

      if (!serviceId) {
        // ID로 찾지 못하면 gitlab_url로 매칭
        serviceId = currentServices.find(
          s => s.gitlab_url === repo.gitlabUrl
        )?.id;
      }

      if (!serviceId) {
        // 자동 생성된 서비스 찾기 (name 기반)
        const autoCreatedService = currentServices.find(
          s =>
            s.name === repo.name ||
            s.gitlab_url === repo.gitlabUrl ||
            (s.name &&
              repo.name &&
              s.name.toLowerCase() === repo.name.toLowerCase())
        );
        serviceId = autoCreatedService?.id;
      }

      if (!serviceId) {
        message.error(
          '연결된 서비스를 찾을 수 없습니다. 서비스를 다시 등록하면 자동으로 서비스가 생성됩니다.'
        );
        return;
      }

      setStageToExecute({ repo, displayKey });
      setIsInitialValuesLoading(true);

      try {
        let targetHops: any[] = [];
        let buildServerId: number | null = null;
        let buildInfraId: number | null = null;

        // 배포 단계인 경우 빌드 실행 시 사용한 서버 정보를 조회
        let registryUsername = '';
        let registryPassword = '';
        let registryUrl = '';

        if (displayKey === 'deploy') {
          //  useBuildServerInfo 훅의 loadServerInfo 사용
          const deployServerInfo = await loadBuildServerInfo(serviceId);

          if (deployServerInfo) {
            targetHops = deployServerInfo.hops;
            buildServerId = deployServerInfo.serverId;
            buildInfraId = deployServerInfo.infraId;

            //  Container Registry 인증 정보도 함께 저장
            registryUrl = deployServerInfo.registryUrl || '';
            registryUsername = deployServerInfo.registryUsername || '';
            registryPassword = deployServerInfo.registryPassword || '';

            // 배포 시 사용할 빌드 서버 정보 저장
            setDeployServerId(buildServerId);
            setDeployInfraId(buildInfraId);
          } else {
            // 빌드 서버 정보를 찾지 못한 경우 사용자에게 알림
            message.warning(
              '배포하기 전에 먼저 빌드를 성공적으로 완료해주세요.'
            );
            setIsInitialValuesLoading(false);
            return;
          }

          //  [신규] 서비스별 빌드 버전 조회 시도 (멀티-서비스 프로젝트용)
          try {
            const { buildApi } = await import('../../lib/api/build');
            const serviceBuildVersionsData =
              await buildApi.getServiceBuildVersions(serviceId);

            if (
              serviceBuildVersionsData &&
              Object.keys(serviceBuildVersionsData).length > 0
            ) {
              setServiceBuildVersions(serviceBuildVersionsData);
            } else {
            }
          } catch (error) {
            console.error(
              '[GitManagement]  서비스별 빌드 버전 조회 실패 (handleExecuteStage), 기존 번들 방식 사용:',
              error
            );
          }

          //  [수정] 이미 조회한 buildStats 재사용 (중복 API 호출 방지)
          // 빌드 목록 조회 (배포 시 이미지 선택용)
          try {
            const buildStats = deployServerInfo.buildStats;
            if (
              buildStats?.recent_builds &&
              buildStats.recent_builds.length > 0
            ) {
              // 성공한 빌드만 필터링하고 image_tag 추출
              const availableBuilds = buildStats.recent_builds
                .filter((build: any) => build.status === 'success')
                .map((build: any) => {
                  //  [수정] 백엔드에서 이미 파싱된 값 우선 사용, details_data는 폴백
                  let dockerUsername = '';
                  let dockerPassword = '';
                  let imageTag = build.image_tag || ''; // 백엔드에서 파싱된 값 우선
                  let registryType = '';
                  let registryUrl = build.registry || ''; // 백엔드에서 파싱된 값 우선
                  let registryProject = '';
                  let builtImages: string[] = build.built_images || []; // 백엔드에서 파싱된 값 우선

                  // details_data에서 추가 정보 추출 (백엔드에서 파싱되지 않은 필드들)
                  if (build.details_data) {
                    try {
                      const details =
                        typeof build.details_data === 'string'
                          ? JSON.parse(build.details_data)
                          : build.details_data.Valid &&
                              build.details_data.String
                            ? JSON.parse(build.details_data.String)
                            : build.details_data;
                      // 백엔드 값이 없을 때만 details_data에서 가져오기
                      imageTag = imageTag || details.image_tag || '';
                      dockerUsername = details.docker_username || '';
                      dockerPassword = details.docker_password || '';
                      registryType = details.registry_type || '';
                      registryUrl = registryUrl || details.registry_url || '';
                      registryProject = details.registry_project || '';
                      if (builtImages.length === 0) {
                        builtImages = details.built_images || [];
                      }
                    } catch {
                      // JSON parsing error - continue with defaults
                    }
                  }
                  return {
                    id: build.id,
                    pipeline_id: build.pipeline_id,
                    image_tag: imageTag,
                    started_at: build.started_at,
                    infra_name:
                      build.build_infra_name?.String ||
                      build.build_infra_name ||
                      'N/A',
                    docker_username: dockerUsername,
                    docker_password: dockerPassword,
                    registry_type: registryType,
                    registry_url: registryUrl,
                    registry_project: registryProject,
                    built_images: builtImages,
                  };
                })
                .filter(
                  (build: any) =>
                    build.image_tag ||
                    (build.built_images && build.built_images.length > 0)
                ) // image_tag 또는 built_images가 있는 빌드만
                .sort((a: any, b: any) => {
                  // 최신 빌드가 먼저 오도록 started_at 기준 내림차순 정렬
                  return (
                    new Date(b.started_at).getTime() -
                    new Date(a.started_at).getTime()
                  );
                });

              if (availableBuilds.length > 0) {
                // 빌드 목록을 상태에 저장 (ExecutionModal에서 사용)
                setAvailableBuilds(availableBuilds);
              }
            }
          } catch {
            // Build list fetch failed - continue with deployment (will auto-select latest)
          }
        } else {
          // 빌드 단계나 다른 단계인 경우 서비스 인프라 사용
          const serverInfo = await serviceApi.getServiceServers(serviceId);
          targetHops = JSON.parse(serverInfo.hops || '[]');
        }

        //  스토어에서 자격증명 정보 읽어오기 (initialHops 설정 전에 먼저 읽기)
        const { useCredsStore } = await import('../../stores/useCredsStore');
        const store = useCredsStore.getState();
        const { imageRegistry, sourceRepository, serverlist } = store;

        //  [수정] initialHops 생성 시 creds-store에서 username도 가져오기 (보안정책: DB에 username 저장 안함)
        const initialHops = targetHops.map((hop: any) => {
          const serverCred = serverlist.find(
            (s: any) =>
              s.host?.toLowerCase() === hop.host?.toLowerCase() &&
              (s.port || 22) === (hop.port || 22)
          );
          return {
            ...hop,
            //  username은 creds-store에서 가져오기
            username: serverCred?.userId || hop.username || '',
            password: '',
          };
        });

        //  저장된 Git credential 찾기
        const gitUrl = repo.gitlabUrl;
        const gitCred = sourceRepository.find(
          r => gitUrl.includes(r.baseUrl) || r.baseUrl.includes(gitUrl)
        );

        const fullInitialValues = {
          serviceId: serviceId, //  ExecutionModal이 서비스 정보를 조회할 수 있도록 serviceId 추가
          infraType: repo.infraType, //  infraType 직접 전달
          gitUrl: repo.gitlabUrl,
          //  배포 단계일 때는 빌드에서 사용한 registry URL 사용, 없으면 repo의 dockerRegistry 폴백
          dockerRegistry:
            displayKey === 'deploy'
              ? registryUrl || repo.dockerRegistry || ''
              : repo.dockerRegistry || '',
          hops: initialHops,
          //  배포 시 사용할 서버 ID 저장 (deploy 단계에서만)
          deployServerId: displayKey === 'deploy' ? buildServerId : undefined,
          deployInfraId: displayKey === 'deploy' ? buildInfraId : undefined,
          //  Container Registry 인증 정보 저장 (deploy 단계에서만)
          //  저장된 Git credential도 초기값으로 설정
          credentials:
            displayKey === 'deploy'
              ? {
                  username_repo: gitCred?.userId || '',
                  password_repo: gitCred?.token || '',
                  docker_username: registryUsername,
                  docker_password: registryPassword,
                }
              : undefined,
        };
        setExecutionInitialValues(fullInitialValues);

        const sshComplete = (
          initialHops as { host?: string; port?: number }[]
        ).every(hop => {
          const serverCred = serverlist.find(
            s =>
              s.host?.toLowerCase() === hop.host?.toLowerCase() &&
              (s.port || 22) === (hop.port || 22)
          );
          return !!(serverCred && serverCred.password);
        });

        // gitUrl은 이미 line 1860에서 선언됨
        const gitComplete =
          !gitUrl ||
          sourceRepository.some(
            r => gitUrl.includes(r.baseUrl) || r.baseUrl.includes(gitUrl)
          );

        const dockerRegistry = fullInitialValues.dockerRegistry;
        const dockerComplete =
          !dockerRegistry ||
          imageRegistry.some(
            reg =>
              dockerRegistry.includes(reg.registryUrl) ||
              reg.registryUrl.includes(dockerRegistry)
          );

        //  Deploy 단계가 아니고 모든 자격증명이 완료된 경우에만 바로 실행
        // Deploy 단계는 항상 모달을 표시하여 사용자가 정보를 확인/변경할 수 있도록 함
        const canExecuteDirectly =
          displayKey !== 'deploy' &&
          sshComplete &&
          gitComplete &&
          dockerComplete;

        if (canExecuteDirectly) {
          setExecutingStage(displayKey);
          try {
            const formattedHops = (
              initialHops as {
                host?: string;
                username?: string;
                port?: number;
              }[]
            ).map(hop => {
              const serverCred = serverlist.find(
                s =>
                  s.host?.toLowerCase() === hop.host?.toLowerCase() &&
                  (s.port || 22) === (hop.port || 22)
              );
              return {
                host: hop.host || '',
                //  [수정] username도 creds-store에서 가져오기 (보안정책: DB에 username 저장 안함)
                username: serverCred?.userId || hop.username || '',
                port: hop.port || 22,
                password: serverCred?.password || '',
              };
            });
            // Git 및 Registry 자격 증명은 DB에서 조회되므로 여기서는 사용하지 않음
            // const _gitCred = sourceRepository.find(
            //   r => gitUrl.includes(r.baseUrl) || r.baseUrl.includes(gitUrl)
            // );
            // const _registryCred = imageRegistry.find(
            //   reg =>
            //     dockerRegistry.includes(reg.registryUrl) ||
            //     reg.registryUrl.includes(dockerRegistry)
            // );

            // Deploy 단계가 아닌 경우에만 여기서 실행 (build 등)
            if (displayKey === 'build') {
              //  [신규] 빌드 전 SAST 보안 검사 수행
              const executeBuild = async () => {
                try {
                  //  SSH credentials는 creds-store에서, GitLab/Registry는 DB에서
                  await pipelineApi.buildImage(
                    serviceId,
                    formattedHops //  SSH username/password from creds-store
                  );
                  //  [추가] 파이프라인 실행 추적 정보 설정 (완료 감지 및 알림용)
                  setExecutingPipeline({
                    serviceId,
                    serviceName: repo.name,
                    stepName: displayKey,
                    displayKey,
                  });
                  message.success(
                    `${displayKey.toUpperCase()} 단계 실행 시작 - 백그라운드에서 파이프라인 작업이 시작되었습니다.`
                  );
                  startPolling();
                } catch (buildError) {
                  console.error('빌드 실행 실패:', buildError);
                  setIsExecutionModalVisible(true);
                }
              };

              // SAST 결과 확인
              try {
                setSecurityCheckLoading(true);
                const sastResponse = (await gitApi.getSastResult(repo.id)) as {
                  data?: {
                    semgrep?: SastResultData['semgrep'];
                    codeql?: SastResultData['codeql'];
                    status?: string;
                    summary?: SastResultData['summary'];
                  };
                };
                const sastData = sastResponse?.data;
                const hasSastResult = sastData?.semgrep || sastData?.codeql;

                // SARIF에서 직접 severity 파싱하는 함수
                const parseSarifSeverity = (
                  sarifJson: string | undefined
                ): {
                  critical: number;
                  high: number;
                  medium: number;
                  low: number;
                } => {
                  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
                  if (!sarifJson) return counts;
                  try {
                    const sarif = JSON.parse(sarifJson);
                    const runs = sarif?.runs || [];
                    if (runs.length === 0) return counts;
                    const results = runs[0]?.results || [];
                    const mapSeverity = (
                      lvl: string
                    ): 'critical' | 'high' | 'medium' | 'low' => {
                      const v = (lvl || '').toLowerCase();
                      if (v === 'error' || v === 'critical') return 'critical';
                      if (v === 'warning' || v === 'high') return 'high';
                      if (v === 'note' || v === 'medium' || v === 'moderate')
                        return 'medium';
                      return 'low';
                    };
                    for (const issue of results) {
                      // 1. rule.level에서 severity 확인 (Semgrep/CodeQL 공통 - 가장 우선)
                      let level = issue.rule?.level || issue.level || '';
                      // 2. properties에서 여러 필드 시도
                      if (!level && issue.properties) {
                        level =
                          issue.properties.securitySeverity ||
                          issue.properties['security-severity'] ||
                          issue.properties.severity ||
                          '';
                      }
                      // 3. rank 필드 시도 (CodeQL)
                      if (!level && issue.rank) level = issue.rank;
                      // 4. tags에서 severity 추출
                      if (!level && issue.properties?.tags) {
                        for (const tag of issue.properties.tags) {
                          const tagLower = (tag || '').toLowerCase();
                          if (tagLower.includes('critical')) {
                            level = 'critical';
                            break;
                          }
                          if (tagLower.includes('high')) {
                            level = 'high';
                            break;
                          }
                          if (tagLower.includes('medium')) {
                            level = 'medium';
                            break;
                          }
                          if (tagLower.includes('low')) {
                            level = 'low';
                            break;
                          }
                        }
                      }
                      counts[mapSeverity(level)]++;
                    }
                  } catch (e) {
                    console.warn('SARIF 파싱 오류:', e);
                  }
                  return counts;
                };

                // SARIF에서 직접 severity 계산
                const semgrepSarif = sastData?.semgrep?.results?.sarif_json;
                const codeqlSarif = sastData?.codeql?.results?.sarif_json;
                const semgrepCounts = parseSarifSeverity(semgrepSarif);
                const codeqlCounts = parseSarifSeverity(codeqlSarif);
                const calculatedSeverity = {
                  critical: semgrepCounts.critical + codeqlCounts.critical,
                  high: semgrepCounts.high + codeqlCounts.high,
                  medium: semgrepCounts.medium + codeqlCounts.medium,
                  low: semgrepCounts.low + codeqlCounts.low,
                };

                // SAST 분석이 없는 경우
                if (!hasSastResult || sastData?.status === 'not_found') {
                  setSecurityWarningConfig({
                    stage: 'build',
                    category: 'sast',
                    warningType: 'no_analysis',
                    serviceName: repo.name,
                    onContinue: () => {
                      setSecurityWarningModalVisible(false);
                      setSecurityWarningConfig(null);
                      void executeBuild();
                    },
                  });
                  setSecurityWarningModalVisible(true);
                  setSecurityCheckLoading(false);
                  setIsInitialValuesLoading(false);
                  return;
                }

                // SAST 결과에서 critical 취약점 확인 (SARIF에서 직접 계산한 값 사용)
                const vulnerabilitySummary = calculatedSeverity;
                if (vulnerabilitySummary.critical > 0) {
                  setSecurityWarningConfig({
                    stage: 'build',
                    category: 'sast',
                    warningType: 'critical_found',
                    vulnerabilitySummary,
                    serviceName: repo.name,
                    onContinue: () => {
                      setSecurityWarningModalVisible(false);
                      setSecurityWarningConfig(null);
                      void executeBuild();
                    },
                  });
                  setSecurityWarningModalVisible(true);
                  setSecurityCheckLoading(false);
                  setIsInitialValuesLoading(false);
                  return;
                }

                // 보안 검사 통과 - 바로 빌드 실행
                setSecurityCheckLoading(false);
                await executeBuild();
              } catch (sastError) {
                console.warn('SAST 결과 조회 실패, 빌드 계속 진행:', sastError);
                setSecurityCheckLoading(false);
                // SAST 조회 실패 시에도 빌드는 진행 가능
                await executeBuild();
              }
              return; // 빌드 처리 완료 후 종료
            }

            //  [추가] 파이프라인 실행 추적 정보 설정 (완료 감지 및 알림용)
            setExecutingPipeline({
              serviceId,
              serviceName: repo.name,
              stepName: displayKey,
              displayKey,
            });

            message.success(
              `${displayKey.toUpperCase()} 단계 실행 시작 - 백그라운드에서 파이프라인 작업이 시작되었습니다.`
            );
            startPolling();
          } catch {
            // Pipeline execution failed - show modal for manual retry
            setIsExecutionModalVisible(true);
          } finally {
            // setExecutingStage(null); // 폴링이 중지시킬 것이므로 여기서 해제 안함
          }
        } else {
          // Deploy 단계이거나 자격증명이 불완전한 경우 모달 표시
          setIsExecutionModalVisible(true);
        }
      } catch {
        // Server info fetch failed
        message.error('서버 정보를 가져오는 데 실패했습니다.');
        setIsExecutionModalVisible(true);
      } finally {
        setIsInitialValuesLoading(false);
      }
    },
    [startPolling, services]
  );

  //  [추가] 실행 모달 제출 핸들러
  const handleExecutionSubmit = useCallback(
    (values: ExecutionSubmitValues): void => {
      void (async () => {
        if (!stageToExecute) return;

        //  [신규] 중복 실행 방지 - 이미 실행 중인 단계가 있으면 무시
        if (executingStage !== null) {
          message.warning(
            `이미 ${executingStage.toUpperCase()} 작업이 진행 중입니다. 완료 후 다시 시도해주세요.`
          );
          return;
        }

        const { repo, displayKey } = stageToExecute;
        //  services 배열이 비어있으면 먼저 로드
        let currentServices = services;
        if (currentServices.length === 0) {
          try {
            const servicesRes = await serviceApi.getServices();
            currentServices = servicesRes || [];
            setServices(currentServices);
          } catch {
            // Services fetch failed - use existing services array
          }
        }

        // 서비스 ID 찾기 (우선순위: repo.id 직접 매칭 > gitlab_url > name)
        //  repo.id와 service.id가 동일하므로 우선적으로 ID로 매칭
        let serviceId = currentServices.find(s => s.id === repo.id)?.id;

        if (!serviceId) {
          // ID로 찾지 못하면 gitlab_url로 매칭
          serviceId = currentServices.find(
            s => s.gitlab_url === repo.gitlabUrl
          )?.id;
        }

        if (!serviceId) {
          const autoCreatedService = currentServices.find(
            s =>
              s.name === repo.name ||
              s.gitlab_url === repo.gitlabUrl ||
              (s.name &&
                repo.name &&
                s.name.toLowerCase() === repo.name.toLowerCase())
          );
          serviceId = autoCreatedService?.id;
        }

        if (!serviceId) {
          message.error(
            `서비스를 찾을 수 없습니다. "${repo.name}" 서비스 정보를 찾을 수 없습니다. 서비스 목록을 새로고침한 후 다시 시도해주세요.`
          );
          console.error('[GitManagement] 서비스 ID를 찾을 수 없음:', {
            repoId: repo.id,
            repoName: repo.name,
            repoGitlabUrl: repo.gitlabUrl,
            availableServices: currentServices.map(s => ({
              id: s.id,
              name: s.name,
              gitlab_url: s.gitlab_url,
            })),
          });
          return;
        }

        setExecutingStage(displayKey);
        setIsExecutionModalVisible(false);

        try {
          const initialHops =
            (executionInitialValues.hops as {
              host: string;
              username: string;
              port?: number;
            }[]) || [];
          const submittedHops = values.hops ?? [];
          //  [수정] useCredsStore에서 serverlist 가져오기
          const credsStore = useCredsStore.getState();
          const formattedHops = initialHops.map((initialHop, index) => {
            const submittedHop = (submittedHops[index] || {}) as {
              username?: string;
              password?: string;
            };
            //  [수정] submittedHop에 username/password가 없으면 serverlist에서 가져오기 (저장된 자격증명 사용)
            const serverCred = credsStore.serverlist?.find(
              s =>
                s.host?.toLowerCase() === initialHop.host?.toLowerCase() &&
                (s.port || 22) === (initialHop.port || 22)
            );
            return {
              ...initialHop,
              port: initialHop.port || 22,
              //  [수정] username도 creds-store에서 가져오기 (보안정책: DB에 username 저장 안함)
              username:
                submittedHop.username ||
                serverCred?.userId ||
                initialHop.username ||
                '',
              password: submittedHop.password || serverCred?.password || '',
            };
          });

          const credentials: PipelineCredentials = values.credentials ?? {
            username_repo: '',
            password_repo: '',
            docker_username: '',
            docker_password: '',
          };

          //  credentials가 비어있으면 store에서 다시 가져오기 (브라우저 캐시 대응)
          if (displayKey === 'deploy' && !credentials.username_repo) {
            const currentRepo = services.find(s => s.id === serviceId);
            if (currentRepo) {
              const gitCred = useCredsStore
                .getState()
                .sourceRepository.find(
                  (r: any) =>
                    currentRepo.gitlab_url.includes(r.baseUrl) ||
                    r.baseUrl.includes(currentRepo.gitlab_url)
                );
              if (gitCred) {
                credentials.username_repo = gitCred.userId || '';
                credentials.password_repo = gitCred.token || '';
              }
            }
          }

          //  Registry credentials도 비어있으면 store에서 가져오기
          if (displayKey === 'deploy' && !credentials.docker_username) {
            const currentRepo = services.find(s => s.id === serviceId);
            if (currentRepo && currentRepo.registry_config) {
              try {
                const registryConfig = JSON.parse(currentRepo.registry_config);
                const registryUrl = registryConfig?.registryUrl || '';
                if (registryUrl) {
                  const registryCred = useCredsStore
                    .getState()
                    .imageRegistry.find(
                      (r: any) =>
                        registryUrl.includes(r.registryUrl) ||
                        r.registryUrl.includes(registryUrl)
                    );
                  if (registryCred) {
                    credentials.docker_username = registryCred.userId || '';
                    credentials.docker_password = registryCred.password || '';
                  }
                }
              } catch {
                // Registry config parsing error - continue without credentials
              }
            }
          }

          if (displayKey === 'build') {
            //  [신규] 빌드 전 SAST 보안 검사 수행
            const executeBuildFromModal = async () => {
              try {
                //  SSH credentials는 creds-store에서, GitLab/Registry는 DB에서
                await pipelineApi.buildImage(serviceId, formattedHops);

                //  [추가] 파이프라인 실행 추적 정보 설정 (완료 감지 및 알림용)
                setExecutingPipeline({
                  serviceId,
                  serviceName: repo.name,
                  stepName: displayKey,
                  displayKey,
                });

                message.success(
                  `${displayKey.toUpperCase()} 단계 실행 시작 - 백그라운드에서 파이프라인 작업이 시작되었습니다. 잠시 후 상태가 업데이트됩니다.`
                );
                startPolling();
              } catch (buildError) {
                console.error('빌드 실행 실패:', buildError);
                const errorMessage =
                  buildError instanceof Error
                    ? buildError.message
                    : String(buildError);
                message.error(
                  `빌드 실행 실패 - ${errorMessage || '알 수 없는 오류가 발생했습니다.'}`
                );
                setExecutingStage(null);
              }
            };

            // SAST 결과 확인
            try {
              setSecurityCheckLoading(true);
              const sastResponse = (await gitApi.getSastResult(repo.id)) as {
                data?: {
                  semgrep?: SastResultData['semgrep'];
                  codeql?: SastResultData['codeql'];
                  status?: string;
                  summary?: SastResultData['summary'];
                };
              };
              const sastData = sastResponse?.data;
              const hasSastResult = sastData?.semgrep || sastData?.codeql;

              // SARIF에서 직접 severity 파싱하는 함수
              const parseSarifSeverity = (
                sarifJson: string | undefined
              ): {
                critical: number;
                high: number;
                medium: number;
                low: number;
              } => {
                const counts = { critical: 0, high: 0, medium: 0, low: 0 };
                if (!sarifJson) return counts;
                try {
                  const sarif = JSON.parse(sarifJson);
                  const runs = sarif?.runs || [];
                  if (runs.length === 0) return counts;
                  const results = runs[0]?.results || [];
                  const mapSeverity = (
                    lvl: string
                  ): 'critical' | 'high' | 'medium' | 'low' => {
                    const v = (lvl || '').toLowerCase();
                    if (v === 'error' || v === 'critical') return 'critical';
                    if (v === 'warning' || v === 'high') return 'high';
                    if (v === 'note' || v === 'medium' || v === 'moderate')
                      return 'medium';
                    return 'low';
                  };
                  for (const issue of results) {
                    // 1. rule.level에서 severity 확인 (Semgrep/CodeQL 공통 - 가장 우선)
                    let level = issue.rule?.level || issue.level || '';
                    // 2. properties에서 여러 필드 시도
                    if (!level && issue.properties) {
                      level =
                        issue.properties.securitySeverity ||
                        issue.properties['security-severity'] ||
                        issue.properties.severity ||
                        '';
                    }
                    // 3. rank 필드 시도 (CodeQL)
                    if (!level && issue.rank) level = issue.rank;
                    // 4. tags에서 severity 추출
                    if (!level && issue.properties?.tags) {
                      for (const tag of issue.properties.tags) {
                        const tagLower = (tag || '').toLowerCase();
                        if (tagLower.includes('critical')) {
                          level = 'critical';
                          break;
                        }
                        if (tagLower.includes('high')) {
                          level = 'high';
                          break;
                        }
                        if (tagLower.includes('medium')) {
                          level = 'medium';
                          break;
                        }
                        if (tagLower.includes('low')) {
                          level = 'low';
                          break;
                        }
                      }
                    }
                    counts[mapSeverity(level)]++;
                  }
                } catch (e) {
                  console.warn('SARIF 파싱 오류:', e);
                }
                return counts;
              };

              // SARIF에서 직접 severity 계산
              const semgrepSarif = sastData?.semgrep?.results?.sarif_json;
              const codeqlSarif = sastData?.codeql?.results?.sarif_json;
              const semgrepCounts = parseSarifSeverity(semgrepSarif);
              const codeqlCounts = parseSarifSeverity(codeqlSarif);
              const calculatedSeverity = {
                critical: semgrepCounts.critical + codeqlCounts.critical,
                high: semgrepCounts.high + codeqlCounts.high,
                medium: semgrepCounts.medium + codeqlCounts.medium,
                low: semgrepCounts.low + codeqlCounts.low,
              };

              // SAST 분석이 없는 경우
              if (!hasSastResult || sastData?.status === 'not_found') {
                setSecurityWarningConfig({
                  stage: 'build',
                  category: 'sast',
                  warningType: 'no_analysis',
                  serviceName: repo.name,
                  onContinue: () => {
                    setSecurityWarningModalVisible(false);
                    setSecurityWarningConfig(null);
                    void executeBuildFromModal();
                  },
                });
                setSecurityWarningModalVisible(true);
                setSecurityCheckLoading(false);
                return;
              }

              // SAST 결과에서 critical 취약점 확인 (SARIF에서 직접 계산한 값 사용)
              const vulnerabilitySummary = calculatedSeverity;
              if (vulnerabilitySummary.critical > 0) {
                setSecurityWarningConfig({
                  stage: 'build',
                  category: 'sast',
                  warningType: 'critical_found',
                  vulnerabilitySummary,
                  serviceName: repo.name,
                  onContinue: () => {
                    setSecurityWarningModalVisible(false);
                    setSecurityWarningConfig(null);
                    void executeBuildFromModal();
                  },
                });
                setSecurityWarningModalVisible(true);
                setSecurityCheckLoading(false);
                return;
              }

              // 보안 검사 통과 - 바로 빌드 실행
              setSecurityCheckLoading(false);
              await executeBuildFromModal();
            } catch (sastError) {
              console.warn('SAST 결과 조회 실패, 빌드 계속 진행:', sastError);
              setSecurityCheckLoading(false);
              // SAST 조회 실패 시에도 빌드는 진행 가능
              await executeBuildFromModal();
            }
          } else if (displayKey === 'deploy') {
            //  [수정] 단일 서비스 또는 멀티-서비스 이미지 선택 정보 추출
            // ExecutionModal에서 camelCase를 snake_case로 변환하므로 snake_case로 접근
            const selectedImageTag = (values as any).selected_image_tag as
              | string
              | undefined;
            const selectedServiceImages = (values as any)
              .selected_service_images as Record<string, string> | undefined;

            //  [신규] 배포 전 SCA 보안 검사 수행
            const executeDeploy = async () => {
              try {
                //  SSH credentials는 creds-store에서, GitLab/Registry는 DB에서
                await pipelineApi.applyKubernetes(
                  serviceId,
                  formattedHops,
                  selectedImageTag,
                  selectedServiceImages
                );

                //  [추가] 파이프라인 실행 추적 정보 설정 (완료 감지 및 알림용)
                setExecutingPipeline({
                  serviceId,
                  serviceName: repo.name,
                  stepName: displayKey,
                  displayKey,
                });

                //  [수정] 배포 실행 후 모달을 즉시 열지 않고, 첫 폴링 업데이트 후 fresh data와 함께 열기
                setPendingDeploymentModalOpen({ repo, displayKey });

                message.success(
                  `${displayKey.toUpperCase()} 단계 실행 시작 - 백그라운드에서 파이프라인 작업이 시작되었습니다. 잠시 후 상태가 업데이트됩니다.`
                );
                startPolling();
              } catch (deployError) {
                console.error('배포 실행 실패:', deployError);
                const errorMessage =
                  deployError instanceof Error
                    ? deployError.message
                    : String(deployError);
                message.error(
                  `배포 실행 실패 - ${errorMessage || '알 수 없는 오류가 발생했습니다.'}`
                );
                setExecutingStage(null);
              }
            };

            //  [개선] 선택한 이미지 버전에 대한 SCA 결과 확인
            try {
              setSecurityCheckLoading(true);

              // 선택된 이미지들 수집
              const selectedImages: string[] = [];
              if (selectedImageTag) {
                selectedImages.push(selectedImageTag);
              }
              if (selectedServiceImages) {
                Object.values(selectedServiceImages).forEach(img => {
                  if (img) selectedImages.push(img);
                });
              }

              // SCA 결과 목록 조회 (최근 50개)
              //  API 응답 구조: { results: [{ result: string (JSON), scan_date, tool_name, ... }], total, status }
              const scaResponse = (await gitApi.getScaResults(repo.id, 50)) as {
                data?: {
                  results?: Array<{
                    result?: string; //  실제 API는 'result' 필드 사용 (not 'sca_result')
                    scan_date?: string;
                    tool_name?: string;
                  }>;
                  total?: number;
                  status?: string;
                };
              };

              const scaResults = scaResponse?.data?.results || [];

              // 선택한 이미지에 대한 SCA 결과 찾기
              const findScaResultForImage = (imageUrl: string) => {
                // 이미지 URL에서 태그 부분 추출 (예: registry.com/project/image:v20260107-145958 -> v20260107-145958)
                const imageTag = imageUrl.split(':').pop() || imageUrl;
                const imageName =
                  imageUrl.split('/').pop()?.split(':')[0] || imageUrl;

                for (let i = 0; i < scaResults.length; i++) {
                  const scaEntry = scaResults[i];
                  if (!scaEntry.result) continue;

                  //  result가 문자열이면 파싱, 이미 객체면 그대로 사용
                  let parsed: Record<string, unknown>;
                  if (typeof scaEntry.result === 'string') {
                    try {
                      parsed = JSON.parse(scaEntry.result);
                    } catch {
                      continue; // 파싱 실패 시 스킵
                    }
                  } else {
                    parsed = scaEntry.result as Record<string, unknown>;
                  }

                  // SCA 결과에서 이미지 이름 찾기 (여러 위치 확인)
                  const summary = parsed?.summary as
                    | Record<string, unknown>
                    | undefined;
                  const result = parsed?.result as
                    | Record<string, unknown>
                    | undefined;
                  const scanResult = result?.scan_result as
                    | Record<string, unknown>
                    | undefined;
                  const metadata = parsed?.metadata as
                    | Record<string, unknown>
                    | undefined;

                  const scannedImage =
                    (summary?.image_name as string) ||
                    (parsed?.image_name as string) ||
                    (parsed?.target_image as string) ||
                    (scanResult?.artifact_name as string) ||
                    (result?.artifact_name as string) ||
                    (metadata?.image_name as string) ||
                    '';

                  if (!scannedImage) continue;

                  // 매칭 조건 확장
                  const scannedImageLower = scannedImage.toLowerCase();
                  const imageUrlLower = imageUrl.toLowerCase();
                  const imageTagLower = imageTag.toLowerCase();
                  const imageNameLower = imageName.toLowerCase();

                  // SCA 분석 이미지에서 이름과 태그 추출
                  const scannedImageName =
                    scannedImageLower.split('/').pop()?.split(':')[0] || '';
                  const scannedImageTag =
                    scannedImageLower.split(':').pop() || '';

                  const isMatch =
                    // 1. 정확한 전체 URL 매칭
                    scannedImageLower === imageUrlLower ||
                    // 2. 이미지 이름 + 태그 동시 매칭 (핵심!)
                    (scannedImageName === imageNameLower &&
                      scannedImageTag === imageTagLower) ||
                    // 3. 선택한 이미지 URL이 SCA 분석 이미지를 완전히 포함
                    imageUrlLower === scannedImageLower;

                  if (isMatch) {
                    return parsed;
                  }
                }
                return null;
              };

              // 선택한 이미지들 분석 상태 및 취약점 수집
              const unanalyzedImages: string[] = [];
              const analyzedWithVulnerabilities: Array<{
                imageUrl: string;
                vulnerabilities: CriticalVulnerabilitySummary;
              }> = [];

              for (const imageUrl of selectedImages) {
                const scaResult = findScaResultForImage(imageUrl);
                if (!scaResult) {
                  unanalyzedImages.push(imageUrl);
                } else {
                  // 분석된 이미지의 취약점 확인
                  const vulnerabilities =
                    checkScaCriticalVulnerabilities(scaResult);
                  if (vulnerabilities && vulnerabilities.critical > 0) {
                    analyzedWithVulnerabilities.push({
                      imageUrl,
                      vulnerabilities,
                    });
                  }
                }
              }

              // Case 1: 분석되지 않은 이미지가 있는 경우
              if (selectedImages.length > 0 && unanalyzedImages.length > 0) {
                const unanalyzedTags = unanalyzedImages
                  .map(img => img.split(':').pop() || img)
                  .join(', ');

                // 추가: 분석된 이미지 중 취약점이 있는 경우도 함께 표시
                let warningMessage = `${repo.name} - ${unanalyzedImages.length}개 이미지 미분석 (${unanalyzedTags})`;
                if (analyzedWithVulnerabilities.length > 0) {
                  const vulnTags = analyzedWithVulnerabilities
                    .map(v => v.imageUrl.split(':').pop() || v.imageUrl)
                    .join(', ');
                  warningMessage += ` | ${analyzedWithVulnerabilities.length}개 이미지 취약점 발견 (${vulnTags})`;
                }

                // 분석된 이미지들의 취약점 합산
                const totalVulnerabilities = analyzedWithVulnerabilities.reduce(
                  (acc, curr) => ({
                    critical: acc.critical + curr.vulnerabilities.critical,
                    high: acc.high + curr.vulnerabilities.high,
                    medium: acc.medium + curr.vulnerabilities.medium,
                    low: acc.low + curr.vulnerabilities.low,
                  }),
                  { critical: 0, high: 0, medium: 0, low: 0 }
                );

                setSecurityWarningConfig({
                  stage: 'deploy',
                  category: 'sca',
                  warningType: 'no_analysis',
                  serviceName: warningMessage,
                  vulnerabilitySummary:
                    totalVulnerabilities.critical > 0
                      ? totalVulnerabilities
                      : undefined,
                  onContinue: () => {
                    setSecurityWarningModalVisible(false);
                    setSecurityWarningConfig(null);
                    void executeDeploy();
                  },
                });
                setSecurityWarningModalVisible(true);
                setSecurityCheckLoading(false);
                return;
              }

              // Case 2: 선택한 이미지가 없는 경우 (fallback - 최신 SCA 결과 확인)
              if (selectedImages.length === 0) {
                // SCA 결과가 아예 없는 경우
                if (scaResults.length === 0) {
                  setSecurityWarningConfig({
                    stage: 'deploy',
                    category: 'sca',
                    warningType: 'no_analysis',
                    serviceName: repo.name,
                    onContinue: () => {
                      setSecurityWarningModalVisible(false);
                      setSecurityWarningConfig(null);
                      void executeDeploy();
                    },
                  });
                  setSecurityWarningModalVisible(true);
                  setSecurityCheckLoading(false);
                  return;
                }

                // 최신 SCA 결과에서 취약점 확인
                const latestResult = scaResults[0];
                if (latestResult?.result) {
                  try {
                    //  result가 문자열이면 파싱, 이미 객체면 그대로 사용
                    const parsed =
                      typeof latestResult.result === 'string'
                        ? JSON.parse(latestResult.result)
                        : latestResult.result;
                    const vulnerabilitySummary =
                      checkScaCriticalVulnerabilities(parsed);
                    if (
                      vulnerabilitySummary &&
                      vulnerabilitySummary.critical > 0
                    ) {
                      setSecurityWarningConfig({
                        stage: 'deploy',
                        category: 'sca',
                        warningType: 'critical_found',
                        vulnerabilitySummary,
                        serviceName: repo.name,
                        onContinue: () => {
                          setSecurityWarningModalVisible(false);
                          setSecurityWarningConfig(null);
                          void executeDeploy();
                        },
                      });
                      setSecurityWarningModalVisible(true);
                      setSecurityCheckLoading(false);
                      return;
                    }
                  } catch {
                    // 파싱 실패 시 계속 진행
                  }
                }
              }

              // Case 3: 모든 이미지 분석됨 - 취약점이 있는 이미지 확인
              if (analyzedWithVulnerabilities.length > 0) {
                // 모든 분석된 이미지의 취약점 합산
                const totalVulnerabilities = analyzedWithVulnerabilities.reduce(
                  (acc, curr) => ({
                    critical: acc.critical + curr.vulnerabilities.critical,
                    high: acc.high + curr.vulnerabilities.high,
                    medium: acc.medium + curr.vulnerabilities.medium,
                    low: acc.low + curr.vulnerabilities.low,
                  }),
                  { critical: 0, high: 0, medium: 0, low: 0 }
                );

                const vulnTags = analyzedWithVulnerabilities
                  .map(v => v.imageUrl.split(':').pop() || v.imageUrl)
                  .join(', ');

                setSecurityWarningConfig({
                  stage: 'deploy',
                  category: 'sca',
                  warningType: 'critical_found',
                  vulnerabilitySummary: totalVulnerabilities,
                  serviceName: `${repo.name} (${vulnTags})`,
                  onContinue: () => {
                    setSecurityWarningModalVisible(false);
                    setSecurityWarningConfig(null);
                    void executeDeploy();
                  },
                });
                setSecurityWarningModalVisible(true);
                setSecurityCheckLoading(false);
                return;
              }

              // 보안 검사 통과 - 바로 배포 실행
              setSecurityCheckLoading(false);
              await executeDeploy();
            } catch (scaError) {
              console.warn('SCA 결과 조회 실패, 배포 계속 진행:', scaError);
              setSecurityCheckLoading(false);
              // SCA 조회 실패 시에도 배포는 진행 가능
              await executeDeploy();
            }
          } else {
            throw new Error(
              `'${displayKey}' 단계에 대한 실행 로직이 정의되지 않았습니다.`
            );
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : JSON.stringify(error);
          const isCredentialError =
            errorMessage.includes('SSH') ||
            errorMessage.includes('hops') ||
            errorMessage.includes('인증') ||
            errorMessage.includes('credentials') ||
            errorMessage.includes('password') ||
            errorMessage.includes('token');
          if (isCredentialError) {
            setIsExecutionModalVisible(true);
            setExecutingStage(null);
            message.warning(
              '자격증명 확인 필요 - SSH 연결 정보나 인증 정보를 확인해주세요.'
            );
          } else {
            message.error(
              `${displayKey.toUpperCase()} 단계 실행 실패 - ${errorMessage || '알 수 없는 오류가 발생했습니다.'}`
            );
            setExecutingStage(null);
            setStageToExecute(null);
          }
        }
      })();
    },
    [
      stageToExecute,
      executionInitialValues,
      startPolling,
      services,
      executingStage,
    ]
  );

  const handleRefresh = () => {
    message.success('서비스 정보를 새로고침했습니다.');
  };

  // 서비스 삭제 모달/로직
  const onShowDelete = (repo: GitRepository) => {
    Modal.confirm({
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)',
            }}
          >
            <DeleteOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#262626',
                lineHeight: 1.2,
              }}
            >
              서비스 삭제
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#8c8c8c',
                marginTop: 2,
              }}
            >
              이 작업은 되돌릴 수 없습니다
            </div>
          </div>
        </div>
      ),
      content: (
        <div
          style={{
            padding: '20px 0',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              padding: 16,
              background: '#fff2f0',
              borderRadius: 8,
              border: '1px solid #ffccc7',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                color: '#cf1322',
                fontWeight: 600,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <WarningOutlined />
              주의: 이 작업은 되돌릴 수 없습니다
            </div>
            <div style={{ color: '#595959' }}>
              <strong>{repo.name}</strong> 서비스를 삭제하면 다음 데이터가
              영구적으로 삭제됩니다:
            </div>
            <ul
              style={{
                margin: '12px 0 0 0',
                paddingLeft: 20,
                color: '#595959',
              }}
            >
              <li>서비스 설정 및 구성 정보</li>
              <li>파이프라인 실행 이력</li>
              <li>빌드 및 배포 기록</li>
              <li>권한자 정보</li>
            </ul>
          </div>
          <div
            style={{
              padding: 12,
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #e8e8e8',
            }}
          >
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>
              삭제를 계속하려면 아래 &quot;삭제&quot; 버튼을 클릭하세요.
            </div>
          </div>
        </div>
      ),
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      width: 520,
      okButtonProps: {
        size: 'large',
        style: {
          height: 44,
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
        },
      },
      cancelButtonProps: {
        size: 'large',
        style: {
          height: 44,
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 8,
        },
      },
      onOk: async () => {
        try {
          await gitApi.delete(repo.id);
          setRepositories(repositories.filter(r => r.id !== repo.id));
          message.success('서비스가 삭제되었습니다.');
        } catch (_err) {
          message.error(
            `삭제 실패: ${_err instanceof Error ? _err.message : String(_err)}`
          );
        }
      },
    });
  };

  //  semgrepAnalysis, codeqlAnalysis는 utils/securityAnalysisUtils.ts에서 import

  const sastAnalysis = async (
    actualRepoId: number,
    newRepo: GitRepository,
    providedToken?: string // 선택적 매개변수: 토큰이 제공되면 사용, 아니면 store에서 조회
  ) => {
    //  중복 실행 방지: 이미 스캔이 진행 중이면 무시
    if (isSastScanInProgress) {
      message.warning('SAST 스캔이 이미 진행 중입니다.');
      return;
    }

    //  스캔 시작 플래그 설정
    setIsSastScanInProgress(true);

    // 0) 토큰 선 조회: providedToken이 있으면 사용, 없으면 store에서 조회
    let accessToken = providedToken || '';

    if (!accessToken) {
      try {
        const { useCredsStore } = await import('../../stores/useCredsStore');
        const { sourceRepository } = useCredsStore.getState();
        const baseUrl = getBaseUrlFromGitUrl(newRepo.gitlabUrl);
        const matched = sourceRepository.find(
          r => baseUrl.includes(r.baseUrl) || r.baseUrl.includes(baseUrl)
        );
        accessToken = matched?.token || '';
      } catch (_error) {
        // 자격 증명 저장소 접근 실패 시 조용히 무시
      }
    } else {
      // 서비스에서 직접 토큰을 가져온 경우 - 추가 처리 불필요
    }

    if (!accessToken) {
      message.error('서비스에 GitLab Access Token이 설정되지 않았습니다.');
      setIsSastScanInProgress(false); //  조기 반환 시에도 플래그 해제
      return;
    }

    // sast 분석 결과 테이블에 기록이 없다면 빈 컬럼 추가
    if (
      !modalSastData || // 모달 데이터가 없거나
      modalSastData?.status === 'not_found' || // 결과가 없거나
      (!modalSastData?.semgrep && !modalSastData?.codeql) // SAST 결과가 없거나
    ) {
      await gitApi.newSastResult(actualRepoId);
    }

    // 재분석 요청 시 즉시 상태를 analyzing으로 변경
    setModalSastData({
      ...(modalSastData ?? {}),
      semgrep: undefined,
      codeql: undefined,
      status: 'analyzing',
    } as SastResultData);
    updateSecurityState(newRepo.gitlabUrl, 'sast', 'analyzing', newRepo.id);

    // DB에도 analyzing 상태로 업데이트
    try {
      await gitApi.saveSastResult(
        actualRepoId,
        JSON.stringify({ semgrep: null, codeql: null }),
        'analyzing',
        '', // semgrep_command_log
        '', // codeql_command_log
        undefined // trivy_command_log (없으면 null)
      );
    } catch (_err) {
      // DB 상태 업데이트 실패 시 조용히 무시 - 분석은 계속 진행
    }

    // SAST 분석 API 호출
    try {
      const params = new Map<string, string>([
        ['gitUrl', newRepo.gitlabUrl],
        ['authType', 'token'],
        ['accessToken', accessToken],
        ['config', 'p/owasp-top-ten'],
      ]);

      const semgrepResult = await semgrepAnalysis(params);
      const codeqlResult = await codeqlAnalysis(params);

      // DB 저장 api 호출 (실행 로그 포함)
      const combinedResult = {
        semgrep: semgrepResult,
        codeql: codeqlResult,
      };
      await gitApi.saveSastResult(
        actualRepoId,
        JSON.stringify(combinedResult),
        ('error' in semgrepResult && (semgrepResult as any).error) ||
          ('error' in codeqlResult && (codeqlResult as any).error)
          ? 'failed'
          : 'completed',
        semgrepResult.command_log || '', // semgrep_command_log
        codeqlResult.command_log || '', // codeql_command_log
        undefined // trivy_command_log (없���면 null)
      );

      // 분석 완료 후 결과를 모달에 즉시 반영
      const updatedResult = await getSastResult(actualRepoId);
      setModalSastData(updatedResult);
      if (updatedResult?.status && updatedResult.status !== 'analyzing') {
        updateSecurityState(
          newRepo.gitlabUrl,
          'sast',
          updatedResult.status === 'completed' ? 'completed' : 'failed',
          newRepo.id // 서비스별 독립 상태 관리를 위해 serviceId 추가
        );
        const nowIso = new Date().toISOString();
        updateSecurityLastUpdate(newRepo.gitlabUrl, 'sast', nowIso, newRepo.id);
        setSelectedStageData((prev: SelectedStageData | null) =>
          prev
            ? { ...prev, lastUpdateTime: new Date(nowIso).toLocaleString() }
            : prev
        );
      }
    } catch (err) {
      // failed 저장은 실패해도 이후 흐름 계속
      try {
        await gitApi.saveSastResult(
          actualRepoId,
          null,
          'failed',
          '',
          '',
          undefined
        );
      } catch {
        // Failed to save SAST result - ignore and continue
      }

      // 오류 발생 시에도 결과를 모달에 반영(조회 실패해도 무시)
      try {
        const errorResult = await getSastResult(actualRepoId);
        setModalSastData(errorResult);
      } catch {
        // Failed to get SAST result - ignore and continue
      }
      updateSecurityState(newRepo.gitlabUrl, 'sast', 'failed', newRepo.id);
      const nowIsoErr = new Date().toISOString();
      updateSecurityLastUpdate(
        newRepo.gitlabUrl,
        'sast',
        nowIsoErr,
        newRepo.id
      );
      setSelectedStageData((prev: SelectedStageData | null) =>
        prev
          ? { ...prev, lastUpdateTime: new Date(nowIsoErr).toLocaleString() }
          : prev
      );

      //  [수정] parseSastErrorMessage 유틸리티 함수 사용
      message.error(parseSastErrorMessage(err));
      // 인터벌 종료
      stopSastPollingGlobal();
    } finally {
      //  스캔 완료/실패 후 플래그 해제
      setIsSastScanInProgress(false);
    }
  };

  // 목록 조회 API 호출
  const fetchRepositories = useCallback(async () => {
    try {
      const repos = await gitApi.list();
      if (repos.data !== null && Array.isArray(repos.data)) {
        setRepositories(repos.data);
      }
    } catch (err) {
      message.error(
        `서비스 목록을 불러오지 못했습니다. ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }, []);

  //  [추가] 빌드 완료 시 서비스 목록 재조회 (useEffect로 분리하여 순환 참조 해결)
  useEffect(() => {
    if (buildCompletedFlag > 0) {
      void fetchRepositories();
    }
  }, [buildCompletedFlag, fetchRepositories]);

  const [gitlabURLs, setGitlabURLs] = useState<GitUrlDTO[]>([]);
  const [gitlabUrl, setGitlabURL] = useState<string>(''); // 관리자가 추가하기 위해 입력하는 gitlab_url
  const [selectedGitUrl, setSelectedGitUrl] = useState<string>(null); // 사용자가 프로젝트 생성을 위해 선택한 gitlab_url
  const [groups, setGroups] = useState<GroupInfo[]>([]); // 프로젝트 생성 시 불러온 그룹 목록
  const [selectedGroup, setSelectedGroup] = useState<number>(null); // 사용자가 프로젝트 생성을 위해 입력하는 그룹
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [gitlabUserNamespace, setGitlabUserNamespace] = useState<string>('');
  // gitlab 계정 생성을 위한 파라미터들
  const [gitlabUsername, setGitlabUsername] = useState<string>('');
  const [gitlabName, setGitlabName] = useState<string>('');
  const [gitlabEmail, setGitlabEmail] = useState<string>('');
  const [gitlabPassword, setGitlabPassword] = useState<string>('');
  const [gitlabUserAuth, setGitlabUserAuth] = useState<number>(null);

  //  프로젝트 등록용 브랜치 목록 불러오기 함수 (GitLab API 직접 호출)
  const loadRegisterBranches = useCallback(async () => {
    if (!selectedGitUrl || !gitlabProjectPath) {
      message.warning('Git URL과 프로젝트 경로를 먼저 입력해주세요.');
      setRegisterBranches([]);
      return;
    }

    // useCredsStore에서 토큰 찾기
    const fullGitUrl = `${selectedGitUrl}/${gitlabProjectPath}`.replace(
      /\.git$/,
      ''
    );
    const tokenInfo = findGitLabTokenForRepo(fullGitUrl);

    if (!tokenInfo.found || !tokenInfo.token) {
      message.warning(
        'GitLab 토큰이 설정되지 않았습니다. Git 관리 페이지에서 토큰을 먼저 등록해주세요.'
      );
      setRegisterBranches([]);
      return;
    }

    try {
      setRegisterBranchesLoading(true);

      // GitLab API URL 구성
      const parsedURL = new URL(selectedGitUrl);
      const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;
      const encodedPath = encodeURIComponent(
        gitlabProjectPath.replace(/\.git$/, '')
      );
      const apiURL = `${baseURL}/api/v4/projects/${encodedPath}/repository/branches?per_page=100`;

      // GitLab API 직접 호출
      const response = await fetch(apiURL, {
        headers: {
          'PRIVATE-TOKEN': tokenInfo.token,
        },
      });

      if (!response.ok) {
        throw new Error(`GitLab API 호출 실패 (Status: ${response.status})`);
      }

      const branchList = (await response.json()) as Array<{
        name: string;
        default?: boolean;
      }>;
      setRegisterBranches(
        branchList.map(b => ({ name: b.name, default: b.default || false }))
      );
      message.success(`브랜치 ${branchList.length}개를 로드했습니다.`);
    } catch (error) {
      console.error('[loadRegisterBranches] 브랜치 목록 로드 실패:', error);
      message.error('브랜치 목록을 가져오는데 실패했습니다.');
      setRegisterBranches([]);
    } finally {
      setRegisterBranchesLoading(false);
    }
  }, [selectedGitUrl, gitlabProjectPath, findGitLabTokenForRepo]);

  // 사용자 정보 로드
  useEffect(() => {
    const checkStatus = async () => {
      const response = await userApi.checkGitLabStatus();
      const responseData = response.data;

      if (responseData) {
        // const { gitlabURL } = responseData; //  미사용
        // setUserGitlabURL(gitlabURL || ''); //  미사용
      }
    };

    checkStatus();
  }, []);

  // 페이지 로드 시 한 번만 실행 (dependency 빈 배열)
  // fetchRepositories는 stable한 useCallback이므로 의존성에 포함해도 안전
  useEffect(() => {
    fetchRepositories();
    // 인프라 목록 로드
    const loadInfrastructures = async () => {
      setInfrastructuresLoading(true);
      try {
        const infras = await getInfrastructures();
        setInfrastructures(infras);
        if (infras.length === 0) {
          message.warning(
            '등록된 인프라가 없습니다. 인프라를 먼저 등록해주세요.'
          );
        }
      } catch (error) {
        console.error('인프라 목록 로드 실패:', error);
        message.error('인프라 목록을 불러오는데 실패했습니다.');
      } finally {
        setInfrastructuresLoading(false);
      }
    };
    loadInfrastructures();
  }, [fetchRepositories]);

  // currentRepo 변경 시 SAST 탭 결과 자동 로드
  //  [수정] fetchSastTabResult 의존성 제거하여 무한 루프 방지 - currentRepo.id 변경 시에만 호출
  const prevSastRepoIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (currentRepo?.id && currentRepo.id !== prevSastRepoIdRef.current) {
      prevSastRepoIdRef.current = currentRepo.id;
      fetchSastTabResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRepo?.id]);

  // Git 서비스와 연결된 서비스(파이프라인) 정보를 가져오는 로직 추가
  // securityDataLoadedRef를 사용하여 한 번만 실행되도록 보장
  useEffect(() => {
    if (repositories.length > 0 && !securityDataLoadedRef.current) {
      // securityDataLoadedRef 체크 복원하여 한 번만 실행
      securityDataLoadedRef.current = true;

      // 먼저 services 배열을 로드하여 인프라 정보와 파이프라인 상태를 올바르게 표시
      void (async () => {
        try {
          const servicesRes = await serviceApi.getServices();
          setServices(servicesRes || []);
        } catch (error) {
          console.error('[GitManagement] 초기 services 로드 실패:', error);
        }
      })();

      fetchPipelineStatuses(true);
      // 모든 서비스의 SAST last_update를 한 번에 가져옵니다.
      void (async () => {
        try {
          const res = await gitApi.listSastLastUpdates();
          const arr =
            (res?.data as Array<{
              service_id: number;
              last_update?: string;
              status?: string;
            }>) || [];
          arr.forEach(item => {
            if (item?.service_id && item.last_update) {
              // service_id를 숫자로 변환하여 매칭
              const serviceId =
                typeof item.service_id === 'string'
                  ? parseInt(item.service_id, 10)
                  : item.service_id;
              const repo = repositories.find(r => r.id === serviceId);
              if (repo) {
                try {
                  const iso = new Date(String(item.last_update)).toISOString();
                  updateSecurityLastUpdate(
                    repo.gitlabUrl,
                    'sast',
                    iso,
                    repo.id
                  );
                } catch {
                  // Date parsing failed - use raw string value
                  updateSecurityLastUpdate(
                    repo.gitlabUrl,
                    'sast',
                    String(item.last_update)
                  );
                }
                if (item.status) {
                  updateSecurityState(
                    repo.gitlabUrl,
                    'sast',
                    item.status as
                      | 'null'
                      | 'idle'
                      | 'analyzing'
                      | 'completed'
                      | 'failed',
                    repo.id
                  );
                }
              }
            }
          });
        } catch {
          // SAST data fetch failed - silently ignore
        }
      })();

      // 모든 서비스의 SCA last_update를 한 번에 가져옵니다.
      void (async () => {
        try {
          const res = await gitApi.listScaLastUpdates();
          const arr =
            (res?.data as Array<{
              service_id: number;
              last_update?: string;
              status?: string;
            }>) || [];
          arr.forEach(item => {
            if (item?.service_id && item.last_update) {
              // service_id를 숫자로 변환하여 매칭
              const serviceId =
                typeof item.service_id === 'string'
                  ? parseInt(item.service_id, 10)
                  : item.service_id;
              const repo = repositories.find(r => r.id === serviceId);
              if (repo) {
                try {
                  const iso = new Date(String(item.last_update)).toISOString();
                  updateSecurityLastUpdate(repo.gitlabUrl, 'sca', iso, repo.id);
                } catch {
                  updateSecurityLastUpdate(
                    repo.gitlabUrl,
                    'sca',
                    String(item.last_update)
                  );
                }
                // status가 명시적으로 제공된 경우에만 상태 업데이트
                // last_update만 있고 status가 없는 경우, 상태를 임의로 'completed'로 설정하지 않음
                if (item.status) {
                  updateSecurityState(
                    repo.gitlabUrl,
                    'sca',
                    item.status as
                      | 'null'
                      | 'idle'
                      | 'analyzing'
                      | 'completed'
                      | 'failed',
                    repo.id
                  );
                }
              }
            }
          });
        } catch {
          /* ignore */
        }
      })();

      // 모든 서비스의 DAST last_update를 한 번에 가져옵니다.
      void (async () => {
        try {
          const res = await gitApi.listDastLastUpdates();
          const arr =
            (res?.data as Array<{
              service_id: number;
              last_update?: string;
              status?: string;
            }>) || [];
          arr.forEach(item => {
            if (item?.service_id && item.last_update) {
              // service_id를 숫자로 변환하여 매칭
              const serviceId =
                typeof item.service_id === 'string'
                  ? parseInt(item.service_id, 10)
                  : item.service_id;
              const repo = repositories.find(r => r.id === serviceId);
              if (repo) {
                try {
                  const iso = new Date(String(item.last_update)).toISOString();
                  updateSecurityLastUpdate(
                    repo.gitlabUrl,
                    'dast',
                    iso,
                    repo.id
                  );
                } catch {
                  // Date parsing failed - use raw string value
                  updateSecurityLastUpdate(
                    repo.gitlabUrl,
                    'dast',
                    String(item.last_update)
                  );
                }
                // status가 명시적으로 제공된 경우에만 상태 업데이트
                // last_update만 있고 status가 없는 경우, 상태를 임의로 'completed'로 설정하지 않음
                if (item.status) {
                  updateSecurityState(
                    repo.gitlabUrl,
                    'dast',
                    item.status as
                      | 'null'
                      | 'idle'
                      | 'analyzing'
                      | 'completed'
                      | 'failed',
                    repo.id
                  );
                }
              }
            }
          });
        } catch (error) {
          console.error('[DAST] Error loading DAST data:', error);
        }
      })();
    }
    // repositories 전체가 아닌 length만 의존 (불필요한 재실행 방지)
    // fetchPipelineStatuses, updateSecurityLastUpdate, updateSecurityState는 stable한 함수이므로
    // 의존성에 포함하지 않아도 됨 (ref guard가 실행 횟수를 제한함)
  }, [
    repositories,
    fetchPipelineStatuses,
    updateSecurityLastUpdate,
    updateSecurityState,
  ]);

  //  [제거] handleShowSastDetail 함수 제거
  // const handleShowSastDetail = (type: 'semgrep' | 'codeql', data: SastAnalysisResult) => { ... };

  //  [제거] parseSarifData 함수는 AIWorkflowDashboard.tsx로 이동했습니다.
  // const parseSarifData = (sarifJson: string) => { ... };

  const _renderModalFooter = (): React.ReactNode => {
    //  [수정] SAST는 더 이상 별도 단계가 아니므로 항상 false
    const isSast = selectedDisplayKeyForModal === ('sast' as never);
    const isSastSummaryView = isSast && sastModalView === 'summary';
    const isSastDetailView = isSast && sastModalView !== 'summary';

    const executable =
      selectedDisplayKeyForModal &&
      ['sast', 'build', 'sca', 'deploy', 'dast'].includes(
        selectedDisplayKeyForModal
      );

    const leftButtons: React.ReactNode[] = [];
    const rightButtons: React.ReactNode[] = [];

    // Left: SAST 설정 확인
    if (isSastSummaryView) {
      leftButtons.push(
        <Button
          key='open-cred'
          icon={<SettingOutlined />}
          onClick={() => {
            if (!selectedRepoForModal) return;
          }}
        >
          SAST 설정 확인
        </Button>
      );
    }

    // Right: 뒤로(상세뷰), 재분석(요약뷰), 기타 단계 실행, 닫기
    if (isSastDetailView) {
      rightButtons.push(
        <Button
          key='back'
          icon={<LeftOutlined />}
          onClick={() => setSastModalView('summary')}
        >
          뒤로
        </Button>
      );
    }

    if (isSastSummaryView) {
      rightButtons.push(
        <Button
          key='reanalyze'
          type='primary'
          icon={<SafetyOutlined />}
          disabled={isSastScanInProgress}
          loading={isSastScanInProgress}
          onClick={async () => {
            if (!selectedRepoForModal) return;
            const baseUrl = getBaseUrlFromGitUrl(
              selectedRepoForModal.gitlabUrl
            );
            let token = '';
            try {
              const raw = localStorage.getItem('creds-store') || '';
              if (raw) {
                const parsed = JSON.parse(raw);
                const arr = parsed?.state?.sourceRepository || [];
                const found = arr.find(
                  (r: any) =>
                    baseUrl.includes(r.baseUrl) || r.baseUrl?.includes(baseUrl)
                );
                token = String(found?.token || '');
              }
            } catch {
              // Credentials parsing failed - continue without token
            }
            if (!token) {
              return;
            }
            void sastAnalysis(selectedRepoForModal.id, selectedRepoForModal);
          }}
        >
          {isSastScanInProgress ? '분석 중...' : '재분석'}
        </Button>
      );
    }

    if (executable && !isSastDetailView && !isSastSummaryView) {
      const execLabel = selectedDisplayKeyForModal
        ? `${desiredDisplayName[selectedDisplayKeyForModal]} 실행`
        : '실행';
      rightButtons.unshift(
        <Button
          key='execute'
          type='primary'
          icon={<RocketOutlined />}
          onClick={() => {
            if (selectedRepoForModal && selectedDisplayKeyForModal) {
              void handleExecuteStage(
                selectedRepoForModal,
                selectedDisplayKeyForModal
              );
            }
          }}
        >
          {execLabel}
        </Button>
      );
    }

    rightButtons.push(
      <Button key='close' onClick={closeDetailModal}>
        닫기
      </Button>
    );

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div>{leftButtons}</div>
        <div style={{ display: 'flex', gap: 8 }}>{rightButtons}</div>
      </div>
    );
  };

  const getGitlabUrls = useCallback(async () => {
    const response = await organizationApi.getGitUrls(user.organization_id);
    setGitlabURLs(response.data);
  }, [user.organization_id]);

  // user.organization_id 변경 시 GitLab URL 목록 재조회
  useEffect(() => {
    void getGitlabUrls();
  }, [getGitlabUrls]);

  // Gitlab URL Setting
  const handleAddGitUrl = async () => {
    if (!gitlabUrl) {
      message.warning('Gitlab URL을 입력해주세요.');
      return;
    }

    const regex = /^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(\/)?$/;
    if (!regex.test(gitlabUrl)) {
      message.warning('URL 형식이 올바르지 않습니다.');
      return;
    }

    if (gitlabURLs.find(url => url.gitlab_url == gitlabUrl)) {
      message.warning('이미 추가된 URL입니다.');
      return;
    }

    const response = await organizationApi.addGitUrl(
      user.organization_id,
      gitlabUrl
    );
    setGitlabURLs([...gitlabURLs, response.data]);
    setGitlabURL('');
  };

  const handleRemoveGitlabUrl = async (id: number) => {
    try {
      await organizationApi.removeGitlabUrl(id, user.organization_id);
      setGitlabURLs(prev => prev.filter(item => item.id !== id));
      message.success('URL이 성공적으로 제거되었습니다.');
    } catch (err) {
      message.error(
        `삭제 실패: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleChangeURL = async (gitlabURL: string) => {
    setSelectedGroup(null);
    setSelectedGitUrl(gitlabURL);
    const groupResponse = (await gitApi.getGroups(gitlabURL)) as {
      data: GroupInfo[];
    };
    setGroups(groupResponse.data);

    const usernameResponse = (await gitApi.getUsername(gitlabURL)) as {
      success: boolean;
      user: { username: string };
    };
    setGitlabUserNamespace(usernameResponse.user.username);
  };

  const handleGroupChange = (value: number) => {
    setSelectedGroup(value);
    let name = '';
    for (const section of selectOptions) {
      const found = section.options.find(opt => opt.value === value);
      if (found) {
        name = found.label;
        break;
      }
    }
    setSelectedGroupName(name);
  };

  const handleUserAuthChange = (value: number) => {
    setGitlabUserAuth(value);
  };

  interface GroupOption {
    label: string;
    value: number;
    disabled: boolean;
  }

  const groupOptions: GroupOption[] = groups.length
    ? groups.map(group => ({
        label: group.fullPath,
        value: group.id,
        disabled: false,
      }))
    : [];

  const userOption: GroupOption = {
    label: gitlabUserNamespace,
    value: 0,
    disabled: false,
  };

  const selectOptions = groupOptions.length
    ? [
        {
          label: '사용자 그룹',
          options: groupOptions,
        },
        {
          label: '사용자 계정',
          options: [userOption],
        },
      ]
    : [];

  // 통계 계산
  // 운영중 상태인 서비스 = 배포된 서비스
  const runningServices = services.filter(s => s.is_deployed).length;
  // Kubernetes 서비스 개수
  const k8sServices = services.filter(s =>
    s.infraType?.toLowerCase().includes('kubernetes')
  ).length;
  // Docker 서비스 개수
  const dockerServices = services.filter(
    s =>
      s.infraType?.toLowerCase().includes('docker') &&
      !s.infraType?.toLowerCase().includes('podman')
  ).length;
  // Podman 서비스 개수
  const podmanServices = services.filter(s =>
    s.infraType?.toLowerCase().includes('podman')
  ).length;

  return (
    <div className='service-management management-page'>
      {/* 페이지 헤더 */}
      <div className='page-header'>
        <div className='page-header-title'>
          <CloudServerOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <h1>서비스 관리</h1>
            <p className='page-header-description'>
              서비스 등록, 빌드, 배포 및 모니터링을 관리합니다
            </p>
          </div>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              await fetchRepositories();
              const servicesRes = await serviceApi.getServices();
              setServices(servicesRes || []);
            }}
          >
            새로고침
          </Button>
          <Button
            type='primary'
            icon={<CloudUploadOutlined />}
            onClick={openCreateModal}
          >
            서비스 등록/생성
          </Button>
        </Space>
      </div>

      {/* 통계 카드 */}
      <Row gutter={16} className='stats-row'>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon blue'>
                <CloudServerOutlined />
              </div>
              <Statistic
                title='전체 서비스'
                value={repositories.length}
                suffix='개'
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon green'>
                <RocketOutlined />
              </div>
              <Statistic
                title='운영중 상태인 서비스'
                value={runningServices}
                suffix={`/ ${services.length}`}
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon purple'>
                <ClusterOutlined />
              </div>
              <Statistic
                title='Kubernetes 서비스'
                value={k8sServices}
                suffix='개'
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon cyan'>
                <ContainerOutlined />
              </div>
              <Statistic
                title='Docker/Podman 서비스'
                value={dockerServices + podmanServices}
                suffix='개'
              />
            </div>
          </div>
        </Col>
      </Row>

      <Row
        justify='space-between'
        align='middle'
        style={{ marginBottom: '16px', display: 'none' }}
      >
        <Col>
          <Space>
            {/* 저장소 추가 */}
            <Modal
              title={
                <div
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    padding: '16px 24px',
                    marginLeft: -24,
                    marginRight: -24,
                    marginTop: -20,
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1890ff',
                  }}
                >
                  서비스 등록/생성
                </div>
              }
              open={isModalOpen}
              onCancel={closeCreateModal}
              footer={null}
              width={600}
              centered
              styles={{ body: { padding: '24px' } }}
            >
              <div
                style={{
                  marginBottom: '24px',
                  textAlign: 'center',
                  color: '#666',
                }}
              >
                <p>
                  GitLab 프로젝트를 등록하거나 새로 생성하여 서비스를
                  시작하세요.
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 24,
                  width: '100%',
                  justifyContent: 'center',
                  padding: '20px 0',
                }}
              >
                {user.role != 'Member' && (
                  <>
                    <Button
                      type='primary'
                      aria-label='gitlab-register-button'
                      size='large'
                      style={{
                        height: 80,
                        minWidth: 240,
                        fontSize: 16,
                        borderRadius: 8,
                        fontWeight: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s',
                      }}
                      onClick={() => openGitlabAction('urlSetting')}
                      icon={<LinkOutlined style={{ fontSize: '26px' }} />}
                      className='hover-scale'
                    >
                      <span style={{ fontSize: 16, fontWeight: 600 }}>
                        Gitlab 설정
                      </span>
                    </Button>
                    <Button
                      type='primary'
                      aria-label='gitlab-register-button'
                      size='large'
                      style={{
                        height: 80,
                        minWidth: 240,
                        fontSize: 16,
                        borderRadius: 8,
                        fontWeight: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s',
                      }}
                      onClick={() => openGitlabAction('createUser')}
                      icon={<UserAddOutlined style={{ fontSize: '26px' }} />}
                      className='hover-scale'
                    >
                      <span style={{ fontSize: 16, fontWeight: 600 }}>
                        Gitlab 계정 생성
                      </span>
                    </Button>
                  </>
                )}
                <Button
                  type='primary'
                  aria-label='gitlab-register-button'
                  size='large'
                  style={{
                    height: 80,
                    minWidth: 240,
                    fontSize: 16,
                    borderRadius: 8,
                    fontWeight: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => openGitlabAction('register')}
                  icon={<GithubOutlined style={{ fontSize: '26px' }} />}
                  className='hover-scale'
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    기존 프로젝트 등록
                  </span>
                </Button>
                <Button
                  aria-label='gitlab-create-button'
                  type='primary'
                  size='large'
                  style={{
                    height: 80,
                    minWidth: 240,
                    fontSize: 16,
                    borderRadius: 8,
                    fontWeight: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => openGitlabAction('create')}
                  icon={<PlusCircleOutlined style={{ fontSize: '26px' }} />}
                  className='hover-scale'
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    새 프로젝트 생성
                  </span>
                </Button>
              </div>
            </Modal>

            {/* gitlab url setting 추가 */}
            {/* GitLab Register/Create 작은 모달 */}
            <Modal
              title={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f0f0',
                    padding: '8px 12px',
                    marginLeft: -12,
                    marginRight: -12,
                  }}
                >
                  <div style={{ marginRight: 12 }}>
                    <Button
                      type='text'
                      icon={<LeftOutlined />}
                      onClick={goBackToCreateModal}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1890ff',
                    }}
                  >
                    {{
                      urlSetting: 'Gitlab 설정',
                      createUser: 'Gitlab 유저 생성',
                      register: '기존 프로젝트 등록',
                      create: '새 프로젝트 생성',
                    }[gitlabActionVisible] || ''}
                  </div>
                  <div style={{ width: 36 }} />
                </div>
              }
              open={gitlabActionVisible !== null}
              footer={null}
              width={700}
              centered
              styles={{ body: { padding: '20px' } }}
              onCancel={closeGitlabAction}
            >
              <div
                style={{
                  marginBottom: 12,
                  color: '#666',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {{
                  urlSetting: (
                    <>
                      <div>Gitlab URL을 설정합니다.</div>
                      <div>
                        프로젝트를 등록하거나 새로 생성하기 전에, GitLab URL을
                        입력하세요.
                      </div>
                    </>
                  ),
                  createUser: (
                    <>
                      <div>
                        Gitlab 유저를 생성합니다. Gitlab의 관리자 권한이
                        필요합니다.
                      </div>
                      <div>유저를 생성할 그룹과 유저 정보를 입력하세요.</div>
                    </>
                  ),
                  register: (
                    <>
                      <div>
                        이미 존재하는 GitLab 프로젝트를 서비스에 연결합니다.
                      </div>
                      <div>
                        프로젝트 이름, Git URL, Git Branch를 입력하세요.
                      </div>
                    </>
                  ),
                  create: (
                    <>
                      <div>새로운 GitLab 프로젝트를 생성합니다.</div>
                      {/* // todo: 문구 수정 필요 */}
                      <div>
                        프로젝트 이름을 입력하세요. GitLab URL은 사용자 GitLab
                        URL로 설정됩니다.
                      </div>
                    </>
                  ),
                }[gitlabActionVisible] || ''}
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {{
                  urlSetting: (
                    <>
                      <Input
                        value={gitlabUrl}
                        placeholder='git URL (예: https://gitlab.mipllab.com)'
                        onChange={e => setGitlabURL(e.target.value)}
                        suffix={
                          <Button
                            type='text'
                            icon='추가'
                            onClick={handleAddGitUrl}
                            style={{ height: 'auto', lineHeight: 1 }}
                          />
                        }
                      />
                      <List
                        size='small'
                        bordered
                        style={{ marginTop: 12 }}
                        dataSource={gitlabURLs}
                        locale={{ emptyText: '등록된 Git URL이 없습니다.' }}
                        renderItem={(url, index) => (
                          <>
                            {index === 0 && (
                              <List.Item
                                style={{
                                  background: '#fafafa',
                                  fontWeight: 'bold',
                                  cursor: 'default',
                                }}
                              >
                                <Typography.Text>URL 목록</Typography.Text>
                              </List.Item>
                            )}
                            <List.Item
                              actions={[
                                <Popconfirm
                                  key={url.id}
                                  title='이 서버를 정말 삭제하시겠습니까?'
                                  onConfirm={() =>
                                    handleRemoveGitlabUrl(url.id)
                                  }
                                  okText='삭제'
                                  cancelText='취소'
                                >
                                  <Tooltip title='삭제'>
                                    <Button
                                      type='text'
                                      danger
                                      icon={<DeleteOutlined />}
                                    />
                                  </Tooltip>
                                </Popconfirm>,
                              ]}
                            >
                              <Typography.Text>
                                {url.gitlab_url}
                              </Typography.Text>
                            </List.Item>
                          </>
                        )}
                      />
                    </>
                  ),
                  createUser: (
                    <>
                      <Input.Group compact>
                        <Select
                          placeholder='Git URL'
                          onChange={handleChangeURL}
                          value={selectedGitUrl}
                          style={{ width: '50%' }}
                        >
                          {gitlabURLs.map(url => (
                            <Option key={url.id} value={url.gitlab_url}>
                              {url.gitlab_url}
                            </Option>
                          ))}
                        </Select>
                        <Select
                          placeholder='group'
                          value={selectedGroup}
                          onChange={handleGroupChange}
                          style={{ width: '30%' }}
                          popupMatchSelectWidth={false}
                          showSearch
                          optionFilterProp='name'
                          filterOption={(input, option) =>
                            (option?.label ?? '')
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={selectOptions}
                        ></Select>
                        <Select
                          placeholder='권한'
                          value={gitlabUserAuth}
                          onChange={handleUserAuthChange}
                          style={{ width: '20%' }}
                        >
                          <Option key={'guest'} value={10}>
                            Guest
                          </Option>
                          <Option key={'reporter'} value={20}>
                            Reporter
                          </Option>
                          <Option key={'developer'} value={30}>
                            developer
                          </Option>
                          <Option key={'maintainer'} value={40}>
                            Maintainer
                          </Option>
                          <Option key={'owner'} value={50}>
                            Owner
                          </Option>
                        </Select>
                      </Input.Group>
                      <Input.Group compact>
                        <Input
                          disabled
                          value='계정명'
                          style={{
                            width: '20%',
                            backgroundColor: '#f5f5f5',
                            color: '#464646ff',
                            cursor: 'default',
                          }}
                        />
                        <Input
                          placeholder='username'
                          value={gitlabUsername}
                          onChange={e => setGitlabUsername(e.target.value)}
                          style={{ width: '80%' }}
                        />
                      </Input.Group>
                      <Input.Group compact>
                        <Input
                          disabled
                          value='프로필명'
                          style={{
                            width: '20%',
                            backgroundColor: '#f5f5f5',
                            color: '#464646ff',
                            cursor: 'default',
                          }}
                        />
                        <Input
                          placeholder='name'
                          value={gitlabName}
                          onChange={e => setGitlabName(e.target.value)}
                          style={{ width: '80%' }}
                        />
                      </Input.Group>
                      <Input.Group compact>
                        <Input
                          disabled
                          value='이메일'
                          style={{
                            width: '20%',
                            backgroundColor: '#f5f5f5',
                            color: '#464646ff',
                            cursor: 'default',
                          }}
                        />
                        <Input
                          placeholder='email'
                          value={gitlabEmail}
                          onChange={e => setGitlabEmail(e.target.value)}
                          style={{ width: '80%' }}
                        />
                      </Input.Group>
                      <Input.Group compact>
                        <Input
                          disabled
                          value='비밀번호'
                          style={{
                            width: '20%',
                            backgroundColor: '#f5f5f5',
                            color: '#464646ff',
                            cursor: 'default',
                          }}
                        />
                        <Input.Password
                          placeholder='password (Minimum length is 8 characters.)'
                          value={gitlabPassword}
                          onChange={e => setGitlabPassword(e.target.value)}
                          style={{ width: '80%' }}
                        />
                      </Input.Group>
                    </>
                  ),
                  register: (
                    <>
                      <Input.Group compact>
                        <Input
                          disabled
                          value='서비스 명'
                          style={{
                            width: '20%',
                            backgroundColor: '#f5f5f5',
                            color: '#464646ff',
                            cursor: 'default',
                          }}
                        />
                        <Input
                          placeholder='kiwi 상에서 관리될 서비스의 이름 (예: my-project)'
                          value={projectName}
                          onChange={e => setProjectName(e.target.value)}
                          style={{ width: '80%' }}
                        />
                      </Input.Group>
                      <Input.Group compact>
                        <Select
                          placeholder='Git URL'
                          onChange={handleChangeURL}
                          value={selectedGitUrl}
                          style={{ width: '44%' }}
                        >
                          {gitlabURLs.map(url => (
                            <Option key={url.id} value={url.gitlab_url}>
                              {url.gitlab_url}
                            </Option>
                          ))}
                        </Select>
                        <Input
                          style={{ width: '6%', textAlign: 'center' }}
                          disabled
                          value='/'
                        />
                        <Input
                          style={{ width: '50%' }}
                          placeholder='프로젝트 경로 (예: user/repo.git)'
                          value={gitlabProjectPath}
                          onChange={e => setGitlabProjectPath(e.target.value)}
                        />
                      </Input.Group>
                      {registerBranches.length > 0 ? (
                        <Input.Group compact style={{ display: 'flex' }}>
                          <Input
                            disabled
                            value='브랜치'
                            style={{
                              width: '20%',
                              backgroundColor: '#f5f5f5',
                              color: '#464646ff',
                              cursor: 'default',
                            }}
                          />
                          <Select
                            placeholder='브랜치 선택'
                            value={gitlabProjectBranch}
                            onChange={value => setGitlabProjectBranch(value)}
                            loading={registerBranchesLoading}
                            showSearch
                            optionFilterProp='children'
                            notFoundContent={
                              registerBranchesLoading ? (
                                <Spin size='small' />
                              ) : (
                                '브랜치 없음'
                              )
                            }
                            suffixIcon={
                              <Button
                                type='link'
                                size='small'
                                loading={registerBranchesLoading}
                                onClick={e => {
                                  e.stopPropagation();
                                  loadRegisterBranches();
                                }}
                                icon={<ReloadOutlined />}
                              />
                            }
                            style={{ flex: 1 }}
                          >
                            {registerBranches.map(branch => (
                              <Select.Option
                                key={branch.name}
                                value={branch.name}
                              >
                                {branch.name} {branch.default && '(기본)'}
                              </Select.Option>
                            ))}
                          </Select>
                        </Input.Group>
                      ) : (
                        <Input.Group compact style={{ display: 'flex' }}>
                          <Input
                            disabled
                            value='브랜치'
                            style={{
                              width: '20%',
                              backgroundColor: '#f5f5f5',
                              color: '#464646ff',
                              cursor: 'default',
                            }}
                          />
                          <Input
                            placeholder='Git 브랜치 (예: main, develop)'
                            value={gitlabProjectBranch}
                            onChange={e =>
                              setGitlabProjectBranch(e.target.value)
                            }
                            style={{ flex: 1 }}
                          />
                          <Button
                            type='default'
                            loading={registerBranchesLoading}
                            onClick={loadRegisterBranches}
                            disabled={!selectedGitUrl || !gitlabProjectPath}
                          >
                            브랜치 불러오기
                          </Button>
                        </Input.Group>
                      )}
                    </>
                  ),
                  create: (
                    <>
                      <Input.Group compact>
                        <Input
                          disabled
                          value='서비스 명'
                          style={{
                            width: '20%',
                            backgroundColor: '#f5f5f5',
                            color: '#464646ff',
                            cursor: 'default',
                          }}
                        />
                        <Input
                          placeholder='kiwi 상에서 관리될 서비스의 이름 (예: my-project)'
                          value={projectName}
                          onChange={e => setProjectName(e.target.value)}
                          style={{ width: '80%' }}
                        />
                      </Input.Group>
                      <Input.Group compact>
                        <Select
                          placeholder='Git URL'
                          onChange={handleChangeURL}
                          value={selectedGitUrl}
                          style={{ width: '40%' }}
                        >
                          {gitlabURLs.map(url => (
                            <Option key={url.id} value={url.gitlab_url}>
                              {url.gitlab_url}
                            </Option>
                          ))}
                        </Select>
                        <Select
                          placeholder='group'
                          value={selectedGroup}
                          onChange={handleGroupChange}
                          style={{ width: '20%' }}
                          popupMatchSelectWidth={false}
                          showSearch
                          optionFilterProp='name'
                          filterOption={(input, option) =>
                            (option?.label ?? '')
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={selectOptions}
                        ></Select>
                        <Input
                          placeholder='프로젝트 이름 (예: my-project)'
                          value={gitlabProjectName}
                          onChange={e => setGitlabProjectName(e.target.value)}
                          style={{ width: '40%' }}
                        />
                      </Input.Group>
                    </>
                  ),
                }[gitlabActionVisible] || ''}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 12,
                    justifyContent: 'flex-end',
                    marginTop: 12,
                  }}
                >
                  {gitlabActionVisible != 'urlSetting' && (
                    <Button
                      type='primary'
                      size='middle'
                      style={{
                        minWidth: 180,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                      }}
                      onClick={
                        {
                          createUser: handleGitlabUserCreate,
                          create: handleGitlabCreate,
                          register: handleGitlabRegister,
                        }[gitlabActionVisible]
                      }
                    >
                      {
                        {
                          createUser: (
                            <>
                              <UserAddOutlined style={{ fontSize: 16 }} />
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  marginLeft: 2,
                                }}
                              >
                                Gitlab 계정 생성
                              </span>
                            </>
                          ),
                          create: (
                            <>
                              <PlusCircleOutlined style={{ fontSize: 16 }} />
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  marginLeft: 2,
                                }}
                              >
                                프로젝트 생성
                              </span>
                            </>
                          ),
                          register: (
                            <>
                              <GithubOutlined style={{ fontSize: 16 }} />
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  marginLeft: 2,
                                }}
                              >
                                프로젝트 등록
                              </span>
                            </>
                          ),
                        }[gitlabActionVisible]
                      }
                    </Button>
                  )}
                </div>
              </div>
            </Modal>

            {/* 저장소 목록 */}
          </Space>
        </Col>
      </Row>

      {/* 서비스 목록 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudServerOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>서비스 목록</span>
            <Badge
              count={repositories.length}
              style={{ backgroundColor: '#1890ff', marginLeft: 8 }}
            />
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            type='primary'
            ghost
          >
            새로고침
          </Button>
        }
        className='service-list-card'
      >
        <form
          autoComplete='off'
          onSubmit={e => e.preventDefault()}
          style={{ marginBottom: 16 }}
        >
          <Input.Search
            placeholder='서비스 이름 검색...'
            allowClear
            autoComplete='off'
            value={serviceSearchText}
            onChange={e => {
              setServiceSearchText(e.target.value);
              setCurrentPage(1); // 검색 시 첫 페이지로 이동
            }}
          />
        </form>
        {repositories.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction='vertical' size={8}>
                <span style={{ fontSize: 16, color: '#595959' }}>
                  등록된 서비스가 없습니다
                </span>
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>
                  새로운 서비스를 추가하여 시작하세요
                </span>
              </Space>
            }
            style={{ padding: '60px 20px' }}
          >
            <Button
              type='primary'
              icon={<PlusCircleOutlined />}
              size='large'
              style={{
                borderRadius: 8,
                height: 44,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              서비스 추가하기
            </Button>
          </Empty>
        ) : (
          <Space direction='vertical' style={{ width: '100%', gap: 12 }}>
            {repositories
              .filter(repo =>
                repo.name
                  .toLowerCase()
                  .includes(serviceSearchText.toLowerCase())
              )
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map(repo => {
                //  repo.id는 이미 service ID이므로 직접 매칭
                const service = services.find(s => s.id === repo.id);
                const _infraInfo = getInfrastructureInfo(service?.infra_id);

                //  빌드와 배포 상태를 모두 고려한 우선순위 기반 상태 표시
                const serviceStatus = (() => {
                  const pipelineStatus = pipelineStatuses[repo.id];
                  if (!pipelineStatus || pipelineStatus.length === 0)
                    return null;

                  // 상태 정규화 함수 (CompactPipelineView와 동일한 로직)
                  //  normalizeStatusForPolling은 usePipelineStatus 훅에서 import
                  const buildStep = pipelineStatus.find(
                    s => s.step_name === 'build'
                  );
                  const deployStep = pipelineStatus.find(
                    s => s.step_name === 'deploy'
                  );

                  // normalizeStatusForPolling을 사용하여 정확한 상태 확인
                  const buildStatus = normalizeStatusForPolling(
                    buildStep?.status
                  );
                  const deployStatus = normalizeStatusForPolling(
                    deployStep?.status
                  );

                  // 디버깅: 정규화된 상태 확인
                  if (repo.name === 'lw-chatbot') {
                  }

                  // 우선순위 1: 빌드 실패
                  if (buildStatus === 'failed') {
                    return {
                      status: 'failed',
                      stage: 'build',
                      label: '빌드실패',
                      icon: <WarningOutlined />,
                      tooltip:
                        '빌드 단계에서 오류가 발생했습니다. 로그를 확인하세요.',
                    };
                  }

                  // 우선순위 2: 빌드 진행중
                  if (buildStatus === 'running') {
                    return {
                      status: 'running',
                      stage: 'build',
                      label: '빌드중',
                      icon: <SettingOutlined spin />,
                      tooltip: '이미지 빌드가 진행 중입니다',
                    };
                  }

                  // 우선순위 3: 배포 실패 (빌드 성공 후)
                  if (buildStatus === 'success' && deployStatus === 'failed') {
                    return {
                      status: 'failed',
                      stage: 'deploy',
                      label: '배포실패',
                      icon: <WarningOutlined />,
                      tooltip:
                        '배포 단계에서 오류가 발생했습니다. 설정을 확인하세요.',
                    };
                  }

                  // 우선순위 4: 배포 진행중 (빌드 성공 후)
                  if (buildStatus === 'success' && deployStatus === 'running') {
                    return {
                      status: 'running',
                      stage: 'deploy',
                      label: '배포중',
                      icon: <RocketOutlined />,
                      tooltip: '서비스 배포가 진행 중입니다',
                    };
                  }

                  // 우선순위 5: 운영중 (빌드와 배포 모두 성공)
                  if (buildStatus === 'success' && deployStatus === 'success') {
                    return {
                      status: 'success',
                      stage: 'operate',
                      label: '운영중',
                      icon: <MonitorOutlined />,
                      tooltip: '서비스가 정상적으로 운영 중입니다',
                    };
                  }

                  // 우선순위 6: 빌드 대기중
                  if (
                    buildStatus === 'pending' ||
                    buildStatus === 'inactive' ||
                    !buildStep
                  ) {
                    return {
                      status: 'default',
                      stage: 'pending',
                      label: '빌드대기',
                      icon: <ThunderboltOutlined />,
                      tooltip: '빌드 시작을 대기 중입니다',
                    };
                  }

                  // 기타: 준비중
                  return {
                    status: 'default',
                    stage: 'pending',
                    label: '준비중',
                    icon: <ThunderboltOutlined />,
                    tooltip: '서비스 준비 중입니다',
                  };
                })();

                return (
                  <Card
                    key={repo.id}
                    size='small'
                    className='service-card'
                    hoverable
                  >
                    <div className='repo-card-content'>
                      <div className='repo-info'>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 8,
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 600,
                              color: '#262626',
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <GithubOutlined
                              style={{ color: '#8c8c8c', fontSize: 14 }}
                            />
                            {repo.name}
                          </h3>
                          {serviceStatus && (
                            <Tooltip title={serviceStatus.tooltip}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Badge
                                  status={
                                    serviceStatus.status === 'success'
                                      ? 'success'
                                      : serviceStatus.status === 'running'
                                        ? 'processing'
                                        : serviceStatus.status === 'failed'
                                          ? 'error'
                                          : 'default'
                                  }
                                />
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color:
                                      serviceStatus.status === 'success'
                                        ? '#52c41a'
                                        : serviceStatus.status === 'running'
                                          ? '#1890ff'
                                          : serviceStatus.status === 'failed'
                                            ? '#ff4d4f'
                                            : '#8c8c8c',
                                  }}
                                >
                                  {serviceStatus.icon}
                                  {serviceStatus.label}
                                </span>
                              </div>
                            </Tooltip>
                          )}
                        </div>

                        {/*  [추가] 정보 버튼 영역 - 서비스 정보, GitLab 정보, Registry 정보 */}
                        <div
                          style={{
                            display: 'flex',
                            gap: 10,
                            flexWrap: 'wrap',
                            marginTop: 12,
                            padding: '10px 0',
                            borderTop: '1px solid #f0f0f0',
                          }}
                        >
                          <Tooltip title='서비스 기본 정보 및 설정'>
                            <Button
                              type='default'
                              icon={
                                <SettingOutlined style={{ fontSize: 12 }} />
                              }
                              onClick={e => {
                                e.stopPropagation();
                                openEditModal(repo);
                                setActiveInfoModal('service');
                              }}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                padding: '4px 12px',
                                height: 30,
                                color: '#1890ff',
                                background: '#e6f7ff',
                                border: '1px solid #91d5ff',
                              }}
                            >
                              서비스
                            </Button>
                          </Tooltip>
                          <Tooltip title='GitLab 저장소 정보'>
                            <Button
                              type='default'
                              icon={<GithubOutlined style={{ fontSize: 12 }} />}
                              onClick={e => {
                                e.stopPropagation();
                                openEditModal(repo);
                                setActiveInfoModal('gitlab');
                              }}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                padding: '4px 12px',
                                height: 30,
                                color: '#722ed1',
                                background: '#f9f0ff',
                                border: '1px solid #d3adf7',
                              }}
                            >
                              GitLab
                            </Button>
                          </Tooltip>
                          <Tooltip title='컨테이너 레지스트리 정보'>
                            <Button
                              type='default'
                              icon={
                                <CloudServerOutlined style={{ fontSize: 12 }} />
                              }
                              onClick={e => {
                                e.stopPropagation();
                                openEditModal(repo);
                                setActiveInfoModal('registry');
                              }}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                padding: '4px 12px',
                                height: 30,
                                color: '#52c41a',
                                background: '#f6ffed',
                                border: '1px solid #b7eb8f',
                              }}
                            >
                              Registry
                            </Button>
                          </Tooltip>
                        </div>
                      </div>

                      <div className='pipeline-view-container'>
                        <CompactPipelineView
                          pipelineStatus={pipelineStatuses[repo.id] || []}
                          isLoading={
                            isPipelineLoading && !pipelineStatuses[repo.id]
                          }
                          serviceId={repo.id}
                          onStageClick={displayKey =>
                            handleStageClick(repo, displayKey)
                          }
                          //  시간 정보 props 추가 (파이프라인 박스 아래에 표시)
                          sourceTime={service?.created_at || undefined}
                          sastState={getSecurityStateReactive(
                            repo.gitlabUrl,
                            'sast',
                            repo.id
                          )}
                          sastLastUpdate={getSecurityLastUpdateReactive(
                            repo.gitlabUrl,
                            'sast',
                            repo.id
                          )}
                          scaState={getSecurityStateReactive(
                            repo.gitlabUrl,
                            'sca',
                            repo.id
                          )}
                          scaLastUpdate={getSecurityLastUpdateReactive(
                            repo.gitlabUrl,
                            'sca',
                            repo.id
                          )}
                          dastState={getSecurityStateReactive(
                            repo.gitlabUrl,
                            'dast',
                            repo.id
                          )}
                          dastLastUpdate={getSecurityLastUpdateReactive(
                            repo.gitlabUrl,
                            'dast',
                            repo.id
                          )}
                          disabledStages={{
                            source: isStageRunnable(repo, 'source', services),
                            build: isStageRunnable(repo, 'build', services),
                            deploy: isStageRunnable(repo, 'deploy', services),
                            operate: isStageRunnable(repo, 'operate', services),
                          }}
                        />
                      </div>

                      <div className='repo-actions'>
                        {/*  [신규] 빌드 + 배포 버튼 - 권한 관리 버튼 위에 배치 */}
                        {(() => {
                          const buildRunnable = isStageRunnable(
                            repo,
                            'build',
                            services
                          );
                          const service = services.find(s => s.id === repo.id);
                          const hasInfra = !!service?.infra_id;
                          const isDisabled =
                            buildRunnable.disabled || !hasInfra;
                          const tooltipText = !hasInfra
                            ? '인프라가 설정되지 않았습니다. 서비스 설정에서 인프라를 먼저 등록하세요.'
                            : buildRunnable.reason || '';

                          return (
                            <Tooltip
                              title={
                                isDisabled
                                  ? tooltipText
                                  : '빌드 후 자동으로 배포까지 진행합니다'
                              }
                            >
                              <Button
                                type='primary'
                                icon={<RocketOutlined />}
                                onClick={() => {
                                  setStageToExecute({
                                    repo,
                                    displayKey: 'build',
                                  });
                                  setIsAutoDeployMode(true); //  빌드 + 배포 모드 활성화
                                  setIsBuildModalVisible(true);
                                }}
                                disabled={isDisabled}
                                className='action-button action-button-build-deploy'
                                style={{
                                  backgroundColor: isDisabled
                                    ? undefined
                                    : '#52c41a',
                                  borderColor: isDisabled
                                    ? undefined
                                    : '#52c41a',
                                }}
                              >
                                빌드 + 배포
                              </Button>
                            </Tooltip>
                          );
                        })()}
                        <Button
                          type='default'
                          icon={<UsergroupAddOutlined />}
                          onClick={() => openMemberModal(repo)}
                          className='action-button action-button-member'
                        >
                          권한 관리
                        </Button>
                        <Button
                          type='default'
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => onShowDelete(repo)}
                          className='action-button action-button-delete'
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

            {/* 페이지네이션 */}
            {repositories.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 24,
                }}
              >
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={
                    repositories.filter(repo =>
                      repo.name
                        .toLowerCase()
                        .includes(serviceSearchText.toLowerCase())
                    ).length
                  }
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    if (size) setPageSize(size);
                  }}
                  showSizeChanger
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} / ${total}개`
                  }
                  pageSizeOptions={['10', '20', '50', '100']}
                />
              </div>
            )}
          </Space>
        )}
      </Card>

      {/* 서비스 편집 모달 컴포넌트 - 분리된 정보 모달로 동작 */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background:
                  activeInfoModal === 'service'
                    ? 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)'
                    : activeInfoModal === 'gitlab'
                      ? 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)'
                      : activeInfoModal === 'registry'
                        ? 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)'
                        : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  activeInfoModal === 'service'
                    ? '0 4px 12px rgba(24, 144, 255, 0.3)'
                    : activeInfoModal === 'gitlab'
                      ? '0 4px 12px rgba(114, 46, 209, 0.3)'
                      : activeInfoModal === 'registry'
                        ? '0 4px 12px rgba(19, 194, 194, 0.3)'
                        : '0 4px 12px rgba(24, 144, 255, 0.3)',
              }}
            >
              {activeInfoModal === 'service' && (
                <SettingOutlined style={{ color: '#fff', fontSize: 18 }} />
              )}
              {activeInfoModal === 'gitlab' && (
                <GithubOutlined style={{ color: '#fff', fontSize: 18 }} />
              )}
              {activeInfoModal === 'registry' && (
                <CloudServerOutlined style={{ color: '#fff', fontSize: 18 }} />
              )}
              {!activeInfoModal && (
                <EditOutlined style={{ color: '#fff', fontSize: 18 }} />
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#262626',
                  lineHeight: 1.2,
                }}
              >
                {activeInfoModal === 'service'
                  ? '서비스 정보'
                  : activeInfoModal === 'gitlab'
                    ? 'GitLab 저장소 정보'
                    : activeInfoModal === 'registry'
                      ? 'Registry 정보'
                      : '서비스 정보 수정'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8c8c8c',
                  marginTop: 2,
                }}
              >
                {selectedServiceInfo?.serviceName || '서비스 설정을 변경합니다'}
              </div>
            </div>
          </div>
        }
        open={isEditModalOpen}
        onOk={saveServiceSetting}
        onCancel={() => {
          closeEditModal();
          setActiveInfoModal(null);
        }}
        okText='저장'
        cancelText='취소'
        width={600}
        okButtonProps={{
          size: 'large',
          style: {
            height: 44,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
          },
        }}
        cancelButtonProps={{
          size: 'large',
          style: {
            height: 44,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 8,
          },
        }}
        style={{ top: 40 }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 기본 정보 섹션 - 서비스 정보 모달일 때만 표시 */}
          {(activeInfoModal === 'service' || !activeInfoModal) && (
            <div>
              <div
                style={{
                  marginBottom: 16,
                  fontWeight: 600,
                  color: '#262626',
                  fontSize: 14,
                  borderBottom: '1px solid #f0f0f0',
                  paddingBottom: 8,
                }}
              >
                기본 정보
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  저장소명
                </span>
                <Input
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.serviceName || ''}
                  onChange={e =>
                    handleEditChange('serviceName', e.target.value)
                  }
                  placeholder='저장소 이름'
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  Git URL
                </span>
                <Input
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.gitlabUrl || ''}
                  placeholder='Git 저장소 URL'
                  disabled
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  빌드/배포 인프라
                </span>
                <Select
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.infraId}
                  onChange={value => handleEditChange('infraId', value)}
                  placeholder='인프라 선택'
                  loading={infrastructuresLoading}
                  allowClear
                  notFoundContent={
                    infrastructuresLoading ? '로딩 중...' : '인프라가 없습니다'
                  }
                >
                  {infrastructures.map(infra => (
                    <Select.Option key={infra.id} value={infra.id}>
                      {infra.name} ({getDisplayInfraType(infra.type)})
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          {/*  GitLab 저장소 인증 섹션 - GitLab 정보 모달일 때만 표시 */}
          {(activeInfoModal === 'gitlab' || !activeInfoModal) && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GithubOutlined
                    style={{
                      fontSize: 16,
                      color:
                        gitlabAuthStatus === 'success'
                          ? '#52c41a'
                          : gitlabAuthStatus === 'failed'
                            ? '#ff4d4f'
                            : '#8c8c8c',
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#262626',
                      fontSize: 14,
                    }}
                  >
                    GitLab 저장소 인증
                  </span>
                  {gitlabAuthStatus === 'success' && (
                    <Tag color='success' style={{ marginLeft: 8 }}>
                      인증됨
                    </Tag>
                  )}
                  {gitlabAuthStatus === 'failed' && (
                    <Tag color='error' style={{ marginLeft: 8 }}>
                      인증 실패
                    </Tag>
                  )}
                </div>
                <Button
                  type={gitlabAuthStatus === 'success' ? 'default' : 'primary'}
                  size='small'
                  loading={gitlabAuthLoading}
                  disabled={
                    !selectedServiceInfo?.gitlabUrl ||
                    !selectedServiceInfo?.gitlabAccessToken ||
                    !selectedServiceInfo?.gitlabUsername
                  }
                  onClick={async () => {
                    if (
                      selectedServiceInfo?.gitlabAccessToken &&
                      selectedServiceInfo?.gitlabUrl &&
                      selectedServiceInfo?.gitlabUsername
                    ) {
                      setGitlabAuthLoading(true);
                      try {
                        const { testGitLabAuthentication } = await import(
                          '../../lib/api/infra'
                        );
                        const result = await testGitLabAuthentication({
                          gitlab_url: selectedServiceInfo.gitlabUrl,
                          access_token: selectedServiceInfo.gitlabAccessToken,
                        });

                        //  반환된 username과 입력한 username이 일치하는지 확인
                        if (
                          result.username.toLowerCase() !==
                          selectedServiceInfo.gitlabUsername.toLowerCase()
                        ) {
                          setGitlabAuthStatus('failed');
                          message.error(
                            `사용자명이 일치하지 않습니다. 입력: ${selectedServiceInfo.gitlabUsername}, GitLab: ${result.username}`
                          );
                        } else {
                          setGitlabAuthStatus('success');
                          message.success('GitLab 인증 성공!');
                        }
                      } catch (error) {
                        setGitlabAuthStatus('failed');
                        message.error(
                          `GitLab 인증 실패: ${(error as Error).message}`
                        );
                      } finally {
                        setGitlabAuthLoading(false);
                      }
                    }
                  }}
                >
                  인증
                </Button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  Access Token
                </span>
                <Input.Password
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.gitlabAccessToken || ''}
                  onChange={e => {
                    handleEditChange('gitlabAccessToken', e.target.value);
                    setGitlabAuthStatus('idle'); //  값 변경 시 인증 상태 초기화
                  }}
                  placeholder='GitLab Access Token'
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  사용자명
                </span>
                <Input
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.gitlabUsername || ''}
                  onChange={e => {
                    handleEditChange('gitlabUsername', e.target.value);
                    setGitlabAuthStatus('idle'); //  값 변경 시 인증 상태 초기화
                  }}
                  placeholder='GitLab 사용자명'
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  브랜치
                </span>
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <Select
                    style={{ flex: 1 }}
                    value={selectedServiceInfo?.gitlabBranch || ''}
                    onChange={value => handleEditChange('gitlabBranch', value)}
                    placeholder='브랜치 선택'
                    loading={branchesLoading}
                    showSearch
                    optionFilterProp='children'
                    notFoundContent={
                      branchesLoading ? (
                        <Spin size='small' />
                      ) : branches.length === 0 ? (
                        '브랜치를 불러오려면 오른쪽 버튼을 클릭하세요'
                      ) : (
                        '브랜치 없음'
                      )
                    }
                    disabled={
                      !selectedServiceInfo?.gitlabAccessToken ||
                      branches.length === 0
                    }
                  >
                    {branches.map(branch => (
                      <Select.Option key={branch.name} value={branch.name}>
                        {branch.name} {branch.default && '(기본)'}
                      </Select.Option>
                    ))}
                  </Select>
                  <Button
                    type='default'
                    loading={branchesLoading}
                    onClick={loadServiceBranches}
                    disabled={
                      !selectedServiceInfo?.gitlabUrl ||
                      !selectedServiceInfo?.gitlabAccessToken
                    }
                    icon={<ReloadOutlined />}
                  >
                    불러오기
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/*  Container Registry 인증 섹션 - Registry 정보 모달일 때만 표시 */}
          {(activeInfoModal === 'registry' || !activeInfoModal) && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CloudServerOutlined
                    style={{
                      fontSize: 16,
                      color:
                        registryAuthStatus === 'success'
                          ? '#1890ff'
                          : registryAuthStatus === 'failed'
                            ? '#ff4d4f'
                            : '#8c8c8c',
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#262626',
                      fontSize: 14,
                    }}
                  >
                    Container Registry 인증
                  </span>
                  {registryAuthStatus === 'success' && (
                    <Tag color='success' style={{ marginLeft: 8 }}>
                      인증됨
                    </Tag>
                  )}
                  {registryAuthStatus === 'failed' && (
                    <Tag color='error' style={{ marginLeft: 8 }}>
                      인증 실패
                    </Tag>
                  )}
                </div>
                <Button
                  type={
                    registryAuthStatus === 'success' ? 'default' : 'primary'
                  }
                  size='small'
                  loading={registryTestLoading}
                  disabled={
                    !selectedServiceInfo?.registryUrl ||
                    !selectedServiceInfo?.registryUsername ||
                    !selectedServiceInfo?.registryPassword
                  }
                  onClick={async () => {
                    if (
                      !selectedServiceInfo?.registryUrl ||
                      !selectedServiceInfo?.registryUsername ||
                      !selectedServiceInfo?.registryPassword
                    ) {
                      message.warning(
                        'Registry URL, 사용자명, 비밀번호를 모두 입력해주세요.'
                      );
                      return;
                    }

                    setRegistryTestLoading(true);
                    try {
                      const { testRegistryAuthentication } = await import(
                        '../../lib/api/infra'
                      );
                      await testRegistryAuthentication({
                        registry_url: selectedServiceInfo.registryUrl,
                        username: selectedServiceInfo.registryUsername,
                        password: selectedServiceInfo.registryPassword,
                        infra_id: selectedServiceInfo.infraId || 0,
                        registry_type:
                          selectedServiceInfo.registryType || 'harbor',
                        project_name: selectedServiceInfo.registryProjectName,
                      });
                      setRegistryAuthStatus('success');
                      message.success('Container Registry 인증 성공!');
                    } catch (error: any) {
                      setRegistryAuthStatus('failed');
                      message.error(
                        `Container Registry 인증 실패: ${error.message || '알 수 없는 오류'}`
                      );
                    } finally {
                      setRegistryTestLoading(false);
                    }
                  }}
                >
                  인증
                </Button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  Registry 타입
                </span>
                <Select
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.registryType || 'harbor'}
                  onChange={value => {
                    handleEditChange('registryType', value);
                    setRegistryAuthStatus('idle'); //  값 변경 시 인증 상태 초기화
                  }}
                >
                  <Select.Option value='harbor'>Harbor</Select.Option>
                  <Select.Option value='dockerhub'>Docker Hub</Select.Option>
                </Select>
              </div>

              {selectedServiceInfo?.registryType !== 'dockerhub' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{ width: 120, fontWeight: 500, color: '#595959' }}
                  >
                    Registry URL
                  </span>
                  <Input
                    style={{ flex: 1 }}
                    value={selectedServiceInfo?.registryUrl || ''}
                    onChange={e => {
                      handleEditChange('registryUrl', e.target.value);
                      setRegistryAuthStatus('idle'); //  값 변경 시 인증 상태 초기화
                    }}
                    placeholder='예: harbor.mipilab.com'
                  />
                </div>
              )}

              {selectedServiceInfo?.registryType === 'harbor' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{ width: 120, fontWeight: 500, color: '#595959' }}
                  >
                    프로젝트명
                  </span>
                  <Input
                    style={{ flex: 1 }}
                    value={selectedServiceInfo?.registryProjectName || ''}
                    onChange={e =>
                      handleEditChange('registryProjectName', e.target.value)
                    }
                    placeholder='예: myproject'
                  />
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  사용자명
                </span>
                <Input
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.registryUsername || ''}
                  onChange={e => {
                    handleEditChange('registryUsername', e.target.value);
                    setRegistryAuthStatus('idle'); //  값 변경 시 인증 상태 초기화
                  }}
                  placeholder='Registry 사용자명'
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                  비밀번호
                </span>
                <Input.Password
                  style={{ flex: 1 }}
                  value={selectedServiceInfo?.registryPassword || ''}
                  onChange={e => {
                    handleEditChange('registryPassword', e.target.value);
                    setRegistryAuthStatus('idle'); //  값 변경 시 인증 상태 초기화
                  }}
                  placeholder='Registry 비밀번호'
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 권한자 관리 모달 컴포넌트 */}
      <MemberModal
        open={isMemberModalOpen}
        repo={selectedRepo}
        onClose={closeMemberModal}
      />

      {/*  [수정] 파이프라인 상세 정보 모달 */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingRight: '8px',
            }}
          >
            {/* Left: Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flex: 1,
              }}
            >
              <RocketOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {selectedStageData
                  ? `${selectedStageData.repoName} - ${selectedStageData.displayName}`
                  : '상세 정보'}
              </span>
              {selectedStageData?.lastUpdateTime && (
                <Typography.Text
                  type='secondary'
                  style={{
                    fontSize: '12px',
                    marginLeft: '8px',
                  }}
                >
                  (마지막 업데이트: {selectedStageData.lastUpdateTime})
                </Typography.Text>
              )}
            </div>

            {/* Right: Primary Action Button (큰 실행 버튼) */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {/* 재분석 버튼 (SAST summary view only) */}
              {selectedDisplayKeyForModal === ('sast' as never) &&
                sastModalView === 'summary' && (
                  <Button
                    type='primary'
                    icon={<SafetyOutlined />}
                    disabled={isSastScanInProgress}
                    loading={isSastScanInProgress}
                    onClick={async () => {
                      if (!selectedRepoForModal) return;

                      // 서비스 테이블에서 gitlab_access_token 가져오기
                      const service = services.find(
                        s => s.gitlab_url === selectedRepoForModal.gitlabUrl
                      );
                      let token = '';

                      //  [우선순위 1] gitlab_config JSON 파싱하여 토큰 추출
                      if (service?.gitlab_config) {
                        try {
                          const gitlabConfig = JSON.parse(
                            service.gitlab_config
                          );
                          token =
                            gitlabConfig.token ||
                            gitlabConfig.access_token ||
                            '';
                        } catch (e) {
                          console.warn(
                            '[GitManagement] 재분석 - GitLab config 파싱 실패:',
                            e
                          );
                        }
                      }

                      //  [우선순위 2] 하위 호환성: gitlab_access_token 필드 확인
                      if (!token && service?.gitlab_access_token) {
                        token = service.gitlab_access_token;
                      }

                      //  [우선순위 3] localStorage에서 토큰 조회 (하위 호환성)
                      if (!token) {
                        const baseUrl = getBaseUrlFromGitUrl(
                          selectedRepoForModal.gitlabUrl
                        );
                        try {
                          const raw = localStorage.getItem('creds-store') || '';
                          if (raw) {
                            const parsed = JSON.parse(raw);
                            const arr = parsed?.state?.sourceRepository || [];
                            const found = arr.find(
                              (r: any) =>
                                baseUrl.includes(r.baseUrl) ||
                                r.baseUrl?.includes(baseUrl)
                            );
                            token = String(found?.token || '');
                          }
                        } catch {
                          // Credentials parsing failed - continue without token
                        }
                      }

                      if (!token) {
                        message.error(
                          '서비스에 GitLab Access Token이 설정되지 않았습니다.'
                        );
                        return;
                      }
                      void sastAnalysis(
                        selectedRepoForModal.id,
                        selectedRepoForModal,
                        token
                      );
                    }}
                  >
                    {isSastScanInProgress ? '분석 중...' : '재분석'}
                  </Button>
                )}

              {/* 실행 버튼 (executable stages, excluding SAST) */}
              {selectedDisplayKeyForModal &&
                ['build', 'sca', 'deploy', 'dast'].includes(
                  selectedDisplayKeyForModal
                ) && (
                  <Button
                    type='primary'
                    icon={<RocketOutlined />}
                    onClick={() => {
                      if (selectedRepoForModal && selectedDisplayKeyForModal) {
                        void handleExecuteStage(
                          selectedRepoForModal,
                          selectedDisplayKeyForModal
                        );
                      }
                    }}
                  >
                    {selectedDisplayKeyForModal
                      ? `${desiredDisplayName[selectedDisplayKeyForModal]} 실행`
                      : '실행'}
                  </Button>
                )}
            </div>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={closeDetailModal}
        closeIcon={false}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Left: Secondary Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* 뒤로 버튼 (SAST detail view only) */}
              {selectedDisplayKeyForModal === ('sast' as never) &&
                sastModalView !== 'summary' && (
                  <Button
                    icon={<LeftOutlined />}
                    onClick={() => setSastModalView('summary')}
                  >
                    뒤로
                  </Button>
                )}
            </div>

            {/* Right: Close Button */}
            <Button onClick={closeDetailModal}>닫기</Button>
          </div>
        }
        width={sastModalView === 'summary' ? 800 : 1000}
        destroyOnClose
      >
        {isModalContentLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <DetailModalContent
            selectedStage={
              selectedDisplayKeyForModal
                ? desiredToLegacyStage[selectedDisplayKeyForModal]
                : 'code'
            }
            selectedDisplayKey={selectedDisplayKeyForModal}
            pipelineLogs={modalPipelineLogs}
            workflowStatuses={
              selectedRepoForModal
                ? transformDbStepsToWorkflow(
                    pipelineStatuses[selectedRepoForModal.id] || []
                  )
                : []
            }
            sastResultData={modalSastData}
            sastModalView={sastModalView}
            onShowSastDetailView={setSastModalView}
            commits={[]}
            commitsLoading={false}
          />
        )}
      </Modal>

      {/*  [추가] 파이프라인 실행 자격증명 입력 모달 */}
      <ExecutionModal
        open={isExecutionModalVisible}
        loading={isInitialValuesLoading || executingStage !== null}
        stageInfo={
          stageToExecute
            ? {
                stage: desiredToLegacyStage[stageToExecute.displayKey],
                displayKey: stageToExecute.displayKey,
              }
            : null
        }
        initialValues={executionInitialValues}
        availableBuilds={availableBuilds}
        serviceBuildVersions={serviceBuildVersions}
        onCancel={() => {
          setIsExecutionModalVisible(false);
          setAvailableBuilds([]); // 모달 닫을 때 빌드 목록 초기화
          setServiceBuildVersions(null); // 서비스별 빌드 버전도 초기화
          setExecutingStage(null); //  [수정] 모달 닫을 때 실행 상태 초기화 (무한 로딩 방지)
          setStageToExecute(null); //  [수정] 실행 대상 단계도 초기화
        }}
        onSubmit={handleExecutionSubmit}
      />

      {/*  [신규] 빌드 실행 전용 모달 */}
      <BuildExecutionModal
        open={isBuildModalVisible}
        serviceId={
          stageToExecute
            ? services.find(s => s.id === stageToExecute.repo.id)?.id
            : undefined
        }
        gitUrl={stageToExecute?.repo.gitlabUrl}
        gitBranch={stageToExecute?.repo.gitlabBranch}
        registryUrl={
          stageToExecute
            ? services.find(s => s.id === stageToExecute.repo.id)
                ?.registry_config
            : undefined
        }
        defaultAutoDeploy={isAutoDeployMode} //  [신규] 빌드 + 배포 모드 전달
        onCancel={() => {
          setIsBuildModalVisible(false);
          setStageToExecute(null);
          setIsAutoDeployMode(false); //  빌드 + 배포 모드 리셋
        }}
        onSubmit={async values => {
          // 빌드 실행 로직
          if (!stageToExecute) return;

          //  stageToExecute.repo.id는 이미 service ID이므로 직접 사용
          const serviceId = stageToExecute.repo.id;
          const repoName = stageToExecute.repo.name;
          const repoId = stageToExecute.repo.id;

          if (!serviceId) {
            message.error(
              '서비스를 찾을 수 없습니다. 먼저 서비스를 생성해주세요.'
            );
            return;
          }

          //  [신규] 빌드 실행 함수 정의
          const executeBuildFromWizard = async () => {
            try {
              setIsBuildModalVisible(false);
              setExecutingStage('build');

              // 빌드 API 호출 (빌드 인프라 ID 포함)
              //  SSH credentials는 creds-store에서, GitLab/Registry는 DB에서
              await pipelineApi.buildImage(
                serviceId,
                values.hops, //  SSH credentials from creds-store
                values.infra_id, // 빌드 실행 시 선택된 인프라 ID (선택사항)
                values.selected_services, //  [신규] 선택된 서비스 목록
                values.auto_deploy //  [신규] 빌드 완료 후 자동 배포 여부
              );

              //  [추가] 파이프라인 실행 추적 정보 설정 (완료 감지 및 알림용)
              setExecutingPipeline({
                serviceId,
                serviceName: repoName,
                stepName: 'build',
                displayKey: 'build',
              });

              //  [수정] setTimeout 대신 startPolling 사용 (완료 감지 및 알림 처리)
              startPolling();

              //  [수정] stageToExecute만 초기화 (executingStage는 폴링이 완료 후 초기화)
              setStageToExecute(null);
              setIsAutoDeployMode(false); //  빌드 + 배포 모드 리셋
            } catch (error) {
              message.error('빌드 시작에 실패했습니다.');
              console.error('빌드 실행 실패:', error);
              //  에러 발생 시에만 상태 초기화
              setExecutingStage(null);
              setExecutingPipeline(null);
              setStageToExecute(null);
              setIsAutoDeployMode(false); //  빌드 + 배포 모드 리셋
            }
          };

          //  [신규] SAST 보안 검사 수행
          try {
            setSecurityCheckLoading(true);
            const sastResponse = (await gitApi.getSastResult(repoId)) as {
              data?: {
                semgrep?: SastResultData['semgrep'];
                codeql?: SastResultData['codeql'];
                status?: string;
                summary?: SastResultData['summary'];
              };
            };
            const sastData = sastResponse?.data;
            const hasSastResult = sastData?.semgrep || sastData?.codeql;

            // SARIF에서 직접 severity 파싱하는 함수
            const parseSarifSeverity = (
              sarifJson: string | undefined
            ): {
              critical: number;
              high: number;
              medium: number;
              low: number;
            } => {
              const counts = { critical: 0, high: 0, medium: 0, low: 0 };
              if (!sarifJson) return counts;

              try {
                const sarif = JSON.parse(sarifJson);
                const runs = sarif?.runs || [];
                if (runs.length === 0) return counts;

                const results = runs[0]?.results || [];

                const mapSeverity = (
                  lvl: string
                ): 'critical' | 'high' | 'medium' | 'low' => {
                  const v = (lvl || '').toLowerCase();
                  if (v === 'error' || v === 'critical') return 'critical';
                  if (v === 'warning' || v === 'high') return 'high';
                  if (v === 'note' || v === 'medium' || v === 'moderate')
                    return 'medium';
                  return 'low';
                };

                for (const issue of results) {
                  // 1. rule.level에서 severity 확인 (Semgrep/CodeQL 공통 - 가장 우선)
                  let level = issue.rule?.level || issue.level || '';

                  // 2. properties에서 여러 필드 시도
                  if (!level && issue.properties) {
                    level =
                      issue.properties.securitySeverity ||
                      issue.properties['security-severity'] ||
                      issue.properties.severity ||
                      '';
                  }

                  // 3. rank 필드 시도 (CodeQL)
                  if (!level && issue.rank) {
                    level = issue.rank;
                  }

                  // 4. tags에서 severity 추출
                  if (!level && issue.properties?.tags) {
                    for (const tag of issue.properties.tags) {
                      const tagLower = (tag || '').toLowerCase();
                      if (tagLower.includes('critical')) {
                        level = 'critical';
                        break;
                      }
                      if (tagLower.includes('high')) {
                        level = 'high';
                        break;
                      }
                      if (tagLower.includes('medium')) {
                        level = 'medium';
                        break;
                      }
                      if (tagLower.includes('low')) {
                        level = 'low';
                        break;
                      }
                    }
                  }

                  counts[mapSeverity(level)]++;
                }
              } catch (e) {
                console.warn('SARIF 파싱 오류:', e);
              }
              return counts;
            };

            // SARIF에서 직접 severity 계산
            const semgrepSarif = sastData?.semgrep?.results?.sarif_json;
            const codeqlSarif = sastData?.codeql?.results?.sarif_json;
            const semgrepCounts = parseSarifSeverity(semgrepSarif);
            const codeqlCounts = parseSarifSeverity(codeqlSarif);

            const calculatedSeverity = {
              critical: semgrepCounts.critical + codeqlCounts.critical,
              high: semgrepCounts.high + codeqlCounts.high,
              medium: semgrepCounts.medium + codeqlCounts.medium,
              low: semgrepCounts.low + codeqlCounts.low,
            };

            // SAST 분석이 없는 경우
            if (!hasSastResult || sastData?.status === 'not_found') {
              setSecurityWarningConfig({
                stage: 'build',
                category: 'sast',
                warningType: 'no_analysis',
                serviceName: repoName,
                onContinue: () => {
                  setSecurityWarningModalVisible(false);
                  setSecurityWarningConfig(null);
                  void executeBuildFromWizard();
                },
              });
              setSecurityWarningModalVisible(true);
              setSecurityCheckLoading(false);
              return;
            }

            // SAST 결과에서 critical 취약점 확인 (SARIF에서 직접 계산한 값 사용)
            const vulnerabilitySummary = calculatedSeverity;
            if (vulnerabilitySummary.critical > 0) {
              setSecurityWarningConfig({
                stage: 'build',
                category: 'sast',
                warningType: 'critical_found',
                vulnerabilitySummary,
                serviceName: repoName,
                onContinue: () => {
                  setSecurityWarningModalVisible(false);
                  setSecurityWarningConfig(null);
                  void executeBuildFromWizard();
                },
              });
              setSecurityWarningModalVisible(true);
              setSecurityCheckLoading(false);
              return;
            }

            // 보안 검사 통과 - 바로 빌드 실행
            setSecurityCheckLoading(false);
            await executeBuildFromWizard();
          } catch (sastError) {
            console.warn('SAST 결과 조회 실패, 빌드 계속 진행:', sastError);
            setSecurityCheckLoading(false);
            // SAST 조회 실패 시에도 빌드는 진행 가능
            await executeBuildFromWizard();
          }
        }}
      />

      {/* 저장소 통계 모달 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChartOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {currentRepo
                ? `${currentRepo.name} - 저장소 통계`
                : '저장소 통계'}
            </span>
          </div>
        }
        open={commitModalOpen}
        onCancel={() => {
          setCommitModalOpen(false);
          setCurrentRepo(null);
          setRepositoryStats(null);
        }}
        footer={[
          <Button
            key='close'
            type='primary'
            onClick={() => {
              setCommitModalOpen(false);
              setCurrentRepo(null);
              setRepositoryStats(null);
            }}
          >
            닫기
          </Button>,
        ]}
        width={1200}
        styles={{
          body: { maxHeight: '80vh', overflow: 'auto', padding: '24px' },
        }}
        destroyOnClose
      >
        <Tabs
          activeKey={commitModalActiveTab}
          onChange={setCommitModalActiveTab}
          items={[
            {
              key: 'statistics',
              label: (
                <Space>
                  <BarChartOutlined />
                  <span>저장소 통계</span>
                </Space>
              ),
              children: statsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spin size='large' />
                  <p
                    style={{
                      marginTop: '16px',
                      fontSize: '16px',
                      color: '#666',
                    }}
                  >
                    저장소 통계를 불러오는 중...
                  </p>
                </div>
              ) : repositoryStats ? (
                <RepositoryStatistics
                  statistics={repositoryStats}
                  loading={statsLoading}
                />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 0',
                    color: '#999',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    📊
                  </div>
                  <p style={{ fontSize: '16px', margin: 0 }}>
                    저장소 통계를 불러올 수 없습니다.
                  </p>
                  <p
                    style={{
                      fontSize: '14px',
                      margin: '8px 0 0 0',
                      color: '#ccc',
                    }}
                  >
                    잠시 후 다시 시도해주세요.
                  </p>
                </div>
              ),
            },
            //  [추가] SAST 분석 탭
            {
              key: 'sast',
              label: (
                <Space>
                  <SecurityScanOutlined />
                  <span>정적 코드 분석</span>
                  {currentRepo &&
                    (() => {
                      const sastState = getSecurityStateReactive(
                        currentRepo.gitlabUrl,
                        'sast',
                        currentRepo.id
                      );
                      if (
                        sastState &&
                        sastState !== 'null' &&
                        sastState !== 'idle'
                      ) {
                        return (
                          <Tag
                            color={
                              sastState === 'analyzing'
                                ? 'processing'
                                : sastState === 'completed'
                                  ? 'success'
                                  : sastState === 'failed'
                                    ? 'error'
                                    : 'default'
                            }
                            style={{ marginLeft: 4 }}
                          >
                            {sastState === 'analyzing'
                              ? '진행중'
                              : sastState === 'completed'
                                ? '완료'
                                : '실패'}
                          </Tag>
                        );
                      }
                      return null;
                    })()}
                </Space>
              ),
              children: currentRepo ? (
                <SastResultContent
                  repoId={currentRepo.id}
                  serviceId={
                    services.find(s => s.gitlab_url === currentRepo.gitlabUrl)
                      ?.id
                  }
                  repoName={currentRepo.name}
                  onStartScan={async () => {
                    // 서비스 테이블에서 gitlab_access_token 가져오기
                    try {
                      const service = services.find(
                        s => s.gitlab_url === currentRepo.gitlabUrl
                      );
                      let accessToken = '';

                      //  [우선순위 1] gitlab_config JSON 파싱하여 토큰 추출
                      if (service?.gitlab_config) {
                        try {
                          const gitlabConfig = JSON.parse(
                            service.gitlab_config
                          );
                          accessToken =
                            gitlabConfig.token ||
                            gitlabConfig.access_token ||
                            '';
                        } catch (e) {
                          console.warn(
                            '[GitManagement] SAST Scan - GitLab config 파싱 실패:',
                            e
                          );
                        }
                      }

                      //  [우선순위 2] 하위 호환성: gitlab_access_token 필드 확인
                      if (!accessToken && service?.gitlab_access_token) {
                        accessToken = service.gitlab_access_token;
                      }

                      if (accessToken && accessToken.length >= 10) {
                        updateSecurityState(
                          currentRepo.gitlabUrl,
                          'sast',
                          'analyzing',
                          currentRepo.id
                        );
                        await sastAnalysis(
                          currentRepo.id,
                          currentRepo,
                          accessToken
                        );
                      } else {
                        message.error(
                          '서비스에 GitLab Access Token이 설정되지 않았습니다.'
                        );
                      }
                    } catch (_error) {
                      message.error('SAST 스캔 실행 중 오류가 발생했습니다.');
                    }
                  }}
                  onScanStateChange={state => {
                    if (currentRepo) {
                      updateSecurityState(
                        currentRepo.gitlabUrl,
                        'sast',
                        state,
                        currentRepo.id
                      );
                    }
                  }}
                />
              ) : (
                <EmptyState
                  icon={
                    <SafetyOutlined
                      style={{ fontSize: 64, color: '#1890ff' }}
                    />
                  }
                  title='SAST 정적 코드 분석 결과'
                  description='저장소를 선택하세요'
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* 빌드 통계 모달 */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RocketOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {currentRepo ? `${currentRepo.name} - 빌드 통계` : '빌드 통계'}
              </span>
            </div>
            <Button
              type='primary'
              icon={<RocketOutlined />}
              onClick={() => {
                if (currentRepo) {
                  // 빌드 통계 모달 닫기
                  setBuildModalOpen(false);
                  // 빌드 실행 모달 열기 (새로운 BuildExecutionModal)
                  setStageToExecute({ repo: currentRepo, displayKey: 'build' });
                  setIsBuildModalVisible(true);
                }
              }}
              disabled={!currentRepo}
            >
              빌드 실행
            </Button>
          </div>
        }
        open={buildModalOpen}
        closable={false}
        onCancel={() => {
          setBuildModalOpen(false);
          setCurrentRepo(null);
          setBuildStats(null);
          setBuildEnvironment(null);
        }}
        footer={[
          <Button
            key='close'
            onClick={() => {
              setBuildModalOpen(false);
              setCurrentRepo(null);
              setBuildStats(null);
              setBuildEnvironment(null);
            }}
          >
            닫기
          </Button>,
        ]}
        width={1200}
        styles={{
          body: { maxHeight: '80vh', overflow: 'auto', padding: '24px' },
        }}
        destroyOnClose
      >
        <Tabs
          activeKey={buildModalActiveTab}
          onChange={setBuildModalActiveTab}
          items={[
            {
              key: 'statistics',
              label: (
                <Space>
                  <BarChartOutlined />
                  <span>빌드 통계</span>
                </Space>
              ),
              children: buildStatsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spin size='large' />
                  <p
                    style={{
                      marginTop: '16px',
                      fontSize: '16px',
                      color: '#666',
                    }}
                  >
                    빌드 통계를 불러오는 중...
                  </p>
                </div>
              ) : buildStats ? (
                <BuildStatistics
                  statistics={buildStats}
                  buildEnvironment={buildEnvironment}
                  loading={buildStatsLoading}
                  serviceId={currentRepo?.id} //  [신규] .env 파일 생성을 위한 serviceId 전달
                  onBuildClick={() => {
                    if (currentRepo) {
                      // 빌드 모달 닫기
                      setBuildModalOpen(false);
                      // 빌드 실행 모달 열기
                      setStageToExecute({
                        repo: currentRepo,
                        displayKey: 'build',
                      });
                      setIsExecutionModalVisible(true);
                    }
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 0',
                    color: '#999',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    🏗️
                  </div>
                  <p style={{ fontSize: '16px', margin: 0 }}>
                    빌드 통계를 불러올 수 없습니다.
                  </p>
                  <p
                    style={{
                      fontSize: '14px',
                      margin: '8px 0 0 0',
                      color: '#ccc',
                    }}
                  >
                    잠시 후 다시 시도해주세요.
                  </p>
                </div>
              ),
            },
            //  [추가] 빌드 환경 생성 탭
            {
              key: 'wizard',
              label: (
                <Space>
                  <RocketOutlined />
                  <span>빌드 환경 생성</span>
                </Space>
              ),
              children: currentRepo ? (
                <BuildWizardContent
                  gitUrl={currentRepo.gitlabUrl}
                  branch={currentRepo.gitlabBranch}
                  serviceName={currentRepo.name}
                  onSuccess={() => {
                    message.success(
                      '빌드 환경 파일이 성공적으로 생성되었습니다!'
                    );
                    // 저장소 목록 새로고침
                    fetchRepositories();
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <RocketOutlined
                    style={{
                      fontSize: 64,
                      color: '#52c41a',
                      marginBottom: '24px',
                    }}
                  />
                  <p
                    style={{
                      fontSize: '18px',
                      marginBottom: '16px',
                      color: '#333',
                    }}
                  >
                    빌드 환경 생성 마법사
                  </p>
                  <p
                    style={{
                      fontSize: '14px',
                      marginBottom: '24px',
                      color: '#666',
                    }}
                  >
                    저장소를 선택하세요
                  </p>
                </div>
              ),
            },
            //  [추가] SCA 분석 탭
            {
              key: 'sca',
              label: (
                <Space>
                  <ExperimentOutlined />
                  <span>이미지 분석</span>
                  {currentRepo &&
                    (() => {
                      const scaState = getSecurityStateReactive(
                        currentRepo.gitlabUrl,
                        'sca',
                        currentRepo.id
                      );
                      if (
                        scaState &&
                        scaState !== 'null' &&
                        scaState !== 'idle'
                      ) {
                        return (
                          <Tag
                            color={
                              scaState === 'analyzing'
                                ? 'processing'
                                : scaState === 'completed'
                                  ? 'success'
                                  : scaState === 'failed'
                                    ? 'error'
                                    : 'default'
                            }
                            style={{ marginLeft: 4 }}
                          >
                            {scaState === 'analyzing'
                              ? '진행중'
                              : scaState === 'completed'
                                ? '완료'
                                : '실패'}
                          </Tag>
                        );
                      }
                      return null;
                    })()}
                </Space>
              ),
              children: currentRepo ? (
                <ScaResultsContent
                  repoId={currentRepo.id}
                  repoName={currentRepo.name}
                  repoUrl={currentRepo.gitlabUrl}
                  serviceId={
                    services.find(
                      s =>
                        s.id === currentRepo.id ||
                        s.gitlab_url === currentRepo.gitlabUrl
                    )?.id
                  }
                  onScanStateChange={(type, state) => {
                    // 스캔 상태 업데이트
                    if (currentRepo) {
                      updateSecurityState(
                        currentRepo.gitlabUrl,
                        type,
                        state,
                        currentRepo.id
                      );
                    }
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <ExperimentOutlined
                    style={{
                      fontSize: 64,
                      color: '#52c41a',
                      marginBottom: '24px',
                    }}
                  />
                  <p
                    style={{
                      fontSize: '18px',
                      marginBottom: '16px',
                      color: '#333',
                    }}
                  >
                    이미지 분석 결과
                  </p>
                  <p
                    style={{
                      fontSize: '14px',
                      marginBottom: '24px',
                      color: '#666',
                    }}
                  >
                    저장소를 선택하세요
                  </p>
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* GitLab 토큰 입력 모달 */}
      <Modal
        title='GitLab 토큰 입력'
        open={gitlabTokenModalOpen}
        onCancel={() => {
          setGitlabTokenModalOpen(false);
          setPendingRepoId(null);
          setGitlabTokenInput('');
          setGitlabBaseUrlInput('');
        }}
        onOk={() => {
          handleGitlabTokenSubmit();
        }}
        okText='저장'
        cancelText='취소'
        destroyOnClose
        forceRender
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            GitLab API에 접근하기 위해 개인 액세스 토큰이 필요합니다.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor='gitlab-base-url'
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              GitLab Base URL:
            </label>
            <Input
              id='gitlab-base-url'
              placeholder='https://gitlab.mipllab.com'
              value={gitlabBaseUrlInput}
              onChange={e => setGitlabBaseUrlInput(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor='gitlab-token'
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Personal Access Token:
            </label>
            <Input.Password
              id='gitlab-token'
              placeholder='GitLab Personal Access Token을 입력하세요'
              value={gitlabTokenInput}
              onChange={e => setGitlabTokenInput(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            <p>토큰 생성 방법:</p>
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>GitLab → Settings → Access Tokens</li>
              <li>Token name: &quot;k8scontrol&quot;</li>
              <li>
                Scopes: &quot;read_api&quot;, &quot;read_repository&quot; 선택
              </li>
              <li>생성된 토큰을 복사하여 입력</li>
            </ol>
          </div>
        </div>
      </Modal>

      {/*  운영 모달 */}
      <ImprovedOperateModal
        visible={operateModalOpen}
        onClose={() => {
          setOperateModalOpen(false);
          setOperateCurrentService(null);
          setOperateServerHops('');
          setOperateInfraId(undefined);
        }}
        service={operateCurrentService}
        currentStatus={operateCurrentService?.currentStatus}
        serverHops={operateServerHops}
        infraId={operateInfraId}
        dastState={
          operateCurrentService?.gitlab_url
            ? getSecurityStateReactive(
                operateCurrentService.gitlab_url,
                'dast',
                operateCurrentService.id
              )
            : undefined
        }
        dastResult={dastResult}
        repoId={
          operateCurrentService?.gitlab_url
            ? repositories.find(
                r => r.gitlabUrl === operateCurrentService.gitlab_url
              )?.id
            : undefined
        }
        repoName={
          operateCurrentService?.gitlab_url
            ? repositories.find(
                r => r.gitlabUrl === operateCurrentService.gitlab_url
              )?.name
            : undefined
        }
        repoUrl={operateCurrentService?.gitlab_url || undefined}
        onDastScanStateChange={state => {
          if (operateCurrentService?.gitlab_url) {
            updateSecurityState(
              operateCurrentService.gitlab_url,
              'dast',
              state,
              operateCurrentService.id
            );
            if (state === 'completed' || state === 'failed') {
              updateSecurityLastUpdate(
                operateCurrentService.gitlab_url,
                'dast',
                new Date().toISOString(),
                operateCurrentService.id
              );
            }
          }
        }}
      />

      <InfraSelectorModal
        visible={selectedInfraModal}
        onClose={() => {
          setSelectedInfraModal(false);
          setSelectedProjectForInfra(null);
          setCurrentSelectedInfraName(undefined); //  초기화
        }}
        currentInfraName={currentSelectedInfraName} //  현재 인프라 이름 전달
        onSelect={async (infraId: number, infraName: string) => {
          if (!selectedProjectForInfra) {
            message.error('선택된 프로젝트가 없습니다.');
            return;
          }

          try {
            // 서비스 찾기 (우선순위: repo.id 직접 매칭 > gitlab_url)
            let service = services.find(
              s => s.id === selectedProjectForInfra.id
            );

            if (!service) {
              service = services.find(
                s => s.gitlab_url === selectedProjectForInfra.gitlabUrl
              );
            }

            if (!service) {
              message.error('연결된 서비스를 찾을 수 없습니다.');
              return;
            }

            // 1. 인프라 정보 업데이트 API 호출
            await serviceApi.updateServiceInfra(service.id, infraId);

            message.success(`인프라가 "${infraName}"으로 변경되었습니다.`);

            // 모달 닫기 및 상태 초기화
            setSelectedInfraModal(false);
            setSelectedProjectForInfra(null);

            // [수정] "다음 액션"이 있는지 확인
            if (nextAction) {
              message.info(
                `이제 원래 요청했던 "${desiredDisplayName[nextAction.displayKey]}" 단계를 실행합니다.`
              );
              // 기억해 둔 '빌드' 또는 '배포' 단계를 실행합니다.
              await handleExecuteStage(nextAction.repo, nextAction.displayKey);
              setNextAction(null); // 다음 액션을 실행했으므로 초기화
            }
          } catch (error) {
            message.error('작업에 실패했습니다.', error);
            setNextAction(null); // 실패 시에도 초기화
          }
        }}
      />

      {/* 통일된 보안 분석 모달 (SAST, DAST) */}
      {securityModalType !== 'sca' && (
        <SecurityResultModal
          visible={securityModalOpen}
          onClose={() => {
            setSecurityModalOpen(false);
            setSecurityModalRepoId(null);
            setSecurityModalRepoName('');
            setSecurityModalRepoUrl('');
          }}
          repoId={securityModalRepoId || 0}
          repoName={securityModalRepoName}
          repoUrl={securityModalRepoUrl}
          analysisType={securityModalType}
          onScanStateChange={(
            type: 'sast' | 'sca' | 'dast' | 'sbom',
            state: 'idle' | 'analyzing' | 'completed' | 'failed'
          ) => {
            // 상태 변경 시 상위 컴포넌트 상태도 업데이트
            if (securityModalRepoUrl) {
              // 전달받은 type을 사용하여 올바른 상태를 업데이트합니다.
              updateSecurityState(
                securityModalRepoUrl,
                type,
                state,
                securityModalRepoId
              );

              // 스캔이 완료되거나 실패하면 마지막 업데이트 시간도 갱신합니다.
              if (state === 'completed' || state === 'failed') {
                const nowIso = new Date().toISOString();
                updateSecurityLastUpdate(
                  securityModalRepoUrl,
                  type,
                  nowIso,
                  securityModalRepoId
                );
              }
            }
          }}
        />
      )}

      {/*  [신규] 보안 검사 경고 모달 */}
      {securityWarningConfig && (
        <SecurityCheckWarningModal
          visible={securityWarningModalVisible}
          stage={securityWarningConfig.stage}
          category={securityWarningConfig.category}
          warningType={securityWarningConfig.warningType}
          vulnerabilitySummary={securityWarningConfig.vulnerabilitySummary}
          serviceName={securityWarningConfig.serviceName}
          onContinue={securityWarningConfig.onContinue}
          onCancel={() => {
            setSecurityWarningModalVisible(false);
            setSecurityWarningConfig(null);
            setExecutingStage(null);
            setStageToExecute(null);
          }}
          loading={securityCheckLoading}
        />
      )}

      {/* DAST 파라미터 입력 모달 */}
      <DastParamsModal
        visible={dastParamsModalOpen}
        onClose={() => {
          setDastParamsModalOpen(false);
          setDastParamsRepoId(null);
          setDastParamsRepoName('');
          setDastParamsRepoUrl('');
          setDastParamsServiceId(null);
        }}
        onConfirm={handleDastParamsConfirm}
        loading={false}
        serviceId={dastParamsServiceId || undefined}
      />

      {/*  [추가] DAST 전용 모달 */}
      {currentRepo && (
        <DastResultModal
          visible={dastModalOpen}
          onClose={() => setDastModalOpen(false)}
          repoId={currentRepo.id}
          repoName={currentRepo.name}
          onScanStateChange={state => {
            if (currentRepo.gitlabUrl) {
              updateSecurityState(
                currentRepo.gitlabUrl,
                'dast',
                state,
                currentRepo.id
              );
              if (state === 'completed' || state === 'failed') {
                updateSecurityLastUpdate(
                  currentRepo.gitlabUrl,
                  'dast',
                  new Date().toISOString(),
                  currentRepo.id
                );
              }
            }
          }}
        />
      )}

      {/*  [추가] GitLab 토큰 입력 모달 */}
      {tokenInputServiceId && (
        <GitLabTokenInputModal
          visible={tokenInputModalOpen}
          onCancel={() => {
            setTokenInputModalOpen(false);
            setTokenInputServiceId(null);
            setTokenInputServiceName('');
            setTokenInputGitlabUrl('');
          }}
          onSuccess={() => {
            setTokenInputModalOpen(false);
            // 토큰 저장 성공 시 services 목록 갱신
            serviceApi
              .getServices()
              .then(servicesRes => {
                setServices(servicesRes || []);
                // 커밋 모달 열기
                if (currentRepo) {
                  setCommitModalOpen(true);
                  // 저장소 통계 조회
                  fetchRepositoryStatistics(
                    currentRepo.id,
                    currentRepo.gitlabUrl,
                    findGitLabTokenForRepo
                  ).catch(() => {});
                }
              })
              .catch(() => {
                message.error('서비스 목록 갱신에 실패했습니다.');
              });
            // 상태 초기화
            setTokenInputServiceId(null);
            setTokenInputServiceName('');
            setTokenInputGitlabUrl('');
          }}
          serviceId={tokenInputServiceId}
          serviceName={tokenInputServiceName}
          gitlabUrl={tokenInputGitlabUrl}
        />
      )}

      {/*  [제거] 기존 SAST 상세 결과 모달 제거 */}
      {/* <Modal title={`${sastDetailType === 'semgrep' ? 'Semgrep' : 'CodeQL'} 상세 분석 결과`} ... > ... </Modal> */}
    </div>
  );
};

export default GitManagement;
