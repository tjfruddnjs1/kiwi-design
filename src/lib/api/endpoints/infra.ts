// 인프라 관련 API 엔드포인트
// 인프라 및 서버 관리 기능을 제공합니다

import { apiClient } from '../client';
import type {
  StandardApiResponse,
  Infrastructure,
  InfrastructureCreateRequest,
  InfrastructureUpdateRequest,
  BaseServer,
  InfraPermission,
  ApiRequestOptions,
} from '../types';

// ==================== 인프라 API ====================

export const infraApi = {
  /**
   * 통합 요청 함수 (기존 호환성 유지)
   */
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.infra<TResponse>(action, parameters, options);
  },

  // ==================== 인프라 관리 ====================

  /**
   * 인프라 목록 조회 (기관별 필터링 지원)
   */
  list: (organizationId?: number | null): Promise<StandardApiResponse<Infrastructure[]>> => {
    return apiClient.infra<Infrastructure[]>('list', {
      ...(organizationId && { organization_id: organizationId }),
    });
  },

  /**
   * 인프라 상세 조회
   */
  getById: (id: number): Promise<StandardApiResponse<Infrastructure>> => {
    return apiClient.infra<Infrastructure>('getById', { id });
  },

  /**
   * 인프라 생성
   */
  create: (
    data: InfrastructureCreateRequest
  ): Promise<StandardApiResponse<Infrastructure>> => {
    return apiClient.infra<Infrastructure>('create', data, {
      showSuccessMessage: true,
      successMessage: '인프라가 성공적으로 생성되었습니다.',
    });
  },

  /**
   * 인프라 수정
   */
  update: (
    id: number,
    data: InfrastructureUpdateRequest
  ): Promise<StandardApiResponse<Infrastructure>> => {
    return apiClient.infra<Infrastructure>(
      'update',
      { id, ...data },
      {
        showSuccessMessage: true,
        successMessage: '인프라가 성공적으로 수정되었습니다.',
      }
    );
  },

  /**
   * 인프라 삭제
   */
  delete: (id: number): Promise<StandardApiResponse<{ success: boolean }>> => {
    return apiClient.infra<{ success: boolean }>(
      'delete',
      { id },
      {
        showSuccessMessage: true,
        successMessage: '인프라가 성공적으로 삭제되었습니다.',
      }
    );
  },

  // ==================== 서버 관리 ====================

  /**
   * 서버 목록 조회
   */
  listServers: (
    infraId: number
  ): Promise<StandardApiResponse<BaseServer[]>> => {
    return apiClient.infra<BaseServer[]>('list-servers', { infra_id: infraId });
  },

  /**
   * 서버 생성
   */
  createServer: (data: {
    infra_id: number;
    name: string;
    ip: string;
    port: number;
    type: string;
    hops?: string; // JSON 문자열
  }): Promise<StandardApiResponse<BaseServer>> => {
    return apiClient.infra<BaseServer>('create-server', data, {
      showSuccessMessage: true,
      successMessage: '서버가 성공적으로 생성되었습니다.',
    });
  },

  /**
   * 서버 수정
   */
  updateServer: (
    serverId: number,
    data: {
      name?: string;
      ip?: string;
      port?: number;
      type?: string;
      hops?: string; // JSON 문자열
    }
  ): Promise<StandardApiResponse<BaseServer>> => {
    return apiClient.infra<BaseServer>(
      'update-server',
      { server_id: serverId, ...data },
      {
        showSuccessMessage: true,
        successMessage: '서버가 성공적으로 수정되었습니다.',
      }
    );
  },

  /**
   * 서버 삭제
   */
  deleteServer: (
    serverId: number
  ): Promise<StandardApiResponse<{ success: boolean }>> => {
    return apiClient.infra<{ success: boolean }>(
      'delete-server',
      { server_id: serverId },
      {
        showSuccessMessage: true,
        successMessage: '서버가 성공적으로 삭제되었습니다.',
      }
    );
  },

  /**
   * 서버 상태 확인
   */
  checkServerStatus: (
    serverId: number
  ): Promise<
    StandardApiResponse<{
      status: string;
      last_checked: string;
      details?: Record<string, unknown>;
    }>
  > => {
    return apiClient.infra<{
      status: string;
      last_checked: string;
      details?: Record<string, unknown>;
    }>('check-server-status', { server_id: serverId });
  },

  // ==================== 권한 관리 ====================

  /**
   * 인프라 권한 목록 조회
   */
  getPermissions: (
    infraId: number
  ): Promise<StandardApiResponse<InfraPermission[]>> => {
    return apiClient.infra<InfraPermission[]>('getInfraPermissions', {
      infra_id: infraId,
    });
  },

  /**
   * 인프라 권한 추가
   */
  addPermission: (params: {
    infra_id: number;
    email: string;
    role?: 'admin' | 'member';
  }): Promise<StandardApiResponse<{ success: boolean }>> => {
    return apiClient.infra<{ success: boolean }>('setInfraPermission', params, {
      showSuccessMessage: true,
      successMessage: '권한이 성공적으로 추가되었습니다.',
    });
  },

  /**
   * 인프라 권한 제거
   */
  removePermission: (params: {
    infra_id?: number;
    user_id: number;
  }): Promise<StandardApiResponse<{ success: boolean }>> => {
    return apiClient.infra<{ success: boolean }>(
      'removeInfraPermission',
      params,
      {
        showSuccessMessage: true,
        successMessage: '권한이 성공적으로 제거되었습니다.',
      }
    );
  },

  /**
   * 유저별 인프라 목록 조회 (권한 있는 것만)
   */
  getInfrasByUserId: (
    userId: number
  ): Promise<StandardApiResponse<Infrastructure[]>> => {
    return apiClient.infra<Infrastructure[]>('infraUserIdOnly', {
      userID: userId,
    });
  },

  // ==================== 외부 연결 ====================

  /**
   * 외부 Kubernetes 클러스터 연결 테스트
   */
  testExternalKubernetes: (params: {
    kubeconfig: string;
  }): Promise<
    StandardApiResponse<{
      success: boolean;
      nodes?: number;
      version?: string;
      error?: string;
    }>
  > => {
    return apiClient.infra<{
      success: boolean;
      nodes?: number;
      version?: string;
      error?: string;
    }>('test-external-kubernetes', params);
  },

  /**
   * 외부 Docker 연결 테스트
   */
  testExternalDocker: (params: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  }): Promise<
    StandardApiResponse<{
      success: boolean;
      version?: string;
      containers?: number;
      error?: string;
    }>
  > => {
    return apiClient.infra<{
      success: boolean;
      version?: string;
      containers?: number;
      error?: string;
    }>('test-external-docker', params);
  },

  /**
   * 외부 런타임 import 검증
   */
  validationImportData: (
    runtimeName: string,
    serverType: string,
    hops: {
      host: string;
      port: number;
      username: string;
      password: string;
    }[],
    userId: number
  ): Promise<StandardApiResponse<{ success: boolean; error?: string }>> => {
    return apiClient.infra<{ success: boolean; error?: string }>(
      'validationImportData',
      { runtimeName, type: serverType, hops, userId }
    );
  },
  // ==================== 리소스 모니터링 ====================

  /**
   * 인프라 리소스 사용량 조회
   */
  getResourceUsage: (
    infraId: number
  ): Promise<
    StandardApiResponse<{
      cpu_usage: string;
      memory_usage: string;
      disk_usage: string;
      network_usage?: string;
      last_updated: string;
    }>
  > => {
    return apiClient.infra<{
      cpu_usage: string;
      memory_usage: string;
      disk_usage: string;
      network_usage?: string;
      last_updated: string;
    }>('get-resource-usage', { infra_id: infraId });
  },

  /**
   * 인프라 상태 요약 조회
   */
  getStatusSummary: (
    infraId: number
  ): Promise<
    StandardApiResponse<{
      total_servers: number;
      active_servers: number;
      total_services: number;
      running_services: number;
      health_score: number;
      alerts?: Array<{
        level: 'warning' | 'error' | 'info';
        message: string;
        timestamp: string;
      }>;
    }>
  > => {
    return apiClient.infra<{
      total_servers: number;
      active_servers: number;
      total_services: number;
      running_services: number;
      health_score: number;
      alerts?: Array<{
        level: 'warning' | 'error' | 'info';
        message: string;
        timestamp: string;
      }>;
    }>('get-status-summary', { infra_id: infraId });
  },
};

export default infraApi;
