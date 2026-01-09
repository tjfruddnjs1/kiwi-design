import React from 'react';
import { Alert, Empty } from 'antd';
import type { Service } from '../../../../../lib/api/types';
import K8sResourceManager from '../../../../dashboard/K8sResourceManager';

interface K8sResourcesTabProps {
  service?: Service | null;
}

/**
 * Kubernetes 리소스 관리 탭
 * Deployment, Service, Ingress 등의 K8s 리소스를 조회합니다.
 */
const K8sResourcesTab: React.FC<K8sResourcesTabProps> = ({ service }) => {
  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='Kubernetes 리소스 현황'
        description='Deployment, Service, Ingress 등의 K8s 리소스를 조회할 수 있습니다.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />
      {service?.id ? (
        //  [운영모달] readOnly 모드: 편집/삭제/추가 버튼 숨김, 조회만 가능
        <K8sResourceManager serviceId={service.id} readOnly={true} />
      ) : (
        <Empty description='서비스 정보가 없습니다.' />
      )}
    </div>
  );
};

export default K8sResourcesTab;
