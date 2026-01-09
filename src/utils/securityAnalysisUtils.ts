/**
 * Security Analysis 관련 유틸리티 함수
 * GitManagement.tsx에서 추출된 SAST 분석 API 호출 함수들
 */

import { apiClient } from './apiClient';
import type { SastAnalysisResult } from '../types/sast';

// SAST 분석 단일 결과 타입 (command_log 포함)
export type SastSingleResult = SastAnalysisResult & { command_log?: string };

/**
 * Semgrep 분석 API 호출 (재시도 로직 포함)
 * @param params - 분석 파라미터 (gitUrl, accessToken, config 등)
 * @param retryCount - 현재 재시도 횟수
 * @returns SAST 분석 결과
 */
export async function semgrepAnalysis(
  params: Map<string, string>,
  retryCount = 0
): Promise<SastSingleResult> {
  const gitUrl = params.get('gitUrl') || '';
  const accessToken = params.get('accessToken') || '';
  const maxRetries = 2;

  try {
    // 백엔드 API 호출 (SAST 스캔은 시간이 오래 걸리므로 5분 타임아웃 설정)
    const response = await apiClient.post<
      { action: string; parameters: Record<string, string> },
      SastSingleResult
    >(
      '/gits',
      {
        action: 'executeSemgrepScan',
        parameters: {
          git_url: gitUrl,
          git_token: accessToken,
          config: params.get('config') || 'p/owasp-top-ten',
        },
      },
      { timeout: 300000 }
    );

    if (!response.success || !response.data) {
      const errText = response.error || '';
      if (/access denied|authentication failed|http basic/i.test(errText)) {
        throw new Error('INVALID_TOKEN');
      }
      throw new Error(response.error || 'Semgrep 분석 실패');
    }

    return response.data;
  } catch (err) {
    // 네트워크 오류인 경우 재시도
    const isNetworkError =
      err instanceof Error &&
      (err.message.includes('Network Error') ||
        err.message.includes('서버에 연결할 수 없습니다') ||
        err.message.includes('timeout'));

    if (isNetworkError && retryCount < maxRetries) {
      await new Promise(resolve =>
        setTimeout(resolve, 2000 * (retryCount + 1))
      ); // 점진적 대기
      return semgrepAnalysis(params, retryCount + 1);
    }

    // 오류 유형 구분을 위해 원본 오류 메시지 포함
    if (err instanceof Error) {
      if (err.message === 'INVALID_TOKEN') {
        throw err;
      }
      throw new Error(`SEMGREP_ERROR: ${err.message}`);
    }
    throw new Error('SEMGREP_ERROR: 알 수 없는 오류');
  }
}

/**
 * CodeQL 분석 API 호출 (재시도 로직 포함)
 * @param params - 분석 파라미터 (gitUrl, accessToken 등)
 * @param retryCount - 현재 재시도 횟수
 * @returns SAST 분석 결과
 */
export async function codeqlAnalysis(
  params: Map<string, string>,
  retryCount = 0
): Promise<SastSingleResult> {
  const gitUrl = params.get('gitUrl') || '';
  const accessToken = params.get('accessToken') || '';
  const maxRetries = 2;

  try {
    // 백엔드 API 호출 (CodeQL 스캔은 시간이 오래 걸리므로 5분 타임아웃 설정)
    const response = await apiClient.post<
      { action: string; parameters: Record<string, string> },
      SastSingleResult
    >(
      '/gits',
      {
        action: 'executeCodeqlScan',
        parameters: {
          git_url: gitUrl,
          git_token: accessToken,
        },
      },
      { timeout: 300000 }
    );

    if (!response.success || !response.data) {
      const errText = response.error || '';
      if (/access denied|authentication failed|http basic/i.test(errText)) {
        throw new Error('INVALID_TOKEN');
      }
      throw new Error(response.error || 'CodeQL 분석 실패');
    }

    return response.data;
  } catch (err) {
    // 네트워크 오류인 경우 재시도
    const isNetworkError =
      err instanceof Error &&
      (err.message.includes('Network Error') ||
        err.message.includes('서버에 연결할 수 없습니다') ||
        err.message.includes('timeout'));

    if (isNetworkError && retryCount < maxRetries) {
      await new Promise(resolve =>
        setTimeout(resolve, 2000 * (retryCount + 1))
      ); // 점진적 대기
      return codeqlAnalysis(params, retryCount + 1);
    }

    // 오류 유형 구분을 위해 원본 오류 메시지 포함
    if (err instanceof Error) {
      if (err.message === 'INVALID_TOKEN') {
        throw err;
      }
      throw new Error(`CODEQL_ERROR: ${err.message}`);
    }
    throw new Error('CODEQL_ERROR: 알 수 없는 오류');
  }
}

/**
 * SAST 오류 메시지 파싱 및 사용자 친화적 메시지 반환
 * @param err - 에러 객체
 * @returns 사용자 친화적 에러 메시지
 */
export function parseSastErrorMessage(err: unknown): string {
  const errMsg = err instanceof Error ? err.message : String(err);

  if (
    errMsg === 'INVALID_TOKEN' ||
    /access denied|authentication failed|http basic/i.test(errMsg)
  ) {
    return 'SAST 분석 실패: GitLab 자격증명을 확인하세요.';
  } else if (errMsg.startsWith('SEMGREP_ERROR:')) {
    const detail = errMsg.replace('SEMGREP_ERROR:', '').trim();
    return `Semgrep 분석 오류: ${detail}`;
  } else if (errMsg.startsWith('CODEQL_ERROR:')) {
    const detail = errMsg.replace('CODEQL_ERROR:', '').trim();
    return `CodeQL 분석 오류: ${detail}`;
  } else if (/network error|서버에 연결할 수 없습니다|timeout/i.test(errMsg)) {
    return 'SAST 분석 실패: 서버 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  return `SAST 분석 실패: ${errMsg}`;
}
