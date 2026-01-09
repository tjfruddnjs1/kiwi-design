import React, { useState } from 'react';
import {
  Space,
  Alert,
  Button,
  Collapse,
  Descriptions,
  Tag,
  Table,
  Typography,
  Popconfirm,
  notification,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Card,
  Row,
  Col,
  Select,
  Progress,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  SettingOutlined,
  SyncOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  FileTextOutlined,
  GlobalOutlined,
  WarningOutlined,
  EyeOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  LockOutlined,
  CloseCircleOutlined,
  ArrowDownOutlined,
  ApiOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import './DomainSettingsTab.css';
import type { Service, SshHop } from '../../../../../lib/api/types';
import type { IngressControllerStatus } from '../../../../../lib/api/k8s-resources';
import {
  checkNginxContainer,
  createNginxContainer,
  listNginxConfigs,
  createNginxConfig,
  deleteNginxConfig,
  reloadNginx,
  externalNginxConnect,
  externalNginxListConfigs,
  externalNginxCreateConfig,
  externalNginxDeleteConfig,
  externalNginxReload,
  getNginxConfigContent,
  updateNginxConfigContent,
  uploadCertificate,
  listCertificates,
  deleteCertificate,
  validateCertificate,
  type NginxContainerStatus,
  type NginxConfig,
  type CreateNginxConfigParams,
  type ExternalNginxServer,
  type ExternalNginxConnectionStatus,
  type CertificateInfo,
  type CertificateValidation,
} from '../../../../../lib/api/nginx';
import {
  checkIngressController,
  installIngressController,
  createIngress,
  getK8sResources,
  getK8sResourceYaml,
  type IngressRule,
  type IngressTLS,
} from '../../../../../lib/api/k8s-resources';
import {
  createTLSSecret,
  listTLSSecrets,
  deleteTLSSecret,
  type TLSSecretInfo,
} from '../../../../../lib/api/kubernetes';
import { deviceApi } from '../../../../../lib/api/devices';
import type { Device } from '../../../../../pages/devices/DeviceManagement';
import { useAuth } from '../../../../../context/AuthContext';

const { Text } = Typography;

interface DomainSettingsTabProps {
  service?: Service | null;
  infraId?: number;
  serverHops: SshHop[];
  isContainerInfra: boolean;
  isDockerInfra: boolean;
}

/**
 * 도메인 설정 탭
 * K8s: Nginx Ingress Controller 관리
 * Docker/Podman: Nginx 컨테이너 리버스 프록시 관리
 */
const DomainSettingsTab: React.FC<DomainSettingsTabProps> = ({
  service,
  infraId,
  serverHops,
  isContainerInfra,
  isDockerInfra,
}) => {
  const { user } = useAuth();
  const namespace = service?.namespace || 'k8s';

  // ============================================================================
  // Docker/Podman Nginx 상태
  // ============================================================================
  const [nginxContainerStatus, setNginxContainerStatus] =
    useState<NginxContainerStatus | null>(null);
  const [checkingNginx, setCheckingNginx] = useState(false);
  const [creatingNginx, setCreatingNginx] = useState(false);
  const [nginxConfigs, setNginxConfigs] = useState<NginxConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [reloadingNginx, setReloadingNginx] = useState(false);
  const [dockerForm] = Form.useForm();

  // Config view/edit state for Docker/Podman
  const [viewingDockerConfig, setViewingDockerConfig] = useState<{
    domain: string;
    content: string;
    path: string;
  } | null>(null);
  const [viewDockerConfigModalVisible, setViewDockerConfigModalVisible] =
    useState(false);
  const [editingDockerConfig, setEditingDockerConfig] = useState(false);
  const [editedDockerContent, setEditedDockerContent] = useState('');

  // TLS/SSL Certificate management state
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [certUploadModalVisible, setCertUploadModalVisible] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certValidation, setCertValidation] =
    useState<CertificateValidation | null>(null);
  const [certUploadForm] = Form.useForm();

  // ============================================================================
  // K8s Ingress Controller 상태
  // ============================================================================
  const [ingressControllerStatus, setIngressControllerStatus] =
    useState<IngressControllerStatus | null>(null);
  const [loadingControllerStatus, setLoadingControllerStatus] = useState(false);
  const [installingController, setInstallingController] = useState(false);
  const [pollingElapsedTime, setPollingElapsedTime] = useState(0);
  const [pollingIntervalId, setPollingIntervalId] =
    useState<NodeJS.Timeout | null>(null);
  const [showIngressForm, setShowIngressForm] = useState(false);
  const [k8sForm] = Form.useForm();
  const [loadingIngress, setLoadingIngress] = useState(false);
  const [ingressList, setIngressList] = useState<any[]>([]);

  // K8s TLS Secret 관리 상태
  const [k8sTlsSecrets, setK8sTlsSecrets] = useState<TLSSecretInfo[]>([]);
  const [loadingK8sTlsSecrets, setLoadingK8sTlsSecrets] = useState(false);
  const [k8sTlsUploadModalVisible, setK8sTlsUploadModalVisible] =
    useState(false);
  const [uploadingK8sTlsSecret, setUploadingK8sTlsSecret] = useState(false);
  const [k8sTlsUploadForm] = Form.useForm();

  // ============================================================================
  // 외부 Nginx 서버 연동 상태 (K8s용)
  // ============================================================================
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Multi-hop SSH 정보 관리
  interface SshHopInfo {
    deviceId: number | null;
    host: string;
    port: number;
    username: string;
    password: string;
  }

  const [sshHops, setSshHops] = useState<SshHopInfo[]>([
    { deviceId: null, host: '', port: 22, username: '', password: '' },
  ]);
  const [externalNginxStatus, setExternalNginxStatus] =
    useState<ExternalNginxConnectionStatus | null>(null);
  const [connectingExternal, setConnectingExternal] = useState(false);
  const [externalNginxConfigs, setExternalNginxConfigs] = useState<
    NginxConfig[]
  >([]);
  const [loadingExternalConfigs, setLoadingExternalConfigs] = useState(false);
  const [externalConfigModalVisible, setExternalConfigModalVisible] =
    useState(false);
  const [reloadingExternalNginx, setReloadingExternalNginx] = useState(false);
  const [externalNginxForm] = Form.useForm();
  const [configSearchText, setConfigSearchText] = useState('');

  // Config view/edit state for External Nginx
  const [viewingExternalConfig, setViewingExternalConfig] = useState<{
    domain: string;
    content: string;
    path: string;
  } | null>(null);
  const [viewExternalConfigModalVisible, setViewExternalConfigModalVisible] =
    useState(false);
  const [editingExternalConfig, setEditingExternalConfig] = useState(false);
  const [editedExternalContent, setEditedExternalContent] = useState('');

  // ============================================================================
  // K8s 서비스 NodePort 정보 상태
  // ============================================================================
  interface K8sServiceInfo {
    name: string;
    type: string;
    clusterIP: string;
    ports: Array<{
      name?: string;
      port: number;
      targetPort: number | string;
      nodePort?: number;
      protocol: string;
    }>;
  }
  const [k8sServices, setK8sServices] = useState<K8sServiceInfo[]>([]);
  const [loadingK8sServices, setLoadingK8sServices] = useState(false);

  // ============================================================================
  // Docker/Podman: Nginx 컨테이너 관리 함수
  // ============================================================================
  const handleCheckNginxContainer = async () => {
    if (!infraId) return;

    setCheckingNginx(true);
    try {
      const result = await checkNginxContainer({
        infra_id: infraId,
        hops: serverHops,
      });
      setNginxContainerStatus(result.data.container);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 컨테이너 상태 확인 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCheckingNginx(false);
    }
  };

  const handleCreateNginxContainer = async () => {
    if (!infraId) return;

    setCreatingNginx(true);
    try {
      const result = await createNginxContainer({
        infra_id: infraId,
        hops: serverHops,
      });
      notification.success({
        message: 'Nginx 컨테이너 생성 완료',
        description:
          result.message || 'Nginx 컨테이너가 성공적으로 생성되었습니다.',
        duration: 5,
      });
      await handleCheckNginxContainer();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 컨테이너 생성 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setCreatingNginx(false);
    }
  };

  const handleListNginxConfigs = async () => {
    if (!infraId) return;

    setLoadingConfigs(true);
    try {
      const result = await listNginxConfigs({
        infra_id: infraId,
        hops: serverHops,
      });
      setNginxConfigs(result.data?.configs || []);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 설정 파일 목록 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleReloadNginx = async () => {
    if (!infraId) return;

    setReloadingNginx(true);
    try {
      await reloadNginx({
        infra_id: infraId,
        hops: serverHops,
      });
      message.success('Nginx가 리로드되었습니다');
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 리로드 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setReloadingNginx(false);
    }
  };

  const handleSaveDockerConfig = async () => {
    if (!infraId) return;

    try {
      const values = await dockerForm.validateFields();
      const configParams: CreateNginxConfigParams = {
        domain: values.domain,
        backend_host: values.backend_host,
        backend_port: values.backend_port,
        ssl: values.ssl || false,
        cert_path: values.cert_path,
        key_path: values.key_path,
      };

      await createNginxConfig({
        infra_id: infraId,
        hops: serverHops,
        config: configParams,
      });
      notification.success({
        message: 'Nginx 설정 생성 완료',
        description: `${configParams.domain} 설정이 생성되었습니다`,
        duration: 5,
      });

      setConfigModalVisible(false);
      dockerForm.resetFields();
      await handleListNginxConfigs();
      await reloadNginx({ infra_id: infraId, hops: serverHops });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 설정 생성 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  const handleDeleteDockerConfig = async (domain: string) => {
    if (!infraId) return;

    try {
      await deleteNginxConfig({
        infra_id: infraId,
        domain,
        hops: serverHops,
      });
      notification.success({
        message: 'Nginx 설정 삭제 완료',
        description: `${domain} 설정이 삭제되었습니다`,
        duration: 5,
      });
      await handleListNginxConfigs();
      await reloadNginx({ infra_id: infraId, hops: serverHops });
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 설정 삭제 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  // View Docker/Podman nginx config
  const handleViewDockerConfig = async (domain: string) => {
    if (!infraId) return;

    try {
      const result = await getNginxConfigContent({
        infra_id: infraId,
        domain,
        hops: serverHops,
      });
      setViewingDockerConfig({
        domain,
        content: result.data?.content || '',
        path: result.data?.path || '',
      });
      setEditedDockerContent(result.data?.content || '');
      setEditingDockerConfig(false);
      setViewDockerConfigModalVisible(true);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 설정 파일 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  // Save edited Docker/Podman nginx config
  const handleSaveDockerConfigContent = async () => {
    if (!infraId || !viewingDockerConfig) return;

    try {
      await updateNginxConfigContent({
        infra_id: infraId,
        domain: viewingDockerConfig.domain,
        content: editedDockerContent,
        hops: serverHops,
      });
      notification.success({
        message: 'Nginx 설정 파일 수정 완료',
        description: `${viewingDockerConfig.domain} 설정이 저장되었습니다`,
        duration: 5,
      });
      setViewingDockerConfig({
        ...viewingDockerConfig,
        content: editedDockerContent,
      });
      setEditingDockerConfig(false);
      await handleListNginxConfigs();
      await reloadNginx({ infra_id: infraId, hops: serverHops });
      message.success('Nginx가 자동으로 리로드되었습니다');
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Nginx 설정 파일 수정 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  // ============================================================================
  // TLS/SSL Certificate Management
  // ============================================================================
  const handleListCertificates = async () => {
    if (!infraId) return;

    setLoadingCertificates(true);
    try {
      const result = await listCertificates({
        infra_id: infraId,
        hops: serverHops,
      });
      setCertificates(result.data?.certificates || []);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '인증서 목록 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingCertificates(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!infraId) return;

    try {
      const values = await certUploadForm.validateFields();
      setUploadingCert(true);

      await uploadCertificate({
        infra_id: infraId,
        domain: values.domain,
        cert_content: values.cert_content,
        key_content: values.key_content,
        hops: serverHops,
      });

      notification.success({
        message: '인증서 업로드 완료',
        description: `${values.domain} 인증서가 성공적으로 업로드되었습니다`,
        duration: 5,
      });

      setCertUploadModalVisible(false);
      certUploadForm.resetFields();
      await handleListCertificates();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '인증서 업로드 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setUploadingCert(false);
    }
  };

  const handleDeleteCertificate = async (domain: string) => {
    if (!infraId) return;

    try {
      await deleteCertificate({
        infra_id: infraId,
        domain,
        hops: serverHops,
      });
      notification.success({
        message: '인증서 삭제 완료',
        description: `${domain} 인증서가 삭제되었습니다`,
        duration: 5,
      });
      await handleListCertificates();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '인증서 삭제 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  const handleValidateCertificate = async (domain: string) => {
    if (!infraId) return;

    try {
      const result = await validateCertificate({
        infra_id: infraId,
        domain,
        hops: serverHops,
      });
      setCertValidation(result.data);

      if (result.data?.valid) {
        notification.success({
          message: '인증서 유효',
          description: `${domain} 인증서가 유효합니다. 만료일: ${result.data?.expiry_date || '알 수 없음'}`,
          duration: 5,
        });
      } else {
        notification.warning({
          message: '인증서 문제 발견',
          description: `인증서 또는 키에 문제가 있습니다. 상세 정보를 확인하세요.`,
          duration: 5,
        });
      }
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '인증서 검증 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  // ============================================================================
  // K8s: Ingress Controller 관리 함수
  // ============================================================================
  const handleCheckIngressController = async () => {
    if (!service?.id) return;

    setLoadingControllerStatus(true);
    try {
      const result = await checkIngressController(service.id);
      setIngressControllerStatus(result);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Ingress Controller 상태 확인 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setLoadingControllerStatus(false);
    }
  };

  const handleInstallIngressController = async () => {
    if (!service?.id) return;

    setInstallingController(true);
    setPollingElapsedTime(0);

    try {
      await installIngressController(service.id);
      notification.info({
        message: 'Nginx Ingress Controller 설치 시작',
        description:
          '백그라운드에서 설치가 진행됩니다. 5초마다 자동으로 상태를 확인합니다.',
        duration: 5,
      });
      startPollingControllerStatus();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Ingress Controller 설치 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
      setInstallingController(false);
    }
  };

  const startPollingControllerStatus = () => {
    const intervalId = setInterval(() => {
      void (async () => {
        setPollingElapsedTime(prev => prev + 5000);

        if (!service?.id) return;

        try {
          const result = await checkIngressController(service.id);
          setIngressControllerStatus(result);

          if (result.status === 'installed' || result.status === 'error') {
            stopPollingControllerStatus();
            if (result.status === 'installed') {
              notification.success({
                message: 'Nginx Ingress Controller 설치 완료',
                description: 'Ingress Controller가 정상적으로 설치되었습니다.',
                duration: 5,
              });
            }
          }
        } catch (_error) {
          // Continue polling on error
        }
      })();
    }, 5000);

    setPollingIntervalId(intervalId);

    setTimeout(
      () => {
        stopPollingControllerStatus();
        setInstallingController(false);
        message.warning(
          '설치 확인 시간이 초과되었습니다. 수동으로 상태를 확인해주세요.'
        );
      },
      10 * 60 * 1000
    );
  };

  const stopPollingControllerStatus = () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    setInstallingController(false);
  };

  const handleCreateIngress = async (values: any) => {
    if (!service?.id) return;

    setLoadingIngress(true);
    try {
      const rules: IngressRule[] = [
        {
          host: values.host,
          paths: [
            {
              path: values.path,
              pathType: values.pathType,
              serviceName: values.serviceName,
              servicePort: values.servicePort,
            },
          ],
        },
      ];

      const tls: IngressTLS[] | undefined = values.enableTLS
        ? [
            {
              hosts: [values.host],
              secretName: values.tlsSecretName || `${values.ingressName}-tls`,
            },
          ]
        : undefined;

      await createIngress({
        service_id: service.id,
        namespace,
        ingress_name: values.ingressName,
        rules,
        tls,
      });

      notification.success({
        message: 'Ingress 생성 완료',
        description: `Ingress "${values.ingressName}"이(가) 생성되었습니다.`,
        duration: 5,
      });

      setShowIngressForm(false);
      k8sForm.resetFields();
      void handleLoadIngresses();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Ingress 생성 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingIngress(false);
    }
  };

  const handleLoadIngresses = async () => {
    if (!service?.id) return;

    setLoadingIngress(true);
    try {
      const result = await getK8sResources(service.id);
      setIngressList(result.ingresses || []);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'Ingress 조회 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setLoadingIngress(false);
    }
  };

  // ============================================================================
  // K8s TLS Secret 관리 핸들러
  // ============================================================================
  const handleLoadK8sTlsSecrets = async () => {
    if (!service?.id) return;

    setLoadingK8sTlsSecrets(true);
    try {
      const result = await listTLSSecrets({
        namespace,
        service_id: service.id,
      });
      setK8sTlsSecrets(result.secrets || []);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'TLS Secret 조회 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setLoadingK8sTlsSecrets(false);
    }
  };

  const handleUploadK8sTlsSecret = async (values: {
    secretName: string;
    certContent: string;
    keyContent: string;
  }) => {
    if (!service?.id) return;

    setUploadingK8sTlsSecret(true);
    try {
      await createTLSSecret({
        secret_name: values.secretName,
        namespace,
        cert_content: values.certContent,
        key_content: values.keyContent,
        service_id: service.id,
      });

      notification.success({
        message: 'TLS Secret 생성 완료',
        description: `TLS Secret "${values.secretName}"이(가) 생성되었습니다.`,
        duration: 5,
      });

      setK8sTlsUploadModalVisible(false);
      k8sTlsUploadForm.resetFields();
      void handleLoadK8sTlsSecrets();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'TLS Secret 생성 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setUploadingK8sTlsSecret(false);
    }
  };

  const handleDeleteK8sTlsSecret = async (secretName: string) => {
    if (!service?.id) return;

    try {
      await deleteTLSSecret({
        secret_name: secretName,
        namespace,
        service_id: service.id,
      });

      notification.success({
        message: 'TLS Secret 삭제 완료',
        description: `TLS Secret "${secretName}"이(가) 삭제되었습니다.`,
        duration: 5,
      });

      void handleLoadK8sTlsSecrets();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'TLS Secret 삭제 실패',
        description: err.message,
        duration: 5,
      });
    }
  };

  // ============================================================================
  // 인프라 목록 조회 및 선택 처리
  // ============================================================================
  // 장비 목록 조회
  const handleLoadDevices = async () => {
    if (!user?.id) {
      notification.warning({
        message: '사용자 정보 없음',
        description: '로그인 정보를 확인할 수 없습니다.',
        duration: 3,
      });
      return;
    }

    setLoadingDevices(true);
    try {
      const response = (await deviceApi.getDevices(user.id)) as {
        data: Device[];
      };
      setDevices(response.data || []);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '장비 목록 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    } finally {
      setLoadingDevices(false);
    }
  };

  // Hop 추가
  const handleAddHop = () => {
    setSshHops([
      ...sshHops,
      { deviceId: null, host: '', port: 22, username: '', password: '' },
    ]);
  };

  // Hop 제거
  const handleRemoveHop = (index: number) => {
    if (sshHops.length <= 1) {
      notification.warning({
        message: '최소 1개의 홉이 필요합니다',
        duration: 3,
      });
      return;
    }
    const newHops = sshHops.filter((_, idx) => idx !== index);
    setSshHops(newHops);
  };

  // Hop의 장비 선택
  const handleSelectHopDevice = (hopIndex: number, deviceId: number | null) => {
    const newHops = [...sshHops];
    const selectedDevice = devices.find(device => device.id === deviceId);

    if (selectedDevice) {
      newHops[hopIndex] = {
        deviceId,
        host: selectedDevice.ipAddress || '',
        port: selectedDevice.port || 22,
        username: '', // 사용자 입력 필요
        password: '', // 사용자 입력 필요
      };
    } else {
      newHops[hopIndex] = {
        deviceId: null,
        host: '',
        port: 22,
        username: '',
        password: '',
      };
    }
    setSshHops(newHops);
  };

  // Hop의 SSH 정보 업데이트
  const handleUpdateHopSsh = (
    hopIndex: number,
    field: 'username' | 'password',
    value: string
  ) => {
    const newHops = [...sshHops];
    newHops[hopIndex][field] = value;
    setSshHops(newHops);
  };

  // ============================================================================
  // 외부 Nginx 서버 관리 함수 (K8s용)
  // ============================================================================
  const handleExternalNginxConnect = async () => {
    // 모든 홉의 정보가 입력되었는지 확인
    for (let i = 0; i < sshHops.length; i++) {
      const hop = sshHops[i];
      if (!hop.deviceId) {
        notification.warning({
          message: `Hop ${i + 1}의 서버를 선택해주세요`,
          duration: 3,
        });
        return;
      }
      if (!hop.host || hop.host.trim() === '') {
        notification.warning({
          message: `Hop ${i + 1}의 호스트 정보가 없습니다`,
          duration: 3,
        });
        return;
      }
      if (!hop.username || hop.username.trim() === '') {
        notification.warning({
          message: `Hop ${i + 1}의 사용자명을 입력해주세요`,
          duration: 3,
        });
        return;
      }
      if (!hop.password || hop.password.trim() === '') {
        notification.warning({
          message: `Hop ${i + 1}의 비밀번호를 입력해주세요`,
          duration: 3,
        });
        return;
      }
    }

    setConnectingExternal(true);
    try {
      // 전체 홉 체인을 백엔드로 전송 (Multi-hop SSH 지원)
      const hops = sshHops
        .filter(hop => hop.host && hop.username && hop.password)
        .map(hop => ({
          host: hop.host.trim(),
          port: hop.port,
          username: hop.username.trim(),
          password: hop.password,
        }));

      // 디버깅: hops 배열 확인

      if (hops.length === 0) {
        notification.error({
          message: '연결 정보 오류',
          description:
            '유효한 SSH 연결 정보가 없습니다. 모든 필드를 확인해주세요.',
          duration: 5,
        });
        setConnectingExternal(false);
        return;
      }

      const result = await externalNginxConnect({ hops });

      setExternalNginxStatus(result.data);
      notification.success({
        message: '외부 Nginx 서버 연결 성공',
        description: `버전: ${result.data.nginx_version}, 상태: ${result.data.nginx_status} (${hops.length}개 홉 경유)`,
        duration: 5,
      });
      // 연결 성공 시 설정 파일 목록도 조회
      await handleExternalNginxListConfigs();
    } catch (error) {
      const err = error as Error;
      setExternalNginxStatus(null);
      notification.error({
        message: '외부 Nginx 서버 연결 실패',
        description: err.message || '서버에 연결할 수 없습니다',
        duration: 5,
      });
    } finally {
      setConnectingExternal(false);
    }
  };

  // Nginx 서버 정보 가져오기 (마지막 홉)
  const _getNginxServerInfo = (): ExternalNginxServer | null => {
    if (sshHops.length === 0) return null;
    const lastHop = sshHops[sshHops.length - 1];
    if (!lastHop.password) return null;
    return {
      nginx_host: lastHop.host,
      nginx_port: lastHop.port,
      nginx_username: lastHop.username,
      nginx_password: lastHop.password,
    };
  };

  const handleExternalNginxListConfigs = async () => {
    if (sshHops.length === 0) return;

    // 전체 홉 체인을 백엔드로 전송
    const hops = sshHops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password,
    }));

    setLoadingExternalConfigs(true);
    try {
      const result = await externalNginxListConfigs({ hops });
      setExternalNginxConfigs(result.data?.configs || []);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '외부 Nginx 설정 파일 목록 조회 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setLoadingExternalConfigs(false);
    }
  };

  const handleExternalNginxReload = async () => {
    if (sshHops.length === 0) return;

    // 전체 홉 체인을 백엔드로 전송
    const hops = sshHops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password,
    }));

    setReloadingExternalNginx(true);
    try {
      await externalNginxReload({ hops });
      message.success('외부 Nginx가 리로드되었습니다');
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '외부 Nginx 리로드 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setReloadingExternalNginx(false);
    }
  };

  const handleExternalNginxSaveConfig = async () => {
    if (sshHops.length === 0) return;

    // 전체 홉 체인을 백엔드로 전송
    const hops = sshHops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password,
    }));

    try {
      const values = await externalNginxForm.validateFields();
      await externalNginxCreateConfig({
        hops,
        domain: values.domain,
        upstream_host: values.upstream_host,
        upstream_port: values.upstream_port,
        enable_ssl: values.enable_ssl || false,
      });
      notification.success({
        message: '외부 Nginx 설정 생성 완료',
        description: `${values.domain} 설정이 생성되었습니다`,
        duration: 5,
      });
      setExternalConfigModalVisible(false);
      externalNginxForm.resetFields();
      await handleExternalNginxListConfigs();
      await handleExternalNginxReload();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '외부 Nginx 설정 생성 실패',
        description: err.message,
        duration: 5,
      });
    }
  };

  const handleExternalNginxDeleteConfig = async (domain: string) => {
    if (sshHops.length === 0) return;

    // 전체 홉 체인을 백엔드로 전송
    const hops = sshHops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password,
    }));

    try {
      await externalNginxDeleteConfig({
        hops,
        domain,
      });
      notification.success({
        message: '외부 Nginx 설정 삭제 완료',
        description: `${domain} 설정이 삭제되었습니다`,
        duration: 5,
      });
      await handleExternalNginxListConfigs();
      await handleExternalNginxReload();
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '외부 Nginx 설정 삭제 실패',
        description: err.message,
        duration: 5,
      });
    }
  };

  // View External nginx config
  const handleViewExternalConfig = async (domain: string) => {
    if (sshHops.length === 0) return;

    // 전체 홉 체인을 백엔드로 전송
    const hops = sshHops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password,
    }));

    try {
      const result = await getNginxConfigContent({
        infra_id: 0, // External nginx doesn't use infra_id
        domain,
        hops,
      });
      setViewingExternalConfig({
        domain,
        content: result.data?.content || '',
        path: result.data?.path || '',
      });
      setEditedExternalContent(result.data?.content || '');
      setEditingExternalConfig(false);
      setViewExternalConfigModalVisible(true);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '외부 Nginx 설정 파일 조회 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  // Save edited External nginx config
  const handleSaveExternalConfigContent = async () => {
    if (sshHops.length === 0 || !viewingExternalConfig) return;

    // 전체 홉 체인을 백엔드로 전송
    const hops = sshHops.map(hop => ({
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password,
    }));

    try {
      await updateNginxConfigContent({
        infra_id: 0, // External nginx doesn't use infra_id
        domain: viewingExternalConfig.domain,
        content: editedExternalContent,
        hops,
      });
      notification.success({
        message: '외부 Nginx 설정 파일 수정 완료',
        description: `${viewingExternalConfig.domain} 설정이 저장되었습니다`,
        duration: 5,
      });
      setViewingExternalConfig({
        ...viewingExternalConfig,
        content: editedExternalContent,
      });
      setEditingExternalConfig(false);
      await handleExternalNginxListConfigs();
      await handleExternalNginxReload();
      message.success('외부 Nginx가 자동으로 리로드되었습니다');
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: '외부 Nginx 설정 파일 수정 실패',
        description: err.message || '알 수 없는 오류가 발생했습니다',
        duration: 5,
      });
    }
  };

  // ============================================================================
  // K8s 서비스 NodePort 조회 함수
  // ============================================================================
  const handleLoadK8sServices = async () => {
    if (!service?.id) return;

    setLoadingK8sServices(true);
    try {
      const result = await getK8sResources(service.id);
      const serviceInfoList: K8sServiceInfo[] = (result.services || []).map(
        (svc: any) => ({
          name: svc.metadata?.name || '-',
          type: svc.spec?.type || 'ClusterIP',
          clusterIP: svc.spec?.clusterIP || '-',
          ports: (svc.spec?.ports || []).map((port: any) => ({
            name: port.name,
            port: port.port,
            targetPort: port.targetPort,
            nodePort: port.nodePort,
            protocol: port.protocol || 'TCP',
          })),
        })
      );
      setK8sServices(serviceInfoList);
    } catch (error) {
      const err = error as Error;
      notification.error({
        message: 'K8s 서비스 조회 실패',
        description: err.message,
        duration: 5,
      });
    } finally {
      setLoadingK8sServices(false);
    }
  };

  // ============================================================================
  // 렌더링
  // ============================================================================
  const renderDockerNginxSection = () => (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <Alert
        message={`${isDockerInfra ? 'Docker' : 'Podman'} Nginx 리버스 프록시`}
        description='Nginx 컨테이너를 생성하여 서비스에 대한 리버스 프록시 및 도메인 라우팅을 설정합니다.'
        type='info'
        showIcon
      />

      <Card
        size='small'
        title={
          <>
            <CheckCircleOutlined /> 컨테이너 상태
          </>
        }
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Button
            type='primary'
            size='small'
            icon={<SyncOutlined />}
            onClick={handleCheckNginxContainer}
            loading={checkingNginx}
          >
            상태 확인
          </Button>

          {nginxContainerStatus && (
            <Descriptions
              bordered
              size='small'
              column={2}
              style={{ marginTop: 12 }}
            >
              <Descriptions.Item label='컨테이너 이름'>
                <Tag color='blue'>{nginxContainerStatus.name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label='상태'>
                <Tag color={nginxContainerStatus.running ? 'success' : 'error'}>
                  {nginxContainerStatus.running ? '실행 중' : '중지됨'}
                </Tag>
              </Descriptions.Item>
              {nginxContainerStatus.ports && (
                <Descriptions.Item label='포트' span={2}>
                  {nginxContainerStatus.ports}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}

          {(!nginxContainerStatus || !nginxContainerStatus.running) && (
            <Popconfirm
              title='Nginx 컨테이너 생성'
              description='Nginx 컨테이너를 생성하시겠습니까?'
              onConfirm={handleCreateNginxContainer}
              okText='생성'
              cancelText='취소'
            >
              <Button
                type='primary'
                size='small'
                icon={<PlusOutlined />}
                loading={creatingNginx}
                style={{ marginTop: 8 }}
              >
                컨테이너 생성
              </Button>
            </Popconfirm>
          )}
        </Space>
      </Card>

      {nginxContainerStatus?.running && (
        <Card
          size='small'
          title={
            <>
              <FileTextOutlined /> 도메인 라우팅 설정
            </>
          }
          extra={
            <Space>
              <Button
                size='small'
                icon={<SyncOutlined />}
                onClick={handleListNginxConfigs}
                loading={loadingConfigs}
              >
                새로고침
              </Button>
              <Button
                size='small'
                icon={<SyncOutlined spin={reloadingNginx} />}
                onClick={handleReloadNginx}
                loading={reloadingNginx}
              >
                리로드
              </Button>
              <Button
                size='small'
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => setConfigModalVisible(true)}
              >
                추가
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={nginxConfigs}
            loading={loadingConfigs}
            rowKey='filename'
            columns={[
              {
                title: '파일명',
                dataIndex: 'filename',
                key: 'filename',
                render: (filename: string) => <Text strong>{filename}</Text>,
              },
              {
                title: '경로',
                dataIndex: 'path',
                key: 'path',
                render: (path: string) => <Text type='secondary'>{path}</Text>,
              },
              { title: '크기', dataIndex: 'size', key: 'size' },
              { title: '수정일', dataIndex: 'modified', key: 'modified' },
              {
                title: '작업',
                key: 'actions',
                render: (_: unknown, record: NginxConfig) => {
                  const domain = record.filename.replace('.conf', '');
                  return (
                    <Space>
                      <Button
                        size='small'
                        icon={<EyeOutlined />}
                        onClick={() => void handleViewDockerConfig(domain)}
                      >
                        조회
                      </Button>
                      <Button
                        size='small'
                        icon={<EditOutlined />}
                        onClick={() => {
                          void handleViewDockerConfig(domain);
                        }}
                      >
                        수정
                      </Button>
                      <Popconfirm
                        title='설정 삭제'
                        description={`${record.filename} 설정을 삭제하시겠습니까?`}
                        onConfirm={() => handleDeleteDockerConfig(domain)}
                        okText='삭제'
                        cancelText='취소'
                      >
                        <Button size='small' danger icon={<DeleteOutlined />}>
                          삭제
                        </Button>
                      </Popconfirm>
                    </Space>
                  );
                },
              },
            ]}
            pagination={false}
            size='small'
          />
        </Card>
      )}

      {/* TLS/SSL 인증서 관리 카드 */}
      {nginxContainerStatus?.running && (
        <Card
          size='small'
          title={
            <>
              <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> TLS/SSL
              인증서 관리
            </>
          }
          extra={
            <Space>
              <Button
                size='small'
                icon={<SyncOutlined />}
                onClick={handleListCertificates}
                loading={loadingCertificates}
              >
                새로고침
              </Button>
              <Button
                size='small'
                type='primary'
                icon={<UploadOutlined />}
                onClick={() => setCertUploadModalVisible(true)}
              >
                인증서 업로드
              </Button>
            </Space>
          }
        >
          <Alert
            message='TLS/SSL 인증서'
            description={
              <ul style={{ margin: 0, paddingLeft: 16, marginTop: 8 }}>
                <li>HTTPS 활성화를 위해 인증서를 업로드하세요</li>
                <li>인증서(.crt)와 개인키(.key)가 모두 필요합니다</li>
                <li>
                  업로드된 인증서는 <code>/etc/k8scontrol/nginx/ssl/</code>에
                  저장됩니다
                </li>
                <li>도메인 설정 시 SSL을 활성화하면 자동으로 연결됩니다</li>
              </ul>
            }
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
          />

          {certificates.length === 0 ? (
            <Empty description='등록된 인증서가 없습니다. 인증서 업로드 버튼을 클릭하세요.' />
          ) : (
            <Table
              dataSource={certificates.filter(cert => cert.type === 'cert')}
              loading={loadingCertificates}
              rowKey='filename'
              columns={[
                {
                  title: '도메인',
                  dataIndex: 'domain',
                  key: 'domain',
                  render: (domain: string) => (
                    <Space>
                      <LockOutlined style={{ color: '#52c41a' }} />
                      <Text strong>{domain}</Text>
                    </Space>
                  ),
                },
                {
                  title: '인증서 파일',
                  dataIndex: 'filename',
                  key: 'filename',
                  render: (filename: string) => (
                    <Tag color='green'>{filename}</Tag>
                  ),
                },
                {
                  title: '크기',
                  dataIndex: 'size',
                  key: 'size',
                },
                {
                  title: '수정일',
                  dataIndex: 'modified',
                  key: 'modified',
                },
                {
                  title: '작업',
                  key: 'actions',
                  render: (_: unknown, record: CertificateInfo) => (
                    <Space>
                      <Button
                        size='small'
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleValidateCertificate(record.domain)}
                      >
                        검증
                      </Button>
                      <Popconfirm
                        title='인증서 삭제'
                        description={`${record.domain} 인증서를 삭제하시겠습니까? 인증서와 개인키 모두 삭제됩니다.`}
                        onConfirm={() => handleDeleteCertificate(record.domain)}
                        okText='삭제'
                        cancelText='취소'
                      >
                        <Button size='small' danger icon={<DeleteOutlined />}>
                          삭제
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              pagination={false}
              size='small'
            />
          )}

          {certValidation && (
            <Card
              size='small'
              style={{ marginTop: 16 }}
              title={
                <>
                  <CheckCircleOutlined /> 인증서 검증 결과
                </>
              }
            >
              <Descriptions bordered size='small' column={2}>
                <Descriptions.Item label='도메인'>
                  {certValidation.domain}
                </Descriptions.Item>
                <Descriptions.Item label='상태'>
                  {certValidation.valid ? (
                    <Tag color='success' icon={<CheckCircleOutlined />}>
                      유효
                    </Tag>
                  ) : (
                    <Tag color='error' icon={<CloseCircleOutlined />}>
                      문제 발견
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label='인증서'>
                  {certValidation.cert_exists ? (
                    <Tag color='success'>존재</Tag>
                  ) : (
                    <Tag color='error'>없음</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label='개인키'>
                  {certValidation.key_exists ? (
                    <Tag color='success'>존재</Tag>
                  ) : (
                    <Tag color='error'>없음</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label='키 매칭'>
                  {certValidation.key_matches ? (
                    <Tag color='success'>일치</Tag>
                  ) : (
                    <Tag color='error'>불일치</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label='도메인 연결'>
                  {certValidation.domain_status ? (
                    <Tag
                      color={
                        certValidation.ssl_enabled
                          ? 'success'
                          : certValidation.config_exists
                            ? 'processing'
                            : 'default'
                      }
                    >
                      {certValidation.domain_status}
                    </Tag>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label='만료일'>
                  {certValidation.expiry_date || '-'}
                </Descriptions.Item>
                {certValidation.issuer && (
                  <Descriptions.Item label='발급자' span={2}>
                    <Text type='secondary'>{certValidation.issuer}</Text>
                  </Descriptions.Item>
                )}
                {certValidation.subject && (
                  <Descriptions.Item label='주체' span={2}>
                    <Text type='secondary'>{certValidation.subject}</Text>
                  </Descriptions.Item>
                )}
                {certValidation.connected_domains &&
                  certValidation.connected_domains.length > 0 && (
                    <Descriptions.Item label='연결된 도메인' span={2}>
                      <Space wrap>
                        {certValidation.connected_domains.map((d, idx) => (
                          <Tag key={idx} color='blue' icon={<GlobalOutlined />}>
                            {d}
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}
                {certValidation.config_files &&
                  certValidation.config_files.length > 0 && (
                    <Descriptions.Item label='사용 중인 설정' span={2}>
                      <Space wrap>
                        {certValidation.config_files.map((f, idx) => (
                          <Tag key={idx} color='cyan'>
                            {f}.conf
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}
                {/* 외부 접근 URL 표시 */}
                {certValidation.connected_domains &&
                  certValidation.connected_domains.length > 0 && (
                    <Descriptions.Item label='외부 접근 URL' span={2}>
                      <Space direction='vertical' size='small'>
                        {certValidation.connected_domains
                          .filter(domain => {
                            // 공인 IP 도메인 필터링 (192.168.x.x, 10.x.x.x, 172.16-31.x.x 제외)
                            const ipMatch = domain.match(
                              /(\d+)\.(\d+)\.(\d+)\.(\d+)/
                            );
                            if (!ipMatch) return false;
                            const [, a, b] = ipMatch.map(Number);
                            // 사설 IP 제외
                            if (a === 10) return false;
                            if (a === 192 && b === 168) return false;
                            if (a === 172 && b >= 16 && b <= 31) return false;
                            return true;
                          })
                          .map((domain, idx) => {
                            const externalPort = 8443; // 외부 HTTPS 포트
                            const url = `https://${domain}:${externalPort}`;
                            return (
                              <Space key={idx}>
                                <Tag color='green' icon={<GlobalOutlined />}>
                                  <a
                                    href={url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    style={{ color: 'inherit' }}
                                  >
                                    {url}
                                  </a>
                                </Tag>
                                <Button
                                  size='small'
                                  type='link'
                                  icon={<EyeOutlined />}
                                  onClick={() => window.open(url, '_blank')}
                                >
                                  접속
                                </Button>
                              </Space>
                            );
                          })}
                        {certValidation.connected_domains.every(domain => {
                          const ipMatch = domain.match(
                            /(\d+)\.(\d+)\.(\d+)\.(\d+)/
                          );
                          if (!ipMatch) return true;
                          const [, a, b] = ipMatch.map(Number);
                          return (
                            a === 10 ||
                            (a === 192 && b === 168) ||
                            (a === 172 && b >= 16 && b <= 31)
                          );
                        }) && (
                          <Text type='secondary'>
                            공인 IP 도메인이 설정되지 않았습니다
                          </Text>
                        )}
                      </Space>
                    </Descriptions.Item>
                  )}
              </Descriptions>
            </Card>
          )}
        </Card>
      )}
    </Space>
  );

  const renderK8sIngressSection = () => (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      {/* Ingress Controller 상태 */}
      {loadingControllerStatus ? (
        <Card>
          <Spin tip='Nginx Ingress Controller 상태 확인 중...' />
        </Card>
      ) : ingressControllerStatus?.status === 'installing' ? (
        <Alert
          message={
            <Space>
              <SyncOutlined spin />
              <span>Nginx Ingress Controller 설치 진행 중</span>
              {pollingElapsedTime > 0 && (
                <Tag color='blue'>
                  경과: {Math.floor(pollingElapsedTime / 1000)}초
                </Tag>
              )}
            </Space>
          }
          description={
            <div>
              <p>
                설치가 백그라운드에서 진행 중입니다. 완료되면 자동으로 알림이
                표시됩니다.
              </p>
              <Progress
                percent={66}
                status='active'
                strokeColor={{ from: '#108ee9', to: '#87d068' }}
              />
              <Space style={{ marginTop: 12 }}>
                <Button
                  size='small'
                  icon={<SyncOutlined />}
                  onClick={handleCheckIngressController}
                  disabled={installingController}
                >
                  수동 확인
                </Button>
                <Button
                  size='small'
                  danger
                  onClick={() => {
                    stopPollingControllerStatus();
                    message.info('모니터링을 중지했습니다.');
                  }}
                  disabled={!installingController}
                >
                  모니터링 중지
                </Button>
              </Space>
            </div>
          }
          type='info'
          showIcon
        />
      ) : ingressControllerStatus?.status === 'error' ? (
        <Alert
          message='Nginx Ingress Controller 오류'
          description={
            <div>
              <p>Ingress Controller에 오류가 발생했습니다.</p>
              <Space style={{ marginTop: 12 }}>
                <Button
                  type='primary'
                  danger
                  icon={<RocketOutlined />}
                  onClick={handleInstallIngressController}
                  loading={installingController}
                >
                  재설치
                </Button>
                <Button
                  type='link'
                  icon={<SyncOutlined />}
                  onClick={handleCheckIngressController}
                  disabled={installingController}
                >
                  상태 다시 확인
                </Button>
              </Space>
            </div>
          }
          type='error'
          showIcon
        />
      ) : ingressControllerStatus && !ingressControllerStatus.installed ? (
        <Alert
          message='Nginx Ingress Controller 미설치'
          description={
            <div>
              <p>
                Nginx Ingress Controller가 설치되어 있지 않습니다. Controller를
                먼저 설치해야 합니다.
              </p>
              <Space style={{ marginTop: 12 }}>
                <Button
                  type='primary'
                  icon={<RocketOutlined />}
                  onClick={handleInstallIngressController}
                  loading={installingController}
                >
                  자동 설치
                </Button>
                <Button
                  type='link'
                  icon={<SyncOutlined />}
                  onClick={handleCheckIngressController}
                  disabled={installingController}
                >
                  상태 다시 확인
                </Button>
              </Space>
            </div>
          }
          type='warning'
          showIcon
        />
      ) : ingressControllerStatus?.installed ? (
        <Alert
          message='Nginx Ingress Controller 정상'
          description={
            <div>
              <Text>
                Nginx Ingress Controller가 정상적으로 설치되어 있습니다.
              </Text>
              <Space style={{ marginTop: 12 }}>
                <Button
                  type='primary'
                  danger
                  icon={<RocketOutlined />}
                  onClick={handleInstallIngressController}
                  loading={installingController}
                  size='small'
                >
                  재설치
                </Button>
                <Button
                  type='link'
                  icon={<SyncOutlined />}
                  onClick={handleCheckIngressController}
                  disabled={installingController}
                  size='small'
                >
                  상태 다시 확인
                </Button>
              </Space>
            </div>
          }
          type='success'
          showIcon
        />
      ) : (
        <Button
          type='primary'
          onClick={handleCheckIngressController}
          loading={loadingControllerStatus}
        >
          Ingress Controller 상태 확인
        </Button>
      )}

      {/* Ingress 관리 */}
      <Card
        title={
          <Space>
            <GlobalOutlined style={{ color: '#1890ff' }} />
            <Text strong>Nginx Ingress 도메인 연결</Text>
            {ingressControllerStatus && !ingressControllerStatus.installed && (
              <Tag color='warning' icon={<WarningOutlined />}>
                Controller 미설치
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {!showIngressForm && (
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => setShowIngressForm(true)}
                disabled={
                  ingressControllerStatus && !ingressControllerStatus.installed
                }
              >
                Ingress 생성
              </Button>
            )}
            <Button
              icon={<SyncOutlined />}
              onClick={handleLoadIngresses}
              loading={loadingIngress}
            >
              조회
            </Button>
          </Space>
        }
      >
        {showIngressForm && (
          <div
            style={{
              marginBottom: 16,
              padding: 16,
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          >
            <Form
              form={k8sForm}
              layout='vertical'
              onFinish={handleCreateIngress}
              initialValues={{
                path: '/',
                pathType: 'Prefix',
                enableTLS: false,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label='Ingress 이름'
                    name='ingressName'
                    rules={[
                      { required: true, message: 'Ingress 이름을 입력하세요' },
                    ]}
                  >
                    <Input placeholder='예: my-app-ingress' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label='도메인'
                    name='host'
                    rules={[{ required: true, message: '도메인을 입력하세요' }]}
                  >
                    <Input placeholder='예: app.example.com' />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label='Service 이름'
                    name='serviceName'
                    rules={[
                      { required: true, message: 'Service 이름을 입력하세요' },
                    ]}
                  >
                    <Input placeholder='예: my-service' />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label='Service 포트'
                    name='servicePort'
                    rules={[
                      { required: true, message: 'Service 포트를 입력하세요' },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={65535}
                      placeholder='예: 80'
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Path' name='path'>
                    <Input placeholder='예: /' />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label='Path Type' name='pathType'>
                    <Select>
                      <Select.Option value='Prefix'>Prefix</Select.Option>
                      <Select.Option value='Exact'>Exact</Select.Option>
                      <Select.Option value='ImplementationSpecific'>
                        ImplementationSpecific
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='TLS 활성화' name='enableTLS'>
                    <Select>
                      <Select.Option value={false}>비활성화</Select.Option>
                      <Select.Option value={true}>활성화</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.enableTLS !== currentValues.enableTLS
                }
              >
                {({ getFieldValue }) => {
                  const enableTLS = getFieldValue('enableTLS');
                  return enableTLS ? (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label='TLS Secret 이름'
                          name='tlsSecretName'
                          tooltip='사용할 TLS Secret 이름. 미입력 시 자동 생성됩니다.'
                        >
                          <Select
                            placeholder='TLS Secret 선택 또는 입력'
                            allowClear
                            showSearch
                            optionFilterProp='children'
                            dropdownRender={menu => (
                              <>
                                {menu}
                                <div
                                  style={{
                                    padding: '8px',
                                    borderTop: '1px solid #d9d9d9',
                                  }}
                                >
                                  <Button
                                    type='link'
                                    size='small'
                                    icon={<PlusOutlined />}
                                    onClick={() =>
                                      setK8sTlsUploadModalVisible(true)
                                    }
                                  >
                                    새 TLS Secret 생성
                                  </Button>
                                </div>
                              </>
                            )}
                          >
                            {k8sTlsSecrets.map(secret => (
                              <Select.Option
                                key={secret.name}
                                value={secret.name}
                              >
                                <Space>
                                  <SafetyCertificateOutlined />
                                  {secret.name}
                                </Space>
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label=' ' colon={false}>
                          <Button
                            icon={<SyncOutlined />}
                            onClick={handleLoadK8sTlsSecrets}
                            loading={loadingK8sTlsSecrets}
                          >
                            Secret 목록 조회
                          </Button>
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null;
                }}
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={loadingIngress}
                  >
                    생성
                  </Button>
                  <Button
                    onClick={() => {
                      setShowIngressForm(false);
                      k8sForm.resetFields();
                    }}
                  >
                    취소
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}

        {loadingIngress ? (
          <Spin />
        ) : ingressList.length === 0 ? (
          <Empty description='등록된 Ingress가 없습니다. 생성 버튼을 클릭하세요.' />
        ) : (
          <Table
            dataSource={ingressList}
            rowKey={(record: any) => record.metadata?.name || record.name}
            pagination={{ pageSize: 10 }}
            size='small'
            columns={[
              {
                title: 'Ingress 이름',
                dataIndex: ['metadata', 'name'],
                key: 'name',
                render: (name: string) => <Text strong>{name}</Text>,
              },
              {
                title: '도메인',
                dataIndex: ['spec', 'rules'],
                key: 'host',
                render: (rules: any[]) => {
                  if (!rules || rules.length === 0) return '-';
                  return (
                    <Space wrap>
                      {rules.map((rule: any, idx: number) => (
                        <Tag key={idx} color='blue' icon={<GlobalOutlined />}>
                          {rule.host || '-'}
                        </Tag>
                      ))}
                    </Space>
                  );
                },
              },
              {
                title: 'TLS',
                dataIndex: ['spec', 'tls'],
                key: 'tls',
                render: (tls: any[]) =>
                  !tls || tls.length === 0 ? (
                    <Tag color='default'>비활성화</Tag>
                  ) : (
                    <Tag color='green' icon={<CheckCircleOutlined />}>
                      활성화
                    </Tag>
                  ),
              },
              {
                title: '작업',
                key: 'actions',
                render: (_: any, record: any) => (
                  <Button
                    size='small'
                    icon={<EyeOutlined />}
                    onClick={async () => {
                      if (!service?.id) return;
                      try {
                        const yaml = await getK8sResourceYaml({
                          service_id: service.id,
                          resource_type: 'ingress',
                          resource_name: record.metadata?.name || record.name,
                        });
                        Modal.info({
                          title: 'YAML',
                          width: 800,
                          content: (
                            <pre style={{ maxHeight: 400, overflow: 'auto' }}>
                              {yaml}
                            </pre>
                          ),
                        });
                      } catch {
                        message.error('YAML 조회 실패');
                      }
                    }}
                  >
                    YAML 보기
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* K8s TLS Secret 관리 카드 - Ingress Controller 설치된 경우에만 표시 */}
      {ingressControllerStatus?.installed && (
        <Card
          title={
            <Space>
              <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
              <Text strong>TLS/SSL 인증서 관리 (K8s Secret)</Text>
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setK8sTlsUploadModalVisible(true)}
              >
                인증서 업로드
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={handleLoadK8sTlsSecrets}
                loading={loadingK8sTlsSecrets}
              >
                조회
              </Button>
            </Space>
          }
        >
          <Alert
            message='TLS Secret 관리'
            description='Ingress에서 HTTPS를 사용하려면 먼저 TLS Secret을 생성해야 합니다. PEM 형식의 인증서와 개인키를 업로드하세요.'
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
          />
          {loadingK8sTlsSecrets ? (
            <Spin />
          ) : k8sTlsSecrets.length === 0 ? (
            <Empty description='등록된 TLS Secret이 없습니다. 인증서 업로드 버튼을 클릭하세요.' />
          ) : (
            <Table
              dataSource={k8sTlsSecrets}
              rowKey='name'
              pagination={false}
              size='small'
              columns={[
                {
                  title: 'Secret 이름',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name: string) => (
                    <Space>
                      <LockOutlined style={{ color: '#52c41a' }} />
                      <Text strong>{name}</Text>
                    </Space>
                  ),
                },
                {
                  title: '네임스페이스',
                  dataIndex: 'namespace',
                  key: 'namespace',
                  render: (ns: string) => <Tag color='blue'>{ns}</Tag>,
                },
                {
                  title: '만료일',
                  dataIndex: 'cert_expiry',
                  key: 'cert_expiry',
                  render: (expiry: string) => expiry || '-',
                },
                {
                  title: '발급자',
                  dataIndex: 'cert_issuer',
                  key: 'cert_issuer',
                  render: (issuer: string) => issuer || '-',
                  ellipsis: true,
                },
                {
                  title: '생성일',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) =>
                    date ? new Date(date).toLocaleDateString() : '-',
                },
                {
                  title: '작업',
                  key: 'actions',
                  render: (_: unknown, record: TLSSecretInfo) => (
                    <Popconfirm
                      title='정말 삭제하시겠습니까?'
                      description='이 TLS Secret을 사용 중인 Ingress가 있으면 HTTPS가 작동하지 않습니다.'
                      onConfirm={() => handleDeleteK8sTlsSecret(record.name)}
                      okText='삭제'
                      cancelText='취소'
                    >
                      <Button size='small' danger icon={<DeleteOutlined />}>
                        삭제
                      </Button>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          )}
        </Card>
      )}
    </Space>
  );

  // 외부 Nginx 서버 연동 섹션 (K8s용)
  const renderExternalNginxSection = () => (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <Alert
        message='외부 Nginx 서버 연동'
        description='외부 Nginx 서버에 SSH 접속하여 K8s 서비스에 대한 도메인 라우팅을 설정합니다. K8s NodePort를 통해 외부에서 접근할 수 있습니다.'
        type='info'
        showIcon
      />

      {/* K8s 서비스 NodePort 정보 */}
      <Card
        size='small'
        title={
          <>
            <GlobalOutlined /> K8s 서비스 NodePort 정보
          </>
        }
        extra={
          <Button
            size='small'
            icon={<SyncOutlined />}
            onClick={handleLoadK8sServices}
            loading={loadingK8sServices}
          >
            조회
          </Button>
        }
      >
        {k8sServices.length === 0 ? (
          <Empty description='서비스 조회 버튼을 클릭하여 K8s 서비스 정보를 불러오세요' />
        ) : (
          <Table
            dataSource={k8sServices}
            rowKey='name'
            size='small'
            pagination={false}
            columns={[
              {
                title: '서비스 이름',
                dataIndex: 'name',
                key: 'name',
                render: (name: string) => <Text strong>{name}</Text>,
              },
              {
                title: '타입',
                dataIndex: 'type',
                key: 'type',
                render: (type: string) => (
                  <Tag
                    color={
                      type === 'NodePort'
                        ? 'blue'
                        : type === 'LoadBalancer'
                          ? 'green'
                          : 'default'
                    }
                  >
                    {type}
                  </Tag>
                ),
              },
              {
                title: 'Cluster IP',
                dataIndex: 'clusterIP',
                key: 'clusterIP',
              },
              {
                title: '포트 정보',
                key: 'ports',
                render: (_: unknown, record: K8sServiceInfo) => (
                  <Space direction='vertical' size={4}>
                    {record.ports.map((port, idx) => (
                      <Space key={idx} size={4}>
                        <Tag color='cyan'>
                          {port.protocol} {port.port}:{port.targetPort}
                        </Tag>
                        {port.nodePort && (
                          <Tag color='orange' style={{ fontWeight: 'bold' }}>
                            NodePort: {port.nodePort}
                          </Tag>
                        )}
                      </Space>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* 서버 연결 정보 - Multi-hop SSH */}
      <Card
        size='small'
        className='domain-section-card'
        title={
          <Space>
            <ApiOutlined style={{ color: '#1890ff' }} />
            <Text strong>Multi-hop SSH 서버 연결</Text>
            <Tag color='blue'>{sshHops.length}개 홉</Tag>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title='장비 관리에서 등록된 서버 목록을 불러옵니다'>
              <Button
                size='small'
                icon={<SyncOutlined />}
                onClick={handleLoadDevices}
                loading={loadingDevices}
              >
                장비 목록
              </Button>
            </Tooltip>
            <Tooltip title='SSH 경유 서버(Jump Host)를 추가합니다'>
              <Button
                size='small'
                type='primary'
                ghost
                icon={<PlusOutlined />}
                onClick={handleAddHop}
              >
                Hop 추가
              </Button>
            </Tooltip>
          </Space>
        }
      >
        {/* Info Box */}
        <div className='domain-info-box'>
          <ApiOutlined className='domain-info-box-icon' />
          <div className='domain-info-box-content'>
            <div className='domain-info-box-title'>Multi-hop SSH 연결</div>
            <div className='domain-info-box-description'>
              점프 서버(Gateway)를 경유하여 최종 Nginx 서버에 접속합니다.
              <br />각 Hop의 서버를 선택하고 SSH 인증 정보를 입력하세요.{' '}
              <strong>마지막 Hop이 Nginx 서버</strong>가 됩니다.
            </div>
          </div>
        </div>

        {/* SSH Hop Container */}
        <div className='ssh-hop-container'>
          {sshHops.map((hop, hopIndex) => (
            <React.Fragment key={hopIndex}>
              {/* Hop Card */}
              <div
                className={`ssh-hop-card ${hopIndex === sshHops.length - 1 ? 'target' : 'gateway'}`}
              >
                {/* Hop Header */}
                <div className='ssh-hop-header'>
                  <div className='ssh-hop-header-left'>
                    <span
                      className={`ssh-hop-number ${hopIndex < sshHops.length - 1 ? 'gateway' : ''}`}
                    >
                      {hopIndex + 1}
                    </span>
                    <div className='ssh-hop-title'>
                      <span className='ssh-hop-title-main'>
                        {hopIndex === sshHops.length - 1 ? (
                          <Space>
                            <CloudServerOutlined />
                            Nginx 서버 (Target)
                          </Space>
                        ) : (
                          <Space>
                            <ApiOutlined />
                            Gateway {hopIndex + 1}
                          </Space>
                        )}
                      </span>
                      <span className='ssh-hop-title-sub'>
                        {hop.host
                          ? `${hop.username || 'user'}@${hop.host}:${hop.port}`
                          : '서버를 선택하세요'}
                      </span>
                    </div>
                  </div>
                  {sshHops.length > 1 && (
                    <Tooltip title='이 Hop 제거'>
                      <Button
                        size='small'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveHop(hopIndex)}
                      />
                    </Tooltip>
                  )}
                </div>

                {/* Hop Fields */}
                <div className='ssh-hop-fields'>
                  {/* Server Select */}
                  <div className='ssh-hop-field-row server-select'>
                    <div className='ssh-hop-field'>
                      <label htmlFor={`ssh-hop-server-${hopIndex}`}>
                        서버 선택
                      </label>
                      <Select
                        id={`ssh-hop-server-${hopIndex}`}
                        placeholder='장비 관리에서 등록된 서버를 선택하세요'
                        value={hop.deviceId}
                        onChange={deviceId =>
                          handleSelectHopDevice(hopIndex, deviceId)
                        }
                        loading={loadingDevices}
                        style={{ width: '100%' }}
                        showSearch
                        allowClear
                        filterOption={(input, option) => {
                          const label =
                            typeof option?.label === 'string'
                              ? option.label
                              : typeof option?.value === 'string'
                                ? option.value
                                : '';
                          return label
                            .toLowerCase()
                            .includes(input.toLowerCase());
                        }}
                      >
                        {devices.map(device => (
                          <Select.Option key={device.id} value={device.id}>
                            <Space>
                              <CloudServerOutlined />
                              {device.name} ({device.ipAddress}:{device.port})
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Host & Port */}
                  <div className='ssh-hop-field-row'>
                    <div className='ssh-hop-field'>
                      <label htmlFor={`ssh-hop-host-${hopIndex}`}>호스트</label>
                      <Input
                        id={`ssh-hop-host-${hopIndex}`}
                        value={hop.host}
                        disabled
                        placeholder='서버 선택 시 자동 입력'
                        prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />}
                      />
                    </div>
                    <div className='ssh-hop-field port'>
                      <label htmlFor={`ssh-hop-port-${hopIndex}`}>포트</label>
                      <InputNumber
                        id={`ssh-hop-port-${hopIndex}`}
                        value={hop.port}
                        disabled
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Username & Password */}
                  <div className='ssh-hop-field-row'>
                    <div className='ssh-hop-field'>
                      <label htmlFor={`ssh-hop-username-${hopIndex}`}>
                        사용자명
                      </label>
                      <Input
                        id={`ssh-hop-username-${hopIndex}`}
                        value={hop.username}
                        onChange={e =>
                          handleUpdateHopSsh(
                            hopIndex,
                            'username',
                            e.target.value
                          )
                        }
                        placeholder='예: root, admin'
                        prefix={<span style={{ color: '#bfbfbf' }}>@</span>}
                      />
                    </div>
                    <div className='ssh-hop-field'>
                      <label htmlFor={`ssh-hop-password-${hopIndex}`}>
                        비밀번호
                      </label>
                      <Input.Password
                        id={`ssh-hop-password-${hopIndex}`}
                        value={hop.password}
                        onChange={e =>
                          handleUpdateHopSsh(
                            hopIndex,
                            'password',
                            e.target.value
                          )
                        }
                        placeholder='SSH 비밀번호'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Arrow (between hops) */}
              {hopIndex < sshHops.length - 1 && (
                <div className='ssh-hop-connector'>
                  <div className='ssh-hop-connector-icon'>
                    <ArrowDownOutlined />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Add Hop Button */}
          <Button
            className='ssh-hop-add-btn'
            icon={<PlusOutlined />}
            onClick={handleAddHop}
          >
            Gateway Hop 추가 (경유 서버)
          </Button>
        </div>

        {/* Connect Test Button */}
        <div className='ssh-connect-btn'>
          <Button
            type='primary'
            icon={
              connectingExternal ? (
                <SyncOutlined spin />
              ) : (
                <CheckCircleOutlined />
              )
            }
            onClick={handleExternalNginxConnect}
            loading={connectingExternal}
            block
            size='large'
          >
            {connectingExternal
              ? '연결 테스트 중...'
              : `연결 테스트 (${sshHops.length}개 Hop 경유)`}
          </Button>
        </div>

        {/* Connection Status */}
        {externalNginxStatus && (
          <div
            className={`ssh-connection-status ${externalNginxStatus.connected ? '' : 'error'}`}
          >
            <Descriptions
              bordered
              size='small'
              column={{ xs: 1, sm: 2, md: 4 }}
            >
              <Descriptions.Item label='연결 상태'>
                <Tag
                  color={externalNginxStatus.connected ? 'success' : 'error'}
                  icon={
                    externalNginxStatus.connected ? (
                      <CheckCircleOutlined />
                    ) : (
                      <CloseCircleOutlined />
                    )
                  }
                >
                  {externalNginxStatus.connected ? '연결됨' : '연결 실패'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='Nginx 버전'>
                <Text>{externalNginxStatus.nginx_version || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label='서비스 상태'>
                <Tag
                  color={
                    externalNginxStatus.nginx_status === 'running'
                      ? 'success'
                      : 'warning'
                  }
                >
                  {externalNginxStatus.nginx_status || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='conf.d 디렉토리'>
                <Tag
                  color={
                    externalNginxStatus.conf_dir_exists ? 'success' : 'error'
                  }
                >
                  {externalNginxStatus.conf_dir_exists ? '존재' : '없음'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Card>

      {/* 도메인 설정 목록 */}
      {externalNginxStatus?.connected && (
        <Card
          size='small'
          title={
            <>
              <FileTextOutlined /> 도메인 라우팅 설정
            </>
          }
          extra={
            <Space>
              <Button
                size='small'
                icon={<SyncOutlined />}
                onClick={handleExternalNginxListConfigs}
                loading={loadingExternalConfigs}
              >
                새로고침
              </Button>
              <Button
                size='small'
                icon={<SyncOutlined spin={reloadingExternalNginx} />}
                onClick={handleExternalNginxReload}
                loading={reloadingExternalNginx}
              >
                리로드
              </Button>
              <Button
                size='small'
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => setExternalConfigModalVisible(true)}
              >
                추가
              </Button>
            </Space>
          }
        >
          <Input.Search
            placeholder='설정 파일명 검색...'
            allowClear
            value={configSearchText}
            onChange={e => setConfigSearchText(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={externalNginxConfigs.filter(config =>
              config.filename
                .toLowerCase()
                .includes(configSearchText.toLowerCase())
            )}
            loading={loadingExternalConfigs}
            rowKey='filename'
            columns={[
              {
                title: '파일명',
                dataIndex: 'filename',
                key: 'filename',
                render: (filename: string) => <Text strong>{filename}</Text>,
              },
              {
                title: '경로',
                dataIndex: 'path',
                key: 'path',
                render: (path: string) => <Text type='secondary'>{path}</Text>,
              },
              { title: '크기', dataIndex: 'size', key: 'size' },
              { title: '수정일', dataIndex: 'modified', key: 'modified' },
              {
                title: '작업',
                key: 'actions',
                render: (_: unknown, record: NginxConfig) => {
                  const domain = record.filename.replace('.conf', '');
                  return (
                    <Space>
                      <Button
                        size='small'
                        icon={<EyeOutlined />}
                        onClick={() => handleViewExternalConfig(domain)}
                      >
                        조회
                      </Button>
                      <Popconfirm
                        title='설정 삭제'
                        description={`${record.filename} 설정을 삭제하시겠습니까?`}
                        onConfirm={() =>
                          handleExternalNginxDeleteConfig(domain)
                        }
                        okText='삭제'
                        cancelText='취소'
                      >
                        <Button size='small' danger icon={<DeleteOutlined />}>
                          삭제
                        </Button>
                      </Popconfirm>
                    </Space>
                  );
                },
              },
            ]}
            pagination={false}
            size='small'
          />
        </Card>
      )}
    </Space>
  );

  return (
    <div style={{ padding: '16px 0' }}>
      <Alert
        message='도메인 설정'
        description={
          isContainerInfra
            ? `${isDockerInfra ? 'Docker' : 'Podman'} Nginx 리버스 프록시를 사용하여 도메인 라우팅을 설정합니다.`
            : 'Kubernetes Nginx Ingress Controller 또는 외부 Nginx 서버를 사용하여 도메인 라우팅을 설정합니다.'
        }
        type='info'
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Collapse
        defaultActiveKey={isContainerInfra ? ['domain'] : ['external-nginx']}
        style={{ background: '#fff' }}
        items={
          isContainerInfra
            ? [
                {
                  key: 'domain',
                  label: (
                    <Space>
                      <SettingOutlined style={{ color: '#722ed1' }} />
                      <Text strong>도메인 라우팅</Text>
                      <Tag color='purple'>Nginx · 리버스 프록시</Tag>
                    </Space>
                  ),
                  children: renderDockerNginxSection(),
                },
              ]
            : [
                {
                  key: 'external-nginx',
                  label: (
                    <Space>
                      <GlobalOutlined style={{ color: '#1890ff' }} />
                      <Text strong>외부 Nginx 서버 연동</Text>
                      <Tag color='blue'>SSH · K8s NodePort</Tag>
                      {externalNginxStatus?.connected && (
                        <Tag color='success'>연결됨</Tag>
                      )}
                    </Space>
                  ),
                  children: renderExternalNginxSection(),
                },
                {
                  key: 'ingress',
                  label: (
                    <Space>
                      <SettingOutlined style={{ color: '#722ed1' }} />
                      <Text strong>Ingress Controller</Text>
                      <Tag color='purple'>클러스터 내부</Tag>
                      {ingressControllerStatus?.installed && (
                        <Tag color='success'>설치됨</Tag>
                      )}
                    </Space>
                  ),
                  children: renderK8sIngressSection(),
                },
              ]
        }
      />

      {/* Docker Nginx 설정 모달 */}
      <Modal
        title='Nginx 설정 추가'
        open={configModalVisible}
        onOk={handleSaveDockerConfig}
        onCancel={() => {
          setConfigModalVisible(false);
          dockerForm.resetFields();
        }}
        okText='생성'
        cancelText='취소'
        width={600}
      >
        <Alert
          message='Nginx 리버스 프록시 설정'
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>
                <strong>도메인</strong>: 외부에서 접근할 도메인 (예:
                app.example.com)
              </li>
              <li>
                <strong>백엔드 호스트</strong>: localhost 입력 시 호스트
                머신으로 연결됩니다
              </li>
            </ul>
          }
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form
          form={dockerForm}
          layout='vertical'
          initialValues={{ ssl: false }}
        >
          <Form.Item
            label='도메인'
            name='domain'
            rules={[{ required: true, message: '도메인을 입력하세요' }]}
          >
            <Input placeholder='app.example.com' />
          </Form.Item>
          <Form.Item
            label='백엔드 호스트'
            name='backend_host'
            rules={[{ required: true, message: '백엔드 호스트를 입력하세요' }]}
          >
            <Input placeholder='localhost 또는 192.168.0.32' />
          </Form.Item>
          <Form.Item
            label='백엔드 포트'
            name='backend_port'
            rules={[{ required: true, message: '백엔드 포트를 입력하세요' }]}
          >
            <InputNumber
              min={1}
              max={65535}
              style={{ width: '100%' }}
              placeholder='8080'
            />
          </Form.Item>
          <Form.Item label='SSL 사용' name='ssl' valuePropName='checked'>
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.ssl !== cur.ssl}>
            {({ getFieldValue }) =>
              getFieldValue('ssl') && (
                <>
                  <Form.Item label='SSL 인증서 경로' name='cert_path'>
                    <Input placeholder='/etc/k8scontrol/nginx/ssl/cert.pem' />
                  </Form.Item>
                  <Form.Item label='SSL 키 경로' name='key_path'>
                    <Input placeholder='/etc/k8scontrol/nginx/ssl/key.pem' />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* 외부 Nginx 설정 모달 */}
      <Modal
        title='외부 Nginx 도메인 설정 추가'
        open={externalConfigModalVisible}
        onOk={handleExternalNginxSaveConfig}
        onCancel={() => {
          setExternalConfigModalVisible(false);
          externalNginxForm.resetFields();
        }}
        okText='생성'
        cancelText='취소'
        width={600}
      >
        <Alert
          message='K8s 서비스 도메인 연결'
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>
                <strong>도메인</strong>: 외부에서 접근할 도메인 (예:
                app.example.com)
              </li>
              <li>
                <strong>Upstream Host</strong>: K8s 클러스터 노드 IP
              </li>
              <li>
                <strong>Upstream Port</strong>: K8s 서비스의 NodePort
                (30000~32767)
              </li>
            </ul>
          }
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form
          form={externalNginxForm}
          layout='vertical'
          initialValues={{ enable_ssl: false, upstream_port: 30080 }}
        >
          <Form.Item
            label='도메인'
            name='domain'
            rules={[{ required: true, message: '도메인을 입력하세요' }]}
          >
            <Input placeholder='app.example.com' />
          </Form.Item>
          <Form.Item
            label='Upstream Host (K8s Node IP)'
            name='upstream_host'
            rules={[{ required: true, message: 'K8s 노드 IP를 입력하세요' }]}
          >
            <Input placeholder='192.168.0.100' />
          </Form.Item>
          <Form.Item
            label='Upstream Port (NodePort)'
            name='upstream_port'
            rules={[{ required: true, message: 'NodePort를 입력하세요' }]}
          >
            <InputNumber
              min={1}
              max={65535}
              style={{ width: '100%' }}
              placeholder='30080'
            />
          </Form.Item>
          <Form.Item label='SSL 사용' name='enable_ssl' valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* TLS/SSL 인증서 업로드 모달 */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            TLS/SSL 인증서 업로드
          </Space>
        }
        open={certUploadModalVisible}
        onOk={handleUploadCertificate}
        onCancel={() => {
          setCertUploadModalVisible(false);
          certUploadForm.resetFields();
        }}
        okText='업로드'
        cancelText='취소'
        confirmLoading={uploadingCert}
        width={700}
      >
        <Alert
          message='인증서 업로드 안내'
          description={
            <ul style={{ margin: 0, paddingLeft: 16, marginTop: 8 }}>
              <li>
                <strong>인증서 파일:</strong> PEM 형식의 SSL 인증서 (.crt, .pem)
              </li>
              <li>
                <strong>개인키 파일:</strong> PEM 형식의 개인키 (.key, .pem)
              </li>
              <li>인증서는 도메인별로 관리됩니다</li>
              <li>이미 존재하는 도메인의 인증서는 덮어씁니다</li>
            </ul>
          }
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={certUploadForm} layout='vertical'>
          <Form.Item
            name='domain'
            label='도메인'
            rules={[
              { required: true, message: '도메인을 입력해주세요' },
              {
                pattern: /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/,
                message: '유효한 도메인 형식이 아닙니다',
              },
            ]}
          >
            <Input placeholder='예: example.com, api.example.com' />
          </Form.Item>

          <Form.Item
            name='cert_content'
            label='인증서 내용 (Certificate)'
            rules={[
              { required: true, message: '인증서 내용을 입력해주세요' },
              {
                pattern: /-----BEGIN CERTIFICATE-----/,
                message: 'PEM 형식의 인증서를 입력해주세요',
              },
            ]}
            extra='-----BEGIN CERTIFICATE-----로 시작하는 인증서 내용을 붙여넣으세요'
          >
            <Input.TextArea
              rows={8}
              placeholder={`-----BEGIN CERTIFICATE-----
MIIDdTCCAl2gAwIBAgIJAKfRi...
-----END CERTIFICATE-----`}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>

          <Form.Item
            name='key_content'
            label='개인키 내용 (Private Key)'
            rules={[
              { required: true, message: '개인키 내용을 입력해주세요' },
              {
                pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
                message: 'PEM 형식의 개인키를 입력해주세요',
              },
            ]}
            extra='-----BEGIN PRIVATE KEY-----로 시작하는 개인키 내용을 붙여넣으세요'
          >
            <Input.TextArea
              rows={8}
              placeholder={`-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAAS...
-----END PRIVATE KEY-----`}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Docker/Podman Nginx 설정 파일 조회/수정 모달 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {editingDockerConfig ? '설정 파일 수정' : '설정 파일 조회'}
            {viewingDockerConfig && (
              <Tag color='blue'>{viewingDockerConfig.domain}</Tag>
            )}
          </Space>
        }
        open={viewDockerConfigModalVisible}
        onOk={editingDockerConfig ? handleSaveDockerConfigContent : undefined}
        onCancel={() => {
          setViewDockerConfigModalVisible(false);
          setViewingDockerConfig(null);
          setEditingDockerConfig(false);
        }}
        okText={editingDockerConfig ? '저장' : undefined}
        cancelText='닫기'
        width={900}
        footer={
          editingDockerConfig
            ? undefined
            : [
                <Button
                  key='edit'
                  type='primary'
                  icon={<EditOutlined />}
                  onClick={() => setEditingDockerConfig(true)}
                >
                  수정
                </Button>,
                <Button
                  key='close'
                  onClick={() => {
                    setViewDockerConfigModalVisible(false);
                    setViewingDockerConfig(null);
                  }}
                >
                  닫기
                </Button>,
              ]
        }
      >
        {viewingDockerConfig && (
          <Space direction='vertical' style={{ width: '100%' }} size='middle'>
            <Alert
              message='설정 파일 정보'
              description={
                <Space direction='vertical'>
                  <Text>
                    <strong>도메인:</strong> {viewingDockerConfig.domain}
                  </Text>
                  <Text>
                    <strong>경로:</strong> {viewingDockerConfig.path}
                  </Text>
                </Space>
              }
              type='info'
              showIcon
            />
            <div>
              <Text strong>설정 내용:</Text>
              <Input.TextArea
                value={
                  editingDockerConfig
                    ? editedDockerContent
                    : viewingDockerConfig.content
                }
                onChange={e => setEditedDockerContent(e.target.value)}
                disabled={!editingDockerConfig}
                rows={20}
                style={{
                  marginTop: 8,
                  fontFamily: 'monospace',
                  fontSize: '13px',
                }}
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* 외부 Nginx 설정 파일 조회/수정 모달 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {editingExternalConfig
              ? '외부 Nginx 설정 파일 수정'
              : '외부 Nginx 설정 파일 조회'}
            {viewingExternalConfig && (
              <Tag color='blue'>{viewingExternalConfig.domain}</Tag>
            )}
          </Space>
        }
        open={viewExternalConfigModalVisible}
        onOk={
          editingExternalConfig ? handleSaveExternalConfigContent : undefined
        }
        onCancel={() => {
          setViewExternalConfigModalVisible(false);
          setViewingExternalConfig(null);
          setEditingExternalConfig(false);
        }}
        okText={editingExternalConfig ? '저장' : undefined}
        cancelText='닫기'
        width={900}
        footer={
          editingExternalConfig
            ? undefined
            : [
                <Button
                  key='edit'
                  type='primary'
                  icon={<EditOutlined />}
                  onClick={() => setEditingExternalConfig(true)}
                >
                  수정
                </Button>,
                <Button
                  key='close'
                  onClick={() => {
                    setViewExternalConfigModalVisible(false);
                    setViewingExternalConfig(null);
                  }}
                >
                  닫기
                </Button>,
              ]
        }
      >
        {viewingExternalConfig && (
          <Space direction='vertical' style={{ width: '100%' }} size='middle'>
            <Alert
              message='외부 Nginx 설정 파일 정보'
              description={
                <Space direction='vertical'>
                  <Text>
                    <strong>도메인:</strong> {viewingExternalConfig.domain}
                  </Text>
                  <Text>
                    <strong>경로:</strong> {viewingExternalConfig.path}
                  </Text>
                </Space>
              }
              type='info'
              showIcon
            />
            <div>
              <Text strong>설정 내용:</Text>
              <Input.TextArea
                value={
                  editingExternalConfig
                    ? editedExternalContent
                    : viewingExternalConfig.content
                }
                onChange={e => setEditedExternalContent(e.target.value)}
                disabled={!editingExternalConfig}
                rows={20}
                style={{
                  marginTop: 8,
                  fontFamily: 'monospace',
                  fontSize: '13px',
                }}
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* K8s TLS Secret 업로드 모달 */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined />
            K8s TLS Secret 생성
          </Space>
        }
        open={k8sTlsUploadModalVisible}
        onCancel={() => {
          setK8sTlsUploadModalVisible(false);
          k8sTlsUploadForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Alert
          message='TLS Secret 생성'
          description='Kubernetes TLS Secret을 생성합니다. PEM 형식의 인증서(.crt)와 개인키(.key) 내용을 입력하세요. 생성된 Secret은 Ingress에서 HTTPS 설정 시 사용할 수 있습니다.'
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form
          form={k8sTlsUploadForm}
          layout='vertical'
          onFinish={handleUploadK8sTlsSecret}
        >
          <Form.Item
            name='secretName'
            label='Secret 이름'
            rules={[
              { required: true, message: 'Secret 이름을 입력해주세요' },
              {
                pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                message: '소문자, 숫자, 하이픈만 사용 가능합니다',
              },
            ]}
            extra={`네임스페이스: ${namespace}`}
          >
            <Input placeholder='예: my-app-tls' />
          </Form.Item>

          <Form.Item
            name='certContent'
            label='인증서 내용 (Certificate)'
            rules={[
              { required: true, message: '인증서 내용을 입력해주세요' },
              {
                pattern: /-----BEGIN CERTIFICATE-----/,
                message: 'PEM 형식의 인증서를 입력해주세요',
              },
            ]}
            extra='-----BEGIN CERTIFICATE-----로 시작하는 인증서 내용을 붙여넣으세요'
          >
            <Input.TextArea
              rows={8}
              placeholder={`-----BEGIN CERTIFICATE-----
MIIDdTCCAl2gAwIBAgIJAKfRi...
-----END CERTIFICATE-----`}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>

          <Form.Item
            name='keyContent'
            label='개인키 내용 (Private Key)'
            rules={[
              { required: true, message: '개인키 내용을 입력해주세요' },
              {
                pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
                message: 'PEM 형식의 개인키를 입력해주세요',
              },
            ]}
            extra='-----BEGIN PRIVATE KEY-----로 시작하는 개인키 내용을 붙여넣으세요'
          >
            <Input.TextArea
              rows={8}
              placeholder={`-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0B...
-----END PRIVATE KEY-----`}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type='primary'
                htmlType='submit'
                loading={uploadingK8sTlsSecret}
                icon={<SafetyCertificateOutlined />}
              >
                TLS Secret 생성
              </Button>
              <Button
                onClick={() => {
                  setK8sTlsUploadModalVisible(false);
                  k8sTlsUploadForm.resetFields();
                }}
              >
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DomainSettingsTab;
