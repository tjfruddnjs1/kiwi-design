/**
 * Dashboard API 클라이언트
 * 대시보드 Summary, DORA 메트릭, 장애 관리 API
 */

import api from './client';
import { logger } from '../../utils/logger';
import type {
  DashboardSummary,
  DORAMetrics,
  DORAMetricsSnapshot,
  Incident,
  GetDORAMetricsParams,
  GetIncidentsParams,
  CreateIncidentParams,
  ResolveIncidentParams,
  AcknowledgeIncidentParams,
  GetDORAHistoryParams,
} from '../../types/dashboard';

// ==================== 대시보드 Summary API ====================

/**
 * 대시보드 Summary 요청 파라미터
 */
export interface GetDashboardSummaryParams {
  organization_id?: number | null;
}

/**
 * 대시보드 전체 요약 조회
 * @param params - organization_id (선택)
 * @returns DashboardSummary
 */
export const getDashboardSummary = async (
  params: GetDashboardSummaryParams = {}
): Promise<DashboardSummary> => {
  try {
    const response = await api.post<
      { action: string; parameters: GetDashboardSummaryParams },
      DashboardSummary
    >('/dashboard', {
      action: 'get_summary',
      parameters: {
        ...(params.organization_id && { organization_id: params.organization_id }),
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '대시보드 요약 조회에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('대시보드 요약 조회 실패:', error as Error);
    throw error;
  }
};

// ==================== DORA 메트릭 API ====================

/**
 * DORA 메트릭 조회 (전체 시스템 또는 서비스별)
 * @param params - scope_type, service_id, days
 * @returns DORAMetrics
 */
export const getDORAMetrics = async (
  params: GetDORAMetricsParams = {}
): Promise<DORAMetrics> => {
  try {
    const response = await api.post<
      { action: string; parameters: GetDORAMetricsParams },
      DORAMetrics
    >('/dashboard', {
      action: 'get_dora_metrics',
      parameters: {
        scope_type: params.scope_type || 'system',
        ...(params.service_id !== undefined && {
          service_id: params.service_id,
        }),
        days: params.days || 30,
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'DORA 메트릭 조회에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('DORA 메트릭 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * 서비스별 DORA 메트릭 조회
 * @param serviceId - 서비스 ID
 * @param days - 조회 기간 (일)
 * @returns DORAMetrics
 */
export const getServiceDORAMetrics = async (
  serviceId: number,
  days: number = 30
): Promise<DORAMetrics> => {
  return getDORAMetrics({
    scope_type: 'service',
    service_id: serviceId,
    days,
  });
};

/**
 * DORA 스냅샷 이력 조회
 * @param params - scope_type, service_id, days
 * @returns DORAMetricsSnapshot[]
 */
export const getDORAHistory = async (
  params: GetDORAHistoryParams = {}
): Promise<DORAMetricsSnapshot[]> => {
  try {
    const response = await api.post<
      { action: string; parameters: GetDORAHistoryParams },
      DORAMetricsSnapshot[]
    >('/dashboard', {
      action: 'get_dora_history',
      parameters: {
        scope_type: params.scope_type || 'system',
        ...(params.service_id !== undefined && {
          service_id: params.service_id,
        }),
        days: params.days || 30,
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'DORA 이력 조회에 실패했습니다.');
    }

    return response.data || [];
  } catch (error) {
    logger.error('DORA 이력 조회 실패:', error as Error);
    throw error;
  }
};

// ==================== 장애(Incident) API ====================

/**
 * 장애 목록 조회
 * @param params - status, service_id, limit
 * @returns Incident[]
 */
export const getIncidents = async (
  params: GetIncidentsParams = {}
): Promise<Incident[]> => {
  try {
    const response = await api.post<
      { action: string; parameters: GetIncidentsParams },
      Incident[]
    >('/dashboard', {
      action: 'get_incidents',
      parameters: {
        status: params.status || 'all',
        ...(params.service_id !== undefined && {
          service_id: params.service_id,
        }),
        limit: params.limit || 50,
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '장애 목록 조회에 실패했습니다.');
    }

    return response.data || [];
  } catch (error) {
    logger.error('장애 목록 조회 실패:', error as Error);
    throw error;
  }
};

/**
 * 활성 장애 목록 조회 (open + acknowledged)
 * @param limit - 최대 조회 수
 * @returns Incident[]
 */
export const getActiveIncidents = async (
  limit: number = 10
): Promise<Incident[]> => {
  return getIncidents({ status: 'open', limit });
};

/**
 * 서비스별 장애 목록 조회
 * @param serviceId - 서비스 ID
 * @param status - 상태 필터
 * @returns Incident[]
 */
export const getServiceIncidents = async (
  serviceId: number,
  status: GetIncidentsParams['status'] = 'all'
): Promise<Incident[]> => {
  return getIncidents({ service_id: serviceId, status });
};

/**
 * 수동 장애 등록
 * @param params - title, service_id, infra_id, severity, description
 * @returns 생성된 장애 ID
 */
export const createIncident = async (
  params: CreateIncidentParams
): Promise<{ id: number }> => {
  try {
    if (!params.title) {
      throw new Error('장애 제목은 필수입니다.');
    }

    const response = await api.post<
      { action: string; parameters: CreateIncidentParams },
      { id: number }
    >('/dashboard', {
      action: 'create_incident',
      parameters: {
        title: params.title,
        severity: params.severity || 'medium',
        ...(params.service_id !== undefined && {
          service_id: params.service_id,
        }),
        ...(params.infra_id !== undefined && { infra_id: params.infra_id }),
        ...(params.description && { description: params.description }),
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '장애 등록에 실패했습니다.');
    }

    return response.data;
  } catch (error) {
    logger.error('장애 등록 실패:', error as Error);
    throw error;
  }
};

/**
 * 장애 해결 처리
 * @param params - id, resolution_note
 * @returns void
 */
export const resolveIncident = async (
  params: ResolveIncidentParams
): Promise<void> => {
  try {
    const response = await api.post<
      { action: string; parameters: ResolveIncidentParams },
      void
    >('/dashboard', {
      action: 'resolve_incident',
      parameters: {
        id: params.id,
        ...(params.resolution_note && {
          resolution_note: params.resolution_note,
        }),
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '장애 해결 처리에 실패했습니다.');
    }
  } catch (error) {
    logger.error('장애 해결 처리 실패:', error as Error);
    throw error;
  }
};

/**
 * 장애 확인 처리 (open -> acknowledged)
 * @param params - id
 * @returns void
 */
export const acknowledgeIncident = async (
  params: AcknowledgeIncidentParams
): Promise<void> => {
  try {
    const response = await api.post<
      { action: string; parameters: AcknowledgeIncidentParams },
      void
    >('/dashboard', {
      action: 'acknowledge_incident',
      parameters: {
        id: params.id,
      },
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '장애 확인 처리에 실패했습니다.');
    }
  } catch (error) {
    logger.error('장애 확인 처리 실패:', error as Error);
    throw error;
  }
};

// ==================== 내보내기 ====================

export const dashboardApi = {
  // Summary
  getDashboardSummary,

  // DORA Metrics
  getDORAMetrics,
  getServiceDORAMetrics,
  getDORAHistory,

  // Incidents
  getIncidents,
  getActiveIncidents,
  getServiceIncidents,
  createIncident,
  resolveIncident,
  acknowledgeIncident,
};

export default dashboardApi;
