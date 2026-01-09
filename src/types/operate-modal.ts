/**
 * 운영 모달 컴포넌트 전용 타입 정의
 * ImprovedOperateModal, KubernetesOperateModal, DockerOperateModal에서 사용
 */

import type { Service } from './index';
import type { DastResult } from './securityAnalysis';

// ============================================================================
// 공통 타입 (Common Types)
// ============================================================================

/**
 * 운영 모달 Props (공통)
 */
export interface OperateModalProps {
  visible: boolean;
  onClose: () => void;
  service?: Service | null;
  currentStatus?: DeploymentStatus;
  serverHops?: string;
  infraId?: number;
  dastResult?: DastResult | null;
  dastState?: 'analyzing' | 'completed' | 'failed' | 'null' | 'idle' | null;
  repoId?: number;
  repoName?: string;
  repoUrl?: string;
}

/**
 * 배포 상태 정보
 */
export interface DeploymentStatus {
  replicas?: number;
  availableReplicas?: number;
  updatedReplicas?: number;
  readyReplicas?: number;
  status?: string;
}

/**
 * 리소스 정보 (CPU, Memory, Disk, Network)
 */
export interface ResourceInfo {
  cpu_model: string;
  cpu_cores: string;
  cpu_usage: string;
  mem_total: string;
  mem_used: string;
  mem_free: string;
  mem_usage: string;
  disk_total: string;
  disk_used: string;
  disk_free: string;
  disk_usage: string;
  network_info: string;
  hostname: string;
  os_name: string;
  kernel: string;
}

/**
 * 배포된 이미지 정보
 */
export interface DeployedImageInfo {
  deployed_image_tag?: string;
  deployed_image?: string;
  registry?: string;
  project?: string;
  actual_deployed_images?: string[];
}

// ============================================================================
// Kubernetes 전용 타입 (K8s Types)
// ============================================================================

/**
 * Pod 정보
 */
export interface PodInfo {
  name: string;
  status: string;
  ready: boolean;
  restarts: number;
  age?: string;
  image?: string;
  cpuUsage?: string; // CPU 사용량 (예: "150m")
  memoryUsage?: string; // 메모리 사용량 (예: "256Mi")
  events?: PodEvent[]; // Pod 이벤트 (Pending 상태일 때 표시)
}

/**
 * Pod 이벤트 정보
 */
export interface PodEvent {
  type?: string;
  reason?: string;
  message?: string;
  timestamp?: string;
  count?: number;
}

/**
 * Deployment 정보
 */
export interface DeploymentInfo {
  name: string;
  namespace: string;
  replicas: number;
  availableReplicas: number;
  updatedReplicas: number;
  readyReplicas: number;
  status: string;
  createdAt?: string;
}

/**
 * HPA (Horizontal Pod Autoscaler) 정보
 */
export interface HPAInfo {
  name: string;
  namespace: string;
  targetRef: string;
  targetDeployment?: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  targetCPU?: number;
  currentCPU?: number;
  targetMemory?: number;
  currentMemory?: number;
}

/**
 * Ingress 정보
 */
export interface IngressInfo {
  name: string;
  namespace: string;
  hosts: string[];
  paths?: IngressPath[];
  tls?: IngressTLS[];
  createdAt?: string;
}

/**
 * Ingress 경로 정보
 */
export interface IngressPath {
  path: string;
  pathType?: string;
  backend: {
    serviceName: string;
    servicePort: number | string;
  };
}

/**
 * Ingress TLS 정보
 */
export interface IngressTLS {
  hosts: string[];
  secretName: string;
}

/**
 * Ingress Controller 상태
 */
export interface IngressControllerStatus {
  installed: boolean;
  running: boolean;
  namespace?: string;
  version?: string;
  pods?: PodInfo[];
}

/**
 * Metrics Server 상태
 */
export interface MetricsServerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  pods?: PodInfo[];
}

/**
 * Metrics Server 진단 정보
 */
export interface MetricsServerDiagnostics {
  apiAvailable: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Node 정보
 */
export interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  age?: string;
  version?: string;
  cpuCapacity?: string;
  memoryCapacity?: string;
  conditions?: NodeCondition[];
}

/**
 * Node 상태 조건
 */
