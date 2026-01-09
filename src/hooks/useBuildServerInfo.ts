/**
 * 배포를 위한 빌드 서버 정보를 관리하는 커스텀 훅
 * 배포 시 사용할 서버, 인프라, 레지스트리 정보를 조회합니다.
 */
import { useState, useCallback } from 'react';
import { buildApi } from '../lib/api/build';
import { serviceApi } from '../lib/api/service';
import { getServers } from '../lib/api/infra';
import { useCredsStore } from '../stores/useCredsStore';
import type { BuildStatistics } from '../types/build';

// =========================================
// 타입 정의
// =========================================

/** 배포 서버 정보 */
export interface DeployServerInfo {
  serverId: number;
  infraId: number;
  hops: unknown[];
  registryUrl?: string;
  registryUsername?: string;
  registryPassword?: string;
  buildStats?: BuildStatistics;
}

/** 훅 반환 타입 */
export interface UseBuildServerInfoReturn {
  /** 서버 정보 */
  serverInfo: DeployServerInfo | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 서버 정보 조회 */
  loadServerInfo: (serviceId: number) => Promise<DeployServerInfo | null>;
  /** 상태 초기화 */
  reset: () => void;
}

// =========================================
// 서버 선택 우선순위 정의
// =========================================

type ServerType = {
  id: number | string;
  type?: string;
  join_command?: string;
  certificate_key?: string;
  server_name?: string;
  hops?: string | unknown[];
};

/**
 * 배포 서버를 선택합니다.
 * 우선순위: HA Master > 일반 Master > Docker > Podman > External K8s > 첫 번째 서버
 */
function selectDeployServer(servers: ServerType[]): ServerType | null {
  if (!servers || servers.length === 0) return null;

  const mainMaster = servers.find(
    s => s.type?.includes('master') && s.join_command && s.certificate_key
  );
  const anyMaster = servers.find(s => s.type?.includes('master'));
  const dockerServer = servers.find(s => s.type?.includes('docker'));
  const podmanServer = servers.find(s => s.type?.includes('podman'));
  const externalKubernetesServer = servers.find(s =>
    s.type?.includes('external_kubernetes')
  );

  return (
    mainMaster ||
    anyMaster ||
    dockerServer ||
    podmanServer ||
    externalKubernetesServer ||
    servers[0]
  );
}

/**
 * 서버의 hops 정보를 파싱합니다.
 */
function parseHops(
  hops: string | unknown[] | undefined
): Record<string, unknown>[] {
  if (!hops) return [];
  if (typeof hops === 'string') {
    try {
      return JSON.parse(hops);
    } catch {
      // JSON parsing failed - return empty array
      return [];
    }
  }
  return Array.isArray(hops) ? (hops as Record<string, unknown>[]) : [];
}

// =========================================
// 훅 구현
// =========================================

/**
 * 배포를 위한 빌드 서버 정보를 관리하는 훅
 */
export function useBuildServerInfo(): UseBuildServerInfoReturn {
  const [serverInfo, setServerInfo] = useState<DeployServerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { imageRegistry } = useCredsStore();

  const loadServerInfo = useCallback(
    async (serviceId: number): Promise<DeployServerInfo | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 빌드 통계에서 Registry 정보 가져오기
        const buildStats = await buildApi.getBuildStatistics(serviceId);

        // 2. 서비스 정보에서 배포 대상 인프라 ID 가져오기
        const service = await serviceApi.getService(serviceId);
        const deployInfraId = (service as { infra_id?: number }).infra_id;

        if (!deployInfraId) {
          const errMsg = '서비스에 배포 인프라가 설정되지 않았습니다';
          console.error(`[useBuildServerInfo] ${errMsg}`);
          setError(errMsg);
          setIsLoading(false);
          return null;
        }

        // 3. 배포 대상 인프라의 서버 목록 조회
        const servers = await getServers(deployInfraId);

        if (!servers || servers.length === 0) {
          const errMsg = `인프라 ID ${deployInfraId}에서 서버를 찾을 수 없습니다`;
          console.error(`[useBuildServerInfo] ${errMsg}`);
          setError(errMsg);
          setIsLoading(false);
          return null;
        }

        // 4. 배포 서버 선택
        const deployServer = selectDeployServer(servers);

        if (!deployServer) {
          const errMsg = '배포 서버를 선택할 수 없습니다';
          console.error(`[useBuildServerInfo] ${errMsg}`);
          setError(errMsg);
          setIsLoading(false);
          return null;
        }

        // 5. hops 정보 파싱
        const hops = parseHops(deployServer.hops);

        // 6. Container Registry 정보 추출
        const registryUrl =
          buildStats?.build_environment?.docker_registry || '';

        // 7. 레지스트리 인증 정보 조회
        let registryUsername = '';
        let registryPassword = '';

        if (registryUrl && imageRegistry) {
          const registryCred = imageRegistry.find(
            r =>
              registryUrl.includes(r.registryUrl) ||
              r.registryUrl.includes(registryUrl)
          );

          if (registryCred) {
            registryUsername = registryCred.userId || '';
            registryPassword = registryCred.password || '';
          }
        }

        // 8. 서버 ID 정규화
        const serverId =
          typeof deployServer.id === 'string'
            ? parseInt(deployServer.id, 10)
            : deployServer.id;

        const result: DeployServerInfo = {
          serverId,
          infraId: deployInfraId,
          hops,
          registryUrl,
          registryUsername,
          registryPassword,
          buildStats,
        };

        setServerInfo(result);
        setIsLoading(false);
        return result;
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : '서버 정보 조회 실패';
        console.error('[useBuildServerInfo] Error:', err);
        setError(errMsg);
        setIsLoading(false);
        return null;
      }
    },
    [imageRegistry]
  );

  const reset = useCallback(() => {
    setServerInfo(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    serverInfo,
    isLoading,
    error,
    loadServerInfo,
    reset,
  };
}

export default useBuildServerInfo;
