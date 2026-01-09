import { api } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { InfraItem } from '../../../types/infra';
import { ServerStatus, InfraDetails, ServerDetails, Server } from './types';

// 인프라 목록 조회
export const getInfras = async (): Promise<InfraItem[]> => {
  try {
    const response = await api.kubernetes.request<InfraItem[]>('getInfras', {});

    if (!response?.data?.success) {
      return [];
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch infras:', error as Error);

    return [];
  }
};

// 인프라 상세 조회
export const getInfraById = async (id: number) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>(
      'getInfraById',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 상세 조회 실패:', error as Error);
    throw error;
  }
};

// 인프라 생성
export const createInfra = async (data: {
  name: string; // 인프라 이름
  type: string; // 인프라 유형 (kubernetes, baremetal, docker, cloud, external_kubernetes, external_docker)
  info: string; // 인프라 구성 정보
}) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>(
      'createInfra',
      data
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 생성 실패:', error as Error);
    throw error;
  }
};

// 인프라 수정
export const updateInfra = async (
  id: number,
  data: {
    name?: string; // 인프라 이름
    type?: string; // 인프라 유형 (kubernetes, baremetal, docker, cloud, external_kubernetes, external_docker)
    info?: string; // 인프라 구성 정보
  }
) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>('updateInfra', {
      id,
      ...data,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 수정 실패:', error as Error);
    throw error;
  }
};

// 인프라 삭제
export const deleteInfra = async (id: number) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'deleteInfra',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 삭제 실패:', error as Error);
    throw error;
  }
};

// 서버 목록 조회
export const getServers = async (infraId: number) => {
  try {
    const response = await api.kubernetes.request<Server[]>('getServers', {
      infra_id: infraId,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('서버 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 서버 상세 조회
export const getServerById = async (id: number) => {
  try {
    const response = await api.kubernetes.request<ServerDetails>(
      'getServerById',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 상세 조회 실패:', error as Error);
    throw error;
  }
};

// 서버 생성
export const createServer = async (data: {
  name: string;
  infra_id: number;
  type: string;
  ip: string;
  port: number;
  status: ServerStatus;
  hops?: Array<{
    host: string;
    port: number;
  }>;
  join_command?: string;
  certificate_key?: string;
}) => {
  try {
    const response = await api.kubernetes.request<ServerDetails>(
      'createServer',
      data
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 생성 실패:', error as Error);
    throw error;
  }
};

// 서버 수정
export const updateServer = async (
  id: number,
  data: {
    name?: string;
    infra_id?: number;
    type?: string;
    hops?: Array<{
      host: string;
      port: number;
    }>;
    join_command?: string;
    certificate_key?: string;
  }
) => {
  try {
    const response = await api.kubernetes.request<ServerDetails>(
      'updateServer',
      { id, ...data }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 수정 실패:', error as Error);
    throw error;
  }
};

// 서버 삭제
export const deleteServer = async (id: number) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'deleteServer',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 삭제 실패:', error as Error);
    throw error;
  }
};

// Kubernetes 인프라 가져오기
export const importKubernetesInfra = async (
  device_id: number,
  user_id: number,
  data: {
    name: string;
    type: string;
    info: string;
    hops: Array<{
      host: string;
      port: number | string;
      username: string;
      password: string;
    }>;
  }
) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>(
      'importKubernetesInfra',
      { device_id, user_id, ...data }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data;
  } catch (error) {
    logger.error('Kubernetes 인프라 가져오기 실패:', error as Error);
    throw error;
  }
};
