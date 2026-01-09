/**
 * 저장소 및 빌드 통계를 관리하는 커스텀 훅
 * GitManagement.tsx에서 추출된 통계 관련 상태와 함수들
 */
import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import { repositoryApi } from '../lib/api/repository';
import { buildApi } from '../lib/api/build';
import type { RepositoryStatistics } from '../types/repository';
import type { BuildStatistics, BuildEnvironmentInfo } from '../types/build';

// =========================================
// 타입 정의
// =========================================

/** 토큰 조회 결과 타입 */
export interface TokenInfo {
  found: boolean;
  token: string;
  baseUrl: string;
  userId: string;
  source: 'db' | 'localStorage' | 'none' | 'error';
}

/** 토큰 조회 함수 타입 */
export type TokenFinderFn = (gitUrl: string) => TokenInfo;

/** 저장소 통계 상태 */
export interface RepositoryStatsState {
  stats: RepositoryStatistics | null;
  loading: boolean;
}

/** 빌드 통계 상태 */
export interface BuildStatsState {
  stats: BuildStatistics | null;
  environment: BuildEnvironmentInfo | null;
  loading: boolean;
}

/** 훅 반환 타입 */
export interface UseStatisticsReturn {
  // 저장소 통계
  repositoryStats: RepositoryStatistics | null;
  repositoryStatsLoading: boolean;
  setRepositoryStats: React.Dispatch<
    React.SetStateAction<RepositoryStatistics | null>
  >;
  fetchRepositoryStatistics: (
    repoId: number,
    gitlabUrl: string,
    tokenFinder: TokenFinderFn
  ) => Promise<void>;
  clearRepositoryStats: () => void;

  // 빌드 통계
  buildStats: BuildStatistics | null;
  buildEnvironment: BuildEnvironmentInfo | null;
  buildStatsLoading: boolean;
  setBuildStats: React.Dispatch<React.SetStateAction<BuildStatistics | null>>;
  setBuildEnvironment: React.Dispatch<
    React.SetStateAction<BuildEnvironmentInfo | null>
  >;
  fetchBuildStatistics: (serviceId: number) => Promise<void>;
  clearBuildStats: () => void;

  // 통합 초기화
  clearAll: () => void;
}

// =========================================
// 커스텀 훅
// =========================================

/**
 * 저장소 및 빌드 통계를 관리하는 훅
 */
export function useStatistics(): UseStatisticsReturn {
  // 저장소 통계 상태
  const [repositoryStats, setRepositoryStats] =
    useState<RepositoryStatistics | null>(null);
  const [repositoryStatsLoading, setRepositoryStatsLoading] =
    useState<boolean>(false);

  // 빌드 통계 상태
  const [buildStats, setBuildStats] = useState<BuildStatistics | null>(null);
  const [buildEnvironment, setBuildEnvironment] =
    useState<BuildEnvironmentInfo | null>(null);
  const [buildStatsLoading, setBuildStatsLoading] = useState<boolean>(false);

  /**
   * 저장소 통계 조회
   * @param repoId - 저장소 ID
   * @param gitlabUrl - GitLab URL
   * @param tokenFinder - 토큰 조회 함수 (호출 시점에 전달)
   */
  const fetchRepositoryStatistics = useCallback(
    async (
      repoId: number,
      gitlabUrl: string,
      tokenFinder: TokenFinderFn
    ): Promise<void> => {
      setRepositoryStatsLoading(true);
      setRepositoryStats(null);

      try {
        // GitLab 토큰 찾기
        const tokenInfo = tokenFinder(gitlabUrl);

        if (!tokenInfo.found || !tokenInfo.token) {
          setRepositoryStatsLoading(false);
          return;
        }

        const stats = await repositoryApi.getRepositoryStatistics(
          repoId,
          tokenInfo.token
        );
        setRepositoryStats(stats);
      } catch (_error: unknown) {
        // 통계 조회 실패는 조용히 처리
      } finally {
        setRepositoryStatsLoading(false);
      }
    },
    []
  );

  /**
   * 빌드 통계 조회
   */
  const fetchBuildStatistics = useCallback(
    async (serviceId: number): Promise<void> => {
      setBuildStatsLoading(true);
      setBuildStats(null);
      setBuildEnvironment(null);

      try {
        const result = await buildApi.getBuildStatistics(serviceId);
        setBuildStats(result);
        setBuildEnvironment(result.build_environment || null);
      } catch (_error: unknown) {
        message.error('빌드 통계를 조회할 수 없습니다.');
      } finally {
        setBuildStatsLoading(false);
      }
    },
    []
  );

  /**
   * 저장소 통계 초기화
   */
  const clearRepositoryStats = useCallback(() => {
    setRepositoryStats(null);
    setRepositoryStatsLoading(false);
  }, []);

  /**
   * 빌드 통계 초기화
   */
  const clearBuildStats = useCallback(() => {
    setBuildStats(null);
    setBuildEnvironment(null);
    setBuildStatsLoading(false);
  }, []);

  /**
   * 모든 통계 초기화
   */
  const clearAll = useCallback(() => {
    clearRepositoryStats();
    clearBuildStats();
  }, [clearRepositoryStats, clearBuildStats]);

  return {
    // 저장소 통계
    repositoryStats,
    repositoryStatsLoading,
    setRepositoryStats,
    fetchRepositoryStatistics,
    clearRepositoryStats,

    // 빌드 통계
    buildStats,
    buildEnvironment,
    buildStatsLoading,
    setBuildStats,
    setBuildEnvironment,
    fetchBuildStatistics,
    clearBuildStats,

    // 통합
    clearAll,
  };
}

export default useStatistics;
