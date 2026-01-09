/**
 * Permission Context
 * 세분화된 권한 관리를 위한 컨텍스트
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  PermissionCode,
  HIGH_RISK_PERMISSIONS,
  PermissionDefinition,
  GroupedPermissions,
} from '../types/permission';
import { permissionApi } from '../lib/api/permission';

// 권한 컨텍스트 타입
interface PermissionContextType {
  // 권한 체크
  hasPermission: (code: PermissionCode | string) => boolean;
  hasAnyPermission: (codes: (PermissionCode | string)[]) => boolean;
  hasAllPermissions: (codes: (PermissionCode | string)[]) => boolean;

  // 역할 체크
  isOwner: boolean;
  isManager: boolean;
  isMember: boolean;
  isOwnerOrManager: boolean;

  // 권한 정보
  permissions: string[];
  role: string;
  allPermissionDefinitions: PermissionDefinition[];
  groupedPermissions: GroupedPermissions;

  // 위험 권한 체크
  isHighRiskPermission: (code: PermissionCode | string) => boolean;

  // 권한 새로고침
  refreshPermissions: () => Promise<void>;

  // 로딩 상태
  isLoading: boolean;
}

// 기본값
const defaultContext: PermissionContextType = {
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  isOwner: false,
  isManager: false,
  isMember: false,
  isOwnerOrManager: false,
  permissions: [],
  role: '',
  allPermissionDefinitions: [],
  groupedPermissions: {},
  isHighRiskPermission: () => false,
  refreshPermissions: async () => {},
  isLoading: false,
};

// 컨텍스트 생성
const PermissionContext = createContext<PermissionContextType>(defaultContext);

// Provider Props
interface PermissionProviderProps {
  children: React.ReactNode;
}

// Permission Provider 컴포넌트
export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allPermissionDefinitions, setAllPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [isLoading, setIsLoading] = useState(false);

  // 역할 정보
  const role = user?.role || '';
  const isOwner = role === 'Owner';
  const isManager = role === 'Manager';
  const isMember = role === 'Member';
  const isOwnerOrManager = isOwner || isManager;

  // 권한 새로고침
  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions([]);
      return;
    }

    setIsLoading(true);
    try {
      // 내 권한 조회
      const myPermsResponse = await permissionApi.getMyPermissions();
      if (myPermsResponse.success && myPermsResponse.data) {
        setPermissions(myPermsResponse.data.permissions || []);
      }

      // 모든 권한 정의 조회 (관리자용)
      if (isOwnerOrManager) {
        const allPermsResponse = await permissionApi.getAllPermissions();
        if (allPermsResponse.success && allPermsResponse.data) {
          setAllPermissionDefinitions(allPermsResponse.data.permissions || []);
          setGroupedPermissions(allPermsResponse.data.grouped || {});
        }
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isOwnerOrManager]);

  // 인증 상태 변경 시 권한 새로고침
  useEffect(() => {
    if (isAuthenticated) {
      refreshPermissions();
    } else {
      setPermissions([]);
      setAllPermissionDefinitions([]);
      setGroupedPermissions({});
    }
  }, [isAuthenticated, refreshPermissions]);

  // 권한 체크 함수
  const hasPermission = useCallback(
    (code: PermissionCode | string): boolean => {
      // Owner는 모든 권한 보유
      if (isOwner) {
        return true;
      }

      // Manager는 대부분의 권한 보유 (위험 권한 제외)
      if (isManager) {
        // 위험 권한은 명시적으로 체크
        if (HIGH_RISK_PERMISSIONS.includes(code as PermissionCode)) {
          return permissions.includes(code);
        }
        return true;
      }

      // Member는 명시적 권한만
      return permissions.includes(code);
    },
    [isOwner, isManager, permissions]
  );

  // 여러 권한 중 하나라도 있는지 체크
  const hasAnyPermission = useCallback(
    (codes: (PermissionCode | string)[]): boolean => {
      return codes.some((code) => hasPermission(code));
    },
    [hasPermission]
  );

  // 모든 권한을 가지고 있는지 체크
  const hasAllPermissions = useCallback(
    (codes: (PermissionCode | string)[]): boolean => {
      return codes.every((code) => hasPermission(code));
    },
    [hasPermission]
  );

  // 위험 권한 체크
  const isHighRiskPermission = useCallback((code: PermissionCode | string): boolean => {
    return HIGH_RISK_PERMISSIONS.includes(code as PermissionCode);
  }, []);

  // 메모이제이션된 컨텍스트 값
  const contextValue = useMemo<PermissionContextType>(
    () => ({
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isOwner,
      isManager,
      isMember,
      isOwnerOrManager,
      permissions,
      role,
      allPermissionDefinitions,
      groupedPermissions,
      isHighRiskPermission,
      refreshPermissions,
      isLoading,
    }),
    [
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isOwner,
      isManager,
      isMember,
      isOwnerOrManager,
      permissions,
      role,
      allPermissionDefinitions,
      groupedPermissions,
      isHighRiskPermission,
      refreshPermissions,
      isLoading,
    ]
  );

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

// 커스텀 훅: usePermission
export const usePermission = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
};

// 단일 권한 체크 훅
export const useHasPermission = (code: PermissionCode | string): boolean => {
  const { hasPermission } = usePermission();
  return hasPermission(code);
};

// 여러 권한 체크 훅 (OR 조건)
export const useHasAnyPermission = (codes: (PermissionCode | string)[]): boolean => {
  const { hasAnyPermission } = usePermission();
  return hasAnyPermission(codes);
};

// 모든 권한 체크 훅 (AND 조건)
export const useHasAllPermissions = (codes: (PermissionCode | string)[]): boolean => {
  const { hasAllPermissions } = usePermission();
  return hasAllPermissions(codes);
};

export default PermissionContext;
