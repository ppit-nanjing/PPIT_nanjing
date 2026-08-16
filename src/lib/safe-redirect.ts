export function safeRedirect(input: string | null | undefined, fallback = "/"): string {
  if (input && input.startsWith("/") && !input.startsWith("//")) return input;
  return fallback;
}
