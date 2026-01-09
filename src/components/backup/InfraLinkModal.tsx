// InfraLinkModal.tsx - 외부 저장소에 인프라 연결 모달
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  Alert,
  Space,
  Tag,
  Typography,
  Input,
  Checkbox,
  Divider,
  Table,
  Popconfirm,
} from 'antd';
import {
  LinkOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  ContainerOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { InfraItem } from '../../types/infra';
import {
  ExternalBackupStorage,
  InfraBackupStorageMapping,
  LinkInfraToStorageParams,
} from '../../types/backup';

const { Text } = Typography;
const { Option } = Select;

interface InfraLinkModalProps {
  visible: boolean;
  onCancel: () => void;
  storage: ExternalBackupStorage | null;
  infrastructures: InfraItem[];
  linkedInfras: InfraBackupStorageMapping[];
  onLink: (params: LinkInfraToStorageParams) => Promise<void>;
  onUnlink: (infraId: number, storageId: number) => Promise<void>;
  loading?: boolean;
}

// Kubernetes 인프라 타입
const K8S_INFRA_TYPES = ['kubernetes', 'external_kubernetes'];
// Docker/Podman 인프라 타입
const DOCKER_INFRA_TYPES = [
  'docker',
  'external_docker',
  'podman',
  'external_podman',
];
// 모든 지원 인프라 타입
const ALL_SUPPORTED_INFRA_TYPES = [...K8S_INFRA_TYPES, ...DOCKER_INFRA_TYPES];

const InfraLinkModal: React.FC<InfraLinkModalProps> = ({
  visible,
  onCancel,
  storage,
  infrastructures,
  linkedInfras,
  onLink,
  onUnlink,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [isLinking, setIsLinking] = useState(false);

  // 모든 지원 인프라 타입 필터링 (K8s, Docker, Podman)
  const availableInfras = useMemo(() => {
    return infrastructures.filter(
      infra =>
        ALL_SUPPORTED_INFRA_TYPES.includes(infra.type) &&
        !linkedInfras.some(linked => linked.infra_id === infra.id)
    );
  }, [infrastructures, linkedInfras]);

  // 선택된 인프라가 K8s인지 확인
  const [selectedInfraId, setSelectedInfraId] = useState<number | null>(null);
  const isSelectedK8sInfra = useMemo(() => {
    if (!selectedInfraId) return false;
    const infra = infrastructures.find(i => i.id === selectedInfraId);
    return infra ? K8S_INFRA_TYPES.includes(infra.type) : false;
  }, [selectedInfraId, infrastructures]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        bsl_name: storage
          ? `bsl-${storage.name.toLowerCase().replace(/\s+/g, '-')}`
          : '',
        is_default: true,
      });
      setSelectedInfraId(null);
    }
  }, [visible, form, storage]);

  // 인프라 타입에 따른 태그 색상
  const getInfraTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      kubernetes: 'blue',
      external_kubernetes: 'geekblue',
      docker: 'green',
      external_docker: 'cyan',
      podman: 'orange',
      external_podman: 'gold',
    };
    return colors[type] || 'default';
  };

  // 인프라 타입에 따른 아이콘
  const getInfraIcon = (type: string) => {
    if (K8S_INFRA_TYPES.includes(type)) {
      return <ClusterOutlined />;
    }
    return <ContainerOutlined />;
  };

  // 인프라 연결 핸들러
  const handleLink = async () => {
    if (!storage) return;

    try {
      const values = await form.validateFields();
      setIsLinking(true);

      // Docker/Podman 인프라일 경우 bsl_name 자동 생성
      const selectedInfra = infrastructures.find(i => i.id === values.infra_id);
      const isK8s = selectedInfra
        ? K8S_INFRA_TYPES.includes(selectedInfra.type)
        : false;
      const bslName = isK8s
        ? values.bsl_name
        : `storage-${storage.name.toLowerCase().replace(/\s+/g, '-')}-${values.infra_id}`;

      await onLink({
        infra_id: values.infra_id,
        external_storage_id: storage.id,
        bsl_name: bslName,
        is_default: values.is_default,
      });

      form.resetFields();
      form.setFieldsValue({
        bsl_name: `bsl-${storage.name.toLowerCase().replace(/\s+/g, '-')}`,
        is_default: true,
      });
      setSelectedInfraId(null);
    } catch {
      // 에러는 상위에서 처리
    } finally {
      setIsLinking(false);
    }
  };

  // 연결 해제 핸들러
  const handleUnlink = async (infraId: number) => {
    if (!storage) return;
    await onUnlink(infraId, storage.id);
  };

  // 연결된 인프라 테이블 컬럼
  const linkedColumns = [
    {
      title: '인프라',
      key: 'infra',
      render: (_: unknown, record: InfraBackupStorageMapping) => {
        const infra = infrastructures.find(i => i.id === record.infra_id);
        return (
          <Space>
            {infra && getInfraIcon(infra.type)}
            <Text strong>
              {record.infra_name || infra?.name || '알 수 없음'}
            </Text>
            {infra && (
              <Tag color={getInfraTypeColor(infra.type)}>{infra.type}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'BSL 이름',
      dataIndex: 'bsl_name',
      key: 'bsl_name',
      render: (bslName: string) => <Tag color='cyan'>{bslName}</Tag>,
    },
    {
      title: '기본값',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (isDefault: boolean) =>
        isDefault ? (
          <Tag color='success' icon={<CheckCircleOutlined />}>
            기본
          </Tag>
        ) : (
          <Tag>-</Tag>
        ),
    },
    {
      title: '작업',
      key: 'action',
      width: 80,
      render: (_: unknown, record: InfraBackupStorageMapping) => (
        <Popconfirm
          title='연결 해제'
          description='이 인프라와의 연결을 해제하시겠습니까?'
          onConfirm={() => handleUnlink(record.infra_id)}
          okText='해제'
          cancelText='취소'
        >
          <Button size='small' danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#1890ff' }} />
          <span>인프라 연결 관리</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key='close' onClick={onCancel}>
          닫기
        </Button>,
      ]}
    >
      {storage && (
        <>
          {/* 저장소 정보 */}
          <Alert
            message={
              <Space>
                <CloudServerOutlined style={{ color: '#1890ff' }} />
                <Text strong>{storage.name}</Text>
                <Tag color={storage.type === 'minio' ? 'purple' : 'orange'}>
                  {storage.type.toUpperCase()}
                </Tag>
              </Space>
            }
            description={
              <Space direction='vertical' size={0}>
                <Text type='secondary'>
                  Endpoint: <Tag color='green'>{storage.endpoint}</Tag>
                </Text>
                <Text type='secondary'>
                  Bucket: <Tag>{storage.bucket}</Tag>
                </Text>
              </Space>
            }
            type='info'
            style={{ marginBottom: 16 }}
          />

          {/* 새 인프라 연결 폼 */}
          <Divider orientation='left' plain>
            <Space>
              <LinkOutlined />새 인프라 연결
            </Space>
          </Divider>

          {availableInfras.length === 0 ? (
            <Alert
              message='연결 가능한 인프라가 없습니다'
              description='모든 인프라가 이미 연결되었거나, 등록된 인프라가 없습니다.'
              type='warning'
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Form form={form} layout='vertical'>
              <Form.Item
                name='infra_id'
                label='인프라 선택'
                rules={[{ required: true, message: '인프라를 선택해주세요.' }]}
              >
                <Select
                  placeholder='연결할 인프라를 선택하세요'
                  onChange={(value: number) => setSelectedInfraId(value)}
                >
                  {availableInfras.map(infra => (
                    <Option key={infra.id} value={infra.id}>
                      <Space>
                        {getInfraIcon(infra.type)}
                        {infra.name}
                        <Tag color={getInfraTypeColor(infra.type)}>
                          {infra.type}
                        </Tag>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* BSL 이름 - Kubernetes 인프라 선택 시에만 표시 */}
              {isSelectedK8sInfra && (
                <Form.Item
                  name='bsl_name'
                  label='BackupStorageLocation 이름'
                  tooltip='Velero에서 사용할 BSL 이름입니다. 영문 소문자, 숫자, 하이픈만 사용 가능합니다.'
                  rules={[
                    { required: true, message: 'BSL 이름을 입력해주세요.' },
                    {
                      pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                      message: '영문 소문자, 숫자, 하이픈만 사용 가능합니다.',
                    },
                  ]}
                >
                  <Input placeholder='예: production-minio-bsl' />
                </Form.Item>
              )}

              <Form.Item name='is_default' valuePropName='checked'>
                <Checkbox>이 저장소를 기본 백업 위치로 설정</Checkbox>
              </Form.Item>

              <Form.Item>
                <Button
                  type='primary'
                  icon={<LinkOutlined />}
                  onClick={handleLink}
                  loading={isLinking || loading}
                  block
                >
                  인프라 연결
                </Button>
              </Form.Item>
            </Form>
          )}

          {/* 연결된 인프라 목록 */}
          <Divider orientation='left' plain>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              연결된 인프라 ({linkedInfras.length}개)
            </Space>
          </Divider>

          {linkedInfras.length > 0 ? (
            <Table
              dataSource={linkedInfras}
              columns={linkedColumns}
              rowKey='id'
              size='small'
              pagination={false}
            />
          ) : (
            <Alert
              message='연결된 인프라가 없습니다'
              description='위에서 인프라를 선택하여 이 저장소에 연결하세요.'
              type='info'
              showIcon
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default InfraLinkModal;
