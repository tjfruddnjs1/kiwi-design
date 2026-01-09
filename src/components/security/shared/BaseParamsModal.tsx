/**
 * BaseParamsModal Component
 * 파라미터 입력 모달의 공통 레이아웃
 */

import React from 'react';
import { Modal, Button, Spin } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

export interface BaseParamsModalProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 */
  onClose: () => void;
  /** 제출 핸들러 */
  onSubmit: () => void;
  /** 모달 제목 */
  title: string;
  /** 제목 아이콘 */
  icon?: React.ReactNode;
  /** 로딩 상태 */
  loading?: boolean;
  /** 자식 컴포넌트 (Form fields) */
  children: React.ReactNode;
  /** 모달 너비 */
  width?: number | string;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
}

export const BaseParamsModal: React.FC<BaseParamsModalProps> = ({
  visible,
  onClose,
  onSubmit,
  title,
  icon = <SettingOutlined />,
  loading = false,
  children,
  width = 600,
  confirmText = '확인',
  cancelText = '취소',
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {React.cloneElement(icon as React.ReactElement, {
            style: { color: '#1890ff', fontSize: '16px' },
          })}
          <span>{title}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={width}
      footer={[
        <Button key='cancel' onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>,
        <Button
          key='submit'
          type='primary'
          onClick={onSubmit}
          loading={loading}
          disabled={loading}
        >
          {loading ? <Spin size='small' /> : confirmText}
        </Button>,
      ]}
      destroyOnClose
    >
      {children}
    </Modal>
  );
};

export default BaseParamsModal;
