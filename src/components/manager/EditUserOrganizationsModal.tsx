import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Select,
  Button,
  Space,
  Tag,
  Checkbox,
  Table,
  message,
  Typography,
  Divider,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import organizationApi, {
  type UserWithOrgsDTO,
  type OrganizationDTO,
} from '../../lib/api/endpoints/organization';

const { Text } = Typography;
const { Option } = Select;

// 권한 목록
const PERMISSION_OPTIONS = [
  { value: 'infra', label: '인프라' },
  { value: 'service', label: '서비스' },
  { value: 'backup', label: '백업' },
  { value: 'device', label: '장비' },
  { value: 'database', label: 'DB' },
];

// 역할 목록
const ROLE_OPTIONS = [
  { value: 'Owner', label: '소유자', color: 'gold' },
  { value: 'Manager', label: '관리자', color: 'blue' },
  { value: 'Member', label: '멤버', color: 'default' },
];

interface OrganizationMembership {
  organizationId: number;
  organizationName: string;
  role: 'Owner' | 'Manager' | 'Member';
  permissions: string[];
}

interface EditUserOrganizationsModalProps {
  visible: boolean;
  user: UserWithOrgsDTO | null;
  onCancel: () => void;
  onSave: () => void;
}

export const EditUserOrganizationsModal: React.FC<
  EditUserOrganizationsModalProps
