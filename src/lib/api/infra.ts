import { api } from '../../services/api';
import { InfraItem, Server, SshHop } from '../../types/infra';

import { logger } from '../../utils/logger';

// 인프라 목록 가져오기
export const getInfrastructures = async (): Promise<InfraItem[]> => {
  try {
    const response = await api.infra.request<InfraItem[]>('list', {});

    return response.data?.data || [];
  } catch (error) {
    logger.error('인프라 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 특정 인프라의 서버 목록 가져오기
export const getServers = async (infraId: number): Promise<Server[]> => {
  try {
    const response = await api.infra.request<Server[]>('list-servers', {
      infra_id: infraId,
    });

    if (response.data?.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    logger.error('서버 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 빌드 가능한 인프라 목록 가져오기 (kubernetes, docker, podman만)
export const getBuildInfras = async (): Promise<InfraItem[]> => {
  try {
    const response = await api.infra.request<InfraItem[]>(
      'list-build-infras',
      {}
    );

    if (response.data?.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    logger.error('빌드 인프라 목록 조회 실패:', error as Error);
    throw error;
  }
};

// 서버의 SSH hops 가져오기 (비밀번호 제외)
export const getServerHops = async (serverId: number): Promise<SshHop[]> => {
  try {
    const response = await api.infra.request<SshHop[]>('get-server-hops', {
      server_id: serverId,
    });

    if (response.data?.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    logger.error('서버 hops 조회 실패:', error as Error);
    throw error;
  }
};

// Kubernetes 클러스터의 Namespace 목록 조회
export const getK8sNamespaces = async (infraId: number): Promise<string[]> => {
  try {
    const response = await api.kubernetes.request<string[]>('getNamespaces', {
      infra_id: infraId,
    });

    if (response.data?.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    logger.error('Namespace 목록 조회 실패:', error as Error);
    throw error;
  }
};

// Node Pool 목록 조회 (선택사항)
export const getNodePools = async (infraId: number): Promise<string[]> => {
  try {
    const response = await api.kubernetes.request<string[]>('getNodePools', {
      infra_id: infraId,
    });

    if (response.data?.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    logger.error('Node Pool 목록 조회 실패:', error as Error);
    throw error;
  }
};

// Git 인증 테스트
export const testGitAuthentication = async (params: {
  git_url: string;
  username: string;
  token: string;
}): Promise<void> => {
  try {
    const response = await api.git.request('testGitAuth', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Git 인증 실패');
    }
  } catch (error) {
    logger.error('Git 인증 테스트 실패:', error as Error);
    throw error;
  }
};

// GitLab 인증 테스트 (실제 접속 인증)
export const testGitLabAuthentication = async (params: {
  gitlab_url: string;
  access_token: string;
}): Promise<{ username: string; name: string; email: string }> => {
  try {
    const response = await api.infra.request<{
      username: string;
      name: string;
      email: string;
    }>('testGitLabAuth', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'GitLab 인증 실패');
    }

    return response.data.data;
  } catch (error) {
    logger.error('GitLab 인증 테스트 실패:', error as Error);
    throw error;
  }
};

// Registry 인증 테스트
export const testRegistryAuthentication = async (params: {
  registry_url: string;
  username: string;
  password: string;
  infra_id: number;
  registry_type: 'dockerhub' | 'harbor';
  project_name?: string;
}): Promise<void> => {
  try {
    const response = await api.infra.request('testRegistryAuth', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Registry 인증 실패');
    }
  } catch (error) {
    logger.error('Registry 인증 테스트 실패:', error as Error);
    throw error;
  }
};
