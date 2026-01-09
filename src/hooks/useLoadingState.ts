import { useState, useCallback } from 'react';
import { LoadingState, ActionState } from '../types';

export const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<
    Record<string, LoadingState>
  >({});
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {}
  );

  // 로딩 상태 설정
  const setLoading = useCallback(
    (key: string, loading: boolean, error: string | null = null) => {
      setLoadingStates(prev => ({
        ...prev,
        [key]: { loading, error },
      }));
    },
    []
  );

  // 액션 상태 설정
  const setAction = useCallback((key: string, actionState: ActionState) => {
    setActionStates(prev => ({
      ...prev,
      [key]: actionState,
    }));
  }, []);

  // 비동기 작업 래퍼
  const withLoading = useCallback(
    async <T>(
      key: string,
      asyncFn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void;
        onError?: (error: unknown) => void;
      }
    ): Promise<T | null> => {
      try {
        setLoading(key, true);
        const result = await asyncFn();

        setLoading(key, false);
        options?.onSuccess?.(result);

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';

        setLoading(key, false, errorMessage);
        options?.onError?.(error);

        return null;
      }
    },
    [setLoading]
  );

  // 액션 작업 래퍼
  const withAction = useCallback(
    async <T>(
      key: string,
      asyncFn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void;
        onError?: (error: unknown) => void;
      }
    ): Promise<T | null> => {
      try {
        setAction(key, { loading: true, success: false, error: null });
        const result = await asyncFn();

        setAction(key, { loading: false, success: true, error: null });
        options?.onSuccess?.(result);

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';

        setAction(key, { loading: false, success: false, error: errorMessage });
        options?.onError?.(error);

        return null;
      }
    },
    [setAction]
  );

  // 로딩 상태 확인
  const isLoading = useCallback(
    (key: string): boolean => {
      return loadingStates[key]?.loading || false;
    },
    [loadingStates]
  );

  // 에러 상태 확인
  const getError = useCallback(
    (key: string): string | null => {
      return loadingStates[key]?.error || null;
    },
    [loadingStates]
  );

  // 액션 상태 확인
  const getActionState = useCallback(
    (key: string): ActionState => {
      return (
        actionStates[key] || { loading: false, success: false, error: null }
      );
    },
    [actionStates]
  );

  // 모든 로딩 상태 확인
  const isAnyLoading = useCallback((): boolean => {
    return (
      Object.values(loadingStates).some(state => state.loading) ||
      Object.values(actionStates).some(state => state.loading)
    );
  }, [loadingStates, actionStates]);

  // 상태 초기화
  const resetState = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newStates = { ...prev };

      delete newStates[key];

      return newStates;
    });
    setActionStates(prev => {
      const newStates = { ...prev };

      delete newStates[key];

      return newStates;
    });
  }, []);

  // 모든 상태 초기화
  const resetAllStates = useCallback(() => {
    setLoadingStates({});
    setActionStates({});
  }, []);

  return {
    // 상태
    loadingStates,
    actionStates,

    // 유틸리티 함수들
    setLoading,
    setAction,
    withLoading,
    withAction,
    isLoading,
    getError,
    getActionState,
    isAnyLoading,
    resetState,
    resetAllStates,
  };
};
