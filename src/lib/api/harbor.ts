/**
 * Harbor API 클라이언트
 * Harbor 레지스트리의 프로젝트 관리 API
 */

import apiClient from '../../utils/apiClient';
import { logger } from '../../utils/logger';

export interface HarborProject {
  project_id: number;
  name: string;
  'metadata.public': boolean;
  repo_count: number;
  creation_time: string;
}

export interface HarborProjectsResponse {
  projects: HarborProject[];
  registry_url: string;
}

export interface HarborProjectCheckResponse {
  exists: boolean;
  project?: HarborProject;
}

/**
 * Harbor 프로젝트 목록 조회
 * @param credentials Harbor 인증 정보 (선택사항, 기본값 사용)
 */
export const getHarborProjects = async (credentials?: {
  registry_url?: string;
  username?: string;
  password?: string;
}): Promise<HarborProjectsResponse> => {
  try {
    const response = await apiClient.post<
      { registry_url?: string; username?: string; password?: string },
      HarborProjectsResponse
    >('/harbor/projects', credentials || {});

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Harbor 프로젝트 목록 조회 실패');
    }

    logger.info(`Harbor 프로젝트 ${response.data.projects.length}개 조회 성공`);
    return response.data;
  } catch (error) {
    logger.error('Harbor 프로젝트 목록 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * Harbor 프로젝트 존재 여부 확인
 * @param projectName 확인할 프로젝트명
 * @param credentials Harbor 인증 정보 (선택사항, 기본값 사용)
 */
export const checkHarborProject = async (
  projectName: string,
  credentials?: {
    registry_url?: string;
    username?: string;
    password?: string;
  }
): Promise<HarborProjectCheckResponse> => {
  try {
    const response = await apiClient.post<
      {
        project_name: string;
        registry_url?: string;
        username?: string;
        password?: string;
      },
      HarborProjectCheckResponse
    >('/harbor/projects/check', {
      project_name: projectName,
      ...(credentials || {}),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || '프로젝트 확인 실패');
    }

    return response.data;
  } catch (error) {
    logger.error(`Harbor 프로젝트 '${projectName}' 확인 실패:`, error as Error);
    throw error;
  }
};

/**
 * Harbor 저장소(Repository) 관련 타입
 */
export interface HarborRepository {
  id: number;
  name: string;
  project_id: number;
  description: string;
  pull_count: number;
  artifact_count: number;
  creation_time: string;
  update_time: string;
}

export interface HarborRepositoriesResponse {
  repositories: HarborRepository[];
  project_name: string;
  registry_url: string;
}

/**
 * Harbor 태그 관련 타입
 */
export interface HarborTag {
  id: number;
  repository_id: number;
  artifact_id: number;
  name: string;
  push_time: string;
  pull_time: string;
  immutable: boolean;
  signed: boolean;
}

export interface HarborArtifact {
  id: number;
  digest: string;
  size: number;
  push_time: string;
  pull_time: string;
  tags: HarborTag[];
}

export interface HarborTagsResponse {
  tags: HarborTag[];
  artifacts: HarborArtifact[];
  project_name: string;
  repository_name: string;
  registry_url: string;
}

/**
 * Harbor 저장소 목록 조회
 * @param projectName 프로젝트명
 * @param credentials Harbor 인증 정보 (선택사항)
 */
export const getHarborRepositories = async (
  projectName: string,
  credentials?: {
    registry_url?: string;
    username?: string;
    password?: string;
  }
): Promise<HarborRepositoriesResponse> => {
  try {
    const response = await apiClient.post<
      {
        project_name: string;
        registry_url?: string;
        username?: string;
        password?: string;
      },
      HarborRepositoriesResponse
    >('/harbor/repositories', {
      project_name: projectName,
      ...(credentials || {}),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Harbor 저장소 목록 조회 실패');
    }

    logger.info(
      `Harbor 프로젝트 '${projectName}'의 저장소 ${response.data.repositories.length}개 조회 성공`
    );
    return response.data;
  } catch (error) {
    logger.error(
      `Harbor 프로젝트 '${projectName}' 저장소 목록 조회 실패:`,
      error as Error
    );
    throw error;
  }
};

/**
 * Harbor 이미지 태그 목록 조회
 * @param projectName 프로젝트명
 * @param repositoryName 저장소명
 * @param credentials Harbor 인증 정보 (선택사항)
 */
export const getHarborTags = async (
  projectName: string,
  repositoryName: string,
  credentials?: {
    registry_url?: string;
    username?: string;
    password?: string;
  }
): Promise<HarborTagsResponse> => {
  try {
    const response = await apiClient.post<
      {
        project_name: string;
        repository_name: string;
        registry_url?: string;
        username?: string;
        password?: string;
      },
      HarborTagsResponse
    >('/harbor/tags', {
      project_name: projectName,
      repository_name: repositoryName,
      ...(credentials || {}),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Harbor 태그 목록 조회 실패');
    }

    logger.info(
      `Harbor 저장소 '${projectName}/${repositoryName}'의 태그 ${response.data.tags.length}개 조회 성공`
    );
    return response.data;
  } catch (error) {
    logger.error(
      `Harbor 저장소 '${projectName}/${repositoryName}' 태그 목록 조회 실패:`,
      error as Error
    );
    throw error;
  }
};

/**
 * Harbor 이미지 전체 경로 생성
 */
export const buildHarborImagePath = (
  registryUrl: string,
  projectName: string,
  repositoryName: string,
  tag: string
): string => {
  const cleanRegistryUrl = registryUrl.replace(/^https?:\/\//, '');
  const repoPath = repositoryName.startsWith(`${projectName}/`)
    ? repositoryName
    : `${projectName}/${repositoryName}`;
  return `${cleanRegistryUrl}/${repoPath}:${tag}`;
};

/**
 * Harbor 이미지 경로 파싱
 */
export const parseHarborImagePath = (
  imagePath: string
): {
  registryUrl: string;
  projectName: string;
  repositoryName: string;
  tag: string;
} | null => {
  const match = imagePath.match(/^([^/]+)\/([^/]+)\/([^:]+):(.+)$/);
  if (!match) return null;

  return {
    registryUrl: match[1],
    projectName: match[2],
    repositoryName: match[3],
    tag: match[4],
  };
};

export const harborApi = {
  getHarborProjects,
  checkHarborProject,
  getHarborRepositories,
  getHarborTags,
  buildHarborImagePath,
  parseHarborImagePath,
};

export default harborApi;
