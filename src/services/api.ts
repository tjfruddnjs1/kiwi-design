import { api as newApi } from '../lib/api';
import type {
    StandardApiResponse as NewStandardApiResponse,
    SshHop,
} from '../lib/api/types';

// 기존 타입 임포트 (하위 호환성)

import {
    ActualBackup,
    Backup,
    BackupInstallStatus,
    BackupStorage,
    BackupStorageWithInfra,
    CreateBackupParams,
    CreateRestoreParams,
    MinioInstallParams,
    Restore,
    SshAuthHop,
    VeleroInstallParams,
} from '../types/backup';

import { GitLabBranch, GitLabCommit, GitLabProject } from '../types/project';
import { StandardApiResponse } from '../types/shared';

// ==================== 타입 호환성 변환 ====================

/**
 * 기존 SshAuthHop을 새로운 SshHop으로 변환
 */
const convertSshHops = (hops: SshAuthHop[]): SshHop[] => {
  return hops.map(hop => ({
    host: hop.host,
    port: typeof hop.port === 'string' ? parseInt(hop.port, 10) : hop.port,
    username: hop.username || '',
    password: hop.password || '',
  }));
};

/**
 * 새로운 API 응답을 기존 형식으로 변환
 */
const convertApiResponse = <T>(
  response: NewStandardApiResponse<T>
): { data: StandardApiResponse<T> } => {
  return {
    data: {
      success: response.success,
      data: response.data,
      error: response.error,
      message: response.message,
      statusCode: response.statusCode,
    },
  };
};

// ==================== 호환성 API 구현 ====================

