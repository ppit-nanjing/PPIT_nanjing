/**
 * Format a Date as a `datetime-local` input value (YYYY-MM-DDTHH:mm) in the
 * SERVER's local timezone.
 *
 * Why not `toISOString().slice(0, 16)`: that is UTC, so an event stored at
 * 19:00 WIB renders as 12:00 in the edit form - every save silently shifts
 * the stored time by the timezone offset. `datetime-local` values carry no
 * zone, so we must render wall-clock time; subtracting the offset first makes
 * toISOString() emit local wall clock. Server and browser run in the same
 * zone for console admins today; when that stops holding, move this to a
 * client component and drop the helper from server pages.
 */
export function toDateLocalInput(date: Date): string {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}
