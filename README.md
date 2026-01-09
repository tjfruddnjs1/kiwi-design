# KIWI Design Preview

K8S Control Design Preview - Mock Data Version for Design Team

## Overview

이 프로젝트는 **K8S Control** 프론트엔드의 **디자인 검토용 데모 버전**입니다.
실제 백엔드 없이 Mock 데이터만으로 동작하여, 기획/디자인 팀이 UI/UX를 확인하고 작업할 수 있습니다.

### Key Features

- **Mock 인증**: 역할별 사용자(Owner/Manager/Member/Viewer) 선택 로그인
- **전체 기능 Mock**: Dashboard, 인프라, 서비스, 백업, 조직 관리 등 모든 기능 지원
- **Demo Mode 표시**: 헤더에 DEMO 뱃지 표시
- **실행 기능 제한**: 빌드/배포/백업 실행 등은 Demo 모드 안내 메시지 표시

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# 프로젝트 디렉토리로 이동
cd kiwi-design

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### Access

개발 서버 실행 후: **http://localhost:3001**

## Mock Users

로그인 페이지에서 다음 사용자 중 선택하여 로그인할 수 있습니다:

| 역할 | 이름 | 이메일 | 권한 |
|------|------|--------|------|
| Owner | 시스템 관리자 | owner@kiwi.com | 모든 권한 |
| Manager | 프로젝트 매니저 | manager@kiwi.com | 인프라, 서비스, 백업, 장비 |
| Member | 개발자 | member@kiwi.com | 서비스 |
| Viewer | 뷰어 | viewer@kiwi.com | 조회 전용 |

각 역할에 따라 접근 가능한 메뉴와 기능이 다릅니다.

## Project Structure

```
kiwi-design/
├── src/
│   ├── mocks/                    # Mock 시스템
│   │   ├── data/                 # Mock 데이터
│   │   │   ├── users.ts          # 사용자 데이터
│   │   │   ├── services.ts       # 서비스 데이터
│   │   │   ├── infrastructure.ts # 인프라 데이터
│   │   │   ├── backup.ts         # 백업 데이터
│   │   │   ├── dashboard.ts      # 대시보드 데이터
│   │   │   ├── organizations.ts  # 조직 데이터
│   │   │   ├── kubernetes.ts     # K8s 데이터
│   │   │   └── docker.ts         # Docker 데이터
│   │   ├── api/                  # Mock API 핸들러
│   │   │   ├── mockClient.ts     # Mock API 클라이언트
│   │   │   ├── auth.mock.ts      # 인증 Mock
│   │   │   ├── infra.mock.ts     # 인프라 Mock
│   │   │   ├── service.mock.ts   # 서비스 Mock
│   │   │   └── ...
│   │   └── utils/
│   │       └── delay.ts          # API 응답 지연 시뮬레이션
│   ├── context/
│   │   └── AuthContext.tsx       # Mock 인증 컨텍스트
│   ├── components/               # UI 컴포넌트
│   ├── pages/                    # 페이지 컴포넌트
│   └── ...
├── package.json
├── vite.config.ts
└── README.md
```

## Demo Mode Limitations

다음 기능들은 Demo 모드에서 제한됩니다:

- **빌드/배포 실행**: Mock 응답 반환 (실제 실행 없음)
- **백업 생성/복원**: Mock 응답 반환
- **Pod 재시작/삭제**: Mock 응답 반환
- **노드 설치/제거**: Mock 응답 반환
- **GitLab 비밀번호 확인**: Demo 모드 안내 표시
- **라이선스 체크**: 비활성화

## Scripts

```bash
# 개발 서버 실행 (포트 3001)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 코드 품질 검사
npm run code-quality

# 린팅
npm run lint

# 타입 체크
npm run type-check

# 포맷팅
npm run format
```

## Tech Stack

- **React** 18.x
- **TypeScript** 5.x
- **Ant Design** 5.x
- **Vite** 5.x
- **React Router** 6.x
- **Zustand** (상태 관리)

## Customizing Mock Data

Mock 데이터를 수정하려면 `src/mocks/data/` 디렉토리의 파일들을 편집하세요.

### 예시: 서비스 추가

```typescript
// src/mocks/data/services.ts
export const mockServices: MockService[] = [
  // 기존 서비스들...
  {
    id: 8,
    name: 'new-service',
    description: '새로운 서비스',
    status: 'running',
    // ...
  },
];
```

## Notes

- 이 프로젝트는 디자인 검토 및 기획 확인 용도로만 사용됩니다.
- 실제 백엔드와 연결되지 않습니다.
- 모든 데이터는 브라우저 메모리 또는 localStorage에만 저장됩니다.
- 페이지 새로고침 시 Mock 데이터는 초기 상태로 리셋됩니다.

## Related Projects

- **k8scontrol**: 실제 백엔드와 연동되는 프로덕션 버전

---

**Version**: 1.0.0
**Created for**: Design/Planning Team Preview
