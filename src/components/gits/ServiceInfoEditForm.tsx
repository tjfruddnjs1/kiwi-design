/**
 * 서비스 정보 편집 폼 컴포넌트
 * GitManagement.tsx에서 추출된 서비스 편집 모달의 폼 내용
 */
import React from 'react';
import { Input, Select, Button, Tag, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';

// =========================================
// 타입 정의
// =========================================

/** 인프라 아이템 타입 */
export interface InfraItem {
  id: number;
  name: string;
  type: string;
}

/** 브랜치 정보 타입 */
export interface BranchInfo {
  name: string;
  default: boolean;
}

/** 선택된 서비스 정보 타입 */
export interface SelectedServiceInfo {
  id: number;
  serviceName: string;
  serviceNamespace?: string;
  infraName?: string;
  infraId?: number;
  gitlabBranch?: string;
  gitlabUrl?: string;
  gitlabAccessToken?: string;
  gitlabUsername?: string;
  registryType?: 'harbor' | 'dockerhub';
  registryUrl?: string;
  registryUsername?: string;
  registryPassword?: string;
  registryProjectName?: string;
}

/** 인증 상태 타입 */
export type AuthStatus = 'idle' | 'success' | 'failed';

/** 모달 타입 */
export type InfoModalType = 'service' | 'gitlab' | 'registry' | null;

/** 폼 props */
export interface ServiceInfoEditFormProps {
  // 표시 모드
  activeInfoModal: InfoModalType;

  // 서비스 정보
  selectedServiceInfo: SelectedServiceInfo | null;
  onFieldChange: (field: string, value: unknown) => void;

  // 인프라 관련
  infrastructures: InfraItem[];
  infrastructuresLoading: boolean;
  getDisplayInfraType: (type: string) => string;

  // 브랜치 관련
  branches: BranchInfo[];
  branchesLoading: boolean;

  // GitLab 인증
  gitlabAuthLoading: boolean;
  gitlabAuthStatus: AuthStatus;
  onGitlabAuthStatusChange: (status: AuthStatus) => void;
  onTestGitlabAuth: () => void;

  // Registry 인증
  registryTestLoading: boolean;
  registryAuthStatus: AuthStatus;
  onRegistryAuthStatusChange: (status: AuthStatus) => void;
  onTestRegistryAuth: () => void;
}

// =========================================
// 컴포넌트
// =========================================

/**
 * 서비스 정보 편집 폼
 */
export const ServiceInfoEditForm: React.FC<ServiceInfoEditFormProps> = ({
  activeInfoModal,
  selectedServiceInfo,
  onFieldChange,
  infrastructures,
  infrastructuresLoading,
  getDisplayInfraType,
  branches,
  branchesLoading,
  gitlabAuthLoading,
  gitlabAuthStatus,
  onGitlabAuthStatusChange,
  onTestGitlabAuth,
  registryTestLoading,
  registryAuthStatus,
  onRegistryAuthStatusChange,
  onTestRegistryAuth,
}) => {
  if (!selectedServiceInfo) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 기본 정보 섹션 - 서비스 정보 모달일 때만 표시 */}
      {(activeInfoModal === 'service' || !activeInfoModal) && (
        <div>
          <div
            style={{
              marginBottom: 16,
              fontWeight: 600,
              color: '#262626',
              fontSize: 14,
              borderBottom: '1px solid #f0f0f0',
              paddingBottom: 8,
            }}
          >
            기본 정보
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              저장소명
            </span>
            <Input
              style={{ flex: 1 }}
              value={selectedServiceInfo.serviceName || ''}
              onChange={e => onFieldChange('serviceName', e.target.value)}
              placeholder='저장소 이름'
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              Git URL
            </span>
            <Input
              style={{ flex: 1 }}
              value={selectedServiceInfo.gitlabUrl || ''}
              placeholder='Git 저장소 URL'
              disabled
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              빌드/배포 인프라
            </span>
            <Select
              style={{ flex: 1 }}
              value={selectedServiceInfo.infraId}
              onChange={value => onFieldChange('infraId', value)}
              placeholder='인프라 선택'
              loading={infrastructuresLoading}
              allowClear
              notFoundContent={
                infrastructuresLoading ? '로딩 중...' : '인프라가 없습니다'
              }
            >
              {infrastructures.map(infra => (
                <Select.Option key={infra.id} value={infra.id}>
                  {infra.name} ({getDisplayInfraType(infra.type)})
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* GitLab 저장소 인증 섹션 - GitLab 정보 모달일 때만 표시 */}
      {(activeInfoModal === 'gitlab' || !activeInfoModal) && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              fontWeight: 600,
              color: '#262626',
              fontSize: 14,
              borderBottom: '1px solid #f0f0f0',
              paddingBottom: 8,
            }}
          >
            <span>GitLab 저장소 인증</span>
            <Space>
              {gitlabAuthStatus === 'success' && (
                <Tag icon={<CheckCircleOutlined />} color='success'>
                  인증 성공
                </Tag>
              )}
              {gitlabAuthStatus === 'failed' && (
                <Tag icon={<CloseCircleOutlined />} color='error'>
                  인증 실패
                </Tag>
              )}
              <Button
                type='primary'
                size='small'
                icon={
                  gitlabAuthLoading ? (
                    <LoadingOutlined />
                  ) : (
                    <SafetyCertificateOutlined />
                  )
                }
                loading={gitlabAuthLoading}
                onClick={onTestGitlabAuth}
                disabled={
                  !selectedServiceInfo.gitlabUrl ||
                  !selectedServiceInfo.gitlabAccessToken
                }
              >
                인증 테스트
              </Button>
            </Space>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              브랜치
            </span>
            <Select
              style={{ flex: 1 }}
              value={selectedServiceInfo.gitlabBranch || undefined}
              onChange={value => onFieldChange('gitlabBranch', value)}
              placeholder='브랜치 선택'
              loading={branchesLoading}
              notFoundContent={
                branchesLoading ? '로딩 중...' : '브랜치가 없습니다'
              }
              allowClear
            >
              {branches.map(branch => (
                <Select.Option key={branch.name} value={branch.name}>
                  {branch.name}{' '}
                  {branch.default && (
                    <Tag color='blue' style={{ marginLeft: 8 }}>
                      기본
                    </Tag>
                  )}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              사용자명
            </span>
            <Input
              style={{ flex: 1 }}
              value={selectedServiceInfo.gitlabUsername || ''}
              onChange={e => {
                onFieldChange('gitlabUsername', e.target.value);
                onGitlabAuthStatusChange('idle');
              }}
              placeholder='GitLab 사용자명'
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              Access Token
            </span>
            <Input.Password
              style={{ flex: 1 }}
              value={selectedServiceInfo.gitlabAccessToken || ''}
              onChange={e => {
                onFieldChange('gitlabAccessToken', e.target.value);
                onGitlabAuthStatusChange('idle');
              }}
              placeholder='GitLab Personal Access Token'
            />
          </div>
        </div>
      )}

      {/* Registry 인증 섹션 - Registry 정보 모달일 때만 표시 */}
      {(activeInfoModal === 'registry' || !activeInfoModal) && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              fontWeight: 600,
              color: '#262626',
              fontSize: 14,
              borderBottom: '1px solid #f0f0f0',
              paddingBottom: 8,
            }}
          >
            <span>Registry 인증</span>
            <Space>
              {registryAuthStatus === 'success' && (
                <Tag icon={<CheckCircleOutlined />} color='success'>
                  인증 성공
                </Tag>
              )}
              {registryAuthStatus === 'failed' && (
                <Tag icon={<CloseCircleOutlined />} color='error'>
                  인증 실패
                </Tag>
              )}
              <Button
                type='primary'
                size='small'
                icon={
                  registryTestLoading ? (
                    <LoadingOutlined />
                  ) : (
                    <CloudServerOutlined />
                  )
                }
                loading={registryTestLoading}
                onClick={onTestRegistryAuth}
                disabled={
                  !selectedServiceInfo.registryUsername ||
                  !selectedServiceInfo.registryPassword
                }
              >
                인증 테스트
              </Button>
            </Space>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              Registry 유형
            </span>
            <Select
              style={{ flex: 1 }}
              value={selectedServiceInfo.registryType || 'harbor'}
              onChange={(value: 'harbor' | 'dockerhub') => {
                onFieldChange('registryType', value);
                onRegistryAuthStatusChange('idle');
              }}
            >
              <Select.Option value='harbor'>Harbor</Select.Option>
              <Select.Option value='dockerhub'>Docker Hub</Select.Option>
            </Select>
          </div>

          {selectedServiceInfo.registryType !== 'dockerhub' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                Registry URL
              </span>
              <Input
                style={{ flex: 1 }}
                value={selectedServiceInfo.registryUrl || ''}
                onChange={e => {
                  onFieldChange('registryUrl', e.target.value);
                  onRegistryAuthStatusChange('idle');
                }}
                placeholder='예: harbor.mipilab.com'
              />
            </div>
          )}

          {selectedServiceInfo.registryType === 'harbor' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
                프로젝트명
              </span>
              <Input
                style={{ flex: 1 }}
                value={selectedServiceInfo.registryProjectName || ''}
                onChange={e =>
                  onFieldChange('registryProjectName', e.target.value)
                }
                placeholder='예: myproject'
              />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              사용자명
            </span>
            <Input
              style={{ flex: 1 }}
              value={selectedServiceInfo.registryUsername || ''}
              onChange={e => {
                onFieldChange('registryUsername', e.target.value);
                onRegistryAuthStatusChange('idle');
              }}
              placeholder='Registry 사용자명'
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 120, fontWeight: 500, color: '#595959' }}>
              비밀번호
            </span>
            <Input.Password
              style={{ flex: 1 }}
              value={selectedServiceInfo.registryPassword || ''}
              onChange={e => {
                onFieldChange('registryPassword', e.target.value);
                onRegistryAuthStatusChange('idle');
              }}
              placeholder='Registry 비밀번호'
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceInfoEditForm;
