import { api } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { CommandResult, KubernetesNodeResponse } from './types';

// 노드 상태 조회
export const getNodeStatus = async (data: {
  id: number;
  infra_id: number;
  type: string;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<KubernetesNodeResponse>(
      'getNodeStatus',
      {
        server_id: data.id,
        infra_id: data.infra_id,
        type: data.type,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    const nodeData = response.data.data;

    if (!nodeData) {
      throw new Error('노드 데이터가 없습니다');
    }

    return {
      success: true,
      status: nodeData.status,
      lastChecked: nodeData.lastChecked,
      message: nodeData.message,
    };
  } catch (error) {
    logger.error('노드 상태 조회 실패:', error as Error);
    throw error;
  }
};

// 노드 제거
export const removeNode = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
  nodeName: string;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('removeNode', {
      server_id: data.id,
      hops: data.hops,
      nodeName: data.nodeName,
    });

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
    logger.error('노드 제거 실패:', error as Error);
    throw error;
  }
};

// 서버 시작
export const startServer = async (data: {
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
      'startServer',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error) {
    logger.error('서버 시작 실패:', error as Error);
    throw error;
  }
};

// 서버 중지
export const stopServer = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('stopServer', {
      server_id: data.id,
      hops: data.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error) {
    logger.error('서버 중지 실패:', error as Error);
    throw error;
  }
};

// 서버 재시작
export const restartServer = async (data: {
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
      'restartServer',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error) {
    logger.error('서버 재시작 실패:', error as Error);
    throw error;
  }
};

// 워커 노드 삭제
export const deleteWorker = async (data: {
  id: number;
  main_id: number;
  password: string;
  main_password: string;
  hops: Array<{
    host: string;
    port: string;
    username: string;
    password: string;
  }>;
  main_hops: Array<{
    host: string;
    port: string;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'deleteWorker',
      {
        server_id: data.id,
        main_id: data.main_id,
        password: data.password,
        main_password: data.main_password,
        hops: data.hops,
        main_hops: data.main_hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('워커 노드 삭제 실패:', error as Error);
    throw error;
  }
};

// 마스터 노드 삭제
export const deleteMaster = async (data: {
  id: number;
  password: string;
  lb_password?: string;
  main_password?: string;
  hops: Array<{
    host: string;
    port: string;
    username: string;
    password: string;
  }>;
  lb_hops?: Array<{
    host: string;
    port: string;
    username: string;
    password: string;
  }>;
  main_hops?: Array<{
    host: string;
    port: string;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'deleteMaster',
      {
        server_id: data.id,
        password: data.password,
        lb_password: data.lb_password,
        main_password: data.main_password,
        hops: data.hops,
        lb_hops: data.lb_hops,
        main_hops: data.main_hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || {};
  } catch (error) {
    logger.error('마스터 노드 삭제 실패:', error as Error);
    throw error;
  }
};
