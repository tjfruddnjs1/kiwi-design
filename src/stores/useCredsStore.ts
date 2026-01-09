import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 타입 정의
export type ImageRegistryItem = {
  registryUrl: string; // key
  userId: string;
  password: string;
};

// SourceRepositoryItem에 모든 보안 분석 상태 포함
export type SourceRepositoryItem = {
  baseUrl: string; // key (part 1)
  serviceId?: number; // key (part 2) - 서비스별 독립 상태 관리
  token: string;
  userId?: string; // 사용자명 또는 이메일 (옵션)
  config?: string; // SAST 규칙/프로필 (옵션)
  // 보안 분석 상태 (소스, SAST, SCA, 빌드, 배포, 운영, DAST)
  sourceState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  sastState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  scaState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  buildState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  deployState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  operationState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  dastState?: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  // 마지막 업데이트 시간
  sourceLastUpdate?: string;
  sastLastUpdate?: string;
  scaLastUpdate?: string;
  buildLastUpdate?: string;
  deployLastUpdate?: string;
  operationLastUpdate?: string;
  dastLastUpdate?: string;
};

export type ServerItem = {
  host: string;
  port?: number;
  userId: string;
  password: string;
  infraId?: number; // 인프라 ID - 인프라별로 SSH credential 구분
  serviceId?: number; // 서비스 ID (옵션)
  hopOrder?: number; // SSH hop 순서 (multi-hop SSH의 경우)
};

type CredsState = {
  imageRegistry: ImageRegistryItem[];
  sourceRepository: SourceRepositoryItem[];
  serverlist: ServerItem[];

  upsertImageRegistry: (item: ImageRegistryItem) => void; // key: registryUrl
  removeImageRegistry: (registryUrl: string) => void;

  upsertSourceRepository: (item: SourceRepositoryItem) => void; // key: baseUrl
  removeSourceRepository: (baseUrl: string) => void;

  // 파이프라인 단계별 상태 관리
  updateSecurityState: (
    baseUrl: string,
    type:
      | 'source'
      | 'sast'
      | 'sca'
      | 'build'
      | 'deploy'
      | 'operation'
      | 'dast'
      | 'sbom',
    state: 'null' | 'idle' | 'analyzing' | 'completed' | 'failed',
    serviceId?: number //  서비스별 독립 상태 관리
  ) => void;
  updateSecurityLastUpdate: (
    baseUrl: string,
    type:
      | 'source'
      | 'sast'
      | 'sca'
      | 'build'
      | 'deploy'
      | 'operation'
      | 'dast'
      | 'sbom',
    timestamp: string,
    serviceId?: number //  서비스별 독립 상태 관리
  ) => void;
  getSecurityState: (
    baseUrl: string,
    type:
      | 'source'
      | 'sast'
      | 'sca'
      | 'build'
      | 'deploy'
      | 'operation'
      | 'dast'
      | 'sbom',
    serviceId?: number //  서비스별 독립 상태 관리
  ) => 'null' | 'idle' | 'analyzing' | 'completed' | 'failed';
  getSecurityLastUpdate: (
    baseUrl: string,
    type:
      | 'source'
      | 'sast'
      | 'sca'
      | 'build'
      | 'deploy'
      | 'operation'
      | 'dast'
      | 'sbom',
    serviceId?: number //  서비스별 독립 상태 관리
  ) => string | null;

  addServer: (item: ServerItem) => void;
  updateServer: (index: number, updates: Partial<ServerItem>) => void;
  removeServer: (index: number) => void;
  upsertServerByHostPort: (item: ServerItem) => void;
  clearAll: () => void;
};

