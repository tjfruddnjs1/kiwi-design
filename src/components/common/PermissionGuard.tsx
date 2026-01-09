/**
 * PermissionGuard Component
 * 권한 기반 UI 렌더링을 위한 컴포넌트
 */

import React from 'react';
import { Tooltip, Button, Result, Card, Typography, Space } from 'antd';
import { LockOutlined, SafetyOutlined, MailOutlined } from '@ant-design/icons';
import { usePermission } from '../../context/PermissionContext';
import { PermissionCode, RISK_LEVEL_COLORS, CATEGORY_NAMES, PermissionCategory } from '../../types/permission';

const { Text, Paragraph } = Typography;

// PermissionGuard Props
interface PermissionGuardProps {
  /**
   * 필요한 권한 코드 (단일 또는 배열)
   */
  permission: PermissionCode | string | (PermissionCode | string)[];

  /**
   * 권한 체크 모드
   * - 'any': 배열 중 하나라도 있으면 통과 (기본값)
   * - 'all': 배열의 모든 권한이 있어야 통과
   */
  mode?: 'any' | 'all';

  /**
   * 권한이 없을 때 렌더링할 내용
   */
  fallback?: React.ReactNode;

  /**
   * 권한이 없을 때 툴팁 표시 여부
   */
  showTooltip?: boolean;

  /**
   * 툴팁 메시지 (기본: "권한이 필요합니다")
   */
  tooltipMessage?: string;

  /**
   * 자식 컴포넌트
   */
  children: React.ReactNode;
}

/**
 * PermissionGuard
 * 권한에 따라 자식 컴포넌트를 렌더링하거나 숨깁니다.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  mode = 'any',
  fallback = null,
  showTooltip = false,
  tooltipMessage = '권한이 필요합니다',
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  // 권한 체크
  const checkPermission = (): boolean => {
    if (Array.isArray(permission)) {
      return mode === 'all' ? hasAllPermissions(permission) : hasAnyPermission(permission);
    }
    return hasPermission(permission);
  };

  const hasAccess = checkPermission();

  if (hasAccess) {
    return <>{children}</>;
  }

  // 권한 없음 - fallback 또는 툴팁 표시
  if (showTooltip && fallback) {
    return <Tooltip title={tooltipMessage}>{fallback}</Tooltip>;
  }

  return <>{fallback}</>;
};

// PermissionButton Props
interface PermissionButtonProps extends PermissionGuardProps {
  /**
   * 버튼 타입
   */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';

  /**
   * 버튼 위험 여부
   */
  danger?: boolean;

  /**
   * 버튼 클릭 핸들러
   */
  onClick?: () => void;

  /**
   * 버튼 비활성화 여부
   */
  disabled?: boolean;

  /**
   * 버튼 아이콘
   */
  icon?: React.ReactNode;

  /**
   * 버튼 크기
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 권한 없을 때 비활성화 버튼으로 표시
   */
  showDisabled?: boolean;

  /**
   * 버튼 텍스트
   */
  buttonText?: string;
}

/**
 * PermissionButton
 * 권한에 따라 버튼을 활성화/비활성화하거나 숨깁니다.
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  mode = 'any',
  type = 'default',
  danger = false,
  onClick,
  disabled = false,
  icon,
  size,
  showDisabled = true,
  buttonText,
  tooltipMessage = '권한이 필요합니다',
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isHighRiskPermission } = usePermission();

  // 권한 체크
  const checkPermission = (): boolean => {
    if (Array.isArray(permission)) {
      return mode === 'all' ? hasAllPermissions(permission) : hasAnyPermission(permission);
    }
    return hasPermission(permission);
  };

  const hasAccess = checkPermission();

  // 위험 권한 여부 체크
  const isHighRisk = Array.isArray(permission)
    ? permission.some((p) => isHighRiskPermission(p))
    : isHighRiskPermission(permission);

  if (!hasAccess) {
    if (showDisabled) {
      return (
        <Tooltip title={tooltipMessage}>
          <Button
            type={type}
            danger={danger}
            disabled
            icon={icon || <LockOutlined />}
            size={size}
          >
            {buttonText || children}
          </Button>
        </Tooltip>
      );
    }
    return null;
  }

  return (
    <Button
      type={type}
      danger={danger || isHighRisk}
      onClick={onClick}
      disabled={disabled}
      icon={icon}
      size={size}
      style={isHighRisk ? { borderColor: RISK_LEVEL_COLORS.critical } : undefined}
    >
      {buttonText || children}
    </Button>
  );
};

// RoleGuard Props
interface RoleGuardProps {
  /**
   * 필요한 역할
   */
  role: 'Owner' | 'Manager' | 'Member' | ('Owner' | 'Manager' | 'Member')[];

  /**
   * 역할이 없을 때 렌더링할 내용
   */
  fallback?: React.ReactNode;

  /**
   * 자식 컴포넌트
   */
  children: React.ReactNode;
}

