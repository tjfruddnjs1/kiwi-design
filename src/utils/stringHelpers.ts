/**
 * String Helper Utilities
 * 문자열 처리를 위한 중앙화된 유틸리티
 */

import React from 'react';

/**
 * 텍스트를 지정된 길이로 자르고 말줄임표 추가
 * @param text 원본 텍스트
 * @param maxLength 최대 길이 (기본값: 50)
 * @param ellipsis 말줄임표 (기본값: '...')
 * @returns 잘린 텍스트
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number = 50,
  ellipsis: string = '...'
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * 텍스트를 중간에서 자르기 (ID, 해시값 등에 유용)
 * @param text 원본 텍스트
 * @param startLength 시작 부분 길이 (기본값: 6)
 * @param endLength 끝 부분 길이 (기본값: 6)
 * @param separator 구분자 (기본값: '...')
 * @returns 중간이 잘린 텍스트
 */
export function truncateMiddle(
  text: string,
  startLength: number = 6,
  endLength: number = 6,
  separator: string = '...'
): string {
  if (!text || text.length <= startLength + endLength) return text;

  const start = text.substring(0, startLength);
  const end = text.substring(text.length - endLength);
  return `${start}${separator}${end}`;
}

/**
 * 텍스트 자르기를 위한 CSS 스타일 반환
 * @param maxWidth 최대 너비 (기본값: 200)
 * @returns CSS 스타일 객체
 */
export function getTruncationStyles(
  maxWidth: number | string = 200
): React.CSSProperties {
  return {
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
}

/**
 * 문자열이 비어있는지 확인 (null, undefined, 빈 문자열, 공백만 있는 경우)
 * @param str 확인할 문자열
 * @returns 비어있는지 여부
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 문자열이 비어있지 않은지 확인
 * @param str 확인할 문자열
 * @returns 비어있지 않은지 여부
 */
export function isNotEmpty(str: string | null | undefined): boolean {
  return !isEmpty(str);
}

/**
 * 첫 글자를 대문자로 변환
 * @param str 원본 문자열
 * @returns 첫 글자가 대문자인 문자열
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 카멜케이스를 단어로 분리 (예: "camelCase" -> "Camel Case")
 * @param str 카멜케이스 문자열
 * @returns 분리된 문자열
 */
export function camelCaseToWords(str: string): string {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * 스네이크케이스를 단어로 분리 (예: "snake_case" -> "Snake Case")
 * @param str 스네이크케이스 문자열
 * @returns 분리된 문자열
 */
export function snakeCaseToWords(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * 문자열에서 HTML 태그 제거
 * @param str HTML이 포함된 문자열
 * @returns HTML 태그가 제거된 문자열
 */
export function stripHtml(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * 바이트 크기를 읽기 쉬운 형식으로 변환
 * @param bytes 바이트 크기
 * @param decimals 소수점 자리수 (기본값: 2)
 * @returns 형식화된 크기 문자열
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 숫자를 천 단위 콤마로 형식화
 * @param num 숫자
 * @returns 콤마가 추가된 문자열
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 문자열 배열을 자연스러운 문장으로 결합
 * @param items 문자열 배열
 * @param conjunction 연결어 (기본값: '및')
 * @returns 결합된 문자열
 */
export function joinNaturally(
  items: string[],
  conjunction: string = '및'
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return `${allButLast} ${conjunction} ${last}`;
}

/**
 * URL에서 도메인 추출
 * @param url URL 문자열
 * @returns 도메인 또는 빈 문자열
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Invalid URL format - return empty string as fallback
    return '';
  }
}

/**
 * 이메일 주소 유효성 검사
 * @param email 이메일 주소
 * @returns 유효한 이메일 여부
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 문자열에서 숫자만 추출
 * @param str 원본 문자열
 * @returns 숫자만 포함된 문자열
 */
export function extractNumbers(str: string): string {
  return str.replace(/\D/g, '');
}
