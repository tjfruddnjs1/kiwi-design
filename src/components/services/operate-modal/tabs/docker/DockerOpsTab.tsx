import React from 'react';
import {
  Card,
  Space,
  Alert,
  Button,
  Collapse,
  Tag,
  Typography,
  Popconfirm,
} from 'antd';
import {
  ClearOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ToolOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface DockerOpsTabProps {
  pruningResources: boolean;
  onPruneResources: (
    pruneType: 'all' | 'images' | 'containers' | 'volumes' | 'networks'
  ) => void;
  isDockerInfra: boolean;
}

/**
 * Docker 운영 관리 탭
 * 리소스 정리 기능을 제공합니다.
 * Note: 시스템 정보는 개요 탭에서 확인 가능합니다.
 * Note: Nginx 설정 관리는 도메인 설정 탭에서 통합 관리됩니다.
 */
const DockerOpsTab: React.FC<DockerOpsTabProps> = ({
  pruningResources,
  onPruneResources,
  isDockerInfra,
}) => {
  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message={`${isDockerInfra ? 'Docker' : 'Podman'} 운영 관리`}
        description='컨테이너 운영에 필요한 관리 작업을 수행할 수 있습니다. 카테고리를 클릭하여 관련 기능을 확인하세요.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Collapse
        defaultActiveKey={['cleanup']}
        style={{ background: '#fff' }}
        items={[
          // Note: 시스템 정보는 개요 탭에서 확인 가능합니다.
          //  카테고리 1: 리소스 정리
          {
            key: 'cleanup',
            label: (
              <Space>
                <ClearOutlined style={{ color: '#52c41a' }} />
                <Text strong>리소스 정리</Text>
                <Tag color='green'>이미지 · 컨테이너 · 볼륨 · 네트워크</Tag>
              </Space>
            ),
            children: (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <Alert
                  message='주의: 리소스 정리 시 사용하지 않는 데이터가 영구 삭제됩니다.'
                  type='warning'
                  showIcon
                />

                {/* 개별 정리 */}
                <Card
                  size='small'
                  title={
                    <>
                      <ClearOutlined /> 개별 리소스 정리
                    </>
                  }
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    사용하지 않는 리소스를 개별적으로 정리합니다.
                  </Text>
                  <Space wrap>
                    <Popconfirm
                      title='이미지 정리'
                      description='사용하지 않는 모든 이미지를 삭제합니다. 계속하시겠습니까?'
                      onConfirm={() => onPruneResources('images')}
                      okText='정리'
                      cancelText='취소'
                    >
                      <Button
                        type='primary'
                        size='small'
                        icon={<ClearOutlined />}
                        loading={pruningResources}
                      >
                        이미지
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title='컨테이너 정리'
                      description='중지된 모든 컨테이너를 삭제합니다. 계속하시겠습니까?'
                      onConfirm={() => onPruneResources('containers')}
                      okText='정리'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        icon={<DeleteOutlined />}
                        loading={pruningResources}
                      >
                        컨테이너
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title='볼륨 정리'
                      description='사용하지 않는 모든 볼륨을 삭제합니다. 데이터가 영구 삭제됩니다. 계속하시겠습니까?'
                      onConfirm={() => onPruneResources('volumes')}
                      okText='정리'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        icon={<DatabaseOutlined />}
                        loading={pruningResources}
                      >
                        볼륨
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title='네트워크 정리'
                      description='사용하지 않는 모든 네트워크를 삭제합니다. 계속하시겠습니까?'
                      onConfirm={() => onPruneResources('networks')}
                      okText='정리'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        icon={<ApiOutlined />}
                        loading={pruningResources}
                      >
                        네트워크
                      </Button>
                    </Popconfirm>
                  </Space>
                </Card>

                {/* 전체 정리 */}
                <Card
                  size='small'
                  title={
                    <>
                      <ToolOutlined /> 전체 정리 (System Prune)
                    </>
                  }
                >
                  <Text
                    type='secondary'
                    style={{ display: 'block', marginBottom: 12 }}
                  >
                    사용하지 않는 이미지, 컨테이너, 볼륨, 네트워크를 모두
                    삭제합니다.
                  </Text>
                  <Popconfirm
                    title='전체 정리'
                    description='사용하지 않는 모든 리소스를 삭제합니다. 계속하시겠습니까?'
                    onConfirm={() => onPruneResources('all')}
                    okText='전체 정리'
                    cancelText='취소'
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      type='primary'
                      size='small'
                      icon={<ToolOutlined />}
                      loading={pruningResources}
                    >
                      전체 정리 실행
                    </Button>
                  </Popconfirm>
                </Card>
              </Space>
            ),
          },

          //  카테고리 3: 백업 및 복구 (백업 관리 페이지로 이동 안내)
          // Note: Nginx 설정 관리는 도메인 설정 탭에서 통합 관리됩니다.
          {
            key: 'backup',
            label: (
              <Space>
                <CloudUploadOutlined style={{ color: '#fa8c16' }} />
                <Text strong>백업 및 복구</Text>
                <Tag color='orange'>통합 관리</Tag>
              </Space>
            ),
            children: (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <Alert
                  message='백업 관리 페이지로 이동하세요'
                  description={
                    <Space direction='vertical'>
                      <Text>
                        Docker/Podman 백업 기능은 <Text strong>백업 관리</Text>{' '}
                        페이지에서 통합 관리됩니다.
                      </Text>
                      <Text type='secondary'>
                        사이드 메뉴의 &quot;백업 관리&quot;를 클릭하여 백업
                        생성, 복구, 이력 조회를 수행하세요.
                      </Text>
                    </Space>
                  }
                  type='info'
                  showIcon
                />
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default DockerOpsTab;
