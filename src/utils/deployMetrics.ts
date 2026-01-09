import { PipelineLogEntry } from '../lib/api/pipeline';

export interface DeployMetrics {
  // 배포 상태
  status: 'success' | 'failed' | 'in_progress' | 'pending';
  deployTime?: string; // 마지막 배포 시간
  duration?: number; // 배포 소요 시간 (초)

  // 리소스 정보
  namespace?: string;
  imageName?: string; // 단일 이미지 (하위 호환성)
  imageTag?: string; // 단일 이미지 태그 (하위 호환성)
  images?: Array<{
    // 여러 이미지 지원
    name: string;
    tag: string;
    fullPath: string;
  }>;

  // 배포 단계 정보
  steps: {
    name: string;
    status: 'success' | 'failed' | 'skipped' | 'in_progress';
    message?: string;
    timestamp?: string;
  }[];

  // 인프라 정보
  clusterInfo?: {
    masterNode?: string;
    sshHops?: number;
  };

  // 에러 정보
  errors: string[];
  warnings: string[];
}

/**
 * 배포 로그에서 메트릭을 추출합니다.
 */
export function extractDeployMetrics(logs: PipelineLogEntry[]): DeployMetrics {
  const metrics: DeployMetrics = {
    status: 'pending',
    steps: [],
    errors: [],
    warnings: [],
    images: [], // 여러 이미지 수집을 위한 배열 초기화
  };

  if (!logs || logs.length === 0) {
    return metrics;
  }

  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];

  // 배포 시간 계산
  if (firstLog.timestamp && lastLog.timestamp) {
    try {
      const startTime = new Date(firstLog.timestamp);
      const endTime = new Date(lastLog.timestamp);

      //  [추가] 유효한 날짜인지 확인
      if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
        const durationMs = endTime.getTime() - startTime.getTime();
        //  [추가] 음수 시간 방지 (시작 시간이 종료 시간보다 늦은 경우)
        if (durationMs >= 0) {
          metrics.duration = Math.floor(durationMs / 1000);
          metrics.deployTime = endTime.toLocaleString('ko-KR');
        }
      }
    } catch (error) {
      // 타임스탬프 파싱 실패 시 무시
      console.warn('[deployMetrics] 배포 시간 계산 실패:', error);
    }
  }

  //  [수정] 타임아웃 에러 감지 - 실제 에러인 경우만 감지 (docker-compose.yaml 내용 제외)
  const hasTimeoutError = logs.some(log => {
    // exit_code가 0이면 성공이므로 타임아웃이 아님
    if (log.exit_code === 0) {
      return false;
    }
    // docker-compose.yaml 출력은 제외 (healthcheck timeout 설정이 포함됨)
    if (
      log.command.includes('cat docker-compose') ||
      log.output.includes('Docker Compose file updated successfully')
    ) {
      return false;
    }
    // 실제 에러에서만 timeout 감지
    return (
      (log.error && log.error.toLowerCase().includes('timeout')) ||
      (log.output && log.output.toLowerCase().includes('timed out'))
    );
  });

  // 각 로그를 분석하여 단계 및 메트릭 추출
  logs.forEach(log => {
    const fullOutput = log.output + log.error;
    const isError = log.exit_code !== 0;

    //  [추가] 타임스탬프 안전하게 파싱
    let timestamp = '';
    try {
      if (log.timestamp) {
        const date = new Date(log.timestamp);
        if (!isNaN(date.getTime())) {
          timestamp = date.toLocaleTimeString();
        }
      }
    } catch (error) {
      console.warn('[deployMetrics] 타임스탬프 파싱 실패:', error);
    }

    //  [수정] 타임아웃 에러를 에러 목록에 추가 - 실제 에러인 경우만 (hasTimeoutError와 동일한 로직)
    if (log.exit_code !== 0) {
      // docker-compose.yaml 출력은 제외
      if (
        !log.command.includes('cat docker-compose') &&
        !log.output.includes('Docker Compose file updated successfully')
      ) {
        // 실제 에러에서만 timeout 감지
        if (
          (log.error && log.error.toLowerCase().includes('timeout')) ||
          (log.output && log.output.toLowerCase().includes('timed out'))
        ) {
          metrics.errors.push(`타임아웃 에러: ${log.error || log.output}`);
        }
      }
    }

    // 1. kubectl 설치 확인
    if (log.command.includes('which kubectl')) {
      metrics.steps.push({
        name: 'kubectl 설치 확인',
        status: isError ? 'failed' : 'success',
        message: isError ? 'kubectl을 찾을 수 없습니다' : 'kubectl 사용 가능',
        timestamp,
      });
    }

    // 2. 소스코드 다운로드 (Git clone)
    if (log.command.includes('git clone')) {
      const gitUrlMatch = log.command.match(/git clone (https?:\/\/[^\s]+)/);
      metrics.steps.push({
        name: '배포 설정 다운로드',
        status: isError ? 'failed' : 'success',
        message: gitUrlMatch
          ? `Git: ${gitUrlMatch[1].split('/').pop()?.replace('.git', '')}`
          : '소스코드 다운로드 완료',
        timestamp,
      });
    }

    // ===== Docker Compose 배포 단계 감지 =====

    // Docker Registry 로그인
    if (log.command.includes('docker login')) {
      const registryMatch = log.command.match(/docker login ([^\s]+)/);
      const registryUrl = registryMatch ? registryMatch[1] : 'Registry';
      metrics.steps.push({
        name: 'Registry 로그인',
        status: isError ? 'failed' : 'success',
        message: isError ? 'Registry 인증 실패' : `${registryUrl} 인증 완료`,
        timestamp,
      });
    }

    // docker-compose.yml 업데이트 (sed 명령 또는 Python 스크립트)
    const isDockerComposeUpdate =
      (log.command.includes('sed -i') &&
        log.command.includes('docker-compose.yml')) ||
      log.command.includes('update_compose.py') ||
      log.output.includes('Docker Compose file updated successfully');

    if (isDockerComposeUpdate) {

      // sed 명령어 자체에서는 태그만 추출 (백레퍼런스나 정규식 패턴 제외)
      const sedTagMatch = log.command.match(
        /sed.*'s\|[^|]*\|image:\s*[^:]+:[^:]+:[^|]*:([^\s|']+)/
      );
      if (sedTagMatch && !sedTagMatch[1].includes('\\')) {
        metrics.imageTag = sedTagMatch[1];
      }

      // cat docker-compose.yml 출력에서 실제 이미지 추출 (가장 정확함)
      if (!isError && log.output) {
        const imageLines = log.output.matchAll(/^\s*image:\s*([^\s]+)/gm);
        for (const match of imageLines) {
          const fullImage = match[1];

          // harbor.mipllab.com/project/image:tag 형태 파싱
          const lastColonIndex = fullImage.lastIndexOf(':');
          if (lastColonIndex > 0) {
            const imageName = fullImage.substring(0, lastColonIndex);
            const imageTag = fullImage.substring(lastColonIndex + 1);

            // 이미 수집된 이미지가 아니면 추가
            if (!metrics.images?.some(img => img.fullPath === fullImage)) {
              metrics.images?.push({
                name: imageName,
                tag: imageTag,
                fullPath: fullImage,
              });
            }

            // 하위 호환성: 첫 번째 이미지를 단일 필드에도 저장
            if (!metrics.imageName) {
              metrics.imageName = imageName;
              metrics.imageTag = imageTag;
            }
          }
        }
      }

      metrics.steps.push({
        name: '배포 설정 업데이트',
        status: isError ? 'failed' : 'success',
        message: isError
          ? 'docker-compose.yml 수정 실패'
          : 'docker-compose.yml 업데이트 완료',
        timestamp,
      });
    }

    // 이미지 Pull
    if (
      log.command.includes('docker-compose pull') ||
      log.command.match(/docker[\s-]+compose.*pull/)
    ) {
      metrics.steps.push({
        name: '컨테이너 이미지 다운로드',
        status: isError ? 'failed' : 'success',
        message: isError ? '이미지 Pull 실패' : '이미지 다운로드 완료',
        timestamp,
      });
    }

    // 컨테이너 재시작 (down && up)
    if (
      (log.command.includes('docker-compose down') ||
        log.command.includes('docker-compose up')) &&
      !log.command.includes('ps')
    ) {
      const hasDown = log.command.includes('down');
      const hasUp = log.command.includes('up');

      metrics.steps.push({
        name: '컨테이너 재배포',
        status: isError ? 'failed' : 'success',
        message:
          hasDown && hasUp
            ? '기존 컨테이너 중지 및 재시작 완료'
            : hasUp
              ? '컨테이너 시작 완료'
              : '컨테이너 중지 완료',
        timestamp,
      });
    }

    // 배포 상태 확인
    if (
      log.command.includes('docker-compose ps') ||
      log.command.match(/docker[\s-]+compose.*ps/)
    ) {
      const runningContainers = (log.output.match(/Up\s+/g) || []).length;
      metrics.steps.push({
        name: '배포 상태 확인',
        status: isError ? 'failed' : 'success',
        message:
          runningContainers > 0
            ? `${runningContainers}개 컨테이너 실행 중`
            : '배포 상태 확인 완료',
        timestamp,
      });
    }

    // 3. 네임스페이스 생성
    if (log.command.includes('kubectl create namespace')) {
      const namespaceMatch = log.command.match(/namespace\s+([^\s]+)/);
      if (namespaceMatch) {
        metrics.namespace = namespaceMatch[1];
      }

      const alreadyExists = log.error.includes('AlreadyExists');
      metrics.steps.push({
        name: '네임스페이스 설정',
        status: alreadyExists || !isError ? 'success' : 'failed',
        message: alreadyExists
          ? `네임스페이스 '${metrics.namespace}' 확인 완료`
          : `네임스페이스 '${metrics.namespace}' 생성`,
        timestamp,
      });
    }

    // 4. Docker Registry Secret 생성
    if (log.command.includes('kubectl create secret')) {
      const secretCreated =
        fullOutput.includes('created') || fullOutput.includes('deleted');
      metrics.steps.push({
        name: 'Registry 인증 설정',
        status: secretCreated && !isError ? 'success' : 'failed',
        message: secretCreated ? '이미지 pull 인증 완료' : '인증 Secret 생성',
        timestamp,
      });

      // Docker 이미지 정보 추출
      const registryMatch = log.command.match(/docker-server=([^\s]+)/);
      if (registryMatch) {
        metrics.imageName = registryMatch[1];
      }
    }

    // 5. YAML 파일 적용 (핵심 배포 단계)
    if (log.command.includes('find /tmp/') && log.command.includes('*.yaml')) {
      const yamlFiles = fullOutput.match(/(\w+)\.yaml/g);

      if (isError) {
        // error와 output을 모두 확인하여 실제 에러 메시지 찾기
        const errorMessage = log.error || log.output || '알 수 없는 오류';
        const firstLine = errorMessage.split('\n')[0];

        metrics.steps.push({
          name: 'Kubernetes 리소스 배포',
          status: 'failed',
          message: `배포 실패: ${firstLine}`,
          timestamp,
        });
        metrics.errors.push(errorMessage);
        metrics.status = 'failed';
      } else {
        // YAML 적용 성공 메시지 파싱
        const appliedResources: string[] = [];
        const lines = fullOutput.split('\n');
        lines.forEach(line => {
          if (
            line.includes('configured') ||
            line.includes('created') ||
            line.includes('unchanged')
          ) {
            const resourceMatch = line.match(
              /(\w+)\/([^\s]+)\s+(configured|created|unchanged)/
            );
            if (resourceMatch) {
              appliedResources.push(`${resourceMatch[1]}: ${resourceMatch[2]}`);
            }
          }
        });

        metrics.steps.push({
          name: 'Kubernetes 리소스 배포',
          status: 'success',
          message:
            appliedResources.length > 0
              ? appliedResources.join(', ')
              : `${yamlFiles?.length || 0}개 리소스 적용 완료`,
          timestamp,
        });
      }
    }

    // 6. kubectl describe pod 출력에서 실제 배포된 이미지 추출
    if (
      log.command.includes('kubectl describe pod') ||
      log.command.includes('kubectl describe')
    ) {
      if (!isError && log.output) {
        // Image: harbor.mipllab.com/k8s/image:tag 형태 추출
        const imageMatches = log.output.matchAll(/^\s*Image:\s*([^\s]+)$/gm);
        for (const match of imageMatches) {
          const fullImage = match[1];

          // 백레퍼런스나 정규식 패턴 필터링
          if (
            fullImage.includes('\\') ||
            fullImage.includes('[') ||
            fullImage.includes('(')
          ) {
            continue;
          }

          const lastColonIndex = fullImage.lastIndexOf(':');
          if (lastColonIndex > 0) {
            const imageName = fullImage.substring(0, lastColonIndex);
            const imageTag = fullImage.substring(lastColonIndex + 1);

            // 이미 수집된 이미지가 아니면 추가
            if (!metrics.images?.some(img => img.fullPath === fullImage)) {
              metrics.images?.push({
                name: imageName,
                tag: imageTag,
                fullPath: fullImage,
              });
            }

            // 하위 호환성: 첫 번째 이미지를 단일 필드에도 저장
            if (!metrics.imageName) {
              metrics.imageName = imageName;
              metrics.imageTag = imageTag;
            }
          }
        }
      }
    }

    // 7. 애플리케이션 재시작
    if (log.command.includes('kubectl rollout restart')) {
      const restarted = fullOutput.includes('restarted');
      metrics.steps.push({
        name: '애플리케이션 재시작',
        status: restarted ? 'success' : isError ? 'failed' : 'in_progress',
        message: restarted ? '재시작 완료' : '재시작 진행 중',
        timestamp,
      });
    }

    // 8. 정리 작업
    if (log.command.startsWith('rm -rf') && log.command.includes('_apply')) {
      metrics.steps.push({
        name: '배포 정리',
        status: 'success',
        message: '임시 파일 삭제 완료',
        timestamp,
      });
    }

    // 9. 경고 메시지 수집
    if (fullOutput.toLowerCase().includes('warning') && !isError) {
      metrics.warnings.push(fullOutput);
    }
  });

  //  [추가] 타임아웃 에러가 있으면 명시적으로 실패 단계 추가
  if (hasTimeoutError) {
    const timeoutError = logs.find(
      log =>
        (log.error && log.error.toLowerCase().includes('timeout')) ||
        (log.output && log.output.toLowerCase().includes('timeout'))
    );

    if (timeoutError) {
      const errorMessage = timeoutError.error || timeoutError.output;

      //  [추가] 타임스탬프 안전하게 파싱
      let timestamp = '';
      try {
        if (timeoutError.timestamp) {
          const date = new Date(timeoutError.timestamp);
          if (!isNaN(date.getTime())) {
            timestamp = date.toLocaleTimeString();
          }
        }
      } catch (error) {
        console.warn('[deployMetrics] 타임아웃 타임스탬프 파싱 실패:', error);
      }

      metrics.steps.push({
        name: '배포 실행',
        status: 'failed',
        message: `타임아웃 발생: ${errorMessage.split('\n')[0]}`,
        timestamp,
      });
    }
  }

  // 전체 상태 결정
  const hasFailedStep = metrics.steps.some(s => s.status === 'failed');
  const allSuccess = metrics.steps.every(s => s.status === 'success');

  //  [디버그] 상태 결정 로그 출력

  //  [수정] 타임아웃 에러가 있으면 무조건 실패로 처리
  if (hasTimeoutError || hasFailedStep || metrics.errors.length > 0) {
    metrics.status = 'failed';
  } else if (allSuccess && metrics.steps.length > 0) {
    metrics.status = 'success';
  } else if (metrics.steps.length > 0) {
    metrics.status = 'in_progress';
  }

  return metrics;
}

