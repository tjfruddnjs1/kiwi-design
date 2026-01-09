/**
 * Mock Backup Data
 * 백업/복원 및 저장소 데이터
 */

export interface MockBackup {
  id: number;
  name: string;
  infra_id: number;
  group_label?: string;
  namespace: string;
  schedule?: string;
  retention?: string;
  status: 'creating' | 'completed' | 'failed' | 'InProgress' | 'Running' | 'PartiallyFailed' | 'Completed';
  error?: string;
  size?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface MockRestore {
  id: number;
  name: string;
  backup_name: string;
  namespace: string;
  status: 'InProgress' | 'Completed' | 'Failed';
  infra_id: number;
  restore_time?: string;
  created_at: string;
  updated_at: string;
}

export interface MockBackupStorage {
  id: number;
  name: string;
  type: 'minio' | 's3' | 'gcs' | 'azure';
  endpoint: string;
  region?: string;
  access_key: string;
  secret_key: string;
  bucket_name: string;
  infra_id: number;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

export interface MockExternalStorage {
  id: number;
  organization_id: number;
  name: string;
  description?: string;
  type: 'minio' | 's3' | 'nfs';
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket: string;
  region?: string;
  use_ssl: boolean;
  status: 'active' | 'inactive' | 'error';
  last_connected_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const mockBackups: MockBackup[] = [
  {
    id: 1,
    name: 'backup-production-2026-01-09-0200',
    infra_id: 1,
    group_label: 'daily-production',
    namespace: 'production',
    schedule: '0 2 * * *',
    retention: '30d',
    status: 'Completed',
    size: '2.5GB',
    created_at: '2026-01-09T02:00:00Z',
    completed_at: '2026-01-09T02:15:00Z',
    updated_at: '2026-01-09T02:15:00Z',
  },
  {
    id: 2,
    name: 'backup-production-2026-01-08-0200',
    infra_id: 1,
    group_label: 'daily-production',
    namespace: 'production',
    schedule: '0 2 * * *',
    retention: '30d',
    status: 'Completed',
    size: '2.4GB',
    created_at: '2026-01-08T02:00:00Z',
    completed_at: '2026-01-08T02:12:00Z',
    updated_at: '2026-01-08T02:12:00Z',
  },
  {
    id: 3,
    name: 'backup-staging-2026-01-09-0300',
    infra_id: 1,
    group_label: 'daily-staging',
    namespace: 'staging',
    schedule: '0 3 * * *',
    retention: '7d',
    status: 'Completed',
    size: '850MB',
    created_at: '2026-01-09T03:00:00Z',
    completed_at: '2026-01-09T03:05:00Z',
    updated_at: '2026-01-09T03:05:00Z',
  },
  {
    id: 4,
    name: 'backup-manual-2026-01-07-1530',
    infra_id: 1,
    namespace: 'production',
    status: 'Completed',
    size: '2.3GB',
    created_at: '2026-01-07T15:30:00Z',
    completed_at: '2026-01-07T15:45:00Z',
    updated_at: '2026-01-07T15:45:00Z',
  },
  {
    id: 5,
    name: 'backup-production-2026-01-06-0200',
    infra_id: 1,
    group_label: 'daily-production',
    namespace: 'production',
    schedule: '0 2 * * *',
    retention: '30d',
    status: 'PartiallyFailed',
    error: 'Some resources failed to backup: configmap/legacy-config',
    size: '2.1GB',
    created_at: '2026-01-06T02:00:00Z',
    completed_at: '2026-01-06T02:18:00Z',
    updated_at: '2026-01-06T02:18:00Z',
  },
  {
    id: 6,
    name: 'backup-production-running',
    infra_id: 1,
    namespace: 'production',
    status: 'InProgress',
    created_at: '2026-01-09T08:30:00Z',
    updated_at: '2026-01-09T08:35:00Z',
  },
  // Docker Backups (infra_id: 2)
  {
    id: 7,
    name: 'docker-backup-2026-01-09-0400',
    infra_id: 2,
    group_label: 'daily-docker',
    namespace: 'docker-development',
    schedule: '0 4 * * *',
    retention: '14d',
    status: 'Completed',
    size: '1.2GB',
    created_at: '2026-01-09T04:00:00Z',
    completed_at: '2026-01-09T04:08:00Z',
    updated_at: '2026-01-09T04:08:00Z',
  },
  {
    id: 8,
    name: 'docker-backup-2026-01-08-0400',
    infra_id: 2,
    group_label: 'daily-docker',
    namespace: 'docker-development',
    schedule: '0 4 * * *',
    retention: '14d',
    status: 'Completed',
    size: '1.1GB',
    created_at: '2026-01-08T04:00:00Z',
    completed_at: '2026-01-08T04:07:00Z',
    updated_at: '2026-01-08T04:07:00Z',
  },
  {
    id: 9,
    name: 'docker-backup-manual-2026-01-07',
    infra_id: 2,
    namespace: 'docker-development',
    status: 'Completed',
    size: '980MB',
    created_at: '2026-01-07T10:00:00Z',
    completed_at: '2026-01-07T10:05:00Z',
    updated_at: '2026-01-07T10:05:00Z',
  },
  {
    id: 10,
    name: 'docker-backup-2026-01-06-0400',
    infra_id: 2,
    group_label: 'daily-docker',
    namespace: 'docker-development',
    schedule: '0 4 * * *',
    retention: '14d',
    status: 'failed',
    error: 'Docker daemon not responding: connection timeout',
    created_at: '2026-01-06T04:00:00Z',
    completed_at: '2026-01-06T04:02:00Z',
    updated_at: '2026-01-06T04:02:00Z',
  },
  // Podman Backups (infra_id: 4)
  {
    id: 11,
    name: 'podman-backup-2026-01-09-0500',
    infra_id: 4,
    group_label: 'daily-podman',
    namespace: 'podman-staging',
    schedule: '0 5 * * *',
    retention: '7d',
    status: 'Completed',
    size: '650MB',
    created_at: '2026-01-09T05:00:00Z',
    completed_at: '2026-01-09T05:04:00Z',
    updated_at: '2026-01-09T05:04:00Z',
  },
  {
    id: 12,
    name: 'podman-backup-2026-01-08-0500',
    infra_id: 4,
    group_label: 'daily-podman',
    namespace: 'podman-staging',
    schedule: '0 5 * * *',
    retention: '7d',
    status: 'Completed',
    size: '620MB',
    created_at: '2026-01-08T05:00:00Z',
    completed_at: '2026-01-08T05:03:00Z',
    updated_at: '2026-01-08T05:03:00Z',
  },
  {
    id: 13,
    name: 'podman-backup-manual-2026-01-05',
    infra_id: 4,
    namespace: 'podman-staging',
    status: 'Completed',
    size: '580MB',
    created_at: '2026-01-05T14:00:00Z',
    completed_at: '2026-01-05T14:03:00Z',
    updated_at: '2026-01-05T14:03:00Z',
  },
  {
    id: 14,
    name: 'podman-backup-2026-01-04-0500',
    infra_id: 4,
    group_label: 'daily-podman',
    namespace: 'podman-staging',
    schedule: '0 5 * * *',
    retention: '7d',
    status: 'PartiallyFailed',
    error: 'Container monitoring-agent was not accessible during backup',
    size: '450MB',
    created_at: '2026-01-04T05:00:00Z',
    completed_at: '2026-01-04T05:05:00Z',
    updated_at: '2026-01-04T05:05:00Z',
  },
];

export const mockRestores: MockRestore[] = [
  // Kubernetes Restores
  {
    id: 1,
    name: 'restore-production-2026-01-05-1000',
    backup_name: 'backup-production-2026-01-04-0200',
    namespace: 'production',
    status: 'Completed',
    infra_id: 1,
    restore_time: '2026-01-05T10:15:00Z',
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-01-05T10:15:00Z',
  },
  {
    id: 2,
    name: 'restore-staging-2026-01-03-1400',
    backup_name: 'backup-staging-2026-01-02-0300',
    namespace: 'staging',
    status: 'Completed',
    infra_id: 1,
    restore_time: '2026-01-03T14:08:00Z',
    created_at: '2026-01-03T14:00:00Z',
    updated_at: '2026-01-03T14:08:00Z',
  },
  // Docker Restores
  {
    id: 3,
    name: 'restore-docker-2026-01-07-1100',
    backup_name: 'docker-backup-manual-2026-01-07',
    namespace: 'docker-development',
    status: 'Completed',
    infra_id: 2,
    restore_time: '2026-01-07T11:05:00Z',
    created_at: '2026-01-07T11:00:00Z',
    updated_at: '2026-01-07T11:05:00Z',
  },
  {
    id: 4,
    name: 'restore-docker-2026-01-04-0900',
    backup_name: 'docker-backup-2026-01-03-0400',
    namespace: 'docker-development',
    status: 'Completed',
    infra_id: 2,
    restore_time: '2026-01-04T09:10:00Z',
    created_at: '2026-01-04T09:00:00Z',
    updated_at: '2026-01-04T09:10:00Z',
  },
  {
    id: 5,
    name: 'restore-docker-failed-2026-01-02',
    backup_name: 'docker-backup-2026-01-01-0400',
    namespace: 'docker-development',
    status: 'Failed',
    infra_id: 2,
    created_at: '2026-01-02T16:00:00Z',
    updated_at: '2026-01-02T16:05:00Z',
  },
  // Podman Restores
  {
    id: 6,
    name: 'restore-podman-2026-01-06-1300',
    backup_name: 'podman-backup-manual-2026-01-05',
    namespace: 'podman-staging',
    status: 'Completed',
    infra_id: 4,
    restore_time: '2026-01-06T13:04:00Z',
    created_at: '2026-01-06T13:00:00Z',
    updated_at: '2026-01-06T13:04:00Z',
  },
  {
    id: 7,
    name: 'restore-podman-2026-01-03-1600',
    backup_name: 'podman-backup-2026-01-02-0500',
    namespace: 'podman-staging',
    status: 'Completed',
    infra_id: 4,
    restore_time: '2026-01-03T16:03:00Z',
    created_at: '2026-01-03T16:00:00Z',
    updated_at: '2026-01-03T16:03:00Z',
  },
];

export const mockBackupStorages: MockBackupStorage[] = [
  {
    id: 1,
    name: 'minio-production',
    type: 'minio',
    endpoint: 'http://minio.backup.svc.cluster.local:9000',
    access_key: 'minio-access-key',
    secret_key: '********',
    bucket_name: 'velero-backups',
    infra_id: 1,
    status: 'active',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
  },
];

export const mockExternalStorages: MockExternalStorage[] = [
  {
    id: 1,
    organization_id: 1,
    name: 'AWS S3 Backup',
    description: 'Primary cloud backup storage',
    type: 's3',
    endpoint: 's3.ap-northeast-2.amazonaws.com',
    access_key: 'AKIA************',
    secret_key: '********',
    bucket: 'kiwi-backup-prod',
    region: 'ap-northeast-2',
    use_ssl: true,
    status: 'active',
    last_connected_at: '2026-01-09T08:00:00Z',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2026-01-09T08:00:00Z',
  },
  {
    id: 2,
    organization_id: 1,
    name: 'On-Premise MinIO',
    description: 'Local datacenter backup',
    type: 'minio',
    endpoint: 'minio.local.kiwi.com:9000',
    access_key: 'minio-local-key',
    secret_key: '********',
    bucket: 'local-backups',
    use_ssl: false,
    status: 'active',
    last_connected_at: '2026-01-09T07:00:00Z',
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2026-01-09T07:00:00Z',
  },
];

// Backup Installation Status
export const mockBackupInstallStatus = {
  minio: {
    installed: true,
    endpoint: 'http://minio.backup.svc.cluster.local:9000',
    status: 'active' as const,
    local_installation: true,
    connected_minio_info: {
      id: 1,
      endpoint: 'http://minio.backup.svc.cluster.local:9000',
      status: 'active',
      infra_id: 1,
    },
  },
  velero: {
    installed: true,
    status: 'active' as const,
    requires_kubernetes: true,
    infra_type_supported: true,
    connected_minio_id: 1,
    connected_minio_info: {
      id: 1,
      endpoint: 'http://minio.backup.svc.cluster.local:9000',
      status: 'active',
      infra_id: 1,
    },
  },
  summary: {
    infra_name: 'kubernetes-production',
    infra_type: 'kubernetes',
    backup_ready: true,
    can_create_backup: true,
    has_external_storage: true,
  },
  external_storage: {
    connected: true,
    connection_count: 2,
    connected_storages: [
      {
        id: 1,
        infra_id: 1,
        external_storage_id: 1,
        is_default: true,
        storage_name: 'AWS S3 Backup',
        storage_endpoint: 's3.ap-northeast-2.amazonaws.com',
      },
    ],
  },
  available_external_storages: 2,
};
