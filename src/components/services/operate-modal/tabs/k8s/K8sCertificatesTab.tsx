import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Button,
  Card,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  notification,
  Spin,
  Collapse,
  Descriptions,
} from 'antd';
import {
  SafetyCertificateOutlined,
  ReloadOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  checkCertExpiration,
  renewK8sCertificates,
  renewK8sCertificate,
  type CertificateInfo,
  type CertificateCheckResponse,
} from '../../../../../lib/api/k8s-resources';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

// 인증서별 설명 정보
const CERTIFICATE_DESCRIPTIONS: Record<
  string,
  { title: string; description: string; usage: string }
> = {
  'admin.conf': {
    title: 'kubectl 관리자 설정',
    description:
      'kubectl 명령어로 클러스터에 접근할 때 사용되는 관리자 인증서입니다.',
    usage: 'kubectl 명령어 실행 시 사용',
  },
  apiserver: {
    title: 'API 서버 인증서',
    description:
      'Kubernetes API 서버의 TLS 인증서입니다. 모든 클러스터 통신의 중심이 됩니다.',
    usage: 'API 서버 HTTPS 통신 보안',
  },
  'apiserver-etcd-client': {
    title: 'API 서버 → etcd 클라이언트',
    description:
      'API 서버가 etcd 데이터베이스에 접근할 때 사용하는 클라이언트 인증서입니다.',
    usage: 'API 서버의 etcd 연결 인증',
  },
  'apiserver-kubelet-client': {
    title: 'API 서버 → Kubelet 클라이언트',
    description:
      'API 서버가 각 노드의 kubelet과 통신할 때 사용하는 클라이언트 인증서입니다.',
    usage: 'Pod 로그 조회, exec 명령 등',
  },
  'controller-manager.conf': {
    title: 'Controller Manager 설정',
    description:
      'Kubernetes Controller Manager가 API 서버와 통신할 때 사용하는 인증서입니다.',
    usage: 'ReplicaSet, Deployment 컨트롤러 동작',
  },
  'front-proxy-client': {
    title: 'Front Proxy 클라이언트',
    description:
      'API 집계(aggregation) 계층에서 확장 API 서버와 통신할 때 사용됩니다.',
    usage: 'Metrics Server 등 확장 API 연동',
  },
  'scheduler.conf': {
    title: 'Scheduler 설정',
    description:
      'Kubernetes Scheduler가 API 서버와 통신할 때 사용하는 인증서입니다.',
    usage: 'Pod 스케줄링 결정 및 적용',
  },
  'etcd/ca': {
    title: 'etcd CA 인증서',
    description: 'etcd 클러스터의 인증 기관(CA) 루트 인증서입니다.',
    usage: 'etcd 관련 모든 인증서 서명',
  },
  'etcd/server': {
    title: 'etcd 서버 인증서',
    description:
      'etcd 서버의 TLS 인증서입니다. 클라이언트 연결을 암호화합니다.',
    usage: 'etcd 서버 HTTPS 통신',
  },
  'etcd/peer': {
    title: 'etcd 피어 인증서',
    description: 'etcd 클러스터 노드 간 통신에 사용되는 인증서입니다.',
    usage: 'etcd 클러스터 노드 간 동기화',
  },
  'etcd/healthcheck-client': {
    title: 'etcd 헬스체크 클라이언트',
    description:
      'etcd의 상태를 확인하는 헬스체크에 사용되는 클라이언트 인증서입니다.',
    usage: 'etcd 클러스터 상태 모니터링',
  },
  'super-admin.conf': {
    title: '슈퍼 관리자 설정',
    description: '클러스터의 최고 권한을 가진 슈퍼 관리자용 인증서입니다.',
    usage: '클러스터 최고 관리자 접근',
  },
  'kubelet.conf': {
    title: 'Kubelet 설정',
    description:
      '각 노드의 kubelet이 API 서버와 통신할 때 사용하는 인증서입니다.',
    usage: '노드 상태 보고 및 Pod 관리',
  },
};

