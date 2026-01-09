import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Dropdown,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CloudServerOutlined,
  ClusterOutlined,
  DesktopOutlined,
  ContainerOutlined,
  CloudOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ReloadOutlined,
  PoweroffOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import './RuntimeSetting.css';
import { InfraStatus, InfraWithNodes } from '../../types/infra';
import { awxApi, SshHop } from '../../lib/api';
import { useCredsStore } from '../../stores/useCredsStore';
import { useAuth } from '../../context/AuthContext';
import * as kubernetesApi from '../../lib/api/kubernetes';
import InfraDockerSetting from './InfraDockerSetting';
import InfraPodmanSetting from './InfraPodmanSetting';
import InfraKubernetesSetting from './InfraKubernetesSetting';
import { AddNodeModal } from './modals';
import SshCredentialModal from '../services/SshCredentialModal';
import { ServerStatus as ServerStatusForAddServer } from '../../types/index';

type ServerStatus = 'active' | 'inactive' | 'uninstalled' | 'unknown';

interface RuntimeSettingProps {
  infraData: InfraWithNodes[];
  selectedInfra: InfraWithNodes;
  onInfraSelect: (id: number) => void;
  onShowSettings: (infra: InfraWithNodes) => void;
  onRefresh: () => void;
  onStatusUpdate: (infraId: number, status: ServerStatus) => void;
  setInfraData: (infraData: InfraWithNodes[]) => void;
}

interface PlaybookPayload {
  server_id: number;
  infraId: number;
  action: string;
  runtimeType: string;
  playbook_to_run?: string;
  hops: SshHop[];
  awxTemplate: number;
}

interface AwxResponseRuntimeDetails {
  data: {
    awx_job_result: {
      details: {
        all_containers?: string[];
        all_pods?: string[];
        collection_time?: string;
        images?: string[];
        image_count?: number;
        info_status?: string;
        daemon_status?: string;
        operation?: string;
        running_containers?: string[];
        running_container_count?: number;
        running_pods?: string[];
        service_status?: string;
        socket_status?: string;
        target_host?: string;
        version?: string;
        volumes?: {
          volume_name: string;
          containers: {
            name: string;
            mountpoint: string;
          }[];
        }[];
        networks?: {
          name: string;
          subnet: string;
          gateway: string;
          container_count: number;
        }[];
        //
        namespace?: string[];
        pods?: {
          ip: string;
          name: string;
          namespace: string;
          node: string;
          status: string;
        }[];
        network_svc?: {
          cluster_ip: string;
          name: string;
          namespace: string;
          port: string;
          type: string;
        }[];
        volumes_pvc?: any[];
      };
    };
    status?: string;
  };
}

export interface RuntimeDetailsForKubernetes {
  namespace: string[];
  pods: {
    ip: string;
    name: string;
    namespace: string;
    node: string;
    status: string;
  }[];
  network_svc: {
    cluster_ip: string;
    name: string;
    namespace: string;
    port: string;
    type: string;
  }[];
  volumes_pvc: any[];
}

export interface RuntimeDetailsForSinglehost {
  container_count: number;
  containers: {
    id: string;
    name: string;
    image: string;
    status: string;
    created: string;
    command: string;
    ports: string[];
  }[];
  collection_time: string;
  images: {
    repository: string;
    tag: string;
    id: string;
    size: string;
    created: string;
  }[];
  image_count: number;
  version: string;
  status: 'active' | 'inactive' | 'uninstalled' | 'unknown';
  volumes: {
    name: string;
    usedBy: string;
    mountpoint: string;
    rowSpan: number;
  }[];
  networks: {
    name: string;
    subnet: string;
    gateway: string;
    container_count: number;
  }[];
}

