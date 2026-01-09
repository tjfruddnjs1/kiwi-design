import { api } from '../../services/api';
import { logger } from '../../utils/logger';
import type { SshHop } from './types';

/** K8s 리소스 스펙 타입 (다양한 리소스 유형에 대응) */
export interface K8sResourceSpec {
  replicas?: number;
  selector?: {
    matchLabels?: Record<string, string>;
  };
  template?: {
    metadata?: Record<string, unknown>;
    spec?: Record<string, unknown>;
  };
  ports?: Array<{
    port: number;
    targetPort?: number | string;
    protocol?: string;
    name?: string;
    nodePort?: number;
  }>;
  type?: string;
  clusterIP?: string;
  rules?: Array<{
    host?: string;
    http?: {
      paths: Array<{
        path: string;
        pathType?: string;
        backend: {
          service?: {
            name: string;
            port: { number?: number; name?: string };
          };
          serviceName?: string;
          servicePort?: number | string;
        };
      }>;
    };
  }>;
  tls?: Array<{
    hosts: string[];
    secretName: string;
  }>;
  [key: string]: unknown;
}

/** K8s 리소스 상태 타입 */
export interface K8sResourceStatus {
  availableReplicas?: number;
  readyReplicas?: number;
  replicas?: number;
  updatedReplicas?: number;
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
    lastUpdateTime?: string;
  }>;
  phase?: string;
  loadBalancer?: {
    ingress?: Array<{ ip?: string; hostname?: string }>;
  };
  [key: string]: unknown;
}

// K8s 리소스 타입 정의
export interface K8sResource {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec?: K8sResourceSpec;
  status?: K8sResourceStatus;
}

export interface K8sResourcesResponse {
  namespace: string;
  deployments: K8sResource[];
  services: K8sResource[];
  ingresses: K8sResource[];
}

// K8s 리소스 목록 조회 (Deployment, Service, Ingress)
export const getK8sResources = async (
  serviceId: number,
  sshHops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>
): Promise<K8sResourcesResponse> => {
  try {
    const parameters: {
      service_id: number;
      ssh_hops?: Array<{
        host: string;
        port: number;
        username: string;
        password: string;
      }>;
    } = {
      service_id: serviceId,
    };

    if (sshHops) {
      parameters.ssh_hops = sshHops;
    }

    const response = await api.kubernetes.request<K8sResourcesResponse>(
      'getK8sResources',
      parameters
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'K8s 리소스 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('K8s 리소스 조회 실패:', error as Error);
    throw error;
  }
};

// K8s 리소스 YAML 조회
export const getK8sResourceYaml = async (params: {
  service_id: number;
  resource_type: string;
  resource_name: string;
}): Promise<string> => {
  try {
    const response = await api.kubernetes.request<{ yaml: string }>(
      'getK8sResourceYaml',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'K8s 리소스 YAML 조회 실패');
    }

    return response.data.data.yaml;
  } catch (error) {
    logger.error('K8s 리소스 YAML 조회 실패:', error as Error);
    throw error;
  }
};

// Git 동기화 결과 타입
export interface GitSyncResult {
  success: boolean;
  message: string;
}

// K8s 리소스 YAML 적용 응답 타입
export interface ApplyK8sResourceResponse {
  message: string;
  output: string;
  git_sync?: GitSyncResult;
}

