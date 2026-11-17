import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Kiểm tra xác nhận mật khẩu
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Mật khẩu cần có độ dài tối thiểu 8 ký tự.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    if (!agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng để tiếp tục.');
      return;
    }

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Tạo tài khoản miễn phí"
      title="Bắt đầu ôn luyện ngay"
      description="Lưu lại toàn bộ lịch sử làm đề, phân tích điểm mạnh - điểm yếu cùng AI."
      footer={
        <>
          Đã có tài khoản ôn thi?{' '}
          <Link to="/login" className="auth-action-link">
            Đăng nhập ngay →
          </Link>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        {error && (
          <div className="notice error animate-shake" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <label className="field">
          <span>Họ và tên học sinh</span>
          <div className="input-with-icon-wrapper">
            <input
              type="text"
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn Văn An"
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="input-control"
            />
            <span className="input-lead-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
          </div>
        </label>

        <label className="field">
          <span>Email cá nhân</span>
          <div className="input-with-icon-wrapper">
            <input
              type="email"
              autoComplete="email"
              placeholder="an.nguyen@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="input-control"
            />
            <span className="input-lead-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
          </div>
        </label>

        <PasswordInput
          label="Mật khẩu"
          placeholder="Tối thiểu 8 ký tự gồm chữ & số"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          showStrengthMeter={true}
          hint="Mẹo: Nên kết hợp chữ cái viết hoa, chữ số để bảo vệ tài khoản tốt hơn."
        />

        <div className="field">
          <div className="field-label-row">
            <span>Xác nhận mật khẩu</span>
            {passwordsMatch && (
              <span className="match-tag success">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Khớp mật khẩu
              </span>
            )}
            {passwordsMismatch && (
              <span className="match-tag error">Chưa khớp</span>
            )}
          </div>
          <PasswordInput
            label=""
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu ở trên"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            showStrengthMeter={false}
            error={passwordsMismatch ? 'Mật khẩu xác nhận không trùng khớp' : ''}
          />
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
          <span>
            Tôi đồng ý với <a href="#terms" onClick={(e) => e.preventDefault()}>Điều khoản dịch vụ</a> và{' '}
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Chính sách bảo mật</a>
          </span>
        </label>

        <button className="button primary full large-btn" type="submit" disabled={busy}>
          {busy ? (
            <span className="btn-spinner-content">
              <span className="spinner-icon" /> Đang tạo tài khoản...
            </span>
          ) : (
            <>
              Đăng ký tài khoản luyện đề
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
