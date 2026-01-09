import { api } from '../../services/api';
import apiClient from './client';
import { GitLabProject, GitLabBranch, GitLabCommit } from '../../types/project';
import { StandardApiResponse } from '../../types/shared';
import { logger } from '../../utils/logger';

// 프로젝트 API 응답 타입
export type ProjectApiResponse<T = unknown> = StandardApiResponse<T>;

// 프로젝트 목록 가져오기
export const getProjects = async (): Promise<GitLabProject[]> => {
  try {
    const response = await api.project.listMyProjects();

    return response.data.data || [];
  } catch (error) {
    logger.error('프로젝트 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 특정 프로젝트 정보 가져오기 (기본 구현 - 목록에서 찾기)
export const getProject = async (projectId: number): Promise<GitLabProject> => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    return project;
  } catch (error) {
    logger.error('프로젝트 조회 실패:', error as Error);
    throw error;
  }
};

// 프로젝트 브랜치 목록 가져오기
export const getProjectBranches = async (
  projectId: number
): Promise<GitLabBranch[]> => {
  try {
    const response = await apiClient.request<GitLabBranch[]>(
      '/project',
      'list-branches',
      { projectId }
    );

    return response.data || [];
  } catch (error) {
    logger.error('브랜치 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 프로젝트 커밋 목록 가져오기
export const getProjectCommits = async (
  projectId: number,
  branchName?: string
): Promise<GitLabCommit[]> => {
  try {
    if (!branchName) {
      // 기본 브랜치를 찾아서 사용
      const branches = await getProjectBranches(projectId);

      branchName =
        branches.find(b => b.default)?.name || branches[0]?.name || 'main';
    }
    const response = await apiClient.request<GitLabCommit[]>(
      '/project',
      'list-commits',
      { projectId, branchName }
    );

    return response.data || [];
  } catch (error) {
    logger.error('커밋 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 프로젝트 생성 (기본 구현 - 에러 반환)
export const createProject = async (
  _projectData: Partial<GitLabProject>
): Promise<GitLabProject> => {
  try {
    // GitLab API를 통한 프로젝트 생성은 현재 백엔드에서 지원되지 않음
    throw new Error(
      '프로젝트 생성 기능은 현재 지원되지 않습니다. GitLab에서 직접 생성해주세요.'
    );
  } catch (error) {
    logger.error('프로젝트 생성 실패:', error as Error);
    throw error;
  }
};

// 프로젝트 업데이트 (기본 구현 - 에러 반환)
export const updateProject = async (
  _projectId: number,
  _projectData: Partial<GitLabProject>
): Promise<GitLabProject> => {
  try {
    // GitLab API를 통한 프로젝트 업데이트는 현재 백엔드에서 지원되지 않음
    throw new Error(
      '프로젝트 업데이트 기능은 현재 지원되지 않습니다. GitLab에서 직접 수정해주세요.'
    );
  } catch (error) {
    logger.error('프로젝트 업데이트 실패:', error as Error);
    throw error;
  }
};

// 프로젝트 삭제 (기본 구현 - 에러 반환)
export const deleteProject = async (_projectId: number): Promise<void> => {
  try {
    // GitLab API를 통한 프로젝트 삭제는 현재 백엔드에서 지원되지 않음
    throw new Error(
      '프로젝트 삭제 기능은 현재 지원되지 않습니다. GitLab에서 직접 삭제해주세요.'
    );
  } catch (error) {
    logger.error('프로젝트 삭제 실패:', error as Error);
    throw error;
  }
};

// 프로젝트 API 객체 (기존 import 패턴 호환)
export const projectApi = {
  getProjects,
  getProject,
  getProjectBranches,
  getProjectCommits,
  createProject,
  updateProject,
  deleteProject,
};

// 기본 내보내기
export default projectApi;
