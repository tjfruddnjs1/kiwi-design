import React from 'react';
import { Form, Select, Radio } from 'antd';
import { InfraItem } from '../../../types/infra';
import AuthFields, { Hop } from './AuthFields';
import { BackupStorageWithInfra } from '../../../types';

const { Option } = Select;

interface SetupWizardStepsProps {
  currentStep: number;
  minioMode: 'existing' | 'new';
  setMinioMode: (mode: 'existing' | 'new') => void;
  infrastructures: InfraItem[];
  getServerOptions: () => { key: number; value: number; label: string }[];
  selectedServerHops: Hop[];
  onStorageInfraChange: (infraId: number) => void;
  onStorageServerChange: (serverId: number) => void;
  engineAuthHops: Hop[];
  onK8sInfraChange: (infraId: number) => void;
  allMinioStorages?: BackupStorageWithInfra[]; // 👈 추가 (BackupStorageWithInfra 타입 임포트 필요)
}

const SetupWizardSteps: React.FC<SetupWizardStepsProps> = ({
  currentStep,
  minioMode,
  setMinioMode,
  infrastructures,
  getServerOptions,
  onStorageInfraChange,
  selectedServerHops,
  onStorageServerChange,
  engineAuthHops, //  props로 받음
  onK8sInfraChange, //  props로 받음
  allMinioStorages,
}) => {
  const renderStep0 = () => (
    <div className='step-content'>
      <div className='step-header'>
        <div className='step-info'>
          <h3>백업 저장소 설정</h3>
          <p>백업 데이터를 저장할 저장소를 설정합니다.</p>
        </div>
      </div>

      <Form.Item
        label='백업 저장소 방식'
        name='minioMode'
        initialValue='new'
        rules={[{ required: true, message: '저장소 방식을 선택해주세요' }]}
      >
        <Radio.Group
          onChange={e => {
            //  3. 라디오 버튼 클릭 시 어떤 값이 넘어오는지 확인합니다.

            setMinioMode(e.target.value);
          }}
        >
          <Radio value='new'>새로 설치</Radio>
          <Radio value='existing'>
            기존 저장소 선택
            <span style={{ color: '#666', fontSize: '12px', marginLeft: 8 }}>
              (사용 가능한 저장소가 있는 경우)
            </span>
          </Radio>
        </Radio.Group>
      </Form.Item>

      {minioMode === 'new' && (
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
              onChange={onStorageInfraChange}
            >
              {infrastructures.map(infra => (
                <Option key={infra.id} value={infra.id}>
                  {infra.name} ({infra.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name='storageServer'
            label='설치 서버'
            rules={[
              {
                required: true,
                message: '백업 저장소를 설치할 서버를 선택해주세요',
              },
            ]}
          >
            <Select
              placeholder='서버 선택'
              size='large'
              onChange={onStorageServerChange}
            >
              {getServerOptions().map(option => (
                <Option key={option.key} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <AuthFields hops={selectedServerHops} namePrefix='minio' />
        </>
      )}
      {minioMode === 'existing' && (
        <Form.Item
          name='existingMinioId' // 👈 백엔드로 전달될 필드 이름
          label='사용할 저장소 선택'
          rules={[
            { required: true, message: '사용할 백업 저장소를 선택해주세요' },
          ]}
        >
          <Select placeholder='기존 MinIO 저장소 선택' size='large'>
            {(allMinioStorages || []).map(storage => (
              <Option key={storage.id} value={storage.id}>
                {/* 인프라 이름과 엔드포인트를 함께 보여주어 식별이 용이하게 함 */}
                {storage.infra_name} ({storage.endpoint})
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className='step-content'>
      <div className='step-header'>
        <div className='step-info'>
          <h3>백업 엔진 설정</h3>
          <p>Velero 백업 엔진을 설정합니다.</p>
        </div>
      </div>

      <Form.Item
        name='k8sInfra'
        label='쿠버네티스 클러스터 선택'
        rules={[
          {
            required: true,
            message: 'Velero를 설치할 쿠버네티스 클러스터를 선택해주세요',
          },
        ]}
      >
        <Select
          placeholder='쿠버네티스 클러스터 선택'
          size='large'
          onChange={onK8sInfraChange}
        >
          {infrastructures
            .filter(
              infra =>
                infra.type === 'kubernetes' ||
                infra.type === 'external_kubernetes'
            )
            .map(infra => (
              <Option key={infra.id} value={infra.id}>
                {infra.name}
              </Option>
            ))}
        </Select>
      </Form.Item>

      {/* 2단계(엔진 설정)의 인증 필드를 렌더링합니다. */}
      <AuthFields hops={engineAuthHops} namePrefix='velero' />
    </div>
  );

  switch (currentStep) {
    case 0:
      return renderStep0();
    case 1:
      return renderStep1();
    default:
      return null;
  }
};

export default SetupWizardSteps;
