'use client';

import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
  Tag,
  Alert,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  ReloadOutlined,
  PoweroffOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { InfraWithNodes } from '../../types/infra';
import { ServerInput, ServerStatus } from '../../types/server';
import * as kubernetesApi from '../../lib/api/kubernetes';
import { logger } from '../../utils/logger';

const { Title, Text } = Typography;

interface InfraBaremetalSettingProps {
  infra: InfraWithNodes;
  showSettingsModal: (infra: InfraWithNodes) => void;
}

interface ServerInfo extends Omit<ServerInput, 'type' | 'infra_id'> {
  ip: string;
  os: string;
  cpu: string;
  memory: string;
  disk: string;
  status: ServerStatus;
}

interface ServerDataResponse {
  status?: ServerStatus;
  ip?: string;
  os?: string;
  cpu?: string;
  memory?: string;
  disk?: string;
}

const RestartServerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: (username: string, password: string) => void;
  loading: boolean;
}> = ({ visible, onClose, onConfirm, loading }) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      onConfirm(values.username, values.password);
      form.resetFields();
    } catch (error) {
      logger.error('폼 유효성 검사 중 오류 발생', error as Error);
    }
  };

  return (
    <Modal
      title='서버 재시작 인증'
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText='재시작'
      cancelText='취소'
      confirmLoading={loading}
    >
      <Typography.Paragraph>
        서버를 재시작하기 위한 인증 정보를 입력해주세요.
      </Typography.Paragraph>

      <Form form={form} layout='vertical'>
        <Form.Item
          name='username'
          label='사용자 이름'
          rules={[{ required: true, message: '사용자 이름을 입력해주세요' }]}
        >
          <Input prefix={<UserOutlined />} placeholder='예: root' />
        </Form.Item>

        <Form.Item
          name='password'
          label='비밀번호'
          rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder='서버 접속 비밀번호'
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const InfraBaremetalSetting: React.FC<InfraBaremetalSettingProps> = ({
  infra,
  showSettingsModal,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo>({
    ip: '192.168.1.100',
    os: 'CentOS 8',
    cpu: '12코어',
    memory: '64GB',
    disk: '1TB SSD',
    status: '등록',
  });
  const [isRestartModalVisible, setIsRestartModalVisible] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);

  // 서버 정보 새로고침
  const handleRefresh = async () => {
    try {
      setLoading(true);
      // API 호출하여 서버 정보 가져오기
      const response = await kubernetesApi.getServerById(infra.id);

      if (!response) {
        throw new Error('서버 정보를 찾을 수 없습니다');
      }

      // 서버 정보 변환 및 타입 안전성 보장
      const serverData = response as ServerDataResponse;
      const updatedServerInfo: ServerInfo = {
        ...serverInfo,
        status: serverData?.status || '등록',
        // 서버 데이터가 없는 경우 기존 값 유지
        ip: serverData?.ip || serverInfo.ip,
        os: serverData?.os || serverInfo.os,
        cpu: serverData?.cpu || serverInfo.cpu,
        memory: serverData?.memory || serverInfo.memory,
        disk: serverData?.disk || serverInfo.disk,
      };

      setServerInfo(updatedServerInfo);
      messageApi.success('서버 정보가 새로고침되었습니다.');
    } catch (error) {
      logger.error('서버 정보 조회 중 오류 발생', error as Error);
      messageApi.error('서버 정보 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 서버 재시작
  const handleRestart = async (username: string, password: string) => {
    try {
      setRestartLoading(true);
      // API 호출하여 서버 재시작
      await kubernetesApi.restartServer({
        id: infra.id,
        hops: [
          {
            host: '127.0.0.1',
            port: 22,
            username,
            password,
          },
        ],
      });

      messageApi.success('서버 재시작이 요청되었습니다.');
      setIsRestartModalVisible(false);
    } catch (error) {
      logger.error('서버 재시작 중 오류 발생', error as Error);
      messageApi.error('서버 재시작에 실패했습니다.');
    } finally {
      setRestartLoading(false);
    }
  };

  // 서버 상태에 따른 태그 색상
  const getStatusColor = (status: ServerStatus) => {
    switch (status) {
      case '등록':
        return 'green';
      case '오프라인':
        return 'red';
      case '점검중':
        return 'orange';
      default:
        return 'default';
    }
  };

  // 서버 상태에 따른 아이콘
  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case '등록':
        return <CheckCircleOutlined />;
      case '오프라인':
        return <CloseCircleOutlined />;
      case '점검중':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <SettingOutlined />
            베어메탈 서버 설정
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={handleRefresh}
            >
              새로고침
            </Button>
            <Button
              type='primary'
              icon={<SettingOutlined />}
              onClick={() => showSettingsModal(infra)}
            >
              설정
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message='베어메탈 서버 관리'
            description='물리적 서버의 상태를 모니터링하고 관리할 수 있습니다.'
            type='info'
            showIcon
          />
        </div>

        <Descriptions
          title={
            <Space>
              <Text strong>서버 정보</Text>
              <Tag
                color={getStatusColor(serverInfo.status)}
                icon={getStatusIcon(serverInfo.status)}
              >
                {serverInfo.status}
              </Tag>
            </Space>
          }
          bordered
          column={2}
        >
          <Descriptions.Item label='IP 주소'>{serverInfo.ip}</Descriptions.Item>
          <Descriptions.Item label='운영체제'>
            {serverInfo.os}
          </Descriptions.Item>
          <Descriptions.Item label='CPU'>{serverInfo.cpu}</Descriptions.Item>
          <Descriptions.Item label='메모리'>
            {serverInfo.memory}
          </Descriptions.Item>
          <Descriptions.Item label='디스크' span={2}>
            {serverInfo.disk}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Space direction='vertical' style={{ width: '100%' }}>
          <Title level={5}>서버 관리</Title>
          <Space>
            <Button
              type='primary'
              danger
              icon={<PoweroffOutlined />}
              onClick={() => setIsRestartModalVisible(true)}
            >
              서버 재시작
            </Button>
          </Space>
        </Space>
      </Card>

      <RestartServerModal
        visible={isRestartModalVisible}
        onClose={() => setIsRestartModalVisible(false)}
        onConfirm={handleRestart}
        loading={restartLoading}
      />
    </>
  );
};

export default InfraBaremetalSetting;
