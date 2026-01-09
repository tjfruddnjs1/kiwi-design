/**
 * Docker 서비스 운영 전용 훅
 * Container, Image, Volume, Network 등 Docker 리소스 운영 로직 제공
 * ImprovedOperateModal, DockerOperateModal에서 사용
 */

import { useState, useCallback } from 'react';
import { message, notification } from 'antd';
import type {
  DockerContainerInfo,
  DockerImageInfo,
  DockerVolumeInfo,
  DockerNetworkInfo,
} from '../types/operate-modal';
import { dockerApi } from '../lib/api/endpoints/docker';
import { useCredsStore } from '../stores/useCredsStore';

interface UseDockerServiceOperationsProps {
  infraId?: number;
  isDockerInfra: () => boolean;
}

interface UseDockerServiceOperationsReturn {
  // Docker Server 상태
  dockerServerId: number | null;
  setDockerServerId: React.Dispatch<React.SetStateAction<number | null>>;
  dockerServerHops: any[];
  setDockerServerHops: React.Dispatch<React.SetStateAction<any[]>>;
  dockerInfo: { version?: string; apiVersion?: string } | null;
  setDockerInfo: React.Dispatch<
    React.SetStateAction<{ version?: string; apiVersion?: string } | null>
  >;

  // Container 상태
  containers: DockerContainerInfo[];
  setContainers: React.Dispatch<React.SetStateAction<DockerContainerInfo[]>>;
  selectedContainer: string;
  setSelectedContainer: React.Dispatch<React.SetStateAction<string>>;
  loadingContainers: boolean;

  // Docker 리소스 상태
  dockerImages: DockerImageInfo[];
  setDockerImages: React.Dispatch<React.SetStateAction<DockerImageInfo[]>>;
  dockerVolumes: DockerVolumeInfo[];
  setDockerVolumes: React.Dispatch<React.SetStateAction<DockerVolumeInfo[]>>;
  dockerNetworks: DockerNetworkInfo[];
  setDockerNetworks: React.Dispatch<React.SetStateAction<DockerNetworkInfo[]>>;

  // 로딩 상태
  loadingLogs: boolean;
  setLoadingLogs: React.Dispatch<React.SetStateAction<boolean>>;

  // 로그 상태
  logs: string;
  setLogs: React.Dispatch<React.SetStateAction<string>>;

  // Docker 데이터 로드
  loadDockerContainerData: () => Promise<void>;

  // Docker 로그 조회
  handleGetDockerLogs: () => Promise<void>;

  // Docker 리소스 정리
  handleDockerPrune: (
    type: 'images' | 'containers' | 'volumes'
  ) => Promise<void>;
}

/**
 * Docker 서비스 운영 로직을 제공하는 훅
 *
 * @param infraId - 인프라 ID
 * @param isDockerInfra - Docker 인프라 타입 판별 함수
 * @returns Docker 서비스 운영 관련 상태 및 함수
 */
