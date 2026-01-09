import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Spin,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Alert,
  message,
  Select,
  Input,
  Tabs,
} from 'antd';
import {
  SafetyOutlined,
  BugOutlined,
  PlayCircleOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  SecurityScanOutlined,
  CheckSquareOutlined,
  UnorderedListOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import ScanProgressOverlay from '../common/ScanProgressOverlay';
import type { ScanType } from '../common/ScanProgressOverlay';
import { gitApi } from '../../lib/api/gitRepository';
import { isAnalysisApiError, analysisApi } from '../../lib/api/analysis-client';
import type {
  ScaResult,
  DastResult,
  TrivyVulnerability,
  Alert as DastAlert,
  ScaScanParams,
  DastScanParams,
  Vulnerability,
  RegistryConfigInfo,
  SecurityApiResponseData,
  ScaApiResult,
  DastApiResult,
  TrivyScanResultItem,
  TrivyVulnerabilityItem,
  ZapData,
  ExecutionLog,
  DastSummary,
} from '../../types/securityAnalysis';
import { getService } from '../../lib/api/service';
import type {
  SastResultData,
  SarifResult,
  SarifLocation,
  ParsedSarifIssue,
  SarifDocument,
} from '../../types/sast';
import ScaParamsModal from './ScaParamsModal';
import DastParamsModal from './DastParamsModal';
import SastParamsModal, { SastScanParams } from './SastParamsModal';
import { useCredsStore } from '../../stores/useCredsStore';
import { logger } from '../../utils/logger';
//  [추가] 통일된 분석 결과 컴포넌트 import
import SastResultContent from './SastResultContent';
import ScaResultContent from '../dashboard/components/analysis/ScaResultContent';
import DastResultContent from './DastResultContent';
//  [추가] 카테고리화된 취약점 뷰 컴포넌트
import { CategorizedVulnerabilityView, SbomResultContent } from '../security';

const { Text } = Typography;

// SARIF 데이터 파싱 함수
const parseSarifData = (sarifJson: string): ParsedSarifIssue[] => {
  try {
    const sarif: SarifDocument = JSON.parse(sarifJson);
    const results: SarifResult[] = sarif.runs?.[0]?.results || [];
    return results.map((result: SarifResult, index: number) => ({
      id: index + 1,
      ruleId: result.rule?.id || result.ruleId || '',
      message:
        (typeof result.rule?.message === 'string'
          ? result.rule.message
          : result.rule?.message?.text) ||
        result.message?.text ||
        '',
      level:
        result.rule?.level ||
        result.properties?.severity ||
        result.level ||
        'warning',
      locations:
        result.locations?.map((loc: SarifLocation) => ({
          file: loc.physicalLocation?.artifactLocation?.uri || '',
          startLine: loc.physicalLocation?.region?.startLine || 0,
          endLine: loc.physicalLocation?.region?.endLine || 0,
        })) || [],
    }));
  } catch {
    return [];
  }
};

export type SecurityAnalysisType = 'sast' | 'sca' | 'dast' | 'sbom';

interface SecurityResultModalProps {
  visible: boolean;
  onClose: () => void;
  repoId: number;
  repoName?: string;
  repoUrl?: string;
  analysisType: SecurityAnalysisType;
  serviceId?: number; // DAST용 도메인 제한
  infraType?: 'kubernetes' | 'docker' | 'podman'; // DAST 도메인 소스 결정 (K8s: Ingress, Docker: service_domains)
  onScanStateChange?: (
    type: 'sast' | 'sca' | 'dast' | 'sbom',
    state: 'idle' | 'analyzing' | 'completed' | 'failed'
  ) => void;
}

const SecurityResultModal: React.FC<SecurityResultModalProps> = ({
  visible,
  onClose,
  repoId,
  repoName = '저장소',
  repoUrl,
  analysisType,
  serviceId,
  infraType = 'kubernetes',
  onScanStateChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);

  // SAST 필터 상태 (열 별)
  const [semgrepSeverities, setSemgrepSeverities] = useState<string[]>([]);
  const [semgrepQuery, setSemgrepQuery] = useState<string>('');
  const [codeqlSeverities, setCodeqlSeverities] = useState<string[]>([]);
  const [codeqlQuery, setCodeqlQuery] = useState<string>('');
  // SARIF 뷰어 검색 상태 (타입별)
  const [semgrepSarifQuery, setSemgrepSarifQuery] = useState<string>('');
  const [codeqlSarifQuery, setCodeqlSarifQuery] = useState<string>('');

  // 간단한 JSON 하이라이트 유틸 (키/문자열/숫자/불리언 색상)
  const highlightJson = (json: string, keyword?: string) => {
    let safe = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (keyword && keyword.trim()) {
      const re = new RegExp(
        keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi'
      );
      safe = safe.replace(re, m => `__HIGHLIGHT__${m}__ENDH__`);
    }
    safe = safe
      .replace(
        /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"]) *":)/g,
        '<span style="color:#9cdcfe">$1</span>'
      ) // keys
      .replace(/"([^"\\]|\\.)*"/g, '<span style="color:#ce9178">$&</span>') // strings
      .replace(
        /\b(true|false|null)\b/g,
        '<span style="color:#569cd6">$1</span>'
      ) // booleans/null
      .replace(/-?\b\d+(?:\.\d+)?\b/g, '<span style="color:#b5cea8">$&</span>'); // numbers
    if (keyword && keyword.trim()) {
      safe = safe.replace(
        /__HIGHLIGHT__(.*?)__ENDH__/g,
        '<mark style="background:#faad1444">$1</mark>'
      );
    }
    return safe;
  };

  const downloadJson = (filename: string, content: string) => {
    const blob = new Blob([content], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // useCredsStore에서 보안 분석 상태 관리
  const { updateSecurityState, updateSecurityLastUpdate } = useCredsStore();

  // 결과는 API에서 직접 가져오므로 null로 초기화
  const [result, setResult] = useState<
    ScaResult | DastResult | SastResultData | null
  >(null);

  // 파라미터 모달 상태
  const [sastParamsModalOpen, setSastParamsModalOpen] = useState(false);
  const [scaParamsModalOpen, setScaParamsModalOpen] = useState(false);
  const [dastParamsModalOpen, setDastParamsModalOpen] = useState(false);

  //  Registry 인증 정보 상태 (SCA 스캔용)
  const [registryConfig, setRegistryConfig] = useState<
    RegistryConfigInfo | undefined
  >(undefined);

  //  serviceId가 있을 때 서비스 정보에서 registry_config 조회
  useEffect(() => {
    const fetchRegistryConfig = async () => {
      if (serviceId && analysisType === 'sca') {
        try {
          const service = await getService(serviceId);
          if (service.registry_config) {
            const parsed = JSON.parse(service.registry_config);
            setRegistryConfig({
              registry_type:
                parsed.registry_type === 'dockerhub' ? 'dockerhub' : 'harbor',
              registry_url: parsed.registry_url || '',
              username: parsed.username || '',
              password: parsed.password || '',
              project_name: parsed.project_name || '',
            });
          }
        } catch (error) {
          console.error('Registry config 조회 실패:', error);
        }
      }
    };
    void fetchRegistryConfig();
  }, [serviceId, analysisType]);

  // 분석 타입별 설정
  const getAnalysisConfig = () => {
    switch (analysisType) {
      case 'sast':
        return {
          title: 'SAST 분석 결과',
          icon: <SafetyOutlined />,
          emptyIcon: <SafetyOutlined />,
          emptyMessage: 'SAST 분석 결과가 없습니다',
          emptyDescription: '스캔을 시작하여 보안 취약점을 분석해보세요',
          tabs: [
            { key: 'summary', label: '요약' },
            { key: 'semgrep', label: 'Semgrep 상세' },
            { key: 'codeql', label: 'CodeQL 상세' },
            { key: 'logs', label: '실행 로그' },
          ],
        };
      case 'sca':
        return {
          title: 'SCA 분석 결과',
          icon: <ExperimentOutlined />,
          emptyIcon: <ExperimentOutlined />,
          emptyMessage: 'SCA 분석 결과가 없습니다',
          emptyDescription: '스캔을 시작하여 의존성 취약점을 분석해보세요',
          tabs: [
            { key: 'summary', label: '요약' },
            { key: 'vulnerabilities', label: '취약점 목록' },
            { key: 'logs', label: '실행 로그' },
          ],
        };
      case 'dast':
        return {
          title: 'DAST 분석 결과',
          icon: <GlobalOutlined />,
          emptyIcon: <SecurityScanOutlined />,
          emptyMessage: 'DAST 분석 결과가 없습니다',
          emptyDescription:
            '스캔을 시작하여 웹 애플리케이션 취약점을 분석해보세요',
          tabs: [
            { key: 'summary', label: '요약' },
            { key: 'alerts', label: '보안 알림' },
            { key: 'logs', label: '실행 로그' },
          ],
        };
      case 'sbom':
        return {
          title: 'SBOM 분석 결과',
          icon: <FileSearchOutlined />,
          emptyIcon: <FileSearchOutlined />,
          emptyMessage: 'SBOM 분석 결과가 없습니다',
          emptyDescription: 'SCA 스캔을 실행하면 SBOM이 자동으로 생성됩니다',
          tabs: [
            { key: 'sbom', label: 'SBOM 구성요소' },
            { key: 'license', label: '라이선스 분석' },
          ],
        };
      default:
        return {
          title: '보안 분석 결과',
          icon: <SafetyOutlined />,
          emptyIcon: <SafetyOutlined />,
          emptyMessage: '분석 결과가 없습니다',
          emptyDescription: '스캔을 시작하여 보안 취약점을 분석해보세요',
          tabs: [{ key: 'summary', label: '요약' }],
        };
    }
  };

  const config = getAnalysisConfig();

  // 결과 조회 함수
  const fetchResult = useCallback(async () => {
    if (!visible || !repoId) return;

    setLoading(true);
    setError(null);

    try {
      let response;
      switch (analysisType) {
        case 'sast':
          response = await gitApi.getSastResult(repoId);
          break;
        case 'sca':
          response = await gitApi.getScaResult(repoId);
          break;
        case 'dast':
          response = await gitApi.getDastResult(repoId);
          break;
        case 'sbom':
          // SBOM은 SbomResultContent 컴포넌트가 자체적으로 데이터를 가져옴
          // 결과 표시를 위해 placeholder 설정
          setResult({ sbom: true } as unknown as ScaResult);
          setLoading(false);
          return;
        default:
          throw new Error('지원하지 않는 분석 타입입니다.');
      }

      const rawData = response.data ? response.data : response;
      const data = rawData as SecurityApiResponseData;

      if (data.status === 'completed') {
        if (analysisType === 'sca' && data.result) {
          const result = data.result as ScaApiResult;

          if (
            result.tool === 'trivy' &&
            result.result &&
            result.result.scan_result
          ) {
            const scanResult = result.result.scan_result;

            let vulnerabilities: Vulnerability[] = [];
            if (scanResult.results && Array.isArray(scanResult.results)) {
              scanResult.results.forEach((res: TrivyScanResultItem) => {
                if (res.vulnerabilities && Array.isArray(res.vulnerabilities)) {
                  vulnerabilities = vulnerabilities.concat(
                    res.vulnerabilities.map((vuln: TrivyVulnerabilityItem) => ({
                      name: vuln.pkg_name,
                      version: vuln.installed_version,
                      severity: vuln.severity as Vulnerability['severity'],
                      description: vuln.description,
                      cve: vuln.vulnerability_id,
                      fix_available: !!vuln.fixed_version,
                      fixed_version: vuln.fixed_version,
                      references: vuln.references,
                    }))
                  );
                }
              });
            }

            const severityBreakdown = {
              high: vulnerabilities.filter(v => {
                const sev = String(v.severity).toLowerCase();
                return sev === 'high' || sev === 'critical';
              }).length,
              medium: vulnerabilities.filter(v => {
                const sev = String(v.severity).toLowerCase();
                return sev === 'medium';
              }).length,
              low: vulnerabilities.filter(v => {
                const sev = String(v.severity).toLowerCase();
                return sev === 'low';
              }).length,
              info: vulnerabilities.filter(v => {
                const sev = String(v.severity).toLowerCase();
                return sev === 'info' || sev === 'unknown';
              }).length,
            };

            // [수정] API 응답의 최상위 레벨에 있는 'execution_log'를 사용합니다.
            const executionLog: ExecutionLog = data.execution_log ||
              result.execution_logs ||
              result.summary?.execution_logs || {
                log_messages: [],
                total_duration: 0,
              };

            const enhancedScaResult: ScaResult = {
              ...result,
              vulnerabilities: vulnerabilities,
              dependencies: [],
              summary: {
                total_vulnerabilities: vulnerabilities.length,
                total_dependencies: 0,
                severity_breakdown: severityBreakdown,
                scan_time:
                  data.summary?.scan_time || result.summary?.scan_time || 0,
              },
              execution_log: executionLog,
            };

            setResult(enhancedScaResult);
          } else {
            setResult(result as unknown as ScaResult);
          }
        } else if (analysisType === 'dast' && data.result) {
          const result = data.result as DastApiResult;

          // DB에서 가져온 DAST 결과 파싱 - 실제 저장된 구조에 맞게 수정
          let zapData: ZapData = {};
          let executionLog: ExecutionLog = {
            log_messages: [],
            total_duration: 0,
          };
          let alerts: DastAlert[] = [];
          let summary: DastSummary = {};

          // 1. result.result 경로에서 찾기 (실제 저장된 구조)
          if (result.result) {
            zapData = result.result;

            // 실제 저장된 구조: { "results": { "alerts": [...], "total_alerts": 3, ... } }
            if (zapData.results && zapData.results.alerts) {
              alerts = zapData.results.alerts;

              // summary가 results에 있는지 확인
              if (zapData.results.total_alerts !== undefined) {
                summary = {
                  total_alerts: zapData.results.total_alerts,
                  high_alerts: zapData.results.high_alerts || 0,
                  medium_alerts: zapData.results.medium_alerts || 0,
                  low_alerts: zapData.results.low_alerts || 0,
                  info_alerts: zapData.results.info_alerts || 0,
                  scan_time: zapData.results.scan_time || 0,
                };
              }
            }
            // 기존 ZAP 구조도 지원 (fallback)
            else if (
              zapData.site &&
              Array.isArray(zapData.site) &&
              zapData.site.length > 0
            ) {
              alerts = zapData.site[0].alerts || [];
            }

            // summary가 최상위에 있는지 확인
            if (zapData.summary && Object.keys(summary).length === 0) {
              summary = zapData.summary;
            }

            // summary가 없으면 alerts에서 계산
            if (Object.keys(summary).length === 0 && alerts.length > 0) {
              const alertStats = {
                total_alerts: alerts.length,
                high_alerts: alerts.filter(
                  (alert: DastAlert) =>
                    alert.riskcode === '3' ||
                    alert.riskcode === '4' ||
                    alert.riskdesc?.toLowerCase().includes('high') ||
                    alert.riskdesc?.toLowerCase().includes('critical')
                ).length,
                medium_alerts: alerts.filter(
                  (alert: DastAlert) =>
                    alert.riskcode === '2' ||
                    alert.riskdesc?.toLowerCase().includes('medium')
                ).length,
                low_alerts: alerts.filter(
                  (alert: DastAlert) =>
                    alert.riskcode === '1' ||
                    alert.riskdesc?.toLowerCase().includes('low')
                ).length,
                info_alerts: alerts.filter(
                  (alert: DastAlert) =>
                    alert.riskcode === '0' ||
                    alert.riskdesc?.toLowerCase().includes('info')
                ).length,
              };
              summary = alertStats;
            }
          }

          // 2. result에서 직접 찾기 (fallback)
          if (result.alerts) {
            alerts = result.alerts;
          }

          // 3. summary 찾기 (fallback)
          if (result.summary) {
            summary = result.summary;
          }

          // 4. execution_log 찾기
          if (result.execution_log) {
            executionLog = result.execution_log;
          }

          const enhancedDastResult: DastResult = {
            alerts: alerts,
            summary: {
              total_alerts: summary.total_alerts || alerts.length,
              high_alerts: summary.high_alerts || 0,
              medium_alerts: summary.medium_alerts || 0,
              low_alerts: summary.low_alerts || 0,
              info_alerts: summary.info_alerts || 0,
              scan_time: summary.scan_time || 0,
            },
            execution_log: executionLog,
          };

          setResult(enhancedDastResult);
        } else {
          setResult(
            data.result
              ? (data.result as ScaResult | DastResult | SastResultData)
              : (rawData as ScaResult | DastResult | SastResultData)
          );
        }
      } else if (data.status === 'pending') {
        setResult(null);
        setError(
          `${analysisType.toUpperCase()} 스캔이 아직 진행 중입니다. 잠시 후 새로고침 해주세요.`
        );
      } else if (data.status === 'not_found') {
        setResult(null);
        setError(
          `${analysisType.toUpperCase()} 결과를 찾을 수 없습니다. 스캔을 시작하여 주시기 바랍니다.`
        );
      } else {
        setResult(null);
        setError(`${analysisType.toUpperCase()} 결과를 찾을 수 없습니다.`);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : '알 수 없는 오류';
      setError(
        `${analysisType.toUpperCase()} 결과를 불러오는 중 오류가 발생했습니다: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  }, [visible, repoId, analysisType]);

  useEffect(() => {
    if (visible) {
      void fetchResult();
    }
  }, [visible, repoId, fetchResult]);

  //  모달이 처음 열릴 때 자격증명 체크하여 없으면 자동으로 파라미터 모달 열기
  useEffect(() => {
    if (!visible) return;

    const checkCredentialsAndOpenModal = async () => {
      try {
        // 동적 import로 스토어 가져오기
        const { useCredsStore } = await import('../../stores/useCredsStore');
        const store = useCredsStore.getState();

        switch (analysisType) {
          case 'sast': {
            // GitLab 토큰 확인
            const { sourceRepository } = store;
            if (!repoUrl) break;

            const baseUrl = repoUrl
              .replace(new RegExp('/[^/]+\\.git$'), '')
              .replace(new RegExp('/$'), '');
            const hasToken = sourceRepository.some(
              r => baseUrl.includes(r.baseUrl) || r.baseUrl?.includes(baseUrl)
            );

            if (!hasToken) {
              // 토큰이 없으면 자동으로 파라미터 모달 열기
              setSastParamsModalOpen(true);
            }
            break;
          }
          case 'sca': {
            // Docker Registry 확인 (선택사항이지만 없으면 안내)
            const { imageRegistry } = store;
            if (imageRegistry.length === 0) {
              // SCA는 이미지 URL이 필요하므로 파라미터 모달을 열어야 함
              setScaParamsModalOpen(true);
            }
            break;
          }
          case 'dast': {
            // DAST는 target_url만 필요하므로 항상 파라미터 모달을 통해 입력받음
            // 자격증명이 필요없지만 URL은 항상 입력받아야 함
            // 결과가 없는 경우에만 자동으로 열기
            if (!result) {
              setDastParamsModalOpen(true);
            }
            break;
          }
        }
      } catch (_error) {
        // Credentials check error - silently ignore
      }
    };

    // 약간의 지연 후 실행 (모달 애니메이션이 끝난 후)
    const timer = setTimeout(() => {
      void checkCredentialsAndOpenModal();
    }, 300);

    return () => clearTimeout(timer);
  }, [visible, analysisType, repoUrl, result]);

  // 스캔하기 버튼 클릭 핸들러
  const handleStartScan = useCallback(async () => {
    // 모든 분석 타입에서 파라미터 모달 열기
    switch (analysisType) {
      case 'sast':
        setSastParamsModalOpen(true);
        break;
      case 'sca':
        setScaParamsModalOpen(true);
        break;
      case 'dast':
        setDastParamsModalOpen(true);
        break;
      case 'sbom':
        // SBOM은 SCA 스캔에서 자동 생성되므로 안내 메시지 표시
        message.info(
          'SBOM은 SCA 스캔 시 자동으로 생성됩니다. SCA 분석을 실행해주세요.'
        );
        break;
      default:
        setError('지원하지 않는 분석 타입입니다.');
    }
  }, [analysisType]);

  // 파라미터 모달 확인 핸들러
  const handleSastParamsConfirm = useCallback(
    async (params: SastScanParams) => {
      setSastParamsModalOpen(false);

      try {
        setIsScanning(true);
        setScanStartTime(new Date());
        onScanStateChange?.(analysisType, 'analyzing');
        // repoUrl을 baseUrl로 사용하여 스토어 업데이트
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sast', 'analyzing');
        }

        // SAST 스캔 실행
        await gitApi.executeSastScan({
          repo_id: repoId,
          git_url: params.git_url,
          branch: params.branch,
          git_token: params.git_token,
          generate_sbom: params.generate_sbom,
          license_analysis: params.license_analysis,
        });

        // 스캔 완료 후 결과 다시 로드
        await fetchResult();

        onScanStateChange?.(analysisType, 'completed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sast', 'completed');
          updateSecurityLastUpdate(repoUrl, 'sast', new Date().toISOString());
        }
        message.success('SAST 스캔이 완료되었습니다.');
      } catch (error) {
        // 상세 에러 정보 로깅 및 UI 표시
        let errorMessage = 'SAST 스캔 실행 중 오류가 발생했습니다.';
        if (isAnalysisApiError(error)) {
          errorMessage = `SAST 스캔 실패: ${error.message}`;
          logger.error(
            '[SAST] 스캔 실패:',
            new Error(`[${error.code}] ${error.message}`)
          );
        } else if (error instanceof Error) {
          errorMessage = `SAST 스캔 실패: ${error.message}`;
          logger.error('[SAST] 스캔 에러:', error);
        }

        onScanStateChange?.(analysisType, 'failed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sast', 'failed');
        }
        // 에러 메시지를 상태에 저장하여 UI에 표시
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setIsScanning(false);
        setScanStartTime(null);
      }
    },
    [
      repoId,
      fetchResult,
      onScanStateChange,
      updateSecurityState,
      updateSecurityLastUpdate,
      repoUrl,
    ]
  );

  const handleScaParamsConfirm = useCallback(
    async (params: ScaScanParams) => {
      setScaParamsModalOpen(false);

      try {
        setIsScanning(true);
        setScanStartTime(new Date());
        onScanStateChange?.(analysisType, 'analyzing');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sca', 'analyzing');
        }

        // Trivy 컨테이너 이미지 스캔 실행 (직접 API 호출)
        await gitApi.trivyScanImage({
          repo_id: repoId,
          image_url: params.image_url,
          scan_type: params.scan_type || 'vuln',
          registry_username: params.registry_username,
          registry_password: params.registry_password,
        });

        // SBOM 자동 생성 (옵션이 활성화된 경우)
        //  백엔드 프록시를 통해 호출하여 에러 처리 개선
        if (params.generate_sbom) {
          try {
            await gitApi.generateImageSbom({
              repo_id: repoId,
              image_url: params.image_url,
              license_analysis: params.license_analysis || false,
              registry_username: params.registry_username,
              registry_password: params.registry_password,
            });
            message.success('SBOM이 자동 생성되었습니다.');
          } catch (sbomError) {
            // SBOM 생성 실패는 전체 스캔을 실패로 처리하지 않음
            const errorMsg =
              sbomError instanceof Error
                ? sbomError.message
                : 'SBOM 생성 서비스 오류';
            console.error('[SBOM] Generation failed:', errorMsg);
            message.warning(`SBOM 생성에 실패했습니다: ${errorMsg}`);
          }
        }

        // 스캔 완료 후 결과 다시 로드 (백엔드에서 자동으로 DB에 저장됨)
        await fetchResult();

        onScanStateChange?.(analysisType, 'completed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sca', 'completed');
          updateSecurityLastUpdate(repoUrl, 'sca', new Date().toISOString());
        }
        message.success('SCA 스캔이 완료되었습니다.');
      } catch (error) {
        // 상세 에러 정보 로깅 및 UI 표시
        let errorMessage = 'SCA 스캔 실행 중 오류가 발생했습니다.';
        if (isAnalysisApiError(error)) {
          errorMessage = `SCA 스캔 실패: ${error.message}`;
          logger.error(
            '[SCA] 스캔 실패:',
            new Error(`[${error.code}] ${error.message}`)
          );
        } else if (error instanceof Error) {
          errorMessage = `SCA 스캔 실패: ${error.message}`;
          logger.error('[SCA] 스캔 에러:', error);
        }

        onScanStateChange?.(analysisType, 'failed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sca', 'failed');
        }
        // 에러 메시지를 상태에 저장하여 UI에 표시
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setIsScanning(false);
        setScanStartTime(null);
      }
    },
    [
      repoId,
      fetchResult,
      onScanStateChange,
      updateSecurityState,
      updateSecurityLastUpdate,
      repoUrl,
    ]
  );

  const handleDastParamsConfirm = useCallback(
    async (params: DastScanParams) => {
      setDastParamsModalOpen(false);

      try {
        setIsScanning(true);
        setScanStartTime(new Date());
        onScanStateChange?.(analysisType, 'analyzing');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'dast', 'analyzing');
        }

        // DAST 스캔 실행 (API Gateway 직접 호출)
        await gitApi.dastScanWeb({
          repo_id: repoId,
          target_url: params.target_url,
          scan_type: params.scan_type || 'baseline',
          options: params.options,
        });

        // 스캔 완료 후 결과 다시 로드
        await fetchResult();

        onScanStateChange?.(analysisType, 'completed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'dast', 'completed');
          updateSecurityLastUpdate(repoUrl, 'dast', new Date().toISOString());
        }
        message.success('DAST 스캔이 완료되었습니다.');
      } catch (error) {
        // 상세 에러 정보 로깅 및 UI 표시
        let errorMessage = 'DAST 스캔 실행 중 오류가 발생했습니다.';
        if (isAnalysisApiError(error)) {
          errorMessage = `DAST 스캔 실패: ${error.message}`;
          logger.error(
            '[DAST] 스캔 실패:',
            new Error(`[${error.code}] ${error.message}`)
          );
        } else if (error instanceof Error) {
          errorMessage = `DAST 스캔 실패: ${error.message}`;
          logger.error('[DAST] 스캔 에러:', error);
        }

        onScanStateChange?.(analysisType, 'failed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'dast', 'failed');
        }
        // 에러 메시지를 상태에 저장하여 UI에 표시
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setIsScanning(false);
        setScanStartTime(null);
      }
    },
    [
      repoId,
      fetchResult,
      onScanStateChange,
      updateSecurityState,
      updateSecurityLastUpdate,
      repoUrl,
    ]
  );

  // 위험도별 색상 반환
  const getRiskColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'red';
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'blue';
      case 'info':
        return 'green';
      case 'informational':
        return 'green';
      case 'warning':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'default';
    }
  };

  // Note: renderSummaryCard, renderVulnerabilitiesList, renderSastDetailView, and renderExecutionLogs
  // are not used because we're using the unified SastResultContent, ScaResultContent, and DastResultContent components

  // 요약 카드 렌더링 (Not used - using unified components instead)
  const _renderSummaryCard = () => {
    if (!result) return null;

    switch (analysisType) {
      case 'sast':
        const sastData = result as SastResultData;
        return (
          <div>
            {sastData.semgrep && (
              <Card
                title='Semgrep 분석'
                size='small'
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Statistic
                      title='총 발견 수'
                      value={sastData.semgrep.results?.total_findings || 0}
                      valueStyle={{
                        color: sastData.semgrep.results?.total_findings
                          ? '#cf1322'
                          : '#52c41a',
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='상태'
                      value={sastData.semgrep.success ? '완료' : '실패'}
                      valueStyle={{
                        color: sastData.semgrep.success ? '#52c41a' : '#cf1322',
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='분석 시간'
                      value={`${sastData.semgrep.summary?.analysis_time?.toFixed(2) || 0}초`}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='클론 시간'
                      value={`${sastData.semgrep.summary?.clone_time?.toFixed(2) || 0}초`}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}
            {sastData.codeql && (
              <Card title='CodeQL 분석' size='small'>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Statistic
                      title='총 발견 수'
                      value={sastData.codeql.results?.total_findings || 0}
                      valueStyle={{
                        color: sastData.codeql.results?.total_findings
                          ? '#cf1322'
                          : '#52c41a',
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='상태'
                      value={sastData.codeql.success ? '완료' : '실패'}
                      valueStyle={{
                        color: sastData.codeql.success ? '#52c41a' : '#cf1322',
                      }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='분석 시간'
                      value={`${sastData.codeql.summary?.analysis_time?.toFixed(2) || 0}초`}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title='클론 시간'
                      value={`${sastData.codeql.summary?.clone_time?.toFixed(2) || 0}초`}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        );

      case 'sca':
        const scaData = result as ScaResult;
        return (
          <Card title='SCA 분석 요약' size='small'>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic
                  title='총 취약점'
                  value={scaData.summary?.total_vulnerabilities || 0}
                  valueStyle={{
                    color: scaData.summary?.total_vulnerabilities
                      ? '#cf1322'
                      : '#52c41a',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title='High'
                  value={scaData.summary?.severity_breakdown?.high || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title='Medium'
                  value={scaData.summary?.severity_breakdown?.medium || 0}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title='Low'
                  value={scaData.summary?.severity_breakdown?.low || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Card>
        );

      case 'dast':
        const dastData = result as DastResult;
        return (
          <Card title='DAST 분석 요약' size='small'>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic
                  title='총 알림'
                  value={dastData.summary?.total_alerts || 0}
                  valueStyle={{
                    color: dastData.summary?.total_alerts
                      ? '#cf1322'
                      : '#52c41a',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title='High'
                  value={dastData.summary?.high_alerts || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title='Medium'
                  value={dastData.summary?.medium_alerts || 0}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title='Low'
                  value={dastData.summary?.low_alerts || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Card>
        );

      default:
        return null;
    }
  };

  // 취약점/알림 목록 렌더링 (Not used - using unified components instead)
  const _renderVulnerabilitiesList = () => {
    if (!result) return null;

    switch (analysisType) {
      case 'sast':
        const sastData = result as SastResultData;
        const semgrepFindings = sastData.semgrep?.results?.sarif_json
          ? (
              JSON.parse(sastData.semgrep.results.sarif_json) as {
                runs?: Array<{ results?: Array<Record<string, any>> }>;
              }
            )?.runs?.[0]?.results || []
          : [];

        return (
          <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
            {semgrepFindings.map(
              (finding: Record<string, any>, index: number) => (
                <Card key={index} size='small' style={{ marginBottom: 8 }}>
                  <Row gutter={[16, 8]}>
                    <Col span={24}>
                      <Text strong>
                        {(finding.rule as Record<string, any>)?.name ||
                          'Unknown Rule'}
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Text type='secondary'>
                        규칙 ID:{' '}
                        {(finding.rule as Record<string, any>)?.id || 'N/A'}
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Tag
                        color={getRiskColor(
                          (finding.rule as Record<string, any>)?.level || ''
                        )}
                      >
                        {(
                          (finding.rule as Record<string, any>)?.level || ''
                        ).toUpperCase() || 'UNKNOWN'}
                      </Tag>
                    </Col>
                    <Col span={24}>
                      <Text>
                        {(finding.rule as Record<string, any>)?.message ||
                          'No description available'}
                      </Text>
                    </Col>
                    {(finding.locations as Array<Record<string, any>>)?.[0] && (
                      <Col span={24}>
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          파일:{' '}
                          {(finding.locations as Array<Record<string, any>>)[0]
                            ?.physicalLocation?.artifactLocation?.uri || 'N/A'}
                          (라인{' '}
                          {(finding.locations as Array<Record<string, any>>)[0]
                            ?.physicalLocation?.region?.startLine || 'N/A'}
                          )
                        </Text>
                      </Col>
                    )}
                  </Row>
                </Card>
              )
            )}
            {semgrepFindings.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#666',
                }}
              >
                <BugOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <p>발견된 취약점이 없습니다.</p>
              </div>
            )}
          </div>
        );

      case 'sca':
        const scaData = result as ScaResult;
        const vulnerabilities = (scaData.vulnerabilities ||
          []) as unknown as TrivyVulnerability[];

        return (
          <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
            {vulnerabilities.map((vuln: TrivyVulnerability, index: number) => (
              <Card
                key={index}
                size='small'
                style={{ marginBottom: 8 }}
                title={`취약점 #${index + 1}: ${vuln.vulnerability_id || vuln.pkg_name}`}
              >
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Tag
                      color={getRiskColor(vuln.severity?.toLowerCase() || '')}
                    >
                      {vuln.severity?.toUpperCase() || 'UNKNOWN'}
                    </Tag>
                    {vuln.fixed_version && (
                      <Tag color='green' style={{ marginLeft: 8 }}>
                        수정 버전: {vuln.fixed_version}
                      </Tag>
                    )}
                    {vuln.vulnerability_id && (
                      <Tag color='purple' style={{ marginLeft: 8 }}>
                        {vuln.vulnerability_id}
                      </Tag>
                    )}
                  </div>

                  {vuln.description && (
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        marginTop: 4,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        <strong>설명:</strong> {vuln.description}
                      </p>
                    </div>
                  )}

                  {vuln.references && vuln.references.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text strong style={{ fontSize: '12px' }}>
                        참고 링크:
                      </Text>
                      {vuln.references.slice(0, 3).map((ref, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '11px',
                            color: '#1890ff',
                            marginTop: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#f0f8ff',
                            borderRadius: '3px',
                          }}
                        >
                          <a
                            href={ref}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{ color: '#1890ff' }}
                          >
                            {ref}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {vulnerabilities.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#666',
                }}
              >
                <ExperimentOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <p>발견된 취약점이 없습니다.</p>
              </div>
            )}
          </div>
        );

      case 'dast':
        const dastData = result as DastResult;
        const alerts = dastData.alerts || [];

        return (
          <div style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
            {alerts.length > 0 ? (
              alerts.map((alert: DastAlert, index: number) => (
                <Card
                  key={index}
                  size='small'
                  style={{ marginBottom: 8 }}
                  title={`알림 #${index + 1}: ${alert.name}`}
                >
                  <div>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>플러그인 ID:</strong> {alert.pluginid}
                    </p>
                    <div style={{ marginBottom: 8 }}>
                      <Tag
                        color={getRiskColor(
                          alert.riskdesc?.toLowerCase() || ''
                        )}
                      >
                        {alert.riskdesc?.toUpperCase() || 'UNKNOWN'}
                      </Tag>
                      <Tag color='purple' style={{ marginLeft: 8 }}>
                        CWE-{alert.cweid}
                      </Tag>
                      <Tag color='blue' style={{ marginLeft: 8 }}>
                        WASC-{alert.wascid}
                      </Tag>
                      <Tag color='green' style={{ marginLeft: 8 }}>
                        개수: {alert.count}
                      </Tag>
                    </div>

                    {alert.description && (
                      <div
                        style={{
                          backgroundColor: '#f5f5f5',
                          padding: 8,
                          borderRadius: 4,
                          marginTop: 4,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          <strong>설명:</strong> {alert.description}
                        </p>
                      </div>
                    )}

                    {alert.solution && (
                      <div
                        style={{
                          backgroundColor: '#f6ffed',
                          padding: 8,
                          borderRadius: 4,
                          marginTop: 4,
                          border: '1px solid #b7eb8f',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '12px' }}>
                          <strong>해결 방법:</strong> {alert.solution}
                        </p>
                      </div>
                    )}

                    {alert.instances && alert.instances.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong style={{ fontSize: '12px' }}>
                          발견된 위치:
                        </Text>
                        {alert.instances.slice(0, 5).map((instance, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: '11px',
                              color: '#666',
                              marginTop: '4px',
                              padding: '4px 8px',
                              backgroundColor: '#fafafa',
                              borderRadius: '3px',
                            }}
                          >
                            {instance.method} {instance.uri}
                          </div>
                        ))}
                        {alert.instances.length > 5 && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#999',
                              marginTop: '4px',
                              fontStyle: 'italic',
                            }}
                          >
                            ... 및 {alert.instances.length - 5}개 더
                          </div>
                        )}
                      </div>
                    )}

                    {alert.reference && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong style={{ fontSize: '12px' }}>
                          참고 링크:
                        </Text>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#1890ff',
                            marginTop: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#f0f8ff',
                            borderRadius: '3px',
                          }}
                        >
                          <a
                            href={alert.reference}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{ color: '#1890ff' }}
                          >
                            {alert.reference}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#666',
                }}
              >
                <GlobalOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <p>발견된 보안 알림이 없습니다.</p>
                <p style={{ fontSize: '12px', color: '#999' }}>
                  웹 애플리케이션이 안전하거나 스캔이 완료되지 않았을 수
                  있습니다.
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <Alert
            message='해당 분석 타입에서는 취약점 목록을 지원하지 않습니다.'
            type='info'
          />
        );
    }
  };

  // SAST 상세 뷰 렌더링 함수 (Not used - using unified components instead)
  const _renderSastDetailView = (type: 'semgrep' | 'codeql') => {
    const sastData = result as SastResultData;
    const detailData =
      type === 'semgrep' ? sastData?.semgrep : sastData?.codeql;

    if (!detailData || !detailData.results) {
      return (
        <Alert
          message='상세 데이터가 없습니다.'
          type='warning'
          style={{ margin: '20px 0' }}
        />
      );
    }

    const allIssues = parseSarifData(detailData.results.sarif_json);
    // 표준 심각도 매핑 (UI 기준: High / Medium / Low)
    const toUiSeverity = (
      raw: string | undefined
    ): 'High' | 'Medium' | 'Low' => {
      const v = String(raw || '').toLowerCase();
      if (v === 'critical' || v === 'high' || v === 'error') return 'High';
      if (v === 'medium' || v === 'moderate' || v === 'note' || v === 'warning')
        return 'Medium';
      return 'Low'; // low, info, unknown 등은 Low로 묶음
    };
    // 필터 적용
    const selectedSevs =
      type === 'semgrep' ? semgrepSeverities : codeqlSeverities;
    const q = (type === 'semgrep' ? semgrepQuery : codeqlQuery)
      .toLowerCase()
      .trim();
    const issues = (allIssues || []).filter((issue: ParsedSarifIssue) => {
      const lvlUi = toUiSeverity(issue.level);
      const text =
        `${issue.ruleId || ''} ${issue.message || ''} ${(issue.locations || []).map(l => l.file).join(' ')}`.toLowerCase();
      const matchSev =
        selectedSevs.length === 0 || selectedSevs.includes(lvlUi);
      const matchQ = q === '' || text.includes(q);
      return matchSev && matchQ;
    });

    return (
      <div>
        <Card
          title={`${type.toUpperCase()} 상세 분석 결과`}
          size='small'
          style={{ marginBottom: 16 }}
        >
          {/* 필터 영역: 제목 아래 배치 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Select
              mode='multiple'
              allowClear
              placeholder='심각도'
              size='small'
              style={{ minWidth: 180 }}
              value={type === 'semgrep' ? semgrepSeverities : codeqlSeverities}
              onChange={vals =>
                type === 'semgrep'
                  ? setSemgrepSeverities(vals)
                  : setCodeqlSeverities(vals)
              }
              options={[
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' },
              ]}
            />
            <Input.Search
              allowClear
              placeholder='규칙/메시지/파일 검색'
              size='small'
              style={{ width: 220 }}
              value={type === 'semgrep' ? semgrepQuery : codeqlQuery}
              onChange={e =>
                type === 'semgrep'
                  ? setSemgrepQuery(e.target.value)
                  : setCodeqlQuery(e.target.value)
              }
            />
          </div>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div
                style={{
                  background: detailData.results.total_findings
                    ? '#fff1f0'
                    : '#f6ffed',
                  border: `1px solid ${detailData.results.total_findings ? '#ffa39e' : '#b7eb8f'}`,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{ fontSize: 12, color: '#595959', marginBottom: 6 }}
                >
                  총 발견된 이슈
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: detailData.results.total_findings
                      ? '#cf1322'
                      : '#389e0d',
                  }}
                >
                  {detailData.results.total_findings}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  background: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{ fontSize: 12, color: '#595959', marginBottom: 6 }}
                >
                  분석 도구
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 600, color: '#096dd9' }}
                >
                  {type.toUpperCase()}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  background: '#f9f0ff',
                  border: '1px solid #d3adf7',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{ fontSize: 12, color: '#595959', marginBottom: 6 }}
                >
                  분석 시간
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 600, color: '#722ed1' }}
                >
                  {(detailData.summary?.analysis_time?.toFixed(2) || 0) + '초'}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        <Card title={`발견된 보안 이슈 목록 (${issues.length})`} size='small'>
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {issues.map((issue: ParsedSarifIssue) => (
              <Card
                key={issue.id}
                size='small'
                style={{ marginBottom: 8 }}
                title={`이슈 #${issue.id}: ${issue.ruleId}`}
              >
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <Text strong>메시지:</Text> {issue.message}
                  </p>
                  <Tag color={getRiskColor(issue.level)}>
                    {toUiSeverity(issue.level)}
                  </Tag>
                  {issue.locations.map((location, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        marginTop: 8,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        <Text strong>파일:</Text> {location.file}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        <Text strong>위치:</Text> 라인 {location.startLine}-
                        {location.endLine}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {issues.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#666',
                }}
              >
                <BugOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <p>필터 조건에 해당하는 이슈가 없습니다.</p>
              </div>
            )}
          </div>
        </Card>

        <Card
          title='원본 SARIF 데이터'
          size='small'
          style={{ marginTop: 16 }}
          extra={
            <div style={{ display: 'flex', gap: 8 }}>
              <Input.Search
                allowClear
                size='small'
                placeholder='SARIF 검색'
                style={{ width: 200 }}
                value={
                  type === 'semgrep' ? semgrepSarifQuery : codeqlSarifQuery
                }
                onChange={e =>
                  type === 'semgrep'
                    ? setSemgrepSarifQuery(e.target.value)
                    : setCodeqlSarifQuery(e.target.value)
                }
              />
              <Button
                size='small'
                onClick={() =>
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      JSON.parse(detailData.results.sarif_json),
                      null,
                      2
                    )
                  )
                }
              >
                복사
              </Button>
              <Button
                size='small'
                onClick={() =>
                  downloadJson(
                    `${type}-sarif.json`,
                    JSON.stringify(
                      JSON.parse(detailData.results.sarif_json),
                      null,
                      2
                    )
                  )
                }
              >
                다운로드
              </Button>
            </div>
          }
        >
          <div
            style={{
              maxHeight: 360,
              overflow: 'auto',
              backgroundColor: '#1e1e1e',
              padding: 12,
              borderRadius: 4,
              fontFamily:
                'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#d4d4d4',
            }}
          >
            <pre
              style={{ margin: 0, whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{
                __html: highlightJson(
                  JSON.stringify(
                    JSON.parse(detailData.results.sarif_json),
                    null,
                    2
                  ),
                  type === 'semgrep' ? semgrepSarifQuery : codeqlSarifQuery
                ),
              }}
            />
          </div>
        </Card>
      </div>
    );
  };

  // 실행 로그 렌더링 (Not used - using unified components instead)
  const _renderExecutionLogs = () => {
    if (!result) return null;

    switch (analysisType) {
      case 'sast':
        const sastData = result as SastResultData;
        return (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title='Semgrep 실행 로그' size='small'>
                <div
                  style={{
                    maxHeight: 300,
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
                  {(sastData.semgrep_command_log || '실행 로그가 없습니다.')
                    .split('\n')
                    .map((line: string, idx: number) => (
                      <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
                        {line}
                      </div>
                    ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title='CodeQL 실행 로그' size='small'>
                <div
                  style={{
                    maxHeight: 300,
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
                  {(sastData.codeql_command_log || '실행 로그가 없습니다.')
                    .split('\n')
                    .map((line: string, idx: number) => (
                      <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
                        {line}
                      </div>
                    ))}
                </div>
              </Card>
            </Col>
          </Row>
        );

      case 'sca':
        const scaData = result as ScaResult;
        const executionLog = scaData?.execution_log;

        return (
          <Card title='SCA 실행 로그' size='small'>
            <div
              style={{
                maxHeight: 300,
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
              {/* 전체 실행 로그 */}
              {executionLog?.full_execution_log?.log_messages && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#722ed1', fontSize: '13px' }}>
                      전체 실행 로그:
                    </strong>
                  </div>
                  {executionLog.full_execution_log.log_messages.map(
                    (log: string, index: number) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: '4px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(114, 46, 209, 0.1)',
                          borderRadius: '3px',
                          borderLeft: '3px solid #722ed1',
                          color: '#d4d4d4',
                        }}
                      >
                        {log}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Trivy 스캔 로그 */}
              {executionLog?.trivy_scan?.log_messages && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#fa8c16', fontSize: '13px' }}>
                      Trivy 컨테이너 스캔:
                    </strong>
                  </div>
                  {executionLog.trivy_scan.log_messages.map(
                    (log: string, index: number) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: '4px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(250, 140, 22, 0.1)',
                          borderRadius: '3px',
                          borderLeft: '3px solid #fa8c16',
                          color: '#d4d4d4',
                        }}
                      >
                        {log}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* 일반 로그 메시지 (fallback) */}
              {!executionLog?.trivy_scan &&
                !executionLog?.full_execution_log &&
                executionLog?.log_messages && (
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#1890ff', fontSize: '13px' }}>
                        실행 로그:
                      </strong>
                    </div>
                    {executionLog.log_messages.map(
                      (log: string, index: number) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: '4px',
                            fontSize: '12px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(24, 144, 255, 0.1)',
                            borderRadius: '3px',
                            borderLeft: '3px solid #1890ff',
                            color: '#d4d4d4',
                          }}
                        >
                          {log}
                        </div>
                      )
                    )}
                  </div>
                )}

              {/* 로그가 전혀 없는 경우 */}
              {!executionLog?.trivy_scan &&
                !executionLog?.full_execution_log &&
                !executionLog?.log_messages && (
                  <div
                    style={{
                      fontSize: '12px',
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '3px',
                      color: '#888',
                    }}
                  >
                    실행 로그 정보가 없습니다.
                  </div>
                )}
            </div>
          </Card>
        );
      case 'dast':
        const dastData = result as DastResult;
        return (
          <Card title='DAST 실행 로그' size='small'>
            <div
              style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                maxHeight: 'calc(100vh - 500px)',
                overflow: 'auto',
              }}
            >
              {(() => {
                // 실행로그에서 log_messages 추출 (여러 구조 지원)
                let logMessages: string[] = [];

                if (dastData.execution_log) {
                  const execLog = dastData.execution_log;
                  // execution_log.log_messages (직접)
                  if (execLog.log_messages) {
                    logMessages = execLog.log_messages;
                  }
                  // execution_log.zap_scan.log_messages
                  else if (execLog.zap_scan?.log_messages) {
                    logMessages = execLog.zap_scan.log_messages;
                  }
                }

                return logMessages.length > 0 ? (
                  logMessages.map((log: string, index: number) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '4px',
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor:
                          index % 2 === 0 ? '#fafafa' : '#f0f0f0',
                        borderRadius: '3px',
                        borderLeft: '3px solid #52c41a',
                      }}
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      fontSize: '12px',
                      padding: '8px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '3px',
                      color: '#666',
                    }}
                  >
                    실행 로그 정보가 없습니다.
                  </div>
                );
              })()}
            </div>
          </Card>
        );

      default:
        return (
          <Alert
            message='해당 분석 타입에서는 실행 로그를 지원하지 않습니다.'
            type='info'
          />
        );
    }
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            paddingRight: '8px',
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
            {config.icon}
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {config.title} - {repoName}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Button
              size='small'
              onClick={onClose}
              style={{ marginRight: '4px' }}
            >
              닫기
            </Button>
            <Button
              type='primary'
              size='small'
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartScan()}
              disabled={isScanning}
              loading={isScanning}
              style={{ minWidth: '100px', height: '28px' }}
            >
              {isScanning ? '스캔 중...' : '스캔 시작'}
            </Button>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      closeIcon={false}
      footer={null}
      width={1400}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
          padding: '16px',
        },
      }}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size='large' />
          <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
            {config.title}을 불러오는 중입니다...
          </p>
        </div>
      ) : isScanning ? (
        <ScanProgressOverlay
          scanType={analysisType as ScanType}
          visible={isScanning}
          onClose={onClose}
          startTime={scanStartTime || undefined}
          serviceName={repoName}
        />
      ) : error ? (
        <div
          style={{ textAlign: 'center', padding: '60px 0', color: '#ff4d4f' }}
        >
          <BugOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>{error}</p>
        </div>
      ) : !result ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          {React.cloneElement(config.emptyIcon, {
            style: { fontSize: '48px', color: '#1890ff', marginBottom: '16px' },
          })}
          <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
            {config.emptyMessage}
          </p>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            {config.emptyDescription}
          </p>
        </div>
      ) : (
        <Tabs
          defaultActiveKey='result'
          items={[
            {
              key: 'result',
              label: (
                <span>
                  <UnorderedListOutlined />
                  분석 결과
                </span>
              ),
              children: (
                <div>
                  {/*  [수정] 통일된 분석 결과 컴포넌트 사용 (탭 없이 요약만 표시) */}
                  {analysisType === 'sast' && (
                    <SastResultContent
                      sastResult={result as SastResultData}
                      loading={false}
                      showTabs={false}
                    />
                  )}
                  {analysisType === 'sca' && (
                    <ScaResultContent
                      scaResult={result as ScaResult}
                      loading={false}
                    />
                  )}
                  {analysisType === 'dast' && (
                    <DastResultContent
                      dastResult={result as DastResult}
                      loading={false}
                      onScanStateChange={state => {
                        onScanStateChange?.('dast', state);
                      }}
                    />
                  )}
                  {analysisType === 'sbom' && serviceId && (
                    <SbomResultContent
                      serviceId={serviceId}
                      onRefresh={() => fetchResult()}
                      sbomType='image'
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'checklist',
              label: (
                <span>
                  <CheckSquareOutlined />
                  체크리스트
                </span>
              ),
              children: (
                <CategorizedVulnerabilityView
                  repoId={repoId}
                  onRefresh={() => fetchResult()}
                />
              ),
            },
            //  [추가] SBOM/라이선스 분석 탭 (SCA 분석 타입에서만 표시)
            ...(analysisType === 'sca' && serviceId
              ? [
                  {
                    key: 'sbom',
                    label: (
                      <span>
                        <FileSearchOutlined />
                        SBOM / 라이선스
                      </span>
                    ),
                    children: (
                      <SbomResultContent
                        serviceId={serviceId}
                        onRefresh={() => fetchResult()}
                        sbomType='image'
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      {/* 파라미터 모달들 */}
      <SastParamsModal
        visible={sastParamsModalOpen}
        onClose={() => setSastParamsModalOpen(false)}
        onConfirm={handleSastParamsConfirm}
        loading={isScanning}
        initialGitUrl={repoUrl}
      />

      <ScaParamsModal
        visible={scaParamsModalOpen}
        onClose={() => setScaParamsModalOpen(false)}
        onConfirm={handleScaParamsConfirm}
        loading={isScanning}
        registryConfig={registryConfig}
      />

      <DastParamsModal
        visible={dastParamsModalOpen}
        onClose={() => setDastParamsModalOpen(false)}
        onConfirm={handleDastParamsConfirm}
        loading={isScanning}
        serviceId={serviceId}
        infraType={infraType}
      />
    </Modal>
  );
};

export default SecurityResultModal;
