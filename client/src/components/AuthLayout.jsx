import { Link } from 'react-router-dom';
import StudyBackground from './StudyBackground';
import ThemeToggle from './ThemeToggle';

export default function AuthLayout({
  eyebrow = 'Học chắc từng ngày',
  title,
  description,
  children,
  footer,
  asideTitle = 'Chinh phục điểm 9+ kỳ thi THPT',
  asideSubtitle = 'Nền tảng luyện đề thông minh bám sát cấu trúc đề minh họa mới nhất.',
}) {
  return (
    <div className="auth-viewport">
      <StudyBackground />
      {/* Nút quay về trang chủ */}
      <header className="auth-top-nav">
        <Link to="/" className="brand auth-brand" aria-label="Luyện đề THPT - Trang chủ">
          <span className="brand-mark">L</span>
          <span>Luyện đề <strong>THPT</strong></span>
        </Link>
        <div className="auth-top-actions">
          <ThemeToggle />
          <Link to="/" className="auth-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Về trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="auth-main-container">
        <div className="auth-split-wrapper">
          {/* Cột 1: Khối Form chính */}
          <section className="auth-form-column">
            <div className="auth-card-inner">
              <div className="auth-header">
                <span className="eyebrow">{eyebrow}</span>
                <h1 className="auth-title">{title}</h1>
                {description && <p className="muted auth-desc">{description}</p>}
              </div>

              <div className="auth-body">
                {children}
              </div>

              {footer && <footer className="auth-footer">{footer}</footer>}
            </div>

            <p className="auth-trust-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Bảo mật tài khoản & đồng bộ kết quả thi tự động
            </p>
          </section>

          {/* Cột 2: Showcase Panel (Thẩm mỹ & Giá trị thương hiệu) */}
          <aside className="auth-showcase-column" aria-hidden="true">
            <div className="showcase-glow" />
            <div className="showcase-content">
              <div className="showcase-badge">
                <span className="badge-sparkle">✦</span> Chuẩn ma trận đề 2026
              </div>
              <h2 className="showcase-heading">{asideTitle}</h2>
              <p className="showcase-subtext">{asideSubtitle}</p>

              <div className="showcase-features">
                <div className="feature-item">
                  <div className="feature-icon icon-ai">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <h4>Trợ lý AI phân tích điểm yếu</h4>
                    <p>Chỉ rõ phần kiến thức hổng và đề xuất bài tập bù đắp tức thì.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon icon-timer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h4>Phòng thi bấm giờ chuẩn quy chế</h4>
                    <p>Tập dượt phản xạ phòng thi thực tế với 10,000+ đề thi thử có đáp án chi tiết.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon icon-chart">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <h4>Theo dõi tiến độ & dự đoán điểm thi</h4>
                    <p>Biểu đồ phân tích độ chính xác theo chuyên đề và mức độ khó.</p>
                  </div>
                </div>
              </div>

              {/* Floating mini review widget */}
              <div className="showcase-testimonial">
                <div className="testimonial-rating">★★★★★</div>
                <p className="testimonial-quote">
                  "Luyện 3 đề mỗi tuần trên web giúp em tăng từ 6.8 lên 8.6 môn Toán."
                </p>
                <div className="testimonial-author">
                  <div className="author-dot">A</div>
                  <div>
                    <strong>Thành An</strong>
                    <span>THPT Chuyên Hà Nội - Amsterdam</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
