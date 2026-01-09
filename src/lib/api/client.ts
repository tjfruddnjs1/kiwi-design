// 통합 API 클라이언트 - Mock Version
// kiwi-design 프로젝트용 Mock API 클라이언트
// 실제 백엔드 없이 Mock 데이터로 동작

// Mock API 클라이언트 재내보내기
export {
  MockApiClient as UnifiedApiClient,
  MockApiError as ApiError,
  apiClient,
  awxApiClient,
  trivyApiClient,
  createApiClient,
  isApiError,
  isApiSuccess,
} from '../../mocks/api/mockClient';

export { default } from '../../mocks/api/mockClient';