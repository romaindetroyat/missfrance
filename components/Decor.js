// Décor de fond : couronne en filigrane, paillettes qui scintillent, confettis qui flottent
const STARS = [
  [7, 18, 22, "#d4a64a", 3.2, 0], [44, 9, 14, "#e2577f", 2.6, 0.8], [63, 30, 18, "#d4a64a", 3.8, 1.4],
  [28, 36, 12, "#5b8def", 2.9, 0.3], [88, 52, 16, "#e2577f", 3.4, 2], [12, 70, 14, "#d4a64a", 3, 1.1],
  [76, 82, 12, "#5b8def", 2.7, 0.5], [52, 64, 10, "#d4a64a", 3.6, 1.8],
];
const DOTS = [
  [18, 26, 10, "#e2577f", 6, 0], [82, 40, 8, "#d4a64a", 7, 1], [54, 5, 6, "#5b8def", 5, 0.5],
  [35, 78, 8, "#d4a64a", 6.5, 2], [92, 18, 6, "#e2577f", 5.5, 1.5], [5, 48, 7, "#5b8def", 7.5, 0.8],
];
const Star = () => <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />;

export default function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <svg className="decor-crown" viewBox="0 0 64 44"><path d="M6 38 L2 8 L18 20 L32 2 L46 20 L62 8 L58 38 Z" /></svg>
      {STARS.map(([x, y, s, c, d, delay], i) => (
        <svg key={i} className="decor-star" viewBox="0 0 24 24" width={s} height={s}
          style={{ left: `${x}%`, top: `${y}%`, fill: c, animationDuration: `${d}s`, animationDelay: `${delay}s` }}><Star /></svg>
      ))}
      {DOTS.map(([x, y, s, c, d, delay], i) => (
        <span key={i} className="decor-dot"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, background: c, animationDuration: `${d}s`, animationDelay: `${delay}s` }} />
      ))}
    </div>
  );
}
