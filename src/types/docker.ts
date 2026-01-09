// Docker 관련 타입 정의

export interface DockerServer {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'uninstalled';
  hops: string; // JSON 문자열
  lastChecked?: string;
  containerCount?: number;
  imageCount?: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  //  status와 ports를 실제 데이터 타입인 string으로 변경
  status: string;
  state: string;
  ports?: string;
  //  실제 데이터에 있는 created와 size 필드 추가
  created: string;
  size?: string;
}

export interface DockerDetails {
  compose_project: string | null;
  //  구체적인 타입으로 모두 교체
  containers: DockerContainer[] | null;
  images: DockerImage[] | null;
  networks: DockerNetwork[] | null;
  volumes: DockerVolume[] | null;
  container_count: number;
  image_count: number;
  //  실제 응답에 없으므로 선택적 프로퍼티로 변경하거나 제거
  version?: string;
}

export interface DockerImage {
  repository: string;
  tag: string;
  created: string;
  size: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

export interface DockerVolume {
  // 예: name: string; driver: string;
  [key: string]: any; // 우선 이렇게 두거나, 빈 인터페이스 {} 로 둘 수 있습니다.
}

export interface AuthHop {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface DockerInstallParams {
  infraId: number;
  serverId: number;
  authHops: AuthHop[];
}

export interface DockerStatusResponse {
  success: boolean;
  data?: {
    status: 'active' | 'inactive' | 'uninstalled';
    containers?: DockerContainer[];
    images?: DockerImage[];
    version?: string;
  };
  error?: string;
}

export interface ServerRegistrationData {
  name: string;
  hops: Array<{
    host: string;
    port: number;
  }>;
}

// Auth modal 관련 타입
export interface AuthModalData {
  visible: boolean;
  serverId: number | null;
  action:
    | 'checkStatus'
    | 'installDocker'
    | 'uninstallDocker'
    | 'getContainersAndInfo'
    | null;
  targetServer: {
    name: string;
    hops: { host: string; port: number }[];
  } | null;
}

// Docker Registry 설정 타입
export interface DockerRegistryConfig {
  registry?: string;
  username?: string;
  password?: string;
  email?: string;
}
