import {
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import React from 'react';
import { RuntimeDetailsForKubernetes } from './RuntimeSetting';

interface InfraKubernetesRuntimeResourceTabProps {
  runtimeDetails: RuntimeDetailsForKubernetes;
  onLoading: boolean;
}

const InfraKubernetesRuntimeResourceTab: React.FC<
  InfraKubernetesRuntimeResourceTabProps
> = ({ runtimeDetails, onLoading }) => {
  return (
    <>
      {onLoading ? (
        <Spin>런타임 리소스를 불러오고 있습니다.</Spin>
      ) : (
        <div>
          {/* Pod 목록 (전체 너비) */}
          <Card
            title={
              <Space align='center'>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Pod 목록
                </Typography.Title>
                <Tag>{runtimeDetails?.pods?.length || 0}</Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
            size='small'
          >
            {runtimeDetails?.pods && runtimeDetails.pods.length > 0 ? (
              <Table
                dataSource={runtimeDetails.pods}
                columns={[
                  {
                    title: '네임스페이스',
                    dataIndex: 'namespace',
                    key: 'namespace',
                    width: 120,
                    ellipsis: true,
                  },
                  {
                    title: 'Pod명',
                    dataIndex: 'name',
                    key: 'name',
                    ellipsis: true,
                  },
                  {
                    title: '노드',
                    dataIndex: 'node',
                    key: 'node',
                    width: 120,
                    ellipsis: true,
                  },
                  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 130 },
                  {
                    title: '상태',
                    dataIndex: 'status',
                    key: 'status',
                    width: 120,
                    render: (status: string) => {
                      const colorMap: Record<string, string> = {
                        Running: 'green',
                        Pending: 'orange',
                        Succeeded: 'blue',
                        Failed: 'red',
                        Unknown: 'gray',
                        CrashLoopBackOff: 'magenta',
                      };
                      return (
                        <Tag color={colorMap[status] || 'default'}>
                          {status}
                        </Tag>
                      );
                    },
                  },
                ]}
                rowKey={record => `${record.namespace}-${record.name}`}
                pagination={{ pageSize: 5, size: 'small' }}
                size='small'
                scroll={{ x: 700 }}
              />
            ) : (
              <Empty
                description='Pod가 없습니다.'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>

          {/* 볼륨(PVC) + 네트워크(Service) 2열 배치 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space align='center'>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      볼륨(PVC) 목록
                    </Typography.Title>
                    <Tag>{runtimeDetails?.volumes_pvc?.length || 0}</Tag>
                  </Space>
                }
                style={{ height: '100%' }}
                size='small'
              >
                {runtimeDetails?.volumes_pvc &&
                runtimeDetails.volumes_pvc.length > 0 ? (
                  <Table
                    dataSource={runtimeDetails.volumes_pvc}
                    columns={[
                      {
                        title: 'PVC명',
                        dataIndex: 'pvc_name',
                        key: 'pvc_name',
                        ellipsis: true,
                      },
                      {
                        title: '용량',
                        dataIndex: 'capacity',
                        key: 'capacity',
                        width: 80,
                      },
                      {
                        title: '상태',
                        dataIndex: 'status',
                        key: 'status',
                        width: 80,
                        render: (status: string) => {
                          const color =
                            status === 'Bound'
                              ? 'green'
                              : status === 'Available'
                                ? 'blue'
                                : 'orange';
                          return <Tag color={color}>{status}</Tag>;
                        },
                      },
                    ]}
                    rowKey={record => `${record.namespace}-${record.pvc_name}`}
                    pagination={false}
                    size='small'
                    scroll={{ y: 180 }}
                  />
                ) : (
                  <Empty
                    description='PVC 볼륨이 없습니다.'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space align='center'>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      네트워크(Service) 목록
                    </Typography.Title>
                    <Tag>{runtimeDetails?.network_svc?.length || 0}</Tag>
                  </Space>
                }
                style={{ height: '100%' }}
                size='small'
              >
                {runtimeDetails?.network_svc &&
                runtimeDetails.network_svc.length > 0 ? (
                  <Table
                    dataSource={runtimeDetails.network_svc}
                    columns={[
                      {
                        title: '서비스명',
                        dataIndex: 'name',
                        key: 'name',
                        ellipsis: true,
                      },
                      {
                        title: '타입',
                        dataIndex: 'type',
                        key: 'type',
                        width: 90,
                      },
                      {
                        title: 'Cluster IP',
                        dataIndex: 'cluster_ip',
                        key: 'cluster_ip',
                        width: 110,
                        ellipsis: true,
                      },
                    ]}
                    rowKey={record => `${record.namespace}-${record.name}`}
                    pagination={false}
                    size='small'
                    scroll={{ y: 180 }}
                  />
                ) : (
                  <Empty
                    description='서비스가 없습니다.'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </>
  );
};

export default InfraKubernetesRuntimeResourceTab;
