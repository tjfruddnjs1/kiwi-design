import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  notification,
} from 'antd';
import {
  CheckCircleOutlined,
  ClearOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  SettingOutlined,
  SyncOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Service } from '../../../../../lib/api/types';
import {
  cleanupReplicaSets,
  nodeDrain,
  nodeCordon,
  nodeUncordon,
  getPVCStatus,
  getNodeList,
  cleanupEvictedPods,
  cleanupFailedPods,
  cleanupCompletedPods,
  cleanupDockerResources,
  cleanupDiskSpace,
  cleanupPodLogs,
  checkIngressController,
  installIngressController,
  type NodeInfo,
  type PVCStatusResult,
  type IngressControllerStatus,
} from '../../../../../lib/api/k8s-resources';
import type {
  K8sResourceItem,
  K8sResourceList,
} from '../../../../../types/operate-modal';

const { Text } = Typography;

// Helper function to extract items from K8s resource list (handles both array and object formats)
const getResourceItems = (
  data: K8sResourceItem[] | K8sResourceList | undefined
): K8sResourceItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if ('items' in data && Array.isArray(data.items)) return data.items;
  return [];
};

// Helper function to get resource count
const getResourceCount = (
  data: K8sResourceItem[] | K8sResourceList | undefined
): number => {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if ('items' in data && Array.isArray(data.items)) return data.items.length;
  return 0;
};

interface HopConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
}

interface K8sOpsTabProps {
  service?: Service | null;
  infraId?: number;
  hops?: HopConfig[];
  onOverviewDataRefresh?: () => void;
}

/**
 * Kubernetes 운영 관리 탭
 * 클러스터 운영에 필요한 관리 작업을 수행합니다.
 */
