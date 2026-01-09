/**
 * SecurityResultLayout Component
 * 보안 분석 결과 모달의 공통 레이아웃
 */

import React from 'react';
import { Modal, Button, Spin } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import type {
  SecurityAnalysisType,
  ScanState,
} from '../../../types/securityModals';

export interface SecurityResultLayoutProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 */
  onClose: () => void;
  /** 모달 제목 */
  title: string;
  /** 제목 아이콘 */
  icon?: React.ReactNode;
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 메시지 */
  error?: string | null;
  /** 데이터 비어있음 */
  isEmpty?: boolean;
  /** 스캔 실행 함수 */
  onScan?: () => void;
  /** 새로고침 함수 */
  onRefresh?: () => void;
  /** 스캔 상태 */
  scanState?: ScanState;
  /** 분석 타입 */
  analysisType?: SecurityAnalysisType;
  /** Repository 이름 */
  repoName?: string;
  /** 자식 컴포넌트 */
  children: React.ReactNode;
  /** 모달 너비 */
  width?: number | string;
  /** 푸터 커스터마이징 */
  footer?: React.ReactNode;
  /** 추가 헤더 액션 */
  extraActions?: React.ReactNode;
}

export const SecurityResultLayout: React.FC<SecurityResultLayoutProps> = ({
  visible,
  onClose,
  title,
  icon,
  loading = false,
  error = null,
  isEmpty = false,
  onScan,
  onRefresh,
  scanState = 'idle',
  analysisType,
  repoName,
  children,
  width = 1400,
  footer,
  extraActions,
}) => {
  const isScanning = scanState === 'analyzing';

  // 기본 푸터
  const defaultFooter = [
    onScan && (
      <Button
        key='scan'
        type='primary'
        icon={isScanning ? <Spin size='small' /> : <PlayCircleOutlined />}
        onClick={onScan}
        loading={isScanning}
        disabled={isScanning}
      >
        {isScanning ? '스캔 중...' : '스캔 시작'}
      </Button>
    ),
    <Button key='close' onClick={onClose}>
      닫기
    </Button>,
  ].filter(Boolean);

  // 제목 구성
  const modalTitle = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '12px',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}
      >
        {icon}
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          {title}
          {repoName && ` - ${repoName}`}
        </span>
      </div>
      {extraActions && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {onRefresh && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              size='small'
              disabled={isScanning}
              style={{ minWidth: '80px', height: '28px' }}
            >
              새로고침
            </Button>
          )}
          {extraActions}
        </div>
      )}
    </div>
  );

  // 컨텐츠 렌더링
  const renderContent = () => {
    // 로딩 중
    if (loading) {
      return (
        <LoadingState
          message={`${analysisType?.toUpperCase() || ''} 결과를 불러오는 중입니다...`}
        />
      );
    }

    // 스캔 중
    if (isScanning) {
      return (
        <LoadingState
          message={`${analysisType?.toUpperCase() || ''} 스캔이 진행 중입니다...`}
          tip='잠시만 기다려주세요. 스캔이 완료되면 자동으로 결과가 표시됩니다.'
        />
      );
    }

    // 에러
    if (error) {
      return <ErrorState message={error} onRetry={onRefresh} />;
    }

    // 빈 상태
    if (isEmpty) {
      return (
        <EmptyState
          icon={icon}
          title={`${analysisType?.toUpperCase() || ''} 분석 결과가 없습니다`}
          description='스캔을 시작하여 보안 취약점을 분석해보세요'
          onAction={onScan}
          actionLoading={isScanning}
        />
      );
    }

    // 정상 컨텐츠
    return children;
  };

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      footer={footer !== undefined ? footer : defaultFooter}
      width={width}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
          padding: '16px',
        },
      }}
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  );
};

export default SecurityResultLayout;
