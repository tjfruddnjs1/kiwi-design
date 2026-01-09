// Kubernetes 관련 API 엔드포인트
// 쿠버네티스 클러스터 관리, 노드 제어, 파드 관리 등의 기능을 제공합니다

import { apiClient } from '../client';
import type {
  StandardApiResponse,
  SshHop,
  KubernetesNode,
  KubernetesPod,
  KubernetesNamespace,
  KubernetesClusterInfo,
  KubernetesCommandResult,
  KubernetesDeployParams,
  ApiRequestOptions,
} from '../types';

// ==================== Kubernetes API ====================

export const kubernetesApi = {
  /**
   * 통합 요청 함수 (기존 호환성 유지)
   */
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.kubernetes<TResponse>(action, parameters, options);
  },

  // ==================== 노드 관리 ====================

  /**
   * 노드 상태 조회
   */
  getNodeStatus: (params: {
    server_id: number;
    infra_id: number;
    type: string;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      status: {
        installed: boolean;
        running: boolean;
        isMaster?: boolean;
        isWorker?: boolean;
      };
      lastChecked: string;
    }>
  > => {
    return apiClient.kubernetes('getNodeStatus', params);
  },

  /**
   * 로드밸런서 설치
   */
  installLoadBalancer: (params: {
    server_id: number;
    infra_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('installLoadBalancer', params, {
      showSuccessMessage: true,
      successMessage: '로드밸런서 설치가 시작되었습니다.',
    });
  },

  /**
   * 첫 번째 마스터 노드 설치
   */
  installFirstMaster: (params: {
    server_id: number;
    infra_id: number;
    hops: SshHop[];
    lb_hops?: SshHop[];
    password?: string;
    lb_password?: string;
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('installFirstMaster', params, {
      showSuccessMessage: true,
      successMessage: '마스터 노드 설치가 시작되었습니다.',
    });
  },

  /**
   * 마스터 노드 조인
   */
  joinMaster: (params: {
    server_id: number;
    infra_id: number;
    hops: SshHop[];
    lb_hops: SshHop[];
    password: string;
    lb_password: string;
    main_id: number;
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('joinMaster', params, {
      showSuccessMessage: true,
      successMessage: '마스터 노드 조인이 시작되었습니다.',
    });
  },

  /**
   * 워커 노드 조인
   */
  joinWorker: (params: {
    server_id: number;
    infra_id: number;
    hops: SshHop[];
    password: string;
    main_id: number;
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('joinWorker', params, {
      showSuccessMessage: true,
      successMessage: '워커 노드 조인이 시작되었습니다.',
    });
  },

  /**
   * 노드 제거
   */
  removeNode: (params: {
    server_id: number;
    hops: SshHop[];
    nodeName: string;
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('removeNode', params, {
      showSuccessMessage: true,
      successMessage: '노드 제거가 시작되었습니다.',
    });
  },

  // ==================== 서버 제어 ====================

  /**
   * 서버 시작
   */
  startServer: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('startServer', params, {
      showSuccessMessage: true,
      successMessage: '서버 시작이 완료되었습니다.',
    });
  },

  /**
   * 서버 중지
   */
  stopServer: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('stopServer', params, {
      showSuccessMessage: true,
      successMessage: '서버 중지가 완료되었습니다.',
    });
  },

  /**
   * 서버 재시작
   */
  restartServer: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('restartServer', params, {
      showSuccessMessage: true,
      successMessage: '서버 재시작이 완료되었습니다.',
    });
  },

  // ==================== 클러스터 정보 ====================

  /**
   * 클러스터 정보 조회
   */
  getClusterInfo: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesClusterInfo>> => {
    return apiClient.kubernetes('calculateResources', params);
  },

  /**
   * 노드 목록 조회
   */
  getNodes: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<{ list: KubernetesNode[] }>> => {
    return apiClient.kubernetes('calculateNodes', params);
  },

  /**
   * 클러스터 상태 확인
   */
  getClusterStatus: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      status: 'healthy' | 'warning' | 'error';
      nodes_ready: number;
      nodes_total: number;
      pods_running: number;
      pods_total: number;
      api_server_status: 'running' | 'error';
      etcd_status: 'running' | 'error';
      last_updated: string;
    }>
  > => {
    return apiClient.kubernetes('getClusterStatus', params);
  },

  // ==================== 네임스페이스 및 파드 관리 ====================

  /**
   * 네임스페이스와 파드 상태 조회
   */
  getNamespaceAndPods: (params: {
    server_id: number;
    infra_id: number;
    namespace: string;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      namespace: KubernetesNamespace;
      pods: KubernetesPod[];
    }>
  > => {
    return apiClient.kubernetes('getNamespaceAndPodStatus', params);
  },

  /**
   * 모든 네임스페이스 조회
   */
  getAllNamespaces: (params: {
    server_id: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesNamespace[]>> => {
    return apiClient.kubernetes('getAllNamespaces', params);
  },

  /**
   * 네임스페이스 생성
   */
  createNamespace: (params: {
    server_id: number;
    namespace: string;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('createNamespace', params, {
      showSuccessMessage: true,
      successMessage: '네임스페이스가 성공적으로 생성되었습니다.',
    });
  },

  /**
   * 네임스페이스 삭제
   */
  deleteNamespace: (params: {
    server_id: number;
    namespace: string;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('deleteNamespace', params, {
      showSuccessMessage: true,
      successMessage: '네임스페이스가 성공적으로 삭제되었습니다.',
    });
  },

  // ==================== 파드 관리 ====================

  /**
   * 파드 로그 조회
   */
  getPodLogs: (params: {
    server_id: number;
    namespace: string;
    pod_name: string;
    lines?: number;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      success: boolean;
      logs?: string;
      error?: string;
      pod_exists?: boolean;
    }>
  > => {
    return apiClient.kubernetes('getPodLogs', params);
  },

  /**
   * 파드 재시작
   */
  restartPod: (params: {
    server_id: number;
    namespace: string;
    pod_name: string;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('restartPod', params, {
      showSuccessMessage: true,
      successMessage: '파드가 성공적으로 재시작되었습니다.',
    });
  },

  /**
   * 파드 삭제
   */
  deletePod: (params: {
    server_id: number;
    namespace: string;
    pod_name: string;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('deletePod', params, {
      showSuccessMessage: true,
      successMessage: '파드가 성공적으로 삭제되었습니다.',
    });
  },

  /**
   * 파드 상세 정보 조회
   */
  getPodDetails: (params: {
    server_id: number;
    namespace: string;
    pod_name: string;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      pod: KubernetesPod;
      events?: Array<{
        type: string;
        reason: string;
        message: string;
        timestamp: string;
      }>;
      containers?: Array<{
        name: string;
        image: string;
        status: string;
        restart_count: number;
      }>;
    }>
  > => {
    return apiClient.kubernetes('getPodDetails', params);
  },

  // ==================== 배포 관리 ====================

  /**
   * Kubernetes 배포
   */
  deploy: (
    params: KubernetesDeployParams
  ): Promise<StandardApiResponse<Record<string, unknown>>> => {
    return apiClient.kubernetes('deployKubernetes', params, {
      showSuccessMessage: true,
      successMessage: '배포가 시작되었습니다.',
    });
  },

  /**
   * Kubernetes 재배포
   */
  redeploy: (
    params: KubernetesDeployParams
  ): Promise<StandardApiResponse<Record<string, unknown>>> => {
    return apiClient.kubernetes('redeployKubernetes', params, {
      showSuccessMessage: true,
      successMessage: '재배포가 시작되었습니다.',
    });
  },

  /**
   * 마지막 배포 시간 조회
   */
  getLastDeploymentTime: (params: {
    namespace: string;
  }): Promise<StandardApiResponse<{ lastDeploymentTime: string }>> => {
    return apiClient.kubernetes('get-last-deployment-time', params);
  },

  /**
   * 배포 상태 조회
   */
  getDeploymentStatus: (params: {
    server_id: number;
    namespace: string;
    deployment_name: string;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      status: 'running' | 'updating' | 'error' | 'pending';
      replicas_ready: number;
      replicas_total: number;
      last_updated: string;
      conditions?: Array<{
        type: string;
        status: string;
        reason?: string;
        message?: string;
      }>;
    }>
  > => {
    return apiClient.kubernetes('getDeploymentStatus', params);
  },

  /**
   * 배포 롤백
   */
  rollbackDeployment: (params: {
    server_id: number;
    namespace: string;
    deployment_name: string;
    revision?: number;
    hops: SshHop[];
  }): Promise<StandardApiResponse<KubernetesCommandResult>> => {
    return apiClient.kubernetes('rollbackDeployment', params, {
      showSuccessMessage: true,
      successMessage: '배포 롤백이 시작되었습니다.',
    });
  },

  // ==================== 서비스 관리 ====================

  /**
   * 서비스 목록 조회
   */
  getServices: (params: {
    server_id: number;
    namespace?: string;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<
      Array<{
        name: string;
        namespace: string;
        type: string;
        cluster_ip: string;
        external_ip?: string;
        ports: string;
      }>
    >
  > => {
    return apiClient.kubernetes('getServices', params);
  },

  /**
   * 인그레스 목록 조회
   */
  getIngresses: (params: {
    server_id: number;
    namespace?: string;
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<
      Array<{
        name: string;
        namespace: string;
        hosts: string[];
        address?: string;
        paths?: Array<{
          path: string;
          backend_service: string;
        }>;
      }>
    >
  > => {
    return apiClient.kubernetes('getIngresses', params);
  },
};

export default kubernetesApi;
