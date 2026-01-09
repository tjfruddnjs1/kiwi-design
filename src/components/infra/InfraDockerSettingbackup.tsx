'use client';

import React, { useState, useCallback } from 'react';
import {
  Button,
  Typography,
  Space,
  Card,
  Row,
  Col,
  message,
  Modal,
  Input,
  Form,
  Table,
  Tag,
  Empty,
  InputNumber,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  GlobalOutlined,
  ContainerOutlined,
  MinusCircleOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { InfraWithNodes } from '../../types/infra';
import * as dockerApi from '../../lib/api/docker';
import { awxApi } from '../../lib/api/awx';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import MultiHopAuthModal, {
  AuthHops,
} from '../../components/common/MultiHopAuthModal';
import { logger } from '../../utils/logger';
import { useCredsStore } from '../../stores/useCredsStore';
const { Text } = Typography;

interface InfraDockerSettingProps {
  infra: InfraWithNodes;
  isExternal?: boolean;
}

interface DockerServerFromApi {
  id: number;
  server_name?: string;
  name?: string;
  hops?: string;
  last_checked?: string;
  updated_at?: string;
  status?: string;
  ip?: string;
  port?: number;
}

type AuthAction =
  | 'checkStatus'
  | 'installDocker'
  | 'uninstallDocker'
  | 'getContainersAndInfo';

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'exited';
  created: string;
  ports: string[];
  size: string;
}

interface ImageInfo {
  repository: string;
  tag: string;
  size: string;
  created: string;
}

interface DockerInfo {
  compose_project: string | null;
  container_count: number;
  containers: DockerContainer[] | null;
  image_count: number;
  images: ImageInfo[] | null; // DockerInfo 내부의 images 타입을 ImageInfo 배열로 변경
  networks: Array<{
    name: string;
    driver: string;
    scope: string;
    id: string;
  }> | null;
  volumes: Array<{ name: string; driver: string; size: string }> | null;
  success: boolean;
}

type DockerServerStatus = 'active' | 'inactive' | 'uninstalled' | 'unknown';

interface DockerServer {
  id: number;
  name: string;
  status: DockerServerStatus;
  hops: string;
  lastChecked?: string;
  ip?: string;
  port?: number;
}

