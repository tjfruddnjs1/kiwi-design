import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Form, Select, message, Spin, Input } from 'antd';
import { InfraItem } from '@/types';
import logger from '../../utils/logger';
import { api } from '../../lib/api';
import { gitApi } from '../../lib/api/gitRepository';
import { getRepositoryBranches } from '../../lib/api/repository';
import { GitRepository } from './GitManagement';
import { useCredsStore } from '../../stores/useCredsStore';

const { Option } = Select;
const GitEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { gitlabTokens } = useCredsStore();
  const [gitRepo, setGitRepo] = useState<GitRepository | null>(null);
  const [gitLoading, setGitLoading] = useState<boolean>(false);
  const [infraList, setInfraList] = useState<InfraItem[]>([]);
  const [infraLoading, setInfraLoading] = useState<boolean>(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Partial<GitRepository>>({});
  const [branches, setBranches] = useState<
    Array<{ name: string; default: boolean }>
  >([]);
  const [branchesLoading, setBranchesLoading] = useState<boolean>(false);

  const fetchGitRepo = async () => {
    try {
      setGitLoading(true);
      const response = await gitApi.getRepoById(Number(id));
      setGitRepo(response.data as GitRepository);
    } catch (error) {
      logger.error('Git repository fetch failed:', error as Error);
      message.error('Failed to fetch git repository.');
    } finally {
      setGitLoading(false);
    }
  };

  const fetchInfraList = async () => {
    try {
      setInfraLoading(true);

      const response = await api.kubernetes.request<Record<string, unknown>>(
        'getInfras',
        {}
      );

      let infras: InfraItem[] = [];

      //  2. 타입 가드를 사용하여 response.data의 구조를 안전하게 확인합니다.
      if (response && typeof response === 'object' && 'data' in response) {
        const responseData = (response as { data: unknown }).data;

        // 케이스 1: response.data가 바로 배열인 경우 (현재 확인된 구조)
        if (Array.isArray(responseData)) {
          infras = responseData as InfraItem[];
        }
        // 케이스 2: response.data 객체 안에 infras 배열이 있는 경우
        else if (
          responseData &&
          typeof responseData === 'object' &&
          'infras' in responseData &&
          Array.isArray((responseData as { infras: unknown }).infras)
        ) {
          infras = (responseData as { infras: InfraItem[] }).infras;
        }
      }

      setInfraList(infras);
    } catch (error) {
      logger.error('인프라 목록 가져오기 실패:', error as Error);
      message.error('인프라 목록을 불러오는데 실패했습니다.');
    } finally {
      setInfraLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!gitRepo) return;

    try {
      setBranchesLoading(true);

      // GitLab 토큰 가져오기
      const token = gitlabTokens[gitRepo.gitlabUrl];
      if (!token) {
        message.warning(
          'GitLab 토큰이 설정되지 않았습니다. 브랜치 목록을 가져올 수 없습니다.'
        );
        return;
      }

      const branchList = await getRepositoryBranches(gitRepo.id, token);
      setBranches(branchList.map(b => ({ name: b.name, default: b.default })));
    } catch (error) {
      logger.error('브랜치 목록 가져오기 실패:', error as Error);
      message.error('브랜치 목록을 불러오는데 실패했습니다.');
    } finally {
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    void fetchGitRepo();
    void fetchInfraList();
  }, []);

  if (gitLoading || !gitRepo) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: '40px auto',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  const handleEditClick = () => {
    setEditValues({
      name: gitRepo.name,
      gitlabUrl: gitRepo.gitlabUrl,
      gitlabBranch: gitRepo.gitlabBranch,
      lastCommit: gitRepo.lastCommit,
    });
    setEditMode(true);
    // 브랜치 목록 가져오기
    void fetchBranches();
  };

  const handleEditChange = (field: keyof GitRepository, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditMode(false);
  };

  // TODO: handleEditSave 구현 필요

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24 }}>
      <Card
        title={
          <span style={{ fontSize: 20, fontWeight: 600 }}>
            저장소 상세 (ID: {id})
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 100, fontWeight: 500, color: '#555' }}>
              저장소명
            </span>
            {editMode ? (
              <Input
                style={{ flex: 1 }}
                value={editValues.name || ''}
                onChange={e => handleEditChange('name', e.target.value)}
                placeholder='저장소 이름'
              />
            ) : (
              <span style={{ flex: 1 }}>{gitRepo.name}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 100, fontWeight: 500, color: '#555' }}>
              Git URL
            </span>
            {editMode ? (
              <Input
                style={{ flex: 1 }}
                value={editValues.gitlabUrl || ''}
                onChange={e => handleEditChange('gitlabUrl', e.target.value)}
                placeholder='Git 저장소 URL'
              />
            ) : (
              <span style={{ flex: 1 }}>{gitRepo.gitlabUrl}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 100, fontWeight: 500, color: '#555' }}>
              브랜치
            </span>
            {editMode ? (
              <Select
                style={{ flex: 1 }}
                value={editValues.gitlabBranch || ''}
                onChange={value => handleEditChange('gitlabBranch', value)}
                placeholder='브랜치 선택'
                loading={branchesLoading}
                showSearch
                optionFilterProp='children'
                notFoundContent={
                  branchesLoading ? <Spin size='small' /> : '브랜치 없음'
                }
              >
                {branches.map(branch => (
                  <Option key={branch.name} value={branch.name}>
                    {branch.name} {branch.default && '(기본)'}
                  </Option>
                ))}
              </Select>
            ) : (
              <span style={{ flex: 1 }}>{gitRepo.gitlabBranch}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 100, fontWeight: 500, color: '#555' }}>
              마지막 커밋
            </span>
            {editMode ? (
              <Input
                style={{ flex: 1 }}
                value={editValues.lastCommit || ''}
                onChange={e => handleEditChange('lastCommit', e.target.value)}
                placeholder='마지막 커밋'
              />
            ) : (
              <span style={{ flex: 1 }}>{gitRepo.lastCommit}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 100, fontWeight: 500, color: '#555' }}>
              인프라 선택
            </span>
            <div style={{ flex: 1 }}>
              <Form.Item
                name='infra_id'
                style={{ marginBottom: 0 }}
                rules={[{ required: true, message: '인프라를 선택해주세요' }]}
              >
                <Select
                  placeholder='서비스를 배포할 인프라 선택'
                  loading={infraLoading}
                  showSearch
                  optionFilterProp='children'
                >
                  {infraList.map(infra => (
                    <Option key={infra.id} value={infra.id}>
                      {infra.name} ({infra.type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
            }}
          >
            {editMode ? (
              <>
                <Button type='primary'>저장</Button>
                <Button onClick={handleEditCancel}>취소</Button>
              </>
            ) : (
              <>
                <Button type='primary' onClick={handleEditClick}>
                  수정
                </Button>
                <Button onClick={() => navigate('/services')}>목록으로</Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GitEdit;
