/**
 * Neutral placeholder for lazy-loaded remote images (event / news / gallery covers)
 * whose colours we cannot know at build time. A very faint warm grey wash (3% alpha;
 * next/image's blur filter amplifies alpha, 16% rendered as a visible grey box), so the
 * card's own background still reads as the skeleton in light and dark mode.
 *
 * Why it exists: next/image warns in development ("detected as the Largest Contentful
 * Paint ... add loading=eager") whenever a lazy image with no placeholder is the
 * biggest thing painted - which happens while scrolling to any cover that is below the
 * fold. Those covers are lazy on purpose (the audience is often behind the Great
 * Firewall), so the right answer is a placeholder, not eager loading.
 */
export const COVER_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4IDUiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjUiIGZpbGw9IiM3ODcwNWEiIGZpbGwtb3BhY2l0eT0iLjAzIi8+PC9zdmc+";
