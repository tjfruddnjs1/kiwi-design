/**
 * Mock System Entry Point
 * 모든 Mock 데이터 및 유틸리티 내보내기
 */

// Mock Data
export * from './data/users';
export * from './data/services';
export * from './data/infrastructure';
export * from './data/backup';
export * from './data/dashboard';
export * from './data/organizations';
export * from './data/kubernetes';
export * from './data/docker';

// Utilities
export * from './utils/delay';

// Demo Mode Flag
export const DEMO_MODE = true;
export const DEMO_VERSION = '1.0.0';

/**
 * Demo Mode 알림 메시지
 */
export const showDemoNotice = (feature: string): void => {
  console.info(`[DEMO MODE] ${feature} - This feature uses mock data`);
};

/**
 * 실행 불가 기능 알림
 */
export const showDemoActionNotice = (): string => {
  return 'Demo 모드에서는 이 기능을 실행할 수 없습니다.';
};