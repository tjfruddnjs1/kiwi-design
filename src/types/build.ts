/**
 * 빌드 단계 관련 타입 정의
 */

export interface BuildStatistics {
  service_id: number;
  service_name: string;
  total_builds: number;
  successful_builds: number;
  failed_builds: number;
  success_rate: number;
  average_build_time: number; // seconds
  latest_build?: LatestBuildInfo;
  docker_images: DockerImageInfo[];
  build_environment: BuildEnvironmentInfo;
  recent_builds: RecentBuildSummary[];
}

export interface PipelineLogEntry {
  timestamp: string;
  command: string;
  output: string;
  error: string;
  exit_code: number;
}

export interface LatestBuildInfo {
  id: number;
  pipeline_id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: { String: string; Valid: boolean } | null;
  duration_seconds: { Int64: number; Valid: boolean } | null;
  triggered_by: string; //  빌드 실행자
  error_message: { String: string; Valid: boolean } | null;
  details_data: { String: string; Valid: boolean } | null; // JSON string from pipeline_details
  execution_logs: { String: string; Valid: boolean } | null; // JSON string from pipeline_details
  build_infra_id: { Int64: number; Valid: boolean } | null;
  build_infra_name: { String: string; Valid: boolean } | null;
  build_infra_type: { String: string; Valid: boolean } | null;
  build_server_id: { Int64: number; Valid: boolean } | null; //  빌드 시 사용한 서버 ID
}

export interface DockerImageInfo {
  image_name: string;
  registry_url: string;
  full_path: string; // e.g., harbor.mipllab.com/lw/ast:latest
  compose_file: string;
}

export interface BuildEnvironmentInfo {
  gitlab_url: string;
  gitlab_branch: string;
  docker_compose_files: string[];
  docker_registry: string;
  build_tool: string; // "podman-compose" or "docker-compose"
  infra_type?: string; // 인프라 타입
  build_infra_name?: string; // 빌드 이력에서 가져온 인프라 이름
  build_infra_type?: string; // 빌드 이력에서 가져온 인프라 타입
}

export interface RecentBuildSummary {
  id: number;
  pipeline_id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string;
  duration_seconds: { Int64: number; Valid: boolean } | null;
  build_server_id: { Int64: number; Valid: boolean } | null; //  빌드 시 사용한 서버 ID
  triggered_by: string;
  build_infra_id: { Int64: number; Valid: boolean } | null;
  build_infra_name: { String: string; Valid: boolean } | null;
  build_infra_type: { String: string; Valid: boolean } | null;
  details_data: { String: string; Valid: boolean } | null; //  빌드 상세 정보 (이미지 태그, 레지스트리 등)
  execution_logs: { String: string; Valid: boolean } | null; //  빌드 실행 로그 (JSON string)
  built_images?: string[]; //  빌드된 이미지 목록 (파싱된 결과)
  image_tag?: string; //  이미지 태그 (파싱된 결과)
  registry?: string; //  레지스트리 URL (파싱된 결과)
}

export interface BuildStageDetail {
  stage_name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  description: string;
  logs?: string[];
}
