// 레거시 API 파일 백업
// 기존 api.ts 파일의 백업본입니다
// 마이그레이션 완료 후 삭제 예정

import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { ServerStatus } from '../types';
import {
  BackupStorage,
  BackupStorageWithInfra,
  Backup,
  MinioInstallParams,
  VeleroInstallParams,
  CreateBackupParams,
  CreateRestoreParams,
  BackupInstallStatus,
  Restore,
  ActualBackup,
  SshAuthHop,
} from '../types/backup';
import { Infrastructure, Server } from '../types/infra';
import { GitLabBranch, GitLabCommit, GitLabProject } from '../types/project';
import { StandardApiResponse } from '../types/shared';

const API_URL =
  process.env['REACT_APP_API_URL'] || 'http://localhost:8080/api/v1';

// 재시도 설정
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

// 에러 타입 정의

// API 응답 타입은 shared.ts의 StandardApiResponse 사용

// Axios 설정 타입 확장
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// API 클라이언트 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 600000, // 10분 타임아웃 (600초)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 재시도 로직
const retryRequest = async (
  error: AxiosError,
  retryCount: number = 0
): Promise<AxiosResponse> => {
  const { config } = error;

  if (!config || retryCount >= RETRY_CONFIG.maxRetries) {
    throw error;
  }

  if (RETRY_CONFIG.retryStatusCodes.includes(error.response?.status || 0)) {
    await new Promise(resolve =>
      setTimeout(resolve, RETRY_CONFIG.retryDelay * (retryCount + 1))
    );

    return apiClient.request(config);
  }

  throw error;
};

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('authToken');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 요청 로깅 (개발 환경에서만)
    if (process.env['NODE_ENV'] === 'development') {
      // Development logging disabled - use browser devtools instead
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 응답 로깅 (개발 환경에서만)
    if (process.env['NODE_ENV'] === 'development') {
      // Development logging disabled - use browser devtools instead
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    // 재시도 로직
    if (originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      return retryRequest(error, 0);
    }

    // 라이선스 만료 처리
    if (error.response?.status === 403 && error.response.data) {
      const responseData = error.response.data as Record<string, unknown>;

      if (responseData['expiry_date']) {
        const event = new CustomEvent('licenseExpired', {
          detail: {
            expiryDate: responseData['expiry_date'],
            message: responseData['error'],
          },
        });

        window.dispatchEvent(event);
      }
    }

    // 인증 만료 처리
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    // 에러 로깅
    const _errorData = error.response?.data as
      | Record<string, unknown>
      | undefined;

    return Promise.reject(error);
  }
);

