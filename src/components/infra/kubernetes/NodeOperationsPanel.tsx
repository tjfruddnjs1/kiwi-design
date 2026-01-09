// Node operations panel component

import React from 'react';
import { Button, Space, Tooltip, Popconfirm } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ToolOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Node, NodeType } from './types';

interface NodeOperationsPanelProps {
  node: Node;
  isAdmin: boolean;
  operationsInProgress: Set<string>;
  onStartBuild: (node: Node) => void;
  onRebuild: (node: Node) => void;
  onCheckStatus: (node: Node) => void;
  onStartServer: (node: Node) => void;
  onStopServer: (node: Node) => void;
  onRestartServer: (node: Node) => void;
  onRemoveNode: (nodeId: string) => void;
  onRenewCertificate: (node: Node) => void;
  isOperationAllowed: (nodeId: string, operation: string) => boolean;
}

const NodeOperationsPanel: React.FC<NodeOperationsPanelProps> = ({
  node,
  isAdmin,
  operationsInProgress,
  onStartBuild,
  onRebuild,
  onCheckStatus,
  onStartServer,
  onStopServer,
  onRestartServer,
  onRemoveNode,
  onRenewCertificate,
  isOperationAllowed,
}) => {
  const isOperationInProgress = operationsInProgress.has(String(node.id));

  const getNodeTypeDisplayName = (nodeType: NodeType) => {
    switch (nodeType) {
      case 'ha':
        return 'HA';
      case 'master':
        return '마스터';
      case 'worker':
        return '워커';
      default:
        return nodeType;
    }
  };

  const renderBuildButton = () => {
    if (node.status === 'not_installed') {
      return (
        <Tooltip title={`${getNodeTypeDisplayName(node.nodeType)} 노드 구축`}>
          <Button
            type='primary'
            icon={<ToolOutlined />}
            loading={isOperationInProgress}
            disabled={!isAdmin || !isOperationAllowed(String(node.id), 'build')}
            onClick={() => onStartBuild(node)}
            size='small'
          >
            구축
          </Button>
        </Tooltip>
      );
    }

    return (
      <Tooltip title='재구축'>
        <Button
          icon={<ReloadOutlined />}
          loading={isOperationInProgress}
          disabled={!isAdmin || !isOperationAllowed(String(node.id), 'rebuild')}
          onClick={() => onRebuild(node)}
          size='small'
        >
          재구축
        </Button>
      </Tooltip>
    );
  };

  const renderServerControlButtons = () => {
    if (node.status === 'not_installed') {
      return null;
    }

    return (
      <>
        {node.status === 'stopped' && (
          <Tooltip title='서버 시작'>
            <Button
              icon={<PlayCircleOutlined />}
              loading={isOperationInProgress}
              disabled={
                !isAdmin || !isOperationAllowed(String(node.id), 'start')
              }
              onClick={() => onStartServer(node)}
              size='small'
            >
              시작
            </Button>
          </Tooltip>
        )}

        {node.status === 'running' && (
          <Tooltip title='서버 중지'>
            <Button
              icon={<PauseCircleOutlined />}
              loading={isOperationInProgress}
              disabled={
                !isAdmin || !isOperationAllowed(String(node.id), 'stop')
              }
              onClick={() => onStopServer(node)}
              size='small'
              danger
            >
              중지
            </Button>
          </Tooltip>
        )}

        <Tooltip title='서버 재시작'>
          <Button
            icon={<ReloadOutlined />}
            loading={isOperationInProgress}
            disabled={
              !isAdmin || !isOperationAllowed(String(node.id), 'restart')
            }
            onClick={() => onRestartServer(node)}
            size='small'
          >
            재시작
          </Button>
        </Tooltip>
      </>
    );
  };

  const renderCertificateButton = () => {
    if (node.nodeType === 'master' && node.status === 'running') {
      return (
        <Tooltip title='인증서 갱신'>
          <Button
            icon={<SyncOutlined />}
            loading={isOperationInProgress}
            disabled={!isAdmin || !isOperationAllowed(String(node.id), 'renew')}
            onClick={() => onRenewCertificate(node)}
            size='small'
          >
            인증서 갱신
          </Button>
        </Tooltip>
      );
    }

    return null;
  };

  const renderRemoveButton = () => {
    const isRemovable =
      node.nodeType === 'worker' ||
      (node.nodeType === 'master' && node.status !== 'running');

    if (!isRemovable) {
      return null;
    }

    return (
      <Popconfirm
        title={`${getNodeTypeDisplayName(node.nodeType)} 노드 삭제`}
        description={`정말로 ${node.server_name || node.ip} 노드를 삭제하시겠습니까?`}
        onConfirm={() => onRemoveNode(String(node.id))}
        okText='삭제'
        cancelText='취소'
        okButtonProps={{ danger: true }}
        disabled={!isAdmin || isOperationInProgress}
      >
        <Tooltip title='노드 삭제'>
          <Button
            icon={<DeleteOutlined />}
            loading={isOperationInProgress}
            disabled={
              !isAdmin || !isOperationAllowed(String(node.id), 'remove')
            }
            size='small'
            danger
          >
            삭제
          </Button>
        </Tooltip>
      </Popconfirm>
    );
  };

  return (
    <Space size='small' wrap>
      <Tooltip title='상태 확인'>
        <Button
          icon={<CheckCircleOutlined />}
          loading={isOperationInProgress}
          disabled={!isOperationAllowed(String(node.id), 'check')}
          onClick={() => onCheckStatus(node)}
          size='small'
        >
          상태 확인
        </Button>
      </Tooltip>

      {renderBuildButton()}
      {renderServerControlButtons()}
      {renderCertificateButton()}
      {renderRemoveButton()}
    </Space>
  );
};

export default NodeOperationsPanel;
