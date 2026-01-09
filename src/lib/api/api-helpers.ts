// 복구된 API 헬퍼 유틸리티 (요약 버전)
// 기존 kubernetes-simplified.ts 등에서 참조하므로 최소 구현으로 복원

import { apiClient } from './client';
import type { StandardApiResponse } from './types';
import { logger } from '../../utils/logger';

export interface SshHop {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface ApiRequestOptions {
  timeout?: number;
  showErrorMessage?: boolean;
  showSuccessMessage?: boolean;
  successMessage?: string;
  enableRetry?: boolean;
  maxRetries?: number;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
  commandResults?: CommandResult[];
  details?: Record<string, unknown>;
}

export interface BaseServerRequest {
  server_id?: number;
  id?: number;
  infra_id?: number;
  hops?: SshHop[];
}

export async function kubernetesRequest<
  TResponse = unknown,
  TRequest = unknown,
>(
  action: string,
  parameters: TRequest,
  options?: ApiRequestOptions
): Promise<StandardApiResponse<TResponse>> {
  return apiClient.kubernetes<TResponse, TRequest>(action, parameters, options);
}

export async function serverOperation<TResponse = CommandResult>(
  action: string,
  params: Record<string, unknown>,
  operationName: string,
  options?: ApiRequestOptions
): Promise<TResponse> {
  const response = await kubernetesRequest<TResponse>(action, params, {
    showSuccessMessage: true,
    successMessage: `${operationName}이(가) 완료되었습니다.`,
    ...options,
  });

  return validateEntityResponse(response, operationName);
}

export async function listOperation<TResponse>(
  action: string,
  params: Record<string, unknown>,
  operationName: string,
  options?: ApiRequestOptions
): Promise<TResponse[]> {
  const response = await kubernetesRequest<TResponse[]>(
    action,
    params,
    options
  );

  return validateListResponse(response, operationName);
}

export async function createOperation<
  TResponse,
  TRequest = Record<string, unknown>,
>(
  action: string,
  data: TRequest,
  operationName: string,
  options?: ApiRequestOptions
): Promise<TResponse> {
  const response = await kubernetesRequest<TResponse, TRequest>(action, data, {
    showSuccessMessage: true,
    successMessage: `${operationName}이(가) 성공적으로 생성되었습니다.`,
    ...options,
  });

  return validateEntityResponse(response, operationName);
}

export async function updateOperation<
  TResponse,
  TRequest = Record<string, unknown>,
>(
  action: string,
  data: TRequest,
  operationName: string,
  options?: ApiRequestOptions
): Promise<TResponse> {
  const response = await kubernetesRequest<TResponse, TRequest>(action, data, {
    showSuccessMessage: true,
    successMessage: `${operationName}이(가) 성공적으로 수정되었습니다.`,
    ...options,
  });

  return validateEntityResponse(response, operationName);
}

export async function deleteOperation<TResponse = { success: boolean }>(
  action: string,
  params: Record<string, unknown>,
  operationName: string,
  options?: ApiRequestOptions
): Promise<TResponse> {
  const response = await kubernetesRequest<TResponse>(action, params, {
    showSuccessMessage: true,
    successMessage: `${operationName}이(가) 성공적으로 삭제되었습니다.`,
    ...options,
  });

  return validateEntityResponse(response, operationName);
}

export function validateListResponse<T>(
  response: StandardApiResponse<T[]>,
  operation: string
): T[] {
  if (!response.success) {
    logger.warn(`${operation} 실패:`, {
      error: response.error || '알 수 없는 오류',
    });

    return [];
  }

  return response.data || [];
}

export function validateEntityResponse<T>(
  response: StandardApiResponse<T>,
  operation: string
): T {
  if (
    !response.success ||
    response.data === undefined ||
    response.data === null
  ) {
    throw new Error(
      response.error || `${operation} 실패: 응답 데이터가 없습니다`
    );
  }

  return response.data;
}

export function normalizeServerId<
  T extends { id?: number; server_id?: number },
>(params: T & Record<string, unknown>): Record<string, unknown> {
  const { id, server_id: serverId, ...rest } = params;

  return {
    server_id: serverId || id,
    ...rest,
  } as Record<string, unknown>;
}
