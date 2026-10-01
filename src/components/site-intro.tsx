"use client";

import { Fragment, useEffect, useState } from "react";
import { INTRO_REPLAY_EVENT } from "@/lib/intro-gate";

/**
 * Home-page intro: a jade curtain with the logo that lifts away (desktop: five
 * slats; phones: one full layer that fades, because five tall slats on a narrow
 * screen wrap into a second grid row and leave a hole). The animation is pure CSS
 * (".intro-*" in globals.css), so it ends on its own even if JS never runs, and
 * the page content is in the DOM underneath the whole time (crawlers, screen
 * readers). The overlay is aria-hidden and pointer-events: none.
 *
 * Playback:
 *   - A full page load is gated before paint by lib/intro-gate.ts (plays unless
 *     `?nointro`);
 *   - Arriving at "/" by client navigation (Home link, logo from another page)
 *     remounts this page component, so the intro plays again;
 *   - Clicking the logo while ALREADY on "/" changes no route, so site-nav.tsx
 *     dispatches INTRO_REPLAY_EVENT; runId bumps and the keyed fragment is
 *     remounted, restarting the CSS from the first frame.
 */
export function SiteIntro() {
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const replay = () => {
      // A `?nointro` load asked for no intro; an explicit logo click asks for one.
      document.documentElement.classList.remove("no-intro");
      setRunId((n) => n + 1);
    };
    window.addEventListener(INTRO_REPLAY_EVENT, replay);
    return () => window.removeEventListener(INTRO_REPLAY_EVENT, replay);
  }, []);

  return (
    <Fragment key={runId}>
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
    </Fragment>
  );
}
