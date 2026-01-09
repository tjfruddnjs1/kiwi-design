/**
 * Database 마이그레이션 및 동기화 API 클라이언트
 */
import apiClient from './client';
import { logger } from '../../utils/logger';

// ==================== 타입 정의 ====================

export interface DBConnection {
  id: number;
  name: string;
  description?: string;
  db_type: 'mysql' | 'mariadb' | 'postgresql';
  host: string;
  port: number;
  database_name: string;
  username: string;
  // password는 조회 시 반환되지 않음
  ssh_enabled: boolean;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_key_path?: string;
  ssh_jump_enabled: boolean;
  ssh_jump_host?: string;
  ssh_jump_port?: number;
  ssh_jump_username?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // 연결 상태 정보 (DB에서 관리)
  last_tested_at?: string;
  last_test_status?: 'connected' | 'failed' | 'unknown';
  last_test_message?: string;
}

export interface DBConnectionCreateRequest {
  name: string;
  description?: string;
  db_type: 'mysql' | 'mariadb' | 'postgresql';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssh_enabled?: boolean;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  ssh_key_path?: string;
  ssh_jump_enabled?: boolean;
  ssh_jump_host?: string;
  ssh_jump_port?: number;
  ssh_jump_username?: string;
  ssh_jump_password?: string;
  service_id?: number; // 서비스 기반 연결 시 서비스 ID
}

// 서비스와 SSH 정보 (DB 연결 추가용)
export interface SSHHop {
  host: string;
  port: number;
  username: string;
}

export interface ServiceWithSSHInfo {
  service_id: number;
  service_name: string;
  infra_id?: number;
  infra_name?: string;
  infra_type?: string;
  server_id?: number;
  server_name?: string;
  ssh_hops: SSHHop[];
}

