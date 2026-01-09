import { useState } from 'react';
import { Modal, Form, Input, Space } from 'antd';
import {
  useCredsStore,
  type ImageRegistryItem,
  type SourceRepositoryItem,
  type ServerItem,
} from '../../stores/useCredsStore';

type Mode = 'registry' | 'gitlab' | 'server';

export function showCredentialPrompt(options: {
  mode: Mode;
  initial?: Partial<ImageRegistryItem & SourceRepositoryItem & ServerItem>;
}): Promise<void> {
  // NOTE: 이 프로젝트는 AntD Modal.useModal 글로벌이 없으므로, 간단히 window 이벤트 버스로 처리하는 형태를 권장.
  // 여기서는 최소 뼈대만 제공 (실제 프로젝트에선 컨텍스트/포탈로 구현 권장)
  return new Promise(resolve => {
    const event = new CustomEvent('open-credential-prompt', {
      detail: { ...options, resolve },
    });
    window.dispatchEvent(event);
  });
}

export default function CredentialPromptModalRoot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('registry');
  const [, setInitial] = useState<
    Partial<ImageRegistryItem & SourceRepositoryItem & ServerItem>
  >({});
  const [resolver, setResolver] = useState<() => void>(() => () => {});

  const [form] = Form.useForm();
  const store = useCredsStore();

  // subscribe window event
  useState(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        mode: Mode;
        initial?: Partial<
          ImageRegistryItem & SourceRepositoryItem & ServerItem
        >;
        resolve: () => void;
      }>;
      setMode(ce.detail.mode);
      const init = ce.detail.initial || {};
      setInitial(init);
      setResolver(() => ce.detail.resolve);
      setOpen(true);
      setTimeout(() => form.setFieldsValue(init), 0);
    };
    window.addEventListener('open-credential-prompt', handler as EventListener);
    return () =>
      window.removeEventListener(
        'open-credential-prompt',
        handler as EventListener
      );
  });

  const onOk = async () => {
    const values = (await form.validateFields()) as Record<string, unknown>;

    if (mode === 'registry') {
      const item: ImageRegistryItem = {
        registryUrl: (values.registryUrl as string) || '',
        userId: values.userId as string,
        password: values.password as string,
      };

      store.upsertImageRegistry(item);
    } else if (mode === 'gitlab') {
      const item: SourceRepositoryItem = {
        baseUrl: values.baseUrl as string,
        token: values.token as string,
        userId: (values.userId as string) || undefined,
      };

      store.upsertSourceRepository(item);
    } else if (mode === 'server') {
      const item: ServerItem = {
        host: values.host as string,
        port: values.port as number | undefined,
        userId: values.userId as string,
        password: values.password as string,
      };

      store.addServer(item);
    }

    setOpen(false);
    resolver();
  };

  return (
    <Modal
      title='자격증명 입력'
      open={open}
      onOk={onOk}
      onCancel={() => setOpen(false)}
      destroyOnClose
    >
      <Form form={form} layout='vertical'>
        {mode === 'registry' && (
          <>
            <Form.Item label='Registry URL' name='registryUrl'>
              <Input placeholder='https://index.docker.io/v1/' />
            </Form.Item>
            <Space>
              <Form.Item
                label='User ID'
                name='userId'
                rules={[{ required: true }]}
              >
                {' '}
                <Input />{' '}
              </Form.Item>
              <Form.Item
                label='Password'
                name='password'
                rules={[{ required: true }]}
              >
                {' '}
                <Input.Password />{' '}
              </Form.Item>
            </Space>
          </>
        )}
        {mode === 'gitlab' && (
          <>
            <Form.Item
              label='Base URL'
              name='baseUrl'
              rules={[{ required: true }]}
            >
              <Input placeholder='https://gitlab.example.com' />
            </Form.Item>
            <Form.Item label='사용자명/이메일 (옵션)' name='userId'>
              <Input placeholder='예: john.doe 또는 user@company.com' />
            </Form.Item>
            <Form.Item label='Token' name='token' rules={[{ required: true }]}>
              {' '}
              <Input.Password />{' '}
            </Form.Item>
          </>
        )}
        {mode === 'server' && (
          <>
            <Space>
              <Form.Item label='Host' name='host' rules={[{ required: true }]}>
                {' '}
                <Input placeholder='10.0.0.1' />{' '}
              </Form.Item>
              <Form.Item label='Port' name='port'>
                {' '}
                <Input placeholder='22' />{' '}
              </Form.Item>
            </Space>
            <Space>
              <Form.Item
                label='User ID'
                name='userId'
                rules={[{ required: true }]}
              >
                {' '}
                <Input />{' '}
              </Form.Item>
              <Form.Item
                label='Password'
                name='password'
                rules={[{ required: true }]}
              >
                {' '}
                <Input.Password />{' '}
              </Form.Item>
            </Space>
          </>
        )}
      </Form>
    </Modal>
  );
}
