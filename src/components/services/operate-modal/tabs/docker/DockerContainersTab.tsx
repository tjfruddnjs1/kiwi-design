import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Alert,
  Empty,
  Progress,
  Typography,
  Popconfirm,
  Tooltip,
  Switch,
} from 'antd';
import {
  BarChartOutlined,
  SyncOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type {
  DockerContainerInfo,
  ContainerStats,
} from '../../../../../lib/api/docker';

const { Text } = Typography;

interface DockerContainersTabProps {
  containers: DockerContainerInfo[];
  loadingContainers: boolean;
  allContainerStats: ContainerStats[];
  loadingAllStats: boolean;
  containerActionLoading: string | null;
  onLoadStats: () => void;
  onRefresh: () => void;
  onContainerRestart: (containerId: string, containerName: string) => void;
}

/**
 * Docker 컨테이너 목록 탭
 * 컨테이너 목록 조회, 리소스 통계, 컨테이너 제어 기능을 제공합니다.
 */
const DockerContainersTab: React.FC<DockerContainersTabProps> = ({
  containers,
  loadingContainers,
  allContainerStats,
  loadingAllStats,
  containerActionLoading,
  onLoadStats,
  onRefresh,
  onContainerRestart,
}) => {
  // 자동 새로고침 상태
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  // 통계 로드 시도 여부 추적 (무한 루프 방지)
  const hasAttemptedStatsLoad = useRef(false);

  // 자동 새로고침 interval (30초)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (autoRefresh && containers.length > 0) {
      intervalId = setInterval(() => {
        onRefresh();
        setLastRefreshTime(new Date());
      }, 30000); // 30초마다 갱신
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, containers.length, onRefresh]);

  // 수동 새로고침 핸들러
  const handleManualRefresh = () => {
    onRefresh();
    setLastRefreshTime(new Date());
  };

  // 컨테이너 로드 시 자동으로 통계 로드 (1회만 시도)
  useEffect(() => {
    if (
      containers.length > 0 &&
      allContainerStats.length === 0 &&
      !loadingAllStats &&
      !hasAttemptedStatsLoad.current
    ) {
      hasAttemptedStatsLoad.current = true;
      onLoadStats();
    }
  }, [
    containers.length,
    allContainerStats.length,
    loadingAllStats,
    onLoadStats,
  ]);

  // 컨테이너 목록이 변경되면 통계 로드 시도 플래그 리셋
  useEffect(() => {
    hasAttemptedStatsLoad.current = false;
  }, [containers]);

  /**
   * 컨테이너 ID로 통계 찾기 헬퍼 함수
   */
  const getStatsForContainer = (
    containerId: string
  ): ContainerStats | undefined => {
    return allContainerStats.find(
      s =>
        s.container_id === containerId ||
        s.container_id.startsWith(containerId.substring(0, 12))
    );
  };

  return (
    <div>
      <Alert
        message='컨테이너 관리'
        description='Docker/Podman 컨테이너를 관리합니다. 리소스 통계 버튼을 클릭하면 CPU/메모리 사용량을 확인할 수 있습니다.'
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Card
        title={
          <Space>
            <span>컨테이너 목록</span>
            {lastRefreshTime && (
              <Text
                type='secondary'
                style={{ fontSize: 12, fontWeight: 'normal' }}
              >
                (마지막 갱신: {lastRefreshTime.toLocaleTimeString()})
              </Text>
            )}
          </Space>
        }
        loading={loadingContainers}
        extra={
          <Space>
            <Tooltip title='30초마다 자동으로 컨테이너 상태를 갱신합니다'>
              <Space>
                <Text style={{ fontSize: 14 }}>자동 갱신</Text>
                <Switch
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                  size='small'
                  disabled={containers.length === 0}
                />
              </Space>
            </Tooltip>
            <Button
              icon={<BarChartOutlined />}
              onClick={onLoadStats}
              loading={loadingAllStats}
              disabled={containers.length === 0}
            >
              리소스 통계
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleManualRefresh}
              loading={loadingContainers}
            >
              새로고침
            </Button>
          </Space>
        }
      >
        {containers.length > 0 ? (
          <Table
            dataSource={containers}
            columns={[
              {
                title: '컨테이너 ID',
                dataIndex: 'id',
                key: 'id',
                width: 120,
                render: (id: string) => (
                  <Tag color='blue'>{id.substring(0, 12)}</Tag>
                ),
              },
              {
                title: '이름',
                dataIndex: 'name',
                key: 'name',
                width: 180,
              },
              {
                title: '이미지',
                dataIndex: 'image',
                key: 'image',
                ellipsis: {
                  showTitle: false,
                },
                render: (image: string) => (
                  <Tooltip placement='topLeft' title={image}>
                    {image}
                  </Tooltip>
                ),
              },
              {
                title: '상태',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (status: string) => {
                  const isRunning = status.toLowerCase().includes('up');
                  return (
                    <Tag color={isRunning ? 'green' : 'red'}>{status}</Tag>
                  );
                },
              },
              {
                title: 'CPU',
                key: 'cpu',
                width: 100,
                render: (_: unknown, record: DockerContainerInfo) => {
                  const stats = getStatsForContainer(record.id);
                  if (!stats) return <Text type='secondary'>-</Text>;
                  const cpuValue = parseFloat(
                    stats.cpu_percent.replace('%', '')
                  );
                  return (
                    <Progress
                      percent={cpuValue}
                      size='small'
                      strokeColor={
                        cpuValue > 80
                          ? '#ff4d4f'
                          : cpuValue > 50
                            ? '#faad14'
                            : '#52c41a'
                      }
                      format={() => stats.cpu_percent}
                    />
                  );
                },
              },
              {
                title: '메모리',
                key: 'memory',
                width: 150,
                render: (_: unknown, record: DockerContainerInfo) => {
                  const stats = getStatsForContainer(record.id);
                  if (!stats) return <Text type='secondary'>-</Text>;
                  const memValue = parseFloat(
                    stats.memory_percent.replace('%', '')
                  );
                  return (
                    <div>
                      <Progress
                        percent={memValue}
                        size='small'
                        strokeColor={
                          memValue > 80
                            ? '#ff4d4f'
                            : memValue > 50
                              ? '#faad14'
                              : '#52c41a'
                        }
                        format={() => stats.memory_percent}
                      />
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        {stats.memory_usage}
                      </Text>
                    </div>
                  );
                },
              },
              {
                title: '네트워크',
                key: 'network',
                width: 120,
                render: (_: unknown, record: DockerContainerInfo) => {
                  const stats = getStatsForContainer(record.id);
                  if (!stats) return <Text type='secondary'>-</Text>;
                  return (
                    <Tooltip
                      title={`입력: ${stats.network_io.split('/')[0].trim()}, 출력: ${stats.network_io.split('/')[1].trim()}`}
                    >
                      <Text style={{ fontSize: 11 }}>{stats.network_io}</Text>
                    </Tooltip>
                  );
                },
              },
              {
                title: '포트',
                dataIndex: 'ports',
                key: 'ports',
                width: 150,
                ellipsis: {
                  showTitle: false,
                },
                render: (ports: string) => (
                  <Tooltip placement='topLeft' title={ports}>
                    {ports}
                  </Tooltip>
                ),
              },
              {
                title: '작업',
                key: 'actions',
                width: 100,
                render: (_: unknown, record: DockerContainerInfo) => {
                  const isLoading = containerActionLoading === record.id;
                  return (
                    <Popconfirm
                      title='컨테이너 재시작'
                      description={`"${record.name}" 컨테이너를 재시작하시겠습니까?`}
                      onConfirm={() =>
                        onContainerRestart(record.id, record.name)
                      }
                      okText='재시작'
                      cancelText='취소'
                    >
                      <Button
                        size='small'
                        type='link'
                        icon={<SyncOutlined spin={isLoading} />}
                        loading={isLoading}
                      >
                        재시작
                      </Button>
                    </Popconfirm>
                  );
                },
              },
            ]}
            rowKey='id'
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        ) : (
          <Empty description='컨테이너가 없습니다' />
        )}
      </Card>
    </div>
  );
};

export default DockerContainersTab;