export const api = {
  // 헬스 체크
  checkHealth: async () => {
    const response = await newApi.checkHealth();

    return { data: response };
  },

  // 인증 API
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const response = await newApi.auth.login(credentials);

      return convertApiResponse(response);
    },

    signup: async (userInfo: { email: string; password: string }) => {
      const response = await newApi.auth.signup(userInfo);

      return convertApiResponse(response);
    },
  },

  // 인프라 API
  infra: {
    // 통합 요청 함수
    request: async <T>(action: string, parameters: Record<string, unknown>) => {
      const response = await newApi.infra.request<T>(action, parameters);

      return convertApiResponse(response);
    },

    // 인프라 목록 조회 (기관별 필터링 지원)
    list: async (organizationId?: number | null) => {
      const response = await newApi.infra.list(organizationId);

      return convertApiResponse(response);
    },

    // 서버 목록 조회
    listServers: async (infraId: number) => {
      const response = await newApi.infra.listServers(infraId);

      return convertApiResponse(response);
    },

    // 외부 런타임 import 시 사전 검증
    validationImportData: async (
      runtimeName: string,
      serverType: string,
      hops: {
        host: string;
        port: number;
        username: string;
        password: string;
      }[],
      userId: number
    ) => {
      const response = await newApi.infra.validationImportData(
        runtimeName,
        serverType,
        hops,
        userId
      );

      return convertApiResponse(response);
    },
  },

  // 서비스 API
  service: {
    // 통합 요청 함수 (아직 구현되지 않음)
    request: async <T>(action: string, parameters: Record<string, unknown>) => {
      const response = await newApi.client.request<T>(
        '/service',
        action,
        parameters
      );

      return convertApiResponse(response);
    },
  },

  // Kubernetes API
  kubernetes: {
    // 통합 요청 함수
    request: async <T>(action: string, parameters: Record<string, unknown>) => {
      const response = await newApi.kubernetes.request<T>(action, parameters);

      return convertApiResponse(response);
    },

    // 마지막 배포 시간 조회
    getLastDeploymentTime: async (params: { namespace: string }) => {
      const response = await newApi.kubernetes.getLastDeploymentTime(params);

      return convertApiResponse(response);
    },

    // SSH 연결 테스트
    testSSHConnection: async (
      hops: { host: string; port: number; username: string; password: string }[]
    ) => {
      const response = await newApi.kubernetes.request<{ message: string }>(
        'testSSHConnection',
        { hops }
      );
      return convertApiResponse(response);
    },
  },

  // Docker API
  docker: {
    // 통합 요청 함수 (아직 구현되지 않음)
    request: async <T>(action: string, parameters: Record<string, unknown>) => {
      const response = await newApi.client.request<T>(
        '/docker',
        action,
        parameters
      );

      return convertApiResponse(response);
    },

    // SSH 연결 테스트
    testSSHConnection: async (
      hops: { host: string; port: number; username: string; password: string }[]
    ) => {
      const response = await newApi.client.request<{ message: string }>(
        '/docker',
        'testSSHConnection',
        { hops }
      );
      return convertApiResponse(response);
    },
  },

  // 백업 API
  backup: {
    // MinIO 설치
    installMinio: async (params: MinioInstallParams) => {
      //  newParams에 auth_data를 포함시킵니다.
      const newParams = {
        infra_id: params.infra_id,
        server_id: params.server_id,
        access_key: params.access_key,
        secret_key: params.secret_key,
        port: params.port,
        //  hops 배열을 변환하여 auth_data로 전달합니다.
        auth_data: params.auth_data ? convertSshHops(params.auth_data) : [],
      };

      const response = await newApi.client.request<BackupStorage>(
        '/backup',
        'install-minio',
        newParams
      );

      return convertApiResponse(response);
    },

    // Velero 설치
    installVelero: async (params: VeleroInstallParams) => {
      //  newParams에 auth_data를 포함시킵니다.
      const newParams: Record<string, unknown> = {
        infra_id: params.infra_id,
        minio_endpoint: params.minio_endpoint,
        access_key: params.access_key,
        secret_key: params.secret_key,
        bucket: params.bucket,
        //  hops 배열을 변환하여 auth_data로 전달합니다.
        auth_data: params.auth_data ? convertSshHops(params.auth_data) : [],
      };

      // 외부 저장소 ID가 있으면 추가
      if (params.external_storage_id) {
        newParams.external_storage_id = params.external_storage_id;
      }

      const response = await newApi.client.request<BackupStorage>(
        '/backup',
        'install-velero',
        newParams
      );

      return convertApiResponse(response);
    },

    // 설치 상태 확인
    checkInstallation: async (infraId: number) => {
      const response = await newApi.client.request<BackupInstallStatus>(
        '/backup',
        'check-installation',
        { infra_id: infraId }
      );

      return convertApiResponse(response);
    },

    // 백업 생성
    createBackup: async (params: CreateBackupParams) => {
      const response = await newApi.client.request<Backup>(
        '/backup',
        'create-backup',
        params
      );

      return convertApiResponse(response);
    },

    // 백업 목록 조회
    listBackups: async (infraId: number) => {
      const response = await newApi.client.request<Backup[]>(
        '/backup',
        'list-backups',
        { infra_id: infraId }
      );

      return convertApiResponse(response);
    },

    // 백업 삭제
    deleteBackup: async (
      infraId: number,
      name: string,
      authData: SshAuthHop[]
    ) => {
      const response = await newApi.client.request<void>(
        '/backup',
        'delete-backup',
        {
          infra_id: infraId,
          name,
          auth_data: convertSshHops(authData),
        }
      );

      return convertApiResponse(response);
    },

    // 복구 생성
    createRestore: async (params: CreateRestoreParams) => {
      const newParams = {
        infra_id: params.infra_id,
        backup_name: params.backup_name,
        backup_version: params.backup_version, // 실제 복구 버전
        namespace_mappings: params.namespace_mappings,
        auth_data: convertSshHops(params.auth_data),
      };

      const response = await newApi.client.request<Restore>(
        '/backup',
        'create-restore',
        newParams
      );

      return convertApiResponse(response);
    },

    // 복구 목록 조회
    listRestores: async (infraId: number) => {
      const response = await newApi.client.request<Restore[]>(
        '/backup',
        'list-restores',
        { infra_id: infraId }
      );

      return convertApiResponse(response);
    },

    // 복구 삭제
    deleteRestore: async (
      infraId: number,
      name: string,
      authData: SshAuthHop[]
    ) => {
      const response = await newApi.client.request<void>(
        '/backup',
        'delete-restore',
        {
          infra_id: infraId,
          name,
          auth_data: convertSshHops(authData),
        }
      );

      return convertApiResponse(response);
    },

    // MinIO 저장소 목록 조회
    listMinioStorages: async (infraId: number) => {
      const response = await newApi.client.request<BackupStorage[]>(
        '/backup',
        'list-minio-storages',
        { infra_id: infraId }
      );

      return convertApiResponse(response);
    },

    // 모든 MinIO 저장소 목록 조회
    listAllMinioStorages: async () => {
      const response = await newApi.client.request<BackupStorageWithInfra[]>(
        '/backup',
        'list-all-minio-storages',
        {}
      );

      return convertApiResponse(response);
    },

    // 네임스페이스 목록 조회
    fetchNamespaces: async (infraId: number, authData: SshAuthHop[]) => {
      const response = await newApi.client.request<string[]>(
        '/backup',
        'fetch-namespaces',
        {
          infra_id: infraId,
          auth_data: convertSshHops(authData),
        }
      );

      return convertApiResponse(response);
    },

    // 설치 상태 조회
    getInstallationStatus: async (infraId: number) => {
      const response = await newApi.client.request<BackupInstallStatus>(
        '/backup',
        'get-installation-status',
        { infra_id: infraId }
      );

      return convertApiResponse(response);
    },

    // 실제 백업 목록 조회
    listActualBackups: async (
      infraId: number,
      groupLabel: string,
      backupName: string,
      namespace: string,
      authData: SshAuthHop[]
    ) => {
      const response = await newApi.client.request<ActualBackup[]>(
        '/backup',
        'list-actual-backups',
        {
          infra_id: infraId,
          group_label: groupLabel,
          backup_name: backupName,
          namespace,
          auth_data: convertSshHops(authData),
        }
      );

      return convertApiResponse(response);
    },

    // 백업 환경 전체 설치 시작
    startFullSetup: async (params: Record<string, any>) => {
      const response = await newApi.client.request<{ job_id: number }>(
        '/backup',
        'start-full-setup',
        params
      );
      return convertApiResponse(response);
    },

    // 백업 환경 설치 상태 조회
    getSetupStatus: async (jobId: number) => {
      const response = await newApi.client.request<{
        status: string;
        error_message?: string;
      }>('/backup', 'get-setup-status', { job_id: jobId });
      return convertApiResponse(response);
    },

    // 인프라 백업 라인 추가
    addInfraBackupLine: async (params: Record<string, any>) => {
      const response = await newApi.client.request<{ job_id: number }>(
        '/backup',
        'add-infra-backup-line',
        params
      );
      return convertApiResponse(response);
    },

    // 백업 정보 삽입
    insertBackup: async (params: CreateBackupParams) => {
      const response = await newApi.client.request<Backup>(
        '/backup',
        'insert-backup',
        params
      );

      return convertApiResponse(response);
    },

    // 백업 정보 수정
    updateBackup: async (params: any) => {
      const response = await newApi.client.request<Backup>(
        '/backup',
        'update-backup',
        params
      );

      return convertApiResponse(response);
    },

    // 백업 정보 삭제
    removeBackup: async (params: any) => {
      const response = await newApi.client.request<void>(
        '/backup',
        'remove-backup',
        params
      );

      return convertApiResponse(response);
    },

    getBucketName: async (infraId: number) => {
      const response = await newApi.client.request<{ bucket_name: string }>(
        '/backup',
        'get-bucket-name',
        { infra_id: infraId }
      );

      return convertApiResponse(response).data.data;
    },

    // MinIO 저장소 생성
    createBackupStorage: async (params: {
      infra_id: number;
      name: string;
      type: 'minio' | 'velero';
      endpoint?: string;
      access_key?: string;
      secret_key?: string;
      bucket?: string;
      status?: string;
      server_id?: number;
    }) => {
      const response = await newApi.client.request<BackupStorage>(
        '/backup',
        'create-backup-storage',
        params
      );

      return convertApiResponse(response).data;
    },
  },

  // Git API
  git: {
    // 통합 요청 함수
    request: async <T>(action: string, parameters: Record<string, unknown>) => {
      const response = await newApi.client.request<T>(
        '/git-stats',
        action,
        parameters
      );

      return convertApiResponse(response);
    },
  },

  // 프로젝트 API
  project: {
    // GitLab 프로젝트 목록 조회
    listMyProjects: async () => {
      const response = await newApi.client.request<GitLabProject[]>(
        '/project',
        'list-my-gitlab-projects',
        {}
      );

      return convertApiResponse(response);
    },

    // 브랜치 목록 조회
    listBranches: async (projectId: number) => {
      const response = await newApi.client.request<GitLabBranch[]>(
        '/project',
        'list-branches',
        { projectId }
      );

      return convertApiResponse(response);
    },

    // 커밋 목록 조회
    listCommits: async (projectId: number, branchName: string) => {
      const response = await newApi.client.request<GitLabCommit[]>(
        '/project',
        'list-commits',
        { projectId, branchName }
      );

      return convertApiResponse(response);
    },
  },

  // 사용자 API
  user: {
    // GitLab 상태 확인
    checkGitLabStatus: async () => {
      const response = await newApi.client.request<{
        hasToken: boolean;
        gitlabURL: string;
      }>('/user', 'check-gitlab-status', {});

      return convertApiResponse(response);
    },

    // GitLab 정보 저장
    saveGitLabInfo: async (info: {
      accessToken: string;
      gitlabURL: string;
    }) => {
      const response = await newApi.client.request<void>(
        '/user',
        'save-gitlab-info',
        info
      );

      return convertApiResponse(response);
    },
    getInitialGitLabPassword: async () => {
      // 백엔드의 /user 엔드포인트에 getInitialGitLabPassword 액션을 요청합니다.
      const response = await newApi.client.request<{ password: string }>(
        '/user',
        'getInitialGitLabPassword',
        {}
      );

      // 기존 코드와 응답 형식을 맞추기 위해 변환 함수를 사용합니다.
      return convertApiResponse(response);
    },
  },

  // Nginx API
  nginx: {
    // 통합 요청 함수
    request: async <T>(action: string, parameters: Record<string, unknown>) => {
      const response = await newApi.client.request<T>(
        '/nginx',
        action,
        parameters
      );

      return convertApiResponse(response);
    },
  },

  // ==================== 기존 HTTP 메서드 지원 ====================

  get: newApi.client.get.bind(newApi.client),
  post: newApi.client.post.bind(newApi.client),
  put: newApi.client.put.bind(newApi.client),
  delete: newApi.client.delete.bind(newApi.client),
};

// 기본 내보내기 (기존 코드 호환성)
export default newApi.client.getAxiosInstance();
