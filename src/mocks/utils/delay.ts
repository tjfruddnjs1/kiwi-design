/**
 * Mock Utilities
 * API 응답 지연 시뮬레이션 및 유틸리티 함수
 */

/**
 * API 응답 지연을 시뮬레이션
 * @param ms - 지연 시간 (밀리초)
 */
export const delay = (ms: number = 300): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 랜덤 지연 시뮬레이션 (min ~ max ms 사이)
 */
export const randomDelay = (min: number = 100, max: number = 500): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
};

/**
 * 표준 API 응답 형식 생성
 */
export function createApiResponse<T>(data: T, success: boolean = true, message?: string) {
  return {
    success,
    data,
    message,
    error: success ? undefined : message,
  };
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(error: string, statusCode: number = 500) {
  return {
    success: false,
    error,
    message: error,
    statusCode,
  };
}

/**
 * 페이지네이션 응답 생성
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
) {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    success: true,
    data: paginatedItems,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Mock 데이터 로컬 스토리지 관리
 */
export const mockStorage = {
  getItem: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(`mock_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  setItem: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`mock_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(`mock_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith('mock_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

/**
 * 현재 Mock 사용자 정보 가져오기
 */
export const getCurrentMockUser = () => {
  return mockStorage.getItem('currentUser', null);
};

/**
 * Mock 사용자 설정하기
 */
export const setCurrentMockUser = (user: unknown) => {
  mockStorage.setItem('currentUser', user);
};

/**
 * Mock 사용자 로그아웃
 */
export const clearCurrentMockUser = () => {
  mockStorage.removeItem('currentUser');
};