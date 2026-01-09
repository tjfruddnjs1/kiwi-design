import React from 'react';
import { Modal, Form, Input, message } from 'antd';
import { AuthHops } from '../../../lib/api';
import { Node, OperationRequest } from './NodeOperationsManager';
import MultiHopAuthModal from '../../common/MultiHopAuthModal';
import { Hop } from '../../../types/infra';

interface ServerCredential {
  node: Node;
  username: string;
  password: string;
}

interface InfraAuthHandlerProps {
  onAuthSuccess: (authHops: AuthHops[], request: OperationRequest) => void;
  onAuthCancel: () => void;
}

export const useInfraAuthHandler = ({
  onAuthSuccess,
  onAuthCancel,
}: InfraAuthHandlerProps) => {
  const [authRequest, setAuthRequest] = React.useState<OperationRequest | null>(
    null
  );
  const [haCredentials, setHaCredentials] = React.useState<{
    username: string;
    password: string;
  } | null>(null);
  const [serverCredentials, setServerCredentials] = React.useState<
    ServerCredential[]
  >([]);
  const [isHACredentialsModalVisible, setIsHACredentialsModalVisible] =
    React.useState(false);
  const [haAuthHops, setHaAuthHops] = React.useState<AuthHops[] | null>(null);
  const [messageApi] = message.useMessage();

  const requestNodeAuth = (request: OperationRequest) => {
    setAuthRequest(request);
  };

  const handleAuthConfirm = (authHops: AuthHops[]) => {
    if (authRequest) {
      // Store credentials if this is a successful auth
      if (authHops && authHops.length > 0) {
        const lastHop = authHops[authHops.length - 1];

        setServerCredentials(prev => {
          const existingIndex = prev.findIndex(
            cred => cred.node.id === authRequest.node.id
          );

          if (existingIndex >= 0) {
            const updated = [...prev];

            updated[existingIndex] = {
              node: authRequest.node,
              username: lastHop.username || '',
              password: lastHop.password || '',
            };

            return updated;
          } else {
            return [
              ...prev,
              {
                node: authRequest.node,
                username: lastHop.username || '',
                password: lastHop.password || '',
              },
            ];
          }
        });
      }

      onAuthSuccess(authHops, authRequest);
      setAuthRequest(null);
    }
  };

  const handleAuthCancel = () => {
    setAuthRequest(null);
    onAuthCancel();
  };

  const showHACredentialsModal = () => {
    setIsHACredentialsModalVisible(true);
  };

  const handleHACredentialsSubmit = (values: {
    username: string;
    password: string;
  }) => {
    setHaCredentials(values);
    setIsHACredentialsModalVisible(false);

    // Create auth hops for HA
    const haHops: AuthHops[] = [
      {
        host: 'ha-server', // This should be configured properly
        port: 22,
        username: values.username,
        password: values.password,
      },
    ];

    setHaAuthHops(haHops);
    messageApi.success('HA 인증 정보가 설정되었습니다.');
  };

  const getStoredCredentials = (node: Node): ServerCredential | null => {
    return serverCredentials.find(cred => cred.node.id === node.id) || null;
  };

  const hasStoredCredentials = (node: Node): boolean => {
    return getStoredCredentials(node) !== null;
  };

  const createAuthHopsFromCredentials = (node: Node): AuthHops[] | null => {
    const credentials = getStoredCredentials(node);

    if (!credentials) return null;

    try {
      const parsedHops = JSON.parse(node.hops);

      return parsedHops.map((hop: Hop) => ({
        ...hop,
        username: credentials.username,
        password: credentials.password,
      }));
    } catch {
      // JSON parsing failed - fallback to simple hop format
      return [
        {
          host: node.ip,
          port: parseInt(node.port),
          username: credentials.username,
          password: credentials.password,
        },
      ];
    }
  };

  const clearStoredCredentials = (node: Node) => {
    setServerCredentials(prev => prev.filter(cred => cred.node.id !== node.id));
  };

  const clearAllCredentials = () => {
    setServerCredentials([]);
    setHaCredentials(null);
    setHaAuthHops(null);
  };

  const HACredentialsModal: React.FC<{
    visible: boolean;
    onSubmit: (values: { username: string; password: string }) => void;
    onCancel: () => void;
  }> = ({ visible, onSubmit, onCancel }) => {
    const [form] = Form.useForm();

    const handleSubmit = () => {
      form
        .validateFields()
        .then(values => {
          onSubmit(values);
          form.resetFields();
        })
        .catch(console.error);
    };

    return (
      <Modal
        title='HA 노드 인증 정보 입력'
        open={visible}
        onOk={handleSubmit}
        onCancel={() => {
          form.resetFields();
          onCancel();
        }}
        okText='확인'
        cancelText='취소'
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='username'
            label='사용자명'
            rules={[{ required: true, message: '사용자명을 입력하세요' }]}
          >
            <Input placeholder='사용자명을 입력하세요' />
          </Form.Item>
          <Form.Item
            name='password'
            label='비밀번호'
            rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
          >
            <Input.Password placeholder='비밀번호를 입력하세요' />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  const AuthModalComponent: React.FC = () => {
    if (!authRequest) return null;

    return (
      <MultiHopAuthModal
        visible={!!authRequest}
        targetServer={
          authRequest
            ? {
                name: authRequest.node.server_name || authRequest.node.ip,
                hops:
                  typeof authRequest.node.hops === 'string'
                    ? JSON.parse(authRequest.node.hops || '[]')
                    : authRequest.node.hops || [],
              }
            : null
        }
        onCancel={handleAuthCancel}
        onConfirm={handleAuthConfirm}
        loading={false}
      />
    );
  };

  const HACredentialsModalComponent: React.FC = () => {
    return (
      <HACredentialsModal
        visible={isHACredentialsModalVisible}
        onSubmit={handleHACredentialsSubmit}
        onCancel={() => setIsHACredentialsModalVisible(false)}
      />
    );
  };

  return {
    // State
    authRequest,
    haCredentials,
    serverCredentials,
    haAuthHops,

    // Actions
    requestNodeAuth,
    showHACredentialsModal,
    clearStoredCredentials,
    clearAllCredentials,

    // Utilities
    hasStoredCredentials,
    getStoredCredentials,
    createAuthHopsFromCredentials,

    // Components
    AuthModalComponent,
    HACredentialsModalComponent,
  };
};

export default useInfraAuthHandler;
