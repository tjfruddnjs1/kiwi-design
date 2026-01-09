// 개선된 로깅 시스템
// 구조화된 로그, 레벨별 필터링, 개발/프로덕션 환경 대응

import React from 'react';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  sessionId: string;
  component?: string;
  action?: string;
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.isDevelopment = process.env['NODE_ENV'] === 'development';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const component = entry.component ? `[${entry.component}]` : '';
    const action = entry.action ? `(${entry.action})` : '';

    return `${timestamp} ${levelName} ${component}${action} ${entry.message}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
    component?: string,
    action?: string
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
    };

    if (context) entry.context = context;
    if (error) entry.error = error;
    if (this.userId) entry.userId = this.userId;
    if (component) entry.component = component;
    if (action) entry.action = action;

    return entry;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.formatMessage(entry);

    // 개발 환경에서는 콘솔에 풍부한 정보 출력
    if (this.isDevelopment) {
      const consoleMethod = this.getConsoleMethod(entry.level);

      if (entry.context || entry.error) {
        console.group(formattedMessage);

        if (entry.context) {
          console.table(entry.context);
        }

        if (entry.error) {
          console.error('Error Details:', entry.error);
          if (entry.error.stack) {
            console.trace('Stack Trace:', entry.error.stack);
          }
        }

        console.groupEnd();
      } else {
        consoleMethod(formattedMessage);
      }
    } else {
      // 프로덕션 환경에서는 구조화된 로그만 출력
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
    }
  }

  // 공개 메서드들
  debug(
    message: string,
    context?: Record<string, unknown>,
    component?: string,
    action?: string
  ): void {
    const entry = this.createLogEntry(
      LogLevel.DEBUG,
      message,
      context,
      undefined,
      component,
      action
    );

    this.log(entry);
  }

  info(
    message: string,
    context?: Record<string, unknown>,
    component?: string,
    action?: string
  ): void {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      message,
      context,
      undefined,
      component,
      action
    );

    this.log(entry);
  }

  warn(
    message: string,
    context?: Record<string, unknown>,
    component?: string,
    action?: string
  ): void {
    const entry = this.createLogEntry(
      LogLevel.WARN,
      message,
      context,
      undefined,
      component,
      action
    );

    this.log(entry);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
    component?: string,
    action?: string
  ): void {
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      message,
      context,
      error,
      component,
      action
    );

    this.log(entry);
  }

  fatal(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
    component?: string,
    action?: string
  ): void {
    const entry = this.createLogEntry(
      LogLevel.FATAL,
      message,
      context,
      error,
      component,
      action
    );

    this.log(entry);
  }

  // 성능 측정을 위한 타이머
  private timers: Map<string, number> = new Map();

  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string, message?: string): void {
    const startTime = this.timers.get(name);

    if (startTime === undefined) {
      this.warn(`Timer '${name}' was not started`);

      return;
    }

    const duration = performance.now() - startTime;

    this.timers.delete(name);

    this.debug(message || `Timer '${name}' completed`, {
      timer: name,
      duration: `${duration.toFixed(2)}ms`,
    });
  }

  // API 호출 로깅
  logApiCall(
    method: string,
    url: string,
    status: number,
    duration: number,
    error?: Error,
    requestData?: Record<string, unknown>,
    responseData?: Record<string, unknown>
  ): void {
    const context = {
      method,
      url,
      status,
      duration: `${duration.toFixed(2)}ms`,
      requestData: this.isDevelopment ? requestData : undefined,
      responseData: this.isDevelopment ? responseData : undefined,
    };

    if (status >= 400) {
      this.error(`API call failed: ${method} ${url}`, error, context, 'API');
    } else if (status >= 300) {
      this.warn(`API call redirected: ${method} ${url}`, context, 'API');
    } else {
      this.info(`API call success: ${method} ${url}`, context, 'API');
    }
  }

  // 사용자 액션 로깅
  logUserAction(
    action: string,
    component: string,
    data?: Record<string, unknown>
  ): void {
    this.info(`User action: ${action}`, data, component, action);
  }

  // 에러 경계에서 사용할 에러 로깅
  logComponentError(
    error: Error,
    errorInfo: React.ErrorInfo,
    component: string
  ): void {
    this.error(
      `Component error in ${component}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: component,
      },
      component,
      'render'
    );
  }
}

// 싱글톤 인스턴스 생성
export const logger = new Logger();

// 개발 환경에서 전역 접근을 위해 window 객체에 추가
if (process.env['NODE_ENV'] === 'development') {
  (window as unknown as Window & { logger: Logger }).logger = logger;
}

export default logger;
