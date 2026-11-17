import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../AuthContext';
import { authApi } from '../api';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { acceptResetSession } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // Kiểm tra điều kiện
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password && confirmation && password === confirmation;
  const passwordsMismatch = confirmation && password !== confirmation;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (!hasLetter || !hasNumber) {
      setError('Mật khẩu cần bao gồm cả chữ cái và chữ số.');
      return;
    }

    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        acceptResetSession(data);
        navigate('/profile', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Bảo mật tài khoản"
      title="Đặt mật khẩu mới"
      description="Tạo một mật khẩu an toàn và dễ nhớ để bảo vệ tài khoản cũng như kết quả ôn luyện của bạn."
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
      {success ? (
        <div className="sent-success-state animate-fade-in">
          <div className="email-sent-badge">
            <div className="mail-icon-circle success-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <h3>Cập nhật thành công!</h3>
          <p className="sent-tip">Mật khẩu mới đã được lưu. Đang tự động đăng nhập vào tài khoản của bạn...</p>
        </div>
      ) : (
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

          <PasswordInput
            label="Mật khẩu mới"
            placeholder="Nhập ít nhất 8 ký tự"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showStrengthMeter={true}
          />

          <div className="field">
            <div className="field-label-row">
              <span>Xác nhận mật khẩu mới</span>
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
              name="confirmation"
              placeholder="Nhập lại mật khẩu mới vừa gõ"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              showStrengthMeter={false}
              error={passwordsMismatch ? 'Mật khẩu xác nhận không trùng khớp' : ''}
            />
          </div>

          {/* Checklist tiêu chí an toàn mật khẩu */}
          <div className="password-criteria-card">
            <span className="criteria-title">Yêu cầu bảo mật mật khẩu:</span>
            <ul className="criteria-list">
              <li className={hasMinLength ? 'met' : 'unmet'}>
                <span className="bullet-icon">{hasMinLength ? '✓' : '○'}</span>
                Độ dài tối thiểu từ 8 ký tự
              </li>
              <li className={hasLetter && hasNumber ? 'met' : 'unmet'}>
                <span className="bullet-icon">{hasLetter && hasNumber ? '✓' : '○'}</span>
                Bao gồm cả chữ cái và chữ số
              </li>
              <li className={passwordsMatch ? 'met' : 'unmet'}>
                <span className="bullet-icon">{passwordsMatch ? '✓' : '○'}</span>
                Hai lần nhập phải trùng khớp hoàn toàn
              </li>
            </ul>
          </div>

          <button className="button primary full large-btn" type="submit" disabled={busy}>
            {busy ? (
              <span className="btn-spinner-content">
                <span className="spinner-icon" /> Đang cập nhật mật khẩu...
              </span>
            ) : (
              <>
                Lưu mật khẩu & Đăng nhập
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
