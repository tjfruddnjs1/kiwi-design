/**
 * ScanProgressOverlay
 * 보안 분석 스캔 진행 중 표시되는 향상된 UX 컴포넌트
 * - 진행 상태 표시
 * - 예상 소요 시간
 * - 백그라운드 실행 옵션
 * - 경과 시간 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Button, Progress, Typography, Space, message } from 'antd';
import {
  ClockCircleOutlined,
  BellOutlined,
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

export type ScanType = 'sast' | 'sca' | 'dast' | 'sbom';

interface ScanProgressOverlayProps {
  /** 스캔 타입 */
  scanType: ScanType;
  /** 표시 여부 */
  visible: boolean;
  /** 모달 닫기 콜백 (백그라운드 실행 시) */
  onClose?: () => void;
  /** 스캔 취소 콜백 */
  onCancel?: () => void;
  /** 스캔 시작 시간 (선택, 미지정 시 컴포넌트 마운트 시간) */
  startTime?: Date;
  /** 예상 소요 시간 (초) */
  estimatedSeconds?: number;
  /** 서비스명 (알림용) */
  serviceName?: string;
}

// 스캔 타입별 정보
const SCAN_INFO: Record<
  ScanType,
  { name: string; description: string; estimatedTime: number }
> = {
  sast: {
    name: '정적 코드 분석 (SAST)',
    description:
      'Semgrep과 CodeQL을 사용하여 소스 코드의 보안 취약점을 분석합니다.',
    estimatedTime: 180, // 약 3분
  },
  sca: {
    name: '컨테이너 이미지 분석 (SCA)',
    description: 'Trivy를 사용하여 컨테이너 이미지의 취약점을 스캔합니다.',
    estimatedTime: 120, // 약 2분
  },
  dast: {
    name: '동적 보안 분석 (DAST)',
    description:
      'OWASP ZAP을 사용하여 실행 중인 애플리케이션의 보안 취약점을 분석합니다.',
    estimatedTime: 300, // 약 5분
  },
  sbom: {
    name: 'SBOM 분석',
    description: '소프트웨어 구성 요소(BOM)를 분석합니다.',
    estimatedTime: 60, // 약 1분
  },
};

export const ScanProgressOverlay: React.FC<ScanProgressOverlayProps> = ({
  scanType,
  visible,
  onClose,
  onCancel,
  startTime: propStartTime,
  estimatedSeconds,
  serviceName,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime] = useState<Date>(propStartTime || new Date());

  const scanInfo = SCAN_INFO[scanType];
  const totalEstimated = estimatedSeconds || scanInfo.estimatedTime;

  // 경과 시간 업데이트
  useEffect(() => {
    if (!visible) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, startTime]);

  // 시간 포맷팅 함수
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  // 진행률 계산 (최대 99%)
  const progress = Math.min(
    Math.round((elapsedSeconds / totalEstimated) * 100),
    99
  );

  // 백그라운드 실행 핸들러
  const handleRunInBackground = useCallback(() => {
    message.info({
      content: (
        <span>
          <BellOutlined style={{ marginRight: 8 }} />
          {scanInfo.name}이(가) 백그라운드에서 계속 실행됩니다.
          <br />
          완료되면 알림으로 결과를 확인하실 수 있습니다.
        </span>
      ),
      duration: 4,
    });
    onClose?.();
  }, [onClose, scanInfo.name]);

  if (!visible) return null;

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%)',
        borderRadius: '12px',
        margin: '20px 0',
      }}
    >
      {/* 스피너 */}
      <Spin
        indicator={
          <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />
        }
      />

      {/* 제목 */}
      <Title
        level={4}
        style={{ marginTop: 24, marginBottom: 8, color: '#1890ff' }}
      >
        {scanInfo.name}
      </Title>

      {/* 설명 */}
      <Text type='secondary' style={{ display: 'block', marginBottom: 24 }}>
        {scanInfo.description}
      </Text>

      {/* 진행률 */}
      <div style={{ maxWidth: 400, margin: '0 auto', marginBottom: 20 }}>
        <Progress
          percent={progress}
          status='active'
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          showInfo={false}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <Text type='secondary'>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            경과: {formatTime(elapsedSeconds)}
          </Text>
          <Text type='secondary'>예상: 약 {formatTime(totalEstimated)}</Text>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div
        style={{
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: 24,
          maxWidth: 450,
          margin: '0 auto 24px',
        }}
      >
        <Text style={{ color: '#0050b3' }}>
          <BellOutlined style={{ marginRight: 8 }} />
          분석이 완료되면 알림으로 결과를 확인하실 수 있습니다.
          {serviceName && (
            <span style={{ display: 'block', marginTop: 4 }}>
              서비스: <strong>{serviceName}</strong>
            </span>
          )}
        </Text>
      </div>

      {/* 버튼 그룹 */}
      <Space size='middle'>
        <Button
          type='primary'
          icon={<BellOutlined />}
          onClick={handleRunInBackground}
          size='large'
        >
          백그라운드에서 실행
        </Button>
        {onCancel && (
          <Button
            icon={<CloseOutlined />}
            onClick={onCancel}
            size='large'
            danger
          >
            취소
          </Button>
        )}
      </Space>

      {/* 추가 안내 */}
      <div style={{ marginTop: 16 }}>
        <Text type='secondary' style={{ fontSize: 12 }}>
          &quot;백그라운드에서 실행&quot;을 클릭하면 이 창을 닫고 다른 작업을
          계속할 수 있습니다.
        </Text>
      </div>
    </div>
  );
};

export default ScanProgressOverlay;
