/**
 * Mock Device API Handler
 */

import { createApiResponse } from '../utils/delay';
import { mockDevices } from '../data/devices';

export const mockDeviceApi = {
  handle: (action?: string, parameters?: unknown) => {
    const params = parameters as Record<string, unknown> | undefined;

    switch (action) {
      case 'getDevices': {
        const organizationId = params?.organization_id as number | undefined;

        let devices = [...mockDevices];

        // 기관별 필터링
        if (organizationId) {
          devices = devices.filter((d) => d.organization_id === organizationId);
        }

        return createApiResponse(devices);
      }

      case 'addDevice': {
        // Demo 모드에서는 실제로 추가하지 않고 가짜 ID 반환
        const newId = Math.max(...mockDevices.map((d) => d.id)) + 1;
        return createApiResponse({
          id: newId,
          name: params?.name || 'new-device',
          message: 'Demo 모드: 장비가 추가되었습니다 (실제로 저장되지 않음)',
        });
      }

      case 'modDevice': {
        return createApiResponse({
          success: true,
          message: 'Demo 모드: 장비가 수정되었습니다 (실제로 저장되지 않음)',
        });
      }

      case 'delDevice': {
        return createApiResponse({
          success: true,
          message: 'Demo 모드: 장비가 삭제되었습니다 (실제로 저장되지 않음)',
        });
      }

      case 'isExistingDevice': {
        const name = params?.name as string;
        const exists = mockDevices.some((d) => d.name === name);
        return createApiResponse({ exists });
      }

      case 'updateDeviceAWXHostId': {
        return createApiResponse({
          success: true,
          message: 'Demo 모드: AWX Host ID가 업데이트되었습니다 (실제로 저장되지 않음)',
        });
      }

      case 'getInstalledRuntime': {
        const deviceId = params?.deviceId as number;
        const device = mockDevices.find((d) => d.id === deviceId);

        if (device) {
          return createApiResponse({
            device_id: deviceId,
            runtime_installed: device.runtime_installed || {},
            runtime_cluster: device.runtime_cluster || {},
          });
        }

        return createApiResponse(null, false, '장비를 찾을 수 없습니다.');
      }

      default:
        console.info(`[Mock Device API] Unknown action: ${action}`);
        return createApiResponse([]);
    }
  },
};