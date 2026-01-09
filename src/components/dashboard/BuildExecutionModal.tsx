import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Spin,
  Alert,
  Space,
  Select,
  Typography,
  Row,
  Col,
  message,
  Divider,
  Collapse,
  Tag,
} from 'antd';
import {
  CloudServerOutlined,
  GithubOutlined,
  CodeSandboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  getBuildInfras,
  getServers,
  getServerHops,
  testGitAuthentication,
  testRegistryAuthentication,
} from '../../lib/api/infra';
import type { InfraItem, Server, SshHop } from '../../types/infra';
import { useCredsStore } from '../../stores/useCredsStore';
import {
  updateServiceRegistryConfig,
  getService,
  type ServiceFromDB,
} from '../../lib/api/service'; //  getService, ServiceFromDB 추가
import { getHarborProjects, type HarborProject } from '../../lib/api/harbor';
import { getDockerHubRepositories } from '../../lib/api/dockerhub';
import type { DockerHubRepository } from '../../types/dockerhub';
import ServiceSelectionModal from './ServiceSelectionModal';

interface BuildExecutionModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    infra_id: number;
    server_id: number;
    hops: SshHop[];
    //  Backend는 최상위 레벨에서 credential을 기대함
    username_repo?: string;
    password_repo?: string;
    docker_username?: string;
    docker_password?: string;
    //  [신규] 선택된 서비스 목록 (빌드할 서비스만 선택)
    selected_services?: string[];
    //  [신규] 빌드 완료 후 자동 배포 여부
    auto_deploy?: boolean;
  }) => void;
  serviceId?: number; // 서비스 ID (Registry 설정 업데이트용)
  gitUrl?: string; // Git 저장소 URL
  registryUrl?: string; // Docker Registry URL
  gitBranch?: string; //  Git 브랜치 (빌드 대상 브랜치)
  defaultAutoDeploy?: boolean; //  [신규] 빌드 완료 후 자동 배포 기본값 (서비스 목록에서 "빌드+배포" 버튼 클릭 시 true)
}

