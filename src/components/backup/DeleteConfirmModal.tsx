import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Alert, Space, Typography } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Backup } from '../../types/backup';
import { logger } from '../../utils/logger';
import './DeleteConfirmModal.css';

const { Text } = Typography;

interface DeleteConfirmModalProps {
  visible: boolean;
  backup: Backup | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  backup,
  onCancel,
  onConfirm,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  // 삭제 확인 처리
  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await form.validateFields();

      // 확인 텍스트 검증
      if (form.getFieldValue('confirmationText') !== backup?.name) {
        form.setFields([
          {
            name: 'confirmationText',
            errors: ['백업 이름을 정확히 입력해주세요'],
          },
        ]);

        return;
      }

      await onConfirm();
    } catch (error) {
      logger.error('삭제 실패', error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!backup) return null;

  return (
    <Modal
      title={
        <Space>
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
          백업 삭제 확인
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={isSubmitting}
      width={500}
      okText='삭제'
      cancelText='취소'
      okButtonProps={{ danger: true }}
    >
      <div className='delete-confirm-modal'>
        <Alert
          message='삭제 주의사항'
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>이 작업은 되돌릴 수 없습니다.</li>
              <li>백업과 관련된 모든 데이터가 영구적으로 삭제됩니다.</li>
              <li>복구 이력도 함께 삭제됩니다.</li>
              <li>실행 중인 복구 작업이 있다면 중단됩니다.</li>
            </ul>
          }
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div className='backup-info'>
          <Text strong>삭제할 백업 정보:</Text>
          <div className='backup-details'>
            <div className='detail-item'>
              <Text type='secondary'>백업 이름:</Text>
              <Text strong>{backup.name}</Text>
            </div>
            <div className='detail-item'>
              <Text type='secondary'>네임스페이스:</Text>
              <Text strong>{backup.namespace}</Text>
            </div>
            <div className='detail-item'>
              <Text type='secondary'>스케줄:</Text>
              <Text strong>{backup.schedule}</Text>
            </div>
            <div className='detail-item'>
              <Text type='secondary'>상태:</Text>
              <Text strong>{backup.status}</Text>
            </div>
            <div className='detail-item'>
              <Text type='secondary'>생성일:</Text>
              <Text strong>{new Date(backup.created_at).toLocaleString()}</Text>
            </div>
          </div>
        </div>

        <Form form={form} layout='vertical'>
          <Form.Item
            name='confirmationText'
            label={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                확인을 위해 백업 이름을 입력하세요
              </Space>
            }
            rules={[
              { required: true, message: '백업 이름을 입력해주세요' },
              {
                validator: (_, value) => {
                  if (value !== backup.name) {
                    return Promise.reject(
                      new Error('백업 이름이 일치하지 않습니다')
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder={`백업 이름 "${backup.name}"을 입력하세요`}
              size='large'
            />
          </Form.Item>

          <Alert
            message='최종 확인'
            description='위의 백업 이름을 정확히 입력하면 삭제가 진행됩니다. 이 작업은 되돌릴 수 없습니다.'
            type='error'
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
