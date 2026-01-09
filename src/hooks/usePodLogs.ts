import { useState, useCallback } from 'react';
import { message } from 'antd';
import { InfrastructureService } from '../services/InfrastructureService';
import { Server } from './useServiceStatusCache';
import { logger } from '../utils/logger';

interface AuthCredentials {
  username: string;
  password: string;
}

export const usePodLogs = () => {
  const [podLogModalVisible, setPodLogModalVisible] = useState<boolean>(false);
  const [currentPod, setCurrentPod] = useState<{ name: string } | null>(null);
  const [podLogs, setPodLogs] = useState<string>('');
  const [podLogsLoading, setPodLogsLoading] = useState<boolean>(false);

  const openPodLogs = useCallback((podName: string) => {
    setCurrentPod({ name: podName });
    setPodLogModalVisible(true);
    setPodLogs(''); // Clear previous logs
  }, []);

  const closePodLogs = useCallback(() => {
    setPodLogModalVisible(false);
    setCurrentPod(null);
    setPodLogs('');
  }, []);

  const fetchPodLogs = useCallback(
    async (
      server: Server,
      podName: string,
      namespace: string,
      auth: AuthCredentials,
      infraType: string
    ) => {
      setPodLogsLoading(true);

      try {
        const hops = InfrastructureService.parseHops(server.hops);
        let logs: string;

        if (infraType === 'kubernetes') {
          logs = await InfrastructureService.getKubernetesPodLogs(
            server.id,
            podName,
            namespace,
            hops,
            auth
          );
        } else {
          logs = await InfrastructureService.getDockerContainerLogs(
            server.id,
            podName,
            hops,
            auth
          );
        }

        setPodLogs(logs);
      } catch (error) {
        logger.error('Pod logs fetch failed:', error as Error);
        message.error(
          error instanceof Error
            ? error.message
            : 'Pod 로그 조회에 실패했습니다.'
        );
      } finally {
        setPodLogsLoading(false);
      }
    },
    []
  );

  const refreshPodLogs = useCallback(
    (
      server: Server,
      podName: string,
      namespace: string,
      auth: AuthCredentials,
      infraType: string
    ) => {
      if (server && podName) {
        fetchPodLogs(server, podName, namespace, auth, infraType);
      }
    },
    [fetchPodLogs]
  );

  return {
    podLogModalVisible,
    currentPod,
    podLogs,
    podLogsLoading,
    openPodLogs,
    closePodLogs,
    fetchPodLogs,
    refreshPodLogs,
  };
};