const BuildExecutionModal: React.FC<BuildExecutionModalProps> = ({
  open,
  onCancel,
  onSubmit,
  serviceId,
  gitUrl: propGitUrl,
  registryUrl: propRegistryUrl,
  gitBranch: propGitBranch,
  defaultAutoDeploy = false, //  [신규] 빌드 완료 후 자동 배포 기본값
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [infras, setInfras] = useState<InfraItem[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedInfra, setSelectedInfra] = useState<InfraItem | null>(null);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [sshHops, setSshHops] = useState<SshHop[]>([]);
  const [pendingInfraId, setPendingInfraId] = useState<number | null>(null); //  서비스의 infra_id 임시 저장

  // 인증 상태 관리
  const [_gitAuthStatus, setGitAuthStatus] = useState<
    'idle' | 'testing' | 'success' | 'failed'
  >('idle');
  const [_registryAuthStatus, setRegistryAuthStatus] = useState<
    'idle' | 'testing' | 'success' | 'failed'
  >('idle');
  const [gitUrl, setGitUrl] = useState<string>('');
  const [gitBranch, setGitBranch] = useState<string>('main'); //  Git 브랜치 (기본값: main)
  const [registryUrl, setRegistryUrl] = useState<string>('');
  const [registryType, setRegistryType] = useState<'dockerhub' | 'harbor'>(
    'harbor'
  );
  const [projectName, setProjectName] = useState<string>('');

  // Harbor 프로젝트 상태 관리
  const [_harborProjects, setHarborProjects] = useState<HarborProject[]>([]);
  const [_loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [_projectsError, setProjectsError] = useState<string | null>(null);

  // Docker Hub 저장소 상태 관리
  const [_dockerHubRepositories, setDockerHubRepositories] = useState<
    DockerHubRepository[]
  >([]);
  const [_loadingDockerHubRepos, setLoadingDockerHubRepos] =
    useState<boolean>(false);
  const [_dockerHubReposError, setDockerHubReposError] = useState<
    string | null
  >(null);
  const [_selectedDockerHubRepo, _setSelectedDockerHubRepo] =
    useState<string>('');

  // Credential 저장 여부 및 접기/펼치기 상태
  const [hasSavedGitCred, setHasSavedGitCred] = useState<boolean>(false);
  const [hasSavedRegistryCred, setHasSavedRegistryCred] =
    useState<boolean>(false);
  const [hasSavedSshCred, setHasSavedSshCred] = useState<boolean>(false);

  //  [신규] 서비스 선택 모달 상태
  const [serviceSelectionModalOpen, setServiceSelectionModalOpen] =
    useState<boolean>(false);
  const [_selectedServices, setSelectedServices] = useState<
    string[] | undefined
  >(undefined);
  const [pendingFormValues, setPendingFormValues] = useState<any>(null);
  const [_pendingAutoDeploy, setPendingAutoDeploy] = useState<boolean>(false);

  const { serverlist, upsertServerByHostPort } = useCredsStore();

  //  [추가] 모달이 닫히거나 서비스가 변경될 때 상태 초기화
  useEffect(() => {
    if (!open) {
      // 모달이 닫힐 때 모든 상태 초기화
      setSelectedInfra(null);
      setSelectedServer(null);
      setServers([]);
      setSshHops([]);
      setPendingInfraId(null);
      setHasSavedGitCred(false);
      setHasSavedRegistryCred(false);
      setHasSavedSshCred(false);
      setGitAuthStatus('idle');
      setRegistryAuthStatus('idle');
      form.resetFields();
    }
  }, [open, form]);

  // Git URL, Branch 및 Registry URL 설정
  useEffect(() => {
    if (propGitUrl) {
      setGitUrl(propGitUrl);
    }
    if (propGitBranch) {
      setGitBranch(propGitBranch);
    }
    if (propRegistryUrl) {
      try {
        // registry_config는 JSON 문자열: {"project_name":"test","registry_url":"harbor.mipllab.com"}
        const config = JSON.parse(propRegistryUrl);
        if (config.registry_url) {
          setRegistryUrl(config.registry_url);
        }
        if (config.project_name) {
          setProjectName(config.project_name);
        }
        // registry_url로 타입 자동 판단
        if (config.registry_url && config.registry_url.includes('docker.io')) {
          setRegistryType('dockerhub');
        } else {
          setRegistryType('harbor');
        }
      } catch {
        // JSON parsing failed - use raw string as registry URL
        setRegistryUrl(propRegistryUrl);
      }
    }
  }, [propGitUrl, propGitBranch, propRegistryUrl]);

  //  [추가] DB에서 service 정보 조회 (creator_email, gitlab_access_token, registry_config, infra_id)
  useEffect(() => {
    if (!open || !serviceId) return;

    const loadServiceInfo = async () => {
      try {
        const service = (await getService(
          serviceId
        )) as unknown as ServiceFromDB;

        //  서비스에 저장된 인프라 ID가 있으면 폼에 설정 및 임시 저장 (handleInfraChange는 별도 useEffect에서 호출)
        if (service.infra_id) {
          form.setFieldsValue({
            infra_id: service.infra_id,
          });
          setPendingInfraId(service.infra_id); // 임시 저장하여 인프라 목록 로드 후 사용
        }

        //  DB에서 Git 인증 정보 조회 (gitlab_config에서 token, username 확인)
        if (service.gitlab_config && service.gitlab_config.trim() !== '') {
          try {
            const gitlabConfig = JSON.parse(service.gitlab_config);
            //  token 또는 access_token 중 하나를 사용 (하위 호환성)
            const token = gitlabConfig.token || gitlabConfig.access_token;

            if (token && gitlabConfig.username) {
              setHasSavedGitCred(true);
              form.setFieldsValue({
                credentials: {
                  ...form.getFieldValue('credentials'),
                  username_repo: gitlabConfig.username,
                  password_repo: token,
                },
              });
              setGitAuthStatus('success'); // DB에서 로드한 credential은 성공으로 표시
            } else {
              console.warn(
                '[BuildExecutionModal] ⚠️ GitLab token 또는 username이 비어있음'
              );
            }
          } catch (error) {
            console.error(
              '[BuildExecutionModal]  GitLab config 파싱 실패:',
              error
            );
          }
        } else {
          console.warn(
            '[BuildExecutionModal] ⚠️ gitlab_config가 없거나 비어있음'
          );
        }

        //  DB에서 Registry 인증 정보 조회 (우선순위 1)
        if (service.registry_config) {
          try {
            const registryConfig = JSON.parse(service.registry_config);
            if (registryConfig.username && registryConfig.password) {
              setHasSavedRegistryCred(true);
              form.setFieldsValue({
                credentials: {
                  ...form.getFieldValue('credentials'),
                  docker_username: registryConfig.username,
                  docker_password: registryConfig.password,
                },
              });
              setRegistryAuthStatus('success'); // DB에서 로드한 credential은 성공으로 표시
            }
          } catch (error) {
            // Registry config JSON 파싱 실패 시 무시하고 계속 진행
            console.warn('Registry config 파싱 실패:', error);
          }
        }
      } catch (error) {
        // DB 조회 실패 시 무시하고 localStorage로 fallback 처리
        console.warn('Service 정보 조회 실패:', error);
      }
    };

    void loadServiceInfo();
  }, [open, serviceId, form]);

  // 인프라 목록 조회
  useEffect(() => {
    if (open) {
      void loadInfras();
      // Harbor 프로젝트 목록 로드 (registryType이 harbor인 경우)
      if (registryType === 'harbor') {
        void loadHarborProjects();
      }
    }
  }, [open, registryType]);

  //  [추가] 인프라 목록이 로드되고 pendingInfraId가 있으면 자동으로 인프라 선택
  useEffect(() => {
    if (open && infras.length > 0 && pendingInfraId && !selectedInfra) {
      void handleInfraChange(pendingInfraId);
      setPendingInfraId(null); // 사용 후 초기화
    }
  }, [open, infras, pendingInfraId, selectedInfra]);

  const loadInfras = async () => {
    try {
      setLoading(true);
      const infraList = await getBuildInfras();
      setInfras(infraList);
    } catch {
      // Infrastructure list fetch failed
      message.error('인프라 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Harbor 프로젝트 목록 로드
  const loadHarborProjects = async () => {
    try {
      setLoadingProjects(true);
      setProjectsError(null);

      const credentials = registryUrl
        ? { registry_url: registryUrl }
        : undefined;
      const response = await getHarborProjects(credentials);

      setHarborProjects(response.projects);

      if (response.projects.length === 0) {
        setProjectsError('Harbor 프로젝트가 없습니다.');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Harbor 프로젝트 목록을 불러오는데 실패했습니다.';
      setProjectsError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Docker Hub 저장소 목록 로드 (나중에 사용 예정)
  const _loadDockerHubRepositories = async () => {
    const username = form.getFieldValue(['credentials', 'docker_username']);
    const password = form.getFieldValue(['credentials', 'docker_password']);

    if (!username) {
      message.warning('Docker Hub 사용자 이름을 먼저 입력하세요');
      return;
    }

    try {
      setLoadingDockerHubRepos(true);
      setDockerHubReposError(null);

      const response = await getDockerHubRepositories({
        username,
        password,
      });

      setDockerHubRepositories(response.repositories);

      if (response.repositories.length === 0) {
        setDockerHubReposError('Docker Hub 저장소가 없습니다.');
      } else {
        message.success(
          `${response.repositories.length}개의 저장소를 불러왔습니다.`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Docker Hub 저장소 목록을 불러오는데 실패했습니다.';
      setDockerHubReposError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoadingDockerHubRepos(false);
    }
  };

  // 인프라 선택 시 서버 목록 조회
  const handleInfraChange = async (infraId: number) => {
    const infra = infras.find(i => i.id === infraId);
    setSelectedInfra(infra || null);
    setSelectedServer(null);
    setServers([]);
    setSshHops([]);
    form.setFieldsValue({
      server_id: undefined,
    });

    try {
      setLoading(true);

      // 서버 목록 조회
      const serverList = await getServers(infraId);
      setServers(serverList);
    } catch {
      // Server list fetch failed
      message.error('서버 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 서버 선택 시 SSH hops 조회 및 자동 입력
  const handleServerChange = async (serverId: number) => {
    const server = servers.find(s => Number(s.id) === serverId);
    setSelectedServer(server || null);

    try {
      setLoading(true);
      const hops = await getServerHops(serverId);

      // 비밀번호 자동 입력 시도 (username 매칭 포함)
      const hopsWithPasswords = hops.map(hop => {
        // 1순위: host + port + username 정확 매칭
        let savedCred = serverlist.find(
          s =>
            s.host === hop.host &&
            (s.port || 22) === hop.port &&
            s.userId === hop.username
        );
        // 2순위: host + port만 매칭 (username 없는 legacy 데이터)
        if (!savedCred) {
          savedCred = serverlist.find(
            s => s.host === hop.host && (s.port || 22) === hop.port
          );
        }
        return {
          ...hop,
          username: hop.username || savedCred?.userId || '', // username 우선, 없으면 savedCred에서 가져옴
          password: savedCred?.password || '',
        };
      });

      // 저장된 SSH credential 여부 확인
      const allHopsHaveSavedCred = hopsWithPasswords.every(hop => hop.password);
      setHasSavedSshCred(allHopsHaveSavedCred);

      //  [수정] sshHops 상태를 enriched data로 업데이트 (username 포함)
      setSshHops(hopsWithPasswords);

      // Explicitly set all hop properties to ensure they're captured by form
      form.setFieldsValue({
        hops: hopsWithPasswords.map(hop => ({
          host: hop.host,
          port: hop.port,
          username: hop.username,
          password: hop.password,
        })),
      });
    } catch {
      // SSH hops fetch failed
      message.error('SSH 접속 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Git 인증 테스트 (나중에 사용 예정)
  const _handleTestGitAuth = async () => {
    const username = form.getFieldValue(['credentials', 'username_repo']);
    const token = form.getFieldValue(['credentials', 'password_repo']);

    if (!username || !token) {
      message.warning('Git 사용자 이름과 토큰을 입력하세요');
      return;
    }

    if (!gitUrl) {
      message.warning('Git URL 정보가 없습니다. 서비스를 먼저 선택해주세요.');
      return;
    }

    try {
      setGitAuthStatus('testing');

      await testGitAuthentication({
        git_url: gitUrl,
        username: username,
        token: token,
      });

      setGitAuthStatus('success');
      message.success('Git 인증에 성공했습니다');
    } catch {
      // Git authentication failed
      setGitAuthStatus('failed');
      message.error('Git 인증에 실패했습니다');
    }
  };

  // Registry 인증 테스트 (나중에 사용 예정)
  const _handleTestRegistryAuth = async () => {
    const username = form.getFieldValue(['credentials', 'docker_username']);
    const password = form.getFieldValue(['credentials', 'docker_password']);

    if (!username || !password) {
      message.warning('Registry 사용자 이름과 비밀번호를 입력하세요');
      return;
    }

    if (!selectedInfra) {
      message.warning('빌드 인프라를 먼저 선택해주세요');
      return;
    }

    // Docker Hub가 아닌 경우에만 registryUrl 체크
    if (registryType !== 'dockerhub' && !registryUrl) {
      message.warning(
        'Registry URL 정보가 없습니다. 서비스를 먼저 선택해주세요.'
      );
      return;
    }

    // Harbor인 경우 project_name 필수
    if (registryType === 'harbor' && !projectName) {
      message.warning('Harbor 프로젝트 이름을 입력하세요');
      return;
    }

    try {
      setRegistryAuthStatus('testing');

      // Registry 타입에 따라 올바른 URL 사용
      const effectiveRegistryUrl =
        registryType === 'dockerhub' ? 'docker.io' : registryUrl;

      await testRegistryAuthentication({
        registry_url: effectiveRegistryUrl,
        username: username,
        password: password,
        infra_id: selectedInfra.id,
        registry_type: registryType,
        project_name: registryType === 'harbor' ? projectName : undefined,
      });

      setRegistryAuthStatus('success');
      message.success('Registry 인증에 성공했습니다');

      // 인증 성공 시 자동으로 서비스의 Registry 설정 업데이트
      if (serviceId) {
        await handleSaveRegistryConfig();
      }
    } catch {
      // Registry authentication failed
      setRegistryAuthStatus('failed');
      message.error('Registry 인증에 실패했습니다');
    }
  };

  // Registry 설정 저장 ( username, password 포함)
  const handleSaveRegistryConfig = async () => {
    if (!serviceId || !registryUrl) {
      return;
    }

    try {
      const username = form.getFieldValue(['credentials', 'docker_username']);
      const password = form.getFieldValue(['credentials', 'docker_password']);

      await updateServiceRegistryConfig(
        serviceId,
        registryUrl,
        registryType,
        registryType === 'harbor' ? projectName : undefined,
        username, //  username 전달
        password //  password 전달
      );
    } catch {
      // Registry config save failed - non-critical, ignore silently
    }
  };

  //  [수정] 폼 제출 처리 - 서비스 선택 모달 열기
  const handleSubmit = (values: any) => {
    if (!selectedInfra || !selectedServer) {
      message.error('인프라와 서버를 선택해주세요.');
      return;
    }

    //  인증 정보가 없으면 빌드 불가
    if (!hasSavedGitCred) {
      message.error(
        'Git 인증 정보가 설정되지 않았습니다. 서비스 정보 수정에서 GitLab 토큰을 먼저 설정해주세요.'
      );
      return;
    }

    if (!hasSavedRegistryCred) {
      message.error(
        'Registry 인증 정보가 설정되지 않았습니다. 서비스 정보 수정에서 Registry 인증 정보를 먼저 설정해주세요.'
      );
      return;
    }

    // 폼 값을 저장하고 서비스 선택 모달 열기
    setPendingFormValues(values);
    setServiceSelectionModalOpen(true);
  };

  //  [신규] 서비스 선택 완료 후 실제 빌드 실행
  const handleServiceSelectionConfirm = (
    services: string[],
    autoDeploy?: boolean
  ) => {
    //  defaultAutoDeploy가 true이면 autoDeploy도 true로 설정 (서비스 목록에서 "빌드+배포" 버튼 클릭 시)
    const finalAutoDeploy = defaultAutoDeploy || autoDeploy || false;
    setSelectedServices(services);
    setPendingAutoDeploy(finalAutoDeploy);
    setServiceSelectionModalOpen(false);

    // 선택된 서비스와 함께 빌드 실행
    if (pendingFormValues) {
      void submitBuild(pendingFormValues, services, finalAutoDeploy);
    }
  };

  // 실제 빌드 제출
  const submitBuild = async (
    values: any,
    services?: string[],
    autoDeploy?: boolean
  ) => {
    if (!selectedInfra || !selectedServer) {
      return;
    }

    // SSH 비밀번호 저장
    values.hops?.forEach((hop: SshHop) => {
      if (hop.password) {
        upsertServerByHostPort({
          host: hop.host,
          port: hop.port,
          userId: hop.username,
          password: hop.password,
        });
      }
    });

    //  [변경] Git 및 Registry 자격증명은 DB에서 관리 (localStorage 저장 제거)
    // 자격증명은 서비스 정보 수정 모달에서 DB에 저장됨

    //  [중요] 빌드 실행 전에 Registry 설정 저장 (Harbor/Docker Hub 구분 적용)
    if (serviceId) {
      try {
        await handleSaveRegistryConfig();
      } catch {
        // Registry config save failed - warn but continue with build
        message.warning(
          'Registry 설정 저장에 실패했지만 빌드를 계속 진행합니다.'
        );
      }
    }

    //  [수정] Backend가 기대하는 형식으로 credential 전달 + 선택된 서비스 + 자동 배포 여부
    onSubmit({
      infra_id: selectedInfra.id,
      server_id: Number(selectedServer.id),
      hops: values.hops,
      // Backend는 최상위 레벨에서 credential을 기대함
      username_repo: values.credentials?.username_repo,
      password_repo: values.credentials?.password_repo,
      docker_username: values.credentials?.docker_username,
      docker_password: values.credentials?.docker_password,
      //  [신규] 선택된 서비스 목록 (파라미터로 전달받은 services 사용)
      selected_services: services && services.length > 0 ? services : undefined,
      //  [신규] 빌드 완료 후 자동 배포 여부
      auto_deploy: autoDeploy,
    });
  };

  return (
    <Modal
      open={open}
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
            <CloudServerOutlined
              style={{ color: '#1890ff', fontSize: '18px' }}
            />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              빌드 실행
            </span>
          </div>
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
              style={{ marginRight: '4px' }}
            >
              취소
            </Button>
            <Button
              type='primary'
              onClick={() => form.submit()}
              loading={loading}
              size='small'
              icon={<CloudServerOutlined />}
              style={{ minWidth: '130px', height: '28px' }}
            >
              빌드 서비스 선택
            </Button>
          </div>
        </div>
      }
      onCancel={onCancel}
      closeIcon={false}
      width={700}
      footer={null}
    >
      <Spin spinning={loading}>
        {!selectedInfra && (
          <Alert
            message='빌드 인프라가 설정되지 않음'
            description='서비스 정보 수정에서 빌드/배포 인프라를 먼저 설정해주세요. 인프라가 설정되어야 빌드를 실행할 수 있습니다.'
            type='warning'
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        {selectedInfra && (
          <Alert
            message='빌드 실행 준비'
            description='빌드를 실행할 서버를 선택하고, 필요한 인증 정보를 확인하세요. 빌드 인프라는 서비스 정보 수정에서 설정한 인프라로 고정됩니다.'
            type='info'
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          autoComplete='off'
        >
          {/* 인프라 선택 */}
          <Form.Item
            label={
              <Space>
                <CloudServerOutlined />
                <Typography.Text strong>
                  빌드 인프라 (서비스 정보에서 설정됨)
                </Typography.Text>
              </Space>
            }
            name='infra_id'
            rules={[
              {
                required: true,
                message: '서비스 정보 수정에서 빌드 인프라를 먼저 설정하세요',
              },
            ]}
          >
            <Select
              placeholder='서비스 정보 수정에서 설정한 인프라가 자동 선택됩니다'
              onChange={handleInfraChange}
              options={infras.map(infra => ({
                label: `${infra.name} (${infra.type})`,
                value: infra.id,
              }))}
              disabled={true}
            />
          </Form.Item>

          {/* 서버 선택 */}
          {selectedInfra && (
            <Form.Item
              label={
                <Typography.Text strong>
                  서버 선택 ({selectedInfra.type})
                </Typography.Text>
              }
              name='server_id'
              rules={[{ required: true, message: '서버를 선택하세요' }]}
            >
              <Select
                placeholder='빌드를 실행할 서버를 선택하세요'
                onChange={handleServerChange}
                options={servers.map(server => ({
                  label: server.server_name || `Server #${server.id}`,
                  value: Number(server.id),
                }))}
                disabled={servers.length === 0}
              />
            </Form.Item>
          )}

          {/* SSH Hops */}
          {sshHops.length > 0 && (
            <>
              <Divider>SSH 접속 정보</Divider>
              <Collapse
                defaultActiveKey={['ssh']}
                items={[
                  {
                    key: 'ssh',
                    label: (
                      <Space>
                        <CloudServerOutlined />
                        <Typography.Text strong>
                          SSH 접속 정보 ({sshHops.length}개 hop)
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
                        {sshHops.map((hop, index) => {
                          // 1순위: host + port + username 정확 매칭
                          let savedCred = serverlist.find(
                            s =>
                              s.host === hop.host &&
                              (s.port || 22) === hop.port &&
                              s.userId === hop.username
                          );
                          // 2순위: host + port만 매칭 (fallback)
                          if (!savedCred) {
                            savedCred = serverlist.find(
                              s =>
                                s.host === hop.host &&
                                (s.port || 22) === hop.port
                            );
                          }
                          return (
                            <div
                              key={index}
                              style={{
                                border: '1px solid #f0f0f0',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '16px',
                                backgroundColor: savedCred
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
                                <Typography.Text strong>
                                  Hop #{index + 1}
                                </Typography.Text>
                                {savedCred && (
                                  <Tag
                                    color='success'
                                    icon={<LockOutlined />}
                                    style={{ fontSize: '11px' }}
                                  >
                                    저장됨 (●●●●●●)
                                  </Tag>
                                )}
                              </Space>
                              <Row gutter={16} style={{ marginTop: 12 }}>
                                <Col span={16}>
                                  <Form.Item label='호스트'>
                                    <Input value={hop.host} disabled />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item label='포트'>
                                    <Input value={hop.port} disabled />
                                  </Form.Item>
                                </Col>
                              </Row>
                              <Row gutter={16}>
                                <Col span={12}>
                                  <Form.Item
                                    name={['hops', index, 'username']}
                                    label='사용자'
                                    initialValue={hop.username}
                                    rules={[
                                      {
                                        required: true,
                                        message: '사용자명을 입력하세요',
                                      },
                                    ]}
                                  >
                                    <Input placeholder='SSH 사용자명' />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    name={['hops', index, 'password']}
                                    label='비밀번호'
                                    rules={[
                                      {
                                        required: true,
                                        message: '비밀번호를 입력하세요',
                                      },
                                    ]}
                                  >
                                    <Input.Password placeholder='SSH 비밀번호' />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </div>
                          );
                        })}
                      </>
                    ),
                  },
                ]}
              />
            </>
          )}

          {/* Git 자격증명 상태 표시 (읽기 전용) */}
          <Divider>Git 저장소 인증</Divider>
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
                  <Tag color='warning' icon={<CloseCircleOutlined />}>
                    미설정
                  </Tag>
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
                  {registryUrl && (
                    <Typography.Text
                      type='secondary'
                      style={{ fontSize: '12px' }}
                    >
                      ({registryType === 'harbor' ? 'Harbor' : 'Docker Hub'}:{' '}
                      {registryUrl} -{' '}
                      {form.getFieldValue(['credentials', 'docker_username'])} /
                      ●●●●●●)
                    </Typography.Text>
                  )}
                  {projectName && (
                    <Tag color='blue'>
                      {registryType === 'harbor'
                        ? `프로젝트: ${projectName}`
                        : projectName}
                    </Tag>
                  )}
                </>
              ) : (
                <>
                  <Tag color='warning' icon={<CloseCircleOutlined />}>
                    미설정
                  </Tag>
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

      {/*  [신규] 서비스 선택 모달 */}
      <ServiceSelectionModal
        open={serviceSelectionModalOpen}
        onCancel={() => setServiceSelectionModalOpen(false)}
        onConfirm={handleServiceSelectionConfirm}
        gitUrl={gitUrl}
        branch={gitBranch}
      />
    </Modal>
  );
};

export default BuildExecutionModal;
