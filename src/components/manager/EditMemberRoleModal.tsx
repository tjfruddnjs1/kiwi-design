/**
 * EditMemberRoleModal
 * 멤버 역할 및 권한 수정 모달
 *
 * Features:
 * - 기관 내 역할 선택 (Owner, Manager, Member)
 * - 기본 권한 모드: 간단한 체크박스 (infra, service, backup 등)
 * - 세분화 권한 모드: 상세한 권한 선택 UI
 * - 모드 전환 토글
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Checkbox,
  Space,
  Alert,
  Switch,
  Typography,
  Divider,
  Tooltip,
  Badge,
} from 'antd';
import {
  InfoCircleOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { OrganizationMemberDTO } from '../../lib/api/endpoints/organization';
import { GranularPermissionSelector } from './GranularPermissionSelector';

const { Option } = Select;
const { Text } = Typography;

interface EditMemberRoleModalProps {
  visible: boolean;
  member: OrganizationMemberDTO | null;
  onCancel: () => void;
  onSave: (
    role: 'Owner' | 'Manager' | 'Member',
    permissions: string[]
  ) => Promise<void>;
}

// 기본 권한 목록 (간단 모드용) - 실제 시스템 메뉴 기반 5개 카테고리
const BASIC_PERMISSIONS = [
  {
    value: 'service',
    label: '서비스 관리',
    description: 'Git 저장소, 빌드/배포, 보안스캔(SAST/SCA/DAST/SBOM), 운영',
    color: '#52c41a',
  },
  {
    value: 'infra',
    label: '런타임 환경',
    description: 'Kubernetes, Docker/Podman 클러스터 및 컨테이너 관리',
    color: '#1890ff',
  },
  {
    value: 'backup',
    label: '백업 관리',
    description: '백업 생성/복구/다운로드, 스토리지 관리',
    color: '#722ed1',
  },
  {
    value: 'device',
    label: '장비 관리',
    description: '장비 등록/수정/삭제',
    color: '#eb2f96',
  },
  {
    value: 'database',
    label: '데이터베이스 관리',
    description: 'DB 연결, 동기화, 마이그레이션',
    color: '#13c2c2',
  },
];

// 기본 권한 -> 세분화 권한 매핑 (실제 시스템 기능 기반)
const BASIC_TO_GRANULAR_MAP: Record<string, string[]> = {
  service: [
    // 기본 CRUD
    'service:view', 'service:create', 'service:update',
    // 빌드/배포
    'service:build:view', 'service:build:execute',
    'service:deploy:view', 'service:deploy:execute',
    // 운영
    'service:operate:view', 'service:operate:restart', 'service:operate:logs',
    // 보안 스캔 (SAST/SCA/DAST/SBOM 통합)
    'service:security:view', 'service:security:execute',
  ],
  infra: [
    // 기본 CRUD
    'infra:view', 'infra:create', 'infra:update',
    // K8s
    'infra:k8s:view', 'infra:k8s:manage',
    // Docker/Podman
    'infra:docker:view', 'infra:docker:manage',
  ],
  backup: [
    // 백업 작업
    'backup:view', 'backup:create', 'backup:download',
    // 스토리지
    'backup:storage:view', 'backup:storage:manage',
  ],
  device: [
    'device:view', 'device:create', 'device:update',
  ],
  database: [
    // DB 연결
    'database:view', 'database:create', 'database:update', 'database:test',
    // 동기화
    'database:sync:view', 'database:sync:execute',
  ],
};

// 세분화 권한 -> 기본 권한 역매핑
const getBasicFromGranular = (granularPermissions: string[]): string[] => {
  const basicPerms = new Set<string>();

  granularPermissions.forEach((perm) => {
    // 권한 코드의 첫 번째 부분(카테고리)을 추출
    const category = perm.split(':')[0];
    // 해당 카테고리가 BASIC_TO_GRANULAR_MAP에 있으면 추가
    if (BASIC_TO_GRANULAR_MAP[category]) {
      basicPerms.add(category);
    }
  });

  return Array.from(basicPerms);
};

export const EditMemberRoleModal: React.FC<EditMemberRoleModalProps> = ({
  visible,
  member,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('Member');
  const [useGranularMode, setUseGranularMode] = useState(false);
  const [granularPermissions, setGranularPermissions] = useState<string[]>([]);
  const [basicPermissions, setBasicPermissions] = useState<string[]>([]);

  // 멤버 정보가 변경되면 폼 초기화
  useEffect(() => {
    if (member && visible) {
      const role = member.organizationRole || 'Member';
      const perms = member.permissions || ['infra', 'service', 'backup', 'device'];

      form.setFieldsValue({
        role: role,
        permissions: perms,
      });
      setSelectedRole(role);
      setBasicPermissions(perms);

      // 기존 권한이 세분화 권한인지 확인
      const isGranular = perms.some((p) => p.includes(':'));
      setUseGranularMode(isGranular);

      if (isGranular) {
        setGranularPermissions(perms);
      } else {
        // 기본 권한을 세분화 권한으로 확장
        const expanded = perms.flatMap((p) => BASIC_TO_GRANULAR_MAP[p] || []);
        setGranularPermissions(expanded);
      }
    }
  }, [member, visible, form]);

  // 기본 권한 변경 시 세분화 권한도 업데이트
  const handleBasicPermissionChange = (checkedValues: string[]) => {
    setBasicPermissions(checkedValues);
    const expanded = checkedValues.flatMap((p) => BASIC_TO_GRANULAR_MAP[p] || []);
    setGranularPermissions(expanded);
    form.setFieldsValue({ permissions: checkedValues });
  };

  // 세분화 권한 변경 핸들러
  const handleGranularPermissionChange = (permissions: string[]) => {
    setGranularPermissions(permissions);
    // 기본 권한도 업데이트 (UI 동기화용)
    const basicFromGranular = getBasicFromGranular(permissions);
    setBasicPermissions(basicFromGranular);
  };

  // 모드 전환 핸들러
  const handleModeChange = (checked: boolean) => {
    setUseGranularMode(checked);
    if (!checked) {
      // 세분화 -> 기본 모드로 전환 시, 기본 권한 기준으로 다시 확장
      const expanded = basicPermissions.flatMap((p) => BASIC_TO_GRANULAR_MAP[p] || []);
      setGranularPermissions(expanded);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 세분화 모드면 세분화 권한, 아니면 기본 권한 전송
      const finalPermissions = useGranularMode ? granularPermissions : basicPermissions;

      await onSave(values.role, finalPermissions);
      form.resetFields();
      setLoading(false);
      setUseGranularMode(false);
    } catch {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setUseGranularMode(false);
    onCancel();
  };

  const isOwner = member?.organizationRole === 'Owner';
  const isOwnerOrManager = selectedRole === 'Owner' || selectedRole === 'Manager';

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>멤버 역할 및 권한 수정</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="저장"
      cancelText="취소"
      width={useGranularMode ? 800 : 600}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      {member && (
        <>
          <Alert
            message={`${member.email}님의 역할과 권한을 수정합니다.`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              role: 'Member',
              permissions: ['infra', 'service', 'backup', 'device'],
            }}
          >
            {/* 역할 선택 */}
            <Form.Item
              name="role"
              label="기관 내 역할"
              rules={[{ required: true, message: '역할을 선택해주세요' }]}
            >
              <Select
                placeholder="역할 선택"
                onChange={(value) => setSelectedRole(value)}
                disabled={isOwner}
              >
                <Option value="Owner">
                  <Space>
                    <Badge color="gold" />
                    시스템 관리자 (Owner)
                  </Space>
                </Option>
                <Option value="Manager">
                  <Space>
                    <Badge color="blue" />
                    기관 관리자 (Manager)
                  </Space>
                </Option>
                <Option value="Member">
                  <Space>
                    <Badge color="default" />
                    멤버 (Member)
                  </Space>
                </Option>
              </Select>
            </Form.Item>

            {isOwner && (
              <Alert
                message="시스템 관리자의 역할은 변경할 수 없습니다."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Owner/Manager는 자동 전체 권한 */}
            {isOwnerOrManager ? (
              <Alert
                message={`${selectedRole === 'Owner' ? '시스템 관리자' : '기관 관리자'}는 모든 권한을 자동으로 보유합니다.`}
                description="별도의 권한 설정이 필요하지 않습니다."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            ) : (
              <>
                <Divider style={{ margin: '16px 0' }} />

                {/* 권한 모드 전환 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    padding: '8px 12px',
                    backgroundColor: '#fafafa',
                    borderRadius: 8,
                  }}
                >
                  <Space>
                    {useGranularMode ? <SettingOutlined /> : <UnorderedListOutlined />}
                    <Text strong>
                      {useGranularMode ? '세분화된 권한 설정' : '기본 권한 설정'}
                    </Text>
                    <Tooltip title="세분화 모드에서는 개별 기능 단위로 권한을 설정할 수 있습니다.">
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </Space>
                  <Switch
                    checked={useGranularMode}
                    onChange={handleModeChange}
                    checkedChildren="상세"
                    unCheckedChildren="기본"
                  />
                </div>

                {/* 기본 권한 모드 */}
                {!useGranularMode && (
                  <Form.Item
                    name="permissions"
                    label="시스템 권한"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value || value.length === 0) {
                            return Promise.reject(
                              new Error('최소 1개 이상의 권한을 선택해주세요')
                            );
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Checkbox.Group
                      style={{ width: '100%' }}
                      value={basicPermissions}
                      onChange={(values) => handleBasicPermissionChange(values as string[])}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {BASIC_PERMISSIONS.map((perm) => (
                          <div
                            key={perm.value}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: basicPermissions.includes(perm.value)
                                ? `1px solid ${perm.color}40`
                                : '1px solid #f0f0f0',
                              backgroundColor: basicPermissions.includes(perm.value)
                                ? `${perm.color}08`
                                : 'transparent',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Checkbox value={perm.value}>
                              <Space>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: perm.color,
                                  }}
                                />
                                <Text strong>{perm.label}</Text>
                              </Space>
                            </Checkbox>
                            <Text
                              type="secondary"
                              style={{
                                display: 'block',
                                marginLeft: 32,
                                fontSize: 12,
                              }}
                            >
                              {perm.description}
                            </Text>
                          </div>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </Form.Item>
                )}

                {/* 세분화 권한 모드 */}
                {useGranularMode && (
                  <GranularPermissionSelector
                    value={granularPermissions}
                    onChange={handleGranularPermissionChange}
                    showPresets={true}
                    showSearch={true}
                    maxHeight={400}
                    compactMode={false}
                  />
                )}
              </>
            )}
          </Form>
        </>
      )}
    </Modal>
  );
};

export default EditMemberRoleModal;
