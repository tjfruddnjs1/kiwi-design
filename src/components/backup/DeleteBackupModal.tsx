import React from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import { Backup } from '../../types/backup';

interface DeleteBackupModalProps {
  visible: boolean;
  selectedBackup: Backup | null;
  isDeleting: boolean;
  loading?: boolean;
  backup?: Backup;
  onCancel: () => void;
  onOk?: () => void;
  onConfirm?: (formData: unknown) => Promise<void>;
}

const DeleteBackupModal: React.FC<DeleteBackupModalProps> = ({
  visible,
  selectedBackup,
  isDeleting,
  onCancel,
}) => {
  const [deleteForm] = Form.useForm();

  return (
    <Modal
      title='백업 삭제'
      open={visible}
      onCancel={onCancel}
      onOk={() => deleteForm.submit()}
      confirmLoading={isDeleting}
      width={500}
      className='backup-modal'
      okText='삭제'
      okButtonProps={{ danger: true }}
      cancelText='취소'
    >
      <div className='delete-backup-content'>
        <Alert
          message='백업 삭제 확인'
          description={
            <div>
              <div>다음 백업을 삭제하시겠습니까?</div>
              <div style={{ marginTop: 8 }}>
                백업 이름: <b>{selectedBackup?.name}</b>
              </div>
              <div>
                네임스페이스: <b>{selectedBackup?.namespace}</b>
              </div>
              <div style={{ marginTop: 8, color: '#d46b08' }}>
                이 작업은 되돌릴 수 없습니다.
              </div>
            </div>
          }
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={deleteForm} layout='vertical'>
          <Form.Item
            name='username'
            label='서버 접속 계정'
            rules={[
              { required: true, message: '서버 접속 계정을 입력해주세요' },
            ]}
          >
            <Input placeholder='예: root' />
          </Form.Item>
          <Form.Item
            name='password'
            label='서버 접속 비밀번호'
            rules={[
              {
                required: true,
                message: '서버 접속 비밀번호를 입력해주세요',
              },
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default DeleteBackupModal;
