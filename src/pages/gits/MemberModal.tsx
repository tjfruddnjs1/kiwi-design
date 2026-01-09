import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  List,
  Avatar,
  Button,
  Input,
  message,
  Spin,
  Empty,
  Tag,
  Space,
  Typography,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  KeyOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { GitRepository } from './GitManagement';
import { gitApi } from '../../lib/api/gitRepository';

interface Member {
  userId: number;
  email: string;
  role: string;
}

interface MemberModalProps {
  open: boolean;
  repo: GitRepository | null;
  onClose: () => void;
}

const MemberModal: React.FC<MemberModalProps> = ({ open, repo, onClose }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Member | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!repo) return;
    setLoading(true);
    try {
      const response = await gitApi.getRepoMembers(repo.id);
      if (response.data && Array.isArray(response.data)) {
        setMembers(response.data);
      } else {
        setMembers([]);
      }
    } catch (error) {
      message.error('권한자 목록을 불러오는 데 실패했습니다.' + error);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    if (open && repo) {
      void fetchMembers();
    } else {
      setNewMemberEmail('');
      setAdminToken('');
      setAdminToken('');
      setAddLoading(false);
    }
  }, [open, repo, fetchMembers]);

  const handleAddMember = async () => {
    if (!repo || !newMemberEmail || !adminToken) {
      message.warning(
        '추가할 사용자의 이메일과 관리자 토큰을 모두 입력해주세요.'
      );
      return;
    }
    setAddLoading(true);
    // 토큰 검증
    try {
      await gitApi.validateAdminToken(adminToken, repo.gitlabUrl);

      await gitApi.addRepoMember(repo.id, newMemberEmail, adminToken);
      message.success(`'${newMemberEmail}' 사용자를 성공적으로 추가했습니다.`);
      setNewMemberEmail('');
      setAdminToken('');
      await fetchMembers();
    } catch (error) {
      message.error('권한자 추가에 실패했습니다.' + error);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!repo) return;
    try {
      await gitApi.removeRepoMember(repo.id, email, adminToken);
      message.success('권한자를 삭제했습니다.');
      await fetchMembers();
    } catch (error) {
      message.error('권한자 삭제에 실패했습니다.' + error);
    }
  };

  const showDeleteModal = (member: Member) => {
    setUserToDelete(member);
    setIsDeleteModalVisible(true);
  };
  const handleCancelDelete = () => {
    setIsDeleteModalVisible(false);
    setUserToDelete(null);
    setAdminToken('');
    setDeleteLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!repo || !userToDelete || !adminToken) {
      message.warning('관리자 토큰을 입력해주세요.');
      return;
    }
    setDeleteLoading(true);
    try {
      await gitApi.validateAdminToken(adminToken, repo.gitlabUrl);
      void handleRemoveMember(userToDelete.email);
      handleCancelDelete();
      await fetchMembers();
    } catch (error) {
      message.error('권한자 삭제에 실패했습니다.' + error);
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(250, 173, 20, 0.3)',
              }}
            >
              <UsergroupAddOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#262626',
                  lineHeight: 1.2,
                }}
              >
                권한자 관리
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8c8c8c',
                  marginTop: 2,
                }}
              >
                {repo ? repo.name : '서비스 권한을 관리합니다'}
              </div>
            </div>
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={
          <Button
            onClick={onClose}
            size='large'
            style={{
              height: 44,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 8,
              minWidth: 120,
            }}
          >
            닫기
          </Button>
        }
        width={700}
        style={{ top: 40 }}
        bodyStyle={{ padding: '24px' }}
      >
        <div
          style={{
            padding: 20,
            background: 'linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%)',
            borderRadius: 12,
            border: '2px solid #ffe58f',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid #ffe58f',
            }}
          >
            <PlusOutlined style={{ color: '#faad14', fontSize: 16 }} />
            <span
              style={{
                fontWeight: 600,
                color: '#d48806',
                fontSize: 15,
              }}
            >
              새 권한자 추가
            </span>
          </div>
          <Space direction='vertical' style={{ width: '100%' }} size={12}>
            <Input
              prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
              placeholder='추가할 사용자의 이메일 주소 입력'
              value={newMemberEmail}
              onChange={e => setNewMemberEmail(e.target.value)}
              onPressEnter={handleAddMember}
              size='large'
              style={{
                borderRadius: 8,
                fontSize: 14,
              }}
            />
            <Input.Password
              prefix={<KeyOutlined style={{ color: '#8c8c8c' }} />}
              placeholder='요청을 보내는 관리자 본인의 토큰 입력'
              value={adminToken}
              onChange={e => setAdminToken(e.target.value)}
              onPressEnter={handleAddMember}
              size='large'
              style={{
                borderRadius: 8,
                fontSize: 14,
              }}
              addonAfter={
                <Tooltip title='토큰 발급 방법은 관리자에게 문의하세요.'>
                  <QuestionCircleOutlined
                    style={{ cursor: 'help', color: '#8c8c8c' }}
                  />
                </Tooltip>
              }
            />
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleAddMember}
              loading={addLoading}
              block
              size='large'
              style={{
                height: 44,
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(250, 173, 20, 0.3)',
              }}
            >
              추가 및 초대
            </Button>
          </Space>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Spin />
          </div>
        ) : (
          <div
            style={{
              border: '2px solid #e8e8e8',
              borderRadius: 12,
              padding: 20,
              background: '#fafafa',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: '2px solid #e8e8e8',
              }}
            >
              <UserOutlined style={{ color: '#1890ff', fontSize: 16 }} />
              <Typography.Text
                style={{
                  color: '#262626',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                현재 권한자 목록
              </Typography.Text>
              <Tag color='blue' style={{ marginLeft: 'auto' }}>
                {members.length}명
              </Tag>
            </div>
            {members.length > 0 ? (
              <List
                itemLayout='horizontal'
                dataSource={members}
                renderItem={item => (
                  <List.Item
                    actions={
                      item.role !== 'admin'
                        ? [
                            <Button
                              key={`remove-${item.userId}`}
                              type='text'
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => showDeleteModal(item)}
                            />,
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={<Typography.Text>{item.email}</Typography.Text>}
                      description={
                        item.role === 'admin' ? (
                          <Tag color='purple'>관리자</Tag>
                        ) : (
                          <Tag color='geekblue'>권한자</Tag>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description='등록된 권한자가 없습니다.' />
            )}
          </div>
        )}
      </Modal>
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)',
              }}
            >
              <DeleteOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#262626',
                  lineHeight: 1.2,
                }}
              >
                권한자 삭제 확인
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#8c8c8c',
                  marginTop: 2,
                }}
              >
                권한자를 제거하려면 관리자 토큰이 필요합니다
              </div>
            </div>
          </div>
        }
        open={isDeleteModalVisible}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmLoading={deleteLoading}
        okText='삭제'
        cancelText='취소'
        okButtonProps={{
          danger: true,
          size: 'large',
          style: {
            height: 44,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
          },
        }}
        cancelButtonProps={{
          size: 'large',
          style: {
            height: 44,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 8,
          },
        }}
        width={500}
        style={{ top: 40 }}
        bodyStyle={{ padding: '24px' }}
      >
        <div
          style={{
            padding: 16,
            background: '#fff2f0',
            borderRadius: 8,
            border: '1px solid #ffccc7',
            marginBottom: 20,
          }}
        >
          <Typography.Text
            style={{
              fontSize: 14,
              color: '#cf1322',
              fontWeight: 500,
            }}
          >
            <DeleteOutlined style={{ marginRight: 8 }} />
            {userToDelete?.email} 사용자의 권한을 삭제하려면, 관리자 본인의
            토큰을 입력해주세요.
          </Typography.Text>
        </div>
        <Input.Password
          prefix={<KeyOutlined style={{ color: '#8c8c8c' }} />}
          placeholder='요청을 보내는 관리자 본인의 토큰'
          value={adminToken}
          onChange={e => setAdminToken(e.target.value)}
          onPressEnter={handleConfirmDelete}
          size='large'
          style={{
            borderRadius: 8,
            fontSize: 14,
          }}
        />
      </Modal>
    </>
  );
};

export default MemberModal;
