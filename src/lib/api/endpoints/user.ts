// 사용자 관련 API 엔드포인트
// GitLab 토큰 상태 확인 및 저장 등의 기능을 제공합니다

import { apiClient } from '../client';
import type { StandardApiResponse } from '../types';

// 백엔드의 UserDTO와 일치하는 타입을 정의합니다.
export interface UserDTO {
  id: number;
  email: string;
  name: string;
  role: 'Admin' | 'Manager' | 'User'; // 시스템 전체 역할 (Admin: 시스템 소유자, Manager: 기관 관리자, User: 일반 사용자)
  organizationId?: number; // organization_members 테이블의 organization_id
  createdAt: string; // ISO 8601 string
}

export const userApi = {
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.request<TResponse, Record<string, unknown>>(
      '/user',
      action,
      parameters
    );
  },

  checkGitLabStatus: (): Promise<
    StandardApiResponse<{ hasToken: boolean; gitlabURL: string }>
  > => {
    return apiClient.request<
      { hasToken: boolean; gitlabURL: string },
      Record<string, never>
    >('/user', 'check-gitlab-status', {});
  },

  saveGitLabInfo: (
    gitlabURL: string,
    accessToken: string
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { gitlabURL: string; accessToken: string }>(
      '/user',
      'save-gitlab-info',
      { gitlabURL, accessToken }
    );
  },

  getAllUsers: (): Promise<StandardApiResponse<UserDTO[]>> => {
    return apiClient.request<UserDTO[], Record<string, unknown>>(
      '/user',
      'get-all-users',
      {}
    );
  },
} as const;

export default userApi;
