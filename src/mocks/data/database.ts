/**
 * Mock Database Data
 * 데이터베이스 관리 페이지용 Mock 데이터
 */

export interface MockDBConnection {
  id: number;
  name: string;
  description?: string;
  db_type: 'mysql' | 'mariadb' | 'postgresql';
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssh_enabled: boolean;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_jump_enabled: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  last_test_status?: 'connected' | 'failed' | 'unknown';
  last_test_message?: string;
}

export interface MockDBSyncJob {
  id: number;
  name: string;
  description?: string;
  source_connection_id: number;
  target_connection_id: number;
  source_name?: string;
  target_name?: string;
  sync_type: 'schema' | 'data' | 'full';
  sync_direction: 'source_to_target' | 'target_to_source' | 'bidirectional';
  schedule_enabled: boolean;
  schedule_cron?: string;
  backup_before_sync: boolean;
  dry_run_enabled: boolean;
  is_active: boolean;
  last_run_at?: string;
  last_run_status?: 'success' | 'failed' | 'running' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MockDBSyncHistory {
  id: number;
  sync_job_id: number;
  job_name?: string;
  source_name?: string;
  target_name?: string;
  sync_type: 'schema' | 'data' | 'full';
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'partial';
  progress_percent?: number;
  current_table?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  tables_synced: number;
  rows_inserted: number;
  rows_updated: number;
  rows_deleted: number;
  error_message?: string;
  backup_created?: boolean;
  backup_path?: string;
  executed_by: number;
  created_at: string;
}

export const mockDBConnections: MockDBConnection[] = [
  {
    id: 1,
    name: 'Production MySQL',
    description: '운영 환경 MySQL 데이터베이스',
    db_type: 'mysql',
    host: '192.168.1.100',
    port: 3306,
    database_name: 'prod_db',
    username: 'admin',
    ssh_enabled: true,
    ssh_host: '192.168.1.1',
    ssh_port: 22,
    ssh_username: 'deploy',
    ssh_jump_enabled: false,
    created_by: 1,
    created_at: '2026-01-01T09:00:00Z',
    updated_at: '2026-01-08T14:30:00Z',
    last_tested_at: '2026-01-09T08:00:00Z',
    last_test_status: 'connected',
    last_test_message: '연결 성공',
  },
  {
    id: 2,
    name: 'Staging MariaDB',
    description: '스테이징 환경 MariaDB 데이터베이스',
    db_type: 'mariadb',
    host: '192.168.2.100',
    port: 3306,
    database_name: 'staging_db',
    username: 'staging_user',
    ssh_enabled: false,
    ssh_jump_enabled: false,
    created_by: 1,
    created_at: '2026-01-02T10:00:00Z',
    updated_at: '2026-01-07T11:00:00Z',
    last_tested_at: '2026-01-09T07:30:00Z',
    last_test_status: 'connected',
    last_test_message: '연결 성공',
  },
  {
    id: 3,
    name: 'Development PostgreSQL',
    description: '개발 환경 PostgreSQL 데이터베이스',
    db_type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database_name: 'dev_db',
    username: 'developer',
    ssh_enabled: false,
    ssh_jump_enabled: false,
    created_by: 2,
    created_at: '2026-01-03T08:00:00Z',
    updated_at: '2026-01-06T16:00:00Z',
    last_tested_at: '2026-01-09T06:00:00Z',
    last_test_status: 'failed',
    last_test_message: 'Connection refused',
  },
];

export const mockDBSyncJobs: MockDBSyncJob[] = [
  {
    id: 1,
    name: 'Prod to Staging Sync',
    description: '운영 DB에서 스테이징 DB로 데이터 동기화',
    source_connection_id: 1,
    target_connection_id: 2,
    source_name: 'Production MySQL',
    target_name: 'Staging MariaDB',
    sync_type: 'data',
    sync_direction: 'source_to_target',
    schedule_enabled: true,
    schedule_cron: '0 2 * * *',
    backup_before_sync: true,
    dry_run_enabled: false,
    is_active: true,
    last_run_at: '2026-01-09T02:00:00Z',
    last_run_status: 'success',
    created_by: 1,
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-09T02:05:00Z',
  },
  {
    id: 2,
    name: 'Schema Migration',
    description: '스키마 마이그레이션 작업',
    source_connection_id: 2,
    target_connection_id: 3,
    source_name: 'Staging MariaDB',
    target_name: 'Development PostgreSQL',
    sync_type: 'schema',
    sync_direction: 'source_to_target',
    schedule_enabled: false,
    backup_before_sync: true,
    dry_run_enabled: true,
    is_active: true,
    last_run_at: '2026-01-08T15:00:00Z',
    last_run_status: 'success',
    created_by: 2,
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-01-08T15:10:00Z',
  },
];

export const mockDBSyncHistory: MockDBSyncHistory[] = [
  {
    id: 1,
    sync_job_id: 1,
    job_name: 'Prod to Staging Sync',
    source_name: 'Production MySQL',
    target_name: 'Staging MariaDB',
    sync_type: 'data',
    status: 'success',
    progress_percent: 100,
    started_at: '2026-01-09T02:00:00Z',
    completed_at: '2026-01-09T02:05:23Z',
    duration_seconds: 323,
    tables_synced: 12,
    rows_inserted: 10234,
    rows_updated: 4500,
    rows_deleted: 500,
    backup_created: true,
    backup_path: '/backups/staging_db_20260109_020000.sql',
    executed_by: 1,
    created_at: '2026-01-09T02:00:00Z',
  },
  {
    id: 2,
    sync_job_id: 2,
    job_name: 'Schema Migration',
    source_name: 'Staging MariaDB',
    target_name: 'Development PostgreSQL',
    sync_type: 'schema',
    status: 'success',
    progress_percent: 100,
    started_at: '2026-01-08T15:00:00Z',
    completed_at: '2026-01-08T15:02:10Z',
    duration_seconds: 130,
    tables_synced: 8,
    rows_inserted: 0,
    rows_updated: 0,
    rows_deleted: 0,
    backup_created: false,
    executed_by: 2,
    created_at: '2026-01-08T15:00:00Z',
  },
  {
    id: 3,
    sync_job_id: 1,
    job_name: 'Prod to Staging Sync',
    source_name: 'Production MySQL',
    target_name: 'Staging MariaDB',
    sync_type: 'data',
    status: 'failed',
    progress_percent: 45,
    current_table: 'users',
    started_at: '2026-01-08T02:00:00Z',
    completed_at: '2026-01-08T02:01:45Z',
    duration_seconds: 105,
    tables_synced: 5,
    rows_inserted: 2500,
    rows_updated: 1200,
    rows_deleted: 0,
    error_message: 'Connection timeout',
    backup_created: true,
    backup_path: '/backups/staging_db_20260108_020000.sql',
    executed_by: 1,
    created_at: '2026-01-08T02:00:00Z',
  },
];

export const mockServicesWithSSH = [
  {
    service_id: 1,
    service_name: 'web-api',
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infra_type: 'kubernetes',
    server_id: 1,
    server_name: 'master-01',
    ssh_hops: [
      { host: '192.168.1.1', port: 22, username: 'deploy' },
    ],
  },
  {
    service_id: 2,
    service_name: 'backend-service',
    infra_id: 1,
    infra_name: 'kubernetes-production',
    infra_type: 'kubernetes',
    server_id: 2,
    server_name: 'worker-01',
    ssh_hops: [
      { host: '192.168.1.1', port: 22, username: 'deploy' },
      { host: '192.168.1.10', port: 22, username: 'app' },
    ],
  },
];