// K8s 리소스 YAML 적용
export const applyK8sResource = async (params: {
  service_id: number;
  yaml: string;
  resource_type?: string;
  resource_name?: string;
}): Promise<ApplyK8sResourceResponse> => {
  try {
    const response = await api.kubernetes.request<ApplyK8sResourceResponse>(
      'applyK8sResource',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'K8s 리소스 적용 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('K8s 리소스 적용 실패:', error as Error);
    throw error;
  }
};

// K8s 리소스 삭제 응답 타입
export interface DeleteK8sResourceResponse {
  message: string;
  git_sync?: GitSyncResult;
}

// K8s 리소스 삭제
export const deleteK8sResource = async (params: {
  service_id: number;
  resource_type: string;
  resource_name: string;
}): Promise<DeleteK8sResourceResponse> => {
  try {
    const response = await api.kubernetes.request<DeleteK8sResourceResponse>(
      'deleteK8sResource',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'K8s 리소스 삭제 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('K8s 리소스 삭제 실패:', error as Error);
    throw error;
  }
};

// ==================== K8s 운영 관리 API ====================

// Deployment 스케일링
export const scaleDeployment = async (params: {
  service_id: number;
  deployment_name: string;
  replicas: number;
}): Promise<{
  message: string;
  deployment: string;
  replicas: number;
  output: string;
}> => {
  try {
    const response = await api.kubernetes.request<{
      message: string;
      deployment: string;
      replicas: number;
      output: string;
    }>('scaleDeployment', params);

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Deployment 스케일링 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Deployment 스케일링 실패:', error as Error);
    throw error;
  }
};

/** HPA 정보 타입 */
export interface HPAInfo {
  name: string;
  namespace: string;
  min_replicas: number;
  max_replicas: number;
  current_replicas: number;
  target_cpu_percent: number;
  current_cpu_percent?: number;
  deployment?: string;
}

/** HPA 조회 응답 타입 (kubectl get hpa -o json 형식) */
export interface HPAResponse {
  apiVersion?: string;
  kind?: string;
  items: Array<{
    metadata?: {
      name?: string;
      namespace?: string;
      creationTimestamp?: string;
    };
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
        type?: string;
        resource?: {
          name?: string;
          target?: {
            type?: string;
            averageUtilization?: number;
          };
        };
      }>;
    };
    status?: {
      currentReplicas?: number;
      desiredReplicas?: number;
      currentCPUUtilizationPercentage?: number;
    };
  }>;
}

// HPA(Horizontal Pod Autoscaler) 조회
export const getHPA = async (
  serviceId: number,
  hops?: SshHop[]
): Promise<HPAResponse> => {
  try {
    const params: { service_id: number; ssh_hops?: SshHop[] } = {
      service_id: serviceId,
    };

    //  SSH hops가 제공되면 ssh_hops 파라미터에 추가 (getK8sResources와 동일한 파라미터명 사용)
    if (hops && hops.length > 0) {
      params.ssh_hops = hops;
    }

    const response = await api.kubernetes.request<HPAResponse>(
      'getHPA',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'HPA 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('HPA 조회 실패:', error as Error);
    throw error;
  }
};

// HPA 생성
export const createHPA = async (params: {
  service_id: number;
  deployment_name: string;
  min_replicas: number;
  max_replicas: number;
  target_cpu_percent: number;
}): Promise<{
  message: string;
  deployment: string;
  min_replicas: number;
  max_replicas: number;
  target_cpu: number;
}> => {
  try {
    const response = await api.kubernetes.request<{
      message: string;
      deployment: string;
      min_replicas: number;
      max_replicas: number;
      target_cpu: number;
    }>('createHPA', params);

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'HPA 생성 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('HPA 생성 실패:', error as Error);
    throw error;
  }
};

/** HPA 삭제 에러 타입 */
export interface HPADeleteError extends Error {
  code?: string;
}

// HPA 삭제
export const deleteHPA = async (params: {
  service_id: number;
  hpa_name: string;
}): Promise<{ message: string }> => {
  try {
    const response = await api.kubernetes.request<{
      message: string;
      hpa_name: string;
    }>('deleteHPA', params);

    if (!response.data?.success) {
      const error: HPADeleteError = new Error(
        response.data?.error || 'HPA 삭제 실패'
      );
      error.code = (response.data as { code?: string })?.code;
      throw error;
    }

    return {
      message: response.data.message || 'HPA가 삭제되었습니다.',
      ...response.data.data,
    };
  } catch (error) {
    logger.error('HPA 삭제 실패:', error as Error);
    throw error;
  }
};

// Rollout 히스토리 조회
export const getRolloutHistory = async (params: {
  service_id: number;
  deployment_name: string;
  hops?: SshHop[];
}): Promise<{ deployment: string; history: string }> => {
  try {
    const response = await api.kubernetes.request<{
      deployment: string;
      history: string;
    }>('getRolloutHistory', params);

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Rollout 히스토리 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Rollout 히스토리 조회 실패:', error as Error);
    throw error;
  }
};

// Rollout Undo (롤백)
export const rolloutUndo = async (params: {
  service_id: number;
  deployment_name: string;
  revision?: number;
  hops?: SshHop[];
}): Promise<{ message: string; deployment: string; output: string }> => {
  try {
    const response = await api.kubernetes.request<{
      message: string;
      deployment: string;
      output: string;
    }>('rolloutUndo', params);

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Rollout Undo 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Rollout Undo 실패:', error as Error);
    throw error;
  }
};

/** K8s 이벤트 정보 타입 */
export interface K8sEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  object: string;
  source: string;
  first_timestamp: string;
  last_timestamp: string;
  count: number;
}

