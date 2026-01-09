import { DockerDetails } from '@/types/docker';
import { api } from '../../services/api';
import { ApiResponse } from '../../types';
import {
    DockerContainerControlRequest,
    DockerContainerControlResponse,
    DockerInfraImportResponse,
} from '../../types/common';
import { logger } from '../../utils/logger';
import type { SshHop } from './types';

// AuthHops는 SshHop과 동일한 타입 (호환성 유지)
export type AuthHops = SshHop;

interface AuthParams {
  hops: SshHop[];
  compose_project?: string; // Docker Compose 프로젝트 이름으로 컨테이너 필터링 (선택적)
}

// 도커 서버 정보 타입
export interface DockerServerInfo {
  id: number;
  name: string;
  ip: string;
  port: number;
  status: string;
  created_at: string;
  updated_at: string;
  hops?: string | SshHop[]; // SSH hops 정보 (JSON 문자열 또는 배열)
  infra_id?: number; // 인프라 ID
}

// 도커 정보 타입
export interface DockerInfo {
  version: string;
  containers: number;
  images: number;
  volumes: number;
  networks: number;
}

// 도커 컨테이너 정보 타입
export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  state: string;
  image: string;
  created: string;
  ports?: string;
  size?: string;
}

//  타입 호환성을 위한 별칭 (DockerContainersTab에서 사용)
export type DockerContainerInfo = DockerContainer;

//  'installDocker' API의 응답 데이터 타입을 정확하게 정의합니다.
export interface DockerInstallStartResponse {
  success: boolean;
  message: string;
  error?: string;
}

// 도커 서버 정보 조회
export const getDockerServer = async (infraId: number) => {
  try {
    const response = await api.docker.request<{ server: DockerServerInfo }>(
      'getDockerServer',
      {
        infra_id: infraId,
      }
    );
    if (!response.data.success) {
      throw new Error(
        response.data.error || '도커 서버 정보를 가져오는데 실패했습니다.'
      );
    }

    // Backend 응답: { success: true, data: { server: {...} } }
    // response.data는 이미 파싱된 상태이므로 data.server를 접근
    const serverData = response.data.data as
      | { server: DockerServerInfo }
      | undefined;
    return {
      success: true,
      data: {
        server: serverData?.server || null,
      },
    };
  } catch (error) {
    logger.error('도커 서버 정보 조회 실패', undefined, {
      error: String(error),
    });

    // 서버 조회 실패 시 빈 데이터 반환
    return {
      success: true,
      data: {
        server: null,
      },
    };
  }
};

