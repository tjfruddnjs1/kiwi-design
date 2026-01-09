import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import organizationApi, {
  OrganizationMemberDTO,
} from '../lib/api/endpoints/organization';

/**
 * 기관 멤버 관리를 위한 커스텀 훅
 * 멤버 목록 로드, 초대, 제거 기능을 제공합니다.
 */
export const useOrganizationMembers = (organizationId: number | null) => {
  const [members, setMembers] = useState<OrganizationMemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 기관 멤버 목록 로드
   */
  const loadMembers = useCallback(async () => {
    if (!organizationId) {
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response =
        await organizationApi.getOrganizationMembers(organizationId);

      if (response.success && response.data) {
        setMembers(response.data);
      } else {
        const errorMsg = `사용자 목록 로드 실패: ${response.error || 'API 오류'}`;
        setError(errorMsg);
        message.error(errorMsg);
        setMembers([]);
      }
    } catch (_err) {
      const errorMsg = '소속 사용자 목록 로드 중 서버 오류가 발생했습니다.';
      setError(errorMsg);
      message.error(errorMsg);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  /**
   * 멤버 초대
   */
  const inviteMember = useCallback(
    async (email: string): Promise<boolean> => {
      if (!organizationId) return false;

      try {
        message.loading({ content: `${email} 초대 요청 중...`, key: 'invite' });

        const response = await organizationApi.inviteMember(organizationId, {
          email,
        });

        if (response.success) {
          message.success({
            content: `${email}님을 기관에 성공적으로 초대했습니다.`,
            key: 'invite',
          });
          await loadMembers(); // 목록 새로고침
          return true;
        } else {
          message.error({
            content: `초대 실패: ${response.error || '알 수 없는 오류'}`,
            key: 'invite',
          });
          return false;
        }
      } catch (_err) {
        message.error({
          content: '사용자 초대 중 서버 오류가 발생했습니다.',
          key: 'invite',
        });
        return false;
      }
    },
    [organizationId, loadMembers]
  );

  /**
   * 멤버 제거
   */
  const removeMember = useCallback(
    async (userId: number, userName: string): Promise<boolean> => {
      if (!organizationId) return false;

      try {
        message.loading({
          content: `${userName} 내보내는 중...`,
          key: 'remove',
        });

        const response = await organizationApi.removeMember(
          organizationId,
          userId
        );

        if (response.success) {
          message.success({
            content: `${userName}님을 기관에서 내보냈습니다.`,
            key: 'remove',
          });
          setMembers(prev => prev.filter(member => member.id !== userId));
          return true;
        } else {
          message.error({
            content: `내보내기 실패: ${response.error || '알 수 없는 오류'}`,
            key: 'remove',
          });
          return false;
        }
      } catch (_err) {
        message.error({
          content: '사용자 내보내기 중 서버 오류가 발생했습니다.',
          key: 'remove',
        });
        return false;
      }
    },
    [organizationId]
  );

  /**
   * organizationId가 변경될 때마다 멤버 목록 자동 로드
   */
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members,
    isLoading,
    error,
    loadMembers,
    inviteMember,
    removeMember,
  };
};
