/**
 * Dashboard 관련 타입 정의
 * 백엔드 api/dashboard_handler.go, db/incident.go, db/dora_metrics.go와 일치
 */

// ==================== DORA 등급 및 상수 ====================

/** DORA 등급 타입 */
export type DORAGrade = 'elite' | 'high' | 'medium' | 'low';

/** DORA 등급별 정보 */
export const DORA_GRADE_INFO: Record<
  DORAGrade,
  { label: string; color: string; score: number }
> = {
  elite: { label: 'Elite', color: '#52c41a', score: 25 },
  high: { label: 'High', color: '#1890ff', score: 18 },
  medium: { label: 'Medium', color: '#faad14', score: 10 },
  low: { label: 'Low', color: '#ff4d4f', score: 5 },
};

// ==================== 장애(Incident) 관련 타입 ====================

/** 장애 유형 */
export type IncidentType =
  | 'deployment_failure'
  | 'service_status_change'
  | 'manual';

/** 장애 심각도 */
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

/** 장애 상태 */
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

/** Nullable Int64 (백엔드 sql.NullInt64) */
export interface NullableInt64 {
  Int64: number;
  Valid: boolean;
}

/** Nullable String (백엔드 sql.NullString) */
export interface NullableString {
  String: string;
  Valid: boolean;
}

/** Nullable Time (백엔드 sql.NullTime) */
export interface NullableTime {
  Time: string;
  Valid: boolean;
}

/** 장애 기록 (백엔드 db.Incident) */
export interface Incident {
  id: number;
  service_id: NullableInt64;
  infra_id: NullableInt64;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: NullableString;
  started_at: string;
  resolved_at: NullableTime;
  mttr_seconds: NullableInt64;
  source_reference: NullableString;
  status: IncidentStatus;
  reported_by: NullableInt64;
  resolved_by: NullableInt64;
  resolution_note: NullableString;
  created_at: string;
  updated_at: string;
  // 조인 필드
  service_name?: string;
  infra_name?: string;
}

/** 장애 요약 통계 */
export interface IncidentSummary {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_mttr_seconds: number;
}

// ==================== DORA 메트릭 관련 타입 ====================

/** DORA 개별 메트릭 상세 (백엔드 db.DORAMetricDetail) */
export interface DORAMetricDetail {
  value: number;
  unit: string;
  grade: DORAGrade;
  threshold: string;
}

/** DORA 메트릭 전체 (백엔드 db.DORAMetrics) */
export interface DORAMetrics {
  deployment_frequency: DORAMetricDetail;
  lead_time: DORAMetricDetail;
  mttr: DORAMetricDetail;
  change_failure_rate: DORAMetricDetail;
  overall_grade: DORAGrade;
  health_score: number;
}

/** 서비스별 DORA 메트릭 (백엔드 db.ServiceDORAMetrics) */
export interface ServiceDORAMetrics {
  service_id: number;
  service_name: string;
  metrics: DORAMetrics;
}

/** DORA 메트릭 스냅샷 (백엔드 db.DORAMetricsSnapshot) */
export interface DORAMetricsSnapshot {
  id: number;
  snapshot_date: string;
  scope_type: 'system' | 'service';
  scope_id: NullableInt64;
  deployment_frequency_daily: number;
  deployment_frequency_weekly: number;
  lead_time_seconds: NullableInt64;
  mttr_seconds: NullableInt64;
  change_failure_rate: number;
  df_grade: DORAGrade;
  lt_grade: DORAGrade;
  mttr_grade: DORAGrade;
  cfr_grade: DORAGrade;
  overall_grade: DORAGrade;
  health_score: number;
  total_deployments: number;
  successful_deployments: number;
  failed_deployments: number;
  total_incidents: number;
  resolved_incidents: number;
  open_incidents: number;
  created_at: string;
}

// ==================== 대시보드 Summary 타입 ====================

/** 장비 요약 (백엔드 api.DeviceSummary) */
export interface DeviceSummary {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  warning_devices: number;
}

/** 런타임 환경 요약 (백엔드 api.RuntimeSummary) */
export interface RuntimeSummary {
  total_infras: number;
  kubernetes_count: number;
  docker_count: number;
  podman_count: number;
  total_nodes: number;
  healthy_nodes: number;
}

