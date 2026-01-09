// BackupManage 페이지 전용 타입 정의

export interface BackupFormValues {
  infra_id: number;
  namespace: string;
  name?: string;
  schedule?: string;
  retention?: string;
  server_username: string;
  server_password: string;
}

export interface RestoreFormValues {
  infra_id: number;
  backup_name: string;
  namespace: string;
  server_username: string;
  server_password: string;
}

export interface SetupModalStates {
  minio: {
    visible: boolean;
    data: {
      infraId: number;
      infraName: string;
    } | null;
  };
  velero: {
    visible: boolean;
    data: {
      infraId: number;
      infraName: string;
    } | null;
  };
  backup: {
    visible: boolean;
    infraId: number | null;
  };
}

export interface MinioSetupParams {
  infraId: number;
  namespace: string;
  storageSize: string;
  accessKey: string;
  secretKey: string;
  server_username: string;
  server_password: string;
}

export interface VeleroSetupParams {
  infraId: number;
  minioStorageId: number;
  server_username: string;
  server_password: string;
}
