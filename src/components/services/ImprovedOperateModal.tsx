import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Progress,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Alert,
  Spin,
  Empty,
  Typography,
  message,
  notification,
  Form,
  Descriptions,
  Popconfirm,
} from 'antd';
import {
  DashboardOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  BarChartOutlined,
  RocketOutlined,
  ClusterOutlined,
  DeleteOutlined,
  GlobalOutlined,
  ToolOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { Service } from '../../lib/api/types';
import { api } from '../../services/api';
import type { SshHop } from '../../lib/api/types';
import {
  scaleDeployment,
  getHPA,
  createHPA,
  deleteHPA,
  getRolloutHistory,
  rolloutUndo,
  getK8sResources,
  deletePod,
  createIngress,
  deleteIngress,
  checkIngressController,
  installIngressController,
  checkMetricsServer,
  installMetricsServer,
  getMetricsServerStatus,
  cleanMetricsServerNode,
  getPodMetrics,
  describePod,
  getNodeList,
  getK8sResourceYaml,
  type K8sResource,
  type IngressRule,
  type IngressTLS,
  type IngressControllerStatus,
  type MetricsServerStatus,
  type MetricsServerDiagnostics,
  type NodeInfo,
} from '../../lib/api/k8s-resources';
import {
  getDockerServer,
  getContainers,
  getDockerLogs,
  controlContainer,
  getAllContainerStats,
  getDockerSystemInfo,
  pruneDockerResources,
  getDockerImages,
  getDockerVolumes,
  getDockerNetworks,
  executeCommand,
  type ContainerStats,
  type DockerSystemInfo,
} from '../../lib/api/docker';
import DockerContainersTab from './operate-modal/tabs/docker/DockerContainersTab';
import DockerOpsTab from './operate-modal/tabs/docker/DockerOpsTab';
import DockerDeploymentTab from './operate-modal/tabs/docker/DockerDeploymentTab';
import K8sPodsTab from './operate-modal/tabs/k8s/K8sPodsTab';
import K8sResourcesTab from './operate-modal/tabs/k8s/K8sResourcesTab';
import K8sOpsTab from './operate-modal/tabs/k8s/K8sOpsTab';
import K8sDeploymentTab from './operate-modal/tabs/k8s/K8sDeploymentTab';
// Common tabs
import OverviewTab from './operate-modal/tabs/common/OverviewTab';
import DASTTab from './operate-modal/tabs/common/DASTTab';
import LogsTab from './operate-modal/tabs/common/LogsTab';
import ExecuteTab from './operate-modal/tabs/common/ExecuteTab';
import DomainSettingsTab from './operate-modal/tabs/common/DomainSettingsTab';
import type { DastResult, DastScanParams } from '../../types/securityAnalysis';
import DastParamsModal, { type DastScanStatus } from '../gits/DastParamsModal';
import ScanProgressOverlay from '../common/ScanProgressOverlay';
import type { ScanType } from '../common/ScanProgressOverlay';
import { gitApi } from '../../lib/api/gitRepository';
import { useCredsStore } from '../../stores/useCredsStore';
import logger from '../../utils/logger';
import SshCredentialModal from './SshCredentialModal';
import {
  isKubernetesType,
  isDockerType,
  isPodmanType,
  isContainerType,
  getDisplayInfraType,
} from '../../utils/infraUtils';
import type {
  PodInfo,
  ResourceInfo,
  HPAInfo,
  IngressInfo,
} from '../../types/operate-modal';
import type {
  DockerContainerInfo,
  DockerImageInfo,
  DockerVolumeInfo,
  DockerNetworkInfo,
} from './operate-modal/types';

const { Text, Title } = Typography;

export interface ImprovedOperateModalProps {
  visible: boolean;
  onClose: () => void;
  service?: Service | null;
  currentStatus?: {
    replicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
    readyReplicas?: number;
    status?: string;
  };
  serverHops?: string;
  infraId?: number;
  //  [추가] DAST 분석 결과 표시를 위한 props
  dastResult?: DastResult | null;
  dastState?: 'analyzing' | 'completed' | 'failed' | 'null' | 'idle' | null;
  //  [추가] repoId를 props로 추가 (DAST 스캔을 위해 필요)
  repoId?: number;
  repoName?: string;
  repoUrl?: string;
  //  [추가] DAST 스캔 상태 변경 콜백 (진행중/완료/실패)
  onDastScanStateChange?: (state: 'analyzing' | 'completed' | 'failed') => void;
}

const ImprovedOperateModal: React.FC<ImprovedOperateModalProps> = ({
  visible,
  onClose,
  service,
  currentStatus: _currentStatus,
  serverHops,
  infraId,
  dastResult: _dastResult,
  dastState,
  repoId,
  repoName,
  repoUrl: _repoUrl,
  onDastScanStateChange,
}) => {
  //  creds-store hooks
  const { upsertServerByHostPort } = useCredsStore();

  //  Debug: service prop 확인
  useEffect(() => {
    if (visible && service) {
      logger.debug(
        'Service modal opened',
        {
          serviceName: service.name,
          infraType: service.infraType,
          displayInfraType: getDisplayInfraType(service.infraType),
          isDockerInfra: isDockerType(service.infraType),
          isPodmanInfra: isPodmanType(service.infraType),
          isKubernetesInfra: isKubernetesType(service.infraType),
        },
        'ImprovedOperateModal',
        'mount'
      );
    }
  }, [visible, service]);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandOutput, setCommandOutput] = useState<string>('');
  const [executingCommand, setExecutingCommand] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [resourceInfo, setResourceInfo] = useState<ResourceInfo | null>(null);
  const [loadingResource, setLoadingResource] = useState(false);

  // Deployment 관리 상태
  const [scalingReplicas, setScalingReplicas] = useState<number>(1);
  const [scalingLoading, setScalingLoading] = useState(false);
  const [hpaData, setHpaData] = useState<HPAInfo | null>(null);
  const [hpaList, setHpaList] = useState<HPAInfo[]>([]); // 전체 HPA 목록
  const [loadingHPA, setLoadingHPA] = useState(false);
  const [_rolloutHistory, setRolloutHistory] = useState<string>('');
  const [_loadingRollout, setLoadingRollout] = useState(false);
  const [showHPAForm, setShowHPAForm] = useState(false);

  // Ingress 관리 상태
  const [_ingressList, setIngressList] = useState<IngressInfo[]>([]);
  const [_loadingIngress, setLoadingIngress] = useState(false);
  const [_showIngressForm, setShowIngressForm] = useState(false);
  const [ingressForm] = Form.useForm();

  // YAML 보기 모달 상태 (배포 관리 탭)
  const [yamlViewModalVisible, setYamlViewModalVisible] = useState(false);
  const [yamlViewContent, setYamlViewContent] = useState('');
  const [yamlViewLoading, setYamlViewLoading] = useState(false);
  const [yamlViewTitle, setYamlViewTitle] = useState('');
  const [_ingressControllerStatus, setIngressControllerStatus] =
    useState<IngressControllerStatus | null>(null);
  const [_loadingControllerStatus, setLoadingControllerStatus] =
    useState(false);
  const [_installingController, setInstallingController] = useState(false);

  // Metrics Server 관리 상태
  const [metricsServerStatus, setMetricsServerStatus] =
    useState<MetricsServerStatus | null>(null);
  const [metricsServerDiagnostics, setMetricsServerDiagnostics] =
    useState<MetricsServerDiagnostics | null>(null);
  const [loadingMetricsStatus, setLoadingMetricsStatus] = useState(false);
  const [installingMetrics, setInstallingMetrics] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // 폴링 인터벌 ref 및 시간
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const [_pollingElapsedTime, setPollingElapsedTime] = useState<number>(0);

  // 모든 Deployment 목록
  const [deployments, setDeployments] = useState<K8sResource[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string>('');
  const [deploymentStatus, setDeploymentStatus] = useState<{
    replicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
  }>({});

  // Ingress 및 도메인 정보
  const [ingressDomains, setIngressDomains] = useState<string[]>([]);

  // K8s 운영 관리 상태 - K8sOpsTab으로 이동됨
  const [, setNodeList] = useState<NodeInfo[]>([]);
  const [, setLoadingNodeList] = useState(false);

  // Docker/Podman 컨테이너 관리 상태
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [dockerServerId, setDockerServerId] = useState<number | null>(null);
  const [dockerServerHops, setDockerServerHops] = useState<SshHop[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');

  // SSH Credential 모달 상태
  const [sshCredentialModalVisible, setSshCredentialModalVisible] =
    useState(false);
  const [pendingHops, setPendingHops] = useState<SshHop[]>([]);
  const [sshCredentialRetry, setSshCredentialRetry] = useState(false); // 인증 실패 후 재시도 여부
  const [k8sSshHops, setK8sSshHops] = useState<SshHop[]>([]); // K8s 리소스 조회용 SSH hops
  const [needsK8sSshCredentials, setNeedsK8sSshCredentials] = useState(false); // K8s SSH credentials 필요 여부

  //  [추가] DAST 스캔 모달 상태 (Ingress 도메인 제한용)
  const [dastParamsModalVisible, setDastParamsModalVisible] = useState(false);
  const [dastScanning, setDastScanning] = useState(false);
  const [dastScanStatus, setDastScanStatus] = useState<DastScanStatus>('idle');
  const [dastScanError, setDastScanError] = useState<string | undefined>(
    undefined
  );
  const [dastScanStartTime, setDastScanStartTime] = useState<Date | null>(null);

  // Docker/Podman 이미지 관리 상태
  const [dockerImages, setDockerImages] = useState<DockerImageInfo[]>([]);
  const [_loadingImages, setLoadingImages] = useState(false);

  // Docker/Podman 볼륨 및 네트워크 상태
  const [dockerVolumes, setDockerVolumes] = useState<DockerVolumeInfo[]>([]);
  const [dockerNetworks, setDockerNetworks] = useState<DockerNetworkInfo[]>([]);
  const [_loadingDockerResources, setLoadingDockerResources] = useState(false);

  //  [신규] Docker 컨테이너 통계 및 시스템 정보 상태
  const [allContainerStats, setAllContainerStats] = useState<ContainerStats[]>(
    []
  );
  const [loadingAllStats, setLoadingAllStats] = useState(false);
  const [dockerSystemInfo, setDockerSystemInfo] =
    useState<DockerSystemInfo | null>(null);
  const [_loadingSystemInfo, setLoadingSystemInfo] = useState(false);
  const [pruningResources, setPruningResources] = useState(false);
  const [containerActionLoading, setContainerActionLoading] = useState<
    string | null
  >(null);

  // 배포된 이미지 정보
  const [deployedImageInfo, setDeployedImageInfo] = useState<{
    deployed_image_tag?: string;
    deployed_image?: string;
    registry?: string;
    namespace?: string;
    deployed_at?: string;
    primary_deployed_image?: string; // PRIMARY_DEPLOYED_IMAGE 값 (빌드된 이미지 경로)
    actual_deployed_images?: string[]; // 실제 배포된 Pod들이 사용 중인 이미지 목록
  } | null>(null);
  const [latestBuildImageTag, setLatestBuildImageTag] = useState<string>('');
  const [deploymentDetails, setDeploymentDetails] = useState<any>(null); // 배포 상세 정보 전체

  // SSH Hops 파싱
  const parseHops = (): SshHop[] => {
    if (!serverHops) return [];
    try {
      const parsed =
        typeof serverHops === 'string' ? JSON.parse(serverHops) : serverHops;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // JSON parsing failed - return empty hops array
      return [];
    }
  };

  // 인프라 타입 판별 헬퍼 함수 (useCallback으로 래핑하여 useEffect 의존성 최적화)
  const isKubernetesInfra = useCallback((): boolean => {
    return isKubernetesType(service?.infraType);
  }, [service?.infraType]);

  const isDockerInfra = useCallback((): boolean => {
    return isDockerType(service?.infraType);
  }, [service?.infraType]);

  const isPodmanInfra = useCallback((): boolean => {
    return isPodmanType(service?.infraType);
  }, [service?.infraType]);

  const isContainerInfra = useCallback((): boolean => {
    return isContainerType(service?.infraType);
  }, [service?.infraType]);

  // 진단 정보 상태 변화 로깅
  useEffect(() => {
    // Track diagnostics state changes
  }, [metricsServerDiagnostics, showDiagnostics, metricsServerStatus]);

  // 초기화
  useEffect(() => {
    if (visible) {
      setActiveTab('overview');
      setPods([]);
      setSelectedPod('');
      setLogs('');
      setCommandInput('');
      setCommandOutput('');
      setResourceInfo(null);
      setDeployedImageInfo(null);
      setLatestBuildImageTag('');

      //  [신규] creds-store에서 K8s SSH credentials 복원
      let restoredHops: SshHop[] | undefined = undefined;
      if (isKubernetesInfra() && infraId && service?.id) {
        const { serverlist } = useCredsStore.getState();
        // infraId와 serviceId가 일치하는 credentials 찾기
        const k8sCredentials = serverlist.filter(
          s => s.infraId === infraId && s.serviceId === service.id
        );

        if (k8sCredentials.length > 0) {
          //  hopOrder 존재 여부 확인
          const hasHopOrder = k8sCredentials.some(
            c => c.hopOrder !== undefined
          );

          let sortedCredentials;
          if (hasHopOrder) {
            // hopOrder가 있으면 정렬
            sortedCredentials = [...k8sCredentials].sort((a, b) => {
              const orderA = a.hopOrder ?? 999;
              const orderB = b.hopOrder ?? 999;
              return orderA - orderB;
            });
          } else {
            // hopOrder가 없으면 reverse (이전에 역순으로 저장된 경우)
            sortedCredentials = [...k8sCredentials].reverse();
          }

          // SshHop 형식으로 변환
          restoredHops = sortedCredentials.map(cred => ({
            host: cred.host,
            port: cred.port || 22,
            username: cred.userId,
            password: cred.password,
          }));
          setK8sSshHops(restoredHops);
          logger.info(
            'K8s SSH credentials restored from creds-store',
            {
              hopsCount: restoredHops.length,
              infraId,
              serviceId: service.id,
              hasHopOrder,
            },
            'ImprovedOperateModal',
            'mount'
          );
        }
      }

      // 모달이 열리면 자동으로 데이터 로드
      logger.info(
        'Modal opened',
        {
          serviceName: service.name,
          infraType: service.infraType,
          infraId,
          isDockerInfra: isDockerInfra(),
          isPodmanInfra: isPodmanInfra(),
          hasRestoredHops:
            restoredHops !== undefined && restoredHops.length > 0,
        },
        'ImprovedOperateModal',
        'mount'
      );

      //  [수정] 복원된 hops를 loadOverviewData에 전달
      void loadOverviewData(restoredHops);
      void loadDeployedImageInfo();
      // Docker 컨테이너 데이터는 별도 useEffect (line 427)에서 activeTab에 따라 로드됨
    }
  }, [visible]);

  // 🔧 [수정] infraId나 service.id가 변경되면 데이터 다시 로드
  // 이는 모달이 열린 후 비동기적으로 infraId가 설정될 때를 처리합니다
  //  [중요] service 객체 전체가 아닌 service.id만 의존성으로 사용하여 불필요한 재실행 방지
  useEffect(() => {
    if (visible && service && infraId) {
      void loadOverviewData();
      void loadDeployedImageInfo();
    }
  }, [infraId, service?.id, visible]); // service 대신 service.id 사용

  // Pods 탭 활성화 시 HPA 데이터 및 Metrics Server 상태 자동 로드
  useEffect(() => {
    if (visible && activeTab === 'pods') {
      void loadHPA();

      //  K8s SSH hops가 준비된 후에만 Metrics Server 상태 확인
      // hops가 비어있으면 백엔드에서 DB fallback을 시도하는데, 이때 SSH 인증 실패가 발생할 수 있음
      if (k8sSshHops.length > 0) {
        // Metrics Server 상태 먼저 확인
        void checkMetricsServerStatus().then(status => {
          // Metrics Server가 Ready 상태이고 Pods가 있을 때만 메트릭 로드
          if (status?.ready && pods.length > 0) {
            void loadPodMetrics();
          }
        });
      }
    }
  }, [visible, activeTab, k8sSshHops]);

  // Deployment 탭 활성화 시 Ingress Controller 상태 자동 확인
  useEffect(() => {
    if (visible && activeTab === 'deployment') {
      void handleCheckIngressController();
    }
  }, [visible, activeTab]);

  // K8s Ops 탭 활성화 시 노드 목록 조회
  useEffect(() => {
    const loadNodeListData = async () => {
      if (!infraId) {
        return;
      }

      setLoadingNodeList(true);
      try {
        //  SSH hops 전달 (K8s 노드 목록 조회에 필요)
        const hopsToUse =
          k8sSshHops.length > 0
            ? k8sSshHops.map(h => ({
                host: h.host,
                port: h.port,
                username: h.username || '',
                password: h.password || '',
              }))
            : undefined;
        const result = await getNodeList({
          infra_id: infraId,
          hops: hopsToUse,
        });

        // JSON 파싱
        const nodesData = result.nodes ? JSON.parse(result.nodes) : null;

        if (nodesData && nodesData.items) {
          const nodes: NodeInfo[] = nodesData.items.map((node: any) => ({
            name: node.metadata.name,
            status:
              node.status.conditions?.find((c: any) => c.type === 'Ready')
                ?.status === 'True'
                ? 'Ready'
                : 'NotReady',
            roles: node.metadata.labels?.['node-role.kubernetes.io/master']
              ? 'master'
              : node.metadata.labels?.['node-role.kubernetes.io/control-plane']
                ? 'control-plane'
                : 'worker',
            age: node.metadata.creationTimestamp,
            version: node.status.nodeInfo.kubeletVersion,
          }));
          setNodeList(nodes);
        }
      } catch {
        // Node list fetch failed - optional feature, silently ignore
      } finally {
        setLoadingNodeList(false);
      }
    };

    if (activeTab === 'k8sops' && infraId && !isContainerInfra()) {
      void loadNodeListData();
    }
  }, [activeTab, infraId, isContainerInfra]);

  // Docker 컨테이너 목록 로드 (Docker 인프라일 때)
  useEffect(() => {
    logger.debug(
      'Docker container load check',
      {
        visible,
        infraId,
        isDockerInfra: isDockerInfra(),
        isPodmanInfra: isPodmanInfra(),
        activeTab,
        shouldLoad:
          visible &&
          infraId &&
          isContainerInfra() &&
          (activeTab === 'containers' || activeTab === 'overview'),
      },
      'ImprovedOperateModal',
      'containerLoadCheck'
    );

    if (
      visible &&
      infraId &&
      isContainerInfra() &&
      (activeTab === 'containers' || activeTab === 'overview')
    ) {
      logger.info(
        'Loading Docker/Podman containers via useEffect',
        { infraId, activeTab },
        'ImprovedOperateModal',
        'useEffect'
      );
      void loadDockerContainerData();
    }
  }, [visible, infraId, activeTab]);

  // Docker 리소스 로드 (이미지, 볼륨, 네트워크)
  useEffect(() => {
    logger.debug(
      'Docker resources load check',
      {
        visible,
        infraId,
        isDockerInfra: isDockerInfra(),
        isPodmanInfra: isPodmanInfra(),
        activeTab,
        hasHops: dockerServerHops.length > 0,
        shouldLoad:
          visible &&
          infraId &&
          isContainerInfra() &&
          activeTab === 'dockerresources' &&
          dockerServerHops.length > 0,
      },
      'ImprovedOperateModal',
      'dockerResourcesLoadCheck'
    );

    if (
      visible &&
      infraId &&
      isContainerInfra() &&
      activeTab === 'dockerresources' &&
      dockerServerHops.length > 0
    ) {
      logger.info(
        'Loading Docker/Podman resources via useEffect',
        { infraId, activeTab },
        'ImprovedOperateModal',
        'useEffect'
      );
      void loadDockerImages();
      void loadDockerResources();
    }
  }, [visible, infraId, activeTab, dockerServerHops]);

  // Docker 개요 탭 데이터 로드 (시스템 정보, 이미지, 리소스)
  useEffect(() => {
    logger.debug(
      'Docker overview data load check',
      {
        visible,
        infraId,
        isDockerInfra: isDockerInfra(),
        isPodmanInfra: isPodmanInfra(),
        activeTab,
        hasHops: dockerServerHops.length > 0,
        shouldLoad:
          visible &&
          infraId &&
          isContainerInfra() &&
          activeTab === 'overview' &&
          dockerServerHops.length > 0,
      },
      'ImprovedOperateModal',
      'dockerOverviewLoadCheck'
    );

    if (
      visible &&
      infraId &&
      isContainerInfra() &&
      activeTab === 'overview' &&
      dockerServerHops.length > 0
    ) {
      logger.info(
        'Loading Docker/Podman overview data via useEffect',
        { infraId, activeTab },
        'ImprovedOperateModal',
        'useEffect'
      );
      // 시스템 정보, 이미지, 리소스 모두 로드
      void loadDockerSystemInfo();
      void loadDockerImages();
      void loadDockerResources();
    }
  }, [visible, infraId, activeTab, dockerServerHops]);

  // 개요 데이터 로드
  const loadOverviewData = async (providedHops?: SshHop[]) => {
    if (!service || !infraId) {
      return;
    }

    //  Docker/Podman 인프라인 경우 Kubernetes API 호출하지 않음
    if (isContainerInfra()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      //  [수정] providedHops 우선 사용, 없으면 k8sSshHops, 마지막으로 parseHops() 사용
      const hopsToUse =
        providedHops && providedHops.length > 0
          ? providedHops
          : k8sSshHops.length > 0
            ? k8sSshHops
            : parseHops();

      const namespace = service.namespace || 'default';

      // Pod 상태 조회 (Kubernetes 전용)
      const podsResult = await api.kubernetes.request<{
        success: boolean;
        pods?: PodInfo[];
      }>('getNamespaceAndPodStatus', {
        namespace,
        hops: hopsToUse, //  [임시] 원본 그대로 전송
        infra_id: infraId,
        service_id: service.id,
      });

      if (podsResult.data?.data) {
        const response = podsResult.data.data as any;
        const podList = response.pods || [];
        setPods(podList);
        if (podList.length > 0 && !selectedPod) {
          const firstPodName =
            typeof podList[0].name === 'string'
              ? podList[0].name.trim()
              : String(podList[0].name || '').trim();
          setSelectedPod(firstPodName);
        }

        // 🔧 [수정] 실제 Pod에서 사용 중인 이미지 목록 추출
        const actualImages: string[] = podList
          .filter((pod: PodInfo) => pod.image && pod.image !== '<none>')
          .map((pod: PodInfo) => pod.image);

        // 중복 제거
        const uniqueImages: string[] = Array.from(new Set(actualImages));

        // deployedImageInfo 업데이트 (actual_deployed_images만)
        if (uniqueImages.length > 0) {
          setDeployedImageInfo(prev => ({
            ...prev,
            actual_deployed_images: uniqueImages,
          }));
        }

        // Pod 메트릭스는 Pods 탭에서 자동 로드되므로 여기서는 호출하지 않음
      }

      // 실제 Deployment 목록 및 상태 조회
      if (service.id) {
        try {
          //  [수정] providedHops 우선 사용, 없으면 k8sSshHops 사용
          const hopsSource =
            providedHops && providedHops.length > 0
              ? providedHops
              : k8sSshHops.length > 0
                ? k8sSshHops
                : undefined;

          // SSH hops를 API가 요구하는 형태로 변환
          const hopsToUse = hopsSource
            ? hopsSource.map(h => ({
                host: h.host,
                port: h.port,
                username: h.username || '',
                password: h.password || '',
              }))
            : undefined;

          // K8s SSH credentials가 있으면 함께 전달
          const k8sResources = await getK8sResources(service.id, hopsToUse);
          if (k8sResources.deployments && k8sResources.deployments.length > 0) {
            // 모든 Deployment 저장
            setDeployments(k8sResources.deployments);

            // 첫 번째 Deployment를 기본 선택
            const firstDeployment = k8sResources.deployments[0];
            const deploymentName = firstDeployment.metadata?.name || '';
            setSelectedDeployment(deploymentName);

            // 선택된 Deployment 상태 정보 추출
            const status = firstDeployment.status || {};
            setDeploymentStatus({
              replicas: status.replicas || 0,
              availableReplicas: status.availableReplicas || 0,
              updatedReplicas: status.updatedReplicas || 0,
            });

            // 전체 HPA 목록 로드 (탭에 "자동 조정 중" 표시용)
            //  [수정] providedHops를 전달 (getK8sResources와 동일한 hops 사용)
            void loadAllHPAs(hopsSource);
          }

          // Ingress에서 도메인 정보 추출
          if (k8sResources.ingresses && k8sResources.ingresses.length > 0) {
            const domains: string[] = [];
            k8sResources.ingresses.forEach((ingress: any) => {
              const rules = ingress.spec?.rules || [];
              rules.forEach((rule: any) => {
                if (rule.host) {
                  domains.push(rule.host);
                }
              });
            });
            setIngressDomains(domains);
          }
        } catch (error: any) {
          // SSH credentials가 필요한 경우 처리
          // ApiError의 경우 originalError.response를 확인
          const response = error.response || error.originalError?.response;
          const statusCode = error.statusCode || response?.status;

          if (
            statusCode === 401 &&
            response?.data?.data?.requires_ssh_credentials
          ) {
            const hopsData = response.data.data.hops || [];

            //  [임시] reverse 제거 - 백엔드가 정순을 반환하는지 테스트
            logger.info(
              'K8s SSH credentials required',
              {
                hopsCount: hopsData.length,
              },
              'ImprovedOperateModal',
              'loadOverviewData'
            );

            // SSH credential 모달 열기 (원본 그대로 사용)
            setPendingHops(hopsData);
            setNeedsK8sSshCredentials(true);
            setSshCredentialModalVisible(true);
          } else {
            //  [신규] SSH 연결 실패 감지 및 재입력 요청
            const errorMessage = error.message || error.error || '';
            const isSshConnectionError =
              errorMessage.includes('SSH 연결') ||
              errorMessage.includes('SSH 접속') ||
              errorMessage.includes('연결 시간 초과') ||
              errorMessage.includes('연결할 수 없습니다') ||
              errorMessage.includes('connection timeout') ||
              errorMessage.includes('connection refused') ||
              errorMessage.includes('authentication failed');

            if (
              isSshConnectionError &&
              (k8sSshHops.length > 0 || providedHops)
            ) {
              logger.warn(
                'SSH connection failed during K8s resources load',
                {
                  error: errorMessage,
                },
                'ImprovedOperateModal',
                'loadOverviewData'
              );

              // notification 제거: outer catch에서 통합 처리
              // SSH credential 모달 재오픈 (재시도 모드)
              setPendingHops(
                k8sSshHops.length > 0 ? k8sSshHops : providedHops || []
              );
              setNeedsK8sSshCredentials(true);
              setSshCredentialRetry(true);
              setSshCredentialModalVisible(true);

              // outer catch로 에러 전파하지 않고 여기서 종료
              return;
            } else {
              logger.error(
                'Failed to load K8s resources',
                error as Error,
                {},
                'ImprovedOperateModal',
                'loadOverviewData'
              );
              // outer catch로 에러 전파
              throw error;
            }
          }
        }
      }

      // 리소스 정보 조회 (현재 사용 중인 hops 전달)
      void loadResourceInfo(hopsToUse);
    } catch (error: any) {
      // SSH credentials가 필요한 경우 처리
      const response = error.response || error.originalError?.response;
      const statusCode = error.statusCode || response?.status;

      if (
        statusCode === 401 &&
        response?.data?.data?.requires_ssh_credentials
      ) {
        const hopsData = response.data.data.hops || [];

        //  [임시] reverse 제거 - 백엔드가 정순을 반환하는지 테스트
        logger.info(
          'K8s SSH credentials required',
          {
            hopsCount: hopsData.length,
          },
          'ImprovedOperateModal',
          'loadOverviewData'
        );

        // SSH credential 모달 열기 (원본 그대로 사용)
        setPendingHops(hopsData);
        setNeedsK8sSshCredentials(true);
        setSshCredentialModalVisible(true);
      } else {
        //  [신규] SSH 연결 실패 감지 및 재입력 요청
        const errorMessage = error.message || error.error || '';
        const isSshConnectionError =
          errorMessage.includes('SSH 연결') ||
          errorMessage.includes('SSH 접속') ||
          errorMessage.includes('연결 시간 초과') ||
          errorMessage.includes('연결할 수 없습니다') ||
          errorMessage.includes('connection timeout') ||
          errorMessage.includes('connection refused') ||
          errorMessage.includes('authentication failed');

        if (isSshConnectionError && (k8sSshHops.length > 0 || providedHops)) {
          logger.warn(
            'SSH connection failed, requesting credentials again',
            {
              error: errorMessage,
            },
            'ImprovedOperateModal',
            'loadOverviewData'
          );

          //  key를 사용하여 중복 notification 방지 (같은 key는 업데이트만 됨)
          notification.error({
            key: 'ssh-connection-error',
            message: 'SSH 연결 실패',
            description:
              'SSH 연결에 실패했습니다. 접속 정보를 다시 확인해주세요.',
            duration: 4,
          });

          // SSH credential 모달 재오픈 (재시도 모드)
          setPendingHops(
            k8sSshHops.length > 0 ? k8sSshHops : providedHops || []
          );
          setNeedsK8sSshCredentials(true);
          setSshCredentialRetry(true); // 재시도 플래그 설정
          setSshCredentialModalVisible(true);
        } else {
          //  key를 사용하여 중복 notification 방지 (같은 key는 업데이트만 됨)
          notification.error({
            key: 'data-load-error',
            message: '데이터 로드 실패',
            description: errorMessage || '알 수 없는 오류가 발생했습니다',
            duration: 4,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 리소스 정보 로드
  const loadResourceInfo = async (providedHops?: SshHop[]) => {
    if (!service) return;

    //  [수정] providedHops 우선 사용, 없으면 k8sSshHops, 마지막으로 parseHops() 사용
    const hops =
      providedHops && providedHops.length > 0
        ? providedHops
        : k8sSshHops.length > 0
          ? k8sSshHops
          : parseHops();

    // SSH credentials가 없으면 모달 표시
    if (hops.length === 0 && isKubernetesInfra()) {
      logger.warn(
        'SSH credentials not found, showing credential modal',
        {
          serviceId: service.id,
        },
        'ImprovedOperateModal',
        'loadResourceInfo'
      );

      setNeedsK8sSshCredentials(true);
      setSshCredentialModalVisible(true);
      return;
    }

    setLoadingResource(true);
    try {
      const result = await api.kubernetes.request<ResourceInfo>(
        'calculateResources',
        {
          hops,
          service_id: service?.id,
        }
      );

      if (result.data?.data) {
        const data = result.data.data;
        // data가 ResourceInfo 형태인지 확인
        if (typeof data === 'object' && data !== null && 'cpu_model' in data) {
          setResourceInfo(data);
        }
      }
    } catch (error: any) {
      logger.error(
        'Failed to load resource info',
        error,
        {
          serviceId: service?.id,
          hopsCount: hops.length,
        },
        'ImprovedOperateModal',
        'loadResourceInfo'
      );
    } finally {
      setLoadingResource(false);
    }
  };

  // 배포된 이미지 정보 로드
  const loadDeployedImageInfo = async () => {
    if (!service?.id) return;

    try {
      // 1. 마지막 성공한 배포의 details_data 조회
      const { pipelineApi } = await import('../../lib/api/pipeline');
      const deployDetail = await pipelineApi.getLastSuccessfulDeployment(
        service.id
      );

      if (deployDetail?.details_data) {
        // 배포 상세 데이터 타입 정의
        interface DeploymentDetailsData {
          deployment_type?: string;
          registry_url?: string;
          project_name?: string;
          image_tag?: string;
          deployed_image_tag?: string;
          deployed_image?: string;
          primary_deployed_image?: string;
          actual_deployed_images?: string[];
          registry?: string;
          namespace?: string;
        }
        const detailsData = deployDetail.details_data as DeploymentDetailsData;

        // 배포 상세 정보 전체 저장
        setDeploymentDetails(detailsData);

        // Docker Compose vs Kubernetes 배포 구분
        const isDockerCompose =
          detailsData.deployment_type === 'docker-compose';

        if (isDockerCompose) {
          // Docker Compose 배포 정보
          const imageName =
            detailsData.registry_url && detailsData.project_name
              ? `${detailsData.registry_url}/${detailsData.project_name}`
              : detailsData.registry_url || detailsData.project_name;

          setDeployedImageInfo({
            deployed_image_tag: detailsData.image_tag,
            deployed_image: imageName,
            registry: detailsData.registry_url,
            deployed_at: deployDetail.created_at,
          });
        } else {
          // Kubernetes 배포 정보
          setDeployedImageInfo({
            deployed_image_tag: detailsData.deployed_image_tag,
            deployed_image: detailsData.deployed_image,
            primary_deployed_image: detailsData.primary_deployed_image,
            actual_deployed_images: detailsData.actual_deployed_images,
            registry: detailsData.registry,
            namespace: detailsData.namespace,
            deployed_at: deployDetail.created_at,
          });
        }
      }

      // 2. 최신 빌드 이미지 태그 조회
      const { buildApi } = await import('../../lib/api/build');
      const buildStats = await buildApi.getBuildStatistics(service.id);

      if (buildStats?.latest_build?.details_data) {
        try {
          const details =
            typeof buildStats.latest_build.details_data === 'string'
              ? JSON.parse(buildStats.latest_build.details_data)
              : buildStats.latest_build.details_data.Valid &&
                  buildStats.latest_build.details_data.String
                ? JSON.parse(buildStats.latest_build.details_data.String)
                : buildStats.latest_build.details_data;

          if (details.image_tag) {
            setLatestBuildImageTag(details.image_tag);
          }
        } catch {
          // JSON parsing failed - ignore and continue without image tag
        }
      }
    } catch (error: any) {
      // 배포 정보가 없는 경우 (404) 조용히 무시
      if (error?.statusCode !== 404 && !error?.message?.includes('배포 기록')) {
        console.warn('[loadDeployedImageInfo] 배포 정보 조회 실패:', error);
      }
    }
  };

  // Docker 컨테이너 데이터 로드
  const loadDockerContainerData = async () => {
    logger.info(
      'loadDockerContainerData called',
      {
        infraId,
        isDockerInfra: isDockerInfra(),
        isPodmanInfra: isPodmanInfra(),
        willReturn: !infraId || !isContainerInfra(),
      },
      'ImprovedOperateModal',
      'loadDockerContainerData'
    );

    if (!infraId || !isContainerInfra()) {
      logger.warn(
        'Early return from loadDockerContainerData',
        {
          infraId,
          isDockerInfra: isDockerInfra(),
          isPodmanInfra: isPodmanInfra(),
        },
        'ImprovedOperateModal',
        'loadDockerContainerData'
      );
      return;
    }

    logger.info(
      'Loading Docker containers',
      { infraId },
      'ImprovedOperateModal',
      'loadDockerContainerData'
    );

    try {
      setLoadingContainers(true);

      // 1. Docker 서버 정보 조회
      const serverResponse = await getDockerServer(infraId);
      logger.debug(
        'Docker server response received',
        {
          success: serverResponse.success,
          hasData: !!serverResponse.data,
          hasServer: !!serverResponse.data?.server,
        },
        'ImprovedOperateModal',
        'loadDockerContainerData'
      );

      // Check if server exists in the response
      if (!serverResponse.success || !serverResponse.data?.server) {
        logger.warn(
          'No Docker server found',
          { infraId },
          'ImprovedOperateModal',
          'loadDockerContainerData'
        );
        setContainers([]);
        return;
      }

      const dockerServer = serverResponse.data.server;
      const serverId = dockerServer.id;
      setDockerServerId(serverId);
      logger.debug(
        'Found Docker server',
        { serverId },
        'ImprovedOperateModal',
        'loadDockerContainerData'
      );

      // 2. Docker 서버의 hops 정보 파싱
      let dockerHops: any[] = [];
      if (dockerServer.hops) {
        try {
          const hopsStr =
            typeof dockerServer.hops === 'string'
              ? dockerServer.hops
              : JSON.stringify(dockerServer.hops);
          dockerHops = JSON.parse(hopsStr);
          logger.debug(
            'Parsed Docker server hops',
            { hopsCount: dockerHops.length },
            'ImprovedOperateModal',
            'loadDockerContainerData'
          );

          // 3. Credential store에서 password 가져오기
          const { serverlist } = useCredsStore.getState();
          const hopsWithCredCheck = dockerHops.map((hop: any) => {
            // credential store에서 해당 host의 credential 찾기
            const cred = serverlist.find(
              s =>
                s.host === hop.host &&
                (!hop.port ||
                  s.port === hop.port ||
                  s.port === Number(hop.port)) &&
                s.userId === hop.username &&
                (infraId ? s.infraId === infraId : true)
            );

            if (cred && cred.password) {
              logger.debug(
                'Found credential for Docker hop',
                { host: hop.host },
                'ImprovedOperateModal',
                'loadDockerContainerData'
              );
              return {
                ...hop,
                password: cred.password,
                hasCredential: true,
              };
            } else {
              logger.warn(
                'No credential found for Docker hop',
                { host: hop.host, port: hop.port },
                'ImprovedOperateModal',
                'loadDockerContainerData'
              );
              return {
                ...hop,
                hasCredential: false,
              };
            }
          });

          // 4. Credential이 없는 hop 확인
          const missingCredentials = hopsWithCredCheck.filter(
            (hop: any) => !hop.hasCredential
          );

          if (missingCredentials.length > 0) {
            logger.info(
              'Missing SSH credentials detected',
              {
                totalHops: dockerHops.length,
                missingCount: missingCredentials.length,
              },
              'ImprovedOperateModal',
              'loadDockerContainerData'
            );

            // SSH Credential 모달 표시 (첫 시도)
            setPendingHops(hopsWithCredCheck);
            setDockerServerHops(hopsWithCredCheck);
            setDockerServerId(serverId);
            setSshCredentialRetry(false); // 첫 시도이므로 retry 아님
            setSshCredentialModalVisible(true);
            setLoadingContainers(false);
            return; // 모달에서 credential 입력 후 재개
          }

          dockerHops = hopsWithCredCheck;
          logger.debug(
            'Docker hops with credentials prepared',
            { hopsCount: dockerHops.length },
            'ImprovedOperateModal',
            'loadDockerContainerData'
          );
        } catch (error) {
          logger.error(
            'Failed to parse Docker hops',
            error as Error,
            { infraId },
            'ImprovedOperateModal',
            'loadDockerContainerData'
          );
        }
      }

      // Docker 서버 hops 저장 (로그 조회 등에서 사용)
      setDockerServerHops(dockerHops);

      // 3. 컨테이너 목록 조회 (SSH hops 정보 사용)
      //  compose_project를 전달하여 해당 서비스의 컨테이너만 필터링
      // Docker Compose는 Git 저장소 이름을 프로젝트 이름으로 사용하므로
      // GitLab URL에서 프로젝트 이름을 추출해야 함
      let composeProject: string | undefined;
      if (service?.gitlab_url) {
        const parts = service.gitlab_url.replace(/\/$/, '').split('/');
        composeProject = parts[parts.length - 1].replace('.git', '');
        logger.debug(
          'Extracted compose project name',
          {
            gitlabUrl: service.gitlab_url,
            composeProject,
          },
          'ImprovedOperateModal',
          'loadDockerContainerData'
        );
      }

      const runtimeType = isDockerInfra() ? 'docker' : 'podman';
      const containersData = await getContainers(
        serverId,
        {
          hops: dockerHops,
          compose_project: composeProject, // Git 저장소 이름으로 컨테이너 필터링
        },
        runtimeType
      );

      logger.info(
        `${runtimeType} containers loaded`,
        {
          serverId,
          containerCount: containersData?.containers?.length || 0,
        },
        'ImprovedOperateModal',
        'loadDockerContainerData'
      );

      if (containersData && containersData.containers) {
        setContainers(containersData.containers);
      } else {
        setContainers([]);
      }
    } catch (error) {
      logger.error(
        'Failed to load Docker containers',
        error as Error,
        { infraId },
        'ImprovedOperateModal',
        'loadDockerContainerData'
      );
      setContainers([]);

      // SSH 인증 실패 확인 (에러 메시지에 "SSH" 또는 "인증" 포함)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isSSHAuthError =
        errorMessage.includes('SSH') ||
        errorMessage.includes('인증') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('password');

      if (isSSHAuthError && dockerServerHops.length > 0) {
        // SSH 인증 실패 시 모달 재오픈
        notification.error({
          key: 'docker-ssh-error',
          message: 'SSH 접속 실패',
          description:
            'SSH 접속에 실패했습니다. 인증 정보를 다시 확인해주세요.',
          duration: 4,
        });
        setPendingHops(dockerServerHops);
        setSshCredentialRetry(true);
        setSshCredentialModalVisible(true);
      } else {
        // 기타 에러는 일반 에러 메시지 표시
        notification.error({
          key: 'container-load-error',
          message: '컨테이너 로드 실패',
          description: '컨테이너 목록을 가져오는 데 실패했습니다.',
          duration: 4,
        });
      }
    } finally {
      setLoadingContainers(false);
    }
  };

  // Docker 이미지 목록 로드
  const loadDockerImages = async () => {
    if (!infraId || !isContainerInfra() || dockerServerHops.length === 0) {
      return;
    }

    try {
      setLoadingImages(true);

      // compose_project 추출 (loadDockerContainerData와 동일한 로직)
      let composeProject: string | undefined;
      if (service?.gitlab_url) {
        const parts = service.gitlab_url.replace(/\/$/, '').split('/');
        composeProject = parts[parts.length - 1].replace('.git', '');
      }

      const runtimeType = isDockerInfra() ? 'docker' : 'podman';
      const images = await getDockerImages(
        {
          hops: dockerServerHops,
          compose_project: composeProject,
        },
        runtimeType
      );

      setDockerImages(images);
      logger.info(
        `${runtimeType} images loaded`,
        {
          imageCount: images.length,
          composeProject,
        },
        'ImprovedOperateModal',
        'loadDockerImages'
      );
    } catch (error) {
      logger.error(
        'Failed to load Docker images',
        error as Error,
        { infraId },
        'ImprovedOperateModal',
        'loadDockerImages'
      );
      setDockerImages([]);
      // notification 제거: loadDockerSystemInfo에서 통합 처리
    } finally {
      setLoadingImages(false);
    }
  };

  // Docker 볼륨 및 네트워크 목록 로드
  const loadDockerResources = async () => {
    if (!infraId || !isContainerInfra() || dockerServerHops.length === 0) {
      return;
    }

    try {
      setLoadingDockerResources(true);

      // compose_project 추출
      let composeProject: string | undefined;
      if (service?.gitlab_url) {
        const parts = service.gitlab_url.replace(/\/$/, '').split('/');
        composeProject = parts[parts.length - 1].replace('.git', '');
      }

      // 볼륨과 네트워크를 병렬로 조회
      const runtimeType = isDockerInfra ? 'docker' : 'podman';
      const [volumes, networks] = await Promise.all([
        getDockerVolumes(
          {
            hops: dockerServerHops,
            compose_project: composeProject,
          },
          runtimeType
        ),
        getDockerNetworks(
          {
            hops: dockerServerHops,
            compose_project: composeProject,
          },
          runtimeType
        ),
      ]);

      setDockerVolumes(volumes);
      setDockerNetworks(networks);
      logger.info(
        'Docker resources loaded',
        {
          volumeCount: volumes.length,
          networkCount: networks.length,
          composeProject,
        },
        'ImprovedOperateModal',
        'loadDockerResources'
      );
    } catch (error) {
      logger.error(
        'Failed to load Docker resources',
        error as Error,
        { infraId },
        'ImprovedOperateModal',
        'loadDockerResources'
      );
      setDockerVolumes([]);
      setDockerNetworks([]);
      // notification 제거: loadDockerSystemInfo에서 통합 처리
    } finally {
      setLoadingDockerResources(false);
    }
  };

  // SSH Credential 모달 완료 callback
  const handleSshCredentialComplete = async (hopsWithPassword: SshHop[]) => {
    // K8s SSH credentials 처리
    if (needsK8sSshCredentials) {
      logger.info(
        'K8s SSH credentials provided, retrying K8s resources load',
        {
          serviceId: service?.id,
          hopsCount: hopsWithPassword.length,
        },
        'ImprovedOperateModal',
        'handleSshCredentialComplete'
      );

      if (!service?.id) {
        logger.error(
          'Service ID is missing',
          undefined,
          {},
          'ImprovedOperateModal',
          'handleSshCredentialComplete'
        );
        return;
      }

      try {
        // K8s SSH hops 저장 (React 상태)
        setK8sSshHops(hopsWithPassword);

        //  [신규] 중복 제거: 동일한 infraId + serviceId의 기존 항목 모두 제거
        const { serverlist } = useCredsStore.getState();

        // 제거할 인덱스를 먼저 수집 (내림차순 정렬하여 역순 제거)
        const indicesToRemove = serverlist
          .map((s, idx) => ({ item: s, idx }))
          .filter(
            ({ item }) =>
              item.infraId === infraId && item.serviceId === service.id
          )
          .map(({ idx }) => idx)
          .sort((a, b) => b - a); // 큰 인덱스부터 제거 (역순)

        // 역순으로 제거 (인덱스 변경 문제 방지)
        indicesToRemove.forEach(idx => {
          useCredsStore.getState().removeServer(idx);
        });

        //  [수정] creds-store에 새로운 SSH credentials 저장 (hopOrder 포함)
        hopsWithPassword.forEach((hop, index) => {
          upsertServerByHostPort({
            host: hop.host,
            port: hop.port,
            userId: hop.username,
            password: hop.password,
            infraId: infraId,
            serviceId: service.id,
            hopOrder: index, // SSH hop 순서 저장
          });
        });

        setNeedsK8sSshCredentials(false);
        setSshCredentialModalVisible(false);

        // SSH hops를 API가 요구하는 형태로 변환
        const convertedHops = hopsWithPassword.map(h => ({
          host: h.host,
          port: h.port,
          username: h.username || '',
          password: h.password || '',
        }));

        //  [수정] K8s 전체 Overview 데이터 로드 (Pods 포함)
        // convertedHops를 providedHops로 전달하여 loadOverviewData에서 사용
        await loadOverviewData(convertedHops);

        logger.info(
          'K8s overview data loaded after credential input',
          {
            serviceId: service.id,
          },
          'ImprovedOperateModal',
          'handleSshCredentialComplete'
        );

        //  Legacy toast 제거: notification은 loadOverviewData 내부에서 표시됨
        // message.success('SSH 접속에 성공했습니다.');
      } catch (error) {
        logger.error(
          'Failed to load K8s resources after credential input',
          error as Error,
          {},
          'ImprovedOperateModal',
          'handleSshCredentialComplete'
        );
        //  Legacy toast 제거: notification은 loadOverviewData 내부에서 표시됨
        // message.error('SSH 접속에 실패했습니다. 인증 정보를 다시 확인해주세요.');

        // 인증 실패 시 모달 재오픈
        setSshCredentialRetry(true);
        setSshCredentialModalVisible(true);
      }
      return;
    }

    // Docker container SSH credentials 처리
    if (!dockerServerId) {
      logger.error(
        'SSH credential completed but dockerServerId is null',
        undefined,
        {},
        'ImprovedOperateModal',
        'handleSshCredentialComplete'
      );
      return;
    }

    logger.info(
      'SSH credentials provided, loading containers',
      {
        serverId: dockerServerId,
        hopsCount: hopsWithPassword.length,
      },
      'ImprovedOperateModal',
      'handleSshCredentialComplete'
    );

    try {
      setLoadingContainers(true);

      // Docker 서버 hops 저장
      setDockerServerHops(hopsWithPassword);

      // 컨테이너 목록 조회
      //  compose_project를 전달하여 해당 서비스의 컨테이너만 필터링
      // Docker Compose는 Git 저장소 이름을 프로젝트 이름으로 사용
      let composeProject: string | undefined;
      if (service?.gitlab_url) {
        const parts = service.gitlab_url.replace(/\/$/, '').split('/');
        composeProject = parts[parts.length - 1].replace('.git', '');
      }

      const runtimeType = isDockerInfra() ? 'docker' : 'podman';
      const containersData = await getContainers(
        dockerServerId,
        {
          hops: hopsWithPassword,
          compose_project: composeProject, // Git 저장소 이름으로 컨테이너 필터링,
        },
        runtimeType
      );

      logger.info(
        'Docker containers loaded after credential input',
        {
          serverId: dockerServerId,
          containerCount: containersData?.containers?.length || 0,
        },
        'ImprovedOperateModal',
        'handleSshCredentialComplete'
      );

      if (containersData && containersData.containers) {
        setContainers(containersData.containers);
      } else {
        setContainers([]);
      }
    } catch (error) {
      logger.error(
        'Failed to load Docker containers after credential input',
        error as Error,
        {
          serverId: dockerServerId,
        },
        'ImprovedOperateModal',
        'handleSshCredentialComplete'
      );
      setContainers([]);
      //  Legacy toast 제거: notification은 loadDockerSystemInfo 내부에서 표시됨
      // message.error('SSH 접속에 실패했습니다. 인증 정보를 다시 확인해주세요.');

      // 인증 실패 시 모달 재오픈하여 사용자가 다시 입력할 수 있도록 함
      setSshCredentialRetry(true); // 재시도임을 표시
      setSshCredentialModalVisible(true);
    } finally {
      setLoadingContainers(false);
    }
  };

  // Metrics Server 상태 확인
  const checkMetricsServerStatus = async () => {
    if (!service?.id) return;

    // Docker 인프라는 Metrics Server 체크 불필요
    if (isContainerInfra()) {
      return;
    }

    try {
      setLoadingMetricsStatus(true);

      //  SSH hops를 checkMetricsServer에 전달 (DB fallback 시 SSH 인증 실패 방지)
      const hopsToUse =
        k8sSshHops.length > 0
          ? k8sSshHops.map(h => ({
              host: h.host,
              port: h.port,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      // 먼저 기본 상태 확인
      const status = await checkMetricsServer(service.id, hopsToUse);
      setMetricsServerStatus(status);

      // 준비되지 않았다면 진단 정보도 가져오기
      if (status.installed && !status.ready) {
        const detailedStatus = await getMetricsServerStatus(
          service.id,
          hopsToUse
        );

        setMetricsServerDiagnostics(detailedStatus.diagnostics || null);

        // 진단 정보가 있으면 자동으로 표시
        if (detailedStatus.diagnostics) {
          setShowDiagnostics(true);
        }
      } else {
        setMetricsServerDiagnostics(null);
        setShowDiagnostics(false);
      }

      // Metrics Server가 Ready 상태가 되면 자동으로 Pod 메트릭 로드
      if (status?.ready && pods.length > 0) {
        await loadPodMetrics();
      }

      return status;
    } catch (_error: unknown) {
      return null;
    } finally {
      setLoadingMetricsStatus(false);
    }
  };

  // Metrics Server 설치
  const handleInstallMetricsServer = async () => {
    if (!service?.id) {
      console.error('[Metrics Server] service.id가 없음');
      return;
    }

    try {
      setInstallingMetrics(true);
      //  Toast 제거: 설치 진행 상태는 UI 버튼으로 표시됨
      // message.loading({ content: 'Metrics Server 설치 중...', key: 'metrics-install' });

      //  SSH hops를 installMetricsServer에 전달
      const hopsToUse =
        k8sSshHops.length > 0
          ? k8sSshHops.map(h => ({
              host: h.host,
              port: h.port,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const result = await installMetricsServer(service.id, hopsToUse);

      // 초기 Pod 상태 확인 - 이미지 pull 문제 조기 감지
      if (result.pod_status) {
        // ImagePullBackOff 또는 ErrImagePull 감지
        if (
          result.pod_status.includes('ImagePullBackOff') ||
          result.pod_status.includes('ErrImagePull')
        ) {
          //  Toast 제거: 상태는 UI에서 확인 가능
          // message.warning({
          //   content: 'Metrics Server 이미지를 가져오는 데 문제가 발생했습니다. 네트워크 상태를 확인하세요.',
          //   key: 'metrics-install',
          //   duration: 8,
          // });
        } else {
          //  Toast 제거: 설치 시작 상태는 UI 버튼에서 확인 가능
          // message.success({
          //   content: 'Metrics Server 설치를 시작했습니다. 준비 상태를 확인하는 중...',
          //   key: 'metrics-install',
          //   duration: 3,
          // });
        }
      } else {
        //  Toast 제거: 설치 시작 상태는 UI 버튼에서 확인 가능
        // message.success({
        //   content: 'Metrics Server 설치를 시작했습니다. 준비 상태를 확인하는 중...',
        //   key: 'metrics-install',
        //   duration: 3,
        // });
      }

      // 설치 후 자동 폴링 시작 (최대 2분간 10초마다 확인)
      let pollCount = 0;
      const maxPolls = 12; // 2분 (10초 x 12)

      const pollStatus = async () => {
        pollCount++;
        const status = await checkMetricsServerStatus();

        if (status?.ready) {
          // 준비 완료!
          //  Toast 제거: 상태는 UI에서 확인 가능
          // message.success({
          //   content: 'Metrics Server가 정상 작동 중입니다!',
          //   key: 'metrics-poll',
          //   duration: 3,
          // });
          setInstallingMetrics(false);
        } else if (pollCount >= maxPolls) {
          // 타임아웃
          //  Toast 제거: 상태는 UI 버튼 및 메트릭스 표시로 확인 가능
          // message.warning({
          //   content: 'Metrics Server 준비에 시간이 걸리고 있습니다. "상태 새로고침"을 눌러 확인하거나 "재설치"를 시도하세요.',
          //   key: 'metrics-poll',
          //   duration: 8,
          // });
          setInstallingMetrics(false);
        } else {
          // 계속 대기
          //  Toast 제거: 설치 진행 상태는 UI 로딩 스피너로 확인 가능
          // message.loading({
          //   content: `Metrics Server 준비 중... (${pollCount}/${maxPolls})`,
          //   key: 'metrics-poll',
          // });
          setTimeout(() => {
            void pollStatus();
          }, 10000); // 10초 후 재시도
        }
      };

      // 첫 확인은 15초 후
      setTimeout(() => {
        void pollStatus();
      }, 15000);
    } catch (error: any) {
      console.error('[Metrics Server] 설치 실패', error);
      //  Toast 제거: 에러는 notification으로 표시됨
      // message.error({
      //   content: `설치 실패: ${error.message}`,
      //   key: 'metrics-install'
      // });
      setInstallingMetrics(false);
    }
  };

  // Metrics Server 노드 이미지 캐시 정리
  const handleCleanMetricsServerNode = async () => {
    if (!service?.id) return;

    try {
      //  Toast 제거: 로딩 상태는 UI 버튼으로 표시됨
      // message.loading({ content: '이미지 캐시 정리 중...', key: 'clean-cache' });

      await cleanMetricsServerNode(service.id);

      //  Toast 제거: 성공 메시지는 notification으로 표시됨
      // message.success({
      //   content: `${result.nodeName || '노드'}의 이미지 캐시를 정리하고 Pod를 재시작했습니다.`,
      //   key: 'clean-cache',
      //   duration: 5,
      // });

      // 정리 후 상태 확인 (15초 후)
      setTimeout(() => {
        void checkMetricsServerStatus();
        //  Toast 제거: 상태 확인은 UI에서 진행됨
        // message.info('상태를 확인 중입니다. 1-2분 후 다시 확인해주세요.');
      }, 15000);
    } catch (_error: unknown) {
      //  Toast 제거: 에러는 notification으로 표시됨
      // message.error({
      //   content: `이미지 캐시 정리 실패: ${error.message}`,
      //   key: 'clean-cache'
      // });
    }
  };

  // Pod 메트릭스 로드 (CPU/메모리 사용량)
  const loadPodMetrics = async () => {
    if (!service?.id) return;

    // Metrics Server 상태가 이미 확인되었고 Ready가 아니면 API 호출하지 않음
    if (metricsServerStatus && !metricsServerStatus.ready) {
      return;
    }

    try {
      //  SSH hops를 getPodMetrics에 전달 (DB fallback 시 SSH 인증 실패 방지)
      const hopsToUse =
        k8sSshHops.length > 0
          ? k8sSshHops.map(h => ({
              host: h.host,
              port: h.port,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const metricsData = await getPodMetrics(service.id, hopsToUse);

      // 기존 pods 배열과 메트릭스 데이터 병합
      setPods(prevPods => {
        const updatedPods = prevPods.map(pod => {
          const metric = metricsData.metrics.find(m => m.pod_name === pod.name);

          if (!metric) {
            // 메트릭 데이터 없음 - 기본값 사용
          } else {
            // 메트릭 데이터 있음 - 업데이트 진행
          }

          return {
            ...pod,
            cpuUsage: metric?.cpu_usage,
            memoryUsage: metric?.memory_usage,
          };
        });

        return updatedPods;
      });
    } catch (_error: unknown) {
      // Metrics Server 상태 확인 (에러 발생 시에만, 상태가 아직 확인되지 않은 경우)
      if (!metricsServerStatus) {
        //  SSH hops를 checkMetricsServer에 전달
        const hopsToUse =
          k8sSshHops.length > 0
            ? k8sSshHops.map(h => ({
                host: h.host,
                port: h.port,
                username: h.username || '',
                password: h.password || '',
              }))
            : undefined;
        const status = await checkMetricsServer(service.id, hopsToUse);
        setMetricsServerStatus(status);

        if (!status?.installed) {
          // 설치되지 않은 경우
        } else if (!status?.ready) {
          // 설치되었지만 준비 안됨
        }
      }
      // Metrics Server가 없어도 계속 진행 - CPU/메모리는 "-"로 표시됨
    }
  };

  // Pod 상세 정보 로드 (Pending Pod 이벤트 조회)
  const loadPodDetails = async (podName: string) => {
    if (!service?.id) return;

    try {
      const podDescription = await describePod({
        service_id: service.id,
        pod_name: podName,
      });

      // 해당 Pod에 이벤트 정보 추가
      setPods(prevPods =>
        prevPods.map(pod =>
          pod.name === podName ? { ...pod, events: podDescription.events } : pod
        )
      );
    } catch (_error: unknown) {
      // Pod 상세 정보 로드 실패 시 조용히 무시
    }
  };

  // 로그 조회
  const handleGetLogs = async () => {
    if (!service || !selectedPod) {
      //  Toast 제거: validation 오류
      // message.warning('Pod를 선택해주세요.');
      return;
    }

    //  [수정] localStorage(k8sSshHops)에서 SSH credentials 사용
    const hops = k8sSshHops.length > 0 ? k8sSshHops : parseHops();

    // SSH credentials가 없으면 모달 표시
    if (hops.length === 0 && isKubernetesInfra()) {
      logger.warn(
        'SSH credentials not found for logs, showing credential modal',
        {
          serviceId: service.id,
          podName: selectedPod,
        },
        'ImprovedOperateModal',
        'handleGetLogs'
      );

      setNeedsK8sSshCredentials(true);
      setSshCredentialModalVisible(true);
      return;
    }

    setLoadingLogs(true);
    setLogs('로그 조회 중...\n');

    try {
      const namespace = service.namespace || 'default';

      const logsResult = await api.kubernetes.request<{
        success: boolean;
        logs?: string;
      }>('getPodLogs', {
        namespace,
        pod_name: selectedPod,
        hops,
        lines: 100,
      });

      if (logsResult.data?.data) {
        const logsData = logsResult.data.data as any;
        setLogs(logsData.logs || '로그가 없습니다.');
      } else {
        setLogs(`오류: ${(logsResult.data as any)?.error || '로그 조회 실패'}`);
      }
    } catch (error: any) {
      setLogs(`오류 발생: ${error.message || '알 수 없는 오류'}`);
      //  Toast 제거: 에러는 로그 창에 표시됨
      // message.error('로그 조회에 실패했습니다.');
      logger.error(
        'Failed to get pod logs',
        error,
        {
          serviceId: service.id,
          podName: selectedPod,
          hopsCount: hops.length,
        },
        'ImprovedOperateModal',
        'handleGetLogs'
      );
    } finally {
      setLoadingLogs(false);
    }
  };

  // Docker 컨테이너 로그 조회
  const handleGetDockerLogs = async () => {
    if (!dockerServerId || !selectedContainer) {
      //  Toast 제거: validation 오류
      // message.warning('컨테이너를 선택해주세요.');
      return;
    }

    // SSH credentials 확인
    if (dockerServerHops.length === 0) {
      logger.warn(
        'SSH credentials not found for Docker logs, showing credential modal',
        {
          dockerServerId,
          selectedContainer,
        },
        'ImprovedOperateModal',
        'handleGetDockerLogs'
      );

      setSshCredentialModalVisible(true);
      return;
    }

    setLoadingLogs(true);
    setLogs('로그 조회 중...\n');

    const runtimeType = isDockerInfra() ? 'docker' : 'podman';
    try {
      // Docker 서버의 hops 사용
      const logsResult = await getDockerLogs(
        dockerServerId,
        selectedContainer,
        { hops: dockerServerHops },
        100, // 최근 100줄
        runtimeType
      );

      //  수정: 올바른 응답 경로 사용
      // getDockerLogs는 ApiResponse<{ logs: ... }>를 반환, 실제 로그는 data.data에 있음
      const logsData = logsResult.data as { logs?: string } | undefined;
      logger.debug(
        'Docker logs result',
        {
          hasData: !!logsResult.data,
          hasLogs: !!logsData?.logs,
          logsLength: logsData?.logs?.length,
          success: logsResult.success,
        },
        'ImprovedOperateModal',
        'handleGetDockerLogs'
      );

      if (logsData?.logs) {
        setLogs(logsData.logs);
      } else if (logsResult.error) {
        setLogs(`오류: ${logsResult.error}`);
      } else {
        setLogs('로그가 없습니다.');
      }
    } catch (error) {
      logger.error(
        'Failed to get Docker logs',
        error as Error,
        {
          dockerServerId,
          containerId: selectedContainer,
        },
        'ImprovedOperateModal',
        'handleGetDockerLogs'
      );
      setLogs(`오류 발생: ${(error as Error).message || '알 수 없는 오류'}`);
      //  Toast 제거: 에러는 로그 창에 표시됨
      // message.error('로그 조회에 실패했습니다.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // 명령어 실행
  const handleExecuteCommand = async () => {
    if (!commandInput.trim()) {
      //  Toast 제거: validation 오류
      // message.warning('명령어를 입력해주세요.');
      return;
    }

    if (!service) {
      //  Toast 제거: validation 오류
      // message.error('서비스 정보가 없습니다.');
      return;
    }

    setExecutingCommand(true);
    const command = commandInput.trim();

    // Add execution context header
    const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    let contextHeader = '';

    if (isContainerInfra()) {
      const containerName = selectedContainerId
        ? containers.find(c => c.id === selectedContainerId)?.name ||
          selectedContainerId.substring(0, 12)
        : '호스트';
      contextHeader = `━━━ [${timestamp}] ${containerName} ━━━\n`;
    } else {
      contextHeader = `━━━ [${timestamp}] SSH 명령 실행 ━━━\n`;
    }

    setCommandOutput(prev => {
      const separator = prev.length > 0 ? '\n' : '';
      return prev + separator + contextHeader + `$ ${command}\n`;
    });

    try {
      // Docker 환경인 경우
      if (isContainerInfra()) {
        // dockerServerHops 사용
        const hops =
          dockerServerHops.length > 0 ? dockerServerHops : parseHops();

        // SSH credentials가 없으면 모달 표시
        if (hops.length === 0) {
          logger.warn(
            'SSH credentials not found for Docker command execution, showing credential modal',
            {
              serviceId: service.id,
              command,
            },
            'ImprovedOperateModal',
            'handleExecuteCommand'
          );

          setSshCredentialModalVisible(true);
          setExecutingCommand(false);
          return;
        }

        // compose_project 추출 (loadDockerContainerData와 동일한 로직)
        let composeProject: string | undefined;
        if (service?.gitlab_url) {
          const parts = service.gitlab_url.replace(/\/$/, '').split('/');
          composeProject = parts[parts.length - 1].replace('.git', '');
        }

        const authData = {
          hops,
          compose_project: composeProject || '',
        };

        const result = await executeCommand(
          authData,
          command,
          selectedContainerId || undefined
        );

        if (result.success) {
          setCommandOutput(prev => prev + (result.output || '') + '\n');
        } else {
          setCommandOutput(
            prev => prev + `오류: ${result.error || '명령어 실행 실패'}\n`
          );
        }
      } else {
        // Kubernetes 환경인 경우
        //  [수정] localStorage(k8sSshHops)에서 SSH credentials 사용
        const hops = k8sSshHops.length > 0 ? k8sSshHops : parseHops();

        // SSH credentials가 없으면 모달 표시
        if (hops.length === 0) {
          logger.warn(
            'SSH credentials not found for K8s command execution, showing credential modal',
            {
              serviceId: service.id,
              command,
            },
            'ImprovedOperateModal',
            'handleExecuteCommand'
          );

          setNeedsK8sSshCredentials(true);
          setSshCredentialModalVisible(true);
          setExecutingCommand(false);
          return;
        }

        const result = await api.kubernetes.request<{
          success: boolean;
          output?: string;
          error?: string;
        }>('executeCommand', {
          command,
          hops,
          namespace: service.namespace || 'default',
        });

        if (result.data?.data) {
          const response = result.data.data as any;
          setCommandOutput(prev => prev + (response.output || '') + '\n');
        } else {
          setCommandOutput(
            prev =>
              prev +
              `오류: ${(result.data as any)?.error || '명령어 실행 실패'}\n`
          );
        }
      }
    } catch (error: any) {
      setCommandOutput(
        prev => prev + `오류 발생: ${error.message || '알 수 없는 오류'}\n`
      );
      message.error('명령어 실행에 실패했습니다.');
      logger.error(
        'Failed to execute command',
        error,
        {
          serviceId: service.id,
          command,
          infraType: service.infraType,
        },
        'ImprovedOperateModal',
        'handleExecuteCommand'
      );
    } finally {
      setExecutingCommand(false);
      setCommandInput('');
    }
  };

  // Deployment 변경 핸들러
  const handleDeploymentChange = async (deploymentName: string) => {
    setSelectedDeployment(deploymentName);

    // Deployment 변경 시 이전 HPA 데이터 즉시 초기화
    // (새로운 Deployment의 HPA는 useEffect에서 로드됨)
    setHpaData(null);

    // 선택된 Deployment의 상태 업데이트
    const deployment = deployments.find(
      d => d.metadata?.name === deploymentName
    );
    if (deployment) {
      const status = deployment.status || {};
      setDeploymentStatus({
        replicas: status.replicas || 0,
        availableReplicas: status.availableReplicas || 0,
        updatedReplicas: status.updatedReplicas || 0,
      });
    }
  };

  // selectedDeployment 또는 hpaList 변경 시 HPA 정보 업데이트
  React.useEffect(() => {
    if (selectedDeployment) {
      void loadHPA();
    }
  }, [selectedDeployment, hpaList]);

  // Deployment 스케일링
  const handleScaleDeployment = async () => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    if (!selectedDeployment) {
      message.error('Deployment를 선택하세요.');
      return;
    }

    setScalingLoading(true);
    try {
      const result = await scaleDeployment({
        service_id: service.id,
        deployment_name: selectedDeployment,
        replicas: scalingReplicas,
      });

      message.success(result.message || '스케일링이 완료되었습니다.');
      // 개요 데이터 새로고침
      void loadOverviewData();
    } catch (error: any) {
      message.error('스케일링 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setScalingLoading(false);
    }
  };

  // 전체 HPA 목록 조회 (모든 Deployment의 HPA 상태 확인용)
  const loadAllHPAs = async (providedHops?: SshHop[]) => {
    if (!service?.id) {
      setHpaList([]);
      return;
    }

    try {
      //  [수정] providedHops 우선 사용, 없으면 k8sSshHops 사용 (getK8sResources와 동일한 로직)
      const hopsSource =
        providedHops && providedHops.length > 0
          ? providedHops
          : k8sSshHops.length > 0
            ? k8sSshHops
            : undefined;

      // SSH hops를 API가 요구하는 형태로 변환
      const hopsToUse = hopsSource
        ? hopsSource.map(h => ({
            host: h.host,
            port: h.port,
            username: h.username || '',
            password: h.password || '',
          }))
        : undefined;

      const data = await getHPA(service.id, hopsToUse);

      // kubectl get hpa -o json 형식: { items: [...] }
      if (data && data.items && Array.isArray(data.items)) {
        // 모든 HPA 항목을 파싱하여 HPAInfo 형식으로 변환
        const parsedHPAList: HPAInfo[] = data.items.map(
          (hpa: {
            metadata?: { name?: string; namespace?: string };
            spec?: {
              scaleTargetRef?: {
                apiVersion?: string;
                kind?: string;
                name?: string;
              };
              minReplicas?: number;
              maxReplicas?: number;
              targetCPUUtilizationPercentage?: number;
              metrics?: Array<{
                resource?: { target?: { averageUtilization?: number } };
              }>;
            };
            status?: {
              currentReplicas?: number;
              desiredReplicas?: number;
              currentCPUUtilizationPercentage?: number;
            };
          }) => ({
            name: hpa.metadata?.name || '',
            namespace: hpa.metadata?.namespace || 'default',
            targetRef: `${hpa.spec?.scaleTargetRef?.kind || 'Deployment'}/${hpa.spec?.scaleTargetRef?.name || ''}`,
            targetDeployment: hpa.spec?.scaleTargetRef?.name || '',
            minReplicas: hpa.spec?.minReplicas || 0,
            maxReplicas: hpa.spec?.maxReplicas || 0,
            currentReplicas: hpa.status?.currentReplicas || 0,
            targetCPU:
              hpa.spec?.targetCPUUtilizationPercentage ||
              hpa.spec?.metrics?.[0]?.resource?.target?.averageUtilization,
            currentCPU: hpa.status?.currentCPUUtilizationPercentage,
          })
        );

        setHpaList(parsedHPAList);
      } else {
        setHpaList([]);
      }
    } catch {
      // HPA list fetch failed - reset to empty list
      setHpaList([]);
    }
  };

  // HPA 조회 (선택된 Deployment의 HPA만)
  const loadHPA = async () => {
    if (!service?.id || !selectedDeployment) {
      setHpaData(null);
      return;
    }

    // hpaList에서 선택된 Deployment에 해당하는 HPA 찾기
    const hpa = hpaList.find(
      (item: any) => item.targetDeployment === selectedDeployment
    );

    if (hpa) {
      setHpaData(hpa);
    } else {
      setHpaData(null);
    }
  };

  // Deployment가 HPA를 가지고 있는지 확인하는 헬퍼 함수
  const _hasHPA = (deploymentName: string): boolean => {
    return hpaList.some((hpa: any) => hpa.targetDeployment === deploymentName);
  };

  // HPA 생성
  const handleCreateHPA = async (values: any) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    if (!selectedDeployment) {
      message.error('Deployment를 선택하세요.');
      return;
    }

    setLoadingHPA(true);
    try {
      const result = await createHPA({
        service_id: service.id,
        deployment_name: selectedDeployment,
        min_replicas: values.minReplicas,
        max_replicas: values.maxReplicas,
        target_cpu_percent: values.targetCPU,
      });

      message.success(result.message || 'HPA가 생성되었습니다.');
      setShowHPAForm(false);
      void loadHPA();
    } catch (error: any) {
      message.error('HPA 생성 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setLoadingHPA(false);
    }
  };

  // HPA 삭제
  const handleDeleteHPA = async (hpaName: string) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    setLoadingHPA(true);
    try {
      const result = await deleteHPA({
        service_id: service.id,
        hpa_name: hpaName,
      });

      message.success(result.message || 'HPA가 삭제되었습니다.');
      await loadHPA();
    } catch (error: any) {
      const errorMessage = error.message || '알 수 없는 오류';

      if (
        error.code === 'NOT_FOUND' ||
        errorMessage.includes('존재하지 않습니다')
      ) {
        message.warning(errorMessage);
      } else {
        message.error('HPA 삭제 실패: ' + errorMessage);
      }

      await loadHPA();
    } finally {
      setLoadingHPA(false);
    }
  };

  // Rollout 히스토리 조회
  const loadRolloutHistory = async () => {
    if (!service?.id) return;

    if (!selectedDeployment) {
      setRolloutHistory('Deployment를 선택하세요.');
      return;
    }

    setLoadingRollout(true);
    try {
      //  [수정] SSH hops 정보 전달 (500 에러 방지)
      const hopsToUse =
        k8sSshHops.length > 0
          ? k8sSshHops.map(h => ({
              host: h.host,
              port: h.port || 22,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const result = await getRolloutHistory({
        service_id: service.id,
        deployment_name: selectedDeployment,
        hops: hopsToUse,
      });

      setRolloutHistory(result.history || '히스토리가 없습니다.');
    } catch (error: any) {
      setRolloutHistory(
        '히스토리 조회 실패: ' + (error.message || '알 수 없는 오류')
      );
    } finally {
      setLoadingRollout(false);
    }
  };

  // 노드 목록 조회 (K8s Ops 탭용)
  const _loadNodeList = async () => {
    if (!infraId) {
      return;
    }

    setLoadingNodeList(true);
    try {
      const result = await getNodeList({ infra_id: infraId });

      // JSON 파싱
      const nodesData = result.nodes ? JSON.parse(result.nodes) : null;

      if (nodesData && nodesData.items) {
        const nodes: NodeInfo[] = nodesData.items.map((node: any) => ({
          name: node.metadata.name,
          status:
            node.status.conditions?.find((c: any) => c.type === 'Ready')
              ?.status === 'True'
              ? 'Ready'
              : 'NotReady',
          roles: node.metadata.labels?.['node-role.kubernetes.io/master']
            ? 'master'
            : node.metadata.labels?.['node-role.kubernetes.io/control-plane']
              ? 'control-plane'
              : 'worker',
          age: node.metadata.creationTimestamp,
          version: node.status.nodeInfo.kubeletVersion,
        }));
        setNodeList(nodes);
      }
    } catch {
      // Node list fetch failed - optional feature, silently ignore
    } finally {
      setLoadingNodeList(false);
    }
  };

  // Rollout 롤백
  const _handleRollback = async (revision?: number) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    if (!selectedDeployment) {
      message.error('Deployment를 선택하세요.');
      return;
    }

    setLoadingRollout(true);
    try {
      //  [수정] SSH hops 정보 전달 (500 에러 방지)
      const hopsToUse =
        k8sSshHops.length > 0
          ? k8sSshHops.map(h => ({
              host: h.host,
              port: h.port || 22,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const result = await rolloutUndo({
        service_id: service.id,
        deployment_name: selectedDeployment,
        revision,
        hops: hopsToUse,
      });

      message.success(result.message || '롤백이 완료되었습니다.');
      void loadRolloutHistory();
      void loadOverviewData();
    } catch (error: any) {
      message.error('롤백 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setLoadingRollout(false);
    }
  };

  // Pod 삭제 (재시작)
  const handleDeletePod = async (podName: string) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    try {
      //  [수정] SSH hops 정보 전달 (500 에러 방지)
      const hopsToUse =
        k8sSshHops.length > 0
          ? k8sSshHops.map(h => ({
              host: h.host,
              port: h.port || 22,
              username: h.username || '',
              password: h.password || '',
            }))
          : undefined;

      const result = await deletePod({
        service_id: service.id,
        pod_name: podName,
        hops: hopsToUse,
      });

      message.success(
        (result.message || 'Pod가 삭제되었습니다.') +
          ' 잠시 후 화면을 새로고침합니다...'
      );

      // Pod 삭제가 완료될 때까지 대기 (2초 대기 후 새로고침)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Pod 목록 새로고침
      await loadOverviewData();
    } catch (error: any) {
      message.error('Pod 삭제 실패: ' + (error.message || '알 수 없는 오류'));
    }
  };

  // Pending Pod 일괄 삭제
  const handleBulkDeletePendingPods = async () => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    // Pending 상태인 Pod 필터링
    const pendingPods = pods.filter(
      pod => pod.status.toLowerCase() === 'pending'
    );

    if (pendingPods.length === 0) {
      message.warning('삭제할 Pending 상태의 Pod가 없습니다.');
      return;
    }

    //  [수정] SSH hops 정보 준비 (500 에러 방지)
    const hopsToUse =
      k8sSshHops.length > 0
        ? k8sSshHops.map(h => ({
            host: h.host,
            port: h.port || 22,
            username: h.username || '',
            password: h.password || '',
          }))
        : undefined;

    const hideLoading = message.loading({
      content: `${pendingPods.length}개의 Pending Pod를 삭제하는 중...`,
      duration: 0,
      key: 'bulk-delete',
    });

    let successCount = 0;
    let failCount = 0;

    try {
      // 모든 Pending Pod를 순차적으로 삭제
      for (const pod of pendingPods) {
        try {
          await deletePod({
            service_id: service.id,
            pod_name: pod.name,
            hops: hopsToUse,
          });
          successCount++;
        } catch {
          // Pod deletion failed - increment failure counter
          failCount++;
        }
      }

      hideLoading();

      if (failCount === 0) {
        message.success({
          content: `${successCount}개의 Pending Pod를 모두 삭제했습니다. 잠시 후 화면을 새로고침합니다...`,
          key: 'bulk-delete-result',
          duration: 3,
        });
      } else {
        message.warning({
          content: `${successCount}개 성공, ${failCount}개 실패했습니다. 잠시 후 화면을 새로고침합니다...`,
          key: 'bulk-delete-result',
          duration: 3,
        });
      }

      // Pod 삭제가 완료될 때까지 대기 (3초 대기 후 새로고침)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Pod 목록 새로고침
      await loadOverviewData();
    } catch (error: any) {
      hideLoading();
      message.error({
        content:
          'Pending Pod 일괄 삭제 실패: ' + (error.message || '알 수 없는 오류'),
        key: 'bulk-delete-error',
      });
    }
  };

  // 전체 Pod 제거 (스케일을 0으로)
  const handleScaleToZero = async () => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    if (!selectedDeployment) {
      message.error('Deployment를 선택하세요.');
      return;
    }

    setScalingLoading(true);
    try {
      const _result = await scaleDeployment({
        service_id: service.id,
        deployment_name: selectedDeployment,
        replicas: 0,
      });

      message.success(
        '모든 Pod 제거 요청이 전송되었습니다. 잠시 후 화면을 새로고침합니다...'
      );

      // Pod 삭제가 완료될 때까지 대기 (3초 대기 후 새로고침)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 화면 새로고침
      await loadOverviewData();

      message.success('Pod 제거가 완료되었습니다.');
    } catch (error: any) {
      message.error('스케일링 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setScalingLoading(false);
    }
  };

  // Ingress 목록 조회
  const handleLoadIngresses = async () => {
    if (!service?.id) return;

    setLoadingIngress(true);
    try {
      const k8sResources = await getK8sResources(service.id);
      if (k8sResources.ingresses) {
        //  [수정] 원본 Kubernetes Ingress 객체를 그대로 사용 (테이블이 metadata, spec 구조를 기대함)
        setIngressList(k8sResources.ingresses as any);
      } else {
        setIngressList([]);
      }
    } catch (error: any) {
      message.error(
        'Ingress 조회 실패: ' + (error.message || '알 수 없는 오류')
      );
      setIngressList([]);
    } finally {
      setLoadingIngress(false);
    }
  };

  // Ingress 생성
  const _handleCreateIngress = async (values: any) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    setLoadingIngress(true);
    try {
      const rules: IngressRule[] = [
        {
          host: values.host,
          paths: [
            {
              path: values.path || '/',
              pathType: values.pathType || 'Prefix',
              serviceName: values.serviceName,
              servicePort: parseInt(values.servicePort, 10),
            },
          ],
        },
      ];

      const tls: IngressTLS[] | undefined = values.enableTLS
        ? [
            {
              hosts: [values.host],
              secretName: values.tlsSecretName || `${values.ingressName}-tls`,
            },
          ]
        : undefined;

      const result = await createIngress({
        service_id: service.id,
        ingress_name: values.ingressName,
        rules,
        tls,
        annotations: values.annotations
          ? JSON.parse(values.annotations)
          : undefined,
      });

      message.success(result.message || 'Ingress가 생성되었습니다.');
      setShowIngressForm(false);
      ingressForm.resetFields();
      void handleLoadIngresses();

      // 생성 후 Resources 탭에서 확인할 수 있도록 안내
      Modal.info({
        title: 'Ingress가 생성되었습니다',
        content: (
          <div>
            <p>Ingress 리소스가 성공적으로 생성되었습니다.</p>
            <p>
              <strong>Resources 탭</strong>에서 YAML을 편집하거나 자세한 정보를
              확인할 수 있습니다.
            </p>
          </div>
        ),
        okText: '확인',
      });
    } catch (error: any) {
      message.error(
        'Ingress 생성 실패: ' + (error.message || '알 수 없는 오류')
      );
    } finally {
      setLoadingIngress(false);
    }
  };

  // YAML 보기 (배포 관리 탭용)
  const _handleViewYaml = async (
    resourceType: string,
    resourceName: string
  ) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    setYamlViewTitle(`${resourceType}/${resourceName} YAML`);
    setYamlViewModalVisible(true);
    setYamlViewLoading(true);
    setYamlViewContent('');

    try {
      const yaml = await getK8sResourceYaml({
        service_id: service.id,
        resource_type: resourceType,
        resource_name: resourceName,
      });
      setYamlViewContent(yaml);
    } catch (error: any) {
      message.error('YAML 조회 실패: ' + (error.message || '알 수 없는 오류'));
      setYamlViewModalVisible(false);
    } finally {
      setYamlViewLoading(false);
    }
  };

  // Ingress 삭제
  const _handleDeleteIngress = async (ingressName: string) => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    setLoadingIngress(true);
    try {
      const result = await deleteIngress({
        service_id: service.id,
        ingress_name: ingressName,
      });

      message.success(result.message || 'Ingress가 삭제되었습니다.');
      void handleLoadIngresses();
    } catch (error: any) {
      message.error(
        'Ingress 삭제 실패: ' + (error.message || '알 수 없는 오류')
      );
    } finally {
      setLoadingIngress(false);
    }
  };

  // Ingress Controller 상태 확인
  const handleCheckIngressController = async (silent = false) => {
    if (!service?.id) return;

    if (!silent) {
      setLoadingControllerStatus(true);
    }

    // Docker 인프라는 Ingress Controller 체크 불필요
    if (isContainerInfra()) {
      if (!silent) {
        setLoadingControllerStatus(false);
      }
      return;
    }

    try {
      const status = await checkIngressController(service.id);
      setIngressControllerStatus(status);

      if (!silent && !status.installed) {
        message.warning('Nginx Ingress Controller가 설치되어 있지 않습니다.');
      }
    } catch (_error: unknown) {
      setIngressControllerStatus(null);
    } finally {
      if (!silent) {
        setLoadingControllerStatus(false);
      }
    }
  };

  // 폴링 시작
  const startPollingControllerStatus = () => {
    // 기존 폴링이 있으면 중지
    stopPollingControllerStatus();

    // 폴링 시작 시간 기록
    pollingStartTimeRef.current = Date.now();
    setPollingElapsedTime(0);

    const MAX_POLLING_TIME = 10 * 60 * 1000; // 10분

    // 5초마다 상태 확인
    pollingIntervalRef.current = setInterval(() => {
      void (async () => {
        if (!service?.id) return;

        // 경과 시간 계산
        const elapsed = pollingStartTimeRef.current
          ? Date.now() - pollingStartTimeRef.current
          : 0;
        setPollingElapsedTime(elapsed);

        // 타임아웃 체크 (10분)
        if (elapsed > MAX_POLLING_TIME) {
          stopPollingControllerStatus();
          setInstallingController(false);

          notification.error({
            message: '설치 타임아웃',
            description: (
              <div>
                <p>Nginx Ingress Controller 설치가 10분을 초과했습니다.</p>
                <p>클러스터 상태를 확인하고 수동으로 다시 시도해주세요.</p>
                <p>
                  <strong>확인사항:</strong>
                </p>
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  <li>네트워크 연결 상태</li>
                  <li>이미지 다운로드 상태 (registry.k8s.io)</li>
                  <li>Pod 로그: kubectl logs -n ingress-nginx [pod-name]</li>
                </ul>
              </div>
            ),
            duration: 15,
          });
          return;
        }

        // Docker 인프라는 Ingress Controller 체크 불필요
        if (isContainerInfra()) {
          return;
        }

        try {
          const status = await checkIngressController(service.id);
          setIngressControllerStatus(status);

          // 설치 완료되면 폴링 중지하고 알림
          if (status.status === 'installed') {
            stopPollingControllerStatus();
            setInstallingController(false);

            notification.success({
              message: '설치 완료',
              description: `Nginx Ingress Controller가 성공적으로 설치되었습니다 (${Math.floor(elapsed / 1000)}초 소요). 이제 Ingress 리소스를 생성할 수 있습니다.`,
              duration: 8,
            });
          }
          // 에러 발생 시 폴링 중지하고 알림
          else if (status.status === 'error') {
            stopPollingControllerStatus();
            setInstallingController(false);

            notification.error({
              message: '설치 실패',
              description: (
                <div>
                  <p>Nginx Ingress Controller 설치 중 오류가 발생했습니다.</p>
                  <p>
                    <strong>Pod 상태:</strong>{' '}
                    {(() => {
                      const pods = status.details?.pods;
                      if (pods === undefined || pods === null)
                        return '알 수 없음';
                      if (typeof pods === 'object') return JSON.stringify(pods);
                      if (typeof pods === 'string') return pods;
                      if (typeof pods === 'number' || typeof pods === 'boolean')
                        return String(pods);
                      return '알 수 없음';
                    })()}
                  </p>
                  <p>
                    kubectl describe pod -n ingress-nginx 명령으로 상세 정보를
                    확인해주세요.
                  </p>
                </div>
              ),
              duration: 10,
            });
          }
        } catch {
          // Polling error - continue polling (may be transient network issue)
        }
      })();
    }, 5000); // 5초마다 확인
  };

  // 폴링 중지
  const stopPollingControllerStatus = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingStartTimeRef.current = null;
    setPollingElapsedTime(0);
  };

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      stopPollingControllerStatus();
    };
  }, []);

  // Ingress Controller 설치 (비동기)
  const _handleInstallIngressController = async () => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    Modal.confirm({
      title: 'Nginx Ingress Controller 설치',
      content: (
        <div>
          <p>
            기존 Nginx Ingress Controller를 완전히 삭제하고 새로 설치합니다.
          </p>
          <p>
            <strong>주의:</strong> 기존 Ingress 리소스가 모두 삭제됩니다.
          </p>
          <p>설치는 백그라운드에서 진행되며, 약 3-5분이 소요됩니다.</p>
          <p>설치가 완료되면 알림으로 안내됩니다.</p>
        </div>
      ),
      okText: '설치 시작',
      cancelText: '취소',
      okType: 'primary',
      onOk: async () => {
        setInstallingController(true);

        // 즉시 UI에 "설치 진행 중" 상태 표시
        setIngressControllerStatus({
          installed: false,
          status: 'installing',
          namespace_exists: false,
          deployment_exists: false,
          pods_running: false,
          service_exists: false,
          details: {
            pods: '설치 시작 중...',
          },
        });

        try {
          // 설치 API 호출 (백그라운드 실행)
          await installIngressController(service.id);

          // 즉시 알림 표시 (모달 닫힌 후에도 보임)
          notification.success({
            message: '설치 시작됨',
            description: (
              <div>
                <p>
                  <strong>
                    Nginx Ingress Controller 설치가 시작되었습니다.
                  </strong>
                </p>
                <p>
                  진행 상황은 아래 상태 표시 영역에서 실시간으로 확인하실 수
                  있습니다.
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                  • 예상 소요 시간: 3-5분
                  <br />
                  • 자동 상태 확인: 5초마다
                  <br />• 완료 시 알림으로 안내
                </p>
              </div>
            ),
            duration: 8,
            placement: 'topRight',
          });

          // 간단한 토스트 알림도 추가 (빠른 피드백)
          message.loading('설치 진행 중... 상태를 확인하고 있습니다', 3);

          // 폴링 시작 (5초마다 상태 확인)
          startPollingControllerStatus();

          // 즉시 첫 상태 확인
          void handleCheckIngressController(true);
        } catch (error: any) {
          setInstallingController(false);
          setIngressControllerStatus(null);
          message.error(
            '설치 시작 실패: ' + (error.message || '알 수 없는 오류')
          );
        }
      },
    });
  };

  // Pod 상태 색상
  const getPodStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running') return 'success';
    if (s === 'pending') return 'warning';
    if (s === 'failed' || s === 'error') return 'error';
    return 'default';
  };

  // Pod 상태 아이콘
  const getPodStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running')
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (s === 'pending')
      return <SyncOutlined spin style={{ color: '#faad14' }} />;
    if (s === 'failed' || s === 'error')
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    return <WarningOutlined style={{ color: '#d9d9d9' }} />;
  };

  // Pod 테이블 컬럼
  const _podColumns = [
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      fixed: 'left' as const,
      render: (status: string, _record: PodInfo) => {
        const isError = [
          'ImagePullBackOff',
          'ErrImagePull',
          'CrashLoopBackOff',
          'Error',
          'Failed',
          'Pending',
        ].includes(status);

        return (
          <Space direction='vertical' size='small'>
            <Tag
              color={getPodStatusColor(status)}
              icon={getPodStatusIcon(status)}
            >
              {status}
            </Tag>
            {isError && (
              <Button
                type='link'
                size='small'
                danger={status !== 'Pending'}
                style={{
                  fontSize: 11,
                  padding: 0,
                  height: 'auto',
                  color: status === 'Pending' ? '#faad14' : '#ff4d4f',
                }}
                onClick={() => {
                  // Pod 에러 상태에 따른 해결 방법 모달 표시
                  Modal.info({
                    title: `${status} 문제 해결 방법`,
                    width: 600,
                    content: (
                      <div style={{ marginTop: 16 }}>
                        {status === 'ImagePullBackOff' ||
                        status === 'ErrImagePull' ? (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>
                                Harbor 레지스트리에서 이미지를 가져올 수 없음
                              </li>
                              <li>
                                이미지 이름/태그가 잘못되었거나 존재하지 않음
                              </li>
                              <li>Harbor 인증 정보가 올바르지 않음</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>Harbor에서 이미지 존재 여부 확인</li>
                              <li>서비스의 이미지 태그 확인 및 재배포</li>
                              <li>kubectl describe pod로 자세한 오류 확인</li>
                            </ul>
                          </>
                        ) : status === 'CrashLoopBackOff' ? (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>컨테이너가 시작 후 즉시 종료됨</li>
                              <li>애플리케이션 코드 오류 또는 설정 문제</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>Pod 로그를 확인하여 오류 원인 파악</li>
                              <li>환경 변수 및 ConfigMap 설정 확인</li>
                              <li>헬스체크 설정 확인</li>
                            </ul>
                          </>
                        ) : status === 'Pending' ? (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>노드에 충분한 리소스(CPU/메모리)가 없음</li>
                              <li>PVC를 사용할 수 없음</li>
                              <li>노드 선택자 조건이 맞지 않음</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>kubectl describe pod로 자세한 이벤트 확인</li>
                              <li>클러스터 리소스 사용량 확인</li>
                              <li>스토리지 클래스 및 PVC 상태 확인</li>
                            </ul>
                          </>
                        ) : (
                          <>
                            <Text strong>원인:</Text>
                            <ul>
                              <li>Pod 실행 중 예상치 못한 오류 발생</li>
                            </ul>
                            <Text strong>해결 방법:</Text>
                            <ul>
                              <li>Pod 로그 및 이벤트 확인</li>
                              <li>kubectl describe pod로 상세 정보 확인</li>
                              <li>필요시 Pod 재시작 시도</li>
                            </ul>
                          </>
                        )}
                      </div>
                    ),
                  });
                }}
              >
                클릭하여 해결 방법 확인
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Pod 이름',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      render: (name: string) => (
        <Text strong style={{ fontSize: 13 }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'CPU',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      width: 90,
      align: 'center' as const,
      render: (cpuUsage: string | undefined) =>
        cpuUsage ? (
          <Tag color='blue' style={{ minWidth: 60 }}>
            {cpuUsage}
          </Tag>
        ) : (
          <Text type='secondary' style={{ fontSize: 12 }}>
            -
          </Text>
        ),
    },
    {
      title: '메모리',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      width: 100,
      align: 'center' as const,
      render: (memoryUsage: string | undefined) =>
        memoryUsage ? (
          <Tag color='cyan' style={{ minWidth: 70 }}>
            {memoryUsage}
          </Tag>
        ) : (
          <Text type='secondary' style={{ fontSize: 12 }}>
            -
          </Text>
        ),
    },
    {
      title: '재시작',
      dataIndex: 'restarts',
      key: 'restarts',
      width: 80,
      align: 'center' as const,
      render: (restarts: number) => (
        <Tag color={restarts > 0 ? 'warning' : 'default'}>{restarts}</Tag>
      ),
    },
    {
      title: '이미지',
      dataIndex: 'image',
      key: 'image',
      width: 300,
      ellipsis: true,
      render: (image: string, record: PodInfo) => {
        // 이미지가 없거나 <none>인 경우 처리
        const hasValidImage =
          image && image !== '<none>' && image.trim() !== '';

        // PRIMARY_DEPLOYED_IMAGE 우선, 없으면 deployed_image 사용
        const deployedImage =
          deployedImageInfo?.primary_deployed_image ||
          deployedImageInfo?.deployed_image ||
          '';
        const isCurrentImage =
          hasValidImage && deployedImage && image === deployedImage;

        if (!hasValidImage) {
          // 이미지 정보가 없는 경우
          return (
            <Space direction='vertical' size='small'>
              <Text type='secondary' style={{ fontSize: 12 }}>
                이미지 정보 없음
              </Text>
              <Text type='secondary' style={{ fontSize: 11 }}>
                Pod: {record.name}
              </Text>
            </Space>
          );
        }

        return (
          <div>
            <Text
              ellipsis
              style={{ maxWidth: 270, display: 'block', fontSize: 12 }}
              title={image}
              code
            >
              {image}
            </Text>
            {isCurrentImage && (
              <Tag
                color='success'
                icon={<CheckCircleOutlined />}
                style={{ fontSize: 10, marginTop: 4 }}
              >
                현재 배포
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 100,
      render: (_: any, record: PodInfo) => (
        <Popconfirm
          title='Pod를 삭제하시겠습니까?'
          description='Deployment가 자동으로 새 Pod를 생성합니다.'
          onConfirm={() => handleDeletePod(record.name)}
          okText='삭제'
          cancelText='취소'
        >
          <Button size='small' danger icon={<DeleteOutlined />}>
            재시작
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 개요 탭
  const renderOverviewTab = () => {
    return (
      <OverviewTab
        service={service}
        loading={loading}
        onRefresh={loadOverviewData}
        isContainerInfra={isContainerInfra()}
        isDockerInfra={isDockerInfra()}
        isPodmanInfra={isPodmanInfra()}
        containers={containers}
        loadingContainers={loadingContainers}
        dockerSystemInfo={dockerSystemInfo}
        dockerImages={dockerImages}
        dockerVolumes={dockerVolumes}
        dockerNetworks={dockerNetworks}
        deployedImageInfo={deployedImageInfo}
        pods={pods}
        deploymentStatus={deploymentStatus}
        deploymentDetails={deploymentDetails}
        ingressDomains={ingressDomains}
        latestBuildImageTag={latestBuildImageTag}
        resourceInfo={resourceInfo}
        loadingResource={loadingResource}
      />
    );
  };

  // 로그 조회 탭
  const renderLogsTab = () => {
    return (
      <LogsTab
        isContainerInfra={isContainerInfra()}
        isDockerInfra={isDockerInfra()}
        containers={containers}
        selectedContainer={selectedContainer}
        onSelectedContainerChange={setSelectedContainer}
        loadingContainers={loadingContainers}
        dockerServerId={dockerServerId}
        pods={pods}
        selectedPod={selectedPod}
        onSelectedPodChange={setSelectedPod}
        logs={logs}
        loadingLogs={loadingLogs}
        onGetLogs={isContainerInfra() ? handleGetDockerLogs : handleGetLogs}
        onClearLogs={() => setLogs('')}
        getPodStatusIcon={getPodStatusIcon}
        getPodStatusColor={getPodStatusColor}
      />
    );
  };

  // 명령어 실행 탭
  const renderCommandTab = () => {
    return (
      <ExecuteTab
        isContainerInfra={isContainerInfra()}
        isDockerInfra={isDockerInfra()}
        containers={containers}
        selectedContainerId={selectedContainerId}
        onSelectedContainerIdChange={setSelectedContainerId}
        commandInput={commandInput}
        commandOutput={commandOutput}
        executingCommand={executingCommand}
        onCommandInputChange={setCommandInput}
        onExecuteCommand={handleExecuteCommand}
        onClearOutput={() => setCommandOutput('')}
      />
    );
  };

  //  [추가] DAST 스캔 실행 핸들러 (Ingress 도메인만 허용)
  const handleDastScanConfirm = async (params: DastScanParams) => {
    if (!repoId) {
      message.error('저장소 정보가 없습니다.');
      return;
    }

    // 모달을 즉시 닫고 배너로 진행 상태 표시
    setDastParamsModalVisible(false);
    setDastScanStatus('idle');

    try {
      setDastScanning(true);
      setDastScanStartTime(new Date());
      setDastScanError(undefined);

      //  스캔 시작 시 상태 변경 알림
      onDastScanStateChange?.('analyzing');

      // DAST 스캔 실행 (Ingress 도메인만 선택 가능하므로 보안 보장됨)
      await gitApi.dastScanWeb({
        repo_id: repoId,
        target_url: params.target_url,
        scan_type: params.scan_type,
        options: params.options,
      });

      //  스캔 완료 시 상태 변경 알림
      onDastScanStateChange?.('completed');
      message.success('DAST 스캔이 완료되었습니다. 결과를 확인하세요.');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      setDastScanError(errorMessage);
      //  스캔 실패 시 상태 변경 알림
      onDastScanStateChange?.('failed');
      message.error(`DAST 스캔 실패: ${errorMessage}`);
      logger.error(
        'DAST scan failed',
        error as Error,
        { repoId, params },
        'ImprovedOperateModal',
        'handleDastScanConfirm'
      );
    } finally {
      setDastScanning(false);
      setDastScanStartTime(null);
    }
  };

  //  [추가] DAST 분석 결과 탭
  const renderDastTab = () => {
    // DAST 스캔 진행 중일 때 ScanProgressOverlay 표시
    if (dastScanning) {
      return (
        <ScanProgressOverlay
          scanType={'dast' as ScanType}
          visible={dastScanning}
          onClose={() => {
            // 백그라운드 실행: 스캔은 계속 진행되지만 UI만 닫음
            setDastScanning(false);
          }}
          startTime={dastScanStartTime || undefined}
          serviceName={service?.name || repoName}
        />
      );
    }

    return (
      <DASTTab
        repoId={repoId}
        repoName={repoName}
        service={service}
        isContainerInfra={isContainerInfra()}
        isDockerInfra={isDockerInfra()}
        onStartScan={() => setDastParamsModalVisible(true)}
        onScanStateChange={state => {
          if (state === 'analyzing') {
            setDastScanning(true);
          } else {
            setDastScanning(false);
          }
        }}
      />
    );
  };

  // Deployment 관리 탭
  // Deployment 배포 관리 탭
  const renderDeploymentTab = () => {
    if (isContainerInfra()) {
      return (
        <div style={{ padding: '24px' }}>
          <Alert
            message='Docker 배포 관리'
            description='Docker 환경에서 배포된 서비스를 관리합니다.'
            type='info'
            showIcon
            icon={<RocketOutlined />}
            style={{ marginBottom: 24 }}
          />
          <Card title='배포 정보'>
            <Descriptions column={1}>
              <Descriptions.Item label='서비스 이름'>
                {service?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label='네임스페이스'>
                {service?.namespace || '-'}
              </Descriptions.Item>
              <Descriptions.Item label='컨테이너 개수'>
                {containers.length}개
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <p>
                배포 히스토리 및 롤백 기능은 컨테이너 목록 탭에서 확인할 수
                있습니다.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    // K8s 인프라: K8sDeploymentTab 컴포넌트 사용
    return (
      <K8sDeploymentTab
        service={service}
        infraId={infraId}
        deployments={deployments}
        selectedDeployment={selectedDeployment}
        onDeploymentChange={handleDeploymentChange}
        deploymentStatus={deploymentStatus}
        sshHops={k8sSshHops}
      />
    );
  };

  // K8s 리소스 관리 탭
  const renderResourcesTab = () => {
    if (isContainerInfra()) {
      return (
        <div style={{ padding: '24px' }}>
          <Alert
            message='Docker 리소스 관리'
            description='Docker 환경에서는 컨테이너 및 이미지 리소스를 관리합니다.'
            type='info'
            showIcon
            icon={<SettingOutlined />}
            style={{ marginBottom: 24 }}
          />
          <Card title='리소스 정보'>
            <p>
              Docker 컨테이너 및 이미지 리소스는 컨테이너 목록 탭에서 확인할 수
              있습니다.
            </p>
            <div style={{ marginTop: 16 }}>
              <p>
                <strong>현재 실행 중인 컨테이너:</strong> {containers.length}개
              </p>
            </div>
          </Card>
        </div>
      );
    }

    // K8s 인프라: K8sResourcesTab 컴포넌트 사용
    return <K8sResourcesTab service={service} />;
  };

  // K8s 운영 관리 탭
  // K8s 운영 관리 탭
  const renderK8sOpsTab = () => {
    // Docker 인프라인 경우 조기 반환
    if (isContainerInfra()) {
      return (
        <div style={{ padding: '24px' }}>
          <Alert
            message={`${isDockerInfra() ? 'Docker' : 'Podman'} 운영 관리`}
            description={`${isDockerInfra() ? 'Docker' : 'Podman'} 환경에서의 운영 관리 기능입니다.`}
            type='info'
            showIcon
            icon={<ToolOutlined />}
            style={{ marginBottom: 24 }}
          />
          <Card title='운영 정보'>
            <p>
              Docker 환경에서는 Kubernetes 클러스터 운영 기능이 적용되지
              않습니다.
            </p>
            <p>컨테이너 관리 기능은 컨테이너 목록 탭에서 이용하세요.</p>
          </Card>
        </div>
      );
    }

    // K8s 인프라: K8sOpsTab 컴포넌트 사용
    return (
      <K8sOpsTab
        service={service}
        infraId={infraId}
        hops={parseHops()}
        onOverviewDataRefresh={loadOverviewData}
      />
    );
  };

  // ==================== Docker/Podman 전용 핸들러 함수 ====================

  //  [신규] 컨테이너 통계 로딩
  const loadAllContainerStats = async () => {
    if (dockerServerHops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다.');
      return;
    }

    setLoadingAllStats(true);
    try {
      const runtimeType = isPodmanInfra() ? 'podman' : 'docker';
      const stats = await getAllContainerStats(
        { hops: dockerServerHops },
        runtimeType
      );
      setAllContainerStats(stats);
      message.success('컨테이너 통계를 불러왔습니다.');
    } catch (error) {
      logger.error(
        'Failed to load container stats',
        error as Error,
        {},
        'ImprovedOperateModal',
        'loadAllContainerStats'
      );
      message.error('컨테이너 통계를 불러오는데 실패했습니다.');
    } finally {
      setLoadingAllStats(false);
    }
  };

  //  [신규] Docker 시스템 정보 로딩
  const loadDockerSystemInfo = async () => {
    if (dockerServerHops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다.');
      return;
    }

    setLoadingSystemInfo(true);
    try {
      const runtimeType = isPodmanInfra() ? 'podman' : 'docker';
      const info = await getDockerSystemInfo(
        { hops: dockerServerHops },
        runtimeType
      );
      setDockerSystemInfo(info);
    } catch (error) {
      logger.error(
        'Failed to load Docker system info',
        error as Error,
        {},
        'ImprovedOperateModal',
        'loadDockerSystemInfo'
      );
      message.error('Docker 시스템 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingSystemInfo(false);
    }
  };

  //  [신규] 컨테이너 재시작
  const handleContainerRestart = async (
    containerId: string,
    containerName: string
  ) => {
    if (dockerServerHops.length === 0 || !dockerServerId) {
      message.warning('SSH 연결 정보가 없습니다.');
      return;
    }

    setContainerActionLoading(containerId);
    try {
      const runtimeType = isPodmanInfra() ? 'podman' : 'docker';
      await controlContainer(
        dockerServerId,
        containerId,
        'restart',
        { hops: dockerServerHops },
        runtimeType
      );
      message.success(`컨테이너 "${containerName}"이(가) 재시작되었습니다.`);
      // 컨테이너 목록 새로고침은 상위 컴포넌트에서 처리
    } catch (error) {
      logger.error(
        'Failed to restart container',
        error as Error,
        { containerId },
        'ImprovedOperateModal',
        'handleContainerRestart'
      );
      message.error(
        `컨테이너 재시작에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    } finally {
      setContainerActionLoading(null);
    }
  };

  //  [신규] 컨테이너 중지
  const handleContainerStop = async (
    containerId: string,
    containerName: string
  ) => {
    if (dockerServerHops.length === 0 || !dockerServerId) {
      message.warning('SSH 연결 정보가 없습니다.');
      return;
    }

    setContainerActionLoading(containerId);
    try {
      const runtimeType = isPodmanInfra() ? 'podman' : 'docker';
      await controlContainer(
        dockerServerId,
        containerId,
        'stop',
        { hops: dockerServerHops },
        runtimeType
      );
      message.success(`컨테이너 "${containerName}"이(가) 중지되었습니다.`);
    } catch (error) {
      logger.error(
        'Failed to stop container',
        error as Error,
        { containerId },
        'ImprovedOperateModal',
        'handleContainerStop'
      );
      message.error(
        `컨테이너 중지에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    } finally {
      setContainerActionLoading(null);
    }
  };

  //  [신규] Docker 리소스 정리
  const handlePruneDockerResources = async (
    pruneType: 'all' | 'images' | 'containers' | 'volumes' | 'networks'
  ) => {
    if (dockerServerHops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다.');
      return;
    }

    setPruningResources(true);
    try {
      const result = await pruneDockerResources(pruneType, {
        hops: dockerServerHops,
      });
      message.success(result.message);
      notification.info({
        message: 'Docker 리소스 정리 완료',
        description: result.output
          ? result.output.substring(0, 500)
          : '정리가 완료되었습니다.',
        duration: 8,
      });
      // 시스템 정보 새로고침
      void loadDockerSystemInfo();
    } catch (error) {
      logger.error(
        'Failed to prune Docker resources',
        error as Error,
        { pruneType },
        'ImprovedOperateModal',
        'handlePruneDockerResources'
      );
      message.error(
        `Docker 리소스 정리에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    } finally {
      setPruningResources(false);
    }
  };

  // ==================== Docker/Podman 전용 렌더 함수 ====================

  // 컨테이너 목록 탭 렌더링
  const _renderContainersTab = () => {
    // 컨테이너 ID로 통계 찾기 헬퍼 함수
    const getStatsForContainer = (
      containerId: string
    ): ContainerStats | undefined => {
      return allContainerStats.find(
        s =>
          s.container_id === containerId ||
          s.container_id.startsWith(containerId.substring(0, 12))
      );
    };
    return (
      <div>
        <Alert
          message='컨테이너 관리'
          description='Docker/Podman 컨테이너를 관리합니다. 리소스 통계 버튼을 클릭하면 CPU/메모리 사용량을 확인할 수 있습니다.'
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Card
          title='컨테이너 목록'
          loading={loadingContainers}
          extra={
            <Space>
              <Button
                icon={<BarChartOutlined />}
                onClick={loadAllContainerStats}
                loading={loadingAllStats}
                disabled={containers.length === 0}
              >
                리소스 통계
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={() => {
                  // 컨테이너 목록 새로고침 (상위 로직 재실행)
                  if (visible && isContainerInfra() && infraId) {
                    setLoadingContainers(true);
                    // Docker 서버 정보 재조회 트리거
                    window.location.reload(); // 임시 방안 - 실제로는 loadDockerContainerData 호출 필요
                  }
                }}
              >
                새로고침
              </Button>
            </Space>
          }
        >
          {containers.length > 0 ? (
            <Table
              dataSource={containers}
              columns={[
                {
                  title: '컨테이너 ID',
                  dataIndex: 'id',
                  key: 'id',
                  width: 120,
                  render: (id: string) => (
                    <Tag color='blue'>{id.substring(0, 12)}</Tag>
                  ),
                },
                {
                  title: '이름',
                  dataIndex: 'name',
                  key: 'name',
                  width: 180,
                },
                {
                  title: '이미지',
                  dataIndex: 'image',
                  key: 'image',
                  ellipsis: true,
                },
                {
                  title: '상태',
                  dataIndex: 'status',
                  key: 'status',
                  width: 120,
                  render: (status: string) => {
                    const isRunning = status.toLowerCase().includes('up');
                    return (
                      <Tag color={isRunning ? 'green' : 'red'}>{status}</Tag>
                    );
                  },
                },
                {
                  title: 'CPU',
                  key: 'cpu',
                  width: 100,
                  render: (_: unknown, record: DockerContainerInfo) => {
                    const stats = getStatsForContainer(record.id);
                    if (!stats) return <Text type='secondary'>-</Text>;
                    const cpuValue = parseFloat(
                      stats.cpu_percent.replace('%', '')
                    );
                    return (
                      <Progress
                        percent={cpuValue}
                        size='small'
                        strokeColor={
                          cpuValue > 80
                            ? '#ff4d4f'
                            : cpuValue > 50
                              ? '#faad14'
                              : '#52c41a'
                        }
                        format={() => stats.cpu_percent}
                      />
                    );
                  },
                },
                {
                  title: '메모리',
                  key: 'memory',
                  width: 150,
                  render: (_: unknown, record: DockerContainerInfo) => {
                    const stats = getStatsForContainer(record.id);
                    if (!stats) return <Text type='secondary'>-</Text>;
                    const memValue = parseFloat(
                      stats.memory_percent.replace('%', '')
                    );
                    return (
                      <div>
                        <Progress
                          percent={memValue}
                          size='small'
                          strokeColor={
                            memValue > 80
                              ? '#ff4d4f'
                              : memValue > 50
                                ? '#faad14'
                                : '#52c41a'
                          }
                          format={() => stats.memory_percent}
                        />
                        <Text type='secondary' style={{ fontSize: 11 }}>
                          {stats.memory_usage}
                        </Text>
                      </div>
                    );
                  },
                },
                {
                  title: '포트',
                  dataIndex: 'ports',
                  key: 'ports',
                  width: 150,
                  ellipsis: true,
                },
                {
                  title: '작업',
                  key: 'actions',
                  width: 150,
                  render: (_: unknown, record: DockerContainerInfo) => {
                    const isLoading = containerActionLoading === record.id;
                    const isRunning = record.status
                      ?.toLowerCase()
                      .includes('up');
                    return (
                      <Space>
                        <Popconfirm
                          title='컨테이너 재시작'
                          description={`"${record.name}" 컨테이너를 재시작하시겠습니까?`}
                          onConfirm={() =>
                            handleContainerRestart(record.id, record.name)
                          }
                          okText='재시작'
                          cancelText='취소'
                        >
                          <Button
                            size='small'
                            type='link'
                            icon={<SyncOutlined spin={isLoading} />}
                            loading={isLoading}
                          >
                            재시작
                          </Button>
                        </Popconfirm>
                        {isRunning && (
                          <Popconfirm
                            title='컨테이너 중지'
                            description={`"${record.name}" 컨테이너를 중지하시겠습니까?`}
                            onConfirm={() =>
                              handleContainerStop(record.id, record.name)
                            }
                            okText='중지'
                            cancelText='취소'
                          >
                            <Button
                              size='small'
                              type='link'
                              danger
                              icon={<CloseCircleOutlined />}
                              loading={isLoading}
                            >
                              중지
                            </Button>
                          </Popconfirm>
                        )}
                      </Space>
                    );
                  },
                },
              ]}
              rowKey='id'
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          ) : (
            <Empty description='컨테이너가 없습니다' />
          )}
        </Card>
      </div>
    );
  };

  // 탭 배열 생성 함수
  const getTabItems = () => {
    const commonTabs = [
      {
        key: 'overview',
        label: (
          <Space>
            <DashboardOutlined />
            <span>개요</span>
          </Space>
        ),
        children: renderOverviewTab(),
      },
    ];

    const k8sTabs = [
      {
        key: 'pods',
        label: (
          <Space>
            <CloudServerOutlined />
            <span>파드 목록</span>
            {pods.length > 0 && <Tag color='blue'>{pods.length}</Tag>}
          </Space>
        ),
        children: (
          <K8sPodsTab
            pods={pods}
            deployments={deployments}
            selectedDeployment={selectedDeployment}
            deploymentStatus={deploymentStatus}
            scalingReplicas={scalingReplicas}
            scalingLoading={scalingLoading}
            hpaData={hpaData}
            hpaList={hpaList}
            loadingHPA={loadingHPA}
            showHPAForm={showHPAForm}
            metricsServerStatus={metricsServerStatus}
            metricsServerDiagnostics={metricsServerDiagnostics}
            loadingMetricsStatus={loadingMetricsStatus}
            installingMetrics={installingMetrics}
            showDiagnostics={showDiagnostics}
            deployedImageInfo={deployedImageInfo}
            onDeploymentChange={handleDeploymentChange}
            onScaleDeployment={handleScaleDeployment}
            onScaleToZero={handleScaleToZero}
            onSetScalingReplicas={setScalingReplicas}
            onCreateHPA={handleCreateHPA}
            onDeleteHPA={handleDeleteHPA}
            onSetShowHPAForm={setShowHPAForm}
            onLoadHPA={loadHPA}
            onDeletePod={handleDeletePod}
            onBulkDeletePendingPods={handleBulkDeletePendingPods}
            onCheckMetricsServerStatus={checkMetricsServerStatus}
            onInstallMetricsServer={handleInstallMetricsServer}
            onCleanMetricsServerNode={handleCleanMetricsServerNode}
            onSetShowDiagnostics={setShowDiagnostics}
            onLoadPodDetails={loadPodDetails}
          />
        ),
      },
      {
        key: 'deployment',
        label: (
          <Space>
            <RocketOutlined />
            <span>배포 관리</span>
          </Space>
        ),
        children: renderDeploymentTab(),
      },
      {
        key: 'resources',
        label: (
          <Space>
            <ClusterOutlined />
            <span>리소스 현황</span>
          </Space>
        ),
        children: renderResourcesTab(),
      },
      {
        key: 'k8sops',
        label: (
          <Space>
            <ToolOutlined />
            <span>운영 관리</span>
          </Space>
        ),
        children: renderK8sOpsTab(),
      },
    ];

    const dockerTabs = [
      {
        key: 'containers',
        label: (
          <Space>
            <CloudServerOutlined />
            <span>컨테이너 목록</span>
            {containers.length > 0 && (
              <Tag color='blue'>{containers.length}</Tag>
            )}
          </Space>
        ),
        children: (
          <DockerContainersTab
            containers={containers}
            loadingContainers={loadingContainers}
            allContainerStats={allContainerStats}
            loadingAllStats={loadingAllStats}
            containerActionLoading={containerActionLoading}
            onLoadStats={loadAllContainerStats}
            onRefresh={loadDockerContainerData}
            onContainerRestart={handleContainerRestart}
          />
        ),
      },
      {
        key: 'deployment',
        label: (
          <Space>
            <RocketOutlined />
            <span>배포 관리</span>
          </Space>
        ),
        children: (
          <DockerDeploymentTab
            service={service}
            containerCount={containers.length}
            containers={containers}
            dockerImages={dockerImages}
            isDockerInfra={isDockerInfra()}
          />
        ),
      },
      {
        key: 'dockerops',
        label: (
          <Space>
            <ToolOutlined />
            <span>운영 관리</span>
          </Space>
        ),
        children: (
          <DockerOpsTab
            pruningResources={pruningResources}
            onPruneResources={handlePruneDockerResources}
            isDockerInfra={isDockerInfra()}
          />
        ),
      },
    ];

    const endTabs = [
      {
        key: 'logs',
        label: (
          <Space>
            <FileTextOutlined />
            <span>로그 조회</span>
          </Space>
        ),
        children: renderLogsTab(),
      },
      {
        key: 'execute',
        label: (
          <Space>
            <CodeOutlined />
            <span>명령 실행</span>
          </Space>
        ),
        children: renderCommandTab(),
      },
      {
        key: 'domainsettings',
        label: (
          <Space>
            <SettingOutlined />
            <span>도메인 설정</span>
          </Space>
        ),
        children: (
          <DomainSettingsTab
            service={service}
            infraId={isContainerInfra() ? dockerServerId : undefined}
            serverHops={isContainerInfra() ? dockerServerHops : []}
            isContainerInfra={isContainerInfra()}
            isDockerInfra={isDockerInfra()}
          />
        ),
      },
      {
        key: 'dast',
        label: (
          <Space>
            <GlobalOutlined />
            <span>도메인 검사</span>
            {dastState === 'analyzing' && <Tag color='processing'>진행중</Tag>}
            {dastState === 'completed' && <Tag color='success'>완료</Tag>}
            {dastState === 'failed' && <Tag color='error'>실패</Tag>}
          </Space>
        ),
        children: renderDastTab(),
      },
    ];

    // 인프라 타입에 따라 적절한 탭 조합 반환
    if (isContainerInfra()) {
      return [...commonTabs, ...dockerTabs, ...endTabs];
    } else {
      // Kubernetes 또는 기타 인프라
      return [...commonTabs, ...k8sTabs, ...endTabs];
    }
  };

  return (
    <Modal
      title={
        <Space>
          <DashboardOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            서비스 운영 관리
          </Title>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1400}
      footer={[
        <Button key='close' onClick={onClose}>
          닫기
        </Button>,
      ]}
      destroyOnClose
      style={{ top: 20 }}
    >
      {/* SSH 연결 중 로딩 표시 - Docker 인프라 */}
      {loadingContainers && isContainerInfra() && (
        <Alert
          message='SSH 연결 중'
          description='서버에 SSH로 연결하여 컨테이너 정보를 가져오는 중입니다. 잠시만 기다려주세요...'
          type='info'
          showIcon
          icon={<Spin size='small' />}
          style={{ marginBottom: 16 }}
          closable={false}
        />
      )}

      {/* SSH 연결 중 로딩 표시 - Kubernetes 인프라 */}
      {loading && isKubernetesInfra() && (
        <Alert
          message='SSH 연결 중'
          description='서버에 SSH로 연결하여 Pod 정보를 가져오는 중입니다. 잠시만 기다려주세요...'
          type='info'
          showIcon
          icon={<Spin size='small' />}
          style={{ marginBottom: 16 }}
          closable={false}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={getTabItems()}
      />

      {/* SSH Credential 입력 모달 */}
      <SshCredentialModal
        visible={sshCredentialModalVisible}
        onClose={() => setSshCredentialModalVisible(false)}
        onComplete={handleSshCredentialComplete}
        hops={pendingHops.map(h => ({ ...h, username: h.username || '' }))}
        infraId={infraId}
        serviceId={service?.id}
        serviceName={service?.name}
        isRetry={sshCredentialRetry}
      />

      {/*  [보안] DAST 스캔 파라미터 모달 - serviceId 전달로 도메인 선택 가능 (K8s: Ingress, Docker: service_domains) */}
      <DastParamsModal
        visible={dastParamsModalVisible}
        onClose={() => {
          setDastParamsModalVisible(false);
          setDastScanStatus('idle');
          setDastScanError(undefined);
        }}
        onConfirm={handleDastScanConfirm}
        loading={dastScanning}
        serviceId={service?.id}
        infraType={
          isDockerInfra() ? 'docker' : isPodmanInfra() ? 'podman' : 'kubernetes'
        }
        scanStatus={dastScanStatus}
        scanError={dastScanError}
      />

      {/*  [운영모달] YAML 조회 모달 (배포 관리 탭용) */}
      <Modal
        title={yamlViewTitle}
        open={yamlViewModalVisible}
        onCancel={() => setYamlViewModalVisible(false)}
        onOk={() => setYamlViewModalVisible(false)}
        okText='닫기'
        cancelButtonProps={{ style: { display: 'none' } }}
        width={800}
      >
        {yamlViewLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin tip='YAML을 불러오는 중...' />
          </div>
        ) : (
          <>
            <Alert
              message='YAML 조회'
              description='Kubernetes 리소스 YAML 내용입니다. (읽기 전용)'
              type='info'
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Input.TextArea
              value={yamlViewContent}
              readOnly
              autoSize={{ minRows: 20, maxRows: 30 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </>
        )}
      </Modal>
    </Modal>
  );
};

export default ImprovedOperateModal;
