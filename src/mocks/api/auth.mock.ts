/**
 * Mock Auth API Handler
 */

import { createApiResponse, createErrorResponse } from '../utils/delay';
import { mockUsers, type MockUser } from '../data/users';

// 현재 로그인된 사용자 (로컬 스토리지에서 관리)
const getCurrentUser = (): MockUser | null => {
  try {
    const stored = localStorage.getItem('mockUser');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const mockAuthApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'login': {
        const email = params?.email as string;
        const user = mockUsers.find((u) => u.email === email);

        if (user) {
          const token = `mock-jwt-token-${user.id}-${Date.now()}`;
          localStorage.setItem('mockUser', JSON.stringify(user));
          localStorage.setItem('authToken', token);

          return createApiResponse({
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              permissions: user.permissions,
              organization_id: user.organization_id,
              organization_name: user.organization_name,
              awx_inventory: user.awx_inventory,
              awx_template: user.awx_template,
            },
          });
        }

        return createErrorResponse('사용자를 찾을 수 없습니다.', 401);
      }

      case 'logout': {
        localStorage.removeItem('mockUser');
        localStorage.removeItem('authToken');
        return createApiResponse({ success: true }, true, '로그아웃되었습니다.');
      }

      case 'refresh': {
        const user = getCurrentUser();
        if (user) {
          const newToken = `mock-jwt-token-${user.id}-${Date.now()}`;
          localStorage.setItem('authToken', newToken);
          return createApiResponse({ token: newToken });
        }
        return createErrorResponse('인증이 필요합니다.', 401);
      }

      case 'check': {
        const user = getCurrentUser();
        if (user) {
          return createApiResponse({ valid: true, user });
        }
        return createErrorResponse('유효하지 않은 토큰입니다.', 401);
      }

      case 'me': {
        const user = getCurrentUser();
        if (user) {
          return createApiResponse({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            organization_id: user.organization_id,
            organization_name: user.organization_name,
          });
        }
        return createErrorResponse('인증이 필요합니다.', 401);
      }

      case 'signup': {
        // Demo 모드에서는 실제 가입 불가
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 회원가입이 불가능합니다.'
        );
      }

      default:
        console.info(`[Mock Auth API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },

  handleUser: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'check-gitlab-status': {
        const user = getCurrentUser();
        return createApiResponse({
          has_gitlab_token: !!user?.gitlab_token,
          gitlab_urls: ['https://gitlab.com', 'https://gitlab.kiwi.com'],
        });
      }

      case 'save-gitlab-info': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 GitLab 정보를 저장할 수 없습니다.'
        );
      }

      case 'get-all-users': {
        return createApiResponse(
          mockUsers.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            organization_id: u.organization_id,
            organization_name: u.organization_name,
            created_at: u.created_at,
            updated_at: u.updated_at,
          }))
        );
      }

      default:
        console.info(`[Mock User API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};

// Mock 로그인 헬퍼 함수
export const mockLogin = (userId: number): MockUser | null => {
  const user = mockUsers.find((u) => u.id === userId);
  if (user) {
    const token = `mock-jwt-token-${user.id}-${Date.now()}`;
    localStorage.setItem('mockUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    return user;
  }
  return null;
};

// Mock 로그아웃 헬퍼 함수
export const mockLogout = (): void => {
  localStorage.removeItem('mockUser');
  localStorage.removeItem('authToken');
};

// 사용 가능한 Mock 사용자 목록 반환
export const getMockUsers = (): MockUser[] => {
  return mockUsers;
};