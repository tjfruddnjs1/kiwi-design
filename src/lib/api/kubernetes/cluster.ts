import { api } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { CommandResult, KubernetesClusterInfo } from './types';

interface NodeList {
  success: boolean;
  data: Array<{
    name: string;
    status: string;
    role: string;
    age: string;
    version: string;
  }>;
}

// 로드밸런서 설치
export const installLoadBalancer = async (data: {
  id: number;
  infra_id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'installLoadBalancer',
      {
        server_id: data.id,
        infra_id: data.infra_id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    const result = response.data.data;

    if (!result) {
      throw new Error('명령 결과 데이터가 없습니다');
    }

    return {
      success: result.success || false,
      message: result.message,
      error: result.error,
      commandResults: result.commandResults || [],
    };
  } catch (error) {
    logger.error('로드밸런서 설치 실패:', error as Error);
    throw error;
  }
};

// 첫 번째 마스터 설치
export const installFirstMaster = async (data: {
  id: number;
  infra_id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  lb_hops?: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  password?: string;
  lb_password?: string;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'installFirstMaster',
      {
        server_id: data.id,
        infra_id: data.infra_id,
        hops: data.hops,
        lb_hops: data.lb_hops,
        password: data.password,
        lb_password: data.lb_password,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('첫 번째 마스터 설치 실패:', error as Error);
    throw error;
  }
};

// 마스터 조인
export const joinMaster = async (data: {
  id: number;
  infra_id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  lb_hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  password: string;
  lb_password: string;
  main_id: number;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('joinMaster', {
      server_id: data.id,
      infra_id: data.infra_id,
      hops: data.hops,
      lb_hops: data.lb_hops,
      password: data.password,
      lb_password: data.lb_password,
      main_id: data.main_id,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('마스터 조인 실패:', error as Error);
    throw error;
  }
};

// 워커 조인
export const joinWorker = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  password: string;
  main_id: number;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('joinWorker', {
      server_id: data.id,
      hops: data.hops,
      password: data.password,
      main_id: data.main_id,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('워커 조인 실패:', error as Error);
    throw error;
  }
};

// 노드 계산
export const calculateNodes = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<NodeList>('calculateNodes', {
      server_id: data.id,
      hops: data.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('노드 계산 실패:', error as Error);
    throw error;
  }
};

// 리소스 계산
export const calculateResources = async (params: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<KubernetesClusterInfo>(
      'calculateResources',
      {
        server_id: params.id,
        hops: params.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('리소스 계산 실패:', error as Error);
    throw error;
  }
};

// 인증서 갱신
export const renewCertificate = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'renewCertificate',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('인증서 갱신 실패:', error as Error);
    throw error;
  }
};

// HA 재구축
export const rebuildHA = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('rebuildHA', {
      server_id: data.id,
      hops: data.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
    };
  } catch (error) {
    logger.error('HA 재구축 실패:', error as Error);
    throw error;
  }
};

// 첫 번째 마스터 재구축
export const rebuildFirstMaster = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  lb_hops?: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  password?: string;
  lb_password?: string;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'rebuildFirstMaster',
      {
        server_id: data.id,
        hops: data.hops,
        lb_hops: data.lb_hops,
        password: data.password,
        lb_password: data.lb_password,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('첫 번째 마스터 재구축 실패:', error as Error);
    throw error;
  }
};

// 마스터 재구축
export const rebuildMaster = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  lb_hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  password: string;
  lb_password: string;
  main_id: number;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'rebuildMaster',
      {
        server_id: data.id,
        hops: data.hops,
        lb_hops: data.lb_hops,
        password: data.password,
        lb_password: data.lb_password,
        main_id: data.main_id,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('마스터 재구축 실패:', error as Error);
    throw error;
  }
};

// 워커 재구축
export const rebuildWorker = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  password: string;
  main_id: number;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'rebuildWorker',
      {
        server_id: data.id,
        hops: data.hops,
        password: data.password,
        main_id: data.main_id,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('워커 재구축 실패:', error as Error);
    throw error;
  }
};
