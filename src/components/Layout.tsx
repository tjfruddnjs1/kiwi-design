import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Alert,
  Modal,
  MenuProps,
  Dropdown,
  Button,
  message,
  Badge,
  Tooltip,
  Select,
  Space,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  SafetyOutlined,
  LogoutOutlined,
  UserOutlined,
  DesktopOutlined,
  KeyOutlined,
  AppstoreOutlined,
  UserAddOutlined,
  BankOutlined,
  BellOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import './Layout.css';
import { exportCredsWithPicker, importCreds } from '../utils/credsIO';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationDrawer } from './common/NotificationDrawer';

const { Header, Content } = AntLayout;

const allMenuItems = [
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: <DashboardOutlined />,
    label: '대시보드',
    requiredPermission: null, // 모든 사용자 접근 가능
  },
  // DEPRECATED: '인프라 관리' 탭 제거 - organization 기반 권한 관리로 변경
  // {
  //   key: 'infra_management',
  //   path: '/infrastructure',
  //   icon: <CloudServerOutlined />,
  //   label: '인프라 관리',
  //   requiredPermission: 'infra' // 탭 접근 권한 필요
  // },
  {
    key: 'device_management',
    path: '/devices',
    icon: <DesktopOutlined />,
    label: '장비 관리',
    requiredPermission: 'device', // 탭 접근 권한 필요
  },
  {
    key: 'runtime_management',
    path: '/runtimes',
    icon: <CloudServerOutlined />,
    label: '런타임 환경',
    requiredPermission: 'infra', // 탭 접근 권한 필요
  },
  {
    key: 'backup_management',
    path: '/backup',
    icon: <SafetyOutlined />,
    label: '백업 관리',
    requiredPermission: 'backup', // 탭 접근 권한 필요
  },
  {
    key: 'service_management',
    path: '/services',
    icon: <AppstoreOutlined />,
    label: '서비스 관리',
    requiredPermission: 'service', // 탭 접근 권한 필요
  },
  {
    key: 'database_management',
    path: '/database',
    icon: <DatabaseOutlined />,
    label: '데이터베이스 관리',
    requiredPermission: 'service', // 탭 접근 권한 필요
  },
  {
    key: 'user_management',
    path: '/users',
    icon: <UserAddOutlined />,
    label: '사용자 관리',
    requiredPermission: null, // role 기반 접근
  },
  {
    key: 'Owner',
    path: '/organizations',
    icon: <BankOutlined />,
    label: '기관 관리',
    requiredPermission: null, // role 기반 접근
  },
];

