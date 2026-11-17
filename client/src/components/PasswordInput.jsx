import { useState } from 'react';

export default function PasswordInput({
  label = 'Mật khẩu',
  value,
  onChange,
  placeholder = 'Nhập mật khẩu',
  autoComplete = 'current-password',
  required = true,
  name = 'password',
  minLength = 8,
  maxLength = 72,
  showStrengthMeter = false,
  showToggle = true,
  hint,
  error,
}) {
  const [visible, setVisible] = useState(false);

  // Tính điểm độ mạnh mật khẩu (0 - 4)
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Yếu', color: '#ef4444' };
      case 2:
        return { score: 2, label: 'Trung bình', color: '#f59e0b' };
      case 3:
        return { score: 3, label: 'Khá', color: '#3b82f6' };
      case 4:
        return { score: 4, label: 'Rất mạnh', color: '#10b981' };
      default:
        return { score: 0, label: 'Quá ngắn', color: '#ef4444' };
    }
  };

  const strength = calculateStrength(value);

  return (
    <div className="field password-field-group">
      <div className="field-label-row">
        <span>{label}</span>
        {showStrengthMeter && value && (
          <span className="strength-text" style={{ color: strength.color }}>
            Độ mạnh: <strong>{strength.label}</strong>
          </span>
        )}
      </div>

      <div className="input-with-icon-wrapper">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          required={required}
          className={`input-control ${error ? 'has-error' : ''}`}
        />

        {showToggle && (
          <button
            type="button"
            className="toggle-password-btn"
            onClick={() => setVisible(!visible)}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {showStrengthMeter && value && (
        <div className="strength-meter">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={`strength-bar ${step <= strength.score ? 'active' : ''}`}
              style={{ backgroundColor: step <= strength.score ? strength.color : undefined }}
            />
          ))}
        </div>
      )}

      {hint && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error-text">{error}</small>}
    </div>
  );
}
