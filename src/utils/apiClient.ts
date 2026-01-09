// 표준화된 API 클라이언트
// 일관된 에러 처리, 타입 안전성, 인터셉터 제공

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { message } from 'antd';
import { StandardApiResponse } from '../types/shared';

// API 에러 클래스
export class ApiError extends Error {
  public statusCode: number;
  public originalError: AxiosError;

  constructor(message: string, statusCode: number, originalError: AxiosError) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

// API 클라이언트 설정
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  showErrorMessages?: boolean;
  showLoadingMessages?: boolean;
}

class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      showErrorMessages: true,
      showLoadingMessages: false,
      ...config,
    };

    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 요청 인터셉터
    this.instance.interceptors.request.use(
      config => {
        // 인증 토큰 추가
        const token = localStorage.getItem('authToken');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 로딩 메시지 표시
        if (this.config.showLoadingMessages) {
          message.loading('요청 처리 중...', 0);
        }

        return config;
      },
      error => {
        message.destroy();

        return Promise.reject(
          new Error(error instanceof Error ? error.message : String(error))
        );
      }
    );

    // 응답 인터셉터
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        message.destroy();

        // 표준 응답 형식 검증
        if (
          response.data &&
          typeof response.data === 'object' &&
          'success' in response.data
        ) {
          const apiResponse = response.data as StandardApiResponse;

          // API 레벨에서 실패한 경우
          if (!apiResponse.success && apiResponse.error) {
            throw new ApiError(
              apiResponse.error,
              response.status,
              new AxiosError(
                apiResponse.error,
                'API_ERROR',
                response.config,
                response.request,
                response
              )
            );
          }
        }

        return response;
      },
      (error: AxiosError) => {
        message.destroy();

        let errorMessage = '네트워크 오류가 발생했습니다.';
        let statusCode = 0;

        if (error.response) {
          statusCode = error.response.status;

          // API 응답에서 에러 메시지 추출 (안전한 타입 체크)
          const responseData = error.response.data;

          if (
            responseData &&
            typeof responseData === 'object' &&
            'error' in responseData
          ) {
            const apiResponse = responseData as StandardApiResponse;

            if (apiResponse?.error) {
              errorMessage = apiResponse.error;
            }
          } else {
            // HTTP 상태 코드별 기본 메시지
            switch (statusCode) {
              case 400:
                errorMessage = '잘못된 요청입니다.';
                break;
              case 401:
                errorMessage = '인증이 필요합니다.';
                // 토큰 제거 및 로그인 페이지로 리다이렉트
                localStorage.removeItem('authToken');
                window.location.href = '/login';
                break;
              case 403:
                errorMessage = '접근 권한이 없습니다.';

                break;
              case 404:
                errorMessage = '요청한 리소스를 찾을 수 없습니다.';
                break;
              case 500:
                errorMessage = '서버 내부 오류가 발생했습니다.';
                break;
              default:
                errorMessage = `서버 오류가 발생했습니다. (${statusCode})`;
            }
          }
        } else if (error.request) {
          errorMessage = '서버에 연결할 수 없습니다.';
        } else {
          errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
        }

        // 에러 메시지 표시
        if (this.config.showErrorMessages && statusCode !== 401) {
          message.error(errorMessage);
        }

        const apiError = new ApiError(errorMessage, statusCode, error);

        return Promise.reject(apiError);
      }
    );
  }

  // GET 요청
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

  // POST 요청
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

  // PUT 요청
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

  // PATCH 요청
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

  // DELETE 요청
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

  // 파일 업로드
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

  // 요청 취소 컨트롤러 생성 (AbortController 사용)
  createAbortController() {
    return new AbortController();
  }

  // 인스턴스 직접 접근 (특수한 경우에만 사용)
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

// 기본 API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient({
  baseURL: process.env['REACT_APP_API_BASE_URL'] || '/api/v1',
  timeout: 30000,
  showErrorMessages: true,
  showLoadingMessages: false,
});

// 특정 도메인용 클라이언트 생성 헬퍼
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};

export default apiClient;