// Hook for license management - Disabled in Demo Mode
const useLicenseManagement = () => {
  // Demo 모드에서는 라이선스 체크 비활성화
  const [showExpiredAlert] = useState(false);
  const [expiryInfo] = useState<{
    expiryDate: string;
    message: string;
  } | null>(null);

  const setShowExpiredAlert = (_show: boolean) => {
    // Demo 모드에서는 라이선스 경고 표시하지 않음
  };

  return { showExpiredAlert, expiryInfo, setShowExpiredAlert };
};

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout, tokenExpiresAt, refreshToken } = useAuth();
  const {
    selectedOrganization,
    availableOrganizations,
    setSelectedOrganization,
    canSelectOrganization,
    isLoading: orgLoading,
  } = useOrganization();
  const { showExpiredAlert, expiryInfo, setShowExpiredAlert } =
    useLicenseManagement();
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState<string>('');
  const [isTokenExpiringSoon, setIsTokenExpiringSoon] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 토큰 남은 시간 계산 및 표시
  const formatTimeRemaining = useCallback((expiresAt: number): string => {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      return '만료됨';
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  }, []);

  // 토큰 시간 업데이트 (1분마다)
  useEffect(() => {
    if (!tokenExpiresAt) return;

    const updateTokenTime = () => {
      const remaining = tokenExpiresAt - Date.now();
      setTokenTimeRemaining(formatTimeRemaining(tokenExpiresAt));
      // 1시간 미만 남았을 때 경고 표시
      setIsTokenExpiringSoon(remaining < 60 * 60 * 1000 && remaining > 0);
    };

    updateTokenTime();
    const interval = setInterval(updateTokenTime, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [tokenExpiresAt, formatTimeRemaining]);

  // 토큰 갱신 핸들러
  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshToken();
      if (success) {
        message.success('세션이 24시간 연장되었습니다.');
      } else {
        message.error('세션 연장에 실패했습니다. 다시 로그인해주세요.');
      }
    } catch {
      // Token refresh failed - show user-friendly error
      message.error('세션 연장 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 알림 관리 훅
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    loadNotifications,
    acceptInvitation,
    rejectInvitation,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Drawer가 열릴 때마다 notification 목록 새로고침
  useEffect(() => {
    if (notificationDrawerOpen) {
      void loadNotifications();
    }
  }, [notificationDrawerOpen, loadNotifications]);

  const accessibleMenus = allMenuItems.filter(item => {
    // 1. 대시보드는 모든 사용자 접근 가능
    if (item.key === 'dashboard') {
      return true;
    }

    // 2. 기관 관리 페이지 - Owner만 접근 가능
    if (item.key === 'Owner') {
      return user?.role === 'Owner';
    }

    // 3. 사용자 관리 페이지 - Owner, Manager만 접근 가능
    if (item.key === 'user_management') {
      return user?.role === 'Owner' || user?.role === 'Manager';
    }

    // 4. Owner, Manager는 기관 관리/사용자 관리 외 모든 탭 접근 가능
    if (user?.role === 'Owner' || user?.role === 'Manager') {
      return true;
    }

    // 5. 일반 Member는 탭 접근 권한 기반 필터링
    if (item.requiredPermission) {
      return user?.permissions?.includes(item.requiredPermission);
    }

    // 6. requiredPermission이 null이고 role 기반도 아닌 경우 (기본값: 접근 불가)
    return false;
  });

  // [Demo Mode] GitLab 비밀번호 확인 모달 - Demo 모드 안내 표시
  const showGitLabPasswordModal = () => {
    Modal.info({
      title: 'Demo Mode',
      content: (
        <div>
          <p style={{ marginTop: '12px' }}>
            Demo 모드에서는 GitLab 비밀번호 확인 기능을 사용할 수 없습니다.
          </p>
          <p style={{ color: '#8c8c8c', marginTop: '12px' }}>
            실제 환경에서는 시스템에서 발급된 GitLab 초기 비밀번호를 확인할 수 있습니다.
          </p>
        </div>
      ),
      okText: '확인',
      width: 400,
    });
  };

  // [수정] 사용자 드롭다운 메뉴 아이템에 'GitLab 비밀번호 확인' 추가
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'gitlab-password',
      icon: <KeyOutlined />,
      label: 'GitLab 비밀번호 확인',
      onClick: () => {
        void showGitLabPasswordModal();
      }, // 클릭 시 위에서 만든 함수 호출
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: logout,
    },
  ];

  const getActiveKey = (pathname: string) => {
    // 가장 길게 일치하는 경로를 찾기 위해 역순으로 정렬
    const sortedMenus = [...allMenuItems].sort(
      (a, b) => b.path.length - a.path.length
    );
    const activeMenu = sortedMenus.find(item => pathname.startsWith(item.path));

    return activeMenu ? activeMenu.key : '';
  };

  const activeKey = getActiveKey(location.pathname);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {showExpiredAlert && expiryInfo && (
        <Modal
          title='라이선스 만료 알림'
          open={showExpiredAlert}
          onOk={() => setShowExpiredAlert(false)}
          onCancel={() => setShowExpiredAlert(false)}
          okText='확인'
          cancelText='닫기'
        >
          <Alert
            message={expiryInfo.message}
            description={
              <div>
                <p>만료일: {expiryInfo.expiryDate}</p>
                <p>라이선스가 만료되어 서비스 이용이 제한됩니다.</p>
                <p>관리자에게 문의하여 라이선스를 갱신해주세요.</p>
              </div>
            }
            type='error'
            showIcon
          />
        </Modal>
      )}

      <Header className='system-header'>
        <div className='header-left'>
          <img
            src='/favicon-32x32.png'
            alt='KIWI'
            className='header-icon'
            style={{ width: 24, height: 24 }}
          />
          <h1>KIWI</h1>
          {/* Demo Mode Badge */}
          <Badge
            count="DEMO"
            style={{
              backgroundColor: '#fa8c16',
              marginLeft: 12,
              fontSize: 10,
              fontWeight: 600,
              padding: '0 8px',
            }}
          />
        </div>
        {/* (5. 핵심) 사용자 정보 및 로그아웃 드롭다운 추가 */}
        <div className='header-right'>
          {/* 기관 선택 - Owner만 표시 */}
          {canSelectOrganization && availableOrganizations.length > 0 && (
            <Space style={{ marginRight: 16 }}>
              <GlobalOutlined style={{ color: '#1890ff' }} />
              {orgLoading ? (
                <Spin size="small" />
              ) : (
                <Select
                  value={selectedOrganization?.id}
                  onChange={(value) => {
                    const org = availableOrganizations.find(o => o.id === value);
                    if (org) setSelectedOrganization(org);
                  }}
                  style={{ minWidth: 160 }}
                  size="small"
                  placeholder="기관 선택"
                  optionLabelProp="label"
                >
                  {availableOrganizations.map(org => (
                    <Select.Option
                      key={org.id}
                      value={org.id}
                      label={org.name}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{org.name}</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: org.status === 'Active' ? '#52c41a' : '#faad14',
                            marginLeft: 'auto',
                          }}
                        >
                          {org.status === 'Active' ? '활성' : '대기'}
                        </span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Space>
          )}

          {/* Manager/Member용 - 현재 기관명만 표시 */}
          {!canSelectOrganization && selectedOrganization && (
            <Tooltip title="소속 기관">
              <Space style={{ marginRight: 16, color: '#666' }}>
                <GlobalOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ fontSize: 13 }}>{selectedOrganization.name}</span>
              </Space>
            </Tooltip>
          )}

          {/* 세션 타이머 - 알림 아이콘 왼쪽에 배치 */}
          {tokenExpiresAt && (
            <Tooltip
              title={
                <div style={{ textAlign: 'center' }}>
                  <div>클릭하여 세션 연장 (24시간)</div>
                  {isTokenExpiringSoon && (
                    <div
                      style={{ color: '#ffccc7', fontSize: 11, marginTop: 4 }}
                    >
                      1시간 미만 - 연장을 권장합니다
                    </div>
                  )}
                </div>
              }
            >
              <Button
                type='text'
                size='small'
                className={`session-timer ${isTokenExpiringSoon ? 'session-timer-warning' : ''}`}
                onClick={handleRefreshToken}
                loading={isRefreshing}
                icon={<ClockCircleOutlined />}
                style={{
                  marginRight: 12,
                  color: isTokenExpiringSoon ? '#ff4d4f' : '#595959',
                  fontWeight: 500,
                  fontSize: 13,
                  height: 32,
                  borderRadius: 4,
                  background: isTokenExpiringSoon ? '#fff2f0' : 'transparent',
                  border: isTokenExpiringSoon ? '1px solid #ffccc7' : 'none',
                }}
              >
                {tokenTimeRemaining}
              </Button>
            </Tooltip>
          )}

          {/* 알림 아이콘 */}
          <Badge
            count={unreadCount}
            offset={[-5, 5]}
            style={{ marginRight: 16 }}
          >
            <Button
              type='text'
              icon={<BellOutlined style={{ fontSize: 20 }} />}
              onClick={() => setNotificationDrawerOpen(true)}
              style={{ padding: '4px 8px' }}
            />
          </Badge>

          <div style={{ display: 'flex', gap: 8, marginRight: 8 }}>
            <Button
              size='small'
              onClick={() => {
                void exportCredsWithPicker();
              }}
            >
              내보내기
            </Button>
            <Button
              size='small'
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;

                  // 가져오기 방식 선택 모달
                  Modal.confirm({
                    title: '가져오기 방식 선택',
                    content: (
                      <div>
                        <p>
                          <strong>완전 교체:</strong> 기존 인증 정보를 모두
                          지우고 새로운 정보로 교체
                        </p>
                        <p>
                          <strong>병합:</strong> 기존 정보는 유지하고 새로운
                          정보만 추가/업데이트
                        </p>
                      </div>
                    ),
                    okText: '완전 교체',
                    cancelText: '병합',
                    onOk: async () => {
                      const result = await importCreds(file, 'replace');
                      if (result.ok) {
                        message.success('인증 정보를 완전히 교체했습니다.');
                      } else {
                        message.error(`가져오기 실패: ${result.error}`);
                      }
                    },
                    onCancel: async () => {
                      const result = await importCreds(file, 'merge');
                      if (result.ok) {
                        message.success('인증 정보를 병합했습니다.');
                      } else {
                        message.error(`가져오기 실패: ${result.error}`);
                      }
                    },
                  });
                };
                input.click();
              }}
            >
              가져오기
            </Button>
          </div>
          {user && ( // user 정보가 있을 때만 (로그인 상태일 때만) 표시
            <Dropdown menu={{ items: userMenuItems }} placement='bottomRight'>
              <Button type='text' icon={<UserOutlined />}>
                {user.email}
              </Button>
            </Dropdown>
          )}
        </div>
      </Header>

      <div className='tab-menu'>
        {accessibleMenus.map(item => (
          <Link
            key={item.key}
            to={item.path}
            className={`tab-item ${item.key === activeKey ? 'active' : ''}`}
          >
            <div className='tab-icon'>{item.icon}</div>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <Content className='system-content'>
        <Outlet />
      </Content>

      {/* 알림 드로어 */}
      <NotificationDrawer
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        notifications={notifications}
        loading={notificationsLoading}
        onAcceptInvitation={acceptInvitation}
        onRejectInvitation={rejectInvitation}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </AntLayout>
  );
};

export default Layout;
