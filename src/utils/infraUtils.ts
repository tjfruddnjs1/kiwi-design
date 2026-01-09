/**
 * 인프라 타입 관련 유틸리티 함수
 */

/**
 * 인프라 타입에서 external_ 접두사를 제거하여 사용자에게 표시할 타입을 반환합니다.
 * @param infraType - 실제 인프라 타입 (예: 'external_kubernetes', 'kubernetes', 'docker')
 * @returns 사용자 표시용 인프라 타입 (예: 'kubernetes', 'docker')
 */
export function getDisplayInfraType(
  infraType: string | null | undefined
): string {
  if (!infraType) return '';

  // external_ 접두사 제거
  if (infraType.startsWith('external_')) {
    return infraType.substring(9); // 'external_'.length = 9
  }

  return infraType;
}

/**
 * 인프라 타입이 Kubernetes 계열인지 확인합니다.
 * @param infraType - 인프라 타입
 * @returns Kubernetes 계열이면 true
 */
export function isKubernetesType(
  infraType: string | null | undefined
): boolean {
  if (!infraType) return false;
  const normalizedType = infraType.toLowerCase();
  return (
    normalizedType === 'kubernetes' || normalizedType === 'external_kubernetes'
  );
}

/**
 * 인프라 타입이 Docker 계열인지 확인합니다.
 * @param infraType - 인프라 타입
 * @returns Docker 계열이면 true
 */
export function isDockerType(infraType: string | null | undefined): boolean {
  if (!infraType) return false;
  const normalizedType = infraType.toLowerCase();
  return normalizedType === 'docker' || normalizedType === 'external_docker';
}

/**
 * 인프라 타입이 Podman 계열인지 확인합니다.
 * @param infraType - 인프라 타입
 * @returns Podman 계열이면 true
 */
export function isPodmanType(infraType: string | null | undefined): boolean {
  if (!infraType) return false;
  const normalizedType = infraType.toLowerCase();
  return normalizedType === 'podman' || normalizedType === 'external_podman';
}

/**
 * 인프라 타입이 컨테이너 기반인지 확인합니다 (Docker 또는 Podman).
 * @param infraType - 인프라 타입
 * @returns 컨테이너 기반이면 true
 */
export function isContainerType(infraType: string | null | undefined): boolean {
  return isDockerType(infraType) || isPodmanType(infraType);
}

/**
 * 인프라 타입에 따른 표시 색상을 반환합니다.
 * @param infraType - 인프라 타입
 * @returns 색상 코드
 */
export function getInfraTypeColor(
  infraType: string | null | undefined
): string {
  if (!infraType) return '#666';

  const displayType = getDisplayInfraType(infraType).toLowerCase();

  const colorMap: Record<string, string> = {
    kubernetes: '#1890ff',
    docker: '#52c41a',
    podman: '#fa8c16',
    baremetal: '#8c8c8c',
    cloud: '#722ed1',
  };

  return colorMap[displayType] || '#666';
}
