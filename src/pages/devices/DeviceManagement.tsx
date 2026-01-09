import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Tooltip,
  message,
  Row,
  Col,
  Progress,
  Tag,
  Divider,
  InputNumber,
  TreeSelect,
  Typography,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownOutlined,
  RightOutlined,
  DockerOutlined,
  KubernetesOutlined,
  CloudServerOutlined,
  LaptopOutlined,
  ClusterOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import './DeviceManagement.css';
import { awxApi } from '../../lib/api/awx';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { deviceApi } from '../../lib/api/devices';
import { DataNode } from 'antd/es/tree';
import { SshHop } from '@/lib/api';

// Device 관련 타입들
export interface Device {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  location: string;
  os: string;
  cpu: number;
  memory: number;
  disk: number;
  description?: string;
  organization_id: number;
  children?: [];

  parentId?: number;
  runtime_cluster?: {
    docker?: {
      installed: boolean;
      running: boolean;
    };
    kubernetes?: {
      node: boolean;
      role: string;
    };
    podman?: {
      installed: boolean;
      running: boolean;
    };
  };
  runtime_installed?: {
    ha?: boolean;
    master?: boolean;
    worker?: boolean;
    docker?: boolean;
    podman?: boolean;
  };

  awxHostId?: number;
}

interface AwxResponse {
  data: {
    awx_job_result: {
      hosts_data: HostData[];
    };
  };
}

interface HostData {
  target_host: string;
  server_details: ServerDetails;
}

