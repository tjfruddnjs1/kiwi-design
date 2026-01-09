import { apiClient } from '../client';
import type { StandardApiResponse } from '../types';

// ---------------------- Types ----------------------

/**
 * 프론트엔드에서 기관 정보를 표시할 때 사용하는 DTO 타입입니다.
 * 소유자 ID 대신 이메일이 포함됩니다.
 * Note: This type is exported for use by other modules that import from this file.
 */
export interface OrganizationDTO {
  id: number;
  name: string;
  status: 'Active' | 'Pending';
  planType: 'Free' | 'Standard' | 'Enterprise';
  ownerEmail: string; // 소유자 이메일
  managerCount: number; // 관리자 수
  managerEmails: string[]; // 관리자 이메일 목록
  businessRegistrationNumber: string | null;
  billingAddress: string | null;
  createdAt: string; // ISO 8601 형식 날짜 문자열
  lastModified: string; // ISO 8601 형식 날짜 문자열
}

/**
 * 새 기관 생성 및 수정 요청에 사용되는 Body 타입입니다.
 * managerUserIds는 생성 시 자동으로 organization_members에 Manager role로 추가됩니다.
 */
export interface OrganizationRequest {
  name: string;
  status: 'Active' | 'Pending';
  planType: 'Free' | 'Standard' | 'Enterprise';
  managerUserIds: number[]; // 생성 시 Manager role로 추가될 사용자 ID 목록 (여러 명 가능)
  businessRegistrationNumber?: string | null;
  billingAddress?: string | null;
}

/**
 * 기관 멤버 정보 DTO
 * 기관 소속 사용자의 정보와 역할을 표시합니다.
 */
export interface OrganizationMemberDTO {
  id: number;
  email: string;
  name: string;
  role: 'Admin' | 'Manager' | 'User'; // 시스템 전체 역할
  organizationRole?: 'Owner' | 'Admin' | 'Member'; // 기관 내 역할
  permissions?: string[]; // 탭 접근 권한: ["infra", "service", "backup", "device"]
  joinedAt?: string; // 기관 가입일
  createdAt: string;
}

export interface GitUrlDTO {
  id: number;
  organization_id: number;
  gitlab_url: string;
}

/**
 * Owner 전용 - 모든 사용자 정보와 소속 기관 목록
 */
export interface UserWithOrgsDTO {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  organizations: {
    organizationId: number;
    organizationName: string;
    role: 'Owner' | 'Manager' | 'Member';
    permissions: string[];
  }[];
}

// ---------------------- API Endpoints ----------------------

