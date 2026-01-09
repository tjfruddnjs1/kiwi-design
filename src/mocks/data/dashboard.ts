/**
 * Mock Dashboard Data
 * 대시보드, DORA 메트릭, 요약 정보
 */

export type DORAGrade = 'elite' | 'high' | 'medium' | 'low';

export interface DORAMetricDetail {
  value: number;
  unit: string;
  grade: DORAGrade;
  threshold: string;
}

export interface DORAMetrics {
  deployment_frequency: DORAMetricDetail;
  lead_time: DORAMetricDetail;
  mttr: DORAMetricDetail;
  change_failure_rate: DORAMetricDetail;
  overall_grade: DORAGrade;
  health_score: number;
}

// Nullable 타입 정의 (백엔드 sql.Null* 타입과 호환)
export interface NullableString {
  String: string;
  Valid: boolean;
}

export interface NullableInt64 {
  Int64: number;
  Valid: boolean;
}

export interface NullableTime {
  Time: string;
  Valid: boolean;
}

// 헬퍼 함수: null 값을 Nullable 타입으로 변환
export const toNullableString = (value: string | null): NullableString => ({
  String: value || '',
  Valid: value !== null,
});

export const toNullableInt64 = (value: number | null): NullableInt64 => ({
  Int64: value || 0,
  Valid: value !== null,
});

export const toNullableTime = (value: string | null): NullableTime => ({
  Time: value || '',
  Valid: value !== null,
});

export interface Incident {
  id: number;
  service_id: NullableInt64;
  infra_id: NullableInt64;
  incident_type: 'deployment_failure' | 'service_status_change' | 'manual';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: NullableString;
  started_at: string;
  resolved_at: NullableTime;
  mttr_seconds: NullableInt64;
  source_reference: NullableString;
  status: 'open' | 'acknowledged' | 'resolved';
  reported_by: NullableInt64;
  resolved_by: NullableInt64;
  resolution_note: NullableString;
  created_at: string;
  updated_at: string;
  service_name?: string;
  infra_name?: string;
}

export interface DashboardSummary {
  devices: {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    warning_devices: number;
  };
  runtime: {
    total_infras: number;
    kubernetes_count: number;
    docker_count: number;
    podman_count: number;
    total_nodes: number;
    healthy_nodes: number;
  };
  backup: {
    total_backups: number;
    successful_backups: number;
    failed_backups: number;
    pending_backups: number;
    last_backup_time: string;
  };
  services: {
    total_services: number;
    deployed_services: number;
    pending_services: number;
    failed_services: number;
    active_builds: number;
  };
  database: {
    total_connections: number;
    active_connections: number;
    failed_connections: number;
    active_syncs: number;
  };
  dora: {
    system: DORAMetrics;
    services: DORAMetrics[];
    active_incidents: Incident[];
  };
}

export const mockDORAMetrics: DORAMetrics = {
  deployment_frequency: {
    value: 5.2,
    unit: 'per_day',
    grade: 'high',
    threshold: '> 1 per day',
  },
  lead_time: {
    value: 180,
    unit: 'seconds',
    grade: 'elite',
    threshold: '< 1 hour',
  },
  mttr: {
    value: 3600,
    unit: 'seconds',
    grade: 'medium',
    threshold: '< 1 day',
  },
  change_failure_rate: {
    value: 5,
    unit: 'percent',
    grade: 'high',
    threshold: '0-15%',
  },
  overall_grade: 'high',
  health_score: 78,
};

