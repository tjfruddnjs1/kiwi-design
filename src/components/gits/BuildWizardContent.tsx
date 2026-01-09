import { useState, useEffect, useCallback } from 'react';
import {
  Steps,
  Button,
  message,
  Select,
  Input,
  Form,
  Typography,
  Alert,
  Spin,
  Space,
  Checkbox,
  Table,
  Card,
  Tabs,
  Tag,
  Divider,
  Row,
  Col,
  Collapse,
  Switch,
  Tooltip,
} from 'antd';
import {
  CodeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  FolderOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  SettingFilled,
  SafetyCertificateOutlined,
  UserSwitchOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import {
  buildWizardApi,
  DetectProjectTypeResponse,
  GenerateBuildFilesResponse,
  SubProject,
  ServiceConfig,
  GeneratedFile,
  LanguageConfigs,
  FRAMEWORK_INFO,
  BUILD_TYPE_INFO,
  BuildType,
} from '../../lib/api/buildWizard';
import MonacoEditor from '@monaco-editor/react';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface BuildWizardContentProps {
  gitUrl: string;
  branch?: string;
  serviceName?: string;
  onSuccess?: () => void;
}

interface ServiceSelection extends ServiceConfig {
  selected: boolean;
  version?: string;
  base_os?: string;
  framework?: string;
  package_manager?: string;
  build_type?: string;
  enable_healthcheck?: boolean; // 모노레포 서비스별 헬스체크 설정
  non_root_user?: boolean; // 모노레포 서비스별 비루트 사용자 설정
}

// 고급 빌드 옵션 인터페이스
interface AdvancedBuildOptions {
  enableHealthcheck: boolean;
  nonRootUser: boolean;
}

export default function BuildWizardContent({
  gitUrl,
  branch = 'main',
  serviceName = 'app',
  onSuccess,
}: BuildWizardContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 감지된 정보
  const [_detectedType, setDetectedType] = useState<string>('');
  const [detectedFramework, setDetectedFramework] = useState<string>('');
  const [detectedPackageManager, setDetectedPackageManager] =
    useState<string>('');
  const [detectedBuildType, setDetectedBuildType] = useState<string>('');
  const [hasTypeScript, setHasTypeScript] = useState<boolean>(false);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [hasExistingFiles, setHasExistingFiles] = useState({
    dockerfile: false,
    dockerCompose: false,
  });

  // 고급 빌드 옵션
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedBuildOptions>({
    enableHealthcheck: true,
    nonRootUser: true,
  });

  // 서비스 선택 (모노레포용)
  const [services, setServices] = useState<ServiceSelection[]>([]);
  const [isMonorepo, setIsMonorepo] = useState(false);

  // 생성된 파일 내용
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [dockerCompose, setDockerCompose] = useState('');

  // 단일 프로젝트용 (기존 호환)
  const [singleDockerfile, setSingleDockerfile] = useState('');

  //  [신규] 언어별 버전/OS 설정
  const [languageConfigs, setLanguageConfigs] = useState<LanguageConfigs>({});

  //  [신규] 컴포넌트 마운트 시 언어 설정 로드
  const loadLanguageConfigs = useCallback(async () => {
    try {
      const response = await buildWizardApi.getLanguageConfigs();
      if (response.success && response.data) {
        setLanguageConfigs(response.data as LanguageConfigs);
      }
    } catch (error) {
      console.error('언어 설정 로드 실패:', error);
    }
  }, []);

  useEffect(() => {
    void loadLanguageConfigs();
  }, [loadLanguageConfigs]);

  //  [신규] 프로젝트 타입에 따른 기본 버전/OS 설정
  const getDefaultVersionAndOS = (type: string) => {
    const config = languageConfigs[type];
    return {
      version: config?.default_version || '',
      base_os: config?.default_os || '',
    };
  };

  // 1단계: 프로젝트 타입 감지
  const handleDetectProjectType = async () => {
    setLoading(true);
    try {
      const response = await buildWizardApi.detectProjectType({
        git_url: gitUrl,
        branch,
      });

      if (response.success && response.data) {
        const data = response.data as DetectProjectTypeResponse;
        setDetectedType(data.detected_type);
        setDetectedFramework(data.framework || '');
        setDetectedPackageManager(data.package_manager || '');
        setDetectedBuildType(data.build_type || '');
        setHasTypeScript(data.has_typescript || false);
        setHasExistingFiles({
          dockerfile: data.has_dockerfile,
          dockerCompose: data.has_docker_compose,
        });

        // 서브 프로젝트 확인
        if (data.sub_projects && data.sub_projects.length > 0) {
          setIsMonorepo(true);
          setSubProjects(data.sub_projects);

          // 기본 서비스 선택 목록 생성 (버전/OS/프레임워크/고급옵션 포함)
          const initialServices: ServiceSelection[] = data.sub_projects.map(
            sub => {
              const defaults = getDefaultVersionAndOS(sub.type);
              return {
                path: sub.path,
                name: sub.path,
                type: sub.type,
                selected: true,
                port: getDefaultPortForType(sub.type),
                version: defaults.version,
                base_os: defaults.base_os,
                framework: sub.framework || '',
                package_manager: sub.package_manager || '',
                enable_healthcheck: true, // 기본값: 헬스체크 활성화
                non_root_user: true, // 기본값: 비루트 사용자 활성화
              };
            }
          );
          setServices(initialServices);
        } else {
          setIsMonorepo(false);
          const defaults = getDefaultVersionAndOS(data.detected_type);

          // 프레임워크에 따른 기본 포트 설정
          const frameworkInfo = FRAMEWORK_INFO[data.framework];
          const defaultPort =
            frameworkInfo?.default_port ||
            getDefaultPortForType(data.detected_type);

          form.setFieldsValue({
            project_type: data.detected_type,
            service_name: serviceName,
            version: defaults.version,
            base_os: defaults.base_os,
            framework: data.framework || '',
            package_manager: data.package_manager || '',
            build_type: data.build_type || '',
            port: defaultPort,
          });
        }

        message.success('프로젝트 분석 완료!');
        setCurrentStep(1);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '프로젝트 타입 감지 실패';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 타입별 기본 포트
  const getDefaultPortForType = (type: string): number => {
    const portMap: Record<string, number> = {
      nodejs: 3000,
      python: 8000,
      go: 8080,
      java: 8080,
      ruby: 3000,
      php: 80,
      //  [신규] 추가 언어
      rust: 8080,
      dotnet: 8080,
      static: 80,
    };
    return portMap[type] || 8080;
  };

  // 2단계: 템플릿 생성
  const handleGenerateTemplate = async () => {
    setLoading(true);
    try {
      if (isMonorepo) {
        // 모노레포: 선택된 서비스들의 템플릿 생성
        const selectedServices = services.filter(s => s.selected);
        if (selectedServices.length === 0) {
          message.warning('최소 1개 이상의 서비스를 선택해주세요');
          setLoading(false);
          return;
        }

        const response = await buildWizardApi.generateBuildFiles({
          services: selectedServices.map(s => ({
            path: s.path,
            name: s.name,
            type: s.type,
            port: s.port,
            version: s.version, //  [신규] 버전 전달
            base_os: s.base_os, //  [신규] 베이스 OS 전달
            framework: s.framework, // 프레임워크
            package_manager: s.package_manager, // 패키지 매니저
            enable_healthcheck: s.enable_healthcheck, //  [신규] 헬스체크 전달
            non_root_user: s.non_root_user, //  [신규] 비루트 사용자 전달
          })),
        });

        if (response.success && response.data) {
          const data = response.data as GenerateBuildFilesResponse;
          setGeneratedFiles(data.files || []);
          setDockerCompose(data.docker_compose);
          message.success(
            `${selectedServices.length}개 서비스의 빌드 파일 생성 완료`
          );
          setCurrentStep(2);
        }
      } else {
        // 단일 프로젝트
        const values = form.getFieldsValue();
        const response = await buildWizardApi.generateBuildFiles({
          project_type: values.project_type,
          service_name: values.service_name,
          port: values.port,
          version: values.version,
          base_os: values.base_os,
          framework: values.framework || detectedFramework,
          package_manager: values.package_manager || detectedPackageManager,
          build_type: values.build_type || detectedBuildType,
          enable_healthcheck: advancedOptions.enableHealthcheck,
          non_root_user: advancedOptions.nonRootUser,
        });

        if (response.success && response.data) {
          const data = response.data as GenerateBuildFilesResponse;
          setSingleDockerfile(data.dockerfile || '');
          setDockerCompose(data.docker_compose);
          message.success('빌드 파일 템플릿 생성 완료');
          setCurrentStep(2);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '템플릿 생성 실패';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 3단계: GitLab에 커밋
  const handleCommitFiles = async () => {
    setLoading(true);
    try {
      if (isMonorepo) {
        const response = await buildWizardApi.commitBuildFiles({
          git_url: gitUrl,
          branch,
          files: generatedFiles,
          docker_compose: dockerCompose,
        });

        if (response.success) {
          message.success('빌드 환경 파일이 GitLab에 커밋되었습니다!');
          onSuccess?.();
          handleReset();
        }
      } else {
        const response = await buildWizardApi.commitBuildFiles({
          git_url: gitUrl,
          branch,
          dockerfile: singleDockerfile,
          docker_compose: dockerCompose,
        });

        if (response.success) {
          message.success('빌드 환경 파일이 GitLab에 커밋되었습니다!');
          onSuccess?.();
          handleReset();
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '파일 커밋 실패';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setDetectedType('');
    setSubProjects([]);
    setServices([]);
    setIsMonorepo(false);
    setGeneratedFiles([]);
    setDockerCompose('');
    setSingleDockerfile('');
    form.resetFields();
  };

  // 서비스 선택 토글
  const toggleServiceSelection = (path: string) => {
    setServices(
      services.map(s => (s.path === path ? { ...s, selected: !s.selected } : s))
    );
  };

  // 서비스 속성 업데이트
  const updateService = (
    path: string,
    field: keyof ServiceConfig,
    value: string | number | boolean
  ) => {
    setServices(
      services.map(s => (s.path === path ? { ...s, [field]: value } : s))
    );
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={4}>
              <CodeOutlined /> 프로젝트 분석
            </Title>
            <Paragraph>
              GitLab 저장소를 분석하여 프로젝트 구조와 타입을 자동으로
              감지합니다.
            </Paragraph>

            <Card style={{ marginTop: 16 }}>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div>
                  <Text strong>Git URL:</Text>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      borderRadius: 4,
                      marginTop: 8,
                      fontFamily: 'monospace',
                    }}
                  >
                    {gitUrl}
                  </div>
                </div>
                <div>
                  <Text strong>Branch:</Text>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      borderRadius: 4,
                      marginTop: 8,
                      fontFamily: 'monospace',
                    }}
                  >
                    {branch}
                  </div>
                </div>
              </Space>
            </Card>

            <Alert
              message='자동 감지 기능'
              description='모노레포 구조(backend, frontend 등)를 자동으로 인식하고 각 서브 프로젝트별 빌드 환경을 생성할 수 있습니다.'
              type='info'
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        );

      case 1:
        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={4}>
              <AppstoreOutlined /> 빌드 설정
            </Title>

            {isMonorepo ? (
              // 모노레포 UI
              <>
                <Alert
                  message={`모노레포 감지됨: ${subProjects.length}개의 서브 프로젝트 발견`}
                  description='빌드할 서비스를 선택하고 각 서비스의 설정을 확인하세요.'
                  type='success'
                  showIcon
                  icon={<FolderOutlined />}
                  style={{ marginBottom: 16 }}
                />

                <Table
                  dataSource={services}
                  rowKey='path'
                  pagination={false}
                  size='small'
                  columns={[
                    {
                      title: '선택',
                      width: 60,
                      render: (_, record) => (
                        <Checkbox
                          checked={record.selected}
                          onChange={() => toggleServiceSelection(record.path)}
                        />
                      ),
                    },
                    {
                      title: '경로',
                      dataIndex: 'path',
                      render: path => (
                        <Space>
                          <FolderOutlined />
                          <Text code>{path}</Text>
                        </Space>
                      ),
                    },
                    {
                      title: '프로젝트 타입',
                      dataIndex: 'type',
                      render: type => {
                        const colorMap: Record<string, string> = {
                          nodejs: 'green',
                          python: 'blue',
                          go: 'cyan',
                          java: 'orange',
                          ruby: 'red',
                          php: 'purple',
                        };
                        return (
                          <Tag color={colorMap[type] || 'default'}>
                            {type.toUpperCase()}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: '서비스 이름',
                      dataIndex: 'name',
                      render: (name, record) => (
                        <Input
                          value={name}
                          size='small'
                          style={{ width: 120 }}
                          onChange={e =>
                            updateService(record.path, 'name', e.target.value)
                          }
                          disabled={!record.selected}
                        />
                      ),
                    },
                    {
                      title: '포트',
                      dataIndex: 'port',
                      width: 80,
                      render: (port, record) => (
                        <Input
                          type='number'
                          value={port}
                          size='small'
                          style={{ width: 70 }}
                          onChange={e =>
                            updateService(
                              record.path,
                              'port',
                              parseInt(e.target.value) || 8080
                            )
                          }
                          disabled={!record.selected}
                        />
                      ),
                    },
                    {
                      title: '버전',
                      dataIndex: 'version',
                      width: 100,
                      render: (version, record) => {
                        const config = languageConfigs[record.type];
                        if (!config) return <Text type='secondary'>-</Text>;
                        return (
                          <Select
                            value={version || config.default_version}
                            size='small'
                            style={{ width: 85 }}
                            onChange={value =>
                              updateService(record.path, 'version', value)
                            }
                            disabled={!record.selected}
                          >
                            {config.versions.map(v => (
                              <Option key={v} value={v}>
                                {v}
                              </Option>
                            ))}
                          </Select>
                        );
                      },
                    },
                    {
                      title: '베이스 이미지',
                      dataIndex: 'base_os',
                      width: 120,
                      render: (baseOs, record) => {
                        const config = languageConfigs[record.type];
                        if (!config) return <Text type='secondary'>-</Text>;
                        return (
                          <Select
                            value={baseOs || config.default_os}
                            size='small'
                            style={{ width: 100 }}
                            onChange={value =>
                              updateService(record.path, 'base_os', value)
                            }
                            disabled={!record.selected}
                          >
                            {config.os_options.map(os => (
                              <Option key={os} value={os}>
                                {os}
                              </Option>
                            ))}
                          </Select>
                        );
                      },
                    },
                    {
                      title: (
                        <Tooltip title='컨테이너 상태를 주기적으로 확인'>
                          <Space size={4}>
                            <HeartOutlined style={{ color: '#52c41a' }} />
                            <span>헬스체크</span>
                          </Space>
                        </Tooltip>
                      ),
                      dataIndex: 'enable_healthcheck',
                      width: 90,
                      render: (enabled, record) => (
                        <Switch
                          size='small'
                          checked={enabled !== false}
                          onChange={checked =>
                            updateService(
                              record.path,
                              'enable_healthcheck',
                              checked
                            )
                          }
                          disabled={!record.selected}
                        />
                      ),
                    },
                    {
                      title: (
                        <Tooltip title='보안을 위해 비루트 사용자로 실행'>
                          <Space size={4}>
                            <UserSwitchOutlined style={{ color: '#722ed1' }} />
                            <span>비루트</span>
                          </Space>
                        </Tooltip>
                      ),
                      dataIndex: 'non_root_user',
                      width: 80,
                      render: (enabled, record) => (
                        <Switch
                          size='small'
                          checked={enabled !== false}
                          onChange={checked =>
                            updateService(record.path, 'non_root_user', checked)
                          }
                          disabled={!record.selected}
                        />
                      ),
                    },
                  ]}
                  scroll={{ x: 1000 }}
                />

                <Paragraph style={{ marginTop: 16, color: '#888' }}>
                  💡 선택된 서비스: {services.filter(s => s.selected).length}개
                </Paragraph>
              </>
            ) : (
              // 단일 프로젝트 UI
              <>
                {/* 감지된 정보 요약 카드 */}
                {(detectedFramework ||
                  detectedPackageManager ||
                  detectedBuildType) && (
                  <Card
                    size='small'
                    style={{
                      marginBottom: 16,
                      background: '#f0f5ff',
                      border: '1px solid #adc6ff',
                    }}
                  >
                    <Space
                      direction='vertical'
                      style={{ width: '100%' }}
                      size='small'
                    >
                      <Text strong style={{ color: '#1890ff' }}>
                        <InfoCircleOutlined /> 프로젝트 자동 감지 결과
                      </Text>
                      <Row gutter={[16, 8]}>
                        {detectedFramework && (
                          <Col>
                            <Space size={4}>
                              <Text type='secondary'>프레임워크:</Text>
                              <Tag color='blue'>
                                {FRAMEWORK_INFO[detectedFramework]
                                  ?.display_name || detectedFramework}
                              </Tag>
                            </Space>
                          </Col>
                        )}
                        {detectedPackageManager && (
                          <Col>
                            <Space size={4}>
                              <Text type='secondary'>패키지 매니저:</Text>
                              <Tag color='green'>{detectedPackageManager}</Tag>
                            </Space>
                          </Col>
                        )}
                        {detectedBuildType && (
                          <Col>
                            <Space size={4}>
                              <Text type='secondary'>빌드 타입:</Text>
                              <Tag color='purple'>
                                {BUILD_TYPE_INFO[detectedBuildType as BuildType]
                                  ?.label || detectedBuildType}
                              </Tag>
                            </Space>
                          </Col>
                        )}
                        {hasTypeScript && (
                          <Col>
                            <Tag color='cyan'>TypeScript</Tag>
                          </Col>
                        )}
                      </Row>
                    </Space>
                  </Card>
                )}

                {hasExistingFiles.dockerfile ||
                hasExistingFiles.dockerCompose ? (
                  <Alert
                    message='기존 빌드 파일 발견'
                    description={`이미 존재하는 파일: ${
                      hasExistingFiles.dockerfile ? 'Dockerfile' : ''
                    } ${
                      hasExistingFiles.dockerCompose ? 'docker-compose.yml' : ''
                    }. 계속 진행하면 파일이 덮어쓰기됩니다.`}
                    type='warning'
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                ) : null}

                <Form form={form} layout='vertical'>
                  <Form.Item
                    label='프로젝트 타입'
                    name='project_type'
                    rules={[
                      {
                        required: true,
                        message: '프로젝트 타입을 선택해주세요',
                      },
                    ]}
                  >
                    <Select
                      placeholder='프로젝트 타입 선택'
                      size='large'
                      onChange={value => {
                        // 프로젝트 타입 변경 시 기본 버전/OS 설정
                        const defaults = getDefaultVersionAndOS(value);
                        form.setFieldsValue({
                          version: defaults.version,
                          base_os: defaults.base_os,
                        });
                      }}
                    >
                      <Option value='nodejs'>Node.js</Option>
                      <Option value='python'>Python</Option>
                      <Option value='go'>Go</Option>
                      <Option value='java'>Java</Option>
                      <Option value='ruby'>Ruby</Option>
                      <Option value='php'>PHP</Option>
                      <Option value='rust'>Rust</Option>
                      <Option value='dotnet'>.NET / C#</Option>
                      <Option value='static'>정적 사이트</Option>
                      <Option value='unknown'>기타</Option>
                    </Select>
                  </Form.Item>

                  {/*  [신규] 버전/베이스 이미지 선택 */}
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                      prev.project_type !== curr.project_type
                    }
                  >
                    {({ getFieldValue }) => {
                      const projectType = getFieldValue('project_type');
                      const config = languageConfigs[projectType];

                      if (!config) return null;

                      return (
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={
                                <Space>
                                  <SettingOutlined />
                                  <span>언어 버전</span>
                                </Space>
                              }
                              name='version'
                              extra={`권장: ${config.default_version}`}
                            >
                              <Select placeholder='버전 선택' size='large'>
                                {config.versions.map(v => (
                                  <Option key={v} value={v}>
                                    {v}
                                    {v === config.default_version && (
                                      <Tag
                                        color='blue'
                                        style={{ marginLeft: 8 }}
                                      >
                                        권장
                                      </Tag>
                                    )}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label={
                                <Space>
                                  <SettingFilled />
                                  <span>베이스 이미지</span>
                                </Space>
                              }
                              name='base_os'
                              extra={`권장: ${config.default_os}`}
                            >
                              <Select
                                placeholder='베이스 이미지 선택'
                                size='large'
                              >
                                {config.os_options.map(os => (
                                  <Option key={os} value={os}>
                                    {os}
                                    {os === config.default_os && (
                                      <Tag
                                        color='green'
                                        style={{ marginLeft: 8 }}
                                      >
                                        권장
                                      </Tag>
                                    )}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>
                      );
                    }}
                  </Form.Item>

                  <Divider style={{ margin: '16px 0' }} />

                  <Form.Item
                    label='서비스 이름'
                    name='service_name'
                    rules={[
                      { required: true, message: '서비스 이름을 입력해주세요' },
                    ]}
                    initialValue={serviceName}
                  >
                    <Input placeholder='예: myapp' size='large' />
                  </Form.Item>
                  <Form.Item
                    label='포트 번호'
                    name='port'
                    extra='비워두면 프로젝트 타입별 기본 포트를 사용합니다 (Node.js: 3000, Python: 8000, etc)'
                  >
                    <Input type='number' placeholder='예: 3000' size='large' />
                  </Form.Item>

                  {/* 고급 빌드 옵션 */}
                  <Collapse
                    ghost
                    style={{ marginTop: 16 }}
                    items={[
                      {
                        key: 'advanced',
                        label: (
                          <Space>
                            <SafetyCertificateOutlined />
                            <Text strong>고급 빌드 옵션</Text>
                          </Space>
                        ),
                        children: (
                          <Card size='small' style={{ background: '#fafafa' }}>
                            <Space
                              direction='vertical'
                              style={{ width: '100%' }}
                              size='middle'
                            >
                              {/* 헬스체크 옵션 */}
                              <Row align='middle' justify='space-between'>
                                <Col>
                                  <Space>
                                    <HeartOutlined
                                      style={{ color: '#52c41a' }}
                                    />
                                    <Text>헬스체크 활성화</Text>
                                    <Tooltip title='컨테이너의 상태를 주기적으로 확인하여 문제 발생 시 자동 재시작합니다'>
                                      <InfoCircleOutlined
                                        style={{
                                          color: '#1890ff',
                                          cursor: 'help',
                                        }}
                                      />
                                    </Tooltip>
                                  </Space>
                                </Col>
                                <Col>
                                  <Switch
                                    checked={advancedOptions.enableHealthcheck}
                                    onChange={checked =>
                                      setAdvancedOptions(prev => ({
                                        ...prev,
                                        enableHealthcheck: checked,
                                      }))
                                    }
                                    checkedChildren='ON'
                                    unCheckedChildren='OFF'
                                  />
                                </Col>
                              </Row>

                              {/* 비루트 사용자 옵션 */}
                              <Row align='middle' justify='space-between'>
                                <Col>
                                  <Space>
                                    <UserSwitchOutlined
                                      style={{ color: '#722ed1' }}
                                    />
                                    <Text>비루트 사용자로 실행</Text>
                                    <Tooltip title='보안을 위해 root가 아닌 일반 사용자 권한으로 애플리케이션을 실행합니다'>
                                      <InfoCircleOutlined
                                        style={{
                                          color: '#1890ff',
                                          cursor: 'help',
                                        }}
                                      />
                                    </Tooltip>
                                  </Space>
                                </Col>
                                <Col>
                                  <Switch
                                    checked={advancedOptions.nonRootUser}
                                    onChange={checked =>
                                      setAdvancedOptions(prev => ({
                                        ...prev,
                                        nonRootUser: checked,
                                      }))
                                    }
                                    checkedChildren='ON'
                                    unCheckedChildren='OFF'
                                  />
                                </Col>
                              </Row>

                              <Alert
                                message='프로덕션 권장 설정'
                                description='헬스체크와 비루트 사용자 설정은 Kubernetes 환경에서 안정적인 서비스 운영을 위해 권장됩니다.'
                                type='info'
                                showIcon
                                style={{ marginTop: 8 }}
                              />
                            </Space>
                          </Card>
                        ),
                      },
                    ]}
                  />
                </Form>
              </>
            )}
          </div>
        );

      case 2:
        // 요약 정보 패널 컴포넌트
        const renderSummaryPanel = () => {
          const formValues = form.getFieldsValue();
          const selectedServices = services.filter(s => s.selected);

          return (
            <Card
              title={
                <Space>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  <span>분석 정보 요약</span>
                </Space>
              }
              size='small'
              style={{ height: '100%' }}
            >
              <Space
                direction='vertical'
                style={{ width: '100%' }}
                size='middle'
              >
                {/* 프로젝트 구조 */}
                <div>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    프로젝트 구조
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={isMonorepo ? 'purple' : 'blue'}>
                      {isMonorepo ? '모노레포' : '단일 프로젝트'}
                    </Tag>
                  </div>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {isMonorepo ? (
                  // 모노레포 요약
                  <>
                    <div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        선택된 서비스
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {selectedServices.map(service => (
                          <div
                            key={service.path}
                            style={{
                              padding: '8px 12px',
                              background: '#f5f5f5',
                              borderRadius: 4,
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <FolderOutlined style={{ color: '#1890ff' }} />
                              <Text strong>{service.name}</Text>
                              <Tag color='green' style={{ marginLeft: 'auto' }}>
                                {service.type}
                              </Tag>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#666',
                                marginTop: 4,
                              }}
                            >
                              경로: {service.path} | 포트: {service.port}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        생성 파일
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Space direction='vertical' size={4}>
                          <Text>
                            <FileTextOutlined /> docker-compose.yml
                          </Text>
                          {generatedFiles.map(file => (
                            <Text key={file.path}>
                              <CodeOutlined /> {file.path}/Dockerfile
                            </Text>
                          ))}
                        </Space>
                      </div>
                    </div>
                  </>
                ) : (
                  // 단일 프로젝트 요약
                  <>
                    <div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        프로젝트 타입
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Tag color='green'>
                          {formValues.project_type?.toUpperCase() || '-'}
                        </Tag>
                      </div>
                    </div>

                    <div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        서비스 이름
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text strong>
                          {formValues.service_name || serviceName}
                        </Text>
                      </div>
                    </div>

                    <div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        포트 번호
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text code>
                          {formValues.port ||
                            getDefaultPortForType(formValues.project_type)}
                        </Text>
                      </div>
                    </div>

                    <Divider style={{ margin: '8px 0' }} />

                    <div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        생성 파일
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Space direction='vertical' size={4}>
                          <Text>
                            <CodeOutlined /> Dockerfile
                          </Text>
                          <Text>
                            <FileTextOutlined /> docker-compose.yml
                          </Text>
                        </Space>
                      </div>
                    </div>
                  </>
                )}

                <Divider style={{ margin: '8px 0' }} />

                <Alert
                  message='다음 단계'
                  description="파일 내용을 확인하고 필요시 수정한 후, 'GitLab에 커밋' 버튼을 클릭하세요."
                  type='info'
                  showIcon
                  style={{ fontSize: 12 }}
                />
              </Space>
            </Card>
          );
        };

        return (
          <div style={{ padding: '24px 0' }}>
            <Title level={4}>
              <CheckCircleOutlined /> 파일 미리보기 및 수정
            </Title>
            <Paragraph>
              생성된 빌드 파일을 확인하고 필요시 수정할 수 있습니다.
            </Paragraph>

            <Alert
              message={
                isMonorepo
                  ? `${generatedFiles.length}개의 Dockerfile 생성됨`
                  : '빌드 파일 생성 완료'
              }
              type='success'
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* 기존 파일 덮어쓰기 경고 */}
            {(hasExistingFiles.dockerfile ||
              hasExistingFiles.dockerCompose) && (
              <Alert
                message='기존 빌드 파일이 발견되었습니다'
                description={
                  <div>
                    <p style={{ margin: 0 }}>
                      다음 파일이 이미 존재합니다:
                      {hasExistingFiles.dockerfile && (
                        <Tag color='orange' style={{ marginLeft: 8 }}>
                          Dockerfile
                        </Tag>
                      )}
                      {hasExistingFiles.dockerCompose && (
                        <Tag color='orange' style={{ marginLeft: 8 }}>
                          docker-compose.yml
                        </Tag>
                      )}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontWeight: 500 }}>
                      GitLab에 커밋하면 기존 파일이 덮어쓰기됩니다. 계속
                      진행하시겠습니까?
                    </p>
                  </div>
                }
                type='warning'
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Row gutter={16}>
              {/* 왼쪽: 에디터 */}
              <Col span={16}>
                {isMonorepo ? (
                  // 모노레포: 여러 Dockerfile + docker-compose.yml
                  <Tabs
                    defaultActiveKey='compose'
                    items={[
                      {
                        key: 'compose',
                        label: (
                          <Space>
                            <FileTextOutlined />
                            docker-compose.yml
                          </Space>
                        ),
                        children: (
                          <div
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: 4,
                            }}
                          >
                            <MonacoEditor
                              height='350px'
                              language='yaml'
                              value={dockerCompose}
                              onChange={(value: string | undefined) =>
                                setDockerCompose(value || '')
                              }
                              options={{
                                minimap: { enabled: false },
                                fontSize: 12,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                              }}
                            />
                          </div>
                        ),
                      },
                      ...generatedFiles.map(file => ({
                        key: file.path,
                        label: (
                          <Space>
                            <CodeOutlined />
                            {file.path}/Dockerfile
                            <Tag color='blue'>{file.type}</Tag>
                          </Space>
                        ),
                        children: (
                          <div
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: 4,
                            }}
                          >
                            <MonacoEditor
                              height='350px'
                              language='dockerfile'
                              value={file.dockerfile}
                              onChange={(value: string | undefined) => {
                                const updated = generatedFiles.map(f =>
                                  f.path === file.path
                                    ? { ...f, dockerfile: value || '' }
                                    : f
                                );
                                setGeneratedFiles(updated);
                              }}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 12,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                              }}
                            />
                          </div>
                        ),
                      })),
                    ]}
                  />
                ) : (
                  // 단일 프로젝트
                  <Tabs
                    defaultActiveKey='dockerfile'
                    items={[
                      {
                        key: 'dockerfile',
                        label: (
                          <Space>
                            <CodeOutlined />
                            Dockerfile
                          </Space>
                        ),
                        children: (
                          <div
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: 4,
                            }}
                          >
                            <MonacoEditor
                              height='350px'
                              language='dockerfile'
                              value={singleDockerfile}
                              onChange={(value: string | undefined) =>
                                setSingleDockerfile(value || '')
                              }
                              options={{
                                minimap: { enabled: false },
                                fontSize: 12,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                              }}
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'compose',
                        label: (
                          <Space>
                            <FileTextOutlined />
                            docker-compose.yml
                          </Space>
                        ),
                        children: (
                          <div
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: 4,
                            }}
                          >
                            <MonacoEditor
                              height='350px'
                              language='yaml'
                              value={dockerCompose}
                              onChange={(value: string | undefined) =>
                                setDockerCompose(value || '')
                              }
                              options={{
                                minimap: { enabled: false },
                                fontSize: 12,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                              }}
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
              </Col>

              {/* 오른쪽: 요약 패널 */}
              <Col span={8}>{renderSummaryPanel()}</Col>
            </Row>
          </div>
        );

      default:
        return null;
    }
  };

  const getActionButtons = () => {
    const buttons = [];

    if (currentStep > 0) {
      buttons.push(
        <Button key='back' onClick={() => setCurrentStep(currentStep - 1)}>
          이전
        </Button>
      );
    }

    if (currentStep === 0) {
      buttons.push(
        <Button
          key='detect'
          type='primary'
          onClick={handleDetectProjectType}
          loading={loading}
          icon={<CodeOutlined />}
        >
          프로젝트 분석 시작
        </Button>
      );
    } else if (currentStep === 1) {
      buttons.push(
        <Button
          key='generate'
          type='primary'
          onClick={handleGenerateTemplate}
          loading={loading}
          icon={<FileTextOutlined />}
        >
          템플릿 생성
        </Button>
      );
    } else if (currentStep === 2) {
      buttons.push(
        <Button
          key='commit'
          type='primary'
          icon={<RocketOutlined />}
          onClick={handleCommitFiles}
          loading={loading}
        >
          GitLab에 커밋
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div>
      <Spin spinning={loading} tip={loading ? '처리 중...' : undefined}>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Step title='프로젝트 분석' icon={<CodeOutlined />} />
          <Step title='빌드 설정' icon={<FileTextOutlined />} />
          <Step title='파일 생성' icon={<CheckCircleOutlined />} />
        </Steps>

        {getStepContent()}

        <Divider />

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>{getActionButtons()}</Space>
        </div>
      </Spin>
    </div>
  );
}
