import { api } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { InfraPermission, User } from './types';

// 인프라 권한 목록 조회
export const getInfraPermissions = async (infraId: number) => {
  try {
    const response = await api.kubernetes.request<InfraPermission[]>(
      'getInfraPermissions',
      { infra_id: infraId }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('인프라 권한 조회 실패:', error as Error);
    throw error;
  }
};

// 모든 사용자 조회
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.kubernetes.request<User[]>('getAllUsers', {});

    if (!response?.data?.success) {
      return [];
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch users:', error as Error);

    return [];
  }
};

// 인프라 권한 설정
export const setInfraPermission = async (params: {
  infra_id: number;
  email: string;
}) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'setInfraPermission',
      params
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 권한 설정 실패:', error as Error);
    throw error;
  }
};

// 인프라 권한 제거
export const removeInfraPermission = async (params: {
  infra_id: number;
  user_id: number;
}) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'removeInfraPermission',
      params
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 권한 제거 실패:', error as Error);
    throw error;
  }
};
