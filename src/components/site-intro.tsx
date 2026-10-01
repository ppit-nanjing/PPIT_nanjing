"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Home-page intro: a jade curtain with the logo that lifts away (desktop: five
 * slats; phones: one full layer that fades, because five tall slats on a narrow
 * screen wrap into a second grid row and leave a hole). The animation is pure CSS
 * (".intro-*" in globals.css), so it ends on its own even if JS never runs, and
 * the page content is in the DOM underneath the whole time (crawlers, screen
 * readers). The overlay is aria-hidden and pointer-events: none.
 *
 * WHETHER it plays on a full page load is decided before paint by the gate in
 * lib/intro-gate.ts (adds `no-intro` to <html>). This component only guards the
 * other case: reaching "/" by clicking a link (no reload) must not replay it. It
 * tells the two apart with useSyncExternalStore: during server render and
 * hydration the server snapshot (true) is used, on a pure client mount the client
 * snapshot (false) is, and useState freezes the first answer.
 */
const subscribe = () => () => {};

export function SiteIntro() {
  const fullLoad = useSyncExternalStore(subscribe, () => false, () => true);
  const [show] = useState(fullLoad);
  if (!show) return null;

  return (
    <>
      <div className="intro-curtain" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <i className="brand-logo intro-logo" />
      </div>
      <div className="intro-veil" aria-hidden="true">
        <i className="brand-logo intro-logo" />
      </div>
    </>
  );
}
