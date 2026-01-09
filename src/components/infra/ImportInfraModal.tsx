import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Divider,
  Typography,
  Alert,
} from 'antd';
import {
  GlobalOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { logger } from '../../utils/logger';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface ImportInfraModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    name: string;
    type: string;
    info: string;
    hops: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>;
  }) => Promise<boolean>;
  loading?: boolean;
}

const ImportInfraModal: React.FC<ImportInfraModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate hop configuration
      const hopErrors = validateHopConfig(values.hops || []);

      if (hopErrors.length > 0) {
        // You might want to show these errors in a more user-friendly way
        logger.error(
          'Hop validation errors',
          new Error('Hop validation failed'),
          { hopErrors }
        );

        return;
      }

      // Build hop configuration
      const hops = buildHopConfig(values.hops || []);

      const importData = {
        name: values.name,
        type: values.type,
        info: values.info,
        hops,
      };

      const success = await onSubmit(importData);

      if (success) {
        form.resetFields();
        onCancel();
      }
    } catch (error) {
      logger.error('Form validation failed', error as Error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlobalOutlined />
          <span>외부 환경 가져오기</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key='cancel' onClick={handleCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          loading={loading}
          onClick={handleSubmit}
        >
          가져오기
        </Button>,
      ]}
      width={1200}
    >
      <Form
        form={form}
        layout='horizontal'
        initialValues={{
          type: 'external_kubernetes',
          hops: [{ host: '', port: 22, username: '', password: '' }],
        }}
      >
        <Form.Item
          name='name'
          label='외부 환경 이름'
          rules={[
            { required: true, message: '환경 이름을 입력해주세요' },
            { min: 2, message: '환경 이름은 최소 2글자 이상이어야 합니다' },
          ]}
        >
          <Input placeholder='예: External Production Cluster' />
        </Form.Item>

        <Form.Item
          name='type'
          label='외부 환경 유형'
          rules={[{ required: true, message: '환경 유형을 선택해주세요' }]}
        >
          <Select placeholder='외부 환경 유형을 선택하세요'>
            <Option value='external_kubernetes'>
              {getInfraTypeDisplayName('external_kubernetes')}
            </Option>
            <Option value='external_docker'>
              {getInfraTypeDisplayName('external_docker')}
            </Option>
            <Option value='external_podman'>
              {getInfraTypeDisplayName('external_podman')}
            </Option>
          </Select>
        </Form.Item>

        <Form.Item
          name='info'
          label='&nbsp;&nbsp;&nbsp;외부 환경 정보'
          extra='외부 환경에 대한 상세 설명을 입력해주세요. (접속 정보, 용도, 주의사항 등)'
        >
          <TextArea
            rows={4}
            placeholder='예: 외부 Kubernetes 클러스터&#10;- 접속 방법: SSH 터널링&#10;- 용도: 개발 환경&#10;- 주의사항: 관리자 승인 필요'
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Divider orientation='left'>
          <Space>
            <InfoCircleOutlined />
            <Text strong>연결 설정</Text>
          </Space>
        </Divider>

        <Alert
          message='연결 정보'
          description='외부 환경에 접속하기 위한 연결 정보를 입력해주세요. 여러 단계의 SSH 터널링이 필요한 경우 각 단계를 순서대로 추가하세요.'
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.List name='hops'>
          {(fields, { add, remove }) => (
            <>
              <Divider orientation='left' plain>
                접속 정보
              </Divider>

              <Form.Item>
                <Button
                  type='dashed'
                  onClick={() =>
                    add({ host: '', port: 22, username: '', password: '' }, 0)
                  }
                  block
                  icon={<PlusOutlined />}
                >
                  Hop 추가
                </Button>
              </Form.Item>

              {fields.map(({ key, name, ...restField }, idx) => (
                <div key={key}>
                  <Space align='baseline' style={{ display: 'flex' }}>
                    <div style={{ width: 50 }}>
                      <Text>
                        {idx === fields.length - 1 ? `타겟` : `Hop ${name + 1}`}
                      </Text>
                    </div>

                    <Form.Item
                      {...restField}
                      name={[name, 'host']}
                      label='호스트'
                      rules={[
                        { required: true, message: '호스트를 입력해주세요' },
                      ]}
                      style={{ flex: 1, width: 300 }}
                    >
                      <Input placeholder='예: 192.168.1.100 또는 server.example.com' />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'port']}
                      label='포트'
                      rules={[
                        { required: true, message: '포트를 입력해주세요' },
                      ]}
                      style={{ width: 140 }}
                    >
                      <Input
                        type='number'
                        placeholder='22'
                        min={1}
                        max={65535}
                      />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'username']}
                      label='사용자명'
                      rules={[
                        { required: true, message: '사용자명을 입력해주세요' },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <Input placeholder='SSH 사용자명' />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'password']}
                      label='비밀번호'
                      rules={[
                        { required: true, message: '비밀번호를 입력해주세요' },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <Input.Password placeholder='SSH 비밀번호' />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        size='small'
                      >
                        제거
                      </Button>
                    )}
                  </Space>
                </div>
              ))}
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

// Helper functions
const getInfraTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'external_kubernetes':
      return '외부 Kubernetes';
    case 'external_docker':
      return '외부 Docker';
    case 'external_podman':
      return '외부 Podman';
    default:
      return type;
  }
};

interface HopConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key?: string;
}

const validateHopConfig = (hops: HopConfig[]): string[] => {
  const errors: string[] = [];

  hops.forEach((hop, index) => {
    if (!hop.host) {
      errors.push(`Hop ${index + 1}: 호스트가 필요합니다`);
    }
    if (!hop.port || hop.port < 1 || hop.port > 65535) {
      errors.push(`Hop ${index + 1}: 유효한 포트 번호가 필요합니다`);
    }
    if (!hop.username) {
      errors.push(`Hop ${index + 1}: 사용자명이 필요합니다`);
    }
    if (!hop.password) {
      errors.push(`Hop ${index + 1}: 비밀번호가 필요합니다`);
    }
  });

  return errors;
};

const buildHopConfig = (hops: HopConfig[]) => {
  return hops.map(hop => ({
    host: hop.host,
    port: Number(hop.port),
    username: hop.username,
    password: hop.password || '',
  }));
};

export default ImportInfraModal;
