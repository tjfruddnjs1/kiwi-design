import React from 'react';
import { Modal, Card, Row, Col, Statistic, Button, Spin, Empty } from 'antd';

export interface ServerResource {
  host_info: {
    hostname: string;
    os: string;
    kernel: string;
  };
  cpu: {
    model: string;
    cores: string;
    usage_percent: string;
  };
  memory: {
    total_mb: string;
    used_mb: string;
    free_mb: string;
    usage_percent: string;
  };
  disk: {
    root_total: string;
    root_used: string;
    root_free: string;
    root_usage_percent: string;
  };
}

interface ServerResourceModalProps {
  visible: boolean;
  onClose?: () => void;
  onCancel?: () => void; // 호환성 지원
  resource: ServerResource | null;
  loading: boolean;
  server?: { name?: string; ip: string };
  serverName?: string; // 호환성: 문자열로 서버명을 직접 전달
}

const ServerResourceModal: React.FC<ServerResourceModalProps> = ({
  visible,
  onClose,
  onCancel,
  resource,
  loading,
  server,
  serverName,
}) => {
  const getUsageColor = (usage: string) => {
    const usageValue = parseInt(usage);

    if (usageValue > 80) return '#cf1322';
    if (usageValue > 60) return '#faad14';

    return '#3f8600';
  };

  return (
    <Modal
      title={`서버 리소스 정보 - ${
        serverName || server?.name || server?.ip || '알 수 없음'
      }`}
      open={visible}
      onCancel={onClose || onCancel}
      footer={[
        <Button key='close' onClick={onClose || onCancel}>
          닫기
        </Button>,
      ]}
      width={900}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <Spin size='large' />
          <div style={{ marginTop: '15px' }}>
            리소스 정보를 가져오는 중입니다...
          </div>
        </div>
      ) : resource ? (
        <div>
          <Card title='시스템 정보' style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title='호스트명'
                  value={resource.host_info.hostname}
                />
              </Col>
              <Col span={8}>
                <Statistic title='운영체제' value={resource.host_info.os} />
              </Col>
              <Col span={8}>
                <Statistic title='커널' value={resource.host_info.kernel} />
              </Col>
            </Row>
          </Card>

          <Card title='CPU' style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col span={16}>
                <Statistic title='모델' value={resource.cpu.model} />
              </Col>
              <Col span={4}>
                <Statistic title='코어' value={resource.cpu.cores} />
              </Col>
              <Col span={4}>
                <Statistic
                  title='사용량'
                  value={resource.cpu.usage_percent}
                  suffix='%'
                  valueStyle={{
                    color: getUsageColor(resource.cpu.usage_percent),
                  }}
                />
              </Col>
            </Row>
          </Card>

          <Card title='메모리' style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title='전체'
                  value={`${Math.round(parseInt(resource.memory.total_mb) / 1024)} GB`}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title='사용 중'
                  value={`${Math.round((parseInt(resource.memory.used_mb) / 1024) * 10) / 10} GB`}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title='사용량'
                  value={resource.memory.usage_percent}
                  suffix='%'
                  valueStyle={{
                    color: getUsageColor(resource.memory.usage_percent),
                  }}
                />
              </Col>
            </Row>
          </Card>

          <Card title='디스크'>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic title='전체' value={resource.disk.root_total} />
              </Col>
              <Col span={8}>
                <Statistic title='사용 중' value={resource.disk.root_used} />
              </Col>
              <Col span={8}>
                <Statistic
                  title='사용량'
                  value={resource.disk.root_usage_percent}
                  suffix='%'
                  valueStyle={{
                    color: getUsageColor(resource.disk.root_usage_percent),
                  }}
                />
              </Col>
            </Row>
          </Card>
        </div>
      ) : (
        <Empty description='리소스 정보를 가져올 수 없습니다.' />
      )}
    </Modal>
  );
};

export default ServerResourceModal;
