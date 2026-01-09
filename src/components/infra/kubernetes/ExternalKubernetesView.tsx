// External Kubernetes cluster view component

import React from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Divider,
  Empty,
  Row,
  Col,
} from 'antd';
import {
  CloudServerOutlined,
  PlusOutlined,
  ClusterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { InfraItem } from '../../../types/infra';
import { ExternalNodesInfo } from './types';

const { Text } = Typography;

interface ExternalKubernetesViewProps {
  infra: InfraItem;
  externalNodesInfo: ExternalNodesInfo | null;
  onConnectExternal: () => void;
  onShowSettings: () => void;
}

const ExternalKubernetesView: React.FC<ExternalKubernetesViewProps> = ({
  infra: _infra,
  externalNodesInfo,
  onConnectExternal,
  onShowSettings,
}) => {
  const externalKubernetesColumns = [
    {
      title: '노드명',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const color = role === 'master' ? 'green' : 'orange';

        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'Ready' ? 'success' : 'default';

        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '생성일',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '버전',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '내부 IP',
      dataIndex: 'internal_ip',
      key: 'internal_ip',
      render: (ip: string) => <Text code>{ip}</Text>,
    },
    {
      title: '외부 IP',
      dataIndex: 'external_ip',
      key: 'external_ip',
      render: (ip: string) => <Text code>{ip || '-'}</Text>,
    },
  ];

  return (
    <div className='infra-content-wrapper'>
      {/* 통계 섹션 */}
      <div className='infra-stats-container'>
        <div className='node-stat-group'>
          <div className='node-stat-item'>
            <CloudServerOutlined className='node-stat-icon' />
            <div>
              <Text className='node-stat-label'>총 노드 수</Text>
              <Text className='node-stat-number'>
                {externalNodesInfo?.total || 0}개
              </Text>
            </div>
          </div>
          <div className='node-stat-item master-stat'>
            <ClusterOutlined
              className='node-stat-icon'
              style={{ color: '#52c41a' }}
            />
            <div>
              <Text className='node-stat-label'>마스터 노드</Text>
              <Text className='node-stat-number'>
                {externalNodesInfo?.master || 0}개
              </Text>
            </div>
          </div>
          <div className='node-stat-item worker-stat'>
            <CloudServerOutlined
              className='node-stat-icon'
              style={{ color: '#fa541c' }}
            />
            <div>
              <Text className='node-stat-label'>워커 노드</Text>
              <Text className='node-stat-number'>
                {externalNodesInfo?.worker || 0}개
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Divider orientation='left'>외부 쿠버네티스 클러스터</Divider>

      {externalNodesInfo ? (
        <>
          <Table
            columns={externalKubernetesColumns}
            dataSource={externalNodesInfo.list || []}
            pagination={false}
            size='middle'
            bordered
            rowKey='name'
            scroll={{ x: 800 }}
            style={{ marginBottom: '20px' }}
          />

          <Row justify='end' style={{ marginTop: '16px' }}>
            <Col>
              <Space>
                <Button icon={<SettingOutlined />} onClick={onShowSettings}>
                  설정
                </Button>
              </Space>
            </Col>
          </Row>
        </>
      ) : (
        <Card>
          <Empty
            description={
              <div>
                <Text>외부 쿠버네티스 클러스터에 연결되지 않았습니다.</Text>
                <br />
                <Text type='secondary'>
                  외부 클러스터에 연결하려면 인증 정보를 입력해주세요.
                </Text>
              </div>
            }
          >
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={onConnectExternal}
              size='large'
            >
              외부 클러스터 연결
            </Button>
          </Empty>
        </Card>
      )}
    </div>
  );
};

export default ExternalKubernetesView;
