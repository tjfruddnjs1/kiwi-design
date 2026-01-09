import { GitlabUser, GitRepository } from '../../pages/gits/GitManagement';
import { apiClient } from './client';
import { analysisApi } from './analysis-client';
import { logger } from '../../utils/logger';

export const gitApi = {
  list: async () => {
    return apiClient.post('/gits', {
      action: 'getRepositories',
    });
  },
  getRepoById: async (id: number) => {
    return apiClient.post('/gits', {
      action: 'getRepositoryById',
      parameters: { id },
    });
  },
  add: async (repo: GitRepository) => {
    return apiClient.post('/gits', {
      action: 'createRepository',
      parameters: repo,
    });
  },
  delete: async (id: number) => {
    return apiClient.post('/gits', {
      action: 'deleteRepository',
      parameters: { id },
    });
  },

  getRepoMembers: async (id: number) => {
    return apiClient.post('/gits', {
      action: 'getRepoMembers',
      parameters: { id },
    });
  },
  addRepoMember: async (id: number, email: string, adminToken: string) => {
    return apiClient.post('/gits', {
      action: 'addRepoMember',
      parameters: { id, email, admin_token: adminToken },
    });
  },
  removeRepoMember: async (id: number, email: string, adminToken: string) => {
    return apiClient.post('/gits', {
      action: 'removeRepoMember',
      parameters: { id, email, admin_token: adminToken },
    });
  },

  getUsername: async (gitlabUrl: string) => {
    return apiClient.post('/gits', {
      action: 'getUsername',
      parameters: { gitlabUrl },
    });
  },

  getGroups: async (gitlab_url: string) => {
    return apiClient.post('/gits', {
      action: 'getGroups',
      parameters: { gitlab_url },
    });
  },

  createUser: async (userInfo: GitlabUser) => {
    return apiClient.post('/gits', {
      action: 'createUser',
      parameters: {
        gitlabUrl: userInfo.gitlabUrl,
        groupID: userInfo.groupID,
        userAuth: userInfo.userAuth,
        username: userInfo.username,
        name: userInfo.name,
        email: userInfo.email,
        password: userInfo.password,
      },
    });
  },

  // SAST 결과 저장 API
  newSastResult: async (repoId: number) => {
    return apiClient.post('/gits', {
      action: 'newSastResult',
      parameters: { repo_id: repoId },
    });
  },

  saveSastResult: async (
    repoId: number,
    result: string,
    status: string,
    semgrepCommandLog?: string,
    codeqlCommandLog?: string,
    trivyCommandLog?: string
  ) => {
    return apiClient.post('/gits', {
      action: 'saveSastResult',
      parameters: {
        repo_id: repoId,
        result,
        status,
        semgrep_command_log: semgrepCommandLog || '',
        codeql_command_log: codeqlCommandLog || '',
        trivy_command_log: trivyCommandLog || null,
      },
    });
  },

  getSastResult: async (repoId: number) => {
    return apiClient.post('/gits', {
      action: 'getSastResult',
      parameters: { repo_id: repoId },
    });
  },

  // 모든 SAST last_update 조회
  listSastLastUpdates: async () => {
    return apiClient.post('/gits', {
      action: 'listSastLastUpdates',
      parameters: {},
    });
  },

  // SAST 스캔 실행 (스캔은 오래 걸리므로 5분 타임아웃)
  executeSastScan: async (params: {
    repo_id: number;
    git_url: string;
    branch?: string;
    git_token?: string;
    generate_sbom?: boolean;
    license_analysis?: boolean;
  }) => {
    return apiClient.post(
      '/gits',
      {
        action: 'executeSastScan',
        parameters: params,
      },
      { timeout: 300000 }
    );
  },

  // 관리자 토큰 유효성 검증 API
  validateAdminToken: async (token: string, gitlabUrl: string) => {
    return apiClient.post('/gits', {
      action: 'validateAdminToken',
      parameters: { token, gitlab_url: gitlabUrl },
    });
  },

  // 커밋 내역 조회
  getCommits: async (repoId: number, gitlabToken?: string) => {
    const parameters: { repo_id: number; gitlab_token?: string } = {
      repo_id: repoId,
    };
    if (gitlabToken) {
      parameters.gitlab_token = gitlabToken;
    }
    return apiClient.post('/gits', {
      action: 'getCommits',
      parameters,
    });
  },

  // ==================== SCA 관련 API ====================

  /**
   * Trivy 컨테이너 이미지 스캔
   * - Backend Go 서버를 통해 호출하여 notification 생성
   * - 상세한 에러 처리 및 실패 상태 반환
   */
  trivyScanImage: async (params: {
    repo_id: number;
    image_url: string;
    scan_type?: string;
    registry_username?: string;
    registry_password?: string;
  }) => {
    logger.info('[SCA] Trivy 이미지 스캔 시작 (Backend 통해):', {
      image_url: params.image_url,
    });

    // Backend Go 서버를 통해 호출 - notification이 자동 생성됨
    return apiClient.post(
      '/gits',
      {
        action: 'newScaResult',
        parameters: {
          repo_id: params.repo_id,
          image_url: params.image_url,
          scan_type: params.scan_type || 'vuln',
          registry_username: params.registry_username,
          registry_password: params.registry_password,
        },
      },
      { timeout: 300000 }
    ); // 5분 타임아웃 (스캔은 오래 걸릴 수 있음)
  },

  // 새 SCA 결과 생성
  newScaResult: async (repoId: number, params?: Record<string, unknown>) => {
    return apiClient.post('/gits', {
      action: 'newScaResult',
      parameters: {
        repo_id: repoId,
        ...params,
      },
    });
  },

  // SCA 결과 저장
  saveScaResult: async (
    repoId: number,
    result: string,
    status: string,
    executionLog?: string
  ) => {
    return apiClient.post('/gits', {
      action: 'saveScaResult',
      parameters: {
        repo_id: repoId,
        result,
        status,
        execution_log: executionLog || '',
      },
    });
  },

  // SCA 결과 조회 (최신 1개)
  getScaResult: async (repoId: number) => {
    return apiClient.post('/gits', {
      action: 'getScaResult',
      parameters: { repo_id: repoId },
    });
  },

  // SCA 여러 결과 조회 (최신순)
  getScaResults: async (repoId: number, limit: number = 10) => {
    return apiClient.post('/gits', {
      action: 'getScaResults',
      parameters: { repo_id: repoId, limit },
    });
  },

  // SCA 업데이트 목록 조회
  listScaLastUpdates: async () => {
    return apiClient.post('/gits', {
      action: 'listScaLastUpdates',
      parameters: {},
    });
  },

  // ==================== DAST 관련 API ====================

  // 새 DAST 결과 생성
  newDastResult: async (repoId: number) => {
    return apiClient.post('/gits', {
      action: 'newDastResult',
      parameters: { repo_id: repoId },
    });
  },

  // DAST 결과 저장
  saveDastResult: async (
    repoId: number,
    result: string,
    status: string,
    executionLog?: string
  ) => {
    return apiClient.post('/gits', {
      action: 'saveDastResult',
      parameters: {
        repo_id: repoId,
        result,
        status,
        execution_log: executionLog || '',
      },
    });
  },

  // DAST 결과 조회
  getDastResult: async (repoId: number) => {
    return apiClient.post('/gits', {
      action: 'getDastResult',
      parameters: { repo_id: repoId },
    });
  },

  // DAST 업데이트 목록 조회
  listDastLastUpdates: async () => {
    return apiClient.post('/gits', {
      action: 'listDastLastUpdates',
      parameters: {},
    });
  },

  // DAST 스캔 실행
  executeDastScan: async (
    repoId: number,
    params: {
      target_url: string;
      scan_type: string;
      options?: Record<string, unknown>;
    }
  ) => {
    return apiClient.post('/gits', {
      action: 'executeDastScan',
      parameters: {
        repo_id: repoId,
        ...params,
      },
    });
  },

  /**
   * DAST 웹 보안 스캔 (ZAP)
   * - Backend Go 서버를 통해 호출하여 notification 생성
   * - 상세한 에러 처리 및 실패 상태 반환
   */
  dastScanWeb: async (params: {
    repo_id: number;
    target_url: string;
    scan_type?: string;
    options?: Record<string, unknown>;
  }) => {
    logger.info('[DAST] ZAP 웹 스캔 시작 (Backend 통해):', {
      target_url: params.target_url,
    });

    // Backend Go 서버를 통해 호출 - notification이 자동 생성됨
    return apiClient.post(
      '/gits',
      {
        action: 'executeDastScan',
        parameters: {
          repo_id: params.repo_id,
          target_url: params.target_url,
          scan_type: params.scan_type || 'baseline',
          options: params.options,
        },
      },
      { timeout: 300000 }
    ); // 5분 타임아웃 (DAST 스캔은 오래 걸릴 수 있음)
  },

  /**
   * 현재 분석 서비스 설정 정보 반환 (디버깅/상태 확인용)
   */
  getAnalysisServiceConfig: () => {
    return analysisApi.getServiceConfig();
  },

  /**
   * 분석 서비스 연결 상태 확인
   */
  checkAnalysisServiceHealth: async () => {
    return analysisApi.checkHealth();
  },

  // ==================== SBOM 관련 API ====================

  /**
   * 컨테이너 이미지 SBOM 생성
   * - Backend Go 서버 프록시를 통해 호출하여 에러 처리 개선
   * - AST 서비스 장애 시 상세한 에러 메시지 제공
   */
  generateImageSbom: async (params: {
    repo_id: number;
    image_url: string;
    license_analysis?: boolean;
    registry_username?: string;
    registry_password?: string;
  }) => {
    logger.info('[SBOM] 이미지 SBOM 생성 시작 (Backend 통해):', {
      image_url: params.image_url,
      license_analysis: params.license_analysis,
    });

    // Backend Go 서버 프록시를 통해 호출 - 에러 처리 개선됨
    return apiClient.post('/sbom/image', params, { timeout: 600000 }); // 10분 타임아웃
  },

  /**
   * 소스코드 SBOM 생성
   * - Backend Go 서버 프록시를 통해 호출
   */
  generateSourceSbom: async (params: {
    repo_id: number;
    git_url: string;
    branch?: string;
    git_token?: string;
    license_analysis?: boolean;
  }) => {
    logger.info('[SBOM] 소스코드 SBOM 생성 시작 (Backend 통해):', {
      git_url: params.git_url,
      branch: params.branch,
      license_analysis: params.license_analysis,
    });

    return apiClient.post('/sbom/source', params, { timeout: 600000 }); // 10분 타임아웃
  },

  /**
   * SBOM 결과 목록 조회
   */
  getSbomResults: async (serviceId: number) => {
    return apiClient.get(`/sbom/list/${serviceId}`);
  },

  /**
   * SBOM 다운로드
   */
  downloadSbom: async (sbomId: number, format: 'json' | 'xml' = 'json') => {
    return apiClient.get(`/sbom/download/${sbomId}?format=${format}`, {
      responseType: 'blob',
    });
  },
};
