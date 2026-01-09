/**
 * Mock Backup API Handler
 */

import { createApiResponse } from '../utils/delay';
import {
  mockBackups,
  mockRestores,
  mockBackupStorages,
  mockExternalStorages,
  mockBackupInstallStatus,
} from '../data/backup';
import { mockNamespaces } from '../data/infrastructure';

export const mockBackupApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      // Installation
      case 'install-minio':
      case 'install-velero': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 설치를 수행할 수 없습니다.'
        );
      }

      case 'check-installation':
      case 'get-installation-status': {
        const infraId = params?.infra_id as number;
        return createApiResponse({
          ...mockBackupInstallStatus,
          infra_id: infraId,
        });
      }

      // Backups
      case 'create-backup': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 백업을 생성할 수 없습니다.'
        );
      }

      case 'list-backups': {
        const infraId = params?.infra_id as number | undefined;
        let backups = [...mockBackups];

        if (infraId) {
          backups = backups.filter((b) => b.infra_id === infraId);
        }

        // 컴포넌트가 response.data?.data로 접근하므로 중첩 구조 반환
        return createApiResponse({ data: backups });
      }

      case 'list-actual-backups': {
        const infraId = params?.infra_id as number | undefined;
        let backups = mockBackups.filter((b) => b.status === 'Completed');

        if (infraId) {
          backups = backups.filter((b) => b.infra_id === infraId);
        }

        return createApiResponse({ data: backups });
      }

      case 'delete-backup': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 백업을 삭제할 수 없습니다.'
        );
      }

      // Restores
      case 'create-restore': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 복원을 수행할 수 없습니다.'
        );
      }

      case 'list-restores': {
        const infraId = params?.infra_id as number | undefined;
        let restores = [...mockRestores];

        if (infraId) {
          restores = restores.filter((r) => r.infra_id === infraId);
        }

        return createApiResponse({ data: restores });
      }

      case 'delete-restore': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 복원 기록을 삭제할 수 없습니다.'
        );
      }

      // Storages
      case 'list-minio-storages':
      case 'list-all-minio-storages': {
        return createApiResponse({ data: mockBackupStorages });
      }

      case 'create-backup-storage':
      case 'update-backup-storage':
      case 'delete-environment':
      case 'update-bucket':
      case 'update-backup-location': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 저장소를 수정할 수 없습니다.'
        );
      }

      // External Storages
      case 'list-external-storages': {
        return createApiResponse({ data: mockExternalStorages });
      }

      case 'create-external-storage':
      case 'update-external-storage':
      case 'delete-external-storage': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 외부 저장소를 수정할 수 없습니다.'
        );
      }

      case 'get-external-storage': {
        const storageId = params?.storage_id as number;
        const storage = mockExternalStorages.find((s) => s.id === storageId);
        return createApiResponse(storage || null);
      }

      case 'test-external-storage-connection': {
        return createApiResponse({
          success: true,
          message: '연결 테스트 성공 (Mock)',
          latency_ms: 45,
        });
      }

      case 'list-external-storage-backups': {
        return createApiResponse({ data: mockBackups.slice(0, 3) });
      }

      case 'link-infra-to-external-storage':
      case 'unlink-infra-from-external-storage': {
        return createApiResponse(
          { success: false },
          false,
          'Demo 모드에서는 스토리지 연결을 수정할 수 없습니다.'
        );
      }

      case 'get-infra-storage-mappings': {
        return createApiResponse([
          {
            infra_id: 1,
            external_storage_id: 1,
            is_default: true,
            storage_name: 'AWS S3 Backup',
          },
        ]);
      }

      // Batch APIs - Returns Record<number, T[]> format
      case 'get-batch-infra-storage-mappings': {
        const infraIds = params?.infra_ids as number[] | undefined;
        const result: Record<number, { external_storage_id: number; is_default: boolean }[]> = {};
        (infraIds || [1]).forEach((id) => {
          result[id] = [{ external_storage_id: 1, is_default: true }];
        });
        return createApiResponse(result);
      }

      case 'get-batch-backups': {
        const infraIds = params?.infra_ids as number[] | undefined;
        const result: Record<number, typeof mockBackups> = {};
        (infraIds || [1]).forEach((infraId) => {
          result[infraId] = mockBackups.filter((b) => b.infra_id === infraId);
        });
        return createApiResponse(result);
      }

      case 'get-batch-restores': {
        const infraIds = params?.infra_ids as number[] | undefined;
        const result: Record<number, typeof mockRestores> = {};
        (infraIds || [1]).forEach((infraId) => {
          result[infraId] = mockRestores.filter((r) => r.infra_id === infraId);
        });
        return createApiResponse(result);
      }

      // Others
      case 'fetch-namespaces': {
        return createApiResponse(mockNamespaces.map((ns) => ns.name));
      }

      case 'get-environments': {
        return createApiResponse([
          { id: 1, name: 'production', infra_id: 1 },
          { id: 2, name: 'staging', infra_id: 1 },
        ]);
      }

      // Full Setup APIs
      case 'start-full-setup': {
        return createApiResponse(
          { job_id: 999 },
          true,
          'Demo 모드: 백업 환경 설치가 시작되었습니다 (실제로 실행되지 않음)'
        );
      }

      case 'get-setup-status': {
        return createApiResponse({
          status: 'completed',
          error_message: undefined,
        });
      }

      case 'add-infra-backup-line': {
        return createApiResponse(
          { job_id: 999 },
          true,
          'Demo 모드: 인프라 백업 라인 추가가 시작되었습니다 (실제로 실행되지 않음)'
        );
      }

      // DB Backup Operations
      case 'insert-backup': {
        const mockNewBackup = {
          id: 999,
          name: params?.name || 'new-backup',
          infra_id: params?.infra_id,
          namespace: params?.namespace || 'default',
          status: 'creating',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return createApiResponse(
          mockNewBackup,
          true,
          'Demo 모드: 백업 정보가 저장되었습니다 (실제로 저장되지 않음)'
        );
      }

      case 'update-backup': {
        return createApiResponse(
          { success: true },
          true,
          'Demo 모드: 백업 정보가 수정되었습니다 (실제로 수정되지 않음)'
        );
      }

      case 'remove-backup': {
        return createApiResponse(
          { success: true },
          true,
          'Demo 모드: 백업 정보가 삭제되었습니다 (실제로 삭제되지 않음)'
        );
      }

      case 'get-bucket-name': {
        return createApiResponse({
          bucket_name: 'velero-backups',
        });
      }

      // Environment by InfraId
      case 'get-velero-by-infra-id': {
        const infraId = params?.infra_id as number;
        return createApiResponse({
          id: 1,
          name: 'velero-production',
          type: 'velero',
          infra_id: infraId,
          status: 'active',
          connected_minio_id: 1,
        });
      }

      case 'get-minio-by-infra-id': {
        const infraId = params?.infra_id as number;
        return createApiResponse({
          id: 1,
          name: 'minio-production',
          type: 'minio',
          infra_id: infraId,
          endpoint: 'http://minio.backup.svc.cluster.local:9000',
          status: 'active',
        });
      }

      default:
        console.info(`[Mock Backup API] Unknown action: ${action}`);
        return createApiResponse({});
    }
  },
};