// Logger 설정 및 프로덕션 최적화

export const LoggerConfig = {
  // 개발 환경에서만 콘솔 로깅 활성화
  isDevelopment: process.env['NODE_ENV'] === 'development',

  // 프로덕션에서는 ERROR 레벨 이상만 로깅
  getMinLogLevel: () => {
    return process.env['NODE_ENV'] === 'production' ? 3 : 0; // ERROR : DEBUG
  },

  // 민감한 정보 마스킹 패턴
  sensitiveDataPatterns: [/password/i, /token/i, /secret/i, /key/i, /auth/i],

  // 로그 억제 조건
  shouldSuppressLog: (message: string) => {
    // 프로덕션에서는 개발용 로그 억제
    if (process.env['NODE_ENV'] === 'production') {
      const devLogPatterns = [
        /fetch.*failed/i,
        /validation.*failed/i,
        /form.*submit/i,
      ];

      return devLogPatterns.some(pattern => pattern.test(message));
    }

    return false;
  },
};

// 구조화된 로깅을 위한 헬퍼
export const createLogEntry = (
  level: string,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: LoggerConfig.sensitiveDataPatterns.some(pattern =>
      JSON.stringify(context || {}).match(pattern)
    )
      ? '*** MASKED ***'
      : context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: LoggerConfig.isDevelopment ? error.stack : undefined,
        }
      : undefined,
  };
};
