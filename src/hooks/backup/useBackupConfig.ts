import { useState, useCallback } from 'react';
import { BackupConfig, MinIOConfig, VeleroConfig } from '../../types/backup';
import { BackupFormValues } from '../../types';

interface ConfigData {
  minio: MinIOConfig | null;
  velero: VeleroConfig | null;
  backup: BackupConfig | null;
}

export interface UseBackupConfigReturn {
  // Configuration state
  configData: ConfigData;
  currentStep: number;
  scheduleType: 'daily' | 'weekly' | 'monthly';
  minioMode: 'existing' | 'new';
  selectedMinioId: number | null;
  restoreToDifferentNamespace: boolean;

  // Setters
  setConfigData: (data: ConfigData) => void;
  setCurrentStep: (step: number) => void;
  setScheduleType: (type: 'daily' | 'weekly' | 'monthly') => void;
  setMinioMode: (mode: 'existing' | 'new') => void;
  setSelectedMinioId: (id: number | null) => void;
  setRestoreToDifferentNamespace: (value: boolean) => void;

  // Utility functions
  convertScheduleToExpression: (values: BackupFormValues) => string;
  resetConfigState: () => void;

  // Step navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  // MinIO configuration helpers
  isMinioConfigured: () => boolean;
  isVeleroConfigured: () => boolean;
  isBackupReady: () => boolean;
}

export const useBackupConfig = (): UseBackupConfigReturn => {
  // Configuration state
  const [configData, setConfigData] = useState<ConfigData>({
    minio: null,
    velero: null,
    backup: null,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [scheduleType, setScheduleType] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [minioMode, setMinioMode] = useState<'existing' | 'new'>('new');
  const [selectedMinioId, setSelectedMinioId] = useState<number | null>(null);
  const [restoreToDifferentNamespace, setRestoreToDifferentNamespace] =
    useState(false);

  // Convert schedule to cron expression
  const convertScheduleToExpression = useCallback(
    (values: BackupFormValues): string => {
      if (!values.schedule || !values.time) {
        return '';
      }

      const time =
        typeof values.time === 'string'
          ? values.time
          : values.time?.toISOString() || '';
      const [hours, minutes] = time.split(':').map(Number);

      switch (values.scheduleType) {
        case 'daily':
          return `${minutes} ${hours} * * *`;
        case 'weekly':
          return `${minutes} ${hours} * * 0`; // Sunday
        case 'monthly':
          return `${minutes} ${hours} 1 * *`; // First day of month
        default:
          return `${minutes} ${hours} * * *`;
      }
    },
    []
  );

  // Reset configuration state
  const resetConfigState = useCallback(() => {
    setConfigData({ minio: null, velero: null, backup: null });
    setCurrentStep(0);
    setScheduleType('daily');
    setMinioMode('new');
    setSelectedMinioId(null);
    setRestoreToDifferentNamespace(false);
  }, []);

  // Step navigation
  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Configuration helpers
  const isMinioConfigured = useCallback((): boolean => {
    return (
      configData.minio !== null &&
      typeof configData.minio === 'object' &&
      'status' in configData.minio &&
      ((configData.minio as any).status === 'active' ||
        (configData.minio as any).status === 'connected')
    );
  }, [configData.minio]);

  const isVeleroConfigured = useCallback((): boolean => {
    return (
      configData.velero !== null &&
      typeof configData.velero === 'object' &&
      'status' in configData.velero &&
      'installed' in configData.velero &&
      ((configData.velero as any).status === 'active' ||
        (configData.velero as any).installed)
    );
  }, [configData.velero]);

  const isBackupReady = useCallback(() => {
    return isMinioConfigured() && isVeleroConfigured();
  }, [isMinioConfigured, isVeleroConfigured]);

  return {
    // Configuration state
    configData,
    currentStep,
    scheduleType,
    minioMode,
    selectedMinioId,
    restoreToDifferentNamespace,

    // Setters
    setConfigData,
    setCurrentStep,
    setScheduleType,
    setMinioMode,
    setSelectedMinioId,
    setRestoreToDifferentNamespace,

    // Utility functions
    convertScheduleToExpression,
    resetConfigState,

    // Step navigation
    nextStep,
    prevStep,
    goToStep,

    // Configuration helpers
    isMinioConfigured,
    isVeleroConfigured,
    isBackupReady,
  };
};
