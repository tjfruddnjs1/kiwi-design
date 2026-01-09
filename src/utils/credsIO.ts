import {
  useCredsStore,
  type ImageRegistryItem,
  type SourceRepositoryItem,
  type ServerItem,
} from '../stores/useCredsStore';
import { z } from 'zod';

export type CredsSnapshot = {
  imageRegistry: ImageRegistryItem[];
  sourceRepository: SourceRepositoryItem[];
  serverlist: ServerItem[];
};

export function exportCreds(): Blob {
  const { imageRegistry, sourceRepository, serverlist } =
    useCredsStore.getState();
  const snapshot: CredsSnapshot = {
    imageRegistry,
    sourceRepository,
    serverlist,
  };
  const json = JSON.stringify(snapshot, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function exportCredsWithPicker(): Promise<void> {
  const blob = exportCreds();
  const fileName = `creds-${new Date().toISOString().slice(0, 10)}.json`;
  type SaveFilePickerOptions = {
    suggestedName?: string;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  };
  type FileSystemWritableFileStream = {
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  };
  type FileSystemFileHandle = {
    createWritable: () => Promise<FileSystemWritableFileStream>;
  };
  const w = window as unknown as {
    showSaveFilePicker?: (
      options: SaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
  };
  if (w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          { description: 'JSON', accept: { 'application/json': ['.json'] } },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      // 사용자가 저장 대화상자를 '취소'한 경우에는 아무 것도 하지 않음
      const err = e as unknown as { name?: string };
      if (err && err.name === 'AbortError') return;
      // 기타 실패(권한 문제 등)인 경우에만 폴백 다운로드 수행
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importCreds(
  file: File,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const text = await file.text();

    const ImageRegistrySchema = z
      .object({
        registryUrl: z.string().optional().default(''), // 빈 문자열 허용
        userId: z.string().trim().min(1),
        password: z.string().trim().min(1),
      })
      .strict();
    const SourceRepositorySchema = z
      .object({
        baseUrl: z.string().url(),
        token: z.string().trim().min(1),
        userId: z.string().optional(),
        config: z.string().optional(),
      })
      .strict();
    const ServerSchema = z
      .object({
        host: z.string().trim().min(1),
        port: z.number().int().positive().optional(),
        userId: z.string().trim().min(1),
        password: z.string().trim().min(1),
      })
      .strict();
    const SnapshotSchema = z
      .object({
        imageRegistry: z.array(ImageRegistrySchema),
        sourceRepository: z.array(SourceRepositorySchema),
        serverlist: z.array(ServerSchema).optional().default([]),
      })
      .strict();

    const data = SnapshotSchema.parse(JSON.parse(text)) as CredsSnapshot;

    const store = useCredsStore.getState();

    if (mode === 'replace') {
      // 완전 교체: 각 카테고리별로 기존 정보를 지우고 새로운 정보로 교체

      // ImageRegistry 교체

      // 기존 imageRegistry 정보 삭제
      store.imageRegistry.forEach((r: ImageRegistryItem) => {
        store.removeImageRegistry(r.registryUrl);
      });
      // 새로운 정보 추가 (빈 배열이어도 상관없음)
      data.imageRegistry.forEach((r: ImageRegistryItem) => {
        store.upsertImageRegistry(r);
      });

      // SourceRepository 교체

      // 기존 sourceRepository 정보 삭제
      store.sourceRepository.forEach((s: SourceRepositoryItem) => {
        store.removeSourceRepository(s.baseUrl);
      });
      // 새로운 정보 추가 (빈 배열이어도 상관없음)
      data.sourceRepository.forEach((s: SourceRepositoryItem) => {
        store.upsertSourceRepository(s);
      });

      // Serverlist 교체

      // 기존 serverlist 정보 삭제 (역순으로 삭제하여 인덱스 문제 방지)
      for (let i = store.serverlist.length - 1; i >= 0; i--) {
        store.removeServer(i);
      }
      // 새로운 정보 추가 (빈 배열이어도 상관없음)
      data.serverlist.forEach((srv: ServerItem) => {
        store.upsertServerByHostPort(srv);
      });
    } else {
      // 병합: 기존 정보는 유지하고 새로운 정보만 추가/업데이트

      // ImageRegistry 병합: userId가 키
      data.imageRegistry.forEach((r: ImageRegistryItem) => {
        // 기존에 같은 userId가 있으면 제거 후 추가
        const existingIndex = store.imageRegistry.findIndex(
          item => item.userId === r.userId
        );
        if (existingIndex >= 0) {
          store.removeImageRegistry(
            store.imageRegistry[existingIndex].registryUrl
          );
        }
        store.upsertImageRegistry(r);
      });

      // SourceRepository 병합: baseUrl이 키
      data.sourceRepository.forEach((s: SourceRepositoryItem) => {
        // 기존에 같은 baseUrl이 있으면 제거 후 추가
        const existingIndex = store.sourceRepository.findIndex(
          item => item.baseUrl === s.baseUrl
        );
        if (existingIndex >= 0) {
          store.removeSourceRepository(s.baseUrl);
        }
        store.upsertSourceRepository(s);
      });

      // Serverlist 병합: host:port 조합이 키
      // 먼저 병합할 데이터의 키들을 수집
      const newServerKeys = new Set(
        data.serverlist.map(srv => `${srv.host}:${srv.port}`)
      );

      // 기존 데이터에서 중복되는 키를 가진 항목들을 제거
      for (let i = store.serverlist.length - 1; i >= 0; i--) {
        const existingKey = `${store.serverlist[i].host}:${store.serverlist[i].port}`;
        if (newServerKeys.has(existingKey)) {
          store.removeServer(i);
        }
      }

      // 새로운 데이터 추가
      data.serverlist.forEach((srv: ServerItem) => {
        store.upsertServerByHostPort(srv);
      });
    }

    const _updatedStore = useCredsStore.getState();

    return { ok: true };
  } catch (e) {
    const err = e as Error;

    // Zod 오류인 경우 더 친화적인 메시지 제공
    if (err.message.includes('ZodError')) {
      try {
        const zodError = JSON.parse(err.message);
        if (zodError && Array.isArray(zodError)) {
          const fieldErrors = zodError
            .map((error: any) => {
              const field = error.path?.join('.') || '알 수 없는 필드';
              return `${field}: ${error.message}`;
            })
            .join(', ');
          return { ok: false, error: `데이터 형식 오류: ${fieldErrors}` };
        }
      } catch {
        // JSON parsing failed - use original error message
      }
    }

    return { ok: false, error: err.message };
  }
}
