/**
 * Security Analysis Unified Design System
 * 보안 분석 결과 화면 통일 디자인 시스템
 *
 * 이 파일은 SAST, SCA, DAST 모든 보안 분석 결과 화면에서
 * 일관된 UI/UX를 제공하기 위한 디자인 상수와 스타일을 정의합니다.
 */

import type { CSSProperties } from 'react';

/**
 * 심각도 레벨 정의
 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * 심각도별 색상 팔레트
 * - primary: 메인 텍스트 및 강조 색상
 * - background: 배경 그라데이션 시작 색상
 * - backgroundEnd: 배경 그라데이션 끝 색상
 * - border: 테두리 색상
 * - light: 연한 배경색 (태그, 배지용)
 */
export const severityColors: Record<
  SeverityLevel,
  {
    primary: string;
    background: string;
    backgroundEnd: string;
    border: string;
    light: string;
  }
> = {
  critical: {
    primary: '#cf1322',
    background: '#fff1f0',
    backgroundEnd: '#ffccc7',
    border: '#ffa39e',
    light: '#fff2f0',
  },
  high: {
    primary: '#d46b08',
    background: '#fff7e6',
    backgroundEnd: '#ffd591',
    border: '#ffc069',
    light: '#fff7e6',
  },
  medium: {
    primary: '#d48806',
    background: '#fffbe6',
    backgroundEnd: '#fff1b8',
    border: '#ffe58f',
    light: '#fffbe6',
  },
  low: {
    primary: '#389e0d',
    background: '#f6ffed',
    backgroundEnd: '#d9f7be',
    border: '#b7eb8f',
    light: '#f6ffed',
  },
  info: {
    primary: '#096dd9',
    background: '#e6f7ff',
    backgroundEnd: '#bae7ff',
    border: '#91d5ff',
    light: '#e6f7ff',
  },
};

/**
 * 심각도별 라벨
 */
export const severityLabels: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

/**
 * 심각도별 한글 라벨
 */
export const severityLabelsKo: Record<SeverityLevel, string> = {
  critical: '치명적',
  high: '높음',
  medium: '중간',
  low: '낮음',
  info: '정보',
};

/**
 * 심각도 순서 (높은 순)
 */
export const severityOrder: SeverityLevel[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

/**
 * 공통 간격 상수
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * 공통 테두리 반경
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

/**
 * 그림자 스타일
 */
export const shadows = {
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  cardHover: '0 4px 12px rgba(0, 0, 0, 0.12)',
  modal: '0 6px 16px rgba(0, 0, 0, 0.15)',
} as const;

/**
 * 공통 카드 스타일
 */
export const cardStyles = {
  /** 기본 카드 스타일 */
  base: {
    borderRadius: borderRadius.lg,
    boxShadow: shadows.card,
  } as CSSProperties,

  /** 심각도 요약 카드 스타일 */
  severitySummary: (severity: SeverityLevel): CSSProperties => ({
    borderRadius: borderRadius.lg,
    border: `2px solid ${severityColors[severity].border}`,
    background: `linear-gradient(135deg, ${severityColors[severity].background} 0%, ${severityColors[severity].backgroundEnd} 100%)`,
    textAlign: 'center',
    transition: 'all 0.3s ease',
  }),

  /** 취약점 상세 카드 스타일 */
  vulnerabilityDetail: (severity: SeverityLevel): CSSProperties => ({
    borderRadius: borderRadius.lg,
    border: `2px solid ${severityColors[severity].border}`,
    boxShadow: shadows.card,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  }),

  /** 취약점 상세 카드 헤더 스타일 */
  vulnerabilityDetailHeader: (severity: SeverityLevel): CSSProperties => ({
    background: `linear-gradient(135deg, ${severityColors[severity].background} 0%, ${severityColors[severity].backgroundEnd} 100%)`,
    borderBottom: `2px solid ${severityColors[severity].border}`,
    padding: `${spacing.md}px ${spacing.lg}px`,
  }),

  /** 정보 카드 스타일 (분석 정보, 메타데이터 등) */
  info: {
    borderRadius: borderRadius.lg,
    border: '1px solid #f0f0f0',
    boxShadow: shadows.card,
    background: '#fafafa',
  } as CSSProperties,
};

/**
 * 탭 스타일
 */
export const tabStyles = {
  /** 메인 탭 컨테이너 */
  container: {
    marginTop: spacing.lg,
  } as CSSProperties,
};

/**
 * 태그 스타일
 */
export const tagStyles = {
  /** 심각도 태그 스타일 */
  severity: (severity: SeverityLevel): CSSProperties => ({
    borderRadius: borderRadius.sm,
    fontWeight: 600,
    border: `1px solid ${severityColors[severity].border}`,
    background: severityColors[severity].light,
    color: severityColors[severity].primary,
  }),
};

/**
 * 섹션 타이틀 스타일
 */
export const sectionTitleStyles = {
  main: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: spacing.md,
    color: '#262626',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  } as CSSProperties,

  sub: {
    fontSize: 14,
    fontWeight: 500,
    marginBottom: spacing.sm,
    color: '#595959',
  } as CSSProperties,
};

/**
 * 통계 값 스타일
 */
export const statisticStyles = {
  /** 심각도 통계 값 스타일 */
  severityValue: (severity: SeverityLevel): CSSProperties => ({
    color: severityColors[severity].primary,
    fontSize: 28,
    fontWeight: 'bold',
  }),

  /** 심각도 통계 타이틀 스타일 */
  severityTitle: (severity: SeverityLevel): CSSProperties => ({
    color: severityColors[severity].primary,
    fontWeight: 600,
    fontSize: 13,
  }),
};

/**
 * 빈 상태 스타일
 */
export const emptyStateStyles = {
  container: {
    padding: `${spacing.xxl}px 0`,
    textAlign: 'center',
  } as CSSProperties,
};

/**
 * 심각도 문자열을 SeverityLevel 타입으로 변환
 */
export function parseSeverity(severity: string | undefined): SeverityLevel {
  if (!severity) return 'info';
  const lower = severity.toLowerCase();
  if (lower === 'critical' || lower === 'error') return 'critical';
  if (lower === 'high' || lower === 'warning') return 'high';
  if (lower === 'medium') return 'medium';
  if (lower === 'low' || lower === 'note') return 'low';
  return 'info';
}

/**
 * 심각도에 따른 Ant Design Tag 색상 반환
 */
export function getSeverityTagColor(severity: SeverityLevel): string {
  const colorMap: Record<SeverityLevel, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'gold',
    low: 'green',
    info: 'blue',
  };
  return colorMap[severity];
}

/**
 * 숫자를 천 단위 콤마 포맷으로 변환
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