export const useDockerServiceOperations = ({
  infraId,
  isDockerInfra,
}: UseDockerServiceOperationsProps): UseDockerServiceOperationsReturn => {
  // ============================================================================
  // 상태 관리
  // ============================================================================

  // Docker Server 상태
  const [dockerServerId, setDockerServerId] = useState<number | null>(null);
  const [dockerServerHops, setDockerServerHops] = useState<any[]>([]);
  const [dockerInfo, setDockerInfo] = useState<{
    version?: string;
    apiVersion?: string;
  } | null>(null);

  // Container 상태
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [loadingContainers, setLoadingContainers] = useState(false);

  // Docker 리소스 상태
  const [dockerImages, setDockerImages] = useState<DockerImageInfo[]>([]);
  const [dockerVolumes, setDockerVolumes] = useState<DockerVolumeInfo[]>([]);
  const [dockerNetworks, setDockerNetworks] = useState<DockerNetworkInfo[]>([]);

  // 로딩 상태
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 로그 상태
  const [logs, setLogs] = useState<string>('');

  // ============================================================================
  // Docker 데이터 로드 함수
  // ============================================================================

  /**
   * Docker 컨테이너 및 리소스 데이터 로드
   */
  const loadDockerContainerData = useCallback(async () => {
    if (!infraId || !isDockerInfra()) return;

    try {
      setLoadingContainers(true);

      // 1. Docker 서버 정보 조회
      const serverResponse = await dockerApi.getServer(infraId);

      // Check if server exists in the response
      if (!serverResponse.success || !serverResponse.data?.server) {
        setContainers([]);
        return;
      }

      const dockerServer = serverResponse.data.server;
      const serverId = dockerServer.id;
      setDockerServerId(serverId);

      // 2. Docker 서버의 hops 정보 파싱
      let dockerHops: any[] = [];
      if (dockerServer.hops) {
        try {
          const hopsStr =
            typeof dockerServer.hops === 'string'
              ? dockerServer.hops
              : JSON.stringify(dockerServer.hops);
          dockerHops = JSON.parse(hopsStr);

          // 3. Credential store에서 password 가져오기 (infraId 포함하여 조회)
          const { serverlist } = useCredsStore.getState();
          dockerHops = dockerHops.map((hop: any) => {
            // credential store에서 해당 host의 credential 찾기
            // infraId가 일치하는 credential을 우선 검색
            let cred = serverlist.find(
              s =>
                s.host === hop.host &&
                (!hop.port ||
                  s.port === hop.port ||
                  s.port === Number(hop.port)) &&
                s.infraId === infraId
            );

            // infraId가 일치하는 credential이 없으면 infraId 없는 credential 검색 (하위 호환성)
            if (!cred) {
              cred = serverlist.find(
                s =>
                  s.host === hop.host &&
                  (!hop.port ||
                    s.port === hop.port ||
                    s.port === Number(hop.port)) &&
                  s.infraId === undefined
              );
            }

            if (cred && cred.password) {
              return {
                ...hop,
                password: cred.password,
              };
            } else {
              console.warn(
                `[loadDockerContainerData] No credential found for ${hop.host}:${hop.port} (infraId: ${infraId})`
              );
              return hop;
            }
          });

        } catch (error) {
          console.error(
            '[loadDockerContainerData] Failed to parse hops:',
            error
          );
        }
      }

      // Docker 서버 hops 저장 (로그 조회 등에서 사용)
      setDockerServerHops(dockerHops);

      // 3. 컨테이너 목록 조회 (SSH hops 정보 사용)
      const containersResponse = await dockerApi.getContainers(serverId, {
        hops: dockerHops,
      });

      if (containersResponse.success && containersResponse.data) {
        const data = containersResponse.data;

        // 컨테이너 목록 저장
        setContainers(data.containers || []);

        // Docker 리소스 정보도 함께 저장 (Backend가 이미 반환함)
        setDockerImages(data.images || []);
        setDockerVolumes(data.volumes || []);
        setDockerNetworks(data.networks || []);

      } else {
        setContainers([]);
        setDockerImages([]);
        setDockerVolumes([]);
        setDockerNetworks([]);
      }

      // Docker 버전 정보 조회 (별도 API 호출)
      try {
        const infoResponse = await dockerApi.getInfo(serverId, {
          hops: dockerHops,
        });

        if (infoResponse.success && infoResponse.data?.info) {
          setDockerInfo({
            version: infoResponse.data.info.version || 'N/A',
            apiVersion: infoResponse.data.info.apiVersion || 'N/A',
          });
        }
      } catch (infoError) {
        console.warn(
          '[loadDockerContainerData] Failed to load Docker info (non-critical):',
          infoError
        );
        // Docker 버전 정보 로딩 실패는 치명적이지 않으므로 무시
      }
    } catch (error: any) {
      console.error(
        '[loadDockerContainerData] Failed to load Docker containers:',
        error
      );
      console.error('[loadDockerContainerData] Error details:', {
        message: error?.message,
        response: error?.response,
        statusCode: error?.statusCode,
      });
      setContainers([]);
      // message.error 제거: 상위 컴포넌트에서 통합 처리
    } finally {
      setLoadingContainers(false);
    }
  }, [infraId, isDockerInfra]);

  // ============================================================================
  // Docker 로그 조회 함수
  // ============================================================================

  /**
   * Docker 컨테이너 로그 조회
   */
  const handleGetDockerLogs = useCallback(async () => {
    if (!dockerServerId || !selectedContainer) {
      message.warning('컨테이너를 선택해주세요.');
      return;
    }

    setLoadingLogs(true);
    setLogs('로그 조회 중...\n');

    try {
      // Docker 서버의 hops 사용
      const logsResult = await dockerApi.getLogs(
        dockerServerId,
        selectedContainer,
        { hops: dockerServerHops },
        100 // 최근 100줄
      );

      if (logsResult.data?.logs) {
        setLogs(logsResult.data.logs);
      } else {
        setLogs('로그가 없습니다.');
      }
    } catch (error: any) {
      console.error('[handleGetDockerLogs] 오류:', error);
      setLogs(`오류 발생: ${error.message || '알 수 없는 오류'}`);
      // message.error 제거: 로그 내용에 에러 표시됨
    } finally {
      setLoadingLogs(false);
    }
  }, [dockerServerId, selectedContainer, dockerServerHops]);

  // ============================================================================
  // Docker 리소스 정리 함수
  // ============================================================================

  /**
   * Docker 리소스 정리 (prune)
   */
  const handleDockerPrune = useCallback(
    async (type: 'all' | 'images' | 'containers' | 'volumes' | 'networks') => {
      if (!dockerServerHops || dockerServerHops.length === 0) {
        notification.error({ message: 'Docker 서버 정보가 없습니다.' });
        return;
      }

      const pruneLabels: Record<typeof type, string> = {
        all: '전체',
        images: '이미지',
        containers: '컨테이너',
        volumes: '볼륨',
        networks: '네트워크',
      };

      try {
        message.loading({
          content: `Docker ${pruneLabels[type]} 정리 중...`,
          key: 'docker-prune',
          duration: 0,
        });

        const pruneResult = await dockerApi.pruneResources(type, {
          hops: dockerServerHops,
        });

        if (pruneResult.success) {
          message.success({
            content: `Docker ${pruneLabels[type]} 정리가 완료되었습니다.`,
            key: 'docker-prune',
          });
          notification.success({
            message: `Docker ${pruneLabels[type]} 정리 완료`,
            description: pruneResult.data?.output || '리소스가 정리되었습니다.',
            duration: 5,
          });
        } else {
          message.error({
            content: `Docker ${pruneLabels[type]} 정리 실패`,
            key: 'docker-prune',
          });
          notification.error({
            message: `Docker ${pruneLabels[type]} 정리 실패`,
            description: pruneResult.error || '알 수 없는 오류',
          });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : '알 수 없는 오류';
        console.error(`[handleDockerPrune] Failed to prune ${type}:`, error);
        message.error({
          content: `Docker ${pruneLabels[type]} 정리 실패`,
          key: 'docker-prune',
        });
        notification.error({
          message: `Docker ${pruneLabels[type]} 정리 실패`,
          description: errorMessage,
        });
      }
    },
    [dockerServerHops]
  );

  // ============================================================================
  // 반환
  // ============================================================================

  return {
    // Docker Server 상태
    dockerServerId,
    setDockerServerId,
    dockerServerHops,
    setDockerServerHops,
    dockerInfo,
    setDockerInfo,

    // Container 상태
    containers,
    setContainers,
    selectedContainer,
    setSelectedContainer,
    loadingContainers,

    // Docker 리소스 상태
    dockerImages,
    setDockerImages,
    dockerVolumes,
    setDockerVolumes,
    dockerNetworks,
    setDockerNetworks,

    // 로딩 상태
    loadingLogs,
    setLoadingLogs,

    // 로그 상태
    logs,
    setLogs,

    // Docker 데이터 로드
    loadDockerContainerData,

    // Docker 로그 조회
    handleGetDockerLogs,

    // Docker 리소스 정리
    handleDockerPrune,
  };
};

export default useDockerServiceOperations;
