import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Divider,
  Space,
  Spin,
  message,
  Typography,
  TreeSelect,
} from 'antd';
import {
  ApiOutlined,
  ClusterOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { Device } from '../../../pages/devices/DeviceManagement';
import { deviceApi } from '../../../lib/api/devices';
import { SshHop } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { DataNode } from 'antd/es/tree';
interface AddNodeModalProps {
  titleInput?: string;
  visible: boolean;
  onClose?: () => void;
  onCancel?: () => void; // 호환성 지원
  onAdd?: (values: {
    server_type?: string;
    hops: { host: string; port: number; username: string; password: string }[];
    device_id: number;
  }) => void;
  onConfirm?: (values: {
    server_name?: string;
    hops: { host: string; port: number; username: string; password: string }[];
    server_id: number;
  }) => void;
  loading: boolean;
  initialNodeType?: 'ha' | 'master' | 'worker';
  servers?: Device[];
  server_type?: string;
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({
  titleInput,
  visible,
  onClose,
  onCancel,
  onAdd,
  onConfirm,
  loading,
  initialNodeType,
  server_type,
}) => {
  const [form] = Form.useForm();
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [_selectedDevice, setSelectedDevice] = useState<Device>(null);
  const [selectedDeviceHops, setSelectedDeviceHops] = useState<SshHop[]>(null);
  const { user } = useAuth();

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const getInstalledRuntime = async (deviceId: number) => {
    const response = await deviceApi.getInstalledRuntime(deviceId);
    const data = (response.data || []) as string[];
    return {
      ha: data.includes('ha'),
      master: data.includes('master'),
      worker: data.includes('worker'),
      docker: data.includes('docker'),
      podman: data.includes('podman'),
    };
  };

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      const response = (await deviceApi.getDevices(user.id)) as {
        data: Device[];
      };
      const devicesWithRuntime = await Promise.all(
        response.data.map(async device => {
          const runtimeInfo = await getInstalledRuntime(device.id);
          return {
            ...device,
            runtime_installed: runtimeInfo, // 위에서 만든 객체가 여기에 들어갑니다.
          };
        })
      );
      setDevices(devicesWithRuntime);
    } catch (error) {
      console.error('Failed to load devices:', error);
      message.error('장비 목록을 불러오는데 실패했습니다.');
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
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

  const mapTreeToTreeSelect = (
    devices: Device[],
    server_type: string
  ): DataNode[] => {
    return devices.map(d => {
      // 1. 설치된 런타임 목록을 텍스트 배열로 만들기
      const installedList: string[] = [];

      // d.runtime_installed가 없을 수도 있으므로 optional chaining(?.) 사용
      if (d.runtime_installed?.ha) installedList.push('HA');
      if (d.runtime_installed?.master) installedList.push('Master');
      if (d.runtime_installed?.worker) installedList.push('Worker');
      if (d.runtime_installed?.docker) installedList.push('Docker');
      if (d.runtime_installed?.podman) installedList.push('Podman');

      // 2. 목록이 존재하면 괄호나 쉼표로 묶어서 문자열 생성 (예: " [Docker, Worker]")
      const runtimeSuffix =
        installedList.length > 0 ? ` - [${installedList.join(', ')}]` : '';

      const disabled = runtimeSuffix.toLowerCase().includes(server_type);

      return {
        // 3. 기존 타이틀 뒤에 붙이기
        title: `${d.name} (${d.ipAddress}:${d.port})${runtimeSuffix}`,
        value: d.id,
        key: d.id,
        children: d.children
          ? mapTreeToTreeSelect(d.children, server_type)
          : [],
        disabled: disabled,
      };
    });
  };

  const handleDeviceChange = (deviceId: number) => {
    let device = devices.find(d => d.id === deviceId);
    try {
      const hops: SshHop[] = [];
      do {
        if (!device) break;
        hops.unshift({
          host: device.ipAddress || '',
          port: device.port ? parseInt(device.port.toString(), 10) : 22,
        });

        if (device.parentId) {
          device = devices.find(d => d.id === device.parentId) || null;
        } else {
          device = null;
        }
      } while (device);

      setSelectedDeviceHops(hops);
    } catch (error) {
      console.error(`서버 ${deviceId}의 정보 로드 실패:`, error);
      setSelectedDeviceHops([]);
    }
  };

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        hops: [{ host: '', port: 22, username: '', password: '' }],
      });
      void loadDevices();
      setSelectedDevice(null);
    }
  }, [visible, form]);

  const buildSshHopsFromServerId = (
    serverId: number,
    allServers: Device[]
  ): SshHop[] => {
    const hops: SshHop[] = [];
    let current = allServers.find(s => s.id === serverId);

    while (current) {
      hops.unshift({
        host: current.ipAddress || '',
        port: current.port ? parseInt(current.port.toString(), 10) : 22,
      });

      // 상위 서버(부모 서버)가 없으면 루프 종료
      if (!current.parentId) break;
      current = allServers.find(s => s.id === current.parentId);
    }

    return hops;
  };

  const handleSubmit = async () => {
    try {
      // server_id를 이용해서 hops 정보 생성
      const values = await form.validateFields();
      const hops = buildSshHopsFromServerId(values.device_id, devices);
      values.hops = hops;
      if (server_type != null) {
        values.server_type = server_type;
      }
      // onConfirm 우선 사용, 없으면 onAdd 사용
      if (onConfirm) {
        onConfirm(values);
      } else if (onAdd) {
        onAdd(values);
      }
      form.resetFields();
      (onClose || onCancel)?.();
    } catch (error) {
      console.error(error);
    }
  };

  const renderModalTitle = () => {
    let title = '';
    let icon = null;

    if (initialNodeType === undefined) {
      return <Space>{titleInput}</Space>;
    }

    switch (initialNodeType) {
      case 'ha':
        title = 'HA 노드 추가';
        icon = <ApiOutlined />;
        break;
      case 'master':
        title = '마스터 노드 추가';
        icon = <ClusterOutlined />;
        break;
      case 'worker':
        title = '워커 노드 추가';
        icon = <CloudServerOutlined />;
        break;
    }

    return (
      <Space>
        {icon} {title}
      </Space>
    );
  };

  return (
    <Modal
      title={renderModalTitle()}
      open={visible}
      onCancel={onClose || onCancel}
      confirmLoading={loading}
      onOk={handleSubmit}
      okText='추가'
      cancelText='취소'
      width={600}
    >
      <Form form={form} layout='vertical' autoComplete='off'>
        {(initialNodeType === 'master' || initialNodeType === 'worker') && (
          <Form.Item
            name='server_name'
            label='서버 이름'
            rules={[{ required: true, message: '서버 이름을 입력해주세요' }]}
          >
            <Input placeholder='관리할 서버의 고유한 이름' />
          </Form.Item>
        )}
        <Divider orientation='left' plain>
          SSH 접속 경로 (Hops)
        </Divider>
        <Form.Item
          name='device_id'
          label='장비 선택'
          rules={[{ required: true, message: '장비를 선택해주세요' }]}
        >
          <TreeSelect
            style={{ width: '100%' }}
            dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
            placeholder='장비를 선택해주세요'
            treeData={mapTreeToTreeSelect(buildTreeData(devices), server_type)}
            treeDefaultExpandAll={false}
            onChange={handleDeviceChange}
            loading={devicesLoading}
            notFoundContent={
              devicesLoading ? (
                <Spin size='small' />
              ) : (
                '사용 가능한 장비가 없습니다'
              )
            }
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

        {selectedDeviceHops?.length > 0 && (
          <div style={{ marginTop: '24px', marginBottom: '16px' }}>
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
              {selectedDeviceHops.map((hop: SshHop, index: number) => (
                <React.Fragment key={index}>
                  <div>
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
                        {index === selectedDeviceHops.length - 1
                          ? '최종 목적지'
                          : `Hop ${index + 1}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#333' }}>
                        {hop.host}: {hop.port}
                      </div>
                    </div>
                  </div>
                  {index < selectedDeviceHops.length - 1 && (
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
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default AddNodeModal;
