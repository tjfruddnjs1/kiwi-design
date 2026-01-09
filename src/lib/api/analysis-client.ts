/**
 * Analysis Service (AST) API Client
 *
 * 외부 보안 분석 서비스(Trivy, ZAP, SAST)와 통신하는 전용 클라이언트입니다.
 * 환경 변수를 통해 local/production 환경별 엔드포인트를 동적으로 분기합니다.
 *
 * 환경 변수:
 * - VITE_AST_SERVICE_URL: AST 서비스 기본 URL
 * - VITE_TRIVY_ENDPOINT: Trivy 컨테이너 이미지 스캔 엔드포인트
 * - VITE_ZAP_ENDPOINT: ZAP DAST 스캔 엔드포인트
 * - VITE_SAST_ENDPOINT: SAST 스캔 엔드포인트
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { logger } from '../../utils/logger';
import type {
  VulnerabilityCategoriesResponse,
  CategorizedScanResponse,
  PendingVulnerabilitiesResponse,
  ResolveVulnerabilityParams,
  ResolveVulnerabilityResponse,
  // SBOM 관련 타입
  SbomResult,
  SbomListResponse,
  GenerateImageSbomParams,
  GenerateSourceSbomParams,
  // 라이선스 분석 관련 타입
  LicenseAnalysisResult,
  ResolveLicenseParams,
} from '../../types/securityAnalysis';

// ==================== 환경 변수 설정 ====================

/**
 * 환경별 AST 서비스 URL 가져오기
 * - development: localhost:7000 (Docker Container)
 * - production: 배포된 AST 서비스 URL
 */
const getAstServiceUrl = (): string => {
  // Vite 환경 변수 사용
  const envUrl = import.meta.env.VITE_AST_SERVICE_URL;
  if (envUrl) {
    return envUrl;
  }

  // 환경 변수가 없으면 현재 환경에 따라 기본값 사용
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  return isDev ? 'http://localhost:7000' : '/api/v1';
};

const getTrivyEndpoint = (): string => {
  return (
    import.meta.env.VITE_TRIVY_ENDPOINT ||
    `${getAstServiceUrl()}/scan/trivy/scan/image`
  );
};

const getZapEndpoint = (): string => {
  return (
    import.meta.env.VITE_ZAP_ENDPOINT || `${getAstServiceUrl()}/scan/zap/scan`
  );
};

const getSastEndpoint = (): string => {
  return (
    import.meta.env.VITE_SAST_ENDPOINT || `${getAstServiceUrl()}/scan/sast/scan`
  );
};

// ==================== 타입 정의 ====================

export interface AnalysisApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: 'completed' | 'pending' | 'failed' | 'not_found';
}

export interface AnalysisError {
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

export class AnalysisApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isAnalysisError = true;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'AnalysisApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ==================== Trivy SCA 스캔 타입 ====================

export interface TrivyScanParams {
  repo_id: number;
  image_url: string;
  scan_type?: 'vuln' | 'config' | 'secret' | 'license';
  registry_username?: string;
  registry_password?: string;
}

export interface TrivyScanResult {
  success: boolean;
  summary?: {
    scan_id: string;
    image_name: string;
    scan_type: string;
    timestamp: string;
    total_vulnerabilities: number;
    scan_time: number;
  };
  result?: {
    scan_result: {
      artifact_name: string;
      artifact_type: string;
      results: Array<{
        target: string;
        class: string;
        type: string;
        vulnerabilities: unknown[];
      }>;
    };
  };
  execution_logs?: unknown;
}

// ==================== ZAP DAST 스캔 타입 ====================

export interface ZapScanParams {
  repo_id: number;
  target_url: string;
  scan_type?: 'baseline' | 'full' | 'api';
  options?: {
    context?: string;
    policy?: string;
    alert_level?: string;
    timeout?: number;
  };
}

export interface ZapScanResult {
  success: boolean;
  alerts?: unknown[];
  summary?: {
    total_alerts: number;
    high_alerts: number;
    medium_alerts: number;
    low_alerts: number;
    info_alerts: number;
    scan_time: number;
  };
  execution_log?: unknown;
}

// ==================== SAST 스캔 타입 ====================

export interface SastScanParams {
  repo_id: number;
  git_url: string;
  branch?: string;
  git_token?: string;
}

export interface SastScanResult {
  success: boolean;
  semgrep?: unknown;
  codeql?: unknown;
  execution_logs?: unknown;
}

// ==================== Analysis API 클라이언트 ====================

class AnalysisApiClient {
  private instance: AxiosInstance;
  private readonly timeout: number = 600000; // 10분 (분석 작업은 오래 걸릴 수 있음)

