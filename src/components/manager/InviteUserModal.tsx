import React from 'react';
import { Modal, Button, Form, Input, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 사용자 초대 모달 Props
 */
interface InviteUserModalProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 핸들러 */
  onCancel: () => void;
  /** 초대 핸들러 */
  onInvite: (email: string) => Promise<boolean>;
}

/**
 * 사용자 초대 모달 컴포넌트
 * 이메일 입력을 통해 기관에 새 사용자를 초대합니다.
 */
export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  visible,
  onCancel,
  onInvite,
}) => {
  const [form] = Form.useForm();

  const handleFinish = async (values: { email: string }) => {
    const success = await onInvite(values.email);
    if (success) {
      form.resetFields();
      onCancel();
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title='사용자 초대'
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key='back' onClick={handleCancel}>
          취소
        </Button>,
        <Button key='submit' type='primary' onClick={() => form.submit()}>
          초대
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout='vertical' onFinish={handleFinish}>
        <Form.Item
          name='email'
          label='초대할 사용자 이메일'
          rules={[
            { required: true, message: '이메일을 입력하세요' },
            { type: 'email', message: '유효한 이메일 형식이 아닙니다.' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder='user@example.com' />
        </Form.Item>
        <Text type='secondary'>
          초대된 사용자는 해당 기관의 멤버 권한을 가지게 됩니다.
        </Text>
      </Form>
    </Modal>
  );
};
