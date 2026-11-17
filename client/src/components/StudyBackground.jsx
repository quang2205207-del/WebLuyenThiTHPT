export default function StudyBackground() {
  const particles = [
    { icon: '📚', left: '6%', size: '28px', duration: '18s', delay: '0s' },
    { icon: '🎓', left: '18%', size: '32px', duration: '22s', delay: '3s' },
    { icon: '✏️', left: '32%', size: '24px', duration: '16s', delay: '1s' },
    { icon: '💡', left: '48%', size: '30px', duration: '20s', delay: '4s' },
    { icon: '📐', left: '64%', size: '26px', duration: '17s', delay: '2s' },
    { icon: '⚛️', left: '78%', size: '32px', duration: '24s', delay: '5s' },
    { icon: '📝', left: '88%', size: '25px', duration: '19s', delay: '1.5s' },
    { icon: '🎯', left: '95%', size: '27px', duration: '21s', delay: '3.5s' },
  ];

  return (
    <div className="background-study-elements" aria-hidden="true">
      {particles.map((p, index) => (
        <span
          key={index}
          style={{
            left: p.left,
            fontSize: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        >
          {p.icon}
        </span>
      ))}
    </div>
  );
}
