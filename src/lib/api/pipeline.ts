import { logger } from '../../utils/logger'; //  기존 로거 import
import api from './client'; //  기존에 사용하던 apiClient import
import type { SshHop } from './types'; //  SshHop 타입 import

// --- 1. 타입 정의 ---

// Nullable 타입 정의 (백엔드 sql.Null* 타입과 일치)
interface NullableFloat {
  Float64: number;
  Valid: boolean;
}

interface NullableString {
  String: string;
  Valid: boolean;
}

interface NullableInt {
  Int64: number;
  Valid: boolean;
}

// 백엔드의 `db.PipelineLogEntry` 구조체와 일치하는 TypeScript 타입을 정의합니다.
export interface PipelineLogEntry {
  timestamp: string;
  command: string;
  output: string;
  error: string;
  exit_code: number;
}

export interface PipelineMetrics {
  success_rate: number;
  deploys_today: number;
  total_deploys: number;
  last_run: { String: string; Valid: boolean };
}

//  [핵심 수정] PipelineStep 인터페이스를 실제 데이터 구조에 맞게 수정합니다.
export interface PipelineStep {
  id: number;
  step_name: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  progress_percentage: NullableFloat;
  started_at: NullableString;
  completed_at: NullableString;
  duration_seconds: NullableInt;
  error_message?: NullableString; //  NullableString으로 수정
  details_data?: Record<string, unknown>; //  JSON 객체 (백엔드에서 unmarshalled)
}

// 파이프라인 단계의 완전한 상세 정보 (getPipelineStepDetail API 응답)
export interface PipelineStepDetail {
  id: number;
  pipeline_id: number;
  step_number: number;
  step_name: string;
  status: string;
  progress_percentage: NullableFloat;
  started_at: NullableString;
  completed_at: NullableString;
  duration_seconds: NullableInt;
  details_data: Record<string, unknown>; //  배포 상세 정보 (JSON 객체)
  execution_logs: unknown[]; //  실행 로그 배열
  error_message: NullableString;
  created_at: string;
  updated_at: string;
}

/**
 * 특정 서비스의 가장 최근 파이프라인 단계 상세 정보를 가져옵니다.
 * @param serviceId - 로그를 조회할 서비스의 ID
 * @param stepName - 조회할 단계의 이름 (예: 'build', 'deploy')
 * @returns 성공 시 PipelineLogEntry 객체의 배열을 반환합니다.
 */

