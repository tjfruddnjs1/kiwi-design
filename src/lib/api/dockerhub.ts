/**
 * Docker Hub API 클라이언트
 * Docker Hub 레지스트리의 저장소 관리 API
 */

import apiClient from '../../utils/apiClient';
import { logger } from '../../utils/logger';
import type {
  DockerHubRepository,
  DockerHubTag,
  GetDockerHubRepositoriesRequest,
  GetDockerHubTagsRequest,
} from '../../types/dockerhub';

/**
 * Docker Hub API 응답 타입
 */
export interface DockerHubRepositoriesResponse {
  repositories: DockerHubRepository[];
  username: string;
}

export interface DockerHubTagsResponse {
  tags: DockerHubTag[];
  username: string;
  repository_name: string;
}

/**
 * Docker Hub 저장소 목록 조회
 * @param credentials Docker Hub 인증 정보
 */
export const getDockerHubRepositories = async (
  credentials: GetDockerHubRepositoriesRequest
): Promise<DockerHubRepositoriesResponse> => {
  try {
    const response = await apiClient.post<
      GetDockerHubRepositoriesRequest,
      DockerHubRepositoriesResponse
    >('/dockerhub/repositories', credentials);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Docker Hub 저장소 목록 조회 실패');
    }

    logger.info(
      `Docker Hub 사용자 '${credentials.username}'의 저장소 ${response.data.repositories.length}개 조회 성공`
    );
    return response.data;
  } catch (error) {
    logger.error(
      `Docker Hub 사용자 '${credentials.username}' 저장소 목록 조회 실패:`,
      error as Error
    );
    throw error;
  }
};

/**
 * Docker Hub 이미지 태그 목록 조회
 * @param username Docker Hub 사용자명
 * @param repositoryName 저장소명
 * @param password Docker Hub 비밀번호 (선택사항)
 */
export const getDockerHubTags = async (
  username: string,
  repositoryName: string,
  password?: string
): Promise<DockerHubTagsResponse> => {
  try {
    const request: GetDockerHubTagsRequest = {
      username,
      repository_name: repositoryName,
      password,
    };

    const response = await apiClient.post<
      GetDockerHubTagsRequest,
      DockerHubTagsResponse
    >('/dockerhub/tags', request);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Docker Hub 태그 목록 조회 실패');
    }

    logger.info(
      `Docker Hub 저장소 '${username}/${repositoryName}'의 태그 ${response.data.tags.length}개 조회 성공`
    );
    return response.data;
  } catch (error) {
    logger.error(
      `Docker Hub 저장소 '${username}/${repositoryName}' 태그 목록 조회 실패:`,
      error as Error
    );
    throw error;
  }
};

/**
 * Docker Hub 이미지 전체 경로 생성
 */
export const buildDockerHubImagePath = (
  username: string,
  repositoryName: string,
  tag: string
): string => {
  return `${username}/${repositoryName}:${tag}`;
};

/**
 * Docker Hub 이미지 경로 파싱
 */
export const parseDockerHubImagePath = (
  imagePath: string
): {
  username: string;
  repositoryName: string;
  tag: string;
} | null => {
  const match = imagePath.match(/^([^/]+)\/([^:]+):(.+)$/);
  if (!match) return null;

  return {
    username: match[1],
    repositoryName: match[2],
    tag: match[3],
  };
};

export const dockerhubApi = {
  getDockerHubRepositories,
  getDockerHubTags,
  buildDockerHubImagePath,
  parseDockerHubImagePath,
};

export default dockerhubApi;
