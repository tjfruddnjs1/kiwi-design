/**
 * Date Helper Utilities
 * 날짜 형식화 및 처리를 위한 중앙화된 유틸리티
 */

export type DateFormat = 'short' | 'long' | 'datetime' | 'time' | 'relative';

/**
 * 애플리케이션 전체에서 일관된 날짜 형식 반환
 * @param date 날짜 문자열 또는 Date 객체
 * @param format 날짜 형식 타입
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 형식화된 날짜 문자열
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: DateFormat = 'short',
  locale: 'ko-KR' | 'en-US' = 'ko-KR'
): string {
  if (!date || date === 'null' || date === 'undefined') {
    return '-';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return '-';
    }

    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString(locale);

      case 'long':
        return dateObj.toLocaleDateString(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

      case 'datetime':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(dateObj);

      case 'time':
        return dateObj.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

      case 'relative':
        return formatRelativeTime(dateObj);

      default:
        return dateObj.toLocaleDateString(locale);
    }
  } catch {
    // Fallback to string representation on error
    return String(date);
  }
}

/**
 * 상대적 시간 형식 반환 (예: "2분 전", "3시간 전")
 * @param date 날짜 객체 또는 문자열
 * @returns 상대적 시간 문자열
 */
export function formatRelativeTime(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - dateObj.getTime()) / 1000
    );

    if (diffInSeconds < 60) return '방금 전';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}일 전`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}개월 전`;

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}년 전`;
  } catch {
    // Fallback on error
    return '확인 안됨';
  }
}

/**
 * 날짜가 유효한지 확인
 * @param dateString 날짜 문자열
 * @param daysValid 유효 기간 (일 단위, 기본값: 365)
 * @returns 날짜 유효성 여부
 */
export function isDateValid(
  dateString: string | undefined,
  daysValid: number = 365
): boolean {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    const now = Date.now();
    const validPeriod = daysValid * 24 * 60 * 60 * 1000;

    return now - date.getTime() < validPeriod;
  } catch {
    return false;
  }
}

/**
 * 두 날짜 사이의 일 수 계산
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 일 수
 */
export function getDaysBetween(
  startDate: string | Date,
  endDate: string | Date = new Date()
): number {
  try {
    const start =
      typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const diffInMs = end.getTime() - start.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * 날짜가 과거인지 확인
 * @param date 날짜 문자열 또는 객체
 * @returns 과거 날짜 여부
 */
export function isPastDate(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.getTime() < Date.now();
  } catch {
    return false;
  }
}

/**
 * 날짜가 미래인지 확인
 * @param date 날짜 문자열 또는 객체
 * @returns 미래 날짜 여부
 */
export function isFutureDate(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.getTime() > Date.now();
  } catch {
    return false;
  }
}

/**
 * ISO 8601 형식으로 날짜 반환
 * @param date 날짜 객체 또는 문자열
 * @returns ISO 8601 형식 문자열
 */
export function toISOString(date: Date | string = new Date()): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  } catch {
    return '';
  }
}

/**
 * 현재 시간을 반환
 * @param format 날짜 형식 타입
 * @returns 형식화된 현재 시간
 */
export function getCurrentTime(format: DateFormat = 'datetime'): string {
  return formatDate(new Date(), format);
}

/**
 * 날짜 시간을 full/short 형식으로 반환
 * 파이프라인 UI 등에서 사용
 * @param dateString 날짜 문자열
 * @returns { full: 'YYYY-MM-DD HH:mm', short: 'MM.DD HH:mm' }
 */
export function formatDateTime(dateString: string | null | undefined): {
  full: string;
  short: string;
} {
  if (!dateString) {
    return { full: '-', short: '-' };
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return { full: '-', short: '-' };
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return {
      full: `${year}-${month}-${day} ${hours}:${minutes}`,
      short: `${month}.${day} ${hours}:${minutes}`,
    };
  } catch {
    return { full: '-', short: '-' };
  }
}

/**
 * 날짜 시간을 간단한 문자열로 반환 (단일 형식)
 * BuildStatistics 등에서 사용
 * @param dateTimeStr 날짜 문자열
 * @returns 'YYYY-MM-DD HH:mm' 형식 문자열
 */
export function formatDateTimeSimple(
  dateTimeStr: string | null | undefined
): string {
  if (!dateTimeStr) {
    return '-';
  }

  try {
    const date = new Date(dateTimeStr);

    if (isNaN(date.getTime())) {
      return dateTimeStr;
    }

    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return dateTimeStr;
  }
}
