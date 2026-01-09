/**
 * Security Shared Components
 * 보안 분석 관련 공통 컴포넌트 내보내기
 */

// 기존 컴포넌트
export { EmptyState } from './EmptyState';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { ExecutionLogs } from './ExecutionLogs';
export { SecurityResultLayout } from './SecurityResultLayout';

// 통일된 디자인 시스템 컴포넌트
export {
  SeveritySummaryCard,
  VulnerabilitySummaryHeader,
} from './SeveritySummaryCard';
export type { SeverityCounts } from './SeveritySummaryCard';

export { VulnerabilityCard, VulnerabilityListItem } from './VulnerabilityCard';
export type {
  SastVulnerabilityProps,
  ScaVulnerabilityProps,
  DastVulnerabilityProps,
  VulnerabilityCardProps,
} from './VulnerabilityCard';

// 테마 및 스타일 유틸리티
export {
  severityColors,
  severityLabels,
  severityLabelsKo,
  severityOrder,
  spacing,
  borderRadius,
  shadows,
  cardStyles,
  tabStyles,
  tagStyles,
  sectionTitleStyles,
  statisticStyles,
  emptyStateStyles,
  parseSeverity,
  getSeverityTagColor,
  formatNumber,
} from './securityTheme';
export type { SeverityLevel } from './securityTheme';

// 레이아웃 타입
export type { SecurityResultLayoutProps } from './SecurityResultLayout';

// 스캔 진행 상태 표시 컴포넌트
export { ScanningBanner, ScanningOverlayWrapper } from './ScanningBanner';
export type {
  ScanningBannerProps,
  ScanningOverlayWrapperProps,
} from './ScanningBanner';
