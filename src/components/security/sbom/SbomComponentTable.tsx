/**
 * SBOM Component Table
 *
 * SBOM 컴포넌트 목록을 테이블 형태로 표시하는 컴포넌트
 * - 컴포넌트 이름, 버전, 타입, 라이선스 정보
 * - 검색 및 필터링 기능
 * - PURL 및 외부 참조 링크
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Space,
  Typography,
  Tooltip,
  Button,
  Popover,
  Badge,
  message,
} from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  FilterOutlined,
  ExportOutlined,
  WarningOutlined,
  BugOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import type {
  SbomComponent,
  SbomComponentType,
} from '../../../types/securityAnalysis';
import {
  SBOM_COMPONENT_TYPE_LABELS,
  LICENSE_CATEGORY_INFO,
} from '../../../types/securityAnalysis';
import type { CombinedVulnerability } from '../../../types/vulnerability';
import { SEVERITY_COLORS, SEVERITY_LABELS_KO } from '../../../types/vulnerability';

const { Text, Link } = Typography;

// 컴포넌트별 취약점 정보
interface ComponentVulnInfo {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  vulnerabilities: CombinedVulnerability[];
}

interface SbomComponentTableProps {
  components: SbomComponent[];
  loading?: boolean;
  pageSize?: number;
  vulnerabilities?: CombinedVulnerability[]; // 취약점 데이터 추가
  onViewVulnerability?: (vuln: CombinedVulnerability) => void; // 취약점 클릭 핸들러
}

/**
 * 컴포넌트 타입별 색상 매핑
 */
const COMPONENT_TYPE_COLORS: Record<SbomComponentType, string> = {
  library: 'blue',
  framework: 'purple',
  application: 'green',
  container: 'orange',
  'operating-system': 'red',
  device: 'cyan',
  file: 'default',
};

/**
 * PURL에서 패키지 타입 추출
 */
const extractPackageType = (purl: string | undefined): string => {
  if (!purl) return 'unknown';
  const match = purl.match(/^pkg:([^/]+)\//);
  return match ? match[1] : 'unknown';
};

/**
 * 라이선스 태그 렌더링
 */
const LicenseTag: React.FC<{ license: string | any }> = ({ license }) => {
  // 라이선스가 유효한 문자열인지 확인
  const getLicenseString = (lic: any): string => {
    if (typeof lic === 'string') {
      // "라이선스: {...}" 형태의 문자열 처리
      if (lic.startsWith('라이선스:') || lic.startsWith('[')) {
        try {
          // JSON 파싱 시도
          const parsed = JSON.parse(
            lic.replace(/^라이선스:\s*/, '').replace(/^\[|\]$/g, '')
          );
          if (parsed && typeof parsed === 'object') {
            return parsed.name || parsed.id || parsed.license || lic;
          }
        } catch {
          // 파싱 실패 시 원본 반환
          return lic;
        }
      }
      return lic;
    }
    if (lic && typeof lic === 'object') {
      // 객체인 경우 id, name, license 필드 확인 (각 필드도 문자열로 변환)
      const id = typeof lic.id === 'string' ? lic.id : '';
      const name = typeof lic.name === 'string' ? lic.name : '';
      const licenseName = typeof lic.license === 'string' ? lic.license : '';
      const extracted = id || name || licenseName;
      if (extracted) return extracted;

      // 마지막 수단: JSON 문자열화 후 name 필드 추출 시도
      const jsonStr = JSON.stringify(lic);
      const nameMatch = jsonStr.match(/"name"\s*:\s*"([^"]+)"/);
      if (nameMatch) return nameMatch[1];

      return 'Unknown';
    }
    return String(lic || 'Unknown');
  };

  const licenseStr = getLicenseString(license);

  // 라이선스 카테고리 추정
  const getCategoryFromLicense = (
    id: string
  ): keyof typeof LICENSE_CATEGORY_INFO | null => {
    if (!id || typeof id !== 'string') {
      return null;
    }
    const upper = id.toUpperCase();
    if (
      ['MIT', 'APACHE', 'BSD', 'ISC', 'UNLICENSE', '0BSD'].some(p =>
        upper.includes(p)
      )
    ) {
      return 'permissive';
    }
    if (['LGPL', 'MPL', 'EPL', 'CDDL'].some(p => upper.includes(p))) {
      return 'weak_copyleft';
    }
    if (['GPL', 'AGPL', 'SSPL'].some(p => upper.includes(p))) {
      return 'strong_copyleft';
    }
    if (['COMMERCIAL', 'PROPRIETARY'].some(p => upper.includes(p))) {
      return 'proprietary';
    }
    return null;
  };

  const category = getCategoryFromLicense(licenseStr);
  const info = category ? LICENSE_CATEGORY_INFO[category] : null;

  return (
    <Tooltip title={info?.description}>
      <Tag color={info?.color || 'default'} style={{ margin: '2px 4px 2px 0' }}>
        {info?.icon} {licenseStr}
      </Tag>
    </Tooltip>
  );
};

