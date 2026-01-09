export interface GitLabProject {
  id: number;
  name: string;
  description: string | null;
  web_url: string;
  last_activity_at: string;
}

export interface GitLabBranch {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  web_url: string;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  author_name: string;
  author_email: string;
  authored_date: string; // ISO 8601 형식의 날짜 문자열
  committer_name: string;
  committer_email: string;
  committed_date: string;
  web_url: string;
}