export const mockIncidents: Incident[] = [
  {
    id: 1,
    service_id: toNullableInt64(7),
    infra_id: toNullableInt64(1),
    incident_type: 'service_status_change',
    severity: 'high',
    title: 'Data Analytics Service Error',
    description: toNullableString('Service crashed due to OOM (Out of Memory)'),
    started_at: '2026-01-09T06:00:00Z',
    resolved_at: toNullableTime(null),
    mttr_seconds: toNullableInt64(null),
    source_reference: toNullableString(null),
    status: 'open',
    reported_by: toNullableInt64(1),
    resolved_by: toNullableInt64(null),
    resolution_note: toNullableString(null),
    created_at: '2026-01-09T06:00:00Z',
    updated_at: '2026-01-09T06:00:00Z',
    service_name: 'data-analytics',
    infra_name: 'kubernetes-production',
  },
  {
    id: 2,
    service_id: toNullableInt64(4),
    infra_id: toNullableInt64(1),
    incident_type: 'deployment_failure',
    severity: 'medium',
    title: 'Frontend Deployment Delayed',
    description: toNullableString('Pod scheduling delayed due to resource constraints'),
    started_at: '2026-01-09T08:30:00Z',
    resolved_at: toNullableTime(null),
    mttr_seconds: toNullableInt64(null),
    source_reference: toNullableString(null),
    status: 'acknowledged',
    reported_by: toNullableInt64(2),
    resolved_by: toNullableInt64(null),
    resolution_note: toNullableString(null),
    created_at: '2026-01-09T08:30:00Z',
    updated_at: '2026-01-09T08:30:00Z',
    service_name: 'frontend-app',
    infra_name: 'kubernetes-production',
  },
  {
    id: 3,
    service_id: toNullableInt64(1),
    infra_id: toNullableInt64(1),
    incident_type: 'service_status_change',
    severity: 'low',
    title: 'Web API Pod Restart',
    description: toNullableString('Pod restarted due to liveness probe failure'),
    started_at: '2026-01-08T14:30:00Z',
    resolved_at: toNullableTime('2026-01-08T14:35:00Z'),
    mttr_seconds: toNullableInt64(300),
    source_reference: toNullableString(null),
    status: 'resolved',
    reported_by: toNullableInt64(1),
    resolved_by: toNullableInt64(1),
    resolution_note: toNullableString('Pod recovered after automatic restart'),
    created_at: '2026-01-08T14:30:00Z',
    updated_at: '2026-01-08T14:35:00Z',
    service_name: 'web-api',
    infra_name: 'kubernetes-production',
  },
];

export const mockDashboardSummary: DashboardSummary = {
  devices: {
    total_devices: 12,
    online_devices: 10,
    offline_devices: 1,
    warning_devices: 1,
  },
  runtime: {
    total_infras: 3,
    kubernetes_count: 2,
    docker_count: 1,
    podman_count: 0,
    total_nodes: 6,
    healthy_nodes: 5,
  },
  backup: {
    total_backups: 45,
    successful_backups: 42,
    failed_backups: 2,
    pending_backups: 1,
    last_backup_time: '2026-01-09T02:15:00Z',
  },
  services: {
    total_services: 7,
    deployed_services: 5,
    pending_services: 1,
    failed_services: 1,
    active_builds: 1,
  },
  database: {
    total_connections: 3,
    active_connections: 2,
    failed_connections: 0,
    active_syncs: 1,
  },
  dora: {
    system: mockDORAMetrics,
    services: [],
    active_incidents: mockIncidents.filter((i) => i.status !== 'resolved'),
  },
};

// Recent Activities for Dashboard
export const mockRecentActivities = [
  {
    id: 1,
    type: 'deployment',
    title: 'web-api deployed successfully',
    description: 'Version v1.2.3 deployed to production',
    timestamp: '2026-01-09T07:45:00Z',
    status: 'success',
    user: 'owner@kiwi.com',
  },
  {
    id: 2,
    type: 'backup',
    title: 'Daily backup completed',
    description: 'Production namespace backup completed (2.5GB)',
    timestamp: '2026-01-09T02:15:00Z',
    status: 'success',
    user: 'system',
  },
  {
    id: 3,
    type: 'incident',
    title: 'Data Analytics Error',
    description: 'Service entered error state - investigating',
    timestamp: '2026-01-09T06:00:00Z',
    status: 'error',
    user: 'system',
  },
  {
    id: 4,
    type: 'build',
    title: 'Frontend build started',
    description: 'Build #203 started for frontend-app',
    timestamp: '2026-01-09T08:30:00Z',
    status: 'running',
    user: 'manager@kiwi.com',
  },
  {
    id: 5,
    type: 'user',
    title: 'New member joined',
    description: 'viewer@kiwi.com joined Kiwi Corp',
    timestamp: '2026-01-08T10:00:00Z',
    status: 'info',
    user: 'owner@kiwi.com',
  },
];

// Security Vulnerabilities Summary
export const mockSecuritySummary = {
  total_vulnerabilities: 23,
  critical: 2,
  high: 5,
  medium: 10,
  low: 6,
  last_scan: '2026-01-08T22:30:00Z',
  scanned_services: 7,
  services_with_issues: 3,
};

// Infrastructure Health
export const mockInfraHealth = [
  {
    infra_id: 1,
    infra_name: 'kubernetes-production',
    health_score: 92,
    status: 'healthy',
    issues: [],
  },
  {
    infra_id: 2,
    infra_name: 'docker-development',
    health_score: 100,
    status: 'healthy',
    issues: [],
  },
  {
    infra_id: 3,
    infra_name: 'eks-staging',
    health_score: 75,
    status: 'warning',
    issues: ['High CPU usage on 2 nodes', 'Certificate expiring in 30 days'],
  },
];
