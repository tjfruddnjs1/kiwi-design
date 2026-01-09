/**
 * Repository Statistics API
 * GitLab 저장소 통계 조회 API
 */

import api from './client';
import { logger } from '../../utils/logger';
import type { RepositoryStatistics } from '../../types/repository';

/** GitLab 기여자 정보 타입 */
export interface GitLabContributor {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
}

/**
 * GitLab 저장소 통계 조회
 */
export const getRepositoryStatistics = async (
  repoId: number,
  token: string
): Promise<RepositoryStatistics> => {
  try {
    const response = await api.git<RepositoryStatistics>(
      'getRepositoryStatistics',
      {
        repo_id: repoId,
        token: token,
      }
    );

    if (!response || !response.success) {
      throw new Error(response?.error || '저장소 통계 조회에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error(`저장소 통계 조회 실패 (RepoID: ${repoId}):`, error as Error);
    throw error;
  }
};

/**
 * GitLab 저장소 언어 통계 조회
 */
export const getRepositoryLanguages = async (
  repoId: number
): Promise<Record<string, number>> => {
  try {
    const response = await api.git<Record<string, number>>(
      'getRepositoryLanguages',
      {
        repo_id: repoId,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '저장소 언어 통계 조회에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error(
      `저장소 언어 통계 조회 실패 (RepoID: ${repoId}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * GitLab 저장소 기여자 목록 조회
 */
export const getRepositoryContributors = async (
  repoId: number,
  limit: number = 5
): Promise<GitLabContributor[]> => {
  try {
    const response = await api.git<GitLabContributor[]>(
      'getRepositoryContributors',
      {
        repo_id: repoId,
        limit,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '저장소 기여자 목록 조회에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error(
      `저장소 기여자 목록 조회 실패 (RepoID: ${repoId}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * GitLab 저장소 브랜치 목록 조회
 */
export const getRepositoryBranches = async (
  repoId: number,
  token: string
): Promise<
  Array<{
    name: string;
    merged: boolean;
    protected: boolean;
    default: boolean;
    commit: {
      id: string;
      title: string;
      author_name: string;
      committed_date: string;
    };
  }>
> => {
  try {
    const response = await api.git<
      Array<{
        name: string;
        merged: boolean;
        protected: boolean;
        default: boolean;
        commit: {
          id: string;
          title: string;
          author_name: string;
          committed_date: string;
        };
      }>
    >('getBranches', {
      repo_id: repoId,
      token: token,
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '브랜치 목록 조회에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error(`브랜치 목록 조회 실패 (RepoID: ${repoId}):`, error as Error);
    throw error;
  }
};

export const repositoryApi = {
  getRepositoryStatistics,
  getRepositoryLanguages,
  getRepositoryContributors,
  getRepositoryBranches,
};

export default repositoryApi;
