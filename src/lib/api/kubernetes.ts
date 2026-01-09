import { api } from '../../services/api';
import type {
    KubernetesDetails,
    KubernetesLogEntry,
    KubernetesNamespaceInfo,
    KubernetesNodeResponse,
    KubernetesPodInfo,
    KubernetesResource,
    Server,
    ServerStatus,
    User,
} from '../../types';
import type { AuthHops, InfraItem } from '../../types/infra';
import { validateApiResponse } from '../../utils/apiHelpers';
import { logger } from '../../utils/logger';

interface DeploymentInfoParams {
  namespace: string;
}

export interface DeployKubernetesParams {
  id: number; // 서비스 ID
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  username_repo: string; // GitLab 사용자명
  password_repo: string; // GitLab 비밀번호 또는 토큰
  docker_username: string; // Docker Registry 사용자명
  docker_password: string; // Docker Registry 비밀번호
}

export interface InfraPermission {
  user_id: number;
  user_email: string;
  role: 'admin' | 'member';
}

export interface SystemUser {
  id: number;
  email: string;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
  logs?: KubernetesLogEntry[];
  commandResults?: CommandResult[];
  details?: KubernetesDetails;
}

export interface InfraDetails {
  id: number;
  name: string;
  type: string;
  info: string;
  last_checked_status: string;
  created_at: string;
  updated_at: string;
}

export interface ServerDetails {
  id: number;
  name: string;
  infra_id: number;
  type: string;
  ip: string;
  port: number;
  status: ServerStatus;
  hops?: Array<{
    host: string;
    port: number;
  }>;
  join_command?: string;
  certificate_key?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalKubernetes {
  total: number;
  master: number;
  worker: number;
  list: {
    ip: {
      host: string;
      port: number;
      username: string;
    }[];
    name: string;
    role: string;
    status: string;
  }[];
}

type GetInfrasPayload = {
  success: boolean;
  infras: InfraItem[];
};

export interface NodeActionStartResult {
  message: string;
  success: boolean;
}

export const kubernetesApi = {
  /**
   * 특정 Deployment의 최종 배포 시간을 가져옵니다.
   */
  getLastDeploymentTime: (params: DeploymentInfoParams) => {
    return api.kubernetes.getLastDeploymentTime(params);
  },
};

// 서버 상태 확인
export const getNodeStatus = async (data: {
  id: number;
  infra_id: number;
  type: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<KubernetesNodeResponse>(
      'getNodeStatus',
      {
        server_id: data.id,
        infra_id: data.infra_id,
        type: data.type,
        hops: data.hops,
      }
    );

    const nodeData = validateApiResponse(response, '노드 상태 확인');

    // 응답 구조 그대로 반환
    return {
      status: {
        installed: nodeData.status?.installed || false,
        running: nodeData.status?.running || false,
      },
      lastChecked: nodeData.lastChecked || '',
      isMaster: nodeData.status?.isMaster,
      isWorker: nodeData.status?.isWorker,
    };
  } catch (error) {
    logger.error('노드 상태 확인 실패:', error as Error);
    throw error;
  }
};

// 로드밸런서(HA) 설치
export const installLoadBalancer = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops[];
}): Promise<NodeActionStartResult> => {
  // 1. 제네릭 타입으로 "내용물"인 `NodeActionStartResult`를 지정합니다.
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'installLoadBalancer',
    params
  );

  // 2. `response.data`는 `{ success, data: NodeActionStartResult, ... }` 타입의 래퍼입니다.
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || 'HA 노드 설치 시작에 실패했습니다.'
    );
  }

  // 3.  [핵심] 래퍼 객체 안의 `.data` 프로퍼티를 반환해야 합니다.
  //    이것이 바로 우리가 원하는 `{ message: "..." }` 형태의 `NodeActionStartResult` 객체입니다.
  return backendResponse.data;
};

// 첫 번째 마스터 설치
export const installFirstMaster = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops[];
  lb_hops?: AuthHops[];
  password?: string;
  lb_password?: string;
}): Promise<NodeActionStartResult> => {
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'installFirstMaster',
    params
  );
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || 'HA 노드 설치 시작에 실패했습니다.'
    );
  }

  return backendResponse.data;
};

// 마스터 노드 조인
export const joinMaster = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops[];
  lb_hops: AuthHops[];
  main_id: number;
  password?: string;
  lb_password?: string;
}): Promise<NodeActionStartResult> => {
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'joinMaster',
    params
  );
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '마스터 노드 조인 시작에 실패했습니다.'
    );
  }

  return backendResponse.data;
};

