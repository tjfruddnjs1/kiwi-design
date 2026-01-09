/**
 * EmptyState Component
 * 데이터가 없을 때 표시하는 공통 컴포넌트
 */

import React from 'react';
import { Button } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import type { EmptyStateProps } from '../../../types/securityModals';

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  onAction,
  actionText = '스캔 시작',
  actionLoading = false,
}) => {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      {icon &&
        React.cloneElement(icon as React.ReactElement, {
          style: { fontSize: '48px', color: '#1890ff', marginBottom: '16px' },
        })}
      <p style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#262626' }}>
        {title}
      </p>
      <p style={{ fontSize: '14px', color: '#8c8c8c', margin: '0 0 24px 0' }}>
        {description}
      </p>
      {onAction && (
        <Button
          type='primary'
          size='large'
          icon={<PlayCircleOutlined />}
          onClick={onAction}
          loading={actionLoading}
          style={{ minWidth: '120px' }}
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
