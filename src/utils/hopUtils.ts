interface HopConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface FormHopData {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Build hop configuration from form values
 */
export const buildHopConfig = (
  hopValues: FormHopData[],
  defaultUsername?: string,
  defaultPassword?: string
): HopConfig[] => {
  return hopValues.map(hop => ({
    host: hop.host,
    port: hop.port || 22,
    username: hop.username || defaultUsername || '',
    password: hop.password || defaultPassword || '',
  }));
};

/**
 * Validate hop configuration
 */
export const validateHopConfig = (hops: FormHopData[]): string[] => {
  const errors: string[] = [];

  if (!hops || hops.length === 0) {
    errors.push('최소 하나의 호스트 정보가 필요합니다.');

    return errors;
  }

  hops.forEach((hop, index) => {
    if (!hop.host || hop.host.trim() === '') {
      errors.push(`${index + 1}번째 호스트의 IP/도메인이 필요합니다.`);
    }

    if (!hop.port || hop.port < 1 || hop.port > 65535) {
      errors.push(`${index + 1}번째 호스트의 포트가 유효하지 않습니다.`);
    }

    if (!hop.username || hop.username.trim() === '') {
      errors.push(`${index + 1}번째 호스트의 사용자명이 필요합니다.`);
    }

    if (!hop.password || hop.password.trim() === '') {
      errors.push(`${index + 1}번째 호스트의 비밀번호가 필요합니다.`);
    }
  });

  return errors;
};

/**
 * Get infrastructure type display name
 *  external_ 접두사를 제거하여 사용자에게 표시
 */
export const getInfraTypeDisplayName = (type: string): string => {
  if (!type) return '';

  // external_ 접두사 제거
  const displayType = type.startsWith('external_') ? type.substring(9) : type;

  switch (displayType.toLowerCase()) {
    case 'kubernetes':
      return 'Kubernetes';
    case 'docker':
      return 'Docker';
    case 'podman':
      return 'Podman';
    case 'baremetal':
      return 'Baremetal';
    case 'cloud':
      return 'Cloud';
    default:
      // 첫 글자를 대문자로 변환
      return (
        displayType.charAt(0).toUpperCase() + displayType.slice(1).toLowerCase()
      );
  }
};

/**
 * Get status color for infrastructure
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
    case 'running':
      return 'success';
    case 'inactive':
    case 'stopped':
      return 'default';
    case 'error':
    case 'failed':
      return 'error';
    case 'checking':
    case 'pending':
      return 'processing';
    default:
      return 'default';
  }
};

/**
 * Get status text for infrastructure
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'active':
      return '활성';
    case 'inactive':
      return '비활성';
    case 'running':
      return '실행 중';
    case 'stopped':
      return '중지됨';
    case 'error':
      return '오류';
    case 'failed':
      return '실패';
    case 'checking':
      return '확인 중';
    case 'pending':
      return '대기 중';
    default:
      return status;
  }
};
