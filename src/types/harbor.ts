/**
 * Harbor Registry 관련 타입 정의
 */

/**
 * Harbor 프로젝트
 */
export interface HarborProject {
  project_id: number;
  name: string;
  'metadata.public': boolean;
  repo_count: number;
  creation_time: string;
}

/**
 * Harbor 저장소 (Repository)
 */
export interface HarborRepository {
  id: number;
  name: string;
  project_id: number;
  description: string;
  pull_count: number;
  artifact_count: number;
  creation_time: string;
  update_time: string;
}

/**
 * Harbor 이미지 태그
 */
export interface HarborTag {
  id: number;
  repository_id: number;
  artifact_id: number;
  name: string;
  push_time: string;
  pull_time: string;
  immutable: boolean;
  signed: boolean;
}

/**
 * Harbor 아티팩트 (이미지)
 */
export interface HarborArtifact {
  id: number;
  digest: string;
  size: number;
  push_time: string;
  pull_time: string;
  tags: HarborTag[];
  references: HarborArtifactRef[];
  extra_attrs: Record<string, unknown>;
}

/**
 * Harbor 아티팩트 참조
 */
export interface HarborArtifactRef {
  parent_id: number;
  child_id: number;
  platform: Record<string, unknown>;
}

/**
 * Harbor API 요청 - 프로젝트 목록 조회
 */
export interface GetHarborProjectsRequest {
  registry_url?: string;
  username?: string;
  password?: string;
}

/**
 * Harbor API 요청 - 저장소 목록 조회
 */
export interface GetHarborRepositoriesRequest {
  registry_url?: string;
  username?: string;
  password?: string;
  project_name: string;
}

/**
 * Harbor API 요청 - 태그 목록 조회
 */
export interface GetHarborTagsRequest {
  registry_url?: string;
  username?: string;
  password?: string;
  project_name: string;
  repository_name: string;
}

/**
 * Harbor API 응답 - 프로젝트 목록
 */
export interface GetHarborProjectsResponse {
  success: boolean;
  data?: {
    projects: HarborProject[];
    registry_url: string;
  };
  message?: string;
  error?: string;
}

/**
 * Harbor API 응답 - 저장소 목록
 */
export interface GetHarborRepositoriesResponse {
  success: boolean;
  data?: {
    repositories: HarborRepository[];
    project_name: string;
    registry_url: string;
  };
  message?: string;
  error?: string;
}

/**
 * Harbor API 응답 - 태그 목록
 */
export interface GetHarborTagsResponse {
  success: boolean;
  data?: {
    tags: HarborTag[];
    artifacts: HarborArtifact[];
    project_name: string;
    repository_name: string;
    registry_url: string;
  };
  message?: string;
  error?: string;
}

/**
 * 컨테이너 이미지 스펙 (배포 시 사용)
 */
export interface ContainerImageSpec {
  /** 컨테이너 이름 (예: frontend, backend) */
  name: string;
  /** 이미지 경로 (예: harbor.mipllab.com/k8scontrol/myapp) */
  image: string;
  /** 이미지 태그 (예: v1.0.0, latest) */
  tag: string;
  /** 컨테이너 포트 (예: 3000, 8080) */
  container_port: number;
  /** 환경 변수 (선택사항) */
  env?: Record<string, string>;
}

/**
 * 다중 이미지 배포 요청
 */
export interface DeployWithImagesRequest {
  /** 서비스 ID */
  service_id: number;
  /** 다중 컨테이너 이미지 정보 */
  containers: ContainerImageSpec[];
  /** 복제본 수 */
  replicas: number;
  /** 도메인 */
  domain: string;
}