/**
 * RoleGuard
 * 역할에 따라 자식 컴포넌트를 렌더링합니다.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ role, fallback = null, children }) => {
  const { role: userRole } = usePermission();

  const allowedRoles = Array.isArray(role) ? role : [role];
  const hasAccess = allowedRoles.includes(userRole as 'Owner' | 'Manager' | 'Member');

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

// OwnerOnly Props
interface OwnerOnlyProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * OwnerOnly
 * Owner 역할에게만 표시
 */
export const OwnerOnly: React.FC<OwnerOnlyProps> = ({ fallback = null, children }) => {
  const { isOwner } = usePermission();
  return isOwner ? <>{children}</> : <>{fallback}</>;
};

/**
 * ManagerOrAbove
 * Manager 이상 역할에게만 표시
 */
export const ManagerOrAbove: React.FC<OwnerOnlyProps> = ({ fallback = null, children }) => {
  const { isOwnerOrManager } = usePermission();
  return isOwnerOrManager ? <>{children}</> : <>{fallback}</>;
};

// PermissionDeniedCard Props
interface PermissionDeniedCardProps {
  /**
   * 필요한 권한 코드
   */
  permission?: PermissionCode | string | (PermissionCode | string)[];

  /**
   * 커스텀 타이틀
   */
  title?: string;

  /**
   * 커스텀 설명
   */
  description?: string;

  /**
   * 관리자 이메일 (문의용)
   */
  adminEmail?: string;

  /**
   * 컴팩트 모드 (작은 카드)
   */
  compact?: boolean;

  /**
   * 카드 스타일
   */
  style?: React.CSSProperties;
}

/**
 * 권한 코드를 한글명으로 변환
 */
const formatPermissionName = (permission: string): string => {
  const parts = permission.split(':');
  const category = parts[0] as PermissionCategory;
  const categoryName = CATEGORY_NAMES[category] || category;

  // 마지막 부분을 액션으로 변환
  const actionMap: Record<string, string> = {
    view: '조회',
    create: '생성',
    update: '수정',
    delete: '삭제',
    execute: '실행',
    manage: '관리',
    restart: '재시작',
    scale: '스케일',
    logs: '로그',
    exec: '명령실행',
    restore: '복구',
    download: '다운로드',
  };

  const action = parts[parts.length - 1];
  const actionName = actionMap[action] || action;

  return `${categoryName} - ${actionName}`;
};

/**
 * PermissionDeniedCard
 * 권한이 없을 때 표시하는 안내 카드
 */
export const PermissionDeniedCard: React.FC<PermissionDeniedCardProps> = ({
  permission,
  title = '접근 권한이 없습니다',
  description,
  adminEmail,
  compact = false,
  style,
}) => {
  // 필요한 권한 목록
  const permissions = permission
    ? Array.isArray(permission)
      ? permission
      : [permission]
    : [];

  const defaultDescription = permissions.length > 0
    ? '이 기능을 사용하려면 다음 권한이 필요합니다:'
    : '이 기능에 대한 접근 권한이 없습니다.';

  if (compact) {
    return (
      <Card
        size="small"
        style={{
          backgroundColor: '#fff7e6',
          borderColor: '#ffd591',
          ...style,
        }}
      >
        <Space>
          <LockOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
          <Text type="warning">{title}</Text>
          {permissions.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({permissions.map(formatPermissionName).join(', ')})
            </Text>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <Result
      status="403"
      icon={<SafetyOutlined style={{ color: '#faad14' }} />}
      title={title}
      subTitle={
        <Space direction="vertical" size="small" style={{ textAlign: 'center' }}>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {description || defaultDescription}
          </Paragraph>

          {permissions.length > 0 && (
            <Space direction="vertical" size={4}>
              {permissions.map((perm) => (
                <Text
                  key={perm}
                  code
                  style={{ fontSize: 12 }}
                >
                  {formatPermissionName(perm)}
                </Text>
              ))}
            </Space>
          )}

          <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            권한이 필요하시면 기관 관리자에게 문의해주세요.
          </Paragraph>

          {adminEmail && (
            <Button
              type="link"
              icon={<MailOutlined />}
              href={`mailto:${adminEmail}?subject=권한 요청&body=필요 권한: ${permissions.join(', ')}`}
            >
              관리자에게 문의
            </Button>
          )}
        </Space>
      }
      style={{
        padding: compact ? '16px' : '48px 32px',
        backgroundColor: '#fafafa',
        borderRadius: 8,
        ...style,
      }}
    />
  );
};

/**
 * PermissionDeniedInline
 * 인라인 권한 거부 메시지 (버튼/링크 옆에 사용)
 */
export const PermissionDeniedInline: React.FC<{
  permission?: string;
  message?: string;
}> = ({ permission, message }) => {
  const displayMessage = message || (permission ? `${formatPermissionName(permission)} 권한 필요` : '권한이 필요합니다');

  return (
    <Tooltip title="기관 관리자에게 권한을 요청하세요">
      <Text type="warning" style={{ fontSize: 12 }}>
        <LockOutlined style={{ marginRight: 4 }} />
        {displayMessage}
      </Text>
    </Tooltip>
  );
};

export default PermissionGuard;
