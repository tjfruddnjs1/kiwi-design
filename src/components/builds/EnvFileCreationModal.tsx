import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Alert,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import api from '../../lib/api/client';
import { logger } from '../../utils/logger';

const { Text } = Typography;

interface EnvFileCreationModalProps {
  visible: boolean;
  onClose: () => void;
  serviceId: number;
  missingVars: string[];
  errorAnalysis?: {
    error_type: string;
    title: string;
    description: string;
  };
}

const EnvFileCreationModal: React.FC<EnvFileCreationModalProps> = ({
  visible,
  onClose,
  serviceId,
  missingVars,
  errorAnalysis,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    setResult(null);

    try {
      //  백엔드에서 직접 Git 작업 수행 - SSH 불필요
      const response = await api.pipeline<{
        created_vars: string[];
        git_branch: string;
        repository: string;
      }>('createEnvFile', {
        id: serviceId,
        missing_vars: missingVars,
        env_values: values,
      });

      if (response.success) {
        setResult({
          success: true,
          message: `.env 파일이 성공적으로 생성되어 ${response.data?.git_branch || 'main'} 브랜치에 커밋되었습니다.`,
        });
        logger.info('.env 파일 생성 성공:', response.data);

        // 2초 후 모달 닫기
        setTimeout(() => {
          form.resetFields();
          setResult(null);
          onClose();
        }, 2000);
      } else {
        throw new Error(response.error || '.env 파일 생성 실패');
      }
    } catch (error) {
      logger.error('.env 파일 생성 실패:', error as Error);
      setResult({
        success: false,
        message:
          (error as Error).message || '.env 파일 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setResult(null);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <Text strong>.env 파일 자동 생성</Text>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      maskClosable={!loading}
    >
      {errorAnalysis && (
        <>
          <Alert
            message={errorAnalysis.title}
            description={errorAnalysis.description}
            type='warning'
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Divider />
        </>
      )}

      <Alert
        message='⚠️ Git 저장소 직접 커밋'
        description={
          <div>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li style={{ marginBottom: 4 }}>
                <Text strong>
                  생성된 .env 파일은 Git 저장소에 직접 커밋됩니다
                </Text>
              </li>
              <li style={{ marginBottom: 4 }}>
                <Text>
                  이미 .env 파일이 존재하는 경우{' '}
                  <Text type='danger' strong>
                    덮어씌워집니다
                  </Text>
                </Text>
              </li>
              <li style={{ marginBottom: 4 }}>
                <Text>서비스에 설정된 브랜치(또는 main)에 저장됩니다</Text>
              </li>
              <li>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  입력한 환경 변수 값은 Git 이력에 남으므로 민감한 정보는
                  주의하세요
                </Text>
              </li>
            </ul>
          </div>
        }
        type='warning'
        showIcon
        style={{ marginBottom: 20 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Text type='secondary'>
          다음 환경 변수가 필요합니다. 값을 입력하고 &quot;생성 및 커밋&quot;
          버튼을 클릭하세요.
        </Text>
      </div>

      {result && (
        <Alert
          message={result.success ? '성공' : '실패'}
          description={result.message}
          type={result.success ? 'success' : 'error'}
          icon={
            result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />
          }
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        disabled={loading || result?.success === true}
      >
        {missingVars.map(varName => (
          <Form.Item
            key={varName}
            label={
              <Space>
                <Text strong>{varName}</Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  (환경 변수)
                </Text>
              </Space>
            }
            name={varName}
            rules={[
              {
                required: true,
                message: `${varName} 값을 입력해주세요.`,
              },
            ]}
          >
            <Input
              placeholder={`${varName} 값을 입력하세요 (예: harbor.mipllab.com)`}
              size='large'
            />
          </Form.Item>
        ))}

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Alert
            message='추가 정보'
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  생성 후 변경이 필요하면 Git 저장소에서 직접 수정할 수 있습니다
                </li>
                <li>
                  프로덕션 환경에서는 .env 파일을 .gitignore에 추가하는 것을
                  권장합니다
                </li>
              </ul>
            }
            type='info'
            showIcon
          />
        </div>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel} disabled={loading}>
              취소
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={loading}
              disabled={result?.success === true}
            >
              {loading ? '생성 중...' : '생성 및 커밋'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EnvFileCreationModal;
