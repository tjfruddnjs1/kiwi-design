// ServiceBackupFormModal.tsx - 서비스 기반 백업 생성 모달
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Alert,
  Radio,
  message,
  Spin,
  Tag,
  Typography,
  Divider,
} from 'antd';
import {
  CloudUploadOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  ContainerOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { serviceApi } from '../../lib/api/endpoints/service';

const { Option } = Select;
const { Text } = Typography;

// 서비스 정보 with infra details
interface ServiceWithInfra {
  id: number;
  name: string;
  namespace?: string;
  infraId: number;
  infraName: string;
  infraType: 'kubernetes' | 'external_kubernetes' | 'docker' | 'podman';
  status: string;
  domain?: string;
}

interface ServiceBackupFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (params: ServiceBackupParams) => Promise<void>;
  loading?: boolean;
  namespaces?: string[];
}

// 백업 파라미터 (K8s + Docker 통합)
export interface ServiceBackupParams {
  serviceId: number;
  serviceName: string;
  infraId: number;
  infraType: string;
  backupName: string;
  // K8s specific
  namespace?: string;
  selector?: string;
  // Docker specific
  backupType?: 'full' | 'volume' | 'config' | 'compose';
  composeProject?: string;
  containers?: string[];
}

const ServiceBackupFormModal: React.FC<ServiceBackupFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading: externalLoading,
  namespaces = [],
}) => {
  const [form] = Form.useForm();
  const [services, setServices] = useState<ServiceWithInfra[]>([]);
  const [selectedService, setSelectedService] =
    useState<ServiceWithInfra | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dockerBackupType, setDockerBackupType] = useState<
    'full' | 'volume' | 'config' | 'compose'
  >('full');

  // 서비스 목록 로드
  useEffect(() => {
    if (visible) {
      void loadServices();
    }
  }, [visible]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setSelectedService(null);
      setDockerBackupType('full');
    }
  }, [visible, form]);

  const loadServices = async () => {
    setIsLoadingServices(true);
    try {
      const response = await serviceApi.list();

      if (response.data.success && response.data.data) {
        const rawData = response.data.data as unknown as Array<{
          id: number;
          name: string;
          namespace?: string;
          infra_id?: number;
          infra_name?: string;
          infraType?: string;
          status?: string;
          domain?: string;
        }>;

        const serviceList: ServiceWithInfra[] = rawData
          .map(s => ({
            id: s.id,
            name: s.name,
            namespace: s.namespace,
            infraId: s.infra_id || 0,
            infraName: s.infra_name || '알 수 없음',
            infraType:
              (s.infraType as ServiceWithInfra['infraType']) || 'docker',
            status: s.status || 'unknown',
            domain: s.domain,
          }))
          .filter(s => s.infraId > 0); // 인프라가 연결된 서비스만
        setServices(serviceList);
      }
    } catch (_error) {
      message.error('서비스 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingServices(false);
    }
  };

  // 서비스 선택 시 처리
  const handleServiceChange = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    setSelectedService(service || null);

    if (service) {
      const defaultName = `${service.name}-${dayjs().format('YYYYMMDD-HHmmss')}`;
      form.setFieldsValue({
        backupName: defaultName,
        namespace: service.namespace || undefined,
      });
    }
  };

  // 인프라 타입 헬퍼
  const isKubernetesService = useMemo(() => {
    return (
      selectedService?.infraType === 'kubernetes' ||
      selectedService?.infraType === 'external_kubernetes'
    );
  }, [selectedService]);

  const isDockerService = useMemo(() => {
    return (
      selectedService?.infraType === 'docker' ||
      selectedService?.infraType === 'podman'
    );
  }, [selectedService]);

  // 서비스를 인프라 타입별로 그룹화
  const groupedServices = useMemo(() => {
    const groups: Record<string, ServiceWithInfra[]> = {
      kubernetes: [],
      docker: [],
      podman: [],
    };

    services.forEach(service => {
      if (
        service.infraType === 'kubernetes' ||
        service.infraType === 'external_kubernetes'
      ) {
        groups.kubernetes.push(service);
      } else if (service.infraType === 'docker') {
        groups.docker.push(service);
      } else if (service.infraType === 'podman') {
        groups.podman.push(service);
      }
    });

    return groups;
  }, [services]);

  // 제출 처리
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!selectedService) {
        message.error('서비스를 선택해주세요.');
        return;
      }

      setIsSubmitting(true);

      const params: ServiceBackupParams = {
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        infraId: selectedService.infraId,
        infraType: selectedService.infraType,
        backupName: values.backupName,
      };

      // K8s 서비스
      if (isKubernetesService) {
        params.namespace = values.namespace;
        params.selector = values.selector;
      }

      // Docker/Podman 서비스
      if (isDockerService) {
        params.backupType = values.backupType || dockerBackupType;
        params.composeProject = values.composeProject;
      }

      await onSubmit(params);
      onCancel();
    } catch (error) {
      if (error instanceof Error) {
        message.error(`백업 생성 실패: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인프라 타입 아이콘
  const getInfraIcon = (type: string) => {
    if (type === 'kubernetes' || type === 'external_kubernetes') {
      return <ClusterOutlined style={{ color: '#326CE5' }} />;
    }
    if (type === 'docker') {
      return <ContainerOutlined style={{ color: '#2496ED' }} />;
    }
    if (type === 'podman') {
      return <ContainerOutlined style={{ color: '#892CA0' }} />;
    }
    return <AppstoreOutlined />;
  };

  // 인프라 타입 라벨
  const getInfraLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      kubernetes: { text: 'K8s', color: 'blue' },
      external_kubernetes: { text: 'K8s-Ext', color: 'geekblue' },
      docker: { text: 'Docker', color: 'cyan' },
      podman: { text: 'Podman', color: 'purple' },
    };
    return labels[type] || { text: type, color: 'default' };
  };

  const dockerBackupTypeOptions = [
    {
      value: 'full',
      label: '전체 백업',
      description: '볼륨 + 컨테이너 설정 + Compose 파일',
    },
    { value: 'volume', label: '볼륨만', description: '데이터 볼륨만 백업' },
    { value: 'config', label: '설정만', description: '컨테이너 설정만 백업' },
    {
      value: 'compose',
      label: 'Compose 파일만',
      description: 'docker-compose.yml 파일만 백업',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <CloudUploadOutlined />
          서비스 백업 생성
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={isSubmitting || externalLoading}
      width={600}
      okText='백업 시작'
      cancelText='취소'
      okButtonProps={{ disabled: !selectedService }}
    >
      <Spin spinning={isLoadingServices}>
        <div className='service-backup-form-modal'>
          <Alert
            message='서비스 기반 백업'
            description='운영 중인 서비스를 선택하면 인프라 타입에 맞는 백업 전략이 자동으로 적용됩니다.'
            type='info'
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Form form={form} layout='vertical'>
            {/* 서비스 선택 */}
            <Form.Item
              name='serviceId'
              label='백업할 서비스'
              rules={[{ required: true, message: '서비스를 선택해주세요' }]}
            >
              <Select
                placeholder='서비스를 선택하세요'
                size='large'
                onChange={handleServiceChange}
                showSearch
                optionFilterProp='children'
                notFoundContent={
                  services.length === 0
                    ? '운영 중인 서비스가 없습니다'
                    : '검색 결과 없음'
                }
              >
                {/* K8s 서비스 그룹 */}
                {groupedServices.kubernetes.length > 0 && (
                  <Select.OptGroup
                    label={
                      <>
                        <ClusterOutlined /> Kubernetes 서비스
                      </>
                    }
                  >
                    {groupedServices.kubernetes.map(service => (
                      <Option key={service.id} value={service.id}>
                        <Space>
                          {getInfraIcon(service.infraType)}
                          <span>{service.name}</span>
                          <Tag
                            color={getInfraLabel(service.infraType).color}
                            style={{ marginLeft: 8 }}
                          >
                            {service.infraName}
                          </Tag>
                          {service.namespace && (
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              ns: {service.namespace}
                            </Text>
                          )}
                        </Space>
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}

                {/* Docker 서비스 그룹 */}
                {groupedServices.docker.length > 0 && (
                  <Select.OptGroup
                    label={
                      <>
                        <ContainerOutlined /> Docker 서비스
                      </>
                    }
                  >
                    {groupedServices.docker.map(service => (
                      <Option key={service.id} value={service.id}>
                        <Space>
                          {getInfraIcon(service.infraType)}
                          <span>{service.name}</span>
                          <Tag
                            color={getInfraLabel(service.infraType).color}
                            style={{ marginLeft: 8 }}
                          >
                            {service.infraName}
                          </Tag>
                        </Space>
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}

                {/* Podman 서비스 그룹 */}
                {groupedServices.podman.length > 0 && (
                  <Select.OptGroup
                    label={
                      <>
                        <ContainerOutlined /> Podman 서비스
                      </>
                    }
                  >
                    {groupedServices.podman.map(service => (
                      <Option key={service.id} value={service.id}>
                        <Space>
                          {getInfraIcon(service.infraType)}
                          <span>{service.name}</span>
                          <Tag
                            color={getInfraLabel(service.infraType).color}
                            style={{ marginLeft: 8 }}
                          >
                            {service.infraName}
                          </Tag>
                        </Space>
                      </Option>
                    ))}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>

            {/* 선택된 서비스 정보 */}
            {selectedService && (
              <>
                <Divider style={{ margin: '16px 0' }} />

                <Alert
                  message={
                    <Space>
                      {getInfraIcon(selectedService.infraType)}
                      <span>
                        {isKubernetesService ? 'Kubernetes' : 'Docker/Podman'}{' '}
                        백업 전략
                      </span>
                    </Space>
                  }
                  description={
                    isKubernetesService
                      ? 'Velero를 사용하여 네임스페이스/라벨 기반 백업을 생성합니다.'
                      : '볼륨, 설정, Compose 파일을 포함한 백업을 생성합니다.'
                  }
                  type={isKubernetesService ? 'info' : 'success'}
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {/* 백업 이름 */}
                <Form.Item
                  name='backupName'
                  label='백업 이름'
                  rules={[
                    { required: true, message: '백업 이름을 입력해주세요' },
                  ]}
                >
                  <Input placeholder='예: my-service-20251212' size='large' />
                </Form.Item>

                {/* K8s 전용 옵션 */}
                {isKubernetesService && (
                  <>
                    <Form.Item
                      name='namespace'
                      label='네임스페이스'
                      rules={[
                        {
                          required: true,
                          message: '네임스페이스를 선택해주세요',
                        },
                      ]}
                    >
                      <Select placeholder='네임스페이스 선택' size='large'>
                        {selectedService.namespace && (
                          <Option value={selectedService.namespace}>
                            {selectedService.namespace} (서비스 기본)
                          </Option>
                        )}
                        {namespaces
                          .filter(ns => ns !== selectedService.namespace)
                          .map(ns => (
                            <Option key={ns} value={ns}>
                              {ns}
                            </Option>
                          ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name='selector'
                      label='라벨 셀렉터 (선택)'
                      tooltip='특정 라벨이 있는 리소스만 백업합니다. 예: app=nginx'
                    >
                      <Input
                        placeholder='예: app=nginx 또는 app=myapp,tier=frontend'
                        size='large'
                      />
                    </Form.Item>
                  </>
                )}

                {/* Docker/Podman 전용 옵션 */}
                {isDockerService && (
                  <>
                    <Form.Item
                      name='backupType'
                      label='백업 유형'
                      rules={[
                        { required: true, message: '백업 유형을 선택해주세요' },
                      ]}
                      initialValue='full'
                    >
                      <Radio.Group
                        value={dockerBackupType}
                        onChange={e => setDockerBackupType(e.target.value)}
                      >
                        <Space direction='vertical' style={{ width: '100%' }}>
                          {dockerBackupTypeOptions.map(option => (
                            <Radio key={option.value} value={option.value}>
                              <Space direction='vertical' size={0}>
                                <span style={{ fontWeight: 500 }}>
                                  {option.label}
                                </span>
                                <span style={{ fontSize: 12, color: '#888' }}>
                                  {option.description}
                                </span>
                              </Space>
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    </Form.Item>

                    <Form.Item
                      name='composeProject'
                      label='Compose 프로젝트 (선택)'
                      tooltip='특정 Docker Compose 프로젝트만 백업하려면 프로젝트 이름을 입력하세요'
                    >
                      <Input
                        placeholder='예: my-app (비워두면 서비스 전체 백업)'
                        size='large'
                      />
                    </Form.Item>
                  </>
                )}
              </>
            )}
          </Form>
        </div>
      </Spin>
    </Modal>
  );
};

export default ServiceBackupFormModal;
