/**
 * TruncatedText Component
 * 텍스트 자르기 및 툴팁 표시 컴포넌트
 */

import React from 'react';
import { Tooltip } from 'antd';
import { getTruncationStyles } from '../../utils/stringHelpers';
import type { TooltipPlacement } from 'antd/es/tooltip';

interface TruncatedTextProps {
  /** 표시할 텍스트 */
  text: string;
  /** 최대 너비 (px 또는 문자열) */
  maxWidth?: number | string;
  /** 툴팁 표시 여부 */
  showTooltip?: boolean;
  /** 툴팁 위치 */
  tooltipPlacement?: TooltipPlacement;
  /** 추가 스타일 */
  style?: React.CSSProperties;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 긴 텍스트를 말줄임표로 자르고 툴팁으로 전체 내용을 표시하는 컴포넌트
 */
export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxWidth = 200,
  showTooltip = true,
  tooltipPlacement = 'topLeft',
  style,
  className,
}) => {
  const combinedStyle = {
    ...getTruncationStyles(maxWidth),
    ...style,
  };

  const content = (
    <div style={combinedStyle} className={className}>
      {text}
    </div>
  );

  if (showTooltip && text) {
    return (
      <Tooltip title={text} placement={tooltipPlacement}>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default TruncatedText;
