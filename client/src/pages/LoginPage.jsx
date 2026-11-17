import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../AuthContext';
import { authApi } from '../api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Chế độ: 'login' (Đăng nhập) hoặc 'forgot' (Đổi mật khẩu qua đường link như Facebook)
  const [mode, setMode] = useState('login');

  // State đăng nhập
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // State đổi / khôi phục mật khẩu qua link
  const [resetEmail, setResetEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Đếm ngược cho nút gửi lại mã
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendResetLink(targetEmail) {
    const emailToSend = targetEmail || resetEmail || form.email;
    if (!emailToSend) {
      setResetError('Vui lòng nhập địa chỉ email tài khoản của bạn.');
      return;
    }

    setResetError('');
    setResetToken('');
    setResetBusy(true);

    try {
      const { data } = await authApi.forgotPassword(emailToSend.trim());
      setSubmittedEmail(emailToSend.trim());
      setResetToken(data?.resetToken || '');
      setCountdown(60);
    } catch (err) {
      setResetError(err.message || 'Không thể gửi email khôi phục. Vui lòng thử lại sau.');
    } finally {
      setResetBusy(false);
    }
  }

  function handleResetSubmit(e) {
    e.preventDefault();
    handleSendResetLink();
  }

  function switchToForgot() {
    setResetEmail(form.email);
    setResetError('');
    setSubmittedEmail('');
    setResetToken('');
    setMode('forgot');
  }

  function switchToLogin() {
    setError('');
    setMode('login');
  }

  if (mode === 'forgot') {
    return (
      <AuthLayout
        eyebrow="Khôi phục quyền truy cập"
        title={submittedEmail ? 'Kiểm tra hộp thư' : 'Quên mật khẩu?'}
        description={
          submittedEmail
            ? 'Chúng tôi đã gửi đường link đặt lại mật khẩu như Facebook đến địa chỉ email của bạn.'
            : 'Nhập email tài khoản của bạn để nhận đường link thiết lập lại mật khẩu mới an toàn.'
        }
        footer={
          <div className="auth-footer-nav">
            <button type="button" className="back-to-login-btn-link" onClick={switchToLogin}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Quay lại Đăng nhập
            </button>
          </div>
        }
      >
        {submittedEmail ? (
          <div className="sent-success-state animate-fade-in">
            <div className="email-sent-badge">
              <div className="mail-icon-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H17.5C20 5 22 7 22 9.5V17z" />
                  <polyline points="22,7 12,14 2,7" />
                </svg>
                <span className="sent-check-mark">✓</span>
              </div>
            </div>

            <div className="sent-info-box">
              <span className="sent-label">Địa chỉ email nhận liên kết:</span>
              <strong className="sent-email-text">{submittedEmail}</strong>
            </div>

            <p className="sent-tip">
              Vui lòng kiểm tra hộp thư đến (hoặc mục <em>Spam / Thư rác</em>). Bấm vào liên kết trong thư để đặt mật khẩu mới mà không cần nhớ mật khẩu cũ.
            </p>

            {resetToken && (
              <div className="dev-token-box">
                <span className="dev-tag">Môi trường phát triển</span>
                <p>Đường link đặt lại mật khẩu demo đã sẵn sàng:</p>
                <Link to={`/reset-password/${resetToken}`} className="dev-link-btn">
                  Truy cập trang Đặt lại mật khẩu ngay →
                </Link>
              </div>
            )}

            <div className="resend-action-area">
              {countdown > 0 ? (
                <span className="resend-countdown">
                  Có thể gửi lại mã sau <strong>{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  className="button secondary full"
                  onClick={() => handleSendResetLink(submittedEmail)}
                  disabled={resetBusy}
                >
                  {resetBusy ? 'Đang gửi lại...' : 'Chưa nhận được? Gửi lại email'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <form className="form-stack" onSubmit={handleResetSubmit}>
            {resetError && (
              <div className="notice error animate-shake" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{resetError}</span>
              </div>
            )}

            <label className="field">
              <span>Email tài khoản luyện thi</span>
              <div className="input-with-icon-wrapper">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="ban@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="input-control"
                  autoFocus
                />
                <span className="input-lead-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,7 12,13 2,7" />
                  </svg>
                </span>
              </div>
            </label>

            <button className="button primary full large-btn" type="submit" disabled={resetBusy}>
              {resetBusy ? (
                <span className="btn-spinner-content">
                  <span className="spinner-icon" /> Đang gửi liên kết...
                </span>
              ) : (
                <>
                  Gửi đường link đổi mật khẩu
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Chào mừng trở lại"
      title="Đăng nhập tài khoản"
      description="Tiếp tục các bài thi thử đang làm dở và theo dõi bảng xếp hạng."
      footer={
        <>
          Chưa có tài khoản ôn luyện?{' '}
          <Link to="/register" className="auth-action-link">
            Đăng ký miễn phí →
          </Link>
        </>
      }
    >
      <form className="form-stack" onSubmit={handleLogin}>
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
          <span>Email cá nhân</span>
          <div className="input-with-icon-wrapper">
            <input
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="input-control"
              autoFocus
            />
            <span className="input-lead-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,7 12,13 2,7" />
              </svg>
            </span>
          </div>
        </label>

        <PasswordInput
          label="Mật khẩu"
          placeholder="Nhập mật khẩu của bạn"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          showStrengthMeter={false}
        />

        <div className="field-meta-row">
          <label className="checkbox-field compact">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <button
            type="button"
            className="forgot-password-link"
            onClick={switchToForgot}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button className="button primary full large-btn" type="submit" disabled={busy}>
          {busy ? (
            <span className="btn-spinner-content">
              <span className="spinner-icon" /> Đang kiểm tra...
            </span>
          ) : (
            <>
              Đăng nhập ngay
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
