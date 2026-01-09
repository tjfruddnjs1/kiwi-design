/**
 * Mock Organization API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockOrganizations,
  mockOrganizationMembers,
  mockGitLabUrls,
  mockNotifications,
} from '../data/organizations';
import { mockUsers } from '../data/users';

// 현재 로그인된 사용자 ID 가져오기
const getCurrentUserId = (): number => {
  try {
    const stored = localStorage.getItem('mockUser');
    if (stored) {
      const user = JSON.parse(stored);
      return user.id;
    }
  } catch {
    // ignore
  }
  return 1; // default to owner
};

export const mockOrganizationApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;
    const currentUserId = getCurrentUserId();

    switch (action) {
      // Organization CRUD
      case 'getAllOrganizations': {
        return createApiResponse(mockOrganizations);
      }

      case 'getMyOrganizations': {
        const memberOrgs = mockOrganizationMembers
          .filter((m) => m.user_id === currentUserId)
          .map((m) => m.organization_id);

        const orgs = mockOrganizations.filter((o) => memberOrgs.includes(o.id));
        return createApiResponse(orgs);
      }

      case 'getOrganizationByID': {
        const orgId = params?.organization_id as number;
        const org = mockOrganizations.find((o) => o.id === orgId);
        return createApiResponse(org || null);
      }

      case 'createOrganization':
      case 'updateOrganization':
      case 'deleteOrganization': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 조직을 수정할 수 없습니다.'
        );
      }

      // Members
      case 'getOrganizationMembers': {
        const orgId = params?.organization_id as number;
        const members = mockOrganizationMembers
          .filter((m) => m.organization_id === orgId)
          .map((m) => ({
            ...m,
            user: mockUsers.find((u) => u.id === m.user_id),
          }));
        return createApiResponse(members);
      }

      case 'getAllUsersForOwner': {
        return createApiResponse(
          mockUsers.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            organization_id: u.organization_id,
            organization_name: u.organization_name,
          }))
        );
      }

      case 'inviteMember':
      case 'removeMember':
      case 'updateMemberRole': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 멤버를 관리할 수 없습니다.'
        );
      }

      // GitLab URLs
      case 'getGitlabUrls': {
        const orgId = params?.organization_id as number | undefined;
        let urls = [...mockGitLabUrls];

        if (orgId) {
          urls = urls.filter((u) => u.organization_id === orgId);
        }

        return createApiResponse(urls);
      }

      case 'addGitlabUrl':
      case 'removeGitlabUrl': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 GitLab URL을 수정할 수 없습니다.'
        );
      }

      // Owner Actions
      case 'addUserToOrganization':
      case 'removeUserFromOrganization':
      case 'updateUserOrganizations': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 사용자 조직을 수정할 수 없습니다.'
        );
      }

      default:
        console.info(`[Mock Organization API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },

  handleNotification: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;
    const currentUserId = getCurrentUserId();

    switch (action) {
      case 'getUserNotifications': {
        const notifications = mockNotifications.filter((n) => n.user_id === currentUserId);
        return createApiResponse(notifications);
      }

      case 'getUnreadCount': {
        const unreadCount = mockNotifications.filter(
          (n) => n.user_id === currentUserId && !n.read
        ).length;
        return createApiResponse({ count: unreadCount });
      }

      case 'acceptInvitation':
      case 'rejectInvitation': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 초대를 처리할 수 없습니다.'
        );
      }

      case 'markAsRead': {
        return createApiResponse({ success: true }, true, '읽음 처리되었습니다.');
      }

      case 'markAllAsRead': {
        return createApiResponse({ success: true }, true, '모두 읽음 처리되었습니다.');
      }

      default:
        console.info(`[Mock Notification API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};