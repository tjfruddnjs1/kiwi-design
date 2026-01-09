// 통합 API 인덱스
// 모든 API 엔드포인트와 클라이언트를 중앙에서 관리합니다

// ==================== 클라이언트 및 유틸리티 ====================
// 추가 엔드포인트들 (나중에 구현)
// export { default as serviceApi } from './endpoints/service';
// export { default as dockerApi } from './endpoints/docker';
// export { default as backupApi } from './endpoints/backup';
// export { default as projectApi } from './endpoints/project';
// export { default as userApi } from './endpoints/user';

// ==================== 통합 API 객체 ====================

import { default as auth } from './endpoints/auth';
import { default as infra } from './endpoints/infra';
import { default as kubernetes } from './endpoints/kubernetes';
import { default as service } from './endpoints/service';
import { default as docker } from './endpoints/docker';
import { default as backup } from './endpoints/backup';
import { default as project } from './endpoints/project';
import { default as user } from './endpoints/user';
import { awxApi } from './awx';
import clientInstance from './client';

export {
  default as apiClient,
  createApiClient,
  isApiError,
  isApiSuccess,
  ApiError,
} from './client';

// ==================== 타입 정의 ====================
export * from './types';
// 레거시 타입 호환성: 단일 SSH hop 타입을 AuthHops 이름으로 재수출
export type { SshHop as AuthHops } from './types';

// ==================== 엔드포인트별 API ====================
export { default as authApi } from './endpoints/auth';
export { default as infraApi } from './endpoints/infra';
export { default as kubernetesApi } from './endpoints/kubernetes';
export { default as serviceApi } from './endpoints/service';
export { default as dockerApi } from './endpoints/docker';
export { default as backupApi } from './endpoints/backup';
export { default as projectApi } from './endpoints/project';
export { default as userApi } from './endpoints/user';
export { awxApi } from './awx';

/**
 * 통합 API 객체
 * 모든 API 엔드포인트를 하나의 객체로 묶어서 제공합니다
 *
 * @example
 * ```typescript
 * import { api } from '@/lib/api';
 *
 * // 로그인
 * const response = await api.auth.login({ email, password });
 *
 * // 인프라 목록 조회
 * const infraList = await api.infra.list();
 *
 * // 쿠버네티스 노드 상태 조회
 * const nodeStatus = await api.kubernetes.getNodeStatus(params);
 * ```
 */
export const api = {
  // 엔드포인트별 API
  auth,
  infra,
  kubernetes,
  service,
  docker,
  backup,
  project,
  user,
  awx: awxApi,

  // 직접 클라이언트 접근 (고급 사용자용)
  client: clientInstance,

  // 헬스체크 및 공통 기능
  checkHealth: () => clientInstance.checkHealth(),

  // ==================== 임시 호환성 레이어 ====================
  // 기존 코드와의 호환성을 위해 일부 메서드를 직접 노출
  // TODO: 점진적으로 제거 예정

  /**
   * @deprecated 대신 api.client.get() 사용
   */
  get: clientInstance.get.bind(clientInstance),

  /**
   * @deprecated 대신 api.client.post() 사용
   */
  post: clientInstance.post.bind(clientInstance),

  /**
   * @deprecated 대신 api.client.put() 사용
   */
  put: clientInstance.put.bind(clientInstance),

  /**
   * @deprecated 대신 api.client.delete() 사용
   */
  delete: clientInstance.delete.bind(clientInstance),
} as const;

// ==================== 기본 내보내기 ====================

export default api;

// ==================== 레거시 호환성 ====================

/**
 * @deprecated 새로운 api 객체 사용 권장
 */
export const legacyApi = api;
