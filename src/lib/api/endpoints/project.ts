// 프로젝트(GitLab) 관련 API 엔드포인트
// GitLab 프로젝트/브랜치/커밋 조회 기능을 제공합니다

import { apiClient } from '../client';
import type {
  StandardApiResponse,
  GitLabProject,
  GitLabBranch,
  GitLabCommit,
} from '../types';

export const projectApi = {
  // 통합 요청 함수 (기존 호환성 유지)
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.request<TResponse, Record<string, unknown>>(
      '/project',
      action,
      parameters
    );
  },

  getProjects: (): Promise<StandardApiResponse<GitLabProject[]>> => {
    return apiClient.request<GitLabProject[], Record<string, never>>(
      '/project',
      'list-my-gitlab-projects',
      {}
    );
  },

  getProjectBranches: (
    projectId: number
  ): Promise<StandardApiResponse<GitLabBranch[]>> => {
    return apiClient.request<GitLabBranch[], { projectId: number }>(
      '/project',
      'list-branches',
      { projectId }
    );
  },

  getProjectCommits: (
    projectId: number,
    branchName: string
  ): Promise<StandardApiResponse<GitLabCommit[]>> => {
    return apiClient.request<
      GitLabCommit[],
      { projectId: number; branchName: string }
    >('/project', 'list-commits', { projectId, branchName });
  },
} as const;

export default projectApi;
