import React from 'react';
import { Form, Modal, Input, Divider } from 'antd';
import {
  CloudServerOutlined,
  UserOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { logger } from '../../utils/logger';
import { SshAuthHop } from '../../types/backup';
import { Hop } from '../../types/infra';
import { getServerCred, normalizePort } from '../../utils/credsAdapter';
import { useCredsStore } from '../../stores/useCredsStore';

interface AuthFormValues {
  [key: string]: string;
}

interface BackupAuthHandlerProps {
  onAuthSuccess: (
    authData: SshAuthHop[],
    purpose: string,
    formData?: unknown
  ) => void;
  onAuthCancel: () => void;
}

export const useBackupAuthHandler = ({
  onAuthSuccess,
  onAuthCancel,
}: BackupAuthHandlerProps) => {
  const [isNamespaceAuthModalVisible, setIsNamespaceAuthModalVisible] =
    React.useState(false);
  const [currentAuthHops, setCurrentAuthHops] = React.useState<Hop[]>([]);
  const [setupHops, setSetupHops] = React.useState<Hop[]>([]);
  const [authPurpose, setAuthPurpose] = React.useState<string>('');
  const [pendingFormData, setPendingFormData] = React.useState<unknown>(null);

  const [namespaceAuthForm] = Form.useForm();
  const credsStore = useCredsStore();

  // Format authentication data from form values and hops
  const formatAuthData = React.useCallback(
    (formValues: AuthFormValues, hops: Hop[]) => {
      return hops.map((hop, index) => ({
        host: hop.host,
        port: hop.port,
        username: formValues[`ssh_username_${index}`],
        password: formValues[`ssh_password_${index}`],
      }));
    },
    []
  );

  // Request authentication for namespace operations
  // 공통: 스토어 조회로 모두 채워지면 모달 없이 즉시 진행, 일부만 있으면 프리필 후 모달 오픈
  const openOrBypass = React.useCallback(
    async (hops: Hop[], purpose: string, formData?: unknown) => {
      const authData: SshAuthHop[] = [];
      const initialValues: Record<string, string> = {};

      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        const cred = await getServerCred(hop.host, normalizePort(hop.port));
        if (cred) {
          initialValues[`ssh_username_${i}`] = cred.userId;
          initialValues[`ssh_password_${i}`] = cred.password;
          authData.push({
            host: hop.host,
            port: hop.port,
            username: cred.userId,
            password: cred.password,
          });
        } else {
          authData.push({
            host: hop.host,
            port: hop.port,
            username: '',
            password: '',
          });
        }
      }

      const allFilled = authData.every(a => a.username && a.password);
      if (allFilled) {
        onAuthSuccess(authData, purpose, formData);
        return;
      }

      setCurrentAuthHops(hops);
      setAuthPurpose(purpose);
      setPendingFormData(formData);
      setIsNamespaceAuthModalVisible(true);
      if (Object.keys(initialValues).length > 0) {
        setTimeout(() => namespaceAuthForm.setFieldsValue(initialValues), 0);
      }
    },
    [namespaceAuthForm, onAuthSuccess]
  );

  const requestNamespaceAuth = React.useCallback(
    (hops: Hop[], purpose: string = 'namespace', formData?: unknown) => {
      void openOrBypass(hops, purpose, formData);
    },
    [openOrBypass]
  );

  // 2. requestSetupAuth 함수는 'setup' 전용으로 둡니다.
  const requestSetupAuth = React.useCallback(
    (hops: Hop[], purpose: string = 'setup', formData?: unknown) => {
      void openOrBypass(hops, purpose, formData);
    },
    [openOrBypass]
  );

  // 모달 오픈 시 스토어에 저장된 SSH 자격증명으로 자동 채움
  React.useEffect(() => {
    const hops = authPurpose === 'setup' ? setupHops : currentAuthHops;
    if (!isNamespaceAuthModalVisible || hops.length === 0) return;
    (async () => {
      const initialValues: Record<string, string> = {};
      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        const cred = await getServerCred(hop.host, normalizePort(hop.port));
        if (cred) {
          initialValues[`ssh_username_${i}`] = cred.userId;
          initialValues[`ssh_password_${i}`] = cred.password;
        }
      }
      if (Object.keys(initialValues).length > 0) {
        namespaceAuthForm.setFieldsValue(initialValues);
      }
    })().catch(() => {});
  }, [
    isNamespaceAuthModalVisible,
    authPurpose,
    setupHops,
    currentAuthHops,
    namespaceAuthForm,
  ]);

  // Handle authentication form submission
  const handleAuthSubmit = React.useCallback(async () => {
    try {
      const values =
        (await namespaceAuthForm.validateFields()) as AuthFormValues;
      const hops = authPurpose === 'setup' ? setupHops : currentAuthHops;
      const authData = formatAuthData(values, hops);

      // 입력된 SSH 자격증명을 스토어에 저장/업데이트(upsert)
      authData.forEach(item => {
        const exists = credsStore.serverlist.find(
          s =>
            s.host.trim().toLowerCase() === item.host.trim().toLowerCase() &&
            normalizePort(s.port) === normalizePort(item.port)
        );
        if (exists) {
          // 간단 업데이트: 동일 인덱스 찾기 어려워서 교체 로직은 생략하고 addServer로 누적하지 않도록 함
          // 여기서는 존재 시 저장을 건너뜀. 필요하면 updateServer로 개선 가능
        } else {
          credsStore.addServer({
            host: item.host,
            port: item.port,
            userId: item.username,
            password: item.password,
          });
        }
      });

      onAuthSuccess(authData, authPurpose, pendingFormData);

      // Reset state
      setIsNamespaceAuthModalVisible(false);
      setCurrentAuthHops([]);
      setSetupHops([]);
      setAuthPurpose('');
      setPendingFormData(null);
      namespaceAuthForm.resetFields();
    } catch (error: unknown) {
      logger.error('Auth form validation failed:', error as Error);
    }
  }, [
    namespaceAuthForm,
    authPurpose,
    setupHops,
    currentAuthHops,
    formatAuthData,
    onAuthSuccess,
    pendingFormData,
    credsStore,
  ]);

  // Handle authentication cancellation
  const handleAuthCancel = React.useCallback(() => {
    setIsNamespaceAuthModalVisible(false);
    setCurrentAuthHops([]);
    setSetupHops([]);
    setAuthPurpose('');
    setPendingFormData(null);
    namespaceAuthForm.resetFields();
    onAuthCancel();
  }, [namespaceAuthForm, onAuthCancel]);

  // Render authentication fields for hops
  const renderAuthFields = React.useCallback((hops: Hop[]) => {
    return (
      <>
        <Divider orientation='left' plain>
          <CloudServerOutlined /> 서버 접속 정보 (SSH)
        </Divider>
        {hops.map((hop, index) => (
          <div
            key={index}
            style={{
              marginBottom: '16px',
              padding: '12px',
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
            }}
          >
            <p
              style={{
                fontWeight: 500,
                margin: '-12px -12px 12px -12px',
                padding: '8px 12px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              {`Hop ${index + 1}: ${hop.host}:${hop.port}`}
              {index === hops.length - 1 && ' (최종 목적지)'}
            </p>
            <Form.Item
              name={`ssh_username_${index}`}
              label='사용자 이름'
              rules={[
                { required: true, message: 'SSH 사용자 이름을 입력해주세요' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder='사용자 이름'
                autoComplete='username'
              />
            </Form.Item>
            <Form.Item
              name={`ssh_password_${index}`}
              label='비밀번호'
              rules={[
                { required: true, message: 'SSH 비밀번호를 입력해주세요' },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder='비밀번호'
                autoComplete='current-password'
              />
            </Form.Item>
          </div>
        ))}
      </>
    );
  }, []);

  // Get authentication modal title based on purpose
  const getAuthModalTitle = React.useCallback(() => {
    switch (authPurpose) {
      case 'namespace':
        return '네임스페이스 조회 인증';
      case 'setup':
        return '백업 환경 구축 인증';
      case 'backup':
        return '백업 생성 인증';
      case 'restore':
        return '백업 복구 인증';
      case 'delete':
        return '백업 삭제 인증';
      default:
        return '서버 인증';
    }
  }, [authPurpose]);

  // Get authentication modal description based on purpose
  const getAuthModalDescription = React.useCallback(() => {
    switch (authPurpose) {
      case 'namespace':
        return '네임스페이스 목록을 조회하기 위해 쿠버네티스 클러스터에 접속 정보가 필요합니다.';
      case 'setup':
        return '백업 환경을 구축하기 위해 쿠버네티스 클러스터에 접속 정보가 필요합니다.';
      case 'backup':
        return '백업을 생성하기 위해 쿠버네티스 클러스터에 접속 정보가 필요합니다.';
      case 'restore':
        return '백업을 복구하기 위해 쿠버네티스 클러스터에 접속 정보가 필요합니다.';
      case 'delete':
        return '백업을 삭제하기 위해 쿠버네티스 클러스터에 접속 정보가 필요합니다.';
      default:
        return '작업을 수행하기 위해 서버 접속 정보가 필요합니다.';
    }
  }, [authPurpose]);

  // Authentication Modal Component
  const AuthModal: React.FC = React.useCallback(() => {
    const hops = authPurpose === 'setup' ? setupHops : currentAuthHops;

    return (
      <Modal
        title={getAuthModalTitle()}
        open={isNamespaceAuthModalVisible}
        onOk={handleAuthSubmit}
        onCancel={handleAuthCancel}
        width={600}
        okText='확인'
        cancelText='취소'
        className='backup-auth-modal'
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {getAuthModalDescription()}
          </p>
        </div>

        <Form form={namespaceAuthForm} layout='vertical' autoComplete='off'>
          {renderAuthFields(hops)}
        </Form>
      </Modal>
    );
  }, [
    authPurpose,
    setupHops,
    currentAuthHops,
    isNamespaceAuthModalVisible,
    getAuthModalTitle,
    getAuthModalDescription,
    handleAuthSubmit,
    handleAuthCancel,
    namespaceAuthForm,
    renderAuthFields,
  ]);

  return {
    // State
    isNamespaceAuthModalVisible,
    currentAuthHops,
    setupHops,
    authPurpose,

    // Actions
    requestNamespaceAuth,
    requestSetupAuth,
    handleAuthSubmit,
    handleAuthCancel,

    // Utilities
    formatAuthData,
    renderAuthFields,

    // Components
    AuthModal,
  };
};

export default useBackupAuthHandler;
