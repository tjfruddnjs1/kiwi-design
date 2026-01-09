import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Modal,
  Input,
  Space,
  message,
  Tag,
  Popconfirm,
  Typography,
  Spin,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CloudServerOutlined,
  ApiOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import {
  getK8sResources,
  getK8sResourceYaml,
  applyK8sResource,
  deleteK8sResource,
} from '../../lib/api/k8s-resources';
import type { K8sResource } from '../../lib/api/k8s-resources';

const { TextArea } = Input;
const { Text } = Typography;

interface K8sResourceManagerProps {
  serviceId: number;
  readOnly?: boolean; //  [운영모달] readOnly 모드: 편집/삭제 버튼 숨김
}

const K8sResourceManager: React.FC<K8sResourceManagerProps> = ({
  serviceId,
  readOnly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState<string>('');
  const [deployments, setDeployments] = useState<K8sResource[]>([]);
  const [services, setServices] = useState<K8sResource[]>([]);
  const [ingresses, setIngresses] = useState<K8sResource[]>([]);

  const [yamlModalVisible, setYamlModalVisible] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [yamlLoading, setYamlLoading] = useState(false);
  const [currentResource, setCurrentResource] = useState<{
    type: string;
    name: string;
  } | null>(null);

  // 리소스 목록 조회
  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getK8sResources(serviceId);
      setNamespace(data.namespace);
      setDeployments(data.deployments || []);
      setServices(data.services || []);
      setIngresses(data.ingresses || []);
    } catch (error: any) {
      const errorMsg = `리소스 조회 실패: ${error.message}`;
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceId) {
      void fetchResources();
    }
  }, [serviceId]);

  // YAML 편집 모달 열기
  const handleEditResource = async (
    resourceType: string,
    resourceName: string
  ) => {
    setCurrentResource({ type: resourceType, name: resourceName });
    setYamlModalVisible(true);
    setYamlLoading(true);

    try {
      const yaml = await getK8sResourceYaml({
        service_id: serviceId,
        resource_type: resourceType,
        resource_name: resourceName,
      });
      setYamlContent(yaml);
    } catch (error: any) {
      message.error(`YAML 조회 실패: ${error.message}`);
      setYamlModalVisible(false);
    } finally {
      setYamlLoading(false);
    }
  };

  // YAML 적용
  const handleApplyYaml = async () => {
    if (!yamlContent.trim()) {
      message.warning('YAML 내용을 입력하세요');
      return;
    }

    setYamlLoading(true);
    try {
      const result = await applyK8sResource({
        service_id: serviceId,
        yaml: yamlContent,
        resource_type: currentResource?.type,
        resource_name: currentResource?.name,
      });

      // Git 동기화 결과에 따라 다른 메시지 표시
      if (result.git_sync?.success) {
        message.success(`${result.message} (✓ Git 저장소에 커밋됨)`);
      } else if (result.git_sync && !result.git_sync.success) {
        message.warning(
          `${result.message} (⚠️ Git 동기화 실패: ${result.git_sync.message})`,
          5
        );
      } else {
        message.success(result.message);
      }

      setYamlModalVisible(false);
      void fetchResources(); // 리소스 목록 새로고침
    } catch (error: any) {
      message.error(`적용 실패: ${error.message}`);
    } finally {
      setYamlLoading(false);
    }
  };

  // 리소스 삭제
  const handleDeleteResource = async (
    resourceType: string,
    resourceName: string
  ) => {
    try {
      const result = await deleteK8sResource({
        service_id: serviceId,
        resource_type: resourceType,
        resource_name: resourceName,
      });

      // Git 동기화 결과에 따라 다른 메시지 표시
      if (result.git_sync?.success) {
        message.success(`${result.message} (✓ Git 저장소에서 제거됨)`);
      } else if (result.git_sync && !result.git_sync.success) {
        message.warning(
          `${result.message} (⚠️ Git 동기화 실패: ${result.git_sync.message})`,
          5
        );
      } else {
        message.success(result.message);
      }

      void fetchResources(); // 리소스 목록 새로고침
    } catch (error: any) {
      message.error(`삭제 실패: ${error.message}`);
    }
  };

  // 새 리소스 추가
  const handleAddResource = () => {
    setCurrentResource(null);
    setYamlContent(
      '# 새 Kubernetes 리소스 YAML을 입력하세요\napiVersion: v1\nkind: Service\nmetadata:\n  name: my-service\nspec:\n  selector:\n    app: my-app\n  ports:\n    - protocol: TCP\n      port: 80\n      targetPort: 8080'
    );
    setYamlModalVisible(true);
  };

  // 테이블 컬럼 정의
  //  [운영모달] readOnly 모드에서는 YAML 보기만 가능 (편집/삭제 제거)
  const deploymentColumns = [
    {
      title: '이름',
      dataIndex: ['metadata', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '생성 시간',
      dataIndex: ['metadata', 'creationTimestamp'],
      key: 'creationTimestamp',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: any, record: K8sResource) => (
        <Space>
          <Button
            size='small'
            icon={readOnly ? <EyeOutlined /> : <EditOutlined />}
            onClick={() =>
              handleEditResource('deployment', record.metadata.name)
            }
          >
            {readOnly ? 'YAML 보기' : '편집'}
          </Button>
          {!readOnly && (
            <Popconfirm
              title='정말 삭제하시겠습니까?'
              onConfirm={() =>
                handleDeleteResource('deployment', record.metadata.name)
              }
              okText='삭제'
              cancelText='취소'
            >
              <Button size='small' danger icon={<DeleteOutlined />}>
                삭제
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const serviceColumns = [
    {
      title: '이름',
      dataIndex: ['metadata', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '타입',
      dataIndex: ['spec', 'type'],
      key: 'type',
      render: (type: string) => <Tag color='blue'>{type}</Tag>,
    },
    {
      title: '생성 시간',
      dataIndex: ['metadata', 'creationTimestamp'],
      key: 'creationTimestamp',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: any, record: K8sResource) => (
        <Space>
          <Button
            size='small'
            icon={readOnly ? <EyeOutlined /> : <EditOutlined />}
            onClick={() => handleEditResource('service', record.metadata.name)}
          >
            {readOnly ? 'YAML 보기' : '편집'}
          </Button>
          {!readOnly && (
            <Popconfirm
              title='정말 삭제하시겠습니까?'
              onConfirm={() =>
                handleDeleteResource('service', record.metadata.name)
              }
              okText='삭제'
              cancelText='취소'
            >
              <Button size='small' danger icon={<DeleteOutlined />}>
                삭제
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const ingressColumns = [
    {
      title: '이름',
      dataIndex: ['metadata', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '호스트',
      dataIndex: ['spec', 'rules'],
      key: 'hosts',
      render: (rules: any[]) => {
        if (!rules || rules.length === 0) return '-';
        return rules.map((rule: any) => (
          <Tag key={rule.host} color='green'>
            {rule.host}
          </Tag>
        ));
      },
    },
    {
      title: '생성 시간',
      dataIndex: ['metadata', 'creationTimestamp'],
      key: 'creationTimestamp',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: any, record: K8sResource) => (
        <Space>
          <Button
            size='small'
            icon={readOnly ? <EyeOutlined /> : <EditOutlined />}
            onClick={() => handleEditResource('ingress', record.metadata.name)}
          >
            {readOnly ? 'YAML 보기' : '편집'}
          </Button>
          {!readOnly && (
            <Popconfirm
              title='정말 삭제하시겠습니까?'
              onConfirm={() =>
                handleDeleteResource('ingress', record.metadata.name)
              }
              okText='삭제'
              cancelText='취소'
            >
              <Button size='small' danger icon={<DeleteOutlined />}>
                삭제
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'deployments',
      label: (
        <span>
          <CloudServerOutlined />
          Deployment ({deployments.length})
        </span>
      ),
      children: (
        <Table
          size='small'
          columns={deploymentColumns}
          dataSource={deployments}
          rowKey={record => record.metadata.name}
          pagination={false}
          locale={{ emptyText: 'Deployment가 없습니다' }}
        />
      ),
    },
    {
      key: 'services',
      label: (
        <span>
          <ApiOutlined />
          Service ({services.length})
        </span>
      ),
      children: (
        <Table
          size='small'
          columns={serviceColumns}
          dataSource={services}
          rowKey={record => record.metadata.name}
          pagination={false}
          locale={{ emptyText: 'Service가 없습니다' }}
        />
      ),
    },
    {
      key: 'ingresses',
      label: (
        <span>
          <GlobalOutlined />
          Ingress ({ingresses.length})
        </span>
      ),
      children: (
        <Table
          size='small'
          columns={ingressColumns}
          dataSource={ingresses}
          rowKey={record => record.metadata.name}
          pagination={false}
          locale={{ emptyText: 'Ingress가 없습니다' }}
        />
      ),
    },
  ];

  return (
    <>
      <Card
        size='small'
        title={
          <Space>
            <FileTextOutlined />
            <span>Kubernetes 리소스 관리</span>
            {namespace && <Tag color='cyan'>{namespace}</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Button
              size='small'
              icon={<ReloadOutlined />}
              onClick={fetchResources}
              loading={loading}
            >
              새로고침
            </Button>
            {/*  [운영모달] readOnly 모드에서는 리소스 추가 버튼 숨김 */}
            {!readOnly && (
              <Button
                size='small'
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleAddResource}
              >
                리소스 추가
              </Button>
            )}
          </Space>
        }
      >
        {error ? (
          <Alert
            message='리소스 조회 실패'
            description={error}
            type='error'
            showIcon
            action={
              <Button size='small' onClick={fetchResources}>
                다시 시도
              </Button>
            }
          />
        ) : loading &&
          !deployments.length &&
          !services.length &&
          !ingresses.length ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin tip='리소스를 불러오는 중...' />
          </div>
        ) : (
          <>
            {!namespace && (
              <Alert
                message='네임스페이스 정보를 찾을 수 없습니다'
                description='서비스에 네임스페이스가 설정되어 있는지 확인하세요.'
                type='warning'
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Tabs items={tabItems} />
          </>
        )}
      </Card>

      {/* YAML 편집/조회 모달 */}
      <Modal
        title={
          currentResource
            ? readOnly
              ? `${currentResource.type}/${currentResource.name} YAML 조회`
              : `${currentResource.type}/${currentResource.name} 편집`
            : '새 리소스 추가'
        }
        open={yamlModalVisible}
        onCancel={() => setYamlModalVisible(false)}
        onOk={readOnly ? () => setYamlModalVisible(false) : handleApplyYaml}
        okText={readOnly ? '닫기' : '적용'}
        cancelText={readOnly ? undefined : '취소'}
        cancelButtonProps={
          readOnly ? { style: { display: 'none' } } : undefined
        }
        width={800}
        confirmLoading={yamlLoading}
      >
        {yamlLoading && !yamlContent ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin tip='YAML을 불러오는 중...' />
          </div>
        ) : (
          <>
            <Alert
              message={readOnly ? 'YAML 조회' : 'YAML 편집'}
              description={
                readOnly
                  ? 'Kubernetes 리소스 YAML 내용입니다. (읽기 전용)'
                  : 'Kubernetes 리소스 YAML을 편집하고 적용하세요. 잘못된 YAML은 적용되지 않습니다.'
              }
              type='info'
              showIcon
              style={{ marginBottom: 16 }}
            />
            <TextArea
              value={yamlContent}
              onChange={e => setYamlContent(e.target.value)}
              placeholder='Kubernetes YAML 입력'
              autoSize={{ minRows: 20, maxRows: 30 }}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              readOnly={readOnly}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default K8sResourceManager;
