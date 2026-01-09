/**
 * useSecurityScan Hook
 * 보안 분석 스캔 공통 로직을 관리하는 훅
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SecurityAnalysisType, ScanState } from '../types/securityModals';

export interface UseSecurityScanOptions<T> {
  /** 분석 타입 */
  analysisType: SecurityAnalysisType;
  /** Repository ID */
  repoId: number;
  /** 결과 조회 함수 */
  fetchFn: () => Promise<T>;
  /** 모달 표시 여부 */
  visible?: boolean;
  /** 자동 조회 여부 */
  autoFetch?: boolean;
}

export interface UseSecurityScanReturn<T> {
  /** 로딩 상태 */
  loading: boolean;
  /** 스캔 결과 */
  result: T | null;
  /** 에러 메시지 */
  error: string | null;
  /** 스캔 진행 중 여부 */
  isScanning: boolean;
  /** 스캔 상태 */
  scanState: ScanState;
  /** 결과 조회 함수 */
  fetchResult: () => Promise<void>;
  /** 스캔 시작 */
  startScan: () => void;
  /** 스캔 완료 */
  completeScan: (data?: T) => void;
  /** 스캔 실패 */
  failScan: (errorMessage?: string) => void;
  /** 에러 초기화 */
  clearError: () => void;
  /** 결과 초기화 */
  clearResult: () => void;
}

/**
 * 보안 스캔 공통 훅
 *
 * @example
 * ```tsx
 * const { loading, result, error, fetchResult, startScan } = useSecurityScan({
 *   analysisType: 'sast',
 *   repoId: 123,
 *   fetchFn: () => gitApi.getSastResult(123),
 *   visible: true,
 * });
 * ```
 */
export function useSecurityScan<T>({
  analysisType,
  repoId,
  fetchFn,
  visible = false,
  autoFetch = true,
}: UseSecurityScanOptions<T>): UseSecurityScanReturn<T> {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');

  /**
   * 결과 조회
   */
  const fetchResult = useCallback(async () => {
    if (!repoId) {
      setError('Repository ID가 필요합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFn();
      setResult(data);
      setScanState('completed');
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `${analysisType.toUpperCase()} 결과를 불러오는 중 오류가 발생했습니다.`;
      setError(errorMessage);
      setScanState('failed');
    } finally {
      setLoading(false);
    }
  }, [repoId, fetchFn, analysisType]);

  /**
   * 스캔 시작
   */
  const startScan = useCallback(() => {
    setIsScanning(true);
    setScanState('analyzing');
    setError(null);
  }, []);

  /**
   * 스캔 완료
   */
  const completeScan = useCallback((data?: T) => {
    setIsScanning(false);
    setScanState('completed');
    if (data) {
      setResult(data);
    }
  }, []);

  /**
   * 스캔 실패
   */
  const failScan = useCallback(
    (errorMessage?: string) => {
      setIsScanning(false);
      setScanState('failed');
      setError(
        errorMessage ||
          `${analysisType.toUpperCase()} 스캔 실행 중 오류가 발생했습니다.`
      );
    },
    [analysisType]
  );

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 결과 초기화
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setScanState('idle');
  }, []);

  /**
   * 모달이 열릴 때 자동으로 결과 조회
   * - fetchResult를 의존성에서 제거하여 무한 루프 방지
   * - visible이 true로 변경될 때만 호출
   */
  const prevVisibleRef = useRef(visible);

  useEffect(() => {
    // visible이 false -> true로 변경될 때만 fetch
    const wasHidden = !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (
      visible &&
      wasHidden &&
      autoFetch &&
      !loading &&
      !isScanning &&
      repoId
    ) {
      fetchResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoFetch, repoId]);

  return {
    loading,
    result,
    error,
    isScanning,
    scanState,
    fetchResult,
    startScan,
    completeScan,
    failScan,
    clearError,
    clearResult,
  };
}

/**
 * 간단한 로딩 상태 관리 훅
 */
export function useLoadingState(initialState = false) {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);

  return { loading, startLoading, stopLoading, setLoading };
}

/**
 * 에러 상태 관리 훅
 */
export function useErrorState(initialError: string | null = null) {
  const [error, setError] = useState<string | null>(initialError);

  const clearError = useCallback(() => setError(null), []);
  const setErrorMessage = useCallback(
    (message: string) => setError(message),
    []
  );

  return { error, setError: setErrorMessage, clearError };
}
