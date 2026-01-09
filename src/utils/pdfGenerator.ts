/**
 * PDF Generator Utilities
 * 파이프라인 리포트 PDF 생성 유틸리티
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type {
    PIPELINE_STEPS,
    PipelineReportData,
    PipelineStepName,
} from '../types/pipeline';
import { formatDate } from './dateHelpers';

/**
 * PDF 문서 설정
 */
const PDF_CONFIG = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  compress: true,
};

/**
 * PDF 색상 팔레트
 */
const COLORS = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  text: {
    dark: '#262626',
    gray: '#595959',
    light: '#8c8c8c',
  },
  background: {
    light: '#fafafa',
    white: '#ffffff',
  },
  border: '#d9d9d9',
};

/**
 * 상태에 따른 색상 반환
 */
function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    success: COLORS.success,
    running: COLORS.primary,
    pending: COLORS.warning,
    failed: COLORS.error,
    cancelled: COLORS.text.light,
  };
  return statusMap[status.toLowerCase()] || COLORS.text.gray;
}

/**
 * PDF 헤더 추가
 */
function addPDFHeader(
  doc: jsPDF,
  stepName: PipelineStepName,
  stepConfig: (typeof PIPELINE_STEPS)[PipelineStepName]
): void {
  const pageWidth = doc.internal.pageSize.getWidth();

  // 배경색 상단 바
  doc.setFillColor(stepConfig.color);
  doc.rect(0, 0, pageWidth, 25, 'F');

  // 로고 및 제목
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('KIWI', 15, 12);

  doc.setFontSize(16);
  doc.text(`${stepConfig.displayName} 리포트`, 15, 20);

  // 생성 날짜
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `생성일: ${formatDate(new Date(), 'datetime')}`,
    pageWidth - 15,
    12,
    {
      align: 'right',
    }
  );

  // 하단 구분선
  doc.setDrawColor(stepConfig.color);
  doc.setLineWidth(0.5);
  doc.line(0, 25, pageWidth, 25);
}

/**
 * PDF 푸터 추가
 */
function addPDFFooter(doc: jsPDF, pageNumber: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

  doc.setTextColor(COLORS.text.light);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, {
    align: 'center',
  });
  doc.text('© KIWI - Pipeline Report', pageWidth - 15, pageHeight - 10, {
    align: 'right',
  });
}

/**
 * 섹션 제목 추가
 */
function addSectionTitle(
  doc: jsPDF,
  title: string,
  yPos: number,
  color: string = COLORS.primary
): number {
  doc.setFillColor(color);
  doc.rect(15, yPos, 5, 6, 'F');

  doc.setTextColor(COLORS.text.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 22, yPos + 4.5);

  return yPos + 10;
}

/**
 * 키-값 쌍 추가
 */
function addKeyValue(
  doc: jsPDF,
  key: string,
  value: string,
  yPos: number
): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text.gray);
  doc.text(`${key}:`, 20, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text.dark);
  doc.text(value, 60, yPos);

  return yPos + 6;
}

/**
 * 상태 배지 추가
 */
function addStatusBadge(
  doc: jsPDF,
  status: string,
  xPos: number,
  yPos: number
): void {
  const statusColor = getStatusColor(status);
  const badgeWidth = 25;
  const badgeHeight = 6;

  // 배지 배경
  doc.setFillColor(statusColor);
  doc.roundedRect(xPos, yPos - 4, badgeWidth, badgeHeight, 2, 2, 'F');

  // 배지 텍스트
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(status.toUpperCase(), xPos + badgeWidth / 2, yPos, {
    align: 'center',
  });

  doc.setTextColor(COLORS.text.dark);
}

/**
 * 로그 섹션 추가
 */