export interface DBSyncJob {
  id: number;
  name: string;
  description?: string;
  source_connection_id: number;
  target_connection_id: number;
  source_name?: string;
  target_name?: string;
  sync_type: 'schema' | 'data' | 'full';
  sync_direction: 'source_to_target' | 'target_to_source' | 'bidirectional';
  tables_config?: TablesConfig;
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

export interface TablesConfig {
  include?: string[];
  exclude?: string[];
  options?: {
    truncate_before?: boolean;
    ignore_errors?: boolean;
  };
}

export interface DBSyncJobCreateRequest {
  name: string;
  description?: string;
  source_connection_id: number;
  target_connection_id: number;
  sync_type?: 'schema' | 'data' | 'full';
  sync_direction?: 'source_to_target' | 'target_to_source' | 'bidirectional';
  tables_config?: TablesConfig;
  schedule_enabled?: boolean;
  schedule_cron?: string;
  backup_before_sync?: boolean;
  dry_run_enabled?: boolean;
}

export interface DBSyncHistory {
  id: number;
  sync_job_id: number;
  job_name?: string;
  sync_type?: 'schema' | 'data' | 'full'; // 행위 유형
  status:
    | 'pending'
    | 'running'
    | 'success'
    | 'failed'
    | 'cancelled'
    | 'partial';
  progress_percent?: number; // 진행률 (0-100)
  current_table?: string; // 현재 처리 중인 테이블
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  tables_synced: number;
  rows_inserted: number;
  rows_updated: number;
  rows_deleted: number;
  error_message?: string;
  backup_created?: boolean; // 백업 생성 여부
  backup_path?: string; // 백업 파일 경로
  executed_by: number;
  created_at: string;
}

export interface DBSyncHistoryDetail extends DBSyncHistory {
  execution_log?: Array<{
    timestamp: string;
    message: string;
    level?: 'info' | 'warn' | 'error';
    sql?: string; // 실행된 SQL 쿼리 (마이그레이션 시 DDL 등)
  }>;
  backup_path?: string;
  tables_compared?: number; // 비교된 테이블 수
}

// FK 관계 정보
export interface FKRelation {
  column: string;
  constraint_name: string;
  referenced_table: string;
  referenced_column: string;
}

// 테이블 정보 (FK 관계 포함)
export interface TableInfo {
  name: string;
  in_target?: boolean; // 소스 테이블인 경우: 타겟에 존재하는지
  in_source?: boolean; // 타겟 테이블인 경우: 소스에 존재하는지
  fk_relations?: FKRelation[];
}

// 컬럼 타입 차이
export interface ColumnTypeDiff {
  column: string;
  source_type: string;
  target_type: string;
}

// 테이블별 컬럼 차이
export interface TableColumnDiff {
  table: string;
  columns_only_source?: string[]; // 소스에만 있는 컬럼
  columns_only_target?: string[]; // 타겟에만 있는 컬럼
  type_differences?: ColumnTypeDiff[]; // 타입이 다른 컬럼
}

export interface DBCompareResult {
  schema_diff?: {
    only_in_source: string[];
    only_in_target: string[];
    column_differences: TableColumnDiff[];
    source_tables?: TableInfo[]; // 소스 DB 테이블 목록 (FK 관계 포함)
    target_tables?: TableInfo[]; // 타겟 DB 테이블 목록 (FK 관계 포함)
  };
  data_diff?: {
    tables: Array<{
      name: string;
      source_count: number;
      target_count: number;
      difference: number;
    }>;
  };
}

export interface ConnectionTestResult {
  connected: boolean;
  ssh_tunnel_required?: boolean;
  error?: string;
}

export interface BackupInfo {
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
  connection_id: number;
  database_name: string;
}

// DB 백업 (db_backups 테이블)
export interface DBBackup {
  id: number;
  connection_id: number;
  backup_name: string;
  backup_type: 'full' | 'schema' | 'data';
  file_path: string;
  file_size: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  created_by: number;
  organization_id: number;
  created_at: string;
  completed_at?: string;
  // 조인된 정보
  connection_name?: string;
  database_name?: string;
}

export interface CreateDBBackupRequest {
  connection_id: number;
  backup_name?: string;
  backup_type?: 'full' | 'schema' | 'data';
}

export interface CreateDBBackupResponse {
  backup_id: number;
  backup_name: string;
  file_path: string;
  file_size: number;
}

// ==================== API 클라이언트 ====================

const API_ENDPOINT = '/database';

/**
 * API 요청 전송 헬퍼 함수
 */
async function sendRequest<T>(
  action: string,
  parameters: Record<string, unknown> = {}
): Promise<T> {
  try {
    const response = await apiClient.post(API_ENDPOINT, {
      action,
      parameters,
    });

    // apiClient.post는 이미 response.data를 반환함
    if (!response.success) {
      throw new Error(response.error || '요청이 실패했습니다.');
    }

    return response.data as T;
  } catch (error) {
    logger.error(`[Database API] ${action} 실패:`, error);
    throw error;
  }
}

// ==================== DB 연결 관리 API ====================

/**
 * DB 연결 목록 조회 (기관별 필터링 지원)
 */
export async function getDBConnections(organizationId?: number | null): Promise<DBConnection[]> {
  return sendRequest<DBConnection[]>('getDBConnections', {
    ...(organizationId && { organization_id: organizationId }),
  });
}

/**
 * 서비스 목록과 SSH 정보 조회 (DB 연결 추가 시 서비스 선택용)
 */
export async function getServicesWithSSHInfo(): Promise<ServiceWithSSHInfo[]> {
  return sendRequest<ServiceWithSSHInfo[]>('getServicesWithSSHInfo');
}

/**
 * DB 연결 생성
 */
export async function createDBConnection(
  data: DBConnectionCreateRequest
): Promise<{ id: number }> {
  return sendRequest<{ id: number }>(
    'createDBConnection',
    data as unknown as Record<string, unknown>
  );
}

/**
 * DB 연결 수정
 */
export async function updateDBConnection(
  id: number,
  data: Partial<DBConnectionCreateRequest>
): Promise<void> {
  await sendRequest<void>('updateDBConnection', { id, ...data });
}

/**
 * DB 연결 삭제
 */
export async function deleteDBConnection(id: number): Promise<void> {
  await sendRequest<void>('deleteDBConnection', { id });
}

/**
 * DB 연결 테스트
 */
export async function testDBConnection(
  idOrData: number | DBConnectionCreateRequest
): Promise<ConnectionTestResult> {
  if (typeof idOrData === 'number') {
    return sendRequest<ConnectionTestResult>('testDBConnection', {
      id: idOrData,
    });
  }
  return sendRequest<ConnectionTestResult>(
    'testDBConnection',
    idOrData as unknown as Record<string, unknown>
  );
}

// ==================== DB 비교 API ====================

/**
 * 두 DB 스키마/데이터 비교
 */
export async function compareDBs(
  sourceConnectionId: number,
  targetConnectionId: number,
  compareType: 'schema' | 'data' | 'full' = 'full'
): Promise<DBCompareResult> {
  return sendRequest<DBCompareResult>('compareDBs', {
    source_connection_id: sourceConnectionId,
    target_connection_id: targetConnectionId,
    compare_type: compareType,
  });
}

// ==================== 동기화 작업 관리 API ====================

/**
 * 동기화 작업 목록 조회
 */
export async function getSyncJobs(): Promise<DBSyncJob[]> {
  return sendRequest<DBSyncJob[]>('getSyncJobs');
}

/**
 * 동기화 작업 생성
 */
export async function createSyncJob(
  data: DBSyncJobCreateRequest
): Promise<{ id: number }> {
  return sendRequest<{ id: number }>(
    'createSyncJob',
    data as unknown as Record<string, unknown>
  );
}

/**
 * 동기화 작업 수정
 */
export async function updateSyncJob(
  id: number,
  data: Partial<DBSyncJobCreateRequest>
): Promise<void> {
  await sendRequest<void>('updateSyncJob', { id, ...data });
}

/**
 * 동기화 작업 삭제
 */
export async function deleteSyncJob(id: number): Promise<void> {
  await sendRequest<void>('deleteSyncJob', { id });
}

/**
 * 동기화 작업 실행
 */
export async function executeSyncJob(
  id: number,
  dryRun: boolean = false
): Promise<{ history_id: number; dry_run: boolean }> {
  return sendRequest<{ history_id: number; dry_run: boolean }>(
    'executeSyncJob',
    { id, dry_run: dryRun }
  );
}

// ==================== 동기화 이력 API ====================

/**
 * 동기화 이력 조회
 */
export async function getSyncHistory(jobId?: number): Promise<DBSyncHistory[]> {
  const params: Record<string, unknown> = {};
  if (jobId) {
    params.job_id = jobId;
  }
  return sendRequest<DBSyncHistory[]>('getSyncHistory', params);
}

/**
 * 동기화 이력 상세 조회
 */
export async function getSyncHistoryDetail(
  id: number
): Promise<DBSyncHistoryDetail> {
  return sendRequest<DBSyncHistoryDetail>('getSyncHistoryDetail', { id });
}

// ==================== 백업 관리 API ====================

/**
 * 백업 파일 목록 조회
 */
export async function listBackups(connectionId: number): Promise<BackupInfo[]> {
  return sendRequest<BackupInfo[]>('listBackups', {
    connection_id: connectionId,
  });
}

/**
 * 백업 복원 (동기)
 */
export async function restoreBackup(
  connectionId: number,
  backupFile: string
): Promise<void> {
  return sendRequest<void>('restoreBackup', {
    connection_id: connectionId,
    backup_file: backupFile,
  });
}

/**
 * 백업 복원 (비동기 - 진행률 추적)
 */
export interface RestoreAsyncResponse {
  restore_id: number;
  connection_id: number;
  backup_file: string;
}

export async function restoreBackupAsync(
  connectionId: number,
  backupFile: string
): Promise<RestoreAsyncResponse> {
  return sendRequest<RestoreAsyncResponse>('restoreBackupAsync', {
    connection_id: connectionId,
    backup_file: backupFile,
  });
}

/**
 * 복원 이력 조회
 */
export interface RestoreHistoryItem {
  id: number;
  connection_id: number;
  backup_file: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  error_message: string;
  connection_name: string;
  database_name: string;
}

export async function getRestoreHistory(
  connectionId?: number,
  restoreId?: number
): Promise<RestoreHistoryItem[]> {
  const params: Record<string, unknown> = {};
  if (connectionId) params.connection_id = connectionId;
  if (restoreId) params.restore_id = restoreId;
  return sendRequest<RestoreHistoryItem[]>('getRestoreHistory', params);
}

/**
 * DB 백업 생성 (mysqldump 실행)
 */
export async function createDBBackup(
  data: CreateDBBackupRequest
): Promise<CreateDBBackupResponse> {
  return sendRequest<CreateDBBackupResponse>(
    'createDBBackup',
    data as unknown as Record<string, unknown>
  );
}

/**
 * DB 백업 삭제
 */
export async function deleteDBBackup(backupId: number): Promise<void> {
  return sendRequest<void>('deleteDBBackup', { backup_id: backupId });
}

// ==================== 유틸리티 함수 ====================

/**
 * DB 타입에 따른 기본 포트 반환
 */
export function getDefaultPort(dbType: string): number {
  switch (dbType) {
    case 'mysql':
    case 'mariadb':
      return 3306;
    case 'postgresql':
      return 5432;
    default:
      return 3306;
  }
}

/**
 * 동기화 상태에 따른 색상 반환
 */
export function getSyncStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'green';
    case 'partial':
      return 'orange'; // 일부 성공/실패
    case 'running':
      return 'blue';
    case 'failed':
      return 'red';
    case 'cancelled':
      return 'gold';
    case 'pending':
    default:
      return 'default';
  }
}

/**
 * 동기화 상태에 따른 텍스트 반환
 */
export function getSyncStatusText(status: string): string {
  switch (status) {
    case 'success':
      return '성공';
    case 'partial':
      return '일부 실패'; // 일부 성공/실패
    case 'running':
      return '실행 중';
    case 'failed':
      return '실패';
    case 'cancelled':
      return '취소됨';
    case 'pending':
      return '대기 중';
    default:
      return status;
  }
}

export default {
  // DB 연결 관리
  getDBConnections,
  getServicesWithSSHInfo,
  createDBConnection,
  updateDBConnection,
  deleteDBConnection,
  testDBConnection,

  // DB 비교
  compareDBs,

  // 동기화 작업 관리
  getSyncJobs,
  createSyncJob,
  updateSyncJob,
  deleteSyncJob,
  executeSyncJob,

  // 동기화 이력
  getSyncHistory,
  getSyncHistoryDetail,

  // 백업 관리
  listBackups,
  restoreBackup,
  restoreBackupAsync,
  getRestoreHistory,
  createDBBackup,
  deleteDBBackup,

  // 유틸리티
  getDefaultPort,
  getSyncStatusColor,
  getSyncStatusText,
};
