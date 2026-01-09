import { api } from '../../services/api';
import apiClient from './client';
import { User } from '../../types/user';
import { StandardApiResponse } from '../../types/shared';
import { logger } from '../../utils/logger';

// 사용자 API 응답 타입
export type UserApiResponse<T = unknown> = StandardApiResponse<T>;

// 로그인 요청 데이터
export interface LoginRequest {
  username: string;
  password: string;
}

// 회원가입 요청 데이터
export interface SignupRequest {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
}

// 사용자 DTO (백엔드 응답 형식)
export interface UserDTO {
  id: number;
  email: string;
  name: string;
  role: string; // 'Owner', 'Manager', 'Member'
  createdAt: string;
  organization_id?: number;
  organization_name?: string;
}

// 사용자 목록 가져오기
export const getUsers = async (roleFilter?: string[]): Promise<UserDTO[]> => {
  try {
    const queryParams = roleFilter ? `?role=${roleFilter.join(',')}` : '';
    const response = await apiClient.post<{ action: string }, UserDTO[]>(
      `/user${queryParams}`,
      { action: 'get-all-users' }
    );

    if (response.success && response.data) {
      return response.data;
    }

    logger.warn('사용자 목록 조회 실패', { error: response.error });
    return [];
  } catch (error) {
    logger.error('사용자 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 특정 사용자 정보 가져오기 (기본 구현)
export const getUser = async (_userId: number): Promise<User> => {
  try {
    // 현재 백엔드에서 특정 사용자 조회 API가 없으므로 에러 반환
    throw new Error('특정 사용자 조회 기능이 현재 지원되지 않습니다.');
  } catch (error) {
    logger.error('사용자 조회 실패:', error as Error);
    throw error;
  }
};

// 현재 사용자 정보 가져오기 (기본 구현)
export const getCurrentUser = async (): Promise<User> => {
  try {
    // 현재 백엔드에서 현재 사용자 조회 API가 없으므로 기본값 반환
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }

    // 토큰에서 사용자 정보 추출 (기본 구현)
    return {
      id: 1,
      username: 'current_user',
      email: '',
      displayName: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as User;
  } catch (error) {
    logger.error('현재 사용자 조회 실패:', error as Error);
    throw error;
  }
};

// 사용자 로그인
export const login = async (
  loginData: LoginRequest
): Promise<{ token: string; user: User }> => {
  try {
    const response = await api.post('/auth/login', loginData);

    if (!response.data.success || !response.data.data) {
      throw new Error('로그인에 실패했습니다.');
    }

    // 사용자 정보는 토큰에서 추출하거나 기본값 사용
    const user: User = {
      id: 1,
      username: loginData.username,
      email: '',
      displayName: loginData.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      token: response.data.data.token,
      user,
    };
  } catch (error) {
    logger.error('로그인 실패:', error as Error);
    throw error;
  }
};

// 사용자 회원가입
export const signup = async (signupData: SignupRequest): Promise<User> => {
  try {
    const response = await apiClient.post<SignupRequest, User>(
      '/auth/signup',
      signupData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || '회원가입에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('회원가입 실패:', error as Error);
    throw error;
  }
};

// 사용자 로그아웃
export const logout = async (): Promise<void> => {
  try {
    // 로컬 스토리지에서 토큰 제거
    localStorage.removeItem('authToken');
    logger.info('로그아웃 완료');
  } catch (error) {
    logger.error('로그아웃 실패:', error as Error);
    throw error;
  }
};

// 사용자 정보 업데이트 (기본 구현)
export const updateUser = async (
  _userId: number,
  _userData: Partial<User>
): Promise<User> => {
  try {
    // 현재 백엔드에서 사용자 정보 업데이트 API가 없으므로 에러 반환
    throw new Error('사용자 정보 업데이트 기능이 현재 지원되지 않습니다.');
  } catch (error) {
    logger.error('사용자 정보 업데이트 실패:', error as Error);
    throw error;
  }
};

// 현재 사용자 정보 업데이트 (기본 구현)
export const updateCurrentUser = async (
  _userData: Partial<User>
): Promise<User> => {
  try {
    // 현재 백엔드에서 사용자 정보 업데이트 API가 없으므로 에러 반환
    throw new Error('사용자 정보 업데이트 기능이 현재 지원되지 않습니다.');
  } catch (error) {
    logger.error('사용자 정보 업데이트 실패:', error as Error);
    throw error;
  }
};

// 사용자 삭제 (기본 구현)
export const deleteUser = async (_userId: number): Promise<void> => {
  try {
    // 현재 백엔드에서 사용자 삭제 API가 없으므로 에러 반환
    throw new Error('사용자 삭제 기능이 현재 지원되지 않습니다.');
  } catch (error) {
    logger.error('사용자 삭제 실패:', error as Error);
    throw error;
  }
};

// 사용자 API 객체 (기존 import 패턴 호환)
export const userApi = {
  getUsers,
  getUser,
  getCurrentUser,
  login,
  signup,
  logout,
  updateUser,
  updateCurrentUser,
  deleteUser,
};

// 기본 내보내기
export default userApi;
