/**
 * Permission API Client
 * 권한 관련 API 호출
 *
 * 참고: apiClient의 baseURL이 이미 '/api/v1'로 설정되어 있음
 */

import apiClient from './client';
import {
  PermissionDefinition,
  GroupedPermissions,
  UserPermissions,
  PermissionCheckResult,
} from '../../types/permission';

// 응답 타입
interface AllPermissionsResponse {
  success: boolean;
  data?: {
    permissions: PermissionDefinition[];
    grouped: GroupedPermissions;
  };
  error?: string;
}

interface MyPermissionsResponse {
  success: boolean;
  data?: UserPermissions;
  error?: string;
}

interface CheckPermissionResponse {
  success: boolean;
  has_permission?: boolean;
  permission?: string;
  error?: string;
}

interface GrantRevokeRequest {
  permission_id: number;
  organization_id: number;
  reason?: string;
}

interface GrantRevokeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// 사용자 권한 정보 타입
interface UserPermissionInfo {
  code: string;
  name_ko: string;
  category: string;
  granted_at?: string;
  granted_by?: number;
}

interface UserPermissionsListResponse {
  success: boolean;
  data?: UserPermissionInfo[];
  error?: string;
}

// Permission API
export const permissionApi = {
  /**
   * 모든 권한 정의 조회
   */
  getAllPermissions: async (): Promise<AllPermissionsResponse> => {
    try {
      const response = await apiClient.get<{
        permissions: PermissionDefinition[];
        grouped: GroupedPermissions;
      }>('/permissions');
      return {
        success: response.success,
        data: response.data,
        error: response.error,
      };
    } catch (error) {
      console.error('Failed to get all permissions:', error);
      return { success: false, error: 'Failed to fetch permissions' };
    }
  },

  /**
   * 카테고리별 권한 조회
   */
  getPermissionsByCategory: async (
    category: string
  ): Promise<{ success: boolean; data?: PermissionDefinition[]; error?: string }> => {
    try {
      const response = await apiClient.get<PermissionDefinition[]>(
        `/permissions/category/${category}`
      );
      return {
        success: response.success,
        data: response.data,
        error: response.error,
      };
    } catch (error) {
      console.error('Failed to get permissions by category:', error);
      return { success: false, error: 'Failed to fetch permissions' };
    }
  },

  /**
   * 내 권한 조회
   */
  getMyPermissions: async (): Promise<MyPermissionsResponse> => {
    try {
      const response = await apiClient.get<UserPermissions>('/permissions/me');
      return {
        success: response.success,
        data: response.data,
        error: response.error,
      };
    } catch (error) {
      console.error('Failed to get my permissions:', error);
      return { success: false, error: 'Failed to fetch my permissions' };
    }
  },

  /**
   * 특정 권한 보유 여부 확인
   */
  checkPermission: async (code: string): Promise<CheckPermissionResponse> => {
    try {
      const response = await apiClient.get<PermissionCheckResult>(
        `/permissions/check?code=${encodeURIComponent(code)}`
      );
      return {
        success: response.success,
        has_permission: response.data?.has_permission,
        permission: response.data?.permission,
      };
    } catch (error) {
      console.error('Failed to check permission:', error);
      return { success: false, error: 'Failed to check permission' };
    }
  },

  /**
   * 특정 사용자의 권한 목록 조회
   */
  getUserPermissions: async (userId: number): Promise<UserPermissionsListResponse> => {
    try {
      const response = await apiClient.get<UserPermissionInfo[]>(
        `/permissions/users/${userId}`
      );
      return {
        success: response.success,
        data: response.data,
        error: response.error,
      };
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return { success: false, error: 'Failed to fetch user permissions' };
    }
  },

  /**
   * 사용자에게 권한 부여
   */
  grantUserPermission: async (
    userId: number,
    request: GrantRevokeRequest
  ): Promise<GrantRevokeResponse> => {
    try {
      const response = await apiClient.post<GrantRevokeRequest, { message?: string }>(
        `/permissions/users/${userId}/grant`,
        request
      );
      return { success: response.success, message: response.data?.message, error: response.error };
    } catch (error) {
      console.error('Failed to grant permission:', error);
      return { success: false, error: 'Failed to grant permission' };
    }
  },

  /**
   * 사용자의 권한 회수
   */
  revokeUserPermission: async (
    userId: number,
    request: GrantRevokeRequest
  ): Promise<GrantRevokeResponse> => {
    try {
      const response = await apiClient.post<GrantRevokeRequest, { message?: string }>(
        `/permissions/users/${userId}/revoke`,
        request
      );
      return { success: response.success, message: response.data?.message, error: response.error };
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      return { success: false, error: 'Failed to revoke permission' };
    }
  },

  /**
   * 서비스별 권한 부여
   */
  grantServicePermission: async (
    serviceId: number,
    userId: number,
    request: { permission_id: number; reason?: string }
  ): Promise<GrantRevokeResponse> => {
    try {
      const response = await apiClient.post<
        { permission_id: number; reason?: string },
        { message?: string }
      >(`/permissions/services/${serviceId}/users/${userId}/grant`, request);
      return { success: response.success, message: response.data?.message, error: response.error };
    } catch (error) {
      console.error('Failed to grant service permission:', error);
      return { success: false, error: 'Failed to grant service permission' };
    }
  },
};

export default permissionApi;
