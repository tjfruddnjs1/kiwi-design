// Shared types for Kubernetes infrastructure components

import { InfraItem } from '../../../types/infra';
import { ServerStatus } from '../../../types/server';
import { SshHop as AuthHops } from '../../../lib/api/types';

export type NodeType = 'master' | 'worker' | 'ha';

export interface Node {
  id: string | number;
  nodeType?: NodeType;
  ip?: string;
  port?: string | number;
  server_name?: string;
  join_command?: string;
  certificate_key?: string;
  last_checked?: string;
  status?: ServerStatus;
  hops: string | AuthHops[];
  updated_at?: string;
  ha?: string;
}

export interface InfraKubernetesSettingProps {
  infra: InfraItem & { nodes?: Node[] };
  showSettingsModal: (infra: InfraItem) => void;
  isExternal?: boolean;
}

export interface DeletePayload {
  nodeId: string;
  nodeType: NodeType;
  forceDelete?: boolean;
  cleanup?: boolean;
}

export interface AuthRequest {
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
  deletePayload?: DeletePayload;
}

export interface DeleteRequest {
  type: 'worker' | 'master';
  stage: 'target' | 'main' | 'ha' | 'done';
  targetNode: Node;
  targetAuth?: AuthHops[];
  mainAuth?: AuthHops[];
  haAuth?: AuthHops[];
}

export interface ExternalNodeInfo {
  name: string;
  status: string;
  roles: string;
  age: string;
  version: string;
  internalIP: string;
  externalIP?: string;
  osImage?: string;
  kernelVersion?: string;
  containerRuntime?: string;
}

export interface ExternalNodesInfo {
  total: number;
  master: number;
  worker: number;
  list: ExternalNodeInfo[];
}

export interface HACredentials {
  username: string;
  password: string;
}

export interface PendingMasterBuild {
  hopsData: AuthHops[];
  username: string;
  password: string;
  originalWorkerNode?: Node;
}

export interface ServerCredential {
  node: Node;
  username: string;
  password: string;
}

export interface NodeTypeStatus {
  [nodeId: string]: {
    [type: string]: {
      status: ServerStatus;
      lastChecked: string;
    };
  };
}

export interface ExternalServer {
  ip: string;
  port: string;
}