  constructor() {
    this.instance = axios.create({
      timeout: this.timeout,
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
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 개발 환경 로깅
        if (import.meta.env.DEV) {
          logger.info('[Analysis API] Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        logger.error('[Analysis API] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        if (import.meta.env.DEV) {
          logger.info('[Analysis API] Response:', {
            status: response.status,
            url: response.config.url,
          });
        }
        return response;
      },
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * 에러 처리 - 상세한 에러 정보를 반환
   */
  private handleError(error: AxiosError): Promise<never> {
    let message = '분석 서비스 요청 중 오류가 발생했습니다.';
    let code = 'ANALYSIS_ERROR';
    let statusCode = 0;
    let details: unknown = undefined;

    if (error.response) {
      statusCode = error.response.status;
      const responseData = error.response.data as AnalysisApiResponse;

      // 상태 코드별 에러 메시지
      switch (statusCode) {
        case 400:
          message = responseData?.error || '잘못된 분석 요청입니다.';
          code = 'INVALID_REQUEST';
          break;
        case 401:
          message = '분석 서비스 인증에 실패했습니다.';
          code = 'AUTH_FAILED';
          break;
        case 403:
          message = '분석 서비스 접근 권한이 없습니다.';
          code = 'ACCESS_DENIED';
          break;
        case 404:
          message = '분석 서비스를 찾을 수 없습니다.';
          code = 'SERVICE_NOT_FOUND';
          break;
        case 408:
        case 504:
          message = '분석 작업 시간이 초과되었습니다. 다시 시도해주세요.';
          code = 'TIMEOUT';
          break;
        case 500:
          message =
            responseData?.error || '분석 서비스 내부 오류가 발생했습니다.';
          code = 'SERVER_ERROR';
          break;
        case 502:
        case 503:
          message =
            '분석 서비스에 연결할 수 없습니다. 서비스 상태를 확인해주세요.';
          code = 'SERVICE_UNAVAILABLE';
          break;
        default:
          message = responseData?.error || `분석 서비스 오류 (${statusCode})`;
          code = 'UNKNOWN_ERROR';
      }

      details = responseData;
    } else if (error.request) {
      message =
        '분석 서비스에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
      code = 'NETWORK_ERROR';
      statusCode = 0;
    } else {
      message = error.message || '알 수 없는 오류가 발생했습니다.';
      code = 'REQUEST_ERROR';
    }

    logger.error(
      '[Analysis API] Error:',
      new Error(
        JSON.stringify({
          message,
          code,
          statusCode,
          url: error.config?.url,
        })
      )
    );

    throw new AnalysisApiError(message, statusCode, code, details);
  }

  // ==================== Trivy SCA API ====================

  /**
   * Trivy 컨테이너 이미지 취약점 스캔
   * @throws {AnalysisApiError} 스캔 실패 시 상세 에러 정보 포함
   */
  async scanImage(
    params: TrivyScanParams
  ): Promise<AnalysisApiResponse<TrivyScanResult>> {
    const endpoint = getTrivyEndpoint();

    logger.info('[Trivy] Starting container image scan:', {
      image_url: params.image_url,
      scan_type: params.scan_type || 'vuln',
      endpoint,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<TrivyScanResult>
      >(endpoint, params);

      // 응답 검증
      if (!response.data) {
        throw new AnalysisApiError(
          'Trivy 스캔 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      // API 응답의 success 필드 검증
      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || 'Trivy 스캔이 실패했습니다.',
          500,
          'SCAN_FAILED',
          response.data
        );
      }

      logger.info('[Trivy] Scan completed successfully');
      return response.data;
    } catch (error) {
      // AnalysisApiError는 그대로 전파
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      // 다른 에러는 AnalysisApiError로 래핑
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'Trivy 스캔 중 오류 발생',
        500,
        'SCAN_ERROR',
        error
      );
    }
  }

  // ==================== ZAP DAST API ====================

  /**
   * ZAP 웹 애플리케이션 보안 스캔 (DAST)
   * @throws {AnalysisApiError} 스캔 실패 시 상세 에러 정보 포함
   */
  async scanWeb(
    params: ZapScanParams
  ): Promise<AnalysisApiResponse<ZapScanResult>> {
    const endpoint = getZapEndpoint();

    logger.info('[ZAP] Starting DAST web scan:', {
      target_url: params.target_url,
      scan_type: params.scan_type || 'baseline',
      endpoint,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<ZapScanResult>
      >(endpoint, params);

      // 응답 검증
      if (!response.data) {
        throw new AnalysisApiError(
          'ZAP DAST 스캔 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      // API 응답의 success 필드 검증
      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || 'ZAP DAST 스캔이 실패했습니다.',
          500,
          'SCAN_FAILED',
          response.data
        );
      }

      logger.info('[ZAP] DAST scan completed successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'ZAP DAST 스캔 중 오류 발생',
        500,
        'SCAN_ERROR',
        error
      );
    }
  }

  // ==================== SAST API ====================

  /**
   * SAST 소스 코드 보안 스캔
   * @throws {AnalysisApiError} 스캔 실패 시 상세 에러 정보 포함
   */
  async scanCode(
    params: SastScanParams
  ): Promise<AnalysisApiResponse<SastScanResult>> {
    const endpoint = getSastEndpoint();

    logger.info('[SAST] Starting source code scan:', {
      git_url: params.git_url,
      branch: params.branch || 'main',
      endpoint,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<SastScanResult>
      >(endpoint, params);

      // 응답 검증
      if (!response.data) {
        throw new AnalysisApiError(
          'SAST 스캔 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      // API 응답의 success 필드 검증
      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || 'SAST 스캔이 실패했습니다.',
          500,
          'SCAN_FAILED',
          response.data
        );
      }

      logger.info('[SAST] Source code scan completed successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'SAST 스캔 중 오류 발생',
        500,
        'SCAN_ERROR',
        error
      );
    }
  }

  // ==================== 유틸리티 ====================

  /**
   * 현재 환경의 AST 서비스 설정 정보 반환
   */
  getServiceConfig(): {
    astServiceUrl: string;
    trivyEndpoint: string;
    zapEndpoint: string;
    sastEndpoint: string;
    environment: string;
  } {
    return {
      astServiceUrl: getAstServiceUrl(),
      trivyEndpoint: getTrivyEndpoint(),
      zapEndpoint: getZapEndpoint(),
      sastEndpoint: getSastEndpoint(),
      environment: import.meta.env.VITE_APP_ENV || 'unknown',
    };
  }

  /**
   * AST 서비스 연결 상태 확인
   */
  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await this.instance.get(`${getAstServiceUrl()}/health`, {
        timeout: 5000, // 5초 타임아웃
      });
      return {
        healthy: response.status === 200,
        message: 'AST 서비스가 정상 작동 중입니다.',
      };
    } catch {
      // Network error or service unavailable - return unhealthy status
      return {
        healthy: false,
        message: 'AST 서비스에 연결할 수 없습니다.',
      };
    }
  }

  // ==================== 취약점 카테고리 API ====================

  /**
   * 취약점 카테고리 목록 조회
   * GET /scan/vulnerabilities/categories
   */
  async getVulnerabilityCategories(): Promise<
    AnalysisApiResponse<VulnerabilityCategoriesResponse>
  > {
    const endpoint = `${getAstServiceUrl()}/scan/vulnerabilities/categories`;

    logger.info('[Vulnerability] Fetching categories');

    try {
      const response =
        await this.instance.get<
          AnalysisApiResponse<VulnerabilityCategoriesResponse>
        >(endpoint);

      if (!response.data) {
        throw new AnalysisApiError(
          '카테고리 목록 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      logger.info('[Vulnerability] Categories fetched successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '카테고리 목록 조회 중 오류 발생',
        500,
        'FETCH_ERROR',
        error
      );
    }
  }

  /**
   * 카테고리화된 취약점 조회
   * GET /scan/vulnerabilities/categorized/<git_info_idx>
   * @param gitInfoIdx Git 정보 인덱스 (repo_id)
   * @param tool 도구 필터: 'sast' | 'sca' | 'dast' | 'all' (기본값: 'all')
   *             - sast: SAST 결과만 (INJ, AUTH 등 카테고리)
   *             - sca: SCA 결과만 (CVE_CRITICAL, CVE_HIGH 등 카테고리)
   *             - dast: DAST 결과만
   *             - all: 모든 도구 결과 통합
   * @param imageName 이미지 이름 필터 (SCA의 경우 특정 이미지의 취약점만 조회)
   */
  async getCategorizedVulnerabilities(
    gitInfoIdx: number,
    tool: 'sast' | 'sca' | 'dast' | 'all' = 'all',
    imageName?: string | null
  ): Promise<AnalysisApiResponse<CategorizedScanResponse>> {
    const params = new URLSearchParams();
    if (tool !== 'all') {
      params.append('tool', tool);
    }
    if (imageName) {
      params.append('image_name', imageName);
    }
    const queryString = params.toString();
    const endpoint = `${getAstServiceUrl()}/scan/vulnerabilities/categorized/${gitInfoIdx}${queryString ? `?${queryString}` : ''}`;

    logger.info('[Vulnerability] Fetching categorized vulnerabilities:', {
      gitInfoIdx,
      tool,
      imageName,
    });

    try {
      const response =
        await this.instance.get<AnalysisApiResponse<CategorizedScanResponse>>(
          endpoint
        );

      if (!response.data) {
        throw new AnalysisApiError(
          '카테고리화된 취약점 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      logger.info(
        '[Vulnerability] Categorized vulnerabilities fetched successfully'
      );
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '카테고리화된 취약점 조회 중 오류 발생',
        500,
        'FETCH_ERROR',
        error
      );
    }
  }

  /**
   * 미해결 취약점만 조회
   * GET /scan/vulnerabilities/pending/<git_info_idx>
   * @param gitInfoIdx Git 정보 인덱스 (repo_id)
   * @param tool 도구 필터: 'sast' | 'sca' | 'dast' | 'all' (기본값: 'all')
   * @param imageName 이미지 이름 필터 (SCA의 경우 특정 이미지의 취약점만 조회)
   */
  async getPendingVulnerabilities(
    gitInfoIdx: number,
    tool: 'sast' | 'sca' | 'dast' | 'all' = 'all',
    imageName?: string | null
  ): Promise<AnalysisApiResponse<PendingVulnerabilitiesResponse>> {
    const params = new URLSearchParams();
    if (tool !== 'all') {
      params.append('tool', tool);
    }
    if (imageName) {
      params.append('image_name', imageName);
    }
    const queryString = params.toString();
    const endpoint = `${getAstServiceUrl()}/scan/vulnerabilities/pending/${gitInfoIdx}${queryString ? `?${queryString}` : ''}`;

    logger.info('[Vulnerability] Fetching pending vulnerabilities:', {
      gitInfoIdx,
      tool,
      imageName,
    });

    try {
      const response =
        await this.instance.get<
          AnalysisApiResponse<PendingVulnerabilitiesResponse>
        >(endpoint);

      if (!response.data) {
        throw new AnalysisApiError(
          '미해결 취약점 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      logger.info(
        '[Vulnerability] Pending vulnerabilities fetched successfully'
      );
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '미해결 취약점 조회 중 오류 발생',
        500,
        'FETCH_ERROR',
        error
      );
    }
  }

  /**
   * 취약점 해결 상태 업데이트
   * POST /scan/vulnerabilities/resolve
   * @param params 취약점 해결 파라미터
   */
  async resolveVulnerability(
    params: ResolveVulnerabilityParams
  ): Promise<AnalysisApiResponse<ResolveVulnerabilityResponse>> {
    const endpoint = `${getAstServiceUrl()}/scan/vulnerabilities/resolve`;

    logger.info('[Vulnerability] Resolving vulnerability:', {
      item_id: params.item_id,
      status: params.status,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<ResolveVulnerabilityResponse>
      >(endpoint, params);

      if (!response.data) {
        throw new AnalysisApiError(
          '취약점 해결 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || '취약점 해결 상태 업데이트에 실패했습니다.',
          500,
          'UPDATE_FAILED',
          response.data
        );
      }

      logger.info('[Vulnerability] Vulnerability resolved successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '취약점 해결 상태 업데이트 중 오류 발생',
        500,
        'UPDATE_ERROR',
        error
      );
    }
  }

  // ==================== SBOM API ====================

  /**
   * 컨테이너 이미지 SBOM 생성
   * POST /scan/sbom/image
   * @param params SBOM 생성 파라미터
   */
  async generateImageSbom(
    params: GenerateImageSbomParams
  ): Promise<AnalysisApiResponse<SbomResult>> {
    const endpoint = `${getAstServiceUrl()}/scan/sbom/image`;

    logger.info('[SBOM] Generating image SBOM:', {
      image_url: params.image_url,
      license_analysis: params.license_analysis,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<SbomResult>
      >(endpoint, params);

      if (!response.data) {
        throw new AnalysisApiError(
          'SBOM 생성 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || 'SBOM 생성이 실패했습니다.',
          500,
          'SBOM_GENERATION_FAILED',
          response.data
        );
      }

      logger.info('[SBOM] Image SBOM generated successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'SBOM 생성 중 오류 발생',
        500,
        'SBOM_ERROR',
        error
      );
    }
  }

  /**
   * 소스코드 SBOM 생성
   * POST /scan/sbom/source
   * @param params SBOM 생성 파라미터
   */
  async generateSourceSbom(
    params: GenerateSourceSbomParams
  ): Promise<AnalysisApiResponse<SbomResult>> {
    const endpoint = `${getAstServiceUrl()}/scan/sbom/source`;

    logger.info('[SBOM] Generating source SBOM:', {
      git_url: params.git_url,
      branch: params.branch,
      license_analysis: params.license_analysis,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<SbomResult>
      >(endpoint, params);

      if (!response.data) {
        throw new AnalysisApiError(
          'SBOM 생성 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || 'SBOM 생성이 실패했습니다.',
          500,
          'SBOM_GENERATION_FAILED',
          response.data
        );
      }

      logger.info('[SBOM] Source SBOM generated successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'SBOM 생성 중 오류 발생',
        500,
        'SBOM_ERROR',
        error
      );
    }
  }

  /**
   * SBOM 결과 목록 조회
   * GET /scan/sbom/<service_id>
   * @param serviceId 서비스 ID (repo_id)
   */
  async getSbomResults(
    serviceId: number
  ): Promise<AnalysisApiResponse<SbomListResponse>> {
    const endpoint = `${getAstServiceUrl()}/scan/sbom/${serviceId}`;

    logger.info('[SBOM] Fetching SBOM results:', { serviceId });

    try {
      const response =
        await this.instance.get<AnalysisApiResponse<SbomListResponse>>(
          endpoint
        );

      if (!response.data) {
        throw new AnalysisApiError(
          'SBOM 결과 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      logger.info('[SBOM] SBOM results fetched successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'SBOM 결과 조회 중 오류 발생',
        500,
        'FETCH_ERROR',
        error
      );
    }
  }

  /**
   * SBOM 다운로드 (CycloneDX JSON/XML)
   * GET /scan/sbom/<sbom_id>/download
   * @param sbomId SBOM ID
   * @param format 다운로드 형식 (json 또는 xml, 기본값: json)
   */
  async downloadSbom(
    sbomId: number,
    format: 'json' | 'xml' = 'json'
  ): Promise<Blob> {
    const endpoint = `${getAstServiceUrl()}/scan/sbom/${sbomId}/download`;

    logger.info('[SBOM] Downloading SBOM:', { sbomId, format });

    try {
      const response = await this.instance.get(endpoint, {
        responseType: 'blob',
        params: { format },
      });

      logger.info('[SBOM] SBOM downloaded successfully');
      return response.data as Blob;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error ? error.message : 'SBOM 다운로드 중 오류 발생',
        500,
        'DOWNLOAD_ERROR',
        error
      );
    }
  }

  // ==================== 라이선스 분석 API ====================

  /**
   * 라이선스 분석 결과 조회
   * GET /scan/license/<service_id>
   * @param serviceId 서비스 ID (repo_id)
   */
  async getLicenseAnalysis(
    serviceId: number
  ): Promise<AnalysisApiResponse<LicenseAnalysisResult>> {
    const endpoint = `${getAstServiceUrl()}/scan/license/${serviceId}`;

    logger.info('[License] Fetching license analysis:', { serviceId });

    try {
      const response =
        await this.instance.get<AnalysisApiResponse<LicenseAnalysisResult>>(
          endpoint
        );

      if (!response.data) {
        throw new AnalysisApiError(
          '라이선스 분석 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      logger.info('[License] License analysis fetched successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '라이선스 분석 조회 중 오류 발생',
        500,
        'FETCH_ERROR',
        error
      );
    }
  }

  /**
   * 라이선스 검토 상태 업데이트
   * POST /scan/license/resolve
   * @param params 라이선스 검토 파라미터
   */
  async resolveLicense(
    params: ResolveLicenseParams
  ): Promise<AnalysisApiResponse<{ success: boolean; message?: string }>> {
    const endpoint = `${getAstServiceUrl()}/scan/license/resolve`;

    logger.info('[License] Resolving license:', {
      sbom_id: params.sbom_id,
      component_name: params.component_name,
      status: params.status,
    });

    try {
      const response = await this.instance.post<
        AnalysisApiResponse<{ success: boolean; message?: string }>
      >(endpoint, params);

      if (!response.data) {
        throw new AnalysisApiError(
          '라이선스 검토 응답이 비어있습니다.',
          500,
          'EMPTY_RESPONSE'
        );
      }

      if (response.data.success === false) {
        throw new AnalysisApiError(
          response.data.error || '라이선스 검토 상태 업데이트에 실패했습니다.',
          500,
          'UPDATE_FAILED',
          response.data
        );
      }

      logger.info('[License] License resolved successfully');
      return response.data;
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '라이선스 검토 상태 업데이트 중 오류 발생',
        500,
        'UPDATE_ERROR',
        error
      );
    }
  }

  /**
   * 라이선스 리포트 생성
   * GET /scan/license/report/<sbom_id>
   * @param sbomId SBOM ID
   * @param format 리포트 형식 ('json' | 'pdf' | 'csv')
   */
  async getLicenseReport(
    sbomId: number,
    format: 'json' | 'pdf' | 'csv' = 'json'
  ): Promise<Blob | LicenseAnalysisResult> {
    const endpoint = `${getAstServiceUrl()}/scan/license/report/${sbomId}?format=${format}`;

    logger.info('[License] Generating license report:', { sbomId, format });

    try {
      if (format === 'json') {
        const response =
          await this.instance.get<LicenseAnalysisResult>(endpoint);
        logger.info('[License] License report generated successfully');
        return response.data;
      } else {
        const response = await this.instance.get(endpoint, {
          responseType: 'blob',
        });
        logger.info('[License] License report downloaded successfully');
        return response.data as Blob;
      }
    } catch (error) {
      if (error instanceof AnalysisApiError) {
        throw error;
      }
      throw new AnalysisApiError(
        error instanceof Error
          ? error.message
          : '라이선스 리포트 생성 중 오류 발생',
        500,
        'REPORT_ERROR',
        error
      );
    }
  }
}

// ==================== 싱글톤 인스턴스 ====================

export const analysisApi = new AnalysisApiClient();

// 타입 가드
export const isAnalysisApiError = (
  error: unknown
): error is AnalysisApiError => {
  return error instanceof AnalysisApiError;
};

export default analysisApi;
