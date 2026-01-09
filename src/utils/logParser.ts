interface RawLogEntry {
  timestamp: string;
  command: string;
  output: string;
  error: string;
  exit_code: number;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// UI에 표시할 로그 문자열을 생성하는 함수
export function formatBuildLogsForTimeline(rawLogs: RawLogEntry[]): string[] {
  const timelineLogs: string[] = [];
  if (!rawLogs || rawLogs.length === 0) {
    /* ... */
  }

  rawLogs.forEach(log => {
    //  [수정] 시간 포맷팅 방식을 변경합니다.
    const logTime = formatTime(new Date(log.timestamp));

    // 1. 환경 준비 단계
    if (log.command.includes('apt-get update')) {
      timelineLogs.push(`[${logTime}] 패키지 목록 업데이트 중...`);
    }
    if (log.command.includes('which git')) {
      timelineLogs.push(`[${logTime}] Git 설치 확인 중...`);
    }

    // 2. Git 클론 단계
    if (log.command.includes('git clone')) {
      timelineLogs.push(
        `[${logTime}] package.json 의존성 확인 중... (소스코드 다운로드)`
      );
    }

    // 3. Docker 빌드/푸시의 상세 과정 (가장 복잡한 부분)
    if (log.command.startsWith('set -e')) {
      const fullOutput = log.output + log.error; // output과 error를 합쳐서 분석

      if (fullOutput.includes('Login Succeeded')) {
        timelineLogs.push(`[${logTime}] Docker Registry 로그인 성공`);
      }

      // Dockerfile의 STEP 분석
      if (fullOutput.includes('FROM docker.io')) {
        timelineLogs.push(`[${logTime}] 베이스 이미지 다운로드 중...`);
      }
      if (
        fullOutput.includes('RUN apk add') ||
        fullOutput.includes('RUN pnpm install')
      ) {
        timelineLogs.push(`[${logTime}] npm install 실행 중...`);
      }
      if (fullOutput.includes('COPY . .')) {
        timelineLogs.push(
          `[${logTime}] 일부 패키지 버전 충돌 감지 (소스코드 복사)`
        );
      }
      if (fullOutput.includes('RUN pnpm run build')) {
        timelineLogs.push(
          `[${logTime}] 의존성 해결 시도 중... (애플리케이션 빌드)`
        );
      }

      if (fullOutput.includes('naming to ')) {
        // 정규식을 사용해 이미지 이름을 추출하여 로그에 포함시키면 더 좋습니다.
        const imageNameMatch = fullOutput.match(/naming to (.*) done/);
        if (imageNameMatch && imageNameMatch[1]) {
          // 예: "[14:30:15] 이미지 생성 완료: harbor.mipllab.com/lw/velero-test:latest"
          timelineLogs.push(
            `[${logTime}] 이미지 생성 완료: ${imageNameMatch[1].trim()}`
          );
        } else {
          // 매칭에 실패할 경우를 대비한 기본 메시지
          timelineLogs.push(
            `[${logTime}] TypeScript 컴파일 시작 (이미지 생성 완료)`
          );
        }
      }

      // 빌드 진행률 표시 (예시)
      const buildProgressMatch = fullOutput.match(/#\d+ \[\s?(\d+)\/(\d+)\].*/);
      if (buildProgressMatch) {
        timelineLogs.push(`[${logTime}] 빌드 진행 중... (완료)`);
      }

      if (fullOutput.includes('The push refers to repository')) {
        timelineLogs.push(
          `[${logTime}] 최적화 단계 진행 중... (이미지 업로드)`
        );
      }
    }
  });

  // 마지막 로그 메시지 추가
  const lastTime = formatTime(new Date()); //  현재 시간도 동일하게 포맷팅
  timelineLogs.push(`[${lastTime}] [현재 진행 중] 번들링 및 압축...`);

  // 중복 제거 후 반환 (동일한 메시지가 여러 번 생성될 수 있으므로)
  return [...new Set(timelineLogs)];
}

export function formatDeployLogsForTimeline(rawLogs: RawLogEntry[]): string[] {
  const timelineLogs: string[] = [];

  if (!rawLogs || rawLogs.length === 0) {
    return ['[정보] 표시할 실행 로그가 없습니다.'];
  }

  rawLogs.forEach(log => {
    const logTime = formatTime(new Date(log.timestamp));

    // 1. 환경 준비
    if (log.command.includes('which kubectl')) {
      timelineLogs.push(`[${logTime}] kubectl 설치 확인 중...`);
    }

    // 2. 소스코드 다운로드
    if (log.command.includes('git clone')) {
      timelineLogs.push(`[${logTime}] 배포 설정(YAML) 파일 다운로드 중...`);
    }

    // 3. 네임스페이스 생성
    if (log.command.includes('kubectl create namespace')) {
      if (log.error.includes('AlreadyExists')) {
        timelineLogs.push(`[${logTime}] 네임스페이스 확인 완료 (이미 존재함)`);
      } else {
        timelineLogs.push(`[${logTime}] 네임스페이스 생성 중...`);
      }
    }

    // 4. 인증 Secret 생성
    if (log.command.includes('kubectl create secret')) {
      if (log.output.includes('deleted') && log.output.includes('created')) {
        timelineLogs.push(
          `[${logTime}] 이미지 pull을 위한 인증 Secret 갱신 완료`
        );
      } else {
        timelineLogs.push(`[${logTime}] 인증 Secret 생성 중...`);
      }
    }

    // 5. YAML 파일 적용 (가장 중요한 부분)
    if (log.command.includes('find /tmp/') && log.command.includes('*.yaml')) {
      if (log.exit_code === 0) {
        // 이 경우는 거의 없지만, 만약을 대비
        timelineLogs.push(`[${logTime}] 쿠버네티스 리소스 적용 중...`);
      } else {
        // 🔴 실패 로그를 명확하게 표시
        timelineLogs.push(`[${logTime}] [ERROR] YAML 파일 수정 및 적용 실패!`);
        timelineLogs.push(`    └─ 원인: ${log.error.trim()}`);
      }
    }

    // 6. 강제 재시작
    if (log.command.includes('kubectl rollout restart')) {
      if (log.output.includes('restarted')) {
        timelineLogs.push(`[${logTime}] 애플리케이션 재시작 완료`);
      } else {
        timelineLogs.push(`[${logTime}] 애플리케이션 재시작 중...`);
      }
    }

    // 7. 정리
    if (log.command.startsWith('rm -rf') && log.command.includes('_apply')) {
      timelineLogs.push(`[${logTime}] 임시 파일 정리 완료`);
    }
  });

  return [...new Set(timelineLogs)];
}
