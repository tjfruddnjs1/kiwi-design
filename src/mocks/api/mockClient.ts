/**
 * Mock API Client
 * 기존 UnifiedApiClient와 동일한 인터페이스를 제공하며 Mock 데이터를 반환
 */

import type { StandardApiResponse } from '../../lib/api/types';
import { delay, createApiResponse, createErrorResponse } from '../utils/delay';
import { mockAuthApi } from './auth.mock';
import { mockInfraApi } from './infra.mock';
import { mockServiceApi } from './service.mock';
import { mockBackupApi } from './backup.mock';
import { mockKubernetesApi } from './kubernetes.mock';
import { mockDockerApi } from './docker.mock';
import { mockOrganizationApi } from './organization.mock';
import { mockDashboardApi } from './dashboard.mock';
import { mockDeviceApi } from './device.mock';
import { mockDatabaseApi } from './database.mock';
import { mockGitsApi } from './gits.mock';

// API 에러 클래스 (기존과 호환)
export class MockApiError extends Error {
  public readonly statusCode: number;
  public readonly apiError: string;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'MockApiError';
    this.statusCode = statusCode;
    this.apiError = message;
  }
}

// Mock API 클라이언트 설정
interface MockApiClientConfig {
  baseURL?: string;
  timeout?: number;
  showErrorMessages?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  mockDelay?: number; // Mock 응답 지연 시간 (ms)
}

/**
 * Mock API 클라이언트
 * 실제 네트워크 요청 없이 Mock 데이터를 반환
 */
export class MockApiClient {
  private config: Required<MockApiClientConfig>;

  constructor(config: MockApiClientConfig = {}) {
    this.config = {
      baseURL: '/api/v1',
      timeout: 300000,
      showErrorMessages: true,
      enableRetry: false,
      maxRetries: 0,
      mockDelay: 300,
      ...config,
    };
  }

  // ==================== HTTP 메서드들 ====================

  async get<TResponse = unknown>(
    url: string,
    _config?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    await delay(this.config.mockDelay);

    // URL 기반 라우팅
    if (url.includes('/status') || url.includes('/health')) {
      return createApiResponse({ status: 'healthy' } as TResponse);
    }

    // dashboard 관련
    if (url.includes('/dashboard')) {
      return mockDashboardApi.handleGet(url) as StandardApiResponse<TResponse>;
    }

    console.info(`[Mock API] GET ${url} - No handler found, returning empty`);
    return createApiResponse({} as TResponse);
  }

  async post<TRequest = unknown, TResponse = unknown>(
    url: string,
    data?: TRequest,
    _config?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    await delay(this.config.mockDelay);

    const requestData = data as { action?: string; parameters?: unknown };
    const action = requestData?.action;
    const parameters = requestData?.parameters;

    // URL 기반 라우팅
    if (url.includes('/auth')) {
      return mockAuthApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/infra')) {
      return mockInfraApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/service')) {
      return mockServiceApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/backup')) {
      return mockBackupApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/kubernetes')) {
      return mockKubernetesApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/docker')) {
      return mockDockerApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/organization')) {
      return mockOrganizationApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/notification')) {
      return mockOrganizationApi.handleNotification(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/user')) {
      return mockAuthApi.handleUser(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/dashboard') || url.includes('/dora')) {
      return mockDashboardApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/project')) {
      return mockServiceApi.handleProject(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/pipeline')) {
      return mockServiceApi.handlePipeline(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/devices')) {
      return mockDeviceApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/database')) {
      return mockDatabaseApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    if (url.includes('/gits')) {
      return mockGitsApi.handle(action, parameters) as StandardApiResponse<TResponse>;
    }

    console.info(`[Mock API] POST ${url} - No handler found`);
    return createApiResponse({} as TResponse);
  }

  async put<TRequest = unknown, TResponse = unknown>(
    url: string,
    data?: TRequest,
    _config?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    await delay(this.config.mockDelay);
    console.info(`[Mock API] PUT ${url}`, data);
    return createApiResponse({ updated: true } as TResponse, true, '수정되었습니다.');
  }

  async patch<TRequest = unknown, TResponse = unknown>(
    url: string,
    data?: TRequest,
    _config?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    await delay(this.config.mockDelay);
    console.info(`[Mock API] PATCH ${url}`, data);
    return createApiResponse({ patched: true } as TResponse, true, '수정되었습니다.');
  }

  async delete<TResponse = unknown>(
    url: string,
    _config?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    await delay(this.config.mockDelay);
    console.info(`[Mock API] DELETE ${url}`);
    return createApiResponse({ deleted: true } as TResponse, true, '삭제되었습니다.');
  }

  // ==================== 도메인별 API 메서드들 ====================

  async request<TResponse = unknown, TRequest = unknown>(
    endpoint: string,
    action: string,
    parameters: TRequest,
    _options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.post<{ action: string; parameters: TRequest }, TResponse>(
      endpoint,
      { action, parameters }
    );
  }

  kubernetes<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/kubernetes', action, parameters, options);
  }

  pipeline<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/pipeline', action, parameters, options);
  }

  docker<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/docker', action, parameters, options);
  }

  infra<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/infra', action, parameters, options);
  }

  service<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/service', action, parameters, options);
  }

  backup<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/backup', action, parameters, options);
  }

  git<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>('/git-stats', action, parameters, options);
  }

  // ==================== 유틸리티 메서드들 ====================

  async upload<TResponse = unknown>(
    _url: string,
    _file: File,
    onProgress?: (progress: number) => void,
    _config?: unknown
  ): Promise<StandardApiResponse<TResponse>> {
    // 업로드 진행 시뮬레이션
    if (onProgress) {
      for (let i = 0; i <= 100; i += 20) {
        await delay(100);
        onProgress(i);
      }
    }
    return createApiResponse({ uploaded: true, url: '/mock/uploaded-file.png' } as TResponse);
  }

  createAbortController(): AbortController {
    return new AbortController();
  }

  async checkHealth(): Promise<StandardApiResponse<{ status: string }>> {
    await delay(100);
    return createApiResponse({ status: 'healthy' });
  }

  getAxiosInstance(): unknown {
    console.warn('[Mock API] getAxiosInstance() called - returning mock object');
    return {
      defaults: { baseURL: this.config.baseURL },
      interceptors: { request: { use: () => {} }, response: { use: () => {} } },
    };
  }
}

// ==================== 기본 인스턴스 및 헬퍼 ====================

export const apiClient = new MockApiClient({
  baseURL: '/api/v1',
  mockDelay: 300,
});

export const awxApiClient = new MockApiClient({
  baseURL: '/api/v1',
  mockDelay: 500,
});

export const trivyApiClient = new MockApiClient({
  baseURL: '/api/v1',
  mockDelay: 1000,
});

export const createApiClient = (config: MockApiClientConfig): MockApiClient => {
  return new MockApiClient(config);
};

export const isApiError = (error: unknown): error is MockApiError => {
  return error instanceof MockApiError;
};

export const isApiSuccess = <T>(
  response: StandardApiResponse<T>
): response is Required<Pick<StandardApiResponse<T>, 'success' | 'data'>> &
  StandardApiResponse<T> => {
  return response.success === true && response.data !== undefined;
};

// API 에러 클래스도 export (호환성)
export const ApiError = MockApiError;

export default apiClient;
