import { useState, useCallback } from 'react';
import { message } from 'antd';
import { gitApi } from '../../lib/api/gitRepository';

export interface GitRepository {
  id: number;
  project_name: string;
  gitlab_project_name: string;
  gitlab_project_path: string;
  gitlab_project_id: number;
  gitlab_url: string;
  gitlab_branch: string;
  created_at: string;
  updated_at: string;
  git_server_id: number;
}

/**
 * 저장소 관리를 위한 커스텀 훅
 * 저장소 목록 조회 및 상태 관리를 담당
 */
export function useRepositories() {
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * 저장소 목록 조회
   */
  const fetchRepositories = useCallback(async () => {
    try {
      setIsLoading(true);
      const repos = await gitApi.list();
      if (repos.data !== null && Array.isArray(repos.data)) {
        setRepositories(repos.data);
      }
    } catch (err) {
      message.error(
        `서비스 목록을 불러오지 못했습니다. ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 저장소 추가 (로컬 상태 업데이트용)
   */
  const addRepository = useCallback((repo: GitRepository) => {
    setRepositories(prev => [...prev, repo]);
  }, []);

  /**
   * 저장소 삭제 (로컬 상태 업데이트용)
   */
  const removeRepository = useCallback((repoId: number) => {
    setRepositories(prev => prev.filter(r => r.id !== repoId));
  }, []);

  /**
   * 저장소 업데이트 (로컬 상태 업데이트용)
   */
  const updateRepository = useCallback(
    (repoId: number, updates: Partial<GitRepository>) => {
      setRepositories(prev =>
        prev.map(r => (r.id === repoId ? { ...r, ...updates } : r))
      );
    },
    []
  );

  return {
    repositories,
    isLoading,
    fetchRepositories,
    addRepository,
    removeRepository,
    updateRepository,
  };
}
