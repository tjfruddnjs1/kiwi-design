/**
 * Mock Kubernetes Data
 * K8s 클러스터, Pod, Deployment 정보
 */

export interface MockKubernetesPod {
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'Failed' | 'Unknown' | 'Succeeded';
  ready: boolean;
  restarts: number;
  age: string;
  image: string;
  node?: string;
  ip?: string;
  labels?: Record<string, string>;
}

export interface MockKubernetesDeployment {
  name: string;
  namespace: string;
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  strategy: string;
  age: string;
  images: string[];
}

export interface MockKubernetesService {
  name: string;
  namespace: string;
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  clusterIP: string;
  externalIP?: string;
  ports: string;
  age: string;
}

export interface MockKubernetesIngress {
  name: string;
  namespace: string;
  hosts: string[];
  paths: string[];
  tls: boolean;
  age: string;
}

export const mockKubernetesPods: MockKubernetesPod[] = [
  // Production namespace pods
  {
    name: 'web-api-deployment-abc123-1',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '5d',
    image: 'harbor.kiwi.com/web-api:v1.2.3',
    node: 'k8s-worker-01',
    ip: '10.244.1.15',
    labels: { app: 'web-api', version: 'v1.2.3' },
  },
  {
    name: 'web-api-deployment-abc123-2',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '5d',
    image: 'harbor.kiwi.com/web-api:v1.2.3',
    node: 'k8s-worker-02',
    ip: '10.244.2.20',
    labels: { app: 'web-api', version: 'v1.2.3' },
  },
  {
    name: 'web-api-deployment-abc123-3',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 1,
    age: '5d',
    image: 'harbor.kiwi.com/web-api:v1.2.3',
    node: 'k8s-worker-01',
    ip: '10.244.1.16',
    labels: { app: 'web-api', version: 'v1.2.3' },
  },
  {
    name: 'auth-service-deployment-def456-1',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '3d',
    image: 'harbor.kiwi.com/auth-service:v2.0.1',
    node: 'k8s-worker-01',
    ip: '10.244.1.22',
    labels: { app: 'auth-service', version: 'v2.0.1' },
  },
  {
    name: 'auth-service-deployment-def456-2',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '3d',
    image: 'harbor.kiwi.com/auth-service:v2.0.1',
    node: 'k8s-worker-02',
    ip: '10.244.2.25',
    labels: { app: 'auth-service', version: 'v2.0.1' },
  },
  {
    name: 'notification-worker-job-ghi789-1',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 2,
    age: '7d',
    image: 'harbor.kiwi.com/notification-worker:v1.0.5',
    node: 'k8s-worker-02',
    ip: '10.244.2.30',
    labels: { app: 'notification-worker', version: 'v1.0.5' },
  },
  {
    name: 'frontend-app-deployment-jkl012-1',
    namespace: 'production',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '1h',
    image: 'harbor.kiwi.com/frontend-app:v3.1.0',
    node: 'k8s-worker-01',
    ip: '10.244.1.35',
    labels: { app: 'frontend-app', version: 'v3.1.0' },
  },
  {
    name: 'frontend-app-deployment-jkl012-2',
    namespace: 'production',
    status: 'Pending',
    ready: false,
    restarts: 0,
    age: '5m',
    image: 'harbor.kiwi.com/frontend-app:v3.1.1',
    labels: { app: 'frontend-app', version: 'v3.1.1' },
  },
  {
    name: 'data-analytics-deployment-mno345-1',
    namespace: 'production',
    status: 'Failed',
    ready: false,
    restarts: 5,
    age: '2h',
    image: 'harbor.kiwi.com/data-analytics:v0.9.0',
    node: 'k8s-worker-02',
    ip: '10.244.2.40',
    labels: { app: 'data-analytics', version: 'v0.9.0' },
  },
  // Staging namespace pods
  {
    name: 'web-api-staging-xyz789-1',
    namespace: 'staging',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '2d',
    image: 'harbor.kiwi.com/web-api:v1.2.4-rc1',
    node: 'k8s-worker-01',
    ip: '10.244.1.50',
    labels: { app: 'web-api', version: 'v1.2.4-rc1' },
  },
  // System pods
  {
    name: 'coredns-abcd1234-1',
    namespace: 'kube-system',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '365d',
    image: 'k8s.gcr.io/coredns:1.9.3',
    node: 'k8s-master-01',
    ip: '10.244.0.2',
  },
  {
    name: 'coredns-abcd1234-2',
    namespace: 'kube-system',
    status: 'Running',
    ready: true,
    restarts: 0,
    age: '365d',
    image: 'k8s.gcr.io/coredns:1.9.3',
    node: 'k8s-master-02',
    ip: '10.244.0.3',
  },
];