function addLogsSection(
  doc: jsPDF,
  logs: Array<{ timestamp: string; level: string; message: string }>,
  startY: number
): number {
  const yPos = addSectionTitle(doc, '실행 로그', startY, COLORS.text.gray);

  doc.setFillColor(COLORS.background.light);
  doc.rect(15, yPos, 180, Math.min(logs.length * 5 + 5, 80), 'F');

  doc.setFontSize(8);
  doc.setFont('courier', 'normal');

  const maxLogsToShow = Math.min(logs.length, 15);
  for (let i = 0; i < maxLogsToShow; i++) {
    const log = logs[i];
    const logYPos = yPos + 5 + i * 5;

    // 로그 레벨 색상
    const levelColor =
      log.level === 'ERROR'
        ? COLORS.error
        : log.level === 'WARN'
          ? COLORS.warning
          : COLORS.text.gray;

    doc.setTextColor(levelColor);
    doc.text(`[${log.level}]`, 18, logYPos);

    doc.setTextColor(COLORS.text.light);
    doc.text(formatDate(log.timestamp, 'time'), 35, logYPos);

    doc.setTextColor(COLORS.text.dark);
    const message = log.message.substring(0, 80);
    doc.text(message, 55, logYPos);
  }

  if (logs.length > maxLogsToShow) {
    doc.setTextColor(COLORS.text.light);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `... 외 ${logs.length - maxLogsToShow}개의 로그`,
      18,
      yPos + 5 + maxLogsToShow * 5
    );
  }

  return yPos + Math.min(logs.length * 5 + 10, 85);
}

/**
 * 파이프라인 단계 리포트 PDF 생성
 */
