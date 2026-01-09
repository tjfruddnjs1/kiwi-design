/**
 * GranularPermissionSelector
 * 세분화된 권한 선택을 위한 UX 최적화 컴포넌트
 *
 * Features:
 * - 카테고리별 접이식 패널
 * - 권한 검색 기능
 * - 위험도 표시
 * - 빠른 프리셋 버튼
 * - 카테고리별 전체 선택/해제
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Collapse,
  Checkbox,
  Input,
  Space,
  Tag,
  Badge,
  Button,
  Tooltip,
  Typography,
  Row,
  Col,
  Divider,
  Spin,
  Empty,
  Alert,
} from 'antd';
import {
  SearchOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { permissionApi } from '../../lib/api/permission';
import {
  PermissionDefinition,
  GroupedPermissions,
  PermissionCategory,
  RiskLevel,
  CATEGORY_NAMES,
  CATEGORY_DESCRIPTIONS,
  RISK_LEVEL_NAMES,
  RISK_LEVEL_COLORS,
  SUBCATEGORY_NAMES,
  HIDDEN_PERMISSIONS,
} from '../../types/permission';

const { Panel } = Collapse;
const { Text } = Typography;

// 카테고리 아이콘 매핑 (실제 시스템 메뉴 기반 5개 카테고리)
const CATEGORY_ICONS: Record<PermissionCategory, React.ReactNode> = {
  service: <CloudServerOutlined />,
  infra: <ClusterOutlined />,
  backup: <CloudUploadOutlined />,
  device: <DesktopOutlined />,
  database: <DatabaseOutlined />,
};

// 카테고리 색상 매핑
const CATEGORY_COLORS: Record<PermissionCategory, string> = {
  service: '#52c41a',
  infra: '#1890ff',
  backup: '#722ed1',
  device: '#eb2f96',
  database: '#13c2c2',
};

// 권한 프리셋 정의
interface PermissionPreset {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  permissionFilter: (perm: PermissionDefinition) => boolean;
  isAdditive?: boolean; // true면 중복 선택(토글), false면 대체
}

// 카테고리별 프리셋 키 (중복 선택 가능한 그룹)
const CATEGORY_PRESET_KEYS = ['device', 'infra', 'backup', 'service', 'database'];

const PERMISSION_PRESETS: PermissionPreset[] = [
  // 1. 전체 권한
  {
    key: 'admin',
    label: '전체 권한',
    description: '모든 권한 부여',
    icon: <SafetyOutlined />,
    color: '#f5222d',
    permissionFilter: () => true,
    isAdditive: false,
  },
  // 2. 장비 관리
  {
    key: 'device',
    label: '장비 관리',
    description: '장비 생성/수정/삭제',
    icon: <DesktopOutlined />,
    color: '#eb2f96',
    permissionFilter: (perm) => perm.category === 'device',
    isAdditive: true,
  },
  // 3. 런타임 환경 관리
  {
    key: 'infra',
    label: '런타임 환경',
    description: 'K8s/Docker/Podman 관리',
    icon: <ClusterOutlined />,
    color: '#1890ff',
    permissionFilter: (perm) => perm.category === 'infra',
    isAdditive: true,
  },
  // 4. 백업 관리
  {
    key: 'backup',
    label: '백업 관리',
    description: '백업 생성/복구/다운로드',
    icon: <CloudUploadOutlined />,
    color: '#722ed1',
    permissionFilter: (perm) => perm.category === 'backup',
    isAdditive: true,
  },
  // 5. 서비스 관리
  {
    key: 'service',
    label: '서비스 관리',
    description: '서비스 빌드/배포/운영',
    icon: <CloudServerOutlined />,
    color: '#52c41a',
    permissionFilter: (perm) => perm.category === 'service',
    isAdditive: true,
  },
  // 6. 데이터베이스 관리
  {
    key: 'database',
    label: '데이터베이스',
    description: 'DB 연결/동기화/마이그레이션',
    icon: <DatabaseOutlined />,
    color: '#13c2c2',
    permissionFilter: (perm) => perm.category === 'database',
    isAdditive: true,
  },
  // 7. 조회 전용
  {
    key: 'viewer',
    label: '조회 전용',
    description: '모든 리소스 조회만 가능',
    icon: <EyeOutlined />,
    color: '#8c8c8c',
    permissionFilter: (perm) => perm.code.endsWith(':view'),
    isAdditive: false,
  },
  // 8. 조회 + 수정
  {
    key: 'read-update',
    label: '조회 + 수정',
    description: '조회 및 수정 권한 (삭제/실행 제외)',
    icon: <EditOutlined />,
    color: '#faad14',
    permissionFilter: (perm) =>
      perm.code.endsWith(':view') ||
      perm.code.endsWith(':update') ||
      perm.code.includes(':create'),
    isAdditive: false,
  },
  // 9. 운영자
  {
    key: 'operator',
    label: '운영자',
    description: '조회 + 운영 권한 (로그, 재시작 등)',
    icon: <EditOutlined />,
    color: '#52c41a',
    permissionFilter: (perm) =>
      perm.code.endsWith(':view') ||
      perm.code.includes(':restart') ||
      perm.code.includes(':logs') ||
      perm.code.includes(':test'),
    isAdditive: false,
  },
  // 10. 개발자
  {
    key: 'developer',
    label: '개발자',
    description: '서비스 + DB 관리 (빌드/배포/보안스캔)',
    icon: <ThunderboltOutlined />,
    color: '#722ed1',
    permissionFilter: (perm) =>
      perm.category === 'service' ||
      perm.category === 'database',
    isAdditive: false,
  },
];

// 서브카테고리 그룹핑
const SUBCATEGORY_ORDER = ['view', 'create', 'update', 'delete', 'execute', 'manage', 'other'];

interface GranularPermissionSelectorProps {
  value?: string[];
  onChange?: (permissions: string[]) => void;
  disabled?: boolean;
  showPresets?: boolean;
  showSearch?: boolean;
  maxHeight?: number;
  compactMode?: boolean;
}

export const GranularPermissionSelector: React.FC<GranularPermissionSelectorProps> = ({
  value = [],
  onChange,
  disabled = false,
  showPresets = true,
  showSearch = true,
  maxHeight = 500,
  compactMode = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState<PermissionDefinition[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [searchText, setSearchText] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set(value));

  // 권한 목록 로드 (숨김 권한 제외)
  useEffect(() => {
    const loadPermissions = async () => {
      setLoading(true);
      try {
        const response = await permissionApi.getAllPermissions();
        if (response.success && response.data) {
          // 숨김 권한 필터링
          const visiblePermissions = (response.data.permissions || []).filter(
            (perm: PermissionDefinition) => !HIDDEN_PERMISSIONS.includes(perm.code)
          );
          setAllPermissions(visiblePermissions);

          // 그룹화된 권한에서도 숨김 권한 필터링
          const filteredGrouped: GroupedPermissions = {};
          Object.entries(response.data.grouped || {}).forEach(([category, permissions]) => {
            const filtered = (permissions as PermissionDefinition[]).filter(
              (perm) => !HIDDEN_PERMISSIONS.includes(perm.code)
            );
            if (filtered.length > 0) {
              filteredGrouped[category] = filtered;
            }
          });
          setGroupedPermissions(filteredGrouped);

          // 처음에 첫 번째 카테고리만 열기
          const categories = Object.keys(filteredGrouped);
          if (categories.length > 0) {
            setExpandedCategories([categories[0]]);
          }
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPermissions();
  }, []);

  // value prop 변경 시 내부 상태 업데이트
  useEffect(() => {
    setSelectedPermissions(new Set(value));
  }, [value]);

  // 검색 필터링된 권한
  const filteredGroupedPermissions = useMemo(() => {
    if (!searchText.trim()) return groupedPermissions;

    const searchLower = searchText.toLowerCase();
    const filtered: GroupedPermissions = {};

    Object.entries(groupedPermissions).forEach(([category, permissions]) => {
      const matchedPerms = permissions.filter(
        (perm) =>
          perm.code.toLowerCase().includes(searchLower) ||
          perm.name_ko.toLowerCase().includes(searchLower) ||
          perm.description?.toLowerCase().includes(searchLower)
      );
      if (matchedPerms.length > 0) {
        filtered[category] = matchedPerms;
      }
    });

    return filtered;
  }, [groupedPermissions, searchText]);

  // 권한 선택/해제 핸들러
  const handlePermissionChange = useCallback((permCode: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(permCode);
      } else {
        newSet.delete(permCode);
      }
      onChange?.(Array.from(newSet));
      return newSet;
    });
  }, [onChange]);

  // 카테고리 전체 선택/해제
  const handleCategorySelectAll = useCallback((category: string, select: boolean) => {
    const categoryPerms = groupedPermissions[category] || [];
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      categoryPerms.forEach((perm) => {
        if (select) {
          newSet.add(perm.code);
        } else {
          newSet.delete(perm.code);
        }
      });
      onChange?.(Array.from(newSet));
      return newSet;
    });
  }, [groupedPermissions, onChange]);

  // 프리셋이 활성화되어 있는지 확인 (카테고리 프리셋용)
  const isPresetActive = useCallback((preset: PermissionPreset): boolean => {
    if (!preset.isAdditive) return false;
    const presetPerms = allPermissions.filter(preset.permissionFilter);
    if (presetPerms.length === 0) return false;
    // 해당 프리셋의 모든 권한이 선택되어 있으면 활성
    return presetPerms.every((p) => selectedPermissions.has(p.code));
  }, [allPermissions, selectedPermissions]);

  // 프리셋 적용
  const handleApplyPreset = useCallback((preset: PermissionPreset) => {
    const filteredPerms = allPermissions.filter(preset.permissionFilter);
    const presetCodes = filteredPerms.map((p) => p.code);

    if (preset.isAdditive) {
      // 카테고리 프리셋: 토글 방식 (추가/제거)
      const isActive = presetCodes.every((code) => selectedPermissions.has(code));

      setSelectedPermissions((prev) => {
        const newSet = new Set(prev);
        if (isActive) {
          // 이미 모두 선택됨 → 해당 카테고리 권한 제거
          presetCodes.forEach((code) => newSet.delete(code));
        } else {
          // 선택되지 않음 → 해당 카테고리 권한 추가
          presetCodes.forEach((code) => newSet.add(code));
        }
        onChange?.(Array.from(newSet));
        return newSet;
      });
    } else {
      // 일반 프리셋: 대체 방식
      const newSelected = new Set(presetCodes);
      setSelectedPermissions(newSelected);
      onChange?.(Array.from(newSelected));
    }
  }, [allPermissions, selectedPermissions, onChange]);

  // 전체 초기화
  const handleClearAll = useCallback(() => {
    setSelectedPermissions(new Set());
    onChange?.([]);
  }, [onChange]);

  // 카테고리별 선택 개수 계산
  const getCategorySelectedCount = useCallback((category: string) => {
    const categoryPerms = groupedPermissions[category] || [];
    return categoryPerms.filter((p) => selectedPermissions.has(p.code)).length;
  }, [groupedPermissions, selectedPermissions]);

  // 위험도 태그 렌더링
  const renderRiskTag = (riskLevel: RiskLevel) => {
    const color = RISK_LEVEL_COLORS[riskLevel];
    const name = RISK_LEVEL_NAMES[riskLevel];

    if (riskLevel === 'low') return null;

    return (
      <Tag
        color={color}
        style={{
          fontSize: 10,
          padding: '0 4px',
          lineHeight: '16px',
          marginLeft: 4,
        }}
      >
        {name}
      </Tag>
    );
  };

  // 권한 아이템 렌더링
  const renderPermissionItem = (perm: PermissionDefinition) => {
    const isSelected = selectedPermissions.has(perm.code);
    const isHighRisk = perm.risk_level === 'high' || perm.risk_level === 'critical';

    return (
      <div
        key={perm.id}
        style={{
          padding: '6px 8px',
          borderRadius: 6,
          backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
          border: isHighRisk && isSelected ? '1px solid #ff4d4f40' : '1px solid transparent',
          marginBottom: 4,
          transition: 'all 0.2s',
        }}
      >
        <Checkbox
          checked={isSelected}
          disabled={disabled}
          onChange={(e) => handlePermissionChange(perm.code, e.target.checked)}
          style={{ width: '100%' }}
        >
          <Space size={4} wrap>
            <Text
              code
              style={{
                fontSize: 11,
                backgroundColor: isSelected ? '#1890ff15' : '#f5f5f5',
                color: isSelected ? '#1890ff' : '#666',
              }}
            >
              {perm.code}
            </Text>
            <Text style={{ fontSize: 13 }}>{perm.name_ko}</Text>
            {renderRiskTag(perm.risk_level)}
            {perm.requires_approval && (
              <Tooltip title="승인 필요">
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 12 }} />
              </Tooltip>
            )}
          </Space>
        </Checkbox>
        {!compactMode && perm.description && (
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              marginLeft: 24,
              display: 'block',
              lineHeight: '16px',
            }}
          >
            {perm.description}
          </Text>
        )}
      </div>
    );
  };

  // 카테고리 패널 헤더 렌더링
  const renderCategoryHeader = (category: string) => {
    const catKey = category as PermissionCategory;
    const totalCount = (groupedPermissions[category] || []).length;
    const selectedCount = getCategorySelectedCount(category);
    const allSelected = selectedCount === totalCount && totalCount > 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <span style={{ color: CATEGORY_COLORS[catKey], marginRight: 8 }}>
          {CATEGORY_ICONS[catKey]}
        </span>
        <Text strong style={{ flex: 1 }}>
          {CATEGORY_NAMES[catKey] || category}
        </Text>
        <Badge
          count={`${selectedCount}/${totalCount}`}
          style={{
            backgroundColor: selectedCount > 0 ? CATEGORY_COLORS[catKey] : '#d9d9d9',
            fontSize: 11,
          }}
        />
        <Space size={4} style={{ marginLeft: 12 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={allSelected ? '전체 해제' : '전체 선택'}>
            <Button
              size="small"
              type={allSelected ? 'primary' : 'default'}
              icon={allSelected ? <ClearOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleCategorySelectAll(category, !allSelected)}
              disabled={disabled}
              style={{ padding: '0 6px', height: 22, fontSize: 11 }}
            >
              {allSelected ? '해제' : '전체'}
            </Button>
          </Tooltip>
        </Space>
      </div>
    );
  };

  // 서브카테고리별 그룹핑
  const groupBySubcategory = (permissions: PermissionDefinition[]) => {
    const grouped: Record<string, PermissionDefinition[]> = {};

    permissions.forEach((perm) => {
      const subcategory = perm.subcategory || 'other';
      if (!grouped[subcategory]) {
        grouped[subcategory] = [];
      }
      grouped[subcategory].push(perm);
    });

    // 정렬된 서브카테고리 순서로 반환
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      const aIndex = SUBCATEGORY_ORDER.indexOf(a[0]);
      const bIndex = SUBCATEGORY_ORDER.indexOf(b[0]);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return sortedEntries;
  };

  // 서브카테고리 한글명 (types/permission.ts의 SUBCATEGORY_NAMES 사용)
  const getSubcategoryLabel = (subcategory: string) => {
    return SUBCATEGORY_NAMES[subcategory] || subcategory;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip="권한 목록을 불러오는 중..." />
      </div>
    );
  }

  const totalSelected = selectedPermissions.size;
  const totalPermissions = allPermissions.length;

  return (
    <div className="granular-permission-selector">
      {/* 요약 정보 */}
      <Alert
        message={
          <Space>
            <Text>선택된 권한:</Text>
            <Text strong style={{ color: '#1890ff' }}>
              {totalSelected}
            </Text>
            <Text type="secondary">/ {totalPermissions}</Text>
          </Space>
        }
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        style={{ marginBottom: 12 }}
        action={
          totalSelected > 0 && (
            <Button size="small" danger onClick={handleClearAll} disabled={disabled}>
              전체 초기화
            </Button>
          )
        }
      />

      {/* 프리셋 버튼 */}
      {showPresets && (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              빠른 선택 프리셋
            </Text>
            <Space wrap>
              {PERMISSION_PRESETS.map((preset) => {
                const active = isPresetActive(preset);
                return (
                  <Tooltip
                    key={preset.key}
                    title={
                      preset.isAdditive
                        ? `${preset.description} (클릭하여 ${active ? '해제' : '추가'})`
                        : preset.description
                    }
                  >
                    <Button
                      size="small"
                      type={active ? 'primary' : 'default'}
                      icon={preset.icon}
                      onClick={() => handleApplyPreset(preset)}
                      disabled={disabled}
                      style={{
                        borderColor: preset.color,
                        color: active ? '#fff' : preset.color,
                        backgroundColor: active ? preset.color : undefined,
                      }}
                    >
                      {preset.label}
                    </Button>
                  </Tooltip>
                );
              })}
            </Space>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </>
      )}

      {/* 검색 */}
      {showSearch && (
        <Input
          placeholder="권한 코드 또는 이름으로 검색..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />
      )}

      {/* 권한 목록 */}
      <div style={{ maxHeight, overflowY: 'auto' }}>
        {Object.keys(filteredGroupedPermissions).length === 0 ? (
          <Empty description="검색 결과가 없습니다" />
        ) : (
          <Collapse
            activeKey={expandedCategories}
            onChange={(keys) => setExpandedCategories(keys as string[])}
            expandIconPosition="start"
          >
            {Object.entries(filteredGroupedPermissions).map(([category, permissions]) => (
              <Panel
                key={category}
                header={renderCategoryHeader(category)}
                style={{ marginBottom: 8 }}
              >
                {groupBySubcategory(permissions).map(([subcategory, subPerms]) => (
                  <div key={subcategory} style={{ marginBottom: 12 }}>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        display: 'block',
                        marginBottom: 4,
                        color: CATEGORY_COLORS[category as PermissionCategory],
                      }}
                    >
                      {getSubcategoryLabel(subcategory)}
                    </Text>
                    <Row gutter={[8, 0]}>
                      {subPerms.map((perm) => (
                        <Col key={perm.id} xs={24} sm={compactMode ? 24 : 12}>
                          {renderPermissionItem(perm)}
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </Panel>
            ))}
          </Collapse>
        )}
      </div>

      {/* 위험 권한 경고 */}
      {Array.from(selectedPermissions).some((code) => {
        const perm = allPermissions.find((p) => p.code === code);
        return perm?.risk_level === 'high' || perm?.risk_level === 'critical';
      }) && (
        <Alert
          message="주의: 높은 위험도의 권한이 선택되었습니다"
          description="삭제, 실행 등 위험한 작업을 수행할 수 있는 권한이 포함되어 있습니다. 신중하게 부여해주세요."
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginTop: 12 }}
        />
      )}
    </div>
  );
};

export default GranularPermissionSelector;
