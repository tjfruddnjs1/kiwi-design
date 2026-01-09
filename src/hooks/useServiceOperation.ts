/**
 * 서비스 운영 공통 로직 훅
 * ImprovedOperateModal, KubernetesOperateModal, DockerOperateModal에서 공통으로 사용
 */

import { useCallback, useMemo } from 'react';
import type { Service } from '../types';
import type { SshHop } from '../lib/api/types';

interface UseServiceOperationProps {
  service?: Service | null;
  serverHops?: string;
  infraId?: number;
}

interface UseServiceOperationReturn {
  // SSH Hops 관련
  parseHops: () => SshHop[];
  hops: SshHop[];

  // 인프라 타입 판별
  isKubernetesInfra: () => boolean;
  isDockerInfra: () => boolean;
  isPodmanInfra: () => boolean;
  isContainerInfra: () => boolean;

  // 서비스 정보
  hasValidService: boolean;
  hasValidInfra: boolean;
  namespace: string;
}

/**
 * 서비스 운영 공통 로직을 제공하는 훅
 *
 * @param service - 서비스 정보
 * @param serverHops - SSH Hops 정보 (JSON 문자열 또는 객체)
 * @param infraId - 인프라 ID
 * @returns 공통 운영 로직 함수 및 상태
 */
export const useServiceOperation = ({
  service,
  serverHops,
  infraId,
}: UseServiceOperationProps): UseServiceOperationReturn => {
  /**
   * SSH Hops 파싱
   * serverHops가 JSON 문자열인 경우 파싱하여 배열로 변환
   */
  const parseHops = useCallback((): SshHop[] => {
    if (!serverHops) return [];
    try {
      const parsed =
        typeof serverHops === 'string' ? JSON.parse(serverHops) : serverHops;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // JSON parsing failed - return empty array
      return [];
    }
  }, [serverHops]);

  /**
   * 파싱된 hops를 메모이제이션
   */
  const hops = useMemo(() => parseHops(), [parseHops]);

  /**
   * Kubernetes 인프라 타입 판별
   */
  const isKubernetesInfra = useCallback((): boolean => {
    const infraType = service?.infraType?.toLowerCase();
    return infraType === 'kubernetes' || infraType === 'external_kubernetes';
  }, [service?.infraType]);

  /**
   * Docker 인프라 타입 판별
   */
  const isDockerInfra = useCallback((): boolean => {
    const infraType = service?.infraType?.toLowerCase();
    return infraType === 'docker' || infraType === 'external_docker';
  }, [service?.infraType]);

  /**
   * Podman 인프라 타입 판별
   */
  const isPodmanInfra = useCallback((): boolean => {
    const infraType = service?.infraType?.toLowerCase();
    return infraType === 'podman' || infraType === 'external_podman';
  }, [service?.infraType]);

  /**
   * 컨테이너 인프라 타입 판별 (Docker 또는 Podman)
   */
  const isContainerInfra = useCallback((): boolean => {
    return isDockerInfra() || isPodmanInfra();
  }, [isDockerInfra, isPodmanInfra]);

  /**
   * 유효한 서비스 정보 존재 여부
   */
  const hasValidService = useMemo(() => {
    return !!(service && service.id);
  }, [service]);

  /**
   * 유효한 인프라 정보 존재 여부
   */
  const hasValidInfra = useMemo(() => {
    return !!(infraId && infraId > 0);
  }, [infraId]);

  /**
   * 네임스페이스 (Kubernetes 전용)
   */
  const namespace = useMemo(() => {
    return service?.namespace || 'default';
  }, [service?.namespace]);

  return {
    // SSH Hops
    parseHops,
    hops,

    // 인프라 타입 판별
    isKubernetesInfra,
    isDockerInfra,
    isPodmanInfra,
    isContainerInfra,

    // 서비스 정보
    hasValidService,
    hasValidInfra,
    namespace,
  };
};

export default useServiceOperation;
