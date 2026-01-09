import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Alert,
  message,
  Typography,
} from 'antd';
import {
  CloudUploadOutlined,
  InfoCircleOutlined,
  UserOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CreateBackupParams } from '../../types/backup';
import { logger } from '../../utils/logger';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface BackupOperationModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  selectedInfraId: string | undefined;
  namespaces: string[];
  isFetchingNamespaces: boolean;
  onFetchNamespaces: (values: {
    infra_id: number;
    server_username: string;
    server_password: string;
  }) => Promise<void>;
}

const BackupOperationModal: React.FC<BackupOperationModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  selectedInfraId,
  namespaces,
  isFetchingNamespaces,
  onFetchNamespaces,
}) => {
  const [form] = Form.useForm();
  const [isCreating, setIsCreating] = useState(false);
  const [scheduleType, setScheduleType] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  // authHops 상태는 사용되지 않아 제거

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setScheduleType('daily');
    }
  }, [visible, form]);

  const handleFetchNamespaces = async () => {
    if (!selectedInfraId) {
      message.error('인프라를 먼저 선택해주세요.');

      return;
    }

    try {
      const values = await form.validateFields([
        'server_username',
        'server_password',
      ]);

      await onFetchNamespaces({
        infra_id: Number(selectedInfraId),
        server_username: values.server_username,
        server_password: values.server_password,
      });
      message.success('네임스페이스 목록을 가져왔습니다.');
    } catch (error) {
      logger.error('네임스페이스 조회 실패:', error as Error);
    }
  };

  const handleCreateBackup = async () => {
    if (!selectedInfraId) {
      message.error('인프라를 먼저 선택해주세요.');

      return;
    }

    try {
      const values = await form.validateFields();

      setIsCreating(true);

      const backupParams: CreateBackupParams = {
        infra_id: Number(selectedInfraId),
        name: values.backup_name,
        namespace: values.namespace,
        server_username: values.server_username,
        server_password: values.server_password,
      };

      logger.info('백업 생성 요청:', { backupParams });
      const response = await api.backup.createBackup(backupParams);

      if (response.data.success) {
        message.success('백업 생성이 시작되었습니다.');
        form.resetFields();
        onSuccess();
      } else {
        throw new Error(response.data.error || '백업 생성에 실패했습니다.');
      }
    } catch (error) {
      logger.error('백업 생성 오류:', error as Error);
      message.error(`백업 생성 실패: ${(error as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const scheduleOptions = [
    { value: 'daily', label: '매일' },
    { value: 'weekly', label: '매주' },
    { value: 'monthly', label: '매월' },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudUploadOutlined />
          <span>백업 생성</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='create'
          type='primary'
          onClick={handleCreateBackup}
          loading={isCreating}
        >
          백업 생성
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          schedule_enabled: false,
          schedule_type: 'daily',
        }}
      >
        <Alert
          message='백업 생성 안내'
          description='백업 생성을 위해서는 클러스터 접근 권한이 필요합니다. 서버 인증 정보를 입력해주세요.'
          type='info'
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label='백업 이름'
          name='backup_name'
          rules={[
            { required: true, message: '백업 이름을 입력해주세요.' },
            {
              pattern: /^[a-zA-Z0-9-]+$/,
              message: '영문, 숫자, 하이픈(-)만 사용 가능합니다.',
            },
          ]}
        >
          <Input placeholder='예: web-app-backup-20240101' />
        </Form.Item>

        <Form.Item
          label='네임스페이스'
          name='namespace'
          rules={[{ required: true, message: '네임스페이스를 선택해주세요.' }]}
        >
          <Select
            placeholder='네임스페이스를 선택하세요'
            loading={isFetchingNamespaces}
            notFoundContent={
              namespaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Text type='secondary'>
                    네임스페이스 목록을 가져오려면
                    <br />
                    서버 인증 정보를 입력하고 &apos;네임스페이스 가져오기&apos;
                    버튼을 클릭하세요.
                  </Text>
                </div>
              ) : (
                '데이터 없음'
              )
            }
          >
            {namespaces.map(ns => (
              <Option key={ns} value={ns}>
                {ns}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label='서버 접속 정보'>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name='server_username'
              rules={[{ required: true, message: '사용자명을 입력해주세요.' }]}
              style={{ width: '50%', marginBottom: 0 }}
            >
              <Input prefix={<UserOutlined />} placeholder='사용자명' />
            </Form.Item>
            <Form.Item
              name='server_password'
              rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
              style={{ width: '50%', marginBottom: 0 }}
            >
              <Input.Password prefix={<KeyOutlined />} placeholder='비밀번호' />
            </Form.Item>
          </Space.Compact>
          <Button
            style={{ marginTop: 8 }}
            onClick={handleFetchNamespaces}
            loading={isFetchingNamespaces}
            block
          >
            네임스페이스 가져오기
          </Button>
        </Form.Item>

        <Form.Item label='백업 설명' name='description'>
          <TextArea
            rows={3}
            placeholder='백업에 대한 설명을 입력하세요 (선택사항)'
          />
        </Form.Item>

        <Form.Item
          label='스케줄링'
          name='schedule_enabled'
          valuePropName='checked'
        >
          <Switch
            checkedChildren='활성화'
            unCheckedChildren='비활성화'
            onChange={checked => {
              if (!checked) {
                form.setFieldsValue({ schedule_time: undefined });
              }
            }}
          />
        </Form.Item>

        <Form.Item noStyle dependencies={['schedule_enabled']}>
          {({ getFieldValue }) => {
            return getFieldValue('schedule_enabled') ? (
              <>
                <Form.Item
                  label='스케줄 타입'
                  name='schedule_type'
                  rules={[
                    { required: true, message: '스케줄 타입을 선택해주세요.' },
                  ]}
                >
                  <Select onChange={setScheduleType}>
                    {scheduleOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label='스케줄 시간'
                  name='schedule_time'
                  rules={[
                    { required: true, message: '스케줄 시간을 입력해주세요.' },
                  ]}
                >
                  <Input
                    placeholder={
                      scheduleType === 'daily'
                        ? '예: 02:00'
                        : scheduleType === 'weekly'
                          ? '예: SUN 02:00'
                          : '예: 1 02:00'
                    }
                  />
                </Form.Item>
              </>
            ) : null;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BackupOperationModal;
