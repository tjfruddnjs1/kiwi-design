import React from 'react';
import { Modal, Typography, Alert, Space, Button, Tag, Divider } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  SecurityScanOutlined,
  BugOutlined,
  RocketOutlined,
  BuildOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * 보안 검사 경고 타입
 */
export type SecurityWarningType =
  | 'no_analysis' // 분석이 수행되지 않음
  | 'critical_found'; // Critical 취약점 발견

/**
 * 보안 검사 단계 타입
 */
export type SecurityCheckStage = 'build' | 'deploy';

/**
 * 보안 검사 카테고리 타입
 */
export type SecurityCheckCategory = 'sast' | 'sca';

/**
 * Critical 취약점 요약 정보
 */
export interface CriticalVulnerabilitySummary {
  critical: number;
  high?: number;
  medium?: number;
  low?: number;
}

/**
 * SecurityCheckWarningModal Props
 */
export interface SecurityCheckWarningModalProps {
  visible: boolean;
  stage: SecurityCheckStage; // 'build' 또는 'deploy'
  category: SecurityCheckCategory; // 'sast' 또는 'sca'
  warningType: SecurityWarningType; // 'no_analysis' 또는 'critical_found'
  vulnerabilitySummary?: CriticalVulnerabilitySummary; // critical_found인 경우 취약점 요약
  serviceName: string; // 서비스 이름
  onContinue: () => void; // 계속 진행 핸들러
  onCancel: () => void; // 취소 핸들러
  loading?: boolean; // 로딩 상태
}

/**
 * 보안 검사 경고 모달
 * - 빌드 시 SAST 분석이 없거나 critical 취약점이 있을 때 경고
 * - 배포 시 SCA 분석이 없거나 critical 취약점이 있을 때 경고
 */
const SecurityCheckWarningModal: React.FC<SecurityCheckWarningModalProps> = ({
  visible,
  stage,
  category,
  warningType,
  vulnerabilitySummary,
  serviceName,
  onContinue,
  onCancel,
  loading = false,
}) => {
  // 단계별 텍스트
  const stageText = stage === 'build' ? '빌드' : '배포';
  const StageIcon = stage === 'build' ? BuildOutlined : RocketOutlined;

  // 카테고리별 텍스트
  const categoryText =
    category === 'sast' ? '코드 분석 (SAST)' : '이미지 분석 (SCA)';
  const categoryDescription =
    category === 'sast'
      ? '소스 코드에 대한 정적 분석'
      : '컨테이너 이미지의 취약점 분석';

  // 경고 타입별 설정
  const getWarningConfig = () => {
    if (warningType === 'no_analysis') {
      return {
        title: `${categoryText}이 수행되지 않았습니다`,
        alertType: 'warning' as const,
        icon: <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />,
        message: `"${serviceName}" 서비스에 대한 ${categoryDescription}이 아직 실행되지 않았습니다.`,
        description: `${stageText} 전에 보안 분석을 수행하여 잠재적 취약점을 확인하는 것을 권장합니다.`,
      };
    }
    return {
      title: `치명적인 취약점이 발견되었습니다`,
      alertType: 'error' as const,
      icon: (
        <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
      ),
      message: `"${serviceName}" 서비스의 ${categoryDescription} 결과에서 Critical 등급의 취약점이 발견되었습니다.`,
      description: `보안 취약점을 해결한 후 ${stageText}하는 것을 강력히 권장합니다.`,
    };
  };

  const warningConfig = getWarningConfig();

  // 취약점 심각도 태그 렌더링
  const renderSeverityTag = (
    label: string,
    count: number | undefined,
    color: string
  ) => {
    if (!count || count === 0) return null;
    return (
      <Tag color={color} style={{ marginBottom: 4 }}>
        {label}: {count}건
      </Tag>
    );
  };

  return (
    <Modal
      open={visible}
      title={
        <Space>
          <SecurityScanOutlined style={{ color: '#1890ff' }} />
          <span>보안 검사 경고</span>
        </Space>
      }
      onCancel={onCancel}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='continue'
          type='primary'
          danger={warningType === 'critical_found'}
          onClick={onContinue}
          loading={loading}
          icon={<StageIcon />}
        >
          {stageText}
        </Button>,
      ]}
      width={520}
      centered
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        {/* 경고 아이콘과 제목 */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {warningConfig.icon}
          <Title level={5} style={{ marginTop: 12, marginBottom: 0 }}>
            {warningConfig.title}
          </Title>
        </div>

        {/* 경고 메시지 */}
        <Alert
          type={warningConfig.alertType}
          message={warningConfig.message}
          description={warningConfig.description}
          showIcon
          icon={
            warningConfig.alertType === 'error' ? (
              <BugOutlined />
            ) : (
              <WarningOutlined />
            )
          }
        />

        {/* 취약점 요약 (critical_found인 경우) */}
        {warningType === 'critical_found' && vulnerabilitySummary && (
          <>
            <Divider style={{ margin: '8px 0' }}>발견된 취약점</Divider>
            <div style={{ textAlign: 'center' }}>
              {renderSeverityTag(
                'Critical',
                vulnerabilitySummary.critical,
                'red'
              )}
              {renderSeverityTag('High', vulnerabilitySummary.high, 'orange')}
              {renderSeverityTag('Medium', vulnerabilitySummary.medium, 'gold')}
              {renderSeverityTag('Low', vulnerabilitySummary.low, 'blue')}
            </div>
          </>
        )}

        {/* 안내 메시지 */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fafafa',
            borderRadius: '6px',
            marginTop: 8,
          }}
        >
          <Text type='secondary' style={{ fontSize: 12 }}>
            {warningType === 'no_analysis' ? (
              <>
                <strong>권장 조치:</strong>{' '}
                {category === 'sast'
                  ? 'Git 관리 페이지에서 SAST 스캔을 먼저 실행해 주세요.'
                  : 'Git 관리 페이지에서 SCA 스캔을 먼저 실행해 주세요.'}
              </>
            ) : (
              <>
                <strong>권장 조치:</strong> Critical 및 High 등급의 취약점을
                먼저 해결한 후 {stageText}를 진행하는 것이 안전합니다.
              </>
            )}
          </Text>
        </div>

        {/* 확인 안내 */}
        <Text
          type='secondary'
          style={{ fontSize: 12, display: 'block', textAlign: 'center' }}
        >
          위 경고에도 불구하고 {stageText}를 진행하시겠습니까?
        </Text>
      </Space>
    </Modal>
  );
};

