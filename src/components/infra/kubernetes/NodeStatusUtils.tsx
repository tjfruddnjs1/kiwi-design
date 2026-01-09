// Node status display utilities

import React from 'react';
import { Space, Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'stopped':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'preparing':
    case 'installing':
    case 'building':
      return <ClockCircleOutlined style={{ color: '#fadb14' }} spin />;
    case 'error':
    case 'failed':
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'unknown':
    case 'not_installed':
    default:
      return <MinusCircleOutlined style={{ color: '#d9d9d9' }} />;
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'running':
      return '실행 중';
    case 'stopped':
      return '중지됨';
    case 'preparing':
    case 'installing':
      return '설치 중';
    case 'building':
      return '구축 중';
    case 'error':
      return '에러';
    case 'failed':
      return '실패';
    case 'unknown':
      return '알 수 없음';
    case 'not_installed':
      return '미설치';
    default:
      return '알 수 없음';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'success';
    case 'stopped':
      return 'error';
    case 'preparing':
    case 'installing':
    case 'building':
      return 'processing';
    case 'error':
    case 'failed':
      return 'error';
    case 'unknown':
    case 'not_installed':
    default:
      return 'default';
  }
};

interface NodeStatusDisplayProps {
  status: string;
  showIcon?: boolean;
  showText?: boolean;
}

export const NodeStatusDisplay: React.FC<NodeStatusDisplayProps> = ({
  status,
  showIcon = true,
  showText = true,
}) => {
  if (showIcon && showText) {
    return (
      <Space>
        {getStatusIcon(status)}
        <span>{getStatusText(status)}</span>
      </Space>
    );
  } else if (showIcon) {
    return (
      <Tooltip title={getStatusText(status)}>{getStatusIcon(status)}</Tooltip>
    );
  } else if (showText) {
    return <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>;
  }

  return null;
};

export const isCertificateValid = (updatedAt: string | undefined): boolean => {
  if (!updatedAt) return false;

  try {
    const updatedTime = new Date(updatedAt).getTime();
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000; // 1년을 밀리초로

    return now - updatedTime < oneYear;
  } catch (_error) {
    return false;
  }
};

export const getCertificateStatus = (updatedAt: string | undefined) => {
  const isValid = isCertificateValid(updatedAt);

  return {
    isValid,
    color: isValid ? 'success' : 'error',
    text: isValid ? '유효' : '만료/무효',
    icon: isValid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />,
  };
};

export const formatLastChecked = (lastChecked: string | undefined): string => {
  if (
    !lastChecked ||
    lastChecked === 'null' ||
    lastChecked === 'undefined' ||
    lastChecked === ''
  ) {
    return '확인 안됨';
  }

  try {
    const date = new Date(lastChecked);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return '방금 전';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);

      return `${hours}시간 전`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);

      return `${days}일 전`;
    }
  } catch (_error) {
    return '확인 안됨';
  }
};
