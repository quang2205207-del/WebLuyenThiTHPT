import { useState, useEffect } from 'react';

const DEFAULT_NOTEBOOK = {
  nv1: 'Nguyện Vọng 1',
  scoreTarget: '27.5+ Khối A/D',
  bookmarkTag: 'TARGET 27+',
  tasks: [
    { id: '1', text: 'Giải 1 đề Toán THPTQG', badge: '9.2đ', completed: true },
    { id: '2', text: '2 bài Đọc hiểu Tiếng Anh & Từ vựng', badge: '', completed: true },
    { id: '3', text: 'Tổng ôn 50 câu Lý thuyết Trọng tâm', badge: '', completed: false }
  ]
};

const BOOKMARK_PRESETS = ['TARGET 27+', 'QUYẾT ĐỖ NV1', 'THỦ KHOA 2026', '9+ MỌI MÔN', 'CÚ ĐÊM 10Đ'];

export default function StudyNotebookCard() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('study_notebook_data');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_NOTEBOOK;
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editNv1, setEditNv1] = useState(data.nv1);
  const [editScore, setEditScore] = useState(data.scoreTarget);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  // Tự động lưu vào localStorage khi có thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('study_notebook_data', JSON.stringify(data));
    } catch (err) {
      console.error('Không thể lưu mục tiêu vào localStorage:', err);
    }
  }, [data]);

  // Tick / Bỏ tick nhiệm vụ
  function toggleTask(id) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    }));
  }

  // Xóa nhiệm vụ
  function deleteTask(id, e) {
    e.stopPropagation();
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== id)
    }));
  }

  // Thêm nhiệm vụ mới
  function handleAddTask(e) {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;

    const newTask = {
      id: Date.now().toString(),
      text: trimmed,
      badge: '',
      completed: false
    };

    setData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
    setNewTaskText('');
    setIsAddingTask(false);
  }

  // Lưu mục tiêu NV1 & điểm số
  function handleSaveTarget(e) {
    e.preventDefault();
    setData((prev) => ({
      ...prev,
      nv1: editNv1.trim() || 'Nguyện Vọng 1',
      scoreTarget: editScore.trim() || '27.5+ Khối A/D'
    }));
    setIsEditingTarget(false);
  }

  // Đổi nhanh tag bookmark
  function cycleBookmarkTag() {
    const currentIndex = BOOKMARK_PRESETS.indexOf(data.bookmarkTag);
    const nextIndex = (currentIndex + 1) % BOOKMARK_PRESETS.length;
    setData((prev) => ({ ...prev, bookmarkTag: BOOKMARK_PRESETS[nextIndex] }));
  }

  // Khôi phục mặc định
  function handleReset() {
    if (window.confirm('Bạn có muốn đặt lại mục tiêu về mẫu ban đầu?')) {
      setData(DEFAULT_NOTEBOOK);
      setEditNv1(DEFAULT_NOTEBOOK.nv1);
      setEditScore(DEFAULT_NOTEBOOK.scoreTarget);
      setIsEditingTarget(false);
      setIsAddingTask(false);
    }
  }

  // Tính toán tiến độ
  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isAllDone = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <div className="study-notebook-wrapper">
      <div className="visual-card study-notebook-card interactive">
        {/* Lò xo sổ tay ở mép trên */}
        <div className="notebook-spirals">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="spiral-item">
              <span className="spiral-hole" />
              <span className="spiral-ring" />
            </div>
          ))}
        </div>

        {/* Băng dính dán góc & Thẻ kẹp bookmark có thể click đổi */}
        <div className="notebook-washi-tape" />
        <button
          type="button"
          className="notebook-bookmark-tag"
          onClick={cycleBookmarkTag}
          title="Nhấn để đổi khẩu hiệu bookmark"
        >
          {data.bookmarkTag} <span>↻</span>
        </button>

        {/* Tiêu đề sổ tay & Nút reset */}
        <div className="notebook-header">
          <div className="notebook-label">
            <span className="notebook-label-icon">📓</span>
            <span>KẾ HOẠCH HÔM NAY</span>
          </div>
          <div className="notebook-header-actions">
            <span className="notebook-countdown">Đếm ngược THPTQG 🎯</span>
            <button
              type="button"
              className="notebook-reset-btn"
              onClick={handleReset}
              title="Khôi phục lại mục tiêu mẫu"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Banner mục tiêu lớn (Có thể click để sửa) */}
        {isEditingTarget ? (
          <form className="notebook-target-edit-form" onSubmit={handleSaveTarget}>
            <div className="target-edit-inputs">
              <input
                type="text"
                value={editNv1}
                onChange={(e) => setEditNv1(e.target.value)}
                placeholder="Trường / Nguyện vọng 1 (vd: ĐH Bách Khoa)..."
                autoFocus
                required
              />
              <input
                type="text"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                placeholder="Chỉ tiêu điểm (vd: 28+ Khối A)..."
                required
              />
            </div>
            <div className="target-edit-actions">
              <button type="submit" className="target-btn-save">Lưu</button>
              <button
                type="button"
                className="target-btn-cancel"
                onClick={() => setIsEditingTarget(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div
            className="notebook-target-banner clickable"
            onClick={() => {
              setEditNv1(data.nv1);
              setEditScore(data.scoreTarget);
              setIsEditingTarget(true);
            }}
            title="Nhấn để chỉnh sửa trường mơ ước & chỉ tiêu điểm"
          >
            <span className="target-pin">📌</span>
            <div className="target-info">
              <div className="target-title">
                Mục tiêu: Đỗ <strong>{data.nv1}</strong>
              </div>
              <div className="target-sub">
                Chỉ tiêu điểm thi: <strong>{data.scoreTarget}</strong>
              </div>
            </div>
            <span className="target-edit-icon" title="Sửa mục tiêu">✎</span>
          </div>
        )}

        {/* Danh sách nhiệm vụ ôn thi ghi ra vở (Có thể tương tác) */}
        <div className="notebook-tasks">
          {data.tasks.map((task) => (
            <div
              key={task.id}
              className={`notebook-task-item ${task.completed ? 'checked' : 'in-progress'}`}
              onClick={() => toggleTask(task.id)}
              title={task.completed ? 'Bấm để đánh dấu chưa xong' : 'Bấm để hoàn thành'}
            >
              <button
                type="button"
                className={`task-checkbox ${task.completed ? '' : 'pending'}`}
                aria-label={task.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
              >
                {task.completed ? '✓' : '⏳'}
              </button>
              <span className="task-text">
                {task.text}
                {task.badge && <span className="task-badge">{task.badge}</span>}
              </span>
              <button
                type="button"
                className="task-delete-btn"
                onClick={(e) => deleteTask(task.id, e)}
                title="Xóa nhiệm vụ này"
              >
                ×
              </button>
            </div>
          ))}

          {data.tasks.length === 0 && (
            <div className="notebook-empty">Chưa có nhiệm vụ nào. Nhấn "+ Thêm mục tiêu" bên dưới nhé!</div>
          )}
        </div>

        {/* Nút thêm nhiệm vụ mới */}
        {isAddingTask ? (
          <form className="notebook-add-task-form" onSubmit={handleAddTask}>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Ghi mục tiêu mới (vd: Ôn 30 câu Đọc hiểu)..."
              autoFocus
            />
            <div className="add-task-actions">
              <button type="submit" className="add-task-submit">Thêm</button>
              <button
                type="button"
                className="add-task-cancel"
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskText('');
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="notebook-add-btn"
            onClick={() => setIsAddingTask(true)}
          >
            <span>+</span> Thêm mục tiêu hôm nay
          </button>
        )}

        {/* Thanh tiến độ hoàn thành mục tiêu */}
        <div className="notebook-progress-section">
          <div className="notebook-progress-info">
            <span>Tiến độ hoàn thành:</span>
            <strong>
              {progressPercent}% ({completedTasks}/{totalTasks} mục tiêu)
            </strong>
          </div>
          <div className="visual-progress">
            <span
              style={{
                width: `${progressPercent}%`,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Lời ghi chú động lực cuối trang sổ */}
        <div className={`notebook-footer-note ${isAllDone ? 'celebrate' : ''}`}>
          <span className="quote-icon">{isAllDone ? '🎉' : '✍️'}</span>
          <span className="quote-text">
            {isAllDone
              ? 'Tuyệt vời! Bạn đã hoàn thành xuất sắc 100% mục tiêu hôm nay!'
              : '"Mỗi đề giải xong đều đáng giá một bước chân vào ĐH."'}
          </span>
        </div>
      </div>
    </div>
  );
}
