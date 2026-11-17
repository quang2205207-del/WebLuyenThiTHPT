import { Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import StudyBackground from './components/StudyBackground';
import StudyNotebookCard from './components/StudyNotebookCard';
import StudyStation from './components/StudyStation';
import ThemeToggle from './components/ThemeToggle';
import AdminPage from './pages/AdminPage';
import ExamsPage from './pages/ExamsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      {/* Nền hoạt hình biểu tượng học tập bay lơ lửng */}
      <StudyBackground />

      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">L</span>
          <span>Luyện đề <strong>THPT</strong></span>
        </Link>
        <nav className="nav-actions">
          {/* Nút chuyển chế độ Sáng / Cú đêm ôn thi */}
          <ThemeToggle />

          {user ? (
            <>
              {user.role === 'admin' && <Link className="nav-link" to="/admin">Quản trị</Link>}
              <Link className="nav-user" to="/profile">
                <span className="nav-avatar">{(user.name || 'H').trim().charAt(0).toUpperCase()}</span>
                <span className="nav-user-name">{user.name}</span>
              </Link>
              <button className="button quiet" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/login">Đăng nhập</Link>
              <Link className="button primary small" to="/register">Tạo tài khoản</Link>
            </>
          )}
        </nav>
      </header>
      <main className="main-content"><Outlet /></main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Luyện đề THPT • Sĩ tử 2k... Quyết Đỗ Nguyện Vọng 1</span>
        <span>Học chắc từng ngày ✦ Vững vàng phòng thi</span>
      </footer>

      {/* Huy hiệu tiếp sức sĩ tử nổi ở góc phải */}
      <div className="brand-floating-badge" aria-hidden="true">
        <span className="brand-floating-dot" />
        <span>Phòng thi ảo • Chắc suất Đại học 🚀</span>
      </div>
    </div>
  );
}

function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="homepage-wrapper">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">🚀 Nền tảng luyện thi THPT Quốc Gia</div>
          <h1>Chạm gần hơn đến<br /><span>cánh cổng Đại học.</span></h1>
          <p className="muted">
            Ôn luyện theo ma trận đề mới nhất, phân tích điểm yếu và rèn luyện phản xạ phòng thi bấm giờ thực chiến.
          </p>
          {!loading && (
            <div className="hero-actions">
              {user ? (
                <Link className="button primary large-btn" to="/exams">
                  Bắt đầu luyện đề <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <>
                  <Link className="button primary" to="/register">Bắt đầu miễn phí <span aria-hidden="true">→</span></Link>
                  <Link className="button secondary" to="/login">Tôi đã có tài khoản</Link>
                </>
              )}
            </div>
          )}
          <div className="hero-footnote"><span className="status-dot" /> Tiến bộ mỗi ngày • Vững vàng kiến thức 9+</div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          
          {/* Sổ tay mục tiêu học tập tương tác trực tiếp */}
          <StudyNotebookCard />
        </div>
      </section>

      {/* Trạm Tiếp Sức Sĩ Tử (Lofi Chill, Thư Động Lực, Hộp Quà 10 Điểm, Mục Tiêu NV1) */}
      <StudyStation />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
    </Routes>
  );
}
