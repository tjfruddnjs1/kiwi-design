// 통합 API 클라이언트 - 모든 API 호출의 중앙화
// Modern TypeScript implementation with comprehensive error handling

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { message } from 'antd';
import { logger } from '../../utils/logger';

// ==================== 통합 타입 정의 ====================

/**
 * 표준 API 응답 인터페이스 - 모든 백엔드 응답에 사용
 */
export interface StandardApiResponse<TData = unknown> {
  /** 성공 여부 */
  success: boolean;
  /** 응답 데이터 */
  data?: TData;
  /** 에러 메시지 */
  error?: string;
  /** 추가 정보 메시지 */
  message?: string;
  /** HTTP 상태 코드 */
  statusCode?: number;
}

/**
 * API 에러 클래스 - 구조화된 에러 정보 제공
 */
export class UnifiedApiError extends Error {
  public readonly statusCode: number;
  public readonly apiError: string;
  public readonly originalError: AxiosError;
  public readonly requestUrl?: string;

  constructor(
    message: string,
    statusCode: number,
    apiError: string,
    originalError: AxiosError,
    requestUrl?: string
  ) {
    super(message);
    this.name = 'UnifiedApiError';
    this.statusCode = statusCode;
    this.apiError = apiError;
    this.originalError = originalError;
    this.requestUrl = requestUrl;
  }
}

/**
 * API 클라이언트 설정
 */
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  showErrorMessages?: boolean;
  showLoadingMessages?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

/**
 * 통합 API 클라이언트
 * 프로젝트의 모든 API 호출을 표준화하고 타입 안전성을 보장
 */
export class UnifiedApiClient {
  private instance: AxiosInstance;
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    // 기본값 설정
    this.config = {
      timeout: 300000, // 30초(30000ms)에서 5분(300000ms)으로 변경
      showErrorMessages: true,
      showLoadingMessages: false,
      enableRetry: true,
      maxRetries: 3,
      ...config,
    };

    // Axios 인스턴스 생성
    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 요청/응답 인터셉터 설정
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

        // 개발 환경에서 요청 로깅
        if (process.env['NODE_ENV'] === 'development') {
          logger.info('API Request:', {
            method: config.method?.toUpperCase(),
            url: `${config.baseURL}${config.url}`,
            data: config.data,
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
        // 개발 환경에서 응답 로깅
        if (process.env['NODE_ENV'] === 'development') {
          logger.info('API Response:', {
            status: response.status,
            url: response.config.url,
            success: response.data?.success,
          });
        }

        // API 레벨 에러 체크
        if (response.data && !response.data.success && response.data.error) {
          const apiError = new UnifiedApiError(
            response.data.error,
            response.status,
            response.data.error,
            new AxiosError(response.data.error, 'API_ERROR', response.config),
            response.config.url
          );

          return Promise.reject(apiError);
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
    let errorMessage = '네트워크 오류가 발생했습니다.';
    let statusCode = 0;
    let apiError = '';

    if (error.response) {
      statusCode = error.response.status;
      const responseData = error.response.data as StandardApiResponse;

      // API 응답에서 에러 메시지 추출
      if (responseData?.error) {
        apiError = responseData.error;
        errorMessage = responseData.error;
      } else {
        // HTTP 상태 코드별 기본 메시지
        errorMessage = this.getDefaultErrorMessage(statusCode);
      }

      // 특수 처리
      this.handleSpecialCases(statusCode, responseData);
    } else if (error.request) {
      errorMessage = '서버에 연결할 수 없습니다.';
      logger.error(
        'Network error - no response received:',
        new Error(String(error.request))
      );
    } else {
      errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      logger.error(
        'Request configuration error:',
        new Error(error.message || 'Unknown error')
      );
    }

    // 에러 메시지 표시
    if (this.config.showErrorMessages && statusCode !== 401) {
      message.error(errorMessage);
    }

    // 재시도 로직
    if (this.config.enableRetry && this.shouldRetry(error)) {
      return this.retryRequest(error);
    }

    const unifiedError = new UnifiedApiError(
      errorMessage,
      statusCode,
      apiError,
      error,
      error.config?.url
    );

    logger.error(
      'API Error:',
      new Error(
        JSON.stringify({
          message: errorMessage,
          statusCode,
          url: error.config?.url,
          apiError,
        })
      )
    );

    throw unifiedError;
  }

  /**
   * HTTP 상태 코드별 기본 에러 메시지
   */
  private getDefaultErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return '잘못된 요청입니다.';
      case 401:
        return '인증이 필요합니다.';
      case 403:
        return '접근 권한이 없습니다.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 422:
        return '요청 데이터가 올바르지 않습니다.';
      case 429:
        return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 500:
        return '서버 내부 오류가 발생했습니다.';
      case 502:
        return '게이트웨이 오류가 발생했습니다.';
      case 503:
        return '서비스를 사용할 수 없습니다.';
      case 504:
        return '게이트웨이 타임아웃이 발생했습니다.';
      default:
        return `서버 오류가 발생했습니다. (${statusCode})`;
    }
  }

  /**
   * 특수 케이스 처리 (인증 만료, 라이선스 만료 등)
   */
  private handleSpecialCases(
    statusCode: number,
    responseData?: StandardApiResponse
  ): void {
    // 인증 만료 처리
    if (statusCode === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';

      return;
    }

    // 라이선스 만료 처리
    if (statusCode === 403 && responseData && 'expiry_date' in responseData) {
      const event = new CustomEvent('licenseExpired', {
        detail: {
          expiryDate: (responseData as { expiry_date: string }).expiry_date,
          message: responseData.error,
        },
      });

      window.dispatchEvent(event);
    }
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  private shouldRetry(error: AxiosError): boolean {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    return !!(
      error.response && retryableStatusCodes.includes(error.response.status)
    );
  }

  /**
   * 요청 재시도
   */
  private async retryRequest(error: AxiosError): Promise<never> {
    const config = error.config as AxiosRequestConfig & {
      __retryCount?: number;
    };

    if (!config || (config.__retryCount ?? 0) >= this.config.maxRetries) {
      throw error;
    }

    // 재시도 카운터 증가
    config.__retryCount = (config.__retryCount || 0) + 1;

    // 지연 후 재시도
    const delay = Math.min(1000 * Math.pow(2, config.__retryCount - 1), 5000);

    await new Promise(resolve => setTimeout(resolve, delay));

    logger.info(
      `Retrying request (${config.__retryCount}/${this.config.maxRetries}):`,
      { url: config.url }
    );

    return this.instance.request(config);
  }

  // ==================== HTTP 메서드들 ====================

  /**
   * GET 요청
   */
  async get<TResponse = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<StandardApiResponse<TResponse>> {
    const response = await this.instance.get<StandardApiResponse<TResponse>>(
      url,
      config
    );

    return response.data;
  }

  /**
   * POST 요청
   */
  async post<TRequest = unknown, TResponse = unknown>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig
  ): Promise<StandardApiResponse<TResponse>> {
    const response = await this.instance.post<StandardApiResponse<TResponse>>(
      url,
      data,
      config
    );

    return response.data;
  }

  /**
   * PUT 요청
   */
  async put<TRequest = unknown, TResponse = unknown>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig
  ): Promise<StandardApiResponse<TResponse>> {
    const response = await this.instance.put<StandardApiResponse<TResponse>>(
      url,
      data,
      config
    );

    return response.data;
  }

