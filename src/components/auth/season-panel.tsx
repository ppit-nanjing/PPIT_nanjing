"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, animate } from "motion/react";
import type { AnimationPlaybackControls } from "motion/react";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// 紫金山 (Purple Mountain) is the site's own default-theme namesake; 梅花
// (plum blossom, the "meihua" theme) blooms in Nanjing's early spring; Qixia
// Temple nearby is known specifically for autumn maple. One mountain,
// recoloured through what each season actually looks like there, instead of
// four unrelated illustrations - see the matching comment in globals.css.
// Deliberately NOT reactive to the site's [data-theme] city switcher.
const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
type Season = (typeof SEASON_ORDER)[number];

const SEASON_LABEL_KEY: Record<Season, TKey> = {
  spring: "auth.seasonSpring",
  summer: "auth.seasonSummer",
  autumn: "auth.seasonAutumn",
  winter: "auth.seasonWinter",
};

// Same 3 ridge shapes reused across every season - only the CSS custom
// properties they're filled with change (see globals.css). front=closest/
// most parallax, back=furthest/least.
const RIDGE_PATH = {
  front: "M0,150 L0,130 C50,110 90,124 135,108 C165,98 190,84 218,86 C245,88 270,108 305,100 C340,92 370,98 400,104 L400,150 Z",
  mid: "M0,150 L0,116 C60,98 105,110 155,98 C205,86 245,102 295,90 C335,80 365,88 400,84 L400,150 Z",
  back: "M0,150 L0,102 C55,88 95,98 145,88 C195,78 235,92 285,82 C325,74 355,80 400,76 L400,150 Z",
};
const RIDGE_DEPTH = { front: 18, mid: 10, back: 5 };

type ParticleShape = "petal" | "leaf" | "dot";
type ParticleStyle = {
  color: string;
  altColor?: string;
  count: number;
  sizeMin: number;
  sizeMax: number;
  speedMin: number;
  speedMax: number;
  sway: number;
  shape: ParticleShape;
};

const PARTICLE_STYLE: Record<"petal" | "leaf" | "snow", ParticleStyle> = {
  petal: { color: "#f2b8c6", count: 26, sizeMin: 5, sizeMax: 10, speedMin: 0.3, speedMax: 0.8, sway: 0.6, shape: "petal" },
  leaf: { color: "#e0813f", altColor: "#c9553a", count: 20, sizeMin: 6, sizeMax: 11, speedMin: 0.5, speedMax: 1.1, sway: 1.1, shape: "leaf" },
  snow: { color: "#ffffff", count: 34, sizeMin: 2, sizeMax: 4.5, speedMin: 0.25, speedMax: 0.6, sway: 0.4, shape: "dot" },
};

const SEASON_PARTICLE: Record<Season, keyof typeof PARTICLE_STYLE | null> = {
  spring: "petal",
  summer: null,
  autumn: "leaf",
  winter: "snow",
};

// Total window for the particle crossfade. Kept equal to
// --season-transition-duration in globals.css (.auth-season-panel's shared
// background/fill/opacity transition duration) so nothing outlives the base
// color fade - that's the single source of truth for season-change timing,
// this is just its JS-side mirror for the one remaining imperative tween.
const TRANSITION_MS = 900;

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  rot: number;
  rotSpeed: number;
  alpha: number;
  useAlt: boolean;
};

function makeParticle(style: ParticleStyle, width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: -20 - Math.random() * height,
    size: style.sizeMin + Math.random() * (style.sizeMax - style.sizeMin),
    speed: style.speedMin + Math.random() * (style.speedMax - style.speedMin),
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.005 + Math.random() * 0.007,
    rot: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    alpha: 0.45 + Math.random() * 0.4,
    useAlt: Math.random() > 0.5,
  };
}

function makeParticles(key: keyof typeof PARTICLE_STYLE | null, width: number, height: number): Particle[] {
  if (!key) return [];
  const style = PARTICLE_STYLE[key];
  return Array.from({ length: style.count }, () => makeParticle(style, width, height));
}

// One particle set plus which style key it's drawn with (null = summer, no
// particles). Two of these coexist briefly during a season-change crossfade:
// the outgoing set fades out while the incoming set fades in, instead of an
// instant swap.
type ParticleSet = { key: keyof typeof PARTICLE_STYLE | null; particles: Particle[] };

