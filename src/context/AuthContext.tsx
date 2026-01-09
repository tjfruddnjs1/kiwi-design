import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { message } from 'antd';
import { mockUsers, type MockUser } from '../mocks/data/users';

// ==================== MOCK AUTH CONTEXT ====================
// kiwi-design 프로젝트용 Mock 인증 컨텍스트
// 실제 JWT 인증 대신 Mock 사용자로 인증 시뮬레이션

// Context가 제공할 값들의 타입 정의
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: number;
    email: string;
    permissions: string[];
    role?: string;
    organization_id?: number | null;
    awx_inventory: number;
    awx_template: number;
  } | null;
  tokenExpiresAt: number | null;
  login: (token: string, userFromServer?: unknown) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  // Mock 전용 함수
  mockLogin: (userId: number) => void;
  getMockUsers: () => MockUser[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock 사용자 정보를 Context 사용자 형식으로 변환
const convertMockUser = (mockUser: MockUser) => ({
  id: mockUser.id,
  email: mockUser.email,
  permissions: mockUser.permissions,
  role: mockUser.role,
  organization_id: mockUser.organization_id,
  awx_inventory: mockUser.awx_inventory || 0,
  awx_template: mockUser.awx_template || 0,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{
    id: number;
    email: string;
    permissions: string[];
    role?: string;
    organization_id?: number | null;
    awx_inventory: number;
    awx_template: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

  // 초기화: 저장된 Mock 사용자 복원
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('mockUser');
        if (storedUser) {
          const mockUser = JSON.parse(storedUser) as MockUser;
          setUser(convertMockUser(mockUser));
          setIsAuthenticated(true);
          // Mock 토큰 만료 시간: 24시간 후
          setTokenExpiresAt(Date.now() + 24 * 60 * 60 * 1000);
          console.info('[Mock Auth] User restored from storage:', mockUser.email);
        }
      } catch (error) {
        console.error('[Mock Auth] Failed to restore user:', error);
        localStorage.removeItem('mockUser');
        localStorage.removeItem('authToken');
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Mock 로그인 함수 (userId로 로그인)
  const mockLogin = (userId: number) => {
    const mockUser = mockUsers.find((u) => u.id === userId);
    if (mockUser) {
      const token = `mock-jwt-token-${mockUser.id}-${Date.now()}`;
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      localStorage.setItem('authToken', token);

      setUser(convertMockUser(mockUser));
      setIsAuthenticated(true);
      setTokenExpiresAt(Date.now() + 24 * 60 * 60 * 1000);

      message.success(`${mockUser.name} (${mockUser.role})로 로그인되었습니다.`);
      console.info('[Mock Auth] Logged in as:', mockUser.email);
    } else {
      message.error('사용자를 찾을 수 없습니다.');
    }
  };

  // 기존 login 함수 (호환성 유지)
  const login = (_token: string, userFromServer?: unknown) => {
    console.info('[Mock Auth] login() called');

    // userFromServer가 있으면 해당 사용자로 로그인
    if (userFromServer && typeof userFromServer === 'object') {
      const serverUser = userFromServer as {
        id: number;
        email: string;
        permissions?: string[];
        role?: string;
        organization_id?: number;
      };

      // Mock 사용자에서 찾기
      const mockUser = mockUsers.find((u) => u.email === serverUser.email);
      if (mockUser) {
        mockLogin(mockUser.id);
        return;
      }
    }

    // 기본: 첫 번째 사용자(Owner)로 로그인
    mockLogin(1);
  };

  // 로그아웃
  const logout = () => {
    localStorage.removeItem('mockUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setIsAuthenticated(false);
    setUser(null);
    setTokenExpiresAt(null);
    console.info('[Mock Auth] Logged out');
    window.location.href = '/login';
  };

  // Mock 토큰 갱신 (항상 성공)
  const refreshToken = async (): Promise<boolean> => {
    console.info('[Mock Auth] Token refreshed (mock)');
    setTokenExpiresAt(Date.now() + 24 * 60 * 60 * 1000);
    return true;
  };

  // Mock 사용자 목록 반환
  const getMockUsers = (): MockUser[] => {
    return mockUsers;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        tokenExpiresAt,
        login,
        logout,
        refreshToken,
        mockLogin,
        getMockUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 다른 컴포넌트에서 쉽게 Context 값을 사용할 수 있게 해주는 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};