/**
 * 외부 참조 팝오버
 */
const ExternalRefsPopover: React.FC<{
  refs: Array<{ type: string; url: string }>;
}> = ({ refs }) => {
  if (refs.length === 0) return <Text type='secondary'>-</Text>;

  const content = (
    <Space direction='vertical' size={4} style={{ maxWidth: 400 }}>
      {refs.map((ref, idx) => (
        <div key={idx}>
          <Tag color='default' style={{ marginRight: 4 }}>
            {ref.type}
          </Tag>
          <Link
            href={ref.url}
            target='_blank'
            ellipsis
            style={{ maxWidth: 280 }}
          >
            {ref.url}
          </Link>
        </div>
      ))}
    </Space>
  );

  return (
    <Popover content={content} title='외부 참조' trigger='click'>
      <Button type='link' size='small' icon={<ExportOutlined />}>
        {refs.length}개
      </Button>
    </Popover>
  );
};

export const SbomComponentTable: React.FC<SbomComponentTableProps> = ({
  components,
  loading = false,
  pageSize = 20,
  vulnerabilities = [],
  onViewVulnerability,
}) => {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<SbomComponentType | 'all'>(
    'all'
  );
  const [licenseFilter, setLicenseFilter] = useState<string>('all');
  const [vulnFilter, setVulnFilter] = useState<'all' | 'vulnerable' | 'safe'>('all');

  // Controlled sorting state - 취약점 컬럼 기본 내림차순 정렬
  const [sortedInfo, setSortedInfo] = useState<SorterResult<SbomComponent>>({
    columnKey: 'vulnerabilities',
    order: 'descend',
  });

  // 취약점 데이터가 로드되면 기본 정렬 적용
  useEffect(() => {
    if (vulnerabilities.length > 0) {
      setSortedInfo({
        columnKey: 'vulnerabilities',
        order: 'descend',
      });
    }
  }, [vulnerabilities.length]);

  // 컴포넌트별 취약점 매핑 생성
  const componentVulnMap = useMemo(() => {
    const map = new Map<string, ComponentVulnInfo>();

    vulnerabilities.forEach(vuln => {
      // 컴포넌트 이름 정규화 (대소문자 무시, 공백 제거)
      const normalizedName = vuln.component_name?.toLowerCase().trim() || '';
      const normalizedVersion = vuln.component_version?.toLowerCase().trim() || '';
      const key = `${normalizedName}@${normalizedVersion}`;

      if (!map.has(key)) {
        map.set(key, {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          vulnerabilities: [],
        });
      }

      const info = map.get(key)!;
      info.total += 1;
      info.vulnerabilities.push(vuln);

      switch (vuln.severity) {
        case 'critical':
          info.critical += 1;
          break;
        case 'high':
          info.high += 1;
          break;
        case 'medium':
          info.medium += 1;
          break;
        case 'low':
          info.low += 1;
          break;
      }
    });

    return map;
  }, [vulnerabilities]);

  // 컴포넌트에 대한 취약점 정보 조회
  const getComponentVulnInfo = useCallback((compName: string, compVersion: string): ComponentVulnInfo | null => {
    const normalizedName = compName?.toLowerCase().trim() || '';
    const normalizedVersion = compVersion?.toLowerCase().trim() || '';

    // 정확히 일치하는 경우
    const exactKey = `${normalizedName}@${normalizedVersion}`;
    if (componentVulnMap.has(exactKey)) {
      return componentVulnMap.get(exactKey)!;
    }

    // 이름만 일치하는 경우 (버전이 다를 수 있음)
    for (const [key, info] of componentVulnMap.entries()) {
      const [vulnName] = key.split('@');
      // 부분 일치도 체크 (예: github.com/gin-contrib/cors와 gin-contrib/cors)
      if (vulnName === normalizedName ||
          normalizedName.includes(vulnName) ||
          vulnName.includes(normalizedName)) {
        return info;
      }
    }

    return null;
  }, [componentVulnMap]);

  // 고유 라이선스 목록 추출
  const uniqueLicenses = useMemo(() => {
    const licenses = new Set<string>();
    components.forEach(comp => {
      if (comp.licenses && Array.isArray(comp.licenses)) {
        comp.licenses.forEach((lic: any) => {
          if (lic) {
            const licStr =
              typeof lic === 'string'
                ? lic
                : lic && typeof lic === 'object'
                  ? lic.id || lic.name || lic.license
                  : String(lic);
            if (licStr) {
              licenses.add(licStr);
            }
          }
        });
      }
    });
    return Array.from(licenses).sort();
  }, [components]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    // 라이선스 문자열 변환 헬퍼
    const getLicenseString = (lic: any): string => {
      if (typeof lic === 'string') {
        if (lic.startsWith('라이선스:') || lic.startsWith('[')) {
          try {
            const parsed = JSON.parse(
              lic.replace(/^라이선스:\s*/, '').replace(/^\[|\]$/g, '')
            );
            if (parsed && typeof parsed === 'object') {
              return parsed.name || parsed.id || parsed.license || lic;
            }
          } catch {
            return lic;
          }
        }
        return lic;
      }
      if (lic && typeof lic === 'object') {
        const id = typeof lic.id === 'string' ? lic.id : '';
        const name = typeof lic.name === 'string' ? lic.name : '';
        const licenseName = typeof lic.license === 'string' ? lic.license : '';
        const extracted = id || name || licenseName;
        if (extracted) return extracted;
        const jsonStr = JSON.stringify(lic);
        const nameMatch = jsonStr.match(/"name"\s*:\s*"([^"]+)"/);
        if (nameMatch) return nameMatch[1];
        return '';
      }
      return String(lic || '');
    };

    const filtered = components.filter(comp => {
      // 검색어 필터
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesSearch =
          (comp.name && comp.name.toLowerCase().includes(search)) ||
          (comp.version && comp.version.toLowerCase().includes(search)) ||
          (comp.purl && comp.purl.toLowerCase().includes(search)) ||
          comp.licenses?.some(lic => {
            const licStr = getLicenseString(lic);
            return licStr.toLowerCase().includes(search);
          });
        if (!matchesSearch) return false;
      }

      // 타입 필터
      if (typeFilter !== 'all' && comp.type !== typeFilter) {
        return false;
      }

      // 라이선스 필터
      if (licenseFilter !== 'all') {
        const hasLicense = comp.licenses?.some(lic => {
          const licStr = getLicenseString(lic);
          return licStr === licenseFilter;
        });
        if (!hasLicense) {
          return false;
        }
      }

      // 취약점 필터
      if (vulnFilter !== 'all') {
        const vulnInfo = getComponentVulnInfo(comp.name || '', comp.version || '');
        const hasVuln = vulnInfo !== null && vulnInfo.total > 0;
        if (vulnFilter === 'vulnerable' && !hasVuln) {
          return false;
        }
        if (vulnFilter === 'safe' && hasVuln) {
          return false;
        }
      }

      return true;
    });

    return filtered;
  }, [components, searchText, typeFilter, licenseFilter, vulnFilter, getComponentVulnInfo]);

  // 컬럼 정의
  const columns: ColumnsType<SbomComponent> = [
    {
      title: '컴포넌트',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (name: string | undefined, record) => (
        <Space direction='vertical' size={0}>
          <Text strong ellipsis style={{ maxWidth: 180 }}>
            <Tooltip title={name || '-'}>{name || '-'}</Tooltip>
          </Text>
          {record.description && (
            <Text type='secondary' style={{ fontSize: 12 }} ellipsis>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '버전',
      dataIndex: 'version',
      key: 'version',
      width: 120,
      sorter: (a, b) => (a.version || '').localeCompare(b.version || ''),
      render: (version: string | undefined) => (
        <Text code style={{ fontSize: 12 }}>
          {version || '-'}
        </Text>
      ),
    },
    // 취약점 컬럼 (취약점 데이터가 있을 때만 표시)
    ...(vulnerabilities.length > 0
      ? [
          {
            title: (
              <Tooltip title="보안 취약점 정보">
                <Space size={4}>
                  <BugOutlined style={{ color: '#cf1322' }} />
                  <span>취약점</span>
                </Space>
              </Tooltip>
            ),
            key: 'vulnerabilities',
            width: 150,
            // Controlled sorting: sortedInfo state에서 정렬 상태 가져옴
            sortOrder: sortedInfo.columnKey === 'vulnerabilities' ? sortedInfo.order : null,
            sorter: (a: SbomComponent, b: SbomComponent) => {
              const aInfo = getComponentVulnInfo(a.name || '', a.version || '');
              const bInfo = getComponentVulnInfo(b.name || '', b.version || '');
              const aScore = (aInfo?.critical || 0) * 1000 + (aInfo?.high || 0) * 100 + (aInfo?.medium || 0) * 10 + (aInfo?.low || 0);
              const bScore = (bInfo?.critical || 0) * 1000 + (bInfo?.high || 0) * 100 + (bInfo?.medium || 0) * 10 + (bInfo?.low || 0);
              return aScore - bScore; // descend 정렬 시 취약점 많은 순서가 위로
            },
            render: (_: unknown, record: SbomComponent) => {
              const vulnInfo = getComponentVulnInfo(record.name || '', record.version || '');

              if (!vulnInfo || vulnInfo.total === 0) {
                return (
                  <Tooltip title="취약점 없음">
                    <Tag color="success" style={{ margin: 0 }}>
                      <SafetyCertificateOutlined /> 안전
                    </Tag>
                  </Tooltip>
                );
              }

              // 취약점 상세 팝오버 내용
              const vulnPopoverContent = (
                <div style={{ maxWidth: 350 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>
                    총 {vulnInfo.total}개의 취약점 발견
                  </div>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {vulnInfo.vulnerabilities.slice(0, 5).map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          backgroundColor:
                            SEVERITY_COLORS[v.severity as keyof typeof SEVERITY_COLORS] + '15',
                          borderLeft: `3px solid ${SEVERITY_COLORS[v.severity as keyof typeof SEVERITY_COLORS]}`,
                          cursor: onViewVulnerability ? 'pointer' : 'default',
                        }}
                        onClick={() => onViewVulnerability?.(v)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: 12 }}>
                            {v.cve_id}
                          </Text>
                          <Tag
                            color={SEVERITY_COLORS[v.severity as keyof typeof SEVERITY_COLORS]}
                            style={{ margin: 0, fontSize: 10 }}
                          >
                            {SEVERITY_LABELS_KO[v.severity as keyof typeof SEVERITY_LABELS_KO]}
                          </Tag>
                        </div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 11 }}
                          ellipsis
                        >
                          {v.title}
                        </Text>
                      </div>
                    ))}
                    {vulnInfo.total > 5 && (
                      <Text type="secondary" style={{ fontSize: 11, textAlign: 'center', display: 'block' }}>
                        외 {vulnInfo.total - 5}개 더 있음...
                      </Text>
                    )}
                  </Space>
                </div>
              );

              return (
                <Popover
                  content={vulnPopoverContent}
                  title={
                    <Space>
                      <WarningOutlined style={{ color: '#cf1322' }} />
                      취약점 목록
                    </Space>
                  }
                  trigger="hover"
                  placement="right"
                >
                  <div style={{ cursor: 'pointer' }}>
                    <Space size={4} wrap>
                      {vulnInfo.critical > 0 && (
                        <Tag color={SEVERITY_COLORS.critical} style={{ margin: 0, fontSize: 11 }}>
                          C:{vulnInfo.critical}
                        </Tag>
                      )}
                      {vulnInfo.high > 0 && (
                        <Tag color={SEVERITY_COLORS.high} style={{ margin: 0, fontSize: 11 }}>
                          H:{vulnInfo.high}
                        </Tag>
                      )}
                      {vulnInfo.medium > 0 && (
                        <Tag color={SEVERITY_COLORS.medium} style={{ margin: 0, fontSize: 11 }}>
                          M:{vulnInfo.medium}
                        </Tag>
                      )}
                      {vulnInfo.low > 0 && (
                        <Tag color={SEVERITY_COLORS.low} style={{ margin: 0, fontSize: 11 }}>
                          L:{vulnInfo.low}
                        </Tag>
                      )}
                    </Space>
                  </div>
                </Popover>
              );
            },
          },
        ]
      : []),
    {
      title: '타입',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      filters: Object.entries(SBOM_COMPONENT_TYPE_LABELS).map(
        ([key, label]) => ({
          text: label,
          value: key,
        })
      ),
      onFilter: (value, record) => record.type === value,
      render: (type: SbomComponentType) => (
        <Tag color={COMPONENT_TYPE_COLORS[type] || 'default'}>
          {SBOM_COMPONENT_TYPE_LABELS[type] || type}
        </Tag>
      ),
    },
    {
      title: '패키지 타입',
      key: 'packageType',
      width: 100,
      render: (_, record) => {
        const pkgType = extractPackageType(record.purl);
        return (
          <Tag color='default' style={{ fontFamily: 'monospace' }}>
            {pkgType}
          </Tag>
        );
      },
    },
    {
      title: '라이선스',
      dataIndex: 'licenses',
      key: 'licenses',
      width: 200,
      render: (licenses: any) => {
        if (!licenses || !Array.isArray(licenses) || licenses.length === 0) {
          return <Text type='secondary'>-</Text>;
        }

        // 라이선스 문자열 변환 헬퍼
        const getLicenseString = (lic: any): string => {
          if (typeof lic === 'string') {
            if (lic.startsWith('라이선스:') || lic.startsWith('[')) {
              try {
                const parsed = JSON.parse(
                  lic.replace(/^라이선스:\s*/, '').replace(/^\[|\]$/g, '')
                );
                if (parsed && typeof parsed === 'object') {
                  return parsed.name || parsed.id || parsed.license || lic;
                }
              } catch {
                return lic;
              }
            }
            return lic;
          }
          if (lic && typeof lic === 'object') {
            const id = typeof lic.id === 'string' ? lic.id : '';
            const name = typeof lic.name === 'string' ? lic.name : '';
            const licenseName =
              typeof lic.license === 'string' ? lic.license : '';
            const extracted = id || name || licenseName;
            if (extracted) return extracted;
            const jsonStr = JSON.stringify(lic);
            const nameMatch = jsonStr.match(/"name"\s*:\s*"([^"]+)"/);
            if (nameMatch) return nameMatch[1];
            return 'Unknown';
          }
          return String(lic || 'Unknown');
        };

        return (
          <div style={{ maxWidth: 180 }}>
            {licenses.slice(0, 2).map((lic, idx) => (
              <LicenseTag key={idx} license={lic} />
            ))}
            {licenses.length > 2 && (
              <Tooltip
                title={licenses.slice(2).map(getLicenseString).join(', ')}
              >
                <Tag color='default'>+{licenses.length - 2}</Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'PURL',
      dataIndex: 'purl',
      key: 'purl',
      width: 220,
      render: (purl: string | undefined) => {
        if (!purl) {
          return <Text type='secondary'>-</Text>;
        }

        // PURL에서 패키지 이름 추출 (pkg:type/namespace/name@version)
        const extractPackageName = (purlStr: string): string => {
          try {
            // @ 기준으로 버전 제거
            const withoutVersion = purlStr.split('@')[0];
            // 마지막 / 이후가 패키지명
            const parts = withoutVersion.split('/');
            return parts[parts.length - 1] || purlStr;
          } catch {
            return purlStr;
          }
        };

        const packageName = extractPackageName(purl);
        const pkgType = extractPackageType(purl);

        return (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 13 }}>
                {packageName}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag
                color='blue'
                style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
              >
                {pkgType}
              </Tag>
              <Tooltip title={`전체 PURL: ${purl}`}>
                <Button
                  type='text'
                  size='small'
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(purl);
                    message.success('PURL이 복사되었습니다');
                  }}
                  style={{ padding: 0, height: 18, fontSize: 11 }}
                />
              </Tooltip>
            </div>
          </div>
        );
      },
    },
    //  공급자 열 제거 - SBOM 데이터에 supplier 정보가 없어 모두 "-"로 표시되므로 불필요
    {
      title: '참조',
      dataIndex: 'externalReferences',
      key: 'externalReferences',
      width: 80,
      align: 'center',
      render: (refs: Array<{ type: string; url: string }> | undefined) =>
        refs && refs.length > 0 ? (
          <ExternalRefsPopover refs={refs} />
        ) : (
          <Text type='secondary'>-</Text>
        ),
    },
  ];

  return (
    <div>
      {/* 필터 영역 */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size={12}>
        <Input
          placeholder='컴포넌트 검색...'
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder='타입 필터'
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 140 }}
          options={[
            { label: '모든 타입', value: 'all' },
            ...Object.entries(SBOM_COMPONENT_TYPE_LABELS).map(
              ([key, label]) => ({
                label,
                value: key,
              })
            ),
          ]}
        />
        <Select
          placeholder='라이선스 필터'
          value={licenseFilter}
          onChange={setLicenseFilter}
          style={{ width: 180 }}
          showSearch
          allowClear
          options={[
            { label: '모든 라이선스', value: 'all' },
            ...uniqueLicenses.map(lic => ({
              label: lic,
              value: lic,
            })),
          ]}
        />
        {vulnerabilities.length > 0 && (
          <Select
            placeholder='취약점 필터'
            value={vulnFilter}
            onChange={setVulnFilter}
            style={{ width: 160 }}
            options={[
              { label: '모든 컴포넌트', value: 'all' },
              { label: '🔴 취약점 있음', value: 'vulnerable' },
              { label: ' 안전', value: 'safe' },
            ]}
          />
        )}
        <Badge count={filteredData.length} showZero color='#1890ff'>
          <Tag icon={<FilterOutlined />}>필터 결과</Tag>
        </Badge>
      </Space>

      {/* 테이블 */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey={record => `${record.purl}-${record.version}`}
        loading={loading}
        size='middle'
        onChange={(pagination, filters, sorter) => {
          // Controlled sorting: 정렬 상태 업데이트
          const sorterResult = sorter as SorterResult<SbomComponent>;
          setSortedInfo(sorterResult);
        }}
        pagination={{
          pageSize,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / 총 ${total}개`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText:
            searchText || typeFilter !== 'all' || licenseFilter !== 'all'
              ? '검색 결과가 없습니다'
              : '컴포넌트 정보가 없습니다',
        }}
        rowClassName={(_, index) =>
          index % 2 === 0 ? '' : 'sbom-table-row-alt'
        }
        style={{
          background: '#fff',
          borderRadius: 8,
        }}
      />
    </div>
  );
};

export default SbomComponentTable;
