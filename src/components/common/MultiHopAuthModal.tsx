import React, { useEffect } from 'react';
import { Modal, Form, Input, Space, Divider, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { getServerCred, normalizePort } from '../../utils/credsAdapter';

// TargetServer, AuthHops, Props 인터페이스는 변경 없습니다.
interface TargetServer {
  name?: string;
  hops: { host: string; port: number | string; username?: string }[];
  partialCredentials?: {
    host: string;
    port: number;
    username: string;
    password: string;
  }[];
}
export interface AuthHops {
  host: string;
  port: number;
  username: string;
  password: string;
}
interface Props {
  visible: boolean;
  targetServer: TargetServer | null;
  onConfirm: (authHops: AuthHops[]) => void;
  onClose?: () => void;
  onCancel?: () => void;
  loading: boolean;
  title?: string;
  okText?: string;
}

const MultiHopAuthModal: React.FC<Props> = ({
  visible,
  targetServer,
  onConfirm,
  onClose,
  onCancel,
  loading,
  title = '서버 인증',
  okText = '확인',
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && targetServer) {
      form.resetFields();
      (async () => {
        const initialValues = {
          hops: await Promise.all(
            targetServer.hops.map(async (hop, index) => {
              // partialCredentials가 있으면 우선 사용
              if (
                targetServer.partialCredentials &&
                targetServer.partialCredentials[index]
              ) {
                const partialCred = targetServer.partialCredentials[index];
                if (
                  partialCred.host === hop.host &&
                  partialCred.port === Number(hop.port)
                ) {
                  return {
                    username: partialCred.username || '',
                    password: partialCred.password || '',
                  };
                }
              }

              // 기존 방식: 스토어에서 가져오기
              const cred = await getServerCred(
                hop.host,
                normalizePort(Number(hop.port))
              );
              return {
                username: cred ? cred.userId : hop.username || '',
                password: cred ? cred.password : '',
              };
            })
          ),
        };
        form.setFieldsValue(initialValues);
      })().catch(() => {});
    }
  }, [visible, targetServer, form]);

  // onFinish는 유효성 검사를 통과한 값(values)을 인자로 받습니다.
  const handleFinish = (values: {
    hops: { username: string; password: string }[];
  }) => {
    if (!targetServer) return;

    const authHops: AuthHops[] = targetServer.hops.map((hop, index) => ({
      ...hop,
      port: Number(hop.port),
      username: values.hops[index].username,
      password: values.hops[index].password,
    }));

    // 제출 시 스토어에 저장 (덮어쓰기)
    import('../../utils/sshHelper')
      .then(({ saveAuthHopsToStore }) => {
        saveAuthHopsToStore(authHops);
      })
      .catch(() => {});

    onConfirm(authHops);
  };

  // handleSubmit은 form.submit()을 호출하여 onFinish를 트리거합니다.
  const handleSubmit = () => {
    form.submit();
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose || onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={okText}
      cancelText='취소'
      width={600}
    >
      <p>
        <b>{targetServer?.name || targetServer?.hops[0]?.host}</b> 서버에
        접속하기 위한 인증 정보를 각 경로(Hop)에 맞게 입력해주세요.
      </p>
      <Form
        form={form}
        layout='vertical'
        autoComplete='off'
        onFinish={handleFinish}
      >
        <Form.List name='hops'>
          {fields => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {fields.map((field, index) => (
                <div key={field.key}>
                  <Divider orientation='left' plain>
                    <Tag color='blue'>{`Hop ${index + 1}`}</Tag>
                    {targetServer?.hops[index]?.host || 'Unknown'}:
                    {targetServer?.hops[index]?.port || 'Unknown'}
                  </Divider>
                  <Space align='baseline' style={{ display: 'flex' }}>
                    <Form.Item
                      key={`${field.key}-username`}
                      name={[field.name, 'username']}
                      rules={[
                        { required: true, message: '사용자명을 입력하세요' },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder='사용자명'
                        value={targetServer?.hops[index]?.username}
                        disabled
                        style={{ flex: 1 }}
                      />
                    </Form.Item>
                    <Form.Item
                      key={`${field.key}-password`}
                      name={[field.name, 'password']}
                      rules={[
                        { required: true, message: '비밀번호를 입력하세요' },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder='비밀번호'
                        //  [핵심 수정] 여기에 onPressEnter 이벤트를 추가합니다.
                        onPressEnter={handleSubmit}
                      />
                    </Form.Item>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default MultiHopAuthModal;
