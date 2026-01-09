// 비동기 작업 관리를 위한 공통 훅
// 로딩 상태, 에러 처리, 재시도 로직을 표준화합니다

import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import { AsyncOperationState } from '../types/shared';

export interface UseAsyncOperationOptions {
  /** 자동 에러 메시지 표시 여부 */
  showErrorMessage?: boolean;
  /** 성공 메시지 표시 여부 */
  showSuccessMessage?: boolean;
  /** 기본 성공 메시지 */
  successMessage?: string;
  /** 재시도 최대 횟수 */
  maxRetries?: number;
  /** 재시도 지연 시간 (ms) */
  retryDelay?: number;
}

export interface UseAsyncOperationReturn<
  TData,
  TParams extends unknown[] = [],
> {
  /** 현재 상태 */
  state: AsyncOperationState;
  /** 작업 실행 함수 */
  execute: (...params: TParams) => Promise<TData | null>;
  /** 상태 초기화 */
  reset: () => void;
  /** 재시도 함수 */
  retry: () => Promise<TData | null>;
  /** 작업 취소 */
  cancel: () => void;
}

/**
 * 비동기 작업을 관리하는 공통 훅
 *
 * @param asyncFunction - 실행할 비동기 함수
 * @param options - 옵션 설정
 * @returns 상태와 실행 함수들
 *
 * @example
 * ```tsx
 * const { state, execute } = useAsyncOperation(
 *   async (id: number) => await api.getUser(id),
 *   { showSuccessMessage: true, successMessage: '사용자 정보를 불러왔습니다.' }
 * );
 *
 * const handleClick = () => execute(123);
 * ```
 */
export const useAsyncOperation = <TData, TParams extends unknown[] = []>(
  asyncFunction: (...params: TParams) => Promise<TData>,
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationReturn<TData, TParams> => {
  const {
    showErrorMessage = true,
    showSuccessMessage = false,
    successMessage,
    maxRetries = 0,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
    success: false,
    progress: 0,
    message: '',
  });

  const cancelRef = useRef<boolean>(false);
  const lastParamsRef = useRef<TParams | null>(null);
  const retryCountRef = useRef<number>(0);
  // asyncFunction을 ref로 저장하여 최신 참조를 유지하면서 의존성 배열에서 제외
  const asyncFunctionRef = useRef(asyncFunction);
  asyncFunctionRef.current = asyncFunction;

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false,
      progress: 0,
      message: '',
    });
    cancelRef.current = false;
    retryCountRef.current = 0;
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setState(prev => ({
      ...prev,
      loading: false,
      message: '작업이 취소되었습니다.',
    }));
  }, []);

  const executeWithRetry = useCallback(
    async (...params: TParams): Promise<TData | null> => {
      if (cancelRef.current) return null;

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        success: false,
        progress: 0,
        message: '작업을 시작합니다...',
      }));

      lastParamsRef.current = params;

      try {
        // asyncFunctionRef.current를 사용하여 최신 함수 참조 사용
        const result = await asyncFunctionRef.current(...params);

        if (cancelRef.current) return null;

        setState({
          loading: false,
          error: null,
          success: true,
          progress: 100,
          message: successMessage || '작업이 완료되었습니다.',
        });

        if (showSuccessMessage && successMessage) {
          message.success(successMessage);
        }

        retryCountRef.current = 0;

        return result;
      } catch (error) {
        if (cancelRef.current) return null;

        const errorMessage =
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.';

        // 재시도 로직
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
            message: `재시도 중... (${retryCountRef.current}/${maxRetries})`,
          }));

          // 지연 후 재시도 (메모리 누수 방지를 위한 AbortController 고려)
          await new Promise(resolve => setTimeout(resolve, retryDelay));

          return executeWithRetry(...params);
        }

        setState({
          loading: false,
          error: errorMessage,
          success: false,
          progress: 0,
          message: errorMessage,
        });

        if (showErrorMessage) {
          message.error(errorMessage);
        }

        retryCountRef.current = 0;

        return null;
      }
    },
    [
      showErrorMessage,
      showSuccessMessage,
      successMessage,
      maxRetries,
      retryDelay,
    ]
  );

  const retry = useCallback(async (): Promise<TData | null> => {
    if (!lastParamsRef.current) {
      const errorMessage = '재시도할 작업이 없습니다.';

      setState(prev => ({
        ...prev,
        error: errorMessage,
        message: errorMessage,
      }));

      return null;
    }

    return executeWithRetry(...lastParamsRef.current);
  }, [executeWithRetry]);

  // 컴포넌트 언마운트 시 작업 취소
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    state,
    execute: executeWithRetry,
    reset,
    retry,
    cancel,
  };
};
