import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Form, Input, message, Select, Spin, Typography } from 'antd';
import { logger } from '../../utils/logger'; // logger 경로는 실제 프로젝트에 맞게 조정하세요.
import { deviceApi } from '../../lib/api/devices';
import { Device } from '../../pages/devices/DeviceManagement';
import { SshHop } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
const { Option } = Select;

interface AddServerModalProps {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onOk: (values: {
    name: string;
    hops: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>;
    server_id: number;
  }) => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({
  visible,
  loading,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [serverLoading, setServerLoading] = useState(false);
  const [servers, setServers] = useState<Device[]>([]);
  const [selectedServer, setSelectedServer] = useState<Device>(null);
  const [selectedServerHops, setSelectedServerHops] = useState<SshHop[]>(null);
  const { user } = useAuth();

  // 서버 목록 API 호출 | 설치 모달 오픈 시 호출
  const loadServers = useCallback(async () => {
    setServerLoading(true);
    try {
      const response = (await deviceApi.getDevices(user.id)) as {
        data: Device[];
      };
      setServers(response.data);
    } catch (_error) {
      message.error('서버 목록을 불러오는데 실패했습니다.');
      setServers([]);
    } finally {
      setServerLoading(false);
    }
  }, [user.id]);

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
        username: current.username || '',
        password: current.password || '',
      });

