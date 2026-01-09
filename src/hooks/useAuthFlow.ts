import { useState, useCallback } from 'react';
import { AuthHops } from '../lib/api';

interface Node {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  hops: string;
  status: string;
}

interface AuthRequest {
  node: Node;
  purpose:
    | 'build'
    | 'checkStatus'
    | 'resource'
    | 'rebuild'
    | 'start'
    | 'stop'
    | 'restart'
    | 'ha_auth'
    | 'delete_worker_auth'
    | 'delete_master_auth';
  isRebuildMode?: boolean;
  isRenewalMode?: boolean;
  deletePayload?: DeleteRequest;
}

interface DeleteRequest {
  type: 'worker' | 'master';
  stage: 'target' | 'main' | 'ha' | 'done';
  targetNode: Node;
  targetAuth?: AuthHops[];
  mainAuth?: AuthHops[];
  haAuth?: AuthHops[];
}

interface HaCredentials {
  username: string;
  password: string;
}

interface PendingMasterBuild {
  hopsData: AuthHops[];
  username: string;
  password: string;
  originalWorkerNode?: Node;
}

export const useAuthFlow = () => {
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(
    null
  );
  const [haAuthHops, setHaAuthHops] = useState<AuthHops[] | null>(null);
  const [haCredentials, setHaCredentials] = useState<HaCredentials | null>(
    null
  );
  const [pendingMasterBuild, setPendingMasterBuild] =
    useState<PendingMasterBuild | null>(null);

  // Modal states
  const [isHACredentialsModalVisible, setIsHACredentialsModalVisible] =
    useState(false);
  const [isRebuildMode, setIsRebuildMode] = useState(false);

  // Server credentials management
  const [serverCredentials, setServerCredentials] = useState<
    {
      node: Node;
      username: string;
      password: string;
    }[]
  >([]);

  // Auth request helpers
  const createAuthRequest = useCallback(
    (
      node: Node,
      purpose: AuthRequest['purpose'],
      options?: Partial<AuthRequest>
    ) => {
      setAuthRequest({
        node,
        purpose,
        ...options,
      });
    },
    []
  );

  const clearAuthRequest = useCallback(() => {
    setAuthRequest(null);
  }, []);

  // Delete request helpers
  const createDeleteRequest = useCallback(
    (
      type: 'worker' | 'master',
      targetNode: Node,
      stage: DeleteRequest['stage'] = 'target'
    ) => {
      setDeleteRequest({
        type,
        stage,
        targetNode,
      });
    },
    []
  );

  const updateDeleteRequest = useCallback((updates: Partial<DeleteRequest>) => {
    setDeleteRequest(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  const clearDeleteRequest = useCallback(() => {
    setDeleteRequest(null);
  }, []);

  // HA credentials management
  const setHACredentials = useCallback((credentials: HaCredentials | null) => {
    setHaCredentials(credentials);
  }, []);

  const clearHACredentials = useCallback(() => {
    setHaCredentials(null);
    setHaAuthHops(null);
    setIsHACredentialsModalVisible(false);
  }, []);

  // Pending master build management
  const setPendingBuild = useCallback((build: PendingMasterBuild | null) => {
    setPendingMasterBuild(build);
  }, []);

  const clearPendingBuild = useCallback(() => {
    setPendingMasterBuild(null);
  }, []);

  // Server credentials helpers
  const addServerCredentials = useCallback(
    (node: Node, username: string, password: string) => {
      setServerCredentials(prev => [
        ...prev.filter(cred => cred.node.id !== node.id),
        { node, username, password },
      ]);
    },
    []
  );

  const getServerCredentials = useCallback(
    (nodeId: string) => {
      return serverCredentials.find(cred => cred.node.id === nodeId);
    },
    [serverCredentials]
  );

  const clearServerCredentials = useCallback((nodeId?: string) => {
    if (nodeId) {
      setServerCredentials(prev =>
        prev.filter(cred => cred.node.id !== nodeId)
      );
    } else {
      setServerCredentials([]);
    }
  }, []);

  return {
    // Auth request state
    authRequest,
    createAuthRequest,
    clearAuthRequest,

    // Delete request state
    deleteRequest,
    createDeleteRequest,
    updateDeleteRequest,
    clearDeleteRequest,

    // HA auth state
    haAuthHops,
    setHaAuthHops,
    haCredentials,
    setHACredentials,
    clearHACredentials,
    isHACredentialsModalVisible,
    setIsHACredentialsModalVisible,

    // Master build state
    pendingMasterBuild,
    setPendingBuild,
    clearPendingBuild,

    // Rebuild mode
    isRebuildMode,
    setIsRebuildMode,

    // Server credentials
    serverCredentials,
    addServerCredentials,
    getServerCredentials,
    clearServerCredentials,
  };
};
