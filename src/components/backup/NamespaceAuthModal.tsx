import React from 'react';
import { Modal, Form, Input, Alert, Button } from 'antd';

interface NamespaceAuthModalProps {
  visible: boolean;
  isFetchingNamespaces: boolean;
  onCancel: () => void;
  onFetch: () => void;
}

const NamespaceAuthModal: React.FC<NamespaceAuthModalProps> = ({
  visible,
  isFetchingNamespaces,
  onCancel,
  onFetch,
}) => {
  const [namespaceAuthForm] = Form.useForm();

  return (
    <Modal
      title={
        <div className='modal-title'>
          <span>네임스페이스 가져오기</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='fetch'
          type='primary'
          loading={isFetchingNamespaces}
          onClick={() => {
            void namespaceAuthForm.validateFields().then(onFetch);
          }}
        >
          가져오기
        </Button>,
      ]}
      width={500}
      className='backup-modal'
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message='서버 접속 정보 필요'
          description='쿠버네티스 클러스터에서 네임스페이스 목록을 가져오기 위해 서버 접속 정보가 필요합니다.'
          type='info'
          showIcon
        />
      </div>
      <Form form={namespaceAuthForm} layout='vertical'>
        <Form.Item
          name='username'
          label='사용자 이름'
          rules={[{ required: true, message: '사용자 이름을 입력해주세요' }]}
        >
          <Input placeholder='예: root' />
        </Form.Item>
        <Form.Item
          name='password'
          label='비밀번호'
          rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NamespaceAuthModal;
