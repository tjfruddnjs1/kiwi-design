/**
 * Status Helper Utilities
 * 상태 색상 및 텍스트 매핑을 위한 중앙화된 유틸리티
 */

export enum StatusType {
  INFRASTRUCTURE = 'infrastructure',
  SERVICE = 'service',
  DOCKER = 'docker',
  PIPELINE = 'pipeline',
  POD = 'pod',
  NODE = 'node',
  BACKUP = 'backup',
}

/**
 * 상태에 따른 Ant Design 색상 태그 반환
 * @param status 상태 문자열
 * @param type 상태 타입 (옵션)
 * @returns Ant Design Tag color
 */
export function getStatusColor(
  status: string,
  type: StatusType = StatusType.INFRASTRUCTURE
): string {
  if (!status) return 'default';

  const normalizedStatus = status.toLowerCase();

  // 공통 성공 상태
  if (
    ['active', 'running', 'success', 'completed', 'healthy', 'ready'].includes(
      normalizedStatus
    )
  ) {
    return 'success';
  }

  // 공통 에러 상태
  if (
    [
      'error',
      'failed',
      'stopped',
      'exited',
      'offline',
      'unhealthy',
      'notready',
    ].includes(normalizedStatus)
  ) {
    return 'error';
  }

  // 공통 진행 중 상태
  if (
    [
      'checking',
      'pending',
      'deploying',
      'installing',
      'building',
      'preparing',
      'creating',
      'processing',
    ].includes(normalizedStatus)
  ) {
    return 'processing';
  }

  // 공통 경고 상태
  if (
    ['inactive', 'warning', 'paused', 'scheduled'].includes(normalizedStatus)
  ) {
    return 'warning';
  }

  // 타입별 특수 처리
  switch (type) {
    case StatusType.DOCKER:
      if (normalizedStatus === 'uninstalled') return 'error';
      if (normalizedStatus === 'unknown') return 'default';
      break;
    case StatusType.BACKUP:
      if (normalizedStatus === 'partiallyfailed') return 'warning';
      if (normalizedStatus === 'deleting') return 'processing';
      break;
    case StatusType.POD:
      if (normalizedStatus === 'crashloopbackoff') return 'error';
      if (normalizedStatus === 'imagepullbackoff') return 'error';
      break;
  }

  return 'default';
}

/**
 * 상태 텍스트 한글 변환
 * @param status 상태 문자열
 * @param locale 로케일 (기본값: 'ko')
 * @returns 번역된 상태 텍스트
 */
export function getStatusText(
  status: string,
  locale: 'ko' | 'en' = 'ko'
): string {
  if (!status) return '';

  const statusMap: Record<string, { ko: string; en: string }> = {
    active: { ko: '활성', en: 'Active' },
    inactive: { ko: '비활성', en: 'Inactive' },
    running: { ko: '실행 중', en: 'Running' },
    stopped: { ko: '중지됨', en: 'Stopped' },
    error: { ko: '오류', en: 'Error' },
    failed: { ko: '실패', en: 'Failed' },
    checking: { ko: '확인 중', en: 'Checking' },
    pending: { ko: '대기 중', en: 'Pending' },
    deploying: { ko: '배포 중', en: 'Deploying' },
    success: { ko: '성공', en: 'Success' },
    completed: { ko: '완료', en: 'Completed' },
    installing: { ko: '설치 중', en: 'Installing' },
    building: { ko: '빌드 중', en: 'Building' },
    healthy: { ko: '정상', en: 'Healthy' },
    unhealthy: { ko: '비정상', en: 'Unhealthy' },
    ready: { ko: '준비됨', en: 'Ready' },
    notready: { ko: '준비 안됨', en: 'Not Ready' },
    offline: { ko: '오프라인', en: 'Offline' },
    unknown: { ko: '알 수 없음', en: 'Unknown' },
    creating: { ko: '생성 중', en: 'Creating' },
    deleting: { ko: '삭제 중', en: 'Deleting' },
    paused: { ko: '일시정지', en: 'Paused' },
    scheduled: { ko: '예약됨', en: 'Scheduled' },
  };

  const normalizedStatus = status.toLowerCase();
  return statusMap[normalizedStatus]?.[locale] || status;
}

/**
 * 상태가 정상 상태인지 확인
 * @param status 상태 문자열
 * @returns 정상 상태 여부
 */
export function isHealthyStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase();
  return [
    'active',
    'running',
    'success',
    'completed',
    'healthy',
    'ready',
  ].includes(normalizedStatus);
}

/**
 * 상태가 에러 상태인지 확인
 * @param status 상태 문자열
 * @returns 에러 상태 여부
 */
export function isErrorStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase();
  return [
    'error',
    'failed',
    'stopped',
    'exited',
    'offline',
    'unhealthy',
    'notready',
    'crashloopbackoff',
    'imagepullbackoff',
  ].includes(normalizedStatus);
}

/**
 * 상태가 진행 중 상태인지 확인
 * @param status 상태 문자열
 * @returns 진행 중 상태 여부
 */
export function isProcessingStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase();
  return [
    'checking',
    'pending',
    'deploying',
    'installing',
    'building',
    'preparing',
    'creating',
    'processing',
  ].includes(normalizedStatus);
}
