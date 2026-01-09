import { useState } from 'react';
import {
  Modal,
  Steps,
  Button,
  message,
  Select,
  Input,
  Form,
  Typography,
  Alert,
  Spin,
} from 'antd';
import {
  CodeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import {
  buildWizardApi,
  DetectProjectTypeResponse,
  GenerateBuildFilesResponse,
} from '../../lib/api/buildWizard';
import MonacoEditor from '@monaco-editor/react';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface BuildWizardModalProps {
  open: boolean;
  onClose: () => void;
  gitUrl: string;
  branch?: string;
  serviceName?: string;
  onSuccess?: () => void;
}

export default function BuildWizardModal({
  open,
  onClose,
  gitUrl,
  branch = 'main',
  serviceName = 'app',
  onSuccess,
}: BuildWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 감지된 정보
  const [_detectedType, setDetectedType] = useState<string>('');
  const [hasExistingFiles, setHasExistingFiles] = useState({
    dockerfile: false,
    dockerCompose: false,
  });

  // 생성된 파일 내용
  const [dockerfile, setDockerfile] = useState('');
  const [dockerCompose, setDockerCompose] = useState('');

  // 1단계: 프로젝트 타입 감지
  const handleDetectProjectType = async () => {
    setLoading(true);
    try {
      const response = await buildWizardApi.detectProjectType({
        git_url: gitUrl,
        branch,
      });

      if (response.success && response.data) {
        const data = response.data as DetectProjectTypeResponse;
        setDetectedType(data.detected_type);
        setHasExistingFiles({
          dockerfile: data.has_dockerfile,
          dockerCompose: data.has_docker_compose,
        });

        form.setFieldsValue({
          project_type: data.detected_type,
          service_name: serviceName,
        });

        message.success(`프로젝트 타입 감지 완료: ${data.detected_type}`);
        setCurrentStep(1);
      }
    } catch (error: any) {
      message.error(error.message || '프로젝트 타입 감지 실패');
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 템플릿 생성
  const handleGenerateTemplate = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const response = await buildWizardApi.generateBuildFiles({
        project_type: values.project_type,
        service_name: values.service_name,
        port: values.port,
      });

      if (response.success && response.data) {
        const data = response.data as GenerateBuildFilesResponse;
        setDockerfile(data.dockerfile);
        setDockerCompose(data.docker_compose);
        message.success('빌드 파일 템플릿 생성 완료');
        setCurrentStep(2);
      }
    } catch (error: any) {
      message.error(error.message || '템플릿 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  // 3단계: GitLab에 커밋
  const handleCommitFiles = async () => {
    setLoading(true);
    try {
      const response = await buildWizardApi.commitBuildFiles({
        git_url: gitUrl,
        branch,
        dockerfile,
        docker_compose: dockerCompose,
      });

      if (response.success) {
        message.success('빌드 환경 파일이 GitLab에 커밋되었습니다!');
        onSuccess?.();
        handleClose();
      }
    } catch (error: any) {
      message.error(error.message || '파일 커밋 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setDetectedType('');
    setDockerfile('');
    setDockerCompose('');
    form.resetFields();
    onClose();
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={4}>
              <CodeOutlined /> 프로젝트 타입 감지
            </Title>
            <Paragraph>
              GitLab 프로젝트를 분석하여 자동으로 프로젝트 타입을 감지합니다.
            </Paragraph>
            <Alert
              message='지원하는 프로젝트 타입'
              description='Node.js, Python, Go, Java, Ruby, PHP 등'
              type='info'
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginTop: 24 }}>
              <Text strong>Git URL:</Text>
              <div
                style={{
                  padding: '8px 12px',
                  background: '#f5f5f5',
                  borderRadius: 4,
                  marginTop: 8,
                }}
              >
                {gitUrl}
              </div>
              <Text strong style={{ display: 'block', marginTop: 12 }}>
                Branch:
              </Text>
              <div
                style={{
                  padding: '8px 12px',
                  background: '#f5f5f5',
                  borderRadius: 4,
                  marginTop: 8,
                }}
              >
                {branch}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={4}>
              <FileTextOutlined /> 빌드 설정
            </Title>
            {hasExistingFiles.dockerfile || hasExistingFiles.dockerCompose ? (
              <Alert
                message='기존 빌드 파일 발견'
                description={`이미 존재하는 파일: ${hasExistingFiles.dockerfile ? 'Dockerfile' : ''} ${hasExistingFiles.dockerCompose ? 'docker-compose.yml' : ''}. 계속 진행하면 파일이 덮어쓰기됩니다.`}
                type='warning'
                showIcon
                style={{ marginBottom: 16 }}
              />
            ) : null}
            <Form form={form} layout='vertical'>
              <Form.Item
                label='프로젝트 타입'
                name='project_type'
                rules={[
                  { required: true, message: '프로젝트 타입을 선택해주세요' },
                ]}
              >
                <Select placeholder='프로젝트 타입 선택'>
                  <Option value='nodejs'>Node.js</Option>
                  <Option value='python'>Python</Option>
                  <Option value='go'>Go</Option>
                  <Option value='java'>Java</Option>
                  <Option value='ruby'>Ruby</Option>
                  <Option value='php'>PHP</Option>
                  <Option value='unknown'>기타</Option>
                </Select>
              </Form.Item>
              <Form.Item
                label='서비스 이름'
                name='service_name'
                rules={[
                  { required: true, message: '서비스 이름을 입력해주세요' },
                ]}
                initialValue={serviceName}
              >
                <Input placeholder='예: myapp' />
              </Form.Item>
              <Form.Item
                label='포트 번호'
                name='port'
                extra='비워두면 프로젝트 타입별 기본 포트를 사용합니다 (Node.js: 3000, Python: 8000, etc)'
              >
                <Input type='number' placeholder='예: 3000' />
              </Form.Item>
            </Form>
          </div>
        );

      case 2:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={4}>
              <CheckCircleOutlined /> 파일 미리보기 및 수정
            </Title>
            <Paragraph>
              생성된 빌드 파일을 확인하고 필요시 수정할 수 있습니다.
            </Paragraph>

            <div style={{ marginBottom: 24 }}>
              <Text strong>Dockerfile</Text>
              <div
                style={{
                  marginTop: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                }}
              >
                <MonacoEditor
                  height='200px'
                  language='dockerfile'
                  value={dockerfile}
                  onChange={(value: string | undefined) =>
                    setDockerfile(value || '')
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>

            <div>
              <Text strong>docker-compose.yml</Text>
              <div
                style={{
                  marginTop: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                }}
              >
                <MonacoEditor
                  height='200px'
                  language='yaml'
                  value={dockerCompose}
                  onChange={(value: string | undefined) =>
                    setDockerCompose(value || '')
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getFooterButtons = () => {
    const buttons = [];

    if (currentStep > 0) {
      buttons.push(
        <Button key='back' onClick={() => setCurrentStep(currentStep - 1)}>
          이전
        </Button>
      );
    }

    buttons.push(
      <Button key='cancel' onClick={handleClose}>
        취소
      </Button>
    );

    if (currentStep === 0) {
      buttons.push(
        <Button
          key='detect'
          type='primary'
          onClick={handleDetectProjectType}
          loading={loading}
        >
          프로젝트 타입 감지
        </Button>
      );
    } else if (currentStep === 1) {
      buttons.push(
        <Button
          key='generate'
          type='primary'
          onClick={handleGenerateTemplate}
          loading={loading}
        >
          템플릿 생성
        </Button>
      );
    } else if (currentStep === 2) {
      buttons.push(
        <Button
          key='commit'
          type='primary'
          icon={<RocketOutlined />}
          onClick={handleCommitFiles}
          loading={loading}
        >
          GitLab에 커밋
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Modal
      title='빌드 환경 생성 마법사'
      open={open}
      onCancel={handleClose}
      footer={getFooterButtons()}
      width={800}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Step title='프로젝트 감지' icon={<CodeOutlined />} />
          <Step title='빌드 설정' icon={<FileTextOutlined />} />
          <Step title='파일 생성' icon={<CheckCircleOutlined />} />
        </Steps>
        {getStepContent()}
      </Spin>
    </Modal>
  );
}
