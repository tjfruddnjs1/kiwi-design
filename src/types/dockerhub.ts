/**
 * Docker Hub Registry 관련 타입 정의
 */

/**
 * Docker Hub 저장소 (Repository)
 */
export interface DockerHubRepository {
  user: string;
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  description: string;
  is_private: boolean;
  is_automated: boolean;
  can_edit: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
}

/**
 * Docker Hub 이미지 태그
 */
export interface DockerHubTag {
  name: string;
  full_size: number;
  images: unknown[];
  id: number;
  repository: number;
  creator: number;
  last_updater: number;
  last_updated: string;
  image_id: string;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
}

/**
 * Docker Hub API 요청 - 저장소 목록 조회
 */
export interface GetDockerHubRepositoriesRequest {
  username: string;
  password?: string;
}

/**
 * Docker Hub API 요청 - 태그 목록 조회
 */
export interface GetDockerHubTagsRequest {
  username: string;
  password?: string;
  repository_name: string;
}

/**
 * Docker Hub API 응답 - 저장소 목록
 */
export interface GetDockerHubRepositoriesResponse {
  success: boolean;
  data?: {
    repositories: DockerHubRepository[];
    username: string;
  };
  message?: string;
  error?: string;
}

/**
 * Docker Hub API 응답 - 태그 목록
 */
export interface GetDockerHubTagsResponse {
  success: boolean;
  data?: {
    tags: DockerHubTag[];
    username: string;
    repository_name: string;
  };
  message?: string;
  error?: string;
}
