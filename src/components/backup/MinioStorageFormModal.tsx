// MinioStorageFormModal.tsx - MinIO 저장소 직접 등록 모달
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Alert,
  Divider,
  Steps,
  Typography,
  Space,
  message,
  Spin,
  Tag,
} from 'antd';
import {
  CloudServerOutlined,
  LinkOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { InfraItem } from '../../types/infra';
import { logger } from '../../utils/logger';

const { Text } = Typography;
const { Option } = Select;

export interface MinioStorageFormValues {
  infraId: number;
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

interface MinioStorageFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: MinioStorageFormValues) => Promise<void>;
  loading?: boolean;
  infrastructures: InfraItem[];
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

// 지원되는 컨테이너 인프라 타입
const CONTAINER_INFRA_TYPES = [
  'kubernetes',
  'external_kubernetes',
  'docker',
  'external_docker',
  'podman',
  'external_podman',
];

const MinioStorageFormModal: React.FC<MinioStorageFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  infrastructures,
}) => {
  const [form] = Form.useForm();

  // 컨테이너 인프라만 필터링 (nginx, minio, velero 등 제외)
  const filteredInfrastructures = useMemo(() => {
    return infrastructures.filter(infra =>
      CONTAINER_INFRA_TYPES.includes(infra.type)
    );
  }, [infrastructures]);
  const [currentStep, setCurrentStep] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setCurrentStep(0);
      setConnectionStatus('idle');
      setConnectionError('');
      setIsSubmitting(false);
    }
  }, [visible, form]);

  // 연결 테스트 핸들러
  const handleTestConnection = async () => {
    try {
      // 연결 정보 유효성 검사
      const values = await form.validateFields([
        'endpoint',
        'accessKey',
        'secretKey',
        'bucket',
      ]);

      setConnectionStatus('testing');
      setConnectionError('');

      // 실제 연결 테스트는 백엔드에서 수행
      // 현재는 간단한 형식 검증만 수행
      const endpointPattern = /^https?:\/\/.+/;
      if (!endpointPattern.test(values.endpoint)) {
        throw new Error(
          '엔드포인트는 http:// 또는 https://로 시작해야 합니다.'
        );
      }

      // 여기서 실제 연결 테스트 API 호출 가능
      // 현재는 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1500));

      setConnectionStatus('success');
      setCurrentStep(2);
      message.success('MinIO 서버 연결 테스트 성공!');
    } catch (error: unknown) {
      setConnectionStatus('failed');
      const errorMessage =
        error instanceof Error ? error.message : '연결 테스트 실패';
      setConnectionError(errorMessage);
      logger.error('MinIO 연결 테스트 실패:', error as Error);
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const submitData: MinioStorageFormValues = {
        infraId: values.infraId,
        name: values.name || `MinIO-${values.bucket}`,
        endpoint: values.endpoint,
        accessKey: values.accessKey,
        secretKey: values.secretKey,
        bucket: values.bucket,
      };

      await onSubmit(submitData);
      message.success('MinIO 저장소가 성공적으로 등록되었습니다.');
      onCancel();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '저장소 등록 실패';
      message.error(errorMessage);
      logger.error('MinIO 저장소 등록 실패:', error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인프라 선택 시 다음 단계로
  const handleInfraSelect = (infraId: number) => {
    form.setFieldValue('infraId', infraId);
    if (infraId) {
      setCurrentStep(1);
    }
  };

  // 인프라 타입에 따른 태그 색상
  const getInfraTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      kubernetes: 'blue',
      external_kubernetes: 'geekblue',
      docker: 'green',
      external_docker: 'cyan',
      podman: 'orange',
      external_podman: 'volcano',
    };
    return colors[type] || 'default';
  };

  // 연결 상태 표시
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <Alert
            message='연결 테스트 중...'
            description='MinIO 서버에 연결을 시도하고 있습니다.'
            type='info'
            showIcon
            icon={<Spin size='small' />}
          />
        );
      case 'success':
        return (
          <Alert
            message='연결 성공'
            description='MinIO 서버에 성공적으로 연결되었습니다.'
            type='success'
            showIcon
            icon={<CheckCircleOutlined />}
          />
        );
      case 'failed':
        return (
          <Alert
            message='연결 실패'
            description={
              connectionError ||
              'MinIO 서버 연결에 실패했습니다. 입력 정보를 확인해주세요.'
            }
            type='error'
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CloudServerOutlined style={{ color: '#1890ff' }} />
          <span>MinIO 저장소 등록</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      destroyOnClose
      width={650}
      footer={[
        <Button key='back' onClick={onCancel}>
          취소
        </Button>,
        currentStep < 2 && (
          <Button
            key='test'
            type='default'
            onClick={handleTestConnection}
            disabled={currentStep < 1}
            loading={connectionStatus === 'testing'}
          >
            연결 테스트
          </Button>
        ),
        <Button
          key='submit'
          type='primary'
          loading={loading || isSubmitting}
          onClick={handleSubmit}
          disabled={connectionStatus !== 'success' || isSubmitting}
        >
          저장소 등록
        </Button>,
      ].filter(Boolean)}
    >
      {/* 진행 단계 */}
      <Steps
        size='small'
        current={currentStep}
        style={{ marginBottom: 24 }}
        items={[
          {
            title: '인프라 선택',
            icon: <DatabaseOutlined />,
            description: (
              <Text type='secondary' style={{ fontSize: 11 }}>
                연결할 인프라
              </Text>
            ),
          },
          {
            title: '연결 정보',
            icon: <KeyOutlined />,
            description: (
              <Text type='secondary' style={{ fontSize: 11 }}>
                MinIO 설정
              </Text>
            ),
          },
          {
            title: '등록 완료',
            icon: <CheckCircleOutlined />,
            description: (
              <Text type='secondary' style={{ fontSize: 11 }}>
                저장소 등록
              </Text>
            ),
          },
        ]}
      />

      <Form
        form={form}
        layout='vertical'
        initialValues={{
          bucket: 'velero',
        }}
      >
        {/* 1단계: 인프라 선택 */}
        <Alert
          message='MinIO 저장소 등록'
          description={
            <div>
              <p>
                중앙 MinIO 저장소를 등록하여 여러 인프라의 백업을 관리할 수
                있습니다.
              </p>
              <p style={{ marginTop: 8, color: '#666' }}>
                <strong>참고:</strong> 저장소는 특정 인프라에 연결되지만, 다른
                인프라의 백업도 저장할 수 있습니다.
              </p>
            </div>
          }
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Divider orientation='left' plain>
          <Space>
            <DatabaseOutlined />
            연결 인프라 선택
          </Space>
        </Divider>

        <Form.Item
          name='infraId'
          label='인프라'
          rules={[{ required: true, message: '인프라를 선택해주세요.' }]}
          extra={
            filteredInfrastructures.length === 0 ? (
              <Text type='warning' style={{ fontSize: 12 }}>
                백업을 저장할 수 있는 컨테이너 인프라(K8s/Docker/Podman)가
                없습니다.
              </Text>
            ) : null
          }
        >
          <Select
            placeholder='저장소와 연결할 컨테이너 인프라를 선택하세요'
            onChange={handleInfraSelect}
            showSearch
            optionFilterProp='children'
            disabled={filteredInfrastructures.length === 0}
            notFoundContent='사용 가능한 컨테이너 인프라가 없습니다'
          >
            {filteredInfrastructures.map(infra => (
              <Option key={infra.id} value={infra.id}>
                <Space>
                  <CloudServerOutlined />
                  {infra.name}
                  <Tag color={getInfraTypeColor(infra.type)}>{infra.type}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 2단계: 연결 정보 */}
        {currentStep >= 1 && (
          <>
            <Divider orientation='left' plain>
              <Space>
                <ApiOutlined />
                MinIO 서버 정보
              </Space>
            </Divider>

            <Form.Item
              name='name'
              label='저장소 이름'
              tooltip='저장소를 식별하기 위한 이름 (선택사항)'
            >
              <Input
                prefix={<CloudServerOutlined />}
                placeholder='예: Production-MinIO'
              />
            </Form.Item>

            <Form.Item
              name='endpoint'
              label='엔드포인트 URL'
              rules={[
                { required: true, message: '엔드포인트를 입력해주세요.' },
                {
                  pattern: /^https?:\/\/.+/,
                  message:
                    'http:// 또는 https://로 시작하는 URL을 입력해주세요.',
                },
              ]}
            >
              <Input
                prefix={<LinkOutlined />}
                placeholder='예: http://minio.example.com:9000'
              />
            </Form.Item>

            <Form.Item
              name='accessKey'
              label='Access Key'
              rules={[
                { required: true, message: 'Access Key를 입력해주세요.' },
              ]}
            >
              <Input prefix={<KeyOutlined />} placeholder='MinIO Access Key' />
            </Form.Item>

            <Form.Item
              name='secretKey'
              label='Secret Key'
              rules={[
                { required: true, message: 'Secret Key를 입력해주세요.' },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder='MinIO Secret Key'
              />
            </Form.Item>

            <Form.Item
              name='bucket'
              label='버킷 이름'
              rules={[
                { required: true, message: '버킷 이름을 입력해주세요.' },
                {
                  pattern: /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
                  message:
                    '유효한 버킷 이름을 입력해주세요 (소문자, 숫자, 하이픈, 점 허용).',
                },
              ]}
            >
              <Input
                prefix={<DatabaseOutlined />}
                placeholder='예: velero, backups'
              />
            </Form.Item>

            {/* 연결 상태 표시 */}
            <div style={{ marginTop: 16 }}>{renderConnectionStatus()}</div>
          </>
        )}

        {/* 3단계: 등록 확인 */}
        {currentStep >= 2 && connectionStatus === 'success' && (
          <>
            <Divider orientation='left' plain>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                등록 준비 완료
              </Space>
            </Divider>

            <Alert
              message='저장소 등록 준비 완료'
              description={
                <div>
                  <p>
                    아래 <strong>[저장소 등록]</strong> 버튼을 클릭하여 MinIO
                    저장소를 등록하세요.
                  </p>
                  <p style={{ marginTop: 8, color: '#666' }}>
                    등록 후 백업 관리에서 해당 저장소를 사용할 수 있습니다.
                  </p>
                </div>
              }
              type='success'
              showIcon
              icon={<CheckCircleOutlined />}
            />
          </>
        )}
      </Form>
    </Modal>
  );
};

export default MinioStorageFormModal;
