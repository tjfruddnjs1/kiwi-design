'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  message,
  List,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  CloudOutlined,
  ReloadOutlined,
  PoweroffOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { InfraWithNodes } from '../../types/infra';
import * as kubernetesApi from '../../lib/api/kubernetes';
import { logger } from '../../utils/logger';

const { Text } = Typography;

interface InfraCloudSettingProps {
  infra: InfraWithNodes;
  showSettingsModal: (infra: InfraWithNodes) => void;
}

interface ServerInfo {
  ip?: string;
  port?: string;
  instance_type?: string;
  vcpu?: string;
  memory?: string;
  storage?: string;
  status?: string;
}

const InfraCloudSetting: React.FC<InfraCloudSettingProps> = ({
  infra,
  showSettingsModal,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo>({});
  const [isRestartModalVisible, setIsRestartModalVisible] = useState(false);

  // 인스턴스 정보 새로고침
  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await kubernetesApi.getServerById(infra.id);

      if (!response) {
        throw new Error('서버 정보를 찾을 수 없습니다');
      }

      setServerInfo(response as unknown as ServerInfo);
      messageApi.success('인스턴스 정보가 업데이트되었습니다.');
    } catch (error) {
      logger.error('인스턴스 정보 조회 실패', error as Error);
      messageApi.error('인스턴스 정보 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [infra.id, messageApi]);

  // 인스턴스 재시작
  const handleRestart = async (username: string, password: string) => {
    try {
      setLoading(true);
      const hopsData = [
        {
          host: serverInfo?.ip || '',
          port: Number(serverInfo?.port || 22),
          username,
          password,
        },
      ];

      await kubernetesApi.restartServer({
        id: infra.id,
        hops: hopsData,
      });
      messageApi.success('인스턴스가 재시작되었습니다.');
      void handleRefresh();
    } catch (error) {
      logger.error('인스턴스 재시작 실패', error as Error);
      messageApi.error('인스턴스 재시작에 실패했습니다.');
    } finally {
      setLoading(false);
      setIsRestartModalVisible(false);
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) return '-';

      return date.toISOString().split('T')[0] || '-';
    } catch (error) {
      logger.error('날짜 형식 변환 오류', error as Error);

      return '-';
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, [infra.id, handleRefresh]);

  return (
    <div className='infra-content-wrapper'>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>클라우드 정보: </Text>
          <Text>{infra.info || '-'}</Text>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={handleRefresh}
            size='small'
          />
        </Space>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Text strong>생성일: </Text>
        <Text>{formatDate(infra.created_at)}</Text>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Text strong>최종 업데이트: </Text>
        <Text>{formatDate(infra.updated_at)}</Text>
      </div>

      <Divider orientation='left'>클라우드 상세 정보</Divider>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size='small' title='인스턴스 정보' loading={loading}>
            <List
              size='small'
              dataSource={[
                { label: '유형', value: serverInfo?.instance_type || '-' },
                { label: 'vCPU', value: serverInfo?.vcpu || '-' },
                { label: '메모리', value: serverInfo?.memory || '-' },
                { label: '스토리지', value: serverInfo?.storage || '-' },
                { label: '상태', value: serverInfo?.status || '-' },
              ]}
              renderItem={item => (
                <List.Item>
                  <Text strong>{item.label}: </Text>
                  <Text>{item.value}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size='small' title='네트워크 정보' loading={loading}>
            <List
              size='small'
              dataSource={[
                { label: 'IP 주소', value: serverInfo?.ip || '-' },
                { label: '포트', value: serverInfo?.port || '-' },
              ]}
              renderItem={item => (
                <List.Item>
                  <Text strong>{item.label}: </Text>
                  <Text>{item.value}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button
            onClick={() => setIsRestartModalVisible(true)}
            icon={<PoweroffOutlined />}
          >
            인스턴스 재시작
          </Button>
          <Button
            type='primary'
            icon={<CloudOutlined />}
            onClick={() => showSettingsModal(infra)}
          >
            설정
          </Button>
        </Space>
      </div>

      <Modal
        title='인스턴스 재시작 인증'
        open={isRestartModalVisible}
        onCancel={() => setIsRestartModalVisible(false)}
        onOk={async () => {
          const form = document.querySelector('form');

          if (form) {
            const formData = new FormData(form);
            const username = formData.get('username') as string;
            const password = formData.get('password') as string;

            await handleRestart(username, password);
          }
        }}
        okText='재시작'
        cancelText='취소'
        confirmLoading={loading}
      >
        <Typography.Paragraph>
          인스턴스를 재시작하기 위한 인증 정보를 입력해주세요.
        </Typography.Paragraph>

        <Form layout='vertical'>
          <Form.Item
            name='username'
            label='사용자 이름'
            rules={[{ required: true, message: '사용자 이름을 입력해주세요' }]}
          >
            <Input prefix={<UserOutlined />} placeholder='예: ubuntu' />
          </Form.Item>

          <Form.Item
            name='password'
            label='비밀번호'
            rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='인스턴스 접속 비밀번호'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InfraCloudSetting;
