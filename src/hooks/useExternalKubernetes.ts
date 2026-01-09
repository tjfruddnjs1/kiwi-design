import { useState, useCallback } from 'react';

interface ExternalServer {
  ip: string;
  port: string;
}

interface ExternalNodesInfo {
  total: number;
  master: number;
  worker: number;
  list: Array<{
    name: string;
    role: string;
    status: string;
  }>;
}

interface ServerResource {
  cpu: {
    cores: string;
    usage_percent: string;
    model: string;
  };
  memory: {
    total_mb: string;
    used_mb: string;
    usage_percent: string;
  };
  disk: {
    root_total: string;
    root_used: string;
    root_usage_percent: string;
  };
}

export const useExternalKubernetes = () => {
  const [externalServer, setExternalServer] = useState<ExternalServer | null>(
    null
  );
  const [externalNodesInfo, setExternalNodesInfo] =
    useState<ExternalNodesInfo | null>(null);
  const [serverResource, setServerResource] = useState<ServerResource | null>(
    null
  );

  // Modal states
  const [externalAuthModalVisible, setExternalAuthModalVisible] =
    useState(false);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);

  // Loading states
  const [checkingLoading, setCheckingLoading] = useState(false);
  const [resourceLoading, setResourceLoading] = useState(false);

  // External server management
  const updateExternalServer = useCallback((server: ExternalServer) => {
    setExternalServer(server);
  }, []);

  const clearExternalServer = useCallback(() => {
    setExternalServer(null);
    setExternalNodesInfo(null);
    setServerResource(null);
  }, []);

  // External nodes info management
  const updateExternalNodesInfo = useCallback((info: ExternalNodesInfo) => {
    setExternalNodesInfo(info);
  }, []);

  const clearExternalNodesInfo = useCallback(() => {
    setExternalNodesInfo(null);
  }, []);

  // Server resource management
  const updateServerResource = useCallback((resource: ServerResource) => {
    setServerResource(resource);
  }, []);

  const clearServerResource = useCallback(() => {
    setServerResource(null);
  }, []);

  // Modal management
  const showExternalAuthModal = useCallback(() => {
    setExternalAuthModalVisible(true);
  }, []);

  const hideExternalAuthModal = useCallback(() => {
    setExternalAuthModalVisible(false);
  }, []);

  const showResourceModal = useCallback(() => {
    setResourceModalVisible(true);
  }, []);

  const hideResourceModal = useCallback(() => {
    setResourceModalVisible(false);
  }, []);

  // Loading state management
  const setCheckingLoadingState = useCallback((loading: boolean) => {
    setCheckingLoading(loading);
  }, []);

  const setResourceLoadingState = useCallback((loading: boolean) => {
    setResourceLoading(loading);
  }, []);

  // Reset all state
  const resetAll = useCallback(() => {
    clearExternalServer();
    clearExternalNodesInfo();
    clearServerResource();
    hideExternalAuthModal();
    hideResourceModal();
    setCheckingLoading(false);
    setResourceLoading(false);
  }, [
    clearExternalServer,
    clearExternalNodesInfo,
    clearServerResource,
    hideExternalAuthModal,
    hideResourceModal,
  ]);

  return {
    // External server state
    externalServer,
    updateExternalServer,
    clearExternalServer,

    // External nodes info state
    externalNodesInfo,
    updateExternalNodesInfo,
    clearExternalNodesInfo,

    // Server resource state
    serverResource,
    updateServerResource,
    clearServerResource,

    // Modal states
    externalAuthModalVisible,
    showExternalAuthModal,
    hideExternalAuthModal,

    resourceModalVisible,
    showResourceModal,
    hideResourceModal,

    // Loading states
    checkingLoading,
    setCheckingLoadingState,

    resourceLoading,
    setResourceLoadingState,

    // Utils
    resetAll,
  };
};
