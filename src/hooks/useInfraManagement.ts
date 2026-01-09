import { useState, useCallback } from 'react';
import { message } from 'antd';
import { InfraItem } from '../types/infra';
import * as kubernetesApi from '../lib/api/kubernetes/infra';
import * as dockerApi from '../lib/api/docker';
import { logger } from '../utils/logger';

interface HopConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface ImportInfraData {
  name: string;
  type: string;
  info: string;
  hops: HopConfig[];
}

export const useInfraManagement = () => {
  const [infraData, setInfraData] = useState<InfraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch infrastructure data with status updates
  const fetchInfraData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. (수정된) getInfras 함수를 호출하여 인프라 목록을 가져옵니다.
      const infraList = await kubernetesApi.getInfras();

      // 2. 받아온 데이터를 바로 state에 저장합니다.
      //    (각 항목의 status를 가져오는 복잡한 로직을 일단 제거하여 오류 가능성을 없앱니다)
      setInfraData(infraList || []);
    } catch (error) {
      // 3. 에러가 발생하면 빈 배열로 설정합니다.
      logger.error('Infrastructure data fetch failed:', error as Error);
      messageApi.error('인프라 데이터를 불러오는데 실패했습니다.');
      setInfraData([]);
    } finally {
      setLoading(false);
    }
  }, [messageApi]); // 의존성 배열에서 fetchInfraData를 제거하고 messageApi만 남겨두는 것이 좋습니다.

  // Refresh infrastructure data
  const refreshInfraData = useCallback(async () => {
    setRefreshing(true);
    await fetchInfraData();
    setRefreshing(false);
    messageApi.success('인프라 데이터가 새로고침되었습니다.');
  }, [fetchInfraData, messageApi]);

  // Create new infrastructure
  const createInfrastructure = useCallback(
    async (values: { name: string; type: string; info: string }) => {
      try {
        await kubernetesApi.createInfra(values);
        messageApi.success('인프라가 성공적으로 추가되었습니다.');
        await fetchInfraData();

        return true;
      } catch (error) {
        logger.error('Infrastructure creation failed:', error as Error);
        messageApi.error('인프라 추가에 실패했습니다.');

        return false;
      }
    },
    [fetchInfraData, messageApi]
  );

  // Import external infrastructure
  const importInfrastructure = useCallback(
    async (device_id: number, data: ImportInfraData, userId: number) => {
      try {
        let response;

        if (data.type === 'kubernetes' || data.type === 'external_kubernetes') {
          response = await kubernetesApi.importKubernetesInfra(
            device_id,
            userId,
            {
              name: data.name,
              type: data.type,
              info: data.info,
              hops: data.hops,
            }
          );
        } else if (
          data.type === 'docker' ||
          data.type === 'external_docker' ||
          data.type === 'podman' ||
          data.type === 'external_podman'
        ) {
          response = await dockerApi.importInfra(device_id, userId, {
            name: data.name,
            type: data.type,
            info: data.info,
            hops: data.hops,
          });
        } else {
          throw new Error('Unsupported infrastructure type');
        }

        if (response && 'success' in response && response.success) {
          messageApi.success('외부 런타임을 성공적으로 가져왔습니다.');

          // Check for auto-registered services
          if (
            'registered_services' in response &&
            response.registered_services &&
            Array.isArray(response.registered_services) &&
            response.registered_services.length > 0
          ) {
            messageApi.info(
              `${response.registered_services.length}개의 서비스가 자동으로 등록되었습니다.`
            );
          }

          await fetchInfraData();

          return true;
        } else {
          throw new Error(
            (response && 'message' in response && response.message) ||
              'Import failed'
          );
        }
      } catch (error) {
        logger.error('Infrastructure import failed:', error as Error);
        messageApi.error(
          error instanceof Error
            ? error.message
            : '외부 환경 가져오기에 실패했습니다.'
        );

        return false;
      }
    },
    [fetchInfraData, messageApi]
  );

  // Delete infrastructure
  const deleteInfrastructure = useCallback(
    async (infraId: number) => {
      try {
        await kubernetesApi.deleteInfra(infraId);
        messageApi.success('인프라가 성공적으로 삭제되었습니다.');
        await fetchInfraData();

        return true;
      } catch (error) {
        logger.error('Infrastructure deletion failed:', error as Error);
        messageApi.error('인프라 삭제에 실패했습니다.');

        return false;
      }
    },
    [fetchInfraData, messageApi]
  );

  return {
    infraData,
    loading,
    refreshing,
    fetchInfraData,
    refreshInfraData,
    createInfrastructure,
    importInfrastructure,
    deleteInfrastructure,
    contextHolder,
  };
};
