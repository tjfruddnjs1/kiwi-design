import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Spin,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Alert,
  Tabs,
  Empty,
  Space,
  Collapse,
  Descriptions,
} from 'antd';
import {
  SafetyOutlined,
  BugOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  CodeOutlined,
  RightOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { gitApi } from '../../lib/api/gitRepository';
import type { SastResultData, SarifResult } from '../../types/sast';
import type { GitRepository } from '../../pages/gits/GitManagement';
import { CategorizedVulnerabilityView, SbomResultContent } from '../security';
import ScanProgressOverlay from '../common/ScanProgressOverlay';
import SastParamsModal from './SastParamsModal';
import type { SastScanParams } from './SastParamsModal';
// 통일된 디자인 시스템 컴포넌트
import {
  SeveritySummaryCard,
  severityColors,
  cardStyles,
  spacing,
  borderRadius,
  parseSeverity,
  getSeverityTagColor,
  severityLabels,
  ScanningBanner,
  ScanningOverlayWrapper,
} from '../security/shared';

const { Text } = Typography;
const { TabPane } = Tabs;

// Types for backend-provided data
interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface BackendSummary {
  severity_counts?: SeverityCounts;
  security_score?: number;
  grade?: string;
}

interface BackendCategory {
  name: string;
  count: number;
}

interface BackendHotSpot {
  file: string;
  finding_count: number;
  priority?: number;
}

interface SecurityMetricsResult {
  severity: SeverityCounts;
  categoriesCount: Record<string, number>;
  hotSpots: Array<{ file: string; count: number; priority: number }>;
  total: number;
  scoreRaw: number;
  grade: string;
  trend: string;
}

interface SastResultContentProps {
  repoId?: number; // repo_id (선택적, serviceId가 없을 때 사용)
  serviceId?: number; // service_id (우선순위가 더 높음, DB에서 이것으로 조회)
  repoName?: string;
  repoUrl?: string; // Git 저장소 URL (SBOM 생성 시 필요)
  serviceName?: string; // 알림에 표시될 서비스명
  onStartScan?: () => Promise<void> | void;
  onScanStateChange?: (
    state: 'idle' | 'analyzing' | 'completed' | 'failed'
  ) => void;
  onClose?: () => void; // 백그라운드 실행 시 모달 닫기 콜백
  //  [추가] 외부에서 데이터를 주입받을 수 있도록 (dashboard 버전 통합)
  sastResult?: SastResultData | null;
  loading?: boolean;
  showTabs?: boolean; // 탭 표시 여부 (기본값: true)
}

/**
 * SAST 분석 결과 콘텐츠 (모달 없이 직접 렌더링용)
 * GitManagement의 "정적 코드 분석" 탭에서 사용
 *
 *  두 가지 사용 방식 지원:
 * 1. 자체 데이터 로딩: repoId/serviceId만 전달 → 컴포넌트가 자체적으로 데이터 로딩
 * 2. 외부 데이터 주입: sastResult, loading 전달 → 외부에서 관리된 데이터 사용 (dashboard/modal 사용)
 *
 * Note: DB의 sast_results 테이블은 service_id를 사용합니다.
 * serviceId가 제공되면 우선적으로 사용하고, 없으면 repoId를 사용합니다.
 */
const SastResultContent: React.FC<SastResultContentProps> = ({
  repoId,
  serviceId,
  repoUrl,
  serviceName,
  onStartScan,
  onScanStateChange,
  onClose,
  sastResult: externalSastResult, //  prop으로 받은 결과 (외부 관리)
  loading: externalLoading, //  prop으로 받은 로딩 상태
  showTabs = true, //  탭 표시 여부 (기본값: true)
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalSastResult, setInternalSastResult] =
    useState<SastResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<
    'checklist' | 'details' | 'info' | 'sbom'
  >('checklist');
  const [sastParamsModalOpen, setSastParamsModalOpen] = useState(false);
  const [repoInfo, setRepoInfo] = useState<{
    gitUrl: string;
    branch: string;
  } | null>(null);

  //  외부 prop 우선, 없으면 내부 state 사용
  const loading =
    externalLoading !== undefined ? externalLoading : internalLoading;
  const sastResult =
    externalSastResult !== undefined ? externalSastResult : internalSastResult;

  const fetchSastResult = useCallback(async () => {
    //  외부에서 데이터를 주입받는 경우에는 fetch하지 않음
    if (externalSastResult !== undefined) return;

    // serviceId가 있으면 우선 사용, 없으면 repoId 사용
    const idToUse = serviceId || repoId;
    if (!idToUse) return;

    setInternalLoading(true);
    setError(null);

    try {
      const response = await gitApi.getSastResult(idToUse);
      const data = response?.data as
        | SastResultData
        | { status: string }
        | undefined;

      if (!data) {
        setInternalSastResult(null);
        setError('정적 코드 분석 결과를 찾을 수 없습니다.');
        return;
      }

      // 백엔드가 반환하는 형식:
      // { semgrep: {...}, codeql: {...}, status: "completed",
      //   semgrep_command_log: "...", codeql_command_log: "...",
      //   summary: {...}, categories: [...], hot_spots: [...], history: [...] }

      if (data.status === 'not_found') {
        setInternalSastResult(null);
        setError('정적 코드 분석 결과를 찾을 수 없습니다.');
        return;
      }

      // Type guard for SastResultData
      const sastData = data as SastResultData;
      if (
        sastData.semgrep !== undefined ||
        sastData.codeql !== undefined ||
        sastData.status !== undefined
      ) {
        // 백엔드가 제공하는 데이터를 그대로 사용
        const resultWithLogs: SastResultData = {
          semgrep: sastData.semgrep,
          codeql: sastData.codeql,
          status: sastData.status,
          // 백엔드가 제공하는 summary, categories, hot_spots, history 포함
          summary: sastData.summary,
          categories: sastData.categories,
          hot_spots: sastData.hot_spots,
          history: sastData.history,
          executionLogs: {
            semgrep: sastData.semgrep_command_log || '',
            codeql: sastData.codeql_command_log || '',
          },
        };

        setInternalSastResult(resultWithLogs);
      } else {
        setInternalSastResult(null);
        setError('정적 코드 분석 결과를 찾을 수 없습니다.');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '알 수 없는 오류';
      setError(
        '정적 코드 분석 결과를 불러오는 중 오류가 발생했습니다: ' + errorMessage
      );
    } finally {
      setInternalLoading(false);
    }
  }, [serviceId, repoId, externalSastResult]);

  //  [수정] 무한 루프 방지: fetchSastResult를 의존성에서 제거
  // serviceId나 repoId가 변경될 때만 fetch 실행
  const prevIdRef = useRef<{ serviceId?: number; repoId?: number }>({});

  useEffect(() => {
    const idToUse = serviceId || repoId;
    const prevId = prevIdRef.current.serviceId || prevIdRef.current.repoId;

    // ID가 변경되었을 때만 fetch
    if (idToUse && idToUse !== prevId) {
      prevIdRef.current = { serviceId, repoId };
      void fetchSastResult();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, repoId]);

  // 서비스 정보 조회 (Git URL, 브랜치)
  useEffect(() => {
    const fetchRepoInfo = async () => {
      const idToUse = serviceId || repoId;
      if (!idToUse) return;

      try {
        const response = await gitApi.getRepoById(idToUse);
        if (response.success && response.data) {
          const repo = response.data as GitRepository;
          setRepoInfo({
            gitUrl: repo.gitlabUrl || repoUrl || '',
            branch: repo.gitlabBranch || 'main',
          });
        }
      } catch (error) {
        // 서비스 정보 조회 실패 시 repoUrl 사용
        if (repoUrl) {
          setRepoInfo({
            gitUrl: repoUrl,
            branch: 'main',
          });
        }
      }
    };

    void fetchRepoInfo();
  }, [serviceId, repoId, repoUrl]);

  // 스캔하기 버튼 클릭 핸들러 (파라미터 모달 열기)
  const handleStartScan = useCallback(() => {
    setSastParamsModalOpen(true);
  }, []);

  // 파라미터 모달 확인 핸들러
  const handleSastParamsConfirm = useCallback(
    async (params: SastScanParams) => {
      setSastParamsModalOpen(false);

      const targetRepoId = serviceId || repoId;
      if (!targetRepoId) {
        setError('스캔을 시작할 수 없습니다: Repository ID가 없습니다.');
        return;
      }

      // 서비스 정보에서 Git URL과 브랜치 가져오기
      if (!repoInfo || !repoInfo.gitUrl) {
        setError('Git 저장소 정보가 없습니다. 서비스 설정을 확인해주세요.');
        return;
      }

      setIsScanning(true);
      setScanStartTime(new Date());
      setError(null);

      // 스캔 시작 상태를 상위 컴포넌트에 알림
      onScanStateChange?.('analyzing');

      try {
        // SAST 스캔 실행 (서비스 정보의 Git URL/브랜치 사용)
        await gitApi.executeSastScan({
          repo_id: targetRepoId,
          git_url: repoInfo.gitUrl,
          branch: repoInfo.branch,
          git_token: undefined, // 서비스 정보에 저장된 토큰 사용 (백엔드에서 처리)
          generate_sbom: params.generate_sbom,
          license_analysis: params.license_analysis,
        });

        // 스캔 완료 후 결과를 다시 가져오기
        void fetchSastResult();

        // 스캔 완료 상태를 상위 컴포넌트에 알림
        onScanStateChange?.('completed');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '알 수 없는 오류';
        setError('정적 코드 분석 중 오류가 발생했습니다: ' + errorMessage);

        // 스캔 실패 상태를 상위 컴포넌트에 알림
        onScanStateChange?.('failed');
      } finally {
        setIsScanning(false);
        setScanStartTime(null);
      }
    },
    [serviceId, repoId, repoInfo, onScanStateChange, fetchSastResult]
  );

  // 백그라운드 실행 핸들러 (모달 닫기)
  const handleRunInBackground = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // tmp 경로 정리 헬퍼 함수
  const cleanTmpPath = (path: string): string => {
    if (!path) return path;
    // /tmp/로 시작하는 경로에서 /tmp/tmpXXXXX/ 부분을 제거
    // 예: /tmp/tmpc5si/k8s/app.yaml -> /k8s/app.yaml
    const tmpRegex = /^\/tmp\/[^/]+\//;
    return path.replace(tmpRegex, '/');
  };

  // SARIF 데이터 파싱 함수
  const parseSarifData = (sarifJson: string) => {
    try {
      const sarif = JSON.parse(sarifJson);
      const results = sarif.runs?.[0]?.results || [];

      // 🔍 SARIF 구조 디버깅
      if (results.length > 0) {
        // SARIF structure validation
      }

      //  비표준 SARIF 형식을 표준 형식으로 정규화
      // 실제 데이터: { rule: { id, level, message }, locations }
      // 표준 형식: { ruleId, level, message: { text }, locations }
      const normalizedResults = results.map((issue: SarifResult) => {
        // 이미 표준 형식이면 그대로 반환
        if (
          issue.ruleId &&
          issue.message &&
          typeof issue.message === 'object'
        ) {
          return issue;
        }

        // 비표준 형식 감지: rule 객체가 있는 경우
        if (issue.rule) {
          return {
            ruleId: issue.rule.id || issue.rule.name || 'unknown',
            level: issue.rule.level || 'note',
            message: {
              text:
                typeof issue.rule.message === 'string'
                  ? issue.rule.message
                  : (issue.rule.message as { text?: string })?.text ||
                    'No description',
            },
            locations: issue.locations || [],
            // properties가 있으면 포함
            properties: issue.rule.properties || issue.properties || {},
            // 기타 필드 복사
            ...issue,
          };
        }

        // 기본값 반환
        return issue;
      });

      return normalizedResults;
    } catch (_e) {
      return [];
    }
  };

  // SARIF에서 심각도/카테고리/파일별 집계 계산
  const aggregateSecurityMetrics = useCallback((): SecurityMetricsResult => {
    // 백엔드가 summary/categories/hot_spots를 제공하면 우선 사용
    const beSummary = sastResult?.summary as BackendSummary | undefined;
    const beCategories = sastResult?.categories as
      | BackendCategory[]
      | undefined;
    const beHotSpots = sastResult?.hot_spots as BackendHotSpot[] | undefined;
    const beHistory = sastResult?.history || [];

    // 백엔드 데이터가 유효한 경우에만 사용 (빈 객체가 아닌지 확인)
    const hasSummary =
      beSummary &&
      beSummary.severity_counts &&
      Object.keys(beSummary.severity_counts).length > 0;
    const hasCategories =
      beCategories && Array.isArray(beCategories) && beCategories.length > 0;
    const hasHotSpots =
      beHotSpots && Array.isArray(beHotSpots) && beHotSpots.length > 0;

    if (hasSummary && hasCategories && hasHotSpots) {
      const sev = beSummary.severity_counts || {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      // 트렌드 계산(최근 2회 점수 비교)
      let trendLabel = 'N/A';
      if (beHistory && beHistory.length >= 2) {
        const latest = Number(beHistory[0]?.security_score || 0);
        const prev = Number(beHistory[1]?.security_score || 0);
        if (latest > prev)
          trendLabel = 'decreasing'; // 취약점 감소 → 점수 증가
        else if (latest < prev) trendLabel = 'increasing';
        else trendLabel = 'flat';
      }

      return {
        severity: {
          critical: sev.critical || 0,
          high: sev.high || 0,
          medium: sev.medium || 0,
          low: sev.low || 0,
        },
        categoriesCount: Object.fromEntries(
          beCategories.map((c: BackendCategory) => [c.name, c.count])
        ),
        hotSpots: beHotSpots.map((h: BackendHotSpot, idx: number) => ({
          file: h.file,
          count: h.finding_count,
          priority: h.priority ?? idx + 1,
        })),
        total:
          (sev.critical || 0) +
          (sev.high || 0) +
          (sev.medium || 0) +
          (sev.low || 0),
        scoreRaw: beSummary.security_score ?? 0,
        grade: beSummary.grade ?? 'N/A',
        trend: trendLabel,
      };
    }

    const semgrepIssues = parseSarifData(
      sastResult?.semgrep?.results?.sarif_json || '[]'
    );
    const codeqlIssues = parseSarifData(
      sastResult?.codeql?.results?.sarif_json || '[]'
    );
    const allIssues = [...semgrepIssues, ...codeqlIssues];

    type Counters = {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    const severity: Counters = { critical: 0, high: 0, medium: 0, low: 0 };
    const categoriesCount: Record<string, number> = {};
    const fileCount: Record<string, number> = {};

    const norm = (s: string) => s?.toLowerCase?.() || '';

    //  개선된 심각도 매핑 함수 - 여러 경로에서 심각도 추출
    const extractSeverity = (issue: SarifResult): string => {
      // 1. issue.level 시도
      if (issue.level && typeof issue.level === 'string') {
        return issue.level;
      }

      // 2. properties.securitySeverity 시도
      if (issue.properties?.securitySeverity) {
        return issue.properties.securitySeverity;
      }

      // 3. properties['security-severity'] 시도
      if (issue.properties?.['security-severity']) {
        return issue.properties['security-severity'];
      }

      // 4. rank 시도 (CodeQL에서 사용)
      if (issue.rank) {
        return issue.rank;
      }

      // 5. properties.severity 시도
      if (issue.properties?.severity) {
        return issue.properties.severity;
      }

      // 6. tags에서 severity 관련 정보 추출
      if (issue.properties?.tags && Array.isArray(issue.properties.tags)) {
        const severityTag = issue.properties.tags.find(
          (tag: string) =>
            typeof tag === 'string' &&
            (tag.includes('critical') ||
              tag.includes('high') ||
              tag.includes('medium') ||
              tag.includes('low'))
        );
        if (severityTag) {
          return severityTag;
        }
      }

      return 'low'; // 기본값
    };

    const mapSeverity = (lvl: string): keyof Counters => {
      const v = norm(lvl);
      if (v === 'error' || v === 'critical' || v.includes('critical'))
        return 'critical';
      if (v === 'warning' || v === 'high' || v.includes('high')) return 'high';
      if (
        v === 'note' ||
        v === 'medium' ||
        v === 'moderate' ||
        v.includes('medium')
      )
        return 'medium';
      return 'low';
    };

    allIssues.forEach((issue: SarifResult, _index: number) => {
      const extractedLevel = extractSeverity(issue);
      const sevKey = mapSeverity(extractedLevel);
      severity[sevKey] += 1;

      const rawUri =
        issue.locations?.[0]?.physicalLocation?.artifactLocation?.uri ||
        'unknown';
      const uri = cleanTmpPath(rawUri);
      fileCount[uri] = (fileCount[uri] || 0) + 1;

      //  개선된 카테고리 추출
      const catCandidates: string[] = [];

      // 1. ruleId 추가
      if (issue.ruleId && typeof issue.ruleId === 'string') {
        catCandidates.push(issue.ruleId);
      }

      // 2. properties.tags 추가 (배열일 수도 있고 문자열일 수도 있음)
      if (issue.properties?.tags) {
        const tags = issue.properties.tags;
        if (Array.isArray(tags)) {
          catCandidates.push(
            ...tags.filter(
              (tag: unknown): tag is string => typeof tag === 'string'
            )
          );
        } else if (typeof tags === 'string') {
          catCandidates.push(
            ...(tags as string).split(',').map((t: string) => t.trim())
          );
        }
      }

      // 3. properties.kind 추가
      if (issue.properties?.kind) {
        catCandidates.push(issue.properties.kind);
      }

      // 4. properties.problem.category 추가
      if (issue.properties?.problem?.category) {
        catCandidates.push(issue.properties.problem.category);
      }

      // 5. properties.cwe.id 추가
      if (issue.properties?.cwe?.id) {
        catCandidates.push(issue.properties.cwe.id);
      }

      // 6. properties['precision'] 추가 (CodeQL)
      if (issue.properties?.precision) {
        catCandidates.push(issue.properties.precision);
      }

      // 카테고리 매핑 및 집계
      catCandidates.filter(Boolean).forEach((c: string) => {
        const key = norm(c);
        if (!key || key.length < 2) return; // 너무 짧은 키는 무시

        // 대표 카테고리 매핑
        let mapped = c; // 기본값은 원본 유지

        if (key.includes('sql') || key.includes('sqli')) {
          mapped = 'SQL Injection';
        } else if (key.includes('xss') || key.includes('cross-site')) {
          mapped = 'XSS';
        } else if (
          key.includes('auth') ||
          key.includes('access') ||
          key.includes('authorization')
        ) {
          mapped = 'Authentication/Authorization';
        } else if (
          key.includes('secret') ||
          key.includes('credential') ||
          key.includes('token') ||
          key.includes('hardcoded')
        ) {
          mapped = 'Hardcoded Secrets';
        } else if (key.includes('injection')) {
          mapped = 'Injection';
        } else if (key.includes('csrf') || key.includes('cross-site-request')) {
          mapped = 'CSRF';
        } else if (key.includes('crypto') || key.includes('encryption')) {
          mapped = 'Cryptography';
        } else if (key.includes('path') && key.includes('traversal')) {
          mapped = 'Path Traversal';
        } else if (key.startsWith('cwe-') || key.startsWith('cwe')) {
          mapped = c.toUpperCase(); // CWE는 대문자로
        } else if (key.includes('security') || key.includes('vulnerability')) {
          // 너무 일반적인 카테고리는 ruleId 사용
          if (issue.ruleId) {
            mapped = issue.ruleId;
          }
        }

        categoriesCount[mapped] = (categoriesCount[mapped] || 0) + 1;
      });
    });

    const hotSpots = Object.entries(fileCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count], index) => ({ file, count, priority: index + 1 }));

    const total = Object.values(severity).reduce((a, b) => a + b, 0);
    // 단순 등급 계산: 가중치 기반 (Critical*4 + High*3 + Medium*2 + Low*1)
    const scoreRaw =
      total === 0
        ? 100
        : Math.max(
            0,
            100 -
              (severity.critical * 4 +
                severity.high * 3 +
                severity.medium * 2 +
                severity.low * 1) *
                3
          );
    const grade =
      scoreRaw >= 90
        ? 'A'
        : scoreRaw >= 80
          ? 'B'
          : scoreRaw >= 70
            ? 'C'
            : scoreRaw >= 60
              ? 'D'
              : 'E';

    return {
      severity,
      categoriesCount,
      hotSpots,
      total,
      scoreRaw,
      grade,
      trend: 'N/A',
    };
  }, [sastResult]);

  // SAST 상세 뷰 렌더링
  const renderSastDetailView = (type: 'semgrep' | 'codeql') => {
    const detailData =
      type === 'semgrep' ? sastResult?.semgrep : sastResult?.codeql;
    if (!detailData || !detailData.results)
      return <Alert message='상세 데이터가 없습니다.' type='warning' />;

    const issues = parseSarifData(detailData.results.sarif_json);

    //  이슈별로 실제 존재하는 정보만 추출하는 헬퍼 함수
    const extractIssueDetails = (issue: SarifResult) => {
      // 메시지 추출 (여러 경로 시도, 데이터가 없으면 null)
      const message =
        issue.message?.text ||
        issue.message?.markdown ||
        issue.shortDescription?.text ||
        issue.fullDescription?.text ||
        issue.help?.text ||
        null;

      // 규칙 ID 추출 (여러 경로 시도)
      const ruleId = issue.ruleId || issue.rule?.id || issue.id || null;

      // 심각도 추출 및 정규화
      let level =
        issue.level ||
        issue.properties?.securitySeverity ||
        issue.properties?.severity ||
        issue.rank ||
        null;

      // 심각도 정규화 (백엔드와 동일한 로직 적용)
      if (level) {
        const normalizedLevel = level.toLowerCase();
        if (normalizedLevel === 'error') level = 'critical';
        else if (normalizedLevel === 'warning') level = 'high';
        else if (normalizedLevel === 'note' || normalizedLevel === 'moderate')
          level = 'medium';
        else if (normalizedLevel === 'info') level = 'low';
      }

      // 위치 정보 추출 (tmp 경로 정리)
      const rawLocation =
        issue.locations?.[0]?.physicalLocation?.artifactLocation?.uri || null;
      const location = rawLocation ? cleanTmpPath(rawLocation) : null;

      // 라인 번호 추출
      const startLine =
        issue.locations?.[0]?.physicalLocation?.region?.startLine || null;

      const endLine =
        issue.locations?.[0]?.physicalLocation?.region?.endLine || null;

      // CWE 정보 추출
      let cwe: string | null = null;
      if (issue.properties?.cwe?.id) {
        cwe = issue.properties.cwe.id;
      } else if (issue.cwe) {
        cwe = typeof issue.cwe === 'string' ? issue.cwe : issue.cwe.id;
      } else if (issue.properties?.tags) {
        const cweTag = issue.properties.tags.find?.(
          (tag: string) =>
            typeof tag === 'string' && tag.toUpperCase().startsWith('CWE')
        );
        if (cweTag) cwe = cweTag;
      }

      // 수정 제안 추출
      const fix =
        issue.fixes?.[0]?.description?.text || issue.properties?.fix || null;

      // 심각도 점수 (CodeQL 등에서 제공)
      const severityScore =
        issue.properties?.['security-severity'] ||
        issue.properties?.securitySeverity ||
        null;

      // 카테고리/태그 추출 (실제 배열이 있을 때만)
      let tags: string[] = [];
      if (issue.properties?.tags && Array.isArray(issue.properties.tags)) {
        tags = issue.properties.tags.filter(
          (tag: unknown): tag is string => typeof tag === 'string'
        );
      } else if (issue.tags && Array.isArray(issue.tags)) {
        tags = issue.tags.filter(
          (tag: unknown): tag is string => typeof tag === 'string'
        );
      }

      // 도움말 텍스트
      const helpText = issue.help?.text || issue.properties?.help || null;

      return {
        message,
        ruleId,
        level,
        location,
        startLine,
        endLine,
        cwe,
        fix,
        severityScore,
        tags,
        helpText,
      };
    };

    // 통일된 디자인 시스템 적용
    return (
      <div>
        {/* 간단한 요약 바 - 통일된 스타일 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.lg,
            padding: `${spacing.md}px ${spacing.lg}px`,
            background: '#f8fafc',
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
            border: '1px solid #e2e8f0',
          }}
        >
          <Space>
            <BugOutlined style={{ color: '#64748b' }} />
            <Text strong>{detailData.results.total_findings}건 발견</Text>
          </Space>
          <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
          <Space>
            {detailData.success ? (
              <CheckCircleOutlined style={{ color: '#22c55e' }} />
            ) : (
              <WarningOutlined style={{ color: '#ef4444' }} />
            )}
            <Text type='secondary'>
              {detailData.success ? '분석 완료' : '분석 실패'}
            </Text>
          </Space>
          {detailData.summary?.analysis_time && (
            <>
              <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
              <Text type='secondary' style={{ fontSize: 12 }}>
                {Number(detailData.summary.analysis_time).toFixed(1)}초
              </Text>
            </>
          )}
        </div>

        {issues.length === 0 ? (
          <Alert
            message='보안 취약점 없음'
            type='success'
            showIcon
            style={{ borderRadius: borderRadius.lg }}
          />
        ) : (
          <div style={{ maxHeight: 550, overflow: 'auto' }}>
            {issues.map((issue: SarifResult, index: number) => {
              const details = extractIssueDetails(issue);
              const severity = parseSeverity(details.level || 'low');
              const colors = severityColors[severity];

              return (
                <Card
                  key={index}
                  size='small'
                  style={cardStyles.vulnerabilityDetail(severity)}
                  styles={{
                    header: cardStyles.vulnerabilityDetailHeader(severity),
                    body: { padding: spacing.lg },
                  }}
                  title={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: spacing.sm,
                      }}
                    >
                      <Space size={spacing.sm}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: colors.primary,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          {index + 1}
                        </div>
                        <Tag
                          color={getSeverityTagColor(severity)}
                          style={{ margin: 0 }}
                        >
                          {severityLabels[severity]}
                        </Tag>
                        <Text strong style={{ fontSize: 14 }}>
                          {details.ruleId || `Issue #${index + 1}`}
                        </Text>
                      </Space>
                      <Space size={4}>
                        {details.cwe && (
                          <Tag color='volcano' style={{ margin: 0 }}>
                            {details.cwe}
                          </Tag>
                        )}
                      </Space>
                    </div>
                  }
                >
                  <Space
                    direction='vertical'
                    size={spacing.md}
                    style={{ width: '100%' }}
                  >
                    {/* 설명 */}
                    {details.message && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#595959',
                          display: 'block',
                          lineHeight: 1.6,
                        }}
                      >
                        {details.message.length > 300
                          ? `${details.message.slice(0, 300)}...`
                          : details.message}
                      </Text>
                    )}

                    {/* 위치 정보 */}
                    <Descriptions size='small' column={2}>
                      {details.location && (
                        <Descriptions.Item
                          label={
                            <Space>
                              <FileTextOutlined />
                              파일
                            </Space>
                          }
                          span={2}
                        >
                          <Text code style={{ fontSize: 12 }}>
                            {details.location}
                            {details.startLine && `:${details.startLine}`}
                            {details.endLine &&
                              details.endLine !== details.startLine &&
                              `-${details.endLine}`}
                          </Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {/* 태그 */}
                    {details.tags && details.tags.length > 0 && (
                      <Collapse
                        ghost
                        expandIcon={({ isActive }) => (
                          <RightOutlined
                            rotate={isActive ? 90 : 0}
                            style={{ fontSize: 10 }}
                          />
                        )}
                        items={[
                          {
                            key: '1',
                            label: (
                              <Space>
                                <CodeOutlined />
                                <Text style={{ fontSize: 13 }}>
                                  관련 태그 ({details.tags.length})
                                </Text>
                              </Space>
                            ),
                            children: (
                              <Space wrap size={4}>
                                {details.tags.map((tag: string, i: number) => (
                                  <Tag key={i} style={{ margin: 0 }}>
                                    {tag}
                                  </Tag>
                                ))}
                              </Space>
                            ),
                          },
                        ]}
                      />
                    )}

                    {/* 수정 제안 */}
                    {details.fix && (
                      <div
                        style={{
                          background: '#f6ffed',
                          padding: spacing.md,
                          borderRadius: borderRadius.md,
                          border: '1px solid #b7eb8f',
                        }}
                      >
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          <CheckCircleOutlined style={{ marginRight: 4 }} />{' '}
                          수정 제안:
                        </Text>
                        <div style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: 12 }}>{details.fix}</Text>
                        </div>
                      </div>
                    )}
                  </Space>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 로그 메시지 파싱 함수
  const parseLogMessages = (
    logData: string | Record<string, unknown> | undefined
  ): string[] => {
    try {
      let parsedData: Record<string, unknown> | null = null;

      // 문자열인 경우 JSON 파싱 시도
      if (typeof logData === 'string') {
        parsedData = JSON.parse(logData) as Record<string, unknown>;
      } else if (logData && typeof logData === 'object') {
        parsedData = logData;
      }

      // full_execution_log.log_messages 추출
      if (parsedData) {
        // 직접 log_messages가 있는 경우
        if (Array.isArray(parsedData.log_messages)) {
          return parsedData.log_messages as string[];
        }

        // full_execution_log 안에 있는 경우
        const fullExecLog = parsedData.full_execution_log as
          | Record<string, unknown>
          | undefined;
        if (
          fullExecLog?.log_messages &&
          Array.isArray(fullExecLog.log_messages)
        ) {
          return fullExecLog.log_messages as string[];
        }

        // git_clone.log_messages가 있는 경우
        const gitClone = parsedData.git_clone as
          | Record<string, unknown>
          | undefined;
        if (gitClone?.log_messages && Array.isArray(gitClone.log_messages)) {
          return gitClone.log_messages as string[];
        }

        // semgrep_analysis.log_messages가 있는 경우
        const semgrepAnalysis = parsedData.semgrep_analysis as
          | Record<string, unknown>
          | undefined;
        if (
          semgrepAnalysis?.log_messages &&
          Array.isArray(semgrepAnalysis.log_messages)
        ) {
          return semgrepAnalysis.log_messages as string[];
        }

        // 여러 로그를 합치는 경우
        const allLogs: string[] = [];
        if (gitClone?.log_messages && Array.isArray(gitClone.log_messages)) {
          allLogs.push(...(gitClone.log_messages as string[]));
        }
        if (
          semgrepAnalysis?.log_messages &&
          Array.isArray(semgrepAnalysis.log_messages)
        ) {
          allLogs.push(...(semgrepAnalysis.log_messages as string[]));
        }
        if (allLogs.length > 0) {
          return allLogs;
        }
      }

      return [];
    } catch (_error) {
      return [];
    }
  };

  // 로그 메시지 렌더링 (콘솔 스타일)
  const renderLogMessage = (message: string, index: number) => {
    // 로그 레벨과 메시지 분리
    const levelMatch = message.match(
      /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (INFO|WARN|ERROR|DEBUG) - (.+)$/
    );

    if (levelMatch) {
      const [, timestamp, level, content] = levelMatch;
      const levelColors = {
        INFO: { text: '#61DAFB', bg: 'rgba(97, 218, 251, 0.1)' },
        WARN: { text: '#FFA500', bg: 'rgba(255, 165, 0, 0.1)' },
        ERROR: { text: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.1)' },
        DEBUG: { text: '#4ECB71', bg: 'rgba(78, 203, 113, 0.1)' },
      }[level] || { text: '#999', bg: 'rgba(153, 153, 153, 0.1)' };

      return (
        <div
          key={index}
          style={{
            marginBottom: '2px',
            padding: '6px 12px',
            background: levelColors.bg,
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#e8e8e8',
          }}
        >
          <span style={{ color: '#666', marginRight: '8px' }}>
            [{timestamp}]
          </span>
          <span
            style={{
              color: levelColors.text,
              fontWeight: 'bold',
              marginRight: '8px',
              padding: '2px 6px',
              borderRadius: '3px',
              background: 'rgba(0, 0, 0, 0.3)',
            }}
          >
            {level}
          </span>
          <span style={{ color: '#e8e8e8' }}>{content}</span>
        </div>
      );
    }

    // 일반 메시지
    return (
      <div
        key={index}
        style={{
          marginBottom: '2px',
          padding: '6px 12px',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#b8b8b8',
        }}
      >
        {message}
      </div>
    );
  };

  // 로그 통계 계산
  const calculateLogStats = (logs: string[]) => {
    const stats = { info: 0, warn: 0, error: 0, debug: 0, total: logs.length };

    logs.forEach(log => {
      if (log.includes(' - INFO - ')) stats.info++;
      else if (log.includes(' - WARN - ')) stats.warn++;
      else if (log.includes(' - ERROR - ')) stats.error++;
      else if (log.includes(' - DEBUG - ')) stats.debug++;
    });

    return stats;
  };

  // SAST 실행 로그 렌더링 (SCA 스타일 - 단순화)
  const renderSastExecutionLogs = () => {
    const executionLogs = sastResult?.executionLogs;
    const semgrepLogs = parseLogMessages(executionLogs?.semgrep);
    const codeqlLogs = parseLogMessages(executionLogs?.codeql);

    // 모든 로그를 하나로 통합
    const allLogs: { tool: string; logs: string[] }[] = [];
    if (semgrepLogs.length > 0) {
      allLogs.push({ tool: 'Semgrep', logs: semgrepLogs });
    }
    if (codeqlLogs.length > 0) {
      allLogs.push({ tool: 'CodeQL', logs: codeqlLogs });
    }

    return (
      <Card title='정적 코드 분석 실행 로그' size='small'>
        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            backgroundColor: '#1e1e1e',
            padding: '16px',
            borderRadius: '4px',
            fontFamily:
              'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#d4d4d4',
          }}
        >
          {allLogs.length > 0 ? (
            allLogs.map((toolLogs, toolIndex) => (
              <div key={toolIndex}>
                <Text
                  strong
                  style={{
                    color: '#fa8c16',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  {toolLogs.tool} 스캔:
                </Text>
                {toolLogs.logs.map((log: string, index: number) => (
                  <pre key={index} style={{ margin: 0, marginBottom: 4 }}>
                    {log}
                  </pre>
                ))}
                {toolIndex < allLogs.length - 1 && (
                  <div
                    style={{ margin: '16px 0', borderTop: '1px solid #333' }}
                  />
                )}
              </div>
            ))
          ) : (
            <div
              style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}
            >
              <Text type='secondary' style={{ color: '#888' }}>
                실행 로그 정보가 없습니다.
              </Text>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* 헤더: 스캔 실행 버튼 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SafetyOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            정적 코드 분석 결과
          </span>
        </div>
        {onStartScan && (
          <Button
            type='primary'
            icon={<PlayCircleOutlined />}
            onClick={handleStartScan}
            disabled={isScanning}
            loading={isScanning}
            size='small'
            style={{ minWidth: '100px' }}
          >
            {isScanning ? '스캔 중...' : '스캔 실행'}
          </Button>
        )}
      </div>

      {/* 본문 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size='large' />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
            정적 코드 분석 결과를 불러오는 중입니다...
          </p>
        </div>
      ) : isScanning && !sastResult ? (
        // 기존 결과가 없을 때만 오버레이 표시
        <ScanProgressOverlay
          scanType='sast'
          visible={isScanning}
          onClose={handleRunInBackground}
          startTime={scanStartTime || undefined}
          serviceName={serviceName}
        />
      ) : error ? (
        <div
          style={{ textAlign: 'center', padding: '60px 0', color: '#ff4d4f' }}
        >
          <BugOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>{error}</p>
        </div>
      ) : !sastResult ? (
        <div style={{ padding: '40px 20px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            imageStyle={{ height: 80 }}
            description={
              <Space
                direction='vertical'
                size='large'
                style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
              >
                <div>
                  <Text
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    정적 코드 분석이 수행되지 않았습니다
                  </Text>
                  <Text type='secondary' style={{ fontSize: '14px' }}>
                    정적 코드 분석을 통해 코드의 보안 취약점을 탐지하세요
                  </Text>
                </div>

                <Card
                  size='small'
                  style={{
                    textAlign: 'left',
                    background: '#f6f8fa',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  <Space
                    direction='vertical'
                    size='middle'
                    style={{ width: '100%' }}
                  >
                    <div>
                      <Text
                        strong
                        style={{
                          fontSize: '14px',
                          display: 'block',
                          marginBottom: '12px',
                        }}
                      >
                        <SafetyOutlined
                          style={{ color: '#1890ff', marginRight: '8px' }}
                        />
                        정적 코드 분석이 제공하는 정보:
                      </Text>
                      <Space
                        direction='vertical'
                        size='small'
                        style={{ width: '100%' }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'flex-start' }}
                        >
                          <CheckCircleOutlined
                            style={{
                              color: '#52c41a',
                              marginRight: '8px',
                              marginTop: '4px',
                            }}
                          />
                          <Text style={{ fontSize: '13px' }}>
                            <Text strong>보안 취약점 탐지:</Text> SQL Injection,
                            XSS, 인증/인가 이슈 등 주요 보안 취약점 자동 탐지
                          </Text>
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'flex-start' }}
                        >
                          <CheckCircleOutlined
                            style={{
                              color: '#52c41a',
                              marginRight: '8px',
                              marginTop: '4px',
                            }}
                          />
                          <Text style={{ fontSize: '13px' }}>
                            <Text strong>코드 품질 분석:</Text> Semgrep과 CodeQL
                            엔진을 사용한 정밀한 정적 분석
                          </Text>
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'flex-start' }}
                        >
                          <CheckCircleOutlined
                            style={{
                              color: '#52c41a',
                              marginRight: '8px',
                              marginTop: '4px',
                            }}
                          />
                          <Text style={{ fontSize: '13px' }}>
                            <Text strong>보안 점수 산출:</Text> 발견된 취약점을
                            기반으로 보안 등급(A~E) 제공
                          </Text>
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'flex-start' }}
                        >
                          <CheckCircleOutlined
                            style={{
                              color: '#52c41a',
                              marginRight: '8px',
                              marginTop: '4px',
                            }}
                          />
                          <Text style={{ fontSize: '13px' }}>
                            <Text strong>Hot Spots 파악:</Text> 가장 취약한 파일
                            및 위치를 우선순위별로 제공
                          </Text>
                        </div>
                      </Space>
                    </div>

                    <Alert
                      message='권장사항'
                      description="정기적인 정적 코드 분석을 통해 배포 전 보안 이슈를 사전에 발견하고 해결할 수 있습니다. 상단의 '스캔 실행' 버튼을 클릭하여 첫 분석을 시작하세요."
                      type='info'
                      showIcon
                      icon={<WarningOutlined />}
                      style={{ marginTop: '8px' }}
                    />
                  </Space>
                </Card>

                {onStartScan && (
                  <Button
                    type='primary'
                    size='large'
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartScan}
                    disabled={isScanning}
                    loading={isScanning}
                    style={{ marginTop: '16px' }}
                  >
                    {isScanning ? '스캔 중...' : '지금 스캔 시작하기'}
                  </Button>
                )}
              </Space>
            }
          />
        </div>
      ) : (
        <div>
          {/* 스캔 진행 중일 때 배너 표시 (기존 결과가 있는 경우) */}
          {isScanning && sastResult && (
            <ScanningBanner
              scanType='sast'
              startTime={scanStartTime || undefined}
              targetName={serviceName}
            />
          )}

          {/*  showTabs가 false면 요약만 표시, true면 탭으로 표시 */}
          <ScanningOverlayWrapper isScanning={isScanning}>
            {!showTabs ? (
              // showTabs=false: 요약만 표시 (dashboard/modal 사용)
              <div>
                {/* 취약점 요약 - 통일된 디자인 시스템 적용 */}
                <Card
                  title={
                    <Text strong style={{ fontSize: '15px' }}>
                      취약점 심각도 분석
                    </Text>
                  }
                  size='small'
                  style={{
                    marginBottom: 20,
                    ...cardStyles.base,
                  }}
                >
                  {(() => {
                    const agg = aggregateSecurityMetrics();
                    return (
                      <>
                        <SeveritySummaryCard
                          counts={agg.severity}
                          showProgress={true}
                          total={agg.total}
                        />
                        {agg.trend && agg.trend !== 'N/A' && (
                          <div
                            style={{
                              marginTop: spacing.lg,
                              textAlign: 'center',
                            }}
                          >
                            {(() => {
                              const label = agg.trend;
                              const alertType =
                                label === 'decreasing'
                                  ? 'success'
                                  : label === 'increasing'
                                    ? 'error'
                                    : 'info';
                              return (
                                <Alert
                                  message={`보안 트렌드: ${label === 'decreasing' ? '개선 중' : label === 'increasing' ? '악화됨' : '변화 없음'}`}
                                  type={alertType}
                                  showIcon
                                  style={{
                                    display: 'inline-block',
                                    borderRadius: borderRadius.md,
                                  }}
                                />
                              );
                            })()}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </Card>

                {/* 취약점 카테고리 */}
                <Card
                  title={
                    <Text strong style={{ fontSize: '15px' }}>
                      취약점 카테고리 분포
                    </Text>
                  }
                  size='small'
                  style={{
                    marginBottom: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    borderRadius: '8px',
                  }}
                >
                  {(() => {
                    const { categoriesCount } = aggregateSecurityMetrics();
                    const entries = Object.entries(categoriesCount);
                    const items: Array<[string, number]> = entries.map(
                      ([k, v]) => [k, Number(v)]
                    );
                    items.sort((a, b) => b[1] - a[1]);
                    const top = items.slice(0, 12);
                    return items.length ? (
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
                      >
                        {top.map(([cat, cnt], idx) => (
                          <Tag
                            key={cat}
                            color='geekblue'
                            style={{
                              fontSize: '13px',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontWeight: idx < 3 ? 'bold' : 'normal',
                            }}
                          >
                            {cat}{' '}
                            <span style={{ fontWeight: 'bold' }}>
                              ({Number(cnt)})
                            </span>
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <Text type='secondary'>카테고리 정보가 없습니다</Text>
                        }
                      />
                    );
                  })()}
                </Card>

                {/* Hot Spots */}
                <Card
                  title={
                    <Text strong style={{ fontSize: '15px' }}>
                      Hot Spots (가장 취약한 파일 TOP 5)
                    </Text>
                  }
                  size='small'
                  style={{
                    marginBottom: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    borderRadius: '8px',
                  }}
                >
                  {(() => {
                    const { hotSpots } = aggregateSecurityMetrics();
                    const hs = hotSpots;
                    return hs.length ? (
                      <div>
                        {hs.map(({ file, count }, idx) => (
                          <div
                            key={file}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              background: idx % 2 === 0 ? '#fafafa' : '#ffffff',
                              borderRadius: '4px',
                              marginBottom: '8px',
                              border: '1px solid #f0f0f0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flex: 1,
                              }}
                            >
                              <Tag
                                color={
                                  idx === 0
                                    ? 'red'
                                    : idx === 1
                                      ? 'orange'
                                      : idx === 2
                                        ? 'gold'
                                        : 'default'
                                }
                                style={{
                                  fontWeight: 'bold',
                                  minWidth: '32px',
                                  textAlign: 'center',
                                }}
                              >
                                #{idx + 1}
                              </Tag>
                              <Text
                                style={{ flex: 1, fontSize: '13px' }}
                                ellipsis={{ tooltip: file }}
                              >
                                {file}
                              </Text>
                            </div>
                            <Tag
                              color='red'
                              style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                padding: '4px 12px',
                                borderRadius: '4px',
                              }}
                            >
                              {count} 건
                            </Tag>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <Text type='secondary'>
                            Hot Spots 데이터가 없습니다
                          </Text>
                        }
                      />
                    );
                  })()}
                </Card>
              </div>
            ) : (
              // showTabs=true: 탭으로 표시 (GitManagement 사용)
              <Tabs
                activeKey={activeTab}
                onChange={key =>
                  setActiveTab(key as 'checklist' | 'details' | 'info' | 'sbom')
                }
                style={{ marginBottom: 16 }}
              >
                {/* 취약점 카테고리 분류 (메인 탭) */}
                <TabPane
                  tab={
                    <span>
                      <CheckSquareOutlined style={{ marginRight: 6 }} />
                      취약점 카테고리 분류
                    </span>
                  }
                  key='checklist'
                >
                  {/* SAST 정보 배너 */}
                  <Alert
                    type='info'
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message={
                      <span style={{ fontWeight: 600 }}>
                        정적 코드 분석 (SAST)
                      </span>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 12, color: '#666' }}>
                          CWE(Common Weakness Enumeration) 기반의 소스코드 보안
                          약점 분류입니다. Semgrep과 CodeQL 스캐너를 통해 발견된
                          취약점들이 위험도에 따라 분류됩니다.
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>주요 카테고리:</Text>
                          <div
                            style={{
                              marginTop: 8,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {[
                              { name: '인젝션', color: '#f5222d', icon: '🔐' },
                              { name: 'XSS', color: '#fa8c16', icon: '⚠️' },
                              {
                                name: '인증/허위성',
                                color: '#faad14',
                                icon: '🔑',
                              },
                              {
                                name: '접근통제',
                                color: '#52c41a',
                                icon: '🚪',
                              },
                              {
                                name: '보안설정오류',
                                color: '#1890ff',
                                icon: '⚙️',
                              },
                              { name: 'CSRF', color: '#722ed1', icon: '🎯' },
                              { name: 'SSRF', color: '#eb2f96', icon: '🌐' },
                            ].map(cat => (
                              <Tag
                                key={cat.name}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: 4,
                                  border: `1px solid ${cat.color}`,
                                  background: `${cat.color}10`,
                                  color: cat.color,
                                }}
                              >
                                <span style={{ marginRight: 4 }}>
                                  {cat.icon}
                                </span>
                                {cat.name}
                              </Tag>
                            ))}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#888' }}>
                          <strong>분석 도구:</strong> Semgrep (오픈소스 패턴
                          기반 분석), CodeQL (시맨틱 코드 분석)
                        </div>
                      </div>
                    }
                  />
                  <CategorizedVulnerabilityView
                    repoId={serviceId || repoId || 0}
                    onRefresh={() => fetchSastResult()}
                    analysisType='sast'
                  />
                </TabPane>

                {/* 취약점 상세 (Semgrep + CodeQL 통합) */}
                <TabPane
                  tab={
                    <span>
                      <BugOutlined style={{ marginRight: 6 }} />
                      취약점 상세
                    </span>
                  }
                  key='details'
                >
                  {/* 도구별 탭 */}
                  <Tabs
                    type='card'
                    size='small'
                    items={[
                      ...(sastResult?.semgrep?.results
                        ? [
                            {
                              key: 'semgrep',
                              label: (
                                <Space size={6}>
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: '#22c55e',
                                      display: 'inline-block',
                                    }}
                                  />
                                  <span>Semgrep</span>
                                  <Tag
                                    color='green'
                                    style={{ margin: 0, fontSize: 11 }}
                                  >
                                    {sastResult.semgrep.results
                                      .total_findings || 0}
                                  </Tag>
                                </Space>
                              ),
                              children: renderSastDetailView('semgrep'),
                            },
                          ]
                        : []),
                      ...(sastResult?.codeql?.results
                        ? [
                            {
                              key: 'codeql',
                              label: (
                                <Space size={6}>
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: '#3b82f6',
                                      display: 'inline-block',
                                    }}
                                  />
                                  <span>CodeQL</span>
                                  <Tag
                                    color='blue'
                                    style={{ margin: 0, fontSize: 11 }}
                                  >
                                    {sastResult.codeql.results.total_findings ||
                                      0}
                                  </Tag>
                                </Space>
                              ),
                              children: renderSastDetailView('codeql'),
                            },
                          ]
                        : []),
                    ]}
                  />

                  {/* 분석 결과가 없는 경우 */}
                  {!sastResult?.semgrep?.results &&
                    !sastResult?.codeql?.results && (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <Text type='secondary'>분석 결과가 없습니다</Text>
                        }
                      />
                    )}
                </TabPane>

                {/* 분석 정보 (DAST, SCA와 동일한 구조) */}
                <TabPane
                  tab={
                    <span>
                      <SafetyOutlined style={{ marginRight: 6 }} />
                      분석 정보
                    </span>
                  }
                  key='info'
                >
                  {/* 스캔 요약 정보 */}
                  <Card
                    title={
                      <span>
                        <SafetyOutlined style={{ marginRight: 8 }} />
                        스캔 요약
                      </span>
                    }
                    size='small'
                    style={{ marginBottom: 16, borderRadius: 8 }}
                  >
                    {(() => {
                      const agg = aggregateSecurityMetrics();
                      return (
                        <Row gutter={[16, 16]}>
                          <Col span={6}>
                            <Statistic
                              title='총 취약점'
                              value={agg.total}
                              valueStyle={{
                                color: agg.total > 0 ? '#ff4d4f' : '#52c41a',
                              }}
                              prefix={
                                agg.total > 0 ? (
                                  <WarningOutlined />
                                ) : (
                                  <CheckCircleOutlined />
                                )
                              }
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title='CRITICAL / HIGH'
                              value={agg.severity.critical + agg.severity.high}
                              valueStyle={{ color: '#ff4d4f' }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title='MEDIUM'
                              value={agg.severity.medium}
                              valueStyle={{ color: '#fa8c16' }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title='LOW'
                              value={agg.severity.low}
                              valueStyle={{ color: '#1890ff' }}
                            />
                          </Col>
                        </Row>
                      );
                    })()}
                    {(() => {
                      const agg = aggregateSecurityMetrics();
                      return (
                        agg.grade &&
                        agg.grade !== 'N/A' && (
                          <div
                            style={{
                              marginTop: 12,
                              color: '#666',
                              fontSize: 13,
                            }}
                          >
                            <SafetyOutlined style={{ marginRight: 6 }} />
                            보안 등급:{' '}
                            <Tag
                              color={
                                agg.grade === 'A'
                                  ? 'green'
                                  : agg.grade === 'B'
                                    ? 'blue'
                                    : agg.grade === 'C'
                                      ? 'gold'
                                      : 'red'
                              }
                            >
                              {agg.grade}
                            </Tag>
                            (점수: {agg.scoreRaw}점)
                          </div>
                        )
                      );
                    })()}
                  </Card>

                  {/* Hot Spots - 시각화된 바 차트 */}
                  <Card
                    title={
                      <span>
                        <WarningOutlined
                          style={{ marginRight: 8, color: '#ef4444' }}
                        />
                        Hot Spots (취약점 집중 파일 TOP 5)
                      </span>
                    }
                    size='small'
                    style={{
                      marginBottom: 16,
                      borderRadius: 8,
                    }}
                  >
                    {(() => {
                      const { hotSpots } = aggregateSecurityMetrics();
                      const maxCount = Math.max(
                        ...hotSpots.map(h => h.count),
                        1
                      );

                      return hotSpots.length ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {hotSpots.map(({ file, count }, idx) => {
                            const percent = Math.round(
                              (count / maxCount) * 100
                            );
                            const colors = [
                              '#ef4444',
                              '#f97316',
                              '#eab308',
                              '#22c55e',
                              '#3b82f6',
                            ];
                            const barColor = colors[idx] || '#94a3b8';

                            return (
                              <div key={file}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: barColor,
                                        color: '#fff',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <Text
                                      style={{
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                      }}
                                      ellipsis={{ tooltip: file }}
                                    >
                                      {file}
                                    </Text>
                                  </div>
                                  <Tag
                                    style={{
                                      background: barColor,
                                      color: '#fff',
                                      border: 'none',
                                      fontWeight: 600,
                                      fontSize: 12,
                                    }}
                                  >
                                    {count}건
                                  </Tag>
                                </div>
                                <div
                                  style={{
                                    height: 8,
                                    background: '#e5e7eb',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${percent}%`,
                                      height: '100%',
                                      background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}99 100%)`,
                                      borderRadius: 4,
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={
                            <Text type='secondary'>
                              Hot Spots 데이터가 없습니다
                            </Text>
                          }
                          style={{ padding: '20px 0' }}
                        />
                      );
                    })()}
                  </Card>

                  {/* 실행 로그 */}
                  <Card
                    title={
                      <span>
                        <PlayCircleOutlined style={{ marginRight: 8 }} />
                        실행 로그
                      </span>
                    }
                    size='small'
                    style={{ borderRadius: 8 }}
                  >
                    {renderSastExecutionLogs()}
                  </Card>
                </TabPane>

                {/* SBOM / 라이선스 분석 */}
                <TabPane
                  tab={
                    <span>
                      <FileSearchOutlined style={{ marginRight: 6 }} />
                      SBOM / 라이선스
                    </span>
                  }
                  key='sbom'
                >
                  <SbomResultContent
                    serviceId={serviceId || repoId || 0}
                    onRefresh={() => fetchSastResult()}
                    sbomType='source'
                  />
                </TabPane>
              </Tabs>
            )}
          </ScanningOverlayWrapper>
        </div>
      )}

      {/* SAST 파라미터 모달 */}
      <SastParamsModal
        visible={sastParamsModalOpen}
        onClose={() => setSastParamsModalOpen(false)}
        onConfirm={handleSastParamsConfirm}
        initialGitUrl={repoUrl}
        hideGitFields={true}
      />
    </div>
  );
};

export default SastResultContent;
