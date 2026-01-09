import api from './client';
import { logger } from '../../utils/logger';
import type { BuildStatistics } from '../../types/build';

/**
 * 서비스별 빌드 버전 정보
 */
export interface ServiceBuildVersion {
  service_name: string; // 마이크로서비스 이름 (예: api-gateway, db-query-service)
  image_tag: string; // 이미지 태그 (예: v20251124-110702)
  image_url: string; // 전체 이미지 URL
  pipeline_id: number; // 빌드가 속한 파이프라인 ID
  started_at: string; // 빌드 시작 시간
}

/**
 * 서비스별 빌드 버전 맵 타입
 * key: 서비스명 (예: "api-gateway"), value: 해당 서비스의 빌드 버전 배열
 */
export type ServiceBuildVersionsMap = Record<string, ServiceBuildVersion[]>;

/**
 * 특정 서비스의 빌드 통계를 조회합니다.
 * @param serviceId - 조회할 서비스의 ID
 * @returns 성공 시 BuildStatistics 객체를 반환합니다.
 */
export const getBuildStatistics = async (
  serviceId: number
): Promise<BuildStatistics> => {
  try {
    // 백엔드는 { success: true, data: BuildStatistics, build_environment: {...} } 형태로 반환
    // 하지만 api.pipeline은 이를 StandardApiResponse로 감싸지 않고 그대로 반환
    const response = await api.pipeline<BuildStatistics>('getBuildStatistics', {
      service_id: serviceId,
    });

    if (!response || !response.success) {
      throw new Error(response?.error || '빌드 통계 조회에 실패했습니다.');
    }

    // response.data가 BuildStatistics 객체
    return response.data;
  } catch (error) {
    logger.error(
      `빌드 통계 조회 실패 (Service: ${serviceId}):`,
      error as Error
    );
    throw error;
  }
};

/**
 * 멀티-서비스 프로젝트의 각 마이크로서비스별 빌드 버전 목록을 조회합니다.
 * lw-chatbot 같은 프로젝트에서 각 서비스(api-gateway, db-query-service 등)마다
 * 사용 가능한 빌드 버전들을 서비스별로 그룹핑하여 반환합니다.
 *
 * @param serviceId - 조회할 프로젝트 서비스의 ID
 * @returns 서비스명을 키로 하고 빌드 버전 배열을 값으로 하는 맵
 */
export const getServiceBuildVersions = async (
  serviceId: number
): Promise<ServiceBuildVersionsMap> => {
  try {
    const response = await api.pipeline<ServiceBuildVersionsMap>(
      'getServiceBuildVersions',
      {
        service_id: serviceId,
      }
    );

    if (!response || !response.success) {
      throw new Error(
        response?.error || '서비스별 빌드 버전 조회에 실패했습니다.'
      );
    }

    return response.data;
  } catch (error) {
    logger.error(
      `서비스별 빌드 버전 조회 실패 (Service: ${serviceId}):`,
      error as Error
    );
    throw error;
  }
};

export const buildApi = {
  getBuildStatistics,
  getServiceBuildVersions,
};

export default buildApi;
