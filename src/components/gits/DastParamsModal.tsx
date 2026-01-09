import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Spin,
  Radio,
  Divider,
} from 'antd';
import {
  InfoCircleOutlined,
  GlobalOutlined,
  SecurityScanOutlined,
  EditOutlined,
  UnorderedListOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { DastScanParams } from '../../types/securityAnalysis';
import { getServiceDomains } from '../../lib/api/k8s-resources';

const { Title } = Typography;
const { Option } = Select;

interface DomainInfo {
  domain: string;
  source: 'service_domain' | 'manual';
  sourceName: string;
  protocol: 'http' | 'https';
}

export type DastScanStatus = 'idle' | 'scanning' | 'completed' | 'failed';

interface DastParamsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (params: DastScanParams) => void;
  loading?: boolean;
  serviceId?: number;
  infraType?: 'kubernetes' | 'docker' | 'podman';
  /** 스캔 상태 (외부에서 관리) */
  scanStatus?: DastScanStatus;
  /** 스캔 에러 메시지 */
  scanError?: string;
}

const DastParamsModal: React.FC<DastParamsModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  serviceId,
  infraType = 'kubernetes',
  scanStatus = 'idle',
  scanError,
}) => {
  const [form] = Form.useForm();
  const [_scanType, setScanType] = useState<string>('baseline');
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [inputMode, setInputMode] = useState<'manual' | 'select'>('manual');

  // 도메인 로드 (서비스 도메인 테이블에서)
  useEffect(() => {
    if (visible && serviceId) {
      void loadDomains();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, serviceId]);

  const loadDomains = async () => {
    if (!serviceId) return;

    try {
      setLoadingDomains(true);
      const loadedDomains: DomainInfo[] = [];

      // service_domains 테이블에서 도메인 조회 (모든 인프라 유형에서 사용)
      try {
        const serviceDomains = await getServiceDomains(serviceId);

        serviceDomains.forEach(domain => {
          if (domain.hostname && domain.proxy_status === 'active') {
            const hasProtocol =
              domain.hostname.startsWith('http://') ||
              domain.hostname.startsWith('https://');
            const fullUrl = hasProtocol
              ? domain.hostname
              : `http://${domain.hostname}`;

            loadedDomains.push({
              domain: fullUrl,
              source: 'service_domain',
              sourceName: domain.upstream_address || '외부 Nginx',
              protocol: domain.hostname.startsWith('https://')
                ? 'https'
                : 'http',
            });
          }
        });
      } catch (error) {
        console.error('Service domains 로드 실패:', error);
      }

      setDomains(loadedDomains);

      // 도메인이 있으면 선택 모드로, 없으면 수동 입력 모드로 설정
      if (loadedDomains.length > 0) {
        setInputMode('select');
        form.setFieldsValue({ target_url: loadedDomains[0].domain });
      } else {
        setInputMode('manual');
      }
    } catch (error) {
      console.error('도메인 로드 실패:', error);
      setDomains([]);
      setInputMode('manual');
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleScanTypeChange = (value: string) => {
    setScanType(value);
  };

  const handleInputModeChange = (mode: 'manual' | 'select') => {
    setInputMode(mode);
    form.setFieldsValue({ target_url: undefined });
  };

  const handleSubmit = () => {
    void form.validateFields().then(values => {
      const params: DastScanParams = {
        target_url: values.target_url,
        scan_type: values.scan_type || 'baseline',
        options: {},
      };
      onConfirm(params);
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setScanType('baseline');
    setInputMode('manual');
    onClose();
  };

  // URL 유효성 검사
  const validateUrl = (_: unknown, value: string) => {
    if (!value) {
      return Promise.reject(new Error('대상 URL을 입력해주세요'));
    }
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return Promise.reject(
          new Error('http:// 또는 https://로 시작하는 URL을 입력해주세요')
        );
      }
      return Promise.resolve();
    } catch {
      return Promise.reject(
        new Error('올바른 URL 형식을 입력해주세요 (예: https://example.com)')
      );
    }
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            paddingRight: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
            }}
          >
            <SecurityScanOutlined
              style={{ color: '#52c41a', fontSize: '18px' }}
            />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              DAST 웹 보안 스캔
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexShrink: 0,
              paddingRight: '12px',
            }}
          >
            <Button
              type='primary'
              size='small'
              icon={
                scanStatus === 'scanning' ? (
                  <LoadingOutlined spin />
                ) : (
                  <SecurityScanOutlined />
                )
              }
              onClick={handleSubmit}
              loading={loading}
              disabled={scanStatus === 'scanning'}
              style={{ minWidth: '100px', height: '28px' }}
            >
              {scanStatus === 'scanning' ? '스캔 중...' : '스캔 시작'}
            </Button>
          </div>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      closeIcon={null}
      width={700}
      footer={[
        <Button key='cancel' onClick={handleCancel}>
          닫기
        </Button>,
      ]}
    >
      <Alert
        message='DAST (Dynamic Application Security Testing)'
        description='웹 애플리케이션의 동적 보안 취약점을 스캔합니다. ZAP(OWASP ZAP)을 사용하여 XSS, SQL Injection, CSRF 등의 취약점을 탐지합니다.'
        type='info'
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* 스캔 실패 상태 - 에러만 모달에서 표시 */}
      {scanStatus === 'failed' && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
              <span style={{ fontWeight: 600 }}>스캔에 실패했습니다</span>
            </div>
          }
          description={
            scanError || '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'
          }
          type='error'
          showIcon={false}
          style={{ marginBottom: 24 }}
        />
      )}

      <Spin spinning={loadingDomains} tip='도메인 목록을 불러오는 중...'>
        <Form
          form={form}
          layout='vertical'
          initialValues={{
            scan_type: 'baseline',
          }}
          disabled={scanStatus === 'scanning'}
        >
          <Title level={4}>
            <GlobalOutlined style={{ marginRight: 8 }} />
            스캔 설정
          </Title>

          {/* 입력 모드 선택 (도메인이 있을 때만 표시) */}
          {serviceId && domains.length > 0 && (
            <Form.Item label='URL 입력 방식'>
              <Radio.Group
                value={inputMode}
                onChange={e => handleInputModeChange(e.target.value)}
                optionType='button'
                buttonStyle='solid'
              >
                <Radio.Button value='select'>
                  <UnorderedListOutlined style={{ marginRight: 4 }} />
                  도메인 선택
                </Radio.Button>
                <Radio.Button value='manual'>
                  <EditOutlined style={{ marginRight: 4 }} />
                  직접 입력
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item
            name='target_url'
            label={
              <Space>
                <GlobalOutlined />
                <Typography.Text strong>스캔 대상 URL</Typography.Text>
              </Space>
            }
            rules={[{ validator: validateUrl }]}
            tooltip='DAST 스캔을 수행할 웹 애플리케이션의 URL을 입력하세요'
          >
            {inputMode === 'select' && domains.length > 0 ? (
              <Select
                placeholder='스캔할 도메인을 선택하세요'
                loading={loadingDomains}
                showSearch
                size='large'
                style={{ width: '100%' }}
                popupMatchSelectWidth={true}
                optionLabelProp='label'
                filterOption={(input, option) => {
                  const label = option?.label;
                  const labelStr = typeof label === 'string' ? label : '';
                  return labelStr.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {domains.map((domain, index) => (
                  <Option
                    key={index}
                    value={domain.domain}
                    label={domain.domain}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {domain.domain}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {domain.sourceName}
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            ) : (
              <Input
                placeholder='https://example.com'
                size='large'
                prefix={<GlobalOutlined style={{ color: '#999' }} />}
              />
            )}
          </Form.Item>

          {/* 도메인 안내 메시지 */}
          {serviceId && (
            <>
              {!loadingDomains && domains.length === 0 && (
                <Alert
                  message='연결된 도메인이 없습니다'
                  description={
                    <div>
                      <p>서비스에 연결된 외부 Nginx 도메인이 없습니다.</p>
                      <p style={{ marginTop: 4 }}>
                        스캔하려는 URL을 직접 입력하거나, 도메인 설정에서 외부
                        Nginx 도메인을 연결해주세요.
                      </p>
                    </div>
                  }
                  type='info'
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {!loadingDomains &&
                domains.length > 0 &&
                inputMode === 'select' && (
                  <Alert
                    message={`${domains.length}개의 도메인이 감지되었습니다`}
                    description="외부 Nginx에 연결된 도메인입니다. 다른 URL을 스캔하려면 '직접 입력' 모드를 사용하세요."
                    type='success'
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}
            </>
          )}

          <Divider />

          <Form.Item
            name='scan_type'
            label='스캔 타입'
            rules={[{ required: true, message: '스캔 타입을 선택해주세요' }]}
          >
            <Select onChange={handleScanTypeChange} size='large'>
              <Option value='baseline'>Baseline (빠름, 주요 취약점만)</Option>
              <Option value='full'>Full (느림, 모든 취약점)</Option>
              <Option value='api'>API (REST API 대상)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default DastParamsModal;
