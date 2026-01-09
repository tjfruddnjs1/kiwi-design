import { Form } from 'antd';
import { useEffect, useState } from 'react';
import { Hop } from '../components/backup/setup/AuthFields';
import type { Server } from '../types/infra';
import { logger } from '../utils/logger';
// TokenFormValues is no longer used in this file

export interface UseSetupWizardProps {
  visible: boolean;
  servers: Server[];
  selectedInfraId: string | undefined;
  onStorageInfraChange: (infraId: number) => void;

  onStartInstallation: (formData: any) => Promise<void>;
  onSubmit: () => void;
}

export const useSetupWizard = ({
  visible,
  servers,
  selectedInfraId: _selectedInfraId,
  onStorageInfraChange,
  onStartInstallation,
  onSubmit: _onSubmit,
}: UseSetupWizardProps) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [minioMode, setMinioMode] = useState<'existing' | 'new'>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedServerHops, setSelectedServerHops] = useState<Hop[]>([]);
  const [engineAuthHops, setEngineAuthHops] = useState<Hop[]>([]);

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setCurrentStep(0);
      setMinioMode('new');
      setSelectedServerHops([]); //  모달이 열릴 때 hops 정보도 초기화
      setEngineAuthHops([]); //  모달이 열릴 때 함께 초기화
    }
  }, [visible, form]);

  const handleStorageInfraChange = (infraId: number) => {
    // 1. 부모에게 알려 서버 목록을 새로고침하도록 요청합니다.
    onStorageInfraChange(infraId);
    // 2. 이전에 선택했던 "설치 서버" 값을 초기화하여 잘못된 선택을 방지합니다.
    form.setFieldsValue({ storageServer: undefined });
    setSelectedServerHops([]); //  인프라가 바뀌면 hops 정보도 초기화
  };

  const handleK8sInfraChange = (k8sInfraId: number) => {
    onStorageInfraChange(k8sInfraId);
  };

  useEffect(() => {
    // 현재 2단계가 아니거나, 폼에서 선택된 k8s 인프라가 없으면 아무것도 하지 않습니다.
    const k8sInfraId = form.getFieldValue('k8sInfra');
    if (currentStep !== 1 || !k8sInfraId) {
      // 2단계가 아니면 hops 정보를 비워서 인증 필드를 숨깁니다.
      if (engineAuthHops.length > 0) setEngineAuthHops([]);
      return;
    }

    // 현재 servers 목록에서 선택된 k8s 인프라에 속하는 서버들을 찾습니다.
    const relevantServers = servers.filter(s => s.infra_id === k8sInfraId);
    const masterNode = relevantServers.find(s => s.type?.includes('master'));

    if (masterNode && masterNode.hops) {
      try {
        const parsedHops = JSON.parse(masterNode.hops);
        setEngineAuthHops(
          Array.isArray(parsedHops) ? parsedHops : [parsedHops]
        );
      } catch (e) {
        logger.error('Failed to parse master node hops:', e);
        setEngineAuthHops([]);
      }
    } else {
      setEngineAuthHops([]);
    }
    // servers 상태가 변경되거나, currentStep이 2단계로 진입했을 때 이 로직이 실행됩니다.
  }, [servers, currentStep, form]);

  const handleStorageServerChange = (serverId: number) => {
    const selectedServer = servers.find(s => s.id === serverId);
    if (selectedServer && selectedServer.hops) {
      try {
        // hops는 JSON 문자열이므로 파싱합니다.
        const parsedHops = JSON.parse(selectedServer.hops);
        setSelectedServerHops(
          Array.isArray(parsedHops) ? parsedHops : [parsedHops]
        );
      } catch (e) {
        logger.error('Failed to parse server hops:', e);
        setSelectedServerHops([]);
      }
    } else {
      setSelectedServerHops([]);
    }
  };

  useEffect(() => {
    // minioMode가 변경될 때 처리할 로직 (필요시 확장)
    // 현재는 별도 처리 없음
  }, [minioMode]);

  // 다음 단계로 이동
  const handleNext = async () => {
    try {
      await form.validateFields();
      const formValues = form.getFieldsValue(true);

      if (currentStep === 0) {
        // 1단계 -> 2단계 로직은 이전과 동일
        const fieldsToReset: { [key: string]: any } = { k8sInfra: undefined };
        Object.keys(formValues).forEach(key => {
          if (key.startsWith('ssh_')) {
            fieldsToReset[key] = undefined;
          }
        });
        form.setFieldsValue(fieldsToReset);
        setEngineAuthHops([]);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // 2단계에서 "설치 시작"을 눌렀을 때
        setIsSubmitting(true);

        //  2. 최종적으로 API에 보낼 데이터를 조합합니다.
        //    form에서 가져온 값(...formValues)에,
        //    우리가 useState로 직접 관리하는 minioMode 값을 덮어씌웁니다.
        const finalFormData = {
          ...formValues,
          minioMode: minioMode, // ⭐️ 이 부분이 핵심입니다!
        };

        //  3. 조합된 최종 데이터를 전달합니다.
        await onStartInstallation(finalFormData);
      }
    } catch (error) {
      logger.error('폼 검증 실패', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이전 단계로 이동
  const handlePrev = () => {
    // 2단계 -> 1단계로 돌아갈 때

    //  1단계에서 사용할 storageServer 필드를 제외한 모든 인증 필드를 초기화합니다.
    // 2단계에서 입력했던 인증 정보가 1단계에 나타나는 것을 방지합니다.
    const formData = form.getFieldsValue(true);
    const fieldsToReset: { [key: string]: any } = {
      storageServer: undefined, // 1단계 서버 드롭다운도 초기화
    };
    Object.keys(formData).forEach(key => {
      if (key.startsWith('ssh_')) {
        fieldsToReset[key] = undefined;
      }
    });
    form.setFieldsValue(fieldsToReset);

    // 1단계 인증 필드를 비웁니다.
    setSelectedServerHops([]);

    // 이전 단계로 이동
    setCurrentStep(currentStep - 1);
  };

  const getServerOptions = () => {
    if (!servers) return [];
    return servers.map(server => ({
      key: server.id,
      value: server.id,
      label: `${server.server_name} (${server.type || 'N/A'})`,
    }));
  };

  return {
    form,
    currentStep,
    minioMode,
    isSubmitting,
    selectedServerHops, //  hops 상태를 반환합니다.
    engineAuthHops, //  2단계 hops 상태를 반환합니다.
    setMinioMode,
    handleNext,
    handlePrev,
    getServerOptions,
    handleStorageInfraChange,
    handleStorageServerChange, //  새로 만든 함수를 반환합니다.
    handleK8sInfraChange, //  새로 만든 함수를 반환합니다.
  };
};
