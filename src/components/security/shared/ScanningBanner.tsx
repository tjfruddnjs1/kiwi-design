/**
 * ScanningBanner - 스캔 진행 중 상태 표시 배너
 *
 * 이전 결과가 있는 상태에서 새로운 스캔이 진행될 때
 * 사용자에게 진행 상황을 명확히 알려주는 배너 컴포넌트
 */

import React from 'react';
import { Alert, Progress, Space, Typography } from 'antd';
import { SyncOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface ScanningBannerProps {
  /** 스캔 유형 (sast, sca, dast) */
  scanType: 'sast' | 'sca' | 'dast';
  /** 스캔 시작 시간 */
  startTime?: Date;
  /** 서비스/저장소 이름 */
  targetName?: string;
  /** 추가 메시지 */
  message?: string;
}

const scanTypeLabels: Record<string, { name: string; icon: string }> = {
  sast: { name: '정적 코드 분석', icon: '🔍' },
  sca: { name: '이미지 분석', icon: '📦' },
  dast: { name: '도메인 검사', icon: '🌐' },
};

/**
 * 경과 시간 계산
 */
const getElapsedTime = (startTime?: Date): string => {
  if (!startTime) return '';
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  if (minutes > 0) {
    return `${minutes}분 ${seconds}초 경과`;
  }
  return `${seconds}초 경과`;
};

export const ScanningBanner: React.FC<ScanningBannerProps> = ({
  scanType,
  startTime,
  targetName,
  message,
}) => {
  const typeInfo = scanTypeLabels[scanType] || {
    name: '보안 분석',
    icon: '🔒',
  };
  const [elapsedTime, setElapsedTime] = React.useState(
    getElapsedTime(startTime)
  );

  // 경과 시간 업데이트
  React.useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Alert
      type='info'
      showIcon
      icon={<SyncOutlined spin style={{ fontSize: 18 }} />}
      style={{
        marginBottom: 16,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
        border: '1px solid #91d5ff',
        animation: 'pulse 2s infinite',
      }}
      message={
        <Space size={8}>
          <Text strong style={{ fontSize: 14 }}>
            {typeInfo.icon} {typeInfo.name} 진행 중
          </Text>
          {targetName && (
            <Text type='secondary' style={{ fontSize: 13 }}>
              ({targetName})
            </Text>
          )}
        </Space>
      }
      description={
        <div style={{ marginTop: 8 }}>
          <Space direction='vertical' size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LoadingOutlined style={{ color: '#1890ff' }} />
              <Text style={{ fontSize: 13 }}>
                {message ||
                  '새로운 스캔 결과를 가져오는 중입니다. 아래는 이전 분석 결과입니다.'}
              </Text>
            </div>
            {startTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Progress
                  percent={100}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#1890ff',
                    '100%': '#52c41a',
                  }}
                  style={{ flex: 1, maxWidth: 200 }}
                  status='active'
                />
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {elapsedTime}
                </Text>
              </div>
            )}
          </Space>
        </div>
      }
    />
  );
};

/**
 * 결과 영역에 오버레이 효과를 주는 래퍼 컴포넌트
 */
export interface ScanningOverlayWrapperProps {
  /** 스캔 진행 중 여부 */
  isScanning: boolean;
  /** 자식 컴포넌트 */
  children: React.ReactNode;
}

export const ScanningOverlayWrapper: React.FC<ScanningOverlayWrapperProps> = ({
  isScanning,
  children,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        opacity: isScanning ? 0.7 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: isScanning ? 'none' : 'auto',
      }}
    >
      {children}
      {isScanning && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

export default ScanningBanner;