/** 백업 요약 (백엔드 api.BackupSummary) */
export interface BackupSummary {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  pending_backups: number;
  last_backup_time: string;
}

/** 서비스 요약 (백엔드 api.ServicesSummary) */
export interface ServicesSummary {
  total_services: number;
  deployed_services: number;
  pending_services: number;
  failed_services: number;
  active_builds: number;
}

/** 데이터베이스 요약 (백엔드 api.DatabaseSummary) */
export interface DatabaseSummary {
  total_connections: number;
  active_connections: number;
  failed_connections: number;
  active_syncs: number;
}

/** DORA 건강도 요약 (백엔드 api.DORAHealthSummary) */
export interface DORAHealthSummary {
  system: DORAMetrics | null;
  services: ServiceDORAMetrics[];
  active_incidents: Incident[];
}

/** 대시보드 전체 요약 (백엔드 api.DashboardSummary) */
export interface DashboardSummary {
  devices: DeviceSummary;
  runtime: RuntimeSummary;
  backup: BackupSummary;
  services: ServicesSummary;
  database: DatabaseSummary;
  dora: DORAHealthSummary;
}

// ==================== API 요청/응답 타입 ====================

/** 대시보드 액션 상수 */
export const DASHBOARD_ACTIONS = {
  GET_SUMMARY: 'get_summary',
  GET_DORA_METRICS: 'get_dora_metrics',
  GET_INCIDENTS: 'get_incidents',
  CREATE_INCIDENT: 'create_incident',
  RESOLVE_INCIDENT: 'resolve_incident',
  ACKNOWLEDGE_INCIDENT: 'acknowledge_incident',
  GET_DORA_HISTORY: 'get_dora_history',
} as const;

export type DashboardAction =
  (typeof DASHBOARD_ACTIONS)[keyof typeof DASHBOARD_ACTIONS];

/** DORA 메트릭 조회 파라미터 */
export interface GetDORAMetricsParams {
  scope_type?: 'system' | 'service';
  service_id?: number;
  days?: number;
}

/** 장애 목록 조회 파라미터 */
export interface GetIncidentsParams {
  status?: IncidentStatus | 'all';
  service_id?: number;
  limit?: number;
}

/** 장애 생성 파라미터 */
export interface CreateIncidentParams {
  title: string;
  service_id?: number;
  infra_id?: number;
  severity?: IncidentSeverity;
  description?: string;
}

/** 장애 해결 파라미터 */
export interface ResolveIncidentParams {
  id: number;
  resolution_note?: string;
}

/** 장애 확인 파라미터 */
export interface AcknowledgeIncidentParams {
  id: number;
}

/** DORA 이력 조회 파라미터 */
export interface GetDORAHistoryParams {
  scope_type?: 'system' | 'service';
  service_id?: number;
  days?: number;
}

// ==================== 유틸리티 타입 ====================

/** 건강도 점수 범위 */
export interface HealthScoreRange {
  min: number;
  max: number;
  grade: DORAGrade;
  label: string;
}

/** 건강도 점수 범위 정의 */
export const HEALTH_SCORE_RANGES: HealthScoreRange[] = [
  { min: 88, max: 100, grade: 'elite', label: 'Elite' },
  { min: 60, max: 87, grade: 'high', label: 'High' },
  { min: 32, max: 59, grade: 'medium', label: 'Medium' },
  { min: 0, max: 31, grade: 'low', label: 'Low' },
];

/** 건강도 점수에서 등급 가져오기 */
export const getGradeFromScore = (score: number): DORAGrade => {
  const range = HEALTH_SCORE_RANGES.find(r => score >= r.min && score <= r.max);
  return range?.grade || 'low';
};

/** 초를 사람이 읽기 쉬운 형식으로 변환 */
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}분`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}시간`;
  return `${Math.round(seconds / 86400)}일`;
};

/** 장애 심각도별 색상 */
export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: '#ff4d4f',
  high: '#ff7a45',
  medium: '#faad14',
  low: '#52c41a',
};

/** 장애 상태별 색상 */
export const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: '#ff4d4f',
  acknowledged: '#faad14',
  resolved: '#52c41a',
};

/** 장애 유형별 라벨 */
export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  deployment_failure: '배포 실패',
  service_status_change: '서비스 상태 변경',
  manual: '수동 등록',
};
