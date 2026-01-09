import React, { useState } from 'react';
import { Card, message, Select, Button, Space, Tag, Typography, Divider } from 'antd';
import { UserOutlined, CrownOutlined, TeamOutlined, EyeOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

// 역할별 아이콘 매핑
const roleIcons: Record<string, React.ReactNode> = {
  Owner: <CrownOutlined style={{ color: '#faad14' }} />,
  Manager: <SafetyOutlined style={{ color: '#1890ff' }} />,
  Member: <TeamOutlined style={{ color: '#52c41a' }} />,
  Viewer: <EyeOutlined style={{ color: '#8c8c8c' }} />,
};

// 역할별 색상 매핑
const roleColors: Record<string, string> = {
  Owner: 'gold',
  Manager: 'blue',
  Member: 'green',
  Viewer: 'default',
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { mockLogin, getMockUsers } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const mockUsers = getMockUsers();

  const handleLogin = () => {
    if (!selectedUserId) {
      message.warning('로그인할 사용자를 선택해주세요.');
      return;
    }

    setLoading(true);

    // 약간의 지연을 주어 로딩 효과 표시
    setTimeout(() => {
      mockLogin(selectedUserId);
      setLoading(false);
      navigate('/dashboard');
    }, 500);
  };

  const selectedUser = mockUsers.find(u => u.id === selectedUserId);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20,
      }}
    >
      <Card
        style={{
          width: 480,
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Demo Mode Badge */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Tag color="orange" style={{ fontSize: 12, padding: '4px 12px' }}>
            DEMO MODE
          </Tag>
        </div>

        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>
          KIWI Design Preview
        </Title>

        <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          Mock 사용자를 선택하여 데모를 체험하세요
        </Paragraph>

        <Divider style={{ margin: '16px 0' }}>사용자 선택</Divider>

        <Select
          placeholder="로그인할 사용자 선택"
          style={{ width: '100%', marginBottom: 16 }}
          size="large"
          value={selectedUserId}
          onChange={setSelectedUserId}
          optionLabelProp="label"
        >
          {mockUsers.map(user => (
            <Select.Option
              key={user.id}
              value={user.id}
              label={
                <Space>
                  {roleIcons[user.role]}
                  <span>{user.name}</span>
                  <Tag color={roleColors[user.role]} style={{ marginLeft: 4 }}>
                    {user.role}
                  </Tag>
                </Space>
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  {roleIcons[user.role]}
                  <div>
                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
                  </div>
                </Space>
                <Tag color={roleColors[user.role]}>{user.role}</Tag>
              </div>
            </Select.Option>
          ))}
        </Select>

        {/* 선택된 사용자 정보 표시 */}
        {selectedUser && (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: '#fafafa',
              borderRadius: 8,
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">역할</Text>
                <Tag color={roleColors[selectedUser.role]}>{selectedUser.role}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">이메일</Text>
                <Text>{selectedUser.email}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">권한</Text>
                <div style={{ textAlign: 'right' }}>
                  {selectedUser.permissions.length > 0 ? (
                    selectedUser.permissions.slice(0, 3).map((perm, idx) => (
                      <Tag key={idx} style={{ marginBottom: 2, fontSize: 11 }}>
                        {perm}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>권한 없음</Text>
                  )}
                  {selectedUser.permissions.length > 3 && (
                    <Tag style={{ fontSize: 11 }}>+{selectedUser.permissions.length - 3}</Tag>
                  )}
                </div>
              </div>
            </Space>
          </Card>
        )}

        <Button
          type="primary"
          size="large"
          icon={<UserOutlined />}
          onClick={handleLogin}
          loading={loading}
          disabled={!selectedUserId}
          style={{ width: '100%', height: 48, fontSize: 16 }}
        >
          {loading ? '로그인 중...' : '데모 로그인'}
        </Button>

        <Divider style={{ margin: '24px 0 16px' }} />

        {/* 안내 문구 */}
        <div style={{
          background: '#fff7e6',
          border: '1px solid #ffd591',
          borderRadius: 8,
          padding: 12,
        }}>
          <Text style={{ fontSize: 12, color: '#ad6800' }}>
            <strong>Demo Mode 안내</strong>
            <br />
            • 이 프로젝트는 디자인 검토용 데모 버전입니다.
            <br />
            • 모든 데이터는 Mock 데이터이며 실제 백엔드와 연결되지 않습니다.
            <br />
            • 빌드/배포/백업 실행 등의 기능은 동작하지 않습니다.
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