interface ServerDetails {
  hostname: string;
  os: {
    architecture: string;
    kernel: string;
    name: string;
    version: string;
  };
  uptime: string;
  cpu: {
    cores: number;
    model: string;
    threads_per_core: number;
    usage_percent: string;
  };
  memory: {
    total: string;
    used: string;
    free: string;
    used_percent: string;
  };
  disks: {
    total: string;
    used: string;
    available: string;
    used_percent: string;
  };
  runtime_cluster?: {
    docker?: {
      installed: boolean;
      running: boolean;
    };
    kubernetes?: {
      node: boolean;
      role: string;
    };
    podman?: {
      installed: boolean;
      running: boolean;
    };
  };
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]); // 장비 목록
  const [loading, setLoading] = useState(false); // 로딩 상태 (for 장비 목록 반환 대기)
  const [modalVisible, setModalVisible] = useState(false); // 모달 상태
  const [detailModalVisible, setDetailModalVisible] = useState(false); // 상세보기 모달 상태
  const [infoLoading, setInfoLoading] = useState(false); // 상세보기 로딩 상태 (for playbook 반환 대기)
  const [selectedDevice, setSelectedDevice] = useState<Device>(null); // 장비 상세 보기를 위해 선택된 장비
  const [editingDevice, setEditingDevice] = useState<Device | null>(null); // 장비 수정을 위해 선택된 장비
  const [expanded, setExpanded] = useState(false); // 장비 추가 모달의 확장 상태
  const [parentDevice, setParentDevice] = useState<Device>(null); // 상위 장비
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { selectedOrgId, isLoading: orgLoading } = useOrganization();

  const scrollRef = useRef<HTMLDivElement>(null);

  // 장비 목록 로드 (기관별 필터링)
  const loadDevices = useCallback(async () => {
    if (orgLoading) return; // 기관 로딩 중이면 대기

    setLoading(true);
    try {
      const response = (await deviceApi.getDevices(user.id, selectedOrgId)) as {
        data: Device[];
      };

      setDevices(response.data);
    } catch (error) {
      console.error(error);
      message.error('장비 목록을 불러오는데 실패했습니다.');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [user.id, selectedOrgId, orgLoading]);

  // 상세보기
  const handleViewDevice = async (device: Device) => {
    setInfoLoading(true);
    try {
      message.info(
        `장비: ${device.ipAddress}의 상세 정보를 불러오는 중입니다...`
      );
      const response = (await awxApi.runPlaybook({
        playbook_to_run: 'get_serverInfo',
        hops: [
          { host: device.ipAddress, port: 22, username: '', password: '' },
        ],
        awxTemplate: user?.awx_template || 0,
      })) as AwxResponse;
      const responseData = response.data.awx_job_result.hosts_data;

      device.os = responseData[0].server_details.os.name;
      device.cpu = parseFloat(
        responseData[0].server_details.cpu.usage_percent.replace('%', '')
      );
      device.memory = parseFloat(
        responseData[0].server_details.memory.used_percent.replace('%', '')
      );
      device.disk = parseFloat(
        responseData[0].server_details.disks.used_percent.replace('%', '')
      );
      device.runtime_cluster = responseData[0].server_details.runtime_cluster;

      setSelectedDevice(device);
      message.info(`장비: ${device.ipAddress}의 상세 정보를 불러왔습니다.`);
    } catch (error) {
      console.error(error);
      message.error('장비 상세 정보를 불러오는데 실패했습니다.');
    }
    setInfoLoading(false);
  };

  // 장비 추가 모달 열기
  const openAddModal = () => {
    setEditingDevice(null);
    form.resetFields();
    setParentDevice(null);
    setModalVisible(true);
  };

  // 장비 수정 모달 열기
  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    form.setFieldsValue(device);
    const parentDevice = devices.find(d => d.id == device.parentId);
    if (parentDevice) {
      setParentDevice(parentDevice);
      form.setFieldsValue({
        parentDevice: {
          ipAddress: parentDevice.ipAddress,
          port: parentDevice.port,
        },
      });
    }
    setModalVisible(true);
  };

  const getHops = (values: Device) => {
    const hops = [];
    let current: Device | undefined = values;
    while (current) {
      hops.push({
        host: current.ipAddress,
        port: Number(current.port),
      });

      if (!current.parentId) break;
      current = devices.find(d => d.id === current.parentId);
    }
    return hops.reverse();
  };

  // 장비 추가/수정
  const handleModalOk = async () => {
    try {
      const values: Device = (await form.validateFields()) as Device;
      if (editingDevice) {
        // 수정
        values.id = editingDevice.id;
        await deviceApi.modDevice(values);

        setDevices(
          devices.map(d =>
            d.id === editingDevice.id ? { ...d, ...values } : d
          )
        );
        message.success('장비 정보가 수정되었습니다.');
      } else {
        // 추가
        const hops = getHops(values);
        const response = (await awxApi.addHost(
          hops,
          user.awx_inventory,
          user.awx_template
        )) as {
          data: {
            id: number;
          };
          message: string;
          success: boolean;
        };

        const newDevice: Device = {
          ...values,
          organization_id: user.organization_id,
          awxHostId: Number(response.data.id),
        };

        const newId = (await deviceApi.addDevice(newDevice)) as {
          success: boolean;
          data: {
            id: number;
            name: string;
          };
        };

        newDevice.id = newId.data.id;
        newDevice.name = newId.data.name;
        setDevices([...(devices || []), newDevice]);
        message.success('새 장비가 추가되었습니다.');
      }
      setModalVisible(false);
    } catch (error) {
      console.error(error);
    }
  };

  // 장비 제거
  const handleDeleteDevice = (deviceId: number) => {
    Modal.confirm({
      title: '장비 삭제',
      content: '정말로 이 장비를 삭제하시겠습니까?',
      okText: '삭제',
      cancelText: '취소',
      onOk: async () => {
        const awxHostId = devices.find(d => d.id === deviceId).awxHostId;
        if (awxHostId !== 0) {
          await awxApi.removeHost(awxHostId);
        }
        await deviceApi.delDevice(deviceId);
        setDevices(devices.filter(d => d.id !== deviceId));
        message.success('장비가 삭제되었습니다.');
      },
    });
  };

  // 상위 장비 선택
  const handleSelectParentDevice = (parentId: number) => {
    if (parentId === 0) {
      setParentDevice(null);
      form.setFieldsValue({
        parentId: null,
        parentDevice: undefined,
      });
      return;
    }
    const device = devices.find(d => d.id == parentId);
    setParentDevice(device);
    form.setFieldsValue({
      parentId: device.id,
      parentDevice: {
        ipAddress: device.ipAddress,
        port: device.port,
      },
    });
  };

  // 장비 목록을 계층 구조로 전환
  const buildTreeData = (devices: Device[]): Device[] => {
    if (!devices) return;
    const map = new Map<number, Device & { children?: Device[] }>();

    devices.forEach(d => {
      map.set(d.id, { ...d, children: [] });
    });

    const tree: Device[] = [];
    map.forEach(device => {
      if (device.parentId) {
        const parent = map.get(device.parentId);
        if (parent) {
          parent.children?.push(device);
        }
      } else {
        tree.push(device);
      }
    });

    return tree;
  };

  const mapTreeToTreeSelect = (devices: Device[]): DataNode[] => {
    return devices.map(d => ({
      title: `${d.name} (${d.ipAddress}:${d.port})`,
      value: d.id,
      key: d.id,
      children: d.children ? mapTreeToTreeSelect(d.children) : [],
    }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault(); // 세로 스크롤 막기
      scrollRef.current.scrollLeft += e.deltaY; // 세로 휠 → 가로 이동
    }
  };

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const columns = [
    {
      title: '장비명',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      ellipsis: true,
    },
    {
      title: 'IP 주소',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: '20%',
      ellipsis: true,
      render: (ipAddress: string) => {
        return (
          <Space>
            <Tag>{ipAddress}</Tag>
          </Space>
        );
      },
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
      width: '20%',
      ellipsis: true,
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      width: '25%',
      ellipsis: true,
    },
    {
      title: '작업',
      key: 'actions',
      width: '10%',
      render: (_: unknown, record: Device) => (
        <Space size='small'>
          <Tooltip title='상세보기'>
            <Button
              type='text'
              icon={<EyeOutlined />}
              size='small'
              onClick={() => {
                void handleViewDevice(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title='수정'>
            <Button
              type='text'
              icon={<EditOutlined />}
              size='small'
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title='삭제'>
            <Button
              type='text'
              icon={<DeleteOutlined />}
              size='small'
              danger
              onClick={() => handleDeleteDevice(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 통계 계산
  // 최상위 장비 (parentId가 없는 장비들)
  const rootDevices = devices.filter(d => !d.parentId);

  // 점프 서버: 다른 장비의 parentId로 참조되는 최상위 장비 (예: gateway, worker12, test)
  const jumpServerIds = new Set(
    devices.filter(d => d.parentId).map(d => d.parentId)
  );
  const jumpServers = rootDevices.filter(d => jumpServerIds.has(d.id)).length;

  // 단일 서버: 최상위 장비 중 점프 서버가 아닌 독립적인 서버 (예: testtest)
  const standaloneServers = rootDevices.length - jumpServers;

  return (
    <div className='device-management management-page'>
      {/* 페이지 헤더 */}
      <div className='page-header'>
        <div className='page-header-title'>
          <LaptopOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <div>
            <h1>장비 관리</h1>
            <div className='page-header-description'>
              서버 및 장비 목록을 관리합니다
            </div>
          </div>
        </div>
        <div className='page-header-actions'>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDevices}
            loading={loading}
          >
            새로고침
          </Button>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => openAddModal()}
          >
            장비 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <Row gutter={16} className='stats-row'>
        <Col xs={24} sm={8}>
          <div className='stat-card'>
            <Space align='start'>
              <div className='stat-card-icon blue'>
                <CloudServerOutlined />
              </div>
              <Statistic title='전체 장비' value={devices.length} suffix='대' />
            </Space>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className='stat-card'>
            <Space align='start'>
              <div className='stat-card-icon green'>
                <ClusterOutlined />
              </div>
              <Statistic title='점프 서버' value={jumpServers} suffix='대' />
            </Space>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className='stat-card'>
            <Space align='start'>
              <div className='stat-card-icon orange'>
                <DesktopOutlined />
              </div>
              <Statistic
                title='단일 서버'
                value={standaloneServers}
                suffix='대'
              />
            </Space>
          </div>
        </Col>
      </Row>

      {/* 장비 목록 */}
      <Card
        className='main-card'
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#1890ff' }} />
            <span>장비 목록</span>
            <Tag color='blue'>{devices.length}대</Tag>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={buildTreeData(devices)}
          rowKey={(record, index) => record.id || `row-${index}`}
          loading={loading}
          expandable={{
            expandIcon: ({ expanded, onExpand, record }) => {
              if (!record.children || record.children.length === 0) {
                return (
                  <span style={{ display: 'inline-block', width: 28 }}></span>
                );
              }
              return expanded ? (
                <Space>
                  <DownOutlined
                    onClick={e => onExpand(record, e)}
                    style={{ color: '#1890ff', fontSize: 16 }}
                  />
                  &nbsp;
                </Space>
              ) : (
                <Space>
                  <RightOutlined
                    onClick={e => onExpand(record, e)}
                    style={{ color: '#1890ff', fontSize: 16 }}
                  />
                  &nbsp;
                </Space>
              );
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total}개 장비`,
          }}
        />
      </Card>

      {/* 장비 추가/수정 모달 */}
      <Modal
        title={editingDevice ? '장비 정보 수정' : '새 장비 추가'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        okText={editingDevice ? '수정' : '추가'}
        cancelText='취소'
        width={600}
      >
        <Form form={form} layout='vertical'>
          <Divider>장비 정보</Divider>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name='parentId'
                label='상위 장비 ID'
                tooltip='이 장비에 접근하기 위한 상위 장비를 선택하세요. (없을 경우 빈칸으로 두세요)'
              >
                <TreeSelect
                  style={{ width: '100%' }}
                  value={selectedDevice?.id}
                  dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
                  placeholder='상위 장비 선택'
                  treeData={mapTreeToTreeSelect(buildTreeData(devices))}
                  treeDefaultExpandAll={false}
                  onChange={handleSelectParentDevice}
                  showSearch
                  filterTreeNode={(input, treeNode) => {
                    const title = treeNode.title;
                    if (typeof title === 'string') {
                      return title.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {parentDevice && (
            <div style={{ marginBottom: '16px' }}>
              <Typography.Text
                strong
                style={{ display: 'block', marginBottom: '12px' }}
              >
                SSH 연결 경로:
              </Typography.Text>
              <div
                ref={scrollRef}
                onWheel={handleWheel}
                style={{
                  padding: '16px',
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                {getHops(parentDevice).map((hop: SshHop, index: number) => (
                  <>
                    <div key={index}>
                      <div
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#fff',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px',
                          minWidth: '150px',
                          marginBottom: '8px',
                        }}
                      >
                        <div
                          style={{
                            marginBottom: '6px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                          }}
                        >
                          {`Hop ${index + 1}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#333' }}>
                          {hop.host}: {hop.port}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        margin: '0 12px',
                        fontSize: '18px',
                        color: '#52c41a',
                        fontWeight: 'bold',
                      }}
                    >
                      ➜
                    </span>
                  </>
                ))}
              </div>
            </div>
          )}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name='name'
                label='장비명'
                tooltip='장비를 구분하기 위한 별칭을 입력하세요.'
                rules={[{ required: true, message: '장비명을 입력해주세요' }]}
              >
                <Input placeholder='장비명을 입력하세요' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='ipAddress'
                label='IP 주소'
                rules={[{ required: true, message: 'IP 주소를 입력해주세요' }]}
              >
                <Input placeholder='192.168.1.100' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='port'
                label='포트'
                rules={[{ required: true, message: '포트를 입력해주세요' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder='22' />
              </Form.Item>
            </Col>
          </Row>

          <Divider
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              textAlign: 'center',
            }}
          >
            <Space
              onClick={() => setExpanded(!expanded)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpanded(!expanded);
                }
              }}
              role='button'
              tabIndex={0}
            >
              {expanded ? '숨기기 ▲' : '더보기 ▼'}
            </Space>
          </Divider>
          {expanded && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='location' label='위치'>
                  <Input placeholder='서울 본사' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='description' label='설명'>
                  <Input placeholder='장비에 대한 설명' />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>

      {/* 상세보기 모달 */}
      <Modal
        title={
          selectedDevice
            ? `${selectedDevice?.name} (${selectedDevice?.ipAddress}) 장비 정보`
            : `장비 정보 로딩 중`
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedDevice(null);
        }}
        loading={infoLoading}
        footer={[]}
        width={600}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Card title='cpu'>
              <Progress percent={selectedDevice?.cpu} size='small' showInfo />
            </Card>
          </Col>
          <Col span={8}>
            <Card title='memory'>
              <Progress
                percent={selectedDevice?.memory}
                size='small'
                showInfo
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title='disk'>
              <Progress percent={selectedDevice?.disk} size='small' showInfo />
            </Card>
          </Col>
        </Row>
        <Card title='설치된 런타임 목록'>
          <Space direction='vertical' style={{ width: '100%' }}>
            {/* Docker */}
            {selectedDevice?.runtime_cluster?.docker?.installed && (
              <div>
                <Tag
                  color={
                    selectedDevice?.runtime_cluster?.docker?.installed
                      ? selectedDevice?.runtime_cluster?.docker?.running
                        ? 'green'
                        : 'default'
                      : 'default'
                  }
                  icon={<DockerOutlined />}
                  style={{ marginRight: 8 }}
                >
                  Docker
                  {selectedDevice?.runtime_cluster?.docker?.running
                    ? ' (실행 중)'
                    : ' (중지)'}
                </Tag>
              </div>
            )}
            {/* Kubernetes */}
            {selectedDevice?.runtime_cluster?.kubernetes?.node !== false && (
              <div>
                <Tag
                  color={
                    selectedDevice?.runtime_cluster?.kubernetes?.role.trim() !==
                    'master'
                      ? 'blue'
                      : 'default'
                  }
                  icon={<KubernetesOutlined />}
                  style={{ marginRight: 8 }}
                >
                  Kubernetes
                  {`(${selectedDevice?.runtime_cluster?.kubernetes?.role?.trim() || '알 수 없음'})`}
                </Tag>
              </div>
            )}
            {/* Podman */}
            {selectedDevice?.runtime_cluster?.podman?.installed && (
              <div>
                <Tag
                  color={
                    selectedDevice?.runtime_cluster?.podman?.installed
                      ? selectedDevice?.runtime_cluster?.podman?.running
                        ? 'green'
                        : 'default'
                      : 'default'
                  }
                  icon={<CloudServerOutlined />}
                  style={{ marginRight: 8 }}
                >
                  Podman
                  {selectedDevice?.runtime_cluster?.podman?.running
                    ? ' (실행 중)'
                    : ' (중지)'}
                </Tag>
              </div>
            )}
          </Space>
        </Card>
      </Modal>
    </div>
  );
};

export default DeviceManagement;
