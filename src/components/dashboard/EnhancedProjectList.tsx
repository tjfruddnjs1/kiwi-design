import React, { useState, useMemo, useCallback, useEffect } from 'react'; // useEffect 제거
import {
  List,
  Typography,
  Space,
  Button,
  Select,
  Input,
  Row,
  Col,
  Spin,
  Alert,
} from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
//  [수정] 아래 import들은 이제 사용하지 않으므로 제거합니다.
// import { mockProjects } from '../../data/mockProjects';
// import { serviceApi, transformServiceToProject } from '../../lib/api/service';
import {
  ProjectBasicInfo,
  PipelineFlow,
  SecurityVulnerabilities,
  HealthStatus,
  InfrastructureStatus,
} from './components';
//  [수정] Props 타입 정의를 EnhancedProjectListProps로 변경합니다.
import { EnhancedProjectListProps } from './types/projectTypes';
import type { Project } from '../../data/mockProjects';
import {
  pipelineApi,
  PipelineStep,
  PipelineMetrics,
} from '../../lib/api/pipeline';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

//  [수정] Props 타입을 부모로부터 데이터를 받는 형태로 변경합니다.
// 기존의 EnhancedProjectListProps 타입 정의가 아래와 유사하게 되어 있어야 합니다.
// export interface EnhancedProjectListProps {
//   projects: Project[];
//   loading: boolean;
//   error: string | null;
//   selectedProjectId: string | null;
//   onProjectSelect: (projectId: string) => void;
//   onQuickActionsSelect: (projectId: string) => void;
//   onAreaClick: (projectId: string, area: string) => void;
// }

const EnhancedProjectList: React.FC<EnhancedProjectListProps> = ({
  projects, //  props로 데이터를 받습니다.
  loading,
  error,
  selectedProjectId,
  onProjectSelect,
  onQuickActionsSelect,
  onAreaClick,
}) => {
  //  [제거] 데이터 로딩과 관련된 useState, useEffect는 모두 제거되었습니다.
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [pipelineStatuses, setPipelineStatuses] = useState<
    Record<string, PipelineStep[]>
  >({});
  const [isPipelinesLoading, setIsPipelinesLoading] = useState<boolean>(false);
  const [pipelineMetrics, setPipelineMetrics] = useState<
    Record<string, PipelineMetrics>
  >({});

  //  [최적화] projects 데이터가 변경될 때마다 배치 API로 파이프라인 상태를 가져옵니다.
  useEffect(() => {
    if (projects && projects.length > 0) {
      const fetchAllPipelineData = async () => {
        setIsPipelinesLoading(true);
        const dbProjects = projects.filter(p => p.dataSource === 'db');
        const serviceIds = dbProjects.map(p => parseInt(p.id, 10));

        try {
          //  배치 API 사용: N번의 개별 호출 → 1번의 배치 호출
          const [batchStatusResults, metricsResults] = await Promise.all([
            pipelineApi.getBatchPipelineStatus(serviceIds),
            // metrics는 아직 개별 호출 (향후 배치 API 추가 가능)
            Promise.all(
              dbProjects.map(p =>
                pipelineApi
                  .getPipelineMetrics(parseInt(p.id, 10))
                  .catch(() => null)
              )
            ),
          ]);

          const newStatuses: Record<string, PipelineStep[]> = {};
          const newMetrics: Record<string, PipelineMetrics> = {};

          // 배치 결과에서 상태 추출
          dbProjects.forEach((p, index) => {
            const serviceId = parseInt(p.id, 10);
            if (batchStatusResults[serviceId]) {
              newStatuses[p.id] = batchStatusResults[serviceId];
            }
            if (metricsResults[index]) {
              newMetrics[p.id] = metricsResults[index] as PipelineMetrics;
            }
          });

          setPipelineStatuses(newStatuses);
          setPipelineMetrics(newMetrics);
        } catch (_err) {
          // Pipeline 데이터 로딩 실패 시 조용히 무시
        } finally {
          setIsPipelinesLoading(false);
        }
      };

      void fetchAllPipelineData();
    }
  }, [projects]);

  const filteredProjects = useMemo(() => {
    //  [수정] allProjects -> projects
    return projects.filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description &&
          project.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter;
      const matchesEnvironment =
        environmentFilter === 'all' ||
        project.environment === environmentFilter;
      return matchesSearch && matchesStatus && matchesEnvironment;
    });
  }, [projects, searchTerm, statusFilter, environmentFilter]);

  const handleProjectClick = useCallback(
    (project: Project) => {
      onProjectSelect(project.id);
    },
    [onProjectSelect]
  );
  const handleAreaClick = useCallback(
    (project: Project, area: any) => {
      if (onAreaClick) {
        onAreaClick(project.id, area);
      }
    },
    [onAreaClick]
  );
  const handleQuickActions = useCallback(
    (project: Project) => {
      if (onQuickActionsSelect) {
        onQuickActionsSelect(project.id);
      }
    },
    [onQuickActionsSelect]
  );

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ marginBottom: '12px' }}>
          서비스 목록
        </Title>
        {error && (
          <Alert
            message={error}
            type='error'
            style={{ marginBottom: '12px' }}
            showIcon
          />
        )}
        <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder='서비스 검색...'
              allowClear
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              placeholder='상태'
            >
              <Option value='all'>전체 상태</Option>
              <Option value='active'>활성</Option>
              <Option value='maintenance'>유지보수</Option>
              <Option value='archived'>보관</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              value={environmentFilter}
              onChange={setEnvironmentFilter}
              style={{ width: '100%' }}
              placeholder='환경'
            >
              <Option value='all'>전체 환경</Option>
              <Option value='production'>Production</Option>
              <Option value='staging'>Staging</Option>
              <Option value='development'>Development</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space>
              <Button icon={<FilterOutlined />}>필터 초기화</Button>
            </Space>
          </Col>
        </Row>
      </div>
      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 1 }}
        dataSource={filteredProjects}
        renderItem={project => (
          <List.Item>
            <div
              role='button'
              tabIndex={0}
              style={{
                border:
                  selectedProjectId === project.id
                    ? '2px solid #1890ff'
                    : '1px solid #f0f0f0',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor:
                  selectedProjectId === project.id ? '#f6f9ff' : '#ffffff',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => handleProjectClick(project)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProjectClick(project);
                }
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <ProjectBasicInfo
                    project={project}
                    onClick={() => handleAreaClick(project, 'project-info')}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <PipelineFlow
                    project={project}
                    pipelineStatus={pipelineStatuses[project.id]}
                    pipelineMetrics={pipelineMetrics[project.id]} // 추가
                    isLoading={
                      isPipelinesLoading && project.dataSource === 'db'
                    }
                    onStageClick={() =>
                      handleAreaClick(project, 'pipeline-quick-actions')
                    }
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <SecurityVulnerabilities
                    project={project}
                    onViewDetails={() =>
                      handleAreaClick(project, 'security-vulnerabilities')
                    }
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      height: '100%',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <HealthStatus project={project} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <InfrastructureStatus
                        project={project}
                        onViewDetails={() =>
                          handleAreaClick(project, 'infrastructure-hub')
                        }
                      />
                    </div>
                  </div>
                </Col>
              </Row>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <Button
                  type='primary'
                  onClick={e => {
                    e.stopPropagation();
                    handleQuickActions(project);
                  }}
                >
                  빠른 작업
                </Button>
              </div>
            </div>
          </List.Item>
        )}
      />
      {!loading && filteredProjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          검색 조건에 맞는 서비스가 없습니다.
        </div>
      )}
    </div>
  );
};

export default EnhancedProjectList;
