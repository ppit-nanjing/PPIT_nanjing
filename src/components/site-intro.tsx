"use client";

import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import { INTRO_FORCE_KEY, INTRO_REPLAY_EVENT } from "@/lib/intro-gate";

/**
 * Home-page intro: a jade curtain with the logo that lifts away (desktop: five
 * slats; phones: one full layer that fades, because five tall slats on a narrow
 * screen wrap into a second grid row and leave a hole). The animation is pure CSS
 * (".intro-*" in globals.css), so it ends on its own even if JS never runs, and
 * the page content is in the DOM underneath the whole time (crawlers, screen
 * readers). The overlay is aria-hidden and pointer-events: none.
 *
 * Playback:
 *   - Full page load: decided before paint by lib/intro-gate.ts (once per tab
 *     session in production, `?nointro` off, `?intro` on);
 *   - Plain client navigation to "/" (Home link, Back/Forward): NO intro -
 *     useSyncExternalStore distinguishes hydration (server snapshot, true) from
 *     a pure client mount (false);
 *   - Clicking the logo: site-nav either sets INTRO_FORCE_KEY before navigating
 *     (read once by the mount initializer here) or dispatches
 *     INTRO_REPLAY_EVENT when already on "/" (runId bumps and the keyed fragment
 *     restarts the CSS in place).
 */
const subscribe = () => () => {};

export function SiteIntro() {
  const fullLoad = useSyncExternalStore(subscribe, () => false, () => true);
  // Muat penuh: overlay selalu dirender, gate pra-paint (class `no-intro`) yang
  // menyembunyikannya. Mount murni dari navigasi: putar HANYA kalau logo meminta.
  // Membaca (bukan menghapus) flag di sini supaya initializer tetap murni.
  const [show, setShow] = useState(() => {
    if (fullLoad) return true;
    try {
      return sessionStorage.getItem(INTRO_FORCE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!fullLoad) {
      try {
        if (sessionStorage.getItem(INTRO_FORCE_KEY)) {
          sessionStorage.removeItem(INTRO_FORCE_KEY);
          // `no-intro` menempel di <html> dan ikut melewati navigasi client;
          // logo sudah minta intro, jadi cabut pengunciannya.
          document.documentElement.classList.remove("no-intro");
        }
      } catch {
        // sessionStorage bisa melempar di mode privasi ketat; tanpa flag,
        // navigasi biasa tidak memutar intro - memang perilaku yang diinginkan.
      }
    }

    const replay = () => {
      // Klik logo saat sudah di beranda = minta intro secara eksplisit.
      document.documentElement.classList.remove("no-intro");
      setShow(true);
      setRunId((n) => n + 1);
    };
    window.addEventListener(INTRO_REPLAY_EVENT, replay);
    return () => window.removeEventListener(INTRO_REPLAY_EVENT, replay);
  }, [fullLoad]);

  if (!show) return null;

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
