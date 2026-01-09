# API 구조 개선 마이그레이션 가이드

## 개요

프론트엔드 API 호출 구조의 유지보수성과 가독성을 개선하기 위해 새로운 통합 API 시스템을 도입했습니다.

## 주요 개선사항

### 1. 중복 제거 및 통합

- **이전**: 3개의 다른 API 클라이언트 (`apiClient.ts`, `unified-client.ts`, `services/api.ts`)
- **현재**: 표준화된 `client.ts` 및 `lib/api/index.ts` 사용으로 통합됨

### 2. 타입 안전성 강화

- **이전**: `any` 타입 사용과 일관되지 않은 응답 타입
- **개선**: 완전한 TypeScript 제네릭 지원과 `StandardApiResponse<T>` 통일

### 3. 코드 중복 제거

- **이전**: 1450줄의 반복적인 `kubernetes.ts`
- **개선**: 헬퍼 함수로 90% 코드 감소

### 4. 일관된 에러 처리

- **이전**: 각 함수마다 다른 에러 처리 로직
- **개선**: 중앙화된 에러 처리와 사용자 친화적 메시지

## 현재 표준 구조 (2025-08-09)

```
src/lib/api/
├── client.ts               # 표준 HTTP 클라이언트
├── index.ts               # 통합 API 인덱스
├── types.ts               # 모든 API 타입 정의
├── endpoints/
│   ├── auth.ts            # 인증 API
│   ├── infra.ts           # 인프라 관리 API
│   ├── kubernetes.ts      # 쿠버네티스 API
│   ├── service.ts         # 서비스 관리 API
│   ├── backup.ts          # 백업 API
│   ├── docker.ts          # 도커 API
│   ├── project.ts         # 프로젝트 API
│   └── user.ts            # 사용자 API
└── MIGRATION_GUIDE.md     # 이 문서

src/hooks/
└── useAsyncOperation.ts   # 표준 비동기 작업 훅
```

## 마이그레이션 방법

### 1. 기본 API 호출

**이전 (kubernetes.ts)**:

```typescript
// 103줄의 반복적인 코드
export const getNodeStatus = async (data: {
  id: number;
  infra_id: number;
  type: string;
  hops: Array<{...}>;
}) => {
  try {
    const response = await api.kubernetes.request<KubernetesNodeResponse>(
      'getNodeStatus',
      {
        server_id: data.id,
        infra_id: data.infra_id,
        type: data.type,
        hops: data.hops
      }
    );

    const nodeData = validateApiResponse(response, '노드 상태 확인');

    // 응답 구조 그대로 반환
    return {
      status: {
        installed: nodeData.status?.installed || false,
        running: nodeData.status?.running || false
      },
      lastChecked: nodeData.lastChecked || '',
      isMaster: nodeData.status?.isMaster,
      isWorker: nodeData.status?.isWorker
    };
  } catch (error) {
    logger.error('노드 상태 확인 실패:', error as Error);
    throw error;
  }
};
```

**현재 표준 방식 (endpoints/kubernetes.ts)**:

```typescript
// 표준 패턴을 따르는 간소화된 구현
import client from '../client';

export const getNodeStatus = async (params: {
  id: number;
  hops: string;
}): Promise<KubernetesNodeResponse> => {
  const response = await client.post<KubernetesNodeResponse>(
    '/api/v1/kubernetes/node/status',
    params
  );

  return response.data;
};
```

### 2. React 컴포넌트에서의 사용

**이전 (useInfraManagement.ts)**:

```typescript
const fetchInfraData = useCallback(async () => {
  try {
    setLoading(true);
    const response = await kubernetesApi.getInfras();
    const data = response || [];

    // 복잡한 수동 상태 관리
    const updatedData = await Promise.all(
      data.map(async (infra: InfraItem) => {
        try {
          const statusResponse = await kubernetesApi.getInfraById(infra.id);
          return {
            ...infra,
            status: statusResponse?.status || 'inactive',
          };
        } catch (error) {
          logger.error(
            `Infrastructure ID ${infra.id} status query failed:`,
            error as Error
          );
          return {
            ...infra,
            status: 'inactive' as InfraStatus,
          };
        }
      })
    );

    setInfraData(updatedData);
  } catch (error) {
    logger.error('Infrastructure data fetch failed:', error as Error);
    messageApi.error('인프라 데이터를 불러오는데 실패했습니다.');
    setInfraData([]);
  } finally {
    setLoading(false);
  }
}, [messageApi]);
```

**현재 표준 방식**:

```typescript
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { infraApi } from '../../lib/api';

// 컴포넌트에서
const {
  data: infraData,
  loading,
  error,
  execute: fetchInfraData,
} = useAsyncOperation(infraApi.getInfras, {
  immediate: true,
});

// 표준화된 에러 처리, 로딩 상태, 재시도 기능 포함
```

### 3. 복잡한 서버 작업

**이전**:

```typescript
// 각 작업마다 50-100줄의 반복 코드
export const installFirstMaster = async (data: {...}) => {
  try {
    const response = await api.kubernetes.request<CommandResult>(
      'installFirstMaster',
      {...}
    );

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || '응답 데이터가 없습니다');
    }

    const result = response.data.data;

    if (!result) {
      throw new Error('명령 결과 데이터가 없습니다');
    }

    return {
      success: result.success || false,
      message: result.message,
      error: result.error,
      commandResults: result.commandResults || []
    };
  } catch (error) {
    logger.error('첫 번째 마스터 설치 실패:', error as Error);
    throw error;
  }
};
```

