import { useState, useCallback } from 'react';
import { message } from 'antd';
import * as dockerApi from '../lib/api/docker';
import { logger } from '../utils/logger';

interface DockerServer {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'uninstalled';
  hops: string;
  lastChecked?: string;
  containerCount?: number;
  imageCount?: number;
}

export const useDockerManagement = (infraId: number) => {
  const [servers, setServers] = useState<DockerServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [authModalData, setAuthModalData] = useState<{
    visible: boolean;
    serverId: number | null;
    action: string | null;
    targetServer: {
      name: string;
      hops: { host: string; port: number }[];
    } | null;
  }>({
    visible: false,
    serverId: null,
    action: null,
    targetServer: null,
  });

  const [messageApi, contextHolder] = message.useMessage();

  // Load docker servers
  const loadDockerServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dockerApi.getDockerServer(infraId);

      if (
        response.success !== false &&
        'server' in response &&
        response.server
      ) {
        setServers([response.server]);
      }
    } catch (error) {
      logger.error('Docker servers load failed', undefined, { error });
      messageApi.error('도커 서버 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [infraId, messageApi]);

  // Check docker status
  const checkDockerStatus = useCallback(
    async (
      serverId: number,
      authHops: {
        host: string;
        port: number;
        username: string;
        password: string;
      }[]
    ) => {
      try {
        setLoading(true);
        const response = await dockerApi.checkDockerServerStatus(serverId, {
          hops: authHops,
        });

        if (response.success !== false) {
          messageApi.success('도커 상태 확인 완료');
          await loadDockerServers(); // Refresh list
        }
      } catch (error) {
        logger.error('Docker status check failed', undefined, { error });
        messageApi.error('도커 상태 확인에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [loadDockerServers, messageApi]
  );

  // Install docker
  const installDocker = useCallback(
    async (
      serverId: number,
      authHops: {
        host: string;
        port: number;
        username: string;
        password: string;
      }[]
    ) => {
      try {
        setLoading(true);
        const response = await dockerApi.installDocker(serverId, {
          hops: authHops,
        });

        if (response.success !== false) {
          messageApi.success('도커 설치가 완료되었습니다.');
          await loadDockerServers(); // Refresh list
        }
      } catch (error) {
        logger.error('Docker installation failed', undefined, { error });
        messageApi.error('도커 설치에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [loadDockerServers, messageApi]
  );

  // Uninstall docker
  const uninstallDocker = useCallback(
    async (
      serverId: number,
      authHops: {
        host: string;
        port: number;
        username: string;
        password: string;
      }[]
    ) => {
      try {
        setLoading(true);
        const response = await dockerApi.uninstallDocker(serverId, {
          hops: authHops,
        });

        if (response.success !== false) {
          messageApi.success('도커가 제거되었습니다.');
          await loadDockerServers(); // Refresh list
        }
      } catch (error) {
        logger.error('Docker uninstallation failed', undefined, { error });
        messageApi.error('도커 제거에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [loadDockerServers, messageApi]
  );

  // Register new server
  const registerServer = useCallback(
    async (serverData: {
      name: string;
      hops: { host: string; port: number }[];
    }) => {
      try {
        setLoading(true);
        const response = await dockerApi.createDockerServer({
          name: serverData.name,
          infra_id: infraId,
          hops: serverData.hops,
        });

        if (response.success !== false) {
          messageApi.success('서버가 등록되었습니다.');
          await loadDockerServers(); // Refresh list
        }
      } catch (error) {
        logger.error('Server registration failed', undefined, { error });
        messageApi.error('서버 등록에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [infraId, loadDockerServers, messageApi]
  );

  return {
    servers,
    loading,
    authModalData,
    setAuthModalData,
    contextHolder,
    loadDockerServers,
    checkDockerStatus,
    installDocker,
    uninstallDocker,
    registerServer,
  };
};