/** K8s 이벤트 조회 응답 타입 */
export interface K8sEventsResponse {
  events: K8sEvent[];
  namespace: string;
}

// K8s 이벤트 조회
export const getEvents = async (
  serviceId: number
): Promise<K8sEventsResponse> => {
  try {
    const response = await api.kubernetes.request<K8sEventsResponse>(
      'getEvents',
      {
        service_id: serviceId,
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '이벤트 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('이벤트 조회 실패:', error as Error);
    throw error;
  }
};

// Pod 삭제 (재시작)
export const deletePod = async (params: {
  service_id: number;
  pod_name: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{ message: string; pod: string; output: string }> => {
  try {
    const response = await api.kubernetes.request<{
      message: string;
      pod: string;
      output: string;
    }>('deletePod', params);

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Pod 삭제 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Pod 삭제 실패:', error as Error);
    throw error;
  }
};

// 노드 리소스 정보 조회
export interface NodeResource {
  name: string;
  cpuUsage: string;
  cpuPercent: string;
  memoryUsage: string;
  memoryPercent: string;
}

export const getNodeResources = async (
  serviceId: number
): Promise<{
  nodes: NodeResource[];
  message?: string;
}> => {
  try {
    const response = await api.kubernetes.request<{
      nodes: NodeResource[];
      message?: string;
    }>('getNodeResources', {
      service_id: serviceId,
    });

    if (!response.data?.success) {
      throw new Error(response.data?.error || '노드 리소스 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('노드 리소스 조회 실패:', error as Error);
    throw error;
  }
};

// ==================== Ingress 관리 API ====================

export interface IngressRule {
  host: string;
  paths: {
    path: string;
    pathType: string;
    serviceName: string;
    servicePort: number;
  }[];
}

export interface IngressTLS {
  hosts: string[];
  secretName: string;
}

export interface CreateIngressParams {
  service_id: number;
  ingress_name: string;
  namespace?: string;
  rules: IngressRule[];
  tls?: IngressTLS[];
  annotations?: Record<string, string>;
}

export interface IngressInfo {
  name: string;
  namespace: string;
  rules: IngressRule[];
  tls?: IngressTLS[];
  annotations?: Record<string, string>;
  creationTimestamp?: string;
}

// Ingress 생성
export const createIngress = async (
  params: CreateIngressParams
): Promise<{ message: string }> => {
  try {
    const response = await api.kubernetes.request<{ message: string }>(
      'createIngress',
      params as unknown as Record<string, unknown>
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Ingress 생성 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Ingress 생성 실패:', error as Error);
    throw error;
  }
};

// Ingress 삭제
export const deleteIngress = async (params: {
  service_id: number;
  ingress_name: string;
}): Promise<{ message: string }> => {
  try {
    const response = await api.kubernetes.request<{ message: string }>(
      'deleteIngress',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Ingress 삭제 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Ingress 삭제 실패:', error as Error);
    throw error;
  }
};

/**
 * Nginx Ingress Controller 설치 여부 확인
 */
export interface IngressControllerStatus {
  installed: boolean;
  status: 'installed' | 'not_installed' | 'installing' | 'error';
  namespace_exists: boolean;
  deployment_exists: boolean;
  pods_running: boolean;
  service_exists: boolean;
  details: Record<string, unknown>;
  // 추가 속성들 (UI에서 사용)
  version?: string;
  namespace?: string;
  pods_ready?: boolean;
}

export const checkIngressController = async (
  serviceId: number
): Promise<IngressControllerStatus> => {
  try {
    const response = await api.kubernetes.request<IngressControllerStatus>(
      'checkIngressController',
      {
        service_id: serviceId,
      }
    );

    return response.data.data;
  } catch (error) {
    logger.error('Ingress Controller 상태 확인 실패:', error as Error);
    throw error;
  }
};

/**
 * Nginx Ingress Controller 설치
 */
export const installIngressController = async (
  serviceId: number
): Promise<{ installed: boolean; message: string }> => {
  try {
    const response = await api.kubernetes.request<{
      installed: boolean;
      message: string;
    }>('installIngressController', {
      service_id: serviceId,
    });

    return {
      installed: response.data.data?.installed || false,
      message: response.data.message || '설치가 완료되었습니다',
    };
  } catch (error) {
    logger.error('Ingress Controller 설치 실패:', error as Error);
    throw error;
  }
};

// ==================== Metrics Server 관리 API ====================

export interface MetricsServerStatus {
  installed: boolean;
  ready: boolean;
  message: string;
  pod_status?: string;
  pod_name?: string;
}

export interface MetricsServerDiagnostics {
  pod_logs?: string;
  pod_events?: string[];
  error_message?: string;
}

export interface MetricsServerStatusResponse {
  status: MetricsServerStatus;
  diagnostics?: MetricsServerDiagnostics;
}

/**
 * Metrics Server 설치 상태 확인
 */
export const checkMetricsServer = async (
  serviceId: number,
  hops?: SshHop[]
): Promise<MetricsServerStatus> => {
  try {
    const params: { service_id: number; hops?: SshHop[] } = {
      service_id: serviceId,
    };

    //  SSH hops가 제공되면 파라미터에 추가 (DB fallback 시 SSH 인증 실패 방지)
    if (hops && hops.length > 0) {
      params.hops = hops;
    }

    const response = await api.kubernetes.request<MetricsServerStatus>(
      'checkMetricsServer',
      params
    );

    return response.data.data;
  } catch (error) {
    logger.error('Metrics Server 상태 확인 실패:', error as Error);
    throw error;
  }
};

/** Metrics Server 설치 응답 데이터 타입 */
interface MetricsServerInstallResponseData {
  output?: string;
  pod_status?: string;
}

/**
 * Metrics Server 설치
 */
export const installMetricsServer = async (
  serviceId: number,
  hops?: SshHop[]
): Promise<{ message: string; output?: string; pod_status?: string }> => {
  try {
    const params: { service_id: number; hops?: SshHop[] } = {
      service_id: serviceId,
    };

    //  SSH hops가 제공되면 파라미터에 추가
    if (hops && hops.length > 0) {
      params.hops = hops;
    }

    const response =
      await api.kubernetes.request<MetricsServerInstallResponseData>(
        'installMetricsServer',
        params
      );

    //  백엔드가 success, message, output, pod_status를 직접 반환하므로 response.data에서 직접 접근
    const responseData = response.data as {
      message?: string;
      output?: string;
      pod_status?: string;
      data?: MetricsServerInstallResponseData;
    };
    return {
      message: responseData.message || '설치가 완료되었습니다',
      output: responseData.output || responseData.data?.output,
      pod_status: responseData.pod_status || responseData.data?.pod_status,
    };
  } catch (error) {
    console.error('[installMetricsServer API] 실패', error);
    logger.error('Metrics Server 설치 실패:', error as Error);
    throw error;
  }
};

/**
 * Metrics Server 상세 상태 조회 (진단 정보 포함)
 */
export const getMetricsServerStatus = async (
  serviceId: number,
  hops?: SshHop[]
): Promise<MetricsServerStatusResponse> => {
  try {
    const params: { service_id: number; hops?: SshHop[] } = {
      service_id: serviceId,
    };

    //  SSH hops가 제공되면 파라미터에 추가 (DB fallback 시 SSH 인증 실패 방지)
    if (hops && hops.length > 0) {
      params.hops = hops;
    }

    const response = await api.kubernetes.request<{
      status: MetricsServerStatus;
      diagnostics?: MetricsServerDiagnostics;
    }>('getMetricsServerStatus', params);

    return {
      status: response.data.data.status,
      diagnostics: response.data.data.diagnostics,
    };
  } catch (error) {
    logger.error('Metrics Server 상세 상태 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * Metrics Server가 있는 노드의 이미지 캐시 정리
 */
export const cleanMetricsServerNode = async (
  serviceId: number
): Promise<{
  message: string;
  nodeName?: string;
  podName?: string;
}> => {
  try {
    const response = await api.kubernetes.request<{
      node_name?: string;
      pod_name?: string;
      clean_output?: string;
      pull_output?: string;
      delete_output?: string;
    }>('cleanMetricsServerNode', {
      service_id: serviceId,
    });

    return {
      message: response.data.message || '이미지 캐시 정리 완료',
      nodeName: response.data.data?.node_name,
      podName: response.data.data?.pod_name,
    };
  } catch (error) {
    logger.error('Metrics Server 노드 이미지 캐시 정리 실패:', error as Error);
    throw error;
  }
};

// ==================== Pod 모니터링 및 제어 API ====================

/**
 * Pod 메트릭스 타입 정의
 */
export interface PodMetric {
  pod_name: string;
  cpu_usage: string; // "150m" (millicores)
  memory_usage: string; // "256Mi"
}

export interface PodMetricsResponse {
  namespace: string;
  metrics: PodMetric[];
}

/**
 * Pod 이벤트 타입 정의
 */
export interface PodEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  timestamp: string;
  count: number;
}

export interface PodDescription {
  pod_name: string;
  namespace: string;
  events: PodEvent[];
  full_describe: string;
}

/**
 * Pod별 CPU/메모리 사용량 조회 (kubectl top pods)
 */
export const getPodMetrics = async (
  serviceId: number,
  hops?: SshHop[]
): Promise<PodMetricsResponse> => {
  try {
    const params: { service_id: number; hops?: SshHop[] } = {
      service_id: serviceId,
    };

    //  SSH hops가 제공되면 파라미터에 추가 (DB fallback 시 SSH 인증 실패 방지)
    if (hops && hops.length > 0) {
      params.hops = hops;
    }

    const response = await api.kubernetes.request<PodMetricsResponse>(
      'getPodMetrics',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Pod 메트릭스 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Pod 메트릭스 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * Pod 상세 정보 및 이벤트 조회 (kubectl describe pod)
 */
export const describePod = async (params: {
  service_id: number;
  pod_name: string;
}): Promise<PodDescription> => {
  try {
    const response = await api.kubernetes.request<PodDescription>(
      'describePod',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Pod 상세 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Pod 상세 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * ========================================
 * Kubernetes 운영 관리 API
 * ========================================
 */

/**
 * ReplicaSet 정리 결과 타입
 */
export interface CleanupReplicaSetsResult {
  deleted_count: number;
  total_found: number;
  errors?: string[];
}

/**
 * 오래된 ReplicaSet 정리
 */
export const cleanupReplicaSets = async (params: {
  infra_id: number;
  namespace: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupReplicaSetsResult> => {
  try {
    const response = await api.kubernetes.request<CleanupReplicaSetsResult>(
      'cleanupReplicaSets',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'ReplicaSet 정리 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('ReplicaSet 정리 실패:', error as Error);
    throw error;
  }
};

/**
 * Node 관리 결과 타입
 */
export interface NodeOperationResult {
  node_name: string;
  output: string;
}

/**
 * 노드 Drain (모든 Pod 제거)
 */
export const nodeDrain = async (params: {
  infra_id: number;
  node_name: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<NodeOperationResult> => {
  try {
    const response = await api.kubernetes.request<NodeOperationResult>(
      'nodeDrain',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '노드 Drain 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('노드 Drain 실패:', error as Error);
    throw error;
  }
};

/**
 * 노드 Cordon (새 Pod 할당 방지)
 */
export const nodeCordon = async (params: {
  infra_id: number;
  node_name: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<NodeOperationResult> => {
  try {
    const response = await api.kubernetes.request<NodeOperationResult>(
      'nodeCordon',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '노드 Cordon 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('노드 Cordon 실패:', error as Error);
    throw error;
  }
};

/**
 * 노드 Uncordon (스케줄링 재활성화)
 */
export const nodeUncordon = async (params: {
  infra_id: number;
  node_name: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<NodeOperationResult> => {
  try {
    const response = await api.kubernetes.request<NodeOperationResult>(
      'nodeUncordon',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '노드 Uncordon 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('노드 Uncordon 실패:', error as Error);
    throw error;
  }
};

/**
 * PVC 상태 타입
 */
export interface PVCStatusResult {
  pvcs: string; // JSON string
  pvs: string; // JSON string
  storageclasses: string; // JSON string
}

/**
 * PVC 및 StorageClass 상태 조회
 */
export const getPVCStatus = async (params: {
  infra_id: number;
  namespace: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<PVCStatusResult> => {
  try {
    const response = await api.kubernetes.request<PVCStatusResult>(
      'getPVCStatus',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'PVC 상태 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('PVC 상태 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * 노드 목록 결과 타입
 */
export interface NodeInfo {
  name: string;
  status: string;
  roles: string;
  age: string;
  version: string;
}

export interface NodeListResult {
  nodes: string; // JSON string
}

/**
 * 노드 목록 조회
 */
export const getNodeList = async (params: {
  infra_id: number;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<NodeListResult> => {
  try {
    const response = await api.kubernetes.request<NodeListResult>(
      'getNodeList',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '노드 목록 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('노드 목록 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * 리소스 정리 결과 타입
 */
export interface CleanupResult {
  deleted_count: number;
  message: string;
  errors?: string[];
  details?: string;
}

/**
 * Evicted Pod 정리
 */
export const cleanupEvictedPods = async (params: {
  infra_id: number;
  namespace?: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupResult> => {
  try {
    const response = await api.kubernetes.request<CleanupResult>(
      'cleanupEvictedPods',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Evicted Pod 정리 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Evicted Pod 정리 실패:', error as Error);
    throw error;
  }
};

/**
 * Failed/Error Pod 정리
 */
export const cleanupFailedPods = async (params: {
  infra_id: number;
  namespace?: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupResult> => {
  try {
    const response = await api.kubernetes.request<CleanupResult>(
      'cleanupFailedPods',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed Pod 정리 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Failed Pod 정리 실패:', error as Error);
    throw error;
  }
};

/**
 * Completed Pod 정리
 */
export const cleanupCompletedPods = async (params: {
  infra_id: number;
  namespace?: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupResult> => {
  try {
    const response = await api.kubernetes.request<CleanupResult>(
      'cleanupCompletedPods',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Completed Pod 정리 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Completed Pod 정리 실패:', error as Error);
    throw error;
  }
};

/**
 * Docker 리소스 정리
 */
export const cleanupDockerResources = async (params: {
  infra_id: number;
  node_name?: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupResult> => {
  try {
    const response = await api.kubernetes.request<CleanupResult>(
      'cleanupDockerResources',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Docker 리소스 정리 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Docker 리소스 정리 실패:', error as Error);
    throw error;
  }
};

/**
 * 디스크 공간 확보
 */
export const cleanupDiskSpace = async (params: {
  infra_id: number;
  node_name?: string;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupResult> => {
  try {
    const response = await api.kubernetes.request<CleanupResult>(
      'cleanupDiskSpace',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '디스크 공간 확보 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('디스크 공간 확보 실패:', error as Error);
    throw error;
  }
};

/**
 * Pod 로그 정리
 */
export const cleanupPodLogs = async (params: {
  infra_id: number;
  days?: number;
  hops?: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CleanupResult> => {
  try {
    const response = await api.kubernetes.request<CleanupResult>(
      'cleanupPodLogs',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Pod 로그 정리 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Pod 로그 정리 실패:', error as Error);
    throw error;
  }
};

// ============= K8s 인증서 관리 API =============

// 인증서 정보 타입
export interface CertificateInfo {
  name: string;
  expirationDate: string;
  remainingDays: number;
  status: 'valid' | 'warning' | 'critical' | 'expired';
  issuer?: string;
  caName?: string;
}

// 인증서 조회 응답 타입
export interface CertificateCheckResponse {
  certificates: CertificateInfo[];
  caInfo?: CertificateInfo;
  rawOutput?: string;
}

// 인증서 갱신 응답 타입
export interface CertificateRenewResponse {
  message: string;
  renewOutput: string;
  restartOutput?: string;
  certificates?: CertificateInfo[];
}

// K8s 인증서 만료일 조회
export const checkCertExpiration = async (params: {
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<CertificateCheckResponse> => {
  try {
    const response = await api.kubernetes.request<CertificateCheckResponse>(
      'checkCertExpiration',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'K8s 인증서 정보 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('K8s 인증서 정보 조회 실패:', error as Error);
    throw error;
  }
};

// K8s 모든 인증서 갱신
export const renewK8sCertificates = async (params: {
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  validityYears?: number; // 유효기간 (년), 기본값: 1
}): Promise<CertificateRenewResponse> => {
  try {
    const response = await api.kubernetes.request<CertificateRenewResponse>(
      'renewK8sCertificates',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'K8s 인증서 갱신 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('K8s 인증서 갱신 실패:', error as Error);
    throw error;
  }
};

// K8s 개별 인증서 갱신
export const renewK8sCertificate = async (params: {
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  certName: string;
  validityYears?: number; // 유효기간 (년), 기본값: 1
}): Promise<CertificateRenewResponse> => {
  try {
    const response = await api.kubernetes.request<CertificateRenewResponse>(
      'renewK8sCertificate',
      params
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '인증서 갱신 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인증서 갱신 실패:', error as Error);
    throw error;
  }
};

// ==================== Service Domain 관리 API ====================

/**
 * Service Domain 정보 타입 (service_domains 테이블)
 * Docker 인프라에서 프록시 연결된 도메인 정보
 */
export interface ServiceDomain {
  id: number;
  service_id: number;
  hostname: string;
  upstream_address: string | null;
  proxy_status: 'active' | 'inactive' | 'pending' | string;
  proxy_status_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 서비스에 연결된 도메인 목록 조회 (Docker 인프라용)
 * service_domains 테이블에서 해당 서비스의 도메인 목록을 가져옵니다.
 */
export const getServiceDomains = async (
  serviceId: number
): Promise<ServiceDomain[]> => {
  try {
    const response = await api.kubernetes.request<ServiceDomain[]>(
      'getDomainsForService',
      { service_id: serviceId }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || '서비스 도메인 조회 실패');
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('서비스 도메인 조회 실패:', error as Error);
    throw error;
  }
};
