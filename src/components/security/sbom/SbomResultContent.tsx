/**
 * SBOM Result Content Component
 *
 * SBOM(Software Bill of Materials) 분석 결과를 종합적으로 표시하는 컴포넌트
 * - SBOM 요약 카드
 * - 컴포넌트 목록 테이블
 * - 취약점 경고 및 상세 정보
 * - 라이선스 분석 요약 (옵션)
 * - SBOM 다운로드 기능
 */

import {
  DownloadOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ScanOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  message,
  Select,
  Space,
  Spin,
  Tooltip
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { analysisApi } from '../../../lib/api/analysis-client';
import { gitApi } from '../../../lib/api/gitRepository';
import { vulnerabilityApi } from '../../../lib/api/vulnerability';
import type {
  LicenseAnalysisResult,
  SbomResult,
} from '../../../types/securityAnalysis';
import type {
  CombinedVulnerability,
  DataSourceInfo,
  VulnerabilityAlert,
} from '../../../types/vulnerability';
import { DATA_SOURCE_COLORS, DATA_SOURCE_LABELS } from '../../../types/vulnerability';
import {
  VulnerabilityAlertBanner,
  VulnerabilityDetailModal,
  VulnerabilityIgnoreModal,
} from '../vulnerability';
import { SbomComponentTable } from './SbomComponentTable';
import { SbomSummaryCard } from './SbomSummaryCard';

interface SbomResultContentProps {
  serviceId: number;
  loading?: boolean;
  onRefresh?: () => void;
  selectedImageName?: string | null; // 선택된 이미지 이름
  sbomType?: 'image' | 'source'; // SBOM 타입 필터 (image: SCA, source: SAST)
}

export const SbomResultContent: React.FC<SbomResultContentProps> = ({
  serviceId,
  loading: externalLoading = false,
  onRefresh,
  selectedImageName,
  sbomType,
}) => {
  const [loading, setLoading] = useState(false);
  const [sbomResults, setSbomResults] = useState<SbomResult[]>([]);
  const [selectedSbom, setSelectedSbom] = useState<SbomResult | null>(null);
  const [_licenseAnalysis, setLicenseAnalysis] =
    useState<LicenseAnalysisResult | null>(null);
  const [_licenseLoading, setLicenseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 취약점 관련 상태
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityAlert[]>(
    []
  );
  const [combinedVulnerabilities, setCombinedVulnerabilities] = useState<CombinedVulnerability[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [vulnLoading, setVulnLoading] = useState(false);
  const [vulnSummary, setVulnSummary] = useState<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    patchable: number;
  } | null>(null);
  const [selectedVuln, setSelectedVuln] = useState<VulnerabilityAlert | null>(
    null
  );
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [ignoreModalVisible, setIgnoreModalVisible] = useState(false);

  // SBOM 목록 조회
  const fetchSbomResults = useCallback(async () => {
    if (!serviceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await gitApi.getSbomResults(serviceId);
      // API 응답 형식 처리: sboms 또는 results 필드 지원
      const rawData = response.data as Record<string, unknown> | undefined;
      const sbomData = rawData?.sboms || rawData?.results || [];
      let sbomArray = Array.isArray(sbomData) ? (sbomData as SbomResult[]) : [];

      // sbomType으로 필터링 (SAST: source, SCA: image)
      // AST 서비스가 다양한 타입명을 반환할 수 있으므로 유연하게 처리
      if (sbomType && sbomArray.length > 0) {
        if (sbomType === 'image') {
          // image 타입: "image", "container_image", "container" 등 이미지 관련 타입 모두 포함
          sbomArray = sbomArray.filter(
            sbom =>
              sbom.sbom_type === 'image' ||
              sbom.sbom_type?.includes('image') ||
              sbom.sbom_type?.includes('container')
          );
        } else if (sbomType === 'source') {
          // source 타입: "source", "repository", "code" 등 소스 관련 타입 모두 포함
          sbomArray = sbomArray.filter(
            sbom =>
              sbom.sbom_type === 'source' ||
              sbom.sbom_type?.includes('source') ||
              sbom.sbom_type?.includes('repo') ||
              sbom.sbom_type?.includes('code')
          );
        } else {
          // 기타 타입은 정확히 일치
          sbomArray = sbomArray.filter(sbom => sbom.sbom_type === sbomType);
        }
      }

      // 선택된 이미지가 있으면 필터링
      // 부분 일치도 허용 (이미지 태그나 레지스트리 경로가 약간 다를 수 있음)
      if (selectedImageName && sbomArray.length > 0) {
        // 정확히 일치하는 것 우선
        const exactMatch = sbomArray.filter(
          sbom => sbom.target_name === selectedImageName
        );
        if (exactMatch.length > 0) {
          sbomArray = exactMatch;
        } else {
          // 정확히 일치하는 것이 없으면 부분 일치 시도
          // 이미지 이름에서 태그 부분 추출 (예: image:tag -> image, tag)
          const selectedImageBase = selectedImageName.split(':')[0];
          const partialMatch = sbomArray.filter(
            sbom =>
              sbom.target_name?.includes(selectedImageBase) ||
              selectedImageName.includes(sbom.target_name || '')
          );
          if (partialMatch.length > 0) {
            sbomArray = partialMatch;
          }
          // 부분 일치도 없으면 전체 결과 유지 (필터링하지 않음)
        }
      }

      if (response.success && sbomArray.length > 0) {
        setSbomResults(sbomArray);
        // 가장 최신 SBOM 선택
        setSelectedSbom(sbomArray[0]);
      } else {
        setSbomResults([]);
        setSelectedSbom(null);
      }
    } catch {
      setError('SBOM 결과를 가져오는데 실패했습니다.');
      setSbomResults([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, selectedImageName, sbomType]);

  // 취약점 조회 (통합 API 사용 - OSV + SCA Trivy 또는 SAST)
  const fetchVulnerabilities = useCallback(async () => {
    if (!serviceId) return;

    setVulnLoading(true);
    try {
      // sbomType에 따라 source_type 결정
      // image: SCA (Trivy + OSV), source: SAST (Semgrep/CodeQL + OSV)
      const sourceType: 'sca' | 'sast' | 'all' = sbomType === 'image' ? 'sca' : sbomType === 'source' ? 'sast' : 'all';

      // 통합 취약점 API 호출
      const response = await vulnerabilityApi.getCombinedVulnerabilities(serviceId, 'all', undefined, sourceType);
      if (response.success && response.data) {
        // 통합 취약점 데이터 저장
        setCombinedVulnerabilities(response.data.vulnerabilities || []);
        setDataSources(response.data.data_sources || []);

        // VulnerabilityAlert 형식으로 변환 (기존 컴포넌트 호환)
        const vulnData = response.data.vulnerabilities || [];
        const alerts: VulnerabilityAlert[] = vulnData.map((v, idx) => ({
          id: v.id || idx,
          sbom_id: selectedSbom?.sbom_id || 0,
          service_id: serviceId,
          component_name: v.component_name,
          component_version: v.component_version,
          purl: '',
          package_type: v.data_source,
          cve_id: v.cve_id,
          cvss_score: v.cvss_score,
          cvss_version: '3.1',
          severity: v.severity,
          title: v.title,
          description: v.description,
          cwe_ids: '',
          references: v.references || '',
          published_at: null as string | null,
          modified_at: null as string | null,
          fixed_version: v.fixed_version || null,
          patch_available: v.patch_available,
          upgrade_command: null as string | null,
          status: v.status,
          data_source: v.data_source,
          source_id: v.source_tool,
          created_at: v.last_scanned_at,
          updated_at: v.last_scanned_at,
        }));

        setVulnerabilities(alerts);
        const patchableCount = vulnData.filter((v): v is CombinedVulnerability => v.patch_available === true).length;
        setVulnSummary({
          critical: response.data.critical_count || 0,
          high: response.data.high_count || 0,
          medium: response.data.medium_count || 0,
          low: response.data.low_count || 0,
          patchable: patchableCount,
        });
      } else {
        setVulnerabilities([]);
        setCombinedVulnerabilities([]);
        setDataSources([]);
        setVulnSummary(null);
      }
    } catch {
      // 취약점 데이터가 없는 경우 무시
      setVulnerabilities([]);
      setCombinedVulnerabilities([]);
      setDataSources([]);
      setVulnSummary(null);
    } finally {
      setVulnLoading(false);
    }
  }, [serviceId, selectedSbom?.sbom_id, sbomType]);

  // 라이선스 분석 결과 조회
  const fetchLicenseAnalysis = useCallback(async () => {
    if (!serviceId) return;

    setLicenseLoading(true);

    try {
      const response = await analysisApi.getLicenseAnalysis(serviceId);
      if (response.success && response.data) {
        setLicenseAnalysis(response.data);
      } else {
        setLicenseAnalysis(null);
      }
    } catch {
      // 라이선스 분석은 선택적이므로 에러를 무시
      setLicenseAnalysis(null);
    } finally {
      setLicenseLoading(false);
    }
  }, [serviceId]);

  // 초기 데이터 로드
  useEffect(() => {
    void fetchSbomResults();
    void fetchLicenseAnalysis();
  }, [fetchSbomResults, fetchLicenseAnalysis]);

  // SBOM 선택 시 취약점 조회
  useEffect(() => {
    if (selectedSbom) {
      void fetchVulnerabilities();
    }
  }, [selectedSbom, fetchVulnerabilities]);

  // SBOM 다운로드 (Demo 모드에서는 비활성화)
  const handleDownload = async (
    _sbomId: number,
    _format: 'json' | 'xml' = 'json'
  ) => {
    // Demo 모드: 실제 다운로드 대신 안내 메시지 표시
    message.info('Demo 모드에서는 SBOM 다운로드 기능을 사용할 수 없습니다.');
  };


  // 취약점 스캔 실행 (OSV API 스캔 후 통합 결과 조회)
  const handleVulnScan = async () => {
    if (!selectedSbom) return;

    setVulnLoading(true);
    try {
      // OSV API 스캔 실행
      const response = await vulnerabilityApi.scanVulnerabilities({
        sbom_id: selectedSbom.sbom_id,
        service_id: serviceId,
        force_refresh: true,
      });
      if (response.success && response.data) {
        message.success(
          `OSV API 스캔 완료: ${response.data.total_vulnerabilities}개 발견`
        );
        // 스캔 후 통합 취약점 조회 (OSV + SCA)
        await fetchVulnerabilities();
      }
    } catch {
      message.error('취약점 스캔에 실패했습니다.');
    } finally {
      setVulnLoading(false);
    }
  };

  // 취약점 무시 모달 열기
  const handleOpenIgnoreModal = (vuln: VulnerabilityAlert) => {
    setSelectedVuln(vuln);
    setIgnoreModalVisible(true);
  };

  // 취약점 무시 처리
  const handleIgnoreVuln = async (alertId: number, reason: string) => {
    try {
      await vulnerabilityApi.ignoreVulnerability({
        alert_id: alertId,
        reason,
      });
      setIgnoreModalVisible(false);
      setSelectedVuln(null);
      await fetchVulnerabilities();
    } catch {
      message.error('취약점 무시 처리에 실패했습니다.');
      throw new Error('취약점 무시 처리에 실패했습니다.');
    }
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    await fetchSbomResults();
    await fetchLicenseAnalysis();
    onRefresh?.();
  };

  const isLoading = loading || externalLoading;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size='large' />
        <p style={{ marginTop: '16px', color: '#666' }}>
          SBOM 데이터를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message='데이터 로드 오류'
        description={error}
        type='error'
        showIcon
        action={
          <Button size='small' onClick={handleRefresh}>
            다시 시도
          </Button>
        }
      />
    );
  }

  if (sbomResults.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            SBOM 데이터가 없습니다.
            <br />
            <span style={{ fontSize: 12, color: '#999' }}>
              SBOM(Software Bill of Materials)은 소프트웨어 구성요소 목록입니다.
              <br />
              위의 빌드된 이미지 목록에서 스캔 시{' '}
              <strong>&quot;SBOM 자동 생성&quot;</strong> 옵션을 활성화하면
              <br />
              취약점 분석과 함께 SBOM이 자동으로 생성됩니다.
            </span>
          </span>
        }
      >
        <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
          새로고침
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      {/* 헤더 액션 */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          {/* SBOM 선택 (여러 개인 경우) */}
          {sbomResults.length > 1 && (
            <Select
              value={selectedSbom?.sbom_id?.toString()}
              onChange={value => {
                const sbom = sbomResults.find(
                  s => s.sbom_id.toString() === value
                );
                if (sbom) setSelectedSbom(sbom);
              }}
              style={{ minWidth: 200 }}
              options={sbomResults.map(sbom => {
                // 이미지 이름에서 짧은 버전 추출 (마지막 부분만)
                const targetName = sbom.target_name || 'Unknown';
                const shortName = targetName.split('/').pop() || targetName;
                return {
                  value: sbom.sbom_id.toString(),
                  label: `${shortName} (${new Date(sbom.created_at).toLocaleDateString('ko-KR')})`,
                };
              })}
            />
          )}
        </Space>

        <Space>
          {selectedSbom && (
            <>
              <Tooltip title='취약점 스캔'>
                <Button
                  icon={<ScanOutlined />}
                  onClick={handleVulnScan}
                  loading={vulnLoading}
                >
                  취약점 스캔
                </Button>
              </Tooltip>
              <Tooltip title='SBOM 다운로드 (CycloneDX JSON)'>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(selectedSbom.sbom_id, 'json')}
                >
                  다운로드
                </Button>
              </Tooltip>
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            새로고침
          </Button>
        </Space>
      </div>

      {/*  탭 제거 - 내용만 직접 표시 */}
      {selectedSbom && (
        <div>
          {/* 요약 카드 */}
          <SbomSummaryCard sbom={selectedSbom} />

          {/* 데이터 소스 정보 표시 */}
          {dataSources.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Alert
                message={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>
                      <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                      취약점 데이터 소스
                    </span>
                    <Space size="large">
                      {dataSources.map((source) => (
                        <Tooltip
                          key={source.source}
                          title={
                            <div>
                              <div>{source.source_name}</div>
                              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                                {source.is_cached ? '캐시된 데이터' : '실시간 스캔 결과'}
                                {source.last_scan_at && (
                                  <span> • 마지막 스캔: {new Date(source.last_scan_at).toLocaleString('ko-KR')}</span>
                                )}
                              </div>
                            </div>
                          }
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: DATA_SOURCE_COLORS[source.source] + '15',
                              border: `1px solid ${DATA_SOURCE_COLORS[source.source]}40`,
                              color: DATA_SOURCE_COLORS[source.source],
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: DATA_SOURCE_COLORS[source.source],
                                marginRight: 6,
                              }}
                            />
                            {DATA_SOURCE_LABELS[source.source] || source.source_name}
                            <span style={{ marginLeft: 4, fontWeight: 600 }}>
                              ({source.vuln_count})
                            </span>
                          </span>
                        </Tooltip>
                      ))}
                    </Space>
                  </div>
                }
                type="info"
                style={{ marginBottom: 8 }}
              />
            </div>
          )}

          {/* 취약점 경고 배너 - 요약 정보만 표시 */}
          {(vulnerabilities.length > 0 || vulnSummary) && (
            <div style={{ marginTop: 16 }}>
              <VulnerabilityAlertBanner
                summary={{
                  sbom_id: selectedSbom.sbom_id,
                  alerts: vulnerabilities,
                  total_vulnerabilities: vulnerabilities.length,
                  critical_count: vulnSummary?.critical || 0,
                  high_count: vulnSummary?.high || 0,
                  medium_count: vulnerabilities.filter(v => v.severity === 'medium').length,
                  low_count: vulnerabilities.filter(v => v.severity === 'low').length,
                  open_count: vulnerabilities.filter(v => v.status === 'open').length,
                  patchable_count: vulnSummary?.patchable || 0,
                }}
                loading={vulnLoading}
                onRescan={handleVulnScan}
              />
            </div>
          )}

          {/*  중복 취약점 테이블 제거 - 컴포넌트 테이블에 취약점 컬럼으로 통합됨 */}

          {/* 컴포넌트 테이블 (라이선스 정보 + 취약점 정보 포함) */}
          <div style={{ marginTop: 16 }}>
            <SbomComponentTable
              components={selectedSbom.components || []}
              loading={loading}
              vulnerabilities={combinedVulnerabilities}
              onViewVulnerability={(vuln) => {
                // CombinedVulnerability를 VulnerabilityAlert로 변환하여 상세 모달 표시
                const alertVuln: VulnerabilityAlert = {
                  id: vuln.id || 0,
                  sbom_id: selectedSbom.sbom_id,
                  service_id: serviceId,
                  component_name: vuln.component_name,
                  component_version: vuln.component_version,
                  purl: '',
                  package_type: vuln.data_source,
                  cve_id: vuln.cve_id,
                  cvss_score: vuln.cvss_score,
                  cvss_version: '3.1',
                  severity: vuln.severity,
                  title: vuln.title,
                  description: vuln.description,
                  cwe_ids: '',
                  references: vuln.references || '',
                  published_at: null,
                  modified_at: null,
                  fixed_version: vuln.fixed_version || null,
                  patch_available: vuln.patch_available,
                  upgrade_command: null,
                  status: vuln.status,
                  data_source: vuln.data_source,
                  source_id: vuln.source_tool,
                  created_at: vuln.last_scanned_at,
                  updated_at: vuln.last_scanned_at,
                };
                setSelectedVuln(alertVuln);
                setDetailModalVisible(true);
              }}
            />
          </div>
        </div>
      )}

      {/* 취약점 상세 모달 */}
      <VulnerabilityDetailModal
        visible={detailModalVisible}
        vulnerability={selectedVuln}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedVuln(null);
        }}
        onIgnore={handleOpenIgnoreModal}
      />

      {/* 취약점 무시 모달 */}
      <VulnerabilityIgnoreModal
        visible={ignoreModalVisible}
        vulnerability={selectedVuln}
        loading={vulnLoading}
        onConfirm={handleIgnoreVuln}
        onCancel={() => {
          setIgnoreModalVisible(false);
          setSelectedVuln(null);
        }}
      />
    </div>
  );
};

export default SbomResultContent;
