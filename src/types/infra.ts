// 인프라 상태 타입
export type InfraStatus = 'uninstalled' | 'active' | 'inactive' | 'unknown';

// 인프라 데이터 타입 정의
export interface InfraItem {
  id: number;
  name: string;
  type:
    | 'kubernetes'
    // | 'cloud'
    // | 'baremetal'
    | 'docker'
    | 'podman'
    | 'external_kubernetes'
    | 'external_docker'
    | 'external_podman';
  info: string;
  created_at: string;
  updated_at: string;
  status?: InfraStatus; // DB에는 없고 런타임에 결정되는 필드
  user_role?: 'admin' | 'member'; // 이 필드가 있어야 합니다.
  nodes?: Server[]; // 인프라에 속한 서버/노드 목록
}

// Infrastructure 타입은 InfraItem을 확장
export type Infrastructure = InfraItem;

// 인프라 노드 데이터 타입 정의 (인프라 세부 설정에서 사용)
export interface InfraNodeItem {
  id: number;
  infra_id: number; // 상위 인프라 ID (외래 키)
  name: string;
  role: string;
  status: 'active' | 'inactive';
  ip_address: string;
  os?: string;
  created_at: string;
  updated_at: string;
}

// Hop 인터페이스 정의
export interface Hop {
  ip?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

// SSH Hop 인터페이스 (서버 hops용)
export interface SshHop {
  host: string;
  port: number;
  username: string;
  password?: string; // 보안상 API 응답에서는 빈 문자열로 옴
}

// 서버 데이터 타입 정의
export interface Server {
  id: string | number;
  server_name: string;
  device_id?: number;
  device_name?: string;
  hops: string | Array<Hop>;
  type: string;
  infra_id: number;
  ha: string;
  created_at: string;
  updated_at: string;
  join_command?: string;
  certificate_key?: string;
  node_type?: string;
  nodeType?: string;
  status?: string;
  last_checked?: string;
  last_checked_status?: InfraStatus;
  ip?: string;
  port?: number;
}

// 쿠버네티스 관련 추가 정보
export interface KubernetesConfig {
  id: number;
  infraId: number; // 상위 인프라 ID (외래 키)
  version: string;
  networkPlugin?: string;
  storageClass?: string;
  ingressController?: string;
}

// 온프레미스 관련 추가 정보
export interface OnPremiseConfig {
  id: number;
  infraId: number; // 상위 인프라 ID (외래 키)
  dataCenter?: string;
  rackLocation?: string;
  powerConsumption?: number;
}

// 클라우드 관련 추가 정보
export interface CloudConfig {
  id: number;
  infraId: number; // 상위 인프라 ID (외래 키)
  provider: 'aws' | 'gcp' | 'azure' | 'other';
  region?: string;
  accountId?: string;
  billingType?: 'ondemand' | 'reserved' | 'spot';
}

// 추가 타입 정의들 (컴포넌트 분리에 필요한 타입들)

// Node 타입 확장 (Server에 추가 속성 포함)
export interface Node extends Omit<Server, 'id'> {
  id: string | number; // id를 더 유연하게 처리
  nodeType?: NodeType; // 노드 타입 추가
}

// NodeType 정의
export type NodeType = 'ha' | 'master' | 'worker';

// AuthHops 타입 별칭 (Hop과 동일)
export type AuthHops = Hop[];

// 서버 리소스 정보
export interface ServerResource {
  cpu: {
    cores: number;
    usage: string;
    loadAverage?: number[];
  };
  memory: {
    total: string;
    used: string;
    available: string;
    usagePercent: number;
  };
  disk: {
    total: string;
    used: string;
    available: string;
    usagePercent: number;
  };
  network?: {
    interfaces: Array<{
      name: string;
      ip: string;
      status: 'up' | 'down';
    }>;
  };
  system?: {
    hostname: string;
    uptime: string;
    os: string;
    kernel: string;
  };
}

// 외부 노드 정보
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

export type InfraWithNodes = Omit<InfraItem, 'nodes'> & { nodes?: Server[] };
