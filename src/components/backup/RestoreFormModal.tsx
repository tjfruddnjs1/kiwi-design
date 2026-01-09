import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Checkbox,
  Select,
  message,
  Spin,
  Descriptions,
  Alert,
  Divider,
  Steps,
  Typography,
  Tag,
  Space,
  Radio,
  Tooltip,
} from 'antd';
import {
  RollbackOutlined,
  CloudServerOutlined,
  KeyOutlined,
  SelectOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  ContainerOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
import { Backup, ActualBackup, SshAuthHop } from '../../types/backup';
import { Hop } from '../../types/infra';
import { api } from '../../services/api';
import { logger } from '../../utils/logger';
import { getDockerBackup, DockerBackup } from '../../lib/api/docker';

const { Option } = Select;

// 복구 범위 타입
type RestoreScope = 'all' | 'selected';

interface RestoreFormValues {
  originalNamespace: string;
  targetNamespace?: string;
  backupVersion: string;
  authData: SshAuthHop[];
  // Docker/Podman 복구 옵션
  restoreVolumes?: boolean;
  restoreConfig?: boolean;
  redeployCompose?: boolean;
  stopExisting?: boolean;
  // 선택적 컨테이너 복구
  restoreScope?: RestoreScope;
  containers?: string[];
}

interface RestoreFormModalProps {
  visible: boolean;
  backup: Backup | null;
  onCancel: () => void;
  onSubmit: (values: RestoreFormValues) => Promise<void>;
  loading?: boolean;
  masterHops: Hop[];
  infraType?: string; // 인프라 타입 (kubernetes, docker, podman 등)
}

const RestoreFormModal: React.FC<RestoreFormModalProps> = ({
  visible,
  backup,
  onCancel,
  onSubmit,
  loading,
  masterHops,
  infraType,
}) => {
  const [form] = Form.useForm();
  const [isDifferentNamespace, setIsDifferentNamespace] = useState(false);
  const [isFetchingVersions, setIsFetchingVersions] = useState(false);
  const [backupVersions, setBackupVersions] = useState<ActualBackup[]>([]);
  const [authData, setAuthData] = useState<SshAuthHop[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Docker 컨테이너 선택 관련 상태
  const [dockerBackupDetail, setDockerBackupDetail] =
    useState<DockerBackup | null>(null);
  const [loadingBackupDetail, setLoadingBackupDetail] = useState(false);
  const [restoreScope, setRestoreScope] = useState<RestoreScope>('all');
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);

  // Docker/Podman 인프라 여부 확인
  const isDockerInfra =
    infraType === 'docker' ||
    infraType === 'external_docker' ||
    infraType === 'podman' ||
    infraType === 'external_podman';

  // 즉시 백업 여부 확인 (스케줄 백업이 아닌 경우)
  // immediate 백업은 이름에 -immediate- 가 포함되거나, schedule이 없는 경우
  const isImmediateBackup =
    backup?.name?.includes('-immediate') || !backup?.schedule;

  // Docker 백업 상세 정보 조회 (컨테이너 목록 포함)
  const fetchDockerBackupDetail = useCallback(async () => {
    if (!backup || !isDockerInfra) return;

    setLoadingBackupDetail(true);
    try {
      const detail = await getDockerBackup(backup.id);
      setDockerBackupDetail(detail);
      // 기본적으로 모든 컨테이너 선택
      if (detail?.containers && detail.containers.length > 0) {
        setSelectedContainers(detail.containers);
      }
    } catch (error) {
      logger.error('Docker 백업 상세 조회 실패:', error as Error);
      setDockerBackupDetail(null);
    } finally {
      setLoadingBackupDetail(false);
    }
  }, [backup, isDockerInfra]);

  useEffect(() => {
    if (visible && backup) {
      form.resetFields();
      setIsDifferentNamespace(false);
      setBackupVersions([]);
      setAuthData([]);
      // Docker 컨테이너 선택 상태 초기화
      setRestoreScope('all');
      setSelectedContainers([]);
      setDockerBackupDetail(null);
      // Docker 백업 또는 즉시 백업은 버전 선택 없이 바로 복구 가능
      // 즉시 백업의 경우 백업 이름 자체가 버전이므로 버전 목록에 추가
      if (isImmediateBackup && !isDockerInfra) {
        setBackupVersions([
          {
            name: backup.name,
            createdAt: backup.created_at || new Date().toISOString(),
            status: backup.status || 'Completed',
          },
        ]);
      }
      setIsAuthenticated(isDockerInfra || isImmediateBackup);
      // Docker 백업인 경우 상세 정보 조회 (컨테이너 목록)
      if (isDockerInfra) {
        void fetchDockerBackupDetail();
      }
    }
  }, [
    visible,
    backup,
    form,
    isDockerInfra,
    isImmediateBackup,
    fetchDockerBackupDetail,
  ]);

  const handleFetchVersions = async () => {
    if (!backup) return;

    const authFieldsToValidate = masterHops.flatMap((_, index) => [
      `ssh_username_${index}`,
      `ssh_password_${index}`,
    ]);

    try {
      const validatedValues = await form.validateFields(authFieldsToValidate);
      setIsFetchingVersions(true);

      const currentAuthData: SshAuthHop[] = masterHops.map((hop, index) => ({
        host: hop.host,
        port: hop.port,
        username: validatedValues[`ssh_username_${index}`],
        password: validatedValues[`ssh_password_${index}`],
      }));
      setAuthData(currentAuthData);

      const response = await api.backup.listActualBackups(
        backup.infra_id,
        backup.group_label || backup.name, // group_label이 없으면 name을 사용
        backup.name,
        backup.namespace,
        currentAuthData
      );

      const versions = response.data?.data ?? [];
      if (versions.length === 0) {
        message.info('사용 가능한 백업 버전을 찾을 수 없습니다.');
      } else {
        message.success(
          `백업 버전 ${versions.length}개를 성공적으로 가져왔습니다.`
        );
      }
      setBackupVersions(versions);
      setIsAuthenticated(true);
    } catch (error: unknown) {
      const err = error as { errorFields?: unknown };
      if (err && err.errorFields) {
        logger.error('인증 필드 유효성 검사 실패:', error);
      } else {
        logger.error('백업 버전 API 호출 실패:', error as Error);
        message.error(
          '백업 버전을 가져오는 데 실패했습니다. 인증 정보를 확인해주세요.'
        );
        setIsAuthenticated(false);
      }
    } finally {
      setIsFetchingVersions(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // backup 객체가 없을 경우를 대비한 방어 코드
      if (!backup) {
        message.error('백업 정보가 없어 복구를 진행할 수 없습니다.');
        return;
      }

      // Docker 선택적 복구 유효성 검사
      if (
        isDockerInfra &&
        restoreScope === 'selected' &&
        selectedContainers.length === 0
      ) {
        message.error('복구할 컨테이너를 하나 이상 선택해주세요.');
        return;
      }

      // SSH 인증 정보를 폼에서 직접 수집 (Docker/Podman 또는 K8s 즉시 백업)
      let currentAuthData = authData;
      if ((isDockerInfra || isImmediateBackup) && masterHops.length > 0) {
        currentAuthData = masterHops.map((hop, index) => ({
          host: hop.host || hop.ip || '',
          port: hop.port || 22,
          username: values[`ssh_username_${index}`],
          password: values[`ssh_password_${index}`],
        }));
      }

      const submissionData: RestoreFormValues = {
        originalNamespace: backup.namespace,
        targetNamespace: isDifferentNamespace
          ? values.targetNamespace
          : backup.namespace,
        // Docker 백업은 버전 선택이 없으므로 백업 이름 자체를 사용
        backupVersion: isDockerInfra ? backup.name : values.backupVersion,
        authData: currentAuthData,
        // Docker/Podman 복구 옵션
        restoreVolumes: isDockerInfra
          ? (values.restoreVolumes ?? true)
          : undefined,
        restoreConfig: isDockerInfra
          ? (values.restoreConfig ?? true)
          : undefined,
        redeployCompose: isDockerInfra
          ? (values.redeployCompose ?? false)
          : undefined,
        stopExisting: isDockerInfra
          ? (values.stopExisting ?? false)
          : undefined,
        // 선택적 컨테이너 복구 (Docker/Podman만)
        restoreScope: isDockerInfra ? restoreScope : undefined,
        containers:
          isDockerInfra && restoreScope === 'selected'
            ? selectedContainers
            : undefined,
      };
      await onSubmit(submissionData);
    } catch (error) {
      logger.error(
        '복구 제출 실패 (전체 폼 유효성 검사 실패):',
        error as Error
      );
    }
  };

  if (!backup) return null;

  return (
    <Modal
      title={
        <>
          <RollbackOutlined /> 백업 복구
        </>
      }
      open={visible}
      onCancel={onCancel}
      destroyOnClose
      footer={[
        <Button key='back' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          loading={loading}
          onClick={handleSubmit}
          disabled={!isAuthenticated || loading}
        >
          복구 시작
        </Button>,
      ]}
      width={650}
    >
      {/* 복구 진행 단계 표시 */}
      <Steps
        size='small'
        current={
          isDockerInfra || isImmediateBackup
            ? isAuthenticated
              ? 1
              : 0 // Docker/즉시백업: 인증→복구
            : isAuthenticated && backupVersions.length > 0
              ? 2
              : isAuthenticated
                ? 1
                : 0 // K8s 스케줄백업: 인증→버전선택→복구
        }
        style={{ marginBottom: 24 }}
        items={
          isDockerInfra || isImmediateBackup
            ? [
                {
                  title: 'SSH 인증',
                  icon: <KeyOutlined />,
                  description: (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      서버 접속
                    </Text>
                  ),
                },
                {
                  title: '복구 시작',
                  icon: <PlayCircleOutlined />,
                  description: (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      백업 복원
                    </Text>
                  ),
                },
              ]
            : [
                {
                  title: 'SSH 인증',
                  icon: <KeyOutlined />,
                  description: (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      서버 접속
                    </Text>
                  ),
                },
                {
                  title: '버전 선택',
                  icon: <SelectOutlined />,
                  description: (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      복구 대상 선택
                    </Text>
                  ),
                },
                {
                  title: '복구 시작',
                  icon: <PlayCircleOutlined />,
                  description: (
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      백업 복원
                    </Text>
                  ),
                },
              ]
        }
      />

      <Form form={form} layout='vertical'>
        <Descriptions bordered size='small' style={{ marginBottom: 16 }}>
          <Descriptions.Item label='백업 이름' span={3}>
            {backup.name}
          </Descriptions.Item>
          <Descriptions.Item
            label={isDockerInfra ? '백업 타입/프로젝트' : '원본 네임스페이스'}
            span={3}
          >
            {backup.namespace}
          </Descriptions.Item>
        </Descriptions>

        {/* 현재 단계에 따른 안내 메시지 */}
        {isDockerInfra || isImmediateBackup ? (
          <Alert
            message={isAuthenticated ? '복구 준비 완료' : 'SSH 인증 정보 입력'}
            description={
              isAuthenticated
                ? '아래 [복구 시작] 버튼을 클릭하여 백업을 복구합니다. 기존 데이터가 덮어쓰여질 수 있습니다.'
                : '서버에 접속하기 위한 SSH 인증 정보를 입력해주세요.'
            }
            type={isAuthenticated ? 'success' : 'info'}
            showIcon
            icon={isAuthenticated ? <CheckCircleOutlined /> : undefined}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            message={
              isAuthenticated && backupVersions.length > 0
                ? '복구 준비 완료'
                : isAuthenticated
                  ? '2단계: 백업 버전 선택'
                  : '1단계: SSH 인증 정보 입력'
            }
            description={
              isAuthenticated && backupVersions.length > 0
                ? '아래에서 버전을 선택하고 [복구 시작] 버튼을 클릭하세요.'
                : isAuthenticated
                  ? '아래 [백업 버전 가져오기] 버튼을 클릭하여 복구 가능한 버전 목록을 불러오세요.'
                  : '먼저 서버에 접속하기 위한 SSH 인증 정보를 입력해주세요.'
            }
            type={
              isAuthenticated && backupVersions.length > 0 ? 'success' : 'info'
            }
            showIcon
            icon={
              isAuthenticated && backupVersions.length > 0 ? (
                <CheckCircleOutlined />
              ) : undefined
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider orientation='left' plain>
          <CloudServerOutlined /> 서버 접속 정보 (SSH)
        </Divider>
        {masterHops.map((hop, index) => (
          <div
            key={index}
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #e8e8e8',
            }}
          >
            {/* 서버 호스트/포트 정보 표시 */}
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  fontWeight: 500,
                  color: '#1890ff',
                  fontSize: 13,
                }}
              >
                서버 {index + 1}: {hop.host || hop.ip || '(호스트 정보 없음)'}:
                {hop.port || 22}
              </span>
            </div>
            <Form.Item
              name={`ssh_username_${index}`}
              label='사용자 이름'
              rules={[
                { required: true, message: '사용자 이름을 입력해주세요.' },
              ]}
              initialValue={hop.username || 'root'}
              style={{ marginBottom: 8 }}
            >
              <Input placeholder='SSH 접속 사용자 이름' />
            </Form.Item>
            <Form.Item
              name={`ssh_password_${index}`}
              label='비밀번호'
              rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
              style={{ marginBottom: 0 }}
            >
              <Input.Password placeholder='SSH 접속 비밀번호' />
            </Form.Item>
          </div>
        ))}

        {/* Docker/Podman 복구 옵션 */}
        {isDockerInfra && (
          <>
            <Divider orientation='left' plain>
              <SettingOutlined /> 복구 옵션
            </Divider>

            <Alert
              message='Docker/Podman 복구 안내'
              description={
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>
                    <strong>볼륨 복구</strong>: 백업된 볼륨 데이터를 복원합니다.
                  </li>
                  <li>
                    <strong>설정 복구</strong>: Compose 파일 및 컨테이너 설정을
                    복원합니다.
                  </li>
                  <li>
                    <strong>서비스 재배포</strong>: 복원된 Compose 파일로
                    서비스를 재시작합니다. 이 옵션을 선택하면 실제 서비스가
                    롤백됩니다.
                  </li>
                </ul>
              }
              type='warning'
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name='restoreVolumes'
              valuePropName='checked'
              initialValue={true}
              style={{ marginBottom: 8 }}
            >
              <Checkbox defaultChecked>
                <strong>볼륨 데이터 복구</strong>
                <Text type='secondary' style={{ marginLeft: 8 }}>
                  백업된 볼륨 데이터를 복원합니다
                </Text>
              </Checkbox>
            </Form.Item>

            <Form.Item
              name='restoreConfig'
              valuePropName='checked'
              initialValue={true}
              style={{ marginBottom: 8 }}
            >
              <Checkbox defaultChecked>
                <strong>설정 파일 복구</strong>
                <Text type='secondary' style={{ marginLeft: 8 }}>
                  Compose 파일 및 컨테이너 설정을 복원합니다
                </Text>
              </Checkbox>
            </Form.Item>

            <Form.Item
              name='redeployCompose'
              valuePropName='checked'
              initialValue={false}
              style={{ marginBottom: 8 }}
            >
              <Checkbox>
                <strong>서비스 재배포 (롤백)</strong>
                <Text type='secondary' style={{ marginLeft: 8 }}>
                  복원된 Compose 파일로 서비스를 재시작합니다
                </Text>
              </Checkbox>
            </Form.Item>

            <Form.Item
              name='stopExisting'
              valuePropName='checked'
              initialValue={false}
              style={{ marginBottom: 16 }}
            >
              <Checkbox>
                <strong>기존 서비스 중지</strong>
                <Text type='secondary' style={{ marginLeft: 8 }}>
                  재배포 전 기존 서비스를 먼저 중지합니다
                </Text>
              </Checkbox>
            </Form.Item>

            {/* 컨테이너 선택 영역 */}
            <Divider orientation='left' plain>
              <ContainerOutlined /> 복구 범위 선택
            </Divider>

            {loadingBackupDetail ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size='small' />
                <span style={{ marginLeft: 8, color: '#888' }}>
                  백업 정보 조회 중...
                </span>
              </div>
            ) : dockerBackupDetail?.containers &&
              dockerBackupDetail.containers.length > 0 ? (
              <>
                <Form.Item
                  label={
                    <Space>
                      <span>복구 범위</span>
                      <Tooltip title='전체 백업을 복구하거나, 특정 컨테이너만 선택하여 복구할 수 있습니다. 다른 서비스에 영향을 주지 않으려면 특정 컨테이너만 선택하세요.'>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    </Space>
                  }
                >
                  <Radio.Group
                    value={restoreScope}
                    onChange={e => {
                      setRestoreScope(e.target.value);
                      if (
                        e.target.value === 'all' &&
                        dockerBackupDetail?.containers
                      ) {
                        setSelectedContainers(dockerBackupDetail.containers);
                      }
                    }}
                  >
                    <Space direction='vertical' style={{ width: '100%' }}>
                      <Radio value='all'>
                        <Space direction='vertical' size={0}>
                          <span style={{ fontWeight: 500 }}>
                            <AppstoreOutlined style={{ marginRight: 4 }} />
                            전체 백업 복구
                          </span>
                          <span style={{ fontSize: 12, color: '#888' }}>
                            백업된 모든 컨테이너와 데이터를 복구합니다 (
                            {dockerBackupDetail.containers.length}개)
                          </span>
                        </Space>
                      </Radio>
                      <Radio value='selected'>
                        <Space direction='vertical' size={0}>
                          <span style={{ fontWeight: 500 }}>
                            <ContainerOutlined style={{ marginRight: 4 }} />
                            선택한 컨테이너만 복구
                          </span>
                          <span style={{ fontSize: 12, color: '#888' }}>
                            아래에서 복구할 컨테이너를 선택하세요
                          </span>
                        </Space>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                {/* 컨테이너 선택 UI - '선택한 컨테이너만' 선택 시 표시 */}
                {restoreScope === 'selected' && (
                  <Form.Item label='복구할 컨테이너 선택'>
                    <div
                      style={{
                        maxHeight: 200,
                        overflowY: 'auto',
                        border: '1px solid #d9d9d9',
                        borderRadius: 6,
                        padding: 8,
                      }}
                    >
                      <Checkbox.Group
                        value={selectedContainers}
                        onChange={checkedValues =>
                          setSelectedContainers(checkedValues)
                        }
                        style={{ width: '100%' }}
                      >
                        <Space direction='vertical' style={{ width: '100%' }}>
                          {dockerBackupDetail.containers.map(containerName => (
                            <Checkbox
                              key={containerName}
                              value={containerName}
                              style={{ width: '100%' }}
                            >
                              <Space size={4}>
                                <Tag color='blue'>컨테이너</Tag>
                                <strong>{containerName}</strong>
                              </Space>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                      {selectedContainers.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid #f0f0f0',
                          }}
                        >
                          <Tag color='green'>
                            {selectedContainers.length}개 선택됨
                          </Tag>
                        </div>
                      )}
                    </div>
                  </Form.Item>
                )}
              </>
            ) : (
              <Alert
                message='백업된 컨테이너 정보 없음'
                description='이 백업에는 개별 컨테이너 정보가 없습니다. 전체 백업이 복구됩니다.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        {/* K8s 백업만 버전 선택 필요 */}
        {!isDockerInfra && (
          <>
            {/* 스케줄 백업인 경우에만 버전 가져오기 버튼 표시 */}
            {!isImmediateBackup && (
              <Button
                onClick={handleFetchVersions}
                loading={isFetchingVersions}
                style={{ margin: '16px 0' }}
              >
                백업 버전 가져오기
              </Button>
            )}

            <Spin
              spinning={isFetchingVersions}
              tip='버전 목록을 불러오는 중...'
            >
              <Form.Item
                name='backupVersion'
                label='복구할 백업 버전'
                rules={[
                  { required: true, message: '복구할 버전을 선택해주세요.' },
                ]}
                initialValue={
                  isImmediateBackup && backup ? backup.name : undefined
                }
              >
                <Select
                  placeholder={
                    isImmediateBackup
                      ? '백업 버전이 자동 선택되었습니다'
                      : "먼저 '백업 버전 가져오기'를 실행해주세요"
                  }
                  disabled={!isAuthenticated || isImmediateBackup}
                  defaultValue={
                    isImmediateBackup && backup ? backup.name : undefined
                  }
                >
                  {backupVersions.map(v => (
                    <Option key={v.name} value={v.name}>
                      {v.name} (생성: {new Date(v.createdAt).toLocaleString()})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Spin>

            {/* 즉시 백업일 경우 안내 메시지 */}
            {isImmediateBackup && (
              <Alert
                message='즉시 백업'
                description='이 백업은 즉시 백업으로 생성되어 해당 버전으로 바로 복구됩니다.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 다른 네임스페이스 복구 - 고급 옵션으로 분리 */}
            <Divider orientation='left' plain style={{ marginTop: 16 }}>
              <Text type='secondary' style={{ fontSize: 12 }}>
                고급 옵션
              </Text>
            </Divider>
            <Form.Item
              name='isDifferentNamespace'
              valuePropName='checked'
              noStyle
            >
              <Checkbox
                checked={isDifferentNamespace}
                onChange={e => setIsDifferentNamespace(e.target.checked)}
              >
                <Text type='secondary'>
                  다른 네임스페이스에 복구 (테스트/DR용)
                </Text>
              </Checkbox>
            </Form.Item>
            {isDifferentNamespace && (
              <Form.Item
                name='targetNamespace'
                label='새 네임스페이스 이름'
                rules={[
                  {
                    required: true,
                    message: '새 네임스페이스 이름을 입력해주세요.',
                  },
                  {
                    pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
                    message:
                      '소문자, 숫자, 하이픈(-)만 사용 가능하며, 시작과 끝은 영숫자여야 합니다.',
                  },
                ]}
                style={{ marginTop: 16 }}
              >
                <Input placeholder='예: my-restored-app' />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
};

export default RestoreFormModal;
