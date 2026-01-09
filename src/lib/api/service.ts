import type { HopInfo, Project } from '../../data/mockProjects';
import type {
    CreateServiceRequest,
    Service,
    ServiceMember,
    ServiceStatus,
    UpdateServiceRequest,
} from '../../types/service';
import { logger } from '../../utils/logger';
import apiClient from './client';

export interface ServiceFromDB {
  id: number;
  name: string;
  domain: string;
  namespace: string;
  gitlab_url: string;
  gitlab_config?: string; // JSON string of GitLabConfig

  // Legacy fields (deprecated)
  gitlab_branch?: string;
  gitlab_access_token?: string;

  docker_compose_config: string;
  registry_config: string;
  creator_id: number;
  creator_email?: string; //  creator email 추가
  infra_id: number;
  is_deployed: boolean;
  created_at: string;
  updated_at: string;
  user_role: string;
  infraType: string; //  Backend MarshalJSON이 camelCase string으로 변환하여 전송
  hops: { String: string; Valid: boolean }; // 이 필드도 객체 형태일 수 있음
}

export interface Server {
  id: number;
  infra_id: number;
  server_name: string;
  hops: string; // JSON 문자열
  type: string;
  join_command: string;
}

export const transformServiceToProject = (service: ServiceFromDB): Project => {
  const mapEnv = (type: string | null): Project['environment'] => {
    if (!type) return 'development';
    if (type.toLowerCase().includes('kubernetes')) return 'production';
    if (type.toLowerCase().includes('docker')) return 'staging';
    return 'development';
  };

  let dockerRegistry = '정보 없음';
  if (service.registry_config) {
    try {
      const registryConfig = JSON.parse(service.registry_config);
      if (registryConfig.docker_registry) {
        dockerRegistry = registryConfig.docker_registry;
      }
    } catch {
      // Failed to parse registry_config
    }
  }

  //  infraType은 이제 plain string이므로 직접 사용
  const infraType = service.infraType || null;

  let infraHops: HopInfo[] = [];
  if (service.hops && service.hops.Valid) {
    try {
      const parsedHops = JSON.parse(service.hops.String);
      if (Array.isArray(parsedHops)) {
        infraHops = parsedHops;
      }
    } catch {
      // Failed to parse hops JSON
    }
  }

  const transformedProject: Project = {
    id: String(service.id),
    name: service.name,
    description: service.namespace
      ? `Namespace: ${service.namespace}`
      : 'DB-sourced service',
    status: service.is_deployed ? 'active' : 'maintenance',
    environment: mapEnv(infraType),
    lastDeployment: new Date(service.updated_at).toLocaleString(),
    createdAt: new Date(service.created_at).toLocaleDateString(),
    dataSource: 'db',
    dockerRegistry: dockerRegistry,
    infrastructure: infraHops,

    team: service.user_role || 'N/A',
    techStack: infraType ? [infraType] : ['Unknown'],
    healthScore: 75,
    git: {
      //  [수정] 이제 단순 문자열이므로 직접 접근합니다.
      repository: service.gitlab_url || '',
      branch: service.gitlab_branch || 'main',
      lastCommit: 'N/A',
      commitHash: 'N/A',
      author: 'N/A',
    },
    serviceUrl: {
      //  [수정] 이제 단순 문자열이므로 직접 접근합니다.
      production: service.domain || undefined,
    },
  };

  return transformedProject;
};