const RuntimeSetting: React.FC<RuntimeSettingProps> = ({
  infraData,
  selectedInfra,
  onInfraSelect,
  onRefresh,
  onStatusUpdate,
  setInfraData,
}) => {
  // SSH 접속 정보 입력 모달을 위한 상태 변수
  const [sshCredentialModalVisible, setSshCredentialModalVisible] =
    useState<boolean>(false);
  const [sshCredentialRetry, setSshCredentialRetry] = useState(false);
  const [pendingHops, setPendingHops] = useState<SshHop[]>([]); //! 모달에 전달할 Hop 정보
  // SSH 접속 정보 수정 후 플레이북 재 호출을 위한 상태 변수
  const [playbookPayload, setPlaybookPayload] =
    useState<PlaybookPayload | null>(null);

  // Detail Modal Visible 상태 변수
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  // detail Data 를 위한 상태 변수
  const [runtimeDetails, setRuntimeDetails] = useState<
    RuntimeDetailsForKubernetes | RuntimeDetailsForSinglehost
  >(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  // 장비 연결을 위한 모달 상태 변수
  const [addServerModalVisible, setAddServerModalVisible] =
    useState<boolean>(false);
  const [installLoading, setInstallLoading] = useState<boolean>(false);

  const { user } = useAuth();
  const credsStore = useCredsStore();

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

  // 마스터/컨트롤플레인 노드를 찾는 헬퍼 함수 (external_kubernetes 대응)
  const findMasterNode = useCallback((nodes: InfraWithNodes['nodes']) => {
    if (nodes.length === 0) return null;

    // master, control-plane 등의 노드 타입 필터링
    const masterNodes = nodes.filter(node => {
      const nodeType =
        typeof node.type === 'string' ? node.type.toLowerCase() : '';
      return (
        nodeType.includes('master') ||
        nodeType.includes('control-plane') ||
        nodeType.includes('control_plane')
      );
    });

    // 마스터 노드가 없으면 첫 번째 노드 사용
    return masterNodes.length > 0 ? masterNodes[0] : nodes[0];
  }, []);
  // 1. storedCreds 관련 함수 끝

  // todo: 2.1. 새 SSH 접속 정보 재 입력 관련 함수 시작
  const handleSshCredentialComplete = (hopsWithCreds: SshHop[]) => {
  };
  // 2.1. 새 SSH 접속 정보 재 입력 관련 함수 끝

  // 3. 런타임 상세 관련 함수 시작
  const handleSelectInfra = async (infra: InfraWithNodes) => {
    setDetailLoading(true);
    setDetailModalVisible(true);
    onInfraSelect(infra.id);
    if (infra.type === 'docker' || infra.type === 'podman') {
      // docker / podman 런타임 선택
      // 추가된 런타임에 등록된 node가 없는 경우 리턴
      if (infra.nodes.length === 0) {
        setDetailLoading(false);
        return;
      }
      const hopsWithCreds = getStoredAuthHops(
        JSON.parse(infra.nodes[0].hops as string) as SshHop[]
      );
      const response = (await awxApi.runPlaybook({
        playbook_to_run: `status_${infra.type}`,
        hops: hopsWithCreds,
        awxTemplate: user?.awx_template,
      })) as AwxResponseRuntimeDetails;
      const responseData = response.data.awx_job_result.details;

      let status: 'active' | 'inactive' | 'uninstalled' | 'unknown';
      if (responseData.version === '설치되지 않음') {
        status = 'uninstalled';
      } else if (
        responseData.socket_status === '활성' &&
        responseData.info_status === '정상'
      ) {
        status = 'active';
      } else if (
        responseData.socket_status === '비활성' ||
        responseData.info_status === '비정상'
      ) {
        status = 'inactive';
      } else {
        status = 'unknown';
      }

      const allContainers = responseData.all_containers.slice(1) || [];
      const images = responseData.images.slice(1) || [];
      const volumes = responseData.volumes || [];
      const networks = responseData.networks || [];
      const convertContainerStatus = (
        status: string
      ): 'running' | 'stopped' | 'paused' | 'exited' => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.startsWith('up')) return 'running';
        if (lowerStatus.startsWith('exited')) return 'exited';
        if (lowerStatus.includes('paused')) return 'paused';
        return 'stopped';
      };

      const runtimeDetails: RuntimeDetailsForSinglehost = {
        container_count: allContainers.length,
        containers: allContainers.map((containerStr: string) => {
          const parts = containerStr.trim().split(/\s{2,}/);
          return {
            id: parts[0] + '',
            name: parts[parts.length - 1] || '',
            image: parts[1] || '',
            status: convertContainerStatus(parts[4] || ''),
            created: parts[3] || '',
            command: parts[2] || '',
            ports: parts[5] ? [parts[5]] : [],
          };
        }),
        collection_time: responseData.collection_time,
        images: images.map((imageStr: string) => {
          const parts = imageStr.trim().split(/\s{2,}/);
          return {
            id: parts[2] || '',
            repository: parts[0] || '',
            tag: parts[1] || '',
            size: parts[4] || '0B',
            created: parts[3] || '',
          };
        }),
        image_count: images.length,
        version: responseData.version,
        status: status,
        volumes: volumes.flatMap(
          (volume: {
            volume_name: string;
            containers: { name: string; mountpoint: string }[];
          }) => {
            if (!volume.containers || volume.containers.length === 0) {
              return [
                {
                  name: volume.volume_name,
                  usedBy: '-',
                  mountpoint: '-',
                  rowSpan: 1,
                },
              ];
            }
            return volume.containers.map(
              (
                container: { name: string; mountpoint: string },
                index: number
              ) => ({
                name: volume.volume_name,
                usedBy: container.name,
                mountpoint: container.mountpoint,
                rowSpan: index === 0 ? volume.containers.length : 0,
              })
            );
          }
        ),
        networks: networks.map(
          (network: {
            name: string;
            subnet: string;
            gateway: string;
            container_count: number;
          }) => {
            return {
              name: network.name,
              subnet: network.subnet,
              gateway: network.gateway,
              container_count: network.container_count,
            };
          }
        ),
      };
      setRuntimeDetails(runtimeDetails);
    } else {
      // 쿠버네티스 런타임 선택
      // TODO: 노드 등록은 했으나 쿠버네티스 구성은 안된 경우에도 리턴해줘야 함
      const targetNode = findMasterNode(infra.nodes);
      if (!targetNode) {
        console.error('마스터/컨트롤플레인 노드를 찾을 수 없습니다.');
        setRuntimeDetails(null);
        setDetailLoading(false);
        return;
      }

      try {
        const hopsWithCreds = getStoredAuthHops(
          JSON.parse(targetNode.hops as string) as SshHop[]
        );

        const response = (await awxApi.runPlaybook({
          playbook_to_run: `status_kubernetes2`,
          hops: hopsWithCreds,
          awxTemplate: user?.awx_template,
        })) as AwxResponseRuntimeDetails;

        const responseData = response.data?.awx_job_result?.details;
        if (!responseData) {
          console.error('AWX playbook 응답에 details가 없습니다:', response);
          message.error(
            '런타임 정보를 가져오는데 실패했습니다. SSH 연결 정보를 확인해주세요.'
          );
          setRuntimeDetails(null);
          setDetailLoading(false);
          return;
        }

        const IGNORED_NAMESPACES = [
          'kube-system',
          'kube-public',
          'kube-node-lease',
        ];
        const runtimeDetails: RuntimeDetailsForKubernetes = {
          namespace: responseData.namespace || [],
          pods: (responseData.pods || []).filter(
            pod => !IGNORED_NAMESPACES.includes(pod.namespace)
          ),
          network_svc: (responseData.network_svc || []).filter(
            svc => !IGNORED_NAMESPACES.includes(svc.namespace)
          ),
          volumes_pvc: (responseData.volumes_pvc || []).filter(
            (pvc: any) => !IGNORED_NAMESPACES.includes(pvc.namespace)
          ),
        };
        setRuntimeDetails(runtimeDetails);
      } catch (error) {
        console.error('쿠버네티스 런타임 정보 조회 실패:', error);
        message.error(
          '런타임 정보를 가져오는데 실패했습니다. SSH 연결 정보를 확인해주세요.'
        );
        setRuntimeDetails(null);
      }
    }
    setDetailLoading(false);
  };

  // 런타임 재시작, 중지, 삭제 함수
  const controlRuntime = async (
    e: React.MouseEvent,
    action: 'restart' | 'stop' | 'edit' | 'delete',
    runtime: InfraWithNodes
  ) => {
    e.stopPropagation();
    if (action === 'edit') {
      await handleEditRuntime(runtime);
      return;
    }
    if (action === 'delete') {
      // handleDeleteRuntime 함수를 따로 만들어서 런타임 삭제 및 db 인스턴스 삭제를 진행하도록 (현재 onDeleteRuntime에서는 db 삭제만 진행되고 있음)
      await handleDeleteRuntime(runtime);
      return;
    }
    onInfraSelect(runtime.id);
    if (runtime.type === 'docker' || runtime.type === 'podman') {
      const hops = JSON.parse(runtime.nodes[0].hops as string) as SshHop[];
      const hopsWithCreds = getStoredAuthHops(hops);
      const payload = {
        server_id: runtime.nodes[0].id as number,
        infraId: runtime.id,
        action: action,
        runtimeType: runtime.type,
        playbook_to_run: `${action}_${runtime.type}`,
        hops: hopsWithCreds,
        awxTemplate: user?.awx_template,
      };
      setPlaybookPayload(payload);
      void runPlaybookAndHandleResponse(payload);
    } else if (
      runtime.type === 'kubernetes' ||
      runtime.type === 'external_kubernetes'
    ) {
      //todo 쿠버네티스 시작, 중지 로직 미구현
      message.info('미구현');
    }
  };

  // 런타임 재시작, 중지 시 결과 처리 함수
  const runPlaybookAndHandleResponse = async (
    playbookPayload: PlaybookPayload
  ) => {
    const response = (await awxApi.runPlaybook(playbookPayload)) as {
      data: { status: string };
    };
    if (response.data.status === 'failed') {
      message.error(
        `${playbookPayload.runtimeType} ${playbookPayload.action}에 실패했습니다. 접속 정보를 확인하고 다시 시도해주세요.`
      );
      setPendingHops(playbookPayload.hops);
      setSshCredentialRetry(true);
      setSshCredentialModalVisible(true);
    } else {
      message.success(
        `${playbookPayload.runtimeType}이 성공적으로 ${playbookPayload.action}되었습니다.`
      );
      const status =
        playbookPayload.action === 'restart' ? 'active' : 'inactive';
      await kubernetesApi.updateLastChecked(
        Number(playbookPayload.server_id),
        status
      );
      onRefresh();
      onStatusUpdate(playbookPayload.server_id, status);
      setPlaybookPayload(null);
    }
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setRuntimeDetails(null);
  };
  // 3. 런타임 상세 관련 함수 끝

  //todo: 삭제 로직을 단계별로 구분 필요 (런타임 환경과 연결된 장비를 해제할 것인지, 장비에 설치된 런타임 환경 자체를 삭제할 것인지)
  // 3-1. 런타임 삭제 관련 함수
  const handleDeleteRuntime = async (runtime: InfraWithNodes) => {
    try {
      await kubernetesApi.deleteInfra(runtime.id);
      setInfraData(infraData.filter(infra => infra.id !== runtime.id));
      message.success('런타임이 삭제되었습니다.');
      //! 추후 기능 분리를 위해 임시 주석 처리
      // // runtime 객체에 노드가 있는 경우에는 각 타입에 맞는 uninstall playbook 호출
      // if (runtime.nodes.length > 0) {
      //   const hopsWithCreds = getStoredAuthHops(JSON.parse(runtime.nodes[0].hops as string) as SshHop[])
      //   // 플레이북 호출 전 ssh 접속 테스트 선행 필요
      //   const response = await awxApi.runPlaybook({
      //     playbook_to_run: `uninstall_${runtime.type}`,
      //     hops: hopsWithCreds,
      //     awxTemplate: user?.awx_template || 0
      //   }) as AwxResponse;
      //   const responseData = response.data;
      //   console.log('AWX playbook response: ', responseData);
      // }
    } catch (error) {
      console.error(error);
    }
  };

  // 3-2. 런타임 편집 관련 함수
  const handleEditRuntime = async (runtime: InfraWithNodes) => {
  };

  // 4. 런타임 타입 및 상태에 따른 랜더링 관련 함수 시작
  const renderHops = (hops: string) => {
    const parsedHops = JSON.parse(hops) as SshHop[];
    const hopStrings = parsedHops.map(hop => `${hop.host}:${hop.port}`);
    return hopStrings.join(' → ');
  };

  // 런타임 타입 아이콘
  const getInfraTypeIcon = (type: string): React.ReactNode => {
    const iconMap: { [key: string]: React.ReactNode } = {
      kubernetes: <ClusterOutlined style={{ color: '#1890ff' }} />,
      podman: <CloudServerOutlined style={{ color: '#59ad30ff' }} />,
      docker: <ContainerOutlined style={{ color: '#722ed1' }} />,
      cloud: <CloudOutlined style={{ color: '#fa8c16' }} />,
    };

    return iconMap[type] || <DesktopOutlined />;
  };

  type ServerStatus = 'active' | 'inactive' | 'uninstalled' | 'unknown';
  // 상태에 따른 태그 색상
  const getStatusColor = (status: ServerStatus) => {
    const colorMap: Record<ServerStatus, string> = {
      active: 'green',
      inactive: 'orange',
      uninstalled: 'red',
      unknown: 'gray',
    };
    return colorMap[status] || 'default';
  };

  // 상태에 따른 태그 텍스트
  const getStatusText = (status: InfraStatus) => {
    const textMap: Record<InfraStatus, string> = {
      active: '활성',
      inactive: '비활성',
      uninstalled: '미설치',
      unknown: '알 수 없음',
    };
    return textMap[status] || '알 수 없음';
  };
  // 4. 런타임 상태에 따른 랜더링 관련 함수 끝

  // 서버 추가 핸들러
  const handleAddServer = async (values: {
    server_type?: string;
    hops: { host: string; port: number; username: string; password: string }[]; // user -> username
    device_id: number;
  }) => {
    setInstallLoading(true);
    message.info(`${values.server_type} 설치가 시작되었습니다.`);
    const hopsWithCreds = getStoredAuthHops(values.hops);
    const response = await awxApi.runPlaybook({
      playbook_to_run: `install_${values.server_type}`,
      hops: hopsWithCreds,
      awxTemplate: user?.awx_template,
    });
    const hopsForDb = values.hops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      // password는 제외
    }));

    const serverData = {
      name: selectedInfra.name,
      hops: hopsForDb,
      type: values.server_type,
      infra_id: selectedInfra.id,
      device_id: values.device_id,
    };
    await kubernetesApi.createServer(serverData);
    message.success(`${values.server_type} 설치가 완료되었습니다.`);
    onRefresh();
    setInstallLoading(false);
  };

  // 드롭다운 메뉴 생성 함수
  const getActionMenuItems = (infra: InfraWithNodes): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '상세보기',
      onClick: () => void handleSelectInfra(infra),
    },
    { type: 'divider' },
    {
      key: 'restart',
      icon: <ReloadOutlined />,
      label: '재시작',
      onClick: e => {
        e.domEvent.stopPropagation();
        void controlRuntime(
          e.domEvent as unknown as React.MouseEvent,
          'restart',
          infra
        );
      },
    },
    {
      key: 'stop',
      icon: <PoweroffOutlined />,
      label: '중지',
      danger: true,
      onClick: e => {
        e.domEvent.stopPropagation();
        void controlRuntime(
          e.domEvent as unknown as React.MouseEvent,
          'stop',
          infra
        );
      },
    },
    { type: 'divider' },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '편집',
      onClick: e => {
        e.domEvent.stopPropagation();
        void controlRuntime(
          e.domEvent as unknown as React.MouseEvent,
          'edit',
          infra
        );
      },
    },
  ];

  const cardTitle = (
    <Space>
      <CloudServerOutlined style={{ color: '#1890ff' }} />
      <span>런타임 환경 목록</span>
      <Tag color='blue'>{infraData.length}개</Tag>
    </Space>
  );

  // podman -> worker 전환을 위한 함수들
  const [isNoRunningContainers, setIsNoRunningContainers] =
    useState<boolean>(false);
  const [isSelectK8sModalVisible, setIsSelectK8sModalVisible] =
    useState<boolean>(false);
  const [selectedK8sId, setSelectedK8sId] = useState<number>(null);

  useEffect(() => {
    if (selectedInfra?.type === 'podman') {
      if (
        (runtimeDetails as RuntimeDetailsForSinglehost)?.containers?.length ===
        0
      ) {
        setIsNoRunningContainers(true);
      } else {
        setIsNoRunningContainers(false);
      }
    } else {
      setIsNoRunningContainers(false);
    }
  }, [runtimeDetails, selectedInfra]);

  const convertPodmanToK8sWorker = async () => {
    // todo: 전환 버튼 클릭 시 전환할건지 물어보는 컨펌창 표현 (podman은 제거된다는 경고 추가)
    // todo: ssh 인증 실패 시 재 입력 모달 없음
    // todo: addHost 시 정확한 정보 저장 x
    const hopsWithCreds = getStoredAuthHops(
      JSON.parse(selectedInfra.nodes[0].hops as string) as SshHop[]
    );
    const lastHop = hopsWithCreds[hopsWithCreds.length - 1];

    const targetMasterNode =
      await kubernetesApi.GetMasterNodeByInfraID(selectedK8sId);
    const targetMasterHops = getStoredAuthHops(
      JSON.parse(targetMasterNode.hops as string) as SshHop[]
    );

    try {
      const serverData = {
        infra_id: selectedK8sId,
        type: 'worker',
        name: selectedInfra.nodes[0].server_name, // string 타입으로 확정
        status: '등록' as ServerStatusForAddServer,
        ip: lastHop.host,
        port: lastHop.port,
        hops: JSON.parse(selectedInfra.nodes[0].hops as string) as SshHop[], // 비밀번호 제외된 데이터
        device_id: selectedInfra.nodes[0].device_id,
      };

      await kubernetesApi.createServer(serverData);

      await kubernetesApi.deleteInfra(selectedInfra.id);
      onRefresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSelectK8sModalVisible(false);
    }
  };

  const renderModalTitle = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '20px',
      }}
    >
      <span>{selectedInfra?.name}</span>
      {isNoRunningContainers && (
        <Button
          type='primary'
          size='small'
          onClick={() => setIsSelectK8sModalVisible(true)}
        >
          쿠버네티스 워커로 전환
        </Button>
      )}
    </div>
  );

  const handleSelectChange = (value: number) => {
    setSelectedK8sId(value);
  };

  return (
    <>
      {/* 화면 랜더링 */}
      <Card title={cardTitle} className='runtime-list-card'>
        <div className='runtime-list-container'>
          {infraData.length === 0 ? (
            <Empty description='등록된 런타임 환경이 없습니다.' />
          ) : (
            infraData.map(infra => (
              <div
                key={infra.id}
                role='button'
                tabIndex={0}
                className={`runtime-item ${selectedInfra?.id === infra.id ? 'selected' : ''}`}
                onClick={() => void handleSelectInfra(infra)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ')
                    void handleSelectInfra(infra);
                }}
              >
                <div className='runtime-item-main'>
                  <div className='runtime-item-icon'>
                    {getInfraTypeIcon(infra.type)}
                  </div>
                  <div className='runtime-item-content'>
                    <div className='runtime-item-header'>
                      <span className='runtime-item-name'>{infra.name}</span>
                      <Tag color='geekblue' className='runtime-type-tag'>
                        {infra.type}
                      </Tag>
                      <Tag
                        color={getStatusColor(infra.status)}
                        className='runtime-status-tag'
                      >
                        {getStatusText(infra.status)}
                      </Tag>
                    </div>
                    <div className='runtime-item-description'>
                      {infra.info || '설명 없음'}
                    </div>
                    <div className='runtime-item-meta'>
                      {infra.type === 'kubernetes' ||
                      infra.type === 'external_kubernetes' ? (
                        <span className='runtime-meta-info'>
                          <ClusterOutlined /> 총 {infra.nodes.length}노드
                          (Master{' '}
                          {
                            infra.nodes.filter(node =>
                              node.type.includes('master')
                            ).length
                          }
                          , Worker{' '}
                          {
                            infra.nodes.filter(node =>
                              node.type.includes('worker')
                            ).length
                          }
                          )
                        </span>
                      ) : infra.nodes.length > 0 ? (
                        <span className='runtime-meta-info'>
                          <GlobalOutlined />{' '}
                          {renderHops(infra.nodes[0].hops as string)}
                        </span>
                      ) : (
                        <Button
                          size='small'
                          type='link'
                          disabled={installLoading}
                          onClick={e => {
                            e.stopPropagation();
                            onInfraSelect(infra.id);
                            setAddServerModalVisible(true);
                          }}
                        >
                          + 서버 추가
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className='runtime-item-actions'>
                  <Dropdown
                    menu={{ items: getActionMenuItems(infra) }}
                    trigger={['click']}
                    placement='bottomRight'
                  >
                    <Button
                      type='text'
                      icon={<MoreOutlined />}
                      onClick={e => e.stopPropagation()}
                      className='action-menu-btn'
                    />
                  </Dropdown>
                  <Tooltip title='삭제'>
                    <Popconfirm
                      title='정말로 삭제하시겠습니까?'
                      description='이 작업은 되돌릴 수 없습니다.'
                      onConfirm={e => void controlRuntime(e, 'delete', infra)}
                      okText='예'
                      cancelText='아니오'
                      onCancel={e => e?.stopPropagation()}
                      icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                    >
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={e => e.stopPropagation()}
                        className='action-delete-btn'
                      />
                    </Popconfirm>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 런타임 상세 모달 */}
      <Modal
        title={renderModalTitle}
        width='80%'
        style={{ maxWidth: 1200 }}
        open={detailModalVisible}
        onCancel={closeDetailModal}
        footer=''
      >
        {
          {
            docker: (
              <InfraDockerSetting
                runtimeDetails={runtimeDetails as RuntimeDetailsForSinglehost}
                selectedInfra={selectedInfra}
                onLoading={detailLoading}
                getStoredAuthHops={getStoredAuthHops}
                setRuntimeDetails={setRuntimeDetails}
              />
            ),
            external_docker: (
              <InfraDockerSetting
                runtimeDetails={runtimeDetails as RuntimeDetailsForSinglehost}
                selectedInfra={selectedInfra}
                onLoading={detailLoading}
                getStoredAuthHops={getStoredAuthHops}
                setRuntimeDetails={setRuntimeDetails}
              />
            ),
            podman: (
              <InfraPodmanSetting
                runtimeDetails={runtimeDetails as RuntimeDetailsForSinglehost}
                selectedInfra={selectedInfra}
                onLoading={detailLoading}
                getStoredAuthHops={getStoredAuthHops}
                setRuntimeDetails={setRuntimeDetails}
              />
            ),
            external_podman: (
              <InfraPodmanSetting
                runtimeDetails={runtimeDetails as RuntimeDetailsForSinglehost}
                selectedInfra={selectedInfra}
                onLoading={detailLoading}
                getStoredAuthHops={getStoredAuthHops}
                setRuntimeDetails={setRuntimeDetails}
              />
            ),
            kubernetes: (
              <InfraKubernetesSetting
                runtimeDetails={runtimeDetails as RuntimeDetailsForKubernetes}
                selectedInfra={selectedInfra}
                onLoading={detailLoading}
                getStoredAuthHops={getStoredAuthHops}
              />
            ),
            external_kubernetes: (
              <InfraKubernetesSetting
                runtimeDetails={runtimeDetails as RuntimeDetailsForKubernetes}
                selectedInfra={selectedInfra}
                onLoading={detailLoading}
                getStoredAuthHops={getStoredAuthHops}
              />
            ),
          }[selectedInfra?.type]
        }
      </Modal>

      <SshCredentialModal
        visible={sshCredentialModalVisible}
        onClose={() => {
          setSshCredentialModalVisible(false);
          setSshCredentialRetry(false); // 재시도 상태 초기화
          setPlaybookPayload(null); // payload 초기화
        }}
        onComplete={handleSshCredentialComplete}
        hops={pendingHops.map(h => ({ ...h, username: h.username || '' }))}
        infraId={playbookPayload?.infraId}
        isRetry={sshCredentialRetry}
      />

      {/* 장비 연결 모달 */}
      <AddNodeModal
        titleInput='서버 추가'
        visible={addServerModalVisible}
        onCancel={() => setAddServerModalVisible(false)}
        onAdd={handleAddServer}
        loading={false}
        server_type={selectedInfra?.type}
      />

      {/* k8s worker 전환을 위한 런타임 환경 선택 모달 */}
      <Modal
        title='k8s 환경 선택'
        open={isSelectK8sModalVisible}
        onCancel={() => setIsSelectK8sModalVisible(false)}
        onOk={convertPodmanToK8sWorker}
        okText='전환'
        cancelText='취소'
      >
        <div style={{ marginBottom: '8px' }}>대상 환경을 선택해주세요:</div>

        <Select
          style={{ width: '100%' }}
          placeholder='Kubernetes 환경 선택'
          onChange={handleSelectChange}
          value={selectedK8sId}
        >
          {/* 2. 필터링된 데이터로 옵션 생성 */}
          {infraData
            .filter(item => item.type === 'kubernetes')
            .map(infra => (
              <Select.Option key={infra.id} value={infra.id}>
                {infra.name} (ID: {infra.id})
              </Select.Option>
            ))}
        </Select>

        {/* 데이터 확인용 (선택 사항) */}
        {infraData.filter(item => item.type === 'kubernetes').length === 0 && (
          <p style={{ color: 'red', marginTop: '10px' }}>
            선택 가능한 Kubernetes 환경이 없습니다.
          </p>
        )}
      </Modal>
    </>
  );
};

export default RuntimeSetting;
