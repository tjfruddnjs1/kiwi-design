import React from 'react';
import {
  Drawer,
  List,
  Button,
  Empty,
  Badge,
  Space,
  Typography,
  Divider,
  Tag,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BugOutlined,
  BuildOutlined,
  CloudServerOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import type {
  NotificationDTO,
  NotificationStatus,
} from '@/lib/api/endpoints/notification';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const { Text, Title } = Typography;

/**
 * 알림 드로어 Props
 */
interface NotificationDrawerProps {
  /** 드로어 표시 여부 */
  open: boolean;
  /** 드로어 닫기 핸들러 */
  onClose: () => void;
  /** 알림 목록 */
  notifications: NotificationDTO[];
  /** 로딩 상태 */
  loading: boolean;
  /** 초대 수락 핸들러 */
  onAcceptInvitation: (notificationId: number) => Promise<boolean>;
  /** 초대 거절 핸들러 */
  onRejectInvitation: (notificationId: number) => Promise<boolean>;
  /** 알림 읽음 처리 핸들러 */
  onMarkAsRead: (notificationId: number) => Promise<boolean>;
  /** 모든 알림 읽음 처리 핸들러 */
  onMarkAllAsRead: () => Promise<boolean>;
}

/**
 * 알림 상태 뱃지 렌더링
 */
const getStatusBadge = (status: NotificationStatus) => {
  const statusConfig: Record<
    NotificationStatus,
    { color: string; text: string }
  > = {
    pending: { color: 'processing', text: '대기 중' },
    accepted: { color: 'success', text: '수락됨' },
    rejected: { color: 'default', text: '거절됨' },
    read: { color: 'default', text: '읽음' },
  };

  const config = statusConfig[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};

/**
 * 파이프라인 단계 아이콘 가져오기
 */
const getPipelineStageIcon = (stage?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    source: <BugOutlined style={{ fontSize: 20 }} />,
    sast: <ThunderboltOutlined style={{ fontSize: 20 }} />,
    build: <BuildOutlined style={{ fontSize: 20 }} />,
    sca: <BugOutlined style={{ fontSize: 20 }} />,
    deploy: <DeploymentUnitOutlined style={{ fontSize: 20 }} />,
    operation: <CloudServerOutlined style={{ fontSize: 20 }} />,
    dast: <ThunderboltOutlined style={{ fontSize: 20 }} />,
  };
  return iconMap[stage || ''] || <RocketOutlined style={{ fontSize: 20 }} />;
};

/**
 * 파이프라인 단계 태그 렌더링
 */
const getPipelineStageTag = (stage?: string, stageStatus?: string) => {
  const stageNames: Record<string, string> = {
    source: '소스 분석',
    sast: 'SAST',
    build: '빌드',
    sca: 'SCA',
    deploy: '배포',
    operation: '운영',
    dast: 'DAST',
  };

  const stageName = stageNames[stage || ''] || stage || '';

  let color = 'default';
  if (stageStatus === 'started') color = 'processing';
  if (stageStatus === 'completed') color = 'success';
  if (stageStatus === 'failed') color = 'error';

  return <Tag color={color}>{stageName}</Tag>;
};

/**
 * 알림 드로어 컴포넌트
 * 사용자의 알림 목록을 표시하고 초대 수락/거절 기능 제공
 */
export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  loading,
  onAcceptInvitation,
  onRejectInvitation,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  /**
   * 알림 항목 렌더링
   */
  const renderNotificationItem = (notification: NotificationDTO) => {
    const isOrganizationInvite = notification.type === 'organization_invite';
    // Pipeline notification은 type='system'이면서 data.stage가 있는 경우
    const isPipeline =
      notification.type === 'system' && notification.data?.stage;
    const isPending = notification.status === 'pending';
    const isUnread = notification.status === 'pending';

    return (
      <List.Item
        style={{
          backgroundColor: isUnread ? '#f0f7ff' : 'transparent',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '8px',
        }}
        actions={
          isOrganizationInvite && isPending
            ? [
                <Button
                  key='accept'
                  type='primary'
                  size='small'
                  icon={<CheckOutlined />}
                  onClick={() => handleAccept(notification.id)}
                >
                  수락
                </Button>,
                <Button
                  key='reject'
                  size='small'
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleReject(notification.id)}
                >
                  거절
                </Button>,
              ]
            : notification.status === 'pending'
              ? [
                  <Button
                    key='read'
                    size='small'
                    icon={<CheckCircleOutlined />}
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    읽음
                  </Button>,
                ]
              : []
        }
      >
        <List.Item.Meta
          avatar={
            <Badge dot={isUnread} offset={[-5, 5]}>
              {isPipeline ? (
                <div
                  style={{
                    color:
                      notification.data?.stageStatus === 'failed'
                        ? '#ff4d4f'
                        : notification.data?.stageStatus === 'completed'
                          ? '#52c41a'
                          : '#1890ff',
                  }}
                >
                  {getPipelineStageIcon(notification.data?.stage)}
                </div>
              ) : (
                <BellOutlined
                  style={{
                    fontSize: 24,
                    color: isUnread ? '#1890ff' : '#8c8c8c',
                  }}
                />
              )}
            </Badge>
          }
          title={
            <Space direction='vertical' size={4} style={{ width: '100%' }}>
              <Space>
                <Text strong>{notification.title}</Text>
                {isPipeline
                  ? getPipelineStageTag(
                      notification.data?.stage,
                      notification.data?.stageStatus
                    )
                  : getStatusBadge(notification.status)}
              </Space>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {dayjs(notification.createdAt).fromNow()}
              </Text>
            </Space>
          }
          description={
            <Space
              direction='vertical'
              size={8}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Text>{notification.message}</Text>
              {notification.data?.inviterEmail && (
                <Text type='secondary' style={{ fontSize: 12 }}>
                  초대자: {notification.data.inviterEmail}
                </Text>
              )}
              {isPipeline && notification.data?.serviceName && (
                <Text type='secondary' style={{ fontSize: 12 }}>
                  서비스: {notification.data.serviceName}
                </Text>
              )}
              {isPipeline && notification.data?.errorMessage && (
                <Text type='danger' style={{ fontSize: 12 }}>
                  오류: {notification.data.errorMessage}
                </Text>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  /**
   * 초대 수락 핸들러
   */
  const handleAccept = async (notificationId: number) => {
    await onAcceptInvitation(notificationId);
  };

  /**
   * 초대 거절 핸들러
   */
  const handleReject = async (notificationId: number) => {
    await onRejectInvitation(notificationId);
  };

  /**
   * 읽지 않은 알림 개수
   */
  const unreadCount = notifications.filter(n => n.status === 'pending').length;

  return (
    <Drawer
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            알림 <Badge count={unreadCount} showZero={false} />
          </Title>
          {unreadCount > 0 && (
            <Button type='link' size='small' onClick={onMarkAllAsRead}>
              모두 읽음
            </Button>
          )}
        </Space>
      }
      placement='right'
      onClose={onClose}
      open={open}
      width={480}
    >
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='알림이 없습니다'
          style={{ marginTop: 100 }}
        />
      ) : (
        <>
          <Divider style={{ marginTop: 0 }} />
          <List
            dataSource={notifications}
            renderItem={renderNotificationItem}
            loading={loading}
            style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          />
        </>
      )}
    </Drawer>
  );
};