// 워커 노드 조인
export const joinWorker = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops[];
  main_id: number;
  password?: string;
}): Promise<NodeActionStartResult> => {
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'joinWorker',
    params
  );
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '워커 노드 조인 시작에 실패했습니다.'
    );
  }

  return backendResponse.data;
};

// 노드 제거
export const removeNode = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  nodeName: string;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('removeNode', {
      server_id: data.id,
      hops: data.hops,
      nodeName: data.nodeName,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    const result = response.data.data;

    if (!result) {
      throw new Error('명령 결과 데이터가 없습니다');
    }

    return {
      success: result.success || false,
      message: result.message,
      error: result.error,
      details: result.details,
    };
  } catch (error) {
    logger.error('노드 제거 실패:', error as Error);
    throw error;
  }
};

// 서버 시작
export const startServer = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'startServer',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error) {
    logger.error('서버 시작 실패:', error as Error);
    throw error;
  }
};

// 서버 중지
export const stopServer = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>('stopServer', {
      server_id: data.id,
      hops: data.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error) {
    logger.error('서버 중지 실패:', error as Error);
    throw error;
  }
};

// 서버 재시작
export const restartServer = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'restartServer',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error) {
    logger.error('서버 재시작 실패:', error as Error);
    throw error;
  }
};

// 인프라 목록 조회 (기관별 필터링 지원)
export const getInfras = async (organizationId?: number | null): Promise<InfraItem[]> => {
  try {
    const response = await api.kubernetes.request<GetInfrasPayload>(
      'getInfras',
      {
        ...(organizationId && { organization_id: organizationId }),
      }
    );
    const payload = response.data;

    if (payload?.success && Array.isArray(payload.data)) {
      return payload.data;
    }
    return [];
  } catch (error) {
    logger.error('Failed to fetch infras:', error as Error);
    return [];
  }
};

// 인프라 상세 조회
export const getInfraStatusById = async (id: number) => {
  try {
    const response = await api.kubernetes.request<string>(
      'getInfraStatusById',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 상세 조회 실패:', error as Error);
    throw error;
  }
};

// 인프라 생성
export const createInfra = async (data: {
  name: string; // 인프라 이름
  type: string; // 인프라 유형 (kubernetes, baremetal, docker, cloud, external_kubernetes, external_docker)
  info: string; // 인프라 구성 정보
}) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>(
      'createInfra',
      data
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 생성 실패:', error as Error);
    throw error;
  }
};

// 인프라 수정
export const updateInfra = async (
  id: number,
  data: {
    name?: string; // 인프라 이름
    type?: string; // 인프라 유형 (kubernetes, baremetal, docker, cloud, external_kubernetes, external_docker)
    info?: string; // 인프라 구성 정보
  }
) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>('updateInfra', {
      id,
      ...data,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 수정 실패:', error as Error);
    throw error;
  }
};

// 인프라 삭제
export const deleteInfra = async (id: number) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'deleteInfra',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 삭제 실패:', error as Error);
    throw error;
  }
};

