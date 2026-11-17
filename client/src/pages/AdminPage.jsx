import { Link } from 'react-router-dom';

export default function AdminPage() {
  return (
    <section className="panel empty-state">
      <span className="empty-icon">✦</span>
      <div className="eyebrow">Quyền quản trị</div>
      <h1>Khu vực dành cho Admin</h1>
      <p className="muted">Phiên đăng nhập của bạn có quyền quản trị. Các API quản lý người dùng yêu cầu vai trò Admin.</p>
      <Link className="button primary" to="/profile">Quản lý hồ sơ</Link>
    </section>
  );
}
