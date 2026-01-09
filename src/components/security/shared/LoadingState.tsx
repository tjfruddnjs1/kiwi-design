/**
 * LoadingState Component
 * 로딩 중일 때 표시하는 공통 컴포넌트
 */

import React from 'react';
import { Spin } from 'antd';
import type { LoadingStateProps } from '../../../types/securityModals';

export const LoadingState: React.FC<LoadingStateProps> = ({ message, tip }) => {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <Spin size='large' tip={tip} />
      <p style={{ marginTop: '16px', fontSize: '16px', color: '#595959' }}>
        {message}
      </p>
    </div>
  );
};

export default LoadingState;
