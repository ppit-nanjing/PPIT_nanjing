/**
 * Pre-paint gate for the home-page intro (components/site-intro.tsx). It is
 * appended to the inline script in app/layout.tsx, which already runs before
 * anything paints, and adds `no-intro` to <html> to switch the overlay off.
 *
 * Rule, for a full page load: the intro ALWAYS plays, except `?nointro`.
 * `?intro` overrides `?nointro` when both are present. Back/Forward and repeat
 * visits play it again too - that is deliberate: arrival at "/" is treated as a
 * ceremony. Reduced motion is handled in CSS.
 *
 * Client-side arrival at "/" (Home/logo click from another page) remounts the
 * page, so SiteIntro always plays. Clicking the logo while ALREADY on "/" has
 * no route change to remount it, so site-nav.tsx dispatches INTRO_REPLAY_EVENT
 * and SiteIntro replays the CSS in place.
 */
export const INTRO_REPLAY_EVENT = "ppit:intro-replay";

export const INTRO_GATE =
  "try{var d2=document.documentElement,q=location.search;" +
  "if(/[?&]nointro\\b/.test(q)&&!/[?&]intro\\b/.test(q))d2.classList.add('no-intro');}catch(e){}";
