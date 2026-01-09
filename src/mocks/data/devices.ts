/**
 * Mock Device Data
 * 장비 관리 페이지용 Mock 데이터
 */

export interface MockDevice {
  id: number;
  name: string;
  ip: string;
  port: number;
  location: string;
  os: string;
  cpu: number;
  memory: number;
  disk: number;
  description?: string;
  organization_id: number;
  children?: [];
  parentId?: number;
  runtime_cluster?: {
    docker?: {
      installed: boolean;
      running: boolean;
    };
    kubernetes?: {
      node: boolean;
      role: string;
    };
    podman?: {
      installed: boolean;
      running: boolean;
    };
  };
  runtime_installed?: {
    ha?: boolean;
    master?: boolean;
    worker?: boolean;
    docker?: boolean;
    podman?: boolean;
  };
  awxHostId?: number;
}

export const mockDevices: MockDevice[] = [
  {
    id: 1,
    name: 'gateway-server',
    ip: '192.168.1.1',
    port: 22,
    location: 'Seoul DC',
    os: 'Ubuntu 22.04 LTS',
    cpu: 8,
    memory: 16,
    disk: 500,
    description: 'Main gateway server',
    organization_id: 1,
    children: [],
    runtime_cluster: {
      kubernetes: {
        node: true,
        role: 'master',
      },
    },
    runtime_installed: {
      ha: true,
      master: true,
      worker: false,
      docker: true,
      podman: false,
    },
    awxHostId: 1,
  },
  {
    id: 2,
    name: 'worker-node-01',
    ip: '192.168.1.10',
    port: 22,
    location: 'Seoul DC',
    os: 'Ubuntu 22.04 LTS',
    cpu: 16,
    memory: 64,
    disk: 1000,
    description: 'Kubernetes worker node 1',
    organization_id: 1,
    parentId: 1,
    children: [],
    runtime_cluster: {
      kubernetes: {
        node: true,
        role: 'worker',
      },
      docker: {
        installed: true,
        running: true,
      },
    },
    runtime_installed: {
      ha: false,
      master: false,
      worker: true,
      docker: true,
      podman: false,
    },
    awxHostId: 2,
  },
  {
    id: 3,
    name: 'worker-node-02',
    ip: '192.168.1.11',
    port: 22,
    location: 'Seoul DC',
    os: 'Ubuntu 22.04 LTS',
    cpu: 16,
    memory: 64,
    disk: 1000,
    description: 'Kubernetes worker node 2',
    organization_id: 1,
    parentId: 1,
    children: [],
    runtime_cluster: {
      kubernetes: {
        node: true,
        role: 'worker',
      },
      docker: {
        installed: true,
        running: true,
      },
    },
    runtime_installed: {
      ha: false,
      master: false,
      worker: true,
      docker: true,
      podman: false,
    },
    awxHostId: 3,
  },
  {
    id: 4,
    name: 'dev-server',
    ip: '192.168.2.1',
    port: 22,
    location: 'Busan DC',
    os: 'CentOS 8',
    cpu: 4,
    memory: 8,
    disk: 200,
    description: 'Development server with Docker',
    organization_id: 1,
    children: [],
    runtime_cluster: {
      docker: {
        installed: true,
        running: true,
      },
    },
    runtime_installed: {
      ha: false,
      master: false,
      worker: false,
      docker: true,
      podman: false,
    },
    awxHostId: 4,
  },
  {
    id: 5,
    name: 'staging-server',
    ip: '192.168.2.10',
    port: 22,
    location: 'Busan DC',
    os: 'Rocky Linux 9',
    cpu: 8,
    memory: 32,
    disk: 500,
    description: 'Staging environment server',
    organization_id: 1,
    parentId: 4,
    children: [],
    runtime_cluster: {
      docker: {
        installed: true,
        running: true,
      },
      podman: {
        installed: true,
        running: false,
      },
    },
    runtime_installed: {
      ha: false,
      master: false,
      worker: false,
      docker: true,
      podman: true,
    },
    awxHostId: 5,
  },
];