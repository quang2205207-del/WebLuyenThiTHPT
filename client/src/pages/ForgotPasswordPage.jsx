import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { authApi } from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Đếm ngược cho nút gửi lại
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleSend(targetEmail) {
    const emailToSend = targetEmail || email;
    if (!emailToSend) return;

    setError('');
    setMessage('');
    setResetToken('');
    setBusy(true);

    try {
      const { data, message: responseMessage } = await authApi.forgotPassword(emailToSend.trim());
      setMessage(responseMessage || 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.');
      setSubmittedEmail(emailToSend.trim());
      setResetToken(data?.resetToken || '');
      setCountdown(60); // Đặt thời gian chờ 60 giây trước khi cho phép gửi lại
    } catch (err) {
      setError(err.message || 'Không thể gửi email khôi phục. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleSend();
  }

  return (
    <AuthLayout
      eyebrow="Khôi phục quyền truy cập"
      title={submittedEmail ? 'Kiểm tra hộp thư' : 'Quên mật khẩu?'}
      description={
        submittedEmail
          ? `Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến địa chỉ email của bạn.`
          : 'Đừng lo lắng! Nhập email tài khoản của bạn để nhận liên kết thiết lập lại mật khẩu an toàn.'
      }
      footer={
        <div className="auth-footer-nav">
          <Link to="/login" className="back-to-login-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Quay lại Đăng nhập
          </Link>
        </div>
      }
    >
      {submittedEmail ? (
        /* State 2: Đã gửi email thành công */
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
            <span className="sent-label">Địa chỉ email nhận:</span>
            <strong className="sent-email-text">{submittedEmail}</strong>
          </div>

          <p className="sent-tip">
            Vui lòng kiểm tra hộp thư đến (hoặc mục <em>Spam / Thư rác</em>). Bấm vào liên kết trong email để tiếp tục.
          </p>

          {resetToken && (
            <div className="dev-token-box">
              <span className="dev-tag">Môi trường phát triển</span>
              <p>Mã đặt lại mật khẩu demo đã sẵn sàng:</p>
              <Link to={`/reset-password/${resetToken}`} className="dev-link-btn">
                Truy cập ngay trang Đặt lại mật khẩu →
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
                onClick={() => handleSend(submittedEmail)}
                disabled={busy}
              >
                {busy ? 'Đang gửi lại...' : 'Chưa nhận được? Gửi lại email'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* State 1: Form nhập email */
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
            <span>Email tài khoản luyện thi</span>
            <div className="input-with-icon-wrapper">
              <input
                type="email"
                autoComplete="email"
                placeholder="ban@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          <button className="button primary full large-btn" type="submit" disabled={busy}>
            {busy ? (
              <span className="btn-spinner-content">
                <span className="spinner-icon" /> Đang kiểm tra & gửi thư...
              </span>
            ) : (
              <>
                Gửi liên kết khôi phục
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
