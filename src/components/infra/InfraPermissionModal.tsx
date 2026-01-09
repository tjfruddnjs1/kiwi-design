import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  List,
  Avatar,
  Button,
  Form,
  message,
  Spin,
  Popconfirm,
  Tag,
  Input,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { InfraItem } from '../../types/infra';
import * as k8sApi from '../../lib/api/kubernetes';
import { InfraPermission } from '../../lib/api/kubernetes';

// Option은 현재 사용하지 않으므로 제거

interface Props {
  infra: InfraItem;
  visible: boolean;
  onClose: () => void;
}

const InfraPermissionModal: React.FC<Props> = ({ infra, visible, onClose }) => {
  const [permissions, setPermissions] = useState<InfraPermission[]>([]);
  // allUsers는 현재 사용하지 않으므로 제거
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    if (!infra) return;
    setLoading(true);
    try {
      const permsRes = await k8sApi.getInfraPermissions(infra.id);

      setPermissions(permsRes || []);
    } catch (_error) {
      message.error('권한 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [infra]);

  useEffect(() => {
    if (visible) {
      void fetchData();
    }
  }, [visible, infra, fetchData]);

  const handleAddPermission = async (values: { email: string }) => {
    setLoading(true);
    try {
      await k8sApi.setInfraPermission({
        infra_id: infra.id,
        email: values.email,
      });
      message.success('권한이 추가되었습니다.');
      form.resetFields();
      void fetchData(); // 목록 새로고침
    } catch (error: unknown) {
      message.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || '권한 추가에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (userId: number) => {
    setLoading(true);
    try {
      await k8sApi.removeInfraPermission({
        infra_id: infra.id,
        user_id: userId,
      });
      message.success('권한이 삭제되었습니다.');
      void fetchData(); // 목록 새로고침
    } catch (error: unknown) {
      message.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || '권한 삭제에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`${infra.name} - 권한 관리`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Spin spinning={loading}>
        {/* ================== 핵심 UI 변경 사항 ================== */}
        <Form
          form={form}
          layout='inline'
          onFinish={handleAddPermission}
          style={{ marginBottom: 24 }}
        >
          <Form.Item
            name='email'
            rules={[
              { required: true, message: '사용자 이메일을 입력하세요' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
            ]}
            style={{ flex: 1 }}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder='추가할 사용자의 이메일 주소 입력'
            />
          </Form.Item>
          {/* 역할(role) 선택 UI 제거 */}
          <Form.Item>
            <Button type='primary' htmlType='submit' icon={<PlusOutlined />}>
              추가
            </Button>
          </Form.Item>
        </Form>
        {/* ==================================================== */}

        <List
          header={<div>현재 권한자 목록</div>}
          bordered
          dataSource={permissions}
          renderItem={item => (
            <List.Item
              actions={[
                item.role !== 'admin' ? (
                  <Popconfirm
                    key={`remove-${item.user_id}`}
                    title={`${item.user_email} 사용자의 권한을 삭제하시겠습니까?`}
                    onConfirm={() => handleRemovePermission(item.user_id)}
                    okText='삭제'
                    cancelText='취소'
                  >
                    {/* isSubmitting이 true일 때 버튼에 로딩 스피너를 표시합니다. */}
                    <Button type='text' danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ) : (
                  []
                ),
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={item.user_email}
                description={
                  <Tag color={item.role === 'admin' ? 'blue' : 'green'}>
                    {item.role === 'admin' ? '관리자' : '권한자'}
                  </Tag>
                }
              />
            </List.Item>
          )}
        />
      </Spin>
    </Modal>
  );
};

export default InfraPermissionModal;
