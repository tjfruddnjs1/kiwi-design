/**
 * Mock Users Data
 * 역할별 테스트 사용자 데이터
 */

export interface MockUser {
  id: number;
  email: string;
  name: string;
  role: 'Owner' | 'Manager' | 'Member';
  permissions: string[];
  organization_id: number;
  organization_name: string;
  awx_inventory?: number;
  awx_template?: number;
  gitlab_token?: string;
  created_at: string;
  updated_at: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    email: 'owner@kiwi.com',
    name: '시스템 관리자',
    role: 'Owner',
    permissions: ['infra', 'service', 'backup', 'device', 'database', 'admin'],
    organization_id: 1,
    organization_name: 'Kiwi Corp',
    awx_inventory: 1,
    awx_template: 1,
    gitlab_token: 'glpat-mock-token-owner',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
  },
  {
    id: 2,
    email: 'manager@kiwi.com',
    name: '프로젝트 매니저',
    role: 'Manager',
    permissions: ['infra', 'service', 'backup', 'device'],
    organization_id: 1,
    organization_name: 'Kiwi Corp',
    awx_inventory: 1,
    awx_template: 1,
    gitlab_token: 'glpat-mock-token-manager',
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
  },
  {
    id: 3,
    email: 'member@kiwi.com',
    name: '개발자',
    role: 'Member',
    permissions: ['service'],
    organization_id: 1,
    organization_name: 'Kiwi Corp',
    gitlab_token: 'glpat-mock-token-member',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
  },
  {
    id: 4,
    email: 'viewer@kiwi.com',
    name: '뷰어',
    role: 'Member',
    permissions: [],
    organization_id: 1,
    organization_name: 'Kiwi Corp',
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
  },
];

export const defaultMockUser = mockUsers[0]; // Owner as default