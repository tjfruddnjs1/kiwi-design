/**
 * Kubernetes 서비스 운영 전용 훅
 * Pod, Deployment, HPA, Ingress 등 K8s 리소스 운영 로직 제공
 * ImprovedOperateModal, KubernetesOperateModal에서 사용
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import {
    checkMetricsServer,
    createHPA,
    deleteHPA,
    describePod,
    getHPA,
    getPodMetrics,
    scaleDeployment,
} from '../lib/api/k8s-resources';
import type { Service } from '../types';
import type {
    IngressControllerStatus,
    IngressInfo,
    MetricsServerStatus,
    NodeInfo,
    PodInfo,
} from '../types/operate-modal';

interface UseKubernetesServiceOperationsProps {
  service?: Service | null;
  infraId?: number;
  namespace: string;
  hops: any[];
}

interface UseKubernetesServiceOperationsReturn {
  // Pod 상태
  pods: PodInfo[];
  setPods: React.Dispatch<React.SetStateAction<PodInfo[]>>;
  selectedPod: string;
  setSelectedPod: React.Dispatch<React.SetStateAction<string>>;

  // Deployment 상태
  deployments: any[];
  setDeployments: React.Dispatch<React.SetStateAction<any[]>>;
  selectedDeployment: string;
  setSelectedDeployment: React.Dispatch<React.SetStateAction<string>>;

  // HPA 상태
  hpaList: any[];
  setHpaList: React.Dispatch<React.SetStateAction<any[]>>;
  hpaData: any;
  setHpaData: React.Dispatch<React.SetStateAction<any>>;

  // Ingress 상태
  ingressDomains: string[];
  setIngressDomains: React.Dispatch<React.SetStateAction<string[]>>;
  ingresses: IngressInfo[];
  setIngresses: React.Dispatch<React.SetStateAction<IngressInfo[]>>;

  // Node 상태
  nodes: NodeInfo[];
  setNodes: React.Dispatch<React.SetStateAction<NodeInfo[]>>;

  // Metrics Server 상태
  metricsServerStatus: MetricsServerStatus | null;
  setMetricsServerStatus: React.Dispatch<
    React.SetStateAction<MetricsServerStatus | null>
  >;

  // Ingress Controller 상태
  ingressControllerStatus: IngressControllerStatus | null;
  setIngressControllerStatus: React.Dispatch<
    React.SetStateAction<IngressControllerStatus | null>
  >;

  // 로딩 상태
  loadingHPA: boolean;
  setLoadingHPA: React.Dispatch<React.SetStateAction<boolean>>;

  // Pod 메트릭스 로드
  loadPodMetrics: () => Promise<void>;

  // Pod 상세 정보 로드
  loadPodDetails: (podName: string) => Promise<void>;

  // HPA 관련
  loadAllHPAs: () => Promise<void>;
  loadHPA: () => Promise<void>;
  hasHPA: (deploymentName: string) => boolean;
  handleCreateHPA: (values: any) => Promise<void>;
  handleDeleteHPA: () => Promise<void>;

  // Deployment 스케일링
  handleScaleDeployment: (replicas: number) => Promise<void>;

  // Metrics Server 상태 확인
  checkMetricsServerStatus: () => Promise<MetricsServerStatus | null>;
}

/**
 * Kubernetes 서비스 운영 로직을 제공하는 훅
 *
 * @param service - 서비스 정보
 * @param infraId - 인프라 ID
 * @param namespace - Kubernetes 네임스페이스
 * @param hops - SSH Hops
 * @returns K8s 서비스 운영 관련 상태 및 함수
 */
