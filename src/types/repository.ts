/**
 * Repository Statistics Types
 * 저장소 통계 관련 타입 정의
 */

export interface RepositoryStatistics {
  // 기본 정보
  name: string;
  default_branch: string;
  description?: string;
  created_at: string;
  last_activity_at: string;

  // 커밋 통계
  commit_count: number;
  recent_commits_7d: number;
  recent_commits_30d: number;

  // 기여자 정보
  contributors_count: number;
  top_contributors: Contributor[];

  // 브랜치 정보
  branches_count: number;
  active_branches: BranchInfo[];

  // 태그/릴리즈
  tags_count: number;
  latest_tag?: TagInfo;

  // 이슈/머지 리퀘스트
  open_issues_count: number;
  open_merge_requests_count: number;

  // 코드 통계 (선택적 - 외부 API나 분석 필요)
  languages?: LanguageStatistics[];
  total_lines?: number;
  total_files?: number;
}

export interface Contributor {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
  avatar_url?: string;
}

export interface BranchInfo {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    created_at: string;
  };
  merged: boolean;
  protected: boolean;
}

export interface TagInfo {
  name: string;
  message?: string;
  target: string;
  created_at: string;
  release?: {
    tag_name: string;
    description: string;
  };
}

export interface LanguageStatistics {
  name: string;
  percentage: number;
  bytes: number;
  color: string; // 언어별 고유 색상
}

export interface CodeActivityTrend {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface RepositoryOverview {
  statistics: RepositoryStatistics;
  activity_trend: CodeActivityTrend[];
  health_score: number; // 0-100 점수
}