// 마지막 확인 업데이트
export const updateLastChecked = async (serverId: number, status: string) => {
  try {
    const response = await api.kubernetes.request<Server[]>(
      'updateLastChecked',
      {
        server_id: serverId,
        status: status,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('마지막 확인 업데이트 실패:', error as Error);
    throw error;
  }
};

// 서버 목록 조회
export const getServers = async (infraId: number) => {
  try {
    const response = await api.kubernetes.request<Server[]>('getServers', {
      infra_id: infraId,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('서버 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 서버 상세 조회
export const getServerById = async (id: number) => {
  try {
    const response = await api.kubernetes.request<ServerDetails>(
      'getServerById',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 상세 조회 실패:', error as Error);
    throw error;
  }
};

export const GetMasterNodeByInfraID = async (infraId: number) => {
  try {
    const response = await api.kubernetes.request<Server>(
      'getMasterNodeByInfraID',
      { infraId }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 상세 조회 실패:', error as Error);
    throw error;
  }
};

// 서버 생성
export const createServer = async (data: {
  name?: string;
  infra_id: number;
  type: string;
  ip?: string;
  port?: number;
  status?: ServerStatus;
  device_id?: number;
  hops?: Array<{
    host: string;
    port: number;
  }>;
  join_command?: string;
  certificate_key?: string;
}) => {
  try {
    const response = await api.kubernetes.request<ServerDetails>(
      'createServer',
      data
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 생성 실패:', error as Error);
    throw error;
  }
};

// 서버 수정
export const updateServer = async (
  id: number,
  data: {
    name?: string;
    infra_id?: number;
    type?: string;
    hops?: Array<{
      host: string;
      port: number;
    }>;
    join_command?: string;
    certificate_key?: string;
  }
) => {
  try {
    const response = await api.kubernetes.request<ServerDetails>(
      'updateServer',
      { id, ...data }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 수정 실패:', error as Error);
    throw error;
  }
};

// 서버 삭제
export const deleteServer = async (id: number) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'deleteServer',
      { id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('서버 삭제 실패:', error as Error);
    throw error;
  }
};

// 워커 노드 삭제
export const deleteWorker = async (params: {
  id: number;
  infra_id: number;
  main_id: number;
  hops: AuthHops;
  main_hops: AuthHops;
  password?: string;
  main_password?: string;
}): Promise<NodeActionStartResult> => {
  //  NodeActionStartResult 타입 재사용
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'deleteWorker',
    params
  );
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '워커 노드 삭제 시작에 실패했습니다.'
    );
  }

  return backendResponse.data;
};

// 마스터 노드 삭제
export const deleteMaster = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops;
  main_hops: AuthHops;
  lb_hops?: AuthHops;
  password?: string;
  main_password?: string;
  lb_password?: string;
}): Promise<NodeActionStartResult> => {
  // 1. 제네릭 타입으로 "내용물"인 `NodeActionStartResult`를 지정합니다.
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'deleteMaster',
    params
  );

  // 2. `response.data`는 이제 `{ success, data: NodeActionStartResult, ... }` 타입입니다.
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '마스터 노드 삭제 시작에 실패했습니다.'
    );
  }

  // 3. `backendResponse.data`가 바로 `{ message }` 형태의 객체입니다.
  return backendResponse.data;
};

// 네임스페이스 및 파드 상태 조회
export const getNamespaceAndPodStatus = async (data: {
  id: number;
  infra_id: number;
  namespace: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  const response = await api.kubernetes.request<{
    namespace: KubernetesNamespaceInfo;
    pods: KubernetesPodInfo[];
  }>('getNamespaceAndPodStatus', {
    server_id: data.id,
    infra_id: data.infra_id,
    namespace: data.namespace,
    hops: data.hops,
  });

  if (!response.data || !response.data.success) {
    throw new Error(response.data?.error || '응답 데이터가 없습니다');
  }

  return response.data.data;
};

/**
 * 쿠버네티스 배포 함수 (Docker 빌드 지원)
 * @param data 배포에 필요한 데이터
 * @returns 배포 결과
 */
export const deployKubernetes = async (data: DeployKubernetesParams) => {
  // 백엔드에 'deployKubernetes' 액션과 함께 데이터를 전송합니다.
  const response = await api.kubernetes.request<Record<string, unknown>>(
    'deployKubernetes',
    data as unknown as Record<string, unknown>
  );

  // 백엔드에서 success: false를 보낸 경우 에러를 발생시킵니다.
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start deployment');
  }

  return response.data.data;
};

/**
 * 쿠버네티스 재배포 함수 (환경 준비 단계 생략)
 * @param data 배포에 필요한 데이터
 * @returns 배포 결과
 */
export const redeployKubernetes = async (data: DeployKubernetesParams) => {
  // 백엔드에 새로 추가한 'redeployKubernetes' 액션을 호출합니다.
  const response = await api.kubernetes.request<Record<string, unknown>>(
    'redeployKubernetes',
    data as unknown as Record<string, unknown>
  );

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start redeployment');
  }

  return response.data;
};

// 네임스페이스 삭제
export const deleteNamespace = async (params: {
  id: number;
  namespace: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  logs?: KubernetesLogEntry[];
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      error?: string;
      logs?: KubernetesLogEntry[];
    }>('deleteNamespace', {
      server_id: params.id,
      namespace: params.namespace,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        message: '응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('네임스페이스 삭제 실패:', error as Error);
    throw error;
  }
};

// 파드 로그 조회
export const getPodLogs = async (params: {
  id: number;
  namespace: string;
  pod_name: string;
  lines?: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  logs?: string;
  error?: string;
  pod_exists?: boolean;
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      logs?: string;
      error?: string;
      pod_exists?: boolean;
    }>('getPodLogs', {
      server_id: params.id,
      namespace: params.namespace,
      pod_name: params.pod_name,
      lines: params.lines,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        logs: '로그가 없습니다',
      }
    );
  } catch (error) {
    logger.error('파드 로그 조회 실패:', error as Error);
    throw error;
  }
};

// 파드 재시작
export const restartPod = async (params: {
  id: number;
  namespace: string;
  pod_name: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  logs?: KubernetesLogEntry[];
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      error?: string;
      logs?: KubernetesLogEntry[];
    }>('restartPod', {
      server_id: params.id,
      namespace: params.namespace,
      pod_name: params.pod_name,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        message: '응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('파드 재시작 실패:', error as Error);
    throw error;
  }
};

// 파드 삭제
export const deletePod = async (params: {
  id: number;
  namespace: string;
  pod_name: string;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  logs?: KubernetesLogEntry[];
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      error?: string;
      logs?: KubernetesLogEntry[];
    }>('deletePod', {
      server_id: params.id,
      namespace: params.namespace,
      pod_name: params.pod_name,
      hops: params.hops,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return (
      response.data.data || {
        success: false,
        message: '응답 데이터가 없습니다',
      }
    );
  } catch (error) {
    logger.error('파드 삭제 실패:', error as Error);
    throw error;
  }
};

// Kubernetes 인프라 가져오기
export const importKubernetesInfra = async (data: {
  name: string;
  type: string;
  info: string;
  hops: Array<{
    host: string;
    port: number | string;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<InfraDetails>(
      'importKubernetesInfra',
      data
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('Kubernetes 인프라 가져오기 실패:', error as Error);
    throw error;
  }
};

// 노드 계산
export const calculateNodes = async (data: {
  id?: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<ExternalKubernetes>(
      'calculateNodes',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data;
  } catch (error) {
    logger.error('노드 계산 실패:', error as Error);
    throw error;
  }
};

// 리소스 계산
export const calculateResources = async (params: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<KubernetesResource>(
      'calculateResources',
      {
        server_id: params.id,
        hops: params.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('리소스 계산 실패:', error as Error);
    throw error;
  }
};

// 인증서 갱신
export const renewCertificate = async (data: {
  id: number;
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'renewCertificate',
      {
        server_id: data.id,
        hops: data.hops,
      }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return {
      success: response.data.success,
      message: response.data.message,
      error: response.data.error,
      commandResults:
        (response.data as { commandResults?: CommandResult[] })
          .commandResults || [],
    };
  } catch (error: unknown) {
    logger.error('인증서 갱신 실패:', error as Error);
    throw error;
  }
};

// HA 재구축
export const rebuildHA = async (params: {
  id: number;
  infra_id: number; // 핸들러에서 권한 확인을 위해 필요할 수 있습니다.
  hops: AuthHops[];
}): Promise<NodeActionStartResult> => {
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'rebuildHA',
    params
  );
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || 'HA 노드 재구축 시작에 실패했습니다.'
    );
  }

  return backendResponse.data;
};

// 첫 번째 마스터 재구축
export const rebuildFirstMaster = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops[];
  password?: string;
  // ... 기타 필요한 파라미터
}): Promise<NodeActionStartResult> => {
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'rebuildFirstMaster',
    params
  );
  const backendResponse = response.data;

  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '첫 마스터 노드 재구축 시작에 실패했습니다.'
    );
  }

  return backendResponse.data;
};

