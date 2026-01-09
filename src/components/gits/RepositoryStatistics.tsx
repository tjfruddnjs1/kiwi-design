/**
 * Repository Statistics Component
 * 저장소 통계 정보를 표시하는 컴포넌트
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Space,
  Typography,
  Tag,
  Divider,
  Tooltip,
} from 'antd';
import {
  CodeOutlined,
  BranchesOutlined,
  UserOutlined,
  TagOutlined,
  IssuesCloseOutlined,
  GitlabOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { RepositoryStatistics as RepoStats } from '../../types/repository';
import { formatDate } from '../../utils/dateHelpers';

const { Text } = Typography;

interface RepositoryStatisticsProps {
  statistics: RepoStats | null;
  loading?: boolean;
}

// 언어별 색상 매핑
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Go: '#00ADD8',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Rust: '#dea584',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  React: '#61dafb',
};

export const RepositoryStatistics: React.FC<RepositoryStatisticsProps> = ({
  statistics,
  loading = false,
}) => {
  if (!statistics) {
    return (
      <Card loading={loading}>
        <Text type='secondary'>저장소 통계를 불러올 수 없습니다.</Text>
      </Card>
    );
  }

  // 언어 통계가 있으면 상위 3개만 표시
  const topLanguages = statistics.languages?.slice(0, 3) || [];
  const otherLanguagesPercent =
    statistics.languages
      ?.slice(3)
      .reduce((sum, lang) => sum + lang.percentage, 0) || 0;

  return (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      {/* 기본 정보 카드 */}
      <Card size='small' variant='borderless'>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title='총 커밋'
              value={statistics.commit_count}
              prefix={<CodeOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title='브랜치'
              value={statistics.branches_count}
              prefix={<BranchesOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title='기여자'
              value={statistics.contributors_count}
              prefix={<TeamOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title='태그'
              value={statistics.tags_count}
              prefix={<TagOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 최근 활동 */}
        <Col xs={24} md={12}>
          <Card
            size='small'
            title={
              <Space>
                <ClockCircleOutlined />
                <span>최근 활동</span>
              </Space>
            }
            variant='borderless'
          >
            <Space direction='vertical' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>최근 7일 커밋</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    percent={
                      statistics.commit_count > 0
                        ? Math.min(
                            (statistics.recent_commits_7d /
                              statistics.commit_count) *
                              1000,
                            100
                          )
                        : 0
                    }
                    strokeColor='#52c41a'
                    format={() => `${statistics.recent_commits_7d}건`}
                  />
                </div>
              </div>

              <div>
                <Text type='secondary'>최근 30일 커밋</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    percent={
                      statistics.commit_count > 0
                        ? Math.min(
                            (statistics.recent_commits_30d /
                              statistics.commit_count) *
                              500,
                            100
                          )
                        : 0
                    }
                    strokeColor='#1890ff'
                    format={() => `${statistics.recent_commits_30d}건`}
                  />
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div>
                <Space>
                  <Text type='secondary'>마지막 활동:</Text>
                  <Text strong>
                    {formatDate(statistics.last_activity_at, 'relative')}
                  </Text>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 언어 분포 */}
        {statistics.languages && statistics.languages.length > 0 && (
          <Col xs={24} md={12}>
            <Card
              size='small'
              title={
                <Space>
                  <CodeOutlined />
                  <span>언어 분포</span>
                </Space>
              }
              variant='borderless'
            >
              <Space
                direction='vertical'
                style={{ width: '100%' }}
                size='small'
              >
                {topLanguages.map(lang => (
                  <div key={lang.name}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Space size='small'>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            backgroundColor:
                              LANGUAGE_COLORS[lang.name] || '#8c8c8c',
                          }}
                        />
                        <Text>{lang.name}</Text>
                      </Space>
                      <Text strong>{lang.percentage.toFixed(1)}%</Text>
                    </div>
                    <Progress
                      percent={lang.percentage}
                      strokeColor={LANGUAGE_COLORS[lang.name] || '#8c8c8c'}
                      showInfo={false}
                      size='small'
                    />
                  </div>
                ))}

                {otherLanguagesPercent > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Space size='small'>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            backgroundColor: '#d9d9d9',
                          }}
                        />
                        <Text type='secondary'>기타</Text>
                      </Space>
                      <Text>{otherLanguagesPercent.toFixed(1)}%</Text>
                    </div>
                    <Progress
                      percent={otherLanguagesPercent}
                      strokeColor='#d9d9d9'
                      showInfo={false}
                      size='small'
                    />
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* 주요 기여자 */}
      {statistics.top_contributors &&
        statistics.top_contributors.length > 0 && (
          <Card
            size='small'
            title={
              <Space>
                <UserOutlined />
                <span>주요 기여자 TOP 5</span>
              </Space>
            }
            variant='borderless'
          >
            <Row gutter={[8, 8]}>
              {statistics.top_contributors.map((contributor, index) => (
                <Col key={contributor.email} xs={24} sm={12} md={8}>
                  <Card size='small' style={{ textAlign: 'center' }}>
                    <Space direction='vertical' size='small'>
                      <Tag
                        color={
                          index === 0
                            ? 'gold'
                            : index === 1
                              ? 'silver'
                              : index === 2
                                ? '#cd7f32'
                                : 'default'
                        }
                      >
                        #{index + 1}
                      </Tag>
                      <Tooltip title={contributor.email}>
                        <Text strong>{contributor.name}</Text>
                      </Tooltip>
                      <Text type='secondary'>{contributor.commits} 커밋</Text>
                      {(contributor.additions > 0 ||
                        contributor.deletions > 0) && (
                        <Space size='small'>
                          <Text type='success' style={{ fontSize: '12px' }}>
                            +{contributor.additions.toLocaleString()}
                          </Text>
                          <Text type='danger' style={{ fontSize: '12px' }}>
                            -{contributor.deletions.toLocaleString()}
                          </Text>
                        </Space>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

      {/* 이슈 & 머지 리퀘스트 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size='small' variant='borderless'>
            <Statistic
              title='Open Issues'
              value={statistics.open_issues_count}
              prefix={<IssuesCloseOutlined />}
              valueStyle={{
                color: statistics.open_issues_count > 0 ? '#faad14' : '#52c41a',
                fontSize: '20px',
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size='small' variant='borderless'>
            <Statistic
              title='Open MRs'
              value={statistics.open_merge_requests_count}
              prefix={<GitlabOutlined />}
              valueStyle={{
                color:
                  statistics.open_merge_requests_count > 0
                    ? '#1890ff'
                    : '#52c41a',
                fontSize: '20px',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size='small' variant='borderless'>
            <Space direction='vertical'>
              <Text type='secondary'>기본 브랜치</Text>
              <Tag color='blue' icon={<BranchesOutlined />}>
                {statistics.default_branch}
              </Tag>
              {statistics.latest_tag && (
                <>
                  <Text type='secondary'>최신 태그</Text>
                  <Tag color='green' icon={<TagOutlined />}>
                    {statistics.latest_tag.name}
                  </Tag>
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default RepositoryStatistics;
