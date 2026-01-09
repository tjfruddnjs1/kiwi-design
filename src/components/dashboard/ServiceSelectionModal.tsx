import React, { useEffect, useState } from 'react';
import {
  Modal,
  Checkbox,
  Alert,
  Spin,
  Typography,
  Space,
  Button,
  Empty,
  message,
} from 'antd';
import { AppstoreOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  buildWizardApi,
  type DetectProjectTypeResponse,
} from '../../lib/api/buildWizard';

interface ServiceSelectionModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (selectedServices: string[], autoDeploy?: boolean) => void;
  gitUrl: string;
  branch?: string;
}

const ServiceSelectionModal: React.FC<ServiceSelectionModalProps> = ({
  open,
  onCancel,
  onConfirm,
  gitUrl,
  branch = 'main',
}) => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 프로젝트 타입 감지 및 서비스 목록 로드
  useEffect(() => {
    if (open && gitUrl) {
      void loadServices();
    }
  }, [open, gitUrl, branch]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = (await buildWizardApi.detectProjectType({
        git_url: gitUrl,
        branch,
      })) as { data: DetectProjectTypeResponse };

      // docker-compose.yaml의 서비스 목록 추출
      let serviceList: string[] = [];

      if (response.data.sub_projects && response.data.sub_projects.length > 0) {
        // Multi-service project (docker-compose)
        serviceList = response.data.sub_projects.map(proj => proj.path);
      } else if (response.data.has_dockerfile) {
        // Single service project
        // Git URL에서 프로젝트 이름 추출
        const projectName =
          gitUrl.split('/').pop()?.replace('.git', '') || 'service';
        serviceList = [projectName];
      }

      if (serviceList.length === 0) {
        setError('프로젝트에서 빌드 가능한 서비스를 찾을 수 없습니다.');
      } else {
        setServices(serviceList);
        setSelectedServices(serviceList); // 기본적으로 모든 서비스 선택
        setSelectAll(true);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
      setError(
        '서비스 목록을 불러오는데 실패했습니다. Git 저장소 접근 권한을 확인해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedServices(services);
    } else {
      setSelectedServices([]);
    }
  };

  const handleServiceToggle = (service: string, checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedServices, service];
      setSelectedServices(newSelected);
      setSelectAll(newSelected.length === services.length);
    } else {
      const newSelected = selectedServices.filter(s => s !== service);
      setSelectedServices(newSelected);
      setSelectAll(false);
    }
  };

  const handleConfirm = (autoDeploy: boolean = false) => {
    if (selectedServices.length === 0) {
      message.warning('최소 1개 이상의 서비스를 선택해주세요.');
      return;
    }
    onConfirm(selectedServices, autoDeploy);
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <AppstoreOutlined style={{ color: '#1890ff' }} />
          <span>빌드 서비스 선택</span>
        </Space>
      }
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          onClick={() => handleConfirm(false)}
          disabled={selectedServices.length === 0}
          icon={<CheckCircleOutlined />}
        >
          빌드 시작 ({selectedServices.length}개 서비스)
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Alert
          message='빌드할 서비스 선택'
          description='프로젝트의 docker-compose.yaml에서 감지된 서비스 목록입니다. 빌드할 서비스를 선택하세요.'
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />

        {error ? (
          <Alert
            message='오류 발생'
            description={error}
            type='error'
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {!loading && services.length > 0 && (
          <>
            <Checkbox
              checked={selectAll}
              onChange={e => handleSelectAll(e.target.checked)}
              style={{ marginBottom: 16, fontWeight: 'bold' }}
            >
              모든 서비스 선택 ({services.length}개)
            </Checkbox>

            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: '4px',
                padding: '12px',
              }}
            >
              <Space direction='vertical' style={{ width: '100%' }}>
                {services.map(service => (
                  <Checkbox
                    key={service}
                    checked={selectedServices.includes(service)}
                    onChange={e =>
                      handleServiceToggle(service, e.target.checked)
                    }
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: selectedServices.includes(service)
                        ? '#e6f7ff'
                        : 'transparent',
                      width: '100%',
                      transition: 'background-color 0.3s',
                    }}
                  >
                    <Typography.Text strong>{service}</Typography.Text>
                  </Checkbox>
                ))}
              </Space>
            </div>

            <Typography.Text
              type='secondary'
              style={{ display: 'block', marginTop: 12 }}
            >
              💡 선택한 서비스만 빌드되며, Harbor Registry에 푸시됩니다.
            </Typography.Text>
          </>
        )}

        {!loading && services.length === 0 && !error && (
          <Empty
            description='빌드 가능한 서비스를 찾을 수 없습니다'
            style={{ marginTop: 32 }}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default ServiceSelectionModal;
