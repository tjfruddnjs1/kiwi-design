import React from 'react';
import { Form, Input, Select, Radio, Alert } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { InfraItem, Server } from '../../types/infra';
import { BackupStorageWithInfra } from '../../types/backup';

const { Option } = Select;

interface Hop {
  host: string;
  port: number;
}

interface BackupSetupWizardProps {
  currentStep: number;
  minioMode: string;
  setMinioMode: (mode: string) => void;
  allMinioStorages: BackupStorageWithInfra[];
  selectedInfraId: string | undefined;
  infrastructures: InfraItem[];
  servers: Server[];
  setupHops: Hop[];
  handleInfraChange: (infraId: string) => void;
  renderServerOptions: () => React.ReactNode;
  renderAuthFields: (hops: Hop[]) => React.ReactNode;
}

// Step 0: 저장소 설정 컴포넌트
const StorageSetupStep: React.FC<{
  minioMode: string;
  setMinioMode: (mode: string) => void;
  allMinioStorages: BackupStorageWithInfra[];
  selectedInfraId: string | undefined;
  infrastructures: InfraItem[];
  servers: Server[];
  setupHops: Hop[];
  handleInfraChange: (infraId: string) => void;
  renderServerOptions: () => React.ReactNode;
  renderAuthFields: (hops: Hop[]) => React.ReactNode;
}> = ({
  minioMode,
  setMinioMode,
  allMinioStorages,
  selectedInfraId,
  infrastructures,
  servers,
  setupHops,
  handleInfraChange,
  renderServerOptions,
  renderAuthFields,
}) => {
  const getDockerHostIP = () => {
    try {
      const infra = infrastructures.find(i => i.id === Number(selectedInfraId));

      if (infra?.type === 'docker') {
        const dockerServers = servers.filter(
          s => s.infra_id === Number(selectedInfraId)
        );

        if (dockerServers.length > 0 && dockerServers[0]) {
          const serverHops = (
            typeof dockerServers[0].hops === 'string'
              ? JSON.parse(dockerServers[0].hops || '[]')
              : dockerServers[0].hops || []
          ) as Array<{ host?: string }>;

          if (serverHops.length > 0) {
            return serverHops[0].host || '';
          }
        }

        if (infra.info) {
          const parsed = JSON.parse(infra.info) as { host?: string };

          return parsed.host || '';
        }
      }
    } catch {
      // JSON parsing failed - return empty string
    }

    return '';
  };

  const renderStorageOptions = () => (
    <Form.Item
      label='백업 저장소 방식'
      name='minioMode'
      initialValue='new'
      rules={[{ required: true, message: '저장소 방식을 선택해주세요' }]}
    >
      <Radio.Group onChange={e => setMinioMode(e.target.value)}>
        <Radio value='new'>새로 설치</Radio>
        <Radio value='existing' disabled={allMinioStorages.length === 0}>
          기존 저장소 선택
          {allMinioStorages.length > 0 && (
            <span style={{ color: '#666', fontSize: '12px' }}>
              ({allMinioStorages.length}개 사용 가능)
            </span>
          )}
          {allMinioStorages.length === 0 && (
            <span style={{ color: '#999', fontSize: '12px' }}>
              (사용 가능한 저장소 없음)
            </span>
          )}
        </Radio>
      </Radio.Group>
    </Form.Item>
  );

  const renderExistingStorage = () => (
    <Form.Item
      label='기존 백업 저장소'
      name='existingMinioId'
      rules={[{ required: true, message: '기존 저장소를 선택해주세요' }]}
    >
      <Select placeholder='기존 저장소 선택'>
        {allMinioStorages.map(storage => (
          <Option key={storage.id} value={storage.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 'bold' }}>{storage.endpoint}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {storage.infra_name} ({storage.infra_type}) -{' '}
                {storage.access_key}
              </div>
            </div>
          </Option>
        ))}
      </Select>
    </Form.Item>
  );

  const renderNewStorage = () => (
    <>
      <Form.Item
        name='storageInfra'
        label='저장소 위치 선택'
        rules={[
          {
            required: true,
            message: '백업 저장소를 설치할 위치를 선택해주세요',
          },
        ]}
      >
        <Select
          placeholder='인프라 선택'
          size='large'
          onChange={handleInfraChange}
        >
          {infrastructures.map(infra => (
            <Option key={infra.id} value={infra.id}>
              {infra.name} ({infra.type})
            </Option>
          ))}
        </Select>
      </Form.Item>

      {selectedInfraId && (
        <>
          {infrastructures.find(i => i.id === Number(selectedInfraId))?.type ===
          'docker' ? (
            <Form.Item label='도커 호스트 IP'>
              <Input
                value={getDockerHostIP()}
                disabled
                placeholder='도커 호스트 IP'
              />
            </Form.Item>
          ) : servers.length > 0 ? (
            <Form.Item
              name='storageServer'
              label='저장소 서버 선택'
              rules={[
                {
                  required: true,
                  message: '백업 저장소를 설치할 서버를 선택해주세요',
                },
              ]}
            >
              <Select placeholder='서버 선택' size='large'>
                {renderServerOptions()}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item label='서버 정보'>
              <Alert
                message='서버 정보가 없습니다'
                description='이 인프라에는 등록된 서버가 없습니다. 관리자에게 문의하세요.'
                type='warning'
                showIcon
              />
            </Form.Item>
          )}
        </>
      )}

      <Form.Item
        name='username'
        label='서버 접속 계정'
        rules={[
          {
            required: true,
            message: '서버 접속 계정을 입력해주세요',
          },
        ]}
      >
        <Input placeholder='예: root' />
      </Form.Item>

      <Form.Item
        name='password'
        label='서버 접속 비밀번호'
        rules={[
          {
            required: true,
            message: '서버 접속 비밀번호를 입력해주세요',
          },
        ]}
      >
        <Input.Password />
      </Form.Item>
      {selectedInfraId && renderAuthFields(setupHops)}
    </>
  );

  const renderRequirements = () => (
    <div className='step-description'>
      <Alert
        message='설치 요구사항'
        description={
          <ul>
            <li>최소 4GB 이상의 여유 공간</li>
            <li>9000번 포트 사용 가능</li>
            {selectedInfraId &&
            infrastructures.find(i => i.id === Number(selectedInfraId))
              ?.type === 'docker' ? (
              <>
                <li>도커 호스트에 SSH 접근 가능</li>
                <li>도커 데몬 실행 중</li>
                <li>도커 명령어 사용 가능</li>
              </>
            ) : (
              <li>sudo 권한 필요</li>
            )}
          </ul>
        }
        type='info'
        showIcon
      />
    </div>
  );

  return (
    <div className='step-content'>
      {renderStorageOptions()}
      {minioMode === 'existing' ? renderExistingStorage() : null}
      {minioMode === 'new' ? renderNewStorage() : null}
      {renderRequirements()}
    </div>
  );
};

