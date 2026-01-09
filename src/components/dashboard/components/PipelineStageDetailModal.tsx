import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Typography,
  Space,
  Alert,
  Spin,
  Empty,
  Descriptions,
  Tag,
  Badge,
  Button,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  SecurityScanOutlined,
  AuditOutlined,
  BugOutlined,
} from '@ant-design/icons';
import type {
  AnalysisStatus,
  AnalysisResult,
  PipelineStepName,
  AnalysisType,
  BuildErrorAnalysis,
} from '../../../types/pipeline';
import { PIPELINE_STEPS, ANALYSIS_CONFIGS } from '../../../types/pipeline';
import DastResultContent from '../../gits/DastResultContent';
import SastResultContent from '../../gits/SastResultContent';
import ScaResultContent from './analysis/ScaResultContent';
import type { DastResult } from '../../../types/securityAnalysis';
import type { SastResultData } from '../../../types/sast';
import type { ScaResult } from '../../../types/securityAnalysis';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface PipelineStageDetailModalProps {
  visible: boolean;
  onClose: () => void;
  stepName: PipelineStepName;
  stepData?: {
    status: string;
    started_at?: string;
    completed_at?: string;
    duration_seconds?: number;
    analysis?: AnalysisResult;
    //  [추가] 각 분석별 상세 결과 데이터
    sastResult?: SastResultData | null;
    scaResult?: ScaResult | null;
    dastResult?: DastResult | null;
    //  [추가] 에러 분석 데이터
    details_data?: {
      error_analysis?: BuildErrorAnalysis | Record<string, unknown>;
      [key: string]: unknown;
    };
  };
  isLoading?: boolean;
}

