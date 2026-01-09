import React from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Spin,
  Tooltip,
  Tag,
  Switch,
} from 'antd';
import {
  ContainerOutlined,
  CheckCircleOutlined,
  CodeSandboxOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import type {
  ScaParamsModalProps,
  ScaScanParams,
} from '../../types/securityAnalysis';

/**
 * ScaParamsModal
 *
 * SCA 스캔 파라미터 입력 모달
 * - 빌드된 이미지 선택 또는 수동 입력 지원
 * - Private Registry 인증 정보 입력 (선택사항)
 *
 * 확장성 고려사항:
 * - 향후 서비스 등록 시 GitLab URL이 아닌 레지스트리 경로로 이미지를 직접 등록하는 경우 지원 예정
 * - 현재는 빌드된 이미지 목록을 backend에서 조회하여 선택하는 방식
 * - 레지스트리 직접 입력 기능 추가 시 이 컴포넌트 확장 필요
 */
const ScaParamsModal: React.FC<ScaParamsModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  builtImages = [], //  빌드된 이미지 목록
  registryConfig, //  서비스에 저장된 Registry 인증 정보
  defaultImageUrl, //  기본 선택 이미지 URL
}) => {
  const [form] = Form.useForm();
  const [useManualInput, setUseManualInput] = React.useState(false); //  수동 입력 모드 토글

  //  저장된 Registry 인증 정보 여부 확인
  const hasSavedRegistryCred = !!(
    registryConfig?.username && registryConfig?.password
  );

  //  모달이 열릴 때 기본 이미지 URL 설정
  React.useEffect(() => {
    if (visible && defaultImageUrl) {
      form.setFieldValue('image_url', defaultImageUrl);
    }
  }, [visible, defaultImageUrl, form]);

  const handleSubmit = () => {
    void form.validateFields().then(values => {
      //  저장된 Registry 인증 정보 우선 사용
      const params: ScaScanParams = {
        image_url: values.image_url,
        scan_type: values.scan_type || 'vuln',
        registry_username: hasSavedRegistryCred
          ? registryConfig?.username
          : undefined,
        registry_password: hasSavedRegistryCred
          ? registryConfig?.password
          : undefined,
        generate_sbom: values.generate_sbom || false,
        license_analysis: values.license_analysis || false,
      };
      onConfirm(params);
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setUseManualInput(false); //  수동 입력 모드 초기화
    onClose();
  };

  return (
    <Modal
      title='이미지 분석'
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key='cancel' onClick={handleCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          onClick={() => form.submit()}
          loading={loading}
        >
          분석 시작
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Alert
          message='컨테이너 이미지 취약점 분석'
          description={
            builtImages.length === 0
              ? 'Docker 컨테이너 이미지의 취약점을 분석합니다. (분석 타입: 취약점 분석)\n⚠️ 빌드된 이미지가 없습니다. 먼저 빌드를 실행하거나 수동으로 이미지 URL을 입력하세요.'
              : `Docker 컨테이너 이미지의 취약점을 분석합니다. (분석 타입: 취약점 분석)\n ${builtImages.length}개의 빌드된 이미지를 사용할 수 있습니다.`
          }
          type={builtImages.length === 0 ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 24, whiteSpace: 'pre-line' }}
        />

        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          autoComplete='off'
          initialValues={{
            scan_type: 'vuln',
            generate_sbom: false,
            license_analysis: false,
          }}
        >
          {/* 컨테이너 이미지 */}
          <Form.Item
            label={
              <Space>
                <ContainerOutlined />
                <Typography.Text strong>컨테이너 이미지</Typography.Text>
                {builtImages.length > 0 && !useManualInput && (
                  <Button
                    type='link'
                    size='small'
                    onClick={() => setUseManualInput(true)}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    수동 입력
                  </Button>
                )}
                {builtImages.length > 0 && useManualInput && (
                  <Button
                    type='link'
                    size='small'
                    onClick={() => setUseManualInput(false)}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    빌드 이미지 선택
                  </Button>
                )}
              </Space>
            }
            name='image_url'
            rules={[
              { required: true, message: '이미지를 선택하거나 입력해주세요' },
              ...(useManualInput
                ? [
                    {
                      pattern: /^[a-zA-Z0-9._/-]+(:[a-zA-Z0-9._-]+)?$/,
                      message: '올바른 이미지 형식을 입력해주세요',
                    },
                  ]
                : []),
            ]}
            extra={
              !useManualInput && builtImages.length > 0
                ? '빌드된 이미지 중에서 선택하세요'
                : '예: nginx:latest, ubuntu:20.04, harbor.example.com/project/app:v1.0.0'
            }
          >
            {!useManualInput && builtImages.length > 0 ? (
              <Select
                placeholder='빌드된 이미지를 선택하세요'
                showSearch
                optionFilterProp='searchLabel'
                dropdownMatchSelectWidth={false}
                dropdownStyle={{ maxWidth: 600 }}
                style={{
                  width: '100%',
                }}
                // 선택된 값 표시 시 짧게 표시
                optionLabelProp='shortLabel'
              >
                {builtImages.map((img, idx) => {
                  // 이미지 URL에서 짧은 버전 생성 (마지막 부분만)
                  const urlParts = img.image_url.split('/');
                  const shortLabel =
                    urlParts[urlParts.length - 1] || img.image_url;

                  return (
                    <Select.Option
                      key={idx}
                      value={img.image_url}
                      searchLabel={`${img.image_url} ${img.image_tag || ''}`}
                      shortLabel={shortLabel}
                    >
                      <Tooltip title={img.image_url} placement='topLeft'>
                        <div style={{ maxWidth: 550 }}>
                          <div
                            style={{
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {img.image_url}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#999',
                              marginTop: 4,
                            }}
                          >
                            빌드 일시:{' '}
                            {new Date(img.build_date).toLocaleString('ko-KR')}
                            {img.image_tag && ` | 태그: ${img.image_tag}`}
                          </div>
                        </div>
                      </Tooltip>
                    </Select.Option>
                  );
                })}
              </Select>
            ) : (
              <Input placeholder='nginx:latest' />
            )}
          </Form.Item>

          {/* 스캔 타입은 vuln으로 고정 */}
          <Form.Item name='scan_type' style={{ display: 'none' }}>
            <Input value='vuln' />
          </Form.Item>

          {/* Registry 인증 정보 표시 (읽기 전용) */}
          <Divider>Container Registry 인증</Divider>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: hasSavedRegistryCred ? '#f6ffed' : '#fff7e6',
              border: `1px solid ${hasSavedRegistryCred ? '#b7eb8f' : '#ffd591'}`,
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <Space wrap>
              <CodeSandboxOutlined
                style={{
                  fontSize: '16px',
                  color: hasSavedRegistryCred ? '#52c41a' : '#fa8c16',
                }}
              />
              <Typography.Text strong>Registry 인증 정보</Typography.Text>
              {hasSavedRegistryCred ? (
                <>
                  <Tag color='success' icon={<CheckCircleOutlined />}>
                    저장됨
                  </Tag>
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: '12px' }}
                  >
                    (
                    {registryConfig?.registry_type === 'harbor'
                      ? 'Harbor'
                      : 'Docker Hub'}
                    : {registryConfig?.registry_url || 'N/A'} -{' '}
                    {registryConfig?.username} / ●●●●●●)
                  </Typography.Text>
                  {registryConfig?.project_name && (
                    <Tag color='blue'>
                      {registryConfig?.registry_type === 'harbor'
                        ? `프로젝트: ${registryConfig.project_name}`
                        : registryConfig.project_name}
                    </Tag>
                  )}
                </>
              ) : (
                <>
                  <Tag color='warning'>미설정</Tag>
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: '12px' }}
                  >
                    서비스 정보 수정에서 Registry 인증 정보를 설정하세요
                  </Typography.Text>
                </>
              )}
            </Space>

            {!hasSavedRegistryCred && (
              <Alert
                message='Private Registry 사용 시 인증 정보가 필요합니다'
                description='Public Registry(예: Docker Hub 공개 이미지)는 인증 정보가 필요 없습니다.'
                type='info'
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </div>

          {/* SBOM 생성 옵션 */}
          <Divider>SBOM 생성 옵션</Divider>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <Form.Item
              name='generate_sbom'
              valuePropName='checked'
              style={{ marginBottom: 12 }}
            >
              <Space>
                <Switch />
                <Typography.Text>
                  <FileSearchOutlined style={{ marginRight: 6 }} />
                  SBOM 자동 생성
                </Typography.Text>
                <Tooltip title='CycloneDX 형식의 SBOM(Software Bill of Materials)을 생성합니다. 소프트웨어 구성요소 목록과 의존성 정보를 제공합니다.'>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    (권장)
                  </Typography.Text>
                </Tooltip>
              </Space>
            </Form.Item>

            <Form.Item
              name='license_analysis'
              valuePropName='checked'
              style={{ marginBottom: 0 }}
              dependencies={['generate_sbom']}
            >
              <Space>
                <Switch />
                <Typography.Text>라이선스 분석 포함</Typography.Text>
                <Tooltip title='SBOM 생성 시 각 구성요소의 라이선스 정보를 분석하여 포함합니다.'>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    (SBOM 생성 시)
                  </Typography.Text>
                </Tooltip>
              </Space>
            </Form.Item>

            <Typography.Paragraph
              type='secondary'
              style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
            >
              SBOM을 생성하면 분석 결과에서 SBOM/라이선스 탭에서 확인할 수
              있습니다.
            </Typography.Paragraph>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ScaParamsModal;
