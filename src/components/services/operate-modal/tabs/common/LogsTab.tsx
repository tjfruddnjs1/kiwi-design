import React from 'react';
import { Alert, Button, Select, Space, Typography, Input } from 'antd';
import { FileTextOutlined, SyncOutlined } from '@ant-design/icons';
import type { PodInfo } from '../../../../../types/operate-modal';
import type { DockerContainer } from '../../../../../types/docker';

const { Text } = Typography;
const { TextArea } = Input;

interface LogsTabProps {
  isContainerInfra: boolean;
  isDockerInfra: boolean;
  // Docker props
  containers?: DockerContainer[];
  selectedContainer?: string;
  onSelectedContainerChange?: (containerId: string) => void;
  loadingContainers?: boolean;
  dockerServerId?: number;
  // K8s props
  pods?: PodInfo[];
  selectedPod?: string;
  onSelectedPodChange?: (podName: string) => void;
  // Common props
  logs: string;
  loadingLogs: boolean;
  onGetLogs: () => void;
  onClearLogs: () => void;
  // Helper functions
  getPodStatusIcon?: (status: string) => React.ReactNode;
  getPodStatusColor?: (status: string) => string;
}

/**
 * 로그 조회 탭
 * Docker 컨테이너 또는 Kubernetes Pod의 로그를 조회합니다.
 */
const LogsTab: React.FC<LogsTabProps> = ({
  isContainerInfra,
  isDockerInfra,
  containers = [],
  selectedContainer,
  onSelectedContainerChange,
  loadingContainers = false,
  dockerServerId,
  pods = [],
  selectedPod,
  onSelectedPodChange,
  logs,
  loadingLogs,
  onGetLogs,
  onClearLogs,
  getPodStatusIcon,
}) => {
  if (isContainerInfra) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={`${isDockerInfra ? 'Docker' : 'Podman'} 컨테이너 로그 조회`}
          description='선택한 컨테이너의 최근 로그를 확인할 수 있습니다.'
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%' }} direction='vertical'>
            <div>
              <Text strong>컨테이너 선택:</Text>
              <Select
                value={selectedContainer}
                onChange={onSelectedContainerChange}
                style={{ width: '100%', marginTop: 8 }}
                placeholder='컨테이너를 선택하세요'
                disabled={containers.length === 0 || loadingContainers}
                loading={loadingContainers}
              >
                {containers.map(container => (
                  <Select.Option key={container.id} value={container.id}>
                    <Space>
                      <Text>{container.name}</Text>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        ({container.image})
                      </Text>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>
            <Space>
              <Button
                type='primary'
                icon={<FileTextOutlined />}
                onClick={onGetLogs}
                loading={loadingLogs}
                disabled={!selectedContainer || !dockerServerId}
              >
                로그 조회
              </Button>
              <Button icon={<SyncOutlined />} onClick={onClearLogs}>
                초기화
              </Button>
            </Space>
          </Space>
        </div>
        <TextArea
          value={logs}
          readOnly
          rows={20}
          placeholder='로그 내용이 여기에 표시됩니다...'
          style={{
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 12,
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='Pod 로그 조회'
        description='선택한 Pod의 최근 로그를 확인할 수 있습니다.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%' }} direction='vertical'>
          <div>
            <Text strong>Pod 선택:</Text>
            <Select
              value={selectedPod}
              onChange={onSelectedPodChange}
              style={{ width: '100%', marginTop: 8 }}
              placeholder='Pod를 선택하세요'
              disabled={pods.length === 0}
            >
              {pods.map(pod => {
                const podName =
                  typeof pod.name === 'string'
                    ? pod.name.trim()
                    : String(pod.name || '').trim();
                return (
                  <Select.Option key={podName} value={podName}>
                    <Space>
                      {getPodStatusIcon?.(pod.status)}
                      {podName}
                    </Space>
                  </Select.Option>
                );
              })}
            </Select>
          </div>
          <Space>
            <Button
              type='primary'
              icon={<FileTextOutlined />}
              onClick={onGetLogs}
              loading={loadingLogs}
              disabled={!selectedPod}
            >
              로그 조회
            </Button>
            <Button icon={<SyncOutlined />} onClick={onClearLogs}>
              초기화
            </Button>
          </Space>
        </Space>
      </div>
      <TextArea
        value={logs}
        readOnly
        rows={20}
        placeholder='로그 내용이 여기에 표시됩니다...'
        style={{
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: 12,
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
        }}
      />
    </div>
  );
};

export default LogsTab;
