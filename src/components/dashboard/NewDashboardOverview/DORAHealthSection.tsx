/**
 * DORAHealthSection - DORA 건강도 섹션 컴포넌트
 * 전체 시스템 + 서비스별 DORA 메트릭 표시
 */
import React, { memo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Progress,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tooltip,
  Badge,
  Empty,
  Alert,
  Collapse,
} from 'antd';
import {
  TrophyOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  BugOutlined,
  PercentageOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  ToolOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  DORAHealthSummary,
  DORAMetrics,
  DORAGrade,
  ServiceDORAMetrics,
  Incident,
  IncidentSeverity,
} from '../../../types/dashboard';
import { dashboardApi } from '../../../lib/api/dashboard';
import { logger } from '../../../utils/logger';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface DORAHealthSectionProps {
  doraHealth: DORAHealthSummary;
  onRefresh: () => void;
}

// 디자인 상수
const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
};

// DORA 등급별 색상 (로컬 정의)
const GRADE_COLORS: Record<DORAGrade, string> = {
  elite: '#52c41a',
  high: '#1890ff',
  medium: '#faad14',
  low: '#ff4d4f',
};

const GRADE_LABELS: Record<DORAGrade, string> = {
  elite: 'Elite',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// 심각도 색상
const SEVERITY_COLOR_MAP: Record<IncidentSeverity, string> = {
  critical: '#ff4d4f',
  high: '#ff7a45',
  medium: '#faad14',
  low: '#52c41a',
};

// 초를 사람이 읽기 쉬운 형식으로 변환
const formatSeconds = (seconds: number): string => {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}분`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}시간`;
  return `${Math.round(seconds / 86400)}일`;
};

// DORA 메트릭 설명 및 개선 가이드
type MetricKey = 'deployment_frequency' | 'lead_time' | 'mttr' | 'cfr';

interface MetricInfo {
  fullName: string;
  description: string;
  whatItMeasures: string;
  improvementTips: string[];
  eliteTarget: string;
  affectedByActions?: string[]; // K8sControl에서 이 메트릭에 영향을 주는 작업
}

const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  deployment_frequency: {
    fullName: '배포 빈도 (Deployment Frequency)',
    description: '코드가 프로덕션에 얼마나 자주 배포되는지를 측정합니다.',
    whatItMeasures: '팀의 릴리스 능력과 CI/CD 파이프라인 효율성',
    improvementTips: [
      '작은 단위로 자주 배포하는 습관 기르기',
      'CI/CD 파이프라인 자동화 강화',
      '피처 플래그를 활용한 점진적 배포',
      '배포 프로세스 간소화 및 승인 단계 최적화',
    ],
    eliteTarget: '하루 여러 번 또는 온디맨드 배포',
    affectedByActions: [
      '서비스 관리 → 배포 실행 (Deploy)',
      '파이프라인 → 배포 단계 성공',
    ],
  },
  lead_time: {
    fullName: '변경 리드 타임 (Lead Time for Changes)',
    description: '코드 커밋부터 프로덕션 배포까지 걸리는 시간을 측정합니다.',
    whatItMeasures: '개발 프로세스의 효율성과 배포 파이프라인 속도',
    improvementTips: [
      '코드 리뷰 프로세스 효율화 (자동 리뷰어 지정)',
      '테스트 자동화로 수동 검증 시간 단축',
      'PR 크기를 작게 유지하여 리뷰 시간 단축',
      '빌드 및 배포 파이프라인 병렬화',
    ],
    eliteTarget: '1시간 미만',
    affectedByActions: [
      '파이프라인 빌드(Build) → 배포(Deploy) 시간',
      'Source → Build → Deploy 전체 소요시간',
    ],
  },
  mttr: {
    fullName: '평균 복구 시간 (Mean Time To Recovery)',
    description:
      '장애 발생 시 서비스가 정상으로 복구되기까지의 평균 시간입니다.',
    whatItMeasures: '운영 대응력과 시스템 복원력',
    improvementTips: [
      '자동 롤백 메커니즘 구축',
      '모니터링 및 알림 체계 강화',
      '장애 대응 런북(Runbook) 작성 및 훈련',
      '카나리 배포로 영향 범위 최소화',
      'RCA(근본 원인 분석) 문화 정착',
    ],
    eliteTarget: '1시간 미만',
    affectedByActions: [
      '장애 등록 → 해결 완료까지의 시간',
      '배포 실패 시 자동 장애 등록 → 재배포 성공',
      '서비스 상태 변경 장애 → 복구',
    ],
  },
  cfr: {
    fullName: '변경 실패율 (Change Failure Rate)',
    description: '프로덕션 배포 중 장애나 롤백이 발생하는 비율입니다.',
    whatItMeasures: '배포 품질과 테스트 커버리지 수준',
    improvementTips: [
      '테스트 커버리지 확대 (단위/통합/E2E)',
      '스테이징 환경에서 충분한 검증',
      '코드 리뷰 품질 향상',
      '점진적 배포 전략 (카나리, 블루-그린)',
      '배포 전 자동화된 품질 게이트 추가',
    ],
    eliteTarget: '15% 미만',
    affectedByActions: [
      '파이프라인 → Deploy 단계 실패 (CFR 증가 ↑)',
      '파이프라인 → Deploy 단계 성공 (CFR 감소 ↓)',
      '계산식: 실패한 배포 수 / 전체 배포 수 × 100',
    ],
  },
};

