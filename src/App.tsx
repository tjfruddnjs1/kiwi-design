import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Result, Button } from 'antd';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { OrganizationProvider } from './context/OrganizationContext';
import ErrorBoundary from './components/common/ErrorBoundary';

import { Dashboard } from './pages/dashboard';
import { InfraManage } from './pages/infrastructure/management';
import { InfraSettings } from './pages/infrastructure/settings';
import { DeviceManagement } from './pages/devices';
import { BackupPage } from './pages/backup';
import Layout from './components/Layout';

import ProtectedRoute from './components/ProtectedRoute';

// Admin / Manager pages
import Organizations from './pages/admin/Organizations';
import Users from './pages/manager/Users';
import PermissionManagement from './pages/admin/PermissionManagement';

import { LoginPage, SignupPage } from './pages/auth';
import {
  ProjectManage as ProjectManagePage,
  ProjectDetailPage,
} from './pages/projects';
import { GitManage as GitManagePage } from './pages/gits';
import { DatabaseManagement } from './pages/database';
import CredentialPromptModalRoot from './components/common/CredentialPromptModal';
import GitEdit from './pages/gits/GitEdit';

// 4. 로그인한 사용자만 접근 가능한 라우트를 감싸는 컴포넌트 (Private Route)
const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth(); // isLoading 상태 가져오기

  if (isLoading) {
    // (핵심) 토큰 확인 중일 때는 로딩 스피너 등을 보여줌
    return <div>Loading...</div>; // 또는 <Spin size="large" /> 같은 Ant Design 컴포넌트 사용
  }

  // 로딩이 끝난 후, 로그인 상태에 따라 페이지를 보여주거나 리디렉션
  return isAuthenticated ? <Outlet /> : <Navigate to='/login' replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PermissionProvider>
          <OrganizationProvider>
            <Routes>
          {/* --- Public Routes: 로그인 없이 접근 가능한 페이지 --- */}
          <Route path='/login' element={<LoginPage />} />
          <Route path='/signup' element={<SignupPage />} />

          {/* --- Private Routes: 로그인해야만 접근 가능한 페이지 --- */}
          <Route element={<PrivateRoute />}>
            <Route path='/' element={<Layout />}>
              <Route index element={<Navigate to='/dashboard' replace />} />
              <Route path='dashboard' element={<Dashboard />} />
              <Route path='infrastructure' element={<InfraManage />} />
              <Route path='runtimes' element={<InfraSettings />} />
              <Route path='runtimes/:infraId' element={<InfraSettings />} />
              <Route path='devices' element={<DeviceManagement />} />
              <Route path='backup' element={<BackupPage />} />
              <Route path='/projects' element={<ProjectManagePage />} />
              <Route path='/services' element={<GitManagePage />} />
              <Route path='/services/edit/:id' element={<GitEdit />} />
              <Route path='/database' element={<DatabaseManagement />} />
              <Route
                path='/projects/:projectId'
                element={<ProjectDetailPage />}
              />
              {/* role-based routes (organization_members 테이블의 role 기준) */}
              <Route element={<ProtectedRoute roles={['Owner']} />}>
                <Route path='/organizations' element={<Organizations />} />
              </Route>
              <Route element={<ProtectedRoute roles={['Manager', 'Owner']} />}>
                <Route path='/users' element={<Users />} />
                <Route path='/permissions' element={<PermissionManagement />} />
              </Route>
            </Route>
          </Route>

          {/* 404 Not Found 페이지 */}
          <Route
            path='*'
            element={
              <main
                role='main'
                style={{ padding: '50px', textAlign: 'center' }}
              >
                <Result
                  status='404'
                  title='404'
                  subTitle='죄송합니다. 요청하신 페이지를 찾을 수 없습니다.'
                  extra={
                    <Button
                      type='primary'
                      onClick={() => window.history.back()}
                    >
                      이전 페이지로
                    </Button>
                  }
                />
              </main>
            }
          />
        </Routes>
            <CredentialPromptModalRoot />
          </OrganizationProvider>
        </PermissionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
