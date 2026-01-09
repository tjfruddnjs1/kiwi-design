import React from 'react';
import { Modal, Form, Input, Select, Alert, Space, Button } from 'antd';

export type SastFormValues = {
  git_url: string;
  auth_type: 'token';
  access_token: string;
  config: string;
};

interface SastCredentialsModalProps {
  open: boolean;
  gitUrl: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: SastFormValues) => void;
  primaryButtonText?: string;
  initialAccessToken?: string;
}

const SastCredentialsModal: React.FC<SastCredentialsModalProps> = ({
  open,
  gitUrl,
  loading,
  onCancel,
  onSubmit,
  primaryButtonText = '확인',
  initialAccessToken,
}) => {
  const [form] = Form.useForm<SastFormValues>();

  React.useEffect(() => {
    if (open) {
      form.setFieldsValue({
        git_url: gitUrl,
        auth_type: 'token',
        config: 'p/owasp-top-ten',
      });
      if (initialAccessToken) {
        form.setFieldValue('access_token', initialAccessToken);
      }
    }
  }, [open, gitUrl, initialAccessToken, form]);

  return (
    <Modal
      open={open}
      title='SAST 설정'
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Alert
        type='info'
        showIcon
        message='액세스 토큰만 지원합니다'
        description='ID/비밀번호 방식은 허용되지 않습니다. 최소 권한의 Personal Access Token을 사용하세요(read_repository 권장).'
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout='vertical'
        onFinish={onSubmit}
        autoComplete='off'
      >
        <Form.Item label='Git URL' name='git_url' rules={[{ required: true }]}>
          <Input readOnly />
        </Form.Item>

        <Form.Item
          label='인증 방식'
          name='auth_type'
          rules={[{ required: true }]}
        >
          <Select disabled options={[{ label: 'Token', value: 'token' }]} />
        </Form.Item>

        <Form.Item
          label='액세스 토큰'
          name='access_token'
          rules={[
            { required: true, message: '액세스 토큰을 입력하세요' },
            { min: 10, message: '토큰 길이가 짧습니다' },
          ]}
        >
          <Input.Password placeholder='예) glpat-...' />
        </Form.Item>

        {/* 규칙/프로필은 OWASP Top 10으로 고정 */}
        <Form.Item name='config' style={{ display: 'none' }}>
          <Input value='p/owasp-top-ten' />
        </Form.Item>

        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>취소</Button>
          <Button type='primary' htmlType='submit' loading={loading}>
            {primaryButtonText}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default SastCredentialsModal;
