/**
 * ExecutionLogs Component
 * 실행 로그를 표시하는 공통 컴포넌트
 */

import React from 'react';
import { Card, Typography } from 'antd';
import { parseLogMessages } from '../../../utils/securityHelpers';
import type { LogViewerProps } from '../../../types/securityModals';

const { Text } = Typography;

export const ExecutionLogs: React.FC<LogViewerProps> = ({
  logs,
  title = '실행 로그',
  maxHeight = 400,
}) => {
  // 로그 메시지 파싱
  const logMessages = React.useMemo(() => {
    if (Array.isArray(logs)) {
      return logs;
    }
    if (typeof logs === 'string') {
      try {
        const parsed = JSON.parse(logs);
        return parseLogMessages(parsed);
      } catch {
        // JSON parsing failed - split by newlines instead
        return logs.split('\n');
      }
    }
    if (logs && typeof logs === 'object') {
      return parseLogMessages(logs);
    }
    return [];
  }, [logs]);

  return (
    <Card title={title} size='small'>
      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          backgroundColor: '#1e1e1e',
          padding: '16px',
          borderRadius: '4px',
          fontFamily:
            'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
          fontSize: '12px',
          lineHeight: 1.5,
          color: '#d4d4d4',
        }}
      >
        {logMessages.length > 0 ? (
          logMessages.map((log: string, index: number) => (
            <div
              key={index}
              style={{
                marginBottom: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                borderRadius: '3px',
                borderLeft: '3px solid #1890ff',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {log}
            </div>
          ))
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: '#888',
            }}
          >
            <Text type='secondary' style={{ color: '#888' }}>
              실행 로그 정보가 없습니다.
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ExecutionLogs;
