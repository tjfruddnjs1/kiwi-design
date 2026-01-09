/**
 * Mock Git Repository API Handler
 * 서비스 관리 페이지의 Git 저장소 API 핸들러
 */

import { createApiResponse } from '../utils/delay';
import { mockGitRepositories } from '../data/gitRepository';

export const mockGitsApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'getRepositories': {
        return createApiResponse(mockGitRepositories);
      }

      case 'getRepositoryById': {
        const id = params?.id as number;
        const repo = mockGitRepositories.find((r) => r.id === id);
        if (repo) {
          return createApiResponse(repo);
        }
        return createApiResponse(null, false, '저장소를 찾을 수 없습니다.');
      }

      case 'createRepository':
      case 'updateRepository':
      case 'deleteRepository': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 저장소를 수정할 수 없습니다.'
        );
      }

      case 'getRepoMembers': {
        return createApiResponse([
          { user_id: 1, email: 'owner@kiwi.com', role: 'owner' },
          { user_id: 2, email: 'manager@kiwi.com', role: 'developer' },
        ]);
      }

      case 'addRepoMember':
      case 'removeRepoMember': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 멤버를 수정할 수 없습니다.'
        );
      }

      case 'getUsername': {
        return createApiResponse({
          username: 'mock-user',
          email: 'mock-user@kiwi.com',
        });
      }

      case 'getGroups': {
        return createApiResponse([
          { id: 1, name: 'kiwi', full_path: 'kiwi' },
          { id: 2, name: 'shared', full_path: 'shared' },
        ]);
      }

      case 'createUser': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 사용자를 생성할 수 없습니다.'
        );
      }

      // SAST 관련
      case 'newSastResult':
      case 'saveSastResult':
      case 'getSastResult': {
        return createApiResponse({
          id: 1,
          repo_id: params?.repo_id || params?.repoId,
          result: JSON.stringify({
            semgrep: { findings: [], summary: { total: 0 } },
            codeql: { findings: [], summary: { total: 0 } },
            trivy: { vulnerabilities: [], summary: { total: 0 } },
          }),
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      case 'getSastResults': {
        return createApiResponse([
          {
            id: 1,
            repo_id: params?.repo_id || params?.repoId,
            result: JSON.stringify({
              semgrep: { findings: [], summary: { total: 0 } },
              codeql: { findings: [], summary: { total: 0 } },
              trivy: { vulnerabilities: [], summary: { total: 0 } },
            }),
            status: 'completed',
            created_at: '2026-01-09T08:00:00Z',
            updated_at: '2026-01-09T08:05:00Z',
          },
        ]);
      }

      default:
        console.info(`[Mock Gits API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};