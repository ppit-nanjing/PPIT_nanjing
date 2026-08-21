import type { T } from "@/lib/i18n/translate";

// Takes `t` rather than reaching for a dictionary itself: this runs in both
// server components (which have `t` from getT()) and client components (useT()),
// and a module-level dictionary lookup would be locked to one locale for the
// whole process.
export function formatRelativeTime(date: Date, t: T): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t("time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("time.minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("time.daysAgo", { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("time.weeksAgo", { n: weeks });
  const months = Math.floor(days / 30);
  return t("time.monthsAgo", { n: months });
}