// 서비스 목록 가져오기 (기관별 필터링 지원)
export const getServices = async (organizationId?: number | null): Promise<ServiceFromDB[]> => {
  try {
    const response = await apiClient.service<ServiceFromDB[]>(
      'getServices',
      {
        ...(organizationId && { organization_id: organizationId }),
      }
    );
    // Mock API가 { data: services } 형태로 반환하므로 처리
    const data = response.data as any;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    logger.error('서비스 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 특정 서비스 정보 가져오기 (기존 코드의 버그 수정)
// 기존 코드는 getServices를 다시 호출하여 비효율적이므로, getServiceById 액션을 호출하도록 수정합니다.
export const getService = async (serviceId: number): Promise<Service> => {
  try {
    const response = await apiClient.service<Service>('getServiceById', {
      id: serviceId,
    });
    if (!response.data) {
      throw new Error('서비스를 찾을 수 없습니다.');
    }
    return response.data;
  } catch (error) {
    logger.error('서비스 조회 실패:', error as Error);
    throw error;
  }
};

// ... (getServiceStatus, createService 등 나머지 함수들은 기존과 동일하게 유지합니다)
const isValidServiceStatus = (status: unknown): status is ServiceStatus => {
  const validStatuses: ServiceStatus[] = [
    'running',
    'stopped',
    'error',
    'pending',
    'deploying',
    'failed',
    'registered',
    'restarting',
    'stopping',
  ];
  return (
    typeof status === 'string' &&
    validStatuses.includes(status as ServiceStatus)
  );
};
export const getServiceStatus = async (
  serviceId: number
): Promise<ServiceStatus> => {
  try {
    const response = await apiClient.service<string>('status', {
      service_id: serviceId,
    });
    if (!response.data || !isValidServiceStatus(response.data)) {
      logger.warn('Received invalid service status:', {
        status: response.data,
      });
      return 'pending';
    }
    return response.data;
  } catch (error) {
    logger.error('서비스 상태 조회 실패:', error as Error);
    throw error;
  }
};
export const createService = async (
  serviceData: CreateServiceRequest
): Promise<Service> => {
  try {
    const response = await apiClient.service<Service>('create', serviceData);
    if (!response.data) {
      throw new Error('서비스 생성에 실패했습니다.');
    }
    return response.data;
  } catch (error) {
    logger.error('서비스 생성 실패:', error as Error);
    throw error;
  }
};
export const updateService = async (
  serviceId: number,
  serviceData: UpdateServiceRequest
): Promise<Service> => {
  try {
    const response = await apiClient.service<Service>('update', {
      service_id: serviceId,
      ...serviceData,
    });
    if (!response.data) {
      throw new Error('서비스 업데이트에 실패했습니다.');
    }
    return response.data;
  } catch (error) {
    logger.error('서비스 업데이트 실패:', error as Error);
    throw error;
  }
};
export const deleteService = async (serviceId: number): Promise<void> => {
  try {
    await apiClient.service('delete', { service_id: serviceId });
  } catch (error) {
    logger.error('서비스 삭제 실패:', error as Error);
    throw error;
  }
};
export const deployService = async (
  deployData: Record<string, unknown>
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const response = await apiClient.service('deployService', deployData);
    return response;
  } catch (error) {
    logger.error('서비스 배포 실패:', error as Error);
    throw error;
  }
};
export const startService = async (serviceId: number): Promise<void> => {
  try {
    await apiClient.service('start', { service_id: serviceId });
  } catch (error) {
    logger.error('서비스 시작 실패:', error as Error);
    throw error;
  }
};
export const stopService = async (serviceId: number): Promise<void> => {
  try {
    await apiClient.service('stop', { service_id: serviceId });
  } catch (error) {
    logger.error('서비스 중지 실패:', error as Error);
    throw error;
  }
};
export const restartService = async (serviceId: number): Promise<void> => {
  try {
    await apiClient.service('restart', { service_id: serviceId });
  } catch (error) {
    logger.error('서비스 재시작 실패:', error as Error);
    throw error;
  }
};
export const getServiceLogs = async (
  serviceId: number,
  lines?: number
): Promise<string> => {
  try {
    const response = await apiClient.service<{ logs: string }>('logs', {
      service_id: serviceId,
      lines: lines || 100,
    });
    return response.data?.logs || '';
  } catch (error) {
    logger.error('서비스 로그 조회 실패:', error as Error);
    throw error;
  }
};
export const getServiceMembers = async (
  _serviceId: number
): Promise<ServiceMember[]> => {
  try {
    logger.warn('서비스 멤버 기능이 현재 지원되지 않습니다.');
    return [];
  } catch (error) {
    logger.error('서비스 멤버 목록 조회 실패:', error as Error);
    throw error;
  }
};
export const addServiceMember = async (
  _serviceId: number,
  _userId: number,
  _role: string
): Promise<ServiceMember> => {
  try {
    throw new Error('서비스 멤버 추가 기능이 현재 지원되지 않습니다.');
  } catch (error) {
    logger.error('서비스 멤버 추가 실패:', error as Error);
    throw error;
  }
};
export const removeServiceMember = async (
  _serviceId: number,
  _userId: number
): Promise<void> => {
  try {
    throw new Error('서비스 멤버 제거 기능이 현재 지원되지 않습니다.');
  } catch (error) {
    logger.error('서비스 멤버 제거 실패:', error as Error);
    throw error;
  }
};

export const getServiceServers = async (serviceId: number): Promise<Server> => {
  try {
    // 1초 딜레이 추가 (API 서버 준비 시간 확보)
    const response = await apiClient.service<Server>('getServiceServers', {
      service_id: serviceId,
    });
    if (!response.data) {
      throw new Error('서버 정보를 찾을 수 없습니다.');
    }
    return response.data;
  } catch (error) {
    logger.error('서비스의 서버 정보 조회 실패:', error as Error);
    throw error;
  }
};

// 서비스의 인프라 ID 업데이트
const updateServiceInfra = async (
  serviceId: number,
  infraId: number
): Promise<void> => {
  try {
    await apiClient.service('updateServiceInfra', {
      service_id: serviceId,
      infra_id: infraId,
    });
  } catch (error) {
    logger.error('서비스 인프라 업데이트 실패:', error as Error);
    throw error;
  }
};

// 서비스의 Registry 설정 업데이트 ( username, password 추가)
export const updateServiceRegistryConfig = async (
  serviceId: number,
  registryUrl: string,
  registryType: 'dockerhub' | 'harbor',
  projectName?: string,
  username?: string, //  username 추가
  password?: string //  password 추가
): Promise<void> => {
  try {
    await apiClient.infra('updateServiceRegistryConfig', {
      service_id: serviceId,
      registry_url: registryUrl,
      registry_type: registryType,
      project_name: projectName,
      username, //  username 전달
      password, //  password 전달
    });
  } catch (error) {
    logger.error('Registry 설정 업데이트 실패:', error as Error);
    throw error;
  }
};

export const updateServiceInfo = async (selectedServiceInfo: {
  id: number;
  serviceName: string;
  gitlabBranch?: string;
  infraId?: number; //  인프라 ID 추가 (서버는 infra_id로 자동 결정됨)
}): Promise<{ id: number; serviceName: string; gitlabBranch: string }> => {
  try {
    const response = await apiClient.service('updateServiceInfo', {
      id: selectedServiceInfo.id,
      name: selectedServiceInfo.serviceName,
      branch: selectedServiceInfo.gitlabBranch,
      infra_id: selectedServiceInfo.infraId, //  인프라 ID 전달
    });
    return (
      (response.data as {
        id: number;
        serviceName: string;
        gitlabBranch: string;
      }) || null
    );
  } catch (error) {
    logger.error('서비스 정보 수정 실패', error as Error);
    throw error;
  }
};

/**
 * 서비스의 GitLab Access Token을 업데이트합니다.
 * @param serviceId - 서비스 ID
 * @param gitlabAccessToken - GitLab Access Token
 * @returns 업데이트된 서비스 정보
 */
export const updateServiceGitLabToken = async (
  serviceId: number,
  gitlabAccessToken: string
): Promise<Service> => {
  try {
    const response = await apiClient.service<Service>('updateService', {
      id: serviceId,
      gitlab_access_token: gitlabAccessToken,
    });
    if (!response.data) {
      throw new Error('GitLab 토큰 업데이트에 실패했습니다.');
    }
    return response.data;
  } catch (error) {
    logger.error('GitLab 토큰 업데이트 실패:', error as Error);
    throw error;
  }
};

/**
 * 서비스의 GitLab 설정을 업데이트합니다 (branch, token, username을 JSON으로 저장)
 * @param serviceId - 서비스 ID
 * @param gitlabConfig - GitLab 설정 객체
 * @returns 업데이트된 서비스 정보
 */
export const updateServiceGitLabConfig = async (
  serviceId: number,
  gitlabConfig: {
    branch?: string;
    access_token?: string; //  레거시 필드 (하위 호환성)
    token?: string; //  신규 필드 (권장)
    username?: string;
  }
): Promise<Service> => {
  try {
    //  access_token이 있으면 token으로도 복사 (하위 호환성)
    const configToSend = { ...gitlabConfig };
    if (configToSend.access_token && !configToSend.token) {
      configToSend.token = configToSend.access_token;
    }

    const response = await apiClient.service<Service>('updateService', {
      id: serviceId,
      gitlab_config: JSON.stringify(configToSend),
    });
    if (!response.data) {
      throw new Error('GitLab 설정 업데이트에 실패했습니다.');
    }
    return response.data;
  } catch (error) {
    logger.error('GitLab 설정 업데이트 실패:', error as Error);
    throw error;
  }
};

//  [수정] 'export' 키워드를 추가하여 named export를 만듭니다.
export const serviceApi = {
  getServices,
  getService,
  getServiceStatus,
  createService,
  updateService,
  deleteService,
  deployService,
  startService,
  stopService,
  restartService,
  getServiceLogs,
  getServiceMembers,
  addServiceMember,
  removeServiceMember,
  getServiceServers,
  updateServiceInfra,
  updateServiceRegistryConfig,
  updateServiceInfo,
  updateServiceGitLabToken,
  updateServiceGitLabConfig,
};

export default serviceApi;
