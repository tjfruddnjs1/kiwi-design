import { api } from './api';
import { InfraItem } from '../types/infra';
import {
  ServiceOperationStatus,
  DockerStatus,
  Server,
} from '../hooks/useServiceStatusCache';
import { logger } from '../utils/logger';

interface HopInfo {
  host: string;
  port: number;
}

interface AuthCredentials {
  username: string;
  password: string;
}

// 캐시 설정
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache = new Map<string, CacheItem<unknown>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5분

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);

      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// 전역 캐시 인스턴스
const cache = new Cache();

// 타입 정의 추가
interface KubernetesPodData {
  name: string;
  status: string;
  ready: string;
  restarts: number;
}

interface DockerContainerData {
  name: string;
  status: string;
  id: string;
  image: string;
  created: string;
  ports: string;
  size: string;
}

interface KubernetesResponseData {
  namespace: string;
  pods: KubernetesPodData[];
}

interface DockerResponseData {
  containers: DockerContainerData[];
}

export class InfrastructureService {
  /**
   * Parse hops string to extract host information
   */
  static parseHops(hopsString: string): HopInfo[] {
    try {
      const hopsData = JSON.parse(hopsString);

      return Array.isArray(hopsData) ? hopsData : [hopsData];
    } catch (error) {
      logger.error('Failed to parse hops:', error as Error);

      return [];
    }
  }

  /**
   * Fetch infrastructure information by ID with caching
   */
  static async fetchInfraInfo(infraId: number): Promise<InfraItem | null> {
    const cacheKey = `infra_${infraId}`;
    const cached = cache.get<InfraItem>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await api.kubernetes.request('getInfraById', {
        id: infraId,
      });

      if (response.data.success) {
        const infraData = response.data.data as InfraItem;

        cache.set(cacheKey, infraData, 10 * 60 * 1000); // 10분 캐시

        return infraData;
      }

      return null;
    } catch (error) {
      logger.error('Failed to fetch infrastructure info:', error as Error);
      throw new Error('인프라 정보 조회에 실패했습니다.');
    }
  }

  /**
   * Get server list for infrastructure with caching
   */
  static async getServerList(infraId: number): Promise<Server[]> {
    const cacheKey = `servers_${infraId}`;
    const cached = cache.get<Server[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await api.kubernetes.request('getServerList', {
        infra_id: infraId,
      });

      if (response.data.success) {
        const servers = response.data.data as Server[];

        cache.set(cacheKey, servers, 2 * 60 * 1000); // 2분 캐시

        return servers;
      }

      return [];
    } catch (error) {
      logger.error('Failed to get server list:', error as Error);

      return [];
    }
  }

  /**
   * Refresh Kubernetes pod status
   */
  static async refreshKubernetesPodStatus(
    serverId: number | string,
    infraId: number | string,
    hops: HopInfo[],
    auth: AuthCredentials,
    namespace: string
  ): Promise<ServiceOperationStatus> {
    try {
      const response = await api.kubernetes.request(
        'getNamespaceAndPodStatus',
        {
          id: Number(serverId),
          infra_id: Number(infraId),
          namespace,
          hops: hops.map(hop => ({
            host: hop.host,
            port: hop.port,
            username: auth.username,
            password: auth.password,
          })),
        }
      );

      if (!response.data.success) {
        throw new Error('Kubernetes 상태 조회 실패');
      }

      const data = response.data.data as KubernetesResponseData;
      const namespaceName = data.namespace || namespace;
      const pods = data.pods || [];

      return {
        namespace: {
          name: namespaceName,
          status: 'Running',
        },
        pods: pods.map((pod: KubernetesPodData) => ({
          name: pod.name || '',
          status: pod.status || 'Unknown',
          ready: pod.ready !== '0/0',
          restarts: pod.restarts || 0,
        })),
      };
    } catch (error) {
      logger.error('Failed to refresh Kubernetes pod status:', error as Error);

      return {
        namespace: {
          name: namespace,
          status: 'Error',
        },
        pods: [],
      };
    }
  }

  /**
   * Refresh Docker container status
   */
  static async refreshDockerContainerStatus(
    serverId: number,
    hops: HopInfo[],
    auth: AuthCredentials
  ): Promise<DockerStatus> {
    try {
      const response = await api.docker.request('getContainerStatus', {
        id: serverId,
        hops: hops.map(hop => ({
          host: hop.host,
          port: hop.port,
          username: auth.username,
          password: auth.password,
        })),
      });

      if (!response.data.success) {
        throw new Error('Docker 상태 조회 실패');
      }

      const data = response.data.data as DockerResponseData;
      const containers = data.containers || [];

      return {
        serverStatus: {
          installed: true,
          running: true,
        },
        lastChecked: new Date().toISOString(),
        namespace: {
          name: 'docker',
          status: 'Running',
        },
        pods: containers.map((container: DockerContainerData) => ({
          name: container.name || '',
          status: container.status || 'Unknown',
          ready: container.status === 'running',
          restarts: 0,
          id: container.id || '',
          image: container.image || '',
          created: container.created || '',
          ports: container.ports || '',
          size: container.size || '',
        })),
      };
    } catch (error) {
      logger.error(
        'Failed to refresh Docker container status:',
        error as Error
      );

      return {
        serverStatus: {
          installed: false,
          running: false,
        },
        lastChecked: new Date().toISOString(),
        namespace: {
          name: 'docker',
          status: 'Error',
        },
        pods: [],
      };
    }
  }

  /**
   * Get Kubernetes pod logs
   */
  static async getKubernetesPodLogs(
    serverId: number,
    podName: string,
    namespace: string,
    hops: HopInfo[],
    auth: AuthCredentials
  ): Promise<string> {
    try {
      const response = await api.kubernetes.request('getPodLogs', {
        id: serverId,
        namespace,
        pod_name: podName,
        lines: 100,
        hops: hops.map(hop => ({
          host: hop.host,
          port: hop.port,
          username: auth.username,
          password: auth.password,
        })),
      });

      if (!response.data.success) {
        throw new Error('Pod 로그 조회 실패');
      }

      const data = response.data.data as { logs?: string };

      return data.logs || '';
    } catch (error) {
      logger.error('Failed to get Kubernetes pod logs:', error as Error);
      throw new Error('Pod 로그 조회에 실패했습니다.');
    }
  }

  /**
   * Get Docker container logs
   */
  static async getDockerContainerLogs(
    serverId: number,
    containerName: string,
    hops: HopInfo[],
    auth: AuthCredentials
  ): Promise<string> {
    try {
      const response = await api.docker.request('getDockerLogs', {
        id: serverId,
        container_name: containerName,
        hops: hops.map(hop => ({
          host: hop.host,
          port: hop.port,
          username: auth.username,
          password: auth.password,
        })),
      });

      if (!response.data.success) {
        throw new Error('Container 로그 조회 실패');
      }

      const data = response.data.data as { logs?: string };

      return data.logs || '';
    } catch (error) {
      logger.error('Failed to get Docker container logs:', error as Error);
      throw new Error('Container 로그 조회에 실패했습니다.');
    }
  }

  /**
   * Clear cache for specific infrastructure
   */
  static clearInfraCache(infraId: number): void {
    cache.delete(`infra_${infraId}`);
    cache.delete(`servers_${infraId}`);
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    cache.clear();
  }
}
