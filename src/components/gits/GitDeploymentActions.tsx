import React, { useState } from 'react';
import { Button, Space, Dropdown } from 'antd';
import {
  RocketOutlined,
  DownOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import type { Service } from '../../lib/api/types';
import DockerDeployModal from '../services/DockerDeployModal';
import { pipelineApi } from '../../lib/api/pipeline';
import logger from '../../utils/logger';

export interface GitDeploymentActionsProps {
  service: Service;
  infraType?: string | null;
  disabled?: boolean;
  onDeploySuccess?: () => void;
}

/**
 * Git 서비스의 배포 관련 액션 컴포넌트
 * - Kubernetes 배포
 * - Docker 배포 (멀티-서비스 자동 감지)
 */
const GitDeploymentActions: React.FC<GitDeploymentActionsProps> = ({
  service,
  infraType,
  disabled = false,
  onDeploySuccess,
}) => {
  const [dockerDeployModalVisible, setDockerDeployModalVisible] =
    useState(false);
  const [deploying, setDeploying] = useState(false);

  // Kubernetes 배포 핸들러
  const handleK8sDeploy = async () => {
    setDeploying(true);
    try {
      logger.info('[GitDeploymentActions] Kubernetes deployment triggered', {
        serviceId: service.id,
        serviceName: service.name,
      });

      // 기존 Kubernetes 배포 로직 호출
      await pipelineApi.deployToK8s(service.id);

      // Notification이 이미 존재하므로 토스트 메시지 제거
      onDeploySuccess?.();
    } catch (error) {
      logger.error('[GitDeploymentActions] Kubernetes deployment failed', {
        error,
      });
      // Notification이 이미 존재하므로 토스트 메시지 제거
    } finally {
      setDeploying(false);
    }
  };

  // Docker 배포 모달 열기
  const handleDockerDeployClick = () => {
    logger.info('[GitDeploymentActions] Docker deploy modal opened', {
      serviceId: service.id,
      isMultiService: service.is_multi_service,
      serviceNames: service.service_names,
    });
    setDockerDeployModalVisible(true);
  };

  // 배포 타입에 따른 메뉴 아이템
  const deployMenuItems = [
    {
      key: 'kubernetes',
      label: 'Kubernetes 배포',
      icon: <CloudServerOutlined />,
      disabled:
        infraType !== 'kubernetes' && infraType !== 'external_kubernetes',
      onClick: handleK8sDeploy,
    },
    {
      key: 'docker',
      label: 'Docker 배포',
      icon: <RocketOutlined />,
      disabled: infraType !== 'docker' && infraType !== 'external_docker',
      onClick: handleDockerDeployClick,
    },
  ];

  // 단일 배포 버튼 (인프라 타입에 따라 자동 선택)
  const renderSingleDeployButton = () => {
    const isK8s =
      infraType === 'kubernetes' || infraType === 'external_kubernetes';
    const isDocker = infraType === 'docker' || infraType === 'external_docker';

    if (isK8s) {
      return (
        <Button
          type='primary'
          icon={<RocketOutlined />}
          onClick={handleK8sDeploy}
          loading={deploying}
          disabled={disabled}
        >
          Kubernetes 배포
        </Button>
      );
    }

    if (isDocker) {
      return (
        <Button
          type='primary'
          icon={<RocketOutlined />}
          onClick={handleDockerDeployClick}
          disabled={disabled}
        >
          Docker 배포
        </Button>
      );
    }

    return null;
  };

  // 드롭다운 배포 버튼 (두 가지 옵션 모두 표시)
  const renderDropdownDeployButton = () => {
    return (
      <Dropdown
        menu={{ items: deployMenuItems }}
        trigger={['click']}
        disabled={disabled}
      >
        <Button type='primary' loading={deploying}>
          <Space>
            <RocketOutlined />
            배포
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
    );
  };

  return (
    <>
      {/* 인프라 타입이 명확한 경우 단일 버튼, 그렇지 않으면 드롭다운 */}
      {infraType ? renderSingleDeployButton() : renderDropdownDeployButton()}

      {/* Docker 배포 모달 */}
      <DockerDeployModal
        visible={dockerDeployModalVisible}
        onClose={() => setDockerDeployModalVisible(false)}
        service={service}
        onDeploySuccess={() => {
          // Notification이 이미 존재하므로 토스트 메시지 제거
          setDockerDeployModalVisible(false);
          onDeploySuccess?.();
        }}
      />
    </>
  );
};

export default GitDeploymentActions;
