/**
 * Security Helpers
 * 보안 분석 관련 유틸리티 함수들
 */

import type {
  SeverityLevel,
  SeverityBreakdown,
  SecurityAnalysisType,
} from '../types/securityModals';

// ============================================================================
// 심각도 관련
// ============================================================================

/**
 * 심각도 색상 반환
 */
export function getSeverityColor(severity: SeverityLevel): string {
  const normalizedSeverity = severity.toLowerCase() as SeverityLevel;

  const colorMap: Record<SeverityLevel, string> = {
    critical: '#a8071a',
    high: '#cf1322',
    medium: '#fa8c16',
    low: '#1890ff',
    info: '#52c41a',
  };

  return colorMap[normalizedSeverity] || '#8c8c8c';
}

/**
 * 심각도 정렬 순서 반환 (높은 것이 우선)
 */
export function getSeverityOrder(severity: SeverityLevel): number {
  const normalizedSeverity = severity.toLowerCase();

  const orderMap: Record<string, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
    unknown: 0,
  };

  return orderMap[normalizedSeverity] || 0;
}

/**
 * 심각도 레이블 반환
 */
export function getSeverityLabel(severity: SeverityLevel): string {
  const normalizedSeverity = severity.toLowerCase();

  const labelMap: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
    info: 'INFO',
  };

  return labelMap[normalizedSeverity] || severity.toUpperCase();
}

/**
 * 심각도별로 취약점 정렬
 */
export function sortBySeverity<T extends { severity: string }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) =>
      getSeverityOrder(b.severity as SeverityLevel) -
      getSeverityOrder(a.severity as SeverityLevel)
  );
}

// ============================================================================
// 통계 계산
// ============================================================================

/**
 * 심각도 분류 통계 계산
 */
export function calculateSeverityBreakdown<T extends { severity: string }>(
  items: T[]
): SeverityBreakdown {
  const breakdown: SeverityBreakdown = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  items.forEach(item => {
    const severity = item.severity.toLowerCase();
    if (severity === 'critical')
      breakdown.critical = (breakdown.critical || 0) + 1;
    else if (severity === 'high') breakdown.high += 1;
    else if (severity === 'medium') breakdown.medium += 1;
    else if (severity === 'low') breakdown.low += 1;
    else breakdown.info = (breakdown.info || 0) + 1;
  });

  return breakdown;
}

/**
 * 총 취약점 수 계산
 */
export function getTotalVulnerabilities(breakdown: SeverityBreakdown): number {
  return (
    (breakdown.critical || 0) +
    breakdown.high +
    breakdown.medium +
    breakdown.low +
    (breakdown.info || 0)
  );
}

/**
 * 위험 점수 계산 (가중치 기반)
 */
export function calculateRiskScore(breakdown: SeverityBreakdown): number {
  const weights = {
    critical: 10,
    high: 7,
    medium: 4,
    low: 2,
    info: 1,
  };

  return (
    (breakdown.critical || 0) * weights.critical +
    breakdown.high * weights.high +
    breakdown.medium * weights.medium +
    breakdown.low * weights.low +
    (breakdown.info || 0) * weights.info
  );
}

// ============================================================================
// 분석 타입 관련
// ============================================================================

/**
 * 분석 타입 표시명 반환
 */
export function getAnalysisTypeLabel(type: SecurityAnalysisType): string {
  const labels: Record<SecurityAnalysisType, string> = {
    sast: 'SAST (정적 분석)',
    sca: 'SCA (의존성 분석)',
    dast: 'DAST (동적 분석)',
    sbom: 'SBOM (구성요소 분석)',
  };

  return labels[type];
}

/**
 * 분석 타입 설명 반환
 */
export function getAnalysisTypeDescription(type: SecurityAnalysisType): string {
  const descriptions: Record<SecurityAnalysisType, string> = {
    sast: '소스 코드를 분석하여 보안 취약점을 찾는 정적 분석 도구',
    sca: 'Docker 컨테이너 이미지 및 의존성의 취약점을 분석',
    dast: '웹 애플리케이션의 동적 보안 취약점을 스캔',
    sbom: 'Software Bill of Materials - 소프트웨어 구성요소 및 라이선스 분석',
  };

  return descriptions[type];
}

// ============================================================================
// 데이터 변환
// ============================================================================

/**
 * 에러 객체에서 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * SARIF 데이터 파싱
 */
export function parseSarifData(sarifJson: string): any[] {
  try {
    const sarif = JSON.parse(sarifJson);
    const results = sarif.runs?.[0]?.results || [];
    return results.map((result: any, index: number) => ({
      id: index + 1,
      ruleId: result.rule?.id || result.ruleId || '',
      message: result.rule?.message || result.message?.text || '',
      level:
        result.rule?.level ||
        result.properties?.severity ||
        result.level ||
        'warning',
      locations:
        result.locations?.map((loc: any) => ({
          file: loc.physicalLocation?.artifactLocation?.uri || '',
          startLine: loc.physicalLocation?.region?.startLine || 0,
          endLine: loc.physicalLocation?.region?.endLine || 0,
        })) || [],
    }));
  } catch (err) {
    console.error('SARIF 파싱 오류:', err);
    return [];
  }
}

/**
 * 실행 로그 메시지 파싱
 */
export function parseLogMessages(logData: any): string[] {
  try {
    let parsedData = logData;

    // 문자열인 경우 JSON 파싱 시도
    if (typeof logData === 'string') {
      parsedData = JSON.parse(logData);
    }

    // full_execution_log 안에 있는 경우
    if (parsedData && typeof parsedData === 'object') {
      // 직접 log_messages가 있는 경우
      if (Array.isArray(parsedData.log_messages)) {
        return parsedData.log_messages;
      }

      // full_execution_log 안에 있는 경우
      if (parsedData.full_execution_log?.log_messages) {
        return parsedData.full_execution_log.log_messages;
      }

      // 여러 로그를 합치는 경우
      const allLogs: string[] = [];
      if (parsedData.git_clone?.log_messages) {
        allLogs.push(...parsedData.git_clone.log_messages);
      }
      if (parsedData.semgrep_analysis?.log_messages) {
        allLogs.push(...parsedData.semgrep_analysis.log_messages);
      }
      if (parsedData.trivy_scan?.log_messages) {
        allLogs.push(...parsedData.trivy_scan.log_messages);
      }
      if (parsedData.zap_scan?.log_messages) {
        allLogs.push(...parsedData.zap_scan.log_messages);
      }
      if (allLogs.length > 0) {
        return allLogs;
      }
    }

    return [];
  } catch (error) {
    console.error('로그 메시지 파싱 오류:', error);
    return [];
  }
}

// ============================================================================
// 포맷팅
// ============================================================================

/**
 * 시간을 읽기 쉬운 형식으로 변환
 */
export function formatScanTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}초`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}분 ${remainingSeconds}초`;
}

/**
 * 숫자를 축약된 형태로 변환 (예: 1000 -> 1K)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// ============================================================================
// 검증
// ============================================================================

/**
 * URL 유효성 검증
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Git URL 유효성 검증
 */
export function isValidGitUrl(url: string): boolean {
  const gitUrlPattern = /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[\w.-]+)*\.git$/;
  return gitUrlPattern.test(url) || isValidUrl(url);
}
