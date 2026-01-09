import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Alert,
  Select,
  Checkbox,
  Divider,
  Button,
} from 'antd';
import { Backup } from '../../types/backup';

// 타입 정의 추가
interface RestoreFormValues {
  username: string;
  password: string;
  selectedActualBackup: string;
  remapNamespace?: boolean;
  newNamespace?: string;
  [key: string]: string | boolean | undefined;
}

interface RestoreBackupModalProps {
  visible: boolean;
  selectedBackup: Backup | null;
  isRestoring: boolean;
  onCancel: () => void;
  onRestore: (values: RestoreFormValues) => void;
}

const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  visible,
  selectedBackup,
  isRestoring,
  onCancel,
  onRestore,
}) => {
  const [restoreForm] = Form.useForm();
  const [restoreToDifferentNamespace, setRestoreToDifferentNamespace] =
    useState(false);

  return (
    <Modal
      title={
        <div className='modal-title'>
          <span>백업 복구</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key='cancel' onClick={onCancel} size='large'>
          취소
        </Button>,
        <Button
          key='restore'
          type='primary'
          loading={isRestoring}
          onClick={() => restoreForm.validateFields().then(onRestore)}
          size='large'
        >
          복구 시작
        </Button>,
      ]}
      width={600}
      className='backup-modal'
    >
      <Form
        form={restoreForm}
        layout='vertical'
        initialValues={{ remapNamespace: false }}
      >
        <Alert
          message='복구할 백업 정책 정보'
          description={
            <div>
              <p>
                <strong>정책 이름:</strong> {selectedBackup?.name}
              </p>
              <p>
                <strong>원본 네임스페이스:</strong> {selectedBackup?.namespace}
              </p>
            </div>
          }
          type='info'
          showIcon
          style={{ marginBottom: 24 }}
        />

        <div className='auth-section'>
          <h4>서버 접속 정보</h4>
          <p className='help-text'>
            백업 버전 목록을 가져오고 복구를 실행하기 위해 필요합니다.
          </p>
          <Form.Item
            name='username'
            label='사용자 이름'
            rules={[{ required: true }]}
          >
            <Input placeholder='예: root' />
          </Form.Item>
          <Form.Item
            name='password'
            label='비밀번호'
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
        </div>
        <Divider />

        <div className='restore-options-section'>
          <h4>복구 옵션</h4>
          <Form.Item
            name='selectedActualBackup'
            label='복구할 백업 버전 선택'
            rules={[{ required: true, message: '복구할 버전을 선택해주세요.' }]}
          >
            <Select
              placeholder='서버 정보 입력 후, 여기를 클릭하여 버전 목록을 가져오세요'
              onDropdownVisibleChange={async open => {
                if (open && selectedBackup) {
                  try {
                    await restoreForm.validateFields(['username', 'password']);

                    // API 호출 로직은 부모 컴포넌트에서 처리
                    // 여기서는 placeholder만 표시
                  } catch {
                    // Form validation failed - ignore
                  }
                }
              }}
            >
              {/* 백업 버전 목록은 현재 비활성화 */}
            </Select>
          </Form.Item>

          <Form.Item name='remapNamespace' valuePropName='checked'>
            <Checkbox
              onChange={e => setRestoreToDifferentNamespace(e.target.checked)}
            >
              다른 네임스페이스에 복구
            </Checkbox>
          </Form.Item>

          {restoreToDifferentNamespace && (
            <Form.Item
              name='targetNamespace'
              label='새 네임스페이스 이름'
              rules={[
                {
                  required: true,
                  message: '복구할 새 네임스페이스 이름을 입력해주세요.',
                },
              ]}
            >
              <Input placeholder='예: my-restored-app' />
            </Form.Item>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default RestoreBackupModal;
