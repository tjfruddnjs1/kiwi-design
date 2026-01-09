/**
 * Mock Docker Data
 * Docker 컨테이너, 이미지, 볼륨 정보
 */

export interface MockDockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'restarting';
  ports: string;
  created: string;
  size?: string;
}

export interface MockDockerImage {
  id: string;
  repository: string;
  tag: string;
  created: string;
  size: string;
}

export interface MockDockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  created: string;
  size?: string;
}

export interface MockDockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  ipam: string;
}

export interface MockDockerServer {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'uninstalled';
  hops: string;
  lastChecked?: string;
  containerCount?: number;
  imageCount?: number;
  version?: string;
}

export const mockDockerContainers: MockDockerContainer[] = [
  {
    id: 'abc123def456',
    name: 'legacy-api',
    image: 'harbor.kiwi.com/legacy-api:latest',
    status: 'Up 15 days',
    state: 'running',
    ports: '0.0.0.0:8081->8080/tcp',
    created: '2024-12-25T00:00:00Z',
    size: '245MB',
  },
  {
    id: 'ghi789jkl012',
    name: 'redis-cache',
    image: 'redis:7-alpine',
    status: 'Up 30 days',
    state: 'running',
    ports: '6379/tcp',
    created: '2024-12-10T00:00:00Z',
    size: '32MB',
  },
  {
    id: 'mno345pqr678',
    name: 'postgres-db',
    image: 'postgres:15',
    status: 'Up 30 days',
    state: 'running',
    ports: '5432/tcp',
    created: '2024-12-10T00:00:00Z',
    size: '380MB',
  },
  {
    id: 'stu901vwx234',
    name: 'nginx-proxy',
    image: 'nginx:latest',
    status: 'Up 20 days',
    state: 'running',
    ports: '0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp',
    created: '2024-12-20T00:00:00Z',
    size: '142MB',
  },
  {
    id: 'yza567bcd890',
    name: 'dev-test-container',
    image: 'node:18-alpine',
    status: 'Exited (0) 2 days ago',
    state: 'exited',
    ports: '',
    created: '2026-01-07T00:00:00Z',
    size: '180MB',
  },
];

export const mockDockerImages: MockDockerImage[] = [
  {
    id: 'sha256:abc123',
    repository: 'harbor.kiwi.com/legacy-api',
    tag: 'latest',
    created: '2024-12-25T00:00:00Z',
    size: '245MB',
  },
  {
    id: 'sha256:def456',
    repository: 'harbor.kiwi.com/legacy-api',
    tag: 'v1.0.0',
    created: '2024-12-20T00:00:00Z',
    size: '243MB',
  },
  {
    id: 'sha256:ghi789',
    repository: 'redis',
    tag: '7-alpine',
    created: '2024-11-15T00:00:00Z',
    size: '32MB',
  },
  {
    id: 'sha256:jkl012',
    repository: 'postgres',
    tag: '15',
    created: '2024-11-10T00:00:00Z',
    size: '380MB',
  },
  {
    id: 'sha256:mno345',
    repository: 'nginx',
    tag: 'latest',
    created: '2024-12-01T00:00:00Z',
    size: '142MB',
  },
  {
    id: 'sha256:pqr678',
    repository: 'node',
    tag: '18-alpine',
    created: '2024-10-15T00:00:00Z',
    size: '180MB',
  },
];

export const mockDockerVolumes: MockDockerVolume[] = [
  {
    name: 'postgres-data',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/postgres-data/_data',
    created: '2024-12-10T00:00:00Z',
    size: '5.2GB',
  },
  {
    name: 'redis-data',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/redis-data/_data',
    created: '2024-12-10T00:00:00Z',
    size: '128MB',
  },
  {
    name: 'nginx-config',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/nginx-config/_data',
    created: '2024-12-20T00:00:00Z',
    size: '2MB',
  },
  {
    name: 'app-logs',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/app-logs/_data',
    created: '2024-12-25T00:00:00Z',
    size: '850MB',
  },
];

export const mockDockerNetworks: MockDockerNetwork[] = [
  {
    id: 'network-abc123',
    name: 'bridge',
    driver: 'bridge',
    scope: 'local',
    ipam: '172.17.0.0/16',
  },
  {
    id: 'network-def456',
    name: 'host',
    driver: 'host',
    scope: 'local',
    ipam: '',
  },
  {
    id: 'network-ghi789',
    name: 'kiwi-network',
    driver: 'bridge',
    scope: 'local',
    ipam: '172.20.0.0/16',
  },
  {
    id: 'network-jkl012',
    name: 'app-internal',
    driver: 'bridge',
    scope: 'local',
    ipam: '172.21.0.0/16',
  },
];

export const mockDockerServer: MockDockerServer = {
  id: 2,
  name: 'docker-development',
  status: 'active',
  hops: JSON.stringify([{ host: '192.168.2.50', port: 22, username: 'docker' }]),
  lastChecked: '2026-01-09T08:00:00Z',
  containerCount: 5,
  imageCount: 6,
  version: '24.0.7',
};

// Docker System Info
export const mockDockerSystemInfo = {
  containers: 5,
  containersRunning: 4,
  containersPaused: 0,
  containersStopped: 1,
  images: 6,
  driver: 'overlay2',
  memoryLimit: true,
  swapLimit: true,
  kernelVersion: '5.15.0-generic',
  operatingSystem: 'Ubuntu 22.04.3 LTS',
  osType: 'linux',
  architecture: 'x86_64',
  cpus: 4,
  memTotal: 17179869184, // 16GB in bytes
  dockerRootDir: '/var/lib/docker',
  serverVersion: '24.0.7',
};

// Container Stats
export const mockContainerStats = {
  'legacy-api': {
    cpu_percent: 2.5,
    memory_usage: '256MB',
    memory_limit: '512MB',
    memory_percent: 50,
    network_rx: '1.2GB',
    network_tx: '850MB',
    block_read: '500MB',
    block_write: '120MB',
  },
  'redis-cache': {
    cpu_percent: 0.5,
    memory_usage: '28MB',
    memory_limit: '128MB',
    memory_percent: 21.9,
    network_rx: '350MB',
    network_tx: '280MB',
    block_read: '50MB',
    block_write: '80MB',
  },
  'postgres-db': {
    cpu_percent: 3.2,
    memory_usage: '380MB',
    memory_limit: '1GB',
    memory_percent: 37.1,
    network_rx: '2.5GB',
    network_tx: '1.8GB',
    block_read: '15GB',
    block_write: '5.2GB',
  },
};
