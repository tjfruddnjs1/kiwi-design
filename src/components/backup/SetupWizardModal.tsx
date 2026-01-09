import React from 'react';
import { Modal, Form, Steps, Space, Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { BackupInstallStatus, BackupStorage } from '../../types/backup';
import { InfraItem, Server } from '../../types/infra';
import { useSetupWizard } from '../../hooks/useSetupWizard';
import InstallStatusDisplay from './setup/InstallStatusDisplay';
import SetupWizardSteps from './setup/SetupWizardSteps';
import './SetupWizardModal.css';

const { Step } = Steps;

interface SetupWizardModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  installStatus?: BackupInstallStatus | null;
  infrastructures: InfraItem[];
  servers?: Server[];
  selectedInfraId: string | undefined;
  onStorageInfraChange: (infraId: number) => void;
  onStartInstallation?: (formData: any) => Promise<void>;
  allMinioStorages?: BackupStorage[];
}

const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  installStatus,
  infrastructures,
  servers,
  selectedInfraId,
  onStorageInfraChange,
  onStartInstallation,
  allMinioStorages,
}) => {
  const {
    form,
    currentStep,
    minioMode,
    isSubmitting,
    selectedServerHops,
    engineAuthHops, //  훅에서 2단계 hops 상태를 가져옵니다.
    setMinioMode,
    handleNext,
    handlePrev,
    handleStorageInfraChange,
    getServerOptions,
    handleStorageServerChange,
    handleK8sInfraChange, //  훅에서 k8s 인프라 변경 핸들러를 가져옵니다.
  } = useSetupWizard({
    visible,
    infrastructures, //  훅에 전체 인프라 목록을 전달합니다.
    servers: servers || [],
    selectedInfraId,
    onStorageInfraChange,
    onStartInstallation: onStartInstallation || (async () => {}), // 기본값 제공
    onSubmit,
  });

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          백업 시스템 설정 마법사
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={null}
    >
      <div className='setup-wizard-modal'>
        <InstallStatusDisplay installStatus={installStatus} />

        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title='저장소 설정' description='백업 저장소 설치' />
          <Step title='엔진 설정' description='백업 엔진 설치' />
        </Steps>

        <Form form={form} layout='vertical'>
          <SetupWizardSteps
            currentStep={currentStep}
            minioMode={minioMode}
            setMinioMode={setMinioMode}
            infrastructures={infrastructures}
            engineAuthHops={engineAuthHops}
            onK8sInfraChange={handleK8sInfraChange}
            onStorageInfraChange={handleStorageInfraChange}
            getServerOptions={getServerOptions}
            selectedServerHops={selectedServerHops}
            onStorageServerChange={handleStorageServerChange}
            allMinioStorages={allMinioStorages} // 👈 이 줄을 추가하여 prop을 전달합니다.
          />
        </Form>

        <div className='wizard-footer'>
          <Space>
            {currentStep > 0 && <Button onClick={handlePrev}>이전</Button>}
            <Button type='primary' onClick={handleNext} loading={isSubmitting}>
              {currentStep === 1 ? '설치 시작' : '다음'}
            </Button>
            <Button onClick={onCancel}>취소</Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default SetupWizardModal;
