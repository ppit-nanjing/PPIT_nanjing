"use client";

import { useEffect, useRef, useState } from "react";

export type Point = { x: number; y: number };

type Options<T extends HTMLElement> = {
  measureRef?: React.RefObject<T | null>;
  storageKey?: string;
  ignoreInteractive?: boolean;
  enabled?: boolean;
};

export function useDraggable<T extends HTMLElement = HTMLElement>(
  targetRef: React.RefObject<T | null>,
  options: Options<T> = {},
) {
  const { measureRef, storageKey, ignoreInteractive = false, enabled = true } = options;
  const [pos, setPos] = useState<Point | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef<Point>({ x: 0, y: 0 });
  const offset = useRef<Point>({ x: 0, y: 0 });
  const posRef = useRef<Point | null>(null);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPos(JSON.parse(raw) as Point);
    } catch {
      // ignore malformed saved position
    }
  }, [storageKey]);

  useEffect(() => {
    const el = targetRef.current;
    if (!enabled || !el) return;

    const measure = () => measureRef?.current ?? el;
    const clamp = (x: number, y: number): Point => {
      const m = measure();
      const w = m?.offsetWidth ?? 56;
      const h = m?.offsetHeight ?? 56;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxX = Math.max(8, vw - w - 8);
      const maxY = Math.max(8, vh - h - 8);
      return { x: Math.min(Math.max(x, 8), maxX), y: Math.min(Math.max(y, 8), maxY) };
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (ignoreInteractive) {
        const t = e.target as HTMLElement;
        if (t.closest("button, a, input, textarea, select")) return;
      }
      const rect = measure().getBoundingClientRect();
      const current = posRef.current ?? { x: rect.left, y: rect.top };
      if (!posRef.current) setPos(current);
      dragging.current = true;
      moved.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      offset.current = { x: e.clientX - current.x, y: e.clientY - current.y };
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 4) {
        moved.current = true;
      }
      setPos(clamp(e.clientX - offset.current.x, e.clientY - offset.current.y));
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer already released
      }
      const next = posRef.current;
      if (next && storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // storage unavailable (private mode) - non-fatal
        }
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [targetRef, measureRef, storageKey, ignoreInteractive, enabled]);

  return { pos };
}
