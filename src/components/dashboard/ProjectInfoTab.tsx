import React, { memo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Badge,
  Tooltip,
  Button,
  Empty,
} from 'antd';
import {
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  GithubOutlined,
  BranchesOutlined,
  LinkOutlined,
  UserOutlined,
  CodeOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
} from '@ant-design/icons';
//  [수정] getProjectById는 더 이상 사용하지 않으므로 제거하고, Project 타입만 가져옵니다.
import type { Project } from '../../data/mockProjects';

const { Title, Text } = Typography;

interface ProjectInfoTabProps {
  //  [수정] selectedProjectId 대신 selectedProject 객체를 받도록 변경
  selectedProject: Project | null;
  onSelectProject?: () => void;
}

const ProjectInfoTab: React.FC<ProjectInfoTabProps> = memo(
  ({ selectedProject, onSelectProject }) => {
    //  [수정] props로 받은 selectedProject를 project 변수에 할당합니다.
    const project = selectedProject;

    // 선택된 프로젝트가 없을 때
    if (!project) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type='secondary'>프로젝트를 선택해주세요</Text>
                <br />
                <Button
                  type='primary'
                  icon={<ProjectOutlined />}
                  onClick={onSelectProject}
                  style={{ marginTop: 16 }}
                >
                  프로젝트 목록으로 이동
                </Button>
              </div>
            }
          />
        </div>
      );
    }

    const getStatusConfig = (status: Project['status']) => {
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
    };

    // 환경별 색상 가져오기
    const getEnvironmentColor = (environment: Project['environment']) => {
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
    };

    const statusConfig = getStatusConfig(project.status);
    //  [추가] DB 데이터에 없는 값들을 위한 안전한 기본값 설정
    const healthScore = project.healthScore || 0;
    const techStack = project.techStack || [];
    const team = project.team || 'N/A';
    const lastCommit = project.git.lastCommit || 'N/A';
    const commitHash = project.git.commitHash || 'N/A';
    const author = project.git.author || 'N/A';

    return (
      <div style={{ padding: '24px' }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <Row justify='space-between' align='middle'>
            <Col>
              <Title
                level={3}
                style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <ProjectOutlined style={{ color: '#1890ff' }} />
                {project.name}
              </Title>
              <Text type='secondary' style={{ fontSize: '14px' }}>
                {project.description}
              </Text>
            </Col>
            <Col>
              <Space>
                <Badge status={statusConfig.color as any} />
                <Text>{statusConfig.text}</Text>
                <Tag color={getEnvironmentColor(project.environment)}>
                  {project.environment}
                </Tag>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 메인 콘텐츠 */}
        <Row gutter={[24, 24]}>
          {/* 기본 정보 */}
          <Col xs={24} sm={12} lg={8}>
            <Card title='기본 정보' size='small'>
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    프로젝트 ID
                  </Text>
                  <br />
                  <Text code style={{ fontSize: '13px' }}>
                    {project.id}
                  </Text>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    팀
                  </Text>
                  <br />
                  <Space size='small'>
                    <TeamOutlined
                      style={{ fontSize: '14px', color: '#1890ff' }}
                    />
                    <Text style={{ fontSize: '14px' }}>{team}</Text>
                  </Space>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    생성일
                  </Text>
                  <br />
                  <Space size='small'>
                    <ClockCircleOutlined
                      style={{ fontSize: '14px', color: '#52c41a' }}
                    />
                    <Text style={{ fontSize: '14px' }}>
                      {project.createdAt}
                    </Text>
                  </Space>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    최근 배포
                  </Text>
                  <br />
                  <Space size='small'>
                    <DesktopOutlined
                      style={{ fontSize: '14px', color: '#faad14' }}
                    />
                    <Text style={{ fontSize: '14px' }}>
                      {project.lastDeployment}
                    </Text>
                  </Space>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    건강도 점수
                  </Text>
                  <br />
                  <Text
                    style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color:
                        healthScore >= 90
                          ? '#52c41a'
                          : healthScore >= 70
                            ? '#1890ff'
                            : healthScore >= 50
                              ? '#faad14'
                              : '#f5222d',
                    }}
                  >
                    {healthScore}%
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>

          {/* 기술 스택 */}
          <Col xs={24} sm={12} lg={8}>
            <Card title='기술 스택' size='small'>
              <Space
                direction='vertical'
                size='small'
                style={{ width: '100%' }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    사용 기술 ({techStack.length}개)
                  </Text>
                </div>
                <div>
                  <Space wrap size='small'>
                    {techStack.map((tech, index) => (
                      <Tag
                        key={index}
                        color='blue'
                        style={{
                          margin: '2px',
                          fontSize: '12px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {tech}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>

          {/* Git 정보 */}
          <Col xs={24} lg={8}>
            <Card title='Git 저장소' size='small'>
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    저장소
                  </Text>
                  <br />
                  <Tooltip title={project.git.repository}>
                    <Space size='small' style={{ cursor: 'pointer' }}>
                      <GithubOutlined
                        style={{ fontSize: '14px', color: '#1890ff' }}
                      />
                      <Text
                        style={{ fontSize: '13px', color: '#1890ff' }}
                        onClick={() =>
                          window.open(project.git.repository, '_blank')
                        }
                      >
                        {project.git.repository
                          .split('/')
                          .pop()
                          ?.replace('.git', '')}
                      </Text>
                    </Space>
                  </Tooltip>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    브랜치
                  </Text>
                  <br />
                  <Space size='small'>
                    <BranchesOutlined
                      style={{ fontSize: '14px', color: '#52c41a' }}
                    />
                    <Tag color='green' size='small'>
                      {project.git.branch}
                    </Tag>
                  </Space>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    최근 커밋
                  </Text>
                  <br />
                  <Text style={{ fontSize: '13px', lineHeight: '1.4' }}>
                    {lastCommit}
                  </Text>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      커밋 해시
                    </Text>
                    <br />
                    <Space size='small'>
                      <CodeOutlined style={{ fontSize: '12px' }} />
                      <Text code style={{ fontSize: '11px' }}>
                        {commitHash}
                      </Text>
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      작성자
                    </Text>
                    <br />
                    <Space size='small'>
                      <UserOutlined style={{ fontSize: '12px' }} />
                      <Text style={{ fontSize: '12px' }}>{author}</Text>
                    </Space>
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>

          {/* 서비스 URL */}
          <Col xs={24}>
            <Card title='서비스 URL' size='small'>
              <Row gutter={[16, 16]}>
                {project.serviceUrl?.production && (
                  <Col xs={24} sm={8}>
                    <div
                      style={{
                        padding: '12px',
                        border: '1px solid #f5222d',
                        borderRadius: '6px',
                        backgroundColor: '#fff2f0',
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Space size='small'>
                          <LinkOutlined
                            style={{ fontSize: '14px', color: '#f5222d' }}
                          />
                          <Text
                            strong
                            style={{ color: '#f5222d', fontSize: '13px' }}
                          >
                            Production
                          </Text>
                        </Space>
                      </div>
                      <Text
                        style={{
                          fontSize: '12px',
                          color: '#1890ff',
                          cursor: 'pointer',
                          wordBreak: 'break-all',
                        }}
                        onClick={() =>
                          window.open(project.serviceUrl.production, '_blank')
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
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
                    </div>
                  </Col>
                )}

                {project.serviceUrl?.staging && (
                  <Col xs={24} sm={8}>
                    <div
                      style={{
                        padding: '12px',
                        border: '1px solid #fa8c16',
                        borderRadius: '6px',
                        backgroundColor: '#fff7e6',
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Space size='small'>
                          <LinkOutlined
                            style={{ fontSize: '14px', color: '#fa8c16' }}
                          />
                          <Text
                            strong
                            style={{ color: '#fa8c16', fontSize: '13px' }}
                          >
                            Staging
                          </Text>
                        </Space>
                      </div>
                      <Text
                        style={{
                          fontSize: '12px',
                          color: '#1890ff',
                          cursor: 'pointer',
                          wordBreak: 'break-all',
                        }}
                        onClick={() =>
                          window.open(project.serviceUrl.staging, '_blank')
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.open(project.serviceUrl.staging, '_blank');
                          }
                        }}
                        role='link'
                        tabIndex={0}
                      >
                        {project.serviceUrl.staging}
                      </Text>
                    </div>
                  </Col>
                )}

                {project.serviceUrl?.development && (
                  <Col xs={24} sm={8}>
                    <div
                      style={{
                        padding: '12px',
                        border: '1px solid #52c41a',
                        borderRadius: '6px',
                        backgroundColor: '#f6ffed',
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Space size='small'>
                          <LinkOutlined
                            style={{ fontSize: '14px', color: '#52c41a' }}
                          />
                          <Text
                            strong
                            style={{ color: '#52c41a', fontSize: '13px' }}
                          >
                            Development
                          </Text>
                        </Space>
                      </div>
                      <Text
                        style={{
                          fontSize: '12px',
                          color: '#1890ff',
                          cursor: 'pointer',
                          wordBreak: 'break-all',
                        }}
                        onClick={() =>
                          window.open(project.serviceUrl.development, '_blank')
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
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
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
);

ProjectInfoTab.displayName = 'ProjectInfoTab';

export default ProjectInfoTab;
