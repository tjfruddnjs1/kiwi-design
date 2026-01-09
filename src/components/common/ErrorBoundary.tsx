import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 에러 로깅
    logger.error('ErrorBoundary caught an error', error, {
      errorDetails: error,
      errorInfo: errorInfo,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <Result
            status='error'
            title='앱에서 오류가 발생했습니다'
            subTitle='예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.'
            extra={[
              <Button type='primary' onClick={this.handleReload} key='reload'>
                페이지 새로고침
              </Button>,
              <Button onClick={() => window.history.back()} key='back'>
                이전 페이지로
              </Button>,
            ]}
          />
          {process.env['NODE_ENV'] === 'development' && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>개발자 정보</summary>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '10px',
                  overflow: 'auto',
                }}
              >
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
