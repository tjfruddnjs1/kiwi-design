import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Spin,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Button,
  message,
  Statistic,
  Alert,
  Tabs,
  Empty,
  Space,
  Tooltip,
  Collapse,
  List,
  Descriptions,
} from 'antd';
import {
  ExperimentOutlined,
  PlayCircleOutlined,
  BugOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  ContainerOutlined,
  ScanOutlined,
  FileSearchOutlined,
  LinkOutlined,
  RightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { gitApi } from '../../lib/api/gitRepository';
import { analysisApi } from '../../lib/api/analysis-client';
import type {
  ScaScanParams,
  Vulnerability,
  BuiltImageInfo,
  RegistryConfigInfo,
  ScaResult,
  TrivyScanResultItem,
  TrivyVulnerabilityItem,
} from '../../types/securityAnalysis';
import { getService } from '../../lib/api/service';
import ScaParamsModal from './ScaParamsModal';
import { useCredsStore } from '../../stores/useCredsStore';
import { getBuiltImages } from '../../lib/api/pipeline';
import dayjs from 'dayjs';
import { CategorizedVulnerabilityView, SbomResultContent } from '../security';
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

interface ScaResultsContentProps {
  repoId?: number;
  repoName?: string;
  repoUrl?: string;
  serviceId?: number; //  Registry 인증 정보 조회용
  onScanStateChange?: (
    type: 'sca',
    state: 'idle' | 'analyzing' | 'completed' | 'failed'
  ) => void;
  //  [추가] 외부에서 데이터를 주입받을 수 있도록 (dashboard 버전 통합)
  scaResult?: ScaResult | null;
  loading?: boolean;
  showTabs?: boolean; // 탭 표시 여부 (기본값: true)
}

/**
 * SCA 분석 결과 콘텐츠 (모달 없이 직접 렌더링용)
 * GitManagement의 "이미지 분석" 탭에서 사용
 *
 *  두 가지 사용 방식 지원:
 * 1. 자체 데이터 로딩: repoId만 전달 → 컴포넌트가 자체적으로 데이터 로딩
 * 2. 외부 데이터 주입: scaResult, loading 전달 → 외부에서 관리된 데이터 사용 (dashboard/modal 사용)
 */
const ScaResultsContent: React.FC<ScaResultsContentProps> = ({
  repoId,
  repoName: _repoName = '저장소',
  repoUrl,
  serviceId, //  Registry 인증 정보 조회용
  onScanStateChange,
  scaResult: externalScaResult, //  prop으로 받은 결과 (외부 관리)
  loading: externalLoading, //  prop으로 받은 로딩 상태
  showTabs = true, //  탭 표시 여부 (기본값: true)
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalScaResult, setInternalScaResult] = useState<any>(null);
  const [allScaResults, setAllScaResults] = useState<any[]>([]); //  모든 SCA 결과 저장
  const [selectedImageName, setSelectedImageName] = useState<string | null>(
    null
  ); //  선택된 이미지
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scaParamsModalOpen, setScaParamsModalOpen] = useState(false);
  const [selectedImageForScan, setSelectedImageForScan] = useState<
    string | null
  >(null); //  스캔 대상 이미지 URL
  const [builtImages, setBuiltImages] = useState<BuiltImageInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'checklist' | 'details' | 'info'>(
    'checklist'
  ); //  취약점 카테고리 분류가 기본 탭
  const [registryConfig, setRegistryConfig] = useState<
    RegistryConfigInfo | undefined
  >(undefined); //  Registry 인증 정보

  const { updateSecurityState, updateSecurityLastUpdate } = useCredsStore();

  //  외부 prop 우선, 없으면 내부 state 사용
  const loading =
    externalLoading !== undefined ? externalLoading : internalLoading;
  const scaResult =
    externalScaResult !== undefined ? externalScaResult : internalScaResult;

  //  serviceId가 있을 때 서비스 정보에서 registry_config 조회
  useEffect(() => {
    const fetchRegistryConfig = async () => {
      if (serviceId) {
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
        } catch (_error) {
          console.error('Registry config 조회 실패:', _error);
        }
      }
    };
    void fetchRegistryConfig();
  }, [serviceId]);

  // 심각도 매핑 함수
  const mapSeverity = (
    severity: string
  ): 'critical' | 'high' | 'medium' | 'low' => {
    const sev = severity?.toLowerCase() || '';
    if (sev === 'critical') return 'critical';
    if (sev === 'high') return 'high';
    if (sev === 'medium' || sev === 'moderate') return 'medium';
    return 'low';
  };

  // API 응답 타입 정의
  interface ScaResultItem {
    result?: {
      tool?: string;
      result?: {
        scan_result?: {
          results?: TrivyScanResultItem[];
          artifact_name?: string;
          artifact_type?: string;
        };
      };
      summary?: {
        scan_time?: number;
      };
    };
    execution_log?: { log_messages: string[]; total_duration: number };
    scan_date?: string;
  }

  // 파싱된 SCA 결과 타입
  interface ParsedScaResult {
    tool?: string;
    vulnerabilities: Vulnerability[];
    dependencies: unknown[];
    summary: {
      total_vulnerabilities: number;
      total_dependencies: number;
      severity_breakdown: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
      scan_time: number;
    };
    artifact_name?: string;
    artifact_type?: string;
    execution_log: { log_messages: string[]; total_duration: number };
    scan_date?: string;
  }

  // 결과 파싱 함수
  const parseScaResult = useCallback(
    (resultItem: ScaResultItem): ParsedScaResult | null => {
      const result = resultItem.result;

      if (result && result.tool === 'trivy' && result.result?.scan_result) {
        const scanResult = result.result.scan_result;
        let vulnerabilities: Vulnerability[] = [];

        if (scanResult.results && Array.isArray(scanResult.results)) {
          scanResult.results.forEach((res: TrivyScanResultItem) => {
            if (res.vulnerabilities && Array.isArray(res.vulnerabilities)) {
              vulnerabilities = vulnerabilities.concat(
                res.vulnerabilities.map((vuln: TrivyVulnerabilityItem) => ({
                  name: vuln.pkg_name,
                  version: vuln.installed_version,
                  severity: mapSeverity(vuln.severity),
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
          critical: vulnerabilities.filter(
            v => v.severity?.toLowerCase() === 'critical'
          ).length,
          high: vulnerabilities.filter(
            v => v.severity?.toLowerCase() === 'high'
          ).length,
          medium: vulnerabilities.filter(v => v.severity === 'medium').length,
          low: vulnerabilities.filter(v => v.severity === 'low').length,
        };

        return {
          tool: result.tool,
          vulnerabilities,
          dependencies: [],
          summary: {
            total_vulnerabilities: vulnerabilities.length,
            total_dependencies: 0,
            severity_breakdown: severityBreakdown,
            scan_time: result.summary?.scan_time || 0,
          },
          artifact_name: scanResult.artifact_name,
          artifact_type: scanResult.artifact_type,
          execution_log: resultItem.execution_log || {
            log_messages: [],
            total_duration: 0,
          },
          scan_date: resultItem.scan_date,
        };
      }
      return null;
    },
    []
  );

  // 결과 조회 함수 (repoId 변경 시에만 호출됨)
  const fetchResults = useCallback(
    async (currentSelectedImageName: string | null = null) => {
      // 외부에서 데이터를 주입받는 경우에는 fetch하지 않음
      if (externalScaResult !== undefined) return;
      if (!repoId) return;

      setInternalLoading(true);
      setError(null);

      try {
        // 여러 결과 조회 (최대 50개)
        const response = await gitApi.getScaResults(repoId, 50);
        const data = (response?.data || response) as {
          status?: string;
          results?: ScaResultItem[];
        };

        // 결과 없음 체크
        if (
          data.status === 'not_found' ||
          !data.results ||
          data.results.length === 0
        ) {
          setAllScaResults([]);
          setInternalScaResult(null);
          setSelectedImageName(null);
          setError('이미지 분석 결과를 찾을 수 없습니다.');
          onScanStateChange?.('sca', 'idle');
          if (repoUrl) {
            updateSecurityState(repoUrl, 'sca', 'idle');
          }
          return;
        }

        // 모든 결과 파싱
        if (
          data.status === 'completed' &&
          data.results &&
          data.results.length > 0
        ) {
          const parsedResults: ParsedScaResult[] = [];

          for (const resultItem of data.results) {
            const parsed = parseScaResult(resultItem);
            if (parsed) {
              parsedResults.push(parsed);
            }
          }

          if (parsedResults.length === 0) {
            setAllScaResults([]);
            setInternalScaResult(null);
            setSelectedImageName(null);
            setError('이미지 분석 결과를 찾을 수 없습니다.');
            return;
          }

          // scan_date 기준으로 최신 순 정렬 (최신 -> 오래된)
          parsedResults.sort((a, b) => {
            const dateA = new Date(a.scan_date || 0).getTime();
            const dateB = new Date(b.scan_date || 0).getTime();
            return dateB - dateA; // 내림차순 (최신이 먼저)
          });

          // 이미지별로 그룹핑 (가장 최근 결과만)
          const imageMap = new Map<string, ParsedScaResult>();
          parsedResults.forEach(result => {
            const imageName = result.artifact_name || 'unknown';
            // 이미 정렬되어 있으므로 첫 번째 것이 가장 최근 결과
            if (!imageMap.has(imageName)) {
              imageMap.set(imageName, result);
            }
          });

          // 그룹핑된 결과를 scan_date 기준으로 다시 정렬
          const groupedResults = Array.from(imageMap.values()).sort((a, b) => {
            const dateA = new Date(a.scan_date || 0).getTime();
            const dateB = new Date(b.scan_date || 0).getTime();
            return dateB - dateA; // 최신 스캔이 먼저
          });

          setAllScaResults(groupedResults);

          // 선택된 이미지가 없거나 리스트에 없으면 첫 번째 이미지 자동 선택
          const firstImageName = groupedResults[0].artifact_name;
          if (
            !currentSelectedImageName ||
            !imageMap.has(currentSelectedImageName)
          ) {
            setSelectedImageName(firstImageName);
            setInternalScaResult(groupedResults[0]);
          } else {
            // 선택된 이미지의 결과 설정
            const selectedResult = imageMap.get(currentSelectedImageName);
            setInternalScaResult(selectedResult || groupedResults[0]);
          }

          onScanStateChange?.('sca', 'completed');
          if (repoUrl) {
            updateSecurityState(repoUrl, 'sca', 'completed');
            const latestScanDate = groupedResults[0].scan_date;
            if (latestScanDate) {
              updateSecurityLastUpdate(repoUrl, 'sca', latestScanDate);
            }
          }
        } else {
          setAllScaResults([]);
          setInternalScaResult(null);
          setSelectedImageName(null);
          setError('이미지 분석 결과를 찾을 수 없습니다.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '알 수 없는 오류';
        setError(
          `이미지 분석 결과를 불러오는 중 오류가 발생했습니다: ${errorMessage}`
        );
      } finally {
        setInternalLoading(false);
      }
    },
    [
      repoId,
      externalScaResult,
      onScanStateChange,
      repoUrl,
      parseScaResult,
      updateSecurityState,
      updateSecurityLastUpdate,
    ]
  );

  // repoId 변경 시 결과 fetch (무한 루프 방지)
  const prevRepoIdRef = useRef<number | null>(null);

  // 결과 영역 스크롤을 위한 ref
  const resultSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // repoId가 변경되었을 때만 fetch
    if (
      repoId &&
      externalScaResult === undefined &&
      repoId !== prevRepoIdRef.current
    ) {
      prevRepoIdRef.current = repoId;
      void fetchResults(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId, externalScaResult]);

  // 빌드된 이미지 목록 조회
  useEffect(() => {
    const fetchBuiltImages = async () => {
      if (repoId) {
        try {
          const images = await getBuiltImages(repoId);
          //  build_date 기준으로 최신 순 정렬 (최신 빌드가 먼저)
          const sortedImages = images.sort((a, b) => {
            const dateA = new Date(a.build_date || 0).getTime();
            const dateB = new Date(b.build_date || 0).getTime();
            return dateB - dateA; // 내림차순 (최신이 먼저)
          });
          const limitedImages = sortedImages.slice(0, 100);
          setBuiltImages(limitedImages);
        } catch {
          // Built images fetch failed - reset to empty
          setBuiltImages([]);
        }
      }
    };
    void fetchBuiltImages();
  }, [repoId]);

  // 스캔하기 버튼 클릭 핸들러 (이미지 URL 선택 후 모달 열기)
  const handleStartScan = useCallback((imageUrl?: string) => {
    setSelectedImageForScan(imageUrl || null);
    setScaParamsModalOpen(true);
  }, []);

  // 파라미터 모달 확인 핸들러
  const handleScaParamsConfirm = useCallback(
    async (params: ScaScanParams) => {
      setScaParamsModalOpen(false);

      if (!repoId) return;

      try {
        setIsScanning(true);
        onScanStateChange?.('sca', 'analyzing');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sca', 'analyzing');
        }

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
            // 백엔드 프록시에서 반환하는 상세 에러 메시지 표시
            message.warning(`SBOM 생성에 실패했습니다: ${errorMsg}`);
          }
        }

        // 스캔한 이미지를 자동으로 선택하도록 설정
        setSelectedImageName(params.image_url);

        //  DB 저장 완료를 위해 1초 대기 후 결과 조회
        await new Promise(resolve => setTimeout(resolve, 1000));

        await fetchResults(params.image_url);

        onScanStateChange?.('sca', 'completed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sca', 'completed');
          updateSecurityLastUpdate(repoUrl, 'sca', new Date().toISOString());
        }
        message.success('이미지 분석이 완료되었습니다.');
      } catch {
        onScanStateChange?.('sca', 'failed');
        if (repoUrl) {
          updateSecurityState(repoUrl, 'sca', 'failed');
        }
        message.error('이미지 분석 실행 중 오류가 발생했습니다.');
      } finally {
        setIsScanning(false);
      }
    },
    [
      repoId,
      fetchResults,
      onScanStateChange,
      updateSecurityState,
      updateSecurityLastUpdate,
      repoUrl,
    ]
  );

  // 이미지 선택 핸들러 (결과 보기 클릭 시 스크롤 포함)
  const handleImageSelect = useCallback(
    (imageName: string, scrollToResult = false) => {

      setSelectedImageName(imageName);
      const selectedResult = allScaResults.find(
        r => r.artifact_name === imageName
      );

      if (selectedResult) {
        setInternalScaResult(selectedResult);

        // 결과 보기 클릭 시 결과 영역으로 스크롤
        if (scrollToResult && resultSectionRef.current) {
          setTimeout(() => {
            resultSectionRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }, 100);
        }
      } else {
        console.warn(
          '[DEBUG handleImageSelect]  선택한 이미지의 결과를 찾을 수 없음:',
          imageName
        );
      }
    },
    [allScaResults]
  );

  // 빠른 스캔 핸들러 (빌드된 이미지 목록에서 모달 열기 - SBOM 옵션 선택 가능)
  const handleQuickScan = useCallback(
    (imageUrl: string) => {
      // 모달을 열어서 SBOM 옵션 등을 선택할 수 있도록 함
      handleStartScan(imageUrl);
    },
    [handleStartScan]
  );

  // 이미지가 이미 스캔되었는지 확인
  const isImageScanned = useCallback(
    (imageUrl: string) => {
      const scanned = allScaResults.some(
        result => result.artifact_name === imageUrl
      );
      return scanned;
    },
    [allScaResults]
  );

  // 이미지의 스캔 결과 가져오기
  const getScannedImageResult = useCallback(
    (imageUrl: string) => {
      return allScaResults.find(result => result.artifact_name === imageUrl);
    },
    [allScaResults]
  );

  // 보안 메트릭 집계
  const aggregateSecurityMetrics = useCallback(() => {
    if (!scaResult?.vulnerabilities) {
      return {
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
        total: 0,
        packageCount: {},
        hotSpots: [],
      };
    }

    const severity = scaResult.summary?.severity_breakdown || {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const total: number = Object.values(severity).reduce(
      (a: number, b: unknown) => a + Number(b),
      0
    );

    // 패키지별 취약점 수 집계
    const packageCount: Record<string, number> = {};
    scaResult.vulnerabilities.forEach((vuln: Vulnerability) => {
      const pkgName = vuln.name || 'unknown';
      packageCount[pkgName] = (packageCount[pkgName] || 0) + 1;
    });

    // Hot Spots (가장 취약한 패키지 TOP 5)
    const hotSpots = Object.entries(packageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pkg, count]) => ({ package: pkg, count }));

    return { severity, total, packageCount, hotSpots };
  }, [scaResult]);

  // 요약 콘텐츠 렌더링 - 통일된 디자인 시스템 적용
  const renderSummaryContent = () => {
    const { hotSpots } = aggregateSecurityMetrics();

    return (
      <>
        {/* Hot Spots */}
        <Card
          title={
            <Text strong style={{ fontSize: '15px' }}>
              Hot Spots (가장 취약한 패키지 TOP 5)
            </Text>
          }
          size='small'
          style={{
            marginBottom: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            borderRadius: '8px',
          }}
        >
          {hotSpots.length > 0 ? (
            <div>
              {hotSpots.map(({ package: pkg, count }, idx) => (
                <div
                  key={pkg}
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
                      ellipsis={{ tooltip: pkg }}
                    >
                      {pkg}
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
                <Text type='secondary'>Hot Spots 데이터가 없습니다</Text>
              }
            />
          )}
        </Card>

        {/* 이미지 정보 */}
        {scaResult?.artifact_name && (
          <Card
            title={
              <Text strong style={{ fontSize: '15px' }}>
                스캔 대상 이미지
              </Text>
            }
            size='small'
            style={{
              marginBottom: 20,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              borderRadius: '8px',
            }}
          >
            <div style={{ padding: 8 }}>
              <Text strong>이미지: </Text>
              <Text copyable>{scaResult.artifact_name}</Text>
              <br />
              <Text strong>타입: </Text>
              <Text>{scaResult.artifact_type || 'container_image'}</Text>
            </div>
          </Card>
        )}
      </>
    );
  };

  // 상세 분석 렌더링
  const renderDetailView = () => {
    if (!scaResult?.vulnerabilities) {
      return <Alert message='상세 데이터가 없습니다.' type='warning' />;
    }

    const vulnerabilities = scaResult.vulnerabilities as Vulnerability[];

    return (
      <div>
        {vulnerabilities.length === 0 ? (
          <Alert
            message='발견된 취약점 없음'
            description='분석 결과 보안 취약점이 발견되지 않았습니다.'
            type='success'
            showIcon
            icon={<CheckCircleOutlined />}
            style={{
              marginBottom: spacing.lg,
              borderRadius: borderRadius.lg,
              border: '2px solid #b7eb8f',
            }}
          />
        ) : (
          <div
            style={{
              maxHeight: '600px',
              overflow: 'auto',
              paddingRight: '8px',
            }}
          >
            {vulnerabilities.map((v: Vulnerability, index: number) => {
              const vuln = v;
              const severity = parseSeverity(vuln.severity);
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
                          {vuln.cve || vuln.name}
                        </Text>
                      </Space>
                      <Space size={4}>
                        {vuln.cwe_ids
                          ?.slice(0, 1)
                          .map((cwe: string, i: number) => (
                            <Tag key={i} color='volcano' style={{ margin: 0 }}>
                              {cwe}
                            </Tag>
                          ))}
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
                    {vuln.description && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#595959',
                          display: 'block',
                          lineHeight: 1.6,
                        }}
                      >
                        {vuln.description}
                      </Text>
                    )}

                    {/* 패키지 정보 */}
                    <Descriptions size='small' column={2}>
                      <Descriptions.Item
                        label={
                          <Space>
                            <BugOutlined />
                            패키지
                          </Space>
                        }
                      >
                        <Text strong>{vuln.name}</Text>
                      </Descriptions.Item>
                      {vuln.version && (
                        <Descriptions.Item label='설치 버전'>
                          <Text code>{vuln.version}</Text>
                        </Descriptions.Item>
                      )}
                      {vuln.fix_available && vuln.fixed_version && (
                        <Descriptions.Item label='수정 버전'>
                          <Text code style={{ color: '#52c41a' }}>
                            {vuln.fixed_version}
                          </Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {/* 참고 링크 */}
                    {vuln.references && vuln.references.length > 0 && (
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
                                <LinkOutlined />
                                <Text style={{ fontSize: 13 }}>
                                  참고 링크 ({vuln.references.length})
                                </Text>
                              </Space>
                            ),
                            children: (
                              <div>
                                {vuln.references
                                  .slice(0, 3)
                                  .map((ref: string, i: number) => (
                                    <a
                                      key={i}
                                      href={ref}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      style={{
                                        display: 'block',
                                        fontSize: 12,
                                        marginBottom: 4,
                                      }}
                                    >
                                      {ref.length > 60
                                        ? `${ref.substring(0, 60)}...`
                                        : ref}
                                    </a>
                                  ))}
                                {vuln.references.length > 3 && (
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: 11 }}
                                  >
                                    외 {vuln.references.length - 3}개
                                  </Text>
                                )}
                              </div>
                            ),
                          },
                        ]}
                      />
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

  // 실행 로그 렌더링
  const renderExecutionLogs = () => {
    const executionLog = scaResult?.execution_log;

    return (
      <Card title='이미지 분석 실행 로그' size='small'>
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
          {executionLog?.trivy_scan?.log_messages ? (
            <div>
              <Text
                strong
                style={{
                  color: '#fa8c16',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Trivy 스캔:
              </Text>
              {executionLog.trivy_scan.log_messages.map(
                (log: string, index: number) => (
                  <pre key={index} style={{ margin: 0, marginBottom: 4 }}>
                    {log}
                  </pre>
                )
              )}
            </div>
          ) : executionLog?.full_execution_log?.log_messages ? (
            <div>
              <Text
                strong
                style={{
                  color: '#722ed1',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                실행 로그:
              </Text>
              {executionLog.full_execution_log.log_messages.map(
                (log: string, index: number) => (
                  <pre key={index} style={{ margin: 0, marginBottom: 4 }}>
                    {log}
                  </pre>
                )
              )}
            </div>
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
      {/* 헤더: 타이틀만 표시 (스캔 버튼은 이미지 목록에서 직접 실행) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <ExperimentOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          이미지 분석 결과
        </span>
      </div>

      {/* 빌드된 이미지 목록 섹션 */}
      {builtImages.length > 0 && (
        <Collapse
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'built-images',
              label: (
                <Space>
                  <ContainerOutlined style={{ color: '#1890ff' }} />
                  <Text strong>빌드된 이미지 목록</Text>
                  <Tag color='blue'>{builtImages.length}개</Tag>
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    message='이미지를 선택하여 취약점 스캔을 실행하세요'
                    description='빌드된 모든 이미지가 표시됩니다. 스캔 버튼을 클릭하여 취약점 분석을 시작할 수 있습니다.'
                    type='info'
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <List
                    size='small'
                    dataSource={builtImages.slice(0, 20)} // 최대 20개만 표시
                    style={{ maxHeight: 400, overflow: 'auto' }}
                    renderItem={image => {
                      const scanned = isImageScanned(image.image_url);
                      const scanResult = scanned
                        ? getScannedImageResult(image.image_url)
                        : null;
                      const vulnCount =
                        scanResult?.vulnerabilities?.length || 0;

                      return (
                        <List.Item
                          style={{
                            padding: '12px 16px',
                            background: scanned ? '#f6ffed' : '#fafafa',
                            marginBottom: 8,
                            borderRadius: 6,
                            border: scanned
                              ? '1px solid #b7eb8f'
                              : '1px solid #e8e8e8',
                          }}
                          actions={[
                            <Button
                              key='scan'
                              type={scanned ? 'default' : 'primary'}
                              size='small'
                              icon={<ScanOutlined />}
                              onClick={() => handleQuickScan(image.image_url)}
                              loading={isScanning}
                              disabled={isScanning}
                            >
                              {scanned ? '재스캔' : '스캔'}
                            </Button>,
                            scanned && (
                              <Button
                                key='view'
                                type='link'
                                size='small'
                                onClick={() =>
                                  handleImageSelect(image.image_url, true)
                                }
                              >
                                결과 보기
                              </Button>
                            ),
                          ].filter(Boolean)}
                        >
                          <List.Item.Meta
                            avatar={
                              <ContainerOutlined
                                style={{
                                  fontSize: 24,
                                  color: scanned ? '#52c41a' : '#1890ff',
                                }}
                              />
                            }
                            title={
                              <Space size='small' wrap>
                                <Tooltip title={image.image_url}>
                                  <Text
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: 12,
                                      maxWidth: 400,
                                    }}
                                    ellipsis
                                    copyable={{ text: image.image_url }}
                                  >
                                    {image.image_url}
                                  </Text>
                                </Tooltip>
                                {scanned && (
                                  <Tag
                                    color='green'
                                    icon={<CheckCircleOutlined />}
                                  >
                                    스캔 완료
                                  </Tag>
                                )}
                                {scanned && vulnCount > 0 && (
                                  <Tag
                                    color={
                                      vulnCount > 10
                                        ? 'red'
                                        : vulnCount > 5
                                          ? 'orange'
                                          : 'gold'
                                    }
                                  >
                                    취약점 {vulnCount}개
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Space size='middle'>
                                <Text type='secondary' style={{ fontSize: 11 }}>
                                  <ClockCircleOutlined
                                    style={{ marginRight: 4 }}
                                  />
                                  빌드:{' '}
                                  {dayjs(image.build_date).format(
                                    'YYYY-MM-DD HH:mm'
                                  )}
                                </Text>
                                {scanResult?.scan_date && (
                                  <Text
                                    type='secondary'
                                    style={{ fontSize: 11 }}
                                  >
                                    <ScanOutlined style={{ marginRight: 4 }} />
                                    스캔:{' '}
                                    {dayjs(scanResult.scan_date).format(
                                      'YYYY-MM-DD HH:mm'
                                    )}
                                  </Text>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                    footer={
                      builtImages.length > 20 && (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                          <Text type='secondary'>
                            + {builtImages.length - 20}개 이미지 더 있음
                            (모달에서 확인 가능)
                          </Text>
                        </div>
                      )
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      )}

      {/* 본문 (결과 영역) */}
      <div ref={resultSectionRef}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size='large' />
            <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>
              이미지 분석 결과를 불러오는 중입니다...
            </p>
          </div>
        ) : isScanning && !scaResult ? (
          // 기존 결과가 없을 때만 스피너 표시
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size='large' />
            <p
              style={{ marginTop: '16px', fontSize: '16px', color: '#1890ff' }}
            >
              이미지 분석이 진행 중입니다...
            </p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
              잠시만 기다려주세요. 스캔이 완료되면 자동으로 결과가 표시됩니다.
            </p>
          </div>
        ) : error ? (
          <div
            style={{ textAlign: 'center', padding: '60px 0', color: '#ff4d4f' }}
          >
            <ExperimentOutlined
              style={{ fontSize: '48px', marginBottom: '16px' }}
            />
            <p style={{ fontSize: '16px', margin: 0 }}>{error}</p>
          </div>
        ) : !scaResult ? (
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
                      이미지 분석이 수행되지 않았습니다
                    </Text>
                    <Text type='secondary' style={{ fontSize: '14px' }}>
                      위의 이미지 목록에서 스캔할 이미지를 선택하세요
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
                          <ExperimentOutlined
                            style={{ color: '#1890ff', marginRight: '8px' }}
                          />
                          이미지 분석이 제공하는 정보:
                        </Text>
                        <Space
                          direction='vertical'
                          size='small'
                          style={{ width: '100%' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                            }}
                          >
                            <CheckCircleOutlined
                              style={{
                                color: '#52c41a',
                                marginRight: '8px',
                                marginTop: '4px',
                              }}
                            />
                            <Text style={{ fontSize: '13px' }}>
                              <Text strong>패키지 취약점:</Text> 컨테이너 이미지
                              내 라이브러리 및 패키지의 알려진 취약점 탐지
                            </Text>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                            }}
                          >
                            <CheckCircleOutlined
                              style={{
                                color: '#52c41a',
                                marginRight: '8px',
                                marginTop: '4px',
                              }}
                            />
                            <Text style={{ fontSize: '13px' }}>
                              <Text strong>심각도 분석:</Text> Critical, High,
                              Medium, Low 등급별 취약점 분류
                            </Text>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                            }}
                          >
                            <CheckCircleOutlined
                              style={{
                                color: '#52c41a',
                                marginRight: '8px',
                                marginTop: '4px',
                              }}
                            />
                            <Text style={{ fontSize: '13px' }}>
                              <Text strong>수정 방안:</Text> 각 취약점별 수정
                              가능 버전 및 패치 정보 제공
                            </Text>
                          </div>
                        </Space>
                      </div>

                      <Alert
                        message='권장사항'
                        description="정기적인 이미지 분석을 통해 배포 전 보안 이슈를 사전에 발견하고 해결할 수 있습니다. 위의 '빌드된 이미지 목록'에서 스캔할 이미지를 선택하세요."
                        type='info'
                        showIcon
                        icon={<WarningOutlined />}
                        style={{ marginTop: '8px' }}
                      />
                    </Space>
                  </Card>
                </Space>
              }
            />
          </div>
        ) : (
          <div>
            {((): null => {
              return null;
            })()}
            {/* 스캔 진행 중일 때 배너 표시 (기존 결과가 있는 경우) */}
            {isScanning && scaResult && (
              <ScanningBanner
                scanType='sca'
                targetName={selectedImageName || undefined}
              />
            )}

            <ScanningOverlayWrapper isScanning={isScanning}>
              {/* 선택된 이미지 정보 표시 */}
              {selectedImageName && (
                <Card
                  size='small'
                  style={{
                    marginBottom: 16,
                    background:
                      'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
                    border: '1px solid #91d5ff',
                  }}
                >
                  <Space>
                    <ContainerOutlined
                      style={{ fontSize: 18, color: '#1890ff' }}
                    />
                    <div>
                      <Text strong>분석 대상 이미지</Text>
                      <br />
                      <Text
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                        copyable={{ text: selectedImageName }}
                      >
                        {selectedImageName}
                      </Text>
                      {scaResult?.scan_date && (
                        <Text
                          type='secondary'
                          style={{ marginLeft: 12, fontSize: 11 }}
                        >
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          스캔:{' '}
                          {dayjs(scaResult.scan_date).format(
                            'YYYY-MM-DD HH:mm'
                          )}
                        </Text>
                      )}
                    </div>
                  </Space>
                </Card>
              )}

              {/*  showTabs가 false면 요약만 표시, true면 탭으로 표시 */}
              {!showTabs ? (
                // showTabs=false: 요약만 표시 (dashboard/modal 사용)
                <div>{renderSummaryContent()}</div>
              ) : (
                // showTabs=true: SAST와 동일한 구조로 탭 표시
                <Tabs
                  activeKey={activeTab}
                  onChange={key =>
                    setActiveTab(key as 'checklist' | 'details' | 'info')
                  }
                  style={{ marginBottom: 16 }}
                >
                  {/* 취약점 카테고리 분류 */}
                  <TabPane
                    tab={
                      <span>
                        <CheckSquareOutlined style={{ marginRight: 6 }} />
                        취약점 카테고리 분류
                      </span>
                    }
                    key='checklist'
                  >
                    {/* SCA 정보 배너 */}
                    <Alert
                      type='info'
                      showIcon
                      icon={<InfoCircleOutlined />}
                      style={{ marginBottom: 16, borderRadius: 8 }}
                      message={
                        <span style={{ fontWeight: 600 }}>
                          컨테이너 이미지 취약점 분석 (SCA)
                        </span>
                      }
                      description={
                        <div style={{ marginTop: 8 }}>
                          <div style={{ marginBottom: 12, color: '#666' }}>
                            CVE(Common Vulnerabilities and Exposures) 기반의
                            컨테이너 이미지 보안 취약점 분류입니다. Trivy
                            스캐너를 통해 발견된 취약점들이 심각도에 따라
                            분류됩니다.
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: '#262626' }}>
                              주요 취약점 유형:
                            </strong>
                            <span style={{ color: '#666', marginLeft: 8 }}>
                              OS 패키지, 애플리케이션 의존성, 라이브러리 취약점
                            </span>
                          </div>
                          <div>
                            <strong style={{ color: '#262626' }}>
                              분석 도구:
                            </strong>
                            <span style={{ color: '#666', marginLeft: 8 }}>
                              Trivy (컨테이너 이미지 취약점 스캐너)
                            </span>
                          </div>
                        </div>
                      }
                    />

                    {/* 카테고리화된 취약점 뷰 */}
                    <CategorizedVulnerabilityView
                      repoId={repoId || serviceId || 0}
                      analysisType='sca'
                      selectedImageName={selectedImageName}
                      onRefresh={fetchResults}
                    />
                  </TabPane>

                  {/* 취약점 상세 */}
                  <TabPane
                    tab={
                      <span>
                        <BugOutlined style={{ marginRight: 6 }} />
                        취약점 상세
                      </span>
                    }
                    key='details'
                  >
                    {renderDetailView()}
                  </TabPane>

                  {/* 분석 정보 (요약 + 실행 로그) */}
                  <TabPane
                    tab={
                      <span>
                        <SafetyOutlined style={{ marginRight: 6 }} />
                        분석 정보
                      </span>
                    }
                    key='info'
                  >
                    {/* 요약 정보 */}
                    {renderSummaryContent()}

                    {/* 실행 로그 - 바로 표시 */}
                    {renderExecutionLogs()}
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
                      selectedImageName={selectedImageName}
                      onRefresh={() => fetchResults()}
                      sbomType='image'
                    />
                  </TabPane>
                </Tabs>
              )}
            </ScanningOverlayWrapper>
          </div>
        )}
      </div>

      {/* 파라미터 모달 */}
      {repoId && (
        <ScaParamsModal
          visible={scaParamsModalOpen}
          onClose={() => {
            setScaParamsModalOpen(false);
            setSelectedImageForScan(null); //  모달 닫을 때 선택 이미지 초기화
          }}
          onConfirm={handleScaParamsConfirm}
          loading={isScanning}
          builtImages={builtImages}
          registryConfig={registryConfig}
          defaultImageUrl={selectedImageForScan || undefined} //  빌드 목록에서 선택한 이미지 URL 전달
        />
      )}
    </div>
  );
};

export default ScaResultsContent;
