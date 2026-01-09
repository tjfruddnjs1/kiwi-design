/**
 * NewDashboardOverview - 새로운 대시보드 메인 컴포넌트
 * 실제 API 데이터 기반 Summary 카드 + DORA 건강도
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Spin, Alert, Space, Button } from 'antd';
import { DashboardOutlined, ReloadOutlined } from '@ant-design/icons';
import { dashboardApi } from '../../../lib/api/dashboard';
import type { DashboardSummary } from '../../../types/dashboard';
import { logger } from '../../../utils/logger';
import { useOrganization } from '../../../context/OrganizationContext';
import SummaryGrid from './SummaryGrid';
import DORAHealthSection from './DORAHealthSection';

const { Title, Paragraph } = Typography;

// 디자인 상수
const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
};

const COLORS = {
  primary: '#1890ff',
};

// 폴링 간격 (30초)
const POLLING_INTERVAL = 30000;

const NewDashboardOverview: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 기관 선택 컨텍스트
  const { selectedOrgId, isLoading: orgLoading } = useOrganization();

  // 데이터 로드
  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // 선택된 기관 ID가 있으면 전달
      const data = await dashboardApi.getDashboardSummary({
        organization_id: selectedOrgId,
      });
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '대시보드 데이터 로드 실패';
      setError(errorMessage);
      logger.error('대시보드 데이터 로드 실패:', err as Error);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  // 초기 로드 및 폴링 - 기관 변경 시에도 다시 로드
  useEffect(() => {
    if (!orgLoading) {
      loadDashboardData();
    }

    // 30초 폴링
    const interval = setInterval(() => {
      if (!orgLoading) {
        loadDashboardData(false);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [loadDashboardData, orgLoading]);

  // 수동 새로고침
  const handleRefresh = () => {
    loadDashboardData();
  };

  // 로딩 상태
  if (loading && !summary) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING.lg * 2 }}>
        <Spin size='large' tip='대시보드 데이터를 불러오는 중...' />
      </div>
    );
  }

  // 에러 상태
  if (error && !summary) {
    return (
      <Alert
        message='데이터 로드 실패'
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

  return (
    <div style={{ padding: `0 ${SPACING.sm}px` }}>
      {/* 헤더 */}
      <div
        style={{
          marginBottom: SPACING.lg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Title
            level={2}
            style={{ margin: 0, marginBottom: SPACING.xs, color: '#262626' }}
          >
            <DashboardOutlined
              style={{ marginRight: SPACING.sm, color: COLORS.primary }}
            />
            통합 대시보드
          </Title>
          <Paragraph type='secondary' style={{ margin: 0, fontSize: '16px' }}>
            시스템 전반의 상태를 실시간으로 모니터링하세요
          </Paragraph>
        </div>

        <Space>
          {lastUpdated && (
            <Paragraph type='secondary' style={{ margin: 0, fontSize: '12px' }}>
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
            </Paragraph>
          )}
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={handleRefresh}
            loading={loading}
          >
            새로고침
          </Button>
        </Space>
      </div>

      {/* 에러 알림 (데이터는 있지만 새로고침 실패 시) */}
      {error && summary && (
        <Alert
          message='업데이트 실패'
          description={error}
          type='warning'
          showIcon
          closable
          style={{ marginBottom: SPACING.md }}
        />
      )}

      {/* Summary 카드 그리드 */}
      {summary && (
        <>
          <SummaryGrid
            devices={summary.devices}
            runtime={summary.runtime}
            backup={summary.backup}
            services={summary.services}
            database={summary.database}
          />

          {/* DORA 건강도 섹션 */}
          <DORAHealthSection
            doraHealth={summary.dora}
            onRefresh={handleRefresh}
          />
        </>
      )}
    </div>
  );
};

export default NewDashboardOverview;
