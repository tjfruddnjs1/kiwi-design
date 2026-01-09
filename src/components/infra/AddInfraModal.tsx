import React from 'react';
import { Modal, Form, Input, Select, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { logger } from '../../utils/logger';

const { Option } = Select;
const { TextArea } = Input;

interface AddInfraModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    type: string;
    info?: string;
    backupTargetInfra?: string;
    backupStorageLocation?: string;
    backupStorageServer?: number;
    backupMode?: 'new' | 'existing';
    existingBackupStorageId?: number;
  }) => Promise<boolean>;
  loading?: boolean;
}

const AddInfraModal: React.FC<AddInfraModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();

  //  모든 인프라 타입
  const getAllInfraTypes = () => {
    return [{ value: 'kubernetes' }, { value: 'docker' }, { value: 'podman' }];
  };

  const handleSubmit = async () => {
    try {
      const values = (await form.validateFields()) as {
        name: string;
        type: string;
        info?: string;
      };

      // 폼 데이터를 콘솔에 출력

      const success = await onSubmit(values);

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
          <PlusOutlined />
          <span>환경 추가</span>
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
          추가
        </Button>,
      ]}
      width={600}
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          type: 'kubernetes',
          minioMode: 'new',
        }}
      >
        <Form.Item
          name='name'
          label='환경 이름'
          rules={[
            { required: true, message: '환경 이름을 입력해주세요' },
            { min: 2, message: '환경 이름은 최소 2글자 이상이어야 합니다' },
            { max: 50, message: '환경 이름은 최대 50글자까지 가능합니다' },
          ]}
        >
          <Input placeholder='예: Production Kubernetes Cluster' />
        </Form.Item>

        <Form.Item
          name='type'
          label='환경 유형'
          rules={[{ required: true, message: '환경 유형을 선택해주세요' }]}
        >
          <Select placeholder='환경 유형을 선택하세요'>
            {getAllInfraTypes().map(type => {
              return (
                <Option key={type.value} value={type.value}>
                  {type.value}
                </Option>
              );
            })}
          </Select>
        </Form.Item>

        <Form.Item
          name='info'
          label='환경 정보'
          extra='환경에 대한 상세 설명을 입력해주세요. (설치 정보, 접속 방법, 용도 등)'
        >
          <TextArea
            rows={4}
            placeholder='예: 운영 환경용 Kubernetes 클러스터&#10;- 마스터 노드: 3개&#10;- 워커 노드: 5개&#10;- 버전: v1.24.0&#10;- 네트워크: Flannel CNI'
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddInfraModal;
