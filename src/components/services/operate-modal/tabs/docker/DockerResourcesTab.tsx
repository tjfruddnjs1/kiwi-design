import React from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Empty,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type {
  DockerImageInfo,
  DockerVolumeInfo,
  DockerNetworkInfo,
} from '../../types';

const { Text } = Typography;

interface DockerResourcesTabProps {
  dockerImages: DockerImageInfo[];
  dockerVolumes: DockerVolumeInfo[];
  dockerNetworks: DockerNetworkInfo[];
  loadingImages: boolean;
  loadingDockerResources: boolean;
}

/**
 * Docker 리소스 현황 탭
 * 이미지, 볼륨, 네트워크 목록을 표시합니다.
 */
const DockerResourcesTab: React.FC<DockerResourcesTabProps> = ({
  dockerImages,
  dockerVolumes,
  dockerNetworks,
  loadingImages,
  loadingDockerResources,
}) => {
  return (
    <div>
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        {/* 이미지 목록 */}
        <Card title='이미지 목록' loading={loadingImages}>
          {dockerImages.length > 0 ? (
            <Table
              dataSource={dockerImages}
              columns={[
                {
                  title: '이미지 ID',
                  dataIndex: 'id',
                  key: 'id',
                  width: 120,
                  render: (id: string) => <Tag>{id.substring(0, 12)}</Tag>,
                },
                {
                  title: 'Repository',
                  dataIndex: 'repository',
                  key: 'repository',
                  ellipsis: {
                    showTitle: false,
                  },
                  render: (repository: string) => (
                    <Tooltip placement='topLeft' title={repository}>
                      {repository}
                    </Tooltip>
                  ),
                },
                {
                  title: 'Tag',
                  dataIndex: 'tag',
                  key: 'tag',
                  width: 150,
                },
                {
                  title: '크기',
                  dataIndex: 'size',
                  key: 'size',
                  width: 100,
                },
                {
                  title: '생성일',
                  dataIndex: 'created',
                  key: 'created',
                  width: 200,
                  render: (created: string) => {
                    // Remove timezone suffix like "+0900 KST"
                    return created
                      ? created.replace(/\s*\+\d{4}\s*[A-Z]{3}$/i, '')
                      : '-';
                  },
                },
              ]}
              rowKey='id'
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty description='이미지가 없습니다' />
          )}
        </Card>

        {/* 볼륨 및 네트워크 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title='볼륨 목록' loading={loadingDockerResources}>
              {dockerVolumes.length > 0 ? (
                <Table
                  dataSource={dockerVolumes}
                  columns={[
                    {
                      title: '볼륨 이름',
                      dataIndex: 'name',
                      key: 'name',
                      ellipsis: {
                        showTitle: false,
                      },
                      render: (name: string) => (
                        <Tooltip placement='topLeft' title={name}>
                          {name}
                        </Tooltip>
                      ),
                    },
                    {
                      title: '드라이버',
                      dataIndex: 'driver',
                      key: 'driver',
                      width: 80,
                    },
                    {
                      title: '마운트 포인트',
                      dataIndex: 'mountpoint',
                      key: 'mountpoint',
                      ellipsis: {
                        showTitle: false,
                      },
                      render: (mountpoint: string) => (
                        <Tooltip placement='topLeft' title={mountpoint}>
                          <Text
                            style={{
                              maxWidth: '100%',
                              display: 'block',
                            }}
                            ellipsis
                          >
                            {mountpoint}
                          </Text>
                        </Tooltip>
                      ),
                    },
                  ]}
                  rowKey='name'
                  pagination={{ pageSize: 5 }}
                  size='small'
                />
              ) : (
                <Empty description='볼륨이 없습니다' />
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title='네트워크 목록' loading={loadingDockerResources}>
              {dockerNetworks.length > 0 ? (
                <Table
                  dataSource={dockerNetworks}
                  columns={[
                    {
                      title: '네트워크 이름',
                      dataIndex: 'name',
                      key: 'name',
                      ellipsis: {
                        showTitle: false,
                      },
                      render: (name: string) => (
                        <Tooltip placement='topLeft' title={name}>
                          {name}
                        </Tooltip>
                      ),
                    },
                    {
                      title: '드라이버',
                      dataIndex: 'driver',
                      key: 'driver',
                      width: 80,
                    },
                    {
                      title: 'Scope',
                      dataIndex: 'scope',
                      key: 'scope',
                      width: 80,
                    },
                  ]}
                  rowKey='id'
                  pagination={{ pageSize: 5 }}
                  size='small'
                />
              ) : (
                <Empty description='네트워크가 없습니다' />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default DockerResourcesTab;