// 분석 상태 표시 컴포넌트
const AnalysisStatusDisplay: React.FC<{
  status: AnalysisStatus;
  analysisType: AnalysisType;
}> = ({ status, analysisType }) => {
  const config = ANALYSIS_CONFIGS[analysisType];

  const getStatusInfo = () => {
    switch (status) {
      case 'not_executed':
        return {
          icon: (
            <ExclamationCircleOutlined
              style={{ fontSize: 48, color: '#8c8c8c' }}
            />
          ),
          color: '#8c8c8c',
          text: '분석이 수행되지 않았습니다.',
          badge: 'default' as const,
        };
      case 'running':
        return {
          icon: (
            <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />
          ),
          color: '#1890ff',
          text: '분석 진행 중...',
          badge: 'processing' as const,
        };
      case 'failed':
        return {
          icon: (
            <CloseCircleOutlined style={{ fontSize: 48, color: '#f5222d' }} />
          ),
          color: '#f5222d',
          text: '분석 실패',
          badge: 'error' as const,
        };
      case 'completed':
        return {
          icon: (
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          ),
          color: '#52c41a',
          text: '분석 완료',
          badge: 'success' as const,
        };
      default:
        return {
          icon: (
            <ExclamationCircleOutlined
              style={{ fontSize: 48, color: '#8c8c8c' }}
            />
          ),
          color: '#8c8c8c',
          text: '알 수 없는 상태',
          badge: 'default' as const,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card style={{ textAlign: 'center', minHeight: 300 }}>
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        <div>{statusInfo.icon}</div>
        <div>
          <Title level={4} style={{ color: statusInfo.color, marginBottom: 8 }}>
            {statusInfo.text}
          </Title>
          <Text type='secondary'>{config.description}</Text>
        </div>
        <Badge
          status={statusInfo.badge}
          text={<Text strong>{statusInfo.text}</Text>}
        />
      </Space>
    </Card>
  );
};

//  [신규] 빌드 에러 가이드 표시 컴포넌트
const ErrorGuideDisplay: React.FC<{
  errorAnalysis: BuildErrorAnalysis;
}> = ({ errorAnalysis }) => {
  return (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      {/* 에러 제목 및 설명 */}
      <Alert
        message={
          <Space>
            <CloseCircleOutlined />
            <Text strong>{errorAnalysis.title}</Text>
          </Space>
        }
        description={errorAnalysis.description}
        type='error'
        showIcon={false}
      />

      {/* 해결 방법 */}
      {errorAnalysis.solutions && errorAnalysis.solutions.length > 0 && (
        <Card title='💡 해결 방법' size='small'>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {errorAnalysis.solutions.map((solution, index) => (
              <li key={index} style={{ marginBottom: 8 }}>
                <Text>{solution}</Text>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Dockerfile 수정 제안 */}
      {errorAnalysis.dockerfile_fix &&
        errorAnalysis.dockerfile_fix.trim() !== '' && (
          <Card title='📝 Dockerfile 수정 제안' size='small'>
            <pre
              style={{
                backgroundColor: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                margin: 0,
                fontSize: 12,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              }}
            >
              {errorAnalysis.dockerfile_fix}
            </pre>
            {errorAnalysis.is_fixable && (
              <Alert
                message='이 수정 사항은 자동으로 적용 가능합니다.'
                type='info'
                showIcon
                style={{ marginTop: 12 }}
              />
            )}
          </Card>
        )}

      {/* 관련 문서 링크 */}
      {errorAnalysis.related_docs && errorAnalysis.related_docs.length > 0 && (
        <Card title='📚 관련 문서' size='small'>
          <Space direction='vertical' size='small'>
            {errorAnalysis.related_docs.map((doc, index) => (
              <a
                key={index}
                href={doc}
                target='_blank'
                rel='noopener noreferrer'
              >
                {doc}
              </a>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  );
};

//  [수정] 분석 결과 상세 표시 컴포넌트 - 각 분석별 전용 컴포넌트 사용
const AnalysisResultDetail: React.FC<{
  analysis?: AnalysisResult;
  analysisType: AnalysisType;
  sastResult?: SastResultData | null;
  scaResult?: ScaResult | null;
  dastResult?: DastResult | null;
}> = ({ analysis, analysisType, sastResult, scaResult, dastResult }) => {
  // 분석이 실행되지 않은 경우
  if (!analysis || analysis.status === 'not_executed') {
    return (
      <AnalysisStatusDisplay
        status='not_executed'
        analysisType={analysisType}
      />
    );
  }

  // 분석이 진행 중이거나 실패한 경우
  if (analysis.status === 'running' || analysis.status === 'failed') {
    return (
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <AnalysisStatusDisplay
          status={analysis.status}
          analysisType={analysisType}
        />

        {(analysis.status === 'running' || analysis.status === 'failed') && (
          <Card title='분석 정보' size='small'>
            <Descriptions column={1} size='small'>
              {analysis.started_at && (
                <Descriptions.Item label='시작 시간'>
                  {new Date(analysis.started_at).toLocaleString('ko-KR')}
                </Descriptions.Item>
              )}
              {analysis.completed_at && (
                <Descriptions.Item label='완료 시간'>
                  {new Date(analysis.completed_at).toLocaleString('ko-KR')}
                </Descriptions.Item>
              )}
              {analysis.duration_seconds !== undefined && (
                <Descriptions.Item label='소요 시간'>
                  {Math.floor(analysis.duration_seconds / 60)}분{' '}
                  {analysis.duration_seconds % 60}초
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {analysis.status === 'failed' && analysis.error_message && (
          <Alert
            message='에러 메시지'
            description={analysis.error_message}
            type='error'
            showIcon
          />
        )}
      </Space>
    );
  }

  //  [수정] 분석이 완료된 경우 - 각 분석별 전용 컴포넌트 사용
  if (analysis.status === 'completed') {
    return (
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        {/* 분석 기본 정보 */}
        <Card title='분석 정보' size='small'>
          <Descriptions column={2} size='small'>
            <Descriptions.Item label='상태'>
              <Tag color='success'>완료</Tag>
            </Descriptions.Item>
            {analysis.started_at && (
              <Descriptions.Item label='시작 시간'>
                {new Date(analysis.started_at).toLocaleString('ko-KR')}
              </Descriptions.Item>
            )}
            {analysis.completed_at && (
              <Descriptions.Item label='완료 시간'>
                {new Date(analysis.completed_at).toLocaleString('ko-KR')}
              </Descriptions.Item>
            )}
            {analysis.duration_seconds !== undefined && (
              <Descriptions.Item label='소요 시간'>
                {Math.floor(analysis.duration_seconds / 60)}분{' '}
                {analysis.duration_seconds % 60}초
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 각 분석별 전용 컴포넌트 렌더링 */}
        {analysisType === 'sast' && sastResult && (
          <SastResultContent
            sastResult={sastResult}
            loading={false}
            showTabs={false}
          />
        )}
        {analysisType === 'sca' && scaResult && (
          <ScaResultContent scaResult={scaResult} loading={false} />
        )}
        {analysisType === 'dast' && dastResult && (
          <DastResultContent dastResult={dastResult} loading={false} />
        )}

        {/* 결과 데이터가 없는 경우 */}
        {analysisType === 'sast' && !sastResult && (
          <Empty description='SAST 분석 결과 데이터를 불러오는 중입니다...' />
        )}
        {analysisType === 'sca' && !scaResult && (
          <Empty description='SCA 분석 결과 데이터를 불러오는 중입니다...' />
        )}
        {analysisType === 'dast' && !dastResult && (
          <Empty description='DAST 분석 결과 데이터를 불러오는 중입니다...' />
        )}
      </Space>
    );
  }

  return null;
};

const PipelineStageDetailModal: React.FC<PipelineStageDetailModalProps> = ({
  visible,
  onClose,
  stepName,
  stepData,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const stepConfig = PIPELINE_STEPS[stepName];

  const getAnalysisIcon = (type: AnalysisType) => {
    switch (type) {
      case 'sast':
        return <SecurityScanOutlined />;
      case 'sca':
        return <AuditOutlined />;
      case 'dast':
        return <BugOutlined />;
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            paddingRight: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
            }}
          >
            <span style={{ fontSize: 24, color: '#1890ff' }}>
              {stepConfig.icon}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {stepConfig.displayName} 단계
            </span>
          </div>
          <Button size='small' onClick={onClose}>
            닫기
          </Button>
        </div>
      }
      open={visible}
      onCancel={onClose}
      closeIcon={false}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size='large' />
        </div>
      ) : (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 개요 탭 */}
          <TabPane tab='개요' key='overview'>
            <Card>
              <Descriptions column={1} size='small'>
                <Descriptions.Item label='단계 이름'>
                  {stepConfig.displayName}
                </Descriptions.Item>
                <Descriptions.Item label='설명'>
                  {stepConfig.description}
                </Descriptions.Item>
                {stepData?.status && (
                  <Descriptions.Item label='상태'>
                    <Tag
                      color={
                        stepData.status === 'success'
                          ? 'green'
                          : stepData.status === 'running'
                            ? 'blue'
                            : stepData.status === 'failed'
                              ? 'red'
                              : 'default'
                      }
                    >
                      {stepData.status.toUpperCase()}
                    </Tag>
                  </Descriptions.Item>
                )}
                {stepData?.started_at && (
                  <Descriptions.Item label='시작 시간'>
                    {new Date(stepData.started_at).toLocaleString('ko-KR')}
                  </Descriptions.Item>
                )}
                {stepData?.completed_at && (
                  <Descriptions.Item label='완료 시간'>
                    {new Date(stepData.completed_at).toLocaleString('ko-KR')}
                  </Descriptions.Item>
                )}
                {stepData?.duration_seconds !== undefined && (
                  <Descriptions.Item label='소요 시간'>
                    {Math.floor(stepData.duration_seconds / 60)}분{' '}
                    {stepData.duration_seconds % 60}초
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/*  [신규] 빌드 실패 시 에러 가이드 표시 */}
            {stepData?.status === 'failed' &&
              stepData.details_data?.error_analysis &&
              typeof stepData.details_data.error_analysis === 'object' && (
                <div style={{ marginTop: 16 }}>
                  <ErrorGuideDisplay
                    errorAnalysis={
                      stepData.details_data.error_analysis as BuildErrorAnalysis
                    }
                  />
                </div>
              )}
          </TabPane>

          {/*  [수정] 분석 탭 (해당하는 경우만 표시) - 분석 결과 데이터 전달 */}
          {stepConfig.analysisType && stepConfig.analysisDisplayName && (
            <TabPane
              tab={
                <Space>
                  {getAnalysisIcon(stepConfig.analysisType)}
                  {stepConfig.analysisDisplayName}
                </Space>
              }
              key='analysis'
            >
              <AnalysisResultDetail
                analysis={stepData?.analysis}
                analysisType={stepConfig.analysisType}
                sastResult={stepData?.sastResult}
                scaResult={stepData?.scaResult}
                dastResult={stepData?.dastResult}
              />
            </TabPane>
          )}
        </Tabs>
      )}
    </Modal>
  );
};

export default PipelineStageDetailModal;
