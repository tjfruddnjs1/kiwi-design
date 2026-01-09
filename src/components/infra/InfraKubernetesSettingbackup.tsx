/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// TODO: This 3,623-line component needs urgent refactoring
// Break into smaller components: NodeManagement, ClusterStatus, Settings
// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Tabs,
  Form,
  Input,
  Select,
  Divider,
  Empty,
  Spin,
  Row,
  Col,
  List,
  message,
  Statistic,
  Modal,
  InputNumber,
  Tooltip,
  Popconfirm,
  Alert,
} from 'antd';
import {
  CloudServerOutlined,
  MinusOutlined,
  PlusOutlined,
  SettingOutlined,
  MinusCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClusterOutlined,
  ApiOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  LockOutlined,
  DeleteOutlined,
  SyncOutlined,
  SearchOutlined,
  ToolOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import {
  InfraWithNodes,
  Node,
  ServerStatus,
  ServerResource,
} from '../../types/infra';
import { ServerInput } from '../../types/server';
import { api } from '../../services/api';
import * as kubernetesApi from '../../lib/api/kubernetes';
import { awxApi, backupApi } from '../../lib/api';
import {
  getNodeStatus,
  installLoadBalancer,
  installFirstMaster,
  joinMaster,
  joinWorker,
  removeNode,
  startServer,
  stopServer,
  restartServer,
  deleteWorker,
} from '../../lib/api/kubernetes';
import { AuthHops } from '../../lib/api';
import MultiHopAuthModal from '../common/MultiHopAuthModal';
import { ensureSshCreds, saveAuthHopsToStore } from '../../utils/sshHelper';
import {
  AddNodeModal,
  ExternalKubeAuthModal,
  ServerResourceModal,
} from './modals';
import { useCredsStore } from '../../stores/useCredsStore';
import { useAuth } from '../../context/AuthContext';
import { useBackupAuthHandler } from '../../pages/backup/BackupAuthHandler';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

type NodeType = 'master' | 'worker' | 'ha';

interface Node {
  id: string;
  nodeType: NodeType;
  ip: string;
  port: string;
  server_name?: string;
  join_command?: string;
  certificate_key?: string;
  last_checked?: string;
  status: ServerStatus;
  hops: string;
  updated_at?: string;
  ha?: string; // Added ha field
}

interface InfraKubernetesSettingProps {
  infra: InfraWithNodes;
  showSettingsModal: (infra: InfraWithNodes) => void;
  isExternal?: boolean;
}

interface VeleroInstallForm {
  environmentName: string;
  kubernetesInfraId: number;
  namespace: string;
}

interface Environment {
  id?: number;
  infra_id?: number;
  type: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  bucket?: string;
  status: 'active' | 'installing' | 'failed' | 'inactive';
  connected_minio_id?: number;
  created_at?: string;
  updated_at?: string;
  // 추가 UI 표시용 필드들
  name?: string;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  namespace?: string;
  kubernetesClusterName?: string;
  storageId?: number;
}

const InfraKubernetesSetting: React.FC<InfraKubernetesSettingProps> = ({
  infra,
  showSettingsModal,
  isExternal = false,
}) => {
  const isAdmin = infra.user_role === 'admin';
  const credsStore = useCredsStore();
  const { user } = useAuth();
  const [storagesLoading, setStoragesLoading] = useState(false);
  const [storages, setStorages] = useState([]);

  // buildOperationHops 변수를 컴포넌트 최상단에 한 번만 선언
  let buildOperationHops: { host: string; port: number }[] = [];

  // 스토어에서 서버 인증 정보를 가져오는 함수
  const getStoredServerCredentials = (host: string, port: number) => {
    const normalizedHost = host.trim().toLowerCase();
    const normalizedPort = port || 22;

    return credsStore.serverlist.find(
      server =>
        server.host.trim().toLowerCase() === normalizedHost &&
        (server.port || 22) === normalizedPort
    );
  };

  // 스토어에서 hops 정보를 기반으로 인증 정보를 가져오는 함수
  const getStoredAuthHops = (
    hops: { host: string; port: number; username?: string }[]
  ) => {
    return hops.map(hop => {
      const storedCreds = getStoredServerCredentials(hop.host, hop.port);
      return {
        ...hop,
        // 스토어에 값이 있으면 사용, 없으면 hop.username 또는 기본값 'root'
        username: storedCreds?.userId || hop.username || 'root',
        // 스토어에 값이 있으면 사용, 없으면 빈 문자열
        password: storedCreds?.password || '',
      };
    });
  };

  // 스토어에 인증 정보를 저장하는 함수
  const saveCredentialsToStore = (authHops: AuthHops[]) => {
    authHops.forEach(hop => {
      credsStore.upsertServerByHostPort({
        host: hop.host,
        port: hop.port,
        userId: hop.username,
        password: hop.password,
      });
    });
  };

  const [isAddNodeModalVisible, setIsAddNodeModalVisible] = useState(false);
  const [isHACredentialsModalVisible, setIsHACredentialsModalVisible] =
    useState(false);
  const [buildingNode, setBuildingNode] = useState<Node | null>(null);
  const [checkingNode, setCheckingNode] = useState<Node | null>(null);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [checkingLoading, setCheckingLoading] = useState(false);
  const [nodes, setNodes] = useState<Node[]>(infra.nodes || []);
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<NodeType>('ha');
  const [mainTab, setMainTab] = useState<'node' | 'service'>('node'); // 메인 탭 상태 추가
  const [checkingNodeId, setCheckingNodeId] = useState<string | null>(null);
  const [haCredentials, setHaCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [pendingMasterBuild, setPendingMasterBuild] = useState<{
    hopsData: any;
    username: string;
    password: string;
    originalWorkerNode?: Node;
    purpose?: string;
    targetNode?: Node;
  } | null>(null);
  const [isRebuildMode, setIsRebuildMode] = useState(false);
  const [isCheckingAllServers, setIsCheckingAllServers] = useState(false);
  const [isMainMasterCreating, setIsMainMasterCreating] = useState(false);

  const [authRequest, setAuthRequest] = useState<{
    node: Node;
    purpose:
      | 'build'
      | 'checkStatus'
      | 'resource'
      | 'rebuild'
      | 'start'
      | 'stop'
      | 'restart'
      | 'ha_auth'
      | 'delete_worker_auth'
      | 'delete_master_auth';
    isRebuildMode?: boolean;
    isRenewalMode?: boolean;
    // [NEW] 삭제 흐름을 위한 추가 정보
    deletePayload?: any;
    // [NEW] 부분 인증 정보
    partialCredentials?: {
      host: string;
      port: number;
      username: string;
      password: string;
    }[];
  } | null>(null);
  const [haAuthHops, setHaAuthHops] = useState<AuthHops[] | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{
    type: 'worker' | 'master';
    stage: 'target' | 'main' | 'ha' | 'done';
    targetNode: Node;
    targetAuth?: AuthHops[];
    mainAuth?: AuthHops[];
    haAuth?: AuthHops[];
  } | null>(null);

  // 외부 쿠버네티스 관련 상태 추가
  const [externalAuthModalVisible, setExternalAuthModalVisible] =
    useState(false);
  const [externalServer, setExternalServer] = useState<{
    ip: string;
    port: string;
  } | null>(null);
  const [externalNodesInfo, setExternalNodesInfo] = useState<{
    total: number;
    master: number;
    worker: number;
    list: any[];
  } | null>(null);

  // 타입별 상태를 저장할 state 추가
  const [nodeTypeStatuses, setNodeTypeStatuses] = useState<{
    [nodeId: string]: {
      [type: string]: {
        status: ServerStatus;
        lastChecked: string;
      };
    };
  }>({});

  // 서버 인증 정보를 저장할 상태 추가
  const [serverCredentials, setServerCredentials] = useState<
    {
      node: Node;
      username: string;
      password: string;
    }[]
  >([]);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // 리소스 조회 관련 상태 추가
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [resourceNode, setResourceNode] = useState<Node | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [serverResource, setServerResource] = useState<ServerResource | null>(
    null
  );

  // 안전 장치 관련 상태 추가
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(
    new Set()
  );
  const [lastOperationTime, setLastOperationTime] = useState<{
    [key: string]: number;
  }>({});
  const [criticalOperationCount, setCriticalOperationCount] = useState(0);
  const [operationHistory, setOperationHistory] = useState<
    Array<{
      id: string;
      type: string;
      node: string;
      timestamp: number;
      status: 'success' | 'failed' | 'in_progress';
    }>
  >([]);

  // 안전 장치 유틸리티 함수들
  const isOperationAllowed = (
    nodeId: string,
    operationType: string
  ): boolean => {
    // // 동일한 노드에서 작업이 진행 중인지 확인
    // if (operationsInProgress.has(nodeId)) {
    //   return false;
    // }

    // // 마지막 작업으로부터 최소 대기 시간 확인 (5초)
    // const lastTime = lastOperationTime[nodeId];

    // if (lastTime && Date.now() - lastTime < 5000) {
    //   return false;
    // }

    // // 전체 시스템에서 동시 진행 중인 중요 작업 수 제한 (최대 3개)
    // if (
    //   ['delete', 'build', 'restart'].includes(operationType) &&
    //   criticalOperationCount >= 3
    // ) {
    //   return false;
    // }

    return true;
  };

  const startOperation = (nodeId: string, operationType: string) => {
    setOperationsInProgress(prev => new Set([...Array.from(prev), nodeId]));
    setLastOperationTime(prev => ({ ...prev, [nodeId]: Date.now() }));

    if (['delete', 'build', 'restart'].includes(operationType)) {
      setCriticalOperationCount(prev => prev + 1);
    }

    // 작업 히스토리에 추가
    const operationId = `${nodeId}-${operationType}-${Date.now()}`;

    setOperationHistory(prev => [
      ...prev,
      {
        id: operationId,
        type: operationType,
        node: nodeId,
        timestamp: Date.now(),
        status: 'in_progress',
      },
    ]);

    return operationId;
  };

  const endOperation = (
    nodeId: string,
    operationType: string,
    operationId: string,
    success: boolean
  ) => {
    setOperationsInProgress(prev => {
      const newSet = new Set(prev);

      newSet.delete(nodeId);

      return newSet;
    });

    if (['delete', 'build', 'restart'].includes(operationType)) {
      setCriticalOperationCount(prev => Math.max(0, prev - 1));
    }

    // 작업 히스토리 업데이트
    setOperationHistory(prev =>
      prev.map(op =>
        op.id === operationId
          ? { ...op, status: success ? 'success' : 'failed' }
          : op
      )
    );
  };

  const convertServerToNode = (server: Server): Node => {
    let ip = '';
    let port = '';

    try {
      const hopsData =
        typeof server.hops === 'string' ? JSON.parse(server.hops) : server.hops;
      if (Array.isArray(hopsData) && hopsData.length > 0) {
        const lastHop = hopsData[hopsData.length - 1];
        ip = lastHop.host || '';
        port = lastHop.port ? String(lastHop.port) : '';
      }
    } catch (e) {
      console.error(`Hops 파싱 오류 (서버 ID: ${server.id}):`, e);
    }

    return {
      ...server, // Server의 모든 속성을 일단 복사
      id: String(server.id), // id를 string으로 덮어쓰기
      nodeType: server.type, // API의 type을 nodeType으로 매핑
      ip: ip,
      port: port,
      status: server.status || '등록',
      hops:
        typeof server.hops === 'string'
          ? server.hops
          : JSON.stringify(server.hops),
    };
  };

  const validateClusterIntegrity = (
    nodes: Node[]
  ): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = [];

    // // 마스터 노드 검증
    // const masterNodes = nodes.filter(n =>
    //   n.nodeType === 'master' || (typeof n.nodeType === 'string' && n.nodeType.includes('master'))
    // );
    // const runningMasters = masterNodes.filter(n => n.status === 'running');

    // if (runningMasters.length === 0 && masterNodes.length > 0) {
    //   warnings.push('실행 중인 마스터 노드가 없습니다. 클러스터가 작동하지 않을 수 있습니다.');
    // }

    // if (runningMasters.length === 1) {
    //   warnings.push('마스터 노드가 1개만 실행 중입니다. 고가용성을 위해 추가 마스터 노드를 구축하는 것을 권장합니다.');
    // }

    // // HA 노드 검증
    // const haNodes = nodes.filter(n =>
    //   n.nodeType === 'ha' || (typeof n.nodeType === 'string' && n.nodeType.includes('ha'))
    // );
    // const runningHAs = haNodes.filter(n => n.status === 'running');

    // if (masterNodes.length > 1 && runningHAs.length === 0) {
    //   warnings.push('다중 마스터 구성에서 HA 노드가 실행되지 않고 있습니다.');
    // }

    // // 워커 노드 검증
    // const workerNodes = nodes.filter(n =>
    //   n.nodeType === 'worker' || (typeof n.nodeType === 'string' && n.nodeType.includes('worker'))
    // );
    // const runningWorkers = workerNodes.filter(n => n.status === 'running');

    // if (runningWorkers.length === 0 && workerNodes.length > 0) {
    //   warnings.push('실행 중인 워커 노드가 없습니다. 애플리케이션 배포가 제한될 수 있습니다.');
    // }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  };

  // 노드 상태에 따른 아이콘 반환 함수 수정
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'stopped':
        return <CloseCircleOutlined style={{ color: '#bfbfbf' }} />;
      case 'maintenance':
        return <SyncOutlined spin style={{ color: '#faad14' }} />;
      case 'preparing':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'checking':
        return <SyncOutlined spin style={{ color: '#1890ff' }} />;
      case '등록':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case 'needs_check':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // 노드 상태에 따른 텍스트 반환 함수 수정
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '활성';
      case 'stopped':
        return '비활성';
      case 'maintenance':
        return '작업 중';
      case 'preparing':
        return '구축 전';
      case 'checking':
        return '조회 중';
      case '등록':
        return '등록';
      case 'needs_check':
        return '확인 필요';
      default:
        return '알 수 없음';
    }
  };

  // 노드 타입에 따라 필터링 (단순화) - 노드가 타입을 포함하면 해당 탭에 표시
  const haNodes =
    nodes.filter(node => {
      // 노드 타입 확인 (문자열 또는 배열)
      if (typeof node.nodeType === 'string') {
        // 콤마로 구분된 타입이면 'ha'가 포함되어 있는지 확인
        if (node.nodeType.includes(',')) {
          return node.nodeType
            .split(',')
            .map(t => t.trim())
            .includes('ha');
        }

        // 단일 타입이면 'ha'인지 확인
        return node.nodeType === 'ha';
      }

      return false;
    }) || [];

  const masterNodes =
    nodes.filter(node => {
      // 노드 타입 확인 (문자열 또는 배열)
      if (typeof node.nodeType === 'string') {
        // 콤마로 구분된 타입이면 'master'가 포함되어 있는지 확인
        if (node.nodeType.includes(',')) {
          return node.nodeType
            .split(',')
            .map(t => t.trim())
            .includes('master');
        }

        // 단일 타입이면 'master'인지 확인
        return node.nodeType === 'master';
      }

      return false;
    }) || [];

  const workerNodes =
    nodes.filter(node => {
      // 노드 타입 확인 (문자열 또는 배열)
      if (typeof node.nodeType === 'string') {
        // 콤마로 구분된 타입이면 'worker'가 포함되어 있는지 확인
        if (node.nodeType.includes(',')) {
          return node.nodeType
            .split(',')
            .map(t => t.trim())
            .includes('worker');
        }

        // 단일 타입이면 'worker'인지 확인
        return node.nodeType === 'worker';
      }

      return false;
    }) || [];

  // 단일 서버 상태 확인 함수
  const handleCheckStatusConfirm = async (
    authHops: AuthHops[],
    targetNode?: Node
  ) => {
    // targetNode가 전달되면 그것을 사용, 아니면 checkingNode 사용
    const nodeToCheck = targetNode || checkingNode;

    if (!nodeToCheck) {
      return;
    }

    // targetNode가 전달되었는데 checkingNode가 설정되지 않은 경우 설정
    if (targetNode && !checkingNode) {
      setCheckingNode(targetNode);
    }

    const isRenewalMode = pendingMasterBuild?.originalWorkerNode !== undefined;

    if (isRenewalMode) {
      // authHops 배열의 마지막 요소에서 인증 정보를 추출하여 전달합니다.
      if (authHops && authHops.length > 0) {
        const lastHop = authHops[authHops.length - 1];

        if (lastHop?.username && lastHop?.password) {
          await handleCertificateRenewalConfirm(
            lastHop.username,
            lastHop.password
          );
        } else {
          message.error('인증 정보가 불완전합니다.');
        }
      } else {
        message.error('인증 정보가 올바르지 않습니다.');
      }

      return;
    }

    messageApi.loading({
      content: `${nodeToCheck.server_name || nodeToCheck.ip} 상태 조회 중...`,
      key: nodeToCheck.id,
    });

    try {
      setCheckingLoading(true);
      setCheckingNodeId(nodeToCheck.id);
      setNodes(prev =>
        prev.map(node =>
          node.id === nodeToCheck.id
            ? { ...node, status: 'checking' as ServerStatus }
            : node
        )
      );

      const fullServerInfoPromise = kubernetesApi.getServerById(
        parseInt(nodeToCheck.id)
      );

      const nodeTypes =
        typeof nodeToCheck.nodeType === 'string' &&
        nodeToCheck.nodeType.includes(',')
          ? nodeToCheck.nodeType.split(',').map(t => t.trim())
          : [nodeToCheck.nodeType];

      const statusResults: {
        [key: string]: { status: ServerStatus; lastChecked: string };
      } = {};
      let hasAnySuccess = false;
      let lastError: Error | null = null;

      // activeTab에 해당하는 타입만 실행
      const typeToCheck = activeTab;
      try {
        const response = await awxApi.runPlaybook({
          hops: authHops,
          playbook_to_run: 'status_kubernetes',
          node_type: typeToCheck,
          awxTemplate: user?.awx_template || 0,
          server_id: parseInt(nodeToCheck.id),
        });

        let nodeStatus: ServerStatus;

        // AWX 응답에서 상태 정보 추출
        const awxResult = (response.data as any)?.awx_job_result;
        const details = awxResult?.details;

        if (!details?.installed) {
          nodeStatus = 'preparing';
        } else if (details?.running) {
          nodeStatus = 'running';
        } else {
          nodeStatus = 'stopped';
        }

        statusResults[typeToCheck] = {
          status: nodeStatus,
          lastChecked: details?.collection_time || new Date().toISOString(),
        };
        hasAnySuccess = true;
      } catch (error) {
        console.error(
          `[상태 조회 실패] 노드: ${nodeToCheck.server_name || nodeToCheck.ip}, 타입: ${typeToCheck}`,
          error
        );
        lastError = error;
      }

      if (!hasAnySuccess) {
        throw (
          lastError ||
          new Error('모든 노드 타입에 대한 상태 조회가 실패했습니다.')
        );
      }

      const fullServerInfo = await fullServerInfoPromise;

      if (!fullServerInfo) {
        throw new Error(
          `DB에서 서버(ID: ${nodeToCheck.id})의 상세 정보를 찾을 수 없습니다. 서버가 삭제되었거나 문제가 발생했습니다.`
        );
      }

      setNodes(prev =>
        prev.map(node => {
          if (node.id === nodeToCheck.id) {
            // 현재 활성화된 탭에 맞는 status를 찾습니다.
            const currentTabStatus =
              statusResults[activeTab] || statusResults[nodeTypes[0]];
            return {
              ...convertServerToNode(fullServerInfo), // DB 정보로 객체 교체
              status: currentTabStatus.status, // 실시간 상태 덮어쓰기
              last_checked: currentTabStatus.lastChecked, // 실시간 시간 덮어쓰기
            };
          }
          return node;
        })
      );

      setNodeTypeStatuses(prev => ({
        ...prev,
        [nodeToCheck.id]: { ...prev[nodeToCheck.id], ...statusResults },
      }));

      // 인증 정보 저장은 이제 다중 hop을 지원하지 않으므로, 필요하다면 구조 변경이 필요합니다.
      // 우선 마지막 hop 정보만 저장하거나, 이 로직을 제거/수정하는 것을 고려할 수 있습니다.
      // 여기서는 마지막 hop 정보만 저장하는 것으로 가정합니다.
      if (authHops && authHops.length > 0) {
        const lastHop = authHops[authHops.length - 1];

        setServerCredentials(prev => {
          const existingIndex = prev.findIndex(
            cred => cred.node.id === nodeToCheck.id
          );

          if (existingIndex >= 0) {
            const updated = [...prev];

            updated[existingIndex] = {
              node: nodeToCheck,
              username: lastHop.username,
              password: lastHop.password,
            };

            return updated;
          } else {
            return [
              ...prev,
              {
                node: nodeToCheck,
                username: lastHop.username,
                password: lastHop.password,
              },
            ];
          }
        });
      }

      messageApi.success({
        content: '노드 상태 조회가 완료되었습니다.',
        key: nodeToCheck.id,
        duration: 2,
      });
    } catch (error: unknown) {
      console.error('노드 상태 조회 실패:', error as Error);
      setNodes(prev =>
        prev.map(node => {
          if (node.id === nodeToCheck.id && node.status === 'checking') {
            return { ...node, status: '등록' as ServerStatus };
          }

          return node;
        })
      );

      let errorMessage = '노드 상태 조회에 실패했습니다.';

      if (error?.response?.data?.error) {
        errorMessage = `노드 상태 조회 실패: ${error.response.data.error}`;
      } else if (error?.message) {
        errorMessage = `노드 상태 조회 실패: ${error.message}`;
      }

      // 에러 메시지 표시
      Modal.error({
        title: '노드 상태 조회 오류',
        content: errorMessage,
        okText: '확인',
      });

      // 에러 발생 시 인증 팝업창 띄우기
      if (nodeToCheck) {
        setAuthRequest({
          node: nodeToCheck,
          purpose: 'checkStatus',
          partialCredentials: nodeToCheck.hops
            ? getStoredAuthHops(JSON.parse(nodeToCheck.hops))
            : undefined,
        });
        // 에러 발생 시 checkingNode는 팝업창에서 사용할 수 있도록 유지
        return; // 여기서 함수 종료하여 finally 블록의 checkingNode 초기화 방지
      }
    } finally {
      setCheckingNodeId(null);
      setCheckingLoading(false);
      // checkingNode는 에러 발생 시 팝업창에서 사용할 수 있도록 유지
    }
  };

  // 메인 마스터 노드 함수를 추가하여 updated_at 시간을 체크하는 함수
  const isCertificateValid = (updatedAt: string | undefined): boolean => {
    if (!updatedAt) return false;

    // 문자열을 Date 객체로 변환
    const updatedDate = new Date(updatedAt);
    const currentDate = new Date();

    // 두 시간 차이 계산 (밀리초)
    const timeDifference = currentDate.getTime() - updatedDate.getTime();

    // 2시간 = 7,200,000 밀리초
    const twoHoursInMilliseconds = 2 * 60 * 60 * 1000;

    // 2시간 이내인지 확인
    return timeDifference <= twoHoursInMilliseconds;
  };

  // 노드 구축 시작
  // 노드 재구축 함수 (기존 설치 완전 제거 후 새로 설치)
  const handleRebuild = async (node: Node) => {
    if (!isOperationAllowed(node.id, 'rebuild')) {
      messageApi.warning(
        '다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.'
      );

      return;
    }

    // 재구축 모드 설정 (모달이 닫혔다가 다시 열려도 유지)
    setIsRebuildMode(true);

    const isHA = node.nodeType === 'ha';
    const isMaster =
      node.nodeType === 'master' ||
      (typeof node.nodeType === 'string' && node.nodeType.includes('master'));
    const isWorker = node.nodeType === 'worker';

    if (isWorker) {
      // 워커 노드 재구축 시 메인 마스터 노드 찾기
      const mainMasterNode = nodes.find(
        n =>
          (n.nodeType === 'master' ||
            (typeof n.nodeType === 'string' &&
              n.nodeType.includes('master'))) &&
          n.join_command &&
          n.certificate_key
      );

      if (!mainMasterNode) {
        Modal.error({
          title: '메인 마스터 노드 없음',
          content:
            '워커 노드를 재구축하려면 먼저 메인 마스터 노드가 구축되어 있어야 합니다.',
        });

        return;
      }

      // 인증서 유효시간 체크
      if (!isCertificateValid(mainMasterNode.updated_at)) {
        Modal.confirm({
          title: '인증서 만료',
          content: (
            <div>
              <p style={{ marginBottom: '12px' }}>
                메인 마스터 노드{' '}
                <strong>
                  {mainMasterNode.server_name || mainMasterNode.ip}
                </strong>
                의 인증서가 만료되었습니다 (2시간 이상 경과).
              </p>
              <p style={{ marginBottom: '12px', color: '#faad14' }}>
                ⚠️ 워커 노드를 재구축하려면 먼저 메인 마스터 노드의 인증서를
                갱신해야 합니다.
              </p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                자동으로 인증서를 갱신하시겠습니까?
              </p>
            </div>
          ),
          okText: '자동 갱신',
          cancelText: '취소',
          onOk: () => handleCertificateRenewal(mainMasterNode, node),
        });

        return;
      }
    }

    // HOP 자격증명 자동 확인 및 진행

    buildOperationHops = JSON.parse(node.hops || '[]');

    // 스토어 상태 확인
    const storeState = useCredsStore.getState();

    if (buildOperationHops.length > 0) {
      const ready = await ensureSshCreds(buildOperationHops, async authHops => {
        // 자동 진행 성공 시
        try {
          setBuildingNode(node);
          setIsRebuildMode(true);
          await handleRebuildConfirm(authHops, node, undefined);
        } catch (error) {
          // 실패 시 팝업 자동 표시 (기존 값으로 채움)
          setBuildingNode(node);
          setIsRebuildMode(true);
          setAuthRequest({ node, purpose: 'rebuild', isRebuildMode: true });
        }
      });

      if (ready) {
        // 자동 진행 완료 (ensureSshCreds에서 onReady 콜백이 실행됨)
        return;
      }
    }

    // 자동 진행 불가능 시 기존 방식
    setBuildingNode(node);
    setIsRebuildMode(true);
    setAuthRequest({ node, purpose: 'rebuild', isRebuildMode: true });
  };

  const handleStartBuild = async (node: Node) => {

    // 안전 장치: 작업 진행 여부 확인
    if (!isOperationAllowed(node.id, 'build')) {
      if (operationsInProgress.has(node.id)) {
        messageApi.warning(
          '해당 노드에서 다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.'
        );
      } else {
        messageApi.warning(
          '최근 작업으로부터 충분한 시간이 지나지 않았거나 동시 작업 수가 제한에 도달했습니다. 잠시 후 다시 시도해주세요.'
        );
      }

      return;
    }

    // HOP 자격증명 자동 확인 및 진행

    buildOperationHops = JSON.parse(node.hops || '[]');

    if (buildOperationHops.length > 0) {
      const ready = await ensureSshCreds(buildOperationHops, async authHops => {
        // 자동 진행 성공 시
        try {
          // 여기서 실제 구축 로직 호출
          proceedWithBuild(node);
        } catch (error) {
          proceedWithBuild(node);
        }
      });

      if (ready) {
        // 자동 진행 완료
        return;
      }
    }

    // 마스터 조인 또는 워커 추가인 경우 인증서 유효시간 먼저 체크
    const isMaster =
      node.nodeType === 'master' ||
      (typeof node.nodeType === 'string' && node.nodeType.includes('master'));
    const isWorker =
      node.nodeType === 'worker' ||
      (typeof node.nodeType === 'string' && node.nodeType.includes('worker'));

    // 첫 번째 마스터인지 확인 (join_command와 certificate_key가 있는 노드가 없는 경우)
    const isFirstMaster =
      isMaster &&
      !nodes.some(
        n =>
          n.id !== node.id &&
          (n.nodeType === 'master' ||
            (typeof n.nodeType === 'string' &&
              n.nodeType.includes('master'))) &&
          n.status === 'running' &&
          n.join_command &&
          n.certificate_key
      );

    // 마스터 조인 또는 워커 추가인 경우에만 인증서 체크
    if ((isMaster && !isFirstMaster) || isWorker) {
      // 메인 마스터 노드 찾기
      const mainMasterNode = nodes.find(
        n =>
          (n.nodeType === 'master' ||
            (typeof n.nodeType === 'string' &&
              n.nodeType.includes('master'))) &&
          n.join_command &&
          n.certificate_key
      );

      if (!mainMasterNode) {
        Modal.error({
          title: '오류',
          content: '메인 마스터 노드를 찾을 수 없습니다.',
          okText: '확인',
        });

        return;
      }

      // 인증서 유효시간 체크
      if (!isCertificateValid(mainMasterNode.updated_at)) {
        Modal.confirm({
          title: '인증서 만료',
          content: (
            <div>
              <p style={{ marginBottom: '12px' }}>
                메인 마스터 노드{' '}
                <strong>
                  {mainMasterNode.server_name || mainMasterNode.ip}
                </strong>
                의 인증서가 만료되었습니다 (2시간 이상 경과).
              </p>
              <p style={{ marginBottom: '12px', color: '#faad14' }}>
                ⚠️ 워커 노드를 구축하려면 먼저 메인 마스터 노드의 인증서를
                갱신해야 합니다.
              </p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                자동으로 인증서를 갱신하시겠습니까?
              </p>
            </div>
          ),
          okText: '자동 갱신',
          cancelText: '취소',
          okButtonProps: { type: 'primary' },
          onOk: () => {
            handleCertificateRenewal(mainMasterNode, node);
          },
          onCancel: () => {
            messageApi.info('인증서를 갱신한 후 다시 시도해주세요.');
          },
        });

        return;
      }
    }

    // HOP 자격증명 자동 확인 및 진행
    buildOperationHops = JSON.parse(node.hops || '[]');
    if (buildOperationHops.length > 0) {
      // 스토어에서 저장된 인증 정보 확인
      const storedAuthHops = getStoredAuthHops(buildOperationHops);
      const hasCompleteCredentials = storedAuthHops.every(
        hop => hop.username && hop.password
      );

      if (hasCompleteCredentials) {
        // 저장된 인증 정보로 자동 진행 시도
        try {
          setBuildingNode(node);
          await handleBuildConfirm(storedAuthHops, 'build', undefined);
          return; // 자동 진행 완료
        } catch (error) {
          // 실패 시에도 스토어 정보는 유지 (사용자가 수정할 수 있도록)
        }
      }

      // 저장된 정보가 없거나 자동 진행 실패 시, 부분적으로 채워진 상태로 모달 표시
      const partialAuthHops = storedAuthHops.map(hop => ({
        ...hop,
        username: hop.username || '',
        password: hop.password || '',
      }));

      // 인증 요청 상태에 부분 정보 설정
      setAuthRequest({
        node,
        purpose: 'build',
        partialCredentials: partialAuthHops,
      });
      return;
    }

    // 클러스터 무결성 검증 (위험한 작업인 경우)
    if (isMaster || isWorker) {
      const integrityCheck = validateClusterIntegrity(nodes);

      if (integrityCheck.warnings.length > 0) {
        Modal.info({
          title: '클러스터 상태 확인',
          content: (
            <div>
              <p>현재 클러스터 상태:</p>
              <ul>
                {integrityCheck.warnings.map((warning, index) => (
                  <li
                    key={index}
                    style={{ color: '#faad14', marginBottom: '4px' }}
                  >
                    {warning}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '12px' }}>계속 진행하시겠습니까?</p>
            </div>
          ),
          okText: '계속 진행',
          cancelText: '취소',
          onOk: async () => {
            // HOP 자격증명 자동 확인 및 진행
            buildOperationHops = JSON.parse(node.hops || '[]');
            if (buildOperationHops.length > 0) {
              // 스토어에서 저장된 인증 정보 확인
              const storedAuthHops = getStoredAuthHops(buildOperationHops);
              const hasCompleteCredentials = storedAuthHops.every(
                hop => hop.username && hop.password
              );

              if (hasCompleteCredentials) {
                // 저장된 인증 정보로 자동 진행 시도
                try {
                  setBuildingNode(node);
                  await handleBuildConfirm(storedAuthHops, 'build', undefined);
                  return; // 자동 진행 완료
                } catch (error) {
                  // 실패 시에도 스토어 정보는 유지 (사용자가 수정할 수 있도록)
                }
              }

              // 저장된 정보가 없거나 자동 진행 실패 시, 부분적으로 채워진 상태로 모달 표시
              const partialAuthHops = storedAuthHops.map(hop => ({
                ...hop,
                username: hop.username || '',
                password: hop.password || '',
              }));

              // 인증 요청 상태에 부분 정보 설정
              setAuthRequest({
                node,
                purpose: 'build',
                partialCredentials: partialAuthHops,
              });
              return;
            }

            // 자동 진행 불가능 시 기존 방식
            proceedWithBuild(node);
          },
        });

        return;
      }
    }

    setBuildingNode(node);
    setIsRebuildMode(false);
    setAuthRequest({ node, purpose: 'build' }); // 이 줄로 수정
  };

  // 인증서 갱신 처리 함수
  const handleCertificateRenewal = async (
    mainMasterNode: Node,
    originalWorkerNode: Node
  ) => {
    if (!isOperationAllowed(mainMasterNode.id, 'renew_certificate')) {
      messageApi.warning(
        '다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.'
      );

      return;
    }

    const operationId = startOperation(mainMasterNode.id, 'renew_certificate');

    try {
      messageApi.loading('인증서 갱신 중...', 0);
      setCheckingNode(mainMasterNode);
      // 수정된 부분: setAuthRequest 호출
      setAuthRequest({
        node: mainMasterNode,
        purpose: 'checkStatus',
        isRenewalMode: true,
      });
      setPendingMasterBuild({
        hopsData: [],
        username: '',
        password: '',
        originalWorkerNode: originalWorkerNode,
      });
    } catch (error: any) {
      console.error('인증서 갱신 시작 중 오류:', error);
      messageApi.error('인증서 갱신을 시작할 수 없습니다.');
      endOperation(mainMasterNode.id, 'renew_certificate', operationId, false);
    }
  };

  // 인증서 갱신 확인 처리
  const handleCertificateRenewalConfirm = async (
    username: string,
    password: string
  ) => {
    if (!checkingNode) return;
    const operationId = startOperation(checkingNode.id, 'renew_certificate');

    try {
      setCheckingLoading(true);

      buildOperationHops = JSON.parse(checkingNode.hops || '[]');

      // 스토어에서 저장된 인증 정보 확인
      const storedAuthHops = getStoredAuthHops(buildOperationHops);
      const hasCompleteCredentials = storedAuthHops.every(
        hop => hop.username && hop.password
      );

      if (hasCompleteCredentials) {
        // 저장된 인증 정보로 자동 진행
        try {
          messageApi.loading('메인 마스터 노드 인증서 갱신 중...', 0);
          const response = await kubernetesApi.renewCertificate({
            id: parseInt(checkingNode.id),
            hops: storedAuthHops,
          });

          if (response && response.success) {
            // 성공 시 스토어에 저장
            saveCredentialsToStore(storedAuthHops);
            // 기존 성공 처리 로직 계속
            messageApi.destroy();
            messageApi.success('인증서가 성공적으로 갱신되었습니다!');

            // 노드 정보 업데이트 (updated_at 시간 갱신)
            setNodes(prev =>
              prev.map(node => {
                if (node.id === checkingNode.id) {
                  return {
                    ...node,
                    updated_at: getCurrentTimeString(),
                    join_command: response.join_command || node.join_command,
                    certificate_key:
                      response.certificate_key || node.certificate_key,
                  };
                }
                return node;
              })
            );

            // 원래 워커 노드 구축 진행
            if (pendingMasterBuild?.originalWorkerNode) {
              const workerNode = pendingMasterBuild.originalWorkerNode;
              setTimeout(() => {
                messageApi.info(
                  '인증서 갱신이 완료되었습니다. 워커 노드 구축을 진행합니다.'
                );
                proceedWithBuild(workerNode);
                setPendingMasterBuild(null);
              }, 1000);
            }

            endOperation(
              checkingNode.id,
              'renew_certificate',
              operationId,
              true
            );
            setCheckingLoading(false);
            setExternalAuthModalVisible(false);
            return;
          }
        } catch (error) {
          // 실패 시에도 스토어 정보는 유지 (사용자가 수정할 수 있도록)
        }
      }

      // 저장된 정보가 없거나 자동 진행 실패 시, 부분적으로 채워진 상태로 모달 표시
      const partialAuthHops = storedAuthHops.map(hop => ({
        ...hop,
        username: hop.username || '',
        password: hop.password || '',
      }));

      // 인증 요청 상태에 부분 정보 설정
      setAuthRequest({
        node: checkingNode,
        purpose: 'checkStatus',
        partialCredentials: partialAuthHops,
        isRenewalMode: true,
      });
      return;

      if (response && response.success) {
        messageApi.destroy();
        messageApi.success('인증서가 성공적으로 갱신되었습니다!');

        // 노드 정보 업데이트 (updated_at 시간 갱신)
        setNodes(prev =>
          prev.map(node => {
            if (node.id === checkingNode.id) {
              return {
                ...node,
                updated_at: getCurrentTimeString(),
                join_command: response.join_command || node.join_command,
                certificate_key:
                  response.certificate_key || node.certificate_key,
              };
            }

            return node;
          })
        );

        // 원래 워커 노드 구축 진행
        if (pendingMasterBuild?.originalWorkerNode) {
          const workerNode = pendingMasterBuild.originalWorkerNode;

          setTimeout(() => {
            messageApi.info(
              '인증서 갱신이 완료되었습니다. 워커 노드 구축을 진행합니다.'
            );
            proceedWithBuild(workerNode);
            setPendingMasterBuild(null);
          }, 1000);
        }

        endOperation(checkingNode.id, 'renew_certificate', operationId, true);
      } else {
        throw new Error(response?.message || '인증서 갱신에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('인증서 갱신 실패:', error);
      messageApi.destroy();
      messageApi.error(
        `인증서 갱신 실패: ${error.message || '알 수 없는 오류'}`
      );
      endOperation(checkingNode.id, 'renew_certificate', operationId, false);
    } finally {
      setCheckingLoading(false);
      setAuthRequest(null);
    }
  };

  // 실제 구축 진행 함수
  const proceedWithBuild = (node: Node) => {

    // HOP 자격증명 자동 확인 및 진행

    buildOperationHops = JSON.parse(node.hops || '[]');

    if (buildOperationHops.length > 0) {
      // 스토어에서 저장된 인증 정보 확인
      const storedAuthHops = getStoredAuthHops(buildOperationHops);
      const hasCompleteCredentials = storedAuthHops.every(
        hop => hop.username && hop.password
      );

      if (hasCompleteCredentials) {
        // 저장된 인증 정보로 자동 진행 시도
        try {
          // 기존 로직 계속 진행
          // 자동 진행 성공 시 스토어에 저장
          saveCredentialsToStore(storedAuthHops);
          //return;
        } catch (error) {
          // 실패 시에도 스토어 정보는 유지 (사용자가 수정할 수 있도록)
        }
      } else {
        // 저장된 정보가 없거나 자동 진행 실패 시, 부분적으로 채워진 상태로 모달 표시
        const partialAuthHops = storedAuthHops.map(hop => ({
          ...hop,
          username: hop.username || '',
          password: hop.password || '',
        }));

        // 인증 요청 상태에 부분 정보 설정
        setAuthRequest({
          node,
          purpose: 'build',
          partialCredentials: partialAuthHops,
        });
        return;
      }
    }

    setBuildingNode(node);

    // 백그라운드 작업 (마스터/워커 조인)이 아닌 경우에만 상태를 'maintenance'로 변경
    const isBackgroundBuildStart =
      (activeTab === 'master' || activeTab === 'worker') &&
      node.status === 'preparing';

    if (!isBackgroundBuildStart) {
      const updatedNodes = nodes.map(n => {
        if (n.id === node.id) {
          return { ...n, status: 'maintenance' as ServerStatus };
        }

        return n;
      });

      setNodes(updatedNodes);
    }

    // 마스터 노드 설치 시 HA 노드 인증 정보가 필요한지 확인
    if (activeTab === 'master') {
      const haNodes = nodes.filter(
        n =>
          n.nodeType === 'ha' ||
          (typeof n.nodeType === 'string' && n.nodeType.includes('ha'))
      );

      if (haNodes.length === 0) {
        // HA 노드 인증 정보가 아직 없다면 HA 인증 모달 먼저 표시
        setIsHACredentialsModalVisible(true);
      } else {
        // HA 인증 정보가 이미 있거나 HA 노드가 없다면 바로 서버 구축 모달 표시
        setAuthRequest({ node, purpose: 'build' }); // 수정
      }
    } else {
      // 마스터 노드가 아닌 경우 바로 서버 구축 모달 표시
      setAuthRequest({ node, purpose: 'build' }); // 수정
    }
  };

  // 노드 제거 처리
  const handleRemoveNode = (nodeId: string) => {
    // 안전 장치: 작업 진행 여부 확인
    if (!isOperationAllowed(nodeId, 'delete')) {
      if (operationsInProgress.has(nodeId)) {
        messageApi.warning(
          '해당 노드에서 다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.'
        );
      } else {
        messageApi.warning(
          '최근 작업으로부터 충분한 시간이 지나지 않았습니다. 잠시 후 다시 시도해주세요.'
        );
      }

      return;
    }

    // 삭제할 노드 찾기
    const targetNode = nodes.find(node => node.id === nodeId);

    if (!targetNode) {
      Modal.error({
        title: '오류',
        content: '노드를 찾을 수 없습니다.',
        okText: '확인',
      });

      return;
    }

    // 노드가 구축 중이면 삭제 불가
    if (targetNode.status === 'maintenance') {
      messageApi.warning(
        '노드가 현재 구축 중이거나 작업 중입니다. 작업이 완료된 후 삭제할 수 있습니다.'
      );

      return;
    }

    // 클러스터 무결성 검증
    const integrityCheck = validateClusterIntegrity(
      nodes.filter(n => n.id !== nodeId)
    );

    if (integrityCheck.warnings.length > 0) {
      Modal.warning({
        title: '클러스터 무결성 경고',
        content: (
          <div>
            <p>이 노드를 삭제하면 다음과 같은 문제가 발생할 수 있습니다:</p>
            <ul>
              {integrityCheck.warnings.map((warning, index) => (
                <li
                  key={index}
                  style={{ color: '#faad14', marginBottom: '4px' }}
                >
                  {warning}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: '12px', fontWeight: 'bold' }}>
              정말로 계속하시겠습니까?
            </p>
          </div>
        ),
        okText: '위험 감수하고 삭제',
        cancelText: '취소',
        okButtonProps: { danger: true },
        onOk: () => proceedWithNodeRemoval(targetNode),
      });

      return;
    }

    proceedWithNodeRemoval(targetNode);
  };

  // 실제 노드 제거 처리 함수
  const proceedWithNodeRemoval = (targetNode: Node) => {
    const nodeId = targetNode.id; // nodeId를 함수 내에서 정의

    // 노드 상태에 따라 다른 처리 - 구축 전 상태일 경우 DB에서만 삭제
    if (targetNode.status === '등록' || targetNode.status === 'preparing') {
      // 구축되지 않은 노드는 DB에서만 삭제
      Modal.confirm({
        title: '서버 삭제 확인',
        content: (
          <div>
            <p>
              <strong>{targetNode.server_name || targetNode.ip}</strong> 서버를
              삭제하시겠습니까?
            </p>
            <p>아직 구축되지 않은 노드입니다. 서버 정보만 삭제됩니다.</p>
          </div>
        ),
        okText: '삭제',
        cancelText: '취소',
        okButtonProps: { danger: true },
        onOk: async () => {
          const operationId = startOperation(targetNode.id, 'delete');

          try {
            messageApi.loading(
              `${targetNode.server_name || targetNode.ip} 서버 삭제 중...`
            );

            // 서버 삭제 API 호출
            await kubernetesApi.deleteServer(parseInt(targetNode.id));

            // UI에서 노드 제거
            const updatedNodes = nodes.filter(
              node => node.id !== targetNode.id
            );

            setNodes(updatedNodes);

            messageApi.success(
              `${targetNode.server_name || targetNode.ip} 서버가 삭제되었습니다.`
            );
            endOperation(targetNode.id, 'delete', operationId, true);
          } catch (error: any) {
            console.error('서버 삭제 중 오류 발생:', error);
            Modal.error({
              title: '서버 삭제 실패',
              content: `서버를 삭제하는 중 오류가 발생했습니다. (${error.message || '알 수 없는 오류'})`,
              okText: '확인',
            });
            endOperation(targetNode.id, 'delete', operationId, false);
          }
        },
      });
    } else {
      // 이미 구축된 노드의 경우 노드 유형에 따라 다른 처리
      setSelectedNode(targetNode);

      if (
        targetNode.nodeType === 'worker' ||
        (typeof targetNode.nodeType === 'string' &&
          targetNode.nodeType.includes('worker'))
      ) {
        setDeleteRequest({ type: 'worker', stage: 'target', targetNode });
      } else if (
        targetNode.nodeType === 'master' ||
        (typeof targetNode.nodeType === 'string' &&
          targetNode.nodeType.includes('master'))
      ) {
        setDeleteRequest({ type: 'master', stage: 'target', targetNode });
      } else if (
        targetNode.nodeType === 'ha' ||
        (typeof targetNode.nodeType === 'string' &&
          targetNode.nodeType.includes('ha'))
      ) {
        messageApi.warning(
          'HA 노드는 직접 삭제할 수 없습니다. 마스터 노드를 삭제하면 관련 정보가 정리됩니다.'
        );
      } else {
        // 기타 노드 유형의 경우 단순 삭제
        Modal.confirm({
          title: '서버 삭제 확인',
          content: (
            <div>
              <p>
                <strong>{targetNode.server_name || targetNode.ip}</strong>{' '}
                서버를 삭제하시겠습니까?
              </p>
              <p>서버 정보가 완전히 삭제되며, 복구할 수 없습니다.</p>
            </div>
          ),
          okText: '삭제',
          cancelText: '취소',
          okButtonProps: { danger: true },
          onOk: async () => {
            const operationId = startOperation(targetNode.id, 'delete');

            try {
              messageApi.loading(
                `${targetNode.server_name || targetNode.ip} 서버 삭제 중...`
              );

              // 서버 삭제 API 호출
              await kubernetesApi.deleteServer(parseInt(targetNode.id));

              // UI에서 노드 제거
              const updatedNodes = nodes.filter(
                node => node.id !== targetNode.id
              );

              setNodes(updatedNodes);

              messageApi.success(
                `${targetNode.server_name || targetNode.ip} 서버가 삭제되었습니다.`
              );
              endOperation(targetNode.id, 'delete', operationId, true);
            } catch (error: any) {
              console.error('서버 삭제 중 오류 발생:', error);
              Modal.error({
                title: '서버 삭제 실패',
                content: `서버를 삭제하는 중 오류가 발생했습니다. (${error.message || '알 수 없는 오류'})`,
                okText: '확인',
              });
              endOperation(targetNode.id, 'delete', operationId, false);
            }
          },
        });
      }
    }
  };

  const executeDeleteWorker = async () => {
    if (
      !deleteRequest ||
      !deleteRequest.targetNode ||
      !deleteRequest.targetAuth ||
      !deleteRequest.mainAuth
    ) {
      messageApi.error('삭제에 필요한 인증 정보가 부족합니다.');
      setDeleteRequest(null);
      return;
    }

    const { targetNode, targetAuth, mainAuth } = deleteRequest;
    const mainMasterNode = nodes.find(n => n.join_command && n.certificate_key);

    if (!mainMasterNode) {
      messageApi.error('메인 마스터 노드를 찾을 수 없습니다.');
      setDeleteRequest(null);
      return;
    }

    const operationId = startOperation(targetNode.id, 'delete');
    const originalNodes = nodes; // ❗️ 실패 시 복원을 위해 원래 노드 목록을 백업합니다.
    setNodes(prevNodes => prevNodes.filter(node => node.id !== targetNode.id));

    messageApi.loading({
      content: `워커 노드 ${targetNode.server_name || targetNode.ip} 삭제를 시작합니다...`,
      key: targetNode.id,
    });

    try {
      //  API를 호출하고 즉시 응답을 받습니다.
      const response = await kubernetesApi.deleteWorker({
        id: Number(targetNode.id),
        infra_id: infra.id,
        main_id: Number(mainMasterNode.id),
        hops: targetAuth,
        main_hops: mainAuth,
        password: targetAuth[targetAuth.length - 1].password,
        main_password: mainAuth[mainAuth.length - 1].password,
      });

      //  백엔드가 보내준 안내 메시지를 그대로 사용자에게 보여줍니다.
      messageApi.success({
        content: response.message,
        key: targetNode.id,
        duration: 5,
      });

      //  UI를 즉시 갱신합니다.
      handleRefreshNodes();
      endOperation(targetNode.id, 'delete', operationId, true);
    } catch (error: any) {
      messageApi.error({
        content: `워커 노드 삭제 시작에 실패했습니다: ${error.message}`,
        key: targetNode.id,
        duration: 4,
      });
      setNodes(originalNodes); // ❗️ 백업해둔 노드 목록으로 되돌립니다.
      endOperation(targetNode.id, 'delete', operationId, false);
    } finally {
      setDeleteRequest(null); // 프로세스 종료
      setAuthRequest(null); // 인증 모달 상태 닫기
    }
  };

  // [NEW] 실제 마스터 삭제를 실행하는 함수
  const executeDeleteMaster = async () => {
    if (
      !deleteRequest ||
      !deleteRequest.targetNode || // targetNode를 사용하도록 수정
      !deleteRequest.targetAuth ||
      !deleteRequest.mainAuth
    ) {
      messageApi.error('삭제에 필요한 인증 정보가 부족합니다.');
      setDeleteRequest(null);
      return;
    }

    const { targetNode, targetAuth, mainAuth, haAuth } = deleteRequest;

    //  로딩 메시지를 띄우고, API를 호출합니다.
    const operationId = startOperation(targetNode.id, 'delete');
    messageApi.loading({
      content: `마스터 노드 ${targetNode.server_name || targetNode.ip} 삭제를 시작합니다...`,
      key: targetNode.id,
    });

    try {
      //  API를 호출하고 즉시 응답을 받습니다.
      const response = await kubernetesApi.deleteMaster({
        id: Number(targetNode.id),
        infra_id: infra.id,
        hops: targetAuth,
        main_hops: mainAuth,
        lb_hops: haAuth,
        // password 필드들도 전달
        password: targetAuth[targetAuth.length - 1].password,
        main_password: mainAuth[mainAuth.length - 1].password,
        lb_password: haAuth ? haAuth[haAuth.length - 1].password : undefined,
      });

      //  백엔드가 보내준 안내 메시지를 그대로 사용자에게 보여줍니다.
      messageApi.success({
        content: response.message,
        key: targetNode.id,
        duration: 5,
      });

      //  UI를 즉시 갱신하여 삭제 중임을 표시합니다.
      //    예를 들어, 해당 노드를 목록에서 제거하거나 상태를 'deleting'으로 변경합니다.
      //    가장 간단한 방법은 목록을 새로고침하는 것입니다.
      handleRefreshNodes();
      endOperation(targetNode.id, 'delete', operationId, true);
    } catch (error: any) {
      messageApi.error({
        content: `마스터 노드 삭제 시작에 실패했습니다: ${error.message}`,
        key: targetNode.id,
        duration: 4,
      });
      endOperation(targetNode.id, 'delete', operationId, false);
    } finally {
      setDeleteRequest(null); // 프로세스 종료
      setAuthRequest(null); // 인증 모달 상태 닫기
    }
  };

  // 노드 상태 확인 함수 수정
  const handleCheckNodeStatus = useCallback(
    async (nodeId: string, showMessage: boolean = true) => {
      try {
        // 상태 강제 초기화 (이전 작업의 잔여 상태 정리)
        if (checkingNode || authRequest) {
          setCheckingNode(null);
          setAuthRequest(null);
          // 상태 업데이트를 기다리기 위해 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 현재 노드 찾기
        const targetNode = nodes.find(node => node.id === nodeId);

        if (!targetNode) {
          if (showMessage) {
            Modal.error({
              title: '오류',
              content: '노드를 찾을 수 없습니다.',
              okText: '확인',
            });
          }

          return;
        }

        // 1. 팝업창 띄우기 전에 해당 정보가 스토어에 있는지 확인
        try {
          const hops = JSON.parse(targetNode.hops || '[]');

          if (hops.length > 0) {
            // 스토어에서 저장된 인증 정보 확인
            const storedAuthHops = getStoredAuthHops(hops);

            // 2. 스토어에 값이 전부 다 있는지 확인
            const hasCompleteCredentials = storedAuthHops.every(
              hop => hop.username && hop.password
            );

            if (hasCompleteCredentials) {
              // 4. 스토어에 값이 전부 다 있음 → 팝업창 없이 자동 진행
              setCheckingNode(targetNode);

              try {
                await handleCheckStatusConfirm(storedAuthHops, targetNode);
                return; // 자동 처리 완료 시 함수 종료
              } catch (error) {
                // 5. 4번 실패 시 → 스토어 값으로 팝업창에 미리 채워서 보여주기
                setAuthRequest({
                  node: targetNode,
                  purpose: 'checkStatus',
                  partialCredentials: storedAuthHops,
                });
                return;
              }
            } else {
              // 3. 스토어에 값이 일부만 있음 → 있는 것은 아이디+비번, 없는 것은 아이디만 입력으로 팝업창
            }
          }
        } catch {
          // hops 파싱 실패 시 무시하고 계속 진행
        }

        // 2,3. 스토어에 값이 없거나 일부만 있을 때 모달 표시
        setCheckingNode(targetNode);

        // partialCredentials 설정: 스토어에 있는 값은 아이디+비번, 없는 값은 아이디만
        const partialCredentials = targetNode.hops
          ? getStoredAuthHops(JSON.parse(targetNode.hops))
          : undefined;

        setAuthRequest({
          node: targetNode,
          purpose: 'checkStatus',
          partialCredentials: partialCredentials,
        });
      } catch (error) {
        console.error('노드 상태 확인 준비 중 오류 발생:', error);
        if (showMessage) {
          Modal.error({
            title: '노드 상태 확인 오류',
            content: '노드 상태 확인 준비에 실패했습니다.',
            okText: '확인',
          });
        }
      }
    },
    [nodes, checkingNode, authRequest]
  );

  // 탭 변경 시 해당 타입의 상태로 업데이트
  useEffect(() => {
    const updatedNodes = nodes.map(node => {
      // 노드의 타입 목록 구하기
      const nodeTypes =
        typeof node.nodeType === 'string' && node.nodeType.includes(',')
          ? node.nodeType.split(',').map(t => t.trim())
          : [node.nodeType];

      // 현재 노드가 현재 탭의 타입을 포함하는지 확인
      const hasActiveTabType = nodeTypes.includes(activeTab);

      // 노드의 저장된 상태 정보 가져오기
      const nodeStatuses = nodeTypeStatuses[node.id];

      // 현재 탭에 해당하는 상태가 있고, 노드가 해당 타입을 가진 경우에만 상태 업데이트
      if (nodeStatuses && nodeStatuses[activeTab] && hasActiveTabType) {
        return {
          ...node,
          status: nodeStatuses[activeTab].status,
          last_checked: nodeStatuses[activeTab].lastChecked,
        };
      }

      return node;
    });

    setNodes(updatedNodes);
  }, [activeTab, nodeTypeStatuses]);

  // 상태 초기화 감지 및 처리
  useEffect(() => {
    // authRequest가 설정되었거나 로딩 중일 때는 checkingNode 유지
    if (!authRequest && checkingNode && !checkingLoading) {
      setCheckingNode(null);
    }
  }, [authRequest, checkingNode, checkingLoading]);

  useEffect(() => {
    // infra가 바뀔 때마다 노드 목록 새로고침
    const initialCheck = async () => {
      // 페이지 로드 시 노드 목록 새로고침
      const refreshedNodes = await handleRefreshNodes();

      if (refreshedNodes && Array.isArray(refreshedNodes)) {
        // 페이지 로드 시 상태 조회가 필요한 서버들 필터링 (더 정확한 조건)
        const serversNeedingStatusCheck = refreshedNodes.filter(node => {
          // last_checked가 존재하고 유효한 값인지 확인
          return (
            node.last_checked &&
            node.last_checked !== '' &&
            node.last_checked !== 'null' &&
            node.last_checked !== 'undefined'
          );
        });

        if (serversNeedingStatusCheck.length > 0) {
          // 전체 서버 조회 모드 설정
          setIsCheckingAllServers(true);

          // 자동 인증 시도 (팝업창 없이)
          const firstNode = serversNeedingStatusCheck[0];
          try {
            const hops = JSON.parse(firstNode.hops || '[]');
            if (hops.length > 0) {
              // 스토어에서 저장된 인증 정보 확인
              const storedAuthHops = getStoredAuthHops(hops);
              const hasCompleteCredentials = storedAuthHops.every(
                hop => hop.username && hop.password
              );

              if (hasCompleteCredentials) {
                // 자동으로 상태 확인 실행
                setCheckingNode(firstNode);
                await handleCheckStatusConfirm(storedAuthHops);
              } else {
                // 인증 정보가 없을 때만 모달 표시
                setCheckingNode(firstNode);
                setAuthRequest({
                  node: firstNode,
                  purpose: 'checkStatus',
                });
              }
            }
          } catch (error) {
            // 파싱 실패 시에도 모달 표시
            setCheckingNode(firstNode);
            setAuthRequest({
              node: firstNode,
              purpose: 'checkStatus',
            });
          }
        }
      }
    };

    initialCheck();
    getVeleroInfo();
  }, [infra]); // infra가 바뀔 때마다 실행

  useEffect(() => {
    if (!deleteRequest) return;

    const { type, stage, targetNode } = deleteRequest;

    if (type === 'worker') {
      if (stage === 'target') {
        // 1. 삭제할 워커 노드에 대한 인증 요청
        setAuthRequest({ node: targetNode, purpose: 'delete_worker_auth' });
      } else if (stage === 'main') {
        // 2. 메인 마스터 노드에 대한 인증 요청
        const mainMasterNode = nodes.find(
          n => n.join_command && n.certificate_key
        );

        if (mainMasterNode) {
          setAuthRequest({
            node: mainMasterNode,
            purpose: 'delete_worker_auth',
          });
        } else {
          messageApi.error(
            '메인 마스터 노드를 찾을 수 없어 삭제를 진행할 수 없습니다.'
          );
          setDeleteRequest(null); // 프로세스 중단
        }
      } else if (stage === 'done') {
        // 3. 모든 인증 정보 수집 완료, 실제 삭제 로직 실행
        executeDeleteWorker();
      }
    }

    if (type === 'master') {
      if (stage === 'target') {
        // 1. 삭제할 마스터 노드 인증
        setAuthRequest({ node: targetNode, purpose: 'delete_master_auth' });
      } else if (stage === 'main') {
        // 2. 메인 마스터 노드 인증
        const mainMasterNode = nodes.find(
          n => n.join_command && n.certificate_key
        );

        if (mainMasterNode) {
          setAuthRequest({
            node: mainMasterNode,
            purpose: 'delete_master_auth',
          });
        } else {
          messageApi.error(
            '메인 마스터 노드를 찾을 수 없어 삭제를 진행할 수 없습니다.'
          );
          setDeleteRequest(null);
        }
      } else if (stage === 'ha') {
        // 3. HA 노드 인증 (필요한 경우)
        const haNodesExist = nodes.some(n => n.nodeType.includes('ha'));

        if (haNodesExist) {
          const representativeHaNode = nodes.find(n =>
            n.nodeType.includes('ha')
          );

          if (representativeHaNode) {
            setAuthRequest({
              node: representativeHaNode,
              purpose: 'delete_master_auth',
            });
          }
        } else {
          // HA 노드가 없으면 바로 삭제 실행
          setDeleteRequest(prev => (prev ? { ...prev, stage: 'done' } : null));
        }
      } else if (stage === 'done') {
        // 4. 모든 인증 정보 수집 완료, 실제 삭제 로직 실행
        executeDeleteMaster();
      }
    }
  }, [deleteRequest]);

  // 노드 추가 처리
  const handleAddNode = async (values: {
    server_name?: string;
    hops: { host: string; port: number; username: string; password: string }[]; // user -> username
  }) => {
    try {
      if (!infra) {
        messageApi.error('인프라 정보가 없습니다.');

        return;
      }

      // 1. SSH 연결 테스트 먼저 수행
      try {
        await api.kubernetes.testSSHConnection(values.hops);
        messageApi.success('SSH 연결 테스트가 성공했습니다.');
      } catch (error) {
        messageApi.error(
          'SSH 연결 테스트에 실패했습니다. 연결 정보를 확인해주세요.'
        );
        console.error('SSH 연결 테스트 실패:', error);
        return;
      }

      const lastHop = values.hops[values.hops.length - 1];

      const existingServer = nodes.find(node => {
        try {
          const nodeHops = JSON.parse(node.hops);
          const nodeLastHop = nodeHops[nodeHops.length - 1];

          return (
            nodeLastHop.host === lastHop.host &&
            nodeLastHop.port === lastHop.port
          );
        } catch {
          // Hops parsing failed - treat as no match
          return false;
        }
      });

      if (existingServer) {
        const existingTypes = existingServer.nodeType
          .split(',')
          .map(t => t.trim());

        if (existingTypes.includes(activeTab)) {
          messageApi.info(`이미 ${activeTab} 타입으로 등록된 서버입니다.`);

          return;
        }
        const newTypeString = [...existingTypes, activeTab].join(',');
        const updateData: any = {
          id: parseInt(existingServer.id),
          type: newTypeString,
          infra_id: infra.id,
        };

        if (
          activeTab !== 'ha' &&
          !existingServer.server_name &&
          values.server_name
        ) {
          updateData.server_name = values.server_name;
        }
        await kubernetesApi.updateServer(
          parseInt(existingServer.id),
          updateData
        );
        messageApi.success(`기존 서버에 ${activeTab} 타입이 추가되었습니다.`);
      } else {
        const status: ServerStatus = '등록';

        // 2. 비밀번호를 제외한 hops 데이터 생성 (DB 저장용)
        const hopsForDb = values.hops.map(hop => ({
          host: hop.host,
          port: hop.port,
          username: hop.username,
          // password는 제외
        }));

        if (activeTab === 'ha') {
          // HA 노드일 경우: name 필드를 제외하고 API 호출
          const serverData = {
            infra_id: infra.id,
            type: activeTab,
            status: '등록' as ServerStatus,
            ip: lastHop.host,
            port: lastHop.port,
            hops: hopsForDb, // 비밀번호 제외된 데이터
            // name 필드를 아예 포함시키지 않음
          };

          await kubernetesApi.createServer(serverData as any);
          messageApi.success(`HA 노드가 추가되었습니다. (IP: ${lastHop.host})`);

          // 3. AWX에 호스트 추가 (원본 데이터 사용 - SSH 키 포함)
          try {
            await awxApi.addHost(
              values.hops,
              user.awx_inventory,
              user.awx_template
            );
          } catch (error) {
            console.warn('AWX 호스트 추가 실패:', error);
          }
        } else {
          // HA 노드가 아닐 경우: name 필드를 필수로 포함하여 API 호출
          if (!values.server_name) {
            messageApi.error('마스터/워커 노드는 서버 이름이 필수입니다.');

            return;
          }
          const serverData = {
            infra_id: infra.id,
            type: activeTab,
            name: values.server_name, // string 타입으로 확정
            status: '등록' as ServerStatus,
            ip: lastHop.host,
            port: lastHop.port,
            hops: hopsForDb, // 비밀번호 제외된 데이터
          };

          await kubernetesApi.createServer(serverData);
          const nodeTypeText = activeTab === 'master' ? '마스터' : '워커';

          messageApi.success(
            `${nodeTypeText} 노드가 추가되었습니다. (이름: ${values.server_name})`
          );

          // 3. AWX에 호스트 추가 (원본 데이터 사용 - SSH 키 포함)
          try {
            await awxApi.addHost(
              values.hops,
              user.awx_inventory,
              user.awx_template
            );
          } catch (error) {
            console.warn('AWX 호스트 추가 실패:', error);
          }
        }
      }

      handleRefreshNodes();
    } catch (error) {
      console.error('노드 추가/수정 중 오류 발생:', error);
      messageApi.error('노드 추가/수정에 실패했습니다.');
    }
  };

  const handleBuildConfirm = async (
    authHops: AuthHops[],
    purpose: 'build' | 'start' | 'stop' | 'restart',
    lbAuthHops?: AuthHops[]
  ) => {
    if (!buildingNode) return;

    let isIntermediateReturn = false;
    const operationId = startOperation(buildingNode.id, 'build');

    messageApi.loading({
      content: `${buildingNode.server_name || buildingNode.ip} 서버 작업 시작...`,
      key: buildingNode.id,
    });

    try {
      let response: { message: string };

      const serverId = parseInt(buildingNode.id);
      const infraId = infra.id;
      const lastHopPassword =
        authHops.length > 0
          ? authHops[authHops.length - 1].password
          : undefined;

      if (purpose !== 'build') {
        setBuildingLoading(true);
        if (purpose === 'start') {
          await startServer({ id: serverId, hops: authHops });
          messageApi.success(
            `${buildingNode.server_name || buildingNode.ip} 노드가 시작되었습니다.`
          );
        } else if (purpose === 'restart') {
          await restartServer({ id: serverId, hops: authHops });
          messageApi.success(
            `${buildingNode.server_name || buildingNode.ip} 노드가 재시작되었습니다.`
          );
        }
      } else {
        // purpose === 'build'
        switch (activeTab) {
          case 'ha':
            response = await awxApi.runPlaybook({
              hops: authHops,
              playbook_to_run: 'install_haproxy',
              awxTemplate: user?.awx_template || 0,
            });
            break;

          case 'master':
            const isFirstMaster = !nodes.some(
              n =>
                n.id !== buildingNode.id &&
                n.nodeType.includes('master') &&
                n.status === 'running'
            );
            const haNodes = nodes.filter(n => n.nodeType.includes('ha'));

            // [핵심 수정] haAuthHops 상태 대신 인자로 받은 lbAuthHops를 확인
            if (haNodes.length > 0 && !lbAuthHops) {
              const representativeHaNode = haNodes[0];
              setPendingMasterBuild({
                hopsData: authHops,
                username: '',
                password: '',
                originalWorkerNode: undefined,
              });
              setAuthRequest({
                node: representativeHaNode,
                purpose: 'ha_auth',
              });
              isIntermediateReturn = true;
              return;
            }

            setBuildingLoading(true);

            //  [핵심 로직 2] 모든 인증 정보가 준비된 경우 (HA가 없거나, 2차 인증 후 호출된 경우)
            if (isFirstMaster) {
              if (haNodes.length > 0 && !lbAuthHops)
                throw new Error(
                  'HA 클러스터에는 HA 노드 인증 정보가 필수입니다.'
                );

              const masterLastHop = authHops[authHops.length - 1];
              const haLastHop = lbAuthHops
                ? lbAuthHops[lbAuthHops.length - 1]
                : null;
              const response_install = await awxApi.runPlaybook({
                playbook_to_run: 'install_kubernetes',
                hops: authHops,
                awxTemplate: user?.awx_template || 0,
              });
              if (response_install.success) {
                response = await awxApi.runPlaybook({
                  playbook_to_run: 'haproxy_update',
                  hops: lbAuthHops, // haproxy_update는 타겟 호스트가 lb_hops
                  lbHops: lbAuthHops || undefined,
                  master_ip: authHops[authHops.length - 1].host,
                  server_id: serverId,
                  infra_id: infraId,
                  awxTemplate: user?.awx_template || 0,
                });
                if (response.success) {
                  const response_init = await awxApi.runPlaybook({
                    playbook_to_run: 'init_k8s_master',
                    hops: authHops,
                    lbHops: lbAuthHops || undefined,
                    server_id: serverId,
                    awxTemplate: user?.awx_template || 0,
                  });
                  return;
                }
              }
            } else {
              //  [핵심] 마스터 조인 로직을 완성합니다.
              const mainMasterNode = nodes.find(
                n => n.join_command && n.certificate_key
              );
              if (!mainMasterNode)
                throw new Error('메인 마스터 노드를 찾을 수 없습니다.');
              if (!lbAuthHops) {
                setPendingMasterBuild({ hopsData: authHops });
                const representativeHaNode = nodes.find(n =>
                  n.nodeType.includes('ha')
                );
                if (representativeHaNode) {
                  setAuthRequest({
                    node: representativeHaNode,
                    purpose: 'ha_auth',
                  });
                } else {
                  throw new Error(
                    '마스터 조인에 필요한 HA 노드를 찾을 수 없습니다.'
                  );
                }
                isIntermediateReturn = true;
                return;
              }
              const response_install = await awxApi.runPlaybook({
                playbook_to_run: 'install_kubernetes',
                hops: authHops,
                awxTemplate: user?.awx_template || 0,
              });
              if (response_install.success) {
                response = await awxApi.runPlaybook({
                  playbook_to_run: 'haproxy_update',
                  hops: lbAuthHops, // haproxy_update는 타겟 호스트가 lb_hops
                  lbHops: lbAuthHops || undefined,
                  master_ip: authHops[authHops.length - 1].host,
                  server_id: serverId,
                  infra_id: infraId,
                  awxTemplate: user?.awx_template || 0,
                });
                if (response.success) {
                  const response_join = await awxApi.runPlaybook({
                    playbook_to_run: 'join_k8s_master',
                    hops: authHops,
                    lbHops: lbAuthHops || undefined,
                    main_id: parseInt(mainMasterNode.id),
                    master_ip: mainMasterNode.ip,
                    server_id: serverId,
                    awxTemplate: user?.awx_template || 0,
                  });
                  return;
                }
              }
              // response = await kubernetesApi.joinMaster({
              //   id: serverId,
              //   infra_id: infraId,
              //   hops: authHops,
              //   lb_hops: lbAuthHops,
              //   main_id: parseInt(mainMasterNode.id),
              //   password: lastHopPassword,
              //   lb_password: lbAuthHops[lbAuthHops.length - 1].password,
              // });
            }
            break;

          case 'worker': {
            // case를 블록으로 감싸서 변수 스코프 제한
            //  [핵심] 워커 조인 로직을 완성합니다.
            const mainMasterNode = nodes.find(
              n => n.join_command && n.certificate_key
            );
            if (!mainMasterNode)
              throw new Error('메인 마스터 노드를 찾을 수 없습니다.');
            const response_install = await awxApi.runPlaybook({
              playbook_to_run: 'install_kubernetes',
              hops: authHops,
              awxTemplate: user?.awx_template || 0,
            });
            if (response_install.success) {
              const response_join = await awxApi.runPlaybook({
                playbook_to_run: 'join_k8s_worker',
                hops: authHops,
                main_id: parseInt(mainMasterNode.id),
                server_id: serverId,
                awxTemplate: user?.awx_template || 0,
              });
              return;
            }

            // response = await kubernetesApi.joinWorker({
            //   id: serverId,
            //   infra_id: infraId,
            //   hops: authHops,
            //   main_id: parseInt(mainMasterNode.id),
            //   password: lastHopPassword,
            // });
            break;
          }
        }
      }

      messageApi.destroy(buildingNode.id);
      Modal.success({
        title: '작업 시작됨',
        content: response.message, // 백엔드가 보내준 안내 메시지
      });
      handleRefreshNodes();
      endOperation(buildingNode.id, 'build', operationId, true);
    } catch (error: any) {
      messageApi.error({
        content: `노드 작업 시작에 실패했습니다: ${error.message}`,
        key: buildingNode.id,
        duration: 4,
      });
      endOperation(buildingNode.id, 'build', operationId, false);
    } finally {
      if (!isIntermediateReturn) {
        setBuildingLoading(false);
        setBuildingNode(null);
        setPendingMasterBuild(null);
        // haAuthHops 상태를 더 이상 사용하지 않으므로 초기화 로직도 제거 가능 (또는 유지)
        setHaAuthHops(null);
        message.destroy(buildingNode?.id);
        setAuthRequest(null);
      }
    }
  };

  // 재구축 확인 함수
  const handleRebuildConfirm = async (
    authHops: AuthHops[],
    targetNode?: Node,
    haAuthHops?: AuthHops[]
  ) => {
    // 재구축 대상 노드를 파라미터 또는 buildingNode 상태에서 가져옵니다.
    const nodeToRebuild = targetNode || buildingNode;
    if (!nodeToRebuild) {
      messageApi.error('재구축 대상 노드 정보가 없습니다.');
      return;
    }
    // 작업 시작을 기록하고 로딩 메시지를 표시합니다.
    const operationId = startOperation(nodeToRebuild.id, 'rebuild');
    messageApi.loading({
      content: `${nodeToRebuild.server_name || nodeToRebuild.ip} 노드 재구축을 시작합니다...`,
      key: nodeToRebuild.id,
    });

    try {
      let response: NodeActionStartResult;
      const lastHopPassword =
        authHops.length > 0 ? authHops[authHops.length - 1].password : '';
      const mainMasterNode = nodes.find(
        n => n.join_command && n.certificate_key
      );

      // activeTab을 기준으로 재구축 타입 결정 (다중 타입 노드의 우선순위 문제 해결)
      if (activeTab === 'ha' && nodeToRebuild.nodeType.includes('ha')) {
        response = await awxApi.runPlaybook({
          playbook_to_run: 'uninstall_haproxy',
          hops: authHops,
          awxTemplate: user?.awx_template || 0,
        });
        if (response.success) {
          response = await awxApi.runPlaybook({
            playbook_to_run: 'install_haproxy',
            hops: authHops,
            awxTemplate: user?.awx_template || 0,
          });
        }
      }
      // 2. 마스터 노드 재구축 처리
      else if (
        activeTab === 'master' &&
        nodeToRebuild.nodeType.includes('master')
      ) {
        const isFirstMaster = !nodes.some(
          node =>
            node.id !== nodeToRebuild.id &&
            node.nodeType.includes('master') &&
            node.status === 'running'
        );

        // HA 노드가 존재하는지 확인
        const haNodesExist = nodes.some(node => node.nodeType.includes('ha'));

        // HA 인증이 필요한데 없는 경우 먼저 HA 인증 받기
        if (haNodesExist && !haAuthHops) {

          // 1. 현재 재구축 정보를 임시 저장
          setPendingMasterBuild({
            hopsData: authHops,
            username: '',
            password: '',
            purpose: 'rebuild', // 재구축임을 표시
            targetNode: nodeToRebuild, // 재구축 대상 노드 저장
          });

          // 2. 현재 상태 정리 (HA 인증 후 다시 설정될 예정)
          setBuildingLoading(false);
          messageApi.destroy(nodeToRebuild.id);

          // 3. HA 인증 요청
          const representativeHaNode = nodes.find(n =>
            n.nodeType.includes('ha')
          );
          if (representativeHaNode) {
            setAuthRequest({
              node: representativeHaNode,
              purpose: 'ha_auth',
            });
            return; // 함수 종료하고 HA 인증 대기
          } else {
            throw new Error('HA 노드를 찾을 수 없습니다.');
          }
        }

        // 2-1. 첫 번째 마스터 노드 재구축
        if (isFirstMaster) {
          response = await awxApi.runPlaybook({
            playbook_to_run: 'uninstall_kubernetes',
            hops: authHops,
            awxTemplate: user?.awx_template || 0,
          });
          if (response.success) {
            const response_install = await awxApi.runPlaybook({
              playbook_to_run: 'install_kubernetes',
              hops: authHops,
              awxTemplate: user?.awx_template || 0,
            });
            if (response_install.success) {
              const response_haproxy = await awxApi.runPlaybook({
                playbook_to_run: 'haproxy_update',
                hops: haAuthHops, // haproxy_update는 타겟 호스트가 lb_hops
                lbHops: haAuthHops || undefined,
                master_ip: authHops[authHops.length - 1].host,
                server_id: parseInt(nodeToRebuild.id),
                awxTemplate: user?.awx_template || 0,
              });
              if (response_haproxy.success) {
                const response_init_k8s_master = await awxApi.runPlaybook({
                  playbook_to_run: 'init_k8s_master',
                  hops: authHops,
                  lbHops: haAuthHops || undefined,
                  server_id: parseInt(nodeToRebuild.id),
                  awxTemplate: user?.awx_template || 0,
                });
              }
            }
          }
        }
        // 2-2. 두 번째 이후 마스터 노드 (조인) 재구축
        else {
          const mainMasterNode = nodes.find(
            n => n.join_command && n.certificate_key
          );
          if (!mainMasterNode) {
            throw new Error(
              '클러스터에 조인할 메인 마스터 노드를 찾을 수 없습니다.'
            );
          }
          const haNodesExist = nodes.some(node => node.nodeType.includes('ha'));

          //  [핵심 로직] HA 인증이 필요한데, 정보가 아직 없는 경우
          if (haNodesExist && !haAuthHops) {
            // 1. 현재 마스터 재구축 정보를 임시 저장합니다.
            setPendingMasterBuild({
              hopsData: authHops,
              purpose: 'rebuild', // "재구축" 작업이었음을 기억합니다.
            });

            // 2. HA 인증을 요청합니다.
            const representativeHaNode = nodes.find(n =>
              n.nodeType.includes('ha')
            );
            if (representativeHaNode) {
              setAuthRequest({
                node: representativeHaNode,
                purpose: 'ha_auth',
              });
            } else {
              throw new Error('인증을 요청할 HA 노드를 찾을 수 없습니다.');
            }

            // 3. API 호출을 막고 함수를 종료합니다.
            return;
          }
          response = await awxApi.runPlaybook({
            playbook_to_run: 'uninstall_kubernetes',
            hops: authHops,
            awxTemplate: user?.awx_template || 0,
          });
          if (response.success) {
            const response_install_kubernetes = await awxApi.runPlaybook({
              playbook_to_run: 'install_kubernetes',
              hops: authHops,
              awxTemplate: user?.awx_template || 0,
            });
            if (response_install_kubernetes.success) {
              const response_haproxy = await awxApi.runPlaybook({
                playbook_to_run: 'haproxy_update',
                hops: haAuthHops,
                lbHops: haAuthHops || undefined,
                master_ip: authHops[authHops.length - 1].host,
                server_id: parseInt(nodeToRebuild.id),
                awxTemplate: user?.awx_template || 0,
              });
              if (response_haproxy.success) {
                const response_join_k8s_master = await awxApi.runPlaybook({
                  playbook_to_run: 'join_k8s_master',
                  hops: authHops,
                  lbHops: haAuthHops || undefined,
                  main_id: parseInt(mainMasterNode.id),
                  master_ip: mainMasterNode.ip,
                  server_id: parseInt(nodeToRebuild.id),
                  awxTemplate: user?.awx_template || 0,
                });
              }
            }
          }
          // response = await kubernetesApi.rebuildMaster({
          //   id: parseInt(nodeToRebuild.id),
          //   infra_id: infra.id,
          //   hops: authHops,
          //   main_id: parseInt(mainMasterNode.id),
          //   lb_hops: haAuthHops,
          //   password: lastHopPassword,
          //   main_password: mainAuth[mainAuth.length - 1].password, // mainAuth는 별도로 관리되는 상태여야 함
          //   lb_password: haAuthHops[haAuthHops.length - 1].password,
          // });
        }
      }
      // 3. 워커 노드 재구축 처리
      else if (
        activeTab === 'worker' &&
        nodeToRebuild.nodeType.includes('worker')
      ) {
        if (!mainMasterNode) {
          throw new Error(
            '클러스터에 조인할 메인 마스터 노드를 찾을 수 없습니다.'
          );
        }
        response = await kubernetesApi.rebuildWorker({
          id: parseInt(nodeToRebuild.id),
          infra_id: infra.id,
          hops: authHops,
          password: lastHopPassword,
          main_id: parseInt(mainMasterNode.id),
        });
      }
      // 4. activeTab과 노드 타입이 일치하지 않는 경우 처리
      else {
        throw new Error(
          `현재 탭(${activeTab})과 노드 타입(${nodeToRebuild.nodeType})이 일치하지 않습니다.`
        );
      }
      // 모든 작업이 성공적으로 시작되었을 때의 공통 처리
      messageApi.destroy(nodeToRebuild.id);
      Modal.success({
        title: '작업 시작됨',
        content: response.message, // 백엔드가 보내준 안내 메시지
      });
      handleRefreshNodes(); // 목록 새로고침
      endOperation(nodeToRebuild.id, 'rebuild', operationId, true);
    } catch (error: any) {
      // 작업 시작 중 에러가 발생했을 때의 공통 처리
      messageApi.destroy(nodeToRebuild.id);
      Modal.error({
        title: '작업 시작 실패',
        content: `노드 재구축 시작에 실패1했습니다: ${error.message}`,
      });
      endOperation(nodeToRebuild.id, 'rebuild', operationId, false);
    } finally {
      // 작업이 성공하든 실패하든 항상 실행되는 정리 로직
      setBuildingLoading(false);
      setBuildingNode(null);
      // 재구축 과정에서 사용된 임시 상태들을 초기화할 수 있습니다.
      // setHaAuthHops(null);
    }
  };

  // 노드 목록 새로고침
  const handleRefreshNodes = async () => {
    try {
      if (!infra) {
        Modal.error({
          title: '오류',
          content: '인프라를 선택해주세요.',
          okText: '확인',
        });

        return [];
      }

      // 서버 목록 가져오기 API 호출
      const response = await kubernetesApi.getServers(infra.id);

      const serverList: Server[] = response || [];

      if (!Array.isArray(serverList)) {
        setNodes([]);
        return [];
      }

      // [수정 2] 복잡한 로직 대신, map 안에서 변환 함수를 호출하기만 하면 됩니다.
      const refreshedNodes = serverList.map(convertServerToNode);

      // 노드 데이터 업데이트
      setNodes(refreshedNodes);
      return refreshedNodes;
    } catch (error) {
      console.error('노드 목록 새로고침 중 오류 발생:', error);
      Modal.error({
        title: '노드 목록 새로고침 실패',
        content: '노드 목록 새로고침에 실패했습니다.',
        okText: '확인',
      });
      setNodes([]);
      return [];
    }
  };

  // timeString 생성 함수
  const getCurrentTimeString = () => {
    return new Date().toISOString();
  };

  // 노드 테이블 컬럼 정의
  const nodeColumns = [
    {
      title: '노드 ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '서버 이름',
      dataIndex: 'server_name',
      key: 'server_name',
      width: 120,
    },
    {
      title: '유형',
      dataIndex: 'nodeType',
      key: 'nodeType',
      width: 120,
      render: (nodeType: string, record: Node) => {
        // 복합 타입 처리 (콤마로 구분된 타입)
        if (typeof nodeType === 'string' && nodeType.includes(',')) {
          const types = nodeType.split(',').map(t => t.trim());

          return (
            <Space
              size={2}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
              }}
            >
              {types.includes('ha') && (
                <Tag
                  style={{
                    backgroundColor: '#e6f4ff',
                    color: '#1677ff',
                    border: '1px solid #91caff',
                    borderRadius: '4px',
                    padding: '0 4px',
                    fontSize: '11px',
                    width: '42px',
                    textAlign: 'center',
                    margin: '0 1px',
                    height: '20px',
                    lineHeight: '18px',
                  }}
                >
                  ha
                </Tag>
              )}
              {types.includes('master') && (
                <Tag
                  style={{
                    backgroundColor: '#f0f9eb',
                    color: '#52c41a',
                    border: '1px solid #b7eb8f',
                    borderRadius: '4px',
                    padding: '0 4px',
                    fontSize: '11px',
                    width:
                      record.join_command && record.certificate_key
                        ? '80px'
                        : '42px',
                    textAlign: 'center',
                    margin: '0 1px',
                    height: '20px',
                    lineHeight: '18px',
                  }}
                >
                  {record.join_command && record.certificate_key
                    ? 'main master'
                    : 'master'}
                </Tag>
              )}
              {types.includes('worker') && (
                <Tag
                  style={{
                    backgroundColor: '#fff2e8',
                    color: '#fa541c',
                    border: '1px solid #ffbb96',
                    borderRadius: '4px',
                    padding: '0 4px',
                    fontSize: '11px',
                    width: '42px',
                    textAlign: 'center',
                    margin: '0 1px',
                    height: '20px',
                    lineHeight: '18px',
                  }}
                >
                  worker
                </Tag>
              )}
            </Space>
          );
        }

        // 단일 타입 처리
        // 현재 활성화된 탭에 따라 적절한 스타일 설정
        let style = {};
        let text = '';

        if (activeTab === 'ha' || nodeType === 'ha') {
          text = 'ha';
          style = {
            backgroundColor: '#e6f4ff',
            color: '#1677ff',
            border: '1px solid #91caff',
            borderRadius: '4px',
            padding: '0 4px',
            fontSize: '11px',
            width: '42px',
            textAlign: 'center',
            margin: '0 auto',
            height: '20px',
            lineHeight: '18px',
          };
        } else if (activeTab === 'master' || nodeType === 'master') {
          // main master 조건 확인: join_command와 certificate_key가 있으면 main
          text =
            record.join_command && record.certificate_key
              ? 'main master'
              : 'master';
          style = {
            backgroundColor: '#f0f9eb',
            color: '#52c41a',
            border: '1px solid #b7eb8f',
            borderRadius: '4px',
            padding: '0 4px',
            fontSize: '11px',
            width:
              record.join_command && record.certificate_key ? '80px' : '42px',
            textAlign: 'center',
            margin: '0 auto',
            height: '20px',
            lineHeight: '18px',
          };
        } else if (activeTab === 'worker' || nodeType === 'worker') {
          text = 'worker';
          style = {
            backgroundColor: '#fff2e8',
            color: '#fa541c',
            border: '1px solid #ffbb96',
            borderRadius: '4px',
            padding: '0 4px',
            fontSize: '11px',
            width: '42px',
            textAlign: 'center',
            margin: '0 auto',
            height: '20px',
            lineHeight: '18px',
          };
        }

        return <Tag style={style}>{text}</Tag>;
      },
    },
    // {
    //   title: 'IP 주소',
    //   dataIndex: 'ip',
    //   key: 'ip',
    //   width: 130
    // },
    // {
    //   title: '포트',
    //   dataIndex: 'port',
    //   key: 'port',
    //   width: 80
    // },
    {
      title: '접속 경로',
      dataIndex: 'hops',
      key: 'hops',
      width: 250,
      render: (hopsJson: string) => {
        try {
          const parsedHops = JSON.parse(hopsJson);

          if (!Array.isArray(parsedHops) || parsedHops.length === 0) return '-';
          const tooltipTitle = parsedHops
            .map(hop => `${hop.host}:${hop.port}`)
            .join(' → ');

          return (
            <Tooltip title={tooltipTitle} placement='topLeft'>
              <Space size={4} wrap>
                {parsedHops.map((hop, index) => (
                  <React.Fragment key={index}>
                    <Tag
                      color={
                        index === parsedHops.length - 1 ? 'blue' : 'default'
                      }
                    >
                      {hop.host}:{hop.port}
                    </Tag>
                    {index < parsedHops.length - 1 && (
                      <ArrowRightOutlined style={{ color: '#bfbfbf' }} />
                    )}
                  </React.Fragment>
                ))}
              </Space>
            </Tooltip>
          );
        } catch {
          // Hops parsing failed - show error message
          return <Text type='danger'>경로 오류</Text>;
        }
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ServerStatus) => {
        return (
          <Space>
            {getStatusIcon(status)}
            <span>{getStatusText(status)}</span>
          </Space>
        );
      },
    },
    {
      title: '최근 상태 조회',
      dataIndex: 'last_checked',
      key: 'last_checked',
      width: 150,
      render: (lastChecked: string) => {
        if (!lastChecked) return '-';

        try {
          const date = new Date(lastChecked);

          return date
            .toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
            .replace(/\s+/g, ' ');
        } catch {
          return lastChecked;
        }
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 300,
      render: (_: any, record: Node) => renderNodeActions(record),
    },
  ];

  // 노드 액션 버튼 렌더링
  const renderNodeActions = (node: Node) => {
    const actions = [];
    const isOperationInProgress = operationsInProgress.has(node.id);

    actions.push(
      <Button
        key='check'
        size='small'
        icon={<SearchOutlined />}
        onClick={() => handleCheckNodeStatus(node.id)}
        disabled={isOperationInProgress}
        loading={isOperationInProgress && node.status === 'checking'}
      >
        상태 확인
      </Button>
    );

    if (!node.last_checked) {
      return <Space>{actions}</Space>;
    }

    if (node.status === 'running') {
      actions.push(
        <Button
          key='resource'
          size='small'
          icon={<DashboardOutlined />}
          onClick={() => handleResourceAuthClick(node)}
          disabled={isOperationInProgress}
        >
          리소스 확인
        </Button>
      );
    }

    //  isHA, isMaster, isWorker 변수 선언이 다시 포함되었습니다.
    const isHA = node.nodeType.includes('ha');
    const isMaster = node.nodeType.includes('master');
    const isWorker = node.nodeType.includes('worker');
    const isMainMaster = isMaster && node.join_command && node.certificate_key;
    const isFirstMaster =
      isMaster &&
      !nodes.some(
        n =>
          n.id !== node.id &&
          n.nodeType.includes('master') &&
          n.status === 'running'
      );

    if (isMaster && activeTab === 'master') {
      const otherMasterCount = nodes.filter(
        n => n.id !== node.id && n.nodeType.includes('master')
      ).length;
      const otherWorkerCount = nodes.filter(n =>
        n.nodeType.includes('worker')
      ).length;
      const canDeleteMainMaster =
        isMainMaster && otherMasterCount === 0 && otherWorkerCount === 0;
      const canDeleteMaster = !isMainMaster || canDeleteMainMaster;

      if (canDeleteMaster) {
        actions.push(
          <Button
            key='delete'
            size='small'
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveNode(node.id)}
            disabled={!isOperationAllowed(node.id, 'delete')}
            loading={isOperationInProgress}
          >
            삭제
          </Button>
        );
      }
    }

    if (isWorker && activeTab === 'worker') {
      actions.push(
        <Button
          key='delete'
          size='small'
          icon={<DeleteOutlined />}
          danger
          onClick={() => handleRemoveNode(node.id)}
        >
          삭제
        </Button>
      );
    }

    // 상태에 따른 액션 버튼 추가
    switch (node.status) {
      case '등록':
        // 등록 상태: 탭에 따라 다른 구축 버튼 표시
        if (activeTab === node.nodeType || node.nodeType.includes(activeTab)) {
          // 현재 활성화된 탭과 노드 유형이 일치하는 경우 상세 액션 버튼 표시
          if (!isMaster && !isWorker) {
            // 마스터와 워커는 위에서 이미 삭제 버튼을 추가했음
            actions.push(
              <Button
                key='delete'
                size='small'
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleRemoveNode(node.id)}
              >
                삭제
              </Button>
            );
          }
        }
        break;

      case 'preparing':
        if (activeTab === node.nodeType || node.nodeType.includes(activeTab)) {
          let buildButtonText = '구축';
          let icon = <ToolOutlined />;

          //  isHA를 확인하여 버튼 텍스트를 결정하는 로직이 다시 포함되었습니다.
          if (isHA && activeTab === 'ha') {
            buildButtonText = 'HA 구축';
          } else if (isMaster && activeTab === 'master') {
            buildButtonText = isFirstMaster ? '첫 마스터 구축' : '마스터 조인';
            icon = <ClusterOutlined />;
          } else if (isWorker && activeTab === 'worker') {
            buildButtonText = '워커 구축';
            icon = <CloudServerOutlined />;
          }

          actions.push(
            <Button
              key='build'
              size='small'
              icon={icon}
              onClick={() => handleStartBuild(node)}
              disabled={
                isMainMasterCreating || !isOperationAllowed(node.id, 'build')
              }
              loading={isOperationInProgress}
            >
              {buildButtonText}
            </Button>
          );
        }

        if (!isMaster && !isWorker) {
          actions.push(
            <Button
              key='delete'
              size='small'
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleRemoveNode(node.id)}
            >
              삭제
            </Button>
          );
        }
        break;

      // case 'running':
      //   // 활성 상태: 중지, 재시작 버튼
      //   // 현재 활성화된 탭과 노드 유형이 일치하는 경우 상세 액션 버튼 표시
      //   if (activeTab === node.nodeType || (typeof node.nodeType === 'string' && node.nodeType.includes(activeTab))) {
      //     actions.push(
      //       <Button
      //         key="stop"
      //         size="small"
      //         icon={<PoweroffOutlined />}
      //         onClick={() => handleNodeAction(node, 'stop')}
      //       >
      //         중지
      //       </Button>
      //     );

      //     actions.push(
      //       <Button
      //         key="restart"
      //         size="small"
      //         icon={<SyncOutlined />}
      //         onClick={() => handleNodeAction(node, 'restart')}
      //       >
      //         재시작
      //       </Button>
      //     );
      //   }
      //   break;

      case 'stopped':
        if (activeTab === node.nodeType || node.nodeType.includes(activeTab)) {
          let buildButtonText = '재구축';
          let icon = <ToolOutlined />;

          //  isHA를 확인하여 버튼 텍스트를 결정하는 로직이 다시 포함되었습니다.
          if (isHA && activeTab === 'ha') {
            buildButtonText = 'HA 재구축';
          } else if (isMaster && activeTab === 'master') {
            buildButtonText = isFirstMaster ? '첫 마스터 구축' : '마스터 조인';
            icon = <ClusterOutlined />;
          } else if (isWorker && activeTab === 'worker') {
            buildButtonText = '워커 재구축';
            icon = <CloudServerOutlined />;
          }

          actions.push(
            <Popconfirm
              key='rebuild-confirm'
              title='노드 재구축 확인'
              description={
                <div style={{ maxWidth: '350px' }}>
                  <p
                    style={{
                      margin: 0,
                      marginBottom: '8px',
                      fontWeight: 'bold',
                      color: '#ff4d4f',
                    }}
                  >
                    🔥 재구축 시 완전히 삭제되는 데이터:
                  </p>
                  <p
                    style={{ margin: 0, marginBottom: '4px', fontSize: '12px' }}
                  >
                    • 모든 Pod와 실행 중인 애플리케이션
                  </p>
                  <p
                    style={{ margin: 0, marginBottom: '4px', fontSize: '12px' }}
                  >
                    • 모든 네임스페이스와 리소스
                  </p>
                  <p
                    style={{ margin: 0, marginBottom: '4px', fontSize: '12px' }}
                  >
                    • ConfigMap, Secret 등 설정 데이터
                  </p>
                  <p
                    style={{ margin: 0, marginBottom: '4px', fontSize: '12px' }}
                  >
                    • Ingress, Service 설정
                  </p>
                  <p
                    style={{ margin: 0, marginBottom: '8px', fontSize: '12px' }}
                  >
                    • 기존 클러스터 인증서/토큰
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#1890ff',
                    }}
                  >
                    💾 PV 데이터는 보존될 수 있습니다.
                  </p>
                </div>
              }
              onConfirm={() => handleRebuild(node)}
              okText='데이터 삭제하고 재구축'
              cancelText='취소'
              okButtonProps={{
                danger: true,
                disabled: !isOperationAllowed(node.id, 'build'),
              }}
              disabled={!isOperationAllowed(node.id, 'build')}
            >
              <Button
                key='rebuild'
                size='small'
                icon={icon}
                type='primary'
                disabled={!isOperationAllowed(node.id, 'build')}
                loading={isOperationInProgress}
              >
                {buildButtonText}
              </Button>
            </Popconfirm>
          );
          // 위험한 시작 버튼 (경고와 함께 제공)
          // actions.push(
          // <Popconfirm
          //   key="start-confirm"
          //   title="비활성 노드 시작"
          //   description={
          //     <div style={{ maxWidth: '300px' }}>
          //       <p style={{ margin: 0, marginBottom: '8px', fontWeight: 'bold', color: '#ff4d4f' }}>
          //         ⚠️ 주의사항
          //       </p>
          //       <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px' }}>
          //         • 클러스터 상태 불일치 가능성
          //       </p>
          //       <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px' }}>
          //         • 인증서/토큰 만료 위험
          //       </p>
          //       <p style={{ margin: 0, marginBottom: '8px', fontSize: '12px' }}>
          //         • 네트워크 설정 충돌 가능성
          //       </p>
          //       <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>
          //         재구축을 권장합니다.
          //       </p>
          //     </div>
          //   }
          //   onConfirm={() => handleNodeAction(node, 'start')}
          //   okText="위험 감수하고 시작"
          //   cancelText="취소"
          //   okButtonProps={{ danger: true, disabled: !isOperationAllowed(node.id, 'start') }}
          //   disabled={!isOperationAllowed(node.id, 'start')}
          // >
          //   <Button
          //     key="start"
          //     size="small"
          //     icon={<PlayCircleOutlined />}
          //     danger
          //     disabled={!isOperationAllowed(node.id, 'start')}
          //     loading={isOperationInProgress}
          //   >
          //     강제 시작
          //   </Button>
          // </Popconfirm>
          // );
        }

        // HA 노드에 대한 삭제 버튼 (마스터와 워커는 위에서 이미 삭제 버튼을 추가했음)
        if (
          !isMaster &&
          !isWorker &&
          (activeTab === node.nodeType || node.nodeType.includes(activeTab))
        ) {
          actions.push(
            <Button
              key='delete'
              size='small'
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleRemoveNode(node.id)}
            >
              삭제
            </Button>
          );
        }
        break;

      default:
        break;
    }

    return <Space>{actions}</Space>;
  };

  const handleResourceAuthClick = async (node: Node) => {
    // 자동 인증 시도 (팝업창 없이)
    try {
      const hops = JSON.parse(node.hops || '[]');
      if (hops.length > 0) {
        // 스토어에서 저장된 인증 정보 확인
        const storedAuthHops = getStoredAuthHops(hops);
        const hasCompleteCredentials = storedAuthHops.every(
          hop => hop.username && hop.password
        );

        if (hasCompleteCredentials) {
          // 자동으로 리소스 확인 실행
          setResourceNode(node);
          await getServerResource(node, storedAuthHops);
          return; // 자동 처리 완료 시 함수 종료
        } else {
        }
      }
    } catch (error) {
    }

    // 자동 인증 실패 또는 인증 정보가 없을 때 모달 표시
    setResourceNode(node);
    setAuthRequest({
      node,
      purpose: 'resource',
      partialCredentials: node.hops
        ? getStoredAuthHops(JSON.parse(node.hops))
        : undefined,
    });
  };

  // 외부 쿠버네티스 인증 처리 함수
  const handleExternalAuthConfirm = async (
    username: string,
    password: string
  ) => {
    try {
      if (!externalServer) return;

      // 로딩 상태 설정
      setCheckingLoading(true);

      // 호스트 정보 구성
      buildOperationHops = JSON.parse(externalServer.hops || '[]');

      // 스토어에서 저장된 인증 정보 확인
      const storedAuthHops = getStoredAuthHops(buildOperationHops);
      const hasCompleteCredentials = storedAuthHops.every(
        hop => hop.username && hop.password
      );

      let finalAuthHops = buildOperationHops;

      if (hasCompleteCredentials) {
        // 저장된 인증 정보가 있으면 사용
        finalAuthHops = storedAuthHops;
      } else {
        // 저장된 정보가 없으면 입력받은 정보로 구성
        finalAuthHops = buildOperationHops.map(hop => ({
          ...hop,
          username: username,
          password: password,
        }));
      }

      // 노드 계산 API 호출
      const response = await kubernetesApi.calculateNodes({
        id: infra.id, // infra.id 추가
        hops: finalAuthHops,
      });

      if (response && response.success) {
        setExternalNodesInfo(response.nodes);

        // 서버 리소스 정보도 함께 가져오기
        try {
          // 리소스 계산 API 호출
          const resourceResponse = await kubernetesApi.calculateResources({
            id: infra.id,
            hops: finalAuthHops,
          });

          if (resourceResponse && resourceResponse.success) {
            // 리소스 데이터 저장
            const resourceData: ServerResource = {
              host_info: resourceResponse.host_info,
              cpu: resourceResponse.cpu,
              memory: resourceResponse.memory,
              disk: resourceResponse.disk,
            };

            setServerResource(resourceData);
          }
        } catch (resourceError) {
          console.error('서버 리소스 정보 가져오기 실패:', resourceError);
        }

        // 연결 성공 시 스토어에 인증 정보 저장
        saveCredentialsToStore(finalAuthHops);
        messageApi.success('외부 쿠버네티스 클러스터 연결 성공');
      } else {
        // 구체적인 에러 메시지 표시
        const errorMessage =
          response?.error ||
          response?.message ||
          '외부 쿠버네티스 클러스터 연결 실패';

        Modal.error({
          title: '외부 쿠버네티스 연결 실패',
          content: errorMessage,
          okText: '확인',
        });
      }
    } catch (error: any) {
      console.error('외부 쿠버네티스 클러스터 연결 오류:', error);

      // 구체적인 에러 메시지 표시
      let errorMessage = '외부 쿠버네티스 클러스터 연결에 실패했습니다.';

      if (error?.response?.data?.error) {
        errorMessage = `연결 실패: ${error.response.data.error}`;
      } else if (error?.message) {
        errorMessage = `연결 실패: ${error.message}`;
      }

      Modal.error({
        title: '외부 쿠버네티스 연결 오류',
        content: errorMessage,
        okText: '확인',
      });
    } finally {
      setCheckingLoading(false);
      setExternalAuthModalVisible(false);
    }
  };

  // 외부 쿠버네티스 초기화 효과
  useEffect(() => {
    // 외부 쿠버네티스인 경우 처리
    if (isExternal && infra.nodes && infra.nodes.length > 0) {
      setExternalServer({
        ip: infra.nodes[0].ip,
        port: infra.nodes[0].port,
      });
    }
  }, [isExternal, infra]);

  // 컴포넌트 마운트 시 자동 인증 시도
  useEffect(() => {
    if (infra.nodes && infra.nodes.length > 0) {

      // 모든 노드에 대해 자동 인증 시도
      infra.nodes.forEach(node => {
        void (async () => {
          try {
            const hops = JSON.parse(node.hops || '[]');
            if (hops.length > 0) {
              // 스토어에서 저장된 인증 정보 확인
              const storedAuthHops = getStoredAuthHops(hops);
              const hasCompleteCredentials = storedAuthHops.every(
                hop => hop.username && hop.password
              );

              if (hasCompleteCredentials) {
                // 여기서 필요한 자동 처리 로직을 실행할 수 있습니다
                // 예: 노드 상태 확인, 연결 테스트 등
              } else {
              }
            }
          } catch (error) {
          }
        })();
      });
    }
  }, [infra]);

  // 서버 리소스 조회 함수 추가
  const getServerResource = async (node: Node, authHops: AuthHops[]) => {
    // 파라미터 수정
    if (!node) return;

    messageApi.loading({
      content: `${node.server_name || node.ip} 리소스 조회 중...`,
      key: `resource-${node.id}`,
    });

    try {
      setResourceLoading(true);

      // 리소스 계산 API 호출
      const response = await kubernetesApi.calculateResources({
        id: infra.id,
        hops: authHops,
      });

      if (response && response.success) {
        // response 자체가 아닌 필요한 리소스 데이터만 추출하여 설정
        const resourceData: ServerResource = {
          host_info: response.host_info,
          cpu: response.cpu,
          memory: response.memory,
          disk: response.disk,
        };

        setServerResource(resourceData);
        setResourceModalVisible(true); // 결과 모달은 여기서 엽니다.
        messageApi.success({
          content: '리소스 조회가 완료되었습니다.',
          key: `resource-${node.id}`,
          duration: 2,
        });
      } else {
        // 구체적인 에러 메시지 표시
        const errorMessage =
          response?.error ||
          response?.message ||
          '서버 리소스 조회에 실패했습니다.';

        Modal.error({
          title: '서버 리소스 조회 실패',
          content: errorMessage,
          okText: '확인',
        });
      }
    } catch (error: any) {
      console.error('서버 리소스 조회 오류:', error);

      // 구체적인 에러 메시지 표시
      let errorMessage = '서버 리소스 조회에 실패했습니다.';

      if (error?.response?.data?.error) {
        errorMessage = `리소스 조회 실패: ${error.response.data.error}`;
      } else if (error?.message) {
        errorMessage = `리소스 조회 실패: ${error.message}`;
      }

      Modal.error({
        title: '서버 리소스 조회 오류',
        content: errorMessage,
        okText: '확인',
      });
    } finally {
      setResourceLoading(false);
      setAuthRequest(null); // 모달 닫기 추가
    }
  };

  // 리소스 모달 닫기 핸들러
  const handleResourceModalClose = () => {
    setResourceModalVisible(false);
    setServerResource(null);
  };

  const [installLoading, setInstallLoading] = useState(false);
  const [veleroInstalled, setVeleroInstalled] = useState(false);
  const [minioConfigForm] = Form.useForm();
  const [minioConfigSaving, setMinioConfigSaving] = useState(false);
  const [minioConfig, setMinioConfig] = useState<{
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    region: string;
  } | null>(null);

  // Velero 설치 함수
  const handleInstallVelero = async () => {
    setInstallLoading(true);
    try {

      // Todo: velero 설치 서버 (현재: 마스터 -> 추후: 워커 중 선택(?))
      // 마스터 노드 찾기
      const masterNode = infra?.nodes?.find(
        node =>
          node.type === 'master' ||
          (typeof node.type === 'string' && node.type.includes('master'))
      );

      if (!masterNode) {
        message.error('마스터 노드를 찾을 수 없습니다.');
        setInstallLoading(false);
        return;
      }

      // 마스터 노드 hops 정보 가져오기 (사용자가 수정한 정보 사용)
      const masterHops = masterNode.hops ? JSON.parse(masterNode.hops) : [];
      const values = {
        kubernetesInfraId: infra.id,
        environmentName: `${infra.name}-velero`,
      };

      if (masterHops.length > 0) {
        // SSH 인증 모달 열기

        requestNamespaceAuth(masterHops, 'velero_install', values);
      } else {
        // SSH 인증이 필요 없는 경우 직접 설치
        await handleVeleroInstallAuthSuccess([], values);
      }

      setVeleroInstalled(true);
    } catch (error) {
      console.error('Velero 설치 실패:', error);
      message.error('Velero 설치 중 오류가 발생했습니다.');
      setInstallLoading(false);
    }
  };

  // MinIO 연결 설정 저장 함수
  const handleMinioConfigSave = async (values: any) => {
    try {
      setMinioConfigSaving(true);

      const masterNode = infra?.nodes?.find(
        node =>
          node.type === 'master' ||
          (typeof node.type === 'string' && node.type.includes('master'))
      );

      if (!masterNode) {
        message.error('마스터 노드를 찾을 수 없습니다.');
        setInstallLoading(false);
        return;
      }
      const selectedStorage = storages.find(s => s.id === values.storageId);
      values.endpoint = selectedStorage.endpoint;
      values.infra_id = selectedStorage.infra_id;

      // 마스터 노드 hops 정보 가져오기 (사용자가 수정한 정보 사용)
      const masterHops = masterNode.hops ? JSON.parse(masterNode.hops) : [];

      if (masterHops.length > 0) {
        requestNamespaceAuth(masterHops, 'bucket-config', values);
      } else {
        await handleVeleroBucketConfigAuthSuccess([], values);
      }

      message.success('MinIO 설정을 저장중입니다. 잠시만 기다려주세요.');
    } catch (error) {
      console.error('MinIO 설정 저장 실패:', error);
      message.error('MinIO 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setMinioConfigSaving(false);
    }
  };

  // Velero 삭제 함수
  const handleUninstallVelero = async () => {
    setInstallLoading(true);
    try {
      // 마스터 노드 찾기
      const masterNode = infra?.nodes?.find(
        node =>
          node.type === 'master' ||
          (typeof node.type === 'string' && node.type.includes('master'))
      );
      if (!masterNode) {
        message.error('마스터 노드를 찾을 수 없습니다.');
        setInstallLoading(false);
        return;
      }

      const masterHops = masterNode.hops ? JSON.parse(masterNode.hops) : [];
      const values = {
        kubernetesInfraId: infra.id,
        environmentName: `${infra.name}-velero`,
      };

      if (masterHops.length > 0) {
        requestNamespaceAuth(masterHops, 'velero_uninstall', values);
      } else {
        await handleVeleroDeleteAuthSuccess([], values);
      }
      setVeleroInstalled(false);
    } catch (error) {
      console.error('Velero 환경 삭제 실패:', error);
      message.error('Velero 환경 삭제 중 오류가 발생했습니다.');
    }
  };

  // Auth handler hook
  const { requestNamespaceAuth, AuthModal } = useBackupAuthHandler({
    onAuthSuccess: (
      authData: SshAuthHop[],
      purpose: string,
      formData?: unknown
    ) => {
      if (purpose === 'velero_install') {
        void handleVeleroInstallAuthSuccess(
          authData,
          formData as VeleroInstallForm
        );
      } else if (purpose === 'bucket-config') {
        void handleVeleroBucketConfigAuthSuccess(
          authData,
          formData as Environment
        );
      } else if (purpose === 'velero_uninstall') {
        void handleVeleroDeleteAuthSuccess(
          authData,
          formData as VeleroInstallForm
        );
      }
    },
    onAuthCancel: () => {
      setInstallLoading(false);
    },
  });

  // Velero 설치 인증 성공 후 처리
  const handleVeleroInstallAuthSuccess = async (
    authData: SshAuthHop[],
    values: VeleroInstallForm
  ) => {
    try {
      message.success(
        `${authData[authData.length - 1]?.host}에 Velero 설치가 시작되었습니다.`
      );

      const response = await awxApi.runPlaybook({
        playbook_to_run: 'install_velero',
        hops: authData,
        awxTemplate: user?.awx_template || 0,
      });
      // 결과 로그 출력
      // console.log('Install playbook response:', response);

      // db 저장 api 호출 // -------------------------------------------------------------------------------------------
      const backupStorageData: Environment = {
        infra_id: values.kubernetesInfraId,
        name: values.environmentName,
        type: 'velero', // 현재는 velero 타입으로 고정
        access_key: '', // playbook에서 자동 생성된 MinIO 액세스 키를 나중에 업데이트할 수 있습니다.
        secret_key: '', // playbook에서 자동 생성된 MinIO 시크릿 키를 나중에 업데이트할 수 있습니다.
        status: 'active', // 초기 상태를 active로 설정
      };
      // 같은 infra_id의 velero 환경이 있다면 기존의 컬럼 업데이트
      const existingEnv = await backupApi.getVeleroByInfraId(
        values.kubernetesInfraId
      );
      if (existingEnv) {
        backupStorageData.id = existingEnv.id;
        await backupApi.updateBackupStorage(backupStorageData);
      } else {
        await backupApi.createBackupStorage(backupStorageData);
      }
    } catch (error) {
      console.error('Velero 설치 실패:', error);
      message.error('Velero 설치에 실패했습니다.');
    } finally {
      setInstallLoading(false);
    }
  };

  // MinIO 연결 설정 인증 성공 후 처리
  const handleVeleroBucketConfigAuthSuccess = async (
    authData: SshAuthHop[],
    environment: Environment
  ) => {
    try {
      const response = await awxApi.runPlaybook({
        playbook_to_run: 'configure_velero_storage',
        hops: authData,
        awxTemplate: user?.awx_template || 0,
        minio_endpoint: 'http://' + environment.endpoint,
        minio_bucket_name: environment.bucketName,
      });

      if (response.success) {
        // 결과 로그 출력
        // db에서 환경 정보 업데이트
        const veleroEnv = await backupApi.getVeleroByInfraId(infra.id);
        const minioEnv = await backupApi.getMinIOByInfraId(
          environment.infra_id,
          environment.endpoint
        );
        const updatedEnv = {
          id: veleroEnv.id,
          bucket: environment.bucketName,
          endpoint: environment.endpoint,
          access_key: environment.accessKey,
          secret_key: environment.secretKey,
          connected_minio_id: minioEnv.id,
        };
        await backupApi.updateBackupLocation(updatedEnv);

        message.success('Velero 백업로케이션 연결이 완료되었습니다.');
      } else {
        message.error('Velero 백업로케이션 연결에 실패했습니다.');
      }
    } catch (error) {
      console.error('Velero 백업로케이션 연결 실패:', error);
      message.error('Velero 백업로케이션 연결에 실패했습니다.');
    }
  };

  // Velero 삭제 인증 성공 후 처리
  const handleVeleroDeleteAuthSuccess = async (
    authData: SshAuthHop[],
    values: VeleroInstallForm
  ) => {
    try {
      message.success(
        `${authData[authData.length - 1]?.host}에서 Velero 삭제가 시작되었습니다.`
      );

      const response = await awxApi.runPlaybook({
        playbook_to_run: 'uninstall_velero',
        hops: authData,
        awxTemplate: user?.awx_template || 0,
      });
      // 결과 로그 출력

      // db에서 velero 환경 삭제
      const veleroEnv = await backupApi.getVeleroByInfraId(
        values.kubernetesInfraId
      );
      if (veleroEnv) {
        await backupApi.deleteEnvironment(veleroEnv.id);
      }
    } catch (error) {
      console.error('Velero 삭제 실패:', error);
      message.error('Velero 삭제에 실패했습니다.');
    } finally {
      setInstallLoading(false);
    }
  };

  const [velero, setVelero] = useState(null);
  const getVeleroInfo = async () => {
    const response = await backupApi.getVeleroByInfraId(infra.id);
    setMinioConfig(response);
    setVeleroInstalled(!!response);
  };

  const loadMinioStorages = async () => {
    setStoragesLoading(true);
    try {
      const response = await backupApi.getEnvironments('minio');
      setStorages(response.data);
    } catch (error) {
      console.error('Failed to load servers:', error);
      message.error('서버 목록을 불러오는데 실패했습니다.');
      setStorages([]);
    } finally {
      setStoragesLoading(false);
    }
  };

  useEffect(() => {
    void loadMinioStorages();
  }, [minioConfig]);

  const handleAuthRoutingConfirm = (authHops: AuthHops[]) => {
    if (!authRequest) {
      console.error(
        '[handleAuthRoutingConfirm] authRequest가 null입니다. 호출되면 안됩니다.'
      );
      return;
    }

    const { purpose, node } = authRequest;

    // 인증 성공 시 스토어에 저장 (기존 정보 업데이트 또는 새로 추가)
    authHops.forEach(hop => {
      credsStore.upsertServerByHostPort({
        host: hop.host,
        port: hop.port,
        userId: hop.username,
        password: hop.password,
      });
    });

    switch (purpose) {
      case 'build':
      case 'start':
      case 'stop':
      case 'restart':
        handleBuildConfirm(authHops, purpose, undefined);
        break;
      case 'rebuild':
        // 'build' 또는 'rebuild'는 다단계 인증일 수 있으므로,
        // 여기서는 모달을 닫지 않습니다. 하위 함수(handleBuildConfirm 등)가 알아서 처리합니다.
        if (purpose === 'build') {
          handleBuildConfirm(authHops, 'build', undefined);
        } else {
          setBuildingNode(authRequest?.node || null);
          handleRebuildConfirm(authHops, authRequest?.node, undefined);
        }
        break;
      case 'checkStatus':
        setAuthRequest(null);
        if (checkingNode) {
          // 상태 확인 실행 후 checkingNode 초기화
          handleCheckStatusConfirm(authHops, checkingNode).finally(() => {
            setCheckingNode(null);
          });
        } else {
          setCheckingNode(null);
        }
        break;
      case 'resource':
        setAuthRequest(null);
        if (resourceNode) {
          // 리소스 확인 실행 후 checkingNode 초기화
          getServerResource(resourceNode, authHops).finally(() => {
            setCheckingNode(null);
          });
        } else {
          setCheckingNode(null);
        }
        break;
      case 'ha_auth':
        // HA 인증 후에는 다음 단계로 넘어가므로, 일단 모달을 닫습니다.
        setAuthRequest(null);
        setHaAuthHops(authHops); // HA 인증 정보 저장

        if (pendingMasterBuild) {
          setBuildingLoading(true);
          // 저장된 목적에 따라 원래 하려던 작업을 재개합니다.
          if (pendingMasterBuild.purpose === 'rebuild') {
            // 재구축 상태 복원
            setBuildingNode(pendingMasterBuild.targetNode || null);
            setIsRebuildMode(true);
            handleRebuildConfirm(
              pendingMasterBuild.hopsData,
              pendingMasterBuild.targetNode,
              authHops
            );
          } else {
            handleBuildConfirm(pendingMasterBuild.hopsData, 'build', authHops);
          }
        }
        break;

      // [NEW] 워커 삭제 인증 처리
      case 'delete_worker_auth':
        if (deleteRequest?.stage === 'target') {
          // 워커 인증 정보 저장 후, 다음 단계(마스터 인증)로 전환
          setDeleteRequest(prev =>
            prev ? { ...prev, stage: 'main', targetAuth: authHops } : null
          );
        } else if (deleteRequest?.stage === 'main') {
          // 마스터 인증 정보 저장 후, 최종 단계(삭제 실행)로 전환
          setDeleteRequest(prev =>
            prev ? { ...prev, stage: 'done', mainAuth: authHops } : null
          );
        }
        break;

      // [NEW] 마스터 삭제 인증 처리
      case 'delete_master_auth':
        if (deleteRequest?.stage === 'target') {
          setDeleteRequest(prev =>
            prev ? { ...prev, stage: 'main', targetAuth: authHops } : null
          );
        } else if (deleteRequest?.stage === 'main') {
          const haNodesExist = nodes.some(n => n.nodeType.includes('ha'));
          const nextStage = haNodesExist ? 'ha' : 'done';

          setDeleteRequest(prev =>
            prev ? { ...prev, stage: nextStage, mainAuth: authHops } : null
          );
        } else if (deleteRequest?.stage === 'ha') {
          setDeleteRequest(prev =>
            prev ? { ...prev, stage: 'done', haAuth: authHops } : null
          );
        }
        break;
      default:
        // 혹시 모를 경우를 대비해 기본적으로 모달을 닫습니다.
        setAuthRequest(null);
        break;
    }
  };

  // velero 설정 탭 렌더링 함수
  const renderServiceSettings = () => {
    return (
      <div className='velero-install-container'>
        <div style={{ padding: '24px' }}>
          {/* velero 설정 카드 */}
          <Row justify='center'>
            <Col span={16}>
              <Card
                loading={installLoading}
                title={
                  <Space>
                    <CloudServerOutlined style={{ color: '#1890ff' }} />
                    <Text strong style={{ fontSize: '18px' }}>
                      Velero 백업 서비스 설치
                    </Text>
                  </Space>
                }
                extra={
                  <Button
                    type='primary'
                    size='large'
                    icon={
                      veleroInstalled ? <MinusOutlined /> : <PlusOutlined />
                    }
                    onClick={
                      veleroInstalled
                        ? handleUninstallVelero
                        : handleInstallVelero
                    }
                  >
                    {veleroInstalled ? '설치 제거' : '설치 시작'}
                  </Button>
                }
                hoverable
                style={{ textAlign: 'center' }}
              >
                <Space
                  direction='vertical'
                  size='large'
                  style={{ width: '100%' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <Text strong>
                        MinIO 연동 설정:{' '}
                        {minioConfig?.endpoint ? minioConfig?.endpoint : ''}
                      </Text>
                    </div>

                    {veleroInstalled ? (
                      <Form
                        form={minioConfigForm}
                        layout='vertical'
                        onFinish={handleMinioConfigSave}
                        initialValues={{
                          endpoint: minioConfig?.endpoint || '',
                          accessKey: minioConfig?.access_key || '',
                          secretKey: minioConfig?.secret_key || '',
                          bucketName: minioConfig?.bucket || '',
                        }}
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label='저장소'
                              name='storageId'
                              rules={[
                                {
                                  required: true,
                                  message: '저장소를 선택해주세요',
                                },
                              ]}
                            >
                              <Select
                                placeholder='서버를 선택해 주세요'
                                onChange={() => {}}
                                loading={storagesLoading}
                                notFoundContent={
                                  storagesLoading ? (
                                    <Spin size='small' />
                                  ) : (
                                    '사용 가능한 서버가 없습니다. [장비 관리] 탭에서 장비를 먼저 등록해주세요.'
                                  )
                                }
                                prefix={<ApiOutlined />}
                              >
                                {storages.map(storage => {
                                  return (
                                    <Option key={storage.id} value={storage.id}>
                                      <div>
                                        <div>{storage.endpoint}</div>
                                      </div>
                                    </Option>
                                  );
                                })}
                              </Select>
                            </Form.Item>
                            {/* <Form.Item
                              label="MinIO 엔드포인트"
                              name="endpoint"
                              rules={[
                                { required: true, message: 'MinIO 엔드포인트를 입력해주세요' },
                              ]}
                            >
                              <Input
                                placeholder="192.168.0.x:9000"
                                prefix={<ApiOutlined />}
                              />
                            </Form.Item> */}
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label='버킷 이름'
                              name='bucketName'
                              rules={[
                                {
                                  required: true,
                                  message: '버킷 이름을 입력해주세요',
                                },
                              ]}
                            >
                              <Input
                                placeholder='velero'
                                prefix={<CloudServerOutlined />}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label='Access Key'
                              name='accessKey'
                              rules={[
                                {
                                  required: true,
                                  message: 'Access Key를 입력해주세요',
                                },
                              ]}
                            >
                              <Input
                                placeholder='minioadmin'
                                prefix={<UserOutlined />}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label='Secret Key'
                              name='secretKey'
                              rules={[
                                {
                                  required: true,
                                  message: 'Secret Key를 입력해주세요',
                                },
                              ]}
                            >
                              <Input.Password
                                placeholder='minioadmin'
                                prefix={<LockOutlined />}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col
                            span={24}
                            style={{ display: 'flex', alignItems: 'flex-end' }}
                          >
                            <Form.Item
                              style={{ marginBottom: 0, width: '100%' }}
                            >
                              <Button
                                type='primary'
                                htmlType='submit'
                                loading={minioConfigSaving}
                                block
                                icon={<SettingOutlined />}
                              >
                                설정 저장
                              </Button>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    ) : (
                      <Empty
                        description='Velero를 먼저 설치해주세요'
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  return (
    <>
      {contextHolder}
      {isExternal ? (
        // 외부 쿠버네티스 UI
        <div className='infra-content-wrapper'>
          <div className='infra-stats-container'>
            <div className='node-stat-group'>
              <div className='node-stat-item'>
                <CloudServerOutlined className='node-stat-icon' />
                <div>
                  <Text className='node-stat-label'>총 노드 수</Text>
                  <Text className='node-stat-number'>
                    {externalNodesInfo?.total || 0}개
                  </Text>
                </div>
              </div>
              <div className='node-stat-item master-stat'>
                <ClusterOutlined
                  className='node-stat-icon'
                  style={{ color: '#52c41a' }}
                />
                <div>
                  <Text className='node-stat-label'>마스터 노드</Text>
                  <Text className='node-stat-number'>
                    {externalNodesInfo?.master || 0}개
                  </Text>
                </div>
              </div>
              <div className='node-stat-item worker-stat'>
                <CloudServerOutlined
                  className='node-stat-icon'
                  style={{ color: '#fa541c' }}
                />
                <div>
                  <Text className='node-stat-label'>워커 노드</Text>
                  <Text className='node-stat-number'>
                    {externalNodesInfo?.worker || 0}개
                  </Text>
                </div>
              </div>
            </div>
          </div>

          <Divider orientation='left'>외부 쿠버네티스 클러스터</Divider>

          {externalNodesInfo ? (
            <>
              <Table
                columns={[
                  { title: '노드명', dataIndex: 'name', key: 'name' },
                  {
                    title: '역할',
                    dataIndex: 'role',
                    key: 'role',
                    render: role => (
                      <Tag color={role === 'master' ? 'green' : 'orange'}>
                        {role}
                      </Tag>
                    ),
                  },
                  {
                    title: '상태',
                    dataIndex: 'status',
                    key: 'status',
                    render: status => (
                      <Tag color={status === 'Ready' ? 'success' : 'error'}>
                        {status}
                      </Tag>
                    ),
                  },
                ]}
                dataSource={externalNodesInfo.list}
                rowKey='name'
                pagination={false}
                size='small'
                className='infra-node-table'
              />

              {/* 서버 리소스 정보 표시 */}
              {serverResource && (
                <div className='resource-cards' style={{ marginTop: '24px' }}>
                  <Divider orientation='left'>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>
                      서버 리소스 정보
                    </span>
                  </Divider>
                  <Row gutter={[24, 24]}>
                    <Col span={24}>
                      <Card
                        size='small'
                        title={
                          <span style={{ fontSize: '15px', fontWeight: 600 }}>
                            시스템 정보
                          </span>
                        }
                        bodyStyle={{ padding: '16px' }}
                        style={{ marginBottom: '16px' }}
                      >
                        <Row gutter={[32, 16]}>
                          <Col span={8}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  호스트명
                                </span>
                              }
                              value={serverResource.host_info.hostname}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  운영체제
                                </span>
                              }
                              value={serverResource.host_info.os}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  커널
                                </span>
                              }
                              value={serverResource.host_info.kernel}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col span={8}>
                      <Card
                        size='small'
                        title={
                          <span style={{ fontSize: '15px', fontWeight: 600 }}>
                            CPU
                          </span>
                        }
                        bodyStyle={{ padding: '16px' }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  코어
                                </span>
                              }
                              value={serverResource.cpu.cores}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  사용량
                                </span>
                              }
                              value={serverResource.cpu.usage_percent}
                              valueStyle={{
                                color:
                                  parseInt(serverResource.cpu.usage_percent) >
                                  80
                                    ? '#cf1322'
                                    : parseInt(
                                          serverResource.cpu.usage_percent
                                        ) > 60
                                      ? '#faad14'
                                      : '#3f8600',
                                fontSize: '16px',
                                fontWeight: 500,
                              }}
                            />
                          </Col>
                          <Col span={24} style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              모델
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {serverResource.cpu.model}
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col span={8}>
                      <Card
                        size='small'
                        title={
                          <span style={{ fontSize: '15px', fontWeight: 600 }}>
                            메모리
                          </span>
                        }
                        bodyStyle={{ padding: '16px' }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  전체
                                </span>
                              }
                              value={`${Math.round(parseInt(serverResource.memory.total_mb) / 1024)} GB`}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  사용 중
                                </span>
                              }
                              value={`${Math.round((parseInt(serverResource.memory.used_mb) / 1024) * 10) / 10} GB`}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={24} style={{ marginTop: '8px' }}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  사용량
                                </span>
                              }
                              value={serverResource.memory.usage_percent}
                              suffix='%'
                              valueStyle={{
                                color:
                                  parseInt(
                                    serverResource.memory.usage_percent
                                  ) > 80
                                    ? '#cf1322'
                                    : parseInt(
                                          serverResource.memory.usage_percent
                                        ) > 60
                                      ? '#faad14'
                                      : '#3f8600',
                                fontSize: '16px',
                                fontWeight: 500,
                              }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col span={8}>
                      <Card
                        size='small'
                        title={
                          <span style={{ fontSize: '15px', fontWeight: 600 }}>
                            디스크
                          </span>
                        }
                        bodyStyle={{ padding: '16px' }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  전체
                                </span>
                              }
                              value={serverResource.disk.root_total}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  사용 중
                                </span>
                              }
                              value={serverResource.disk.root_used}
                              valueStyle={{ fontSize: '16px', fontWeight: 500 }}
                            />
                          </Col>
                          <Col span={24} style={{ marginTop: '8px' }}>
                            <Statistic
                              title={
                                <span
                                  style={{ fontSize: '14px', color: '#666' }}
                                >
                                  사용량
                                </span>
                              }
                              value={serverResource.disk.root_usage_percent}
                              valueStyle={{
                                color:
                                  parseInt(
                                    serverResource.disk.root_usage_percent
                                  ) > 80
                                    ? '#cf1322'
                                    : parseInt(
                                          serverResource.disk.root_usage_percent
                                        ) > 60
                                      ? '#faad14'
                                      : '#3f8600',
                                fontSize: '16px',
                                fontWeight: 500,
                              }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}

              {/* 리소스 조회 버튼 제거 - 자동으로 가져오기 때문에 불필요 */}
              {/* <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button
                  icon={<DashboardOutlined />}
                  onClick={handleExternalResourceCheck}
                  disabled={!externalServer}
                >
                  서버 리소스 확인
                </Button>
              </div> */}
            </>
          ) : (
            <Empty description="클러스터 정보를 불러오려면 '연결' 버튼을 클릭하세요" />
          )}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button
                type='primary'
                icon={<ApiOutlined />}
                onClick={() => setExternalAuthModalVisible(true)}
                size='middle'
                shape='round'
              >
                연결
              </Button>
            </Space>
          </div>

          <ExternalKubeAuthModal
            visible={externalAuthModalVisible}
            onClose={() => setExternalAuthModalVisible(false)}
            onConfirm={handleExternalAuthConfirm}
            loading={checkingLoading}
            server={externalServer || { ip: '', port: '' }}
          />
        </div>
      ) : (
        // 내부 쿠버네티스 UI - 탭으로 구분
        <div className='infra-content-wrapper'>
          <Tabs
            defaultActiveKey='node'
            activeKey={mainTab}
            onChange={key => setMainTab(key as 'node' | 'service')}
            items={[
              {
                key: 'node',
                label: (
                  <span>
                    <ClusterOutlined /> 노드 설정
                  </span>
                ),
                children: (
                  <div className='node-settings-container'>
                    {/* 클러스터 상태 경고 표시 */}
                    {(() => {
                      const integrityCheck = validateClusterIntegrity(nodes);

                      if (integrityCheck.warnings.length > 0) {
                        return (
                          <Alert
                            message='클러스터 상태 경고'
                            description={
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {integrityCheck.warnings.map(
                                  (warning, index) => (
                                    <li key={index}>{warning}</li>
                                  )
                                )}
                              </ul>
                            }
                            type='warning'
                            showIcon
                            style={{ marginBottom: '16px' }}
                          />
                        );
                      }

                      return null;
                    })()}

                    {/* 진행 중인 작업 표시 */}
                    {criticalOperationCount > 0 && (
                      <Alert
                        message={`${criticalOperationCount}개의 중요 작업이 진행 중입니다`}
                        description='동시에 너무 많은 작업을 수행하면 시스템이 불안정해질 수 있습니다.'
                        type='info'
                        showIcon
                        style={{ marginBottom: '16px' }}
                      />
                    )}

                    <div className='infra-stats-container'>
                      <div className='node-stat-group'>
                        <div className='node-stat-item'>
                          <CloudServerOutlined className='node-stat-icon' />
                          <div>
                            <Text className='node-stat-label'>총 노드 수</Text>
                            <Text className='node-stat-number'>
                              {nodes.length}개
                            </Text>
                          </div>
                        </div>
                        <div className='node-stat-item ha-stat'>
                          <ApiOutlined
                            className='node-stat-icon'
                            style={{ color: '#1677ff' }}
                          />
                          <div>
                            <Text className='node-stat-label'>HA 노드</Text>
                            <Text className='node-stat-number'>
                              {haNodes.length}개
                            </Text>
                          </div>
                        </div>
                        <div className='node-stat-item master-stat'>
                          <ClusterOutlined
                            className='node-stat-icon'
                            style={{ color: '#52c41a' }}
                          />
                          <div>
                            <Text className='node-stat-label'>마스터 노드</Text>
                            <Text className='node-stat-number'>
                              {masterNodes.length}개
                            </Text>
                          </div>
                        </div>
                        <div className='node-stat-item worker-stat'>
                          <CloudServerOutlined
                            className='node-stat-icon'
                            style={{ color: '#fa541c' }}
                          />
                          <div>
                            <Text className='node-stat-label'>워커 노드</Text>
                            <Text className='node-stat-number'>
                              {workerNodes.length}개
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Divider orientation='left'>노드 목록</Divider>

                    <Tabs
                      defaultActiveKey='ha'
                      style={{ marginBottom: 16 }}
                      onChange={key => setActiveTab(key)}
                      activeKey={activeTab}
                    >
                      <TabPane tab='HA 노드' key='ha'>
                        <Table
                          columns={nodeColumns.filter(
                            col => col.key !== 'server_name'
                          )}
                          dataSource={haNodes}
                          rowKey='id'
                          pagination={false}
                          size='small'
                          className='infra-node-table'
                          locale={{
                            emptyText:
                              'HA 노드가 없습니다. 설정 버튼을 클릭하여 노드를 추가해주세요.',
                          }}
                        />
                      </TabPane>
                      <TabPane tab='마스터 노드' key='master'>
                        <Table
                          columns={nodeColumns}
                          dataSource={masterNodes}
                          rowKey='id'
                          pagination={false}
                          size='small'
                          className='infra-node-table'
                          locale={{
                            emptyText:
                              '마스터 노드가 없습니다. 설정 버튼을 클릭하여 노드를 추가해주세요.',
                          }}
                        />
                      </TabPane>
                      <TabPane tab='워커 노드' key='worker'>
                        <Table
                          columns={nodeColumns}
                          dataSource={workerNodes}
                          rowKey='id'
                          pagination={false}
                          size='small'
                          className='infra-node-table'
                          locale={{
                            emptyText:
                              '워커 노드가 없습니다. 설정 버튼을 클릭하여 노드를 추가해주세요.',
                          }}
                        />
                      </TabPane>
                    </Tabs>

                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                      <Space>
                        <Button
                          type='primary'
                          icon={<PlusOutlined />}
                          onClick={() => {
                            if (
                              activeTab === 'ha' ||
                              activeTab === 'master' ||
                              activeTab === 'worker'
                            ) {
                              setIsAddNodeModalVisible(true);
                            } else {
                              showSettingsModal(infra);
                            }
                          }}
                          size='middle'
                          shape='round'
                        >
                          노드 추가
                        </Button>
                      </Space>
                    </div>

                    {/* 최근 작업 히스토리 표시 (최근 5개만) */}
                    {operationHistory.length > 0 && (
                      <div style={{ marginTop: '24px' }}>
                        <Divider orientation='left'>최근 작업 히스토리</Divider>
                        <List
                          size='small'
                          dataSource={operationHistory.slice(-5).reverse()}
                          renderItem={operation => {
                            const node = nodes.find(
                              n => n.id === operation.node
                            );
                            const nodeName =
                              node?.server_name || node?.ip || operation.node;
                            const timeAgo = Math.round(
                              (Date.now() - operation.timestamp) / 1000
                            );
                            const timeText =
                              timeAgo < 60
                                ? `${timeAgo}초 전`
                                : timeAgo < 3600
                                  ? `${Math.round(timeAgo / 60)}분 전`
                                  : `${Math.round(timeAgo / 3600)}시간 전`;

                            return (
                              <List.Item>
                                <Space>
                                  {operation.status === 'success' && (
                                    <CheckCircleOutlined
                                      style={{ color: '#52c41a' }}
                                    />
                                  )}
                                  {operation.status === 'failed' && (
                                    <CloseCircleOutlined
                                      style={{ color: '#ff4d4f' }}
                                    />
                                  )}
                                  {operation.status === 'in_progress' && (
                                    <SyncOutlined
                                      spin
                                      style={{ color: '#1890ff' }}
                                    />
                                  )}
                                  <Text>
                                    <strong>{nodeName}</strong> -{' '}
                                    {operation.type === 'rebuild'
                                      ? '재구축'
                                      : operation.type === 'build'
                                        ? '구축'
                                        : operation.type === 'renew_certificate'
                                          ? '인증서 갱신'
                                          : operation.type === 'delete'
                                            ? '삭제'
                                            : operation.type}
                                    {operation.status === 'success' &&
                                      (operation.type === 'rebuild'
                                        ? ' 시작됨'
                                        : operation.type === 'build'
                                          ? ' 시작됨'
                                          : operation.type ===
                                              'renew_certificate'
                                            ? ' 시작됨'
                                            : ' 완료')}
                                    {operation.status === 'failed' && ' 실패'}
                                    {operation.status === 'in_progress' &&
                                      ' 진행 중'}
                                  </Text>
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: '12px' }}
                                  >
                                    {timeText}
                                  </Text>
                                </Space>
                              </List.Item>
                            );
                          }}
                          style={{
                            background: '#fafafa',
                            padding: '12px',
                            borderRadius: '6px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'service',
                label: (
                  <span>
                    <CloudServerOutlined /> velero 설정
                  </span>
                ),
                children: renderServiceSettings(),
              },
            ]}
          />
        </div>
      )}

      {/* 공통 모달 컴포넌트들 (외부 쿠버네티스 모드에서는 나타나지 않음) */}
      {!isExternal && (
        <>
          <AddNodeModal
            visible={isAddNodeModalVisible}
            onClose={() => setIsAddNodeModalVisible(false)}
            onAdd={handleAddNode} // 이제 새로운 onAdd 함수와 타입이 일치함
            loading={false} // 아직 로딩 상태는 연결하지 않음
            initialNodeType={activeTab as 'ha' | 'master' | 'worker'}
          />
        </>
      )}
      <MultiHopAuthModal
        visible={!!authRequest}
        onClose={() => {
          // ... (취소 시 정리 로직)
          setAuthRequest(null);
          setDeleteRequest(null); // [NEW] 삭제 프로세스도 취소
          setHaAuthHops(null); // [NEW] HA 인증 정보도 초기화
          setCheckingNode(null); // [NEW] 현재 확인 중인 노드도 초기화
        }}
        onConfirm={handleAuthRoutingConfirm}
        loading={buildingLoading || checkingLoading || resourceLoading}
        title={
          // [REFACTOR] 동적 제목 설정 로직 확장
          authRequest?.purpose === 'delete_worker_auth'
            ? `워커 삭제 인증 (${deleteRequest?.stage === 'target' ? '대상 워커' : '메인 마스터'})`
            : authRequest?.purpose === 'delete_master_auth'
              ? `마스터 삭제 인증 (${deleteRequest?.stage})`
              : authRequest?.purpose === 'ha_auth'
                ? 'HA 노드 공통 인증'
                : // ... (기존 제목 설정 로직)
                  '서버 인증'
        }
        targetServer={
          authRequest?.node
            ? {
                name: authRequest.node.server_name,
                hops: JSON.parse(authRequest.node.hops || '[]').map(
                  (hop: any, index: number) => {
                    // partialCredentials에서 사용자명 가져오기
                    const partialCred = authRequest.partialCredentials?.[index];
                    return {
                      ...hop,
                      // partialCredentials에 있으면 사용, 없으면 hop.username 또는 기본값 'root'
                      username: partialCred?.username || hop.username || 'root',
                    };
                  }
                ),
                partialCredentials: authRequest.partialCredentials,
              }
            : null
        }
      />
      <ServerResourceModal
        visible={resourceModalVisible}
        onClose={handleResourceModalClose}
        resource={serverResource}
        loading={resourceLoading}
        server={{
          name: resourceNode?.server_name,
          ip: resourceNode?.ip || '',
        }}
      />
    </>
  );
};

export default InfraKubernetesSetting;
