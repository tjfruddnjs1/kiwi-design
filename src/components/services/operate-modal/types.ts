/**
 * 운영 모달 공통 타입 정의
 * ImprovedOperateModal 컴포넌트 리팩토링을 위한 타입 정의
 */

import type { Service } from '../../../lib/api/types';

/**
 * 운영 모달 Props
 */
export interface OperateModalProps {
  visible: boolean;
  onClose: () => void;
  service?: Service | null;
  currentStatus?: {
    replicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
    readyReplicas?: number;
    status?: string;
  };
  serverHops?: string;
  infraId?: number;
  dastResult?: unknown;
  dastState?: 'analyzing' | 'completed' | 'failed' | 'null' | 'idle' | null;
  repoId?: number;
  repoName?: string;
  repoUrl?: string;
}

/**
 * 탭 컴포넌트 공통 Props
 */
export interface TabComponentProps {
  service?: Service | null;
  infraId?: number;
  serverHops?: string;
  visible: boolean;
}

/**
 * Docker 탭 Props (extends TabComponentProps with Docker-specific properties)
 */
export type DockerTabProps = TabComponentProps;

/**
 * Kubernetes 탭 Props
 */
export interface K8sTabProps extends TabComponentProps {
  currentStatus?: {
    replicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
    readyReplicas?: number;
    status?: string;
  };
}

/**
 * Pod 정보
 */
export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  ip?: string;
  node?: string;
  containers?: Array<{
    name: string;
    image: string;
    ready: boolean;
    restartCount: number;
  }>;
}

/**
 * 리소스 정보
 */
export interface ResourceInfo {
  deployment?: DeploymentInfo[];
  service?: any[];
  ingress?: IngressInfo[];
  pvc?: PVCInfo[];
  pv?: PVInfo[];
  storageclass?: StorageClassInfo[];
}

/**
 * Deployment 정보
 */
export interface DeploymentInfo {
  name: string;
  namespace: string;
  replicas: number;
  ready: number;
  upToDate: number;
  available: number;
  age: string;
  createdAt?: string;
}

/**
 * HPA 정보
 */
export interface HPAInfo {
  name: string;
  namespace: string;
  reference: string;
  targets: string;
  minPods: number;
  maxPods: number;
  replicas: number;
  age: string;
}

/**
 * Ingress 정보
 */
export interface IngressInfo {
  name: string;
  namespace: string;
  className?: string;
  hosts: string[];
  address?: string;
  ports?: string;
  age: string;
}

/**
 * PVC 정보
 */
export interface PVCInfo {
  name: string;
  namespace: string;
  status: string;
  volume?: string;
  capacity?: string;
  accessModes?: string[];
  storageClass?: string;
  age: string;
}

/**
 * PV 정보
 */
export interface PVInfo {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: string;
  status: string;
  claim?: string;
  storageClass?: string;
  reason?: string;
  age: string;
}

/**
 * StorageClass 정보
 */
export interface StorageClassInfo {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
  age: string;
}

/**
 * Docker 타입 정의 - docker.ts에서 재사용
 * 중복 정의를 방지하기 위해 docker.ts에서 import하여 re-export
 */
export type {
  DockerContainerInfo,
  DockerImageInfo,
  DockerVolumeInfo,
  DockerNetworkInfo,
  ContainerStats as DockerContainerStats,
} from '../../../lib/api/docker';
