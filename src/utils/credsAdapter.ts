import { useCredsStore } from '../stores/useCredsStore';

export type RegistryCred = { userId: string; password: string };
export type ServerCred = { userId: string; password: string };

export function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    // remove trailing slash
    const normalized = `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}`;
    return normalized;
  } catch {
    // URL parsing failed - fallback: prepend https:// if missing
    try {
      const u = new URL(`https://${url}`);
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}`;
    } catch {
      // Still invalid URL format - return as-is
      return url;
    }
  }
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

export function normalizePort(port?: number): number {
  return port ?? 22;
}

export async function getRegistryCred(
  registryUrl: string
): Promise<RegistryCred | null> {
  if (!registryUrl) {
    // URL 없이도 저장된 첫 번째 자격증명을 기본으로 사용할 수 있도록 허용 (옵션 정책)
    const first = useCredsStore.getState().imageRegistry[0];
    return first ? { userId: first.userId, password: first.password } : null;
  }
  const normalized = normalizeUrl(registryUrl);
  const { imageRegistry } = useCredsStore.getState();
  const found = imageRegistry.find(
    r => normalizeUrl(r.registryUrl) === normalized
  );
  return found ? { userId: found.userId, password: found.password } : null;
}

export async function getRepoToken(baseUrl: string): Promise<string | null> {
  const normalized = normalizeUrl(baseUrl);
  const { sourceRepository } = useCredsStore.getState();
  const found = sourceRepository.find(
    r => normalizeUrl(r.baseUrl) === normalized
  );
  return found ? found.token : null;
}

export async function getRepoUserId(baseUrl: string): Promise<string | null> {
  const normalized = normalizeUrl(baseUrl);
  const { sourceRepository } = useCredsStore.getState();
  const found = sourceRepository.find(
    r => normalizeUrl(r.baseUrl) === normalized
  );
  return found && typeof found.userId === 'string' ? found.userId : null;
}

export async function getServerCred(
  host: string,
  port?: number
): Promise<ServerCred | null> {
  const h = normalizeHost(host);
  const p = normalizePort(port);
  const { serverlist } = useCredsStore.getState();

  const found = serverlist.find(s => {
    const sHost = normalizeHost(s.host);
    const sPort = normalizePort(s.port);
    const match = sHost === h && sPort === p;

    return match;
  });

  return found ? { userId: found.userId, password: found.password } : null;
}
