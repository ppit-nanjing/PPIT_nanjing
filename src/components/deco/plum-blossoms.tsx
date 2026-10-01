import type { CSSProperties } from "react";

/**
 * Plum blossom ornament (梅花, Nanjing's city flower). Decoration only: it is
 * aria-hidden, never carries meaning, and never text. Colours come from the
 * `blossom` token, so it follows every palette.
 *
 * Render <PlumSymbols /> ONCE per page (it defines the shared <symbol>s), then
 * any number of <PlumBlossoms />. Motion is pure CSS (see "Plum blossoms" in
 * globals.css); under prefers-reduced-motion the blossoms stay, but still.
 */
export function PlumSymbols() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="plum" viewBox="0 0 24 24">
          <g fill="currentColor">
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} cx="12" cy="6.2" rx="3.6" ry="4.4" transform={`rotate(${r} 12 12)`} />
            ))}
          </g>
          <g stroke="var(--color-muted-gold)" strokeWidth=".6" strokeLinecap="round" fill="none">
            <path d="M12 12V8.6M12 12l3.2-1.1M12 12l-3.2-1.1M12 12l2 2.7M12 12l-2 2.7" />
          </g>
          <circle cx="12" cy="12" r="1.6" fill="var(--color-muted-gold)" />
        </symbol>
        <symbol id="plum-line" viewBox="0 0 24 24">
          <g fill="none" stroke="currentColor" strokeWidth=".55">
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} cx="12" cy="6.2" rx="3.6" ry="4.4" transform={`rotate(${r} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="1.5" />
            <path d="M12 12V8.8M12 12l3-1M12 12l-3-1M12 12l1.9 2.5M12 12l-1.9 2.5" strokeLinecap="round" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

/** x/y in %, s = size px, d = animation delay s, t = loop s, o = opacity. */
type Blossom = { x: number; y: number; s: number; d: number; t: number; o: number; tone?: "lt" | "dk"; fall?: boolean };

// The first seven are the ones kept on phones (the rest hide below 680px), so they
// are a deliberate mix of static and falling blossoms. `y` for falling blossoms is
// their resting place when motion is reduced.
const HERO: Blossom[] = [
  { x: 6, y: 20, s: 22, d: -3, t: 18, o: 0.6 },
  { x: 86, y: 14, s: 28, d: -9, t: 20, o: 0.6 },
  { x: 14, y: 66, s: 19, d: -13, t: 17, o: 0.55, tone: "lt" },
  { x: 24, y: 36, s: 18, d: -6, t: 20, o: 0.5, fall: true },
  { x: 70, y: 40, s: 22, d: -14, t: 24, o: 0.5, tone: "lt", fall: true },
  { x: 92, y: 58, s: 16, d: -2, t: 18, o: 0.55, fall: true },
  { x: 78, y: 70, s: 24, d: -6, t: 19, o: 0.6, tone: "dk" },
  { x: 3, y: 48, s: 15, d: -11, t: 16, o: 0.5 },
  { x: 94, y: 44, s: 18, d: -4, t: 21, o: 0.55, tone: "lt" },
  { x: 20, y: 8, s: 14, d: -8, t: 15, o: 0.5 },
  { x: 62, y: 6, s: 16, d: -15, t: 17, o: 0.45, tone: "lt" },
  { x: 8, y: 52, s: 26, d: -18, t: 26, o: 0.5, tone: "dk", fall: true },
  { x: 48, y: 30, s: 14, d: -10, t: 28, o: 0.4, tone: "lt", fall: true },
  { x: 84, y: 24, s: 20, d: -20, t: 22, o: 0.5, fall: true },
  { x: 10, y: 30, s: 18, d: -5, t: 16, o: 0.6, tone: "lt" },
  { x: 12.5, y: 37, s: 12, d: -9, t: 19, o: 0.55 },
  { x: 90, y: 74, s: 18, d: -2, t: 18, o: 0.6 },
  { x: 87, y: 81, s: 13, d: -12, t: 15, o: 0.5, tone: "dk" },
];

const BAND: Blossom[] = [
  { x: 4, y: 18, s: 20, d: -3, t: 19, o: 0.55 },
  { x: 93, y: 62, s: 24, d: -9, t: 21, o: 0.6, tone: "lt" },
  { x: 9, y: 74, s: 16, d: -12, t: 17, o: 0.5, tone: "dk" },
  { x: 88, y: 8, s: 17, d: -6, t: 18, o: 0.5 },
];

export function PlumBlossoms({ variant = "hero" }: { variant?: "hero" | "band" }) {
  const list = variant === "band" ? BAND : HERO;
  return (
    <div className={`blossom-layer${variant === "band" ? " band" : ""}`} aria-hidden="true">
      {list.map((b, i) => (
        <svg
          key={i}
          className={`blossom${b.tone ? ` ${b.tone}` : ""}${b.fall ? " fall" : ""}`}
          style={
            {
              "--x": `${b.x}%`,
              "--y": `${b.y}%`,
              "--s": `${b.s}px`,
              "--d": `${b.d}s`,
              "--t": `${b.t}s`,
              "--o": b.o,
            } as CSSProperties
          }
          viewBox="0 0 24 24"
        >
          <use href="#plum" />
        </svg>
      ))}
    </div>
  );
}
