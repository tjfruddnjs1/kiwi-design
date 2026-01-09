import React from 'react';
import { FormInstance } from 'antd';
import { message } from 'antd';
import { logger } from '../../utils/logger';
import {
  InfraItem,
  BackupStorageWithInfra,
  VeleroInstallParams,
} from '../../types';
import { Server } from '../../types/infra';
import { MinioInstallParams } from '../../lib/api/types';

type Hop = {
  host: string;
  port: number;
};

interface BackupSetupHandlerProps {
  setupForm: FormInstance;
  currentStep: number;
  setupHops: Hop[];
  currentAuthHops: Hop[];
  infrastructures: InfraItem[];
  servers: Server[];
  allMinioStorages: BackupStorageWithInfra[];
  setConfigData: React.Dispatch<
    React.SetStateAction<{
      minio: MinioInstallParams | BackupStorageWithInfra | null;
      velero: VeleroInstallParams | null;
      backup: BackupConfig | null;
    }>
  >;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

interface FormValues {
  [key: string]: string | number | undefined;
}

interface AuthData {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface BackupConfig {
  // 백업 설정 관련 타입 정의
  [key: string]: unknown;
}

// interface InstallStatus {
//   // 설치 상태 관련 타입 정의
//   [key: string]: unknown;
// }

const BackupSetupHandler = ({
  setupForm,
  currentStep,
  setupHops,
  currentAuthHops,
  infrastructures,
  servers,
  allMinioStorages,
  setConfigData,
  setCurrentStep,
}: BackupSetupHandlerProps) => {
  const formatAuthData = (formValues: FormValues, hops: Hop[]): AuthData[] => {
    return hops.map((_, index) => ({
      host: hops[index].host,
      port: hops[index].port,
      username: formValues[`ssh_username_${index}`] as string,
      password: formValues[`ssh_password_${index}`] as string,
    }));
  };

  const getCurrentStepFields = () => {
    switch (currentStep) {
      case 0:
        const values = setupForm.getFieldsValue();
        const selectedInfra = infrastructures.find(
          i => i.id === Number(values.storageInfra)
        );

        if (values.minioMode === 'existing') {
          return ['existingMinioId'];
        } else {
          // 도커 타입이 아닌 경우에만 서버 선택 필수
          const fields = [
            'storageInfra',
            ...setupHops.flatMap((_, i) => [
              `ssh_username_${i}`,
              `ssh_password_${i}`,
            ]),
          ];

          if (selectedInfra?.type !== 'docker') {
            fields.push('storageServer');
          }

          return fields;
        }
      case 1:
        return [
          'k8sInfra',
          ...currentAuthHops.flatMap((_, i) => [
            `ssh_username_${i}`,
            `ssh_password_${i}`,
          ]),
        ];
      default:
        return [];
    }
  };

  // 현재 단계와 모드에 따른 유효성 검사 필드 목록 생성
  const getFieldsToValidate = (values: Record<string, unknown>) => {
    if (currentStep === 0) {
      if (values.minioMode === 'new') {
        return [
          'storageInfra',
          ...setupHops.flatMap((_, i) => [
            `ssh_username_${i}`,
            `ssh_password_${i}`,
          ]),
        ];
      } else {
        return ['existingMinioId'];
      }
    }
    if (currentStep === 1) {
      return [
        'k8sInfra',
        ...currentAuthHops.flatMap((_, i) => [
          `ssh_username_${i}`,
          `ssh_password_${i}`,
        ]),
      ];
    }

    return [];
  };

  // 기존 MinIO 저장소 선택 처리
  const getExistingMinioConfig = (
    values: Record<string, unknown>
  ): BackupStorageWithInfra | null => {
    const selected = allMinioStorages.find(
      s => s.id === values.existingMinioId
    );

    if (!selected) {
      message.error('선택한 저장소 정보를 찾을 수 없습니다.');

      return null;
    }

    return selected;
  };

  // 도커 인프라에서 서버 IP 추출
  const extractServerIpFromInfra = (
    infraId: number,
    selectedInfra: Infrastructure
  ) => {
    let serverIp = '';

    if (selectedInfra?.type === 'docker') {
      try {
        const dockerServers = servers.filter(s => s.infra_id === infraId);

        if (dockerServers.length > 0 && dockerServers[0]) {
          const serverHops =
            typeof dockerServers[0].hops === 'string'
              ? JSON.parse(dockerServers[0].hops || '[]')
              : dockerServers[0].hops || [];

          if (serverHops.length > 0) {
            serverIp = serverHops[0].host || '';
          }
        }

        // infra.info에서 시도
        if (!serverIp && selectedInfra.info) {
          const parsed = JSON.parse(selectedInfra.info);

          serverIp = parsed.host || '';
        }
      } catch (e) {
        logger.error('도커 인프라 정보 파싱 실패', e as Error);
      }

      if (!serverIp) {
        message.error(
          '도커 인프라의 호스트 IP 정보를 찾을 수 없습니다. 인프라 설정을 확인해주세요.'
        );

        return null;
      }
    }

    return serverIp;
  };

  // 새로운 MinIO 설정 생성
  const createNewMinioConfig = (
    values: Record<string, unknown>
  ): MinioInstallParams | null => {
    const minioAuthData = formatAuthData(values, setupHops);
    const infraId = Number(values.storageInfra);
    const selectedInfra = infrastructures.find(i => i.id === infraId);

    if (!selectedInfra) {
      message.error('선택한 인프라를 찾을 수 없습니다.');

      return null;
    }

    const serverIp = extractServerIpFromInfra(infraId, selectedInfra);

    if (serverIp === null) {
      return null;
    }

    return {
      infra_id: infraId,
      endpoint: `${serverIp || 'localhost'}:${9000}`,
      access_key: 'minioadmin',
      secret_key: 'minioadmin',
      bucket_name: `cluster-${infraId}`,
      auth_data: minioAuthData,
    };
  };

  // Step 0 처리 (MinIO 설정)
  const handleStep0 = async (values: Record<string, unknown>) => {
    let minioConfig: MinioInstallParams | BackupStorageWithInfra | null;

    if (values.minioMode === 'existing') {
      minioConfig = getExistingMinioConfig(values);
    } else {
      minioConfig = createNewMinioConfig(values);
    }

    if (!minioConfig) {
      return false;
    }

    setConfigData(prev => ({ ...prev, minio: minioConfig }));
    setCurrentStep(1);

    return true;
  };

  // Step 1 처리 (Velero 설정)
  const handleStep1 = async (values: Record<string, unknown>) => {
    const veleroConfig = {
      infra_id: Number(values.k8sInfra),
      storage_id: 0,
      auth_data: formatAuthData(values, currentAuthHops),
    } as unknown as VeleroInstallParams;

    setConfigData(prev => ({ ...prev, velero: veleroConfig }));

    return true;
  };

  const handleNext = async () => {
    try {
      const values = setupForm.getFieldsValue(true);

      // 유효성 검사
      const fieldsToValidate = getFieldsToValidate(values);

      await setupForm.validateFields(fieldsToValidate);

      const currentFields = getCurrentStepFields();

      await setupForm.validateFields(currentFields);
      const allValues = setupForm.getFieldsValue();

      // 단계별 처리
      if (currentStep === 0) {
        await handleStep0(allValues);
      } else if (currentStep === 1) {
        await handleStep1(allValues);
      }
    } catch (error) {
      logger.error('폼 유효성 검사 실패', error as Error);
      message.error('필수 항목을 모두 입력해주세요.');
    }
  };

  return { handleNext };
};

export default BackupSetupHandler;
