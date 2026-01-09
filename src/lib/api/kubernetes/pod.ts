import { api } from '../../../services/api';
import { logger } from '../../../utils/logger';
import {
  CommandResult,
  DeployKubernetesParams,
  KubernetesLogEntry,
  KubernetesPodInfo,
  KubernetesNamespaceInfo,
} from './types';

// 네임스페이스 및 파드 상태 조회
export const getNamespaceAndPodStatus = async (data: {
  id: number;
  namespace: string;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<{
      namespace: KubernetesNamespaceInfo;
      pods: KubernetesPodInfo[];
    }>('getNamespaceAndPodStatus', {
      server_id: data.id,
      namespace: data.namespace,
      hops: data.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('네임스페이스 및 파드 상태 조회 실패:', error as Error);
    throw error;
  }
};

// Kubernetes 배포
export const deployKubernetes = async (data: DeployKubernetesParams) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'deployKubernetes',
      data as unknown as Record<string, unknown>
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Kubernetes 배포 실패:', error as Error);
    throw error;
  }
};

// 네임스페이스 삭제
export const deleteNamespace = async (params: {
  id: number;
  namespace: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  logs?: KubernetesLogEntry[];
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      error?: string;
      logs?: KubernetesLogEntry[];
    }>('deleteNamespace', {
      server_id: params.id,
      namespace: params.namespace,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        error: '네임스페이스 삭제 응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('네임스페이스 삭제 실패:', error as Error);
    throw error;
  }
};

// 파드 로그 조회
export const getPodLogs = async (params: {
  id: number;
  namespace: string;
  pod_name: string;
  lines?: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  logs?: string;
  error?: string;
  pod_exists?: boolean;
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      logs?: string;
      error?: string;
      pod_exists?: boolean;
    }>('getPodLogs', {
      server_id: params.id,
      namespace: params.namespace,
      pod_name: params.pod_name,
      lines: params.lines,
      hops: params.hops,
    });

    if (!response.data) {
      throw new Error('응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        error: '파드 로그 응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('파드 로그 조회 실패:', error as Error);
    throw error;
  }
};

// 파드 재시작
export const restartPod = async (params: {
  id: number;
  namespace: string;
  pod_name: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  logs?: KubernetesLogEntry[];
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      error?: string;
      logs?: KubernetesLogEntry[];
    }>('restartPod', {
      server_id: params.id,
      namespace: params.namespace,
      pod_name: params.pod_name,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        error: '파드 재시작 응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('파드 재시작 실패:', error as Error);
    throw error;
  }
};

// 파드 삭제
export const deletePod = async (params: {
  id: number;
  namespace: string;
  pod_name: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  logs?: KubernetesLogEntry[];
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      error?: string;
      logs?: KubernetesLogEntry[];
    }>('deletePod', {
      server_id: params.id,
      namespace: params.namespace,
      pod_name: params.pod_name,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        error: '파드 삭제 응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('파드 삭제 실패:', error as Error);
    throw error;
  }
};
