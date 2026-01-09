/**
 * Permission System Types
 * 세분화된 권한 시스템을 위한 타입 정의
 *
 * 실제 시스템 구조 기반 재설계 (2026-01)
 * - 메뉴: 장비관리, 런타임환경, 백업관리, 서비스관리, 데이터베이스관리
 * - 서비스 관리: Git 저장소 + 빌드/배포 + 보안스캔(SAST/SCA/DAST/SBOM) + 운영
 * - 운영: K8s/Docker/Podman 컨테이너 공통
 *
 * 참고: SSH와 AWX는 기본 인프라 기능으로 별도 권한 체크 없이 항상 허용됨
 */

// 권한 정의
export interface PermissionDefinition {
  id: number;
  code: string;
  name: string;
  name_ko: string;
  description: string;
  category: PermissionCategory;
  subcategory: string;
  risk_level: RiskLevel;
  requires_approval: boolean;
  is_active: boolean;
  display_order: number;
}

// 권한 카테고리 (실제 시스템 메뉴 기반)
export type PermissionCategory =
  | 'service'    // 서비스 관리 (Git, 파이프라인, 보안스캔 포함)
  | 'infra'      // 런타임 환경 (K8s, Docker, Nginx)
  | 'backup'     // 백업 관리
  | 'device'     // 장비 관리
  | 'database';  // 데이터베이스 관리

// 위험도 레벨
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// 카테고리별 그룹화된 권한
export interface GroupedPermissions {
  [category: string]: PermissionDefinition[];
}

// 사용자 권한 정보
export interface UserPermissions {
  role: string;
  permissions: string[];
}

// 권한 체크 결과
export interface PermissionCheckResult {
  success: boolean;
  has_permission: boolean;
  permission: string;
}

// ============================================================
// 권한 코드 상수 (실제 시스템 기능 기반)
// ============================================================

/**
 * 서비스 권한 (서비스 관리 탭)
 * - Git 저장소 관리
 * - 빌드/배포
 * - 보안 스캔 (SAST, SCA, DAST, SBOM)
 * - 서비스 운영 (K8s/Docker/Podman 공통: 로그, 재시작, 스케일, exec)
 */
export const ServicePermissions = {
  // 기본 CRUD
  VIEW: 'service:view',
  CREATE: 'service:create',
  UPDATE: 'service:update',
  DELETE: 'service:delete',
  // 빌드
  BUILD_VIEW: 'service:build:view',
  BUILD_EXECUTE: 'service:build:execute',
  // 배포
  DEPLOY_VIEW: 'service:deploy:view',
  DEPLOY_EXECUTE: 'service:deploy:execute',
  // 운영 (K8s/Docker/Podman 공통)
  OPERATE_VIEW: 'service:operate:view',
  OPERATE_RESTART: 'service:operate:restart',  // 컨테이너 재시작
  OPERATE_SCALE: 'service:operate:scale',      // K8s Pod 스케일 조정
  OPERATE_LOGS: 'service:operate:logs',        // 컨테이너 로그 조회
  OPERATE_EXEC: 'service:operate:exec',        // 컨테이너 명령 실행
  // 보안 스캔 (SAST/SCA/DAST/SBOM 통합)
  SECURITY_VIEW: 'service:security:view',
  SECURITY_EXECUTE: 'service:security:execute',
} as const;

/**
 * 인프라 권한 (런타임 환경 탭)
 * - 클러스터 관리
 * - Kubernetes 리소스
 * - Docker/Podman 컨테이너
 *
 * 참고: Nginx 설정은 서비스 관리 > 운영 > 도메인 설정에서 관리됨 (별도 권한 불필요)
 */
export const InfraPermissions = {
  // 기본 CRUD
  VIEW: 'infra:view',
  CREATE: 'infra:create',
  UPDATE: 'infra:update',
  DELETE: 'infra:delete',
  // Kubernetes
  K8S_VIEW: 'infra:k8s:view',
  K8S_MANAGE: 'infra:k8s:manage',
  // Docker/Podman
  DOCKER_VIEW: 'infra:docker:view',
  DOCKER_MANAGE: 'infra:docker:manage',
} as const;

/**
 * 백업 권한 (백업 관리 탭)
 * - 백업 생성/복구/삭제
 * - 스토리지 관리 (Minio, 외부 스토리지)
 */
export const BackupPermissions = {
  // 백업 작업
  VIEW: 'backup:view',
  CREATE: 'backup:create',
  DELETE: 'backup:delete',
  RESTORE: 'backup:restore',
  // 스토리지 관리
  STORAGE_VIEW: 'backup:storage:view',
  STORAGE_MANAGE: 'backup:storage:manage',
} as const;