// Draws and advances one particle set, scaled by `alphaMul` (0-1) so the
// canvas crossfade in tick() can cross-dissolve an outgoing/incoming pair.
// Handles the `key === null` (summer) case for free: nothing to draw, so
// petals dissolve into empty air going into summer and leaves materialize
// from nothing coming out of it.
function drawParticleSet(
  ctx: CanvasRenderingContext2D,
  key: keyof typeof PARTICLE_STYLE | null,
  particles: Particle[],
  width: number,
  height: number,
  alphaMul: number,
) {
  if (!key || alphaMul <= 0) return;
  const style = PARTICLE_STYLE[key];
  for (const p of particles) {
    p.y += p.speed;
    p.sway += p.swaySpeed;
    p.x += Math.sin(p.sway) * style.sway;
    p.rot += p.rotSpeed;
    if (p.y > height + 20) {
      p.y = -20;
      p.x = Math.random() * width;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha * alphaMul;
    ctx.fillStyle = p.useAlt && style.altColor ? style.altColor : style.color;
    ctx.beginPath();
    if (style.shape === "leaf") {
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size * 0.7, 0, 0, p.size);
      ctx.quadraticCurveTo(-p.size * 0.7, 0, 0, -p.size);
    } else {
      ctx.ellipse(0, 0, p.size, p.size * (style.shape === "dot" ? 1 : 0.6), 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}

export function SeasonPanel() {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [seasonIdx, setSeasonIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const season = SEASON_ORDER[seasonIdx];

  const frontRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seasonRef = useRef<Season>(season);

  // Season-change transition bookkeeping so a rapid re-trigger (fast
  // repeated dot-clicks) can stop whatever's in flight instead of stacking.
  // The sky/ridge/orb/ink/branch/star fade is all plain CSS now (globals.css,
  // one shared duration/curve) - the particle crossfade is the only thing
  // left that needs imperative JS, since canvas alpha isn't CSS-drivable.
  const mountedRef = useRef(false); // skip the choreography on initial mount
  const transitionProgressRef = useRef(1); // particle crossfade blend, read by tick(); 1 = settled
  const particleTweenControlsRef = useRef<AnimationPlaybackControls | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-rotate. Depending on seasonIdx means a manual dot click (which sets
  // it directly) tears down and restarts this timer for free - no separate
  // "restart" flag needed.
  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = setInterval(() => setSeasonIdx((i) => (i + 1) % SEASON_ORDER.length), 5500);
    return () => clearInterval(id);
  }, [reduceMotion, paused, seasonIdx]);

  // The particle loop below is a single long-lived rAF closure (started once,
  // not per season) - it reads this ref each frame instead of `season`
  // directly so a season change never has to restart the loop.
  useEffect(() => {
    seasonRef.current = season;
  }, [season]);

  // Season-change transition: the sky/ridge/orb/ink/branch/star fade is all
  // plain CSS (globals.css, one shared duration/curve) and needs no JS at
  // all. This effect only handles the particle-crossfade progress consumed
  // by tick() below - canvas alpha isn't something CSS can drive. Skipped on
  // the initial mount (nothing "changed" yet) and entirely under reduced
  // motion - imperative animate() calls are NOT auto-gated by the app-wide
  // <MotionConfig reducedMotion="user"> (that only covers React `motion.*`
  // components), so `reduceMotion` is checked explicitly here too, matching
  // how this file already gates the interval/mousemove/rAF loop.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (reduceMotion) return;

    // A rapid repeated dot-click fires this effect again before the previous
    // transition finished: stop() commits the tween's current interpolated
    // value then releases it, so restarting continues smoothly instead of
    // snapping.
    function stopAll() {
      particleTweenControlsRef.current?.stop();
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    }
    stopAll();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an external system (the particle tween below) in response to `season` changing; `transitioning` only drives the data-transitioning attribute for external inspection, doesn't feed back into this effect's own deps
    setTransitioning(true);

    transitionProgressRef.current = 0;
    particleTweenControlsRef.current = animate(0, 1, {
      duration: 0.9,
      ease: [0.4, 0, 0.2, 1], // same curve as every CSS transition below - see --season-transition-ease in globals.css
      onUpdate: (v) => {
        transitionProgressRef.current = v;
      },
    });

    // Once the window has elapsed, explicitly cancel() (not stop()) the
    // tween. A naturally-*finished* Motion animation is never auto-released
    // otherwise, which could leave `transitionProgressRef` pinned to a stale
    // value if reduced motion toggles on later.
    transitionTimeoutRef.current = setTimeout(() => {
      particleTweenControlsRef.current?.cancel();
      transitionProgressRef.current = 1;
      setTransitioning(false);
    }, TRANSITION_MS);

    return stopAll;
  }, [season, reduceMotion]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    if (frontRef.current) frontRef.current.style.transform = `translateX(${nx * RIDGE_DEPTH.front}px)`;
    if (midRef.current) midRef.current.style.transform = `translateX(${nx * RIDGE_DEPTH.mid}px)`;
    if (backRef.current) backRef.current.style.transform = `translateX(${nx * RIDGE_DEPTH.back}px)`;
  }

  function resetParallax() {
    setPaused(false);
    if (frontRef.current) frontRef.current.style.transform = "";
    if (midRef.current) midRef.current.style.transform = "";
    if (backRef.current) backRef.current.style.transform = "";
  }

  // Particle canvas: persists across every season (never remounted), sized to
  // its own parent via ResizeObserver - no existing hook in this codebase for
  // that, written fresh here. Pattern otherwise follows qr-scanner.tsx: a ref
  // for the canvas, a ref for the rAF handle, cleanup that cancels the frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    let width = 0;
    let height = 0;
    // Two sets so a season change can cross-dissolve (outgoing fades out,
    // incoming fades in) instead of popping - see drawParticleSet/tick()
    // below. transitionProgressRef (written by the choreography effect
    // above) is the 0->1 blend between them.
    let outgoing: ParticleSet | null = null;
    let incoming: ParticleSet = { key: SEASON_PARTICLE[seasonRef.current], particles: [] };
    let lastSeason: Season | null = null;

    // Read the size straight off the ResizeObserver entry rather than a
    // separate getBoundingClientRect() call - the entry is guaranteed to
    // reflect the box the observer actually measured, so this can't drift out
    // of sync with what triggered the callback. Fires once immediately on
    // observe(), so no separate initial call is needed.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      width = canvas!.width = box ? box.inlineSize : entry.contentRect.width;
      height = canvas!.height = box ? box.blockSize : entry.contentRect.height;
      // Resize mid-crossfade: simplest safe behavior is to collapse straight
      // to a freshly-sized incoming set, matching this file's existing
      // "resize regenerates particles" baseline rather than trying to resize
      // two sets mid-blend.
      outgoing = null;
      transitionProgressRef.current = 1;
      const key = SEASON_PARTICLE[seasonRef.current];
      incoming = { key, particles: makeParticles(key, width, height) };
      lastSeason = seasonRef.current;
    });
    observer.observe(parent);

    let rafId: number | null = null;
    function tick() {
      if (seasonRef.current !== lastSeason) {
        // Season just changed (as observed by this rAF loop, which never
        // itself restarts): retire the current set as "outgoing" and spin up
        // a fresh "incoming" set, instead of an instant swap.
        outgoing = incoming;
        const key = SEASON_PARTICLE[seasonRef.current];
        incoming = { key, particles: makeParticles(key, width, height) };
        lastSeason = seasonRef.current;
      }
      ctx!.clearRect(0, 0, width, height);
      const progress = transitionProgressRef.current; // 0 (just switched) -> 1 (settled)
      if (outgoing && progress < 1) {
        drawParticleSet(ctx!, outgoing.key, outgoing.particles, width, height, 1 - progress);
      }
      drawParticleSet(ctx!, incoming.key, incoming.particles, width, height, outgoing ? progress : 1);
      rafId = requestAnimationFrame(tick);
    }
    if (!reduceMotion) rafId = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduceMotion]);

  return (
    <div
      className="auth-season-panel absolute inset-0 overflow-hidden flex flex-col justify-between px-8 py-2 s:py-2.5 m:py-3 l:py-3.5 sm:py-5 lg:py-10 lg:px-10"
      data-season={season}
      data-transitioning={transitioning}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={resetParallax}
    >
      {/* Fixed 320px reference "canvas" for the whole illustration, scaled
          down per mobile tier so the mountain/orb/stars shrink together as
          one true geometric miniature instead of each fighting the tiny
          outer strip height independently (which used to clip the ridge
          SVGs down to a thin baseline sliver, since they're sized off width
          not height). origin-bottom keeps the mountain grounded as it
          scales. At lg: this reverts to exactly today's h-full/no-transform
          behavior - the percentages inside resolve the same way either way. */}
      <div className="auth-season-scene absolute inset-x-0 bottom-0 h-[320px] origin-bottom scale-[0.2] s:scale-[0.25] m:scale-[0.3] l:scale-[0.35] sm:scale-[0.45] lg:h-full lg:scale-100">
        <div className="auth-season-star-wrap absolute inset-0 pointer-events-none">
          <div className="auth-season-star absolute" style={{ top: "8%", left: "20%", width: 3, height: 3, borderRadius: "50%", background: "#fff", animationDelay: "0s" }} />
          <div className="auth-season-star absolute" style={{ top: "14%", left: "42%", width: 3, height: 3, borderRadius: "50%", background: "#fff", animationDelay: "1.4s" }} />
          <div className="auth-season-star absolute" style={{ top: "10%", left: "85%", width: 3, height: 3, borderRadius: "50%", background: "#fff", animationDelay: "0.7s" }} />
        </div>

        <div className="auth-season-orb-glow absolute rounded-full" style={{ top: "44%", left: "58%", width: 200, height: 200 }} />
        <div className="auth-season-orb-disc absolute rounded-full" style={{ top: "52%", left: "66%", width: 34, height: 34 }} />

        <div className="auth-season-mist absolute -left-[15%] w-[130%] h-[60px] rounded-full" style={{ bottom: 82, opacity: 0.7, filter: "blur(14px)", background: "rgba(255,255,255,0.08)", animationDuration: "34s" }} />
        <div ref={backRef} className="auth-season-ridge absolute -left-[10%] bottom-0 w-[120%] transition-transform duration-500 ease-out" style={{ opacity: 0.7 }}>
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="block w-full h-auto">
            <path d={RIDGE_PATH.back} style={{ fill: "var(--season-ridge-3)" }} />
          </svg>
        </div>

        <div className="auth-season-mist absolute -left-[15%] w-[130%] h-[60px] rounded-full" style={{ bottom: 50, opacity: 0.5, filter: "blur(14px)", background: "rgba(255,255,255,0.08)", animationDuration: "26s", animationDirection: "reverse" }} />
        <div ref={midRef} className="auth-season-ridge absolute -left-[10%] bottom-0 w-[120%] transition-transform duration-500 ease-out" style={{ opacity: 0.85 }}>
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="block w-full h-auto">
            <path d={RIDGE_PATH.mid} style={{ fill: "var(--season-ridge-2)" }} />
          </svg>
        </div>

        <div ref={frontRef} className="auth-season-ridge absolute -left-[10%] bottom-0 w-[120%] transition-transform duration-500 ease-out">
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="block w-full h-auto">
            <path d={RIDGE_PATH.front} style={{ fill: "var(--season-ridge-1)" }} />
          </svg>
        </div>

        <svg
          className="auth-season-branch absolute top-0 right-0 w-3/5 h-auto"
          viewBox="0 0 300 300"
          preserveAspectRatio="xMaxYMin meet"
          aria-hidden="true"
        >
          <defs>
            <g id="auth-season-blossom">
              <g fill="#f2b8c6">
                <ellipse cx="0" cy="-7" rx="4.5" ry="7" />
                <ellipse cx="0" cy="-7" rx="4.5" ry="7" transform="rotate(72)" />
                <ellipse cx="0" cy="-7" rx="4.5" ry="7" transform="rotate(144)" />
                <ellipse cx="0" cy="-7" rx="4.5" ry="7" transform="rotate(216)" />
                <ellipse cx="0" cy="-7" rx="4.5" ry="7" transform="rotate(288)" />
              </g>
              <circle r="2.2" fill="#e8b23f" />
            </g>
          </defs>
          <path d="M300,0 C276,26 256,6 234,40 C220,62 238,84 212,108 C194,128 170,114 148,146" fill="none" stroke="#2a140f" strokeWidth="4" strokeLinecap="round" />
          <path d="M234,40 C250,54 266,48 282,68" fill="none" stroke="#2a140f" strokeWidth="3" strokeLinecap="round" />
          <path d="M194,128 C180,148 158,142 144,168" fill="none" stroke="#2a140f" strokeWidth="3" strokeLinecap="round" />
          <use href="#auth-season-blossom" transform="translate(148,146) scale(1.4)" />
          <use href="#auth-season-blossom" transform="translate(282,68) scale(1.1)" />
          <use href="#auth-season-blossom" transform="translate(144,168) scale(1.2)" />
          <use href="#auth-season-blossom" transform="translate(212,108) scale(0.85)" />
          <use href="#auth-season-blossom" transform="translate(266,20) scale(0.65)" />
        </svg>

        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex flex-col justify-end lg:justify-between h-full auth-season-ink" style={{ color: "var(--season-ink)" }}>
        <span className="hidden lg:block font-bold text-label-caps uppercase tracking-wide">PPIT Nanjing</span>
        <div className="flex flex-col gap-3.5">
          <p className="hidden lg:block font-medium text-body-lg leading-snug max-w-[20ch] text-balance">
            {t("auth.seasonTagline")}
          </p>
          <div>
            <span className="text-label-caps uppercase tracking-wide opacity-80">{t(SEASON_LABEL_KEY[season])}</span>
            <div className="flex gap-1.5 mt-2" role="group" aria-label={t("auth.seasonDotsGroupAria")}>
              {SEASON_ORDER.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeasonIdx(i)}
                  aria-label={t(SEASON_LABEL_KEY[s])}
                  aria-current={i === seasonIdx}
                  className={`h-[5px] rounded-full bg-current transition-[width,opacity] duration-300 ${
                    i === seasonIdx ? "w-4 opacity-100" : "w-[5px] opacity-35"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
