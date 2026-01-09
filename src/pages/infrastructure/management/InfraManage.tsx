import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Typography, Space, Empty, Spin } from 'antd';
import { CloudServerOutlined, ReloadOutlined } from '@ant-design/icons';
import { InfraItem } from '../../../types/infra';
import InfraSettingsModal from '../settings/InfraSettingsModal';
import { InfraPermissionModal } from '../../../components/infra';
import { useInfraManagement } from '../../../hooks/useInfraManagement';
import { createInfraTableColumns } from '../../../utils/infraTableConfig';
import { useNavigate } from 'react-router-dom';
import './InfraManage.css';

const { Title } = Typography;

const InfraManage: React.FC = () => {
  const navigate = useNavigate();

  // Custom hook for infrastructure management
  const {
    infraData,
    loading,
    refreshing,
    fetchInfraData,
    refreshInfraData,
    deleteInfrastructure,
    contextHolder,
  } = useInfraManagement();

  // Modal states
  const [isSettingsModalVisible, setIsSettingsModalVisible] =
    useState<boolean>(false);
  const [isPermissionModalVisible, setIsPermissionModalVisible] =
    useState<boolean>(false);

  // Selected infrastructure states
  const [selectedInfra, setSelectedInfra] = useState<InfraItem | null>(null);
  const [selectedInfraForPermission, setSelectedInfraForPermission] =
    useState<InfraItem | null>(null);

  // Initialize data on component mount
  useEffect(() => {
    fetchInfraData();
  }, [fetchInfraData]);

  // Modal handlers
  const handleShowSettings = (infra: InfraItem) => {
    setSelectedInfra(infra);
    setIsSettingsModalVisible(true);
  };

  const handleShowPermissions = (infra: InfraItem) => {
    setSelectedInfraForPermission(infra);
    setIsPermissionModalVisible(true);
  };

  const handleDeleteInfra = async (infraId: number) => {
    await deleteInfrastructure(infraId);
  };

  // Table configuration
  const tableColumns = createInfraTableColumns({
    onShowSettings: handleShowSettings,
    onShowPermissions: handleShowPermissions,
    onDeleteInfra: handleDeleteInfra,
    navigate,
  });

  return (
    <div className='infra-manage management-page'>
      {contextHolder}

      <Card>
        <div className='infra-manage-header'>
          <div className='header-left'>
            <Space align='center'>
              <CloudServerOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>
                인프라 관리
              </Title>
            </Space>
          </div>

          <div className='header-right'>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={refreshInfraData}
                loading={refreshing}
              >
                새로고침
              </Button>
            </Space>
          </div>
        </div>

        <Spin spinning={loading}>
          {infraData.length > 0 ? (
            <Table
              dataSource={infraData}
              columns={tableColumns}
              rowKey='id'
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} / ${total}개 항목`,
              }}
              className='infra-table'
            />
          ) : (
            !loading && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description='등록된 인프라가 없습니다'
                style={{ margin: '40px 0' }}
              />
            )
          )}
        </Spin>
      </Card>

      {/* Modals */}
      {selectedInfra && (
        <InfraSettingsModal
          visible={isSettingsModalVisible}
          infraItem={{
            ...selectedInfra,
            nodes: [],
          }}
          onCancel={() => {
            setIsSettingsModalVisible(false);
            setSelectedInfra(null);
          }}
          onSave={() => {
            fetchInfraData();
            setIsSettingsModalVisible(false);
            setSelectedInfra(null);
          }}
        />
      )}

      {selectedInfraForPermission && (
        <InfraPermissionModal
          visible={isPermissionModalVisible}
          infra={selectedInfraForPermission}
          onClose={() => {
            setIsPermissionModalVisible(false);
            setSelectedInfraForPermission(null);
          }}
        />
      )}
    </div>
  );
};

export default InfraManage;
