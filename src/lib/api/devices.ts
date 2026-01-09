import { Device } from '../../pages/devices/DeviceManagement';
import { apiClient } from './client';
import { SshHop } from './types';

export const deviceApi = {
  getDevices: async (id: number, organizationId?: number | null) => {
    return apiClient.post('/devices', {
      action: 'getDevices',
      parameters: {
        userId: id,
        ...(organizationId && { organization_id: organizationId }),
      },
    });
  },

  addDevice: async (deviceData: Device) => {
    return apiClient.post('/devices', {
      action: 'addDevice',
      parameters: deviceData,
    });
  },

  modDevice: async (deviceData: Device) => {
    return apiClient.post('/devices', {
      action: 'modDevice',
      parameters: deviceData,
    });
  },

  delDevice: async (deviceId: number) => {
    return apiClient.post('/devices', {
      action: 'delDevice',
      parameters: { id: deviceId },
    });
  },

  checkExistingDevice: async (name: string, hops: SshHop[], userId: number) => {
    return apiClient.post('/devices', {
      action: 'isExistingDevice',
      parameters: { name, hops, userId },
    });
  },

  updateDeviceAWXHostId: async (deviceId: number, awxHostId: number) => {
    return apiClient.post('/devices', {
      action: 'updateDeviceAWXHostId',
      parameters: { deviceId, awxHostId },
    });
  },

  getInstalledRuntime: async (deviceId: number) => {
    return apiClient.post('/devices', {
      action: 'getInstalledRuntime',
      parameters: { deviceId },
    });
  },
};
