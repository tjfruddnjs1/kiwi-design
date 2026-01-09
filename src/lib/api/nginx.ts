import { api } from '../../services/api';
import { logger } from '../../utils/logger';
import type { SshHop } from './types';

// Nginx 컨테이너 상태 타입
export interface NginxContainerStatus {
  name: string;
  status: string;
  ports: string;
  running: boolean;
}

// Nginx 설정 파일 정보 타입
export interface NginxConfig {
  filename: string;
  size: string;
  modified: string;
  path: string;
}

// Nginx 설정 생성 파라미터
export interface CreateNginxConfigParams {
  domain: string;
  backend_host: string;
  backend_port: number;
  ssl?: boolean;
  cert_path?: string;
  key_path?: string;
}

// Nginx 컨테이너 생성 파라미터
export interface CreateNginxContainerParams {
  container_name?: string;
  http_port?: number;
  https_port?: number;
  infra_id: number;
  hops: SshHop[];
}

// Nginx 컨테이너 상태 확인
export const checkNginxContainer = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{
      container: NginxContainerStatus;
    }>('checkNginxContainer', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 컨테이너 상태 확인 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 컨테이너 상태 확인 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 컨테이너 생성
export const createNginxContainer = async (
  params: CreateNginxContainerParams
) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'createNginxContainer',
      { ...params }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 컨테이너 생성 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 컨테이너 생성 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 컨테이너 시작
export const startNginxContainer = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'startNginxContainer',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 컨테이너 시작 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 컨테이너 시작 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 컨테이너 중지
export const stopNginxContainer = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'stopNginxContainer',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 컨테이너 중지 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 컨테이너 중지 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 컨테이너 재시작
export const restartNginxContainer = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'restartNginxContainer',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 컨테이너 재시작 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 컨테이너 재시작 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 컨테이너 제거
export const removeNginxContainer = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'removeNginxContainer',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 컨테이너 제거 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 컨테이너 제거 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 파일 목록 조회
export const listNginxConfigs = async (params: {
  infra_id: number;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ configs: NginxConfig[] }>(
      'listNginxConfigs',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 파일 목록 조회 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 파일 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 파일 생성
export const createNginxConfig = async (params: {
  infra_id: number;
  hops: SshHop[];
  config: CreateNginxConfigParams;
}) => {
  try {
    //  백엔드 API 파라미터 명으로 변환
    const response = await api.nginx.request<{ message: string }>(
      'createNginxConfig',
      {
        infra_id: params.infra_id,
        hops: params.hops,
        domain: params.config.domain,
        upstream_host: params.config.backend_host, // backend_host → upstream_host
        upstream_port: params.config.backend_port, // backend_port → upstream_port
        enable_ssl: params.config.ssl ?? false, // ssl → enable_ssl
        cert_path: params.config.cert_path,
        key_path: params.config.key_path,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 파일 생성 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 파일 생성 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 파일 업데이트
export const updateNginxConfig = async (params: {
  infra_id: number;
  hops: SshHop[];
  config: CreateNginxConfigParams;
}) => {
  try {
    //  백엔드 API 파라미터 명으로 변환
    const response = await api.nginx.request<{ message: string }>(
      'updateNginxConfig',
      {
        infra_id: params.infra_id,
        hops: params.hops,
        domain: params.config.domain,
        upstream_host: params.config.backend_host, // backend_host → upstream_host
        upstream_port: params.config.backend_port, // backend_port → upstream_port
        enable_ssl: params.config.ssl ?? false, // ssl → enable_ssl
        cert_path: params.config.cert_path,
        key_path: params.config.key_path,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 파일 업데이트 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 파일 업데이트 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 파일 삭제
export const deleteNginxConfig = async (params: {
  infra_id: number;
  domain: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'deleteNginxConfig',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 파일 삭제 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 파일 삭제 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 리로드
export const reloadNginx = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'reloadNginx',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 리로드 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 리로드 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 테스트
export const testNginxConfig = async (params: {
  infra_id: number;
  container_name?: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{
      test_passed: boolean;
      output: string;
    }>('testNginxConfig', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 테스트 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 테스트 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 파일 내용 조회
export const getNginxConfigContent = async (params: {
  infra_id: number;
  domain: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{
      domain: string;
      content: string;
      path: string;
    }>('getNginxConfigContent', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 파일 조회 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 파일 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// Nginx 설정 파일 내용 수정
export const updateNginxConfigContent = async (params: {
  infra_id: number;
  domain: string;
  content: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{
      domain: string;
      path: string;
    }>('updateNginxConfigContent', params);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Nginx 설정 파일 수정 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('Nginx 설정 파일 수정 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// ========== 외부 Nginx 서버 연동 (K8s용) ==========

// 외부 Nginx 서버 정보 타입
export interface ExternalNginxServer {
  nginx_host: string;
  nginx_port: number;
  nginx_username: string;
  nginx_password: string;
  [key: string]: string | number | boolean | undefined; // Index signature for Record<string, unknown> compatibility
}

// 외부 Nginx 연결 상태 타입
export interface ExternalNginxConnectionStatus {
  connected: boolean;
  nginx_version: string;
  nginx_status: string;
  conf_dir_exists: boolean;
  server: {
    host: string;
    port: number;
  };
}

// 외부 Nginx 서버 연결 테스트 (Multi-hop 지원)
export const externalNginxConnect = async (
  params: ExternalNginxServer | { hops: SshHop[] }
) => {
  try {
    const response = await api.nginx.request<ExternalNginxConnectionStatus>(
      'externalNginxConnect',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '외부 Nginx 서버 연결 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('외부 Nginx 서버 연결 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 외부 Nginx 설정 파일 목록 조회 (Multi-hop 지원)
export const externalNginxListConfigs = async (
  params: ExternalNginxServer | { hops: SshHop[] }
) => {
  try {
    const response = await api.nginx.request<{
      configs: NginxConfig[];
      count: number;
    }>('externalNginxListConfigs', params);

    if (!response.data.success) {
      throw new Error(
        response.data.error || '외부 Nginx 설정 파일 목록 조회 실패'
      );
    }

    return response.data;
  } catch (error) {
    logger.error('외부 Nginx 설정 파일 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 외부 Nginx 설정 파일 생성 파라미터
export interface ExternalNginxCreateConfigParams extends ExternalNginxServer {
  domain: string;
  upstream_host: string;
  upstream_port: number;
  enable_ssl?: boolean;
  config_path?: string;
}

// 외부 Nginx 설정 파일 생성 (Multi-hop 지원)
export const externalNginxCreateConfig = async (
  params:
    | ExternalNginxCreateConfigParams
    | (Omit<ExternalNginxCreateConfigParams, keyof ExternalNginxServer> & {
        hops: SshHop[];
      })
) => {
  try {
    const response = await api.nginx.request<{
      domain: string;
      config_file: string;
      upstream_host: string;
      upstream_port: number;
    }>('externalNginxCreateConfig', params);

    if (!response.data.success) {
      throw new Error(response.data.error || '외부 Nginx 설정 파일 생성 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('외부 Nginx 설정 파일 생성 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 외부 Nginx 설정 파일 삭제 (Multi-hop 지원)
export const externalNginxDeleteConfig = async (
  params:
    | (ExternalNginxServer & { domain: string; config_path?: string })
    | { domain: string; config_path?: string; hops: SshHop[] }
) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'externalNginxDeleteConfig',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '외부 Nginx 설정 파일 삭제 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('외부 Nginx 설정 파일 삭제 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 외부 Nginx 리로드 (Multi-hop 지원)
export const externalNginxReload = async (
  params: ExternalNginxServer | { hops: SshHop[] }
) => {
  try {
    const response = await api.nginx.request<{ output: string }>(
      'externalNginxReload',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '외부 Nginx 리로드 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('외부 Nginx 리로드 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 외부 Nginx 설정 테스트 (Multi-hop 지원)
export const externalNginxTest = async (
  params: ExternalNginxServer | { hops: SshHop[] }
) => {
  try {
    const response = await api.nginx.request<{
      test_passed: boolean;
      output: string;
    }>('externalNginxTest', params);

    if (!response.data.success) {
      throw new Error(response.data.error || '외부 Nginx 설정 테스트 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('외부 Nginx 설정 테스트 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// ========== TLS/SSL 인증서 관리 ==========

// 인증서 정보 타입
export interface CertificateInfo {
  filename: string;
  domain: string;
  type: 'cert' | 'key';
  size: string;
  modified: string;
  path: string;
  expiry_date?: string;
  issuer?: string;
  subject?: string;
}

// 인증서 유효성 검증 결과 타입
export interface CertificateValidation {
  domain: string;
  valid: boolean;
  cert_exists: boolean;
  key_exists: boolean;
  key_matches: boolean;
  cert_path: string;
  key_path: string;
  expiry_date?: string;
  issuer?: string;
  subject?: string;
  // 도메인 연결 정보
  config_exists?: boolean;
  ssl_enabled?: boolean;
  domain_status?: string;
  config_files?: string[];
  connected_domains?: string[];
}

// 인증서 업로드 파라미터
export interface UploadCertificateParams {
  infra_id: number;
  domain: string;
  cert_content: string;
  key_content: string;
  hops: SshHop[];
}

// 인증서 업로드
export const uploadCertificate = async (params: UploadCertificateParams) => {
  try {
    const response = await api.nginx.request<{
      domain: string;
      cert_path: string;
      key_path: string;
      validation: string;
    }>('uploadCertificate', params as unknown as Record<string, unknown>);

    if (!response.data.success) {
      throw new Error(response.data.error || '인증서 업로드 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('인증서 업로드 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 인증서 목록 조회
export const listCertificates = async (params: {
  infra_id: number;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{
      certificates: CertificateInfo[];
      domains: Record<string, Record<string, CertificateInfo>>;
      count: number;
      ssl_directory: string;
    }>('listCertificates', params);

    if (!response.data.success) {
      throw new Error(response.data.error || '인증서 목록 조회 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('인증서 목록 조회 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 인증서 삭제
export const deleteCertificate = async (params: {
  infra_id: number;
  domain: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<{ message: string }>(
      'deleteCertificate',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '인증서 삭제 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('인증서 삭제 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};

// 인증서 유효성 검증
export const validateCertificate = async (params: {
  infra_id: number;
  domain: string;
  hops: SshHop[];
}) => {
  try {
    const response = await api.nginx.request<CertificateValidation>(
      'validateCertificate',
      params
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '인증서 검증 실패');
    }

    return response.data;
  } catch (error) {
    logger.error('인증서 검증 실패', undefined, {
      error: String(error),
    });
    throw error;
  }
};
