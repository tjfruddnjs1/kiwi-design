import React from 'react';
import {
  CheckCircleOutlined,
  StopOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  HddOutlined,
  WifiOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import {
  Row,
  Col,
  Card,
  Statistic,
  Descriptions,
  Tag,
  Progress,
  Typography,
  Divider,
  Empty,
  Space,
} from 'antd';
import { InfraWithNodes } from '../../types';
import { KubernetesInfo } from './InfraKubernetesSetting';

interface InfraKubernetesInfoTabProps {
  selectedInfra: InfraWithNodes;
  info: KubernetesInfo;
  infoLoading: boolean;
}

// 바이트를 사람이 읽기 쉬운 형식으로 변환하는 유틸리티 함수
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const InfraKubernetesInfoTab: React.FC<InfraKubernetesInfoTabProps> = ({
  selectedInfra,
  info,
  infoLoading,
}) => {
  const { Text } = Typography;

  return (
    <div style={{ padding: '8px 0' }}>
      {/* === 섹션 1: 인프라 기본 정보 및 연결 구성 === */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 좌측: 기본 정보 */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined /> 환경 기본 정보
              </Space>
            }
            bordered={true}
            style={{ height: '100%' }}
            extra={<Tag color='blue'>{selectedInfra.type.toUpperCase()}</Tag>}
          >
            <Descriptions column={1} size='small' bordered>
              <Descriptions.Item label='환경 이름'>
                <Text strong>{selectedInfra.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label='설명'>
                <div
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {selectedInfra.info || (
                    <Text type='secondary' italic>
                      설명 없음
                    </Text>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label='생성일'>
                {new Date(selectedInfra.created_at).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label='등록된 노드'>
                {selectedInfra.nodes.length} 개
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* === 섹션 2: 런타임 통계 (데이터 있을 때만 표시) === */}
      {selectedInfra && info ? (
        <>
          <Divider orientation='left' style={{ borderColor: '#d9d9d9' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              런타임 리소스 현황
            </span>
          </Divider>

          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={false}
                style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
              >
                <Statistic
                  title='실행 중인 Pod'
                  value={info?.runningPods}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                  suffix={`/ ${info?.totalPods}`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={false}
                style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}
              >
                <Statistic
                  title='비정상/중지 Pod'
                  value={info?.totalPods - info?.runningPods}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<StopOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={false}
                style={{ background: '#e6f7ff', border: '1px solid #91caff' }}
              >
                <Statistic
                  title='워크로드 총계'
                  value={info?.totalPods}
                  valueStyle={{ color: '#096dd9' }}
                  prefix={<AppstoreOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={false}
                style={{ background: '#fff7e6', border: '1px solid #ffd591' }}
              >
                <Statistic
                  title='컨테이너 이미지'
                  value={info?.imageCount}
                  valueStyle={{ color: '#d46b08' }}
                  prefix={<DatabaseOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <div style={{ margin: '16px 0' }} />

          {/* 런타임 상세 정보 */}
          <Card
            title={
              <Space>
                <CloudServerOutlined /> 런타임 상세 정보
              </Space>
            }
            bordered={true}
            style={{ marginBottom: 16 }}
          >
            <Descriptions
              column={{ xxl: 4, xl: 4, lg: 3, md: 2, sm: 2, xs: 1 }}
              size='small'
            >
              <Descriptions.Item label='런타임 유형'>
                <Tag color='geekblue'>{info?.runtimeType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label='아키텍처'>
                {info?.architecture}
              </Descriptions.Item>
              <Descriptions.Item label='버전'>
                {info?.runtimeVersion}
              </Descriptions.Item>
              <Descriptions.Item label='API 버전'>
                {info?.apiServerVersion}
              </Descriptions.Item>
              <Descriptions.Item label='OS'>{info?.os}</Descriptions.Item>
              <Descriptions.Item label='커널'>
                {info?.kernelVersion}
              </Descriptions.Item>
              <Descriptions.Item label='CPU'>
                {info?.totalCpu}
              </Descriptions.Item>
              <Descriptions.Item label='메모리'>
                {info?.totalMemory}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* === 섹션 3: 시스템 모니터링 (4열 가로 배치) === */}
          <Divider
            orientation='left'
            style={{ borderColor: '#d9d9d9', marginTop: 8, marginBottom: 16 }}
          >
            <span style={{ fontSize: '14px', color: '#666' }}>
              시스템 모니터링
            </span>
          </Divider>

          <Row gutter={[16, 16]}>
            {/* 디스크 사용량 */}
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={true}
                style={{ textAlign: 'center', height: '100%' }}
              >
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  <HddOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                  <Text strong style={{ fontSize: 12 }}>
                    디스크
                  </Text>
                  <Progress
                    type='circle'
                    percent={info?.mainNodeStorage?.usagePercentage || 0}
                    size={80}
                    strokeColor={
                      (info?.mainNodeStorage?.usagePercentage || 0) > 80
                        ? '#ff4d4f'
                        : (info?.mainNodeStorage?.usagePercentage || 0) > 60
                          ? '#faad14'
                          : '#52c41a'
                    }
                    format={percent => `${percent}%`}
                  />
                  <Tag
                    color={
                      (info?.mainNodeStorage?.usagePercentage || 0) > 80
                        ? 'red'
                        : 'green'
                    }
                    style={{ fontSize: 11 }}
                  >
                    {(info?.mainNodeStorage?.usagePercentage || 0) > 80
                      ? '주의'
                      : '양호'}
                  </Tag>
                </Space>
              </Card>
            </Col>

            {/* CPU 사용량 */}
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={true}
                style={{ textAlign: 'center', height: '100%' }}
              >
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  <DashboardOutlined
                    style={{ fontSize: 20, color: '#722ed1' }}
                  />
                  <Text strong style={{ fontSize: 12 }}>
                    CPU
                  </Text>
                  <Progress
                    type='circle'
                    percent={Math.round(info?.cpuUsage || 0)}
                    size={80}
                    strokeColor={
                      (info?.cpuUsage || 0) > 80
                        ? '#ff4d4f'
                        : (info?.cpuUsage || 0) > 60
                          ? '#faad14'
                          : '#52c41a'
                    }
                    format={percent => `${percent}%`}
                  />
                  <Tag
                    color={
                      (info?.cpuUsage || 0) > 80
                        ? 'red'
                        : (info?.cpuUsage || 0) > 60
                          ? 'orange'
                          : 'green'
                    }
                    style={{ fontSize: 11 }}
                  >
                    {(info?.cpuUsage || 0) > 80
                      ? '높음'
                      : (info?.cpuUsage || 0) > 60
                        ? '보통'
                        : '양호'}
                  </Tag>
                </Space>
              </Card>
            </Col>

            {/* 메모리 사용량 */}
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={true}
                style={{ textAlign: 'center', height: '100%' }}
              >
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  <DatabaseOutlined
                    style={{ fontSize: 20, color: '#13c2c2' }}
                  />
                  <Text strong style={{ fontSize: 12 }}>
                    메모리
                  </Text>
                  <Progress
                    type='circle'
                    percent={Math.round(info?.memoryUsage || 0)}
                    size={80}
                    strokeColor={
                      (info?.memoryUsage || 0) > 80
                        ? '#ff4d4f'
                        : (info?.memoryUsage || 0) > 60
                          ? '#faad14'
                          : '#52c41a'
                    }
                    format={percent => `${percent}%`}
                  />
                  <div style={{ fontSize: '10px', color: '#888' }}>
                    {formatBytes(info?.memoryUsed || 0)} /{' '}
                    {formatBytes(info?.memoryTotal || 0)}
                  </div>
                </Space>
              </Card>
            </Col>

            {/* 네트워크 트래픽 */}
            <Col xs={12} sm={6}>
              <Card
                size='small'
                bordered={true}
                style={{ textAlign: 'center', height: '100%' }}
              >
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  <WifiOutlined style={{ fontSize: 20, color: '#eb2f96' }} />
                  <Text strong style={{ fontSize: 12 }}>
                    네트워크
                  </Text>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ marginBottom: 4 }}>
                      <ArrowDownOutlined
                        style={{ color: '#52c41a', fontSize: 12 }}
                      />
                      <Text style={{ fontSize: 11, marginLeft: 4 }}>
                        {formatBytes(info?.networkRx || 0)}
                      </Text>
                    </div>
                    <div>
                      <ArrowUpOutlined
                        style={{ color: '#1890ff', fontSize: 12 }}
                      />
                      <Text style={{ fontSize: 11, marginLeft: 4 }}>
                        {formatBytes(info?.networkTx || 0)}
                      </Text>
                    </div>
                  </div>
                  <Tag color='cyan' style={{ fontSize: 11 }}>
                    누적
                  </Tag>
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      ) : infoLoading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='런타임 상세 정보를 불러오는 중입니다.'
          style={{ marginTop: 40 }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='등록된 장비가 없습니다.'
          style={{ marginTop: 40 }}
        />
      )}
    </div>
  );
};

export default InfraKubernetesInfoTab;