// 메트릭 설명 팝오버 컴포넌트
const MetricInfoPopover: React.FC<{ metricKey: MetricKey }> = memo(
  ({ metricKey }) => {
    const info = METRIC_INFO[metricKey];

    const content = (
      <div style={{ maxWidth: 320 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
          {info.fullName}
        </Title>
        <Paragraph style={{ margin: 0, marginBottom: 12 }}>
          {info.description}
        </Paragraph>

        <div style={{ marginBottom: 12 }}>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            측정 대상
          </Text>
          <div style={{ paddingLeft: 16, marginTop: 4 }}>
            <Text>{info.whatItMeasures}</Text>
          </div>
        </div>

        {/* K8sControl에서 영향을 주는 작업 */}
        {info.affectedByActions && info.affectedByActions.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              backgroundColor: '#e6f7ff',
              borderRadius: 4,
              border: '1px solid #91d5ff',
            }}
          >
            <Text type='secondary' style={{ fontSize: 12, color: '#1890ff' }}>
              <ThunderboltOutlined style={{ marginRight: 4 }} />
              K8sControl 영향 요소
            </Text>
            <ul
              style={{
                paddingLeft: 16,
                margin: '6px 0 0 0',
                listStyleType: 'disc',
              }}
            >
              {info.affectedByActions.map((action, index) => (
                <li
                  key={index}
                  style={{ marginBottom: 2, fontSize: 12, color: '#262626' }}
                >
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <RocketOutlined style={{ marginRight: 4 }} />
            Elite 목표
          </Text>
          <div style={{ paddingLeft: 16, marginTop: 4 }}>
            <Tag color='green'>{info.eliteTarget}</Tag>
          </div>
        </div>

        <div>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <ToolOutlined style={{ marginRight: 4 }} />
            점수 개선 방법
          </Text>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0 0' }}>
            {info.improvementTips.map((tip, index) => (
              <li key={index} style={{ marginBottom: 4, fontSize: 13 }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );

    return (
      <Tooltip
        title={content}
        placement='bottom'
        overlayStyle={{ maxWidth: 360 }}
        color='white'
        overlayInnerStyle={{ color: '#000' }}
      >
        <QuestionCircleOutlined
          style={{
            color: '#8c8c8c',
            cursor: 'help',
            marginLeft: 4,
            fontSize: 12,
          }}
        />
      </Tooltip>
    );
  }
);
MetricInfoPopover.displayName = 'MetricInfoPopover';

// DORA 게이지 카드
const DORAGaugeCard: React.FC<{ metrics: DORAMetrics | null }> = memo(
  ({ metrics }) => {
    if (!metrics) {
      return (
        <Card style={{ height: '100%', borderRadius: 8, textAlign: 'center' }}>
          <Empty description='DORA 메트릭 데이터가 없습니다' />
        </Card>
      );
    }

    const gradeColor = GRADE_COLORS[metrics.overall_grade];

    return (
      <Card
        style={{
          height: '100%',
          borderRadius: 8,
          border: `2px solid ${gradeColor}30`,
          backgroundColor: `${gradeColor}05`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <TrophyOutlined
            style={{
              fontSize: '48px',
              color: gradeColor,
              marginBottom: SPACING.sm,
            }}
          />
          <Title level={2} style={{ margin: 0, color: gradeColor }}>
            {GRADE_LABELS[metrics.overall_grade]}
          </Title>
          <Text
            type='secondary'
            style={{ display: 'block', marginBottom: SPACING.sm }}
          >
            종합 등급
          </Text>
          <Progress
            type='circle'
            percent={metrics.health_score}
            strokeColor={gradeColor}
            format={() => (
              <span
                style={{ fontSize: '20px', fontWeight: 600, color: gradeColor }}
              >
                {metrics.health_score}
              </span>
            )}
            size={100}
          />
          <Text
            type='secondary'
            style={{ display: 'block', marginTop: SPACING.xs }}
          >
            건강도 점수
          </Text>
        </div>
      </Card>
    );
  }
);
DORAGaugeCard.displayName = 'DORAGaugeCard';

// 개별 DORA 메트릭 카드
const DORAMetricCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  value: number;
  unit: string;
  grade: DORAGrade;
  threshold: string;
  metricKey: MetricKey;
}> = memo(({ title, icon, value, unit, grade, threshold, metricKey }) => {
  const gradeColor = GRADE_COLORS[grade];

  const formatValue = () => {
    if (unit === '초') {
      return formatSeconds(value);
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toFixed(2)}${unit}`;
  };

  return (
    <Card
      size='small'
      style={{
        borderRadius: 8,
        border: `1px solid ${gradeColor}30`,
        backgroundColor: `${gradeColor}05`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: `${gradeColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: gradeColor,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {title}
            </Text>
            <MetricInfoPopover metricKey={metricKey} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <Text strong style={{ fontSize: '18px' }}>
              {formatValue()}
            </Text>
            <Tag color={gradeColor} style={{ marginLeft: 4 }}>
              {GRADE_LABELS[grade]}
            </Tag>
          </div>
          <Tooltip title={threshold}>
            <Text type='secondary' style={{ fontSize: '11px', cursor: 'help' }}>
              {threshold}
            </Text>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
});
DORAMetricCard.displayName = 'DORAMetricCard';

// 테이블 컬럼 헤더에 메트릭 설명 추가
const TableHeaderWithInfo: React.FC<{
  title: string;
  metricKey: MetricKey;
}> = ({ title, metricKey }) => (
  <Space size={2}>
    <span>{title}</span>
    <MetricInfoPopover metricKey={metricKey} />
  </Space>
);

// DORA 등급 기준 데이터
interface GradeCriteria {
  grade: DORAGrade;
  df: string;
  lt: string;
  mttr: string;
  cfr: string;
}

const GRADE_CRITERIA: GradeCriteria[] = [
  { grade: 'elite', df: '1+회/일', lt: '<1시간', mttr: '<1시간', cfr: '<15%' },
  { grade: 'high', df: '주 1회+', lt: '<1일', mttr: '<1일', cfr: '<30%' },
  { grade: 'medium', df: '월 1회+', lt: '<1주', mttr: '<1주', cfr: '<45%' },
  { grade: 'low', df: '<월 1회', lt: '≥1주', mttr: '≥1주', cfr: '≥45%' },
];

// DORA 등급 기준 테이블 컴포넌트
const DORAGradeCriteriaTable: React.FC = memo(() => {
  return (
    <Collapse
      size='small'
      ghost
      expandIcon={({ isActive }) => (
        <CaretRightOutlined
          rotate={isActive ? 90 : 0}
          style={{ color: '#8c8c8c' }}
        />
      )}
      items={[
        {
          key: '1',
          label: (
            <Text type='secondary' style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              DORA 등급 기준표 보기
            </Text>
          ),
          children: (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 600,
                        minWidth: 70,
                      }}
                    >
                      등급
                    </th>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 600,
                      }}
                    >
                      <Tooltip title='배포 빈도 (Deployment Frequency)'>
                        <span style={{ cursor: 'help' }}>DF</span>
                      </Tooltip>
                    </th>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 600,
                      }}
                    >
                      <Tooltip title='변경 리드 타임 (Lead Time for Changes)'>
                        <span style={{ cursor: 'help' }}>LT</span>
                      </Tooltip>
                    </th>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 600,
                      }}
                    >
                      <Tooltip title='평균 복구 시간 (Mean Time To Recovery)'>
                        <span style={{ cursor: 'help' }}>MTTR</span>
                      </Tooltip>
                    </th>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #f0f0f0',
                        fontWeight: 600,
                      }}
                    >
                      <Tooltip title='변경 실패율 (Change Failure Rate)'>
                        <span style={{ cursor: 'help' }}>CFR</span>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {GRADE_CRITERIA.map(criteria => (
                    <tr
                      key={criteria.grade}
                      style={{
                        backgroundColor: `${GRADE_COLORS[criteria.grade]}08`,
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <Tag
                          color={GRADE_COLORS[criteria.grade]}
                          style={{ margin: 0, fontWeight: 600 }}
                        >
                          {GRADE_LABELS[criteria.grade]}
                        </Tag>
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          borderBottom: '1px solid #f0f0f0',
                          color: '#595959',
                        }}
                      >
                        {criteria.df}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          borderBottom: '1px solid #f0f0f0',
                          color: '#595959',
                        }}
                      >
                        {criteria.lt}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          borderBottom: '1px solid #f0f0f0',
                          color: '#595959',
                        }}
                      >
                        {criteria.mttr}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          borderBottom: '1px solid #f0f0f0',
                          color: '#595959',
                        }}
                      >
                        {criteria.cfr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: '#f6f8fa',
                  borderRadius: 4,
                }}
              >
                <Text type='secondary' style={{ fontSize: 11 }}>
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  <strong>DF</strong>: 배포 빈도 | <strong>LT</strong>: 리드
                  타임 |<strong> MTTR</strong>: 평균 복구 시간 |{' '}
                  <strong>CFR</strong>: 변경 실패율
                </Text>
              </div>
            </div>
          ),
        },
      ]}
      style={{ backgroundColor: 'transparent', marginTop: SPACING.xs }}
    />
  );
});
DORAGradeCriteriaTable.displayName = 'DORAGradeCriteriaTable';

