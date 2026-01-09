import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Spin,
  Alert,
  Typography,
  Row,
  Col,
  message,
  Divider,
  Space,
  Select,
  Tag,
  Collapse,
  Radio,
  Card,
  Tooltip,
} from 'antd';
import {
  GithubOutlined,
  UserOutlined,
  RocketOutlined,
  CloudServerOutlined,
  LockOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  EditOutlined,
  CodeSandboxOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { WorkflowStage } from '../../data/mockAIDevOpsData';
import { useCredsStore } from '../../stores/useCredsStore';
import {
  updateServiceRegistryConfig,
  getService,
  type ServiceFromDB,
} from '../../lib/api/service'; //  getService, ServiceFromDB 추가
import type {
  ServiceBuildVersion,
  ServiceBuildVersionsMap,
} from '../../lib/api/build'; //  서비스별 빌드 버전 타입 추가

interface AvailableBuild {
  id: number;
  pipeline_id: number;
  image_tag: string;
  started_at: string;
  infra_name: string;
  docker_username?: string;
  docker_password?: string;
  registry_type?: string;
  registry_url?: string;
  registry_project?: string;
  built_images?: string[];
}

interface ExecutionModalProps {
  open: boolean;
  loading: boolean;
  stageInfo: { stage: WorkflowStage; displayKey: string } | null;
  initialValues?: Record<string, unknown>;
  availableBuilds?: AvailableBuild[]; //  기존 번들 방식 (하위 호환성 유지)
  serviceBuildVersions?: ServiceBuildVersionsMap; //  새로운 서비스별 빌드 버전 방식
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}

interface CredentialState {
  hasAllCredentials: boolean;
  missingCredentials: string[];
  authenticationResult?: 'success' | 'failed' | 'not_tested';
}

const ExecutionModal: React.FC<ExecutionModalProps> = ({
  open,
  loading,
  stageInfo,
  initialValues,
  availableBuilds = [],
  serviceBuildVersions,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [credentialState, setCredentialState] = useState<CredentialState>({
    hasAllCredentials: false,
    missingCredentials: [],
    authenticationResult: 'not_tested',
  });

  // 저장된 자격증명 상태 추적
  const [hasSavedGitCred, setHasSavedGitCred] = useState<boolean>(false);
  const [hasSavedRegistryCred, setHasSavedRegistryCred] =
    useState<boolean>(false);
  const [hasSavedSshCred, setHasSavedSshCred] = useState<boolean>(false);

  //  DB에서 조회한 Registry credential 저장
  const [dbRegistryUsername, setDbRegistryUsername] = useState<string>('');
  const [dbRegistryPassword, setDbRegistryPassword] = useState<string>('');

  // Registry 타입 상태
  const [registryType, setRegistryType] = useState<'harbor' | 'dockerhub'>(
    'harbor'
  );
  const [registryProjectName, setRegistryProjectName] = useState<string>('');

  // Infrastructure 타입 상태
  const [infraType, setInfraType] = useState<string>('');

  //  [신규] 배포 대상 인프라 ID 상태
  const [deployInfraId, setDeployInfraId] = useState<number | undefined>(
    undefined
  );

  // Zustand 스토어 훅
  const { serverlist, upsertServerByHostPort } = useCredsStore();

  const stageName = stageInfo?.displayKey.toUpperCase() || '';

  //  [추가] 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      // 모달이 닫힐 때 모든 상태 초기화
      setCredentialState({
        hasAllCredentials: false,
        missingCredentials: [],
        authenticationResult: 'not_tested',
      });
      setHasSavedGitCred(false);
      setHasSavedRegistryCred(false);
      setHasSavedSshCred(false);
      setDbRegistryUsername('');
      setDbRegistryPassword('');
      setRegistryType('harbor');
      setRegistryProjectName('');
      setInfraType('');
      setDeployInfraId(undefined);
      form.resetFields();
    }
  }, [open, form]);

  // 🐛 [디버깅] ExecutionModal props 로깅
  useEffect(() => {
    if (open) {
    }
  }, [open, stageName, stageInfo, serviceBuildVersions, availableBuilds]);

  //  DB에서 service 정보 조회 (registry_config, infraType)
  useEffect(() => {
    if (!open) {
      return;
    }

    //  [신규] deployInfraId 설정
    if (initialValues?.deployInfraId) {
      setDeployInfraId(initialValues.deployInfraId as number);
    }

    if (!initialValues?.serviceId) {
      // initialValues에 infraType이 있으면 직접 사용
      if (initialValues?.infraType) {
        setInfraType(initialValues.infraType as string);
      }
      return;
    }

    const loadServiceInfo = async () => {
      try {
        const serviceId = initialValues.serviceId as number;
        const service = (await getService(
          serviceId
        )) as unknown as ServiceFromDB;

        //  Infrastructure 타입 설정
        if (service.infraType) {
          setInfraType(service.infraType);
        } else {
        }

        //  DB에서 GitLab 인증 정보 조회 (gitlab_config에서 token 확인)
        if (service.gitlab_config && service.gitlab_config.trim() !== '') {
          try {
            const gitlabConfig = JSON.parse(service.gitlab_config);
            //  token 또는 access_token 중 하나를 사용 (하위 호환성)
            const token = gitlabConfig.token || gitlabConfig.access_token;

            if (token && gitlabConfig.username) {
              setHasSavedGitCred(true);
            } else {
              console.warn(
                '[ExecutionModal] ⚠️ GitLab token 또는 username이 비어있음'
              );
            }
          } catch (error) {
            console.error(
              '[ExecutionModal]  GitLab config 파싱 실패:',
              error
            );
          }
        } else {
          console.warn('[ExecutionModal] ⚠️ gitlab_config가 없거나 비어있음');
        }

        //  DB에서 Registry 인증 정보 조회 (우선순위 1)
        if (service.registry_config) {
          try {
            const registryConfig = JSON.parse(service.registry_config);
            if (registryConfig.username && registryConfig.password) {
              setDbRegistryUsername(registryConfig.username);
              setDbRegistryPassword(registryConfig.password);
            }
          } catch (error) {
            // Registry config JSON 파싱 실패 시 무시하고 계속 진행
            console.warn('Registry config 파싱 실패:', error);
          }
        }
      } catch (error) {
        // DB 조회 실패 시 무시하고 localStorage로 fallback
        console.warn('Service 정보 조회 실패:', error);
      }
    };

    void loadServiceInfo();
  }, [open, initialValues?.serviceId]);

  // 스토어에서 필요한 자격증명 정보 확인 및 자동 입력
  const checkAndFillCredentials = React.useCallback(() => {
    if (!initialValues || !open) return;

    const missingCreds: string[] = [];
    const formValues: Record<string, unknown> = { ...initialValues };

    // 1. SSH 서버 정보 확인 및 자동 입력
    let allSshSaved = false;
    if (initialValues.hops) {
      let savedSshCount = 0;
      const hopArray = initialValues.hops as any[];

      formValues.hops = hopArray.map((hop: any) => {
        //  [수정] username + infraId를 기반으로 서버 credential 검색 (정확 매칭 우선)
        // 1순위: host + port + username + infraId 정확 매칭
        let serverCred = serverlist.find(
          s =>
            s.host?.toLowerCase() === hop.host?.toLowerCase() &&
            (s.port || 22) === (hop.port || 22) &&
            s.userId === hop.username &&
            (deployInfraId
              ? s.infraId === deployInfraId
              : s.infraId === undefined)
        );
        // 2순위: host + port + infraId 매칭 (username 무시)
        if (!serverCred) {
          serverCred = serverlist.find(
            s =>
              s.host?.toLowerCase() === hop.host?.toLowerCase() &&
              (s.port || 22) === (hop.port || 22) &&
              (deployInfraId
                ? s.infraId === deployInfraId
                : s.infraId === undefined)
          );
        }

        if (serverCred && serverCred.password) {
          savedSshCount++;
          return {
            ...hop,
            username: hop.username || serverCred.userId || '', // username 우선, 없으면 savedCred에서
            password: serverCred.password,
          };
        } else {
          missingCreds.push(`SSH ${hop.host || 'unknown'}:${hop.port || 22}`);
          return {
            ...hop,
            username: hop.username || serverCred?.userId || '', // username 보존
          };
        }
      });

      allSshSaved = savedSshCount === hopArray.length && hopArray.length > 0;
      setHasSavedSshCred(allSshSaved);
    }

    // 2. Git Repository 인증 정보는 DB의 gitlab_config에서 관리
    // Git 인증 정보는 loadServiceInfo에서 hasSavedGitCred로 설정됨

    // 3. Docker Registry 인증 정보 확인 및 자동 입력
    const _dockerRegistry = initialValues.dockerRegistry as string;

    //  [우선순위 1] DB에서 조회한 Registry credential 사용
    if (dbRegistryUsername && dbRegistryPassword) {
      formValues.credentials = {
        ...((formValues.credentials as Record<string, unknown>) || {}),
        docker_username: dbRegistryUsername,
        docker_password: dbRegistryPassword,
      };
      setHasSavedRegistryCred(true);
    }
    //  [우선순위 2] initialValues.credentials에 이미 docker_username/docker_password가 있으면 사용
    else if (
      (initialValues.credentials as any)?.docker_username &&
      (initialValues.credentials as any)?.docker_password
    ) {
      const existingDockerUsername = (initialValues.credentials as any)
        ?.docker_username;
      const existingDockerPassword = (initialValues.credentials as any)
        ?.docker_password;

      // 이미 배포 시 빌드에서 가져온 인증 정보가 있으면 그대로 사용
      formValues.credentials = {
        ...((formValues.credentials as Record<string, unknown>) || {}),
        docker_username: existingDockerUsername,
        docker_password: existingDockerPassword,
      };
      setHasSavedRegistryCred(true);
    }
    //  [변경] localStorage 제거 - DB 인증 정보만 사용
    else {
      missingCreds.push('Docker Registry');
      setHasSavedRegistryCred(false);
    }

    // 상태 업데이트
    const hasAllCreds = missingCreds.length === 0;
    setCredentialState({
      hasAllCredentials: hasAllCreds,
      missingCredentials: missingCreds,
      authenticationResult: 'not_tested',
    });

    // 폼 값 설정
    form.setFieldsValue(formValues);

    return { hasAllCreds, missingCreds, formValues };
  }, [
    initialValues,
    serverlist,
    form,
    open,
    dbRegistryUsername,
    dbRegistryPassword,
    deployInfraId,
  ]); //  deployInfraId 추가

  // 빌드 이미지 선택 시 registry 인증 정보 자동 입력
  const handleBuildImageChange = React.useCallback(
    (selectedImageTag: string) => {
      // 선택된 빌드 찾기
      const selectedBuild = availableBuilds.find(
        build => build.image_tag === selectedImageTag
      );

      if (
        selectedBuild &&
        selectedBuild.docker_username &&
        selectedBuild.docker_password
      ) {
        // 폼 필드 업데이트
        form.setFieldsValue({
          credentials: {
            ...form.getFieldValue('credentials'),
            docker_username: selectedBuild.docker_username,
            docker_password: selectedBuild.docker_password,
          },
        });

        // Registry 타입 및 프로젝트명 업데이트
        if (selectedBuild.registry_type) {
          setRegistryType(
            selectedBuild.registry_type as 'harbor' | 'dockerhub'
          );
          form.setFieldsValue({ registry_type: selectedBuild.registry_type });
        }
        if (selectedBuild.registry_project) {
          setRegistryProjectName(selectedBuild.registry_project);
        }

        // 저장된 인증 정보 상태 업데이트
        setHasSavedRegistryCred(true);
      } else {
        setHasSavedRegistryCred(false);
      }
    },
    [availableBuilds, form]
  );

  // Registry 타입 자동 판단
  useEffect(() => {
    if (open && initialValues?.dockerRegistry) {
      const dockerRegistry = initialValues.dockerRegistry as string;
      if (
        dockerRegistry.includes('docker.io') ||
        dockerRegistry.includes('hub.docker.com')
      ) {
        setRegistryType('dockerhub');
      } else {
        setRegistryType('harbor');
      }
    }
  }, [open, initialValues]);

  // 모달이 열릴 때 자격증명 정보를 스토어에서 자동으로 채움
  useEffect(() => {
    if (open && initialValues) {
      checkAndFillCredentials();
    }
  }, [open, initialValues, checkAndFillCredentials]);

  //  모달이 열리고 availableBuilds가 있을 때 첫 번째 빌드의 credentials 자동 설정
  useEffect(() => {
    if (open && availableBuilds.length > 0 && stageName === 'DEPLOY') {
      const firstBuild = availableBuilds[0];

      if (firstBuild.docker_username && firstBuild.docker_password) {
        // 폼 필드 자동 설정
        setTimeout(() => {
          form.setFieldsValue({
            credentials: {
              ...form.getFieldValue('credentials'),
              docker_username: firstBuild.docker_username,
              docker_password: firstBuild.docker_password,
            },
          });

          // Registry 타입 및 프로젝트명 자동 설정
          if (firstBuild.registry_type) {
            setRegistryType(firstBuild.registry_type as 'harbor' | 'dockerhub');
            form.setFieldsValue({ registry_type: firstBuild.registry_type });
          }
          if (firstBuild.registry_project) {
            setRegistryProjectName(firstBuild.registry_project);
          }

          setHasSavedRegistryCred(true);
        }, 100); // checkAndFillCredentials 이후에 실행되도록 약간의 지연
      }
    }
  }, [open, availableBuilds, stageName, form]);

  // 폼 제출 시 스토어에 저장
  const handleSubmit = React.useCallback(
    async (values: Record<string, unknown>) => {
      // 🐛 [디버깅] 폼 제출 값 로깅

      //  [수정] camelCase를 snake_case로 변환 (backend 호환성)
      if (values.selectedServiceImages) {
        values.selected_service_images = values.selectedServiceImages;
        delete values.selectedServiceImages;
      }
      if (values.selectedImageTag) {
        values.selected_image_tag = values.selectedImageTag;
        delete values.selectedImageTag;
      }

      try {
        // 1. SSH 서버 정보 스토어에 저장
        if (values.hops && initialValues.hops) {
          const initialHops = initialValues.hops as any[];
          const submittedHops = values.hops as any[];

          initialHops.forEach((initialHop: any, index: number) => {
            const submittedHop = submittedHops[index] || {};
            //  [수정] form에서 제출된 username 사용 (사용자가 수정 가능)
            const finalUsername = submittedHop.username || initialHop.username;
            if (submittedHop.password && initialHop.host && finalUsername) {
              upsertServerByHostPort({
                host: initialHop.host,
                port: initialHop.port || 22,
                userId: finalUsername,
                password: submittedHop.password,
                infraId: deployInfraId, //  [수정] 운영 모달에서 credential 조회 위해 infraId 추가
                serviceId: initialValues?.serviceId as number | undefined, //  [신규] 서비스별 credential 구분
                hopOrder: index, //  [신규] SSH hop 순서 추가
              });
            }
          });
        }

        // 2. Git Repository 정보 스토어에 저장
        const credentials = values.credentials as Record<string, unknown>;
        if (
          credentials?.username_repo &&
          credentials?.password_repo &&
          initialValues?.gitUrl
        ) {
          // Git URL에서 baseUrl 추출
          let baseUrl = initialValues.gitUrl as string;
          try {
            const url = new URL(baseUrl);
            baseUrl = `${url.protocol}//${url.host}`;
          } catch {
            // URL parsing failed - use original value
          }

          //  [변경] Git 자격증명은 DB에서 관리 (localStorage 저장 제거)
        }

        // 3. Docker Registry 정보는 DB에서 관리 (localStorage 저장 제거)
        if (
          credentials?.docker_username &&
          credentials?.docker_password &&
          initialValues?.dockerRegistry
        ) {
          // 서비스의 Registry 설정 업데이트 (타입과 프로젝트명 포함)
          if (initialValues?.serviceId) {
            try {
              await updateServiceRegistryConfig(
                initialValues.serviceId as number,
                initialValues.dockerRegistry as string,
                (values.registry_type as 'dockerhub' | 'harbor') ||
                  registryType,
                registryProjectName || undefined
              );
            } catch {
              // Registry config update failed - store save succeeded, continue
            }
          }
        }

        message.success('자격증명 정보가 저장되었습니다.');

        // 원래 onSubmit 호출
        onSubmit(values);
      } catch {
        // Credential save failed
        message.error('자격증명 저장 중 오류가 발생했습니다.');
      }
    },
    [
      upsertServerByHostPort,
      initialValues,
      onSubmit,
      registryType,
      registryProjectName,
    ]
  );

  // 실제 모달 표시 여부는 open 프롭으로 결정 (부모에서 제어)
  const actualOpen = open;

  return (
    <Modal
      open={actualOpen}
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
          {/* 왼쪽: 아이콘 + 제목 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
            }}
          >
            <RocketOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {stageName === 'DEPLOY' ? '배포 실행' : `${stageName} 단계 실행`}
            </span>
          </div>

          {/* 오른쪽: 주요 액션 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Button
              size='small'
              onClick={onCancel}
              style={{ marginRight: '8px' }}
            >
              취소
            </Button>
            <Button
              type='primary'
              size='small'
              icon={<RocketOutlined />}
              onClick={() => form.submit()}
              loading={loading}
              style={{ minWidth: '100px', height: '28px' }}
            >
              {stageName === 'DEPLOY' ? '배포 실행' : '실행 시작'}
            </Button>
          </div>
        </div>
      }
      onCancel={onCancel}
      closeIcon={false}
      afterClose={() => form.resetFields()}
      width={700}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loading} tip='정보를 가져오는 중입니다...'>
        {/* 자격증명 상태 알림 */}
        {credentialState.missingCredentials.length > 0 && (
          <Alert
            message='일부 자격증명이 누락되었습니다'
            description={`다음 항목의 자격증명을 입력해주세요: ${credentialState.missingCredentials.join(', ')}`}
            type='warning'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {credentialState.hasAllCredentials &&
          credentialState.authenticationResult === 'failed' && (
            <Alert
              message='인증 실패'
              description='저장된 자격증명으로 인증에 실패했습니다. 정보를 확인하고 다시 시도해주세요.'
              type='error'
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          autoComplete='off'
          key={JSON.stringify(initialValues)}
          initialValues={initialValues}
        >
          {/*  [신규] 배포 단계일 때만 빌드 이미지 선택 UI 표시 */}
          {/* 서비스별 빌드 버전 선택 방식 (멀티-서비스 프로젝트용) */}
          {stageName === 'DEPLOY' &&
            serviceBuildVersions &&
            Object.keys(serviceBuildVersions).length > 0 &&
            (() => {
              const serviceNames = Object.keys(serviceBuildVersions).sort();

              return (
                <>
                  <Divider orientation='left' style={{ margin: '16px 0' }}>
                    <Space>
                      <BuildOutlined style={{ color: '#1890ff' }} />
                      <Typography.Text strong>
                        서비스별 빌드 버전 선택
                      </Typography.Text>
                      <Tag color='blue'>{serviceNames.length}개 서비스</Tag>
                    </Space>
                  </Divider>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    {serviceNames.map(serviceName => {
                      const versions = serviceBuildVersions[serviceName];
                      if (!versions || versions.length === 0) return null;

                      return (
                        <div
                          key={serviceName}
                          style={{
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '12px',
                            backgroundColor: '#fafafa',
                          }}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <Space size={4}>
                              <CodeSandboxOutlined
                                style={{ color: '#1890ff', fontSize: '14px' }}
                              />
                              <Typography.Text
                                strong
                                style={{ fontSize: '13px' }}
                              >
                                {serviceName}
                              </Typography.Text>
                              <Tag
                                color='blue'
                                style={{
                                  fontSize: '11px',
                                  padding: '0 4px',
                                  margin: 0,
                                }}
                              >
                                {versions.length}
                              </Tag>
                            </Space>
                          </div>

                          <Form.Item
                            name={['selectedServiceImages', serviceName]}
                            initialValue={versions[0]?.image_url}
                            rules={[
                              {
                                required: true,
                                message: `${serviceName} 버전 선택`,
                              },
                            ]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select
                              size='small'
                              placeholder='버전 선택'
                              style={{ width: '100%', fontSize: '12px' }}
                              optionLabelProp='label'
                            >
                              {versions.map(
                                (
                                  version: ServiceBuildVersion,
                                  index: number
                                ) => (
                                  <Select.Option
                                    key={version.image_url}
                                    value={version.image_url}
                                    label={
                                      <Space size={4}>
                                        {index === 0 && (
                                          <Tag
                                            color='green'
                                            style={{
                                              fontSize: '10px',
                                              padding: '0 4px',
                                              margin: 0,
                                            }}
                                          >
                                            최신
                                          </Tag>
                                        )}
                                        <span style={{ fontSize: '12px' }}>
                                          {version.image_tag}
                                        </span>
                                      </Space>
                                    }
                                  >
                                    <div>
                                      <div style={{ marginBottom: '4px' }}>
                                        <Space size={4}>
                                          {index === 0 && (
                                            <Tag
                                              color='green'
                                              style={{
                                                fontSize: '10px',
                                                padding: '0 4px',
                                                margin: 0,
                                              }}
                                            >
                                              최신
                                            </Tag>
                                          )}
                                          <Typography.Text
                                            strong
                                            style={{ fontSize: '12px' }}
                                          >
                                            {version.image_tag}
                                          </Typography.Text>
                                        </Space>
                                      </div>
                                      <Typography.Text
                                        type='secondary'
                                        style={{ fontSize: '11px' }}
                                      >
                                        <ClockCircleOutlined
                                          style={{ fontSize: '10px' }}
                                        />{' '}
                                        {new Date(
                                          version.started_at
                                        ).toLocaleDateString('ko-KR', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </Typography.Text>
                                    </div>
                                  </Select.Option>
                                )
                              )}
                            </Select>
                          </Form.Item>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

          {/* 기존 번들 방식 (하위 호환성 유지) */}
          {/*  [수정] serviceBuildVersions가 없거나 빈 객체일 때 fallback 표시 */}
          {stageName === 'DEPLOY' &&
            (!serviceBuildVersions ||
              Object.keys(serviceBuildVersions).length === 0) &&
            availableBuilds &&
            availableBuilds.length > 0 &&
            (() => {
              return (
                <>
                  <Divider>
                    <Typography.Text type='secondary' style={{ fontSize: 14 }}>
                      <BuildOutlined /> 배포할 빌드 이미지 선택
                    </Typography.Text>
                  </Divider>

                  <Alert
                    message='빌드 이미지 선택'
                    description='배포할 빌드 버전을 선택하세요. 최신 빌드(맨 위)가 기본으로 선택됩니다.'
                    type='info'
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Form.Item
                    name='selectedImageTag'
                    initialValue={availableBuilds[0]?.image_tag}
                    rules={[
                      { required: true, message: '빌드 버전을 선택해주세요.' },
                    ]}
                  >
                    <Radio.Group
                      style={{ width: '100%' }}
                      onChange={e => handleBuildImageChange(e.target.value)}
                    >
                      <Space direction='vertical' style={{ width: '100%' }}>
                        {availableBuilds.map(
                          (build: AvailableBuild, index: number) => {
                            // 빌드된 모든 이미지 경로 표시 (built_images 배열 전체)
                            const hasMultipleImages =
                              build.built_images &&
                              build.built_images.length > 0;
                            const fallbackImagePath =
                              build.registry_url && build.registry_project
                                ? `${build.registry_url}/${build.registry_project}/*:${build.image_tag}`
                                : build.image_tag;

                            return (
                              <Radio.Button
                                key={build.id}
                                value={build.image_tag}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  padding: 0,
                                }}
                              >
                                <Card
                                  size='small'
                                  style={{
                                    border: 'none',
                                    boxShadow: 'none',
                                    background: 'transparent',
                                  }}
                                  bodyStyle={{ padding: '12px 16px' }}
                                >
                                  <Row gutter={[16, 8]}>
                                    <Col span={24}>
                                      <Space size='small' wrap>
                                        {index === 0 && (
                                          <Tag
                                            color='green'
                                            icon={<CheckCircleOutlined />}
                                          >
                                            최신
                                          </Tag>
                                        )}
                                        <Tag
                                          color='blue'
                                          icon={<BuildOutlined />}
                                        >
                                          {build.image_tag}
                                        </Tag>
                                        <Typography.Text
                                          type='secondary'
                                          style={{ fontSize: 12 }}
                                        >
                                          <ClockCircleOutlined />{' '}
                                          {new Date(
                                            build.started_at
                                          ).toLocaleString('ko-KR')}
                                        </Typography.Text>
                                        {hasMultipleImages && (
                                          <Tag color='purple'>
                                            {build.built_images.length}개 이미지
                                          </Tag>
                                        )}
                                      </Space>
                                    </Col>

                                    {/* 빌드된 모든 이미지 표시 */}
                                    <Col span={24}>
                                      {hasMultipleImages ? (
                                        <Space
                                          direction='vertical'
                                          size={4}
                                          style={{ width: '100%' }}
                                        >
                                          <Typography.Text
                                            type='secondary'
                                            style={{ fontSize: 11 }}
                                          >
                                            빌드된 이미지:
                                          </Typography.Text>
                                          {build.built_images.map(
                                            (
                                              imagePath: string,
                                              imgIndex: number
                                            ) => (
                                              <Tooltip
                                                key={imgIndex}
                                                title='클릭하여 이미지 경로 복사'
                                              >
                                                <Typography.Text
                                                  style={{
                                                    fontSize: 12,
                                                    fontFamily: 'monospace',
                                                    color: '#666',
                                                    wordBreak: 'break-all',
                                                    display: 'block',
                                                    paddingLeft: '8px',
                                                  }}
                                                  copyable={{ text: imagePath }}
                                                >
                                                  <DatabaseOutlined
                                                    style={{ marginRight: 4 }}
                                                  />
                                                  {imagePath}
                                                </Typography.Text>
                                              </Tooltip>
                                            )
                                          )}
                                        </Space>
                                      ) : (
                                        <Tooltip title='빌드된 이미지 전체 경로'>
                                          <Typography.Text
                                            style={{
                                              fontSize: 12,
                                              fontFamily: 'monospace',
                                              color: '#666',
                                              wordBreak: 'break-all',
                                            }}
                                            copyable={{
                                              text: fallbackImagePath,
                                            }}
                                          >
                                            <DatabaseOutlined
                                              style={{ marginRight: 4 }}
                                            />
                                            {fallbackImagePath}
                                          </Typography.Text>
                                        </Tooltip>
                                      )}
                                    </Col>

                                    <Col span={24}>
                                      <Typography.Text
                                        type='secondary'
                                        style={{ fontSize: 11 }}
                                      >
                                        파이프라인 #{build.pipeline_id}
                                        {build.infra_name &&
                                          build.infra_name !== 'N/A' && (
                                            <> • 인프라: {build.infra_name}</>
                                          )}
                                      </Typography.Text>
                                    </Col>
                                  </Row>
                                </Card>
                              </Radio.Button>
                            );
                          }
                        )}
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </>
              );
            })()}

          {/* SSH Hops */}
          {((initialValues?.hops as any[]) || []).length > 0 && (
            <>
              <Divider>SSH 접속 정보</Divider>
              <Collapse
                defaultActiveKey={hasSavedSshCred ? [] : ['ssh']}
                items={[
                  {
                    key: 'ssh',
                    label: (
                      <Space>
                        <CloudServerOutlined />
                        <Typography.Text strong>
                          SSH 접속 정보 (
                          {((initialValues?.hops as any[]) || []).length}개 hop)
                        </Typography.Text>
                        {hasSavedSshCred && (
                          <Tag color='success' icon={<CheckCircleOutlined />}>
                            저장됨
                          </Tag>
                        )}
                      </Space>
                    ),
                    extra: hasSavedSshCred && <EditOutlined />,
                    children: (
                      <>
                        {/*  [수정] infraType에 따른 메시지 표시 */}
                        {infraType && (
                          <Alert
                            message={
                              infraType === 'kubernetes' ||
                              infraType === 'external_kubernetes'
                                ? 'Master 노드 자동 선택'
                                : '대상 서버 자동 연결'
                            }
                            description={
                              infraType === 'kubernetes' ||
                              infraType === 'external_kubernetes'
                                ? '배포는 Master 노드에서 자동으로 실행됩니다. SSH 인증 정보를 입력하세요.'
                                : infraType === 'docker' ||
                                    infraType === 'external_docker'
                                  ? '배포는 선택된 Docker 서버에서 자동으로 실행됩니다. SSH 인증 정보를 입력하세요.'
                                  : infraType === 'podman' ||
                                      infraType === 'external_podman'
                                    ? '배포는 선택된 Podman 서버에서 자동으로 실행됩니다. SSH 인증 정보를 입력하세요.'
                                    : '배포는 선택된 서버에서 자동으로 실행됩니다. SSH 인증 정보를 입력하세요.'
                            }
                            type='info'
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                        )}

                        {((initialValues?.hops as any[]) || []).map(
                          (hop: any, index: number) => {
                            // 저장된 credential 확인
                            const hasSavedCred = form.getFieldValue([
                              'hops',
                              index,
                              'password',
                            ]);
                            return (
                              <div
                                key={index}
                                style={{
                                  marginBottom: 16,
                                  border: '1px solid #f0f0f0',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  backgroundColor: hasSavedCred
                                    ? '#f6ffed'
                                    : undefined,
                                }}
                              >
                                {/* Hidden fields to preserve hop data */}
                                <Form.Item
                                  name={['hops', index, 'host']}
                                  hidden
                                  initialValue={hop.host}
                                >
                                  <Input />
                                </Form.Item>
                                <Form.Item
                                  name={['hops', index, 'port']}
                                  hidden
                                  initialValue={hop.port}
                                >
                                  <Input />
                                </Form.Item>

                                <Space style={{ marginBottom: 12 }}>
                                  <Typography.Text
                                    strong
                                    style={{ color: '#1890ff' }}
                                  >
                                    <CloudServerOutlined /> Hop {index + 1}:{' '}
                                    {hop.host}:{hop.port}
                                  </Typography.Text>
                                  {hasSavedCred && (
                                    <Tag
                                      color='success'
                                      icon={<LockOutlined />}
                                      style={{ fontSize: '11px' }}
                                    >
                                      저장됨 (●●●●●●)
                                    </Tag>
                                  )}
                                </Space>
                                <Row gutter={16}>
                                  <Col span={12}>
                                    {/*  [수정] SSH 사용자명 입력 가능하도록 변경 */}
                                    <Form.Item
                                      name={['hops', index, 'username']}
                                      label={
                                        <Typography.Text
                                          type='secondary'
                                          style={{ fontSize: 12 }}
                                        >
                                          SSH 사용자명
                                        </Typography.Text>
                                      }
                                      rules={[
                                        {
                                          required: true,
                                          message:
                                            'SSH 사용자명을 입력해주세요.',
                                        },
                                      ]}
                                    >
                                      <Input
                                        placeholder='SSH 사용자명'
                                        prefix={<UserOutlined />}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item
                                      name={['hops', index, 'password']}
                                      label={
                                        <Typography.Text
                                          type='secondary'
                                          style={{ fontSize: 12 }}
                                        >
                                          SSH 비밀번호
                                        </Typography.Text>
                                      }
                                      rules={[
                                        {
                                          required: true,
                                          message:
                                            'SSH 비밀번호를 입력해주세요.',
                                        },
                                      ]}
                                    >
                                      <Input.Password placeholder='SSH 비밀번호' />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </div>
                            );
                          }
                        )}
                      </>
                    ),
                  },
                ]}
              />
            </>
          )}

          {/* Git 자격증명 상태 표시 (읽기 전용) */}
          <Divider>GitLab 저장소 인증</Divider>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: hasSavedGitCred ? '#f6ffed' : '#fff7e6',
              border: `1px solid ${hasSavedGitCred ? '#b7eb8f' : '#ffd591'}`,
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <Space>
              <GithubOutlined
                style={{
                  fontSize: '16px',
                  color: hasSavedGitCred ? '#52c41a' : '#fa8c16',
                }}
              />
              <Typography.Text strong>Git 인증 정보</Typography.Text>
              {hasSavedGitCred ? (
                <>
                  <Tag color='success' icon={<CheckCircleOutlined />}>
                    저장됨
                  </Tag>
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: '12px' }}
                  >
                    ({form.getFieldValue(['credentials', 'username_repo'])} /
                    ●●●●●●)
                  </Typography.Text>
                </>
              ) : (
                <>
                  <Tag color='warning'>미설정</Tag>
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: '12px' }}
                  >
                    서비스 정보 수정에서 GitLab 토큰을 설정하세요
                  </Typography.Text>
                </>
              )}
            </Space>
            {/* Hidden fields to preserve credential data */}
            <Form.Item name={['credentials', 'username_repo']} hidden>
              <Input />
            </Form.Item>
            <Form.Item name={['credentials', 'password_repo']} hidden>
              <Input />
            </Form.Item>
          </div>

          {/* Registry 자격증명 상태 표시 (읽기 전용) */}
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
                    ({form.getFieldValue(['credentials', 'docker_username'])} /
                    ●●●●●●)
                  </Typography.Text>
                  {registryProjectName && (
                    <Tag color='blue'>
                      {registryType === 'harbor'
                        ? `프로젝트: ${registryProjectName}`
                        : registryProjectName}
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
            {/* Hidden fields to preserve credential data */}
            <Form.Item name={['credentials', 'docker_username']} hidden>
              <Input />
            </Form.Item>
            <Form.Item name={['credentials', 'docker_password']} hidden>
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ExecutionModal;
