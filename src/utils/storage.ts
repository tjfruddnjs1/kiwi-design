/**
 * Storage Helper Utilities
 * localStorage 작업을 위한 타입 안전 래퍼
 */

/**
 * 타입 안전 localStorage 래퍼 클래스
 */
export class LocalStorage {
  /**
   * localStorage에서 항목 가져오기 (타입 안전)
   * @param key 키
   * @returns 값 또는 null
   */
  static get<T = string>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      // JSON 파싱 시도, 실패 시 문자열로 반환
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch {
      // Intentionally swallowing error for graceful degradation
      return null;
    }
  }

  /**
   * localStorage에 항목 저장 (자동 JSON 문자열화)
   * @param key 키
   * @param value 값
   * @returns 성공 여부
   */
  static set<T>(key: string, value: T): boolean {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      return true;
    } catch {
      // Intentionally swallowing error for graceful degradation
      return false;
    }
  }

  /**
   * localStorage에서 항목 제거
   * @param key 키
   * @returns 성공 여부
   */
  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      // Intentionally swallowing error for graceful degradation
      return false;
    }
  }

  /**
   * localStorage 전체 클리어
   * @returns 성공 여부
   */
  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch {
      // Intentionally swallowing error for graceful degradation
      return false;
    }
  }

  /**
   * localStorage에 키가 존재하는지 확인
   * @param key 키
   * @returns 존재 여부
   */
  static has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * localStorage의 모든 키 가져오기
   * @returns 키 배열
   */
  static keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      // Intentionally swallowing error for graceful degradation
      return [];
    }
  }

  /**
   * localStorage 항목 개수
   * @returns 항목 개수
   */
  static size(): number {
    try {
      return localStorage.length;
    } catch {
      // Intentionally swallowing error for graceful degradation
      return 0;
    }
  }
}

// 자주 사용되는 작업을 위한 편의 함수

/**
 * 인증 토큰 가져오기
 * @returns 인증 토큰 또는 null
 */
export const getAuthToken = (): string | null =>
  LocalStorage.get<string>('authToken');

/**
 * 인증 토큰 저장
 * @param token 인증 토큰
 * @returns 성공 여부
 */
export const setAuthToken = (token: string): boolean =>
  LocalStorage.set('authToken', token);

/**
 * 인증 토큰 제거
 * @returns 성공 여부
 */
export const removeAuthToken = (): boolean => LocalStorage.remove('authToken');

/**
 * 사용자 정보 가져오기
 * @returns 사용자 정보 또는 null
 */
export const getUserInfo = <T = unknown>(): T | null =>
  LocalStorage.get<T>('userInfo');

/**
 * 사용자 정보 저장
 * @param userInfo 사용자 정보
 * @returns 성공 여부
 */
export const setUserInfo = <T>(userInfo: T): boolean =>
  LocalStorage.set('userInfo', userInfo);

/**
 * 사용자 정보 제거
 * @returns 성공 여부
 */
export const removeUserInfo = (): boolean => LocalStorage.remove('userInfo');
