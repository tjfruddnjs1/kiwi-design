import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  Alert,
  Space,
  Typography,
  Spin,
  Divider,
  Switch,
  Tooltip,
} from 'antd';
import {
  RocketOutlined,
  InfoCircleOutlined,
  CloudUploadOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { Service } from '../../lib/api/types';
import { buildApi } from '../../lib/api/build';
import { pipelineApi } from '../../lib/api/pipeline';
import logger from '../../utils/logger';

const { Text, Title } = Typography;

export interface DockerDeployModalProps {
  visible: boolean;
  onClose: () => void;
  service: Service | null;
  onDeploySuccess?: () => void;
}

interface ServiceImageSelection {
  [serviceName: string]: string; // serviceName -> image URL
}

const DockerDeployModal: React.FC<DockerDeployModalProps> = ({
  visible,
  onClose,
  service,
  onDeploySuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchingVersions, setFetchingVersions] = useState(false);
  const [serviceBuildVersions, setServiceBuildVersions] = useState<
    Record<string, string[]>
  >({});
  const [selectedServiceImages, setSelectedServiceImages] =
    useState<ServiceImageSelection>({});
  const [selectedImageTag, setSelectedImageTag] = useState<string>('');

  // 배포 진행 상태 추가
  const [deploymentStatus, setDeploymentStatus] = useState<
    'idle' | 'deploying' | 'success' | 'failed'
  >('idle');
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');

  // 배포 전 자동 백업 옵션 (기본값: ON)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(true);

  const isMultiService = service?.is_multi_service ?? false;
  const serviceNames = service?.service_names ?? [];

  // Reset deployment status when modal opens or closes
  useEffect(() => {
    if (visible) {
      setDeploymentStatus('idle');
      setDeploymentMessage('');
    }
  }, [visible]);

  // Fetch available build versions when modal opens
  useEffect(() => {
    if (visible && service?.id) {
      void fetchBuildVersions();
    } else {
      // Reset state when modal closes
      setServiceBuildVersions({});
      setSelectedServiceImages({});
      setSelectedImageTag('');
      form.resetFields();
    }
  }, [visible, service?.id]);

  const fetchBuildVersions = async () => {
    if (!service?.id) return;

    setFetchingVersions(true);
    try {
      logger.info('[DockerDeployModal] Fetching build versions', {
        serviceId: service.id,
        isMultiService,
      });

      const versions = await buildApi.getServiceBuildVersions(service.id);

      logger.info('[DockerDeployModal] Build versions fetched', {
        versions,
        servicesCount: Object.keys(versions).length,
      });

      // Convert ServiceBuildVersion objects to image URLs for state
      const imageUrlsByService: Record<string, string[]> = {};
      Object.keys(versions).forEach(serviceName => {
        imageUrlsByService[serviceName] = versions[serviceName].map(
          v => v.image_url
        );
      });

      setServiceBuildVersions(imageUrlsByService);

      // Initialize selection state for multi-service
      if (isMultiService && serviceNames.length > 0) {
        const initialSelection: ServiceImageSelection = {};
        serviceNames.forEach(name => {
          if (imageUrlsByService[name] && imageUrlsByService[name].length > 0) {
            initialSelection[name] = imageUrlsByService[name][0]; // Default to first version
          }
        });
        setSelectedServiceImages(initialSelection);
      } else {
        // For single-service, get the first available tag
        const firstService = Object.keys(imageUrlsByService)[0];
        if (firstService && imageUrlsByService[firstService]?.length > 0) {
          setSelectedImageTag(imageUrlsByService[firstService][0]);
        }
      }
    } catch (error) {
      logger.error(
        '[DockerDeployModal] Failed to fetch build versions',
        error as Error
      );
    } finally {
      setFetchingVersions(false);
    }
  };

  // 배포 상태 polling 함수
  const pollDeploymentStatus = async (serviceId: number) => {
    const maxAttempts = 120; // 최대 10분 (5초 * 120)
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const steps = await pipelineApi.getLatestPipelineStatus(serviceId);

        if (!steps || steps.length === 0) {
          logger.warn('[DockerDeployModal] No pipeline steps found');
          return;
        }

        // deploy 단계 찾기
        const deployStep = steps.find(step => step.step_name === 'deploy');

        if (!deployStep) {
          logger.warn('[DockerDeployModal] Deploy step not found');
          return;
        }

        logger.info('[DockerDeployModal] Poll status:', {
          status: deployStep.status,
          attempt: attempts,
        });

        if (deployStep.status === 'success') {
          setDeploymentStatus('success');
          setDeploymentMessage('배포가 성공적으로 완료되었습니다.');
          setLoading(false);

          logger.info('[DockerDeployModal] Deployment completed successfully');

          // 성공 후 1초 대기 후 모달 닫기
          setTimeout(() => {
            onDeploySuccess?.();
            onClose();
          }, 1000);

          return;
        } else if (deployStep.status === 'failed') {
          const errorMsg =
            deployStep.error_message?.String || '배포 중 오류가 발생했습니다.';
          setDeploymentStatus('failed');
          setDeploymentMessage(errorMsg);
          setLoading(false);

          logger.error(
            '[DockerDeployModal] Deployment failed',
            new Error(errorMsg)
          );
          return;
        } else if (deployStep.status === 'running') {
          setDeploymentMessage('배포가 진행 중입니다...');
        }

        // 계속 polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(() => {
            void checkStatus();
          }, 5000); // 5초 후 재시도
        } else {
          setDeploymentStatus('failed');
          setDeploymentMessage('배포 상태 확인 시간이 초과되었습니다.');
          setLoading(false);
          logger.error('[DockerDeployModal] Polling timeout');
        }
      } catch (error) {
        logger.error('[DockerDeployModal] Status polling error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(() => {
            void checkStatus();
          }, 5000);
        } else {
          setDeploymentStatus('failed');
          setDeploymentMessage('배포 상태 확인 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    };

    await checkStatus();
  };

  const handleDeploy = async () => {
    if (!service?.id) return;

    setLoading(true);
    setDeploymentStatus('deploying');
    setDeploymentMessage(
      autoBackupEnabled
        ? '배포 전 백업을 생성하는 중...'
        : '배포를 시작하는 중...'
    );

    try {
      const parameters: Record<string, unknown> = {
        // 배포 전 자동 백업 옵션
        backup_before_deploy: autoBackupEnabled,
      };

      if (isMultiService) {
        // Multi-service: Send selected_service_images
        parameters.selected_service_images = selectedServiceImages;

        logger.info('[DockerDeployModal] Deploying multi-service', {
          serviceId: service.id,
          selectedImages: selectedServiceImages,
          backupBeforeDeploy: autoBackupEnabled,
        });
      } else {
        // Single-service: Send selected_image_tag
        parameters.selected_image_tag = selectedImageTag;

        logger.info('[DockerDeployModal] Deploying single-service', {
          serviceId: service.id,
          selectedTag: selectedImageTag,
          backupBeforeDeploy: autoBackupEnabled,
        });
      }

      // Trigger Docker deploy pipeline
      await pipelineApi.triggerPipeline(
        service.id,
        'docker_deploy',
        parameters
      );

      logger.info(
        '[DockerDeployModal] Deployment triggered, starting status polling...'
      );

      setDeploymentMessage('배포가 시작되었습니다. 상태를 확인하는 중...');

      // 배포 상태 polling 시작
      await pollDeploymentStatus(service.id);
    } catch (error) {
      logger.error(
        '[DockerDeployModal] Deployment trigger failed',
        error as Error
      );
      setDeploymentStatus('failed');
      setDeploymentMessage('배포 시작 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleServiceImageChange = (serviceName: string, imageUrl: string) => {
    setSelectedServiceImages(prev => ({
      ...prev,
      [serviceName]: imageUrl,
    }));
  };

  const renderMultiServiceSelector = () => {
    return (
      <div>
        <Alert
          message='멀티-서비스 프로젝트'
          description={`이 프로젝트는 ${serviceNames.length}개의 마이크로서비스로 구성되어 있습니다. 각 서비스별로 배포할 버전을 선택하세요.`}
          type='info'
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />

        {serviceNames.map(serviceName => {
          const versions = serviceBuildVersions[serviceName] || [];

          return (
            <div key={serviceName} style={{ marginBottom: 16 }}>
              <Text strong>{serviceName}</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder={`${serviceName} 버전 선택`}
                value={selectedServiceImages[serviceName] || undefined}
                onChange={value => handleServiceImageChange(serviceName, value)}
                disabled={versions.length === 0}
                loading={fetchingVersions}
              >
                {versions.map(imageUrl => (
                  <Select.Option key={imageUrl} value={imageUrl}>
                    {imageUrl}
                  </Select.Option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSingleServiceSelector = () => {
    const firstService = Object.keys(serviceBuildVersions)[0];
    const versions = firstService
      ? serviceBuildVersions[firstService] || []
      : [];

    return (
      <div>
        <Alert
          message='단일 서비스 프로젝트'
          description='배포할 이미지 버전을 선택하세요.'
          type='info'
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item label='이미지 버전' required>
          <Select
            style={{ width: '100%' }}
            placeholder='이미지 버전 선택'
            value={selectedImageTag || undefined}
            onChange={setSelectedImageTag}
            disabled={versions.length === 0}
            loading={fetchingVersions}
          >
            {versions.map(imageUrl => (
              <Select.Option key={imageUrl} value={imageUrl}>
                {imageUrl}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>
    );
  };

  const canDeploy = () => {
    if (isMultiService) {
      // All services must have a version selected
      return serviceNames.every(name => !!selectedServiceImages[name]);
    } else {
      // Single service must have a tag selected
      return !!selectedImageTag;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined />
          <span>Docker 배포</span>
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button
          key='cancel'
          onClick={onClose}
          disabled={deploymentStatus === 'deploying'}
        >
          {deploymentStatus === 'deploying' ? '배포 진행 중...' : '취소'}
        </Button>,
        deploymentStatus === 'idle' && (
          <Button
            key='deploy'
            type='primary'
            icon={<RocketOutlined />}
            loading={loading}
            disabled={!canDeploy()}
            onClick={handleDeploy}
          >
            배포
          </Button>
        ),
      ]}
    >
      <Spin spinning={fetchingVersions}>
        {service && (
          <div>
            <Title level={5}>{service.name}</Title>
            <Divider />

            {/* 배포 상태 표시 */}
            {deploymentStatus !== 'idle' && (
              <Alert
                message={
                  deploymentStatus === 'deploying'
                    ? '배포 진행 중'
                    : deploymentStatus === 'success'
                      ? '배포 완료'
                      : '배포 실패'
                }
                description={deploymentMessage}
                type={
                  deploymentStatus === 'deploying'
                    ? 'info'
                    : deploymentStatus === 'success'
                      ? 'success'
                      : 'error'
                }
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {isMultiService
              ? renderMultiServiceSelector()
              : renderSingleServiceSelector()}

            {/* 배포 옵션 */}
            <Divider
              orientation='left'
              style={{ marginTop: 24, marginBottom: 16 }}
            >
              <Space>
                <CloudUploadOutlined />
                배포 옵션
              </Space>
            </Divider>

            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <CloudUploadOutlined style={{ color: '#1890ff' }} />
                  <Text>배포 전 자동 백업</Text>
                  <Tooltip title='배포 전에 현재 상태를 자동으로 백업합니다. 배포 실패 시 롤백에 사용할 수 있습니다.'>
                    <QuestionCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
                <Switch
                  checked={autoBackupEnabled}
                  onChange={setAutoBackupEnabled}
                  checkedChildren='ON'
                  unCheckedChildren='OFF'
                  disabled={deploymentStatus === 'deploying'}
                />
              </Space>
              {autoBackupEnabled && (
                <Text
                  type='secondary'
                  style={{ display: 'block', marginTop: 8, fontSize: 12 }}
                >
                  배포 시작 전 볼륨과 설정이 자동으로 백업됩니다.
                </Text>
              )}
            </div>

            {Object.keys(serviceBuildVersions).length === 0 &&
              !fetchingVersions && (
                <Alert
                  message='빌드된 이미지가 없습니다'
                  description='먼저 빌드를 실행하여 배포 가능한 이미지를 생성하세요.'
                  type='warning'
                  showIcon
                />
              )}
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default DockerDeployModal;