export const useCredsStore = create<CredsState>()(
  persist(
    (set, get) => ({
      imageRegistry: [] as ImageRegistryItem[],
      sourceRepository: [] as SourceRepositoryItem[],
      serverlist: [] as ServerItem[],

      upsertImageRegistry: item => {
        const list = get().imageRegistry;
        const i = list.findIndex(x => x.registryUrl === item.registryUrl);
        if (i >= 0) {
          const next = list.slice();
          next[i] = item;
          set({ imageRegistry: next });
        } else {
          set({ imageRegistry: [item, ...list] });
        }
      },
      removeImageRegistry: registryUrl => {
        set({
          imageRegistry: get().imageRegistry.filter(
            x => x.registryUrl !== registryUrl
          ),
        });
      },

      upsertSourceRepository: item => {
        const list = get().sourceRepository;
        const i = list.findIndex(x => x.baseUrl === item.baseUrl);
        if (i >= 0) {
          const next = list.slice();
          next[i] = { ...next[i], ...item };
          set({ sourceRepository: next });
        } else {
          set({ sourceRepository: [item, ...list] });
        }
      },
      removeSourceRepository: baseUrl => {
        set({
          sourceRepository: get().sourceRepository.filter(
            x => x.baseUrl !== baseUrl
          ),
        });
      },

      // 파이프라인 단계별 상태 관리 액션들
      updateSecurityState: (baseUrl, type, state, serviceId) => {
        const list = get().sourceRepository;
        //  [수정] baseUrl + serviceId 조합으로 정확한 매칭 (서비스별 독립 상태)
        const index = list.findIndex(
          x =>
            x.baseUrl === baseUrl &&
            (serviceId !== undefined
              ? x.serviceId === serviceId
              : x.serviceId === undefined)
        );

        if (index >= 0) {
          // 정확한 매칭이 있으면 업데이트
          const updated = [...list];
          const item = updated[index];
          const stateKey = `${type}State` as keyof SourceRepositoryItem;
          updated[index] = { ...item, [stateKey]: state };
          set({ sourceRepository: updated });
        } else {
          //  [신규] 정확한 매칭이 없으면 새 항목 생성 (서비스별 독립 상태)
          const stateKey = `${type}State` as keyof SourceRepositoryItem;

          //  레거시 항목이 있으면 모든 상태 복사 (자동 마이그레이션)
          const legacyItem =
            serviceId !== undefined
              ? list.find(
                  x => x.baseUrl === baseUrl && x.serviceId === undefined
                )
              : undefined;

          const newItem: SourceRepositoryItem = legacyItem
            ? {
                ...legacyItem, // 레거시 항목의 모든 필드 복사
                serviceId, // serviceId 추가
                [stateKey]: state, // 요청된 상태 업데이트
              }
            : ({
                baseUrl,
                serviceId,
                token: '',
                userId: '',
                [stateKey]: state,
              } as SourceRepositoryItem);

          set({ sourceRepository: [...list, newItem] });

          if (legacyItem) {
          }
        }
      },

      updateSecurityLastUpdate: (baseUrl, type, timestamp, serviceId) => {
        const list = get().sourceRepository;
        //  [수정] baseUrl + serviceId 조합으로 정확한 매칭 (서비스별 독립 상태)
        const index = list.findIndex(
          x =>
            x.baseUrl === baseUrl &&
            (serviceId !== undefined
              ? x.serviceId === serviceId
              : x.serviceId === undefined)
        );

        if (index >= 0) {
          // 정확한 매칭이 있으면 업데이트
          const updated = [...list];
          const item = updated[index];
          const updateKey = `${type}LastUpdate` as keyof SourceRepositoryItem;
          updated[index] = { ...item, [updateKey]: timestamp };
          set({ sourceRepository: updated });
        } else {
          //  [신규] 정확한 매칭이 없으면 새 항목 생성 (서비스별 독립 타임스탬프)
          const updateKey = `${type}LastUpdate` as keyof SourceRepositoryItem;

          //  레거시 항목이 있으면 모든 필드 복사 (자동 마이그레이션)
          const legacyItem =
            serviceId !== undefined
              ? list.find(
                  x => x.baseUrl === baseUrl && x.serviceId === undefined
                )
              : undefined;

          const newItem: SourceRepositoryItem = legacyItem
            ? {
                ...legacyItem, // 레거시 항목의 모든 필드 복사
                serviceId, // serviceId 추가
                [updateKey]: timestamp, // 요청된 타임스탬프 업데이트
              }
            : ({
                baseUrl,
                serviceId,
                token: '',
                userId: '',
                [updateKey]: timestamp,
              } as SourceRepositoryItem);

          set({ sourceRepository: [...list, newItem] });

          if (legacyItem) {
          }
        }
      },

      getSecurityState: (baseUrl, type, serviceId) => {
        //  [수정] baseUrl + serviceId 조합으로 정확한 매칭 (서비스별 독립 상태)

        let item = get().sourceRepository.find(
          x =>
            x.baseUrl === baseUrl &&
            (serviceId !== undefined
              ? x.serviceId === serviceId
              : x.serviceId === undefined)
        );

        //  Fallback: serviceId로 매칭 실패 시 기존 데이터 찾아서 자동 마이그레이션
        if (!item && serviceId !== undefined) {
          const legacyItem = get().sourceRepository.find(
            x => x.baseUrl === baseUrl && x.serviceId === undefined
          );

          if (legacyItem) {
            // 기존 데이터를 새 serviceId로 복사 (자동 마이그레이션)
            const migratedItem = { ...legacyItem, serviceId };
            const list = get().sourceRepository;
            set({ sourceRepository: [...list, migratedItem] });
            item = migratedItem;
          }
        }

        if (!item) {
          return 'null';
        }
        const stateKey = `${type}State` as keyof SourceRepositoryItem;
        const returnValue = (item[stateKey] as any) || 'null';
        return returnValue;
      },

      getSecurityLastUpdate: (baseUrl, type, serviceId) => {
        //  [수정] baseUrl + serviceId 조합으로 정확한 매칭 (서비스별 독립 상태)
        let item = get().sourceRepository.find(
          x =>
            x.baseUrl === baseUrl &&
            (serviceId !== undefined
              ? x.serviceId === serviceId
              : x.serviceId === undefined)
        );

        //  Fallback: serviceId로 매칭 실패 시 기존 데이터 사용 (읽기 전용)
        if (!item && serviceId !== undefined) {
          item = get().sourceRepository.find(
            x => x.baseUrl === baseUrl && x.serviceId === undefined
          );
        }

        if (!item) return null;
        const updateKey = `${type}LastUpdate` as keyof SourceRepositoryItem;
        return (item[updateKey] as string | undefined) || null;
      },

      addServer: item => set({ serverlist: [item, ...get().serverlist] }),
      upsertServerByHostPort: item => {
        const normHost = (h: string) => h?.trim()?.toLowerCase() || '';
        const normPort = (p?: number) => p ?? 22;
        const list = get().serverlist;

        //  [개선] infraId + serviceId + hopOrder 기반 정확한 매칭
        // 1순위: infraId + serviceId + hopOrder가 모두 매칭되는 항목 (가장 정확한 매칭)
        let idx = list.findIndex(s => {
          const hostMatch = normHost(s.host) === normHost(item.host);
          const portMatch = normPort(s.port) === normPort(item.port);
          const userMatch = s.userId === item.userId;

          if (!hostMatch || !portMatch || !userMatch) return false;

          // infraId + serviceId + hopOrder가 모두 있으면 정확히 매칭
          if (
            item.infraId !== undefined &&
            item.serviceId !== undefined &&
            item.hopOrder !== undefined
          ) {
            return (
              s.infraId === item.infraId &&
              s.serviceId === item.serviceId &&
              s.hopOrder === item.hopOrder
            );
          }

          // infraId + serviceId가 있으면 매칭
          if (item.infraId !== undefined && item.serviceId !== undefined) {
            return s.infraId === item.infraId && s.serviceId === item.serviceId;
          }

          // infraId만 있으면 매칭
          if (item.infraId !== undefined) {
            return s.infraId === item.infraId;
          }

          // infraId가 없으면 host:port:userId만 매칭 (legacy)
          return s.infraId === undefined;
        });

        // 2순위: infraId 무시하고 host:port:userId만 매칭 (없으면 신규 생성)
        if (idx < 0 && item.infraId !== undefined) {
          // 정확한 매칭이 없으면 새로 추가
          idx = -1;
        }

        if (idx >= 0) {
          const next = list.slice();
          next[idx] = {
            ...next[idx],
            userId: item.userId,
            password: item.password,
            infraId: item.infraId,
            serviceId: item.serviceId,
            hopOrder: item.hopOrder, // SSH hop 순서 유지
          };
          set({ serverlist: next });
        } else {
          set({ serverlist: [item, ...list] });
        }
      },
      updateServer: (index, updates) => {
        const arr = get().serverlist.slice();
        if (index >= 0 && index < arr.length) {
          arr[index] = { ...arr[index], ...updates };
          set({ serverlist: arr });
        }
      },
      removeServer: index => {
        const arr = get().serverlist.slice();
        if (index >= 0 && index < arr.length) {
          arr.splice(index, 1);
          set({ serverlist: arr });
        }
      },
      clearAll: () =>
        set({ imageRegistry: [], sourceRepository: [], serverlist: [] }),
    }),
    {
      name: 'creds-store',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        imageRegistry: s.imageRegistry,
        sourceRepository: s.sourceRepository,
        serverlist: s.serverlist,
      }),
    }
  )
);
