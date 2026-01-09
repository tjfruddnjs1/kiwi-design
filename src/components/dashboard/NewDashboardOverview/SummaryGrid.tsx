/**
 * SummaryGrid - 요약 카드 그리드 컴포넌트
 * 장비, 런타임, 백업, 서비스, 데이터베이스 요약 표시
 */
import React, { memo } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Progress,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import {
  DesktopOutlined,
  CloudServerOutlined,
  CloudOutlined,
  SaveOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type {
  DeviceSummary,
  RuntimeSummary,
  BackupSummary,
  ServicesSummary,
  DatabaseSummary,
} from '../../../types/dashboard';

const { Text } = Typography;

interface SummaryGridProps {
  devices: DeviceSummary;
  runtime: RuntimeSummary;
  backup: BackupSummary;
  services: ServicesSummary;
  database: DatabaseSummary;
}

// 디자인 상수
const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
};

const COLORS = {
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
};

// 개별 Summary 카드 컴포넌트들
const DeviceSummaryCard: React.FC<{ data: DeviceSummary }> = memo(
  ({ data }) => {
    const healthPercent =
      data.total_devices > 0
        ? Math.round((data.online_devices / data.total_devices) * 100)
        : 0;

    return (
      <Card
        size='small'
        title={
          <Space>
            <DesktopOutlined style={{ color: COLORS.info }} />
            <span>장비 관리</span>
          </Space>
        }
        style={{ height: '100%', borderRadius: 8 }}
      >
        <Statistic
          title='총 장비'
          value={data.total_devices}
          suffix='대'
          valueStyle={{ fontSize: '24px', fontWeight: 600 }}
        />
        <Progress
          percent={healthPercent}
          size='small'
          strokeColor={
            healthPercent >= 80
              ? COLORS.success
              : healthPercent >= 50
                ? COLORS.warning
                : COLORS.error
          }
          style={{ marginTop: SPACING.xs, marginBottom: SPACING.xs }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <Tooltip title='온라인 장비'>
            <Space size={4}>
              <CheckCircleOutlined style={{ color: COLORS.success }} />
              <Text type='secondary'>{data.online_devices}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='오프라인 장비'>
            <Space size={4}>
              <CloseCircleOutlined style={{ color: COLORS.error }} />
              <Text type='secondary'>{data.offline_devices}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='경고 장비'>
            <Space size={4}>
              <ExclamationCircleOutlined style={{ color: COLORS.warning }} />
              <Text type='secondary'>{data.warning_devices}</Text>
            </Space>
          </Tooltip>
        </div>
      </Card>
    );
  }
);
DeviceSummaryCard.displayName = 'DeviceSummaryCard';

const RuntimeSummaryCard: React.FC<{ data: RuntimeSummary }> = memo(
  ({ data }) => {
    const healthPercent =
      data.total_nodes > 0
        ? Math.round((data.healthy_nodes / data.total_nodes) * 100)
        : 0;

    return (
      <Card
        size='small'
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#722ed1' }} />
            <span>런타임 환경</span>
          </Space>
        }
        style={{ height: '100%', borderRadius: 8 }}
      >
        <Statistic
          title='인프라'
          value={data.total_infras}
          suffix='개'
          valueStyle={{ fontSize: '24px', fontWeight: 600 }}
        />
        <div style={{ marginTop: SPACING.xs, marginBottom: SPACING.xs }}>
          <Space wrap size={4}>
            {data.kubernetes_count > 0 && (
              <Tag color='blue' icon={<CloudOutlined />}>
                K8s: {data.kubernetes_count}
              </Tag>
            )}
            {data.docker_count > 0 && (
              <Tag color='cyan' icon={<CloudServerOutlined />}>
                Docker: {data.docker_count}
              </Tag>
            )}
            {data.podman_count > 0 && (
              <Tag color='purple'>Podman: {data.podman_count}</Tag>
            )}
          </Space>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <Text type='secondary'>노드: {data.total_nodes}개</Text>
          <Space size={4}>
            <CheckCircleOutlined style={{ color: COLORS.success }} />
            <Text type='secondary'>정상: {data.healthy_nodes}</Text>
          </Space>
        </div>
      </Card>
    );
  }
);
RuntimeSummaryCard.displayName = 'RuntimeSummaryCard';