export const organizationApi = {
  /**
   * 모든 기관 목록을 조회합니다.
   * @returns OrganizationDTO 배열을 포함하는 응답
   */
  getAllOrganizations: (): Promise<StandardApiResponse<OrganizationDTO[]>> => {
    return apiClient.request<OrganizationDTO[], Record<string, never>>(
      '/organization',
      'getAllOrganizations',
      {}
    );
  },

  getMyOrganizations: (): Promise<StandardApiResponse<OrganizationDTO[]>> => {
    return apiClient.request<OrganizationDTO[], Record<string, never>>(
      '/organization',
      'getMyOrganizations',
      {}
    );
  },

  /**
   * 특정 ID의 기관 정보를 조회합니다.
   * @param id 조회할 기관의 ID
   * @returns OrganizationDTO를 포함하는 응답
   */
  getOrganizationByID: (
    id: number
  ): Promise<StandardApiResponse<OrganizationDTO>> => {
    return apiClient.request<OrganizationDTO, { id: number }>(
      '/organization',
      'getOrganizationByID',
      { id }
    );
  },

  /**
   * 새 기관을 등록합니다.
   * @param data 생성할 기관 정보
   * @returns 생성된 OrganizationDTO를 포함하는 응답
   */
  createOrganization: (
    data: OrganizationRequest
  ): Promise<StandardApiResponse<OrganizationDTO>> => {
    return apiClient.request<OrganizationDTO, OrganizationRequest>(
      '/organization',
      'createOrganization',
      data
    );
  },

  /**
   * 특정 ID의 기관 정보를 수정합니다.
   * @param id 수정할 기관의 ID
   * @param data 수정 내용 (ID 제외)
   * @returns 수정된 OrganizationDTO를 포함하는 응답
   */
  updateOrganization: (
    id: number,
    data: Omit<OrganizationRequest, 'id'> // ID는 URL/파라미터로 전달되므로 제외
  ): Promise<StandardApiResponse<OrganizationDTO>> => {
    // 백엔드에서 ID를 파라미터로 받도록 설계했다고 가정하고 ID를 포함하여 요청합니다.
    const requestData = { id, ...data };
    return apiClient.request<OrganizationDTO, typeof requestData>(
      '/organization',
      'updateOrganization',
      requestData
    );
  },

  /**
   * 특정 ID의 기관을 삭제합니다.
   * @param id 삭제할 기관의 ID
   * @returns 성공/실패 여부만 포함하는 응답
   */
  deleteOrganization: (id: number): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { id: number }>(
      '/organization',
      'deleteOrganization',
      { id }
    );
  },

  /**
   * 특정 기관의 멤버 목록을 조회합니다.
   * @param organizationId 조회할 기관의 ID
   * @returns 기관 멤버 목록을 포함하는 응답
   */
  getOrganizationMembers: (
    organizationId: number
  ): Promise<StandardApiResponse<OrganizationMemberDTO[]>> => {
    return apiClient.request<
      OrganizationMemberDTO[],
      { organizationId: number }
    >('/organization', 'getOrganizationMembers', { organizationId });
  },

  /**
   * Owner 전용 - 모든 사용자 목록과 소속 기관 정보를 조회합니다.
   * @returns 전체 사용자 목록 (각 사용자의 기관 소속 정보 포함)
   */
  getAllUsersForOwner: (): Promise<StandardApiResponse<UserWithOrgsDTO[]>> => {
    return apiClient.request<UserWithOrgsDTO[], Record<string, never>>(
      '/organization',
      'getAllUsersForOwner',
      {}
    );
  },

  /**
   * 기관에 새 멤버를 초대합니다.
   * @param organizationId 기관 ID
   * @param inviteData 초대할 사용자 정보 (이메일 또는 userId)
   * @returns 성공/실패 응답
   */
  inviteMember: (
    organizationId: number,
    inviteData: { email?: string; userId?: number }
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<
      void,
      { organizationId: number; email?: string; userId?: number }
    >('/organization', 'inviteMember', { organizationId, ...inviteData });
  },

  /**
   * 기관에서 멤버를 제거합니다.
   * @param organizationId 기관 ID
   * @param userId 제거할 사용자 ID
   * @returns 성공/실패 응답
   */
  removeMember: (
    organizationId: number,
    userId: number
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { organizationId: number; userId: number }>(
      '/organization',
      'removeMember',
      { organizationId, userId }
    );
  },

  /**
   * 기관 멤버의 역할과 권한을 수정합니다.
   * @param organizationId 기관 ID
   * @param userId 사용자 ID
   * @param role 기관 내 역할 ('Owner' | 'Manager' | 'Member')
   * @param permissions 탭 접근 권한 배열
   * @returns 성공/실패 응답
   */
  updateMemberRole: (
    organizationId: number,
    userId: number,
    role: 'Owner' | 'Manager' | 'Member',
    permissions: string[]
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<
      void,
      {
        organizationId: number;
        userId: number;
        role: string;
        permissions: string[];
      }
    >('/organization', 'updateMemberRole', {
      organizationId,
      userId,
      role,
      permissions,
    });
  },

  getGitUrls: (
    organizationId: number
  ): Promise<StandardApiResponse<GitUrlDTO[]>> => {
    return apiClient.request<
      GitUrlDTO[],
      {
        organizationId: number;
      }
    >('/organization', 'getGitlabUrls', {
      organizationId,
    });
  },

  addGitUrl: (
    organizationId: number,
    gitlabUrl: string
  ): Promise<StandardApiResponse<GitUrlDTO>> => {
    return apiClient.request<
      GitUrlDTO,
      {
        organizationId: number;
        gitlabUrl: string;
      }
    >('/organization', 'addGitlabUrl', {
      organizationId,
      gitlabUrl,
    });
  },

  removeGitlabUrl: (
    id: number,
    organizationId: number
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<
      void,
      {
        id: number;
        organizationId: number;
      }
    >('/organization', 'removeGitlabUrl', {
      id,
      organizationId,
    });
  },

  // ---------------------- Owner 전용 API ----------------------

  /**
   * Owner 전용 - 사용자를 기관에 직접 추가합니다.
   * @param userId 추가할 사용자 ID
   * @param organizationId 기관 ID
   * @param role 기관 내 역할 (기본값: Member)
   * @param permissions 탭 접근 권한 배열
   * @returns 성공/실패 응답
   */
  addUserToOrganization: (
    userId: number,
    organizationId: number,
    role: 'Owner' | 'Manager' | 'Member' = 'Member',
    permissions: string[] = ['infra', 'service', 'backup', 'device']
  ): Promise<
    StandardApiResponse<{
      userId: number;
      organizationId: number;
      organizationName: string;
      role: string;
      permissions: string[];
    }>
  > => {
    return apiClient.request<
      {
        userId: number;
        organizationId: number;
        organizationName: string;
        role: string;
        permissions: string[];
      },
      {
        userId: number;
        organizationId: number;
        role: string;
        permissions: string[];
      }
    >('/organization', 'addUserToOrganization', {
      userId,
      organizationId,
      role,
      permissions,
    });
  },

  /**
   * Owner 전용 - 사용자를 기관에서 제거합니다.
   * @param userId 제거할 사용자 ID
   * @param organizationId 기관 ID
   * @returns 성공/실패 응답
   */
  removeUserFromOrganization: (
    userId: number,
    organizationId: number
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { userId: number; organizationId: number }>(
      '/organization',
      'removeUserFromOrganization',
      { userId, organizationId }
    );
  },

  /**
   * Owner 전용 - 사용자의 기관 소속을 일괄 업데이트합니다.
   * @param userId 사용자 ID
   * @param organizations 새로운 기관 소속 목록
   * @returns 성공/실패 응답
   */
  updateUserOrganizations: (
    userId: number,
    organizations: {
      organizationId: number;
      role: 'Owner' | 'Manager' | 'Member';
      permissions: string[];
    }[]
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<
      void,
      {
        userId: number;
        organizations: {
          organizationId: number;
          role: string;
          permissions: string[];
        }[];
      }
    >('/organization', 'updateUserOrganizations', {
      userId,
      organizations,
    });
  },

  /**
   * 범용 요청 메서드 (선택적: userApi 패턴 유지를 위해 추가)
   */
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.request<TResponse, Record<string, unknown>>(
      '/organization',
      action,
      parameters
    );
  },
} as const;

export default organizationApi;
