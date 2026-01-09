import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert, Space, Divider } from 'antd';
import { LockOutlined, UserOutlined, GlobalOutlined } from '@ant-design/icons';
import { useCredsStore, type ServerItem } from '../../stores/useCredsStore';
import logger from '../../utils/logger';

interface SshHop {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

interface SshCredentialModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (hopsWithPassword: SshHop[]) => void;
  hops: SshHop[];
  infraId?: number;
  serviceId?: number; //  [신규] 서비스 ID 추가 (서비스별 SSH credential 구분)
  serviceName?: string;
  isRetry?: boolean; // 재시도 여부 (인증 실패 후 다시 모달 오픈)
}

const SshCredentialModal: React.FC<SshCredentialModalProps> = ({
  visible,
  onClose,
  onComplete,
  hops,
  infraId,
  serviceId,
  serviceName,
  isRetry = false,
}) => {
  const [form] = Form.useForm();
  const { serverlist, upsertServerByHostPort } = useCredsStore();
  const [missingCredentials, setMissingCredentials] = useState<SshHop[]>([]);

  useEffect(() => {
    if (!visible) return;

    // 저장된 credentials 확인
    const hopsNeedingPassword: SshHop[] = [];
    const initialValues: Record<string, string> = {};

    hops.forEach((hop, idx) => {
      // localStorage에서 저장된 credential 찾기
      let savedCred = serverlist.find(
        s =>
          s.host === hop.host &&
          (s.port === hop.port || (!s.port && hop.port === 22)) &&
          s.userId === hop.username &&
          infraId !== undefined &&
          s.infraId === infraId &&
          serviceId !== undefined &&
          s.serviceId === serviceId &&
          s.hopOrder === idx
      );

      // 서비스 ID 매칭 없이 infraId만으로 찾기 (fallback)
      if (!savedCred && infraId !== undefined) {
        savedCred = serverlist.find(
          s =>
            s.host === hop.host &&
            (s.port === hop.port || (!s.port && hop.port === 22)) &&
            s.userId === hop.username &&
            s.infraId === infraId
        );
      }

      initialValues[`username_${idx}`] = hop.username;

      if (savedCred && savedCred.password && !isRetry) {
        // 저장된 password가 있으면 자동으로 설정
        initialValues[`password_${idx}`] = savedCred.password;
      } else {
        // 저장된 password가 없거나 재시도인 경우 입력 필요
        initialValues[`password_${idx}`] = '';
        hopsNeedingPassword.push(hop);
      }
    });

    setMissingCredentials(hops); // 모든 hop 표시 (수정 가능하도록)

    logger.info(
      'SSH Credential Modal opened',
      {
        totalHops: hops.length,
        hopsNeedingPassword: hopsNeedingPassword.length,
        infraId,
        serviceId,
        isRetry,
      },
      'SshCredentialModal',
      'open'
    );

    form.setFieldsValue(initialValues);

    // 모든 hop에 저장된 password가 있고 재시도가 아니면 자동으로 submit
    if (hopsNeedingPassword.length === 0 && !isRetry) {
      logger.info(
        'All SSH credentials found in localStorage, auto-submitting',
        {
          infraId,
          serviceId,
        },
        'SshCredentialModal',
        'auto-submit'
      );

      // 약간의 딜레이 후 자동 제출
      setTimeout(() => {
        void handleSubmit();
      }, 100);
    }
  }, [visible, hops, serverlist, infraId, serviceId, isRetry, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      logger.debug(
        'Form validation passed',
        {
          fieldCount: Object.keys(values).length,
        },
        'SshCredentialModal',
        'handleSubmit'
      );

      // 입력받은 credential을 localStorage에 저장
      missingCredentials.forEach((hop, idx) => {
        const username = values[`username_${idx}`] || hop.username;
        const password = values[`password_${idx}`];
        if (password) {
          const serverItem: ServerItem = {
            host: hop.host,
            port: hop.port,
            userId: username,
            password,
            infraId,
            serviceId, //  [수정] 서비스 ID 추가
            hopOrder: idx, //  [신규] SSH hop 순서 추가
          };
          upsertServerByHostPort(serverItem);

          logger.info(
            'SSH credential saved',
            {
              host: hop.host,
              port: hop.port,
              username,
              infraId,
              serviceId,
              hopOrder: idx,
            },
            'SshCredentialModal',
            'save'
          );
        }
      });

      // 모든 hops에 password 추가
      const hopsWithPassword = hops.map(hop => {
        // 방금 입력한 값에서 찾기
        const idx = missingCredentials.findIndex(
          h =>
            h.host === hop.host &&
            h.port === hop.port &&
            h.username === hop.username
        );

        if (idx >= 0) {
          // 방금 입력한 값 사용
          const newUsername = values[`username_${idx}`] || hop.username;
          const newPassword = values[`password_${idx}`];
          return {
            ...hop,
            username: newUsername,
            password: newPassword || '',
          };
        }

        //  [개선] localStorage에서 credential 찾기 (정확한 매칭 우선순위)
        // 현재 hop의 인덱스 계산
        const currentHopIdx = hops.findIndex(
          h =>
            h.host === hop.host &&
            h.port === hop.port &&
            h.username === hop.username
        );

        // 1순위: infraId + serviceId + hopOrder가 모두 정확히 매칭되는 항목
        let cred = serverlist.find(
          s =>
            s.host === hop.host &&
            (s.port === hop.port || (!s.port && hop.port === 22)) &&
            s.userId === hop.username &&
            infraId !== undefined &&
            s.infraId === infraId &&
            serviceId !== undefined &&
            s.serviceId === serviceId &&
            currentHopIdx >= 0 &&
            s.hopOrder === currentHopIdx
        );

        // 2순위: infraId + serviceId만 매칭 (hopOrder 무시)
        if (!cred && infraId !== undefined && serviceId !== undefined) {
          cred = serverlist.find(
            s =>
              s.host === hop.host &&
              (s.port === hop.port || (!s.port && hop.port === 22)) &&
              s.userId === hop.username &&
              s.infraId === infraId &&
              s.serviceId === serviceId
          );
        }

        // 3순위: infraId만 매칭 (하위 호환성)
        if (!cred && infraId !== undefined) {
          cred = serverlist.find(
            s =>
              s.host === hop.host &&
              (s.port === hop.port || (!s.port && hop.port === 22)) &&
              s.userId === hop.username &&
              s.infraId === infraId
          );
        }

        // 4순위: infraId가 없는 legacy credential (하위 호환성)
        if (!cred && infraId === undefined) {
          cred = serverlist.find(
            s =>
              s.host === hop.host &&
              (s.port === hop.port || (!s.port && hop.port === 22)) &&
              s.userId === hop.username &&
              s.infraId === undefined
          );
        }

        // 5순위: infraId 무시하고 host:port:username만 매칭 (최후의 수단)
        if (!cred) {
          cred = serverlist.find(
            s =>
              s.host === hop.host &&
              (s.port === hop.port || (!s.port && hop.port === 22)) &&
              s.userId === hop.username
          );

          if (cred) {
            logger.warn(
              'Using credential without exact match',
              {
                host: hop.host,
                port: hop.port,
                username: hop.username,
                requestedInfraId: infraId,
                requestedServiceId: serviceId,
                foundInfraId: cred.infraId,
                foundServiceId: cred.serviceId,
              },
              'SshCredentialModal',
              'fallback'
            );
          }
        }

        return {
          ...hop,
          password: cred?.password || '',
        };
      });

      logger.info(
        'SSH credentials completed',
        {
          totalHops: hopsWithPassword.length,
        },
        'SshCredentialModal',
        'complete'
      );

      onComplete(hopsWithPassword);
      form.resetFields();
      onClose();
    } catch (error) {
      logger.error(
        'Form validation failed',
        error as Error,
        {},
        'SshCredentialModal',
        'handleSubmit'
      );
    }
  };

  const handleCancel = () => {
    logger.info(
      'SSH credential input cancelled',
      {},
      'SshCredentialModal',
      'cancel'
    );
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title='SSH 접속 정보 입력'
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key='cancel' onClick={handleCancel}>
          취소
        </Button>,
        <Button key='submit' type='primary' onClick={handleSubmit}>
          확인
        </Button>,
      ]}
    >
      {isRetry && (
        <Alert
          message='인증 실패'
          description='이전에 입력하신 SSH 접속 정보로 인증에 실패했습니다. 비밀번호를 다시 확인해주세요.'
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Alert
        message='SSH 접속 정보 필요'
        description={
          serviceName
            ? `'${serviceName}' 서비스의 Docker 컨테이너에 접속하기 위해 SSH 접속 정보가 필요합니다. 입력하신 정보는 브라우저의 LocalStorage에 안전하게 저장됩니다.`
            : 'Docker 컨테이너에 접속하기 위해 SSH 접속 정보가 필요합니다. 입력하신 정보는 브라우저의 LocalStorage에 안전하게 저장됩니다.'
        }
        type='info'
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Form form={form} layout='vertical'>
        {missingCredentials.map((hop, idx) => (
          <div key={`${hop.host}:${hop.port}`}>
            {idx > 0 && <Divider />}
            <Space direction='vertical' style={{ width: '100%' }} size='small'>
              <div
                style={{ fontSize: '14px', fontWeight: 500, color: '#1890ff' }}
              >
                <GlobalOutlined /> SSH Hop {idx + 1}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginLeft: 24 }}>
                <div>Host: {hop.host}</div>
                <div>Port: {hop.port}</div>
              </div>
              <Form.Item
                name={`username_${idx}`}
                label='Username'
                rules={[{ required: true, message: 'Username을 입력해주세요' }]}
                initialValue={hop.username}
                style={{ marginBottom: 8 }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder='Username'
                  autoComplete='off'
                />
              </Form.Item>
              <Form.Item
                name={`password_${idx}`}
                label='Password'
                rules={[{ required: true, message: 'Password를 입력해주세요' }]}
                style={{
                  marginBottom: idx === missingCredentials.length - 1 ? 0 : 16,
                }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder='Password'
                  autoComplete='new-password'
                />
              </Form.Item>
            </Space>
          </div>
        ))}
      </Form>
    </Modal>
  );
};

export default SshCredentialModal;