export const rebuildMaster = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops[];
  main_id: number;
  lb_hops?: AuthHops[];
  password?: string;
  main_password?: string; // main 마스터 인증을 위해 필요할 수 있음
  lb_password?: string;
}): Promise<NodeActionStartResult> => {
  // 1. 제네릭 타입으로 "내용물"인 `NodeActionStartResult`를 지정합니다.
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'rebuildMaster',
    params
  );

  // 2. `response.data`는 이제 `{ success, data: NodeActionStartResult, ... }` 타입입니다.
  const backendResponse = response.data;

  // 3. 성공 여부를 확인하고 실패 시 에러를 던집니다.
  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '마스터 노드 재구축 시작에 실패했습니다.'
    );
  }

  // 4. `backendResponse.data`가 바로 `{ message }` 형태의 객체입니다.
  return backendResponse.data;
};

export const rebuildWorker = async (params: {
  id: number;
  infra_id: number;
  hops: AuthHops;
  main_id: number;
  password?: string;
  main_password?: string; // main 마스터 인증을 위해 필요할 수 있음
}): Promise<NodeActionStartResult> => {
  // 1. 제네릭 타입으로 "내용물"인 `NodeActionStartResult`를 지정합니다.
  const response = await api.kubernetes.request<NodeActionStartResult>(
    'rebuildWorker',
    params
  );

  // 2. `response.data`는 이제 `{ success, data: NodeActionStartResult, ... }` 타입입니다.
  const backendResponse = response.data;

  // 3. 성공 여부를 확인하고 실패 시 에러를 던집니다.
  if (!backendResponse.success) {
    throw new Error(
      backendResponse.error || '워커 노드 재구축 시작에 실패했습니다.'
    );
  }

  // 4. `backendResponse.data`가 바로 `{ message }` 형태의 객체입니다.
  return backendResponse.data;
};