// 인증서 설명 조회 함수
const getCertificateDescription = (
  certName: string
): { title: string; description: string; usage: string } => {
  // 정확한 이름 매칭
  if (CERTIFICATE_DESCRIPTIONS[certName]) {
    return CERTIFICATE_DESCRIPTIONS[certName];
  }

  // etcd 관련 인증서 부분 매칭
  if (certName.startsWith('etcd/') || certName.includes('etcd')) {
    const etcdKey = Object.keys(CERTIFICATE_DESCRIPTIONS).find(
      key =>
        key.startsWith('etcd/') && certName.includes(key.replace('etcd/', ''))
    );
    if (etcdKey) return CERTIFICATE_DESCRIPTIONS[etcdKey];
  }

  // 기본값 반환
  return {
    title: certName,
    description: 'Kubernetes PKI 인증서입니다.',
    usage: '클러스터 컴포넌트 간 보안 통신',
  };
};

interface HopConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
}

interface K8sCertificatesTabProps {
  hops?: HopConfig[];
  infraId?: number;
  onCertificateRefresh?: () => void;
}

/**
 * Kubernetes 인증서 관리 탭
 * 클러스터 PKI 인증서의 만료일 조회 및 갱신을 수행합니다.
 */
const K8sCertificatesTab: React.FC<K8sCertificatesTabProps> = ({
  hops,
  infraId: _infraId,
  onCertificateRefresh,
}) => {
  // State
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [caInfo, setCaInfo] = useState<CertificateInfo | null>(null);
  const [rawOutput, setRawOutput] = useState<string>('');
  const [renewingAll, setRenewingAll] = useState(false);
  const [renewingCert, setRenewingCert] = useState<string | null>(null);
  const [_showRawOutput, _setShowRawOutput] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [validityYears, setValidityYears] = useState<number>(1); // 인증서 유효기간 (년)

  // Modal.confirm 클로저 문제 해결을 위한 ref
  const validityYearsRef = useRef<number>(1);

  // validityYears 변경 시 ref도 업데이트
  const handleValidityYearsChange = (value: number) => {
    setValidityYears(value);
    validityYearsRef.current = value;
  };

  // 유효기간 옵션
  const validityOptions = [
    { value: 1, label: '1년 (기본값)' },
    { value: 2, label: '2년' },
    { value: 3, label: '3년' },
    { value: 5, label: '5년' },
    { value: 10, label: '10년' },
  ];

  // 인증서 상태에 따른 색상 및 아이콘 반환
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'valid':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          text: '정상',
        };
      case 'warning':
        return { color: 'warning', icon: <WarningOutlined />, text: '주의' };
      case 'critical':
        return {
          color: 'error',
          icon: <ExclamationCircleOutlined />,
          text: '위험',
        };
      case 'expired':
        return {
          color: 'default',
          icon: <CloseCircleOutlined />,
          text: '만료됨',
        };
      default:
        return {
          color: 'default',
          icon: <InfoCircleOutlined />,
          text: '알 수 없음',
        };
    }
  };

  // 남은 일수에 따른 Progress 색상
  const getProgressColor = (days: number) => {
    if (days < 0) return '#ff4d4f';
    if (days <= 30) return '#ff4d4f';
    if (days <= 90) return '#faad14';
    return '#52c41a';
  };

  // hops를 API 요청 형식으로 변환
  const formatHopsForApi = (hopsList: HopConfig[]) => {
    return hopsList.map(hop => ({
      host: hop.host,
      port: hop.port || 22,
      username: hop.username || '',
      password: hop.password || '',
    }));
  };

  // 인증서 정보 조회
  const loadCertificates = useCallback(async () => {
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    setLoading(true);
    try {
      const formattedHops = formatHopsForApi(hops);
      const result: CertificateCheckResponse = await checkCertExpiration({
        hops: formattedHops,
      });

      setCertificates(result.certificates || []);
      setCaInfo(result.caInfo || null);
      setRawOutput(result.rawOutput || '');
      setLastChecked(new Date());

      // 만료 임박 인증서 경고
      const criticalCerts = (result.certificates || []).filter(
        cert => cert.status === 'critical' || cert.status === 'expired'
      );
      if (criticalCerts.length > 0) {
        notification.warning({
          message: '인증서 만료 경고',
          description: `${criticalCerts.length}개의 인증서가 30일 이내에 만료됩니다. 갱신을 권장합니다.`,
          duration: 10,
        });
      }
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '인증서 정보 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  }, [hops]);

  // 컴포넌트 마운트 시 자동 조회
  useEffect(() => {
    if (hops && hops.length > 0) {
      loadCertificates();
    }
  }, [loadCertificates, hops]);

  // 모든 인증서 갱신
  const handleRenewAll = async () => {
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    Modal.confirm({
      title: '모든 인증서 갱신',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>모든 Kubernetes PKI 인증서를 갱신합니다.</Paragraph>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              인증서 유효기간:
            </Text>
            <Select
              defaultValue={validityYears}
              onChange={handleValidityYearsChange}
              style={{ width: '100%' }}
              options={validityOptions}
            />
            <Alert
              message='유효기간 선택 시 해당 기간으로 갱신됩니다'
              type='info'
              showIcon
              style={{ marginTop: 8 }}
            />
          </div>

          <Alert
            type='warning'
            message='주의사항'
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>갱신 후 kubelet 서비스가 자동으로 재시작됩니다.</li>
                <li>
                  갱신 중 일시적인 클러스터 연결 끊김이 발생할 수 있습니다.
                </li>
                <li>
                  모든 Control Plane 노드에서 동일한 작업을 수행해야 할 수
                  있습니다.
                </li>
              </ul>
            }
            showIcon
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      okText: '갱신 시작',
      cancelText: '취소',
      okType: 'primary',
      width: 500,
      onOk: async () => {
        const selectedYears = validityYearsRef.current;
        setRenewingAll(true);
        try {
          const formattedHops = formatHopsForApi(hops);
          const result = await renewK8sCertificates({
            hops: formattedHops,
            validityYears: selectedYears,
          });

          notification.success({
            message: '인증서 갱신 완료',
            description:
              result.message || '모든 인증서가 성공적으로 갱신되었습니다.',
            duration: 5,
          });

          // 갱신된 인증서 목록 업데이트
          if (result.certificates) {
            setCertificates(result.certificates);
          }

          // 새로고침 콜백 호출
          onCertificateRefresh?.();

          // 잠시 후 다시 조회
          setTimeout(() => {
            void loadCertificates();
          }, 2000);
        } catch (error) {
          const err = error as Error;
          notification.error({
            message: '인증서 갱신 실패',
            description: err.message || '인증서 갱신 중 오류가 발생했습니다',
            duration: 5,
          });
        } finally {
          setRenewingAll(false);
        }
      },
    });
  };

  // 개별 인증서 갱신
  const handleRenewCert = (certName: string) => {
    if (!hops || hops.length === 0) {
      message.warning('SSH 연결 정보가 없습니다');
      return;
    }

    const certInfo = getCertificateDescription(certName);

    Modal.confirm({
      title: '인증서 갱신',
      icon: <SafetyCertificateOutlined style={{ color: '#1890ff' }} />,
      content: (
        <div>
          <Paragraph>
            <Text strong>{certName}</Text> 인증서를 갱신합니다.
          </Paragraph>
          <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
            {certInfo.description}
          </Text>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              인증서 유효기간:
            </Text>
            <Select
              defaultValue={validityYears}
              onChange={handleValidityYearsChange}
              style={{ width: '100%' }}
              options={validityOptions}
            />
            <Alert
              message='유효기간 선택 시 해당 기간으로 갱신됩니다'
              type='info'
              showIcon
              style={{ marginTop: 8 }}
            />
          </div>

          <Alert
            type='warning'
            message='갱신 후 관련 컴포넌트가 재시작될 수 있습니다.'
            showIcon
          />
        </div>
      ),
      okText: '갱신',
      cancelText: '취소',
      okType: 'primary',
      width: 450,
      onOk: async () => {
        const selectedYears = validityYearsRef.current;
        setRenewingCert(certName);
        try {
          const formattedHops = formatHopsForApi(hops);
          await renewK8sCertificate({
            hops: formattedHops,
            certName,
            validityYears: selectedYears,
          });

          notification.success({
            message: '인증서 갱신 완료',
            description: `${certName} 인증서가 ${selectedYears}년 유효기간으로 갱신되었습니다.`,
            duration: 5,
          });

          // 다시 조회
          await loadCertificates();
        } catch (error) {
          const err = error as Error;
          notification.error({
            message: '인증서 갱신 실패',
            description: err.message || '인증서 갱신 중 오류가 발생했습니다',
            duration: 5,
          });
        } finally {
          setRenewingCert(null);
        }
      },
    });
  };

  // 테이블 컬럼 정의
  const columns: ColumnsType<CertificateInfo> = [
    {
      title: '인증서',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => {
        const certInfo = getCertificateDescription(name);
        return (
          <Tooltip
            title={
              <div>
                <div>
                  <strong>{certInfo.title}</strong>
                </div>
                <div style={{ marginTop: 4 }}>{certInfo.description}</div>
                <div style={{ marginTop: 4, color: '#91d5ff' }}>
                  <strong>용도:</strong> {certInfo.usage}
                </div>
              </div>
            }
            placement='right'
          >
            <Space>
              <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong style={{ display: 'block' }}>
                  {name}
                </Text>
                <Text type='secondary' style={{ fontSize: 11 }}>
                  {certInfo.title}
                </Text>
              </div>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '설명',
      key: 'description',
      width: 220,
      render: (_, record) => {
        const certInfo = getCertificateDescription(record.name);
        return (
          <div>
            <Text style={{ fontSize: 12 }}>{certInfo.usage}</Text>
          </div>
        );
      },
    },
    {
      title: '만료일',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      width: 150,
      render: (date: string) => (
        <Text type='secondary' style={{ fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {date || '-'}
        </Text>
      ),
    },
    {
      title: '남은 기간',
      dataIndex: 'remainingDays',
      key: 'remainingDays',
      width: 150,
      render: (days: number) => {
        const percent = Math.max(0, Math.min(100, (days / 365) * 100));
        return (
          <Tooltip title={`${days}일 남음`}>
            <div style={{ width: 120 }}>
              <Progress
                percent={percent}
                size='small'
                strokeColor={getProgressColor(days)}
                format={() => `${days}일`}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'CA',
      dataIndex: 'caName',
      key: 'caName',
      width: 80,
      render: (caName: string) => (
        <Text type='secondary' style={{ fontSize: 12 }}>
          {caName || '-'}
        </Text>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Tooltip title='이 인증서만 갱신'>
          <Button
            type='link'
            size='small'
            icon={<SyncOutlined spin={renewingCert === record.name} />}
            onClick={() => handleRenewCert(record.name)}
            loading={renewingCert === record.name}
            disabled={renewingAll}
          >
            갱신
          </Button>
        </Tooltip>
      ),
    },
  ];

  // 인증서 통계 계산
  const stats = {
    total: certificates.length,
    valid: certificates.filter(c => c.status === 'valid').length,
    warning: certificates.filter(c => c.status === 'warning').length,
    critical: certificates.filter(c => c.status === 'critical').length,
    expired: certificates.filter(c => c.status === 'expired').length,
  };

  // hops가 없으면 경고 표시
  if (!hops || hops.length === 0) {
    return (
      <Alert
        message='SSH 연결 정보 필요'
        description='인증서 정보를 조회하려면 마스터 노드에 대한 SSH 연결 정보가 필요합니다.'
        type='warning'
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      {/* 헤더 */}
      <Card size='small' style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <SafetyCertificateOutlined
              style={{ fontSize: 24, color: '#1890ff' }}
            />
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Kubernetes PKI 인증서 관리
              </Title>
              <Text type='secondary'>
                클러스터 인증서 만료일 조회 및 갱신
                {lastChecked && (
                  <span style={{ marginLeft: 8 }}>
                    (마지막 조회: {lastChecked.toLocaleTimeString()})
                  </span>
                )}
              </Text>
            </div>
          </Space>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadCertificates}
              loading={loading}
            >
              새로고침
            </Button>
            <Button
              type='primary'
              icon={<SyncOutlined />}
              onClick={handleRenewAll}
              loading={renewingAll}
              disabled={loading || certificates.length === 0}
              danger={stats.critical > 0 || stats.expired > 0}
            >
              모든 인증서 갱신
            </Button>
          </Space>
        </div>
      </Card>

      {/* 인증서 상태 요약 */}
      {certificates.length > 0 && (
        <Card size='small' style={{ marginBottom: 16 }}>
          <Space size='large'>
            <Text>
              <Text strong>전체:</Text> {stats.total}개
            </Text>
            <Text>
              <CheckCircleOutlined
                style={{ color: '#52c41a', marginRight: 4 }}
              />
              <Text strong>정상:</Text> {stats.valid}개
            </Text>
            <Text>
              <WarningOutlined style={{ color: '#faad14', marginRight: 4 }} />
              <Text strong>주의:</Text> {stats.warning}개
            </Text>
            <Text>
              <ExclamationCircleOutlined
                style={{ color: '#ff4d4f', marginRight: 4 }}
              />
              <Text strong>위험:</Text> {stats.critical}개
            </Text>
            <Text>
              <CloseCircleOutlined
                style={{ color: '#8c8c8c', marginRight: 4 }}
              />
              <Text strong>만료:</Text> {stats.expired}개
            </Text>
          </Space>
        </Card>
      )}

      {/* CA 인증서 정보 */}
      {caInfo && (
        <Card
          size='small'
          title={
            <Space>
              <SafetyCertificateOutlined style={{ color: '#722ed1' }} />
              <Text strong>CA 인증서 (루트 인증 기관)</Text>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions size='small' column={4}>
            <Descriptions.Item label='만료일'>
              {caInfo.expirationDate || '-'}
            </Descriptions.Item>
            <Descriptions.Item label='남은 기간'>
              {caInfo.remainingDays}일
            </Descriptions.Item>
            <Descriptions.Item label='상태'>
              {(() => {
                const config = getStatusConfig(caInfo.status);
                return (
                  <Tag color={config.color} icon={config.icon}>
                    {config.text}
                  </Tag>
                );
              })()}
            </Descriptions.Item>
            <Descriptions.Item label='유효기간'>약 10년</Descriptions.Item>
          </Descriptions>
          <Alert
            message='CA 인증서는 kubeadm certs renew로 갱신되지 않습니다.'
            description='CA 인증서 갱신이 필요한 경우 별도의 절차가 필요합니다. 일반적으로 10년의 유효기간을 가집니다.'
            type='info'
            showIcon
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

      {/* 인증서 목록 테이블 */}
      <Card
        size='small'
        title={
          <Space>
            <SafetyCertificateOutlined />
            <Text strong>인증서 목록</Text>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={certificates}
            rowKey='name'
            size='small'
            pagination={false}
            locale={{
              emptyText:
                '인증서 정보를 조회하려면 "새로고침" 버튼을 클릭하세요.',
            }}
            rowClassName={record => {
              if (record.status === 'expired') return 'ant-table-row-expired';
              if (record.status === 'critical') return 'ant-table-row-critical';
              if (record.status === 'warning') return 'ant-table-row-warning';
              return '';
            }}
          />
        </Spin>
      </Card>

      {/* 원본 출력 보기 */}
      {rawOutput && (
        <Collapse style={{ marginTop: 16 }}>
          <Panel
            header={
              <Space>
                <InfoCircleOutlined />
                <Text>kubeadm certs check-expiration 원본 출력</Text>
              </Space>
            }
            key='raw'
          >
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                maxHeight: 300,
                overflow: 'auto',
                fontSize: 12,
              }}
            >
              {rawOutput}
            </pre>
          </Panel>
        </Collapse>
      )}

      {/* 안내 정보 */}
      <Alert
        message='인증서 갱신 안내'
        description={
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Kubernetes 인증서는 기본적으로 1년간 유효합니다.</li>
            <li>갱신 후에는 kubelet 서비스가 자동으로 재시작됩니다.</li>
            <li>
              HA 클러스터의 경우 모든 Control Plane 노드에서 갱신 작업이
              필요합니다.
            </li>
            <li>
              갱신된 인증서를 적용하려면 API 서버, Controller Manager,
              Scheduler를 재시작해야 합니다.
            </li>
            <li>
              CA 인증서는 별도로 갱신해야 하며, 일반적으로 10년의 유효기간을
              가집니다.
            </li>
          </ul>
        }
        type='info'
        showIcon
        style={{ marginTop: 16 }}
      />

      <style>{`
        .ant-table-row-expired {
          background-color: #fff1f0 !important;
        }
        .ant-table-row-critical {
          background-color: #fff2e8 !important;
        }
        .ant-table-row-warning {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
};

export default K8sCertificatesTab;
