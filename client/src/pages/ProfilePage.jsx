import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState({ name: user.name || '', phone: user.phone || '', avatar: user.avatar || '' });
  const [profileNotice, setProfileNotice] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileNotice({ type: '', text: '' });
    setSavingProfile(true);
    try {
      const updated = await updateProfile(profile);
      setProfile({ name: updated.name || '', phone: updated.phone || '', avatar: updated.avatar || '' });
      setProfileNotice({ type: 'success', text: 'Thông tin hồ sơ đã được cập nhật.' });
    } catch (err) {
      setProfileNotice({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="content-grid profile-single-grid">
      <section className="panel profile-summary">
        <div className="avatar">
          {user.avatar ? <img src={user.avatar} alt="" /> : (user.name || 'H').trim().charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="eyebrow">Tài khoản của bạn</div>
          <h1>{user.name}</h1>
          <p className="muted">{user.email}</p>
        </div>
        <span className={`role-chip ${user.role}`}>{user.role === 'admin' ? 'Quản trị viên' : 'Học sinh'}</span>
      </section>

      <section className="panel profile-form-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Thông tin cá nhân</div>
            <h2>Hồ sơ cá nhân</h2>
          </div>
          <span className="section-icon">01</span>
        </div>
        <form className="form-stack" onSubmit={saveProfile}>
          {profileNotice.text && <div className={`notice ${profileNotice.type}`} role="status">{profileNotice.text}</div>}
          <label className="field">
            <span>Họ và tên</span>
            <input
              value={profile.name}
              maxLength={100}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
            <small>Email không thể thay đổi tại đây.</small>
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="Chưa cập nhật"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Ảnh đại diện (URL)</span>
            <input
              type="url"
              placeholder="https://..."
              value={profile.avatar}
              onChange={(event) => setProfile({ ...profile, avatar: event.target.value })}
            />
          </label>
          <button className="button primary" type="submit" disabled={savingProfile}>
            {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </section>
    </div>
  );
}
