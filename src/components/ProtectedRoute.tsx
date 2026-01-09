import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  roles?: string[]; // 허용할 role 목록 (organization_members 테이블의 role 기준)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to='/login' replace />;

  if (roles && roles.length > 0) {
    const userRole = user?.role;
    // case-insensitive comparison to avoid mismatches like 'Admin' vs 'admin'
    const allowed = roles.map(r => String(r).toLowerCase());
    const actual = userRole ? String(userRole).toLowerCase() : '';

    if (!actual || !allowed.includes(actual)) {
      return <Navigate to='/' replace />; // 권한 없음 시 홈으로
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
