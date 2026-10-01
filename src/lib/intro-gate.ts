/**
 * Pre-paint gate for the home-page intro (components/site-intro.tsx). It is
 * appended to the inline script in app/layout.tsx, which already runs before
 * anything paints, and adds `no-intro` to <html> to switch the overlay off.
 *
 * Rules, for a FULL page load:
 *   - ?intro forces it on (to review it); ?nointro forces it off;
 *   - Back/Forward never replays it;
 *   - in production it plays once per browser tab session (sessionStorage), on
 *     whichever page the session starts;
 *   - in development it plays on every load, so it can be reviewed by reloading.
 * Prefers-reduced-motion is handled in CSS. Navigating to "/" without a reload
 * (clicking Home) never replays it: see SiteIntro.
 *
 * Flip INTRO_ONCE_PER_SESSION to change the production rule.
 */
export const INTRO_ONCE_PER_SESSION = process.env.NODE_ENV === "production";

export const INTRO_GATE =
  "try{var d2=document.documentElement,q=location.search,s=false,n=performance.getEntriesByType('navigation')[0];" +
  "if(!/[?&]intro\\b/.test(q)){" +
  "if(/[?&]nointro\\b/.test(q)||(n&&n.type==='back_forward'))s=true;" +
  (INTRO_ONCE_PER_SESSION ? "else if(sessionStorage.getItem('ppit-intro'))s=true;" : "") +
  "}" +
  "sessionStorage.setItem('ppit-intro','1');if(s)d2.classList.add('no-intro');}catch(e){}";
