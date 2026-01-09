/**
 * Mock Infrastructure Data
 * Kubernetes, Docker 인프라 데이터
 */

export interface MockServer {
  id: string | number;
  server_name: string;
  device_id?: number;
  device_name?: string;
  hops: string;
  type: string;
  infra_id: number;
  ha: string;
  created_at: string;
  updated_at: string;
  status?: string;
  ip?: string;
  port?: number;
  nodeType?: string;
}

export interface MockInfra {
  id: number;
  name: string;
  type: 'kubernetes' | 'docker' | 'podman' | 'external_kubernetes' | 'external_docker';
  info: string;
  created_at: string;
  updated_at: string;
  status: 'uninstalled' | 'active' | 'inactive' | 'unknown';
  user_role: 'admin' | 'member';
  nodes?: MockServer[];
}

export const mockServers: MockServer[] = [
  // Kubernetes Production Cluster Nodes
  {
    id: '1',
    server_name: 'k8s-master-01',
    device_name: 'Production Master 1',
    hops: JSON.stringify([{ host: '192.168.1.100', port: 22, username: 'root' }]),
    type: 'master,ha',
    infra_id: 1,
    ha: 'Y',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    ip: '192.168.1.100',
    port: 22,
    nodeType: 'master',
  },
  {
    id: '2',
    server_name: 'k8s-master-02',
    device_name: 'Production Master 2',
    hops: JSON.stringify([{ host: '192.168.1.101', port: 22, username: 'root' }]),
    type: 'master,ha',
    infra_id: 1,
    ha: 'Y',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    ip: '192.168.1.101',
    port: 22,
    nodeType: 'master',
  },
  {
    id: '3',
    server_name: 'k8s-worker-01',
    device_name: 'Production Worker 1',
    hops: JSON.stringify([{ host: '192.168.1.110', port: 22, username: 'root' }]),
    type: 'worker',
    infra_id: 1,
    ha: 'N',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    ip: '192.168.1.110',
    port: 22,
    nodeType: 'worker',
  },
  {
    id: '4',
    server_name: 'k8s-worker-02',
    device_name: 'Production Worker 2',
    hops: JSON.stringify([{ host: '192.168.1.111', port: 22, username: 'root' }]),
    type: 'worker',
    infra_id: 1,
    ha: 'N',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    ip: '192.168.1.111',
    port: 22,
    nodeType: 'worker',
  },
  // Docker Server
  {
    id: '5',
    server_name: 'docker-dev-01',
    device_name: 'Development Docker Server',
    hops: JSON.stringify([{ host: '192.168.2.50', port: 22, username: 'docker' }]),
    type: 'docker',
    infra_id: 2,
    ha: 'N',
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    ip: '192.168.2.50',
    port: 22,
  },
  // External Kubernetes
  {
    id: '6',
    server_name: 'external-k8s-master',
    device_name: 'AWS EKS Control Plane',
    hops: JSON.stringify([{ host: 'eks.ap-northeast-2.amazonaws.com', port: 443 }]),
    type: 'master',
    infra_id: 3,
    ha: 'Y',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    nodeType: 'master',
  },
  // Podman Server
  {
    id: '7',
    server_name: 'podman-staging-01',
    device_name: 'Staging Podman Server',
    hops: JSON.stringify([{ host: '192.168.3.100', port: 22, username: 'podman' }]),
    type: 'podman',
    infra_id: 4,
    ha: 'N',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    ip: '192.168.3.100',
    port: 22,
  },
];

export const mockInfrastructures: MockInfra[] = [
  {
    id: 1,
    name: 'kubernetes-production',
    type: 'kubernetes',
    info: 'Production Kubernetes Cluster - 2 Masters, 2 Workers',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    user_role: 'admin',
    nodes: mockServers.filter((s) => s.infra_id === 1),
  },
  {
    id: 2,
    name: 'docker-development',
    type: 'docker',
    info: 'Development Docker Server for CI/CD',
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    user_role: 'admin',
    nodes: mockServers.filter((s) => s.infra_id === 2),
  },
  {
    id: 3,
    name: 'eks-staging',
    type: 'external_kubernetes',
    info: 'AWS EKS Staging Cluster',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    user_role: 'member',
    nodes: mockServers.filter((s) => s.infra_id === 3),
  },
  {
    id: 4,
    name: 'podman-staging',
    type: 'podman',
    info: 'Staging Podman Server for containerized applications',
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    status: 'active',
    user_role: 'admin',
    nodes: mockServers.filter((s) => s.infra_id === 4),
  },
];

// Kubernetes Cluster Info
export const mockClusterInfo = {
  totalNodes: 4,
  readyNodes: 4,
  totalPods: 45,
  runningPods: 42,
  totalNamespaces: 8,
  cpu: '24 cores (45% used)',
  memory: '64GB (62% used)',
  storage: '500GB (38% used)',
};

// Kubernetes Namespaces
export const mockNamespaces = [
  { name: 'default', status: 'Active', age: '365d' },
  { name: 'kube-system', status: 'Active', age: '365d' },
  { name: 'kube-public', status: 'Active', age: '365d' },
  { name: 'production', status: 'Active', age: '180d' },
  { name: 'staging', status: 'Active', age: '180d' },
  { name: 'development', status: 'Active', age: '90d' },
  { name: 'monitoring', status: 'Active', age: '60d' },
  { name: 'backup', status: 'Active', age: '45d' },
];

// Server Resource Info
export const mockServerResources = {
  cpu: {
    cores: 8,
    usage: '45%',
    loadAverage: [1.2, 1.5, 1.8],
  },
  memory: {
    total: '32GB',
    used: '20GB',
    available: '12GB',
    usagePercent: 62.5,
  },
  disk: {
    total: '500GB',
    used: '190GB',
    available: '310GB',
    usagePercent: 38,
  },
  network: {
    interfaces: [
      { name: 'eth0', ip: '192.168.1.100', status: 'up' as const },
      { name: 'docker0', ip: '172.17.0.1', status: 'up' as const },
    ],
  },
  system: {
    hostname: 'k8s-master-01',
    uptime: '45 days',
    os: 'Ubuntu 22.04 LTS',
    kernel: '5.15.0-generic',
  },
};