// 서비스별 DORA 테이블
const ServiceDORATable: React.FC<{ services: ServiceDORAMetrics[] }> = memo(
  ({ services }) => {
    const columns: ColumnsType<ServiceDORAMetrics> = [
      {
        title: '서비스',
        dataIndex: 'service_name',
        key: 'service_name',
        width: 150,
        ellipsis: true,
      },
      {
        title: '종합',
        dataIndex: ['metrics', 'overall_grade'],
        key: 'overall_grade',
        width: 80,
        align: 'center',
        render: (grade: DORAGrade) => (
          <Tag color={GRADE_COLORS[grade]}>{GRADE_LABELS[grade]}</Tag>
        ),
      },
      {
        title: (
          <TableHeaderWithInfo title='배포' metricKey='deployment_frequency' />
        ),
        dataIndex: ['metrics', 'deployment_frequency', 'grade'],
        key: 'df',
        width: 80,
        align: 'center',
        render: (grade: DORAGrade, record: ServiceDORAMetrics) => (
          <Tooltip
            title={`${record.metrics.deployment_frequency.value.toFixed(2)}회/일`}
          >
            <Tag color={GRADE_COLORS[grade]} style={{ fontSize: '10px' }}>
              {GRADE_LABELS[grade]}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: <TableHeaderWithInfo title='LT' metricKey='lead_time' />,
        dataIndex: ['metrics', 'lead_time', 'grade'],
        key: 'lt',
        width: 80,
        align: 'center',
        render: (grade: DORAGrade, record: ServiceDORAMetrics) => (
          <Tooltip title={formatSeconds(record.metrics.lead_time.value)}>
            <Tag color={GRADE_COLORS[grade]} style={{ fontSize: '10px' }}>
              {GRADE_LABELS[grade]}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: <TableHeaderWithInfo title='MTTR' metricKey='mttr' />,
        dataIndex: ['metrics', 'mttr', 'grade'],
        key: 'mttr',
        width: 80,
        align: 'center',
        render: (grade: DORAGrade, record: ServiceDORAMetrics) => (
          <Tooltip title={formatSeconds(record.metrics.mttr.value)}>
            <Tag color={GRADE_COLORS[grade]} style={{ fontSize: '10px' }}>
              {GRADE_LABELS[grade]}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: <TableHeaderWithInfo title='CFR' metricKey='cfr' />,
        dataIndex: ['metrics', 'change_failure_rate', 'grade'],
        key: 'cfr',
        width: 80,
        align: 'center',
        render: (grade: DORAGrade, record: ServiceDORAMetrics) => (
          <Tooltip
            title={`${record.metrics.change_failure_rate.value.toFixed(1)}%`}
          >
            <Tag color={GRADE_COLORS[grade]} style={{ fontSize: '10px' }}>
              {GRADE_LABELS[grade]}
            </Tag>
          </Tooltip>
        ),
      },
      {
        title: '점수',
        dataIndex: ['metrics', 'health_score'],
        key: 'health_score',
        width: 60,
        align: 'center',
        render: (score: number) => <Text strong>{score}</Text>,
      },
    ];

    if (services.length === 0) {
      return <Empty description='서비스별 메트릭이 없습니다' />;
    }

    return (
      <Table
        columns={columns}
        dataSource={services}
        rowKey='service_id'
        size='small'
        pagination={false}
        scroll={{ x: 600, y: 200 }}
      />
    );
  }
);
ServiceDORATable.displayName = 'ServiceDORATable';

// 장애 상세 모달
const IncidentDetailModal: React.FC<{
  incident: Incident | null;
  visible: boolean;
  onClose: () => void;
  onResolve: (id: number, resolutionNote?: string) => void;
  onAcknowledge: (id: number) => void;
}> = memo(({ incident, visible, onClose, onResolve, onAcknowledge }) => {
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  if (!incident) return null;

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve(incident.id, resolutionNote);
      setResolutionNote('');
      onClose();
    } finally {
      setResolving(false);
    }
  };

  const handleAcknowledge = () => {
    onAcknowledge(incident.id);
  };

  // 설명 텍스트 추출 (NullableString 처리)
  const descriptionText =
    incident.description?.Valid && incident.description?.String
      ? incident.description.String
      : null;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined
            style={{ color: SEVERITY_COLOR_MAP[incident.severity] }}
          />
          <span>장애 상세 정보</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <div style={{ marginBottom: 16 }}>
        {/* 심각도 및 상태 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Tag
            color={SEVERITY_COLOR_MAP[incident.severity]}
            style={{ fontSize: '12px' }}
          >
            {incident.severity.toUpperCase()}
          </Tag>
          <Badge
            status={incident.status === 'open' ? 'error' : 'warning'}
            text={incident.status === 'open' ? '미확인' : '확인됨'}
          />
        </div>

        {/* 제목 */}
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
          {incident.title}
        </Title>

        {/* 설명 */}
        {descriptionText && (
          <div
            style={{
              backgroundColor: '#f5f5f5',
              padding: '12px 16px',
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <Text type='secondary' style={{ fontSize: 11, display: 'block' }}>
              설명
            </Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{descriptionText}</Text>
          </div>
        )}

        {/* 메타 정보 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 16px',
            fontSize: 13,
          }}
        >
          <div>
            <Text type='secondary'>관련 서비스: </Text>
            <Text>{incident.service_name || '시스템 전체'}</Text>
          </div>
          <div>
            <Text type='secondary'>인프라: </Text>
            <Text>{incident.infra_name || '-'}</Text>
          </div>
          <div>
            <Text type='secondary'>발생 시간: </Text>
            <Text>{new Date(incident.started_at).toLocaleString('ko-KR')}</Text>
          </div>
          <div>
            <Text type='secondary'>유형: </Text>
            <Text>
              {incident.incident_type === 'deployment_failure'
                ? '배포 실패'
                : incident.incident_type === 'service_status_change'
                  ? '서비스 상태 변경'
                  : '수동 등록'}
            </Text>
          </div>
        </div>
      </div>

      {/* 해결 메모 입력 */}
      <div style={{ marginBottom: 16 }}>
        <Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>
          해결 메모 (선택)
        </Text>
        <Input.TextArea
          value={resolutionNote}
          onChange={e => setResolutionNote(e.target.value)}
          placeholder='장애 해결 내용이나 원인 분석을 입력하세요'
          rows={3}
        />
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose}>닫기</Button>
        {incident.status === 'open' && (
          <Button onClick={handleAcknowledge}>확인 처리</Button>
        )}
        <Button type='primary' onClick={handleResolve} loading={resolving}>
          해결 완료
        </Button>
      </div>
    </Modal>
  );
});
IncidentDetailModal.displayName = 'IncidentDetailModal';

// 활성 장애 목록
const ActiveIncidentList: React.FC<{
  incidents: Incident[];
  onResolve: (id: number) => void;
  onAcknowledge: (id: number) => void;
  onViewDetail: (incident: Incident) => void;
}> = memo(({ incidents, onResolve, onAcknowledge, onViewDetail }) => {
  if (incidents.length === 0) {
    return (
      <Alert
        message='활성 장애 없음'
        description='현재 처리가 필요한 장애가 없습니다.'
        type='success'
        showIcon
        icon={<CheckCircleOutlined />}
      />
    );
  }

  return (
    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
      {incidents.map(incident => {
        // 설명 텍스트 추출 (NullableString 처리)
        const descriptionText =
          incident.description?.Valid && incident.description?.String
            ? incident.description.String
            : null;

        return (
          <Card
            key={incident.id}
            size='small'
            hoverable
            onClick={() => onViewDetail(incident)}
            style={{
              marginBottom: SPACING.xs,
              borderRadius: 6,
              border: `1px solid ${SEVERITY_COLOR_MAP[incident.severity]}30`,
              backgroundColor: `${SEVERITY_COLOR_MAP[incident.severity]}05`,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Tag
                    color={SEVERITY_COLOR_MAP[incident.severity]}
                    style={{ fontSize: '10px' }}
                  >
                    {incident.severity.toUpperCase()}
                  </Tag>
                  <Badge
                    status={incident.status === 'open' ? 'error' : 'warning'}
                    text={incident.status === 'open' ? '미확인' : '확인됨'}
                  />
                </div>
                <Text strong style={{ fontSize: '13px', display: 'block' }}>
                  {incident.title}
                </Text>
                {/* 설명 미리보기 (1줄 줄임) */}
                {descriptionText && (
                  <Text
                    type='secondary'
                    style={{
                      fontSize: '11px',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      marginTop: 2,
                    }}
                  >
                    {descriptionText}
                  </Text>
                )}
                <Text type='secondary' style={{ fontSize: '11px' }}>
                  {incident.service_name || '시스템'} •{' '}
                  {new Date(incident.started_at).toLocaleString('ko-KR')}
                </Text>
              </div>
              <Space onClick={e => e.stopPropagation()}>
                {incident.status === 'open' && (
                  <Button
                    size='small'
                    onClick={() => onAcknowledge(incident.id)}
                  >
                    확인
                  </Button>
                )}
                <Button
                  type='primary'
                  size='small'
                  onClick={() => onResolve(incident.id)}
                >
                  해결
                </Button>
              </Space>
            </div>
          </Card>
        );
      })}
    </div>
  );
});
ActiveIncidentList.displayName = 'ActiveIncidentList';

// 메인 DORAHealthSection 컴포넌트
const DORAHealthSection: React.FC<DORAHealthSectionProps> = memo(
  ({ doraHealth, onRefresh }) => {
    const [incidentModalVisible, setIncidentModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();

    // 장애 상세 모달 상태
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
      null
    );
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // Null 안전성: services와 active_incidents가 null일 수 있음
    const services = doraHealth.services || [];
    const activeIncidents = doraHealth.active_incidents || [];

    const handleCreateIncident = async (values: {
      title: string;
      severity: IncidentSeverity;
      service_id?: number;
      description?: string;
    }) => {
      try {
        setCreating(true);
        await dashboardApi.createIncident({
          title: values.title,
          severity: values.severity,
          service_id: values.service_id,
          description: values.description,
        });
        setIncidentModalVisible(false);
        form.resetFields();
        onRefresh();
      } catch (err) {
        logger.error('장애 등록 실패:', err as Error);
      } finally {
        setCreating(false);
      }
    };

    const handleResolveIncident = async (
      id: number,
      resolutionNote?: string
    ) => {
      try {
        await dashboardApi.resolveIncident({
          id,
          resolution_note: resolutionNote,
        });
        onRefresh();
      } catch (err) {
        logger.error('장애 해결 처리 실패:', err as Error);
      }
    };

    const handleAcknowledgeIncident = async (id: number) => {
      try {
        await dashboardApi.acknowledgeIncident({ id });
        onRefresh();
      } catch (err) {
        logger.error('장애 확인 처리 실패:', err as Error);
      }
    };

    // 장애 상세 보기
    const handleViewIncidentDetail = (incident: Incident) => {
      setSelectedIncident(incident);
      setDetailModalVisible(true);
    };

    const handleCloseDetailModal = () => {
      setDetailModalVisible(false);
      setSelectedIncident(null);
    };

    const systemMetrics = doraHealth.system;

    return (
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: '#52c41a' }} />
            <span>DORA 건강도</span>
            {activeIncidents.length > 0 && (
              <Badge
                count={activeIncidents.length}
                style={{ backgroundColor: '#ff4d4f' }}
              />
            )}
          </Space>
        }
        extra={
          <Button
            type='primary'
            icon={<PlusOutlined />}
            size='small'
            onClick={() => setIncidentModalVisible(true)}
          >
            장애 등록
          </Button>
        }
        style={{ marginBottom: SPACING.md, borderRadius: 12 }}
      >
        <Row gutter={[SPACING.sm, SPACING.sm]}>
          {/* 전체 시스템 DORA 게이지 */}
          <Col xs={24} md={6}>
            <DORAGaugeCard metrics={systemMetrics} />
          </Col>

          {/* 개별 메트릭 카드들 */}
          <Col xs={24} md={18}>
            <Row gutter={[SPACING.sm, SPACING.sm]}>
              <Col xs={12} md={6}>
                <DORAMetricCard
                  title='배포 빈도'
                  icon={<ThunderboltOutlined />}
                  value={systemMetrics?.deployment_frequency.value || 0}
                  unit='회/일'
                  grade={systemMetrics?.deployment_frequency.grade || 'low'}
                  threshold={
                    systemMetrics?.deployment_frequency.threshold || '-'
                  }
                  metricKey='deployment_frequency'
                />
              </Col>
              <Col xs={12} md={6}>
                <DORAMetricCard
                  title='Lead Time'
                  icon={<ClockCircleOutlined />}
                  value={systemMetrics?.lead_time.value || 0}
                  unit='초'
                  grade={systemMetrics?.lead_time.grade || 'low'}
                  threshold={systemMetrics?.lead_time.threshold || '-'}
                  metricKey='lead_time'
                />
              </Col>
              <Col xs={12} md={6}>
                <DORAMetricCard
                  title='MTTR'
                  icon={<BugOutlined />}
                  value={systemMetrics?.mttr.value || 0}
                  unit='초'
                  grade={systemMetrics?.mttr.grade || 'low'}
                  threshold={systemMetrics?.mttr.threshold || '-'}
                  metricKey='mttr'
                />
              </Col>
              <Col xs={12} md={6}>
                <DORAMetricCard
                  title='CFR'
                  icon={<PercentageOutlined />}
                  value={systemMetrics?.change_failure_rate.value || 0}
                  unit='%'
                  grade={systemMetrics?.change_failure_rate.grade || 'low'}
                  threshold={
                    systemMetrics?.change_failure_rate.threshold || '-'
                  }
                  metricKey='cfr'
                />
              </Col>
            </Row>

            {/* DORA 등급 기준 안내 - 접이식 테이블 */}
            <DORAGradeCriteriaTable />
          </Col>
        </Row>

        {/* 서비스별 DORA & 활성 장애 */}
        <Row
          gutter={[SPACING.sm, SPACING.sm]}
          style={{ marginTop: SPACING.md }}
        >
          <Col xs={24} lg={14}>
            <Card
              size='small'
              title={
                <Space>
                  <span>서비스별 DORA</span>
                  <Tag color='blue'>{services.length}개</Tag>
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <ServiceDORATable services={services} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              size='small'
              title={
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  <span>활성 장애</span>
                  {activeIncidents.length > 0 && (
                    <Badge
                      count={activeIncidents.length}
                      style={{ backgroundColor: '#ff4d4f' }}
                    />
                  )}
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <ActiveIncidentList
                incidents={activeIncidents}
                onResolve={id => handleResolveIncident(id)}
                onAcknowledge={handleAcknowledgeIncident}
                onViewDetail={handleViewIncidentDetail}
              />
            </Card>
          </Col>
        </Row>

        {/* 장애 등록 모달 */}
        <Modal
          title='수동 장애 등록'
          open={incidentModalVisible}
          onCancel={() => setIncidentModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout='vertical'
            onFinish={handleCreateIncident}
            initialValues={{ severity: 'medium' }}
          >
            <Form.Item
              name='title'
              label='장애 제목'
              rules={[{ required: true, message: '장애 제목을 입력하세요' }]}
            >
              <Input placeholder='장애 제목을 입력하세요' />
            </Form.Item>
            <Form.Item
              name='service_id'
              label='관련 서비스'
              tooltip='배포 이력이 있는 서비스만 선택 가능합니다. 선택하면 해당 서비스의 MTTR 계산에 반영됩니다.'
            >
              <Select
                placeholder='서비스 선택 (선택사항)'
                allowClear
                showSearch
                optionFilterProp='children'
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {services.map(svc => (
                  <Select.Option key={svc.service_id} value={svc.service_id}>
                    {svc.service_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name='severity'
              label='심각도'
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value='critical'>Critical - 긴급</Select.Option>
                <Select.Option value='high'>High - 높음</Select.Option>
                <Select.Option value='medium'>Medium - 보통</Select.Option>
                <Select.Option value='low'>Low - 낮음</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name='description' label='설명 (선택)'>
              <TextArea rows={3} placeholder='장애에 대한 상세 설명' />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIncidentModalVisible(false)}>
                  취소
                </Button>
                <Button type='primary' htmlType='submit' loading={creating}>
                  등록
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 장애 상세 모달 */}
        <IncidentDetailModal
          incident={selectedIncident}
          visible={detailModalVisible}
          onClose={handleCloseDetailModal}
          onResolve={handleResolveIncident}
          onAcknowledge={handleAcknowledgeIncident}
        />
      </Card>
    );
  }
);

DORAHealthSection.displayName = 'DORAHealthSection';

export default DORAHealthSection;