  /**
   * PATCH 요청
   */
  async patch<TRequest = unknown, TResponse = unknown>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig
  ): Promise<StandardApiResponse<TResponse>> {
    const response = await this.instance.patch<StandardApiResponse<TResponse>>(
      url,
      data,
      config
    );

    return response.data;
  }

  /**
   * DELETE 요청
   */
  async delete<TResponse = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<StandardApiResponse<TResponse>> {
    const response = await this.instance.delete<StandardApiResponse<TResponse>>(
      url,
      config
    );

    return response.data;
  }

  /**
   * 파일 업로드
   */
  async upload<TResponse = unknown>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<StandardApiResponse<TResponse>> {
    const formData = new FormData();

    formData.append('file', file);

    const uploadConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config?.headers,
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
      uploadConfig
    );

    return response.data;
  }

  /**
   * 인스턴스 직접 접근 (특수한 경우에만 사용)
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * 요청 취소용 AbortController 생성
   */
  createAbortController(): AbortController {
    return new AbortController();
  }
}

// ==================== 기본 인스턴스 및 헬퍼 ====================

/**
 * 기본 API 클라이언트 인스턴스
 */
export const unifiedApiClient = new UnifiedApiClient({
  baseURL: process.env['REACT_APP_API_BASE_URL'] || '/api/v1',
  timeout: 30000,
  showErrorMessages: true,
  showLoadingMessages: false,
  enableRetry: true,
  maxRetries: 3,
});

/**
 * 특정 설정으로 API 클라이언트 생성
 */
export const createApiClient = (config: ApiClientConfig): UnifiedApiClient => {
  return new UnifiedApiClient(config);
};

/**
 * 타입 가드: API 에러인지 확인
 */
export const isUnifiedApiError = (error: unknown): error is UnifiedApiError => {
  return error instanceof UnifiedApiError;
};

/**
 * 헬퍼: API 응답이 성공인지 확인
 */
export const isApiSuccess = <T>(
  response: StandardApiResponse<T>
): response is Required<Pick<StandardApiResponse<T>, 'success' | 'data'>> &
  StandardApiResponse<T> => {
  return response.success === true && response.data !== undefined;
};

export default unifiedApiClient;
