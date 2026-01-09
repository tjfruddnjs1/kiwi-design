import { apiClient } from './client';

export interface SubProject {
  path: string;
  type: string;
  has_dockerfile: boolean;
  files: string[];
  build_context?: string;
  framework?: string;
  package_manager?: string;
}

export interface DetectProjectTypeResponse {
  detected_type: string;
  framework: string; //  [신규] 감지된 프레임워크 (nextjs, fastapi 등)
  package_manager: string; //  [신규] 감지된 패키지 매니저 (npm, yarn, poetry 등)
  build_type: string; //  [신규] 빌드 타입 (spa, ssr, api, compiled)
  has_typescript: boolean; //  [신규] TypeScript 사용 여부
  has_docker_compose: boolean;
  has_dockerfile: boolean;
  files: string[];
  sub_projects?: SubProject[];
}

//  [신규] 프레임워크 정보
export interface FrameworkInfo {
  name: string;
  display_name: string;
  build_type: string;
  default_port: number;
  description: string;
}

//  [신규] 빌드 타입 정보
export type BuildType = 'spa' | 'ssr' | 'api' | 'compiled' | 'static';

export const BUILD_TYPE_INFO: Record<
  BuildType,
  { label: string; description: string }
> = {
  spa: {
    label: 'SPA (정적 사이트)',
    description: '빌드 후 Nginx로 정적 파일 서빙',
  },
  ssr: {
    label: 'SSR (서버 사이드 렌더링)',
    description: 'Node.js 런타임에서 서버 실행',
  },
  api: { label: 'API 서버', description: '백엔드 API 서버' },
  compiled: { label: '컴파일 언어', description: '빌드 후 바이너리 실행' },
  static: {
    label: '정적 사이트',
    description: 'HTML/CSS/JS 파일을 Nginx로 서빙',
  },
};

//  [신규] 프레임워크별 정보
export const FRAMEWORK_INFO: Record<string, FrameworkInfo> = {
  // Node.js
  nextjs: {
    name: 'nextjs',
    display_name: 'Next.js',
    build_type: 'ssr',
    default_port: 3000,
    description: 'React 풀스택 프레임워크',
  },
  react: {
    name: 'react',
    display_name: 'React',
    build_type: 'spa',
    default_port: 80,
    description: 'React SPA 애플리케이션',
  },
  vue: {
    name: 'vue',
    display_name: 'Vue.js',
    build_type: 'spa',
    default_port: 80,
    description: 'Vue.js SPA 애플리케이션',
  },
  angular: {
    name: 'angular',
    display_name: 'Angular',
    build_type: 'spa',
    default_port: 80,
    description: 'Angular SPA 애플리케이션',
  },
  nestjs: {
    name: 'nestjs',
    display_name: 'NestJS',
    build_type: 'api',
    default_port: 3000,
    description: 'Node.js 백엔드 프레임워크',
  },
  express: {
    name: 'express',
    display_name: 'Express.js',
    build_type: 'api',
    default_port: 3000,
    description: 'Node.js 웹 프레임워크',
  },
  // Python
  fastapi: {
    name: 'fastapi',
    display_name: 'FastAPI',
    build_type: 'api',
    default_port: 8000,
    description: '고성능 Python API 프레임워크',
  },
  django: {
    name: 'django',
    display_name: 'Django',
    build_type: 'api',
    default_port: 8000,
    description: 'Python 풀스택 프레임워크',
  },
  flask: {
    name: 'flask',
    display_name: 'Flask',
    build_type: 'api',
    default_port: 5000,
    description: 'Python 마이크로 프레임워크',
  },
  streamlit: {
    name: 'streamlit',
    display_name: 'Streamlit',
    build_type: 'ssr',
    default_port: 8501,
    description: '데이터 앱 프레임워크',
  },
  // Java
  'spring-boot': {
    name: 'spring-boot',
    display_name: 'Spring Boot',
    build_type: 'api',
    default_port: 8080,
    description: 'Java 엔터프라이즈 프레임워크',
  },
  quarkus: {
    name: 'quarkus',
    display_name: 'Quarkus',
    build_type: 'api',
    default_port: 8080,
    description: '클라우드 네이티브 Java 프레임워크',
  },
  // 추가 언어/타입
  rust: {
    name: 'rust',
    display_name: 'Rust',
    build_type: 'compiled',
    default_port: 8080,
    description: '시스템 프로그래밍 언어',
  },
  dotnet: {
    name: 'dotnet',
    display_name: '.NET / C#',
    build_type: 'compiled',
    default_port: 8080,
    description: '.NET 프레임워크',
  },
  static: {
    name: 'static',
    display_name: '정적 사이트',
    build_type: 'static',
    default_port: 80,
    description: 'HTML/CSS/JS 정적 파일',
  },
};

