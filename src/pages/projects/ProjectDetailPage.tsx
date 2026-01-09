import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Select,
  Table,
  Spin,
  Alert,
  Tag,
  Typography,
  Space,
  Button,
  Divider,
  Form,
  Modal,
  Input,
} from 'antd';
import { projectApi } from '../../lib/api/project';
import { GitLabBranch } from '../../types/project';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import { kubernetesApi } from '../../lib/api/kubernetes'; // 새로 만든 kubernetesApi 임포트
import { logger } from '../../utils/logger';

interface Branch {
  name: string;
  default?: boolean;
}

interface GitLabCommit {
  id: string;
  title: string;
  author_name: string;
  authored_date: string;
  web_url: string;
}

const { Title, Text } = Typography;
const { Option } = Select;

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [branches, setBranches] = useState<GitLabBranch[]>([]);
  const [commits, setCommits] = useState<GitLabCommit[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const [branchesLoading, setBranchesLoading] = useState(true);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDeploymentTime, setLastDeploymentTime] = useState<string | null>(
    null
  );
  const [deploymentLoading, setDeploymentLoading] = useState(false); // 초기값을 false로 변경
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 1. 컴포넌트 마운트 시 브랜치 목록 가져오기
  useEffect(() => {
    if (!projectId) return;
    const fetchBranches = async () => {
      setBranchesLoading(true);
      try {
        const fetchedBranches = await projectApi.getProjectBranches(
          Number(projectId)
        );

        setBranches(fetchedBranches);
        // 기본 브랜치를 찾아 선택하거나, 없으면 첫 번째 브랜치를 선택
        const defaultBranch =
          fetchedBranches.find((b: Branch) => b.default) || fetchedBranches[0];

        if (defaultBranch) {
          setSelectedBranch(defaultBranch.name);
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : '브랜치 목록을 불러오는 데 실패했습니다.';

        setError(errorMessage);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, [projectId]);

  // 2. 선택된 브랜치가 변경될 때마다 커밋 목록 가져오기
  useEffect(() => {
    if (!projectId || !selectedBranch) return;
    const fetchCommits = async () => {
      setCommitsLoading(true);
      setCommits([]); // 기존 커밋 목록 초기화
      try {
        const fetchedCommits = await projectApi.getProjectCommits(
          Number(projectId),
          selectedBranch
        );

        setCommits(fetchedCommits);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : '커밋 목록을 불러오는 데 실패했습니다.';

        setError(errorMessage);
      } finally {
        setCommitsLoading(false);
      }
    };

    fetchCommits();
  }, [projectId, selectedBranch]);

  const handleFetchDeploymentTime = async (values: {
    namespace: string;
    deploymentName: string;
  }) => {
    setDeploymentLoading(true);
    setIsModalVisible(false); // 확인 즉시 모달 닫기
    try {
      const response = await kubernetesApi.getLastDeploymentTime({
        namespace: values.namespace,
      });

      if (response.data.success && response.data.data?.lastDeploymentTime) {
        setLastDeploymentTime(response.data.data.lastDeploymentTime);
      } else {
        setLastDeploymentTime('배포 정보 없음');
      }
    } catch (error) {
      logger.error('배포 정보 조회 실패', error as Error);
      setLastDeploymentTime('확인 실패');
    } finally {
      setDeploymentLoading(false);
      form.resetFields();
    }
  };

  const commitColumns = [
    {
      title: 'Commit',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: GitLabCommit) => (
        <div>
          <a
            href={record.web_url}
            target='_blank'
            rel='noopener noreferrer'
            style={{ fontWeight: 500 }}
          >
            {text}
          </a>
          <br />
          <Text type='secondary'>
            {record.author_name} authored{' '}
            {new Date(record.authored_date).toLocaleString()}
          </Text>
        </div>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'short_id',
      key: 'short_id',
      render: (id: string) => <Tag>{id}</Tag>,
    },
  ];

  if (error) {
    return (
      <Alert message='오류 발생' description={error} type='error' showIcon />
    );
  }

  return (
    <div style={{ padding: 24, background: '#fff' }}>
      <div>
        <Space align='center' style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => window.history.back()}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              프로젝트 #{projectId}
            </Title>
            <Text type='secondary'>브랜치 및 커밋 목록</Text>
          </div>
        </Space>
        <Divider style={{ marginTop: 0, marginBottom: 24 }} />
      </div>

      {/* --- ▼▼▼ 3. 최종 배포 날짜 확인 UI 수정 ▼▼▼ --- */}
      {/* <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setIsModalVisible(true)}
            loading={deploymentLoading}
          >
            최종 배포 일시 확인
          </Button>
          {lastDeploymentTime && (
            lastDeploymentTime && !["확인 실패", "배포 정보 없음"].includes(lastDeploymentTime) ? (
              <Tag color="blue">{new Date(lastDeploymentTime).toLocaleString('ko-KR')}</Tag>
            ) : (
              <Text type="secondary">{lastDeploymentTime}</Text>
            )
          )}
        </Space>
      </div> */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space align='center'>
          <Text strong>브랜치 선택: </Text>
          <Spin spinning={branchesLoading}>
            <Select
              style={{ width: 300 }}
              placeholder='브랜치를 선택하세요'
              value={selectedBranch}
              onChange={value => setSelectedBranch(value)}
              disabled={branchesLoading}
            >
              {branches.map(branch => (
                <Option key={branch.name} value={branch.name}>
                  {branch.name}
                </Option>
              ))}
            </Select>
          </Spin>
        </Space>

        {/* 오른쪽 요소 그룹 */}
        <Space align='center'>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setIsModalVisible(true)}
            loading={deploymentLoading}
          >
            최종 배포 일시 확인
          </Button>
          {lastDeploymentTime &&
            (!['확인 실패', '배포 정보 없음'].includes(lastDeploymentTime) ? (
              <Tag color='blue'>
                {new Date(lastDeploymentTime).toLocaleString('ko-KR')}
              </Tag>
            ) : (
              <Text type='secondary'>{lastDeploymentTime}</Text>
            ))}
        </Space>
      </div>

      <div style={{ marginTop: 24 }}>
        <Table
          loading={commitsLoading}
          columns={commitColumns}
          dataSource={commits}
          rowKey='id'
          pagination={{ pageSize: 15 }}
        />
      </div>
      <Modal
        title='배포 정보 입력'
        visible={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={deploymentLoading}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleFetchDeploymentTime}
        >
          <Form.Item
            name='namespace'
            label='Namespace'
            rules={[
              { required: true, message: '네임스페이스를 입력해주세요.' },
            ]}
          >
            <Input placeholder='예: my-project-ns' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