      // 상위 서버(부모 서버)가 없으면 루프 종료
      if (!current.parentId) break;
      current = allServers.find(s => s.id === current.parentId);
    }

    return hops;
  };

  const handleOk = async () => {
    try {
      const values = (await form.validateFields()) as {
        name: string;
        hops: {
          host: string;
          port: number;
          username: string;
          password: string;
        }[];
        server_id: number;
      };
      //  JSON.stringify 등 데이터 가공 로직을 모두 제거합니다.
      //  사용자가 입력한 순수한 values 객체를 그대로 전달합니다.
      const hops = buildSshHopsFromServerId(values.server_id, servers);
      values.hops = hops;
      onOk(values);
      form.resetFields();
    } catch (error) {
      logger.error('폼 검증 실패', error as Error);
    }
  };

  const handleServerChange = (serverId: number) => {
    let server = servers.find(s => s.id === serverId);
    setSelectedServer(server);
    form.setFieldValue('server_id', server.id);

    try {
      const hops: SshHop[] = [
        {
          host: server?.ipAddress || '',
          port: server?.port ? parseInt(server.port.toString(), 10) : 22,
          username: server?.username || '',
          password: server?.password || '',
        },
      ];
      while (server && server.parentId) {
        server = servers.find(s => s.id === server.parentId) || server;
        hops.unshift({
          host: server.ipAddress || '',
          port: server.port ? parseInt(server.port.toString(), 10) : 22,
          username: server.username || '',
          password: server.password || '',
        });
      }
      setSelectedServerHops(hops);
    } catch (_error) {
      setSelectedServerHops([]);
    }
  };

  useEffect(() => {
    void loadServers();
  }, [loadServers]);

  return (
    <Modal
      title='Nginx 서버 추가'
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText='추가'
      cancelText='취소'
      width={720} // 모달 넓이 확장
      destroyOnClose // 모달이 닫힐 때 폼 상태를 초기화
    >
      <Form
        form={form}
        layout='vertical'
        name='add_nginx_server_form'
        initialValues={{
          hops: [{ host: '', port: 22, username: 'root', password: '' }],
        }}
      >
        <Form.Item
          name='name'
          label='서버 이름'
          rules={[{ required: true, message: '서버 이름을 입력해주세요.' }]}
        >
          <Input placeholder='관리할 Nginx 서버의 고유한 이름 (예: nginx-proxy-01)' />
        </Form.Item>

        <Form.Item
          name='server_id'
          label='서버 선택'
          rules={[{ required: true, message: '서버를 선택해주세요' }]}
        >
          <Select
            placeholder='서버를 선택해주세요'
            onChange={handleServerChange}
            loading={serverLoading}
            notFoundContent={
              serverLoading ? (
                <Spin size='small' />
              ) : (
                '사용 가능한 서버가 없습니다. 장비를 먼저 등록해주세요.'
              )
            }
            value={selectedServer ? selectedServer.id : 0}
          >
            {servers.map(server => (
              <Option key={server.id} value={server.id}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {server.name} ({server.ipAddress})
                  </div>
                </div>
              </Option>
            ))}
          </Select>

          {/* SSH Connection Path Display and Editing */}
          {selectedServer && selectedServerHops.length > 0 && (
            <div style={{ marginTop: '24px', marginBottom: '16px' }}>
              <Typography.Text
                strong
                style={{ display: 'block', marginBottom: '12px' }}
              >
                SSH 연결 경로:
              </Typography.Text>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                }}
              >
                {selectedServerHops.map((hop: SshHop, index: number) => (
                  <div
                    key={index}
                    style={{
                      marginBottom:
                        index < selectedServerHops.length - 1 ? '16px' : '0',
                      padding: '12px',
                      backgroundColor: '#fff',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    >
                      Hop {index + 1}{' '}
                      {index === selectedServerHops.length - 1 &&
                        '(최종 목적지)'}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#666',
                          }}
                        >
                          호스트:
                        </span>
                        <Input
                          value={hop.host || ''}
                          onChange={e => {
                            const updatedHops = [...selectedServerHops];
                            updatedHops[index] = {
                              ...hop,
                              host: e.target.value,
                            };
                            setSelectedServerHops(updatedHops);
                          }}
                          placeholder='IP 주소 또는 도메인'
                          size='small'
                        />
                      </div>

                      <div>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#666',
                          }}
                        >
                          포트:
                        </span>
                        <Input
                          value={hop.port || ''}
                          onChange={e => {
                            const updatedHops = [...selectedServerHops];
                            updatedHops[index] = {
                              ...hop,
                              port: Number(e.target.value),
                            };
                            setSelectedServerHops(updatedHops);
                          }}
                          placeholder='22'
                          size='small'
                          type='number'
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginTop: '12px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#666',
                          }}
                        >
                          사용자명:
                        </span>
                        <Input
                          value={hop.username || ''}
                          onChange={e => {
                            const updatedHops = [...selectedServerHops];
                            updatedHops[index] = {
                              ...hop,
                              username: e.target.value,
                            };
                            setSelectedServerHops(updatedHops);
                          }}
                          placeholder='root'
                          size='small'
                        />
                      </div>

                      <div>
                        <span
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#666',
                          }}
                        >
                          비밀번호:
                        </span>
                        <Input.Password
                          value={hop.password || ''}
                          onChange={e => {
                            const updatedHops = [...selectedServerHops];
                            updatedHops[index] = {
                              ...hop,
                              password: e.target.value,
                            };
                            setSelectedServerHops(updatedHops);
                          }}
                          placeholder='비밀번호'
                          size='small'
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SSH info warning for servers without hops */}
          {selectedServer && selectedServerHops.length === 0 && (
            <div
              style={{
                marginTop: '24px',
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '6px',
              }}
            >
              <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
                ⚠️ 선택된 서버에 SSH 접속 정보가 설정되지 않았습니다.
              </Typography.Text>
            </div>
          )}
        </Form.Item>

        {/* <Form.List name="hops">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Tag>Hop {index + 1}</Tag>
                  <Form.Item
                    {...restField}
                    name={[name, 'host']}
                    rules={[{ required: true, message: '호스트 IP 또는 도메인을 입력하세요' }]}
                    style={{ width: '220px' }}
                  >
                    <Input placeholder="호스트 IP 또는 도메인" />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'username']}
                    rules={[{ required: true, message: '사용자 이름을 입력하세요' }]}
                    style={{ width: '150px' }}
                  >
                    <Input prefix={<UserOutlined />} placeholder="사용자 이름 (예: root)" />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'port']}
                    rules={[{ required: true, message: '포트를 입력하세요' }]}
                  >
                    <InputNumber placeholder="22" style={{ width: '80px' }} />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'password']}
                    rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
                    style={{ width: '150px' }}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
                  </Form.Item>

                  {fields.length > 1 ? (
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  ) : null}
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ host: '', port: 22, username: 'root', password: '' })} block icon={<PlusOutlined />}>
                  경유 서버(Hop) 추가
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List> */}
      </Form>
    </Modal>
  );
};

export default AddServerModal;
