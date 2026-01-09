import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { organizationApi, OrganizationDTO } from '../lib/api/endpoints/organization';
import { logger } from '../utils/logger';

/**
 * Organization Context
 *
 * 기관 기반 데이터 분리를 위한 컨텍스트
 * - Owner: 모든 기관 조회 가능, 선택한 기관의 데이터만 표시
 * - Manager/Member: 자신이 속한 기관의 데이터만 표시 (기관 선택 불가)
 */

interface OrganizationContextType {
  // 현재 선택된 기관
  selectedOrganization: OrganizationDTO | null;
  // 선택 가능한 기관 목록 (Owner용)
  availableOrganizations: OrganizationDTO[];
  // 기관 선택 함수 (Owner만 사용 가능)
  setSelectedOrganization: (org: OrganizationDTO | null) => void;
  // 기관 선택 가능 여부 (Owner만 true)
  canSelectOrganization: boolean;
  // 로딩 상태
  isLoading: boolean;
  // 기관 목록 새로고침
  refreshOrganizations: () => Promise<void>;
  // 현재 선택된 기관 ID (API 호출에 사용)
  selectedOrgId: number | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// LocalStorage 키
const SELECTED_ORG_KEY = 'selectedOrganizationId';

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedOrganization, setSelectedOrganizationState] = useState<OrganizationDTO | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<OrganizationDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Owner인지 확인
  const isOwner = user?.role === 'Owner';
  const canSelectOrganization = isOwner;

  // 기관 선택 함수
  const setSelectedOrganization = useCallback((org: OrganizationDTO | null) => {
    if (!canSelectOrganization && org !== null) {
      logger.warn('Manager/Member는 기관을 선택할 수 없습니다.');
      return;
    }
    setSelectedOrganizationState(org);
    if (org) {
      localStorage.setItem(SELECTED_ORG_KEY, String(org.id));
    } else {
      localStorage.removeItem(SELECTED_ORG_KEY);
    }
  }, [canSelectOrganization]);

  // 기관 목록 로드
  const refreshOrganizations = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;

    setIsLoading(true);
    try {
      if (isOwner) {
        // Owner: 모든 기관 조회
        const response = await organizationApi.getAllOrganizations();
        if (response.success && response.data) {
          setAvailableOrganizations(response.data);

          // 저장된 선택 기관 복원 또는 첫 번째 기관 선택
          const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);
          if (savedOrgId) {
            const savedOrg = response.data.find(org => org.id === Number(savedOrgId));
            if (savedOrg) {
              setSelectedOrganizationState(savedOrg);
            } else if (response.data.length > 0) {
              setSelectedOrganizationState(response.data[0]);
            }
          } else if (response.data.length > 0) {
            setSelectedOrganizationState(response.data[0]);
          }
        }
      } else {
        // Manager/Member: 자신이 속한 기관만 조회
        const response = await organizationApi.getMyOrganizations();
        if (response.success && response.data) {
          setAvailableOrganizations(response.data);

          // user.organization_id와 일치하는 기관 선택 또는 첫 번째 기관
          if (user?.organization_id) {
            const userOrg = response.data.find(org => org.id === user.organization_id);
            if (userOrg) {
              setSelectedOrganizationState(userOrg);
            } else if (response.data.length > 0) {
              setSelectedOrganizationState(response.data[0]);
            }
          } else if (response.data.length > 0) {
            setSelectedOrganizationState(response.data[0]);
          }
        }
      }
    } catch (error) {
      logger.error('기관 목록 로드 실패', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, isOwner, user?.organization_id]);

  // 인증 상태 변경 시 기관 목록 로드
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void refreshOrganizations();
    } else if (!isAuthenticated) {
      // 로그아웃 시 상태 초기화
      setAvailableOrganizations([]);
      setSelectedOrganizationState(null);
      localStorage.removeItem(SELECTED_ORG_KEY);
    }
  }, [isAuthenticated, authLoading, refreshOrganizations]);

  // 선택된 기관 ID
  const selectedOrgId = selectedOrganization?.id ?? null;

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        availableOrganizations,
        setSelectedOrganization,
        canSelectOrganization,
        isLoading,
        refreshOrganizations,
        selectedOrgId,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

/**
 * useOrganization 훅
 *
 * 현재 선택된 기관 정보를 가져오기 위한 훅
 * @throws OrganizationProvider 외부에서 사용 시 에러
 */
export const useOrganization = () => {
  const context = useContext(OrganizationContext);

  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }

  return context;
};

export default OrganizationContext;