**현재 표준 방식**:

```typescript
// endpoints/kubernetes.ts에서 간단한 API 호출
export const installFirstMaster = async (params: {
  id: number;
  infra_id: number;
  hops: string;
}): Promise<CommandResult> => {
  const response = await client.post<CommandResult>(
    '/api/v1/kubernetes/install-first-master',
    params
  );

  return response.data;
};
```

### 4. React 훅에서의 사용

**현재 표준 훅 사용법**:

```typescript
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { kubernetesApi } from '../../lib/api';

// 컴포넌트에서
const {
  loading,
  error,
  execute: install,
} = useAsyncOperation(params => kubernetesApi.installFirstMaster(params));

const handleInstall = () => {
  install({
    id: serverId,
    infra_id: infraId,
    hops: connectionHops,
  });
};
```

## 점진적 마이그레이션 전략

### 현재 상태: 표준화 완료 (2025-08-09)

```typescript
// 현재 권장되는 표준 패턴
import { kubernetesApi, infraApi } from '../lib/api';
import { useAsyncOperation } from '../hooks/useAsyncOperation';

// 모든 새로운 컴포넌트는 이 패턴 사용
const { data, loading, execute } = useAsyncOperation(apiFunction);
```

### 레거시 파일들의 현재 상태

- **enhanced-api-client.ts**: 현재 일부 컴포넌트에서 사용 중, 점진적 교체 대상
- **unified-client.ts**: 현재 일부 컴포넌트에서 사용 중, 점진적 교체 대상
- **kubernetes-improved.ts**: 표준 API로 교체 완료됨

### 향후 계획

- 레거시 파일들을 표준 API로 점진적 교체
- 완료 후 레거시 파일들 제거

## 새로운 패턴 사용 예제

### 1. 간단한 목록 조회 (현재 표준 패턴)

```typescript
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { infraApi } from '../lib/api';

function ServerList({ infraId }: { infraId: number }) {
  const {
    data: servers,
    loading,
    error,
    execute
  } = useAsyncOperation(
    () => infraApi.getServers(infraId),
    { immediate: true }
  );

  if (loading) return <Spin />;
  if (error) return <Alert message="서버 목록 로드 실패" type="error" />;

  return (
    <List
      dataSource={servers}
      renderItem={(server) => <ServerItem server={server} />}
    />
  );
}
```

### 2. 복잡한 서버 명령 실행 (현재 표준 패턴)

```typescript
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { kubernetesApi } from '../lib/api';

function MasterInstaller({ serverId, infraId, hops }: Props) {
  const {
    loading,
    error,
    execute
  } = useAsyncOperation(
    (params) => kubernetesApi.installFirstMaster(params)
  );

  const handleInstall = () => {
    execute({
      id: serverId,
      infra_id: infraId,
      hops: hops
    });
  };

  return (
    <Button
      onClick={handleInstall}
      loading={loading}
      type="primary"
    >
      마스터 설치
    </Button>
  );
}
```

### 3. 병렬 API 호출 (현재 표준 패턴)

```typescript
import { useState, useEffect } from 'react';
import { infraApi, kubernetesApi } from '../lib/api';

function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ servers: any[]; infras: any[] }>();

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [servers, infras] = await Promise.all([
        infraApi.getServers(1),
        infraApi.getInfras(),
      ]);

      setData({ servers, infras });
    } catch (error) {
      logger.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ...
}
```

## 이점

### 개발자 경험

- 90% 적은 보일러플레이트 코드
- 완전한 TypeScript 지원
- 일관된 API 패턴
- 자동 에러 처리

### 유지보수성

- 중앙화된 에러 처리
- 표준화된 로깅
- 쉬운 테스트 작성
- 명확한 책임 분리

### 성능

- 자동 재시도 로직
- 병렬 처리 지원
- 메모리 누수 방지
- 요청 취소 지원

## 현재 상태 체크리스트 (2025-08-09 기준)

- [x] 표준 API 구조 확립 (client.ts + endpoints/)
- [x] 통합 API 인덱스 (lib/api/index.ts)
- [x] 표준 비동기 훅 (useAsyncOperation.ts)
- [x] TypeScript 타입 시스템 안정화
- [x] 주요 컴포넌트의 API 표준화 적용
- [x] 에러 처리 통합 (구조화된 로깅)
- [x] 테스트 환경 안정화
- [ ] 잔여 레거시 파일 점진적 교체

## 다음 단계

### 레거시 시스템 완전 교체

1. `enhanced-api-client.ts` 사용 컴포넌트 → 표준 API로 교체
2. `unified-client.ts` 사용 컴포넌트 → 표준 API로 교체
3. 레거시 파일 제거

## 지원 및 참조

표준 API 사용 시 참조할 리소스:

1. `lib/api/client.ts` - HTTP 클라이언트 설정
2. `lib/api/types.ts` - 표준 타입 정의
3. `hooks/useAsyncOperation.ts` - 비동기 작업 훅
4. `lib/api/endpoints/*` - 도메인별 API 정의
