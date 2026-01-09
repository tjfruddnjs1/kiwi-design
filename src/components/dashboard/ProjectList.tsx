import React, { useState, useCallback } from 'react';
import {
  List,
  Tag,
  Typography,
  Progress,
  Space,
  Button,
  Badge,
  Select,
  Input,
  Tooltip,
  Avatar,
  Row,
  Col,
} from 'antd';
import {
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Project,
  mockProjects,
  getPipelineByProjectId,
} from '../../data/mockProjects';
import PipelineStatusCard from '../common/PipelineStatusCard';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface ProjectListProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onQuickActionsSelect?: (projectId: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  selectedProjectId,
  onProjectSelect,
  onQuickActionsSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');

  // Filter projects based on search and filters
  const filteredProjects = useCallback(() => {
    return mockProjects.filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter;
      const matchesEnvironment =
        environmentFilter === 'all' ||
        project.environment === environmentFilter;

      return matchesSearch && matchesStatus && matchesEnvironment;
    });
  }, [searchTerm, statusFilter, environmentFilter]);

  // Get status icon and color
  const getStatusConfig = useCallback((status: Project['status']) => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircleOutlined />,
          color: 'success',
          text: '활성',
        };
      case 'maintenance':
        return {
          icon: <WarningOutlined />,
          color: 'warning',
          text: '유지보수',
        };
      case 'archived':
        return { icon: <StopOutlined />, color: 'default', text: '보관' };
      default:
        return {
          icon: <CheckCircleOutlined />,
          color: 'default',
          text: '알 수 없음',
        };
    }
  }, []);

  // Get environment color
  const getEnvironmentColor = useCallback(
    (environment: Project['environment']) => {
      switch (environment) {
        case 'production':
          return 'red';
        case 'staging':
          return 'orange';
        case 'development':
          return 'blue';
        default:
          return 'default';
      }
    },
    []
  );

  // Get health score color
  const getHealthScoreColor = useCallback((score: number) => {
    if (score >= 90) return '#52c41a'; // green
    if (score >= 70) return '#1890ff'; // blue
    if (score >= 50) return '#fa8c16'; // orange
    return '#f5222d'; // red
  }, []);

  const handleProjectClick = useCallback(
    (projectId: string) => {
      onProjectSelect(projectId);
    },
    [onProjectSelect]
  );

  const projects = filteredProjects();

  return (
    <div className='project-list-container'>
      {/* Header with filters */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            <ProjectOutlined /> 프로젝트 목록
          </Title>
          <Badge count={projects.length} showZero color='blue' />
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder='프로젝트 검색...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8}>
            <Select
              style={{ width: '100%' }}
              placeholder='상태 필터'
              value={statusFilter}
              onChange={setStatusFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value='all'>모든 상태</Option>
              <Option value='active'>활성</Option>
              <Option value='maintenance'>유지보수</Option>
              <Option value='archived'>보관</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8}>
            <Select
              style={{ width: '100%' }}
              placeholder='환경 필터'
              value={environmentFilter}
              onChange={setEnvironmentFilter}
              suffixIcon={<EnvironmentOutlined />}
            >
              <Option value='all'>모든 환경</Option>
              <Option value='production'>Production</Option>
              <Option value='staging'>Staging</Option>
              <Option value='development'>Development</Option>
            </Select>
          </Col>
        </Row>
      </div>

      {/* Project List */}
      <List
        itemLayout='vertical'
        size='large'
        dataSource={projects}
        renderItem={project => {
          const statusConfig = getStatusConfig(project.status);
          const isSelected = selectedProjectId === project.id;

          return (
            <List.Item
              key={project.id}
              className={`project-list-item ${isSelected ? 'selected' : ''}`}
              style={{
                padding: '16px 20px',
                border: `1px solid ${isSelected ? '#1890ff' : '#f0f0f0'}`,
                borderRadius: '8px',
                marginBottom: '12px',
                backgroundColor: isSelected ? '#f0f5ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => handleProjectClick(project.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProjectClick(project.id);
                }
              }}
              role='button'
              tabIndex={0}
              actions={[
                <Button
                  type={isSelected ? 'primary' : 'default'}
                  size='small'
                  onClick={e => {
                    e.stopPropagation();
                    handleProjectClick(project.id);
                  }}
                  key='select'
                >
                  {isSelected ? '선택됨' : '선택'}
                </Button>,
                <Tooltip title='빠른 작업 실행' key='quick-actions'>
                  <Button
                    type='text'
                    size='small'
                    icon={<ThunderboltOutlined />}
                    onClick={e => {
                      e.stopPropagation();
                      if (onQuickActionsSelect) {
                        onQuickActionsSelect(project.id);
                      }
                    }}
                    disabled={project.status !== 'active'}
                  >
                    빠른 작업
                  </Button>
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    style={{ backgroundColor: '#1890ff' }}
                    icon={<ProjectOutlined />}
                  />
                }
                title={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <Text strong style={{ fontSize: '16px' }}>
                        {project.name}
                      </Text>
                      <Badge
                        status={statusConfig.color as any}
                        text={statusConfig.text}
                      />
                    </div>
                  </div>
                }
                description={
                  <div>
                    <Text
                      type='secondary'
                      style={{
                        fontSize: '13px',
                        display: 'block',
                        marginBottom: 12,
                      }}
                    >
                      {project.description}
                    </Text>

                    {/* Project Details in horizontal layout */}
                    <Row gutter={[24, 8]} align='middle'>
                      <Col xs={24} sm={8} md={6}>
                        <Space size='small'>
                          <EnvironmentOutlined style={{ fontSize: '12px' }} />
                          <Tag color={getEnvironmentColor(project.environment)}>
                            {project.environment}
                          </Tag>
                        </Space>
                      </Col>

                      <Col xs={24} sm={8} md={6}>
                        <Space size='small'>
                          <TeamOutlined style={{ fontSize: '12px' }} />
                          <Text style={{ fontSize: '12px' }}>
                            {project.team}
                          </Text>
                        </Space>
                      </Col>

                      <Col xs={24} sm={8} md={6}>
                        <Space size='small'>
                          <ClockCircleOutlined style={{ fontSize: '12px' }} />
                          <Text style={{ fontSize: '12px' }}>
                            배포: {project.lastDeployment}
                          </Text>
                        </Space>
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Text strong style={{ fontSize: '12px' }}>
                            건강도:
                          </Text>
                          <Progress
                            percent={project.healthScore}
                            strokeColor={getHealthScoreColor(
                              project.healthScore
                            )}
                            size='small'
                            style={{ width: '60px' }}
                            format={percent => (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: getHealthScoreColor(
                                    project.healthScore
                                  ),
                                  fontWeight: 'bold',
                                }}
                              >
                                {percent}%
                              </span>
                            )}
                          />
                        </div>
                      </Col>
                    </Row>

                    {/* Tech Stack */}
                    <div style={{ marginTop: 12 }}>
                      <Space wrap size='small'>
                        <Text
                          strong
                          style={{ fontSize: '12px', color: '#595959' }}
                        >
                          기술 스택:
                        </Text>
                        {project.techStack.slice(0, 4).map((tech, index) => (
                          <Tag key={index} style={{ fontSize: '10px' }}>
                            {tech}
                          </Tag>
                        ))}
                        {project.techStack.length > 4 && (
                          <Tooltip
                            title={project.techStack.slice(4).join(', ')}
                          >
                            <Tag style={{ fontSize: '10px' }}>
                              +{project.techStack.length - 4}
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                    </div>

                    {/* Pipeline Status */}
                    {(() => {
                      const pipeline = getPipelineByProjectId(project.id);
                      return pipeline ? (
                        <PipelineStatusCard
                          pipeline={pipeline}
                          compact={true}
                        />
                      ) : null;
                    })()}
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Text type='secondary'>필터 조건에 맞는 프로젝트가 없습니다.</Text>
        </div>
      )}

      <style>{`
        .project-card.selected {
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
        }
        .project-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default ProjectList;
