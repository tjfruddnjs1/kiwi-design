/**
 * ErrorState Component
 * 에러 발생 시 표시하는 공통 컴포넌트
 */

import React from 'react';
import { Button, Alert } from 'antd';
import { BugOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ErrorStateProps } from '../../../types/securityModals';

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <BugOutlined
        style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }}
      />
      <Alert
        message='오류 발생'
        description={message}
        type='error'
        showIcon={false}
        style={{ marginBottom: '24px', textAlign: 'left' }}
      />
      {onRetry && (
        <Button
          type='primary'
          icon={<ReloadOutlined />}
          onClick={onRetry}
          style={{ minWidth: '100px' }}
        >
          다시 시도
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