export const mockKubernetesDeployments: MockKubernetesDeployment[] = [
  {
    name: 'web-api-deployment',
    namespace: 'production',
    replicas: 3,
    availableReplicas: 3,
    readyReplicas: 3,
    updatedReplicas: 3,
    strategy: 'RollingUpdate',
    age: '180d',
    images: ['harbor.kiwi.com/web-api:v1.2.3'],
  },
  {
    name: 'auth-service-deployment',
    namespace: 'production',
    replicas: 2,
    availableReplicas: 2,
    readyReplicas: 2,
    updatedReplicas: 2,
    strategy: 'RollingUpdate',
    age: '150d',
    images: ['harbor.kiwi.com/auth-service:v2.0.1'],
  },
  {
    name: 'frontend-app-deployment',
    namespace: 'production',
    replicas: 2,
    availableReplicas: 1,
    readyReplicas: 1,
    updatedReplicas: 2,
    strategy: 'RollingUpdate',
    age: '120d',
    images: ['harbor.kiwi.com/frontend-app:v3.1.1'],
  },
  {
    name: 'data-analytics-deployment',
    namespace: 'production',
    replicas: 1,
    availableReplicas: 0,
    readyReplicas: 0,
    updatedReplicas: 1,
    strategy: 'Recreate',
    age: '60d',
    images: ['harbor.kiwi.com/data-analytics:v0.9.0'],
  },
];

export const mockKubernetesServices: MockKubernetesService[] = [
  {
    name: 'web-api-service',
    namespace: 'production',
    type: 'ClusterIP',
    clusterIP: '10.96.100.1',
    ports: '8080/TCP',
    age: '180d',
  },
  {
    name: 'auth-service-service',
    namespace: 'production',
    type: 'ClusterIP',
    clusterIP: '10.96.100.2',
    ports: '8081/TCP',
    age: '150d',
  },
  {
    name: 'frontend-app-service',
    namespace: 'production',
    type: 'LoadBalancer',
    clusterIP: '10.96.100.3',
    externalIP: '203.0.113.50',
    ports: '80/TCP,443/TCP',
    age: '120d',
  },
];

export const mockKubernetesIngresses: MockKubernetesIngress[] = [
  {
    name: 'kiwi-ingress',
    namespace: 'production',
    hosts: ['api.kiwi.com', 'auth.kiwi.com', 'app.kiwi.com'],
    paths: ['/api/*', '/auth/*', '/*'],
    tls: true,
    age: '180d',
  },
];

// Sample Pod Logs
export const mockPodLogs = `2026-01-09T08:30:00.123Z [INFO] Server started on port 8080
2026-01-09T08:30:01.456Z [INFO] Connected to database successfully
2026-01-09T08:30:02.789Z [INFO] Health check endpoint ready
2026-01-09T08:35:00.111Z [DEBUG] Processing request: GET /api/v1/users
2026-01-09T08:35:00.234Z [DEBUG] Query executed in 15ms
2026-01-09T08:35:00.345Z [INFO] Request completed: 200 OK
2026-01-09T08:40:00.567Z [WARN] High memory usage detected: 78%
2026-01-09T08:45:00.890Z [DEBUG] Cache hit for key: user:123
2026-01-09T08:50:00.012Z [INFO] Scheduled job executed: cleanup-temp
2026-01-09T08:55:00.345Z [DEBUG] WebSocket connection established
`;

// Node Status for Kubernetes
export const mockNodeStatus = [
  {
    name: 'k8s-master-01',
    status: 'Ready',
    roles: ['control-plane', 'master'],
    age: '365d',
    version: 'v1.28.0',
    internalIP: '192.168.1.100',
    cpu: '4 cores',
    memory: '16Gi',
    pods: '12/110',
  },
  {
    name: 'k8s-master-02',
    status: 'Ready',
    roles: ['control-plane', 'master'],
    age: '365d',
    version: 'v1.28.0',
    internalIP: '192.168.1.101',
    cpu: '4 cores',
    memory: '16Gi',
    pods: '10/110',
  },
  {
    name: 'k8s-worker-01',
    status: 'Ready',
    roles: ['worker'],
    age: '365d',
    version: 'v1.28.0',
    internalIP: '192.168.1.110',
    cpu: '8 cores',
    memory: '32Gi',
    pods: '25/110',
  },
  {
    name: 'k8s-worker-02',
    status: 'Ready',
    roles: ['worker'],
    age: '365d',
    version: 'v1.28.0',
    internalIP: '192.168.1.111',
    cpu: '8 cores',
    memory: '32Gi',
    pods: '22/110',
  },
];
