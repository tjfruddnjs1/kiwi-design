import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  message,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Spin,
  Table,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
// import { api } from '../../services/api';
import { deviceApi } from '../../lib/api/devices';
import { awxApi, backupApi, SshHop } from '../../lib/api';
import { SshAuthHop } from '../../types/backup';
import { useAuth } from '../../context/AuthContext';
import { useBackupAuthHandler } from '../../pages/backup/BackupAuthHandler';
import { Device } from '../../pages/devices/DeviceManagement';
import { InfraWithNodes } from '../../types';

interface InfraMinIOSettingProps {
  infra: InfraWithNodes;
}
const { Option } = Select;

interface MinioStorage {
  id: number;
  infra_id: number;
  server_id: number;
  name?: string;
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket: string;
  created_at: string;
  updated_at: string;
}

interface MinIOInstallForm {
  id?: number;
  infra_id: number;
  server_id: number;
  endpoint: string;
  name: string;
  minioPort: number;
  consolePort: number;
  accessKey: string;
  secretKey: string;
}

interface BucketConfigForm {
  bucket_name: string;
}

const InfraMinioSetting: React.FC<InfraMinIOSettingProps> = ({ infra }) => {
  const [minioStorages, setMinioStorages] = useState<MinioStorage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInstallModalVisible, setIsInstallModalVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Infrastructure and Server management
  const [servers, setServers] = useState<Device[]>([]);
  const [selectedServer, setSelectedServer] = useState<Device | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  // SSH hop management
  const [selectedServerHops, setSelectedServerHops] = useState<SshHop[]>([]);

  // 버킷 설정 모달 관련 상태
  const [isBucketModalVisible, setIsBucketModalVisible] = useState(false);
  const [selectedMinioStorage, setSelectedMinioStorage] =
    useState<MinioStorage | null>(null);

  const [setupForm] = Form.useForm();
  const [bucketForm] = Form.useForm();

  const { user } = useAuth();

  // Initialize data on component mount
  useEffect(() => {
    void loadMinioStorages();
    void loadServers();
  }, []);

  // MinIO 저장소 불러오기 (DB의 backup_storage 테이블로부터 MinIO 타입의 환경을 불러옴) | 첫 랜더링/설치/버킷설정/삭제 시 호출
  const loadMinioStorages = async () => {
    setLoading(true);
    try {
      const response = await backupApi.getEnvironments('minio');

      setMinioStorages(response.data as MinioStorage[]);
    } catch (error) {
      message.error('MinIO 저장소 목록을 불러오는데 실패했습니다.', error);
    } finally {
      setLoading(false);
    }
  };

  // 서버 목록 API 호출 | 설치 모달 오픈 시 호출
  const loadServers = async () => {
    setServerLoading(true);
    try {
      const response = (await deviceApi.getDevices(user.id)) as {
        data: Device[];
      };
      setServers(response.data);
    } catch (error) {
      message.error('서버 목록을 불러오는데 실패했습니다.', error);
      setServers([]);
    } finally {
      setServerLoading(false);
    }
  };

  // 서버 선택 시 호출
  const handleServerChange = async (serverId: number) => {
    let server = servers.find(s => s.id === serverId);
    setSelectedServer(server || null);

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
    } catch {
      setSelectedServerHops([]);
    }
  };

  const { requestNamespaceAuth, AuthModal } = useBackupAuthHandler({
    onAuthSuccess: (
      authData: SshAuthHop[],
      purpose: string,
      formData?: unknown
    ) => {
      if (purpose === 'minio_install') {
        void handleMinioInstallAuthSuccess(
          authData,
          formData as MinIOInstallForm
        );
      } else if (purpose === 'minio_uninstall') {
        void handleDeleteStorageAuthSuccess(authData, formData as MinioStorage);
      } else if (purpose === 'bucket_config') {
        void handleBucketConfigAuthSuccess(
          authData,
          formData as BucketConfigForm
        );
      }
    },
    onAuthCancel: () => {
      setIsInstalling(false);
      setIsDeleting(false);
    },
  });

  // Open install modal
  const openInstallModal = () => {
    setSelectedServer(null);
    setSelectedServerHops([]);
    setupForm.resetFields();
    setIsInstallModalVisible(true);
  };

  // MinIO 설치
  const handleInstallMinIO = async (values: MinIOInstallForm) => {
    try {
      setIsInstalling(true);
      const installData = {
        ...values,
        infra_id: infra.id,
        endpoint:
          selectedServerHops.length > 0
            ? `${selectedServerHops[selectedServerHops.length - 1].host}:${values.minioPort}`
            : '',
        server_id: selectedServer.id,
        sshHops: selectedServerHops,
        type: 'minio',
        status: 'active',
        access_key: values.accessKey,
        secret_key: values.secretKey,
        minioPort: values.minioPort,
        consolePort: values.consolePort,
      };

      message.success('MinIO 설치가 시작되었습니다.');
      setIsInstallModalVisible(false);
      setupForm.resetFields();
      setSelectedServer(null);
      setSelectedServerHops([]);

      if (installData.sshHops.length > 0) {
        requestNamespaceAuth(installData.sshHops, 'minio_install', installData);
      } else {
        await handleMinioInstallAuthSuccess([], installData);
      }
      setIsInstalling(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      message.error(`MinIO 설치에 실패했습니다: ${errorMessage}`);
      setIsInstalling(false);
    }
  };

  // MinIO 설치 인증 후 처리
  const handleMinioInstallAuthSuccess = async (
    hops: SshAuthHop[],
    installData: MinIOInstallForm
  ) => {
    const _response = await awxApi.runPlaybook({
      playbook_to_run: 'install_minio',
      hops: hops,
      awxTemplate: user?.awx_template || 0,
      access_key: installData.accessKey,
      secret_key: installData.secretKey,
      minio_port: installData.minioPort,
      console_port: installData.consolePort,
    });

    const existingEnv = await backupApi.getMinIOByInfraId(
      infra.id,
      installData.endpoint
    );
    if (existingEnv) {
      installData.id = existingEnv.id;
      void backupApi.updateBackupStorage(installData);
    } else {
      void backupApi.createBackupStorage(installData);
    }

    setTimeout(() => {
      void loadMinioStorages();
    }, 2000);
    setIsInstalling(false);
    setIsDeleting(false);
  };

  // MinIO 저장소 삭제
  const handleDeleteStorage = async (storage: MinioStorage) => {
    setIsDeleting(true);
    try {
      let server = servers.find(s => s.id === storage.server_id);
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

      if (hops.length > 0) {
        requestNamespaceAuth(hops, 'minio_uninstall', storage);
      } else {
        await handleDeleteStorageAuthSuccess([], storage);
      }
    } catch (error) {
      message.error('MinIO 저장소 삭제 중 오류가 발생했습니다.', error);
      setIsDeleting(false);
    }
  };

  // MinIO 삭제 인증 후 처리
  const handleDeleteStorageAuthSuccess = async (
    hops: SshAuthHop[],
    storage: MinioStorage
  ) => {
    try {
      hops.map(h => ({ host: h.host, username: h.username }));
      message.success(
        `${storage.name || `minio-env-${storage.id}`} 저장소 삭제가 시작되었습니다.`
      );

      const response = await awxApi.runPlaybook({
        playbook_to_run: 'uninstall_minio',
        hops: hops,
        awxTemplate: user?.awx_template || 0,
      });

      if (response.success) {
        // DB에서 컬럼 삭제
        await backupApi.deleteEnvironment(storage.id);

        message.success(`${storage.name} 저장소가 삭제되었습니다.`);
        void loadMinioStorages();
        setIsDeleting(false);
      } else {
        message.error('MinIO 저장소 삭제에 실패했습니다.');
      }
    } catch (error) {
      message.error('MinIO 저장소 삭제에 실패했습니다.', error);
      setIsDeleting(false);
    }
  };

  // MinIO 버킷 설정 모달 열기
  const bucketConnection = async (storage: MinioStorage) => {
    setSelectedMinioStorage(storage);
    setIsBucketModalVisible(true);

    // 기존 정보로 폼 초기화
    bucketForm.setFieldsValue({
      bucketName: storage.bucket || '',
      accessKey: storage.access_key || '',
      secretKey: storage.secret_key || '',
    });
  };

  // MinIO 버킷 설정 저장
  const handleBucketConfiguration = async (values: BucketConfigForm) => {
    try {
      if (!selectedMinioStorage) return;

      const data = {
        bucket_name: values.bucket_name,
      };

      let server = servers.find(s => s.id === selectedMinioStorage.server_id);
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

      if (hops.length > 0) {
        requestNamespaceAuth(hops, 'bucket_config', data);
      } else {
        await handleBucketConfigAuthSuccess([], data);
      }
    } catch (error) {
      message.error('버킷 설정에 실패했습니다.', error);
    }
  };

  // MinIO 버킷 설정 인증 후 처리
  const handleBucketConfigAuthSuccess = async (
    hops: SshAuthHop[],
    formData: BucketConfigForm
  ) => {
    // MinIO 버킷 설정 API 호출
    await awxApi.runPlaybook({
      playbook_to_run: 'configure_minio_buckets',
      hops: hops,
      awxTemplate: user?.awx_template || 0,
      bucket_name: formData.bucket_name,
    });

    // DB에 버킷 정보 업데이트
    const updateData = {
      id: selectedMinioStorage.id,
      bucket: formData.bucket_name,
    };
    await backupApi.updateBucket(updateData);

    message.success('MinIO 버킷 설정이 저장되었습니다.');

    setIsBucketModalVisible(false);
    bucketForm.resetFields();
    setSelectedMinioStorage(null);

    // 목록 새로고림
    void loadMinioStorages();
  };

  // MinIO 저장소 테이블 컬럼 정의
  const minioStorageColumns = [
    {
      title: '저장소 이름',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ fontWeight: 'bold' }}>{name}</span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'success', text: '활성' },
          installing: { color: 'processing', text: '설치 중' },
          failed: { color: 'error', text: '실패' },
          inactive: { color: 'default', text: '비활성' },
        };
        const config =
          statusConfig[status as keyof typeof statusConfig] ||
          statusConfig.inactive;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '엔드포인트',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (endpoint: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{endpoint}</span>
      ),
    },
    {
      title: '버킷 정보',
      key: 'bucket_info',
      render: (_: unknown, record: MinioStorage) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
            {record.bucket}
          </div>
        </div>
      ),
    },
    // {
    //   title: '액세스 키',
    //   dataIndex: 'access_key',
    //   key: 'access_key',
    //   render: (accessKey: string) => (
    //     <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#666' }}>
    //       {accessKey ? `${accessKey.substring(0, 8)}...` : 'N/A'}
    //     </span>
    //   ),
    // },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <div style={{ fontSize: '13px' }}>
          {new Date(date).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ),
    },
    {
      title: '수정일',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => (
        <div style={{ fontSize: '13px' }}>
          {new Date(date).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: unknown, record: MinioStorage) => (
        <Space>
          <Button
            size='small'
            icon={<LinkOutlined />}
            onClick={() => bucketConnection(record)}
            title='버킷 설정'
          ></Button>
          <Button
            size='small'
            danger
            icon={<DeleteOutlined />}
            disabled={isDeleting}
            onClick={() => {
              Modal.confirm({
                title: 'MinIO 저장소 삭제',
                content: `${record.name} 저장소를 삭제하시겠습니까?`,
                onOk: () => handleDeleteStorage(record),
              });
            }}
            title={isDeleting ? '삭제 중...' : '삭제'}
          ></Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* 새 minIO 설치 버튼 */}
      <Card style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              MinIO 설치
            </Typography.Title>
            <Typography.Text type='secondary'>
              서버에 MinIO 객체 스토리지를 설치할 수 있습니다.
            </Typography.Text>
          </div>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={openInstallModal}
            loading={isInstalling}
            disabled={isInstalling}
          >
            MinIO 설치
          </Button>
        </div>
      </Card>

      {/* MinIO 환경 목록 */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            MinIO 저장소 목록
          </Typography.Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void loadMinioStorages()}
          >
            새로고침
          </Button>
        </div>
        <Table
          columns={minioStorageColumns}
          dataSource={minioStorages}
          loading={loading}
          rowKey='id'
          size='small'
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MinIO 설치 모달 */}
      <Modal
        title='MinIO 설치'
        open={isInstallModalVisible}
        onCancel={() => {
          setIsInstallModalVisible(false);
          setupForm.resetFields();
          setSelectedServer(null);
          setSelectedServerHops([]);
        }}
        footer={null}
        width={700}
      >
        <Form form={setupForm} layout='vertical' onFinish={handleInstallMinIO}>
          {/* Storage Name - First input */}
          <Form.Item
            label='저장소 이름'
            name='name'
            rules={[
              {
                required: true,
                message: '저장소를 구분할 이름을 입력해 주세요',
              },
            ]}
          >
            <Input placeholder='예: production-storage, backup-minio' />
          </Form.Item>

          {/* Server Selection */}
          <Form.Item
            label='설치 서버 선택'
            name='serverId'
            rules={[
              {
                required: true,
                message: 'MinIO를 설치할 서버를 선택해 주세요',
              },
            ]}
          >
            <Select
              placeholder='서버를 선택해 주세요'
              onChange={handleServerChange}
              loading={serverLoading}
              notFoundContent={
                serverLoading ? (
                  <Spin size='small' />
                ) : (
                  '사용 가능한 서버가 없습니다. [장비 관리] 탭에서 장비를 먼저 등록해주세요.'
                )
              }
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
          </Form.Item>

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

          {/* Installation Configuration Fields - only show when server is selected */}
          {selectedServer && (
            <>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                  label='access Key'
                  name='accessKey'
                  style={{ flex: 1 }}
                  rules={[
                    { required: true, message: 'access Key를 입력해 주세요' },
                  ]}
                  initialValue={'minioadmin'}
                >
                  <Input style={{ width: '100%' }} placeholder='minioadmin' />
                </Form.Item>

                <Form.Item
                  label='secret Key'
                  name='secretKey'
                  style={{ flex: 1 }}
                  rules={[
                    { required: true, message: 'secret Key를 입력해 주세요' },
                  ]}
                  initialValue={'minioadmin'}
                >
                  <Input style={{ width: '100%' }} placeholder='minioadmin' />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                  label='MinIO 포트'
                  name='minioPort'
                  style={{ flex: 1 }}
                  rules={[
                    { required: true, message: 'MinIO 포트를 입력해 주세요' },
                  ]}
                  initialValue={9000}
                >
                  <InputNumber
                    min={1}
                    max={65535}
                    style={{ width: '100%' }}
                    placeholder='9000'
                  />
                </Form.Item>

                <Form.Item
                  label='웹 콘솔 포트'
                  name='consolePort'
                  style={{ flex: 1 }}
                  rules={[
                    { required: true, message: '웹 콘솔 포트를 입력해 주세요' },
                  ]}
                  initialValue={9001}
                >
                  <InputNumber
                    min={1}
                    max={65535}
                    style={{ width: '100%' }}
                    placeholder='9001'
                  />
                </Form.Item>
              </div>
              <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      setIsInstallModalVisible(false);
                      setupForm.resetFields();
                      setSelectedServer(null);
                      setSelectedServerHops([]);
                    }}
                  >
                    취소
                  </Button>
                  <Button type='primary' htmlType='submit'>
                    설치 시작
                  </Button>
                </Space>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* MinIO 버킷 설정 모달 */}
      <Modal
        title={`${selectedMinioStorage?.name} - 버킷 설정`}
        open={isBucketModalVisible}
        onCancel={() => {
          setIsBucketModalVisible(false);
          bucketForm.resetFields();
          setSelectedMinioStorage(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={bucketForm}
          layout='vertical'
          onFinish={handleBucketConfiguration}
        >
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '6px',
            }}
          >
            <Typography.Text strong>MinIO 서버 정보</Typography.Text>
            <br />
            <Typography.Text type='secondary'>
              엔드포인트: {selectedMinioStorage?.endpoint}
            </Typography.Text>
          </div>

          <Form.Item
            label='버킷 이름'
            name='bucket_name'
            rules={[
              { required: true, message: '버킷 이름을 입력해 주세요' },
              {
                pattern: /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
                message:
                  '올바른 버킷 이름 형식이 아닙니다 (소문자, 숫자, 하이픈만 사용)',
              },
            ]}
          >
            <Input
              placeholder='예: backup-bucket, velero-storage'
              addonBefore='s3://'
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsBucketModalVisible(false);
                  bucketForm.resetFields();
                  setSelectedMinioStorage(null);
                }}
              >
                취소
              </Button>
              <Button type='primary' htmlType='submit' icon={<LinkOutlined />}>
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 인증 모달 */}
      <AuthModal />
    </div>
  );
};

export default InfraMinioSetting;
