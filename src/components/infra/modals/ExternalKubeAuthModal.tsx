import React, { useEffect } from 'react';
import { Modal, Form, Input, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

interface ExternalKubeAuthModalProps {
  visible: boolean;
  onClose?: () => void;
  onCancel?: () => void; // 호환성: onCancel을 허용
  onConfirm: (username: string, password: string) => void;
  loading: boolean;
  server: { ip: string; port: string };
}

const ExternalKubeAuthModal: React.FC<ExternalKubeAuthModalProps> = ({
  visible,
  onClose,
  onCancel,
  onConfirm,
  loading,
  server,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      onConfirm(values.username, values.password);
    } catch {
      // Form validation failed - user will see validation errors in UI
    }
  };

  return (
    <Modal
      title='외부 쿠버네티스 인증'
      open={visible}
      onCancel={onClose || onCancel}
      confirmLoading={loading}
      onOk={handleSubmit}
      okText='연결'
      cancelText='취소'
    >
      <Typography.Paragraph>
        외부 쿠버네티스 클러스터({server.ip})에 접속하기 위한 인증 정보를
        입력해주세요.
      </Typography.Paragraph>

      <Form form={form} layout='vertical'>
        <Form.Item
          name='username'
          label='사용자 이름'
          rules={[{ required: true, message: '사용자 이름을 입력해주세요' }]}
        >
          <Input prefix={<UserOutlined />} placeholder='예: root' />
        </Form.Item>

        <Form.Item
          name='password'
          label='비밀번호'
          rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder='서버 접속 비밀번호'
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExternalKubeAuthModal;
