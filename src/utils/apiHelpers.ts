/**
 * API 응답 처리를 위한 유틸리티 함수들
 * StandardApiResponse 타입과 일관된 에러 처리를 제공합니다
 */

import { StandardApiResponse } from '../types/shared';
import { logger } from './logger';

/**
 * API 응답의 성공/실패를 확인하고 데이터를 추출하는 헬퍼 함수
 */
export function validateApiResponse<T>(
  response: { data?: StandardApiResponse<T> } | undefined,
  errorContext: string = 'API 요청'
): T {
  // 응답이 없는 경우
  if (!response || !response.data) {
    const errorMessage = `${errorContext}: 응답 데이터가 없습니다`;

    logger.error(errorMessage, new Error(errorMessage));
    throw new Error(errorMessage);
  }

  // API 수준에서 실패한 경우
  if (!response.data.success) {
    const errorMessage = response.data.error || `${errorContext} 실패`;

    logger.error(`${errorContext} 실패:`, new Error(errorMessage));
    throw new Error(errorMessage);
  }

  // 성공했지만 데이터가 없는 경우
  if (response.data.data === undefined || response.data.data === null) {
    const errorMessage = `${errorContext}: 응답 데이터가 없습니다`;

    logger.error(errorMessage, new Error(errorMessage));
    throw new Error(errorMessage);
  }

  return response.data.data;
}

/**
 * API 응답이 성공인지만 확인하는 함수 (데이터 추출 없이)
 */
export function isApiSuccess<T>(
  response: { data?: StandardApiResponse<T> } | undefined
): boolean {
  return response?.data?.success === true;
}

/**
 * API 에러 메시지를 추출하는 함수
 */
export function getApiErrorMessage<T>(
  response: { data?: StandardApiResponse<T> } | undefined,
  defaultMessage: string = '알 수 없는 오류가 발생했습니다'
): string {
  return response?.data?.error || defaultMessage;
}

/**
 * Port 값을 number로 변환하는 헬퍼 함수
 */
export function normalizePort(port: string | number): number {
  if (typeof port === 'number') {
    return port;
  }

  const parsed = parseInt(port, 10);

  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`유효하지 않은 포트 번호: ${port}`);
  }

  return parsed;
}

/**
 * Hops 배열의 port 값들을 number로 정규화하는 함수
 */
export function normalizeHops(
  hops: Array<{
    host: string;
    port: string | number;
    username: string;
    password: string;
  }>
): Array<{
  host: string;
  port: number;
  username: string;
  password: string;
}> {
  return hops.map(hop => ({
    ...hop,
    port: normalizePort(hop.port),
  }));
}
