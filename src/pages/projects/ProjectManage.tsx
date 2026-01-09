import React, { useState, useEffect } from 'react';
import {
  Table,
  Spin,
  Alert,
  Typography,
  Button,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import { GitlabOutlined } from '@ant-design/icons';

import { projectApi } from '../../lib/api/project';
import { userApi } from '../../lib/api/endpoints/user';
import { GitLabProject } from '../../types/project';
import './ProjectManage.css';
import { Link } from 'react-router-dom'; // react-router-dom에서 Link 임포트
import { useCredsStore } from '../../stores/useCredsStore';
import { normalizeUrl } from '../../utils/credsAdapter';

const { Title, Text } = Typography;

// --- 등록/수정 모달 컴포넌트 ---
interface RegisterTokenModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  initialGitLabURL?: string; // 기존 GitLab URL을 전달받기 위한 optional prop
}

const RegisterTokenModal: React.FC<RegisterTokenModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  initialGitLabURL,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const credsStore = useCredsStore();

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        gitlabURL: initialGitLabURL || '', // 기존 URL이 있으면 설정, 없으면 빈 문자열
        accessToken: '', // 토큰은 보안상 항상 비워둠
      });
    }
  }, [visible, initialGitLabURL, form]);

  const handleSave = async (values: {
    gitlabURL: string;
    accessToken: string;
  }) => {
    setLoading(true);
    try {
      // accessToken만 전달하도록 수정
      const response = await userApi.saveGitLabInfo(
        values.gitlabURL,
        values.accessToken
      );

      if (response && (response as any).success) {
        // 스토어에 동기화 (baseUrl 키로 upsert)
        const baseUrl = normalizeUrl(values.gitlabURL);
        credsStore.upsertSourceRepository({
          baseUrl,
          token: values.accessToken,
        });
        message.success('GitLab 정보가 성공적으로 등록되었습니다.');
        onSuccess();
        form.resetFields();
      } else {
        throw new Error('정보 저장에 실패했습니다.');
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : '오류가 발생했습니다.';

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title='GitLab 토큰 등록/수정'
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key='back' onClick={onCancel}>
          취소
        </Button>,
        <Button
          key='submit'
          type='primary'
          loading={loading}
          onClick={() => form.submit()}
        >
          저장
        </Button>,
      ]}
    >
      <Form form={form} layout='vertical' onFinish={handleSave}>
        <Form.Item
          name='gitlabURL'
          label='GitLab 서버 주소'
          rules={[
            { required: true, message: 'GitLab 서버 주소를 입력해주세요.' },
            {
              type: 'url',
              message: '올바른 URL 형식이 아닙니다. (예: https://gitlab.com)',
            },
          ]}
        >
          <Input placeholder='https://gitlab.com 또는 https://gitlab.my-company.com' />
        </Form.Item>

        <Form.Item
          name='accessToken'
          label='개인용 액세스 토큰 (Personal Access Token)'
          rules={[{ required: true, message: '액세스 토큰을 입력해주세요.' }]}
        >
          <Input.Password placeholder='GitLab에서 발급받은 토큰을 붙여넣으세요' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const ProjectManagePage = () => {
  const [hasToken, setHasToken] = useState<boolean | null>(null); // null: 확인중, false: 없음, true: 있음
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [gitlabURL, setGitlabURL] = useState<string>(''); // ▼▼▼ GitLab URL 상태 추가 ▼▼▼
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  // 프로젝트 목록을 불러오는 함수
  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjects = await projectApi.getProjects();

      setProjects(fetchedProjects);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : '프로젝트 목록을 불러오는 데 실패했습니다.';

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시, 토큰 존재 여부 확인
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await userApi.checkGitLabStatus();
        const responseData = response.data;

        if (responseData) {
          const { hasToken: tokenExists, gitlabURL: fetchedURL } = responseData;

          setHasToken(tokenExists);
          setGitlabURL(fetchedURL || '');

          if (tokenExists) {
            fetchProjects();
          } else {
            setIsLoading(false);
          }
        } else {
          // 토큰이 없으면 로딩 종료
          setHasToken(false);
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.message || '사용자 정보를 확인하는 데 실패했습니다.');
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  // 토큰 등록 성공 시 처리 함수
  const handleRegistrationSuccess = () => {
    setIsModalVisible(false);
    setHasToken(true);
    fetchProjects(); // 프로젝트 목록 다시 로드
  };

  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: GitLabProject) => (
        <Link to={`/projects/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Last Activity',
      dataIndex: 'last_activity_at',
      key: 'last_activity_at',
      render: (date: string) => new Date(date).toLocaleString('ko-KR'),
    },
  ];

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && hasToken === null) {
    return (
      <div className='project-manage-container centered'>
        <Spin size='large' tip='GitLab 연동 상태를 확인 중입니다...' />
      </div>
    );
  }

  // 3. 토큰이 없는 경우 (등록 유도)
  if (!hasToken) {
    return (
      <>
        <div className='project-manage-container centered empty-state'>
          <GitlabOutlined style={{ fontSize: '48px', color: '#8c8c8c' }} />
          <Title level={4} style={{ marginTop: '16px' }}>
            GitLab 연동이 필요합니다.
          </Title>
          <Text type='secondary'>
            프로젝트 관리를 위해 GitLab 개인용 액세스 토큰을 등록해주세요.
          </Text>
          <Button
            type='primary'
            style={{ marginTop: '24px' }}
            onClick={() => setIsModalVisible(true)}
          >
            토큰 등록하기
          </Button>
        </div>
        <RegisterTokenModal
          visible={isModalVisible}
          onSuccess={handleRegistrationSuccess}
          onCancel={() => setIsModalVisible(false)}
        />
      </>
    );
  }

  return (
    <div className='project-manage-container'>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          GitLab 프로젝트 관리
        </Title>
        {/* 토큰 수정만 유지: 내보내기/가져오기 제거(상단 전역 버튼 사용) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setIsModalVisible(true)}>토큰 수정</Button>
        </div>
      </div>
      <Text type='secondary'>
        회원님의 계정과 연동된 GitLab 프로젝트 목록입니다.
      </Text>
      <Input.Search
        placeholder='프로젝트 이름으로 검색'
        allowClear
        enterButton
        style={{ margin: '20px 0' }}
        onSearch={value => setSearchTerm(value)}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {/* ▼▼▼ 에러가 있으면 Alert를, 없으면 테이블을 보여줍니다 ▼▼▼ */}
      {error ? (
        <Alert
          message='오류'
          description={
            error +
            ' (GitLab 토큰이 만료되었거나 유효하지 않을 수 있습니다. 토큰 수정을 시도해주세요.)'
          }
          type='error'
          showIcon
          style={{ marginTop: 20 }}
        />
      ) : (
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={filteredProjects}
            rowKey='id'
            style={{ marginTop: 20 }}
          />
        </Spin>
      )}

      {/* 모달은 항상 렌더링해두고 visible 상태로 제어합니다. */}
      <RegisterTokenModal
        visible={isModalVisible}
        onSuccess={handleRegistrationSuccess}
        onCancel={() => setIsModalVisible(false)}
        initialGitLabURL={gitlabURL}
      />
    </div>
  );
};

export default ProjectManagePage;
