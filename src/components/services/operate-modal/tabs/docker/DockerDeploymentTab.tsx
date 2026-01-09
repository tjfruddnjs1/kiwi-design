import React from 'react';
import {
  Card,
  Alert,
  Descriptions,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  RocketOutlined,
  DatabaseOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import type { Service } from '../../../../../lib/api/types';
import type {
  DockerContainerInfo,
  DockerImageInfo,
} from '../../../../../lib/api/docker';

interface DockerDeploymentTabProps {
  service?: Service | null;
  containerCount: number;
  containers?: DockerContainerInfo[];
  dockerImages?: DockerImageInfo[];
  isDockerInfra: boolean;
}

/**
 * Docker 배포 관리 탭
 * Docker 환경의 배포 정보를 표시합니다.
 */
const DockerDeploymentTab: React.FC<DockerDeploymentTabProps> = ({
  service,
  containerCount,
  containers = [],
  dockerImages = [],
  isDockerInfra,
}) => {
  // 실행 중인 컨테이너 수
  const runningCount = containers.filter(c =>
    c.status?.toLowerCase().includes('up')
  ).length;
  const stoppedCount = containerCount - runningCount;

  // 컨테이너가 사용하는 고유 이미지 목록
  const usedImages = Array.from(new Set(containers.map(c => c.image))).map(
    imageName => {
      const imageInfo = dockerImages.find(
        img =>
          imageName.includes(img.repository) ||
          imageName.includes(`${img.repository}:${img.tag}`)
      );
      return {
        name: imageName,
        info: imageInfo,
      };
    }
  );
  return (
    <div style={{ padding: '24px' }}>
      <Alert
        message={`${isDockerInfra ? 'Docker' : 'Podman'} 배포 관리`}
        description={`${isDockerInfra ? 'Docker' : 'Podman'} 환경에서 배포된 서비스의 이미지, 컨테이너, 환경 정보를 확인합니다.`}
        type='info'
        showIcon
        icon={<RocketOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* 배포 통계 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title='전체 컨테이너'
              value={containerCount}
              prefix={<ContainerOutlined />}
              suffix='개'
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title='실행 중'
              value={runningCount}
              valueStyle={{ color: '#3f8600' }}
              suffix='개'
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title='중지됨'
              value={stoppedCount}
              valueStyle={{ color: '#cf1322' }}
              suffix='개'
            />
          </Card>
        </Col>
      </Row>

      {/* 배포 기본 정보 */}
      <Card title='서비스 정보' style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label='서비스 이름'>
            {service?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='네임스페이스'>
            {service?.namespace || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='인프라 타입'>
            {service?.infraType || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Git 저장소'>
            {service?.repository_url || service?.gitlab_url || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='생성일' span={2}>
            {service?.created_at
              ? new Date(service.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })
              : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 배포 이미지 정보 */}
      <Card
        title={
          <>
            <DatabaseOutlined /> 배포 이미지
          </>
        }
        style={{ marginBottom: 24 }}
      >
        {usedImages.length > 0 ? (
          <Table
            dataSource={usedImages}
            pagination={false}
            size='small'
            columns={[
              {
                title: '이미지',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <Tag color='blue'>{name}</Tag>,
              },
              {
                title: '크기',
                key: 'size',
                width: 120,
                render: (_: unknown, record: { info?: DockerImageInfo }) =>
                  record.info?.size || '-',
              },
              {
                title: '생성일',
                key: 'created',
                width: 200,
                render: (_: unknown, record: { info?: DockerImageInfo }) => {
                  const created = record.info?.created;
                  // Remove timezone suffix like "+0900 KST"
                  return created
                    ? created.replace(/\s*\+\d{4}\s*[A-Z]{3}$/i, '')
                    : '-';
                },
              },
              {
                title: '사용 컨테이너',
                key: 'usage',
                width: 120,
                render: (
                  _: unknown,
                  record: { name: string; info?: DockerImageInfo }
                ) => {
                  const count = containers.filter(
                    c => c.image === record.name
                  ).length;
                  return `${count}개`;
                },
              },
            ]}
          />
        ) : (
          <p>이미지 정보를 불러오는 중입니다...</p>
        )}
      </Card>
    </div>
  );
};

export default DockerDeploymentTab;
