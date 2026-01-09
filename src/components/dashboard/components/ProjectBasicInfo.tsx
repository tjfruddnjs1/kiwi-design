import React, { useCallback } from 'react';
import {
  Card,
  Typography,
  Space,
  Badge,
  Tag,
  Row,
  Col,
  Divider,
  Tooltip,
} from 'antd';
import {
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
  GithubOutlined,
  BranchesOutlined,
  CodeOutlined,
  UserOutlined,
  LinkOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  CodeSandboxOutlined, // Docker Registry 아이콘 추가
} from '@ant-design/icons';
import { ProjectComponentProps } from '../types/projectTypes';
import type { Project } from '../../../data/mockProjects';

const { Text } = Typography;

const ProjectBasicInfo: React.FC<ProjectComponentProps> = ({
  project,
  onClick,
}) => {
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

  const statusConfig = getStatusConfig(project.status);

  //  [핵심 수정] DB 데이터용 UI를 요청하신 필드에 맞춰 재구성합니다.
  if (project.dataSource === 'db') {
    return (
      <Card
        size='small'
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#52c41a' }} />
            <Text strong>프로젝트 정보 (DB)</Text>
          </Space>
        }
        style={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        hoverable={!!onClick}
        onClick={onClick}
        onKeyDown={
          onClick
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          {/* --- 이름, 설명, 상태, 환경 --- */}
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {project.name}
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {project.description}
              </Text>
            </div>
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col>
                <Space size='small'>
                  <Badge status={statusConfig.color as 'success' | 'warning'} />
                  <Text style={{ fontSize: '12px' }}>{statusConfig.text}</Text>
                </Space>
              </Col>
              <Col>
                <Space size='small'>
                  <EnvironmentOutlined style={{ fontSize: '12px' }} />
                  <Tag
                    color={getEnvironmentColor(project.environment)}
                    size='small'
                  >
                    {project.environment}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </div>

          {/* --- 생성일, 수정일 --- */}
          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Space>
                <CalendarOutlined
                  style={{ fontSize: '12px', color: '#8c8c8c' }}
                />
                <Text type='secondary' style={{ fontSize: '11px' }}>
                  생성:
                </Text>
                <Text style={{ fontSize: '11px' }}>{project.createdAt}</Text>
              </Space>
            </Col>
            <Col span={24}>
              <Space>
                <ClockCircleOutlined
                  style={{ fontSize: '12px', color: '#8c8c8c' }}
                />
                <Text type='secondary' style={{ fontSize: '11px' }}>
                  수정:
                </Text>
                <Text style={{ fontSize: '11px' }}>
                  {project.lastDeployment}
                </Text>
              </Space>
            </Col>
          </Row>

          <Divider style={{ margin: '4px 0' }} />

          {/* --- Git, Docker Registry, Service URL --- */}
          <Space direction='vertical' size='small' style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: '12px' }}>
                Git 저장소
              </Text>
              <div style={{ marginTop: 4 }}>
                <Space size='small'>
                  <GithubOutlined style={{ fontSize: '12px' }} />
                  <Tooltip title={project.git.repository}>
                    <Text
                      style={{
                        fontSize: '11px',
                        color: '#1890ff',
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        window.open(project.git.repository, '_blank');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(project.git.repository, '_blank');
                        }
                      }}
                      role='link'
                      tabIndex={0}
                    >
                      {project.git.repository
                        .split('/')
                        .pop()
                        ?.replace('.git', '')}
                    </Text>
                  </Tooltip>
                  <BranchesOutlined style={{ fontSize: '10px' }} />
                  <Tag color='blue' size='small' style={{ fontSize: '9px' }}>
                    {project.git.branch}
                  </Tag>
                </Space>
              </div>
            </div>
            <div>
              <Text strong style={{ fontSize: '12px' }}>
                Docker Registry
              </Text>
              <div style={{ marginTop: 4 }}>
                <Space size='small'>
                  <CodeSandboxOutlined style={{ fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px' }}>
                    {project.dockerRegistry}
                  </Text>
                </Space>
              </div>
            </div>
            <div>
              <Text strong style={{ fontSize: '12px' }}>
                서비스 URL
              </Text>
              <div style={{ marginTop: 4 }}>
                {project.serviceUrl && project.serviceUrl.production ? (
                  <Space size='small'>
                    <LinkOutlined style={{ fontSize: '12px' }} />
                    <Text
                      style={{
                        fontSize: '11px',
                        color: '#1890ff',
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        window.open(project.serviceUrl.production, '_blank');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(project.serviceUrl.production, '_blank');
                        }
                      }}
                      role='link'
                      tabIndex={0}
                    >
                      {project.serviceUrl.production}
                    </Text>
                  </Space>
                ) : (
                  <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>-</Text>
                )}
              </div>
            </div>
          </Space>
        </Space>
      </Card>
    );
  } else {
    // --- 2. 목업 데이터용 UI (기존과 동일) ---
    return (
      <Card
        size='small'
        title={
          <Space>
            <ProjectOutlined style={{ color: '#1890ff' }} />
            <Text strong>프로젝트 정보 (Mock)</Text>
          </Space>
        }
        style={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        hoverable={!!onClick}
        onClick={onClick}
        onKeyDown={
          onClick
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <Space direction='vertical' size='small' style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {project.name}
            </Text>
          </div>
          <div>
            <Text type='secondary' style={{ fontSize: '13px' }}>
              {project.description}
            </Text>
          </div>

          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Space size='small'>
                <Badge
                  status={
                    statusConfig.color as
                      | 'success'
                      | 'processing'
                      | 'default'
                      | 'error'
                      | 'warning'
                  }
                />
                <Text style={{ fontSize: '12px' }}>{statusConfig.text}</Text>
              </Space>
            </Col>
            <Col span={12}>
              <Space size='small'>
                <EnvironmentOutlined style={{ fontSize: '12px' }} />
                <Tag
                  color={getEnvironmentColor(project.environment)}
                  size='small'
                >
                  {project.environment}
                </Tag>
              </Space>
            </Col>
          </Row>

          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Space size='small'>
                <TeamOutlined style={{ fontSize: '12px' }} />
                <Text style={{ fontSize: '12px' }}>{project.team}</Text>
              </Space>
            </Col>
            <Col span={12}>
              <Space size='small'>
                <ClockCircleOutlined style={{ fontSize: '12px' }} />
                <Text style={{ fontSize: '12px' }}>
                  {project.lastDeployment}
                </Text>
              </Space>
            </Col>
          </Row>

          <div>
            <Text strong style={{ fontSize: '12px', color: '#595959' }}>
              기술 스택:
            </Text>
            <div style={{ marginTop: 4 }}>
              <Space wrap size='small'>
                {project.techStack.slice(0, 3).map((tech, index) => (
                  <Tag key={index} size='small' style={{ fontSize: '10px' }}>
                    {tech}
                  </Tag>
                ))}
                {project.techStack.length > 3 && (
                  <Tooltip title={project.techStack.slice(3).join(', ')}>
                    <Tag size='small' style={{ fontSize: '10px' }}>
                      +{project.techStack.length - 3}
                    </Tag>
                  </Tooltip>
                )}
              </Space>
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* Git Repository Information */}
          <div>
            <Text strong style={{ fontSize: '12px', color: '#595959' }}>
              Git 저장소:
            </Text>
            <div style={{ marginTop: 4 }}>
              <Row gutter={[4, 4]}>
                <Col span={24}>
                  <Space size='small'>
                    <GithubOutlined
                      style={{ fontSize: '12px', color: '#1890ff' }}
                    />
                    <Tooltip title={project.git.repository}>
                      <Text
                        style={{
                          fontSize: '11px',
                          color: '#1890ff',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          window.open(project.git.repository, '_blank');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(project.git.repository, '_blank');
                          }
                        }}
                        role='link'
                        tabIndex={0}
                      >
                        {project.git.repository
                          .split('/')
                          .pop()
                          ?.replace('.git', '')}
                      </Text>
                    </Tooltip>
                    <BranchesOutlined style={{ fontSize: '10px' }} />
                    <Tag color='blue' size='small' style={{ fontSize: '9px' }}>
                      {project.git.branch}
                    </Tag>
                  </Space>
                </Col>
                <Col span={24}>
                  <Text style={{ fontSize: '10px', color: '#8c8c8c' }}>
                    {project.git.lastCommit}
                  </Text>
                </Col>
                <Col span={12}>
                  <Space size='small'>
                    <CodeOutlined style={{ fontSize: '10px' }} />
                    <Text style={{ fontSize: '10px' }}>
                      {project.git.commitHash}
                    </Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space size='small'>
                    <UserOutlined style={{ fontSize: '10px' }} />
                    <Text style={{ fontSize: '10px' }}>
                      {project.git.author}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </div>
          </div>

          {/* Service URLs */}
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontSize: '12px', color: '#595959' }}>
              서비스 URL:
            </Text>
            <div style={{ marginTop: 4 }}>
              <Space
                direction='vertical'
                size='small'
                style={{ width: '100%' }}
              >
                {project.serviceUrl.production && (
                  <div>
                    <Space size='small'>
                      <LinkOutlined
                        style={{ fontSize: '10px', color: '#f5222d' }}
                      />
                      <Text style={{ fontSize: '10px', color: '#8c8c8c' }}>
                        Production:
                      </Text>
                      <Text
                        style={{
                          fontSize: '10px',
                          color: '#1890ff',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          window.open(project.serviceUrl.production, '_blank');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              project.serviceUrl.production,
                              '_blank'
                            );
                          }
                        }}
                        role='link'
                        tabIndex={0}
                      >
                        {project.serviceUrl.production}
                      </Text>
                    </Space>
                  </div>
                )}
                {project.serviceUrl.staging && (
                  <div>
                    <Space size='small'>
                      <LinkOutlined
                        style={{ fontSize: '10px', color: '#fa8c16' }}
                      />
                      <Text style={{ fontSize: '10px', color: '#8c8c8c' }}>
                        Staging:
                      </Text>
                      <Text
                        style={{
                          fontSize: '10px',
                          color: '#1890ff',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          window.open(project.serviceUrl.staging, '_blank');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(project.serviceUrl.staging, '_blank');
                          }
                        }}
                        role='link'
                        tabIndex={0}
                      >
                        {project.serviceUrl.staging}
                      </Text>
                    </Space>
                  </div>
                )}
                {project.serviceUrl.development && (
                  <div>
                    <Space size='small'>
                      <LinkOutlined
                        style={{ fontSize: '10px', color: '#52c41a' }}
                      />
                      <Text style={{ fontSize: '10px', color: '#8c8c8c' }}>
                        Development:
                      </Text>
                      <Text
                        style={{
                          fontSize: '10px',
                          color: '#1890ff',
                          cursor: 'pointer',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          window.open(project.serviceUrl.development, '_blank');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              project.serviceUrl.development,
                              '_blank'
                            );
                          }
                        }}
                        role='link'
                        tabIndex={0}
                      >
                        {project.serviceUrl.development}
                      </Text>
                    </Space>
                  </div>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </Card>
    );
  }
};

export default ProjectBasicInfo;
