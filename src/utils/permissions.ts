/**
 * 권한 체크 유틸리티
 *
 * 역할(Role)과 권한(Permission)을 일관되게 관리하기 위한 유틸리티 함수들입니다.
 */

// 역할 상수 정의
export const Role = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  MEMBER: 'Member',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

// 권한(탭 접근) 상수 정의
export const Permission = {
  INFRA: 'infra',
  SERVICE: 'service',
  BACKUP: 'backup',
  DEVICE: 'device',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

// 사용자 정보 타입
interface UserInfo {
  role?: string;
  permissions?: string[];
}

/**
 * 사용자가 특정 역할을 가지고 있는지 확인합니다.
 */
export const hasRole = (user: UserInfo | null, role: RoleType): boolean => {
  if (!user?.role) return false;
  return user.role === role;
};

/**
 * 사용자가 Owner인지 확인합니다.
 */
export const isOwner = (user: UserInfo | null): boolean => {
  return hasRole(user, Role.OWNER);
};

/**
 * 사용자가 Manager인지 확인합니다.
 */
export const isManager = (user: UserInfo | null): boolean => {
  return hasRole(user, Role.MANAGER);
};

/**
 * 사용자가 Member인지 확인합니다.
 */
export const isMember = (user: UserInfo | null): boolean => {
  return hasRole(user, Role.MEMBER);
};

/**
 * 사용자가 Owner 또는 Manager인지 확인합니다.
 */
export const isOwnerOrManager = (user: UserInfo | null): boolean => {
  return isOwner(user) || isManager(user);
};

/**
 * 사용자가 특정 권한을 가지고 있는지 확인합니다.
 * Owner와 Manager는 모든 권한을 가진 것으로 처리됩니다.
 */
export const hasPermission = (
  user: UserInfo | null,
  permission: PermissionType
): boolean => {
  if (!user) return false;

  // Owner와 Manager는 모든 권한을 가짐
  if (isOwnerOrManager(user)) return true;

  // Member는 permissions 배열 확인
  return user.permissions?.includes(permission) ?? false;
};

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인합니다.
 */
export const hasAnyPermission = (
  user: UserInfo | null,
  permissions: PermissionType[]
): boolean => {
  if (!user) return false;

  // Owner와 Manager는 모든 권한을 가짐
  if (isOwnerOrManager(user)) return true;

  // Member는 permissions 배열 확인
  return permissions.some(perm => user.permissions?.includes(perm));
};

/**
 * 사용자가 모든 권한을 가지고 있는지 확인합니다.
 */
export const hasAllPermissions = (
  user: UserInfo | null,
  permissions: PermissionType[]
): boolean => {
  if (!user) return false;

  // Owner와 Manager는 모든 권한을 가짐
  if (isOwnerOrManager(user)) return true;

  // Member는 permissions 배열 확인
  return permissions.every(perm => user.permissions?.includes(perm));
};

/**
 * 사용자가 기관에 소속되어 있는지 확인합니다.
 */
export const hasOrganization = (user: UserInfo | null): boolean => {
  return !!user?.role;
};

/**
 * 권한 기반 조건부 렌더링을 위한 헬퍼
 */
export const canAccess = {
  /** 기관 관리 페이지 접근 가능 여부 */
  organizationManagement: (user: UserInfo | null): boolean => isOwner(user),

  /** 사용자 관리 페이지 접근 가능 여부 */
  userManagement: (user: UserInfo | null): boolean => isOwnerOrManager(user),

  /** 인프라 관리 기능 접근 가능 여부 */
  infraManagement: (user: UserInfo | null): boolean =>
    hasPermission(user, Permission.INFRA),

  /** 서비스 관리 기능 접근 가능 여부 */
  serviceManagement: (user: UserInfo | null): boolean =>
    hasPermission(user, Permission.SERVICE),

  /** 백업 관리 기능 접근 가능 여부 */
  backupManagement: (user: UserInfo | null): boolean =>
    hasPermission(user, Permission.BACKUP),

  /** 장비 관리 기능 접근 가능 여부 */
  deviceManagement: (user: UserInfo | null): boolean =>
    hasPermission(user, Permission.DEVICE),
};

/**
 * 역할 표시명 가져오기
 */
export const getRoleDisplayName = (role: string | undefined): string => {
  switch (role) {
    case Role.OWNER:
      return '소유자';
    case Role.MANAGER:
      return '관리자';
    case Role.MEMBER:
      return '멤버';
    default:
      return '미지정';
  }
};

/**
 * 권한 표시명 가져오기
 */
export const getPermissionDisplayName = (permission: string): string => {
  switch (permission) {
    case Permission.INFRA:
      return '인프라 관리';
    case Permission.SERVICE:
      return '서비스 관리';
    case Permission.BACKUP:
      return '백업 관리';
    case Permission.DEVICE:
      return '장비 관리';
    default:
      return permission;
  }
};