// API 함수들
const legacyApi = {
  // 헬스 체크
  checkHealth: () => apiClient.get<ServerStatus>('/status'),

  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post<StandardApiResponse<{ token: string }>>(
        '/auth/login',
        credentials
      ),
    signup: (userInfo: { email: string; password: string }) =>
      apiClient.post<StandardApiResponse<void>>('/auth/signup', userInfo),
  },

  // 인프라 API (통합 형식)
  infra: {
    // 단일 엔드포인트로 모든 요청 처리
    request: <T>(action: string, parameters: Record<string, unknown>) =>
      apiClient.post<StandardApiResponse<T>>('/infra', {
        action,
        parameters,
      }),

    // 인프라 목록 조회
    list: () =>
      apiClient.post<StandardApiResponse<Infrastructure[]>>('/infra', {
        action: 'list',
        parameters: {},
      }),

    // 서버 목록 조회
    listServers: (infraId: number) =>
      apiClient.post<StandardApiResponse<Server[]>>('/infra', {
        action: 'list-servers',
        parameters: { infra_id: infraId },
      }),
  },

  // 서비스 API (통합 형식)
  service: {
    // 단일 엔드포인트로 모든 요청 처리
    request: <T>(action: string, parameters: Record<string, unknown>) =>
      apiClient.post<StandardApiResponse<T>>('/service', {
        action,
        parameters,
      }),
  },

  // 통합 쿠버네티스 API
  kubernetes: {
    // 단일 엔드포인트로 모든 요청 처리
    request: <T>(action: string, parameters: Record<string, unknown>) =>
      apiClient.post<StandardApiResponse<T>>('/kubernetes', {
        action,
        parameters,
      }),
    getLastDeploymentTime: (params: { namespace: string }) =>
      apiClient.post<StandardApiResponse<{ lastDeploymentTime: string }>>(
        '/kubernetes',
        {
          action: 'get-last-deployment-time',
          parameters: params,
        }
      ),
  },

  // 통합 도커 API
  docker: {
    // 단일 엔드포인트로 모든 요청 처리
    request: <T>(action: string, parameters: Record<string, unknown>) =>
      apiClient.post<StandardApiResponse<T>>('/docker', {
        action,
        parameters,
      }),
  },

  // 통합 백업 API
  backup: {
    // MinIO 설치
    installMinio: (params: MinioInstallParams) =>
      apiClient.post<StandardApiResponse<BackupStorage>>('/backup', {
        action: 'install-minio',
        parameters: params,
      }),

    // Velero 설치
    installVelero: (params: VeleroInstallParams) =>
      apiClient.post<StandardApiResponse<BackupStorage>>('/backup', {
        action: 'install-velero',
        parameters: params,
      }),

    // 설치 상태 확인
    checkInstallation: (infraId: number) =>
      apiClient.post<StandardApiResponse<BackupInstallStatus>>('/backup', {
        action: 'check-installation',
        parameters: { infra_id: infraId },
      }),

    // 백업 생성
    createBackup: (params: CreateBackupParams) =>
      apiClient.post<StandardApiResponse<Backup>>('/backup', {
        action: 'create-backup',
        parameters: params,
      }),

    // 백업 목록 조회
    listBackups: (infraId: number) =>
      apiClient.post<StandardApiResponse<Backup[]>>('/backup', {
        action: 'list-backups',
        parameters: { infra_id: infraId },
      }),

    // 백업 삭제
    deleteBackup: (infraId: number, name: string, authData: SshAuthHop[]) =>
      apiClient.post<StandardApiResponse<void>>('/backup', {
        action: 'delete-backup',
        parameters: { infra_id: infraId, name, auth_data: authData },
      }),

    // 복구 생성
    createRestore: (params: CreateRestoreParams) =>
      apiClient.post<StandardApiResponse<Restore>>('/backup', {
        action: 'create-restore',
        parameters: params,
      }),

    // 복구 목록 조회
    listRestores: (infraId: number) =>
      apiClient.post<StandardApiResponse<Restore[]>>('/backup', {
        action: 'list-restores',
        parameters: { infra_id: infraId },
      }),

    // 복구 삭제
    deleteRestore: (infraId: number, name: string, authData: SshAuthHop[]) =>
      apiClient.post<StandardApiResponse<void>>('/backup', {
        action: 'delete-restore',
        parameters: { infra_id: infraId, name, auth_data: authData },
      }),

    // MinIO 저장소 목록 조회
    listMinioStorages: (infraId: number) =>
      apiClient.post<StandardApiResponse<BackupStorage[]>>('/backup', {
        action: 'list-minio-storages',
        parameters: { infra_id: infraId },
      }),

    // 모든 MinIO 저장소 목록 조회
    listAllMinioStorages: () =>
      apiClient.post<StandardApiResponse<BackupStorageWithInfra[]>>('/backup', {
        action: 'list-all-minio-storages',
        parameters: {},
      }),

    // 네임스페이스 목록 조회
    fetchNamespaces: (infraId: number, authData: SshAuthHop[]) =>
      apiClient.post<StandardApiResponse<string[]>>('/backup', {
        action: 'fetch-namespaces',
        parameters: { infra_id: infraId, auth_data: authData },
      }),

    // 설치 상태 조회
    getInstallationStatus: (infraId: number) =>
      apiClient.post<StandardApiResponse<BackupInstallStatus>>('/backup', {
        action: 'get-installation-status',
        parameters: { infra_id: infraId },
      }),

    // 실제 백업 목록 조회
    listActualBackups: (
      infraId: number,
      backupName: string,
      namespace: string,
      authData: SshAuthHop[]
    ) =>
      apiClient.post<StandardApiResponse<ActualBackup[]>>('/backup', {
        action: 'list-actual-backups',
        parameters: {
          infra_id: infraId,
          backup_name: backupName,
          namespace,
          auth_data: authData,
        },
      }),
  },

  // 프로젝트 API
  project: {
    // GitLab 프로젝트 목록 조회
    listMyProjects: () =>
      apiClient.post<StandardApiResponse<GitLabProject[]>>('/project', {
        action: 'list-my-gitlab-projects',
        parameters: {},
      }),

    // 브랜치 목록 조회
    listBranches: (projectId: number) =>
      apiClient.post<StandardApiResponse<GitLabBranch[]>>('/project', {
        action: 'list-branches',
        parameters: { projectId },
      }),

    // 커밋 목록 조회
    listCommits: (projectId: number, branchName: string) =>
      apiClient.post<StandardApiResponse<GitLabCommit[]>>('/project', {
        action: 'list-commits',
        parameters: { projectId, branchName },
      }),
  },

  // 사용자 API
  user: {
    // GitLab 상태 확인
    checkGitLabStatus: () =>
      apiClient.post<StandardApiResponse<{ hasToken: boolean }>>('/user', {
        action: 'check-gitlab-status',
        parameters: {},
      }),

    // GitLab 정보 저장
    saveGitLabInfo: (info: { accessToken: string }) =>
      apiClient.post<StandardApiResponse<void>>('/user', {
        action: 'save-gitlab-info',
        parameters: info,
      }),
  },
};

// 기존 HTTP 메서드들을 api 객체에 추가
interface HttpMethods {
  get: AxiosInstance['get'];
  post: AxiosInstance['post'];
  put: AxiosInstance['put'];
  delete: AxiosInstance['delete'];
}

const legacyApiWithMethods = legacyApi as typeof legacyApi & HttpMethods;

legacyApiWithMethods.get = apiClient.get.bind(apiClient);
legacyApiWithMethods.post = apiClient.post.bind(apiClient);
legacyApiWithMethods.put = apiClient.put.bind(apiClient);
legacyApiWithMethods.delete = apiClient.delete.bind(apiClient);

// API 클라이언트 인스턴스 내보내기
export default apiClient;

// Export the enhanced legacyApi with HTTP methods
export { legacyApiWithMethods as legacyApi };
