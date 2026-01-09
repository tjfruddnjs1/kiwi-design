// 서비스 관련 API 엔드포인트
// 서비스 CRUD, 배포 및 상태/로그 조회 기능을 제공합니다

import { apiClient } from '../client';
import type {
  StandardApiResponse,
  Service,
  ServiceCreateRequest,
  ServiceUpdateRequest,
} from '../types';

export const serviceApi = {
  // 통합 요청 함수 (기존 호환성 유지)
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.service<TResponse>(action, parameters);
  },

  // 목록 및 단건 조회
  list: (): Promise<StandardApiResponse<Service[]>> => {
    return apiClient.service<Service[]>('getServices', {});
  },

  status: (
    serviceId: number
  ): Promise<
    StandardApiResponse<{
      status: string;
      last_checked?: string;
    }>
  > => {
    return apiClient.service('status', { service_id: serviceId });
  },

  // 생성/수정/삭제
  create: (
    payload: ServiceCreateRequest
  ): Promise<StandardApiResponse<Service>> => {
    return apiClient.service<Service>('create', payload, {
      showSuccessMessage: true,
      successMessage: '서비스가 생성되었습니다.',
    });
  },

  update: (
    serviceId: number,
    payload: ServiceUpdateRequest
  ): Promise<StandardApiResponse<Service>> => {
    return apiClient.service<Service>('update', {
      service_id: serviceId,
      ...payload,
    });
  },

  remove: (
    serviceId: number
  ): Promise<StandardApiResponse<{ success: boolean }>> => {
    return apiClient.service<{ success: boolean }>('delete', {
      service_id: serviceId,
    });
  },

  // 배포/제어
  deploy: (params: {
    serviceId: number;
    infraId?: number;
    force?: boolean;
  }): Promise<StandardApiResponse<void>> => {
    return apiClient.service<void>('deploy', {
      service_id: params.serviceId,
      infra_id: params.infraId,
      force: params.force,
    });
  },

  start: (serviceId: number): Promise<StandardApiResponse<void>> => {
    return apiClient.service<void>('start', { service_id: serviceId });
  },

  stop: (serviceId: number): Promise<StandardApiResponse<void>> => {
    return apiClient.service<void>('stop', { service_id: serviceId });
  },

  restart: (serviceId: number): Promise<StandardApiResponse<void>> => {
    return apiClient.service<void>('restart', { service_id: serviceId });
  },

  // 로그
  logs: (
    serviceId: number,
    lines: number = 100
  ): Promise<StandardApiResponse<{ logs: string }>> => {
    return apiClient.service<{ logs: string }>('logs', {
      service_id: serviceId,
      lines,
    });
  },
} as const;

export default serviceApi;
