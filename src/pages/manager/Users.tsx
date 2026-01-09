import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  Row,
  Col,
  Table,
  Tag,
  Tooltip,
  Popconfirm,
  Result,
  message,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  StopOutlined,
  EditOutlined,
  TeamOutlined,
  CrownOutlined,
  SafetyOutlined,
  GlobalOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './Users.css';
import { useOrganizationMembers } from '../../hooks/useOrganizationMembers';
import { InviteUserModal } from '../../components/manager/InviteUserModal';
import { EditMemberRoleModal } from '../../components/manager/EditMemberRoleModal';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import organizationApi, {
  type OrganizationMemberDTO,
  type UserWithOrgsDTO,
} from '../../lib/api/endpoints/organization';
import { EditUserOrganizationsModal } from '../../components/manager/EditUserOrganizationsModal';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

/**
 * 소속 사용자 관리 페이지
 * Owner 또는 Manager 권한을 가진 사용자만 접근 가능합니다.
 */
const Users: React.FC = () => {
  const { user } = useAuth();

  // 헤더에서 선택된 기관 컨텍스트 사용
  const {
    selectedOrganization,
    selectedOrgId,
    isLoading: isLoadingOrgs,
  } = useOrganization();

  // 모든 훅은 조건문 전에 호출되어야 함 (React 훅 규칙)
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isEditRoleModalVisible, setIsEditRoleModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<OrganizationMemberDTO | null>(null);

  // Owner 전용: 전체 사용자 조회 상태
  const [allUsers, setAllUsers] = useState<UserWithOrgsDTO[]>([]);
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false);
  // viewMode는 Owner가 "전체 사용자" 버튼 클릭 시에만 'all'로 전환
  const [viewMode, setViewMode] = useState<'organization' | 'all'>(
    'organization'
  );

  // Owner 전용: 사용자 기관 관리 모달 상태
  const [isEditOrgsModalVisible, setIsEditOrgsModalVisible] = useState(false);
  const [selectedUserForOrgs, setSelectedUserForOrgs] =
    useState<UserWithOrgsDTO | null>(null);

  const {
    members,
    isLoading: isLoadingMembers,
    loadMembers,
    inviteMember,
    removeMember,
  } = useOrganizationMembers(
    viewMode === 'organization' ? selectedOrgId : null
  );

  // Owner 전용: 전체 사용자 로드
  const loadAllUsers = useCallback(async () => {
    if (user?.role !== 'Owner') return;

    setIsLoadingAllUsers(true);
    try {
      const response = await organizationApi.getAllUsersForOwner();
      if (response.success && response.data) {
        setAllUsers(response.data);
      } else {
        message.error('전체 사용자 목록 로드 실패');
      }
    } catch {
      message.error('전체 사용자 목록 로드 중 오류 발생');
    } finally {
      setIsLoadingAllUsers(false);
    }
  }, [user?.role]);

  // viewMode가 'all'로 변경되면 전체 사용자 로드
  useEffect(() => {
    if (viewMode === 'all') {
      loadAllUsers();
    }
  }, [viewMode, loadAllUsers]);

  // 헤더에서 기관이 변경되면 organization 모드로 전환
  useEffect(() => {
    if (selectedOrgId && viewMode === 'all') {
      // 기관이 선택되면 organization 모드로 자동 전환
    }
  }, [selectedOrgId, viewMode]);

  // 권한 검사: Owner 또는 Manager만 접근 가능 (organization_members 테이블의 role 기준)
  if (!user || (user.role !== 'Owner' && user.role !== 'Manager')) {
    return (
      <div className='users-management management-page'>
        <Result
          status='403'
          icon={<StopOutlined />}
          title='접근 권한이 없습니다'
          subTitle='이 페이지는 Owner 또는 Manager 권한을 가진 사용자만 접근할 수 있습니다.'
        />
      </div>
    );
  }

  /**
   * 사용자 초대 핸들러
   */
  const handleInviteUser = async (email: string): Promise<boolean> => {
    const success = await inviteMember(email);
    if (success) {
      setIsInviteModalVisible(false);
    }
    return success;
  };

  /**
   * 사용자 제거 핸들러
   */
  const handleRemoveMember = async (memberId: number, memberName: string) => {
    await removeMember(memberId, memberName);
  };

  /**
   * 역할/권한 수정 모달 열기
   */
  const handleEditRole = (member: OrganizationMemberDTO) => {
    setSelectedMember(member);
    setIsEditRoleModalVisible(true);
  };

  /**
   * 역할/권한 저장 핸들러
   */
  const handleSaveRole = async (
    role: 'Owner' | 'Manager' | 'Member',
    permissions: string[]
  ) => {
    if (!selectedMember || !selectedOrgId) return;

    try {
      await organizationApi.updateMemberRole(
        selectedOrgId,
        selectedMember.id,
        role,
        permissions
      );
      message.success('멤버 역할 및 권한이 업데이트되었습니다.');
      setIsEditRoleModalVisible(false);
      setSelectedMember(null);
      loadMembers(); // 목록 새로고침
    } catch {
      message.error('역할 업데이트에 실패했습니다.');
    }
  };

  /**
   * 테이블 컬럼 정의
   */
  const columns: ColumnsType<OrganizationMemberDTO> = [
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (email: string) => <Text strong>{email}</Text>,
    },
    {
      title: '역할',
      dataIndex: 'organizationRole',
      key: 'organizationRole',
      width: 80,
      align: 'center',
      render: (orgRole?: string) => {
        if (!orgRole) return <Tag>멤버</Tag>;
        const roleColors: Record<string, string> = {
          Owner: 'gold',
          Manager: 'blue',
          Member: 'default',
        };
        const roleLabels: Record<string, string> = {
          Owner: '소유자',
          Manager: '관리자',
          Member: '멤버',
        };
        return (
          <Tag color={roleColors[orgRole] || 'default'} style={{ margin: 0 }}>
            {roleLabels[orgRole] || orgRole}
          </Tag>
        );
      },
    },
    {
      title: '시스템 권한',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 320,
      render: (permissions?: string[], record?: OrganizationMemberDTO) => {
        // Owner/Manager는 모든 권한 보유
        if (
          record?.organizationRole === 'Owner' ||
          record?.organizationRole === 'Manager'
        ) {
          return (
            <Tooltip title="관리자는 모든 기능에 접근할 수 있습니다">
              <Tag
                icon={<CrownOutlined />}
                color='gold'
                style={{
                  borderRadius: 12,
                  padding: '2px 12px',
                  fontWeight: 500,
                }}
              >
                전체 권한
              </Tag>
            </Tooltip>
          );
        }

        if (!permissions || permissions.length === 0) {
          return (
            <Tooltip title="권한이 할당되지 않았습니다. 관리자에게 문의하세요.">
              <Tag
                icon={<StopOutlined />}
                color='default'
                style={{ borderRadius: 12, padding: '2px 10px' }}
              >
                권한 없음
              </Tag>
            </Tooltip>
          );
        }

        // 권한 매핑 정의 (아이콘 및 설명 추가)
        const permissionConfig: Record<
          string,
          { label: string; color: string; description: string }
        > = {
          infra: { label: '런타임', color: '#1890ff', description: 'K8s, Docker/Podman' },
          service: { label: '서비스', color: '#52c41a', description: 'Git, 빌드/배포, 보안스캔' },
          backup: { label: '백업', color: '#fa8c16', description: '백업/복구, 스토리지' },
          device: { label: '장비', color: '#722ed1', description: '장비 관리' },
          database: { label: 'DB', color: '#13c2c2', description: 'DB연결, 동기화' },
        };

        // 기본 권한만 표시 (단순 형태: infra, service 등)
        const corePermissions = [
          'infra',
          'service',
          'backup',
          'device',
          'database',
        ];
        const basicPerms = permissions.filter(p => corePermissions.includes(p));

        // 세분화 권한이 있는 경우 카테고리 추출
        const granularPerms = permissions.filter(p => p.includes(':'));
        const granularCategories = new Set(
          granularPerms.map(p => p.split(':')[0])
        );

        // 기본 권한과 세분화 권한 카테고리 합침
        const allCategories = new Set([
          ...basicPerms,
          ...Array.from(granularCategories),
        ]);

        if (allCategories.size === 0) {
          return (
            <Tooltip title="권한이 할당되지 않았습니다">
              <Tag
                color='default'
                style={{ borderRadius: 12, padding: '2px 10px' }}
              >
                권한 없음
              </Tag>
            </Tooltip>
          );
        }

        // 세분화 권한 상세 정보 생성
        const getDetailedTooltip = (category: string) => {
          const categoryPerms = granularPerms.filter(p => p.startsWith(category + ':'));
          if (categoryPerms.length === 0) {
            return permissionConfig[category]?.description || '전체 접근';
          }
          const actions = categoryPerms.map(p => {
            const parts = p.split(':');
            return parts[parts.length - 1];
          });
          const actionLabels: Record<string, string> = {
            view: '조회', create: '생성', update: '수정', delete: '삭제',
            execute: '실행', manage: '관리', restart: '재시작', logs: '로그',
          };
          return actions.map(a => actionLabels[a] || a).join(', ');
        };

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Array.from(allCategories).map(perm => {
              const config = permissionConfig[perm];
              const hasGranular = granularCategories.has(perm);
              const tooltipContent = getDetailedTooltip(perm);

              return (
                <Tooltip key={perm} title={tooltipContent}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 500,
                      backgroundColor: config?.color + '15',
                      color: config?.color,
                      border: `1px solid ${config?.color}40`,
                      cursor: 'help',
                    }}
                  >
                    {config?.label || perm}
                    {hasGranular && (
                      <span style={{
                        fontSize: 9,
                        opacity: 0.7,
                        marginLeft: 2,
                      }}>
                        ✓
                      </span>
                    )}
                  </span>
                </Tooltip>
              );
            })}
          </div>
        );
      },
    },
    {
      title: '가입일',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      width: 90,
      align: 'center',
      render: (date?: string) => (date ? dayjs(date).format('YY.MM.DD') : '-'),
      sorter: (a: OrganizationMemberDTO, b: OrganizationMemberDTO) => {
        if (!a.joinedAt || !b.joinedAt) return 0;
        return dayjs(a.joinedAt).valueOf() - dayjs(b.joinedAt).valueOf();
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_: unknown, record: OrganizationMemberDTO) => {
        // 자기 자신이거나 기관 소유자는 내보낼 수 없음
        const isCurrentUser = user && record.id === user.id;
        const isOwner = record.organizationRole === 'Owner';

        return (
          <Space size='small'>
            {!isCurrentUser && (
              <Tooltip title='역할 및 권한 수정'>
                <Button
                  size='small'
                  icon={<EditOutlined />}
                  onClick={() => handleEditRole(record)}
                />
              </Tooltip>
            )}
            {isCurrentUser ? (
              <Tag color='volcano'>본인</Tag>
            ) : isOwner ? (
              <Tag color='gold'>소유자</Tag>
            ) : (
              <Tooltip title='기관에서 내보내기'>
                <Popconfirm
                  title={`'${record.name}'님을 기관에서 내보내시겠습니까?`}
                  description='내보내면 이 기관의 리소스에 접근할 수 없게 됩니다.'
                  onConfirm={() => handleRemoveMember(record.id, record.name)}
                  okText='내보내기'
                  cancelText='취소'
                  okButtonProps={{ danger: true }}
                >
                  <Button size='small' danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  /**
   * 사용자 기관 관리 모달 열기 (Owner 전용)
   */
  const handleEditUserOrgs = (userRecord: UserWithOrgsDTO) => {
    setSelectedUserForOrgs(userRecord);
    setIsEditOrgsModalVisible(true);
  };

  /**
   * 사용자 기관 관리 저장 완료 핸들러
   */
  const handleEditOrgsComplete = () => {
    setIsEditOrgsModalVisible(false);
    setSelectedUserForOrgs(null);
    loadAllUsers(); // 목록 새로고침
  };

  // 전체 사용자 테이블 컬럼 (Owner 전용)
  const allUsersColumns: ColumnsType<UserWithOrgsDTO> = [
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (email: string) => <Text strong>{email}</Text>,
    },
    {
      title: '소속 기관',
      dataIndex: 'organizations',
      key: 'organizations',
      width: 350,
      render: (orgs: UserWithOrgsDTO['organizations']) => {
        if (!orgs || orgs.length === 0) {
          return <Tag color='default'>미소속</Tag>;
        }
        const roleColors: Record<string, string> = {
          Owner: 'gold',
          Manager: 'blue',
          Member: 'default',
        };
        const roleLabels: Record<string, string> = {
          Owner: '소유자',
          Manager: '관리자',
          Member: '멤버',
        };
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {orgs.map((org, idx) => (
              <Tooltip key={idx} title={`${roleLabels[org.role] || org.role}`}>
                <Tag
                  color={roleColors[org.role] || 'default'}
                  style={{ margin: 0 }}
                >
                  {org.organizationName}
                </Tag>
              </Tooltip>
            ))}
          </div>
        );
      },
    },
    {
      title: '가입일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 90,
      align: 'center',
      render: (date?: string) => (date ? dayjs(date).format('YY.MM.DD') : '-'),
      sorter: (a: UserWithOrgsDTO, b: UserWithOrgsDTO) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
      },
    },
    {
      title: '관리',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_: unknown, record: UserWithOrgsDTO) => (
        <Tooltip title='기관 및 권한 관리'>
          <Button
            size='small'
            icon={<EditOutlined />}
            onClick={() => handleEditUserOrgs(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // 통계 계산 (viewMode에 따라 다르게 계산)
  const totalCount = viewMode === 'all' ? allUsers.length : members.length;
  const ownerCount =
    viewMode === 'all'
      ? allUsers.filter(u => u.organizations?.some(o => o.role === 'Owner'))
          .length
      : members.filter(m => m.organizationRole === 'Owner').length;
  const managerCount =
    viewMode === 'all'
      ? allUsers.filter(u => u.organizations?.some(o => o.role === 'Manager'))
          .length
      : members.filter(m => m.organizationRole === 'Manager').length;
  const memberCount =
    viewMode === 'all'
      ? allUsers.filter(
          u =>
            !u.organizations?.length ||
            u.organizations.every(o => o.role === 'Member')
        ).length
      : members.filter(
          m => !m.organizationRole || m.organizationRole === 'Member'
        ).length;

  // 현재 로딩 상태
  const isCurrentlyLoading =
    viewMode === 'all' ? isLoadingAllUsers : isLoadingMembers;

  // 새로고침 핸들러
  const handleRefresh = () => {
    if (viewMode === 'all') {
      loadAllUsers();
    } else {
      loadMembers();
    }
  };

  return (
    <div className='users-management management-page'>
      {/* 페이지 헤더 */}
      <Card className='page-header-card'>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space align='center'>
            <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              사용자 관리
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isCurrentlyLoading}
            disabled={viewMode === 'organization' && !selectedOrgId}
          >
            새로고침
          </Button>
        </div>
      </Card>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className='stat-row' style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size='small'>
            <Statistic
              title='전체 사용자'
              value={totalCount}
              suffix='명'
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size='small'>
            <Statistic
              title='관리자'
              value={ownerCount + managerCount}
              suffix={`/ ${totalCount}`}
              prefix={<CrownOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size='small'>
            <Statistic
              title='일반 멤버'
              value={memberCount}
              suffix='명'
              prefix={<SafetyOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 액션 버튼 */}
      <Card
        size='small'
        className='org-select-card'
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 12]} align='middle' justify='space-between'>
          <Col>
            <Space>
              {/* 현재 선택된 기관 표시 (헤더에서 선택) */}
              {isLoadingOrgs ? (
                <Text type='secondary'>기관 로딩 중...</Text>
              ) : selectedOrganization ? (
                <Text>
                  <GlobalOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  <Text strong>{selectedOrganization.name}</Text> 소속 사용자 관리
                </Text>
              ) : (
                <Text type='secondary'>헤더에서 기관을 선택해주세요</Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {/* Owner 전용: 전체 사용자 보기 토글 */}
              {user?.role === 'Owner' && (
                <Button
                  type={viewMode === 'all' ? 'primary' : 'default'}
                  icon={<GlobalOutlined />}
                  onClick={() => setViewMode(viewMode === 'all' ? 'organization' : 'all')}
                >
                  {viewMode === 'all' ? '기관별 보기' : '전체 사용자'}
                </Button>
              )}
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => setIsInviteModalVisible(true)}
                disabled={viewMode === 'all' || !selectedOrgId}
              >
                사용자 초대
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 사용자 목록 테이블 */}
      <Card
        title={
          <Space>
            {viewMode === 'all' ? <GlobalOutlined /> : <ApartmentOutlined />}
            <Title level={4} style={{ margin: 0 }}>
              {viewMode === 'all'
                ? `전체 사용자 (${allUsers.length}명)`
                : `${selectedOrganization?.name || '기관을 선택하세요'} 소속 사용자 (${members.length}명)`}
            </Title>
          </Space>
        }
      >
        {viewMode === 'all' ? (
          // 전체 사용자 모드 (Owner 전용)
          <Table
            columns={allUsersColumns}
            dataSource={allUsers}
            rowKey='id'
            loading={isLoadingAllUsers}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
          />
        ) : !selectedOrgId ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Text type='secondary'>관리할 기관을 먼저 선택해주세요.</Text>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={members}
            rowKey='id'
            loading={isLoadingMembers}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
          />
        )}
      </Card>

      {/* 사용자 초대 모달 */}
      <InviteUserModal
        visible={isInviteModalVisible}
        onCancel={() => setIsInviteModalVisible(false)}
        onInvite={handleInviteUser}
      />

      {/* 역할 및 권한 수정 모달 */}
      <EditMemberRoleModal
        visible={isEditRoleModalVisible}
        member={selectedMember}
        onCancel={() => {
          setIsEditRoleModalVisible(false);
          setSelectedMember(null);
        }}
        onSave={handleSaveRole}
      />

      {/* Owner 전용: 사용자 기관 관리 모달 */}
      <EditUserOrganizationsModal
        visible={isEditOrgsModalVisible}
        user={selectedUserForOrgs}
        onCancel={() => {
          setIsEditOrgsModalVisible(false);
          setSelectedUserForOrgs(null);
        }}
        onSave={handleEditOrgsComplete}
      />
    </div>
  );
};

export default Users;
