// Enhanced API Client - 유지보수성과 가독성을 위한 통합 API 클라이언트
// 모든 API 호출을 표준화하고 타입 안전성을 보장합니다

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { message } from 'antd';
import { StandardApiResponse } from '../../types/shared';
import { logger } from '../../utils/logger';

// ==================== 타입 정의 ====================

/**
 * API 요청 옵션
 */
export interface ApiRequestOptions {
  /** 커스텀 타임아웃 (ms) */
  timeout?: number;
  /** 에러 메시지 자동 표시 여부 */
  showErrorMessage?: boolean;
  /** 성공 메시지 자동 표시 여부 */
  showSuccessMessage?: boolean;
  /** 커스텀 성공 메시지 */
  successMessage?: string;
  /** 재시도 활성화 여부 */
  enableRetry?: boolean;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
}

/**
 * 통합 API 요청 매개변수
 */
export interface UnifiedApiRequest<TData = unknown> {
  /** API 엔드포인트 */
  endpoint: string;
  /** 액션 타입 */
  action: string;
  /** 요청 매개변수 */
  parameters: TData;
  /** 추가 옵션 */
  options?: ApiRequestOptions;
}

/**
 * API 에러 클래스
 */
export class EnhancedApiError extends Error {
  public readonly statusCode: number;
  public readonly apiError: string;
  public readonly requestUrl?: string;
  public readonly requestAction?: string;

  constructor(
    message: string,
    statusCode: number,
    apiError: string,
    requestUrl?: string,
    requestAction?: string
  ) {
    super(message);
    this.name = 'EnhancedApiError';
    this.statusCode = statusCode;
    this.apiError = apiError;
    this.requestUrl = requestUrl;
    this.requestAction = requestAction;
  }
}

// ==================== Enhanced API Client 클래스 ====================

/**
 * 향상된 API 클라이언트
 *
 * 특징:
 * - 타입 안전성 보장
 * - 통합된 에러 처리
 * - 자동 재시도 로직
 * - 표준화된 응답 형식
 * - 로깅 및 모니터링 지원
 */
