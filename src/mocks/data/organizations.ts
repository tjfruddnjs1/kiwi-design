/**
 * Mock Organizations Data
 * 조직, 멤버, GitLab 연동 정보
 */

// OrganizationDTO 형식에 맞춘 Mock 데이터
export interface MockOrganization {
  id: number;
  name: string;
  status: 'Active' | 'Pending';
  planType: 'Free' | 'Standard' | 'Enterprise';
  ownerEmail: string;
  managerCount: number;
  managerEmails: string[];
  businessRegistrationNumber: string | null;
  billingAddress: string | null;
  createdAt: string;
  lastModified: string;
  // 추가 필드 (기존 호환성)
  description?: string;
  owner_id?: number;
  member_count?: number;
  infra_count?: number;
  service_count?: number;
}

export interface MockOrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  role: 'Owner' | 'Manager' | 'Member';
  joined_at: string;
  invited_by?: number;
}

export interface MockGitLabUrl {
  id: number;
  organization_id: number;
  url: string;
  gitlab_url?: string;
  name: string;
  created_at: string;
}

export interface MockNotification {
  id: number;
  user_id: number;
  type: 'invitation' | 'system' | 'alert';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export const mockOrganizations: MockOrganization[] = [
  {
    id: 1,
    name: 'Kiwi Corp',
    status: 'Active',
    planType: 'Enterprise',
    ownerEmail: 'owner@kiwi.com',
    managerCount: 1,
    managerEmails: ['manager@kiwi.com'],
    businessRegistrationNumber: '123-45-67890',
    billingAddress: 'Seoul, South Korea',
    createdAt: '2024-01-01T00:00:00Z',
    lastModified: '2026-01-09T00:00:00Z',
    description: 'Main development organization',
    owner_id: 1,
    member_count: 4,
    infra_count: 3,
    service_count: 7,
  },
  {
    id: 2,
    name: 'Kiwi Labs',
    status: 'Active',
    planType: 'Standard',
    ownerEmail: 'owner@kiwi.com',
    managerCount: 0,
    managerEmails: [],
    businessRegistrationNumber: null,
    billingAddress: null,
    createdAt: '2024-06-01T00:00:00Z',
    lastModified: '2026-01-09T00:00:00Z',
    description: 'R&D and experimental projects',
    owner_id: 1,
    member_count: 2,
    infra_count: 1,
    service_count: 2,
  },
];

export const mockOrganizationMembers: MockOrganizationMember[] = [
  {
    id: 1,
    organization_id: 1,
    user_id: 1,
    user_email: 'owner@kiwi.com',
    user_name: '시스템 관리자',
    role: 'Owner',
    joined_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    organization_id: 1,
    user_id: 2,
    user_email: 'manager@kiwi.com',
    user_name: '프로젝트 매니저',
    role: 'Manager',
    joined_at: '2024-03-15T00:00:00Z',
    invited_by: 1,
  },
  {
    id: 3,
    organization_id: 1,
    user_id: 3,
    user_email: 'member@kiwi.com',
    user_name: '개발자',
    role: 'Member',
    joined_at: '2024-06-01T00:00:00Z',
    invited_by: 2,
  },
  {
    id: 4,
    organization_id: 1,
    user_id: 4,
    user_email: 'viewer@kiwi.com',
    user_name: '뷰어',
    role: 'Member',
    joined_at: '2024-09-01T00:00:00Z',
    invited_by: 1,
  },
  // Kiwi Labs members
  {
    id: 5,
    organization_id: 2,
    user_id: 1,
    user_email: 'owner@kiwi.com',
    user_name: '시스템 관리자',
    role: 'Owner',
    joined_at: '2024-06-01T00:00:00Z',
  },
  {
    id: 6,
    organization_id: 2,
    user_id: 3,
    user_email: 'member@kiwi.com',
    user_name: '개발자',
    role: 'Member',
    joined_at: '2024-07-01T00:00:00Z',
    invited_by: 1,
  },
];

export const mockGitLabUrls: MockGitLabUrl[] = [
  {
    id: 1,
    organization_id: 1,
    url: 'https://gitlab.com',
    gitlab_url: 'https://gitlab.com',
    name: 'GitLab.com',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    organization_id: 1,
    url: 'https://gitlab.kiwi.com',
    gitlab_url: 'https://gitlab.kiwi.com',
    name: 'Kiwi GitLab',
    created_at: '2024-02-01T00:00:00Z',
  },
];

export const mockNotifications: MockNotification[] = [
  {
    id: 1,
    user_id: 3,
    type: 'invitation',
    title: 'Organization Invitation',
    message: 'You have been invited to join Kiwi Labs',
    read: false,
    data: {
      organization_id: 2,
      organization_name: 'Kiwi Labs',
      invited_by: 'owner@kiwi.com',
    },
    created_at: '2026-01-09T08:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    type: 'alert',
    title: 'Service Alert',
    message: 'data-analytics service entered error state',
    read: false,
    data: {
      service_id: 7,
      service_name: 'data-analytics',
      severity: 'high',
    },
    created_at: '2026-01-09T06:00:00Z',
  },
  {
    id: 3,
    user_id: 1,
    type: 'system',
    title: 'Backup Completed',
    message: 'Daily production backup completed successfully',
    read: true,
    data: {
      backup_id: 1,
      backup_name: 'backup-production-2026-01-09-0200',
    },
    created_at: '2026-01-09T02:15:00Z',
  },
  {
    id: 4,
    user_id: 2,
    type: 'system',
    title: 'Build Started',
    message: 'Frontend app build #203 has started',
    read: false,
    data: {
      pipeline_id: 3,
      service_name: 'frontend-app',
    },
    created_at: '2026-01-09T08:30:00Z',
  },
];

// Permission Definitions
export const mockPermissionDefinitions = [
  // Service Permissions
  { id: 1, code: 'service:view', name: 'View Services', name_ko: '서비스 조회', category: 'service', risk_level: 'low' },
  { id: 2, code: 'service:create', name: 'Create Service', name_ko: '서비스 생성', category: 'service', risk_level: 'medium' },
  { id: 3, code: 'service:update', name: 'Update Service', name_ko: '서비스 수정', category: 'service', risk_level: 'medium' },
  { id: 4, code: 'service:delete', name: 'Delete Service', name_ko: '서비스 삭제', category: 'service', risk_level: 'high' },
  { id: 5, code: 'service:build:execute', name: 'Execute Build', name_ko: '빌드 실행', category: 'service', risk_level: 'medium' },
  { id: 6, code: 'service:deploy:execute', name: 'Execute Deploy', name_ko: '배포 실행', category: 'service', risk_level: 'high' },

  // Infra Permissions
  { id: 10, code: 'infra:view', name: 'View Infrastructure', name_ko: '인프라 조회', category: 'infra', risk_level: 'low' },
  { id: 11, code: 'infra:create', name: 'Create Infrastructure', name_ko: '인프라 생성', category: 'infra', risk_level: 'high' },
  { id: 12, code: 'infra:update', name: 'Update Infrastructure', name_ko: '인프라 수정', category: 'infra', risk_level: 'high' },
  { id: 13, code: 'infra:delete', name: 'Delete Infrastructure', name_ko: '인프라 삭제', category: 'infra', risk_level: 'critical' },
  { id: 14, code: 'infra:k8s:manage', name: 'Manage Kubernetes', name_ko: 'K8s 관리', category: 'infra', risk_level: 'high' },

  // Backup Permissions
  { id: 20, code: 'backup:view', name: 'View Backups', name_ko: '백업 조회', category: 'backup', risk_level: 'low' },
  { id: 21, code: 'backup:create', name: 'Create Backup', name_ko: '백업 생성', category: 'backup', risk_level: 'medium' },
  { id: 22, code: 'backup:delete', name: 'Delete Backup', name_ko: '백업 삭제', category: 'backup', risk_level: 'high' },
  { id: 23, code: 'backup:restore', name: 'Restore Backup', name_ko: '백업 복원', category: 'backup', risk_level: 'critical' },
];
