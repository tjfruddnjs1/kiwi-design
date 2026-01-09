// Docker 관련 API 엔드포인트
// 도커 서버/컨테이너 관리 및 설치/상태 조회 기능을 제공합니다

import { apiClient } from '../client';
import type { StandardApiResponse, SshHop } from '../types';

export interface DockerServerInfo {
  id: number;
  name: string;
  ip: string;
  port: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DockerInfo {
  version: string;
  containers: number;
  images: number;
  volumes: number;
  networks: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  image: string;
  created: string;
  ports: string;
  size?: string;
}

export const dockerApi = {
  // 통합 요청 함수 (기존 호환성 유지)
  request: <TResponse>(
    action: string,
    parameters: Record<string, unknown>
  ): Promise<StandardApiResponse<TResponse>> => {
    return apiClient.docker<TResponse>(action, parameters);
  },

  // 서버
  getServer: (
    infraId: number
  ): Promise<StandardApiResponse<{ server: DockerServerInfo | null }>> => {
    return apiClient.docker('getDockerServer', { infra_id: infraId });
  },

  createServer: (data: {
    name: string;
    infra_id: number;
    status?: string;
    hops?: Array<{
      host: string;
      port: number;
      username?: string;
      password?: string;
    }>;
  }): Promise<StandardApiResponse<DockerServerInfo>> => {
    return apiClient.docker('createDockerServer', data, {
      showSuccessMessage: true,
      successMessage: '도커 서버가 생성되었습니다.',
    });
  },

  updateServer: (data: {
    id: number;
    name?: string;
    ip?: string;
    port?: number;
    status?: string;
  }): Promise<StandardApiResponse<{ server: DockerServerInfo }>> => {
    return apiClient.docker('updateDockerServer', data, {
      showSuccessMessage: true,
      successMessage: '도커 서버가 수정되었습니다.',
    });
  },

  checkServerStatus: (
    serverId: number,
    authData: { hops: SshHop[] }
  ): Promise<
    StandardApiResponse<{
      status: { installed: boolean; running: boolean };
      lastChecked: string;
    }>
  > => {
    return apiClient.docker('checkDockerServerStatus', {
      server_id: serverId,
      hops: authData.hops,
    });
  },

  // 정보 및 목록
  getInfo: (
    serverId: number,
    authData: { hops: SshHop[] }
  ): Promise<StandardApiResponse<DockerInfo>> => {
    return apiClient.docker('getDockerInfo', {
      server_id: serverId,
      ...authData,
    });
  },

  getContainers: (
    serverId: number,
    authData: { hops: SshHop[] }
  ): Promise<
    StandardApiResponse<{
      containers: DockerContainer[];
      compose_project?: string | null;
    }>
  > => {
    return apiClient.docker('getContainers', {
      server_id: serverId,
      ...authData,
    });
  },

  // 컨테이너 제어
  startContainer: (
    serverId: number,
    containerId: string
  ): Promise<StandardApiResponse<{ message: string }>> => {
    return apiClient.docker('startContainer', {
      server_id: serverId,
      container_id: containerId,
    });
  },

  controlContainer: (
    serverId: number,
    containerId: string,
    action: 'start' | 'stop' | 'restart' | 'delete',
    authData: { hops: SshHop[] }
  ): Promise<StandardApiResponse<{ message: string }>> => {
    return apiClient.docker('controlContainer', {
      server_id: serverId,
      container_id: containerId,
      action_type: action,
      hops: authData.hops,
    });
  },

  removeContainer: (
    serverId: number,
    containerId: string
  ): Promise<StandardApiResponse<{ message: string }>> => {
    return apiClient.docker('removeContainer', {
      server_id: serverId,
      container_id: containerId,
    });
  },

  // 설치/제거
  installDocker: (
    serverId: number,
    authData: { hops: SshHop[] }
  ): Promise<StandardApiResponse<{ message: string }>> => {
    return apiClient.docker('installDocker', {
      id: serverId,
      hops: authData.hops,
    });
  },

  uninstallDocker: (
    serverId: number,
    authData: { hops: SshHop[] }
  ): Promise<StandardApiResponse<{ message: string; logs?: string[] }>> => {
    return apiClient.docker('uninstallDocker', {
      server_id: serverId,
      hops: authData.hops,
    });
  },

  // 컴포즈 배포
  createContainer: (data: {
    id: number;
    hops: SshHop[];
    username_repo?: string;
    password_repo?: string;
    force_recreate?: boolean;
    docker_username?: string;
    docker_password?: string;
  }): Promise<
    StandardApiResponse<{
      success: boolean;
      message: string;
      containers?: {
        running: string[];
        exited: string[];
        other_state: string[];
      };
    }>
  > => {
    return apiClient.docker('createContainer', data);
  },

  importDockerInfra: (data: {
    name: string;
    type: string;
    info: string;
    hops: SshHop[];
  }): Promise<StandardApiResponse<{ success: boolean }>> => {
    return apiClient.docker('importDockerInfra', data);
  },

  // 로그 조회
  getLogs: (
    serverId: number,
    containerId: string,
    authData: { hops: SshHop[] },
    lines?: number
  ): Promise<
    StandardApiResponse<{
      logs: string;
      container_id: string;
      container_name: string;
      container_status: string;
    }>
  > => {
    return apiClient.docker('getDockerLogs', {
      server_id: serverId,
      container_id: containerId,
      lines: lines || 100,
      hops: authData.hops,
    });
  },

  // 컨테이너 리소스 통계
  getContainerStats: (
    containerId: string,
    authData: { hops: SshHop[] }
  ): Promise<
    StandardApiResponse<{
      container_id: string;
      cpu_percent: string;
      memory_usage: string;
      memory_percent: string;
      network_io: string;
      block_io: string;
    }>
  > => {
    return apiClient.docker('getContainerStats', {
      container_id: containerId,
      hops: authData.hops,
    });
  },

  // 컨테이너 명령 실행
  executeCommand: (
    containerId: string,
    command: string,
    authData: { hops: SshHop[] }
  ): Promise<
    StandardApiResponse<{
      output: string;
      exit_code: number;
      error: string;
    }>
  > => {
    return apiClient.docker('executeDockerCommand', {
      container_id: containerId,
      command: command,
      hops: authData.hops,
    });
  },

  // Docker Compose 재배포
  redeployCompose: (
    composeProject: string,
    composeFile: string,
    authData: { hops: SshHop[] }
  ): Promise<
    StandardApiResponse<{
      output: string;
    }>
  > => {
    return apiClient.docker('redeployCompose', {
      compose_project: composeProject,
      compose_file: composeFile,
      hops: authData.hops,
    });
  },

  // Docker 리소스 정리 (Prune)
  pruneResources: (
    pruneType: 'all' | 'images' | 'containers' | 'volumes' | 'networks',
    authData: { hops: SshHop[] }
  ): Promise<
    StandardApiResponse<{
      output: string;
      message: string;
    }>
  > => {
    return apiClient.docker('pruneDockerResources', {
      prune_type: pruneType,
      hops: authData.hops,
    });
  },

  // Docker 시스템 정보 조회
  getSystemInfo: (authData: {
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      version: string;
      api_version: string;
      containers: number;
      running: number;
      paused: number;
      stopped: number;
      images: number;
      volumes: number;
      networks: number;
      disk_usage: {
        total: string;
        used: string;
        available: string;
        percent: string;
      };
    }>
  > => {
    return apiClient.docker('getDockerSystemInfo', {
      hops: authData.hops,
    });
  },

  // Docker 이미지 목록 조회
  getImages: (authData: {
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      images: Array<{
        id: string;
        repository: string;
        tag: string;
        size: string;
        created: string;
      }>;
    }>
  > => {
    return apiClient.docker('getDockerImages', {
      hops: authData.hops,
    });
  },

  // Docker 볼륨 목록 조회
  getVolumes: (authData: {
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      volumes: Array<{
        name: string;
        driver: string;
        mountpoint: string;
        size: string;
      }>;
    }>
  > => {
    return apiClient.docker('getDockerVolumes', {
      hops: authData.hops,
    });
  },

  // Docker 네트워크 목록 조회
  getNetworks: (authData: {
    hops: SshHop[];
  }): Promise<
    StandardApiResponse<{
      networks: Array<{
        id: string;
        name: string;
        driver: string;
        scope: string;
      }>;
    }>
  > => {
    return apiClient.docker('getDockerNetworks', {
      hops: authData.hops,
    });
  },
} as const;

export default dockerApi;