export async function generatePipelineStepPDF(
  reportData: PipelineReportData,
  stepConfig: (typeof PIPELINE_STEPS)[PipelineStepName]
): Promise<void> {
  const doc = new jsPDF(PDF_CONFIG);
  const { pipeline, step, serviceName, serviceNamespace, infraName } =
    reportData;

  // 헤더 추가
  addPDFHeader(doc, step.step_name, stepConfig);

  let yPos = 35;

  // 기본 정보 섹션
  yPos = addSectionTitle(doc, '기본 정보', yPos, stepConfig.color);
  yPos = addKeyValue(doc, '서비스명', serviceName, yPos);
  if (serviceNamespace) {
    yPos = addKeyValue(doc, '네임스페이스', serviceNamespace, yPos);
  }
  if (infraName) {
    yPos = addKeyValue(doc, '인프라', infraName, yPos);
  }
  yPos = addKeyValue(doc, '파이프라인 ID', `#${pipeline.id}`, yPos);
  yPos = addKeyValue(doc, '단계', stepConfig.displayName, yPos);

  // 상태 배지
  addStatusBadge(doc, step.status, 20, yPos);
  yPos += 8;

  // 실행 정보 섹션
  yPos = addSectionTitle(doc, '실행 정보', yPos, stepConfig.color);

  if (step.started_at) {
    yPos = addKeyValue(
      doc,
      '시작 시간',
      formatDate(step.started_at, 'datetime'),
      yPos
    );
  }
  if (step.completed_at) {
    yPos = addKeyValue(
      doc,
      '완료 시간',
      formatDate(step.completed_at, 'datetime'),
      yPos
    );
  }
  if (step.duration_seconds) {
    const duration = `${step.duration_seconds}초 (${Math.floor(step.duration_seconds / 60)}분 ${step.duration_seconds % 60}초)`;
    yPos = addKeyValue(doc, '소요 시간', duration, yPos);
  }
  if (step.progress_percentage !== undefined) {
    yPos = addKeyValue(doc, '진행률', `${step.progress_percentage}%`, yPos);
  }

  yPos += 5;

  // 에러 메시지 (있는 경우)
  if (step.error_message) {
    yPos = addSectionTitle(doc, '오류 정보', yPos, COLORS.error);
    doc.setFillColor(255, 240, 240);
    doc.rect(15, yPos, 180, 20, 'F');
    doc.setFontSize(9);
    doc.setFont('courier', 'normal');
    doc.setTextColor(COLORS.error);
    const errorLines = doc.splitTextToSize(step.error_message, 170);
    doc.text(errorLines.slice(0, 3), 18, yPos + 5);
    yPos += 25;
  }

  // 상세 데이터 (단계별 커스텀)
  if (step.details_data && Object.keys(step.details_data).length > 0) {
    yPos = addSectionTitle(doc, '상세 결과', yPos, stepConfig.color);
    // 단계별로 다르게 처리 가능
    yPos = addDetailedResults(doc, step.step_name, step.details_data, yPos);
  }

  // 실행 로그
  if (step.execution_logs && step.execution_logs.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 35;
    }
    yPos = addLogsSection(doc, step.execution_logs, yPos);
  }

  // 푸터 추가
  addPDFFooter(doc, 1);

  // PDF 저장
  const filename = `${serviceName}_${stepConfig.displayName}_${formatDate(new Date(), 'short').replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * 단계별 상세 결과 추가 (커스터마이징 가능)
 */
function addDetailedResults(
  doc: jsPDF,
  stepName: PipelineStepName,
  detailsData: Record<string, unknown>,
  startY: number
): number {
  let yPos = startY;

  //  [수정] SAST, SCA, DAST 케이스 제거 - 분석 결과는 각 단계의 모달에서 표시
  switch (stepName) {
    case 'build':
      // 빌드 결과
      yPos = addBuildResults(doc, detailsData, yPos);
      break;
    case 'deploy':
      // 배포 결과
      yPos = addDeployResults(doc, detailsData, yPos);
      break;
    default:
      // 일반 JSON 데이터
      yPos = addGenericResults(doc, detailsData, yPos);
  }

  return yPos;
}

/**
 * 보안 분석 결과 추가
 */
function _addSecurityResults(
  doc: jsPDF,
  data: Record<string, unknown>,
  startY: number
): number {
  let yPos = startY;

  // 취약점 통계
  const vulnStats = data.vulnerabilityStats as Record<string, number>;
  if (vulnStats) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    const stats = [
      {
        label: 'Critical',
        count: vulnStats.critical || 0,
        color: COLORS.error,
      },
      { label: 'High', count: vulnStats.high || 0, color: '#ff7875' },
      {
        label: 'Medium',
        count: vulnStats.medium || 0,
        color: COLORS.warning,
      },
      { label: 'Low', count: vulnStats.low || 0, color: '#ffc53d' },
      { label: 'Info', count: vulnStats.info || 0, color: COLORS.primary },
    ];

    stats.forEach((stat, index) => {
      const xPos = 20 + index * 35;
      doc.setFillColor(stat.color);
      doc.rect(xPos, yPos, 30, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(stat.label, xPos + 15, yPos + 4, { align: 'center' });
      doc.setFontSize(14);
      doc.text(stat.count.toString(), xPos + 15, yPos + 10, {
        align: 'center',
      });
      doc.setFontSize(10);
    });

    yPos += 20;
  }

  return yPos;
}

/**
 * 빌드 결과 추가
 */
function addBuildResults(
  doc: jsPDF,
  data: Record<string, unknown>,
  startY: number
): number {
  let yPos = startY;

  if (data.imageName) {
    yPos = addKeyValue(doc, '이미지 이름', data.imageName as string, yPos);
  }
  if (data.imageTag) {
    yPos = addKeyValue(doc, '이미지 태그', data.imageTag as string, yPos);
  }
  if (data.imageSize) {
    yPos = addKeyValue(doc, '이미지 크기', data.imageSize as string, yPos);
  }

  return yPos + 5;
}

/**
 * 배포 결과 추가
 */
function addDeployResults(
  doc: jsPDF,
  data: Record<string, unknown>,
  startY: number
): number {
  let yPos = startY;

  if (data.replicas) {
    yPos = addKeyValue(doc, '레플리카 수', data.replicas as string, yPos);
  }
  if (data.deploymentStatus) {
    yPos = addKeyValue(doc, '배포 상태', data.deploymentStatus as string, yPos);
  }

  return yPos + 5;
}

/**
 * 일반 JSON 결과 추가
 */
function addGenericResults(
  doc: jsPDF,
  data: Record<string, unknown>,
  startY: number
): number {
  let yPos = startY;

  doc.setFontSize(9);
  doc.setFont('courier', 'normal');

  const jsonStr = JSON.stringify(data, null, 2);
  const lines = jsonStr.split('\n').slice(0, 10);

  lines.forEach(line => {
    if (yPos > 270) return;
    doc.setTextColor(COLORS.text.dark);
    doc.text(line.substring(0, 80), 18, yPos);
    yPos += 4;
  });

  return yPos + 5;
}

/**
 * HTML 요소를 PDF로 변환
 */
export async function exportElementToPDF(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF(PDF_CONFIG);

  const imgWidth = 190;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pdf.internal.pageSize.getHeight();

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }

  pdf.save(filename);
}
