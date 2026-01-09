import React from 'react';
import { Alert, Button, Input, Select, Space, Typography } from 'antd';
import {
  CodeOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { DockerContainer } from '../../../../../types/docker';

const { Text } = Typography;
const { TextArea } = Input;

interface ExecuteTabProps {
  isContainerInfra: boolean;
  isDockerInfra: boolean;
  // Docker props
  containers?: DockerContainer[];
  selectedContainerId?: string;
  onSelectedContainerIdChange?: (containerId: string) => void;
  // Common props
  commandInput: string;
  commandOutput: string;
  executingCommand: boolean;
  onCommandInputChange: (command: string) => void;
  onExecuteCommand: () => void;
  onClearOutput: () => void;
}

/**
 * 명령 실행 탭
 * Docker 컨테이너 내부 또는 K8s kubectl 명령을 실행합니다.
 */
const ExecuteTab: React.FC<ExecuteTabProps> = ({
  isContainerInfra,
  isDockerInfra,
  containers = [],
  selectedContainerId,
  onSelectedContainerIdChange,
  commandInput,
  commandOutput,
  executingCommand,
  onCommandInputChange,
  onExecuteCommand,
  onClearOutput,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !executingCommand && commandInput.trim()) {
      onExecuteCommand();
    }
  };

  if (isContainerInfra) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={`${isDockerInfra ? 'Docker' : 'Podman'} 명령 실행`}
          description={`${isDockerInfra ? 'Docker' : 'Podman'} 서버에서 직접 명령을 실행할 수 있습니다. 컨테이너를 선택하면 컨테이너 내부에서, 선택하지 않으면 호스트에서 명령이 실행됩니다.`}
          type='warning'
          showIcon
          icon={<CodeOutlined />}
          style={{ marginBottom: 16 }}
        />

        {/* 컨테이너 선택 (선택적) */}
        <div style={{ marginBottom: 16 }}>
          <Space direction='vertical' style={{ width: '100%' }}>
            <Text strong>컨테이너 선택 (선택적):</Text>
            <Select
              style={{ width: '100%' }}
              value={selectedContainerId}
              onChange={onSelectedContainerIdChange}
              placeholder='호스트에서 명령 실행 (컨테이너 선택 안 함)'
              allowClear
            >
              {containers.map(container => (
                <Select.Option key={container.id} value={container.id}>
                  {container.name} ({container.id.substring(0, 12)}) -{' '}
                  {container.status}
                </Select.Option>
              ))}
            </Select>
            {selectedContainerId && (
              <Alert
                message={`선택된 컨테이너: ${
                  containers.find(c => c.id === selectedContainerId)?.name
                }`}
                type='info'
                showIcon
                closable
                onClose={() => onSelectedContainerIdChange?.('')}
              />
            )}
          </Space>
        </div>

        {/* 명령어 입력 */}
        <div style={{ marginBottom: 16 }}>
          <Space direction='vertical' style={{ width: '100%' }}>
            <Text strong>명령어 입력:</Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={commandInput}
                onChange={e => onCommandInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  selectedContainerId
                    ? '예: ls -la /app'
                    : '예: docker ps -a 또는 podman ps -a'
                }
                style={{ flex: 1 }}
                disabled={executingCommand}
              />
              <Button
                type='primary'
                icon={<PlayCircleOutlined />}
                onClick={onExecuteCommand}
                loading={executingCommand}
                disabled={!commandInput.trim()}
              >
                실행
              </Button>
            </Space.Compact>
          </Space>
        </div>

        {/* 도구 버튼 */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button icon={<SyncOutlined />} onClick={onClearOutput}>
              출력 초기화
            </Button>
            {selectedContainerId && (
              <Button
                onClick={() => onSelectedContainerIdChange?.('')}
                icon={<CloseCircleOutlined />}
              >
                컨테이너 선택 해제
              </Button>
            )}
          </Space>
        </div>

        {/* 명령 결과 출력 */}
        <div>
          <Text
            type='secondary'
            style={{ fontSize: 12, marginBottom: 8, display: 'block' }}
          >
            💡 각 명령어 실행 시 타임스탬프와 실행 컨텍스트(컨테이너/호스트)가
            함께 표시됩니다.
          </Text>
          <TextArea
            value={commandOutput}
            readOnly
            rows={20}
            placeholder='명령어 실행 결과가 여기에 표시됩니다...\n\n각 실행은 다음과 같이 구분됩니다:\n━━━ [시간] 컨테이너명/호스트 ━━━\n$ 명령어\n출력 결과'
            style={{
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: 12,
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              whiteSpace: 'pre-wrap',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='SSH 명령어 실행'
        description='kubectl, docker 등의 명령어를 직접 실행할 수 있습니다.'
        type='warning'
        showIcon
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text strong>명령어 입력:</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={commandInput}
              onChange={e => onCommandInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='예: kubectl get pods -n default'
              style={{ flex: 1 }}
              disabled={executingCommand}
            />
            <Button
              type='primary'
              icon={<PlayCircleOutlined />}
              onClick={onExecuteCommand}
              loading={executingCommand}
              disabled={!commandInput.trim()}
            >
              실행
            </Button>
          </Space.Compact>
        </Space>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<SyncOutlined />} onClick={onClearOutput}>
          출력 초기화
        </Button>
      </div>
      <div>
        <Text
          type='secondary'
          style={{ fontSize: 12, marginBottom: 8, display: 'block' }}
        >
          💡 각 명령어 실행 시 타임스탬프와 실행 컨텍스트가 함께 표시됩니다.
        </Text>
        <TextArea
          value={commandOutput}
          readOnly
          rows={20}
          placeholder='명령어 실행 결과가 여기에 표시됩니다...\n\n각 실행은 다음과 같이 구분됩니다:\n━━━ [시간] 실행 컨텍스트 ━━━\n$ 명령어\n출력 결과'
          style={{
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 12,
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            whiteSpace: 'pre-wrap',
          }}
        />
      </div>
    </div>
  );
};

export default ExecuteTab;
