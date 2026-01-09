import {
  ServerStatus,
  KubernetesNodeResponse,
  KubernetesLogEntry,
  KubernetesPodInfo,
  KubernetesNamespaceInfo,
  KubernetesClusterInfo,
  KubernetesDetails,
  Server,
  User,
} from '../../../types';

export interface DeploymentInfoParams {
  namespace: string;
}

export interface DeployKubernetesParams {
  id: number; // 서비스 ID
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  username_repo: string; // GitLab 사용자명
  password_repo: string; // GitLab 비밀번호 또는 토큰
  docker_username: string; // Docker Registry 사용자명
  docker_password: string; // Docker Registry 비밀번호
}

export interface InfraPermission {
  user_id: number;
  user_email: string;
  role: 'admin' | 'member';
}

export interface SystemUser {
  id: number;
  email: string;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
  logs?: KubernetesLogEntry[];
  commandResults?: CommandResult[];
  details?: KubernetesDetails;
}

export interface InfraDetails {
  id: number;
  name: string;
  type: string;
  info: string;
  created_at: string;
  updated_at: string;
}

export interface ServerDetails {
  id: number;
  name: string;
  infra_id: number;
  type: string;
  ip: string;
  port: number;
  status: ServerStatus;
  hops?: Array<{
    host: string;
    port: number;
  }>;
}

// Common auth parameters for multi-hop SSH
export interface AuthHops {
  hops: Array<{
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
}

// Re-export commonly used types for convenience
export type {
  ServerStatus,
  KubernetesNodeResponse,
  KubernetesLogEntry,
  KubernetesPodInfo,
  KubernetesNamespaceInfo,
  KubernetesClusterInfo,
  KubernetesDetails,
  Server,
  User,
};
