import { useState, useEffect, useCallback } from 'react';
import notificationApi, {
  type NotificationDTO,
} from '../lib/api/endpoints/notification';
import { message } from 'antd';
// KubernetesClusterInfo is no longer used in this file

/**
 * 알림 관리를 위한 커스텀 훅
 * 알림 목록 조회, 읽지 않은 알림 개수, 수락/거절 기능 제공
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 알림 목록 로드
   */
  const loadNotifications = useCallback(async (limit = 50) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await notificationApi.getUserNotifications(limit);

      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        const errorMsg = `알림 목록 로드 실패: ${response.error || 'API 오류'}`;
        setError(errorMsg);
        message.error(errorMsg);
      }
    } catch (_err) {
      const errorMsg = '알림 목록 로드 중 오류가 발생했습니다.';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 읽지 않은 알림 개수 로드
   */
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();

      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (_err) {
      // 읽지 않은 개수는 실패해도 무시
    }
  }, []);

  /**
   * 초대 수락
   */
  const acceptInvitation = useCallback(
    async (notificationId: number): Promise<boolean> => {
      try {
        const response = await notificationApi.acceptInvitation(notificationId);

        if (response.success) {
          message.success('기관 초대를 수락했습니다.');
          await loadNotifications(); // 목록 새로고침
          await loadUnreadCount(); // 읽지 않은 개수 새로고침
          return true;
        } else {
          message.error(
            `초대 수락 실패: ${response.error || '알 수 없는 오류'}`
          );
          return false;
        }
      } catch (_err) {
        message.error('초대 수락 중 오류가 발생했습니다.');
        return false;
      }
    },
    [loadNotifications, loadUnreadCount]
  );

  /**
   * 초대 거절
   */
  const rejectInvitation = useCallback(
    async (notificationId: number): Promise<boolean> => {
      try {
        const response = await notificationApi.rejectInvitation(notificationId);

        if (response.success) {
          message.success('기관 초대를 거절했습니다.');
          await loadNotifications(); // 목록 새로고침
          await loadUnreadCount(); // 읽지 않은 개수 새로고침
          return true;
        } else {
          message.error(
            `초대 거절 실패: ${response.error || '알 수 없는 오류'}`
          );
          return false;
        }
      } catch (_err) {
        message.error('초대 거절 중 오류가 발생했습니다.');
        return false;
      }
    },
    [loadNotifications, loadUnreadCount]
  );

  /**
   * 알림 읽음 처리
   */
  const markAsRead = useCallback(
    async (notificationId: number): Promise<boolean> => {
      try {
        const response = await notificationApi.markAsRead(notificationId);

        if (response.success) {
          // 로컬 상태 업데이트
          setNotifications(prev =>
            prev.map(n =>
              n.id === notificationId ? { ...n, status: 'read' } : n
            )
          );
          await loadUnreadCount(); // 읽지 않은 개수 새로고침
          return true;
        }
        return false;
      } catch (_err) {
        return false;
      }
    },
    [loadUnreadCount]
  );

  /**
   * 모든 알림 읽음 처리
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await notificationApi.markAllAsRead();

      if (response.success) {
        message.success('모든 알림을 읽음으로 표시했습니다.');
        await loadNotifications(); // 목록 새로고침
        setUnreadCount(0);
        return true;
      } else {
        message.error(
          `알림 읽음 처리 실패: ${response.error || '알 수 없는 오류'}`
        );
        return false;
      }
    } catch (_err) {
      message.error('알림 읽음 처리 중 오류가 발생했습니다.');
      return false;
    }
  }, [loadNotifications]);

  /**
   * 컴포넌트 마운트 시 알림 목록 및 읽지 않은 개수 로드
   */
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  /**
   * 주기적으로 읽지 않은 알림 개수 업데이트 (30초마다)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000); // 30초

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    loadUnreadCount,
    acceptInvitation,
    rejectInvitation,
    markAsRead,
    markAllAsRead,
  };
};
