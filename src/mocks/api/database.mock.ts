/**
 * Mock Database API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockDBConnections,
  mockDBSyncJobs,
  mockDBSyncHistory,
  mockServicesWithSSH,
} from '../data/database';

export const mockDatabaseApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      // DB 연결 관리
      case 'getDBConnections': {
        const organizationId = params?.organization_id as number | undefined;
        // Demo 모드에서는 모든 연결 반환
        return createApiResponse(mockDBConnections);
      }

      case 'createDBConnection':
      case 'updateDBConnection':
      case 'deleteDBConnection': {
        return createApiResponse(
          { success: true, id: 999 },
          true,
          'Demo 모드: DB 연결 정보가 저장되었습니다 (실제로 저장되지 않음)'
        );
      }

      case 'testDBConnection': {
        const connectionId = params?.id as number | undefined;
        const connection = mockDBConnections.find((c) => c.id === connectionId);
        return createApiResponse({
          connected: connection?.last_test_status === 'connected',
          error: connection?.last_test_status === 'failed' ? 'Connection refused (Demo)' : undefined,
          message: connection?.last_test_status === 'connected' ? '연결 성공' : '연결 실패',
        });
      }

      // 서비스 SSH 정보
      case 'getServicesWithSSHInfo': {
        return createApiResponse(mockServicesWithSSH);
      }

      // DB 비교
      case 'compareDBs': {
        return createApiResponse({
          source_connection_id: params?.source_connection_id,
          target_connection_id: params?.target_connection_id,
          compare_type: params?.compare_type || 'full',
          schema_diff: {
            only_in_source: ['archived_logs'],
            only_in_target: [],
            column_differences: [
              {
                table_name: 'users',
                column_name: 'phone',
                source_type: 'VARCHAR(20)',
                target_type: 'VARCHAR(15)',
              },
            ],
          },
          data_diff: {
            tables: [
              {
                table_name: 'users',
                source_count: 1250,
                target_count: 1200,
                difference: 50,
              },
              {
                table_name: 'orders',
                source_count: 5000,
                target_count: 5000,
                difference: 0,
              },
            ],
          },
        });
      }

      // 동기화 작업 관리
      case 'getSyncJobs': {
        return createApiResponse(mockDBSyncJobs);
      }

      case 'createSyncJob': {
        return createApiResponse(
          { id: 999 },
          true,
          'Demo 모드: 동기화 작업이 생성되었습니다 (실제로 저장되지 않음)'
        );
      }

      case 'updateSyncJob':
      case 'deleteSyncJob': {
        return createApiResponse(
          { success: true },
          true,
          'Demo 모드: 동기화 작업이 수정되었습니다 (실제로 저장되지 않음)'
        );
      }

      case 'executeSyncJob': {
        return createApiResponse(
          { history_id: 999, message: 'Demo 모드: 동기화 작업이 시작되었습니다 (실제로 실행되지 않음)' },
          true,
          'Demo 모드에서는 동기화가 실제로 실행되지 않습니다.'
        );
      }

      // 동기화 이력
      case 'getSyncHistory': {
        const jobId = params?.job_id as number | undefined;
        if (jobId) {
          return createApiResponse(mockDBSyncHistory.filter((h) => h.sync_job_id === jobId));
        }
        return createApiResponse(mockDBSyncHistory);
      }

      case 'getSyncHistoryDetail': {
        const historyId = params?.history_id as number | undefined;
        const history = mockDBSyncHistory.find((h) => h.id === historyId);
        return createApiResponse({
          ...history,
          sql_logs: [
            'SELECT COUNT(*) FROM users;',
            'INSERT INTO users_backup SELECT * FROM users;',
            'UPDATE sync_status SET last_run = NOW();',
          ],
          detailed_stats: {
            inserted: 50,
            updated: 120,
            deleted: 0,
            skipped: 5,
          },
        });
      }

      // 백업 관리
      case 'listBackups': {
        const connectionId = params?.connection_id as number | undefined;
        return createApiResponse([
          {
            file_name: `backup_${connectionId}_20260109_020000.sql`,
            file_path: `/backups/backup_${connectionId}_20260109_020000.sql`,
            file_size: 25600000,
            created_at: '2026-01-09T02:00:00Z',
          },
          {
            file_name: `backup_${connectionId}_20260108_020000.sql`,
            file_path: `/backups/backup_${connectionId}_20260108_020000.sql`,
            file_size: 24500000,
            created_at: '2026-01-08T02:00:00Z',
          },
        ]);
      }

      case 'getRestoreHistory': {
        return createApiResponse([]);
      }

      case 'restoreBackup':
      case 'restoreBackupAsync': {
        return createApiResponse(
          { restore_id: 999, message: 'Demo 모드: 백업 복원이 시작되었습니다 (실제로 실행되지 않음)' },
          true,
          'Demo 모드에서는 백업 복원이 실제로 실행되지 않습니다.'
        );
      }

      // DB 백업 생성
      case 'createDBBackup': {
        const connectionId = params?.connection_id as number | undefined;
        const backupName = params?.backup_name as string || `backup_${connectionId}_${Date.now()}`;
        return createApiResponse(
          {
            backup_id: 999,
            backup_name: backupName,
            file_path: `/backups/${backupName}.sql`,
            file_size: 0,
          },
          true,
          'Demo 모드: 백업이 생성되었습니다 (실제로 생성되지 않음)'
        );
      }

      // DB 백업 삭제
      case 'deleteDBBackup': {
        return createApiResponse(
          { success: true },
          true,
          'Demo 모드: 백업이 삭제되었습니다 (실제로 삭제되지 않음)'
        );
      }

      default:
        console.info(`[Mock Database API] Unknown action: ${action}`);
        return createApiResponse([]);
    }
  },
};
