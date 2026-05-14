// src/components/Logo.jsx
export function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" rx="18" fill="#111"/>
      <g fill="white" opacity=".85">
        <ellipse cx="14" cy="40" rx="3.5" ry="6" transform="rotate(-15 14 40)"/>
        <ellipse cx="12" cy="30" rx="3" ry="5" transform="rotate(-30 12 30)"/>
        <ellipse cx="14" cy="50" rx="3" ry="5" transform="rotate(10 14 50)"/>
        <ellipse cx="66" cy="40" rx="3.5" ry="6" transform="rotate(15 66 40)"/>
        <ellipse cx="68" cy="30" rx="3" ry="5" transform="rotate(30 68 30)"/>
        <ellipse cx="66" cy="50" rx="3" ry="5" transform="rotate(-10 66 50)"/>
      </g>
      <text x="40" y="46" textAnchor="middle" fontSize="19" fontWeight="800"
        fontFamily="Georgia,serif" fill="white" letterSpacing="-0.5">SH</text>
      <ellipse cx="54" cy="26" rx="2.5" ry="3.5" fill="white" opacity=".7"/>
      <ellipse cx="54" cy="24.5" rx="1.2" ry="1.8" fill="white"/>
    </svg>
  );
}
