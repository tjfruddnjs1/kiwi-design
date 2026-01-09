import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Popconfirm,
  Empty,
  Tag,
  Table,
  message,
  Spin,
  Input,
  Row,
  Col,
} from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { RuntimeDetailsForSinglehost } from './RuntimeSetting';
import { awxApi } from '../../lib/api/awx';
import { pruneDockerResources } from '../../lib/api/docker';
import { useAuth } from '../../context/AuthContext';
import { InfraWithNodes } from '../../types';
import { SshHop } from '../../lib/api';

interface InfraDockerResourceTabProps {
  runtimeDetails: RuntimeDetailsForSinglehost;
  selectedInfra: InfraWithNodes;
  onLoading: boolean;
  getStoredAuthHops: (hops: SshHop[]) => void;
  setRuntimeDetails: (runtimeDetails: RuntimeDetailsForSinglehost) => void;
}

const InfraDockerResourceTab: React.FC<InfraDockerResourceTabProps> = ({
  runtimeDetails,
  selectedInfra,
  onLoading,
  getStoredAuthHops,
  setRuntimeDetails,
}) => {
  const [selectedImageKeys, setSelectedImageKeys] = useState<React.Key[]>([]);
  const [deleteImagesLoading, setDeleteImagesLoading] =
    useState<boolean>(false);
  const [pruneImagesLoading, setPruneImagesLoading] = useState<boolean>(false);
  const [imageSearchText, setImageSearchText] = useState<string>('');

  const { user } = useAuth();

  // 이미지 검색 필터링
  const filteredImages = useMemo(() => {
    if (!runtimeDetails?.images) return [];
    if (!imageSearchText.trim()) return runtimeDetails.images;

    const searchLower = imageSearchText.toLowerCase();
    return runtimeDetails.images.filter(
      img =>
        img.repository.toLowerCase().includes(searchLower) ||
        img.tag.toLowerCase().includes(searchLower) ||
        img.id.toLowerCase().includes(searchLower)
    );
  }, [runtimeDetails?.images, imageSearchText]);

  // 런타임 이미지 삭제 함수
  const handleDeleteImages = async () => {
    if (selectedImageKeys.length === 0) {
      message.info('삭제할 이미지를 선택해주세요.');
      return;
    }

    const imagesToDelete = runtimeDetails?.images
      .filter(img => selectedImageKeys.includes(img.id))
      .map(img => `${img.repository}:${img.tag}`);
    if (!imagesToDelete || imagesToDelete.length === 0) {
      message.error('삭제할 이미지 정보를 찾을 수 없습니다.');
      return;
    }

    setDeleteImagesLoading(true);

    message.info(`${imagesToDelete.length}개의 이미지를 삭제합니다...`);

    const hopsWithCreds = getStoredAuthHops(
      JSON.parse(selectedInfra.nodes[0].hops as string) as SshHop[]
    );
    // Docker/Podman 타입에 따라 적절한 playbook 선택
    const runtimeType = selectedInfra.type.includes('docker')
      ? 'docker'
      : 'podman';
    const response = (await awxApi.runPlaybook({
      playbook_to_run: `delete_${runtimeType}_images`,
      hops: hopsWithCreds,
      awxTemplate: user?.awx_template,
      images_to_delete: imagesToDelete,
    })) as { data: { status: string } };

    if (response.data.status !== 'failed') {
      message.success('선택한 이미지를 성공적으로 삭제했습니다.');
      const remainImages = runtimeDetails?.images.filter(
        image => !selectedImageKeys.includes(image.id)
      );
      setRuntimeDetails({
        ...runtimeDetails,
        images: remainImages,
        image_count: remainImages.length,
      });
      setSelectedImageKeys([]); // 선택 상태 초기화
    } else {
      message.error(
        '이미지 삭제에 실패했습니다. SSH 접속 정보나 이미지 사용 상태를 확인해주세요.'
      );
    }
    setDeleteImagesLoading(false);
  };

  // 사용되지 않는 이미지 정리 (Prune) 함수
  const handlePruneImages = async () => {
    setPruneImagesLoading(true);
    message.info('사용되지 않는 이미지를 정리합니다...');

    try {
      const hopsWithCreds = getStoredAuthHops(
        JSON.parse(selectedInfra.nodes[0].hops as string) as SshHop[]
      );

      const result = await pruneDockerResources(
        'images',
        { hops: hopsWithCreds as SshHop[] },
        'docker'
      );

      message.success(result.message || '이미지 정리가 완료되었습니다.');

      // 이미지 목록 새로고침을 위해 런타임 정보 다시 가져오기
      // 현재 실행 중인 컨테이너가 사용하는 이미지만 남김
      const usedImageIds = new Set(
        runtimeDetails?.containers?.map(c => c.image) || []
      );
      const remainingImages =
        runtimeDetails?.images?.filter(img => {
          const fullName = `${img.repository}:${img.tag}`;
          return (
            usedImageIds.has(fullName) ||
            usedImageIds.has(img.repository) ||
            usedImageIds.has(img.id)
          );
        }) || [];

      setRuntimeDetails({
        ...runtimeDetails,
        images: remainingImages,
        image_count: remainingImages.length,
      });
      setSelectedImageKeys([]);
    } catch (_error) {
      message.error('이미지 정리 중 오류가 발생했습니다.');
    } finally {
      setPruneImagesLoading(false);
    }
  };

  const onSelectImageChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedImageKeys(newSelectedRowKeys);
  };

  const imageRowSelection = {
    selectedRowKeys: selectedImageKeys,
    onChange: onSelectImageChange,
  };

  const hasSelectedImages = selectedImageKeys.length > 0;

  return (
    <div>
      {/* 컨테이너 목록 (전체 너비) */}
      <Card
        title={
          <Space align='center'>
            <Typography.Title level={5} style={{ margin: 0 }}>
              컨테이너 목록
            </Typography.Title>
            <Tag>{runtimeDetails?.container_count || 0}</Tag>
          </Space>
        }
        style={{ marginBottom: 16 }}
        size='small'
      >
        {!onLoading ? (
          <>
            {runtimeDetails?.containers &&
            runtimeDetails?.containers.length > 0 ? (
              <Table
                dataSource={runtimeDetails?.containers}
                columns={[
                  {
                    title: '컨테이너명',
                    dataIndex: 'name',
                    key: 'name',
                    ellipsis: true,
                  },
                  {
                    title: '이미지',
                    dataIndex: 'image',
                    key: 'image',
                    ellipsis: true,
                  },
                  {
                    title: '상태',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    render: (status: string) => {
                      const colorMap: Record<string, string> = {
                        running: 'green',
                        stopped: 'red',
                        paused: 'orange',
                        exited: 'gray',
                      };
                      return (
                        <Tag color={colorMap[status] || 'default'}>
                          {status}
                        </Tag>
                      );
                    },
                  },
                  {
                    title: '포트',
                    dataIndex: 'ports',
                    key: 'ports',
                    width: 150,
                    ellipsis: true,
                  },
                ]}
                rowKey='id'
                pagination={{ pageSize: 5, size: 'small' }}
                size='small'
                scroll={{ x: 600 }}
              />
            ) : (
              <Empty
                description='컨테이너가 없습니다.'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </>
        ) : (
          <Spin />
        )}
      </Card>

      {/* 이미지 목록 (전체 너비) */}
      <Card
        title={
          <Space
            align='center'
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Space>
              <Typography.Title level={5} style={{ margin: 0 }}>
                이미지 목록
              </Typography.Title>
              <Tag>
                {filteredImages.length}
                {imageSearchText
                  ? ` / ${runtimeDetails?.image_count || 0}`
                  : ''}
              </Tag>
            </Space>
            <Space>
              <Input
                placeholder='검색...'
                prefix={<SearchOutlined />}
                value={imageSearchText}
                onChange={e => setImageSearchText(e.target.value)}
                style={{ width: 150 }}
                allowClear
                size='small'
              />
              <Popconfirm
                title='사용되지 않는 모든 이미지를 정리하시겠습니까?'
                description='실행 중인 컨테이너에서 사용하지 않는 이미지가 모두 삭제됩니다.'
                onConfirm={handlePruneImages}
                okText='정리'
                cancelText='취소'
                disabled={pruneImagesLoading}
              >
                <Button
                  icon={<ClearOutlined />}
                  size='small'
                  disabled={pruneImagesLoading || deleteImagesLoading}
                  loading={pruneImagesLoading}
                >
                  미사용 정리
                </Button>
              </Popconfirm>
              <Popconfirm
                title={`${selectedImageKeys.length}개의 이미지를 정말 삭제하시겠습니까?`}
                onConfirm={handleDeleteImages}
                okText='삭제'
                cancelText='취소'
                disabled={!hasSelectedImages || deleteImagesLoading}
              >
                <Button
                  type='primary'
                  danger
                  size='small'
                  disabled={!hasSelectedImages || deleteImagesLoading}
                  loading={deleteImagesLoading && hasSelectedImages}
                >
                  삭제
                </Button>
              </Popconfirm>
            </Space>
          </Space>
        }
        style={{ marginBottom: 16 }}
        size='small'
      >
        {!onLoading ? (
          <>
            {filteredImages.length > 0 ? (
              <Table
                rowSelection={imageRowSelection}
                dataSource={filteredImages}
                columns={[
                  {
                    title: '이미지명',
                    dataIndex: 'repository',
                    key: 'repository',
                    ellipsis: true,
                    render: (
                      repo: string,
                      record: {
                        repository: string;
                        tag: string;
                        id: string;
                        size: string;
                        created: string;
                      }
                    ) => {
                      // repository에 이미 태그가 포함되어 있으면 그대로 표시
                      if (repo && repo.includes(':')) {
                        return repo;
                      }
                      // 태그가 ID가 아닌 실제 태그인 경우에만 결합
                      return record.tag && record.tag.length < 20
                        ? `${repo}:${record.tag}`
                        : repo;
                    },
                  },
                  {
                    title: 'ID',
                    dataIndex: 'tag',
                    key: 'tag',
                    width: 110,
                    ellipsis: true,
                    render: (
                      tag: string,
                      record: { id: string; tag: string }
                    ) => {
                      // tag 필드에 ID가 있으면 사용, 없으면 id 필드 사용
                      const imageId = tag && tag.length >= 12 ? tag : record.id;
                      return imageId ? imageId.substring(0, 12) : '-';
                    },
                  },
                  {
                    title: '크기',
                    dataIndex: 'size',
                    key: 'size',
                    width: 90,
                    render: (
                      size: string,
                      record: { size: string; created: string }
                    ) => {
                      // size가 없거나 0B이면 created에서 크기 정보 찾기
                      if (!size || size === '0B' || size === '0') {
                        // created에 MB, GB 등이 포함되어 있으면 크기로 사용
                        if (
                          record.created &&
                          /\d+(\.\d+)?\s*(B|KB|MB|GB|TB)/i.test(record.created)
                        ) {
                          return record.created;
                        }
                      }
                      return size || '-';
                    },
                  },
                ]}
                rowKey='id'
                pagination={{ pageSize: 5, size: 'small' }}
                size='small'
                scroll={{ x: 500 }}
              />
            ) : (
              <Empty
                description={
                  imageSearchText
                    ? `'${imageSearchText}' 결과 없음`
                    : '이미지가 없습니다.'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </>
        ) : (
          <Spin />
        )}
      </Card>

      {/* 볼륨 + 네트워크 (2열 배치) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space align='center'>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  볼륨 목록
                </Typography.Title>
                <Tag>{runtimeDetails?.volumes?.length || 0}</Tag>
              </Space>
            }
            style={{ height: '100%' }}
            size='small'
          >
            {!onLoading ? (
              <>
                {runtimeDetails?.volumes &&
                runtimeDetails?.volumes.length > 0 ? (
                  <Table
                    dataSource={runtimeDetails?.volumes}
                    columns={[
                      {
                        title: '볼륨명',
                        dataIndex: 'name',
                        key: 'name',
                        ellipsis: true,
                      },
                      {
                        title: '컨테이너',
                        dataIndex: 'usedBy',
                        key: 'usedBy',
                        ellipsis: true,
                      },
                    ]}
                    rowKey={record => `${record.name}-${record.usedBy}`}
                    pagination={false}
                    size='small'
                    scroll={{ y: 180 }}
                  />
                ) : (
                  <Empty
                    description='볼륨이 없습니다.'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </>
            ) : (
              <Spin />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space align='center'>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  네트워크 목록
                </Typography.Title>
                <Tag>{runtimeDetails?.networks?.length || 0}</Tag>
              </Space>
            }
            style={{ height: '100%' }}
            size='small'
          >
            {!onLoading ? (
              <>
                {runtimeDetails?.networks &&
                runtimeDetails?.networks.length > 0 ? (
                  <Table
                    dataSource={runtimeDetails?.networks}
                    columns={[
                      {
                        title: '네트워크명',
                        dataIndex: 'name',
                        key: 'name',
                        ellipsis: true,
                      },
                      {
                        title: '서브넷',
                        dataIndex: 'subnet',
                        key: 'subnet',
                        ellipsis: true,
                      },
                      {
                        title: '컨테이너',
                        dataIndex: 'container_count',
                        key: 'container_count',
                        width: 80,
                      },
                    ]}
                    rowKey='name'
                    pagination={false}
                    size='small'
                    scroll={{ y: 180 }}
                  />
                ) : (
                  <Empty
                    description='네트워크가 없습니다.'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </>
            ) : (
              <Spin />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InfraDockerResourceTab;
