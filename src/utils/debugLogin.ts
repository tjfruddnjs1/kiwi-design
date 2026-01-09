// 로그인 디버깅 유틸리티
// 브라우저 콘솔에서 사용할 수 있는 디버깅 함수들

declare global {
  interface Window {
    debugLogin: {
      checkToken: () => void;
      clearToken: () => void;
      testLogin: () => Promise<void>;
      checkPermissions: () => void;
    };
  }
}

// 토큰 상태 확인
const checkToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return;
  }

  try {
    // JWT 디코딩 (간단한 방법)
    const _payload = JSON.parse(atob(token.split('.')[1]));
  } catch {
    // JWT parsing may fail for malformed tokens - safe to ignore in debug utility
  }
};

// 토큰 삭제
const clearToken = () => {
  localStorage.removeItem('authToken');
};

// 로그인 테스트
const testLogin = async () => {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'line@gmail.com',
        password: '12341234',
      }),
    });

    const data = await response.json();

    if (data.success && data.data?.token) {
      localStorage.setItem('authToken', data.data.token);

      checkToken();
    }
  } catch {
    // Network or fetch errors - silent fail for debug utility
  }
};

// 권한 확인
const checkPermissions = () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    payload.permissions?.forEach((_perm: string) => {
      // Debug output: permission enumeration
    });
  } catch {
    // JWT parsing may fail for malformed tokens - safe to ignore in debug utility
  }
};

// 글로벌 객체에 디버깅 함수들 추가
window.debugLogin = {
  checkToken,
  clearToken,
  testLogin,
  checkPermissions,
};

export {};