export default SecurityCheckWarningModal;

/**
 * SAST 결과에서 Critical 취약점 개수를 확인하는 유틸 함수
 */
export const checkSastCriticalVulnerabilities = (
  sastResult:
    | {
        summary?: {
          severity_counts?: {
            critical: number;
            high: number;
            medium: number;
            low: number;
          };
        };
      }
    | null
    | undefined
): CriticalVulnerabilitySummary | null => {
  if (!sastResult?.summary?.severity_counts) {
    return null;
  }
  const counts = sastResult.summary.severity_counts;
  return {
    critical: counts.critical || 0,
    high: counts.high || 0,
    medium: counts.medium || 0,
    low: counts.low || 0,
  };
};

/**
 * SCA 결과에서 Critical 취약점 개수를 확인하는 유틸 함수
 */
export const checkScaCriticalVulnerabilities = (
  scaResult:
    | {
        summary?: {
          severity_breakdown?: {
            critical?: number;
            high?: number;
            medium?: number;
            low?: number;
          };
        };
        // Trivy raw result에서도 확인
        result?: {
          scan_result?: {
            results?: Array<{
              vulnerabilities?: Array<{
                severity?: string;
              }>;
            }>;
          };
        };
      }
    | null
    | undefined
): CriticalVulnerabilitySummary | null => {
  // 먼저 summary.severity_breakdown에서 확인
  if (scaResult?.summary?.severity_breakdown) {
    const breakdown = scaResult.summary.severity_breakdown;
    return {
      critical: breakdown.critical || 0,
      high: breakdown.high || 0,
      medium: breakdown.medium || 0,
      low: breakdown.low || 0,
    };
  }

  // Trivy raw result에서 취약점 카운트
  if (scaResult?.result?.scan_result?.results) {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const result of scaResult.result.scan_result.results) {
      if (result.vulnerabilities) {
        for (const vuln of result.vulnerabilities) {
          const severity = (vuln.severity || '').toUpperCase();
          if (severity === 'CRITICAL') counts.critical++;
          else if (severity === 'HIGH') counts.high++;
          else if (severity === 'MEDIUM') counts.medium++;
          else if (severity === 'LOW') counts.low++;
        }
      }
    }

    return counts;
  }

  return null;
};
