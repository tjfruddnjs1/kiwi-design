import React from 'react';
import { GlobalOutlined } from '@ant-design/icons';
import type { Service } from '../../../../../lib/api/types';
import DastResultContent from '../../../../gits/DastResultContent';

interface DASTTabProps {
  repoId?: number;
  repoName?: string;
  service?: Service | null;
  isContainerInfra: boolean;
  isDockerInfra: boolean;
  onStartScan: () => Promise<void> | void;
  onScanStateChange: (
    state: 'idle' | 'analyzing' | 'completed' | 'failed'
  ) => void;
}

/**
 * 도메인 검사(DAST) 탭
 * Docker와 K8s 모두에서 사용 가능하며, 조건에 따라 사용 불가 메시지를 표시합니다.
 */
const DASTTab: React.FC<DASTTabProps> = ({
  repoId,
  repoName,
  service,
  isContainerInfra,
  isDockerInfra,
  onStartScan,
  onScanStateChange,
}) => {
  // repoId가 없는 경우 (저장소 정보 필요)
  if (!repoId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <GlobalOutlined
          style={{ fontSize: 64, color: '#1890ff', marginBottom: '24px' }}
        />
        <p style={{ fontSize: '18px', marginBottom: '16px', color: '#333' }}>
          DAST 도메인 분석
        </p>
        <p style={{ fontSize: '14px', marginBottom: '24px', color: '#666' }}>
          저장소 정보가 필요합니다
        </p>
        <p style={{ fontSize: '12px', color: '#999' }}>
          Git 저장소와 연결된 서비스에서만 도메인 검사를 사용할 수 있습니다
        </p>
      </div>
    );
  }

  // Docker 인프라에서 도메인이 연결되어 있지 않으면 검사 불가
  const serviceDomain = service?.domain?.trim();
  if (isContainerInfra && !serviceDomain) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <GlobalOutlined
          style={{ fontSize: 64, color: '#faad14', marginBottom: '24px' }}
        />
        <p style={{ fontSize: '18px', marginBottom: '16px', color: '#333' }}>
          도메인 검사를 실행할 수 없습니다
        </p>
        <p style={{ fontSize: '14px', marginBottom: '16px', color: '#666' }}>
          {isDockerInfra ? 'Docker' : 'Podman'} 서비스에 도메인이 연결되어 있지
          않습니다.
        </p>
        <p style={{ fontSize: '12px', color: '#999' }}>
          서비스 설정에서 도메인을 먼저 연결한 후 도메인 검사를 실행해주세요.
        </p>
      </div>
    );
  }

  // repoId가 있는 경우 DastResultContent 컴포넌트 렌더링
  return (
    <DastResultContent
      repoId={repoId}
      repoName={repoName || service?.name || ''}
      onStartScan={onStartScan}
      onScanStateChange={(
        state: 'idle' | 'analyzing' | 'completed' | 'failed'
      ) => {
        if (state === 'analyzing') {
          onScanStateChange('analyzing');
        } else {
          onScanStateChange(state);
        }
      }}
    />
  );
};

export default DASTTab;
