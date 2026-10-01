/**
 * Pre-paint gate for the home-page intro (components/site-intro.tsx). It is
 * appended to the inline script in app/layout.tsx, which already runs before
 * anything paints, and adds `no-intro` to <html> to switch the overlay off.
 *
 * Rules, for a FULL page load (perilaku lama, dipulihkan):
 *   - ?intro forces it on (to review it); ?nointro forces it off;
 *   - Back/Forward never replays it;
 *   - in production it plays once per browser tab session (sessionStorage), on
 *     whichever page the session starts;
 *   - in development it plays on every load, so it can be reviewed by reloading.
 * Prefers-reduced-motion is handled in CSS.
 *
 * Navigating to "/" WITHOUT a reload does NOT play the intro by default. The one
 * exception is a click on the PPIT Nanjing logo: site-nav sets
 * INTRO_FORCE_KEY before navigating (consumed by SiteIntro on the home page), or
 * dispatches INTRO_REPLAY_EVENT when already on "/" (replay in place).
 */
export const INTRO_REPLAY_EVENT = "ppit:intro-replay";

// Flag lintas-rute untuk navigasi client (tidak lewat gate pra-paint): logo
// diklik dari halaman lain -> beranda membaca dan menghapusnya sekali.
export const INTRO_FORCE_KEY = "ppit-intro-force";

export const INTRO_ONCE_PER_SESSION = process.env.NODE_ENV === "production";

export const INTRO_GATE =
  "try{var d2=document.documentElement,q=location.search,s=false,n=performance.getEntriesByType('navigation')[0];" +
  "if(!/[?&]intro\\b/.test(q)){" +
  "if(/[?&]nointro\\b/.test(q)||(n&&n.type==='back_forward'))s=true;" +
  (INTRO_ONCE_PER_SESSION ? "else if(sessionStorage.getItem('ppit-intro'))s=true;" : "") +
  "}" +
  "sessionStorage.setItem('ppit-intro','1');if(s)d2.classList.add('no-intro');}catch(e){}";