const K8sOpsTab: React.FC<K8sOpsTabProps> = ({
  service,
  infraId,
  hops,
  onOverviewDataRefresh,
}) => {
  const namespace = service?.namespace || 'k8s';

  // hops를 API 요청 형식으로 변환
  const formatHopsForApi = (hopsList: HopConfig[]) => {
    return hopsList.map(hop => ({
      host: hop.host,
      port: hop.port || 22,
      username: hop.username || '',
      password: hop.password || '',
    }));
  };

  // State for resource cleanup
  const [cleaningReplicaSets, setCleaningReplicaSets] = useState(false);
  const [cleaningEvictedPods, setCleaningEvictedPods] = useState(false);
  const [cleaningFailedPods, setCleaningFailedPods] = useState(false);
  const [cleaningCompletedPods, setCleaningCompletedPods] = useState(false);
  const [cleaningDockerResources, setCleaningDockerResources] = useState(false);

  // State for node management
  const [selectedNodeForOps, setSelectedNodeForOps] = useState<string | null>(
    null
  );
  const [nodeList, setNodeList] = useState<NodeInfo[]>([]);
  const [loadingNodeList, setLoadingNodeList] = useState(false);
  const [drainingNode, setDrainingNode] = useState(false);
  const [cordoningNode, setCordoningNode] = useState(false);
  const [uncordoningNode, setUncordoningNode] = useState(false);

  // State for storage management
  const [loadingPVCStatus, setLoadingPVCStatus] = useState(false);
  const [pvcStatusData, setPvcStatusData] = useState<PVCStatusResult | null>(
    null
  );

  // State for system cleanup
  const [cleaningDiskSpace, setCleaningDiskSpace] = useState(false);
  const [cleaningPodLogs, setCleaningPodLogs] = useState(false);
  const [podLogDays, setPodLogDays] = useState(7);

  // State for Ingress Controller management
  const [_ingressControllerStatus, setIngressControllerStatus] =
    useState<IngressControllerStatus | null>(null);
  const [_checkingIngressController, setCheckingIngressController] =
    useState(false);
  const [_installingIngressController, setInstallingIngressController] =
    useState(false);

  // ReplicaSet 정리 핸들러
  const handleCleanupReplicaSets = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningReplicaSets(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await cleanupReplicaSets({
        infra_id: infraId,
        namespace,
        hops: formattedHops,
      });

      notification.success({
        message: 'ReplicaSet 정리 완료',
        description: `총 ${result.deleted_count}개의 오래된 ReplicaSet을 정리했습니다.`,
        duration: 5,
      });

      if (result.errors && result.errors.length > 0) {
        notification.warning({
          message: '일부 항목 처리 실패',
          description: `${result.errors.length}개의 오류가 발생했습니다.`,
          duration: 5,
        });
      }
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'ReplicaSet 정리 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningReplicaSets(false);
    }
  };

  // Node Drain 핸들러
  const handleDrainNode = async () => {
    if (!infraId || !selectedNodeForOps) {
      message.error('노드를 선택해주세요');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setDrainingNode(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await nodeDrain({
        infra_id: infraId,
        node_name: selectedNodeForOps,
        hops: formattedHops,
      });

      notification.success({
        message: 'Node Drain 완료',
        description: `노드 ${result.node_name}을 성공적으로 drain했습니다.`,
        duration: 5,
      });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Node Drain 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setDrainingNode(false);
    }
  };

  // Node Cordon 핸들러
  const handleCordonNode = async () => {
    if (!infraId || !selectedNodeForOps) {
      message.error('노드를 선택해주세요');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCordoningNode(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await nodeCordon({
        infra_id: infraId,
        node_name: selectedNodeForOps,
        hops: formattedHops,
      });

      notification.success({
        message: 'Node Cordon 완료',
        description: `노드 ${result.node_name}을 성공적으로 cordon했습니다. (새 Pod 할당 방지)`,
        duration: 5,
      });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Node Cordon 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCordoningNode(false);
    }
  };

  // Node Uncordon 핸들러
  const handleUncordonNode = async () => {
    if (!infraId || !selectedNodeForOps) {
      message.error('노드를 선택해주세요');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setUncordoningNode(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await nodeUncordon({
        infra_id: infraId,
        node_name: selectedNodeForOps,
        hops: formattedHops,
      });

      notification.success({
        message: 'Node Uncordon 완료',
        description: `노드 ${result.node_name}을 성공적으로 uncordon했습니다. (스케줄링 재활성화)`,
        duration: 5,
      });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Node Uncordon 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setUncordoningNode(false);
    }
  };

  // 노드 목록 로드
  const loadNodeList = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setLoadingNodeList(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await getNodeList({
        infra_id: infraId,
        hops: formattedHops,
      });
      setNodeList(Array.isArray(result.nodes) ? result.nodes : []);
      message.success('노드 목록을 조회했습니다');
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '노드 목록 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingNodeList(false);
    }
  };

  // PVC 상태 조회 핸들러
  const handleGetPVCStatus = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }

    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setLoadingPVCStatus(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await getPVCStatus({
        infra_id: infraId,
        namespace,
        hops: formattedHops,
      });

      // JSON 파싱
      const pvcsData = result.pvcs ? JSON.parse(result.pvcs) : null;
      const pvsData = result.pvs ? JSON.parse(result.pvs) : null;
      const storageclassesData = result.storageclasses
        ? JSON.parse(result.storageclasses)
        : null;

      setPvcStatusData({
        pvcs: pvcsData,
        pvs: pvsData,
        storageclasses: storageclassesData,
      });

      message.success('PVC 상태를 조회했습니다');
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'PVC 상태 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingPVCStatus(false);
    }
  };

  // Evicted Pod 정리 핸들러
  const handleCleanupEvictedPods = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningEvictedPods(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await cleanupEvictedPods({
        infra_id: infraId,
        namespace,
        hops: formattedHops,
      });

      notification.success({
        message: 'Evicted Pod 정리 완료',
        description: `총 ${result.deleted_count}개의 Evicted Pod를 정리했습니다.`,
        duration: 5,
      });

      // 오버뷰 데이터 새로고침
      onOverviewDataRefresh?.();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Evicted Pod 정리 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningEvictedPods(false);
    }
  };

  // Failed Pod 정리 핸들러
  const handleCleanupFailedPods = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningFailedPods(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await cleanupFailedPods({
        infra_id: infraId,
        namespace,
        hops: formattedHops,
      });

      notification.success({
        message: 'Failed Pod 정리 완료',
        description: `총 ${result.deleted_count}개의 Failed/Error Pod를 정리했습니다.`,
        duration: 5,
      });

      onOverviewDataRefresh?.();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Failed Pod 정리 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningFailedPods(false);
    }
  };

  // Completed Pod 정리 핸들러
  const handleCleanupCompletedPods = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningCompletedPods(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await cleanupCompletedPods({
        infra_id: infraId,
        namespace,
        hops: formattedHops,
      });

      notification.success({
        message: 'Completed Pod 정리 완료',
        description: `총 ${result.deleted_count}개의 Completed Pod를 정리했습니다.`,
        duration: 5,
      });

      onOverviewDataRefresh?.();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Completed Pod 정리 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningCompletedPods(false);
    }
  };

  // Docker 리소스 정리 핸들러
  const handleCleanupDockerResources = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningDockerResources(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await cleanupDockerResources({
        infra_id: infraId,
        node_name: selectedNodeForOps || undefined,
        hops: formattedHops,
      });

      notification.success({
        message: 'Docker 리소스 정리 완료',
        description:
          result.message || 'Docker 이미지/컨테이너/캐시를 정리했습니다.',
        duration: 5,
      });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Docker 리소스 정리 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningDockerResources(false);
    }
  };

  // 디스크 공간 확보 핸들러
  const handleCleanupDiskSpace = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningDiskSpace(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result = await cleanupDiskSpace({
        infra_id: infraId,
        node_name: selectedNodeForOps || undefined,
        hops: formattedHops,
      });

      notification.success({
        message: '디스크 공간 확보 완료',
        description:
          result.message ||
          'Journal 로그, APT 캐시, 임시 파일 등을 정리했습니다.',
        duration: 5,
      });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '디스크 공간 확보 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningDiskSpace(false);
    }
  };

  // Pod 로그 정리 핸들러
  const handleCleanupPodLogs = async () => {
    if (!infraId) {
      message.error('인프라 ID가 없습니다');
      return;
    }
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setCleaningPodLogs(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      await cleanupPodLogs({
        infra_id: infraId,
        days: podLogDays,
        hops: formattedHops,
      });

      notification.success({
        message: 'Pod 로그 정리 완료',
        description: `${podLogDays}일 이상 된 Pod 로그를 정리했습니다.`,
        duration: 5,
      });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Pod 로그 정리 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCleaningPodLogs(false);
    }
  };

  // Ingress Controller 상태 확인 핸들러
  const handleCheckIngressController = async () => {
    if (!service?.id) {
      message.error('서비스 ID가 없습니다');
      return;
    }

    setCheckingIngressController(true);
    try {
      const result = await checkIngressController(service.id);
      setIngressControllerStatus(result);

      if (result.installed) {
        message.success('Nginx Ingress Controller가 설치되어 있습니다');
      } else {
        message.info('Nginx Ingress Controller가 설치되지 않았습니다');
      }
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Ingress Controller 상태 확인 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCheckingIngressController(false);
    }
  };

  // Ingress Controller 설치 핸들러
  const _handleInstallIngressController = async () => {
    if (!service?.id) {
      message.error('서비스 ID가 없습니다');
      return;
    }

    setInstallingIngressController(true);
    try {
      const result = await installIngressController(service.id);

      notification.success({
        message: 'Nginx Ingress Controller 설치 완료',
        description:
          result.message ||
          'Nginx Ingress Controller가 성공적으로 설치되었습니다.',
        duration: 5,
      });

      // 설치 후 상태 다시 확인
      await handleCheckIngressController();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx Ingress Controller 설치 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setInstallingIngressController(false);
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='Kubernetes 운영 관리'
        description='클러스터 운영에 필요한 관리 작업을 수행할 수 있습니다. 카테고리를 클릭하여 관련 기능을 확인하세요.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Collapse
        defaultActiveKey={['cleanup']}
        style={{ background: '#fff' }}
        items={[
          //  카테고리 1: 리소스 정리
          {
            key: 'cleanup',
            label: (
              <Space>
                <ClearOutlined style={{ color: '#1890ff' }} />
                <Text strong>리소스 정리</Text>
                <Tag color='blue'>ReplicaSet · Pod · Docker</Tag>
              </Space>
            ),
            children: (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                {/* ReplicaSet 정리 */}
                <Card
                  size='small'
                  title={
                    <>
                      <ClearOutlined /> ReplicaSet 정리
                    </>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    오래된 ReplicaSet (desired=0)을 일괄 삭제하여 클러스터를
                    정리합니다.
                  </Text>
                  <Space>
                    <Tag>Namespace: {namespace}</Tag>
                    <Popconfirm
                      title='ReplicaSet 정리'
                      description='오래된 ReplicaSet을 모두 삭제하시겠습니까?'
                      onConfirm={handleCleanupReplicaSets}
                      okText='확인'
                      cancelText='취소'
                    >
                      <Button
                        type='primary'
                        size='small'
                        icon={<ClearOutlined />}
                        loading={cleaningReplicaSets}
                        disabled={!infraId}
                      >
                        실행
                      </Button>
                    </Popconfirm>
                  </Space>
                </Card>

                {/* Pod 정리 */}
                <Card
                  size='small'
                  title={
                    <>
                      <DeleteOutlined /> Pod 정리
                    </>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    Evicted, Failed, Completed 상태의 Pod를 정리합니다.
                  </Text>
                  <Space wrap>
                    <Popconfirm
                      title='Evicted Pod 정리'
                      description='모든 Evicted Pod를 삭제하시겠습니까?'
                      onConfirm={handleCleanupEvictedPods}
                      okText='확인'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        icon={<ClearOutlined />}
                        loading={cleaningEvictedPods}
                        disabled={!infraId}
                      >
                        Evicted
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title='Failed Pod 정리'
                      description='모든 Failed/Error Pod를 삭제하시겠습니까?'
                      onConfirm={handleCleanupFailedPods}
                      okText='확인'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        danger
                        icon={<DeleteOutlined />}
                        loading={cleaningFailedPods}
                        disabled={!infraId}
                      >
                        Failed
                      </Button>
                    </Popconfirm>
                    <Button
                      size='small'
                      icon={<CheckCircleOutlined />}
                      loading={cleaningCompletedPods}
                      disabled={!infraId}
                      onClick={handleCleanupCompletedPods}
                    >
                      Completed
                    </Button>
                  </Space>
                </Card>

                {/* Docker 리소스 정리 */}
                <Card
                  size='small'
                  title={
                    <>
                      <ToolOutlined /> Docker 리소스 정리
                    </>
                  }
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    Dangling 이미지, 중지된 컨테이너, 빌드 캐시를 정리합니다.
                    <br />
                    대상: <Tag>{selectedNodeForOps || '모든 노드'}</Tag>
                  </Text>
                  <Popconfirm
                    title='Docker 리소스 정리'
                    description='Docker 리소스를 정리하시겠습니까?'
                    onConfirm={handleCleanupDockerResources}
                    okText='확인'
                    cancelText='취소'
                  >
                    <Button
                      size='small'
                      type='primary'
                      icon={<ToolOutlined />}
                      loading={cleaningDockerResources}
                      disabled={!infraId}
                    >
                      실행
                    </Button>
                  </Popconfirm>
                </Card>
              </Space>
            ),
          },

          //  카테고리 2: 노드 관리
          {
            key: 'node',
            label: (
              <Space>
                <NodeIndexOutlined style={{ color: '#52c41a' }} />
                <Text strong>노드 관리</Text>
                <Tag color='green'>Drain · Cordon · Uncordon</Tag>
              </Space>
            ),
            children: (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <Alert
                  message='노드 관리 기능'
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>
                        <strong>Drain</strong>: 노드의 모든 Pod를 다른 노드로
                        이동 (유지보수용)
                      </li>
                      <li>
                        <strong>Cordon</strong>: 새로운 Pod 할당 방지 (기존 Pod
                        유지)
                      </li>
                      <li>
                        <strong>Uncordon</strong>: Cordon 해제하여 스케줄링
                        재활성화
                      </li>
                    </ul>
                  }
                  type='info'
                  style={{ marginBottom: 16 }}
                />

                <div>
                  <Space style={{ marginBottom: 12 }}>
                    <Text strong>노드 선택:</Text>
                    <Button
                      type='link'
                      size='small'
                      icon={<SyncOutlined />}
                      onClick={loadNodeList}
                      loading={loadingNodeList}
                    >
                      새로고침
                    </Button>
                    {nodeList.length > 0 && (
                      <Tag color='blue'>{nodeList.length}개 노드</Tag>
                    )}
                  </Space>
                  <Select
                    placeholder={
                      loadingNodeList
                        ? '노드 로딩 중...'
                        : nodeList.length === 0
                          ? '새로고침을 눌러 노드를 조회하세요'
                          : '노드를 선택하세요'
                    }
                    value={selectedNodeForOps || undefined}
                    onChange={value => setSelectedNodeForOps(value)}
                    style={{ width: '100%' }}
                    loading={loadingNodeList}
                    notFoundContent={
                      loadingNodeList
                        ? '로딩 중...'
                        : '노드가 없습니다. 새로고침을 클릭하세요.'
                    }
                  >
                    {nodeList.map(node => (
                      <Select.Option key={node.name} value={node.name}>
                        <Space>
                          <Tag
                            color={
                              node.status === 'Ready' ? 'success' : 'error'
                            }
                          >
                            {node.status}
                          </Tag>
                          {node.roles !== 'worker' && (
                            <Tag color='blue'>{node.roles}</Tag>
                          )}
                          <Text strong>{node.name}</Text>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <Space wrap style={{ marginTop: 12 }}>
                  <Popconfirm
                    title='Node Drain'
                    description={`노드 ${selectedNodeForOps}의 모든 Pod를 제거하시겠습니까?`}
                    onConfirm={handleDrainNode}
                    okText='확인'
                    cancelText='취소'
                    disabled={!selectedNodeForOps}
                  >
                    <Button
                      type='primary'
                      danger
                      icon={<DeleteOutlined />}
                      loading={drainingNode}
                      disabled={!infraId || !selectedNodeForOps}
                    >
                      Drain
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title='Node Cordon'
                    description={`노드 ${selectedNodeForOps}에 새 Pod 할당을 방지하시겠습니까?`}
                    onConfirm={handleCordonNode}
                    okText='확인'
                    cancelText='취소'
                    disabled={!selectedNodeForOps}
                  >
                    <Button
                      icon={<WarningOutlined />}
                      loading={cordoningNode}
                      disabled={!infraId || !selectedNodeForOps}
                    >
                      Cordon
                    </Button>
                  </Popconfirm>
                  <Button
                    icon={<CheckCircleOutlined />}
                    loading={uncordoningNode}
                    disabled={!infraId || !selectedNodeForOps}
                    onClick={handleUncordonNode}
                  >
                    Uncordon
                  </Button>
                </Space>
              </Space>
            ),
          },

          //  카테고리 3: 스토리지 관리
          {
            key: 'storage',
            label: (
              <Space>
                <DatabaseOutlined style={{ color: '#722ed1' }} />
                <Text strong>스토리지 관리</Text>
                <Tag color='purple'>PVC · PV · StorageClass</Tag>
              </Space>
            ),
            children: (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <Text type='secondary'>
                  PersistentVolumeClaim, PersistentVolume, StorageClass의 상태를
                  확인합니다.
                  <br />
                  Namespace: <Tag>{namespace}</Tag>
                </Text>

                <Button
                  type='primary'
                  icon={<SyncOutlined />}
                  loading={loadingPVCStatus}
                  onClick={handleGetPVCStatus}
                  disabled={!infraId}
                >
                  상태 조회
                </Button>

                {pvcStatusData && (
                  <Space
                    direction='vertical'
                    style={{ width: '100%' }}
                    size='small'
                  >
                    {/* PVCs */}
                    <Card
                      type='inner'
                      title={`PVCs (${getResourceCount(pvcStatusData.pvcs)})`}
                      size='small'
                      style={{ marginBottom: 16 }}
                    >
                      {getResourceCount(pvcStatusData.pvcs) > 0 ? (
                        <Table
                          size='small'
                          pagination={{ pageSize: 10 }}
                          dataSource={getResourceItems(pvcStatusData.pvcs)}
                          rowKey={(record: K8sResourceItem) =>
                            record.metadata?.name || record.name || ''
                          }
                          columns={[
                            {
                              title: 'Name',
                              dataIndex: ['metadata', 'name'],
                              key: 'name',
                              render: (_: unknown, record: K8sResourceItem) =>
                                record.metadata?.name || record.name,
                            },
                            {
                              title: 'Status',
                              dataIndex: ['status', 'phase'],
                              key: 'status',
                              render: (_: unknown, record: K8sResourceItem) => (
                                <Tag
                                  color={
                                    record.status?.phase === 'Bound'
                                      ? 'green'
                                      : 'orange'
                                  }
                                >
                                  {record.status?.phase}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Capacity',
                              dataIndex: ['status', 'capacity', 'storage'],
                              key: 'capacity',
                              render: (_: unknown, record: K8sResourceItem) =>
                                record.status?.capacity?.storage ||
                                record.capacity,
                            },
                          ]}
                        />
                      ) : (
                        <Text type='secondary'>PVC가 없습니다</Text>
                      )}
                    </Card>

                    {/* PVs */}
                    <Card
                      type='inner'
                      title={`PVs (${getResourceCount(pvcStatusData.pvs)})`}
                      size='small'
                      style={{ marginBottom: 16 }}
                    >
                      {getResourceCount(pvcStatusData.pvs) > 0 ? (
                        <Table
                          size='small'
                          pagination={{ pageSize: 10 }}
                          dataSource={getResourceItems(pvcStatusData.pvs)}
                          rowKey={(record: K8sResourceItem) =>
                            record.metadata?.name || record.name || ''
                          }
                          columns={[
                            {
                              title: 'Name',
                              dataIndex: ['metadata', 'name'],
                              key: 'name',
                              render: (_: unknown, record: K8sResourceItem) =>
                                record.metadata?.name || record.name,
                            },
                            {
                              title: 'Status',
                              dataIndex: ['status', 'phase'],
                              key: 'status',
                              render: (_: unknown, record: K8sResourceItem) => (
                                <Tag
                                  color={
                                    record.status?.phase === 'Bound'
                                      ? 'green'
                                      : 'blue'
                                  }
                                >
                                  {record.status?.phase}
                                </Tag>
                              ),
                            },
                            {
                              title: 'Capacity',
                              dataIndex: ['spec', 'capacity', 'storage'],
                              key: 'capacity',
                              render: (_: unknown, record: K8sResourceItem) =>
                                record.spec?.capacity?.storage ||
                                record.capacity,
                            },
                          ]}
                        />
                      ) : (
                        <Text type='secondary'>PV가 없습니다</Text>
                      )}
                    </Card>

                    {/* StorageClasses */}
                    <Card
                      type='inner'
                      title={`StorageClasses (${getResourceCount(pvcStatusData.storageclasses)})`}
                      size='small'
                    >
                      {getResourceCount(pvcStatusData.storageclasses) > 0 ? (
                        <Table
                          size='small'
                          pagination={{ pageSize: 10 }}
                          dataSource={getResourceItems(
                            pvcStatusData.storageclasses
                          )}
                          rowKey={(record: K8sResourceItem) =>
                            record.metadata?.name || record.name || ''
                          }
                          columns={[
                            {
                              title: 'Name',
                              dataIndex: ['metadata', 'name'],
                              key: 'name',
                              render: (_: unknown, record: K8sResourceItem) =>
                                record.metadata?.name || record.name,
                            },
                            {
                              title: 'Provisioner',
                              dataIndex: 'provisioner',
                              key: 'provisioner',
                            },
                            {
                              title: 'ReclaimPolicy',
                              dataIndex: 'reclaimPolicy',
                              key: 'reclaimPolicy',
                            },
                          ]}
                        />
                      ) : (
                        <Text type='secondary'>StorageClass가 없습니다</Text>
                      )}
                    </Card>
                  </Space>
                )}
              </Space>
            ),
          },

          //  카테고리 4: 시스템 정리
          {
            key: 'system',
            label: (
              <Space>
                <SettingOutlined style={{ color: '#fa8c16' }} />
                <Text strong>시스템 정리</Text>
                <Tag color='orange'>디스크 · 로그</Tag>
              </Space>
            ),
            children: (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                {/* 디스크 공간 확보 */}
                <Card
                  size='small'
                  title={
                    <>
                      <DatabaseOutlined /> 디스크 공간 확보
                    </>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    Journal 로그, APT 캐시, 임시 파일 등을 정리합니다.
                    <br />
                    대상: <Tag>{selectedNodeForOps || 'Master 노드'}</Tag>
                  </Text>
                  <Popconfirm
                    title='디스크 공간 확보'
                    description='디스크 공간을 확보하시겠습니까?'
                    onConfirm={handleCleanupDiskSpace}
                    okText='확인'
                    cancelText='취소'
                  >
                    <Button
                      size='small'
                      type='primary'
                      icon={<DatabaseOutlined />}
                      loading={cleaningDiskSpace}
                      disabled={!infraId}
                    >
                      실행
                    </Button>
                  </Popconfirm>
                </Card>

                {/* Pod 로그 정리 */}
                <Card
                  size='small'
                  title={
                    <>
                      <FileTextOutlined /> Pod 로그 정리
                    </>
                  }
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    /var/log/pods 및 /var/log/containers의 오래된 로그를
                    정리합니다.
                  </Text>
                  <Space>
                    <Text>보관 기간:</Text>
                    <InputNumber
                      min={1}
                      max={30}
                      value={podLogDays}
                      onChange={value => setPodLogDays(value || 7)}
                      style={{ width: 80 }}
                    />
                    <Text type='secondary'>일</Text>
                    <Popconfirm
                      title='Pod 로그 정리'
                      description={`${podLogDays}일 이상 된 로그를 삭제하시겠습니까?`}
                      onConfirm={handleCleanupPodLogs}
                      okText='확인'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        type='primary'
                        icon={<FileTextOutlined />}
                        loading={cleaningPodLogs}
                        disabled={!infraId}
                      >
                        실행
                      </Button>
                    </Popconfirm>
                  </Space>
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default K8sOpsTab;
