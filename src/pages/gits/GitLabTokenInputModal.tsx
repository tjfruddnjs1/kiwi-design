import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Alert,
} from 'antd';
import { KeyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { updateServiceGitLabToken } from '../../lib/api/service';

const { Text, Link } = Typography;

interface GitLabTokenInputModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  serviceId: number;
  serviceName: string;
  gitlabUrl: string;
}

/**
 * GitLab Access Token 입력 모달
 * 서비스에 GitLab 토큰이 없을 때 사용자에게 토큰을 입력받습니다.
 */
const GitLabTokenInputModal: React.FC<GitLabTokenInputModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  serviceId,
  serviceName,
  gitlabUrl,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // GitLab 토큰 업데이트 API 호출
      await updateServiceGitLabToken(serviceId, values.gitlabAccessToken);

      message.success('GitLab 토큰이 성공적으로 등록되었습니다.');
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('GitLab 토큰 등록 실패:', error);
      if (error instanceof Error) {
        message.error(`토큰 등록 실패: ${error.message}`);
      } else {
        message.error('GitLab 토큰 등록에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // GitLab URL에서 base URL 추출
  const getGitLabBaseUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // Invalid URL format - return as-is
      return url;
    }
  };

  const baseUrl = getGitLabBaseUrl(gitlabUrl);

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>GitLab Access Token 입력</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key='cancel' onClick={handleCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          loading={loading}
          onClick={handleSubmit}
          icon={<KeyOutlined />}
        >
          토큰 등록
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <Alert
          message='GitLab 토큰이 필요합니다'
          description={
            <Space direction='vertical' size='small'>
              <Text>
                <strong>{serviceName}</strong> 서비스의 소스 코드에 접근하려면
                GitLab Access Token이 필요합니다.
              </Text>
              <Text type='secondary'>GitLab URL: {gitlabUrl}</Text>
            </Space>
          }
          type='info'
          showIcon
          icon={<InfoCircleOutlined />}
        />

        <Form form={form} layout='vertical'>
          <Form.Item
            label='GitLab Access Token'
            name='gitlabAccessToken'
            rules={[
              {
                required: true,
                message: 'GitLab Access Token을 입력해주세요.',
              },
              {
                min: 20,
                message: '유효한 GitLab Access Token을 입력해주세요.',
              },
            ]}
            extra={
              <Space direction='vertical' size='small' style={{ marginTop: 8 }}>
                <Text type='secondary'>
                  <InfoCircleOutlined /> 토큰 생성 방법:
                </Text>
                <ol style={{ marginLeft: 16, marginTop: 4 }}>
                  <li>
                    <Link
                      href={`${baseUrl}/-/profile/personal_access_tokens`}
                      target='_blank'
                    >
                      GitLab → Settings → Access Tokens
                    </Link>
                  </li>
                  <li>Token name 입력 (예: K8sControl)</li>
                  <li>
                    Scopes 선택: <strong>read_api, read_repository</strong>
                  </li>
                  <li>&quot;Create personal access token&quot; 클릭</li>
                  <li>생성된 토큰을 복사하여 아래에 붙여넣기</li>
                </ol>
              </Space>
            }
          >
            <Input.Password
              placeholder='glpat-xxxxxxxxxxxxxxxxxxxx'
              autoComplete='off'
              visibilityToggle
            />
          </Form.Item>
        </Form>

        <Alert
          message='보안 안내'
          description='입력하신 토큰은 안전하게 암호화되어 서버에 저장됩니다. 토큰은 GitLab 저장소 접근 시에만 사용됩니다.'
          type='warning'
          showIcon
        />
      </Space>
    </Modal>
  );
};

export default GitLabTokenInputModal;
