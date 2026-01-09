import React, { createContext, useContext, useState, useCallback } from 'react';
import { notification } from 'antd';
import { LoadingState, ActionState } from '../../types';

interface FeedbackContextType {
  // 로딩 상태
  showLoading: (key: string, message?: string) => void;
  hideLoading: (key: string) => void;
  isLoading: (key: string) => boolean;

  // 성공 메시지
  showSuccess: (message: string, description?: string) => void;

  // 에러 메시지
  showError: (message: string, description?: string) => void;
  showWarning: (message: string, description?: string) => void;
  showInfo: (message: string, description?: string) => void;

  // 액션 상태
  showActionLoading: (key: string, message?: string) => void;
  showActionSuccess: (key: string, message?: string) => void;
  showActionError: (key: string, message: string) => void;
  getActionState: (key: string) => ActionState;

  // 토스트 메시지
  showToast: (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined
);

interface FeedbackProviderProps {
  children: React.ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({
  children,
}) => {
  const [loadingStates, setLoadingStates] = useState<
    Record<string, LoadingState>
  >({});
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {}
  );

  // 로딩 상태 관리
  const showLoading = useCallback((key: string, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { loading: true, error: null },
    }));
    if (message) {
      notification.info({
        message: '로딩 중',
        description: message,
        key: `loading-${key}`,
        duration: 0,
        placement: 'topRight',
      });
    }
  }, []);

  const hideLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { loading: false, error: null },
    }));
    notification.destroy(`loading-${key}`);
  }, []);

  const isLoading = useCallback(
    (key: string): boolean => {
      return loadingStates[key]?.loading || false;
    },
    [loadingStates]
  );

  // 성공 메시지
  const showSuccess = useCallback((message: string, description?: string) => {
    notification.success({
      message,
      description,
      placement: 'topRight',
      duration: 4,
    });
  }, []);

  // 에러 메시지
  const showError = useCallback((message: string, description?: string) => {
    notification.error({
      message,
      description,
      placement: 'topRight',
      duration: 6,
    });
  }, []);

  const showWarning = useCallback((message: string, description?: string) => {
    notification.warning({
      message,
      description,
      placement: 'topRight',
      duration: 5,
    });
  }, []);

  const showInfo = useCallback((message: string, description?: string) => {
    notification.info({
      message,
      description,
      placement: 'topRight',
      duration: 4,
    });
  }, []);

  // 액션 상태 관리
  const showActionLoading = useCallback((key: string, message?: string) => {
    setActionStates(prev => ({
      ...prev,
      [key]: { loading: true, success: false, error: null },
    }));
    if (message) {
      notification.info({
        message: '처리 중',
        description: message,
        key: `action-${key}`,
        duration: 0,
        placement: 'topRight',
      });
    }
  }, []);

  const showActionSuccess = useCallback((key: string, message?: string) => {
    setActionStates(prev => ({
      ...prev,
      [key]: { loading: false, success: true, error: null },
    }));
    notification.destroy(`action-${key}`);
    if (message) {
      notification.success({
        message: '성공',
        description: message,
        placement: 'topRight',
        duration: 3,
      });
    }
  }, []);

  const showActionError = useCallback((key: string, message: string) => {
    setActionStates(prev => ({
      ...prev,
      [key]: { loading: false, success: false, error: message },
    }));
    notification.destroy(`action-${key}`);
    notification.error({
      message: '오류',
      description: message,
      placement: 'topRight',
      duration: 6,
    });
  }, []);

  const getActionState = useCallback(
    (key: string): ActionState => {
      return (
        actionStates[key] || { loading: false, success: false, error: null }
      );
    },
    [actionStates]
  );

  // 토스트 메시지
  const showToast = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
      switch (type) {
        case 'success':
          notification.success({
            message,
            placement: 'topRight',
            duration: 3,
          });
          break;
        case 'error':
          notification.error({
            message,
            placement: 'topRight',
            duration: 6,
          });
          break;
        case 'warning':
          notification.warning({
            message,
            placement: 'topRight',
            duration: 5,
          });
          break;
        case 'info':
          notification.info({
            message,
            placement: 'topRight',
            duration: 4,
          });
          break;
      }
    },
    []
  );

  const value: FeedbackContextType = {
    showLoading,
    hideLoading,
    isLoading,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showActionLoading,
    showActionSuccess,
    showActionError,
    getActionState,

    showToast,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }

  return context;
};
