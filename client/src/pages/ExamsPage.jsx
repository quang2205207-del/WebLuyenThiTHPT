import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiRequest } from '../api';

const PAGE_SIZE = 12;

const DIFFICULTY_LABELS = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Nâng cao',
};

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 1) return 'Chưa có thời lượng';
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`
    : `${minutes} phút`;
}

export default function ExamsPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: 'newest' });
    if (query) params.set('q', query);

    apiRequest(`/exams?${params.toString()}`, { token })
      .then((response) => {
        if (!active) return;
        setExams(response.data || []);
        setPagination(response.pagination || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Không thể tải danh sách đề thi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, query, reloadKey, token]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  return (
    <section className="exam-list-page">
      <div className="exam-list-heading">
        <div>
          <div className="eyebrow">Kho đề luyện tập</div>
          <h1>Bắt đầu luyện đề</h1>
          <p className="muted">Chọn đề thi phù hợp để củng cố kiến thức và làm quen với thời gian phòng thi.</p>
        </div>
        <Link className="button secondary" to="/">← Trang chủ</Link>
      </div>

      <form className="exam-search" onSubmit={handleSearch}>
        <label className="exam-search-input">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm đề thi theo tên..."
            aria-label="Tìm đề thi theo tên"
          />
        </label>
        <button className="button primary" type="submit">Tìm đề</button>
      </form>

      <div className="exam-results-heading">
        <h2>{query ? `Kết quả cho “${query}”` : 'Đề thi mới nhất'}</h2>
        {pagination && <span>{pagination.total} đề thi</span>}
      </div>

      {error && (
        <div className="notice error exam-notice" role="alert">
          <span>{error}</span>
          <button className="button secondary small" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Thử tải lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="exam-state" role="status">Đang tải danh sách đề thi...</div>
      ) : !error && exams.length === 0 ? (
        <div className="exam-state">
          <span className="empty-icon">⌕</span>
          <h2>{query ? 'Chưa tìm thấy đề phù hợp' : 'Chưa có đề thi được xuất bản'}</h2>
          <p className="muted">{query ? 'Thử từ khóa khác để tìm đề thi.' : 'Đề thi mới sẽ xuất hiện tại đây khi được đăng tải.'}</p>
        </div>
      ) : (
        <div className="exam-grid">
          {exams.map((exam) => (
            <article className="exam-card" key={exam._id}>
              <div className="exam-card-top">
                <span className="exam-subject">{exam.subject?.name || 'Môn học'}</span>
                <span className={`exam-difficulty ${exam.difficulty || 'medium'}`}>
                  {DIFFICULTY_LABELS[exam.difficulty] || 'Trung bình'}
                </span>
              </div>
              <h3>{exam.title}</h3>
              {exam.description && <p className="exam-description">{exam.description}</p>}
              <div className="exam-card-meta">
                {exam.year && <span>{exam.year}</span>}
                <span>{formatDuration(exam.durationMinutes)}</span>
                <span>{exam.questionCount || 0} câu hỏi</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="exam-pagination" aria-label="Phân trang đề thi">
          <button
            className="button secondary small"
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!pagination.hasPrev || loading}
          >
            ← Trước
          </button>
          <span>Trang {pagination.page} / {pagination.totalPages}</span>
          <button
            className="button secondary small"
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!pagination.hasNext || loading}
          >
            Tiếp →
          </button>
        </nav>
      )}
    </section>
  );
}