export class EnhancedApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor(
    baseURL: string = process.env['REACT_APP_API_BASE_URL'] || '/api/v1'
  ) {
    this.baseURL = baseURL;

    this.instance = axios.create({
      baseURL,
      timeout: 300000, // 30초(30000ms)에서 5분(300000ms)으로 변경
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 인터셉터 설정
   */
  private setupInterceptors(): void {
    // 요청 인터셉터
    this.instance.interceptors.request.use(
      config => {
        // 인증 토큰 자동 추가
        const token = localStorage.getItem('authToken');

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 개발 환경 로깅
        if (process.env['NODE_ENV'] === 'development') {
          logger.info('API Request:', {
            method: config.method?.toUpperCase(),
            url: `${config.baseURL}${config.url}`,
            action: config.data?.action,
            params: config.data?.parameters,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        logger.error('Request interceptor error:', error);

        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.instance.interceptors.response.use(
      (response: AxiosResponse<StandardApiResponse>) => {
        // 개발 환경 로깅
        if (process.env['NODE_ENV'] === 'development') {
          logger.info('API Response:', {
            status: response.status,
            url: response.config.url,
            action: response.config.data?.action,
            success: response.data?.success,
          });
        }

        return response;
      },
      (error: AxiosError) => {
        return this.handleResponseError(error);
      }
    );
  }

  /**
   * 응답 에러 처리
   */
  private async handleResponseError(error: AxiosError): Promise<never> {
    const requestData = (error.config?.data ?? {}) as Record<string, unknown>;
    const action =
      typeof requestData.action === 'string' ? requestData.action : undefined;
    let errorMessage = '네트워크 오류가 발생했습니다.';
    let statusCode = 0;
    let responsePayload: StandardApiResponse | undefined;

    if (error.response) {
      statusCode = error.response.status;
      responsePayload = error.response.data as StandardApiResponse;

      if (responsePayload?.error) {
        errorMessage = responsePayload.error;
      } else {
        errorMessage = this.getDefaultErrorMessage(statusCode);
      }

      // 특수 케이스 처리
      this.handleSpecialCases(statusCode, responsePayload);
    } else if (error.request) {
      errorMessage = '서버에 연결할 수 없습니다.';
    } else {
      errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
    }

    const enhancedError = new EnhancedApiError(
      errorMessage,
      statusCode,
      responsePayload?.error || errorMessage,
      error.config?.url,
      action
    );

    logger.error(
      'API Error:',
      new Error(
        JSON.stringify({
          message: errorMessage,
          statusCode,
          url: error.config?.url,
          action: action ?? '',
        })
      )
    );

    throw enhancedError;
  }

  /**
   * HTTP 상태 코드별 기본 에러 메시지
   */
  private getDefaultErrorMessage(statusCode: number): string {
    const errorMessages: Record<number, string> = {
      400: '잘못된 요청입니다.',
      401: '인증이 필요합니다.',
      403: '접근 권한이 없습니다.',
      404: '요청한 리소스를 찾을 수 없습니다.',
      422: '요청 데이터가 올바르지 않습니다.',
      429: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
      500: '서버 내부 오류가 발생했습니다.',
      502: '게이트웨이 오류가 발생했습니다.',
      503: '서비스를 사용할 수 없습니다.',
      504: '게이트웨이 타임아웃이 발생했습니다.',
    };

    return (
      errorMessages[statusCode] || `서버 오류가 발생했습니다. (${statusCode})`
    );
  }

  /**
   * 특수 케이스 처리
   */
  private handleSpecialCases(
    statusCode: number,
    responseData?: StandardApiResponse
  ): void {
    if (statusCode === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';

      return;
    }

    if (statusCode === 403 && responseData && 'expiry_date' in responseData) {
      window.dispatchEvent(
        new CustomEvent('licenseExpired', {
          detail: {
            expiryDate: (responseData as { expiry_date: string }).expiry_date,
            message: responseData.error,
          },
        })
      );
    }
  }

  // ==================== 핵심 API 메서드들 ====================

  /**
   * 통합 API 요청 메서드
   * 모든 API 호출을 표준화합니다
   */
  async request<TResponse = unknown, TRequest = unknown>(
    request: UnifiedApiRequest<TRequest>
  ): Promise<StandardApiResponse<TResponse>> {
    const { endpoint, action, parameters, options = {} } = request;
    const {
      timeout,
      showErrorMessage = true,
      showSuccessMessage = false,
      successMessage,
      enableRetry: _enableRetry = true,
      maxRetries: _maxRetries = 3,
    } = options;

    try {
      const config: AxiosRequestConfig = {
        ...(timeout && { timeout }),
      };

      const response = await this.instance.post<StandardApiResponse<TResponse>>(
        endpoint,
        { action, parameters },
        config
      );

      // API 레벨 에러 체크
      if (!response.data.success && response.data.error) {
        throw new EnhancedApiError(
          response.data.error,
          response.status,
          response.data.error,
          endpoint,
          action
        );
      }

      // 성공 메시지 표시
      if (showSuccessMessage && successMessage) {
        message.success(successMessage);
      }

      return response.data;
    } catch (error) {
      // 에러 메시지 표시
      if (showErrorMessage && error instanceof EnhancedApiError) {
        if (error.statusCode !== 401) {
          // 401은 자동 리다이렉트되므로 메시지 표시하지 않음
          message.error(error.message);
        }
      }

      throw error;
    }
  }

  /**
   * GET 요청
   */
  async get<TResponse = unknown>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    const { showErrorMessage = true, showSuccessMessage = false } =
      options || {};

    try {
      const response =
        await this.instance.get<StandardApiResponse<TResponse>>(url);

      if (showSuccessMessage && options?.successMessage) {
        message.success(options.successMessage);
      }

      return response.data;
    } catch (error) {
      if (showErrorMessage && error instanceof AxiosError) {
        const errorMessage = error.response?.data?.error || error.message;

        message.error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * POST 요청
   */
  async post<TResponse = unknown, TRequest = unknown>(
    url: string,
    data?: TRequest,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    const { showErrorMessage = true, showSuccessMessage = false } =
      options || {};

    try {
      const response = await this.instance.post<StandardApiResponse<TResponse>>(
        url,
        data
      );

      if (showSuccessMessage && options?.successMessage) {
        message.success(options.successMessage);
      }

      return response.data;
    } catch (error) {
      if (showErrorMessage && error instanceof AxiosError) {
        const errorMessage = error.response?.data?.error || error.message;

        message.error(errorMessage);
      }
      throw error;
    }
  }

  // ==================== 도메인별 API 래퍼들 ====================

  /**
   * Kubernetes API 호출
   */
  kubernetes<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>({
      endpoint: '/kubernetes',
      action,
      parameters,
      options,
    });
  }

  /**
   * Docker API 호출
   */
  docker<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>({
      endpoint: '/docker',
      action,
      parameters,
      options,
    });
  }

  /**
   * Infrastructure API 호출
   */
  infra<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>({
      endpoint: '/infra',
      action,
      parameters,
      options,
    });
  }

  /**
   * Service API 호출
   */
  service<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>({
      endpoint: '/service',
      action,
      parameters,
      options,
    });
  }

  /**
   * Backup API 호출
   */
  backup<TResponse = unknown, TRequest = unknown>(
    action: string,
    parameters: TRequest,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    return this.request<TResponse, TRequest>({
      endpoint: '/backup',
      action,
      parameters,
      options,
    });
  }

  /**
   * Auth API 호출 (직접 엔드포인트 사용)
   */
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<StandardApiResponse<{ token: string }>> {
    return this.post<{ token: string }, { email: string; password: string }>(
      '/auth/login',
      credentials,
      {
        showSuccessMessage: true,
        successMessage: '로그인되었습니다.',
      }
    );
  }

  async signup(userInfo: {
    email: string;
    password: string;
  }): Promise<StandardApiResponse<void>> {
    return this.post<void, { email: string; password: string }>(
      '/auth/signup',
      userInfo,
      {
        showSuccessMessage: true,
        successMessage: '회원가입이 완료되었습니다.',
      }
    );
  }

  // ==================== 유틸리티 메서드들 ====================

  /**
   * 요청 취소용 AbortController 생성
   */
  createAbortController(): AbortController {
    return new AbortController();
  }

  /**
   * 파일 업로드
   */
  async upload<TResponse = unknown>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options?: ApiRequestOptions
  ): Promise<StandardApiResponse<TResponse>> {
    const formData = new FormData();

    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );

          onProgress(progress);
        }
      },
    };

    const response = await this.instance.post<StandardApiResponse<TResponse>>(
      url,
      formData,
      config
    );

    if (options?.showSuccessMessage && options.successMessage) {
      message.success(options.successMessage);
    }

    return response.data;
  }

  /**
   * 헬스 체크
   */
  async checkHealth(): Promise<StandardApiResponse<{ status: string }>> {
    return this.get<{ status: string }>('/status');
  }
}

// ==================== 싱글톤 인스턴스 ====================

/**
 * 기본 Enhanced API 클라이언트 인스턴스
 */
export const enhancedApiClient = new EnhancedApiClient();

// ==================== 헬퍼 함수들 ====================

/**
 * Enhanced API 에러인지 확인하는 타입 가드
 */
export const isEnhancedApiError = (
  error: unknown
): error is EnhancedApiError => {
  return error instanceof EnhancedApiError;
};

/**
 * API 응답이 성공인지 확인하는 헬퍼
 */
export const isApiSuccess = <T>(
  response: StandardApiResponse<T>
): response is Required<Pick<StandardApiResponse<T>, 'success' | 'data'>> &
  StandardApiResponse<T> => {
  return response.success === true && response.data !== undefined;
};

export default enhancedApiClient;