> = ({ visible, user, onCancel, onSave }) => {
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<OrganizationDTO[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  // 모든 기관 목록 로드
  const loadOrganizations = useCallback(async () => {
    try {
      const response = await organizationApi.getAllOrganizations();
      if (response.success && response.data) {
        setAllOrganizations(response.data);
      }
    } catch {
      message.error('기관 목록 로드 실패');
    }
  }, []);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (visible && user) {
      setIsLoading(true);
      // 사용자의 현재 기관 소속 정보를 상태에 복사
      const initialMemberships: OrganizationMembership[] = (
        user.organizations || []
      ).map(org => ({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        role: org.role,
        permissions: org.permissions || [
          'infra',
          'service',
          'backup',
          'device',
        ],
      }));
      setMemberships(initialMemberships);
      void loadOrganizations();
      setIsLoading(false);
      setShowAddOrg(false);
      setSelectedOrgId(null);
    }
  }, [visible, user, loadOrganizations]);

  // 저장
  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const organizations = memberships.map(m => ({
        organizationId: m.organizationId,
        role: m.role,
        permissions: m.permissions,
      }));

      const response = await organizationApi.updateUserOrganizations(
        user.id,
        organizations
      );
      if (response.success) {
        message.success('사용자 기관 소속이 업데이트되었습니다.');
        onSave();
      } else {
        message.error(response.error || '업데이트 실패');
      }
    } catch {
      message.error('업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 기관 추가
  const handleAddOrganization = () => {
    if (!selectedOrgId) return;

    // 이미 소속된 기관인지 확인
    if (memberships.some(m => m.organizationId === selectedOrgId)) {
      message.warning('이미 소속된 기관입니다.');
      return;
    }

    const org = allOrganizations.find(o => o.id === selectedOrgId);
    if (!org) return;

    setMemberships([
      ...memberships,
      {
        organizationId: org.id,
        organizationName: org.name,
        role: 'Member',
        permissions: ['infra', 'service', 'backup', 'device'],
      },
    ]);
    setShowAddOrg(false);
    setSelectedOrgId(null);
  };

  // 기관에서 제거
  const handleRemoveOrganization = (organizationId: number) => {
    setMemberships(
      memberships.filter(m => m.organizationId !== organizationId)
    );
  };

  // 역할 변경
  const handleRoleChange = (
    organizationId: number,
    role: 'Owner' | 'Manager' | 'Member'
  ) => {
    setMemberships(
      memberships.map(m =>
        m.organizationId === organizationId ? { ...m, role } : m
      )
    );
  };

  // 권한 변경
  const handlePermissionsChange = (
    organizationId: number,
    permissions: string[]
  ) => {
    setMemberships(
      memberships.map(m =>
        m.organizationId === organizationId ? { ...m, permissions } : m
      )
    );
  };

  // 소속되지 않은 기관 목록
  const availableOrganizations = allOrganizations.filter(
    org => !memberships.some(m => m.organizationId === org.id)
  );

  // 테이블 컬럼
  const columns: ColumnsType<OrganizationMembership> = [
    {
      title: '기관명',
      dataIndex: 'organizationName',
      key: 'organizationName',
      width: 150,
      render: (name: string) => (
        <Space>
          <ApartmentOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string, record: OrganizationMembership) => (
        <Select
          value={role}
          onChange={value =>
            handleRoleChange(
              record.organizationId,
              value as 'Owner' | 'Manager' | 'Member'
            )
          }
          style={{ width: 100 }}
          size='small'
        >
          {ROLE_OPTIONS.map(opt => (
            <Option key={opt.value} value={opt.value}>
              <Tag color={opt.color} style={{ margin: 0 }}>
                {opt.label}
              </Tag>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '시스템 권한',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[], record: OrganizationMembership) => {
        // Owner/Manager는 전체 권한
        if (record.role === 'Owner' || record.role === 'Manager') {
          return (
            <Tag
              color='gold'
              style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}
            >
              전체 권한
            </Tag>
          );
        }
        return (
          <Checkbox.Group
            options={PERMISSION_OPTIONS}
            value={permissions}
            onChange={values =>
              handlePermissionsChange(record.organizationId, values)
            }
            style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
          />
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: OrganizationMembership) => (
        <Popconfirm
          title='이 기관에서 사용자를 제거하시겠습니까?'
          onConfirm={() => handleRemoveOrganization(record.organizationId)}
          okText='제거'
          cancelText='취소'
          okButtonProps={{ danger: true }}
        >
          <Button type='text' danger icon={<DeleteOutlined />} size='small' />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ApartmentOutlined />
          <span>사용자 기관 관리</span>
          {user && <Tag color='blue'>{user.email}</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='save'
          type='primary'
          loading={isSaving}
          onClick={handleSave}
        >
          저장
        </Button>,
      ]}
    >
      {/* 기관 추가 영역 */}
      <div style={{ marginBottom: 16 }}>
        {showAddOrg ? (
          <Space>
            <Select
              placeholder='기관 선택'
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              style={{ width: 200 }}
              showSearch
              optionFilterProp='children'
            >
              {availableOrganizations.map(org => (
                <Option key={org.id} value={org.id}>
                  {org.name}
                </Option>
              ))}
            </Select>
            <Button
              type='primary'
              onClick={handleAddOrganization}
              disabled={!selectedOrgId}
            >
              추가
            </Button>
            <Button
              onClick={() => {
                setShowAddOrg(false);
                setSelectedOrgId(null);
              }}
            >
              취소
            </Button>
          </Space>
        ) : (
          <Button
            type='dashed'
            icon={<PlusOutlined />}
            onClick={() => setShowAddOrg(true)}
            disabled={availableOrganizations.length === 0}
          >
            기관 추가
          </Button>
        )}
        {availableOrganizations.length === 0 && !showAddOrg && (
          <Text type='secondary' style={{ marginLeft: 8 }}>
            (추가 가능한 기관이 없습니다)
          </Text>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 소속 기관 테이블 */}
      <Table
        columns={columns}
        dataSource={memberships}
        rowKey='organizationId'
        loading={isLoading}
        pagination={false}
        size='small'
        locale={{ emptyText: '소속된 기관이 없습니다.' }}
      />

      {memberships.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
          사용자가 어떤 기관에도 소속되어 있지 않습니다.
          <br />
          위의 &quot;기관 추가&quot; 버튼을 클릭하여 기관을 추가하세요.
        </div>
      )}
    </Modal>
  );
};

export default EditUserOrganizationsModal;