// Step 1: 백업 엔진 설정 컴포넌트
const EngineSetupStep: React.FC<{
  infrastructures: InfraItem[];
}> = ({ infrastructures }) => {
  return (
    <div className='step-content'>
      <div className='step-header'>
        <SafetyOutlined className='step-icon' />
        <div className='step-info'>
          <h3>백업 엔진 설정</h3>
          <p>백업을 수행할 엔진을 설치합니다.</p>
        </div>
      </div>
      <Form.Item
        name='k8sInfra'
        label='쿠버네티스 클러스터 선택'
        rules={[
          {
            required: true,
            message: '쿠버네티스 클러스터를 선택해주세요',
          },
        ]}
      >
        <Select placeholder='클러스터 선택' size='large'>
          {infrastructures
            .filter(infra => infra.type === 'kubernetes')
            .map(infra => (
              <Option key={infra.id} value={infra.id}>
                {infra.name}
              </Option>
            ))}
        </Select>
      </Form.Item>

      <Form.Item
        name='veleroUsername'
        label='서버 접속 계정'
        rules={[{ required: true, message: '서버 접속 계정을 입력해주세요' }]}
      >
        <Input placeholder='예: root' />
      </Form.Item>

      <Form.Item
        name='veleroPassword'
        label='서버 접속 비밀번호'
        rules={[
          {
            required: true,
            message: '서버 접속 비밀번호를 입력해주세요',
          },
        ]}
      >
        <Input.Password />
      </Form.Item>

      <div className='step-description'>
        <Alert
          message='설치 요구사항'
          description={
            <ul>
              <li>쿠버네티스 클러스터 관리자 권한</li>
              <li>kubectl 명령어 사용 가능</li>
              <li>sudo 권한 필요</li>
            </ul>
          }
          type='info'
          showIcon
        />
      </div>
    </div>
  );
};

const BackupSetupWizard: React.FC<BackupSetupWizardProps> = ({
  currentStep,
  minioMode,
  setMinioMode,
  allMinioStorages,
  selectedInfraId,
  infrastructures,
  servers,
  setupHops,
  handleInfraChange,
  renderServerOptions,
  renderAuthFields,
}) => {
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <StorageSetupStep
            minioMode={minioMode}
            setMinioMode={setMinioMode}
            allMinioStorages={allMinioStorages}
            selectedInfraId={selectedInfraId}
            infrastructures={infrastructures}
            servers={servers}
            setupHops={setupHops}
            handleInfraChange={handleInfraChange}
            renderServerOptions={renderServerOptions}
            renderAuthFields={renderAuthFields}
          />
        );

      case 1:
        return <EngineSetupStep infrastructures={infrastructures} />;

      default:
        return null;
    }
  };

  return <>{renderStepContent()}</>;
};

export default BackupSetupWizard;
