/**
 * Modal Helper Utilities
 * 모달 다이얼로그를 위한 중앙화된 유틸리티
 */

import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import React from 'react';

export interface ConfirmOptions {
  title: string;
  content: string | React.ReactNode;
  onOk: () => void | Promise<void>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}

/**
 * 삭제 작업을 위한 확인 다이얼로그 표시
 * @param itemName 삭제할 항목 이름
 * @param onConfirm 확인 시 실행할 함수
 */
export function confirmDelete(
  itemName: string,
  onConfirm: () => void | Promise<void>
): void {
  Modal.confirm({
    title: `${itemName} 삭제`,
    content: `"${itemName}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    icon: React.createElement(ExclamationCircleOutlined),
    okText: '삭제',
    okType: 'danger',
    cancelText: '취소',
    onOk: onConfirm,
  });
}

/**
 * 범용 확인 다이얼로그 표시
 * @param options 확인 다이얼로그 옵션
 */
export function confirmAction(options: ConfirmOptions): void {
  Modal.confirm({
    title: options.title,
    content: options.content,
    icon: React.createElement(ExclamationCircleOutlined),
    okText: options.okText || '확인',
    okType: options.danger ? 'danger' : 'primary',
    cancelText: options.cancelText || '취소',
    onOk: options.onOk,
    onCancel: options.onCancel,
  });
}

/**
 * 경고 다이얼로그 표시 (취소 버튼 없음)
 * @param title 제목
 * @param content 내용
 */
export function showWarning(
  title: string,
  content: string | React.ReactNode
): void {
  Modal.warning({
    title,
    content,
    icon: React.createElement(ExclamationCircleOutlined),
    okText: '확인',
  });
}

/**
 * 정보 다이얼로그 표시 (취소 버튼 없음)
 * @param title 제목
 * @param content 내용
 */
export function showInfo(
  title: string,
  content: string | React.ReactNode
): void {
  Modal.info({
    title,
    content,
    okText: '확인',
  });
}

/**
 * 성공 다이얼로그 표시
 * @param title 제목
 * @param content 내용
 */
export function showSuccess(
  title: string,
  content: string | React.ReactNode
): void {
  Modal.success({
    title,
    content,
    okText: '확인',
  });
}

/**
 * 에러 다이얼로그 표시
 * @param title 제목
 * @param content 내용
 */
export function showError(
  title: string,
  content: string | React.ReactNode
): void {
  Modal.error({
    title,
    content,
    okText: '확인',
  });
}