export const getLatestStepDetails = async (
  serviceId: number,
  stepName: string
): Promise<PipelineLogEntry[]> => {
  try {
    const response = await api.pipeline<PipelineLogEntry[]>(
      'getLatestPipelineStepDetails',
      {
        // parameters
        service_id: serviceId,
        step_name: stepName,
      }
    );

    // 백엔드 응답의 success 필드를 확인하여 실패 시 에러를 던집니다.
    if (!response || !response.success) {
      throw new Error(
        response?.error || '파이프라인 로그 조회에 실패했습니다.'
      );
    }

    // 성공 시, data 프로퍼티를 반환합니다.
    return response.data || [];
  } catch (error) {
    logger.error(
      `파이프라인 로그 조회 실패 (Service: ${serviceId}, Step: ${stepName}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * 특정 서비스의 전체 파이프라인 최신 상태를 가져옵니다.
 * @param serviceId - 상태를 조회할 서비스의 ID
 * @returns 성공 시 PipelineStep 객체의 배열을 반환합니다.
 */
export const getLatestPipelineStatus = async (
  serviceId: number
): Promise<PipelineStep[]> => {
  try {
    const response = await api.pipeline<PipelineStep[]>(
      'getLatestPipelineStatus',
      {
        service_id: serviceId,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '파이프라인 상태 조회에 실패했습니다.'
      );
    }

    return response.data || [];
  } catch (error) {
    logger.error(
      `파이프라인 상태 조회 실패 (Service: ${serviceId}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * 이미지 빌드 파이프라인을 실행합니다.
 *  [수정] SSH credentials는 creds-store, GitLab/Registry는 DB에서 조회
 * @param serviceId - 빌드할 서비스의 ID
 * @param hops - SSH 연결 정보 (creds-store에서 조회)
 * @param infraId - 빌드 실행 시 선택된 인프라 ID (선택사항)
 * @param selectedServices - 빌드할 서비스 목록 (선택사항, 없으면 모든 서비스 빌드)
 * @param autoDeploy - 빌드 완료 후 자동 배포 여부 (선택사항)
 * @returns API 응답
 */
export const buildImage = async (
  serviceId: number,
  hops: SshHop[],
  infraId?: number,
  selectedServices?: string[],
  autoDeploy?: boolean
) => {
  return api.pipeline('pipelineBuildImage', {
    id: serviceId,
    hops, //  SSH credentials (username/password) from creds-store
    ...(infraId ? { infra_id: infraId } : {}),
    //  [신규] 선택된 서비스 목록 전달
    ...(selectedServices && selectedServices.length > 0
      ? { selected_services: selectedServices }
      : {}),
    //  [신규] 빌드 완료 후 자동 배포 여부 전달
    ...(autoDeploy !== undefined ? { auto_deploy: autoDeploy } : {}),
  });
};

/**
 * 쿠버네티스 적용 파이프라인을 실행합니다.
 *  [수정] SSH credentials는 creds-store, GitLab/Registry는 DB에서 조회
 * @param serviceId - 배포할 서비스의 ID
 * @param hops - SSH 연결 정보 (creds-store에서 조회)
 * @param selectedImageTag - 선택된 빌드 이미지 태그 (선택사항, 없으면 최신 빌드 자동 선택)
 * @returns API 응답
 */
export const applyKubernetes = async (
  serviceId: number,
  hops: SshHop[],
  selectedImageTag?: string,
  selectedServiceImages?: Record<string, string>
) => {
  return api.pipeline('pipelineApplyK8s', {
    id: serviceId,
    hops, //  SSH credentials (username/password) from creds-store
    ...(selectedImageTag ? { selected_image_tag: selectedImageTag } : {}),
    ...(selectedServiceImages
      ? { selected_service_images: selectedServiceImages }
      : {}),
  });
};

export const getPipelineMetrics = async (
  serviceId: number
): Promise<PipelineMetrics> => {
  try {
    const response = await api.pipeline<PipelineMetrics>('getPipelineMetrics', {
      service_id: serviceId,
    });
    if (!response || !response.success) {
      throw new Error(
        response?.error || '파이프라인 통계 조회에 실패했습니다.'
      );
    }
    return response.data;
  } catch (error) {
    logger.error(
      `파이프라인 통계 조회 실패 (Service: ${serviceId}):`,
      error as Error
    );
    throw error;
  }
};

//  [신규] 빌드된 이미지 정보 타입
export interface BuiltImageInfo {
  image_url: string;
  build_date: string;
  registry?: string;
  image_tag?: string;
  pipeline_id?: number;
  build_step_id: number;
}

/**
 * 특정 서비스의 빌드된 이미지 목록을 가져옵니다 (SCA 스캔용).
 * @param serviceId - 조회할 서비스의 ID
 * @returns 성공 시 BuiltImageInfo 객체의 배열을 반환합니다.
 */
export const getBuiltImages = async (
  serviceId: number
): Promise<BuiltImageInfo[]> => {
  try {
    const response = await api.pipeline<BuiltImageInfo[]>('getBuiltImages', {
      service_id: serviceId,
    });

    if (!response || !response.success) {
      throw new Error(
        response?.error || '빌드 이미지 목록 조회에 실패했습니다.'
      );
    }

    return response.data || [];
  } catch (error) {
    logger.error(
      `빌드 이미지 목록 조회 실패 (Service: ${serviceId}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * 특정 서비스의 특정 파이프라인 단계의 완전한 상세 정보를 가져옵니다 (리포트 모달용).
 * @param serviceId - 조회할 서비스의 ID
 * @param stepName - 조회할 단계의 이름 (예: 'source', 'build', 'sast', 'sca', 'deploy', 'operate', 'dsat')
 * @returns 성공 시 완전한 PipelineStepDetail 객체를 반환합니다.
 */
export const getPipelineStepDetail = async (
  serviceId: number,
  stepName: string
): Promise<PipelineStepDetail> => {
  try {
    const response = await api.pipeline<PipelineStepDetail>(
      'getPipelineStepDetail',
      {
        service_id: serviceId,
        step_name: stepName,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '파이프라인 단계 상세 정보 조회에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error(
      `파이프라인 단계 상세 정보 조회 실패 (Service: ${serviceId}, Step: ${stepName}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * 특정 서비스의 마지막으로 성공한 배포 정보를 가져옵니다 (운영 모달용).
 * @param serviceId - 조회할 서비스의 ID
 * @returns 성공 시 마지막 성공한 배포의 상세 정보를 반환합니다.
 */
export const getLastSuccessfulDeployment = async (
  serviceId: number
): Promise<PipelineStepDetail> => {
  try {
    const response = await api.pipeline<PipelineStepDetail>(
      'getLastSuccessfulDeployment',
      {
        service_id: serviceId,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '마지막 성공한 배포 정보 조회에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error(
      `마지막 성공한 배포 정보 조회 실패 (Service: ${serviceId}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * Docker Compose 배포 파이프라인을 실행합니다.
 * @param serviceId - 배포할 서비스의 ID
 * @param deployType - 배포 타입 ('docker_deploy')
 * @param parameters - 배포 파라미터 (selected_service_images 또는 selected_image_tag)
 * @returns API 응답
 */
export const triggerPipeline = async (
  serviceId: number,
  deployType: string,
  parameters: Record<string, unknown>
) => {
  return api.pipeline('pipelineApplyDockerCompose', {
    id: serviceId,
    ...parameters,
  });
};

/**
 * 여러 서비스의 파이프라인 상태를 한 번에 조회합니다 (배치 API).
 * 기존 N번의 개별 API 호출을 1번으로 줄여 성능을 대폭 개선합니다.
 * @param serviceIds - 조회할 서비스 ID 배열
 * @returns 성공 시 서비스 ID를 키로 하는 파이프라인 상태 맵을 반환합니다.
 */
export const getBatchPipelineStatus = async (
  serviceIds: number[]
): Promise<Record<number, PipelineStep[]>> => {
  try {
    if (serviceIds.length === 0) {
      return {};
    }

    const response = await api.pipeline<Record<number, PipelineStep[]>>(
      'getBatchPipelineStatus',
      {
        service_ids: serviceIds,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '배치 파이프라인 상태 조회에 실패했습니다.'
      );
    }

    return response.data || {};
  } catch (error) {
    logger.error(
      `배치 파이프라인 상태 조회 실패 (Services: ${serviceIds.join(', ')}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * 여러 서비스의 빌드 통계를 한 번에 조회합니다 (배치 API).
 * @param serviceIds - 조회할 서비스 ID 배열
 * @returns 성공 시 서비스 ID를 키로 하는 빌드 통계 맵을 반환합니다.
 */
export const getBatchBuildStatistics = async (
  serviceIds: number[]
): Promise<Record<number, unknown>> => {
  try {
    if (serviceIds.length === 0) {
      return {};
    }

    const response = await api.pipeline<Record<number, unknown>>(
      'getBatchBuildStatistics',
      {
        service_ids: serviceIds,
      }
    );

    if (!response || !response.success) {
      throw new Error(response?.error || '배치 빌드 통계 조회에 실패했습니다.');
    }

    return response.data || {};
  } catch (error) {
    logger.error(
      `배치 빌드 통계 조회 실패 (Services: ${serviceIds.join(', ')}):`,
      error as Error
    );
    throw error;
  }
};

export const pipelineApi = {
  getLatestStepDetails,
  getLatestPipelineStatus,
  getBatchPipelineStatus,
  getBatchBuildStatistics,
  getPipelineStepDetail,
  getLastSuccessfulDeployment,
  buildImage,
  applyKubernetes,
  getPipelineMetrics,
  getBuiltImages,
  triggerPipeline,
};

//  기본 내보내기도 추가합니다.
export default pipelineApi;