// 도커 서버 생성
export const createDockerServer = async (data: {
  name: string;
  infra_id: number;
  status?: string;
  hops?: Array<{
    host: string;
    port: number;
  }>;
}) => {
  try {
    // (수정) API 요청 시 hops 배열을 그대로 전달합니다.
    const response = await api.docker.request('createDockerServer', data);

    return response.data;
  } catch (error) {
    logger.error('도커 서버 생성 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 도커 정보 조회
export const getDockerInfo = async (serverId: number, authData: AuthParams) => {
  try {
    const response = await api.docker.request<ApiResponse<DockerInfo>>(
      'getDockerInfo',
      {
        server_id: serverId,
        ...authData,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || '도커 정보를 가져오는데 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('도커 정보 조회 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 컨테이너 목록 조회
export const getContainers = async (
  serverId: number,
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
): Promise<DockerDetails> => {
  try {
    // `api.docker.request`가 반환할 객체의 구조를 제네릭에 직접 명시
    const response = await api.docker.request<DockerDetails>('getContainers', {
      server_id: serverId,
      ...authData,
      runtimeType,
    });

    const backendResponse = response.data;

    if (!backendResponse.success) {
      throw new Error(
        backendResponse.error || '컨테이너 목록을 가져오는데 실패했습니다.'
      );
    }

    //  역할 완수: 순수한 데이터(DockerDetails)만 반환
    return backendResponse.data;
  } catch (error) {
    logger.error('컨테이너 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 도커 서버 업데이트
export const updateDockerServer = async (data: {
  id: number;
  name?: string;
  ip?: string;
  port?: number;
  status?: string;
}) => {
  try {
    const response = await api.docker.request<
      ApiResponse<{
        server: DockerServerInfo;
      }>
    >('updateDockerServer', data);

    if (!response.data.success) {
      throw new Error(
        response.data.error || '도커 서버 업데이트에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('도커 서버 업데이트 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 컨테이너 시작
export const startContainer = async (serverId: number, containerId: string) => {
  try {
    const response = await api.docker.request<
      ApiResponse<{
        message: string;
      }>
    >('startContainer', {
      server_id: serverId,
      container_id: containerId,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || '컨테이너 시작에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('컨테이너 시작 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 컨테이너 중지
export const stopContainer = async (
  serverId: number,
  containerId: string,
  authInfo?: {
    username?: string;
    password?: string;
    hops?: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>;
  }
) => {
  try {
    const requestData: DockerContainerControlRequest = {
      server_id: serverId,
      container_id: containerId,
      action_type: 'stop',
    };

    // 인증 정보가 제공된 경우 요청에 포함
    if (authInfo) {
      if (authInfo.username) requestData.username = authInfo.username;
      if (authInfo.password) requestData.password = authInfo.password;
      if (authInfo.hops) requestData.hops = authInfo.hops;
    }

    const response = await api.docker.request<
      ApiResponse<DockerContainerControlResponse>
    >('controlContainer', requestData as unknown as Record<string, unknown>);

    if (!response.data.success) {
      throw new Error(response.data.error || '컨테이너 중지에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('컨테이너 중지 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 컨테이너 재시작
export const restartContainer = async (
  serverId: number,
  containerId: string,
  authInfo?: {
    username?: string;
    password?: string;
    hops?: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>;
  }
) => {
  try {
    const requestData: DockerContainerControlRequest = {
      server_id: serverId,
      container_id: containerId,
      action_type: 'restart',
    };

    // 인증 정보가 제공된 경우 요청에 포함
    if (authInfo) {
      if (authInfo.username) requestData.username = authInfo.username;
      if (authInfo.password) requestData.password = authInfo.password;
      if (authInfo.hops) requestData.hops = authInfo.hops;
    }

    const response = await api.docker.request<
      ApiResponse<DockerContainerControlResponse>
    >('controlContainer', requestData as unknown as Record<string, unknown>);

    if (!response.data.success) {
      throw new Error(response.data.error || '컨테이너 재시작에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('컨테이너 재시작 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 컨테이너 삭제
export const removeContainer = async (
  serverId: number,
  containerId: string
) => {
  try {
    const response = await api.docker.request<
      ApiResponse<{
        message: string;
      }>
    >('removeContainer', {
      server_id: serverId,
      container_id: containerId,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || '컨테이너 삭제에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('컨테이너 삭제 실패', undefined, { error: String(error) });
    throw error;
  }
};

/**
 * (수정) 도커 서버의 상태를 확인합니다. (다중 접속 인증 지원)
 * @param serverId 확인할 서버의 ID
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 */
export const checkDockerServerStatus = async (
  serverId: number,
  authData: AuthParams
) => {
  try {
    // 1. API를 호출하면 'response'라는 "포장지" 객체가 도착합니다.
    const response = await api.docker.request<{
      success: boolean;
      status: { installed: boolean; running: boolean };
      lastChecked: string;
      error?: string;
    }>('checkDockerServerStatus', {
      server_id: serverId,
      hops: authData.hops,
    });

    // 2. [핵심] 포장지를 열어서 안에 있는 진짜 "내용물"을 꺼냅니다.
    //    이 내용물이 바로 백엔드에서 보낸 { success, status, lastChecked } 객체입니다.
    const responseData = response.data;

    // 3. 이제부터는 상자(response)가 아닌, 내용물(responseData)을 사용합니다.
    if (!responseData || !responseData.success) {
      throw new Error(
        responseData.error || '도커 서버 상태 확인에 실패했습니다.'
      );
    }

    let status: 'active' | 'inactive' | 'uninstalled' = 'uninstalled';

    // 4. 내용물(responseData)에서 status 객체를 가져옵니다.
    const statusData = responseData.data.status; //  정상! 포장지 안의 내용물에서 status를 찾습니다.

    if (statusData) {
      if (statusData.installed && statusData.running) {
        status = 'active';
      } else if (statusData.installed) {
        status = 'inactive';
      }
    }

    // 5. 컴포넌트가 사용하기 쉬운 최종 객체를 만듭니다.
    const finalReturnValue = {
      success: true,
      status: status, // 계산된 문자열 상태
      lastChecked: responseData.data.lastChecked, //  정상! 포장지 안의 내용물에서 lastChecked를 찾습니다.
      message: '서버 상태를 확인했습니다.',
    };

    return finalReturnValue;
  } catch (error) {
    logger.error('도커 서버 상태 확인 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 도커 설치
/**
 * (수정) 서버에 도커를 설치합니다. (다중 접속 인증 지원)
 * @param serverId 도커를 설치할 서버의 ID
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 */
export const installDocker = async (
  serverId: number,
  authData: AuthParams
): Promise<DockerInstallStartResponse> => {
  try {
    // 1. `api.docker.request`를 호출합니다.
    const response = await api.docker.request<{
      success: boolean;
      data?: { message?: string }; // 백엔드 응답의 data 필드는 message를 가질 수 있음
      message?: string; // 최상위 message도 있을 수 있음
      error?: string;
    }>('installDocker', {
      id: serverId,
      hops: authData.hops,
    });

    // 2. `response.data`는 `convertApiResponse`가 만든 래퍼 객체입니다.
    const wrapper = response.data;

    // 3.  [핵심 수정] 래퍼 객체에서 필요한 정보를 추출하여
    //    `success`를 포함한 완전한 객체를 만들어 반환합니다.
    //    백엔드가 data로 감싸서 보내므로 wrapper.data.message를 확인합니다.
    if (wrapper.success && wrapper.data?.message) {
      return {
        success: true,
        message: wrapper.data.message,
      };
    }

    // 만약 data로 감싸지 않고 최상위 message로 오는 경우도 대비합니다.
    if (wrapper.success && wrapper.message) {
      return {
        success: true,
        message: wrapper.message,
      };
    }

    // 실패한 경우
    throw new Error(wrapper.error || '알 수 없는 오류가 발생했습니다.');
  } catch (error) {
    logger.error('도커 설치 요청 실패', undefined, { error: String(error) });
    throw error;
  }
};

/**
 * (수정) 서버에서 도커를 제거합니다. (다중 접속 인증 지원)
 * @param serverId 도커를 제거할 서버의 ID
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 */
export const uninstallDocker = async (
  serverId: number,
  authData: AuthParams
) => {
  try {
    const response = await api.docker.request<
      ApiResponse<{ message: string; logs: string[] }>
    >('uninstallDocker', {
      server_id: serverId,
      hops: authData.hops, // hops 배열을 그대로 전달
    });

    if (!response.data.success) {
      throw new Error(response.data.error || '도커 제거에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('도커 제거 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 도커 컴포즈 배포
export const createDockerContainer = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  username_repo?: string;
  password_repo?: string;
  force_recreate?: boolean;
  docker_username?: string;
  docker_password?: string;
}) => {
  try {
    const response = await api.docker.request<
      ApiResponse<{
        success: boolean;
        message: string;
        containers?: {
          running: string[];
          exited: string[];
          other_state: string[];
        };
      }>
    >('createContainer', data);

    if (!response.data.success) {
      throw new Error(
        response.data.error || '도커 컴포즈 배포에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('도커 컴포즈 배포 실패', undefined, { error: String(error) });
    throw error;
  }
};

// 외부 런타임 가져오기
export const importInfra = async (
  device_id: number,
  user_id: number,
  data: {
    name: string;
    type: string;
    info: string;
    // host, port, username, password를 제거하고 hops 배열을 사용
    hops: AuthHops[];
  }
) => {
  try {
    const response = await api.docker.request<
      ApiResponse<DockerInfraImportResponse>
    >('importInfra', { device_id, user_id, ...data });

    if (!response.data.success) {
      throw new Error(
        response.data.error || '외부 런타임 가져오기에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('외부 런타임 가져오기 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

//? 외부 인프라 가져오기 수정 중
// 외부 런타임 가져오기
export const importInfra2 = async (data: {
  name: string;
  type: string;
  info: string;
  // host, port, username, password를 제거하고 hops 배열을 사용
  hops: AuthHops[];
}) => {
  try {
    const response = await api.docker.request<
      ApiResponse<DockerInfraImportResponse>
    >('importInfra2', { ...data });

    if (!response.data.success) {
      throw new Error(
        response.data.error || '외부 런타임 가져오기에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('외부 런타임 가져오기 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};
//? 외부 인프라 가져오기 수정 중

/**
 * (신규/통합) 도커 컨테이너를 제어합니다 (시작, 중지, 재시작, 삭제). (다중 접속 인증 지원)
 * @param serverId 컨테이너가 있는 서버의 ID
 * @param containerId 제어할 컨테이너의 ID
 * @param action 수행할 작업 ('start', 'stop', 'restart', 'delete')
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 */
export const controlContainer = async (
  serverId: number,
  containerId: string,
  action: 'start' | 'stop' | 'restart' | 'delete',
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
) => {
  try {
    const response = await api.docker.request<ApiResponse<{ message: string }>>(
      'controlContainer',
      {
        server_id: serverId,
        container_id: containerId,
        action_type: action,
        hops: authData.hops, // hops 배열을 그대로 전달
        runtimeType,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || `컨테이너 ${action} 작업에 실패했습니다.`
      );
    }

    return response.data;
  } catch (error) {
    logger.error(`컨테이너 ${action} 실패`, undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * 도커 컨테이너 로그를 조회합니다. (다중 접속 인증 지원)
 * @param serverId 컨테이너가 있는 서버의 ID
 * @param containerId 로그를 조회할 컨테이너의 ID
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @param lines 조회할 로그 라인 수 (기본값: 100)
 */
export const getDockerLogs = async (
  serverId: number,
  containerId: string,
  authData: AuthParams,
  lines: number = 100,
  runtimeType: 'docker' | 'podman'
) => {
  try {
    const response = await api.docker.request<
      ApiResponse<{
        logs: string;
        container_id: string;
        container_name?: string;
        container_status?: string;
        container_exists?: boolean;
        lines?: number;
      }>
    >('getDockerLogs', {
      server_id: serverId,
      container_id: containerId,
      lines: lines,
      hops: authData.hops,
      runtimeType,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.error || '도커 로그를 가져오는데 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('도커 로그 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

//  [신규] 컨테이너 리소스 통계 타입
export interface ContainerStats {
  container_id: string;
  name: string;
  cpu_percent: string;
  memory_usage: string;
  memory_percent: string;
  network_io: string;
  block_io: string;
}

//  [신규] Docker 시스템 정보 타입
export interface DockerSystemInfo {
  docker_version: string;
  api_version: string;
  containers: {
    total: number;
    running: number;
    paused: number;
    stopped: number;
  };
  images_total: number;
  disk_usage: Array<{
    type: string;
    total_count: string;
    size: string;
    reclaimable: string;
  }>;
}

//  [신규] Docker 이미지 정보 타입
export interface DockerImageInfo {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

//  [신규] Docker 볼륨 정보 타입
export interface DockerVolumeInfo {
  name: string;
  driver: string;
  mountpoint: string;
}

//  [신규] Docker 네트워크 정보 타입
export interface DockerNetworkInfo {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

/**
 * 모든 컨테이너의 리소스 사용 통계를 조회합니다.
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @returns 컨테이너 통계 배열
 */
export const getAllContainerStats = async (
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
): Promise<ContainerStats[]> => {
  try {
    const response = await api.docker.request<ContainerStats[]>(
      'getAllContainerStats',
      {
        hops: authData.hops,
        runtimeType,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || '컨테이너 통계를 가져오는데 실패했습니다.'
      );
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('컨테이너 통계 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * Docker 시스템 정보를 조회합니다.
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @returns Docker 시스템 정보
 */
export const getDockerSystemInfo = async (
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
): Promise<DockerSystemInfo> => {
  try {
    const response = await api.docker.request<DockerSystemInfo>(
      'getDockerSystemInfo',
      {
        hops: authData.hops,
        runtimeType,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 시스템 정보를 가져오는데 실패했습니다.'
      );
    }

    const systemInfo = response.data.data;
    if (!systemInfo) {
      throw new Error('Docker 시스템 정보가 비어있습니다.');
    }

    return systemInfo;
  } catch (error) {
    logger.error('Docker 시스템 정보 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * Docker/Podman 리소스를 정리합니다.
 * @param pruneType 정리 타입 ('all', 'images', 'containers', 'volumes', 'networks')
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @param runtimeType 런타임 타입 ('docker' 또는 'podman', 기본값: 'docker')
 * @returns 정리 결과
 */
export const pruneDockerResources = async (
  pruneType: 'all' | 'images' | 'containers' | 'volumes' | 'networks',
  authData: AuthParams,
  runtimeType: 'docker' | 'podman' = 'docker'
): Promise<{ message: string; output: string }> => {
  try {
    const response = await api.docker.request<{ output: string }>(
      'pruneDockerResources',
      {
        prune_type: pruneType,
        hops: authData.hops,
        runtimeType: runtimeType,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '리소스 정리에 실패했습니다.');
    }

    const resultData = response.data.data as { output: string } | undefined;
    return {
      message: response.data.message || '리소스 정리가 완료되었습니다.',
      output: resultData?.output || '',
    };
  } catch (error) {
    logger.error('리소스 정리 실패', undefined, {
      error: String(error),
      runtimeType,
    });
    throw error;
  }
};

/**
 * Docker 이미지 목록을 조회합니다.
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @returns Docker 이미지 배열
 */
export const getDockerImages = async (
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
): Promise<DockerImageInfo[]> => {
  try {
    const response = await api.docker.request<{ images: DockerImageInfo[] }>(
      'getDockerImages',
      {
        hops: authData.hops,
        runtimeType,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 이미지 목록을 가져오는데 실패했습니다.'
      );
    }

    const resultData = response.data.data as
      | { images: DockerImageInfo[] }
      | undefined;
    return resultData?.images || [];
  } catch (error) {
    logger.error('Docker 이미지 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * Docker 볼륨 목록을 조회합니다.
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @returns Docker 볼륨 배열
 */
export const getDockerVolumes = async (
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
): Promise<DockerVolumeInfo[]> => {
  try {
    const response = await api.docker.request<{ volumes: DockerVolumeInfo[] }>(
      'getDockerVolumes',
      {
        hops: authData.hops,
        runtimeType,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 볼륨 목록을 가져오는데 실패했습니다.'
      );
    }

    const resultData = response.data.data as
      | { volumes: DockerVolumeInfo[] }
      | undefined;
    return resultData?.volumes || [];
  } catch (error) {
    logger.error('Docker 볼륨 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * Docker 네트워크 목록을 조회합니다.
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @returns Docker 네트워크 배열
 */
export const getDockerNetworks = async (
  authData: AuthParams,
  runtimeType: 'docker' | 'podman'
): Promise<DockerNetworkInfo[]> => {
  try {
    const response = await api.docker.request<{
      networks: DockerNetworkInfo[];
    }>('getDockerNetworks', {
      hops: authData.hops,
      runtimeType,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 네트워크 목록을 가져오는데 실패했습니다.'
      );
    }

    const resultData = response.data.data as
      | { networks: DockerNetworkInfo[] }
      | undefined;
    return resultData?.networks || [];
  } catch (error) {
    logger.error('Docker 네트워크 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * Docker/Podman 환경에서 명령을 실행합니다.
 * @param authData 다중 접속 경로 전체에 대한 인증 정보
 * @param command 실행할 명령어
 * @param containerId 명령을 실행할 컨테이너 ID (선택적)
 * @returns 명령 실행 결과
 */
export const executeCommand = async (
  authData: AuthParams,
  command: string,
  containerId?: string
): Promise<{ success: boolean; output: string; error?: string }> => {
  try {
    const response = await api.docker.request<{
      success: boolean;
      output: string;
      error?: string;
    }>('executeDockerCommand', {
      hops: authData.hops,
      command,
      container_id: containerId,
    });

    const resultData = response.data.data as
      | { output: string; exit_code?: number; error?: string }
      | undefined;

    // 백엔드는 최상위 success와 data.exit_code를 사용
    const isSuccess =
      response.data.success &&
      (resultData?.exit_code === 0 || resultData?.exit_code === undefined);

    // 에러 메시지 결정: error 필드 우선, 없으면 실패 시 output 사용 (Docker/Podman은 에러를 stdout에 출력)
    let errorMessage: string | undefined;
    if (!isSuccess) {
      errorMessage = resultData?.error || response.data.error;
      // error 필드가 없고 output이 있으면 output을 에러 메시지로 사용
      if (!errorMessage && resultData?.output) {
        errorMessage = resultData.output;
      }
      // 모든 필드가 없으면 기본 메시지
      if (!errorMessage) {
        errorMessage = '명령 실행에 실패했습니다.';
      }
    }

    return {
      success: isSuccess,
      output: isSuccess ? resultData?.output || '' : '', // 성공 시에만 output 반환
      error: errorMessage,
    };
  } catch (error) {
    logger.error('Docker 명령 실행 실패', undefined, {
      error: String(error),
      command,
      containerId,
    });
    return {
      success: false,
      output: '',
      error: String(error),
    };
  }
};

// ============================================
// Docker 백업 관련 타입 및 API
// ============================================

/** Docker 백업 정보 타입 */
export interface DockerBackup {
  id: number;
  name: string;
  infra_id: number;
  server_id?: number;
  service_id?: number;
  backup_type: 'volume' | 'config' | 'compose' | 'full';
  containers: string[];
  volumes: string[];
  compose_project?: string;
  storage_type: 'local' | 'minio' | 'nfs';
  storage_path?: string;
  storage_endpoint?: string;
  storage_bucket?: string;
  status: 'creating' | 'completed' | 'failed' | 'restoring' | 'deleted';
  size_bytes?: number;
  error_message?: string;
  trigger_type: 'manual' | 'pre_deploy' | 'post_deploy' | 'scheduled';
  triggered_by?: string;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
}

/** Docker 복구 정보 타입 */
export interface DockerRestore {
  id: number;
  backup_id: number;
  infra_id: number;
  restore_volumes: boolean;
  restore_config: boolean;
  redeploy?: boolean;
  stop_existing?: boolean;
  target_compose_project?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

/** Docker 백업 생성 요청 파라미터 */
export interface CreateDockerBackupParams {
  infra_id: number;
  hops: SshHop[];
  name?: string;
  backup_type?: 'volume' | 'config' | 'full';
  trigger_type?: 'manual' | 'pre_deploy' | 'post_deploy' | 'scheduled';
  server_id?: number;
  service_id?: number;
  containers?: string[];
  volumes?: string[];
  triggered_by?: string;
  // 중앙 저장소 설정
  storage_type?: 'local' | 'minio';
  storage_id?: number; // 인프라별 MinIO 저장소 ID (backup_storages 테이블)
  external_storage_id?: number; // 외부 저장소 ID (external_backup_storages 테이블)
  storage_endpoint?: string; // 직접 지정할 경우
  storage_bucket?: string; // 직접 지정할 경우
}

/** Docker 복구 요청 파라미터 */
export interface RestoreDockerBackupParams {
  backup_id: number;
  hops: SshHop[];
  restore_volumes?: boolean;
  restore_config?: boolean;
  target_infra_id?: number;
  /** Compose 파일로 서비스 재배포 여부 */
  redeploy_compose?: boolean;
  /** 기존 서비스 중지 후 복구 여부 */
  stop_existing?: boolean;
  /** MinIO 저장소 ID (MinIO에서 백업 다운로드 시 필요) */
  storage_id?: number;
  /** 선택적 컨테이너 복구 (비어있으면 전체 복구) */
  containers?: string[];
}

/**
 * Docker 백업을 생성합니다.
 * @param params 백업 생성 파라미터
 * @returns 생성된 백업 정보
 */
export const createDockerBackup = async (
  params: CreateDockerBackupParams
): Promise<{ backup_id: number; name: string; status: string }> => {
  try {
    const response = await api.docker.request<{
      backup_id: number;
      name: string;
      status: string;
    }>('createDockerBackup', params as unknown as Record<string, unknown>);

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 백업 생성에 실패했습니다.'
      );
    }

    const resultData = response.data.data as {
      backup_id: number;
      name: string;
      status: string;
    };
    return resultData;
  } catch (error) {
    logger.error('Docker 백업 생성 실패', undefined, { error: String(error) });
    throw error;
  }
};

/**
 * Docker 백업 목록을 조회합니다.
 * @param infraId 인프라 ID
 * @param serviceId 서비스 ID (선택)
 * @returns 백업 목록
 */
export const getDockerBackups = async (
  infraId?: number,
  serviceId?: number
): Promise<DockerBackup[]> => {
  try {
    const params: Record<string, number | undefined> = {};
    if (serviceId) params.service_id = serviceId;
    else if (infraId) params.infra_id = infraId;

    const response = await api.docker.request<{ backups: DockerBackup[] }>(
      'getDockerBackups',
      params
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 백업 목록 조회에 실패했습니다.'
      );
    }

    const resultData = response.data.data as
      | { backups: DockerBackup[] }
      | undefined;
    return resultData?.backups || [];
  } catch (error) {
    logger.error('Docker 백업 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

/**
 * Docker 백업 상세 정보를 조회합니다.
 * @param backupId 백업 ID
 * @returns 백업 상세 정보
 */
export const getDockerBackup = async (
  backupId: number
): Promise<DockerBackup | null> => {
  try {
    const response = await api.docker.request<DockerBackup>('getDockerBackup', {
      backup_id: backupId,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 백업 조회에 실패했습니다.'
      );
    }

    return response.data.data;
  } catch (error) {
    logger.error('Docker 백업 조회 실패', undefined, { error: String(error) });
    throw error;
  }
};

/**
 * Docker 백업을 삭제합니다.
 * @param backupId 백업 ID
 * @param hops SSH 연결 정보 (물리적 파일 삭제 시 필요)
 * @param hardDelete 물리적 파일도 삭제할지 여부
 */
export const deleteDockerBackup = async (
  backupId: number,
  hops?: SshHop[],
  hardDelete = false
): Promise<void> => {
  try {
    const response = await api.docker.request('deleteDockerBackup', {
      backup_id: backupId,
      hops,
      hard_delete: hardDelete,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 백업 삭제에 실패했습니다.'
      );
    }
  } catch (error) {
    logger.error('Docker 백업 삭제 실패', undefined, { error: String(error) });
    throw error;
  }
};

/**
 * Docker 백업을 복구합니다.
 * @param params 복구 요청 파라미터
 * @returns 복구 작업 정보
 */
export const restoreDockerBackup = async (
  params: RestoreDockerBackupParams
): Promise<{ restore_id: number; backup_id: number; status: string }> => {
  try {
    const response = await api.docker.request<{
      restore_id: number;
      backup_id: number;
      status: string;
    }>('restoreDockerBackup', params as unknown as Record<string, unknown>);

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 백업 복구에 실패했습니다.'
      );
    }

    const resultData = response.data.data as {
      restore_id: number;
      backup_id: number;
      status: string;
    };
    return resultData;
  } catch (error) {
    logger.error('Docker 백업 복구 실패', undefined, { error: String(error) });
    throw error;
  }
};

/**
 * Docker 복구 목록을 조회합니다.
 * @param infraId 인프라 ID
 * @returns 복구 목록
 */
export const getDockerRestores = async (
  infraId: number
): Promise<DockerRestore[]> => {
  try {
    const response = await api.docker.request<{ restores: DockerRestore[] }>(
      'getDockerRestores',
      { infra_id: infraId }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error || 'Docker 복구 목록 조회에 실패했습니다.'
      );
    }

    const resultData = response.data.data as
      | { restores: DockerRestore[] }
      | undefined;
    return resultData?.restores || [];
  } catch (error) {
    logger.error('Docker 복구 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};
