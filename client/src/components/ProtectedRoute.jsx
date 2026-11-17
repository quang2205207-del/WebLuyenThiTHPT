import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function ProtectedRoute({ roles }) {
  const { user, loading, sessionError, refreshSession } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Đang kiểm tra phiên đăng nhập...</div>;
  if (sessionError) {
    return (
      <div className="session-error" role="alert">
        <p>{sessionError}</p>
        <button className="button secondary" onClick={refreshSession}>Thử lại</button>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/profile" replace />;
  return <Outlet />;
}
