/**
 * Permission Management Page
 * 권한 관리 페이지 - 사용자별 권한 부여/회수
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tabs,
  Tag,
  Button,
  Modal,
  Select,
  Space,
  message,
  Spin,
  Typography,
  Input,
  Collapse,
  Checkbox,
  Divider,
  Badge,
  Alert,
  List,
  Empty,
} from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usePermission } from '../../context/PermissionContext';
import { permissionApi } from '../../lib/api/permission';
import { getUsers, UserDTO } from '../../lib/api/user';
import {
  PermissionDefinition,
  GroupedPermissions,
  CATEGORY_NAMES,
  RISK_LEVEL_NAMES,
  RISK_LEVEL_COLORS,
  PermissionCategory,
  RiskLevel,
} from '../../types/permission';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { confirm } = Modal;

// 사용자 권한 정보
interface UserPermissionInfo {
  code: string;
  name_ko: string;
  category: string;
  granted_at?: string;
  granted_by?: number;
}

const PermissionManagement: React.FC = () => {
  const { isOwnerOrManager } = usePermission();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('permissions');

  // 권한 정의 목록
  const [allPermissions, setAllPermissions] = useState<PermissionDefinition[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});

  // 사용자 목록
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissionInfo[]>([]);
  const [loadingUserPermissions, setLoadingUserPermissions] = useState(false);

  // 모달 상태
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // 검색
  const [searchText, setSearchText] = useState('');

  // 권한 목록 로드
  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await permissionApi.getAllPermissions();
      if (response.success && response.data) {
        setAllPermissions(response.data.permissions || []);
        setGroupedPermissions(response.data.grouped || {});
      }
    } catch {
      message.error('권한 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      const userList = await getUsers();
      setUsers(userList);
    } catch {
      message.error('사용자 목록을 불러오는데 실패했습니다.');
    }
  }, []);

  // 사용자 권한 로드
  const loadUserPermissions = useCallback(async (userId: number) => {
    setLoadingUserPermissions(true);
    try {
      const response = await permissionApi.getUserPermissions(userId);
      if (response.success && response.data) {
        setUserPermissions(response.data);
      } else {
        setUserPermissions([]);
      }
    } catch {
      message.error('사용자 권한을 불러오는데 실패했습니다.');
      setUserPermissions([]);
    } finally {
      setLoadingUserPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (isOwnerOrManager) {
      loadPermissions();
      loadUsers();
    }
  }, [isOwnerOrManager, loadPermissions, loadUsers]);

  // 사용자 선택 시 권한 로드
  const handleUserSelect = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    setSelectedUser(user || null);
    if (user) {
      loadUserPermissions(user.id);
    } else {
      setUserPermissions([]);
    }
  };

  // 권한 부여
  const handleGrantPermission = async () => {
    if (!selectedUser || selectedPermissions.length === 0) {
      message.warning('사용자와 권한을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      for (const permissionId of selectedPermissions) {
        const result = await permissionApi.grantUserPermission(selectedUser.id, {
          permission_id: permissionId,
          organization_id: selectedUser.organization_id || 0,
          reason: '관리자에 의한 권한 부여',
        });
        if (result.success) {
          successCount++;
        }
      }
      message.success(`${successCount}개의 권한이 부여되었습니다.`);
      setGrantModalVisible(false);
      setSelectedPermissions([]);
      // 권한 목록 새로고침
      loadUserPermissions(selectedUser.id);
    } catch {
      message.error('권한 부여에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 권한 회수
  const handleRevokePermission = async (permissionCode: string) => {
    if (!selectedUser) return;

    // 권한 ID 찾기
    const permission = allPermissions.find((p) => p.code === permissionCode);
    if (!permission) {
      message.error('권한을 찾을 수 없습니다.');
      return;
    }

    confirm({
      title: '권한 회수',
      icon: <ExclamationCircleOutlined />,
      content: `"${permission.name_ko}" 권한을 회수하시겠습니까?`,
      okText: '회수',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          const result = await permissionApi.revokeUserPermission(selectedUser.id, {
            permission_id: permission.id,
            organization_id: selectedUser.organization_id || 0,
            reason: '관리자에 의한 권한 회수',
          });
          if (result.success) {
            message.success('권한이 회수되었습니다.');
            loadUserPermissions(selectedUser.id);
          } else {
            message.error(result.error || '권한 회수에 실패했습니다.');
          }
        } catch {
          message.error('권한 회수에 실패했습니다.');
        }
      },
    });
  };

  // 위험도 태그 렌더링
  const renderRiskTag = (riskLevel: RiskLevel) => {
    const color = RISK_LEVEL_COLORS[riskLevel];
    const name = RISK_LEVEL_NAMES[riskLevel];
    return <Tag color={color}>{name}</Tag>;
  };

  // 권한 테이블 컬럼
  const permissionColumns = [
    {
      title: '권한 코드',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (code: string) => <Text code>{code}</Text>,
    },
    {
      title: '권한명',
      dataIndex: 'name_ko',
      key: 'name_ko',
      width: 180,
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '위험도',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (level: RiskLevel) => renderRiskTag(level),
      filters: [
        { text: '낮음', value: 'low' },
        { text: '보통', value: 'medium' },
        { text: '높음', value: 'high' },
        { text: '매우 높음', value: 'critical' },
      ],
      onFilter: (value: React.Key | boolean, record: PermissionDefinition) => record.risk_level === value,
    },
    {
      title: '승인 필요',
      dataIndex: 'requires_approval',
      key: 'requires_approval',
      width: 100,
      render: (requires: boolean) =>
        requires ? (
          <Tag color="orange" icon={<WarningOutlined />}>필요</Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>불필요</Tag>
        ),
    },
  ];

  // 권한 목록 탭 렌더링
  const renderPermissionList = () => (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Input.Search
          placeholder="권한 코드 또는 이름 검색"
          allowClear
          enterButton={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400 }}
        />

        <Collapse defaultActiveKey={['service', 'git', 'db']}>
          {Object.entries(groupedPermissions).map(([category, permissions]) => {
            const categoryName = CATEGORY_NAMES[category as PermissionCategory] || category;
            const filteredPermissions = permissions.filter(
              (p) =>
                p.code.toLowerCase().includes(searchText.toLowerCase()) ||
                p.name_ko.toLowerCase().includes(searchText.toLowerCase())
            );

            if (searchText && filteredPermissions.length === 0) {
              return null;
            }

            return (
              <Panel
                header={
                  <Space>
                    <SafetyOutlined />
                    <span>{categoryName}</span>
                    <Badge count={filteredPermissions.length} style={{ backgroundColor: '#1890ff' }} />
                  </Space>
                }
                key={category}
              >
                <Table
                  dataSource={filteredPermissions}
                  columns={permissionColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </Panel>
            );
          })}
        </Collapse>
      </Space>
    </Card>
  );

  // 사용자별 권한 관리 탭 렌더링
  const renderUserPermissions = () => (
    <Card>
      <Alert
        message="사용자별 권한 관리"
        description="사용자를 선택하여 개별 권한을 부여하거나 회수할 수 있습니다. Owner/Manager에게 부여된 기본 권한 외에 추가적인 권한을 설정합니다."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Select
            placeholder="사용자 선택"
            style={{ width: 350 }}
            showSearch
            optionFilterProp="children"
            onChange={handleUserSelect}
            value={selectedUser?.id}
            loading={loading}
          >
            {users.map((user) => (
              <Select.Option key={user.id} value={user.id}>
                {user.email} ({user.role || 'Member'})
              </Select.Option>
            ))}
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={loadUsers}
            title="사용자 목록 새로고침"
          />

          {selectedUser && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setGrantModalVisible(true)}
            >
              권한 부여
            </Button>
          )}
        </Space>

        {selectedUser && (
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>{selectedUser.email}의 권한</span>
              </Space>
            }
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Text>역할:</Text>
                <Tag color="blue">{selectedUser.role || 'Member'}</Tag>
                {selectedUser.organization_name && (
                  <>
                    <Text>기관:</Text>
                    <Tag>{selectedUser.organization_name}</Tag>
                  </>
                )}
              </Space>

              <Divider style={{ margin: '12px 0' }} />

              <Spin spinning={loadingUserPermissions}>
                {userPermissions.length > 0 ? (
                  <List
                    dataSource={userPermissions}
                    renderItem={(perm) => {
                      const permDef = allPermissions.find(p => p.code === perm.code);
                      return (
                        <List.Item
                          actions={[
                            <Button
                              key="revoke"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRevokePermission(perm.code)}
                            >
                              회수
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Space>
                                <Text code>{perm.code}</Text>
                                <Text>{perm.name_ko}</Text>
                                {permDef && renderRiskTag(permDef.risk_level)}
                              </Space>
                            }
                            description={
                              <Space>
                                <Tag color="default">{CATEGORY_NAMES[perm.category as PermissionCategory] || perm.category}</Tag>
                                {perm.granted_at && (
                                  <Text type="secondary">
                                    부여일: {new Date(perm.granted_at).toLocaleDateString()}
                                  </Text>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty
                    description="부여된 개별 권한이 없습니다."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Spin>
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );

  // 권한 부여 모달
  const renderGrantModal = () => (
    <Modal
      title={`권한 부여 - ${selectedUser?.email}`}
      open={grantModalVisible}
      onOk={handleGrantPermission}
      onCancel={() => {
        setGrantModalVisible(false);
        setSelectedPermissions([]);
      }}
      width={800}
      okText="부여"
      cancelText="취소"
      confirmLoading={loading}
    >
      <Alert
        message="주의"
        description="Critical 권한은 신중하게 부여해주세요. 위험한 작업을 수행할 수 있는 권한입니다."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Collapse>
        {Object.entries(groupedPermissions).map(([category, permissions]) => {
          const categoryName = CATEGORY_NAMES[category as PermissionCategory] || category;
          // 이미 부여된 권한 제외
          const availablePermissions = permissions.filter(
            (p) => !userPermissions.some((up) => up.code === p.code)
          );

          if (availablePermissions.length === 0) {
            return null;
          }

          return (
            <Panel
              header={
                <Space>
                  <span>{categoryName}</span>
                  <Badge count={availablePermissions.length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
              key={category}
            >
              <Checkbox.Group
                value={selectedPermissions}
                onChange={(values) => setSelectedPermissions(values as number[])}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {availablePermissions.map((perm) => (
                    <Checkbox key={perm.id} value={perm.id}>
                      <Space>
                        <Text code>{perm.code}</Text>
                        <Text>{perm.name_ko}</Text>
                        {renderRiskTag(perm.risk_level)}
                      </Space>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </Panel>
          );
        })}
      </Collapse>
    </Modal>
  );

  // 권한 없음 표시
  if (!isOwnerOrManager) {
    return (
      <Card>
        <Alert
          message="접근 권한 없음"
          description="권한 관리 페이지는 Owner 또는 Manager만 접근할 수 있습니다."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>
        <SafetyOutlined /> 권한 관리
      </Title>

      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'permissions',
              label: (
                <span>
                  <SafetyOutlined />
                  권한 목록
                </span>
              ),
              children: renderPermissionList(),
            },
            {
              key: 'users',
              label: (
                <span>
                  <UserOutlined />
                  사용자별 권한
                </span>
              ),
              children: renderUserPermissions(),
            },
          ]}
        />
      </Spin>

      {renderGrantModal()}
    </div>
  );
};

export default PermissionManagement;