// 인프라 권한 조회
export const getInfraPermissions = async (infraId: number) => {
  try {
    const response = await api.kubernetes.request<InfraPermission[]>(
      'getInfraPermissions',
      { infra_id: infraId }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('인프라 권한 조회 실패:', error as Error);
    throw error;
  }
};

// 모든 사용자 조회
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.kubernetes.request<User[]>('getAllUsers', {});

    if (!response?.data?.success) {
      return [];
    }

    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch users:', error as Error);

    return [];
  }
};

// 인프라 권한 설정
export const setInfraPermission = async (params: {
  infra_id: number;
  email: string;
}) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'setInfraPermission',
      params
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 권한 설정 실패:', error as Error);
    throw error;
  }
};

// 인프라 권한 제거
export const removeInfraPermission = async (params: {
  infra_id: number;
  user_id: number;
}) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'removeInfraPermission',
      params
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data.data;
  } catch (error) {
    logger.error('인프라 권한 제거 실패:', error as Error);
    throw error;
  }
};

// ==================== TLS Secret 관리 API ====================

// TLS Secret 정보 타입
export interface TLSSecretInfo {
  name: string;
  namespace: string;
  type: string;
  created_at: string;
  cert_expiry?: string;
  cert_issuer?: string;
  cert_subject?: string;
}

// TLS Secret 생성 파라미터
export interface CreateTLSSecretParams {
  secret_name: string;
  namespace: string;
  cert_content: string; // PEM 형식의 인증서
  key_content: string; // PEM 형식의 개인키
  service_id?: number;
  infra_id?: number;
}

// TLS Secret 생성
export const createTLSSecret = async (
  params: CreateTLSSecretParams
): Promise<{
  success: boolean;
  message?: string;
  secret_name?: string;
  namespace?: string;
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
      secret_name?: string;
      namespace?: string;
    }>('createTLSSecret', params as unknown as Record<string, unknown>);

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'TLS Secret 생성 실패');
    }

    return response.data.data || { success: true };
  } catch (error) {
    logger.error('TLS Secret 생성 실패:', error as Error);
    throw error;
  }
};

// TLS Secret 목록 조회
export const listTLSSecrets = async (params: {
  namespace: string;
  service_id?: number;
  infra_id?: number;
}): Promise<{
  secrets: TLSSecretInfo[];
  namespace: string;
}> => {
  try {
    const response = await api.kubernetes.request<{
      secrets: TLSSecretInfo[];
      namespace: string;
    }>('listTLSSecrets', params);

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'TLS Secret 목록 조회 실패');
    }

    return response.data.data || { secrets: [], namespace: params.namespace };
  } catch (error) {
    logger.error('TLS Secret 목록 조회 실패:', error as Error);
    throw error;
  }
};

// TLS Secret 삭제
export const deleteTLSSecret = async (params: {
  secret_name: string;
  namespace: string;
  service_id?: number;
  infra_id?: number;
}): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const response = await api.kubernetes.request<{
      success: boolean;
      message?: string;
    }>('deleteTLSSecret', params);

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'TLS Secret 삭제 실패');
    }

    return response.data.data || { success: true };
  } catch (error) {
    logger.error('TLS Secret 삭제 실패:', error as Error);
    throw error;
  }
};

// TLS Secret 정보 조회
export const getTLSSecret = async (params: {
  secret_name: string;
  namespace: string;
  service_id?: number;
  infra_id?: number;
}): Promise<TLSSecretInfo> => {
  try {
    const response = await api.kubernetes.request<TLSSecretInfo>(
      'getTLSSecret',
      params
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'TLS Secret 조회 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('TLS Secret 조회 실패:', error as Error);
    throw error;
  }
};

export const addServerFromExternalKubernetes = async (
  node: {
    ip: {
      host: string;
      port: number;
      username: string;
    }[];
    name: string;
    role: string;
    status: string;
  },
  infra_id: number,
  device_id: number
) => {
  try {
    const response = await api.kubernetes.request<{ success: boolean }>(
      'addServerFromKubernetes',
      { node, infra_id, device_id }
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    return response.data;
  } catch (error) {
    logger.error('외부 런타임 서버 등록 실패:', error as Error);
    throw error;
  }
};