/**
 * 배포 메트릭을 사람이 읽기 쉬운 문자열로 변환합니다.
 */
export function formatDeployMetrics(metrics: DeployMetrics): {
  summary: string;
  details: {
    label: string;
    value: string;
    status?: 'success' | 'error' | 'warning' | 'info';
  }[];
} {
  const details: {
    label: string;
    value: string;
    status?: 'success' | 'error' | 'warning' | 'info';
  }[] = [];

  // 배포 상태
  const statusText = {
    success: ' 배포 성공',
    failed: ' 배포 실패',
    in_progress: '⏳ 배포 진행 중',
    pending: '⏸️ 배포 대기',
  }[metrics.status];

  details.push({
    label: '배포 상태',
    value: statusText,
    status:
      metrics.status === 'success'
        ? 'success'
        : metrics.status === 'failed'
          ? 'error'
          : 'info',
  });

  // 배포 시간
  if (metrics.deployTime) {
    details.push({
      label: '배포 완료 시간',
      value: metrics.deployTime,
      status: 'info',
    });
  }

  // 소요 시간
  if (metrics.duration !== undefined) {
    const minutes = Math.floor(metrics.duration / 60);
    const seconds = metrics.duration % 60;
    details.push({
      label: '배포 소요 시간',
      value: minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`,
      status: 'info',
    });
  }

  // 네임스페이스
  if (metrics.namespace) {
    details.push({
      label: 'Kubernetes 네임스페이스',
      value: metrics.namespace,
      status: 'info',
    });
  }

  // 이미지 정보
  if (metrics.imageName) {
    details.push({
      label: '컨테이너 이미지',
      value: `${metrics.imageName}${metrics.imageTag ? ':' + metrics.imageTag : ''}`,
      status: 'info',
    });
  }

  // 배포 단계 요약
  const successSteps = metrics.steps.filter(s => s.status === 'success').length;
  const totalSteps = metrics.steps.length;
  if (totalSteps > 0) {
    details.push({
      label: '완료된 단계',
      value: `${successSteps} / ${totalSteps}`,
      status: successSteps === totalSteps ? 'success' : 'warning',
    });
  }

  // 에러 개수
  if (metrics.errors.length > 0) {
    details.push({
      label: '에러',
      value: `${metrics.errors.length}개`,
      status: 'error',
    });
  }

  // 경고 개수
  if (metrics.warnings.length > 0) {
    details.push({
      label: '경고',
      value: `${metrics.warnings.length}개`,
      status: 'warning',
    });
  }

  const summary = `배포 ${metrics.status === 'success' ? '성공' : metrics.status === 'failed' ? '실패' : '진행 중'} (${successSteps}/${totalSteps} 단계 완료)`;

  return { summary, details };
}