export const useKubernetesServiceOperations = ({
  service,
  infraId: _infraId,
  namespace: _namespace,
  hops,
}: UseKubernetesServiceOperationsProps): UseKubernetesServiceOperationsReturn => {
  // ============================================================================
  // 상태 관리
  // ============================================================================

  // Pod 상태
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [selectedPod, setSelectedPod] = useState<string>('');

  // Deployment 상태
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string>('');

  // HPA 상태
  const [hpaList, setHpaList] = useState<any[]>([]);
  const [hpaData, setHpaData] = useState<any>(null);
  const [loadingHPA, setLoadingHPA] = useState(false);

  // Ingress 상태
  const [ingressDomains, setIngressDomains] = useState<string[]>([]);
  const [ingresses, setIngresses] = useState<IngressInfo[]>([]);

  // Node 상태
  const [nodes, setNodes] = useState<NodeInfo[]>([]);

  // Metrics Server 상태
  const [metricsServerStatus, setMetricsServerStatus] =
    useState<MetricsServerStatus | null>(null);

  // Ingress Controller 상태
  const [ingressControllerStatus, setIngressControllerStatus] =
    useState<IngressControllerStatus | null>(null);

  // ============================================================================
  // Pod 관련 함수
  // ============================================================================

  /**
   * Pod 메트릭스 로드 (CPU/메모리 사용량)
   */
  const loadPodMetrics = useCallback(async () => {
    if (!service?.id) return;

    // Metrics Server 상태가 이미 확인되었고 Ready가 아니면 API 호출하지 않음
    if (metricsServerStatus && !metricsServerStatus.running) {
      return;
    }

    try {
      //  SSH hops 전달 (DB fallback 시 SSH 인증 실패 방지)
      const hopsToUse =
        hops.length > 0
          ? hops.map(h => ({
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
          return {
            ...pod,
            cpuUsage: metric?.cpu_usage,
            memoryUsage: metric?.memory_usage,
          };
        });
        return updatedPods;
      });
    } catch (_error) {
      // Metrics Server 상태 확인 (에러 발생 시에만, 상태가 아직 확인되지 않은 경우)
      if (!metricsServerStatus) {
        //  SSH hops 전달 (DB fallback 시 SSH 인증 실패 방지)
        const hopsToUse =
          hops.length > 0
            ? hops.map(h => ({
                host: h.host,
                port: h.port,
                username: h.username || '',
                password: h.password || '',
              }))
            : undefined;
        const status = await checkMetricsServer(service.id, hopsToUse);
        setMetricsServerStatus(status);
      }
      // Metrics Server가 없어도 계속 진행 - CPU/메모리는 "-"로 표시됨
    }
  }, [service?.id, metricsServerStatus, hops]);

  /**
   * Pod 상세 정보 로드 (Pending Pod 이벤트 조회)
   */
  const loadPodDetails = useCallback(
    async (podName: string) => {
      if (!service?.id) return;

      try {
        const podDescription = await describePod({
          service_id: service.id,
          pod_name: podName,
        });

        // 해당 Pod에 이벤트 정보 추가
        setPods(prevPods =>
          prevPods.map(pod =>
            pod.name === podName
              ? { ...pod, events: podDescription.events }
              : pod
          )
        );
      } catch (error: any) {
        console.error('[loadPodDetails] Failed:', error);
      }
    },
    [service?.id]
  );

  // ============================================================================
  // HPA 관련 함수
  // ============================================================================

  /**
   * 전체 HPA 목록 조회 (모든 Deployment의 HPA 상태 확인용)
   */
  const loadAllHPAs = useCallback(async () => {
    if (!service?.id) {
      setHpaList([]);
      return;
    }

    try {
      //  hops를 getHPA에 전달
      const data = await getHPA(service.id, hops);

      // kubectl get hpa -o json 형식: { items: [...] }
      if (data && data.items && Array.isArray(data.items)) {
        const parsedHPAList = data.items.map((hpa: any) => ({
          name: hpa.metadata?.name || '',
          targetDeployment: hpa.spec?.scaleTargetRef?.name || '',
          minReplicas: hpa.spec?.minReplicas || 0,
          maxReplicas: hpa.spec?.maxReplicas || 0,
          targetCPU:
            hpa.spec?.targetCPUUtilizationPercentage ||
            hpa.spec?.metrics?.[0]?.resource?.target?.averageUtilization ||
            0,
          currentReplicas: hpa.status?.currentReplicas || 0,
          desiredReplicas: hpa.status?.desiredReplicas || 0,
        }));

        setHpaList(parsedHPAList);
      } else {
        setHpaList([]);
      }
    } catch {
      // HPA list fetch failed - reset to empty
      setHpaList([]);
    }
  }, [service?.id, hops]);

  /**
   * HPA 조회 (선택된 Deployment의 HPA만)
   */
  const loadHPA = useCallback(async () => {
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
  }, [service?.id, selectedDeployment, hpaList]);

  /**
   * Deployment가 HPA를 가지고 있는지 확인하는 헬퍼 함수
   */
  const hasHPA = useCallback(
    (deploymentName: string): boolean => {
      return hpaList.some(
        (hpa: any) => hpa.targetDeployment === deploymentName
      );
    },
    [hpaList]
  );

  /**
   * HPA 생성
   */
  const handleCreateHPA = useCallback(
    async (values: any) => {
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
          target_cpu_utilization_percentage: values.targetCPU,
        });

        message.success(result.message || 'HPA가 생성되었습니다.');

        // HPA 목록 새로고침
        await loadAllHPAs();
        await loadHPA();
      } catch (error: any) {
        message.error('HPA 생성 실패: ' + (error.message || '알 수 없는 오류'));
      } finally {
        setLoadingHPA(false);
      }
    },
    [service?.id, selectedDeployment, loadAllHPAs, loadHPA]
  );

  /**
   * HPA 삭제
   */
  const handleDeleteHPA = useCallback(async () => {
    if (!service?.id) {
      message.error('서비스 정보가 없습니다.');
      return;
    }

    if (!hpaData?.name) {
      message.error('삭제할 HPA가 없습니다.');
      return;
    }

    setLoadingHPA(true);
    try {
      const result = await deleteHPA({
        service_id: service.id,
        hpa_name: hpaData.name,
      });

      message.success(result.message || 'HPA가 삭제되었습니다.');

      // HPA 목록 새로고침
      await loadAllHPAs();
      await loadHPA();
    } catch (error: any) {
      message.error('HPA 삭제 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setLoadingHPA(false);
    }
  }, [service?.id, hpaData, loadAllHPAs, loadHPA]);

  // ============================================================================
  // Deployment 관련 함수
  // ============================================================================

  /**
   * Deployment 스케일링
   */
  const handleScaleDeployment = useCallback(
    async (replicas: number) => {
      if (!service?.id) {
        message.error('서비스 정보가 없습니다.');
        return;
      }

      if (!selectedDeployment) {
        message.error('Deployment를 선택하세요.');
        return;
      }

      try {
        const result = await scaleDeployment({
          service_id: service.id,
          deployment_name: selectedDeployment,
          replicas: replicas,
        });

        message.success(result.message || '스케일링이 완료되었습니다.');
      } catch (error: any) {
        message.error('스케일링 실패: ' + (error.message || '알 수 없는 오류'));
        throw error;
      }
    },
    [service?.id, selectedDeployment]
  );

  // ============================================================================
  // Metrics Server 관련 함수
  // ============================================================================

  /**
   * Metrics Server 상태 확인
   */
  const checkMetricsServerStatus =
    useCallback(async (): Promise<MetricsServerStatus | null> => {
      if (!service?.id) return null;

      try {
        //  SSH hops 전달 (DB fallback 시 SSH 인증 실패 방지)
        const hopsToUse =
          hops.length > 0
            ? hops.map(h => ({
                host: h.host,
                port: h.port,
                username: h.username || '',
                password: h.password || '',
              }))
            : undefined;
        const status = await checkMetricsServer(service.id, hopsToUse);
        setMetricsServerStatus(status);
        return status;
      } catch (error: any) {
        console.error('[checkMetricsServerStatus] Failed:', error);
        return null;
      }
    }, [service?.id, hops]);

  // ============================================================================
  // 반환
  // ============================================================================

  return {
    // Pod 상태
    pods,
    setPods,
    selectedPod,
    setSelectedPod,

    // Deployment 상태
    deployments,
    setDeployments,
    selectedDeployment,
    setSelectedDeployment,

    // HPA 상태
    hpaList,
    setHpaList,
    hpaData,
    setHpaData,

    // Ingress 상태
    ingressDomains,
    setIngressDomains,
    ingresses,
    setIngresses,

    // Node 상태
    nodes,
    setNodes,

    // Metrics Server 상태
    metricsServerStatus,
    setMetricsServerStatus,

    // Ingress Controller 상태
    ingressControllerStatus,
    setIngressControllerStatus,

    // 로딩 상태
    loadingHPA,
    setLoadingHPA,

    // Pod 관련 함수
    loadPodMetrics,
    loadPodDetails,

    // HPA 관련 함수
    loadAllHPAs,
    loadHPA,
    hasHPA,
    handleCreateHPA,
    handleDeleteHPA,

    // Deployment 관련 함수
    handleScaleDeployment,

    // Metrics Server 관련 함수
    checkMetricsServerStatus,
  };
};

export default useKubernetesServiceOperations;
