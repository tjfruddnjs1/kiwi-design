// ExternalStorageFormModal.tsx - 외부 백업 저장소 등록 모달 (인프라 독립적)
import React, { useState, useEffect } from 'react';
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
  Switch,
  Collapse,
  InputNumber,
  Row,
  Col,
} from 'antd';
import {
  CloudServerOutlined,
  LinkOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SafetyOutlined,
  GlobalOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { logger } from '../../utils/logger';
import { backupApi } from '../../lib/api/endpoints/backup';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface ExternalStorageFormValues {
  name: string;
  description?: string;
  type: 'minio' | 's3' | 'nfs';
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  useSSL: boolean;
  // SSH 터널링 설정
  sshEnabled?: boolean;
  sshGatewayHost?: string;
  sshGatewayPort?: number;
  sshGatewayUser?: string;
  sshGatewayPassword?: string;
  sshTargetHost?: string;
  sshTargetPort?: number;
  sshTargetUser?: string;
  sshTargetPassword?: string;
}

interface ExternalStorageFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: ExternalStorageFormValues) => Promise<void>;
  loading?: boolean;
  initialValues?: Partial<ExternalStorageFormValues>;
  isEdit?: boolean;
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

const ExternalStorageFormModal: React.FC<ExternalStorageFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  initialValues,
  isEdit = false,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sshEnabled, setSshEnabled] = useState(false);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
        setSshEnabled(initialValues.sshEnabled || false);
        setCurrentStep(1); // 편집 모드에서는 바로 2단계부터
      } else {
        form.resetFields();
        setSshEnabled(false);
        setCurrentStep(0);
      }
      setConnectionStatus('idle');
      setConnectionError('');
      setIsSubmitting(false);
    }
  }, [visible, form, initialValues]);

  // 연결 테스트 핸들러
  const handleTestConnection = async () => {
    try {
      // SSH 활성화 시 SSH 필드도 포함하여 유효성 검사
      const sshFields = sshEnabled
        ? [
            'sshGatewayHost',
            'sshGatewayPort',
            'sshGatewayUser',
            'sshGatewayPassword',
            'sshTargetHost',
            'sshTargetPort',
            'sshTargetUser',
            'sshTargetPassword',
          ]
        : [];
      const values = await form.validateFields([
        'endpoint',
        'accessKey',
        'secretKey',
        'bucket',
        'useSSL',
        ...sshFields,
      ]);

      setConnectionStatus('testing');
      setConnectionError('');

      // 엔드포인트 형식 검증
      const endpointPattern = /^https?:\/\/.+/;
      if (!endpointPattern.test(values.endpoint)) {
        throw new Error(
          '엔드포인트는 http:// 또는 https://로 시작해야 합니다.'
        );
      }

      // 실제 연결 테스트 API 호출 (SSH 설정 포함)
      const testParams: {
        endpoint: string;
        access_key: string;
        secret_key: string;
        bucket: string;
        use_ssl?: boolean;
        ssh_enabled?: boolean;
        ssh_gateway_host?: string;
        ssh_gateway_port?: number;
        ssh_gateway_user?: string;
        ssh_gateway_password?: string;
        ssh_target_host?: string;
        ssh_target_port?: number;
        ssh_target_user?: string;
        ssh_target_password?: string;
      } = {
        endpoint: values.endpoint,
        access_key: values.accessKey,
        secret_key: values.secretKey,
        bucket: values.bucket,
        use_ssl: values.useSSL || false,
      };

      // SSH 터널링 설정 추가
      if (sshEnabled) {
        testParams.ssh_enabled = true;
        testParams.ssh_gateway_host = values.sshGatewayHost;
        testParams.ssh_gateway_port = values.sshGatewayPort || 22;
        testParams.ssh_gateway_user = values.sshGatewayUser;
        testParams.ssh_gateway_password = values.sshGatewayPassword;
        testParams.ssh_target_host = values.sshTargetHost;
        testParams.ssh_target_port = values.sshTargetPort || 22;
        testParams.ssh_target_user = values.sshTargetUser;
        testParams.ssh_target_password = values.sshTargetPassword;
      }

      const response =
        await backupApi.testExternalStorageConnection(testParams);

      if (response.success && response.data?.connected) {
        setConnectionStatus('success');
        setCurrentStep(2);
        message.success('저장소 연결 테스트 성공!');
      } else {
        throw new Error(
          response.data?.message ||
            response.error ||
            '연결 테스트에 실패했습니다.'
        );
      }
    } catch (error: unknown) {
      setConnectionStatus('failed');
      const errorMessage =
        error instanceof Error ? error.message : '연결 테스트 실패';
      setConnectionError(errorMessage);
      logger.error('외부 저장소 연결 테스트 실패:', error as Error);
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const submitData: ExternalStorageFormValues = {
        name: values.name,
        description: values.description,
        type: values.type || 'minio',
        endpoint: values.endpoint,
        accessKey: values.accessKey,
        secretKey: values.secretKey,
        bucket: values.bucket || 'velero',
        region: values.region || 'minio',
        useSSL: values.useSSL || false,
        // SSH 터널링 설정
        sshEnabled: sshEnabled,
        sshGatewayHost: sshEnabled ? values.sshGatewayHost : undefined,
        sshGatewayPort: sshEnabled ? values.sshGatewayPort || 22 : undefined,
        sshGatewayUser: sshEnabled ? values.sshGatewayUser : undefined,
        sshGatewayPassword: sshEnabled ? values.sshGatewayPassword : undefined,
        sshTargetHost: sshEnabled ? values.sshTargetHost : undefined,
        sshTargetPort: sshEnabled ? values.sshTargetPort || 22 : undefined,
        sshTargetUser: sshEnabled ? values.sshTargetUser : undefined,
        sshTargetPassword: sshEnabled ? values.sshTargetPassword : undefined,
      };

      await onSubmit(submitData);
      message.success(
        isEdit ? '저장소가 수정되었습니다.' : '외부 저장소가 등록되었습니다.'
      );
      onCancel();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '저장소 등록 실패';
      message.error(errorMessage);
      logger.error('외부 저장소 등록 실패:', error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 기본 정보 입력 시 다음 단계로
  const handleBasicInfoComplete = async () => {
    try {
      await form.validateFields(['name', 'type']);
      setCurrentStep(1);
    } catch {
      // Form validation failed - stay on current step
    }
  };

  // 연결 상태 표시
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <Alert
            message='연결 테스트 중...'
            description='외부 저장소에 연결을 시도하고 있습니다.'
            type='info'
            showIcon
            icon={<Spin size='small' />}
          />
        );
      case 'success':
        return (
          <Alert
            message='연결 성공'
            description='외부 저장소에 성공적으로 연결되었습니다.'
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
              '외부 저장소 연결에 실패했습니다. 입력 정보를 확인해주세요.'
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
          <span>{isEdit ? '외부 저장소 수정' : '외부 저장소 등록'}</span>
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
        currentStep === 0 && (
          <Button key='next' type='primary' onClick={handleBasicInfoComplete}>
            다음
          </Button>
        ),
        currentStep >= 1 && currentStep < 2 && (
          <Button
            key='test'
            type='default'
            onClick={handleTestConnection}
            loading={connectionStatus === 'testing'}
          >
            연결 테스트
          </Button>
        ),
        currentStep >= 1 && (
          <Button
            key='submit'
            type='primary'
            loading={loading || isSubmitting}
            onClick={handleSubmit}
            disabled={!isEdit && connectionStatus !== 'success'}
          >
            {isEdit ? '수정' : '저장소 등록'}
          </Button>
        ),
      ].filter(Boolean)}
    >
      {/* 진행 단계 */}
      <Steps
        size='small'
        current={currentStep}
        style={{ marginBottom: 24 }}
        items={[
          {
            title: '기본 정보',
            icon: <DatabaseOutlined />,
            description: (
              <Text type='secondary' style={{ fontSize: 11 }}>
                이름/타입
              </Text>
            ),
          },
          {
            title: '연결 정보',
            icon: <KeyOutlined />,
            description: (
              <Text type='secondary' style={{ fontSize: 11 }}>
                인증 설정
              </Text>
            ),
          },
          {
            title: '등록 완료',
            icon: <CheckCircleOutlined />,
            description: (
              <Text type='secondary' style={{ fontSize: 11 }}>
                확인
              </Text>
            ),
          },
        ]}
      />

      <Form
        form={form}
        layout='vertical'
        initialValues={{
          type: 'minio',
          bucket: 'velero',
          region: 'minio',
          useSSL: false,
          sshEnabled: false,
          sshGatewayPort: 22,
          sshTargetPort: 22,
        }}
      >
        {/* 안내 */}
        <Alert
          message='외부 백업 저장소 등록'
          description={
            <div>
              <p>
                조직 레벨의 외부 저장소를 등록하여 여러 인프라의 백업을 중앙에서
                관리할 수 있습니다.
              </p>
              <p style={{ marginTop: 8, color: '#666' }}>
                <strong>특징:</strong> 인프라와 독립적으로 관리되며, 등록 후
                원하는 인프라에 연결할 수 있습니다.
              </p>
            </div>
          }
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 1단계: 기본 정보 */}
        <Divider orientation='left' plain>
          <Space>
            <DatabaseOutlined />
            기본 정보
          </Space>
        </Divider>

        <Form.Item
          name='name'
          label='저장소 이름'
          rules={[{ required: true, message: '저장소 이름을 입력해주세요.' }]}
        >
          <Input
            prefix={<CloudServerOutlined />}
            placeholder='예: 회사 중앙 MinIO, Production S3'
          />
        </Form.Item>

        <Form.Item name='description' label='설명 (선택)'>
          <TextArea rows={2} placeholder='저장소에 대한 설명을 입력하세요' />
        </Form.Item>

        <Form.Item
          name='type'
          label='저장소 타입'
          rules={[{ required: true, message: '저장소 타입을 선택해주세요.' }]}
        >
          <Select>
            <Option value='minio'>
              <Space>
                <CloudServerOutlined />
                MinIO
              </Space>
            </Option>
            <Option value='s3'>
              <Space>
                <CloudServerOutlined />
                AWS S3
              </Space>
            </Option>
            <Option value='nfs' disabled>
              <Space>
                <CloudServerOutlined />
                NFS (준비 중)
              </Space>
            </Option>
          </Select>
        </Form.Item>

        {/* 2단계: 연결 정보 */}
        {currentStep >= 1 && (
          <>
            <Divider orientation='left' plain>
              <Space>
                <ApiOutlined />
                연결 정보
              </Space>
            </Divider>

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
                placeholder='예: http://192.168.0.100:9000'
              />
            </Form.Item>

            <Form.Item
              name='accessKey'
              label='Access Key'
              rules={[
                { required: true, message: 'Access Key를 입력해주세요.' },
              ]}
            >
              <Input
                prefix={<KeyOutlined />}
                placeholder='MinIO/S3 Access Key'
              />
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
                placeholder='MinIO/S3 Secret Key'
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

            <Form.Item
              name='region'
              label='리전'
              tooltip='S3의 경우 리전을 지정해주세요. MinIO는 기본값 사용'
            >
              <Input placeholder='예: minio, ap-northeast-2' />
            </Form.Item>

            <Form.Item name='useSSL' label='SSL 사용' valuePropName='checked'>
              <Switch
                checkedChildren={<SafetyOutlined />}
                unCheckedChildren='OFF'
              />
            </Form.Item>

            {/* SSH 터널링 설정 */}
            <Divider orientation='left' plain>
              <Space>
                <LockOutlined />
                SSH 터널링 (내부망 접근)
              </Space>
            </Divider>

            <Alert
              message='SSH 터널링'
              description='MinIO가 내부 네트워크에 있어 직접 접근이 불가능한 경우, SSH 터널을 통해 연결할 수 있습니다.'
              type='info'
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name='sshEnabled'
              label='SSH 터널링 사용'
              valuePropName='checked'
            >
              <Switch
                checkedChildren={<LockOutlined />}
                unCheckedChildren='OFF'
                onChange={checked => {
                  setSshEnabled(checked);
                  setConnectionStatus('idle'); // 설정 변경 시 연결 상태 초기화
                }}
              />
            </Form.Item>

            {sshEnabled && (
              <Collapse
                defaultActiveKey={['gateway', 'target']}
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: 'gateway',
                    label: (
                      <Space>
                        <GlobalOutlined style={{ color: '#1890ff' }} />
                        <Text strong>게이트웨이 서버 (외부 접속점)</Text>
                      </Space>
                    ),
                    children: (
                      <>
                        <Row gutter={16}>
                          <Col span={16}>
                            <Form.Item
                              name='sshGatewayHost'
                              label='호스트'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '게이트웨이 호스트를 입력해주세요.',
                                },
                              ]}
                            >
                              <Input placeholder='예: 210.217.121.39' />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name='sshGatewayPort'
                              label='포트'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '포트를 입력해주세요.',
                                },
                              ]}
                            >
                              <InputNumber
                                min={1}
                                max={65535}
                                style={{ width: '100%' }}
                                placeholder='5022'
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name='sshGatewayUser'
                              label='사용자'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '사용자를 입력해주세요.',
                                },
                              ]}
                            >
                              <Input placeholder='예: lw' />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name='sshGatewayPassword'
                              label='비밀번호'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '비밀번호를 입력해주세요.',
                                },
                              ]}
                            >
                              <Input.Password placeholder='SSH 비밀번호' />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    ),
                  },
                  {
                    key: 'target',
                    label: (
                      <Space>
                        <CloudServerOutlined style={{ color: '#52c41a' }} />
                        <Text strong>MinIO 서버 (내부망)</Text>
                      </Space>
                    ),
                    children: (
                      <>
                        <Row gutter={16}>
                          <Col span={16}>
                            <Form.Item
                              name='sshTargetHost'
                              label='호스트'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: 'MinIO 서버 호스트를 입력해주세요.',
                                },
                              ]}
                            >
                              <Input placeholder='예: 192.168.0.100' />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name='sshTargetPort'
                              label='SSH 포트'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '포트를 입력해주세요.',
                                },
                              ]}
                            >
                              <InputNumber
                                min={1}
                                max={65535}
                                style={{ width: '100%' }}
                                placeholder='22'
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name='sshTargetUser'
                              label='사용자'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '사용자를 입력해주세요.',
                                },
                              ]}
                            >
                              <Input placeholder='예: tomcat' />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name='sshTargetPassword'
                              label='비밀번호'
                              rules={[
                                {
                                  required: sshEnabled,
                                  message: '비밀번호를 입력해주세요.',
                                },
                              ]}
                            >
                              <Input.Password placeholder='SSH 비밀번호' />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Alert
                          message='MinIO 엔드포인트'
                          description={
                            <Text type='secondary'>
                              위에서 입력한 엔드포인트 URL (예:
                              http://192.168.0.100:9000)은 SSH 터널을 통해
                              접근됩니다.
                            </Text>
                          }
                          type='warning'
                          showIcon
                          style={{ marginTop: 8 }}
                        />
                      </>
                    ),
                  },
                ]}
              />
            )}

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
                    아래 <strong>[저장소 등록]</strong> 버튼을 클릭하여 외부
                    저장소를 등록하세요.
                  </p>
                  <p style={{ marginTop: 8, color: '#666' }}>
                    등록 후 인프라와 연결하여 백업에 사용할 수 있습니다.
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

export default ExternalStorageFormModal;
