import React from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Spin,
  Switch,
  Tooltip,
} from 'antd';
import {
  CodeOutlined,
  GithubOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

export interface SastScanParams {
  git_url: string;
  branch?: string;
  git_token?: string;
  generate_sbom?: boolean;
  license_analysis?: boolean;
}

interface SastParamsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (params: SastScanParams) => void;
  loading?: boolean;
  initialGitUrl?: string;
  hideGitFields?: boolean; // Git 입력 필드 숨김 여부 (서비스 정보에서 자동으로 가져오는 경우)
}

const SastParamsModal: React.FC<SastParamsModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  initialGitUrl,
  hideGitFields = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    const params: SastScanParams = {
      git_url: values.git_url,
      branch: values.branch || 'main',
      git_token: values.git_token || undefined,
      generate_sbom: values.generate_sbom || false,
      license_analysis: values.license_analysis || false,
    };
    onConfirm(params);
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title='SAST 정적 분석 보안 스캔'
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key='cancel' onClick={handleCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          onClick={() => form.submit()}
          loading={loading}
        >
          스캔 시작
        </Button>,
      ]}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Alert
          message='정적 분석 보안 스캔'
          description='소스 코드를 분석하여 보안 취약점을 찾는 정적 분석 도구를 설정합니다.'
          type='info'
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          autoComplete='off'
          initialValues={{
            git_url: initialGitUrl || '',
            branch: 'main',
            generate_sbom: false,
            license_analysis: false,
          }}
        >
          {/* Git 저장소 URL - 서비스 정보에서 자동으로 가져오는 경우 숨김 */}
          {!hideGitFields && (
            <>
              <Form.Item
                label={
                  <Space>
                    <GithubOutlined />
                    <Typography.Text strong>Git 저장소 URL</Typography.Text>
                  </Space>
                }
                name='git_url'
                rules={[
                  { required: true, message: 'Git 저장소 URL을 입력해주세요' },
                ]}
              >
                <Input placeholder='https://github.com/username/repository.git' />
              </Form.Item>

              {/* 브랜치 */}
              <Form.Item
                label={
                  <Space>
                    <CodeOutlined />
                    <Typography.Text strong>브랜치</Typography.Text>
                  </Space>
                }
                name='branch'
              >
                <Input placeholder='main' />
              </Form.Item>

              {/* Git 인증 (선택사항) */}
              <Divider>
                <Typography.Text type='secondary' style={{ fontSize: 14 }}>
                  Git 저장소 인증 (선택사항)
                </Typography.Text>
              </Divider>

              <Alert
                message='Private Repository 사용 시에만 입력하세요'
                description='Public Repository(예: GitHub public 저장소)는 인증 정보가 필요 없습니다.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item
                label={
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    Git 토큰 (선택사항)
                  </Typography.Text>
                }
                name='git_token'
                tooltip='GitLab, GitHub 등의 Personal Access Token 또는 Deploy Token'
              >
                <Input.Password placeholder='glpat-xxxxxxxxxxxxxxxxxxxx 또는 ghp_xxxxxxxxxxxxxxxxxxxx' />
              </Form.Item>
            </>
          )}

          {/* SBOM 생성 옵션 */}
          <Divider>SBOM 생성 옵션</Divider>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <Form.Item
              name='generate_sbom'
              valuePropName='checked'
              style={{ marginBottom: 12 }}
            >
              <Space>
                <Switch />
                <Typography.Text>
                  <FileSearchOutlined style={{ marginRight: 6 }} />
                  SBOM 자동 생성
                </Typography.Text>
                <Tooltip title='CycloneDX 형식의 SBOM(Software Bill of Materials)을 생성합니다. 소스코드의 의존성 구성요소 목록과 라이브러리 정보를 제공합니다.'>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    (권장)
                  </Typography.Text>
                </Tooltip>
              </Space>
            </Form.Item>

            <Form.Item
              name='license_analysis'
              valuePropName='checked'
              style={{ marginBottom: 0 }}
              dependencies={['generate_sbom']}
            >
              <Space>
                <Switch />
                <Typography.Text>라이선스 분석 포함</Typography.Text>
                <Tooltip title='SBOM 생성 시 각 구성요소의 라이선스 정보를 분석하여 포함합니다.'>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    (SBOM 생성 시)
                  </Typography.Text>
                </Tooltip>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default SastParamsModal;
