import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

interface RegisterServerModalProps {
  visible: boolean;
  onClose: () => void;
  onRegister: (values: {
    name: string;
    hops: { host: string; port: number }[];
  }) => void;
  loading: boolean;
}

const RegisterServerModal: React.FC<RegisterServerModalProps> = ({
  visible,
  onClose,
  onRegister,
  loading,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ hops: [{ host: '', port: 22 }] });
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      onRegister(values);
    } catch {
      // Form validation failed - handled by antd
    }
  };

  return (
    <Modal
      title='도커 서버 등록'
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key='cancel' onClick={onClose}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          loading={loading}
          onClick={handleSubmit}
        >
          등록
        </Button>,
      ]}
      width={600}
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          name='name'
          label='서버 이름'
          rules={[{ required: true, message: '서버 이름을 입력해주세요' }]}
        >
          <Input placeholder='예: docker-server-1' />
        </Form.Item>

        <Form.Item label='연결 정보'>
          <Form.List name='hops'>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: 'flex', marginBottom: 8 }}
                    align='baseline'
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'host']}
                      rules={[
                        { required: true, message: '호스트를 입력해주세요' },
                      ]}
                    >
                      <Input placeholder='호스트 주소' style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'port']}
                      rules={[
                        { required: true, message: '포트를 입력해주세요' },
                      ]}
                    >
                      <Input placeholder='포트' style={{ width: 100 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type='dashed'
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    홉 추가
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RegisterServerModal;