// 서버 등록 모달 컴포넌트
const RegisterServerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onRegister: (values: {
    name: string;
    // [수정 1] hops의 타입에 username과 password를 추가합니다.
    hops: { host: string; port: number; username: string; password: string }[];
  }) => void;
  loading: boolean;
}> = ({ visible, onClose, onRegister, loading }) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onRegister(values);
      form.resetFields();
    } catch (error) {
      logger.error('폼 검증 실패', error as Error);
    }
  };

  return (
    <Modal
      title='도커 서버 등록'
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnClose
      width={720} // 필드가 늘어났으므로 모달 넓이를 조절합니다.
    >
      <Form
        form={form}
        layout='vertical'
        // [수정 2] 초기값에 username과 password를 추가합니다.
        initialValues={{
          hops: [{ host: '', port: 22, username: 'root', password: '' }],
        }}
      >
        <Form.Item
          name='name'
          label='서버 이름'
          rules={[{ required: true, message: '서버 이름을 입력해주세요' }]}
        >
          <Input placeholder='관리할 서버의 고유한 이름' />
        </Form.Item>

        <Form.List name='hops'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align='baseline'
                >
                  <Tag>Hop {index + 1}</Tag>
                  <Form.Item
                    {...restField}
                    name={[name, 'host']}
                    rules={[
                      {
                        required: true,
                        message: '호스트 IP 또는 도메인을 입력하세요',
                      },
                    ]}
                    style={{ width: '220px' }}
                  >
                    <Input placeholder='호스트 IP 또는 도메인' />
                  </Form.Item>

                  {/* [수정 3] 사용자 이름 입력 필드를 추가합니다. */}
                  <Form.Item
                    {...restField}
                    name={[name, 'username']}
                    rules={[
                      { required: true, message: '사용자 이름을 입력하세요' },
                    ]}
                    style={{ width: '150px' }}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder='사용자 이름 (예: root)'
                    />
                  </Form.Item>

                  {/* [수정 4] 비밀번호 입력 필드를 추가합니다. */}
                  <Form.Item
                    {...restField}
                    name={[name, 'password']}
                    rules={[
                      { required: true, message: '비밀번호를 입력하세요' },
                    ]}
                    style={{ width: '150px' }}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder='비밀번호'
                    />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'port']}
                    rules={[{ required: true, message: '포트를 입력하세요' }]}
                  >
                    <InputNumber placeholder='22' style={{ width: '80px' }} />
                  </Form.Item>

                  {fields.length > 1 ? (
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  ) : null}
                </Space>
              ))}
              <Form.Item>
                <Button
                  type='dashed'
                  onClick={() =>
                    add({ host: '', port: 22, username: 'root', password: '' })
                  }
                  block
                  icon={<PlusOutlined />}
                >
                  경유 서버(Hop) 추가
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};
// 도커 정보 표시 컴포넌트
const DockerInfoDisplay: React.FC<{
  dockerInfo: DockerInfo | null;
}> = ({ dockerInfo }) => {
  if (!dockerInfo) {
    return <Empty description='도커 정보가 없습니다.' />;
  }

  const containerColumns = [
    {
      title: '컨테이너명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '이미지',
      dataIndex: 'image',
      key: 'image',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          running: 'green',
          stopped: 'red',
          paused: 'orange',
          exited: 'gray',
        };

        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '포트',
      dataIndex: 'ports',
      key: 'ports',
      render: (ports: string[]) => ports.join(', ') || '-',
    },
  ];

  const networkColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => id.substring(0, 12),
    },
    { title: '이름', dataIndex: 'name', key: 'name' },
    { title: '드라이버', dataIndex: 'driver', key: 'driver' },
    { title: '범위', dataIndex: 'scope', key: 'scope' },
  ];

  const volumeColumns = [
    { title: '이름', dataIndex: 'name', key: 'name' },
    { title: '드라이버', dataIndex: 'driver', key: 'driver' },
    { title: '크기', dataIndex: 'size', key: 'size' },
  ];

  return (
    <div>
      {/*  컨테이너 목록 Card */}
      <Card
        // title prop에 제목과 카운트를 함께 표시하는 JSX를 전달합니다.
        title={
          <Space align='center'>
            <Typography.Title level={5} style={{ margin: 0 }}>
              컨테이너 목록
            </Typography.Title>
            <Tag>{dockerInfo.container_count}</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {/* 데이터가 없을 때를 대비해 Empty 컴포넌트 추가 */}
        {dockerInfo.containers && dockerInfo.containers.length > 0 ? (
          <Table
            dataSource={dockerInfo.containers}
            columns={containerColumns} // 이전에 정의된 컬럼 변수
            rowKey='id'
            pagination={false}
            size='small'
          />
        ) : (
          <Empty
            description='컨테이너가 없습니다.'
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/*  이미지 목록 Card */}
      <Card
        title={
          <Space align='center'>
            <Typography.Title level={5} style={{ margin: 0 }}>
              이미지 목록
            </Typography.Title>
            <Tag>{dockerInfo.image_count}</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {dockerInfo.images && dockerInfo.images.length > 0 ? (
          <Table
            dataSource={dockerInfo.images}
            columns={[
              {
                title: '이미지',
                dataIndex: 'repository',
                key: 'repository',
                render: (repo: string, record: ImageInfo) =>
                  `${repo}:${record.tag}`,
              },
              { title: '크기', dataIndex: 'size', key: 'size' },
              { title: '생성일', dataIndex: 'created', key: 'created' },
            ]}
            rowKey={(record: ImageInfo) => `${record.repository}-${record.tag}`}
            pagination={false}
            size='small'
          />
        ) : (
          <Empty
            description='이미지가 없습니다.'
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/*  네트워크 목록 Card */}
      <Card
        title={
          <Space align='center'>
            <Typography.Title level={5} style={{ margin: 0 }}>
              네트워크 목록
            </Typography.Title>
            <Tag>{dockerInfo.networks?.length || 0}</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {dockerInfo.networks && dockerInfo.networks.length > 0 ? (
          <Table
            dataSource={dockerInfo.networks}
            columns={networkColumns} // 이전에 정의된 컬럼 변수
            rowKey='id'
            pagination={false}
            size='small'
          />
        ) : (
          <Empty
            description='네트워크가 없습니다.'
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/*  볼륨 목록 Card */}
      <Card
        title={
          <Space align='center'>
            <Typography.Title level={5} style={{ margin: 0 }}>
              볼륨 목록
            </Typography.Title>
            <Tag>{dockerInfo.volumes?.length || 0}</Tag>
          </Space>
        }
      >
        {dockerInfo.volumes && dockerInfo.volumes.length > 0 ? (
          <Table
            dataSource={dockerInfo.volumes}
            columns={volumeColumns} // 이전에 정의된 컬럼 변수
            rowKey='name'
            pagination={false}
            size='small'
          />
        ) : (
          <Empty
            description='볼륨이 없습니다.'
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  );
};

// 서버 상태 표시 컴포넌트
const ServerStatusDisplay: React.FC<{
  dockerServer: DockerServer | null;
  onRegisterClick: () => void;
  onCheckStatus: () => void;
  onInstallDocker: () => void;
  onUninstallDocker: () => void;
  loading: boolean;
}> = ({
  dockerServer,
  onRegisterClick,
  onCheckStatus,
  onInstallDocker,
  onUninstallDocker,
  loading,
}) => {
  const getStatusColor = (status: DockerServerStatus) => {
    const colorMap: Record<DockerServerStatus, string> = {
      active: 'green',
      inactive: 'orange',
      uninstalled: 'red',
      unknown: 'gray',
    };
    return colorMap[status] || 'default';
  };

  const getStatusText = (status: DockerServerStatus) => {
    const textMap: Record<DockerServerStatus, string> = {
      active: '활성',
      inactive: '비활성',
      uninstalled: '미설치',
      unknown: '알 수 없음',
    };
    return textMap[status] || '알 수 없음';
  };

  // [개선 2] 날짜 포맷팅 함수
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      // 'ko-KR' 로케일을 사용하여 "YYYY. MM. DD. HH:mm" 형태로 변환
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch (error) {
      logger.error('날짜 포맷팅 실패', error as Error);
      return dateString; // 변환 실패 시 원본 문자열 반환
    }
  };

  const renderHops = (hopsString: string) => {
    try {
      const hops = JSON.parse(hopsString);
      if (!Array.isArray(hops) || hops.length === 0) return '-';
      return hops.map(hop => `${hop.host}:${hop.port}`).join(' → ');
    } catch (error) {
      logger.error('Hops 파싱 실패', error as Error);
      return <Text type='danger'>경로 정보 오류</Text>;
    }
  };

  if (!dockerServer) {
    return (
      <Card>
        <Empty description='등록된 도커 서버가 없습니다.' />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={onRegisterClick}
          >
            + 서버 등록
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Row justify='space-between' align='middle'>
        {/* 왼쪽 정보 영역 */}
        <Col>
          <Space direction='vertical' align='start' size={4}>
            {/* 1. 최상단 라인: 서버 이름 + 상태 + 마지막 확인 */}
            <Space align='baseline' size='middle'>
              <Typography.Title level={4} style={{ margin: 0, marginRight: 4 }}>
                {dockerServer.name}
              </Typography.Title>
              <Tag color={getStatusColor(dockerServer.status)}>
                {getStatusText(dockerServer.status)}
              </Tag>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                (마지막 확인: {formatDateTime(dockerServer.lastChecked)})
              </Text>
            </Space>

            {/* 2. 두 번째 라인: 경로 정보 */}
            <Space align='center' size={4}>
              <GlobalOutlined style={{ color: '#8c8c8c' }} />
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {renderHops(dockerServer.hops)}
              </Text>
            </Space>
          </Space>
        </Col>

        {/* 오른쪽 버튼 영역 */}
        <Col>
          <Space>
            <Button onClick={onCheckStatus} loading={loading}>
              상태 확인
            </Button>
            {dockerServer.status === 'uninstalled' && (
              <Button
                type='primary'
                onClick={onInstallDocker}
                loading={loading}
              >
                도커 설치
              </Button>
            )}
            {(dockerServer.status === 'active' ||
              dockerServer.status === 'inactive') && (
              <>
                <Button danger onClick={onUninstallDocker} loading={loading}>
                  도커 제거
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

// 메인 컴포넌트
const InfraDockerSetting: React.FC<InfraDockerSettingProps> = ({ infra }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [dockerServer, setDockerServer] = useState<DockerServer | null>(null);
  const [isServerRegisterModalVisible, setIsServerRegisterModalVisible] =
    useState(false);
  const [serverRegisterLoading, setServerRegisterLoading] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authAction, setAuthAction] = useState<AuthAction | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [partialCredentials, setPartialCredentials] = useState<
    AuthHops[] | undefined
  >(undefined);

  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);

  // 스토어 초기화
  const credsStore = useCredsStore();
  const { user } = useAuth();

  // 스토어에서 서버 인증 정보를 가져오는 함수
  const getStoredServerCredentials = (host: string, port: number) => {
    return credsStore.serverlist.find(
      server => server.host === host && (server.port || 22) === port
    );
  };

  // 스토어에서 hops 정보를 기반으로 인증 정보를 가져오는 함수
  const getStoredAuthHops = (
    hops: { host: string; port: number; username?: string }[]
  ) => {
    return hops.map(hop => {
      const storedCreds = getStoredServerCredentials(hop.host, hop.port);
      return {
        ...hop,
        username: storedCreds?.userId || hop.username || 'root', // 기본 사용자명 설정
        password: storedCreds?.password || '',
      };
    });
  };

  // 자동 상태 확인 함수
  const handleCheckStatusAuto = async (authHops: AuthHops[]) => {
    if (!dockerServer) return;

    try {
      setLoading(true);

      // 1. 먼저 서버 상태를 확인합니다. (AWX 플레이북 사용)
      const statusRes = await awxApi.runPlaybook({
        hops: authHops,
        playbook_to_run: 'status_docker',
        awxTemplate: user?.awx_template || 0,
      });

      if (!statusRes.success) {
        throw new Error(statusRes.error || '도커 상태 확인 실패');
      }

      // AWX 응답에서 상태 정보 추출
      const awxResult = (statusRes.data as any)?.awx_job_result;
      const details = awxResult?.details;

      // 도커 설치 및 서비스 상태에 따라 상태 결정
      let newStatus: 'active' | 'inactive' | 'uninstalled' | 'unknown';

      // 1. 먼저 설치 여부 확인 (version으로 판단)
      if (details?.version === '설치되지 않음') {
        newStatus = 'uninstalled';
      }
      // 2. 설치되어 있다면 서비스 상태와 데몬 상태 확인
      else if (
        details?.service_status === '실행 중' &&
        details?.daemon_status === '정상'
      ) {
        newStatus = 'active';
      } else if (
        details?.service_status === '중지됨' ||
        details?.daemon_status === '비정상'
      ) {
        newStatus = 'inactive';
      } else {
        newStatus = 'unknown';
      }

      const lastChecked = details?.collection_time || new Date().toISOString();

      // 2. 확인된 상태가 'active'인지 확인합니다.
      if (newStatus === 'active') {
        // 2a. AWX 응답에서 직접 컨테이너와 이미지 정보 추출
        const convertContainerStatus = (
          status: string
        ): 'running' | 'stopped' | 'paused' | 'exited' => {
          const lowerStatus = status.toLowerCase();
          if (lowerStatus.startsWith('up')) return 'running';
          if (lowerStatus.startsWith('exited')) return 'exited';
          if (lowerStatus.includes('paused')) return 'paused';
          return 'stopped';
        };

        // AWX 응답에서 컨테이너 정보 파싱
        const _runningContainers = details?.running_containers || [];
        const allContainers = details?.all_containers || [];
        const images = details?.images || [];

        const dockerInfoData: DockerInfo = {
          success: true,
          compose_project: '', // 플레이북에서 제공하지 않음
          container_count: allContainers.length,
          image_count: images.length,
          containers: allContainers.map((containerLine: string) => {
            // docker ps 출력 형식 파싱 (실제 형식에 따라 조정 필요)
            const parts = containerLine.trim().split(/\s+/);
            return {
              id: parts[0] || '',
              name: parts[parts.length - 1] || '',
              image: parts[1] || '',
              status: convertContainerStatus(parts[4] || ''),
              created: parts[3] || '',
              ports: parts[5] ? [parts[5]] : [],
              size: parts[6] || '0B',
            };
          }),
          images: images.map((imageLine: string) => {
            // docker images 출력 형식 파싱 (실제 형식에 따라 조정 필요)
            const parts = imageLine.trim().split(/\s+/);
            return {
              id: parts[2] || '',
              repository: parts[0] || '',
              tag: parts[1] || '',
              size: parts[6] || '0B',
              created: parts[3] || '',
            };
          }),
          networks: [], // 플레이북에서 네트워크 정보를 제공하지 않으므로 빈 배열
          volumes: [], // 플레이북에서 볼륨 정보를 제공하지 않으므로 빈 배열
        };

        // 2c. 서버 상태와 상세 정보를 "한 번에" 업데이트합니다.
        setDockerServer({
          ...dockerServer,
          status: 'active',
          lastChecked: lastChecked || undefined,
        });
        setDockerInfo(dockerInfoData);

        messageApi.success('서버가 활성 상태이며, 상세 정보를 가져왔습니다.');
      } else {
        // 3. 상태가 'active'가 아니라면 (inactive 또는 uninstalled)
        const nextState: DockerServer = {
          ...dockerServer,
          status: newStatus,
          lastChecked: lastChecked || undefined,
        };
        setDockerServer(nextState);
        setDockerInfo(null);

        messageApi.success(`서버 상태를 확인했습니다: ${newStatus}`);
      }
    } catch (error) {
      console.error('자동 상태 확인 실패:', error);
      messageApi.error('자동 상태 확인에 실패했습니다. 수동으로 시도해주세요.');
      // 에러를 다시 던져서 handleAuthAction의 catch 블록에서 처리하도록 함
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleAuthAction = useCallback(
    async (action: AuthAction) => {
      if (!dockerServer) return;

      // checkStatus 액션에 대해서만 자동 인증 시도
      if (action === 'checkStatus') {
        try {
          const hops = JSON.parse(dockerServer.hops || '[]');
          if (hops.length > 0) {
            // 스토어에서 저장된 인증 정보 확인
            const storedAuthHops = getStoredAuthHops(hops);
            const hasCompleteCredentials = storedAuthHops.every(
              hop => hop.username && hop.password
            );

            if (hasCompleteCredentials) {
              // 자동으로 상태 확인 실행
              try {
                await handleCheckStatusAuto(storedAuthHops);
                return; // 자동 처리 완료 시 함수 종료
              } catch (error) {
                // 자동 상태 확인 실패 시 스토어 값으로 팝업창 띄우기
                setAuthAction(action); // authAction 설정 추가
                setPartialCredentials(storedAuthHops);
                setIsAuthModalVisible(true);
                return;
              }
            } else {
            }
          }
        } catch (error) {
        }
      }

      // 자동 인증 실패 또는 다른 액션인 경우 모달 표시
      setAuthAction(action);

      // checkStatus 액션일 때 부분 인증 정보 설정
      if (action === 'checkStatus' && dockerServer.hops) {
        try {
          const hops = JSON.parse(dockerServer.hops);
          const partialCreds = getStoredAuthHops(hops);
          setPartialCredentials(partialCreds);
        } catch (error) {
          setPartialCredentials(undefined);
        }
      } else {
        setPartialCredentials(undefined);
      }

      setIsAuthModalVisible(true);
    },
    [dockerServer]
  );

  const loadDockerServerInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dockerApi.getDockerServer(infra.id);

      // [수정 1] 최종적으로 사용할 서버 데이터를 담을 변수
      let finalServerData: DockerServerFromApi | null = null;

      // [수정 2] 타입 가드: response에 'data' 속성이 있는지 먼저 확인합니다.
      if (response && 'data' in response && response.data) {
        // 1번 경우: API 호출이 성공하여 StandardApiResponse 형태일 때
        // 로그에서 확인했듯이, response.data가 바로 서버 객체입니다.
        const serverData = response.data;

        // 서버 객체인지 한번 더 확인 (id 속성 존재 여부)
        if (
          serverData &&
          typeof serverData === 'object' &&
          'id' in serverData
        ) {
          finalServerData = serverData as DockerServerFromApi;
        }
      } else if (response && 'server' in response) {
        // 2번 경우: API 호출이 실패하여 catch 블록에서 반환된 형태일 때
        // 이 경우에는 response.server에 데이터가 있습니다 (대부분 null).
        finalServerData = response.server as DockerServerFromApi | null;
      }

      // [수정 3] 최종적으로 추출된 서버 데이터를 바탕으로 상태를 업데이트합니다.
      if (finalServerData) {
        const serverDataFromApi = finalServerData;

        // 안전한 데이터 매핑
        const mappedServer: DockerServer = {
          id: serverDataFromApi.id,
          name:
            serverDataFromApi.server_name ||
            serverDataFromApi.name ||
            '이름 없음',
          hops: serverDataFromApi.hops || '[]',
          lastChecked:
            serverDataFromApi.last_checked || serverDataFromApi.updated_at,
          status: (serverDataFromApi.status || 'unknown') as DockerServerStatus,
          ip: serverDataFromApi.ip,
          port: serverDataFromApi.port,
        };

        setDockerServer(mappedServer);
      } else {
        // API 응답에서 서버 데이터를 찾지 못한 경우
        setDockerServer(null);
      }
    } catch (error) {
      logger.error('도커 서버 정보 로드 실패', error as Error);
      messageApi.error('도커 서버 정보를 불러오는데 실패했습니다.');
      setDockerServer(null);
    } finally {
      setLoading(false);
    }
  }, [infra.id, messageApi]);

  useEffect(() => {
    void loadDockerServerInfo();
  }, [loadDockerServerInfo]);

  const handleServerRegister = async (values: {
    name: string;
    hops: { host: string; port: number; username: string; password: string }[];
  }) => {
    setServerRegisterLoading(true);
    try {
      // 1. SSH 연결 테스트 먼저 수행
      try {
        await api.docker.testSSHConnection(values.hops);
        message.success('SSH 연결 테스트가 성공했습니다.');
      } catch (error) {
        message.error(
          'SSH 연결 테스트에 실패했습니다. 연결 정보를 확인해주세요.'
        );
        console.error('SSH 연결 테스트 실패:', error);
        setServerRegisterLoading(false);
        return;
      }

      // 2. 비밀번호를 제외한 hops 데이터 생성 (DB 저장용)
      const hopsForDb = values.hops.map(hop => ({
        host: hop.host,
        port: hop.port,
        username: hop.username,
        // password는 제외
      }));

      await dockerApi.createDockerServer({
        name: values.name,
        infra_id: infra.id,
        status: 'uninstalled',
        hops: hopsForDb, // 비밀번호 제외된 데이터
      });
      message.success('도커 서버가 등록되었습니다.');
      setIsServerRegisterModalVisible(false);
      void loadDockerServerInfo();

      // 3. AWX 호스트 추가 (원본 데이터 사용 - SSH 키 포함)
      try {
        await awxApi.addHost(
          values.hops,
          user.awx_inventory,
          user.awx_template
        );
        message.success('AWX 호스트가 추가되었습니다.');
      } catch (awxError) {
        console.error('AWX 호스트 추가 실패:', awxError);
        message.warning(
          '도커 서버는 등록되었지만 AWX 호스트 추가에 실패했습니다.'
        );
      }
    } catch (error) {
      logger.error('도커 서버 등록 실패', undefined, { error: String(error) });
      message.error('도커 서버 등록에 실패했습니다.');
    } finally {
      setServerRegisterLoading(false);
    }
  };

  const handleAuthConfirm = async (authHops: AuthHops[]) => {
    if (!dockerServer || !authAction) {
      return;
    }

    setIsAuthModalVisible(false);
    setAuthLoading(true);

    try {
      // 1. SSH 연결 테스트 먼저 수행
      try {
        await api.docker.testSSHConnection(authHops);
        message.success('SSH 연결 테스트가 성공했습니다.');
      } catch (error) {
        message.error(
          'SSH 연결 테스트에 실패했습니다. 연결 정보를 확인해주세요.'
        );
        console.error('SSH 연결 테스트 실패:', error);
        setAuthLoading(false);
        return;
      }
      let successMessage = '';

      switch (authAction) {
        case 'checkStatus': {
          // case 문을 블록으로 감싸서 변수 스코프를 관리합니다.
          // 1. 먼저 서버 상태를 확인합니다. (AWX 플레이북 사용)
          const statusRes = await awxApi.runPlaybook({
            hops: authHops,
            playbook_to_run: 'status_docker',
            awxTemplate: user?.awx_template || 0,
          });

          if (!statusRes.success) {
            throw new Error(statusRes.error || '도커 상태 확인 실패');
          }

          // AWX 응답에서 상태 정보 추출
          const awxResult = (statusRes.data as any)?.awx_job_result;
          const details = awxResult?.details;

          // 도커 설치 및 서비스 상태에 따라 상태 결정
          let newStatus: 'active' | 'inactive' | 'uninstalled' | 'unknown';

          // 1. 먼저 설치 여부 확인 (version으로 판단)
          if (details?.version === '설치되지 않음') {
            newStatus = 'uninstalled';
          }
          // 2. 설치되어 있다면 서비스 상태와 데몬 상태 확인
          else if (
            details?.service_status === '실행 중' &&
            details?.daemon_status === '정상'
          ) {
            newStatus = 'active';
          } else if (
            details?.service_status === '중지됨' ||
            details?.daemon_status === '비정상'
          ) {
            newStatus = 'inactive';
          } else {
            newStatus = 'unknown';
          }

          const lastChecked =
            details?.collection_time || new Date().toISOString();

          // 2. 확인된 상태가 'active'인지 확인합니다.
          if (newStatus === 'active') {
            // 2a. AWX 응답에서 직접 컨테이너와 이미지 정보 추출
            const convertContainerStatus = (
              status: string
            ): 'running' | 'stopped' | 'paused' | 'exited' => {
              const lowerStatus = status.toLowerCase();
              if (lowerStatus.startsWith('up')) return 'running';
              if (lowerStatus.startsWith('exited')) return 'exited';
              if (lowerStatus.includes('paused')) return 'paused';
              return 'stopped';
            };

            // AWX 응답에서 컨테이너 정보 파싱
            const _runningContainers = details?.running_containers || [];
            const allContainers = details?.all_containers || [];
            const images = details?.images || [];

            const dockerInfoData: DockerInfo = {
              success: true,
              compose_project: '', // 플레이북에서 제공하지 않음
              container_count: allContainers.length,
              image_count: images.length,
              containers: allContainers.map((containerLine: string) => {
                // docker ps 출력 형식 파싱 (실제 형식에 따라 조정 필요)
                const parts = containerLine.trim().split(/\s+/);
                return {
                  id: parts[0] || '',
                  name: parts[parts.length - 1] || '',
                  image: parts[1] || '',
                  status: convertContainerStatus(parts[4] || ''),
                  created: parts[3] || '',
                  ports: parts[5] ? [parts[5]] : [],
                  size: parts[6] || '0B',
                };
              }),
              images: images.map((imageLine: string) => {
                // docker images 출력 형식 파싱 (실제 형식에 따라 조정 필요)
                const parts = imageLine.trim().split(/\s+/);
                return {
                  id: parts[2] || '',
                  repository: parts[0] || '',
                  tag: parts[1] || '',
                  size: parts[6] || '0B',
                  created: parts[3] || '',
                };
              }),
              networks: [], // 플레이북에서 네트워크 정보를 제공하지 않으므로 빈 배열
              volumes: [], // 플레이북에서 볼륨 정보를 제공하지 않으므로 빈 배열
            };

            // 2c. 서버 상태와 상세 정보를 "한 번에" 업데이트합니다.
            setDockerServer({
              ...dockerServer,
              status: 'active',
              lastChecked: lastChecked || undefined,
            });
            setDockerInfo(dockerInfoData);

            successMessage = '서버가 활성 상태이며, 상세 정보를 가져왔습니다.';
          } else {
            // 3. 상태가 'active'가 아니라면 (inactive 또는 uninstalled)
            const nextState: DockerServer = {
              ...dockerServer,
              status: newStatus,
              lastChecked: lastChecked || undefined,
            };
            setDockerServer(nextState);
            // (필요하다면 setDockerInfo(null) 등으로 기존 상세 정보를 초기화)
            setDockerInfo(null);

            successMessage = `서버 상태를 확인했습니다: ${newStatus}`;
          }
          break;
        }
        case 'installDocker':
          // 로딩 메시지는 그대로 message.loading을 사용합니다.
          message.loading({
            content: '도커 설치를 시작합니다...',
            key: 'installing',
          });

          try {
            // AWX 플레이북을 사용한 도커 설치
            const response = await awxApi.runPlaybook({
              hops: authHops,
              playbook_to_run: 'install_docker',
              awxTemplate: user?.awx_template || 0,
            });

            //  [로그 추가] API로부터 받은 응답 객체 전체를 확인합니다.

            // 로딩 메시지를 즉시 닫습니다.
            message.destroy('installing');

            if (response && response.success) {
              //  [UI 변경] Modal.success를 사용하여 화면 중앙에 알림창을 띄웁니다.
              Modal.success({
                title: '작업 시작됨',
                content: response.message,
                // okText, onOk 등으로 버튼을 커스터마이징할 수 있습니다.
              });

              setDockerServer(prev => {
                if (!prev) return null;
                return { ...prev, status: 'inactive' };
              });
            } else {
              //  [UI 변경] Modal.error를 사용하여 화면 중앙에 에러창을 띄웁니다.
              Modal.error({
                title: '요청 실패',
                content: response?.error || '도커 설치 시작에 실패했습니다.',
              });
            }
          } catch (error) {
            // 로딩 메시지를 즉시 닫습니다.
            message.destroy('installing');

            const errorMessage =
              error instanceof Error
                ? error.message
                : '알 수 없는 오류가 발생했습니다.';
            logger.error('도커 설치 요청 중 오류 발생', undefined, {
              error: String(error),
            });

            //  [UI 변경] 네트워크 오류 등 catch 블록에서도 Modal.error를 사용합니다.
            Modal.error({
              title: '오류 발생',
              content: '도커 설치 요청 중 오류가 발생했습니다: ' + errorMessage,
            });
          }
          break;

        case 'uninstallDocker':
          // AWX 플레이북을 사용한 도커 제거
          const uninstallResponse = await awxApi.runPlaybook({
            hops: authHops,
            playbook_to_run: 'uninstall_docker',
            awxTemplate: user?.awx_template || 0,
          });

          if (uninstallResponse && uninstallResponse.success) {
            setDockerServer(prev => {
              return prev ? { ...prev, status: 'uninstalled' } : prev;
            });
            setDockerInfo(null);
            successMessage = '도커가 제거되었습니다.';
          } else {
            throw new Error(
              uninstallResponse?.error || '도커 제거에 실패했습니다.'
            );
          }
          break;
      }

      if (successMessage) {
        message.success(successMessage);
      }
    } catch (error) {
      logger.error('도커 작업 실패', undefined, { error: String(error) });
      message.error('작업에 실패했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadingTip =
    authAction === 'installDocker'
      ? '도커를 설치하는 중입니다...'
      : authAction === 'uninstallDocker'
        ? '도커를 제거하는 중입니다...'
        : '인증 및 작업 처리 중...';

  return (
    <Spin spinning={authLoading} tip={loadingTip} size='large'>
      <div>
        {contextHolder}
        <Space direction='vertical' style={{ width: '100%' }} size='large'>
          <div>
            <Typography.Title level={4}>
              <ContainerOutlined /> 도커 설정
            </Typography.Title>
            <Text type='secondary'>
              도커 서버를 등록하고 관리할 수 있습니다.
            </Text>
          </div>

          <ServerStatusDisplay
            dockerServer={dockerServer}
            onRegisterClick={() => setIsServerRegisterModalVisible(true)}
            onCheckStatus={() => handleAuthAction('checkStatus')}
            onInstallDocker={() => handleAuthAction('installDocker')}
            onUninstallDocker={() => handleAuthAction('uninstallDocker')}
            loading={loading || authLoading}
          />

          {!authLoading && dockerInfo && (
            <DockerInfoDisplay dockerInfo={dockerInfo} />
          )}

          <RegisterServerModal
            visible={isServerRegisterModalVisible}
            onClose={() => setIsServerRegisterModalVisible(false)}
            onRegister={handleServerRegister}
            loading={serverRegisterLoading}
          />

          <MultiHopAuthModal
            visible={isAuthModalVisible}
            targetServer={
              dockerServer
                ? {
                    name: dockerServer.name,
                    hops: dockerServer.hops
                      ? JSON.parse(dockerServer.hops).map(
                          (hop: any, index: number) => {
                            // partialCredentials에서 사용자명 가져오기
                            const partialCred = partialCredentials?.[index];
                            return {
                              ...hop,
                              username:
                                partialCred?.username || hop.username || 'root', // 기본 사용자명 설정
                            };
                          }
                        )
                      : [
                          {
                            host: dockerServer.ip,
                            port: dockerServer.port,
                            username: 'root',
                          },
                        ],
                    partialCredentials: partialCredentials,
                  }
                : null
            }
            onCancel={() => setIsAuthModalVisible(false)}
            onConfirm={handleAuthConfirm}
            loading={authLoading}
          />
        </Space>
      </div>
    </Spin>
  );
};

export default InfraDockerSetting;
