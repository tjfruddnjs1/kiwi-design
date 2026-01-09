import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import organizationApi, {
  type OrganizationDTO,
} from '../lib/api/endpoints/organization';

/**
 * 현재 사용자가 소속된 기관 목록 관리를 위한 커스텀 훅
 */
export const useMyOrganizations = () => {
  const [organizations, setOrganizations] = useState<OrganizationDTO[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 소속 기관 목록 로드
   */
  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await organizationApi.getMyOrganizations();

      if (response.success && response.data) {
        setOrganizations(response.data);

        // 첫 로드 시 첫 번째 기관을 기본 선택
        if (response.data.length > 0 && selectedOrgId === null) {
          setSelectedOrgId(response.data[0].id);
        }
      } else {
        const errorMsg = `기관 목록 로드 실패: ${response.error || 'API 오류'}`;
        setError(errorMsg);
        message.error(errorMsg);
      }
    } catch (_err) {
      const errorMsg = '소속 기관 목록 로드 중 서버 오류가 발생했습니다.';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId]);

  /**
   * 선택된 기관 정보 가져오기
   */
  const selectedOrganization = organizations.find(
    org => org.id === selectedOrgId
  );

  /**
   * 컴포넌트 마운트 시 기관 목록 로드
   */
  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  return {
    organizations,
    selectedOrgId,
    setSelectedOrgId,
    selectedOrganization,
    isLoading,
    error,
    loadOrganizations,
  };
};
