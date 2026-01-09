import { useState, useCallback } from 'react';
import { message } from 'antd';
import { InfraItem } from '../types/infra';
import { Server } from './useServiceStatusCache';
import { InfrastructureService } from '../services/InfrastructureService';
import { logger } from '../utils/logger';

export const useInfrastructureData = () => {
  const [infraInfo, setInfraInfo] = useState<InfraItem | null>(null);
  const [infraLoading, setInfraLoading] = useState<boolean>(false);
  const [serverList, setServerList] = useState<Server[]>([]);

  const fetchInfraInfo = useCallback(async (infraId: number) => {
    setInfraLoading(true);
    try {
      const info = await InfrastructureService.fetchInfraInfo(infraId);

      setInfraInfo(info);

      if (info) {
        // Fetch server list for this infrastructure
        const servers = await InfrastructureService.getServerList(infraId);

        setServerList(servers);
      }

      return info;
    } catch (error) {
      logger.error('Infrastructure info fetch failed:', error as Error);
      message.error(
        error instanceof Error
          ? error.message
          : '인프라 정보 조회에 실패했습니다.'
      );

      return null;
    } finally {
      setInfraLoading(false);
    }
  }, []);

  const clearInfraData = useCallback(() => {
    setInfraInfo(null);
    setServerList([]);
  }, []);

  return {
    infraInfo,
    infraLoading,
    serverList,
    fetchInfraInfo,
    clearInfraData,
    setInfraInfo,
    setServerList,
  };
};
