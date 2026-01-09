import React from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  ToolOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { Node, NodeType } from './NodeOperationsManager';
import { InfraItem, Hop } from '../../../types/infra';

const { Text } = Typography;

interface NodeTableViewProps {
  infra: InfraItem;
  nodes: Node[];
  activeTab: NodeType;
  isAdmin: boolean;
  checkingNodeId: string | null;
  onAddNode: () => void;
  onCheckStatus: (node: Node) => void;
  onRebuild: (node: Node) => void;
  onBuild: (node: Node) => void;
  onRemoveNode: (nodeId: string) => void;
  onViewResource: (node: Node) => void;
  renderStatusDisplay: (status: string) => React.ReactNode;
  getLastCheckedTime: (node: Node) => string;
  isCertificateValid: (updatedAt?: string) => boolean;
}

export const NodeTableView: React.FC<NodeTableViewProps> = ({
  infra: _infra,
  nodes,
  activeTab,
  isAdmin,
  checkingNodeId,
  onAddNode,
  onCheckStatus,
  onRebuild,
  onBuild,
  onRemoveNode,
  onViewResource,
  renderStatusDisplay,
  getLastCheckedTime,
  isCertificateValid,
}) => {
  const getFilteredNodes = (nodeType: NodeType): Node[] => {
    return nodes.filter(node => {
      if (nodeType === 'ha') {
        return node.nodeType.includes('ha') || node.nodeType.includes('HA');
      }

      return node.nodeType.includes(nodeType);
    });
  };

  const renderHopsInfo = (hops: string) => {
    try {
      const parsedHops = JSON.parse(hops);

      if (!Array.isArray(parsedHops)) return hops;

      if (parsedHops.length === 0) return '직접 연결';
      if (parsedHops.length === 1)
        return `${parsedHops[0].host}:${parsedHops[0].port}`;

      const tooltipTitle = parsedHops
        .map(
          (hop: Hop, index: number) => `${index + 1}. ${hop.host}:${hop.port}`
        )
        .join('\n');

      return (
        <Tooltip title={tooltipTitle} placement='topLeft'>
          <Space size={4} wrap>
            {parsedHops.map((hop: Hop, index: number) => (
              <React.Fragment
                key={`parsed-hop-${hop.host}-${hop.port}-${hop.username || 'nouser'}`}
              >
                <Tag color='blue'>
                  {hop.host}:{hop.port}
                </Tag>
                {index < parsedHops.length - 1 && (
                  <ArrowRightOutlined
                    style={{ fontSize: '10px', color: '#999' }}
                  />
                )}
              </React.Fragment>
            ))}
          </Space>
        </Tooltip>
      );
    } catch {
      // Hops parsing failed - return raw value
      return hops;
    }
  };

  const getTableColumns = (): ColumnsType<Node> => [
    {
      title: '서버명',
      dataIndex: 'server_name',
      key: 'server_name',
      width: 150,
      render: (name: string, record: Node) => (
        <div>
          <Text strong>{name || '미설정'}</Text>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            {record.ip}:{record.port}
          </div>
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: Node) => {
        const isChecking = checkingNodeId === record.id;

        return renderStatusDisplay(isChecking ? 'checking' : status);
      },
    },
    {
      title: 'Hops',
      dataIndex: 'hops',
      key: 'hops',
      width: 200,
      render: renderHopsInfo,
    },
    {
      title: '최종 확인',
      dataIndex: 'last_checked',
      key: 'last_checked',
      width: 140,
      render: (_, record: Node) => {
        const lastChecked = getLastCheckedTime(record);
        const hasValidTime =
          lastChecked &&
          lastChecked !== '' &&
          lastChecked !== 'null' &&
          lastChecked !== 'undefined';

        if (!hasValidTime) {
          return <Text type='secondary'>확인 필요</Text>;
        }

        try {
          const date = new Date(lastChecked);
          const now = new Date();
          const diffMinutes = Math.floor(
            (now.getTime() - date.getTime()) / (1000 * 60)
          );

          let timeText;

          if (diffMinutes < 1) {
            timeText = '방금 전';
          } else if (diffMinutes < 60) {
            timeText = `${diffMinutes}분 전`;
          } else if (diffMinutes < 1440) {
            timeText = `${Math.floor(diffMinutes / 60)}시간 전`;
          } else {
            timeText = `${Math.floor(diffMinutes / 1440)}일 전`;
          }

          return (
            <Tooltip title={date.toLocaleString()}>
              <Text style={{ fontSize: '12px' }}>{timeText}</Text>
            </Tooltip>
          );
        } catch {
          // Date parsing failed - show default message
          return <Text type='secondary'>확인 필요</Text>;
        }
      },
    },
    ...(activeTab === 'master'
      ? [
          {
            title: '인증서',
            key: 'certificate',
            width: 100,
            render: (_, record: Node) => {
              const isValid = isCertificateValid(record.updated_at);

              return (
                <Tag color={isValid ? 'green' : 'red'}>
                  {isValid ? '유효' : '만료'}
                </Tag>
              );
            },
          },
        ]
      : []),
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_, record: Node) => {
        const isCurrentlyChecking = checkingNodeId === record.id;

        return (
          <Space size='small' wrap>
            <Tooltip title='상태 확인'>
              <Button
                size='small'
                icon={<SyncOutlined spin={isCurrentlyChecking} />}
                onClick={() => onCheckStatus(record)}
                disabled={isCurrentlyChecking}
              />
            </Tooltip>

            <Tooltip title='리소스 조회'>
              <Button
                size='small'
                icon={<DashboardOutlined />}
                onClick={() => onViewResource(record)}
              />
            </Tooltip>

            {isAdmin && (
              <>
                {record.status === 'preparing' ? (
                  <Tooltip title='구축하기'>
                    <Button
                      size='small'
                      type='primary'
                      icon={<SettingOutlined />}
                      onClick={() => onBuild(record)}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title='재구축'>
                    <Button
                      size='small'
                      icon={<ToolOutlined />}
                      onClick={() => onRebuild(record)}
                    />
                  </Tooltip>
                )}

                <Tooltip title='노드 제거'>
                  <Popconfirm
                    title='노드를 제거하시겠습니까?'
                    description='이 작업은 되돌릴 수 없습니다.'
                    onConfirm={() => onRemoveNode(record.id)}
                    okText='제거'
                    cancelText='취소'
                    okButtonProps={{ danger: true }}
                  >
                    <Button size='small' danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const filteredNodes = getFilteredNodes(activeTab);

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: 16 }}>
          <Button type='primary' icon={<PlusOutlined />} onClick={onAddNode}>
            노드 추가
          </Button>
        </div>
      )}

      <Table
        columns={getTableColumns()}
        dataSource={filteredNodes}
        rowKey='id'
        pagination={false}
        size='small'
        className='infra-node-table'
        locale={{
          emptyText: `${activeTab} 노드가 없습니다.`,
        }}
      />
    </div>
  );
};

export default NodeTableView;
