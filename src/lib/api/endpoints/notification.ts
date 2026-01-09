import { apiClient } from '../client';
import type { StandardApiResponse } from '../types';

// ---------------------- Types ----------------------

/**
 * 알림 타입
 */
export type NotificationType =
  | 'organization_invite'
  | 'system'
  | 'pipeline'
  | 'other';

/**
 * 알림 상태
 */
export type NotificationStatus = 'pending' | 'accepted' | 'rejected' | 'read';

/**
 * 알림 데이터 (JSON 필드)
 */
export interface NotificationData {
  organizationId?: number;
  organizationName?: string;
  inviterEmail?: string;
  inviterName?: string;

  // 파이프라인 관련 필드
  pipelineId?: number;
  serviceId?: number;
  serviceName?: string;
  stage?: 'source' | 'sast' | 'build' | 'sca' | 'deploy' | 'operation' | 'dast';
  stageStatus?: 'started' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * 알림 DTO
 */
export interface NotificationDTO {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  status: NotificationStatus;
  createdAt: string; // ISO 8601 형식
  updatedAt: string; // ISO 8601 형식
}

/**
 * 읽지 않은 알림 개수 응답
 */
export interface UnreadCountDTO {
  count: number;
}

// ---------------------- API Endpoints ----------------------

export const notificationApi = {
  /**
   * 사용자의 알림 목록을 조회합니다.
   * @param limit 조회할 알림 개수 (기본값: 50)
   * @returns 알림 목록
   */
  getUserNotifications: (
    limit?: number
  ): Promise<StandardApiResponse<NotificationDTO[]>> => {
    return apiClient.request<NotificationDTO[], { limit?: number }>(
      '/notification',
      'getUserNotifications',
      limit ? { limit } : {}
    );
  },

  /**
   * 읽지 않은 알림 개수를 조회합니다.
   * @returns 읽지 않은 알림 개수
   */
  getUnreadCount: (): Promise<StandardApiResponse<UnreadCountDTO>> => {
    return apiClient.request<UnreadCountDTO, Record<string, never>>(
      '/notification',
      'getUnreadCount',
      {}
    );
  },

  /**
   * 기관 초대를 수락합니다.
   * @param notificationId 알림 ID
   * @returns 성공/실패 응답
   */
  acceptInvitation: (
    notificationId: number
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { notificationId: number }>(
      '/notification',
      'acceptInvitation',
      { notificationId }
    );
  },

  /**
   * 기관 초대를 거절합니다.
   * @param notificationId 알림 ID
   * @returns 성공/실패 응답
   */
  rejectInvitation: (
    notificationId: number
  ): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { notificationId: number }>(
      '/notification',
      'rejectInvitation',
      { notificationId }
    );
  },

  /**
   * 알림을 읽음으로 표시합니다.
   * @param notificationId 알림 ID
   * @returns 성공/실패 응답
   */
  markAsRead: (notificationId: number): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, { notificationId: number }>(
      '/notification',
      'markAsRead',
      { notificationId }
    );
  },

  /**
   * 모든 알림을 읽음으로 표시합니다.
   * @returns 성공/실패 응답
   */
  markAllAsRead: (): Promise<StandardApiResponse<void>> => {
    return apiClient.request<void, Record<string, never>>(
      '/notification',
      'markAllAsRead',
      {}
    );
  },

  /**
   * 범용 요청 메서드
   */
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.request<TResponse, Record<string, unknown>>(
      '/notification',
      action,
      parameters
    );
  },
} as const;

export default notificationApi;