export interface NodeCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

/**
 * K8s 리소스 메타데이터 (kubectl 응답용)
 */
export interface K8sMetadata {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  creationTimestamp?: string;
}

/**
 * K8s 리소스 상태 (kubectl 응답용)
 */
export interface K8sResourceStatus {
  phase?: string;
  capacity?: {
    storage?: string;
  };
}

/**
 * K8s 리소스 스펙 (kubectl 응답용)
 */
export interface K8sResourceSpec {
  capacity?: {
    storage?: string;
  };
}

/**
 * K8s 리소스 (kubectl 응답용)
 * PVC, PV, StorageClass 등에서 공통으로 사용
 */
export interface K8sResourceItem {
  metadata?: K8sMetadata;
  status?: K8sResourceStatus;
  spec?: K8sResourceSpec;
  provisioner?: string;
  reclaimPolicy?: string;
  // Fallback fields for simpler formats
  name?: string;
  capacity?: string;
}

/**
 * K8s 리소스 목록 응답 (kubectl 응답용)
 */
export interface K8sResourceList {
  items?: K8sResourceItem[];
  // Allow direct array format
  length?: number;
}

/**
 * PVC (Persistent Volume Claim) 상태
 */
export interface PVCStatusResult {
  pvcs?: PVCInfo[] | K8sResourceList;
  pvs?: PVInfo[] | K8sResourceList;
  storageclasses?: StorageClassInfo[] | K8sResourceList;
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
}

/**
 * PV (Persistent Volume) 정보
 */
export interface PVInfo {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy?: string;
  status?: string;
  claim?: string;
}

/**
 * Storage Class 정보
 */
export interface StorageClassInfo {
  name: string;
  provisioner: string;
  reclaimPolicy?: string;
  volumeBindingMode?: string;
}

/**
 * 정리 작업 결과
 */
export interface CleanupResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  errors?: string[];
}

// ============================================================================
// Docker 전용 타입 (Docker Types)
// ============================================================================

/**
 * Docker 컨테이너 정보
 */
export interface DockerContainerInfo {
  id: string;
  name: string;
  status: string;
  image: string;
  created: string;
  ports: string;
  size?: string;
}

/**
 * Docker 이미지 정보
 */
export interface DockerImageInfo {
  repository: string;
  tag: string;
  size: string;
  created: string;
  imageId?: string;
}

/**
 * Docker 볼륨 정보
 */
export interface DockerVolumeInfo {
  name: string;
  driver: string;
  size: string;
  mountpoint?: string;
  createdAt?: string;
}

/**
 * Docker 네트워크 정보
 */
export interface DockerNetworkInfo {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet?: string;
  gateway?: string;
}

/**
 * Docker 시스템 정보
 */
export interface DockerInfo {
  version?: string;
  apiVersion?: string;
  totalContainers?: number;
  runningContainers?: number;
  stoppedContainers?: number;
  images?: number;
  volumes?: number;
  networks?: number;
  os?: string;
  arch?: string;
  memory?: string;
  cpus?: number;
}

/**
 * Docker 컨테이너 통계 정보
 */
export interface DockerContainerStats {
  container_id: string;
  cpu_percent: string;
  memory_usage: string;
  memory_percent: string;
  network_io: string;
  block_io: string;
}

/**
 * Docker Compose 프로젝트 정보
 */
export interface DockerComposeProject {
  name: string;
  configFiles?: string[];
  services?: string[];
  networks?: string[];
  volumes?: string[];
}

// ============================================================================
// 유틸리티 타입 (Utility Types)
// ============================================================================

/**
 * 인프라 타입
 */
export type InfraType =
  | 'kubernetes'
  | 'docker'
  | 'podman'
  | 'external_kubernetes'
  | 'external_docker';

/**
 * 탭 키
 */
export type K8sTabKey =
  | 'overview'
  | 'pods'
  | 'deployment'
  | 'resources'
  | 'logs'
  | 'command'
  | 'k8s-ops'
  | 'dast';

export type DockerTabKey =
  | 'overview'
  | 'containers'
  | 'resources'
  | 'logs'
  | 'docker-ops';

export type CommonTabKey = 'overview' | 'logs' | 'dast';