//  [신규] 언어별 버전/OS 설정
export interface LanguageConfig {
  default_version: string;
  versions: string[];
  default_os: string;
  os_options: string[];
}

export type LanguageConfigs = Record<string, LanguageConfig>;

export interface ServiceConfig {
  path: string;
  name: string;
  type: string;
  port?: number;
  version?: string; // 언어 버전
  base_os?: string; // 베이스 OS
  framework?: string; //  [신규] 프레임워크
  package_manager?: string; //  [신규] 패키지 매니저
  build_type?: string; //  [신규] 빌드 타입
  enable_healthcheck?: boolean; //  [신규] 헬스체크 활성화
  non_root_user?: boolean; //  [신규] 비루트 사용자 사용
}

export interface GeneratedFile {
  path: string;
  name: string;
  type: string;
  port: number;
  dockerfile: string;
  version?: string; //  [신규] 언어 버전
  base_os?: string; //  [신규] 베이스 OS
}

export interface GenerateBuildFilesResponse {
  dockerfile?: string;
  docker_compose: string;
  project_type?: string;
  service_name?: string;
  port?: number;
  version?: string; //  [신규] 언어 버전
  base_os?: string; //  [신규] 베이스 OS
  files?: GeneratedFile[];
}

export interface CommitBuildFilesResponse {
  commit_id: string;
  commit_message: string;
  files_created: number;
}

export interface CheckBuildFilesResponse {
  has_dockerfile: boolean;
  has_docker_compose: boolean;
}

export const buildWizardApi = {
  /**
   * 프로젝트 타입 감지
   */
  detectProjectType: async (params: { git_url: string; branch?: string }) => {
    return apiClient.post('/build-wizard', {
      action: 'detectProjectType',
      parameters: params,
    });
  },

  /**
   * 빌드 파일 템플릿 생성
   */
  generateBuildFiles: async (params: {
    project_type?: string;
    service_name?: string;
    port?: number;
    version?: string;
    base_os?: string;
    framework?: string; //  [신규] 프레임워크
    package_manager?: string; //  [신규] 패키지 매니저
    build_type?: string; //  [신규] 빌드 타입
    enable_healthcheck?: boolean; //  [신규] 헬스체크 활성화
    non_root_user?: boolean; //  [신규] 비루트 사용자 사용
    services?: ServiceConfig[];
  }) => {
    return apiClient.post('/build-wizard', {
      action: 'generateBuildFiles',
      parameters: params,
    });
  },

  /**
   *  [신규] 언어별 버전/OS 설정 조회
   */
  getLanguageConfigs: async () => {
    return apiClient.post('/build-wizard', {
      action: 'getLanguageConfigs',
      parameters: {},
    });
  },

  /**
   * GitLab에 빌드 파일 커밋
   */
  commitBuildFiles: async (params: {
    git_url: string;
    branch?: string;
    dockerfile?: string;
    docker_compose?: string;
    files?: GeneratedFile[];
  }) => {
    return apiClient.post('/build-wizard', {
      action: 'commitBuildFiles',
      parameters: params,
    });
  },

  /**
   * 빌드 파일 존재 확인
   */
  checkBuildFiles: async (params: { git_url: string; branch?: string }) => {
    return apiClient.post('/build-wizard', {
      action: 'checkBuildFiles',
      parameters: params,
    });
  },
};
