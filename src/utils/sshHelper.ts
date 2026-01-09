import { getServerCred, normalizePort } from './credsAdapter';
import { useCredsStore } from '../stores/useCredsStore';

export type HopInfo = { host: string; port: number };
export type AuthHop = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export async function ensureSshCreds(
  hops: HopInfo[],
  onReady: (authHops: AuthHop[]) => Promise<void> | void
): Promise<boolean> {
  const authHops: AuthHop[] = [];
  const missingIndices: number[] = [];

  // 스토어에서 조회
  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const cred = await getServerCred(hop.host, normalizePort(hop.port));

    if (cred && cred.userId && cred.password) {
      authHops.push({
        host: hop.host,
        port: hop.port,
        username: cred.userId,
        password: cred.password,
      });
    } else {
      authHops.push({
        host: hop.host,
        port: hop.port,
        username: '',
        password: '',
      });
      missingIndices.push(i);
    }
  }

  // 모두 있으면 바로 진행
  if (missingIndices.length === 0) {
    await onReady(authHops);
    return true; // 모달 없이 완료
  }

  // 일부 누락이면 false 반환 (호출자가 모달 열어야 함)
  return false;
}

export function saveAuthHopsToStore(authHops: AuthHop[]): void {
  const store = useCredsStore.getState();
  authHops.forEach(hop => {
    if (!hop.username || !hop.password) return;
    store.upsertServerByHostPort({
      host: hop.host,
      port: hop.port,
      userId: hop.username,
      password: hop.password,
    });
  });
}