const BackupSummaryCard: React.FC<{ data: BackupSummary }> = memo(
  ({ data }) => {
    const successRate =
      data.total_backups > 0
        ? Math.round((data.successful_backups / data.total_backups) * 100)
        : 100;

    const formatLastBackup = (timeStr: string) => {
      if (!timeStr) return '-';
      try {
        const date = new Date(timeStr);
        return date.toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return timeStr;
      }
    };

    return (
      <Card
        size='small'
        title={
          <Space>
            <SaveOutlined style={{ color: '#13c2c2' }} />
            <span>백업 관리</span>
          </Space>
        }
        style={{ height: '100%', borderRadius: 8 }}
      >
        <Statistic
          title='총 백업'
          value={data.total_backups}
          suffix='개'
          valueStyle={{ fontSize: '24px', fontWeight: 600 }}
        />
        <Progress
          percent={successRate}
          size='small'
          strokeColor={
            successRate >= 90
              ? COLORS.success
              : successRate >= 70
                ? COLORS.warning
                : COLORS.error
          }
          style={{ marginTop: SPACING.xs, marginBottom: SPACING.xs }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <Tooltip title='성공'>
            <Space size={4}>
              <CheckCircleOutlined style={{ color: COLORS.success }} />
              <Text type='secondary'>{data.successful_backups}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='실패'>
            <Space size={4}>
              <CloseCircleOutlined style={{ color: COLORS.error }} />
              <Text type='secondary'>{data.failed_backups}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='진행중'>
            <Space size={4}>
              <SyncOutlined
                style={{ color: COLORS.info }}
                spin={data.pending_backups > 0}
              />
              <Text type='secondary'>{data.pending_backups}</Text>
            </Space>
          </Tooltip>
        </div>
        {data.last_backup_time && (
          <div style={{ marginTop: SPACING.xs, fontSize: '11px' }}>
            <Space size={4}>
              <ClockCircleOutlined />
              <Text type='secondary'>
                마지막: {formatLastBackup(data.last_backup_time)}
              </Text>
            </Space>
          </div>
        )}
      </Card>
    );
  }
);
BackupSummaryCard.displayName = 'BackupSummaryCard';

const ServiceSummaryCard: React.FC<{ data: ServicesSummary }> = memo(
  ({ data }) => {
    const deployRate =
      data.total_services > 0
        ? Math.round((data.deployed_services / data.total_services) * 100)
        : 0;

    return (
      <Card
        size='small'
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#eb2f96' }} />
            <span>서비스 관리</span>
          </Space>
        }
        style={{ height: '100%', borderRadius: 8 }}
      >
        <Statistic
          title='총 서비스'
          value={data.total_services}
          suffix='개'
          valueStyle={{ fontSize: '24px', fontWeight: 600 }}
        />
        <Progress
          percent={deployRate}
          size='small'
          strokeColor={COLORS.info}
          format={() => `${deployRate}% 배포됨`}
          style={{ marginTop: SPACING.xs, marginBottom: SPACING.xs }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <Tooltip title='배포됨'>
            <Space size={4}>
              <CheckCircleOutlined style={{ color: COLORS.success }} />
              <Text type='secondary'>{data.deployed_services}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='대기중'>
            <Space size={4}>
              <ClockCircleOutlined style={{ color: COLORS.warning }} />
              <Text type='secondary'>{data.pending_services}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='활성 빌드'>
            <Space size={4}>
              <SyncOutlined
                style={{ color: COLORS.info }}
                spin={data.active_builds > 0}
              />
              <Text type='secondary'>{data.active_builds}</Text>
            </Space>
          </Tooltip>
        </div>
      </Card>
    );
  }
);
ServiceSummaryCard.displayName = 'ServiceSummaryCard';

const DatabaseSummaryCard: React.FC<{ data: DatabaseSummary }> = memo(
  ({ data }) => {
    const healthPercent =
      data.total_connections > 0
        ? Math.round((data.active_connections / data.total_connections) * 100)
        : 0;

    return (
      <Card
        size='small'
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#fa8c16' }} />
            <span>데이터베이스</span>
          </Space>
        }
        style={{ height: '100%', borderRadius: 8 }}
      >
        <Statistic
          title='연결'
          value={data.total_connections}
          suffix='개'
          valueStyle={{ fontSize: '24px', fontWeight: 600 }}
        />
        <Progress
          percent={healthPercent}
          size='small'
          strokeColor={
            healthPercent >= 80
              ? COLORS.success
              : healthPercent >= 50
                ? COLORS.warning
                : COLORS.error
          }
          style={{ marginTop: SPACING.xs, marginBottom: SPACING.xs }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <Tooltip title='활성 연결'>
            <Space size={4}>
              <CheckCircleOutlined style={{ color: COLORS.success }} />
              <Text type='secondary'>{data.active_connections}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='실패 연결'>
            <Space size={4}>
              <CloseCircleOutlined style={{ color: COLORS.error }} />
              <Text type='secondary'>{data.failed_connections}</Text>
            </Space>
          </Tooltip>
          <Tooltip title='동기화 중'>
            <Space size={4}>
              <SyncOutlined
                style={{ color: COLORS.info }}
                spin={data.active_syncs > 0}
              />
              <Text type='secondary'>{data.active_syncs}</Text>
            </Space>
          </Tooltip>
        </div>
      </Card>
    );
  }
);
DatabaseSummaryCard.displayName = 'DatabaseSummaryCard';

// 메인 SummaryGrid 컴포넌트
const SummaryGrid: React.FC<SummaryGridProps> = memo(
  ({ devices, runtime, backup, services, database }) => {
    return (
      <Row
        gutter={[SPACING.sm, SPACING.sm]}
        style={{ marginBottom: SPACING.md }}
      >
        <Col xs={24} sm={12} lg={8} xl={4}>
          <DeviceSummaryCard data={devices} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={5}>
          <RuntimeSummaryCard data={runtime} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={5}>
          <BackupSummaryCard data={backup} />
        </Col>
        <Col xs={24} sm={12} lg={12} xl={5}>
          <ServiceSummaryCard data={services} />
        </Col>
        <Col xs={24} sm={12} lg={12} xl={5}>
          <DatabaseSummaryCard data={database} />
        </Col>
      </Row>
    );
  }
);

SummaryGrid.displayName = 'SummaryGrid';

export default SummaryGrid;
