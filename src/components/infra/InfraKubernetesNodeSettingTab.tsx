import {
  CloudServerOutlined,
  ApiOutlined,
  ClusterOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  DeleteOutlined,
  PlusOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  awxApi,
  kubernetesApi,
  SshHop,
  StandardApiResponse,
} from '../../lib/api';
import { InfraWithNodes, Server, ServerStatus } from '../../types';
import {
  Alert,
  Button,
  Divider,
  List,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import TabPane from 'antd/es/tabs/TabPane';
import { getStatusIcon, getStatusText } from './kubernetes';
import SshCredentialModal from '../services/SshCredentialModal';
import { useCredsStore } from '../../stores/useCredsStore';
import { AddNodeModal } from './modals';
import { api } from '../../services/api';
import * as kubernetesApi2 from '../../lib/api/kubernetes';
import { useAuth } from '../../context/AuthContext';
import { ensureSshCreds } from '../../utils/sshHelper';

type NodeType = 'ha' | 'master' | 'worker';

interface InfraKubernetesNodeSettingTabProps {
  selectedInfra: InfraWithNodes;
}

interface Node {
  id: string;
  nodeType: NodeType;
  ip: string;
  port: string;
  server_name?: string;
  join_command?: string;
  certificate_key?: string;
  last_checked?: string;
  status: NodeStatus;
  hops: string;
  updated_at?: string;
  ha?: string;
}

interface NodeStatus {
  ha?: string;
  master?: string;
  worker?: string;
  [key: string]: string | undefined;
}

interface SshModalState {
  visible: boolean;
  node: Node | null;
  hops: SshHop[];
  isRetry: boolean;
  actionType?: 'STATUS' | 'RESOURCE' | 'ADD' | 'BUILD' | 'UNINSTALL';
}

export interface ExternalKubernetes {
  total: number;
  master: number;
  worker: number;
  list: {
    ip: string;
    name: string;
    role: string;
    status: string;
  }[];
}

const InfraKubernetesNodeSettingTab: React.FC<
  InfraKubernetesNodeSettingTabProps
> = ({ selectedInfra }) => {
  const { user } = useAuth();
  const credsStore = useCredsStore();
  const { Text } = Typography;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [criticalOperationCount, setCriticalOperationCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NodeType>('ha');
  const [operationsInProgress, setOperationsInProgress] = useState<Set<string>>(
    new Set()
  );
  const [sshModalState, setSshModalState] = useState<SshModalState>({
    visible: false,
    node: null,
    hops: [],
    isRetry: false,
  });
  const [isAddNodeModalVisible, setIsAddNodeModalVisible] =
    useState<boolean>(false);
  const [operationHistory, setOperationHistory] = useState<
    Array<{
      id: string;
      type: string;
      node: string;
      timestamp: number;
      status: 'success' | 'failed' | 'in_progress';
    }>
  >([]);
  const [deleteRequest, setDeleteRequest] = useState<{
    type: 'worker' | 'master';
    stage: 'target' | 'main' | 'ha' | 'done';
    targetNode: Node;
  }>(null);

  // 0. 쿠버네티스 클러스터 경고 메시지 표현
  const validateClusterIntegrity = (
    nodes: Node[]
  ): { valid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    // 마스터 노드 검증
    const masterNodes = nodes.filter(
      n =>
        n.nodeType === 'master' ||
        (typeof n.nodeType === 'string' && n.nodeType.includes('master'))
    );
    const runningMasters = masterNodes.filter(
      n => n.status['master'] === 'running'
    );

    if (runningMasters.length === 0 && masterNodes.length > 0) {
      warnings.push(
        '실행 중인 마스터 노드가 없습니다. 클러스터가 작동하지 않을 수 있습니다.'
      );
    }

    if (runningMasters.length === 1) {
      warnings.push(
        '마스터 노드가 1개만 실행 중입니다. 고가용성을 위해 추가 마스터 노드를 구축하는 것을 권장합니다.'
      );
    }

    // HA 노드 검증
    const haNodes = nodes.filter(
      n =>
        n.nodeType === 'ha' ||
        (typeof n.nodeType === 'string' && n.nodeType.includes('ha'))
    );
    const runningHAs = haNodes.filter(n => n.status['ha'] === 'running');

    if (masterNodes.length > 1 && runningHAs.length === 0) {
      warnings.push('다중 마스터 구성에서 HA 노드가 실행되지 않고 있습니다.');
    }

    // 워커 노드 검증
    const workerNodes = nodes.filter(
      n =>
        n.nodeType === 'worker' ||
        (typeof n.nodeType === 'string' && n.nodeType.includes('worker'))
    );
    const runningWorkers = workerNodes.filter(
      n => n.status['worker'] === 'running'
    );

    if (runningWorkers.length === 0 && workerNodes.length > 0) {
      warnings.push(
        '실행 중인 워커 노드가 없습니다. 애플리케이션 배포가 제한될 수 있습니다.'
      );
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  };

  // 0. Server 타입을 Node 타입으로 변환 (selectedInfra.nodes)
  const convertServerToNode = (server: Server): Node => {
    const hopsString =
      typeof server.hops === 'string'
        ? server.hops
        : JSON.stringify(server.hops || []);

    let derivedIp = server.ip || '';
    let derivedPort = server.port ? String(server.port) : '';
    if (!derivedIp && hopsString) {
      try {
        const parsedHops = JSON.parse(hopsString) as SshHop[];
        if (Array.isArray(parsedHops) && parsedHops.length > 0) {
          const lastHop = parsedHops[parsedHops.length - 1];
          derivedIp = lastHop.host;
          derivedPort = String(lastHop.port);
        }
      } catch (e) {
        console.warn(`Hops parsing failed for server ${server.id}`, e);
      }
    }

    const determinedType =
      server.nodeType || server.node_type || server.type || 'worker';

    return {
      id: String(server.id),
      nodeType: determinedType as NodeType,
      ip: derivedIp,
      port: derivedPort,
      server_name: server.server_name,
      join_command: server.join_command,
      certificate_key: server.certificate_key,
      last_checked: server.last_checked,
      status: {},
      hops: hopsString,
      updated_at: server.updated_at,
      ha: server.ha,
    };
  };

  // 1. ==== 노드 타입 별 구분 시작 ====
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
  // 1. ==== 노드 타입 별 구분 끝 ====

  // 1. storedCreds 관련 함수 시작
  const getStoredServerCredentials = useCallback(
    (host: string, port: number) => {
      const normalizedHost = host.trim().toLowerCase();
      const normalizedPort = port || 22;

      return credsStore.serverlist.find(
        server =>
          server.host.trim().toLowerCase() === normalizedHost &&
          (server.port || 22) === normalizedPort
      );
    },
    [credsStore.serverlist]
  );

  const getStoredAuthHops = useCallback(
    (hops: SshHop[]) => {
      return hops.map(hop => {
        const storedCreds = getStoredServerCredentials(hop.host, hop.port);
        return {
          ...hop,
          username: storedCreds?.userId || hop.username || '',
          password: storedCreds?.password || '',
        };
      });
    },
    [getStoredServerCredentials]
  );

  const saveCredentialsToStore = useCallback(
    (authHops: SshHop[]) => {
      authHops.forEach(hop => {
        credsStore.upsertServerByHostPort({
          host: hop.host,
          port: hop.port,
          userId: hop.username,
          password: hop.password,
        });
      });
    },
    [credsStore]
  );
  // 1. storedCreds 관련 함수 끝

  // 2. ==== 노드 action 관련 함수 시작 ====
  // 작업 시작 -> delete, build, restart의 경우, criticalOperationCount 증가
  const startOperation = (nodeId: string, operationType: string) => {
    setOperationsInProgress(prev => new Set([...Array.from(prev), nodeId]));

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

  // 작업 끝 -> delete, build, restart의 경우, criticalOperationCount 감소
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

  // 상태 확인 함수
  const handleCheckStatusConfirm = useCallback(
    async (hops: SshHop[], node: Node) => {
      setOperationsInProgress(prev => new Set(prev).add(node.id));
      setNodes(prev =>
        prev.map(n =>
          n.id === node.id
            ? { ...n, status: { ...n.status, [activeTab]: 'checking' } }
            : n
        )
      );

      try {
        const response = await kubernetesApi.getNodeStatus({
          infra_id: selectedInfra.id,
          server_id: Number(node.id),
          hops: hops,
          type: activeTab,
        });

        const newStatus = response.data.status.installed
          ? response.data.status.running
            ? 'running'
            : 'unknown'
          : 'not_installed';
        const newLastChecked =
          response.data.lastChecked || new Date().toISOString();

        setNodes(prevNodes =>
          prevNodes.map(n =>
            n.id === node.id
              ? {
                  ...n,
                  status: { ...n.status, [activeTab]: newStatus },
                  last_checked: newLastChecked,
                }
              : n
          )
        );

        saveCredentialsToStore(hops);
        setSshModalState({ ...sshModalState, actionType: null });
        message.success(`${node.server_name || node.ip} 상태 확인 완료`);
      } catch (error) {
        console.error(error);
        setNodes(prevNodes =>
          prevNodes.map(n =>
            n.id === node.id
              ? { ...n, status: { ...n.status, [activeTab]: 'error' } }
              : n
          )
        );
        message.error('노드 상태 확인 실패');

        setSshModalState({
          visible: true,
          node: node,
          hops: hops, // 실패했던 접속 정보를 그대로 전달 (수정 편의성)
          isRetry: true,
          actionType: 'STATUS',
        });
      } finally {
        setOperationsInProgress(prev => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    },
    [selectedInfra.id, saveCredentialsToStore, activeTab, sshModalState]
  );

  // 노드 목록 새로고침
  const handleRefreshNodes = useCallback(async () => {
    try {
      if (!selectedInfra) {
        Modal.error({
          title: '오류',
          content: '인프라를 선택해주세요.',
          okText: '확인',
        });

        return [];
      }

      // 서버 목록 가져오기 API 호출
      const response = await kubernetesApi2.getServers(selectedInfra.id);

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
      console.error(error);
      Modal.error({
        title: '노드 목록 새로고침 실패',
        content: '노드 목록 새로고침에 실패했습니다.',
        okText: '확인',
      });
      setNodes([]);
      return [];
    }
  }, [selectedInfra]);

  // 상태 확인 함수 호출 준비
  const handleCheckNodeStatus = async (nodeId: string) => {
    if (operationsInProgress.has(nodeId)) return;

    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) {
      message.error('노드 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const rawHops = JSON.parse(targetNode.hops || '[]') as SshHop[];
      // 1. 스토어에서 정보 조회
      const hopsWithCreds = getStoredAuthHops(rawHops);
      // 각 요소들을 순회하면서 username과 password를 확인 | 하나라도 비어 있으면 false 반환 | 모두 값이 존재하면 true 반환
      const complete = hopsWithCreds.every(hop => hop.username && hop.password);

      if (complete) {
        // 2-A. 정보가 다 있으면 -> API 바로 호출 (자동 로그인 시도)
        await handleCheckStatusConfirm(hopsWithCreds, targetNode);
      } else {
        // 2-B. 정보가 부족하면 -> 모달 열기 (Normal 모드)
        setSshModalState({
          visible: true,
          node: targetNode,
          hops: hopsWithCreds, // 찾은 건 채워서 보냄
          isRetry: false,
          actionType: 'STATUS',
        });
      }
    } catch (e) {
      console.error('Hops parsing error', e);
      message.error('접속 정보 형식이 올바르지 않습니다.');
    }
  };

  // SSH 접속 정보 재입력 모달 핸들러
  const handleModalComplete = async (hopsWithCreds: SshHop[]) => {
    const { node, actionType } = sshModalState;
    if (!node) return;

    setSshModalState(prev => ({ ...prev, visible: false }));
    if (actionType === 'STATUS') {
      await handleCheckStatusConfirm(hopsWithCreds, node);
    } else if (actionType === 'RESOURCE') {
      // await checkResourceConfirm(hopsWithCreds, node);
    }
  };

  // 노드 삭제 함수
  const handleRemoveNode = (nodeId: string) => {
    const targetNode = nodes.find(node => node.id === nodeId);

    if (!targetNode) {
      Modal.error({
        title: '오류',
        content: '노드를 찾을 수 없습니다.',
        okText: '확인',
      });

      return;
    }

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
  const proceedWithNodeRemoval = (node: Node) => {
    if (node.status[activeTab as keyof NodeStatus] === '미설치') {
      // 구축하지 않은 노드의 경우 서버 정보만 삭제
      Modal.confirm({
        title: '서버 삭제 확인',
        content: (
          <div>
            <p>
              <strong>{node.server_name || node.ip}</strong> 서버를
              삭제하시겠습니까?
            </p>
            <p>아직 구축되지 않은 노드입니다. 서버 정보만 삭제됩니다.</p>
          </div>
        ),
        okText: '삭제',
        cancelText: '취소',
        okButtonProps: { danger: true },
        onOk: async () => {
          const operationId = startOperation(node.id, 'delete');

          try {
            message.loading(`${node.server_name || node.ip} 서버 삭제 중...`);

            // 서버 삭제 API 호출
            await kubernetesApi2.deleteServer(parseInt(node.id));

            // UI에서 노드 제거
            const updatedNodes = nodes.filter(node => node.id !== node.id);

            setNodes(updatedNodes);

            message.success(
              `${node.server_name || node.ip} 서버가 삭제되었습니다.`
            );
            endOperation(node.id, 'delete', operationId, true);
          } catch (error) {
            Modal.error({
              title: '서버 삭제 실패',
              content: `서버를 삭제하는 중 오류가 발생했습니다. (${error || '알 수 없는 오류'})`,
              okText: '확인',
            });
            endOperation(node.id, 'delete', operationId, false);
          }
        },
      });
    } else {
      if (
        node.nodeType === 'worker' ||
        (typeof node.nodeType === 'string' && node.nodeType.includes('worker'))
      ) {
        setDeleteRequest({ type: 'worker', stage: 'target', targetNode: node });
      } else if (
        node.nodeType === 'master' ||
        (typeof node.nodeType === 'string' && node.nodeType.includes('master'))
      ) {
        setDeleteRequest({ type: 'master', stage: 'target', targetNode: node });
      } else if (
        typeof node.nodeType === 'string' &&
        node.nodeType.includes('ha')
      ) {
        message.warning(
          'HA 노드는 직접 삭제할 수 없습니다. 마스터 노드를 삭제하면 관련 정보가 정리됩니다.'
        );
      }
    }
  };

  // 워커 노드 삭제
  const executeDeleteWorker = useCallback(async () => {
    if (!deleteRequest) {
      message.error('삭제에 필요한 인증 정보가 부족합니다.');
      setDeleteRequest(null);
      return;
    }

    const { targetNode } = deleteRequest;
    const mainMasterNode = nodes.find(n => n.join_command && n.certificate_key);
    if (!mainMasterNode) {
      message.error('메인 마스터 노드를 찾을 수 없습니다.');
      setDeleteRequest(null);
      return;
    }

    const operationId = startOperation(targetNode.id, 'delete');
    const originalNodes = nodes;
    setNodes(prevNodes => prevNodes.filter(node => node.id !== targetNode.id));

    message.loading({
      content: `워커 노드 ${targetNode.server_name || targetNode.ip} 삭제를 시작합니다...`,
      key: targetNode.id,
    });

    try {
      const targetAuth = getStoredAuthHops(
        JSON.parse(targetNode.hops) as SshHop[]
      );
      const mainAuth = getStoredAuthHops(
        JSON.parse(mainMasterNode.hops) as SshHop[]
      );
      const response = await kubernetesApi2.deleteWorker({
        id: Number(targetNode.id),
        infra_id: selectedInfra.id,
        main_id: Number(mainMasterNode.id),
        hops: targetAuth,
        main_hops: mainAuth,
        password: targetAuth[targetAuth.length - 1].password,
        main_password: mainAuth[mainAuth.length - 1].password,
      });

      message.success({
        content: response.message,
        key: targetNode.id,
        duration: 5,
      });

      endOperation(targetNode.id, 'delete', operationId, true);
    } catch (error) {
      message.error({
        content: '워커 노드 삭제 시작에 실패했습니다: ' + error,
        key: targetNode.id,
        duration: 4,
      });
      setNodes(originalNodes);
      endOperation(targetNode.id, 'delete', operationId, false);
    } finally {
      setDeleteRequest(null); // 프로세스 종료
    }
  }, [deleteRequest, nodes, selectedInfra, getStoredAuthHops]);

  // 마스터 노드 삭제
  const executeDeleteMaster = useCallback(async () => {
    if (!deleteRequest) {
      message.error('삭제에 필요한 인증 정보가 부족합니다.');
      setDeleteRequest(null);
      return;
    }

    const { targetNode } = deleteRequest;

    const operationId = startOperation(targetNode.id, 'delete');
    message.loading({
      content: `마스터 노드 ${targetNode.server_name || targetNode.ip} 삭제를 시작합니다...`,
      key: targetNode.id,
    });

    try {
      const targetAuth = getStoredAuthHops(
        JSON.parse(targetNode.hops) as SshHop[]
      );
      const mainMasterNode = nodes.find(
        n => n.join_command && n.certificate_key
      );
      const mainAuth = getStoredAuthHops(
        JSON.parse(mainMasterNode.hops) as SshHop[]
      );
      const haNodes = nodes.filter(n => n.nodeType.includes('ha'));
      const haAuth = getStoredAuthHops(JSON.parse(haNodes[0].hops) as SshHop[]);
      const response = await kubernetesApi2.deleteMaster({
        id: Number(targetNode.id),
        infra_id: selectedInfra.id,
        hops: targetAuth,
        main_hops: mainAuth,
        lb_hops: haAuth,
        // password 필드들도 전달
        password: targetAuth[targetAuth.length - 1].password,
        main_password: mainAuth[mainAuth.length - 1].password,
        lb_password: haAuth ? haAuth[haAuth.length - 1].password : undefined,
      });

      message.success({
        content: response.message,
        key: targetNode.id,
        duration: 5,
      });

      endOperation(targetNode.id, 'delete', operationId, true);
    } catch (error) {
      message.error({
        content: `마스터 노드 삭제 시작에 실패했습니다: ` + error,
        key: targetNode.id,
        duration: 4,
      });
      endOperation(targetNode.id, 'delete', operationId, false);
    } finally {
      setDeleteRequest(null);
    }
  }, [deleteRequest, nodes, selectedInfra, getStoredAuthHops]);

  useEffect(() => {
    if (!deleteRequest) return;
    const { type } = deleteRequest;

    if (type === 'worker') {
      void executeDeleteWorker();
    } else if (type === 'master') {
      void executeDeleteMaster();
    }

    void handleRefreshNodes();
  }, [
    deleteRequest,
    executeDeleteMaster,
    executeDeleteWorker,
    nodes,
    handleRefreshNodes,
  ]);

  // 2. ==== 노드 action 관련 함수 끝 ====

  // 2-1 ==== k8s 구축 관련 함수 시작 ====
  const handleStartBuild = async (node: Node) => {
    const buildOperationHops = JSON.parse(node.hops || '[]') as SshHop[];

    // 1. ensureSshCreds를 통한 자동 진행 시도
    if (buildOperationHops.length > 0) {
      const ready = await ensureSshCreds(buildOperationHops, async () => {
        try {
          void proceedWithBuild(node);
        } catch (error) {
          console.error(error);
        }
      });

      if (ready) return; // 자동 진행 완료 시 종료
    }
  };

  const proceedWithBuild = async (node: Node) => {
    const buildOperationHops = JSON.parse(node.hops || '[]') as SshHop[];

    if (buildOperationHops.length > 0) {
      const storedAuthHops = getStoredAuthHops(buildOperationHops);
      const hasCompleteCredentials = storedAuthHops.every(
        hop => hop.username && hop.password
      );

      if (hasCompleteCredentials) {
        await handleBuildConfirm(storedAuthHops, 'build', node);

        saveCredentialsToStore(storedAuthHops);
      } else {
        setSshModalState({
          visible: true,
          hops: storedAuthHops,
          isRetry: true,
          node: node,
          actionType: 'BUILD',
        });
      }
    }
  };

  // 실제 구축 함수
  const handleBuildConfirm = async (
    authHops: SshHop[],
    purpose: 'build' | 'start' | 'stop' | 'restart',
    targetNode: Node
  ) => {
    if (!targetNode) {
      console.error('구축 대상 노드 정보가 없습니다.');
      return;
    }

    // let isIntermediateReturn = false;
    const operationId = startOperation(targetNode.id, 'build');
    const serverId = parseInt(targetNode.id);
    const infraId = selectedInfra.id;

    message.loading({
      content: `${targetNode.server_name || targetNode.ip} 서버 작업 시작...`,
      key: targetNode.id,
    });

    try {
      let response: StandardApiResponse = {
        success: false,
        message: '작업이 시작되지 않았습니다.',
      };
      // todo: 시작, 재시작 로직 //

      switch (activeTab) {
        case 'ha':
          response = await awxApi.runPlaybook({
            hops: authHops,
            playbook_to_run: 'install_haproxy',
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success)
            throw new Error(response.message || 'HA 구축 실패');
          break;
        case 'master':
          const isFirstMaster = !nodes.some(
            n =>
              n.id !== targetNode.id &&
              n.nodeType.includes('master') &&
              n.status[activeTab as keyof NodeStatus] === 'running'
          );
          const haNodes = nodes.filter(n => n.nodeType.includes('ha'));

          let lbAuthHops: SshHop[] = null;
          if (haNodes.length > 0) {
            const representativeHaNode = haNodes[0];
            lbAuthHops = getStoredAuthHops(
              JSON.parse(representativeHaNode.hops) as SshHop[]
            );
            if (lbAuthHops.every(hop => hop.username && hop.password)) {
              setSshModalState({
                visible: true,
                hops: lbAuthHops,
                isRetry: true,
                node: representativeHaNode,
                actionType: 'BUILD',
              });
            }
          }

          if (isFirstMaster) {
            // 첫 마스터 구축
            if (haNodes.length > 0 && !lbAuthHops)
              throw new Error(
                'HA 클러스터에는 HA 노드 인증 정보가 필수입니다.'
              );

            // 1. Install
            response = await awxApi.runPlaybook({
              playbook_to_run: 'install_kubernetes',
              hops: authHops,
              awxTemplate: user?.awx_template || 0,
            });
            if (!response.success)
              throw new Error(response.message || 'Kubernetes 설치 실패');

            // 2. HAProxy Update
            if (haNodes.length > 0) {
              response = await awxApi.runPlaybook({
                playbook_to_run: 'haproxy_update',
                hops: lbAuthHops,
                lbHops: lbAuthHops || undefined,
                master_ip: authHops[authHops.length - 1].host,
                server_id: serverId,
                infra_id: infraId,
                awxTemplate: user?.awx_template || 0,
              });
              if (!response.success)
                throw new Error(response.message || 'HAProxy 업데이트 실패');
            }

            // 3. Init
            response = await awxApi.runPlaybook({
              playbook_to_run: 'init_k8s_master',
              hops: authHops,
              lbHops: lbAuthHops || undefined,
              server_id: serverId,
              awxTemplate: user?.awx_template || 0,
            });
            if (!response.success)
              throw new Error(response.message || '마스터 초기화 실패');
          } else {
            // 마스터 추가
            const mainMasterNode = nodes.find(
              n => n.join_command && n.certificate_key
            );
            if (!mainMasterNode)
              throw new Error('메인 마스터 노드를 찾을 수 없습니다.');
            if (haNodes.length > 0 && !lbAuthHops)
              throw new Error(
                '마스터 조인에 필요한 HA 노드를 찾을 수 없습니다.'
              );

            // 1. Install
            let res = await awxApi.runPlaybook({
              playbook_to_run: 'install_kubernetes',
              hops: authHops,
              awxTemplate: user?.awx_template || 0,
            });
            if (!res.success)
              throw new Error(res.message || 'Kubernetes 설치 실패');

            // 2. HAProxy Update
            if (haNodes.length > 0) {
              res = await awxApi.runPlaybook({
                playbook_to_run: 'haproxy_update',
                hops: lbAuthHops,
                lbHops: lbAuthHops || undefined,
                master_ip: authHops[authHops.length - 1].host,
                server_id: serverId,
                infra_id: infraId,
                awxTemplate: user?.awx_template || 0,
              });
              if (!res.success)
                throw new Error(res.message || 'HAProxy 업데이트 실패');
            }

            // 3. Join
            response = await awxApi.runPlaybook({
              playbook_to_run: 'join_k8s_master',
              hops: authHops,
              lbHops: lbAuthHops || undefined,
              main_id: parseInt(mainMasterNode.id),
              master_ip: mainMasterNode.ip,
              server_id: serverId,
              awxTemplate: user?.awx_template || 0,
            });
            if (!response.success)
              throw new Error(response.message || '마스터 조인 실패');
          }
          break;
        case 'worker':
          let mainMasterNode = nodes.find(
            n =>
              n.nodeType === 'master' ||
              (typeof n.nodeType === 'string' && n.nodeType.includes('master'))
          );
          const runningMasters = nodes.filter(
            n =>
              (n.nodeType === 'master' ||
                (typeof n.nodeType === 'string' &&
                  n.nodeType.includes('master'))) &&
              n.status['master'] === 'running'
          );
          if (runningMasters.length > 0) {
            mainMasterNode = runningMasters[0];
          }
          if (!mainMasterNode)
            throw new Error('메인 마스터 노드를 찾을 수 없습니다.');

          const masterRawHops = JSON.parse(
            mainMasterNode.hops || '[]'
          ) as SshHop[];
          const masterAuthHops = getStoredAuthHops(masterRawHops);

          if (!masterAuthHops.every(h => h.username && h.password)) {
            throw new Error(
              `마스터 노드(${mainMasterNode.server_name})의 인증 정보가 없습니다. 마스터 노드 상태 확인을 먼저 수행해주세요.`
            );
          }

          if (!mainMasterNode.join_command || !mainMasterNode.certificate_key) {
            message.loading({
              content: `마스터 노드(${mainMasterNode.server_name})에서 조인 토큰을 갱신 중입니다...`,
              key: targetNode.id,
            });

            const tokenRefreshResponse = await awxApi.runPlaybook({
              playbook_to_run: 'refresh_k8s_token',
              hops: masterAuthHops,
              server_id: parseInt(mainMasterNode.id), // 마스터 ID 전달
              awxTemplate: user?.awx_template || 0,
            });

            if (!tokenRefreshResponse.success) {
              throw new Error(
                '마스터 토큰 갱신 실패: ' + tokenRefreshResponse.message
              );
            }
            // 새로 발급 받은 토큰을 db에 업데이트

            // await handleRefreshNodes();
          }

          message.loading({
            content: `워커 노드 ${targetNode.server_name || targetNode.ip} 설치를 시작합니다...`,
            key: targetNode.id,
          });

          // 1. Install
          response = await awxApi.runPlaybook({
            playbook_to_run: 'install_kubernetes',
            hops: authHops,
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success)
            throw new Error(response.message || 'Kubernetes 설치 실패');

          // 3. Join
          response = await awxApi.runPlaybook({
            playbook_to_run: 'join_k8s_worker',
            hops: authHops,
            main_id: parseInt(mainMasterNode.id),
            server_id: serverId,
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success)
            throw new Error(response.message || '워커 조인 실패');
          break;
      }

      message.destroy(targetNode.id);
      Modal.success({
        title: '작업 시작됨',
        content: response.message || '구축 작업이 성공적으로 시작되었습니다.',
      });

      void handleRefreshNodes();
      endOperation(targetNode.id, 'build', operationId, true);
    } catch (error) {
      message.destroy(targetNode.id);
      Modal.error({
        title: '작업 시작 실패',
        content: `노드 작업 시작에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
      });
      endOperation(targetNode.id, 'build', operationId, false);
    } finally {
      // if (isIntermediateReturn) {
      // }
    }
  };

  // 재구축 함수 호출 전 확인
  const handleRebuild = async (node: Node) => {
    const isWorker = node.nodeType === 'worker';

    if (isWorker) {
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

      // todo: 인증서 유효시간 체크
      // if (!isCertificateValid(mainMasterNode.updated_at)) {
      //   Modal.confirm({
      //     title: '인증서 만료',
      //     content: (
      //       <div>
      //         <p style={{ marginBottom: '12px' }}>
      //           메인 마스터 노드{' '}
      //           <strong>
      //             {mainMasterNode.server_name || mainMasterNode.ip}
      //           </strong>
      //           의 인증서가 만료되었습니다 (2시간 이상 경과).
      //         </p>
      //         <p style={{ marginBottom: '12px', color: '#faad14' }}>
      //           ⚠️ 워커 노드를 재구축하려면 먼저 메인 마스터 노드의 인증서를
      //           갱신해야 합니다.
      //         </p>
      //         <p style={{ fontSize: '12px', color: '#666' }}>
      //           자동으로 인증서를 갱신하시겠습니까?
      //         </p>
      //       </div>
      //     ),
      //     okText: '자동 갱신',
      //     cancelText: '취소',
      //     onOk: () => handleCertificateRenewal(mainMasterNode, node),
      //   });

      //   return;
      // }
    }

    const buildOperationHops = JSON.parse(node.hops || '[]') as SshHop[];
    if (buildOperationHops.length > 0) {
      const storedAuthHops = getStoredAuthHops(buildOperationHops);
      const hasCompleteCredentials = storedAuthHops.every(
        hop => hop.username && hop.password
      );
      if (hasCompleteCredentials) {
        await handleRebuildConfirm(storedAuthHops, node);

        saveCredentialsToStore(storedAuthHops);
      } else {
        setSshModalState({
          visible: true,
          hops: storedAuthHops,
          isRetry: true,
          node: node,
          actionType: 'BUILD',
        });
      }
    }
  };

  // 실제 재구축 함수
  const handleRebuildConfirm = async (authHops: SshHop[], targetNode: Node) => {
    if (!targetNode) {
      message.error('재구축 대상 노드 정보가 없습니다.');
      return;
    }

    const operationId = startOperation(targetNode.id, 'rebuild');

    message.loading({
      content: `${targetNode.server_name || targetNode.ip} 노드 재구축을 시작합니다...`,
      key: targetNode.id,
    });

    try {
      let response: StandardApiResponse = {
        success: false,
        message: '작업이 시작되지 않았습니다.',
      };
      const lastHopPassword =
        authHops.length > 0 ? authHops[authHops.length - 1].password : '';
      const mainMasterNode = nodes.find(
        n => n.join_command && n.certificate_key
      );
      if (activeTab === 'ha' && targetNode.nodeType.includes('ha')) {
        // HA 노드 재구축
        response = await awxApi.runPlaybook({
          playbook_to_run: 'uninstall_haproxy',
          hops: authHops,
          awxTemplate: user?.awx_template || 0,
        });
        if (!response.success)
          throw new Error(response.message || 'HAProxy 삭제 실패');

        response = await awxApi.runPlaybook({
          playbook_to_run: 'install_haproxy',
          hops: authHops,
          awxTemplate: user?.awx_template || 0,
        });
        if (!response.success)
          throw new Error(response.message || 'HAProxy 설치 실패');
      } else if (
        activeTab === 'master' &&
        targetNode.nodeType.includes('master')
      ) {
        const haNodesExist = nodes.some(node => node.nodeType.includes('ha'));

        let lbAuthHops: SshHop[] = null;
        if (haNodes.length > 0) {
          const representativeHaNode = haNodes[0];
          lbAuthHops = getStoredAuthHops(
            JSON.parse(representativeHaNode.hops) as SshHop[]
          );
          if (lbAuthHops.every(hop => hop.username && hop.password)) {
            setSshModalState({
              visible: true,
              hops: lbAuthHops,
              isRetry: true,
              node: representativeHaNode,
              actionType: 'BUILD',
            });
          }
        }

        // 1. Uninstall Kubernetes (기존 설치 제거)
        response = await awxApi.runPlaybook({
          playbook_to_run: 'uninstall_kubernetes',
          hops: authHops,
          awxTemplate: user?.awx_template || 0,
        });
        if (!response.success)
          throw new Error(response.message || 'Kubernetes 삭제 실패');

        const isFirstMaster = !nodes.some(
          node =>
            node.id !== targetNode.id &&
            node.nodeType.includes('master') &&
            node.status[activeTab as keyof NodeStatus] === 'running'
        );

        if (isFirstMaster) {
          // 2. Install & Init (첫 마스터)
          response = await awxApi.runPlaybook({
            playbook_to_run: 'install_kubernetes',
            hops: authHops,
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success) throw new Error('Kubernetes 설치 실패');

          // HAProxy Update
          if (haNodesExist) {
            response = await awxApi.runPlaybook({
              playbook_to_run: 'haproxy_update',
              hops: lbAuthHops,
              lbHops: lbAuthHops || undefined,
              master_ip: authHops[authHops.length - 1].host,
              server_id: parseInt(targetNode.id),
              awxTemplate: user?.awx_template || 0,
            });
            if (!response.success) throw new Error('HAProxy 업데이트 실패');
          }

          response = await awxApi.runPlaybook({
            playbook_to_run: 'init_k8s_master',
            hops: authHops,
            lbHops: lbAuthHops || undefined,
            server_id: parseInt(targetNode.id),
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success) throw new Error('마스터 초기화 실패');
        } else {
          // 2. Install & Join (마스터 조인)
          if (!mainMasterNode)
            throw new Error('메인 마스터 노드를 찾을 수 없습니다.');

          response = await awxApi.runPlaybook({
            playbook_to_run: 'install_kubernetes',
            hops: authHops,
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success) throw new Error('Kubernetes 설치 실패');

          if (haNodesExist) {
            response = await awxApi.runPlaybook({
              playbook_to_run: 'haproxy_update',
              hops: lbAuthHops,
              lbHops: lbAuthHops || undefined,
              master_ip: authHops[authHops.length - 1].host,
              server_id: parseInt(targetNode.id),
              infra_id: selectedInfra.id,
              awxTemplate: user?.awx_template || 0,
            });
            if (!response.success) throw new Error('HAProxy 업데이트 실패');
          }

          response = await awxApi.runPlaybook({
            playbook_to_run: 'join_k8s_master',
            hops: authHops,
            lbHops: lbAuthHops || undefined,
            main_id: parseInt(mainMasterNode.id),
            master_ip: mainMasterNode.ip,
            server_id: parseInt(targetNode.id),
            awxTemplate: user?.awx_template || 0,
          });
          if (!response.success) throw new Error('마스터 조인 실패');
        }
      } else if (
        activeTab === 'worker' &&
        targetNode.nodeType.includes('worker')
      ) {
        if (!mainMasterNode)
          throw new Error('메인 마스터 노드를 찾을 수 없습니다.');

        response = await kubernetesApi2.rebuildWorker({
          id: parseInt(targetNode.id),
          infra_id: selectedInfra.id,
          hops: authHops,
          password: lastHopPassword,
          main_id: parseInt(mainMasterNode.id),
        });
      }

      message.destroy(targetNode.id);
      Modal.success({
        title: '작업 시작됨',
        content: response.message || '재구축 작업이 시작되었습니다.',
      });
      void handleRefreshNodes();
      endOperation(targetNode.id, 'rebuild', operationId, true);
    } catch (error) {
      message.destroy(targetNode.id);
      Modal.error({
        title: '작업 시작 실패',
        content: `노드 재구축 시작에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
      });
      endOperation(targetNode.id, 'rebuild', operationId, false);
    } finally {
      //
    }
  };
  // 2-1 ==== k8s 구축 관련 함수 끝 ====

  // 3. 노드 추가 관련 함수
  const handleAddNode = async (values: {
    server_name?: string;
    hops: { host: string; port: number; username: string; password: string }[];
    device_id: number;
  }) => {
    if (!selectedInfra) {
      message.error('인프라 정보가 없습니다.');
      return;
    }

    // 1. SSH 연결 테스트 먼저 수행
    try {
      const hopsWithCreds = getStoredAuthHops(values.hops);
      await api.kubernetes.testSSHConnection(hopsWithCreds);
      message.success('SSH 연결 테스트가 성공했습니다.');
    } catch (error) {
      console.error('SSH 연결 테스트 실패:', error);
      message.error(
        'SSH 연결 테스트에 실패했습니다. 연결 정보를 확인해주세요.'
      );
      setSshModalState({
        visible: true,
        node: null,
        hops: values.hops,
        isRetry: true,
        actionType: 'ADD',
      });
      return;
    }

    const lastHop = values.hops[values.hops.length - 1];

    const existingServer = nodes.find(node => {
      try {
        const nodeHops = JSON.parse(node.hops) as SshHop[];
        const nodeLastHop = nodeHops[nodeHops.length - 1];

        return (
          nodeLastHop.host === lastHop.host && nodeLastHop.port === lastHop.port
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
        message.info(`이미 ${activeTab} 타입으로 등록된 서버입니다.`);
        return;
      }
      const newTypeString = [...existingTypes, activeTab].join(',');
      const updateData: {
        id: number;
        type: string;
        infra_id: number;
        server_name?: string;
      } = {
        id: parseInt(existingServer.id),
        type: newTypeString,
        infra_id: selectedInfra.id,
      };

      if (
        activeTab !== 'ha' &&
        !existingServer.server_name &&
        values.server_name
      ) {
        updateData.server_name = values.server_name;
      }
      await kubernetesApi2.updateServer(
        parseInt(existingServer.id),
        updateData
      );
      message.success(`기존 서버에 ${activeTab} 타입이 추가되었습니다.`);
    } else {
      const hopsForDb = values.hops.map(hop => ({
        host: hop.host,
        port: hop.port,
        username: hop.username,
        // password는 제외
      }));

      if (activeTab === 'ha') {
        // HA 노드일 경우: name 필드를 제외하고 API 호출
        const serverData = {
          infra_id: selectedInfra.id,
          type: activeTab,
          status: '등록' as ServerStatus,
          ip: lastHop.host,
          port: lastHop.port,
          hops: hopsForDb, // 비밀번호 제외
          // name 필드 제거
          device_id: values.device_id,
        };

        await kubernetesApi2.createServer(serverData);
        message.success(`HA 노드가 추가되었습니다. (IP: ${lastHop.host})`);

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
          message.error('마스터/워커 노드는 서버 이름이 필수입니다.');

          return;
        }
        const serverData = {
          infra_id: selectedInfra.id,
          type: activeTab,
          name: values.server_name, // string 타입으로 확정
          status: '등록' as ServerStatus,
          ip: lastHop.host,
          port: lastHop.port,
          hops: hopsForDb, // 비밀번호 제외된 데이터
          device_id: values.device_id,
        };

        await kubernetesApi2.createServer(serverData);
        const nodeTypeText = activeTab === 'master' ? '마스터' : '워커';

        message.success(
          `${nodeTypeText} 노드가 추가되었습니다. (이름: ${values.server_name})`
        );
        void handleRefreshNodes();

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
  };

  useEffect(() => {
    const nodes = selectedInfra.nodes.map(node => convertServerToNode(node));
    setNodes(nodes);
  }, [selectedInfra]);

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
    {
      title: '접속 경로',
      dataIndex: 'hops',
      key: 'hops',
      width: 300,
      render: (hopsJson: string) => {
        try {
          const parsedHops = JSON.parse(hopsJson) as SshHop[];

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
          return <Text type='danger'>경로 오류</Text>;
        }
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: NodeStatus) => {
        const currentStatus =
          status[activeTab as keyof NodeStatus] || 'unknown';
        return (
          <Space>
            {getStatusIcon(currentStatus)}
            <span>{getStatusText(currentStatus)}</span>
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
        } catch (error) {
          return lastChecked;
        }
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 300,
      render: (_: unknown, record: Node) => renderNodeActions(record),
    },
  ];

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
        loading={
          isOperationInProgress &&
          node.status[activeTab as keyof NodeStatus] === 'checking'
        }
      >
        상태 확인
      </Button>
    );

    if (!node.last_checked) {
      return <Space>{actions}</Space>;
    }

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
          n.status[activeTab as keyof NodeStatus] === 'active'
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

    switch (node.status[activeTab as keyof NodeStatus]) {
      case 'running':
        if (activeTab === node.nodeType || node.nodeType.includes(activeTab)) {
          let buildButtonText = '재구축';
          let icon = <ToolOutlined />;

          if (isHA && activeTab === 'ha') {
            buildButtonText = 'HA 재구축';
          } else if (isMaster && activeTab === 'master') {
            buildButtonText = '마스터 재구축';
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
              }}
            >
              <Button
                key='rebuild'
                size='small'
                icon={icon}
                type='primary'
                loading={isOperationInProgress}
              >
                {buildButtonText}
              </Button>
            </Popconfirm>
          );
        }
        break;
      case 'stopped':
        break;
      case 'preparing':
        break;
      case 'not_installed':
        // 구축 버튼 추가
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
              loading={isOperationInProgress}
            >
              {buildButtonText}
            </Button>
          );
        }
        break;
      default:
        break;
    }

    return <Space>{actions}</Space>;
  };

  return (
    <>
      <div className='infra-content-wrapper'>
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
                      {integrityCheck.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  }
                  type='warning'
                  showIcon
                  closable
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
              closable
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
                    {selectedInfra.nodes.length}개
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
                  <Text className='node-stat-number'>{haNodes.length}개</Text>
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
            onChange={key => setActiveTab(key as NodeType)}
            activeKey={activeTab}
          >
            <TabPane tab='HA 노드' key='ha'>
              <Table
                columns={nodeColumns.filter(col => col.key !== 'server_name')}
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
        </div>
      </div>

      {/* 최근 작업 히스토리 표시 (최근 5개만) */}
      {operationHistory.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Divider orientation='left'>최근 작업 히스토리</Divider>
          <List
            size='small'
            dataSource={operationHistory.slice(-5).reverse()}
            renderItem={operation => {
              const node = selectedInfra.nodes.find(
                n => n.id === operation.node
              );
              const nodeName = node?.server_name || node?.ip || operation.node;
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
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    )}
                    {operation.status === 'failed' && (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    {operation.status === 'in_progress' && (
                      <SyncOutlined spin style={{ color: '#1890ff' }} />
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
                            : operation.type === 'renew_certificate'
                              ? ' 시작됨'
                              : ' 완료')}
                      {operation.status === 'failed' && ' 실패'}
                      {operation.status === 'in_progress' && ' 진행 중'}
                    </Text>
                    <Text type='secondary' style={{ fontSize: '12px' }}>
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

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              setIsAddNodeModalVisible(true);
            }}
            size='middle'
            shape='round'
          >
            노드 추가
          </Button>
        </Space>
      </div>

      <AddNodeModal
        visible={isAddNodeModalVisible}
        onCancel={() => setIsAddNodeModalVisible(false)}
        onAdd={handleAddNode}
        loading={false}
        initialNodeType={activeTab as 'ha' | 'master' | 'worker'}
      />

      <SshCredentialModal
        visible={sshModalState.visible}
        onClose={() => setSshModalState(prev => ({ ...prev, visible: false }))}
        onComplete={handleModalComplete}
        hops={sshModalState.hops}
        infraId={selectedInfra.id} // 인프라 ID 전달
        isRetry={sshModalState.isRetry} // 재시도 여부 전달 (Alert 표시용)
        serviceName={sshModalState.node?.server_name || sshModalState.node?.ip} // 안내 문구용
      />
    </>
  );
};

export default InfraKubernetesNodeSettingTab;
