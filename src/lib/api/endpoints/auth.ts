// 인증 관련 API 엔드포인트
// 로그인, 회원가입, 토큰 관리 등 인증 관련 기능을 제공합니다

import { apiClient } from '../client';
import type {
  StandardApiResponse,
  AuthCredentials,
  AuthResponse,
  User,
} from '../types';

// ==================== 인증 API ====================

export const authApi = {
  /**
   * 로그인
   */
  login: async (
    credentials: AuthCredentials
  ): Promise<StandardApiResponse<AuthResponse>> => {
    return apiClient.post<AuthCredentials, AuthResponse>(
      '/auth/login',
      credentials
    );
  },

  /**
   * 회원가입
   */
  signup: async (
    userInfo: AuthCredentials
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.post<AuthCredentials, void>('/auth/signup', userInfo);
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<StandardApiResponse<void>> => {
    return apiClient.post<void, void>('/auth/logout');
  },

  /**
   * 토큰 갱신
   */
  refreshToken: async (): Promise<StandardApiResponse<{ token: string }>> => {
    return apiClient.post<void, { token: string }>('/auth/refresh');
  },

  /**
   * 토큰 유효성 검사
   */
  checkToken: async (): Promise<StandardApiResponse<{ valid: boolean }>> => {
    return apiClient.get<{ valid: boolean }>('/auth/check');
  },

  /**
   * 현재 사용자 정보 조회
   */
  getCurrentUser: async (): Promise<StandardApiResponse<User>> => {
    return apiClient.get<User>('/auth/me');
  },
};

export default authApi;
