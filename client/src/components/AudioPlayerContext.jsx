import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const TRACKS = [
  {
    title: 'Lofi',
    author: 'Chill Beats',
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=80',
    src: '/bangkhuang.mp3',
  },
  {
    title: 'Tiếng Mưa Ô Cửa • Tập Trung Cao Độ',
    author: 'Study Ambience',
    cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'Giai Điệu Khải Hoàn • Tự Tin Phòng Thi',
    author: 'Sĩ Tử 2k...',
    cover: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=300&auto=format&fit=crop&q=80',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

const AudioPlayerContext = createContext(null);

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function AudioPlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const currentTrack = TRACKS[trackIndex];

  const playTrack = useCallback((index) => {
    setTrackIndex((index + TRACKS.length) % TRACKS.length);
    setCurrentTime(0);
    setDuration(0);
    setError('');
    setHasStarted(true);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    audio.play().catch(() => {
      setIsPlaying(false);
      setError('Không thể phát bài nhạc. Hãy thử lại hoặc chọn bài khác.');
    });
  }, [hasStarted, trackIndex]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    if (!hasStarted) {
      playTrack(trackIndex);
      return;
    }
    audio.play().catch(() => setError('Không thể phát bài nhạc. Hãy thử lại hoặc chọn bài khác.'));
  }, [hasStarted, isPlaying, playTrack, trackIndex]);

  const nextTrack = useCallback(() => {
    playTrack(trackIndex + 1);
  }, [playTrack, trackIndex]);

  const previousTrack = useCallback(() => {
    playTrack(trackIndex - 1);
  }, [playTrack, trackIndex]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setHasStarted(false);
  }, []);

  const seek = useCallback((event) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const nextTime = (Number(event.target.value) / 100) * audio.duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const value = useMemo(
    () => ({
      currentTrack,
      trackIndex,
      hasStarted,
      isPlaying,
      currentTime,
      duration,
      error,
      playTrack,
      togglePlay,
      nextTrack,
      previousTrack,
      stop,
      seek,
      formatTime,
    }),
    [
      currentTrack,
      trackIndex,
      hasStarted,
      isPlaying,
      currentTime,
      duration,
      error,
      playTrack,
      togglePlay,
      nextTrack,
      previousTrack,
      stop,
      seek,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {hasStarted && (
        <aside className="persistent-audio-player" aria-label="Trình phát nhạc">
          <img className="persistent-audio-cover" src={currentTrack.cover} alt="" />
          <div className="persistent-audio-info">
            <strong>{currentTrack.title}</strong>
            <span>{error || (isPlaying ? 'Đang phát nhạc' : 'Đang tạm dừng')}</span>
          </div>
          <button
            type="button"
            className="persistent-audio-control"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc'}
            title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
          >
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>
          <button
            type="button"
            className="persistent-audio-control"
            onClick={nextTrack}
            aria-label="Phát bài tiếp theo"
            title="Bài tiếp theo"
          >
            ⏭
          </button>
          <button
            type="button"
            className="persistent-audio-control stop"
            onClick={stop}
            aria-label="Dừng nhạc"
            title="Dừng nhạc"
          >
            ■
          </button>
        </aside>
      )}
      <audio
        ref={audioRef}
        className="persistent-audio-element"
        src={currentTrack.src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const length = event.currentTarget.duration;
          setDuration(Number.isFinite(length) ? length : 0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setCurrentTime(audio.currentTime);
          if (Number.isFinite(audio.duration)) setDuration(audio.duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setError('Không tải được bài nhạc. Hãy kiểm tra kết nối hoặc thử bài khác.');
        }}
        onEnded={nextTrack}
      />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) throw new Error('useAudioPlayer phải được sử dụng bên trong AudioPlayerProvider');
  return context;
}
