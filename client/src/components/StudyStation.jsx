import { useEffect, useState } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';

const MOTIVATION_QUOTES = [
  '“Những đêm ôn thi một mình không hề vô nghĩa, chúng đang trải hoa hồng cho ngày nhận giấy báo trúng tuyển!”',
  '“Bình tĩnh bấm máy, tự tin đọc đề, chắc chắn 9+ trong tầm tay!”',
  '“Áp lực tạo nên kim cương. Bạn đã đi một chặng đường rất dài rồi, cố gắng thêm một chút nữa nhé!”',
  '“Cánh cổng Đại học mơ ước chỉ cách bạn một mùa ôn thi hết mình!”',
  '“Không có điểm đến nào xa xôi nếu hôm nay ta kiên trì làm trọn vẹn từng đề thi.”',
];

export default function StudyStation() {
  const [activeModal, setActiveModal] = useState(null); // 'lofi' | 'letter' | 'gift' | 'goal' | null

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    error: audioError,
    playTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    formatTime,
  } = useAudioPlayer();

  // Động lực
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Mục tiêu học tập lưu localStorage
  const [targetGoal, setTargetGoal] = useState(() => {
    const saved = localStorage.getItem('thpt_study_goal');
    return saved
      ? JSON.parse(saved)
      : { school: 'Đại học Bách Khoa Hà Nội', major: 'Khoa học Máy tính', score: '28.5' };
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(targetGoal);
  const [copiedTip, setCopiedTip] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function closeModal() {
    setActiveModal(null);
  }

  function handleSaveGoal(e) {
    e.preventDefault();
    setTargetGoal(tempGoal);
    localStorage.setItem('thpt_study_goal', JSON.stringify(tempGoal));
    setIsEditingGoal(false);
  }

  function nextQuote() {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATION_QUOTES.length);
  }

  function handleCopyGift() {
    setCopiedTip(true);
    setTimeout(() => setCopiedTip(false), 2000);
  }

  return (
    <section className="study-station-section">
      <div className="study-station-header">
        <span className="station-pill">✨ Không Gian Tiếp Sức Sĩ Tử 2K...</span>
        <h2 className="station-title">Trạm Năng Lượng & Góc Chill Ôn Luyện</h2>
        <p className="station-subtitle">
          Gác lại căng thẳng, nạp động lực và chuẩn bị tinh thần thép để chạm tay vào Nguyện Vọng 1.
        </p>
      </div>

      <div className="station-menu-grid">
        {/* Card 1: Góc Chill Lofi */}
        <button
          type="button"
          className="station-card"
          onClick={() => setActiveModal('lofi')}
        >
          <div className="station-card-icon icon-music">
            🎧
            {isPlaying && <span className="playing-pulse" />}
          </div>
          <div className="station-card-content">
            <h3 className="card-heading">Trạm Lofi</h3>
            <p className="card-desc">Giai điệu tập trung cao độ, giải tỏa căng thẳng khi cày đề khuya</p>
          </div>
          <span className="station-card-action">Bật nhạc →</span>
        </button>

        {/* Card 2: Thư Gửi Thủ Khoa */}
        <button
          type="button"
          className="station-card"
          onClick={() => setActiveModal('letter')}
        >
          <div className="station-card-icon icon-letter">💌</div>
          <div className="station-card-content">
            <h3 className="card-heading">Bức Thư Gửi Sĩ Tử</h3>
            <p className="card-desc">Lời nhắn nhủ tiếp lửa tinh thần cho những ngày tháng nỗ lực hết mình</p>
          </div>
          <span className="station-card-action">Mở thư →</span>
        </button>

        {/* Card 3: Hộp Quà 10 Điểm */}
        <button
          type="button"
          className="station-card"
          onClick={() => setActiveModal('gift')}
        >
          <div className="station-card-icon icon-gift">🎁</div>
          <div className="station-card-content">
            <h3 className="card-heading">Hộp Quà 10 Điểm</h3>
            <p className="card-desc">Bộ mẹo bấm máy Casio siêu tốc & cẩm nang tránh bẫy phòng thi</p>
          </div>
          <span className="station-card-action">Nhận quà →</span>
        </button>

        {/* Card 4: Mục Tiêu NV1 */}
        <button
          type="button"
          className="station-card"
          onClick={() => setActiveModal('goal')}
        >
          <div className="station-card-icon icon-goal">🎯</div>
          <div className="station-card-content">
            <h3 className="card-heading">Sổ Tay Nguyện Vọng 1</h3>
            <p className="card-desc">
              Mục tiêu: <strong>{targetGoal.school}</strong> • Điểm kỳ vọng: <strong>{targetGoal.score}+</strong>
            </p>
          </div>
          <span className="station-card-action">Xem mục tiêu →</span>
        </button>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Modal Lofi Player */}
      {activeModal === 'lofi' && (
        <div className="study-modal-overlay" onClick={closeModal}>
          <div className="study-modal lofi-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeModal}
              aria-label="Đóng"
            >
              ✕
            </button>
            <div className="modal-badge">🎧</div>
            <h3 className="modal-heading">Trạm Lofi</h3>
            <p className="modal-subheading">Bật nhạc lên, thả lỏng tâm trí và bắt đầu chinh phục từng câu hỏi khó!</p>

            <div className="station-player">
              <div className="station-record-wrapper">
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  className={`station-record-img ${isPlaying ? 'is-playing' : ''}`}
                />
                <div className="station-record-pin" />
              </div>

              <div className="station-track-info">
                <h4 className="track-name">{currentTrack.title}</h4>
                <p className="track-author">{currentTrack.author}</p>
              </div>

              <div className="station-waveform-indicator">
                <span className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} />
                <span className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} />
                <span className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} />
                <span className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} />
                <span className={`wave-bar ${isPlaying ? 'wave-active' : ''}`} />
              </div>

              <input
                type="range"
                className="station-range"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={seek}
                min="0"
                max="100"
                aria-label="Tua bài nhạc"
                disabled={!duration}
              />
              <div className="station-time-row">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              {audioError && <p className="station-audio-error" role="alert">{audioError}</p>}

              <div className="station-player-controls">
                <button
                  type="button"
                  className="player-btn control-secondary"
                  onClick={previousTrack}
                  title="Bài trước"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  className="player-btn control-play"
                  onClick={togglePlay}
                  title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  type="button"
                  className="player-btn control-secondary"
                  onClick={nextTrack}
                  title="Bài kế tiếp"
                >
                  ⏭
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Modal Thư Gửi Sĩ Tử */}
      {activeModal === 'letter' && (
        <div className="study-modal-overlay" onClick={closeModal}>
          <div className="study-modal letter-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeModal}
              aria-label="Đóng"
            >
              ✕
            </button>
            <div className="modal-badge">💌 Gửi Thủ Khoa Tương Lai</div>
            <h3 className="modal-heading">Bạn Đã Cố Gắng Rất Nhiều Rồi!</h3>
            
            <div className="quote-box">
              <span className="quote-icon">“</span>
              <p className="quote-content">{MOTIVATION_QUOTES[quoteIndex]}</p>
              <button type="button" className="quote-refresh-btn" onClick={nextQuote}>
                ✨ Lấy thêm năng lượng
              </button>
            </div>

            <div className="letter-body-text">
              <p>
                Kỳ thi THPT Quốc Gia là một cột mốc đặc biệt. Có những ngày bạn cảm thấy mệt mỏi với đống đề cương dày cộp, nhưng hãy tin rằng:
                <strong> mọi giọt mồ hôi hôm nay đều sẽ nở hoa trong ngày nhận điểm!</strong>
              </p>
              <p>
                Hãy giữ sức khỏe, ăn ngủ điều độ và vững tin vào chính mình. Đội ngũ Luyện đề THPT luôn đồng hành cùng bạn trên mọi chặng đường.
              </p>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="button primary full"
                onClick={closeModal}
              >
                Quyết tâm chiến đấu hết mình! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Hộp Quà 10 Điểm */}
      {activeModal === 'gift' && (
        <div className="study-modal-overlay" onClick={closeModal}>
          <div className="study-modal gift-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeModal}
              aria-label="Đóng"
            >
              ✕
            </button>
            <div className="modal-badge">🎁 Quà Tặng Độc Quyền</div>
            <h3 className="modal-heading">Cẩm Nang & Bí Kíp Phòng Thi 10 Điểm</h3>
            <p className="modal-subheading">
              Ghi nhớ ngay 3 nguyên tắc vàng giúp bạn tối ưu từng 0.2 điểm quý giá:
            </p>

            <div className="tips-list">
              <div className="tip-item">
                <span className="tip-badge">Mẹo 1</span>
                <div>
                  <strong>Chiến lược 35 câu đầu (Chiến thuật 25 phút):</strong>
                  <p>Làm nhanh, dứt khoát câu dễ. Đọc kỹ đề, tuyệt đối không để mất điểm ngớ ngẩn ở câu lý thuyết căn bản.</p>
                </div>
              </div>

              <div className="tip-item">
                <span className="tip-badge">Mẹo 2</span>
                <div>
                  <strong>Mẹo bấm Casio thế số thông minh:</strong>
                  <p>Dùng lệnh CALC với các giá trị đặc biệt (x = 100, x = 0.01) để rút gọn biểu thức hoặc giải nhanh tích phân phân kỳ.</p>
                </div>
              </div>

              <div className="tip-item">
                <span className="tip-badge">Mẹo 3</span>
                <div>
                  <strong>Quy tắc loại trừ 10s:</strong>
                  <p>Loại ngay 2 phương án đối nghịch cực đoan, kiểm tra đơn vị tính và dấu đạo hàm trước khi tô đáp án.</p>
                </div>
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="button primary full"
                onClick={handleCopyGift}
              >
                {copiedTip ? '✓ Đã ghi nhớ vào sổ tay!' : 'Đã hiểu và lưu lại bí kíp 📌'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Mục Tiêu NV1 */}
      {activeModal === 'goal' && (
        <div className="study-modal-overlay" onClick={closeModal}>
          <div className="study-modal goal-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeModal}
              aria-label="Đóng"
            >
              ✕
            </button>
            <div className="modal-badge">🎯 Bản Đồ Mục Tiêu</div>
            <h3 className="modal-heading">Sổ Tay Nguyện Vọng 1</h3>
            <p className="modal-subheading">Đặt mục tiêu rõ ràng là bước đầu tiên để biến ước mơ thành hiện thực.</p>

            {!isEditingGoal ? (
              <div className="goal-display-card">
                <div className="goal-stat-item">
                  <span className="stat-label">Trường mơ ước</span>
                  <span className="stat-value">{targetGoal.school}</span>
                </div>
                <div className="goal-stat-item">
                  <span className="stat-label">Ngành dự tuyển</span>
                  <span className="stat-value">{targetGoal.major}</span>
                </div>
                <div className="goal-stat-item score-highlight">
                  <span className="stat-label">Điểm số mục tiêu</span>
                  <span className="stat-value score-number">{targetGoal.score} Điểm</span>
                </div>

                <button
                  type="button"
                  className="button secondary full mt-12"
                  onClick={() => {
                    setTempGoal(targetGoal);
                    setIsEditingGoal(true);
                  }}
                >
                  ✏️ Thay đổi mục tiêu cá nhân
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveGoal} className="goal-form">
                <div className="form-group">
                  <label htmlFor="school-input">Trường Đại học bạn muốn thi đỗ:</label>
                  <input
                    id="school-input"
                    type="text"
                    className="input-control"
                    value={tempGoal.school}
                    onChange={(e) => setTempGoal({ ...tempGoal, school: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="major-input">Ngành học đam mê:</label>
                  <input
                    id="major-input"
                    type="text"
                    className="input-control"
                    value={tempGoal.major}
                    onChange={(e) => setTempGoal({ ...tempGoal, major: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="score-input">Điểm kỳ vọng (3 môn):</label>
                  <input
                    id="score-input"
                    type="text"
                    className="input-control"
                    value={tempGoal.score}
                    onChange={(e) => setTempGoal({ ...tempGoal, score: e.target.value })}
                    required
                  />
                </div>
                <div className="form-actions-inline">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setIsEditingGoal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="button primary">
                    Lưu mục tiêu ✨
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
