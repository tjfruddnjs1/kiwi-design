/**
 * Mock Dashboard API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockDashboardSummary,
  mockDORAMetrics,
  mockIncidents,
  mockRecentActivities,
  mockSecuritySummary,
  mockInfraHealth,
} from '../data/dashboard';

export const mockDashboardApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      // Dashboard Summary - snake_case 형식 (실제 API 호출 형식)
      case 'get_summary':
      case 'getSummary':
      case 'getDashboardSummary': {
        return createApiResponse(mockDashboardSummary);
      }

      // DORA Metrics
      case 'get_dora_metrics':
      case 'getDORAMetrics': {
        const serviceId = params?.service_id as number | undefined;

        if (serviceId) {
          return createApiResponse({
            ...mockDORAMetrics,
            service_id: serviceId,
          });
        }

        return createApiResponse(mockDORAMetrics);
      }

      case 'getSystemDORAMetrics': {
        return createApiResponse(mockDORAMetrics);
      }

      case 'get_dora_history':
      case 'getDORAHistory': {
        // 간단한 히스토리 데이터 반환
        const historyData = Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ...mockDORAMetrics,
        }));
        return createApiResponse(historyData);
      }

      // Incidents
      case 'get_incidents':
      case 'getIncidents':
      case 'listIncidents': {
        const status = params?.status as string | undefined;
        let incidents = [...mockIncidents];

        if (status && status !== 'all') {
          incidents = incidents.filter((i) => i.status === status);
        }

        return createApiResponse(incidents);
      }

      case 'getActiveIncidents': {
        return createApiResponse(mockIncidents.filter((i) => i.status !== 'resolved'));
      }

      case 'create_incident':
      case 'createIncident':
      case 'update_incident':
      case 'updateIncident':
      case 'resolve_incident':
      case 'resolveIncident':
      case 'acknowledge_incident':
      case 'acknowledgeIncident': {
        return createApiResponse(
          { success: true, message: 'Demo 모드에서는 장애가 기록되지 않습니다.' },
          true,
          'Demo 모드에서는 인시던트를 실제로 관리할 수 없습니다.'
        );
      }

      // Activities
      case 'get_recent_activities':
      case 'getRecentActivities': {
        const limit = params?.limit as number | undefined;
        let activities = [...mockRecentActivities];

        if (limit) {
          activities = activities.slice(0, limit);
        }

        return createApiResponse(activities);
      }

      // Security
      case 'get_security_summary':
      case 'getSecuritySummary': {
        return createApiResponse(mockSecuritySummary);
      }

      // Infrastructure Health
      case 'get_infra_health':
      case 'getInfraHealth': {
        return createApiResponse(mockInfraHealth);
      }

      // Stats
      case 'get_deployment_stats':
      case 'getDeploymentStats': {
        return createApiResponse({
          today: 5,
          this_week: 23,
          this_month: 89,
          success_rate: 94.5,
        });
      }

      case 'get_build_stats':
      case 'getBuildStats': {
        return createApiResponse({
          total_builds: 156,
          success: 148,
          failed: 8,
          average_duration_seconds: 850,
        });
      }

      default:
        console.info(`[Mock Dashboard API] Unknown action: ${action}`);
        // 기본값으로 summary 반환
        return createApiResponse(mockDashboardSummary);
    }
  },

  handleGet: (url: string) => {
    if (url.includes('/summary')) {
      return createApiResponse(mockDashboardSummary);
    }

    if (url.includes('/dora')) {
      return createApiResponse(mockDORAMetrics);
    }

    if (url.includes('/incidents')) {
      return createApiResponse(mockIncidents);
    }

    if (url.includes('/activities')) {
      return createApiResponse(mockRecentActivities);
    }

    if (url.includes('/security')) {
      return createApiResponse(mockSecuritySummary);
    }

    if (url.includes('/health')) {
      return createApiResponse(mockInfraHealth);
    }

    return createApiResponse(mockDashboardSummary);
  },
};