import React from 'react';
import { Card, Tabs, Empty, Button, Space, Tooltip, Modal } from 'antd';
import { SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import { InfraWithNodes } from '../../types/infra';
import InfraCloudSetting from './InfraCloudSetting';
import InfraBaremetalSetting from './InfraBaremetalSetting';
import InfraDockerSetting from './InfraDockerSetting';
import InfraKubernetesSetting from './InfraKubernetesSetting';
import InfraPodmanSetting from './InfraPodmanSetting';
import InfraVeleroSetting from './InfraVeleroSetting';
import InfraMinioSetting from './InfraMinioSetting';
import { InfraStatus } from '../../types/infra'; // InfraStatus 타입 import

const { TabPane } = Tabs;

interface InfraConfigFormProps {
  selectedInfra: InfraWithNodes | null;
  onShowSettings: (infra: InfraWithNodes) => void;
  onShowPermissions: (infra: InfraWithNodes) => void;
  onDeleteInfra: (infraId: number) => void;
  onRefresh: () => void; //  2. onRefresh prop을 추가로 받습니다.
  onStatusUpdate: (infraId: number, status: InfraStatus) => void;
}

const InfraConfigForm: React.FC<InfraConfigFormProps> = ({
  selectedInfra,
  onShowSettings,
  onDeleteInfra,
  onStatusUpdate, //  props 받기
}) => {
  // 타입별 설정 렌더링
  const renderSettingsByType = () => {
    if (!selectedInfra) return null;

    const settingsMap: { [key: string]: React.ReactNode } = {
      kubernetes: (
        <InfraKubernetesSetting
          infra={selectedInfra}
          showSettingsModal={onShowSettings}
        />
      ),
      baremetal: (
        <InfraBaremetalSetting
          infra={selectedInfra}
          showSettingsModal={onShowSettings}
        />
      ),
      docker: (
        <InfraDockerSetting
          infra={selectedInfra}
          onStatusUpdate={onStatusUpdate}
        />
      ),
      cloud: (
        <InfraCloudSetting
          infra={selectedInfra}
          showSettingsModal={onShowSettings}
        />
      ),
      podman: (
        <InfraPodmanSetting
          infra={selectedInfra}
          onStatusUpdate={onStatusUpdate}
        />
      ),
      velero: <InfraVeleroSetting infra={selectedInfra} />,
      minio: <InfraMinioSetting infra={selectedInfra} />,
      external_kubernetes: (
        <InfraKubernetesSetting
          infra={selectedInfra}
          showSettingsModal={onShowSettings}
          isExternal={true}
        />
      ),
    };

    return (
      settingsMap[selectedInfra.type] || (
        <div>지원하지 않는 인프라 타입입니다.</div>
      )
    );
  };

  // 설정 제목과 버튼들을 포함한 커스텀 헤더
  const renderCardTitle = () => {
    if (!selectedInfra) return '설정';

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>설정</span>
        <Space size='small'>
          <Tooltip title='인프라 설정'>
            <Button
              type='text'
              icon={<SettingOutlined />}
              onClick={() => onShowSettings(selectedInfra)}
            />
          </Tooltip>

          {/* DEPRECATED: 권한 관리 버튼 - organization 기반 권한 관리로 변경 */}
          {/* <Tooltip title='권한 관리'>
            <Button
              type='text'
              icon={<UsergroupAddOutlined />}
              onClick={() => onShowPermissions(selectedInfra)}
            />
          </Tooltip> */}

          <Tooltip title='인프라 삭제'>
            <Button
              type='text'
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '인프라 삭제',
                  content: `"${selectedInfra.name}" 인프라를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                  okText: '삭제',
                  okType: 'danger',
                  cancelText: '취소',
                  onOk: () => onDeleteInfra(selectedInfra.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      </div>
    );
  };

  return (
    <Card title={renderCardTitle()} size='small'>
      {selectedInfra ? (
        <Tabs defaultActiveKey='settings'>
          <TabPane tab='' key='settings'>
            {renderSettingsByType()}
          </TabPane>
        </Tabs>
      ) : (
        <Empty description='인프라를 선택해주세요.' />
      )}
    </Card>
  );
};

export default InfraConfigForm;