/**
 * 장비 권한 (장비 관리 탭)
 */
export const DevicePermissions = {
  VIEW: 'device:view',
  CREATE: 'device:create',
  UPDATE: 'device:update',
  DELETE: 'device:delete',
} as const;

/**
 * 데이터베이스 권한 (데이터베이스 관리 탭)
 * - DB 연결 관리
 * - 동기화 작업
 * - 마이그레이션
 */
export const DatabasePermissions = {
  // DB 연결
  VIEW: 'database:view',
  CREATE: 'database:create',
  UPDATE: 'database:update',
  DELETE: 'database:delete',
  TEST: 'database:test',
  // 동기화
  SYNC_VIEW: 'database:sync:view',
  SYNC_EXECUTE: 'database:sync:execute',
  // 마이그레이션 (위험)
  MIGRATE_EXECUTE: 'database:migrate:execute',
} as const;

// 모든 권한 코드 타입
export type PermissionCode =
  | typeof ServicePermissions[keyof typeof ServicePermissions]
  | typeof InfraPermissions[keyof typeof InfraPermissions]
  | typeof BackupPermissions[keyof typeof BackupPermissions]
  | typeof DevicePermissions[keyof typeof DevicePermissions]
  | typeof DatabasePermissions[keyof typeof DatabasePermissions];

// 위험 권한 목록
export const HIGH_RISK_PERMISSIONS: PermissionCode[] = [
  ServicePermissions.DELETE,
  ServicePermissions.OPERATE_EXEC,
  InfraPermissions.DELETE,
  InfraPermissions.K8S_MANAGE,
  BackupPermissions.DELETE,
  BackupPermissions.RESTORE,
  DatabasePermissions.DELETE,
  DatabasePermissions.MIGRATE_EXECUTE,
];

/**
 * UI에서 숨겨야 할 권한 목록
 * - 실제 사용자가 제어할 수 있는 UI 기능이 존재하지 않는 권한들
 * - DB에는 존재하지만 권한 선택기에서 표시하지 않음
 */
export const HIDDEN_PERMISSIONS: string[] = [
  'backup:download',              // 백업 다운로드 - UI 미구현
  'infra:k8s:namespace:delete',   // 네임스페이스 삭제 - UI 미구현
  'service:build:cancel',         // 빌드 취소 - UI 미구현
  'service:deploy:rollback',      // 배포 롤백 - UI 미구현
];

// 탭별 필요 권한 매핑
export const TAB_PERMISSIONS: Record<string, PermissionCode[]> = {
  service: [ServicePermissions.VIEW],
  infra: [InfraPermissions.VIEW],
  backup: [BackupPermissions.VIEW],
  device: [DevicePermissions.VIEW],
  database: [DatabasePermissions.VIEW],
};

// 권한 카테고리 한글명
export const CATEGORY_NAMES: Record<PermissionCategory, string> = {
  service: '서비스 관리',
  infra: '런타임 환경',
  backup: '백업 관리',
  device: '장비 관리',
  database: '데이터베이스',
};

// 카테고리별 설명
export const CATEGORY_DESCRIPTIONS: Record<PermissionCategory, string> = {
  service: 'Git 저장소, 빌드/배포, 보안 스캔(SAST/SCA/DAST/SBOM), 컨테이너 운영',
  infra: 'Kubernetes 클러스터, Docker/Podman 컨테이너 관리',
  backup: '백업 생성/복구, Minio/외부 스토리지 관리',
  device: '장비 등록/수정/삭제',
  database: 'DB 연결, 동기화, 마이그레이션',
};

// 위험도 레벨 한글명
export const RISK_LEVEL_NAMES: Record<RiskLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '매우 높음',
};

// 위험도 레벨 색상
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  critical: 'magenta',
};

// 서브카테고리 한글명 (GranularPermissionSelector에서 사용)
export const SUBCATEGORY_NAMES: Record<string, string> = {
  // 공통
  view: '조회',
  create: '생성',
  update: '수정',
  delete: '삭제',
  // 서비스
  build: '빌드',
  deploy: '배포',
  operate: '운영',
  security: '보안 스캔',
  // 인프라
  k8s: 'Kubernetes',
  docker: 'Docker',
  podman: 'Podman',
  // 백업
  storage: '스토리지',
  restore: '복구',
  // 데이터베이스
  test: '연결 테스트',
  sync: '동기화',
  migrate: '마이그레이션',
};
