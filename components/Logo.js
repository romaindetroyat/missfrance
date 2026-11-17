// Couronne de la marque (même dessin que la favicon)
export default function Logo({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0b04f" />
          <stop offset="1" stopColor="#e2577f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <path d="M15 42 L11 20 L23 29 L32 14 L41 29 L53 20 L49 42 Z" fill="#fff" />
      <rect x="15" y="45" width="34" height="6" rx="3" fill="#fff" />
    </svg>
  );
}
