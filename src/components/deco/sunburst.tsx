/**
 * Art Deco sunburst: twelve rays and two rings, turning very slowly behind the
 * hero headline. Decoration only. The colour is currentColor, set to the
 * `muted-gold` token by the .deco-sunburst class (globals.css).
 */
export function Sunburst() {
  return (
    <svg className="deco-sunburst" viewBox="0 0 500 500" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1" opacity=".6">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="250" y1="250" x2="250" y2="6" transform={`rotate(${i * 30} 250 250)`} />
        ))}
      </g>
      <circle cx="250" cy="250" r="180" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="250" cy="250" r="120" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
    </svg>
  );
}
